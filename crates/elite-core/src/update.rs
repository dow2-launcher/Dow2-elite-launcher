//! Install / update / switch version / repair.
//!
//! For every file of the target version:
//!   1. already correct (state cache or SHA-256)            → nothing to do;
//!   2. this exact file is in the local version cache          → copy it (switching back to a version is free);
//!   3. otherwise build it next to the old file: chunks that match the old file are copied from disk,
//!      the rest is downloaded with Range requests; the result is checked by SHA-256 and swapped in.
//! Replaced files go to `<game>/.elite_cache/<sha256>` so earlier versions stay available offline.
use crate::cdc::{self, hex};
use crate::config::LauncherConfig;
use crate::manifest::{FileEntry, Manifest};
use crate::net::{Mirrors, NetError};
use crate::sign;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::Ordering;
use std::time::{SystemTime, UNIX_EPOCH};

pub const CONFIG_FILE: &str = "launcher.json";

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct State {
    pub version: String,
    pub channel: String,
    pub files: Vec<StateFile>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct StateFile {
    pub path: String,
    pub size: u64,
    pub mtime: u64,
    pub sha: String,
}

#[derive(Clone, Debug, Default, Serialize)]
pub struct Progress {
    /// "checking" | "downloading" | "done"
    pub phase: String,
    pub file: String,
    pub files_done: usize,
    pub files_total: usize,
    pub bytes_done: u64,
    pub bytes_total: u64,
    pub downloaded: u64,
    pub reused: u64,
    pub from_cache: u64,
    pub mirror: String,
}

#[derive(Debug)]
pub enum Error {
    Cancelled,
    Net(String),
    Io(String),
    Bad(String),
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Error::Cancelled => write!(f, "Cancelled"),
            Error::Net(s) => write!(f, "Network: {s}"),
            Error::Io(s) => write!(f, "Disk: {s}"),
            Error::Bad(s) => write!(f, "{s}"),
        }
    }
}

impl From<NetError> for Error {
    fn from(e: NetError) -> Self {
        match e {
            NetError::Cancelled => Error::Cancelled,
            NetError::Failed(s) => Error::Net(s),
        }
    }
}

impl From<std::io::Error> for Error {
    fn from(e: std::io::Error) -> Self {
        Error::Io(e.to_string())
    }
}

pub struct Game {
    pub dir: PathBuf,
    /// State file name: the main mod and every component keep their own list of installed files.
    state_name: String,
    /// 1.4.11, the vanilla copy of a component: the manifest's "Elite_DLLs/X" is the file "dow2-patches/X" (same name).
    remap: Option<(&'static str, &'static str)>,
}

/// The folder of the vanilla game's add-ons (next to DOW2.exe): the launcher's loader winmm.dll loads every DLL in it when
/// the game runs without -modname.
pub const VANILLA_DIR: &str = "dow2-patches";
const VANILLA_PREFIX: &str = "vanilla-";
const VLOADER_STATE: &str = "vloader.json";

/// A component id as it is stored in the game folder (`component-<key>.json`).
pub fn component_key(id: &str) -> String {
    id.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_').collect()
}

impl Game {
    pub fn new(dir: impl Into<PathBuf>) -> Self {
        Game { dir: dir.into(), state_name: "state.json".into(), remap: None }
    }
    /// Same game folder, separate state for an optional component (e.g. LobbyStats).
    pub fn component(dir: impl Into<PathBuf>, id: &str) -> Self {
        Game { dir: dir.into(), state_name: format!("component-{}.json", component_key(id)), remap: None }
    }
    /// The vanilla copy of a component (1.4.11): its own state; the files of the manifest under Elite_DLLs/ go to dow2-patches/.
    /// Apply it only with those files (see `vanilla_files`).
    pub fn vanilla_component(dir: impl Into<PathBuf>, id: &str) -> Self {
        Game { dir: dir.into(), state_name: format!("{VANILLA_PREFIX}{}.json", component_key(id)), remap: Some(("Elite_DLLs/", "dow2-patches/")) }
    }
    /// The launcher's winmm.dll loader for the vanilla game (launcher.json `vanilla.loader`).
    pub fn vanilla_loader(dir: impl Into<PathBuf>) -> Self {
        Game { dir: dir.into(), state_name: VLOADER_STATE.into(), remap: None }
    }
    /// Ids (as stored) of every component with a vanilla copy in this game folder.
    pub fn vanilla_ids(dir: &Path) -> Vec<String> {
        let Ok(rd) = fs::read_dir(dir.join(".elite_launcher")) else { return Vec::new() };
        rd.flatten()
            .filter_map(|e| {
                let n = e.file_name().to_string_lossy().to_string();
                n.strip_prefix(VANILLA_PREFIX).and_then(|r| r.strip_suffix(".json")).map(String::from)
            })
            .filter(|id| !id.is_empty())
            .collect()
    }
    /// Ids of every component with a state in this game folder (installed by a launcher at some point), as stored:
    /// compare them with `component_key` of the catalog's ids.
    pub fn component_ids(dir: &Path) -> Vec<String> {
        let Ok(rd) = fs::read_dir(dir.join(".elite_launcher")) else { return Vec::new() };
        rd.flatten()
            .filter_map(|e| {
                let n = e.file_name().to_string_lossy().to_string();
                n.strip_prefix("component-").and_then(|r| r.strip_suffix(".json")).map(String::from)
            })
            .filter(|id| !id.is_empty())
            .collect()
    }
    fn meta_dir(&self) -> PathBuf {
        self.dir.join(".elite_launcher")
    }
    pub fn cache_dir(&self) -> PathBuf {
        self.dir.join(".elite_cache")
    }
    fn state_path(&self) -> PathBuf {
        self.meta_dir().join(&self.state_name)
    }
    pub fn load_state(&self) -> State {
        fs::read(self.state_path()).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default()
    }
    fn save_state(&self, s: &State) -> Result<(), Error> {
        fs::create_dir_all(self.meta_dir())?;
        let tmp = self.state_path().with_extension("tmp");
        fs::write(&tmp, serde_json::to_vec_pretty(s).unwrap())?;
        fs::rename(tmp, self.state_path())?;
        Ok(())
    }
    /// Remove every file this component installed and forget it.
    pub fn uninstall(&self) -> Result<usize, Error> {
        Ok(self.uninstall_keeping(|_| false)?.len())
    }
    /// Like `uninstall`, but the files `keep` says yes to stay (another component or Elite itself owns them now).
    /// Returns the paths removed.
    pub fn uninstall_keeping(&self, keep: impl Fn(&str) -> bool) -> Result<Vec<String>, Error> {
        let st = self.load_state();
        let mut removed = Vec::new();
        for f in &st.files {
            if keep(&f.path) {
                continue;
            }
            let p = self.file(&f.path);
            if p.is_file() && fs::remove_file(&p).is_ok() {
                removed.push(f.path.clone());
            }
        }
        let _ = fs::remove_file(self.state_path());
        Ok(removed)
    }

    /// After the launcher edits a file on purpose (e.g. Elite.launchconfig), record its new size/time
    /// so the quick check keeps trusting it. "Repair" still restores the original and the edit is re-applied.
    pub fn accept_local_edit(&self, rel: &str) {
        let mut st = self.load_state();
        if let (Some(e), Some((size, mt))) = (st.files.iter_mut().find(|f| f.path == rel), mtime(&self.file(rel))) {
            e.size = size;
            e.mtime = mt;
            let _ = self.save_state(&st);
        }
    }

    pub fn file(&self, rel: &str) -> PathBuf {
        let mut p = self.dir.clone();
        for part in self.rel_path(rel).split('/') {
            p.push(part);
        }
        p
    }
    /// Where a manifest path is in the game folder ('/'-separated): itself, or "dow2-patches/X" for the vanilla copy.
    pub fn rel_path(&self, rel: &str) -> String {
        if let Some((from, to)) = self.remap {
            if rel.get(..from.len()).is_some_and(|h| h.eq_ignore_ascii_case(from)) {
                return format!("{to}{}", &rel[from.len()..]);
            }
        }
        rel.to_string()
    }
    /// The installed files (game folder paths) still as the launcher left them (same size and time).
    pub fn intact_files(&self) -> Vec<String> {
        self.load_state().files.iter()
            .filter(|f| mtime(&self.file(&f.path)).is_some_and(|(sz, mt)| sz == f.size && mt == f.mtime))
            .map(|f| self.rel_path(&f.path)).collect()
    }
    /// Is this installed file (manifest path) on disk with the SHA-256 the state has? Hashes it: for small files.
    pub fn file_is_installed(&self, rel: &str) -> bool {
        let st = self.load_state();
        let Some(f) = st.files.iter().find(|f| f.path.eq_ignore_ascii_case(rel)) else { return false };
        File::open(self.file(rel)).and_then(cdc::sha256).map(|(sha, _)| hex(&sha) == f.sha).unwrap_or(false)
    }
    /// Take a file of this state out of the game folder, its copy kept in the version cache (back for free next time).
    pub fn put_away(&self, rel: &str) -> bool {
        let p = self.file(rel);
        if !p.is_file() { return false; }
        stash(self, &p, None);
        fs::remove_file(&p).is_ok()
    }
    /// Put a file the launcher already has (e.g. an add-on DLL in Elite_DLLs) into the version cache under its SHA-256, so an
    /// install of the same file elsewhere (its vanilla copy) is a local copy, also offline. Checked before it is kept.
    pub fn seed_cache(&self, path: &Path, sha_hex: &str) {
        if sha_hex.len() != 64 || self.cache_dir().join(sha_hex).is_file() { return; }
        if let Ok((sha, _)) = File::open(path).and_then(cdc::sha256) {
            if hex(&sha) == sha_hex { stash(self, path, Some(sha)); }
        }
    }
    /// Forget this state without touching the files (they went elsewhere, e.g. "clean up the junk").
    pub fn forget(&self) {
        let _ = fs::remove_file(self.state_path());
    }
}

/// The part of a component's manifest that is its vanilla copy: the files under Elite_DLLs/ (DLLs, their ini and helpers).
/// Anything else (winmm.dll of Automatch, Elite.exe, the game's text files) belongs to Elite only.
pub fn vanilla_files(man: &Manifest) -> Manifest {
    Manifest {
        version: man.version.clone(),
        files: man.files.iter().filter(|f| f.path.get(..11).is_some_and(|h| h.eq_ignore_ascii_case("Elite_DLLs/")) && f.path.len() > 11).cloned().collect(),
    }
}

fn mtime(p: &Path) -> Option<(u64, u64)> {
    let m = fs::metadata(p).ok()?;
    let t = m.modified().ok()?.duration_since(UNIX_EPOCH).ok()?.as_nanos() as u64;
    Some((m.len(), t))
}

// ---------- signed downloads ----------

/// launcher.json from the mirrors, signature checked. Also cached next to `cache_file` for offline starts.
pub fn fetch_config(m: &Mirrors) -> Result<(LauncherConfig, Vec<u8>, String), Error> {
    let raw = m.get(CONFIG_FILE)?;
    let sig = String::from_utf8_lossy(&m.get(&format!("{CONFIG_FILE}.sig"))?).to_string();
    if !sign::verify(&raw, &sig) {
        return Err(Error::Bad("launcher.json signature is invalid — ignoring this mirror's data".into()));
    }
    let cfg = serde_json::from_slice(&raw).map_err(|e| Error::Bad(format!("launcher.json: {e}")))?;
    Ok((cfg, raw, sig))
}

pub fn parse_signed_config(raw: &[u8], sig: &str) -> Option<LauncherConfig> {
    if sign::verify(raw, sig) {
        serde_json::from_slice(raw).ok()
    } else {
        None
    }
}

/// Manifest of a version: from the local cache if present (versions never change), else downloaded and verified.
pub fn load_manifest(game: &Game, m: &Mirrors, version: &str) -> Result<Manifest, Error> {
    if version.is_empty() || version.contains(['/', '\\', '.']) && version.contains("..") {
        return Err(Error::Bad("bad version id".into()));
    }
    let dir = game.cache_dir().join("manifests");
    let (p, ps) = (dir.join(format!("{version}.manifest")), dir.join(format!("{version}.manifest.sig")));
    if let (Ok(b), Ok(s)) = (fs::read(&p), fs::read_to_string(&ps)) {
        if sign::verify(&b, &s) {
            if let Ok(man) = Manifest::parse(&b) {
                return Ok(man);
            }
        }
    }
    let b = m.get(&format!("{version}.manifest"))?;
    let s = String::from_utf8_lossy(&m.get(&format!("{version}.manifest.sig"))?).to_string();
    if !sign::verify(&b, &s) {
        return Err(Error::Bad(format!("manifest {version}: signature is invalid")));
    }
    let man = Manifest::parse(&b).map_err(Error::Bad)?;
    if man.version != version {
        return Err(Error::Bad("manifest version mismatch".into()));
    }
    fs::create_dir_all(&dir)?;
    fs::write(p, &b)?;
    fs::write(ps, s)?;
    Ok(man)
}

/// Upper bound of what switching to `man` would download: files that differ from the installed
/// ones and are not in the local version cache. 0 = the switch is instant (works offline).
pub fn switch_cost(game: &Game, old: Option<&Manifest>, man: &Manifest) -> u64 {
    let st = game.load_state();
    let have: std::collections::HashMap<&str, &str> = st.files.iter().map(|f| (f.path.as_str(), f.sha.as_str())).collect();
    let cache = game.cache_dir();
    // chunk hashes of the currently-installed version per file, to estimate the real delta (not full files)
    let old_chunks: std::collections::HashMap<&str, std::collections::HashSet<u64>> = old
        .map(|o| o.files.iter().map(|f| (f.path.as_str(), f.chunks.iter().map(|c| c.hash).collect())).collect())
        .unwrap_or_default();
    man.files.iter().map(|f| {
        let h = hex(&f.sha);
        if have.get(f.path.as_str()) == Some(&h.as_str()) || cache.join(&h).is_file() {
            return 0; // already have this exact file (on disk or in local cache)
        }
        match old_chunks.get(f.path.as_str()) {
            // only chunks absent from the installed version's file get downloaded
            Some(oldset) => f.chunks.iter().filter(|c| !oldset.contains(&c.hash)).map(|c| c.len as u64).sum(),
            None => f.size, // nothing to diff against -> full file
        }
    }).sum()
}

// ---------- version cache ----------

fn stash(game: &Game, path: &Path, known_sha: Option<[u8; 32]>) {
    let sha = match known_sha {
        Some(s) => s,
        None => match File::open(path).and_then(cdc::sha256) {
            Ok((s, _)) => s,
            Err(_) => return,
        },
    };
    let dir = game.cache_dir();
    let _ = fs::create_dir_all(&dir);
    let dst = dir.join(hex(&sha));
    if !dst.exists() && fs::copy(path, &dst).is_err() {
        let _ = fs::remove_file(&dst);
        return;
    }
    if let Ok(f) = File::options().write(true).open(&dst) {
        let _ = f.set_modified(SystemTime::now()); // freshness for pruning
    }
}

/// Keep the version cache under `limit` bytes, dropping the oldest files first.
pub fn prune_cache(game: &Game, limit: u64) {
    let Ok(rd) = fs::read_dir(game.cache_dir()) else { return };
    let mut files: Vec<(SystemTime, u64, PathBuf)> = rd
        .flatten()
        .filter_map(|e| {
            let m = e.metadata().ok()?;
            m.is_file().then(|| (m.modified().unwrap_or(UNIX_EPOCH), m.len(), e.path()))
        })
        .collect();
    let mut total: u64 = files.iter().map(|f| f.1).sum();
    files.sort();
    for (_, len, p) in files {
        if total <= limit {
            break;
        }
        if fs::remove_file(&p).is_ok() {
            total -= len;
        }
    }
}

// ---------- update ----------

pub struct Options {
    /// Re-hash every file instead of trusting the state cache (the "Repair" button).
    pub verify_all: bool,
    pub cache_limit: u64,
    pub channel: String,
}

#[derive(Debug, Default, Serialize)]
pub struct Summary {
    pub updated: usize,
    pub removed: usize,
    pub downloaded: u64,
    pub reused: u64,
    pub from_cache: u64,
    /// whole files taken from another launcher on the local network (lan.rs)
    pub from_lan: u64,
}

/// Elite was installed by hand (or by an older tool) and the launcher has no state for it yet.
/// If every file of `man` is there with the right size, and every small file (< 8 MB) also has the right
/// SHA-256, the folder is taken as this version without hashing gigabytes: the state is written and the
/// next update/start is instant. Big files are trusted by size; "Repair" re-hashes everything.
pub fn adopt_existing(game: &Game, man: &Manifest, channel: &str) -> bool {
    if !game.load_state().files.is_empty() || man.files.is_empty() {
        return false;
    }
    // every big file (the archives) must match by size; small files that differ (e.g. an edited
    // Elite.launchconfig) are just left out of the state, so the normal update fixes only them
    let mut files = Vec::with_capacity(man.files.len());
    for f in &man.files {
        let path = game.file(&f.path);
        let cur = mtime(&path);
        let big = f.size >= (8 << 20);
        let ok = match cur {
            Some((size, _)) if size == f.size => big || matches!(File::open(&path).and_then(cdc::sha256), Ok((sha, _)) if sha == f.sha),
            _ => false,
        };
        if !ok {
            if big {
                return false;
            }
            continue;
        }
        let (size, mt) = cur.unwrap();
        files.push(StateFile { path: f.path.clone(), size, mtime: mt, sha: hex(&f.sha) });
    }
    if files.is_empty() {
        return false;
    }
    game.save_state(&State { version: man.version.clone(), channel: channel.to_string(), files }).is_ok()
}

/// SHA-256 of a file, reporting progress every 32 MB so a big archive doesn't look like a hang.
fn sha256_progress(path: &Path, cancel: &std::sync::atomic::AtomicBool, tick: &mut dyn FnMut(u64)) -> std::io::Result<([u8; 32], u64)> {
    use sha2::{Digest, Sha256};
    let mut r = File::open(path)?;
    let mut s = Sha256::new();
    let mut buf = vec![0u8; 1 << 22];
    let (mut size, mut last) = (0u64, 0u64);
    loop {
        if cancel.load(Ordering::Relaxed) {
            return Err(std::io::Error::new(std::io::ErrorKind::Interrupted, "cancelled"));
        }
        let n = r.read(&mut buf)?;
        if n == 0 {
            break;
        }
        s.update(&buf[..n]);
        size += n as u64;
        if size - last >= 32 << 20 {
            last = size;
            tick(size);
        }
    }
    Ok((s.finalize().into(), size))
}

/// Bring the game folder to `man`. Calls `progress` often; cancel through `m.cancel`.
pub fn apply(game: &Game, m: &Mirrors, man: &Manifest, opt: &Options, progress: &mut dyn FnMut(&Progress)) -> Result<Summary, Error> {
    if !opt.verify_all {
        adopt_existing(game, man, &opt.channel);
    }
    let old = game.load_state();
    let known: HashMap<&str, &StateFile> = old.files.iter().map(|f| (f.path.as_str(), f)).collect();
    let mut p = Progress { phase: "checking".into(), files_total: man.files.len(), mirror: m.current_host(), ..Default::default() };
    let total_size = man.total_size();
    let base_dl = m.downloaded.load(Ordering::Relaxed);
    let mut sum = Summary::default();

    // 1. which files need work
    let mut todo: Vec<(&FileEntry, Option<[u8; 32]>)> = Vec::new();
    p.bytes_total = total_size;
    for f in &man.files {
        if m.cancel.load(Ordering::Relaxed) {
            return Err(Error::Cancelled);
        }
        p.file = f.path.clone();
        progress(&p);
        let path = game.file(&f.path);
        let shahex = hex(&f.sha);
        let cur = mtime(&path);
        let trusted = !opt.verify_all
            && matches!((cur, known.get(f.path.as_str())), (Some((sz, mt)), Some(s)) if s.size == sz && s.mtime == mt && s.sha == shahex && sz == f.size);
        if !trusted {
            let base = p.bytes_done;
            let have = match sha256_progress(&path, &m.cancel, &mut |done| {
                let mut q = p.clone();
                q.bytes_done = base + done.min(f.size);
                progress(&q);
            }) {
                Ok(v) => Some(v),
                Err(e) if e.kind() == std::io::ErrorKind::Interrupted => return Err(Error::Cancelled),
                Err(_) => None,
            };
            match have {
                Some((sha, sz)) if sha == f.sha && sz == f.size => {}
                Some((sha, _)) => todo.push((f, Some(sha))),
                None => todo.push((f, None)),
            }
        }
        p.bytes_done += f.size;
        p.files_done += 1;
    }

    // 2. update
    p.phase = "downloading".into();
    p.files_done = 0;
    p.files_total = todo.len();
    p.bytes_done = 0;
    p.bytes_total = todo.iter().map(|(f, _)| f.size).sum();
    for (f, cur_sha) in &todo {
        p.file = f.path.clone();
        progress(&p);
        update_file(game, m, f, *cur_sha, &mut sum, &mut |done| {
            let mut q = p.clone();
            q.bytes_done += done;
            q.downloaded = m.downloaded.load(Ordering::Relaxed) - base_dl;
            q.reused = sum_reused_hint(done);
            q.mirror = m.current_host();
            progress(&q);
        })?;
        sum.updated += 1;
        p.files_done += 1;
        p.bytes_done += f.size;
        p.downloaded = m.downloaded.load(Ordering::Relaxed) - base_dl;
        p.reused = sum.reused;
        p.from_cache = sum.from_cache;
    }

    // 3. files of the previous version that the new one doesn't have
    for f in &old.files {
        if !man.files.iter().any(|n| n.path == f.path) {
            let path = game.file(&f.path);
            if path.is_file() {
                stash(game, &path, None);
                if fs::remove_file(&path).is_ok() {
                    sum.removed += 1;
                }
            }
        }
    }

    // 4. remember what is installed
    let files = man
        .files
        .iter()
        .map(|f| {
            let (size, mt) = mtime(&game.file(&f.path)).unwrap_or((0, 0));
            StateFile { path: f.path.clone(), size, mtime: mt, sha: hex(&f.sha) }
        })
        .collect();
    game.save_state(&State { version: man.version.clone(), channel: opt.channel.clone(), files })?;
    prune_cache(game, opt.cache_limit);
    sum.downloaded = m.downloaded.load(Ordering::Relaxed) - base_dl;
    p.phase = "done".into();
    p.downloaded = sum.downloaded;
    p.reused = sum.reused;
    p.from_cache = sum.from_cache;
    p.bytes_done = p.bytes_total;
    progress(&p);
    Ok(sum)
}

fn sum_reused_hint(_done: u64) -> u64 {
    0
}

fn update_file(game: &Game, m: &Mirrors, f: &FileEntry, cur_sha: Option<[u8; 32]>, sum: &mut Summary, tick: &mut dyn FnMut(u64)) -> Result<(), Error> {
    let dst = game.file(&f.path);
    if let Some(parent) = dst.parent() {
        fs::create_dir_all(parent)?;
    }
    let tmp = dst.with_file_name(format!("{}.eliteupd", dst.file_name().unwrap().to_string_lossy()));
    let shahex = hex(&f.sha);

    // a) exact file in the version cache
    let cached = game.cache_dir().join(&shahex);
    if cached.is_file() {
        if fs::copy(&cached, &tmp).is_ok() && File::open(&tmp).and_then(cdc::sha256).map(|(s, z)| s == f.sha && z == f.size).unwrap_or(false) {
            if dst.exists() {
                stash(game, &dst, cur_sha);
            }
            fs::rename(&tmp, &dst)?;
            sum.from_cache += f.size;
            tick(f.size);
            return Ok(());
        }
        let _ = fs::remove_file(&tmp);
        let _ = fs::remove_file(&cached);
    }

    // a2) the whole file from another launcher on the local network; taken only if its SHA-256 is the manifest's
    if f.size >= 256 * 1024 {
        let got = File::create(&tmp).map(|mut t| crate::lan::fetch(&shahex, f.size, &mut t, &m.cancel)).unwrap_or(false);
        if got && File::open(&tmp).and_then(cdc::sha256).map(|(s, z)| s == f.sha && z == f.size).unwrap_or(false) {
            if dst.exists() {
                stash(game, &dst, cur_sha);
            }
            fs::rename(&tmp, &dst)?;
            sum.from_lan += f.size;
            tick(f.size);
            return Ok(());
        }
        let _ = fs::remove_file(&tmp);
    }

    // b) build from the old file + downloaded chunks
    let mut have: HashMap<u64, (u64, u32)> = HashMap::new();
    let mut old = File::open(&dst).ok();
    if let Some(o) = old.as_mut() {
        let mut ch = cdc::Chunker::default();
        let mut buf = vec![0u8; 1 << 22];
        loop {
            let n = o.read(&mut buf)?;
            if n == 0 {
                break;
            }
            ch.feed(&buf[..n]);
        }
        let mut off = 0u64;
        for c in ch.finish() {
            have.entry(c.hash).or_insert((off, c.len));
            off += c.len as u64;
        }
    }
    let blob = format!("blobs/{shahex}");
    let mut out = std::io::BufWriter::with_capacity(1 << 20, File::create(&tmp)?);
    // План: участки «скачать» (смещения в новом файле) и «взять со старого файла». Короткие куски со старого файла
    // между двумя скачиваемыми участками выгоднее докачать одним запросом: каждый лишний запрос — это пинг
    // (из России до сервера 50–80 мс), а 512 КБ на нормальном канале качаются быстрее.
    const MERGE_GAP: u64 = 512 * 1024;
    enum Seg { Get(u64, u64), Copy(u64, u64, u32) } // Get(from, to); Copy(pos, old_off, len)
    let mut plan: Vec<Seg> = Vec::new();
    let mut pos = 0u64;
    for c in &f.chunks {
        match (have.get(&c.hash), old.is_some()) {
            (Some(&(off, len)), true) if len == c.len => plan.push(Seg::Copy(pos, off, len)),
            _ => match plan.last_mut() {
                Some(Seg::Get(_, to)) if *to == pos => *to = pos + c.len as u64,
                _ => plan.push(Seg::Get(pos, pos + c.len as u64)),
            },
        }
        pos += c.len as u64;
    }
    // слить Get + (короткие Copy) + Get в один Get
    let mut merged: Vec<Seg> = Vec::new();
    let mut i = 0;
    while i < plan.len() {
        if let Seg::Get(from, mut to) = plan[i] {
            let mut j = i + 1;
            loop {
                let mut k = j; let mut gap = 0u64;
                while k < plan.len() { if let Seg::Copy(_, _, l) = plan[k] { gap += l as u64; k += 1; } else { break; } }
                if k < plan.len() && k > j && gap <= MERGE_GAP { if let Seg::Get(_, t2) = plan[k] { to = t2; j = k + 1; continue; } }
                break;
            }
            merged.push(Seg::Get(from, to)); i = j;
        } else {
            if let Seg::Copy(p0, o, l) = plan[i] { merged.push(Seg::Copy(p0, o, l)); }
            i += 1;
        }
    }
    let mut cbuf = vec![0u8; cdc::MAX as usize];
    let result: Result<(), Error> = (|| {
        let mut done = 0u64;
        for sgm in &merged {
            if m.cancel.load(Ordering::Relaxed) {
                return Err(Error::Cancelled);
            }
            match *sgm {
                Seg::Get(from, to) => {
                    out.flush()?;
                    m.get_range(&blob, from, to, out.get_mut())?;
                    done = to;
                    tick(done);
                }
                Seg::Copy(p0, off, len) => {
                    let o = old.as_mut().unwrap();
                    o.seek(SeekFrom::Start(off))?;
                    o.read_exact(&mut cbuf[..len as usize])?;
                    out.write_all(&cbuf[..len as usize])?;
                    sum.reused += len as u64;
                    done = p0 + len as u64;
                }
            }
        }
        let _ = done;
        out.flush()?;
        Ok(())
    })();
    drop(out);
    drop(old);
    if let Err(e) = result {
        let _ = fs::remove_file(&tmp);
        return Err(e);
    }
    let ok = File::open(&tmp).and_then(cdc::sha256).map(|(s, z)| s == f.sha && z == f.size).unwrap_or(false);
    if !ok {
        let _ = fs::remove_file(&tmp);
        return Err(Error::Bad(format!("{}: checksum mismatch after download", f.path)));
    }
    if dst.exists() {
        stash(game, &dst, cur_sha);
    }
    // the copy left by a previous update while the game held the file (see below)
    let old = dst.with_file_name(format!("{}.old", dst.file_name().map(|n| n.to_string_lossy()).unwrap_or_default()));
    let _ = fs::remove_file(&old);
    if let Err(e) = fs::rename(&tmp, &dst) {
        // a running game (or a crashed one still hanging) keeps its DLLs locked: Windows can not overwrite or delete
        // them, but it can rename them - the new file takes the name, the old one goes when the game lets it go
        if !(dst.exists() && fs::rename(&dst, &old).is_ok() && fs::rename(&tmp, &dst).is_ok()) {
            let _ = fs::remove_file(&tmp);
            return Err(Error::Io(format!("{}: {e} (is the game running?)", f.path)));
        }
    }
    tick(f.size);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn orphan_component_uninstall_keeps_shared_files() {
        let dir = std::env::temp_dir().join(format!("elite_orphan_test_{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(dir.join("Elite_DLLs")).unwrap();
        for f in ["MatchTimer.dll", "Old.dll"] { fs::write(dir.join("Elite_DLLs").join(f), b"x").unwrap(); }
        let file = |p: &str| StateFile { path: p.into(), ..Default::default() };
        // the old id installed both; the renamed one (still in the catalog) owns MatchTimer.dll now
        let old = Game::component(&dir, "matchtimer");
        old.save_state(&State { version: "matchtimer-3".into(), channel: "matchtimer".into(),
                                files: vec![file("Elite_DLLs/MatchTimer.dll"), file("Elite_DLLs/Old.dll")] }).unwrap();
        let mut ids = Game::component_ids(&dir); ids.sort();
        assert_eq!(ids, vec!["matchtimer".to_string()]);
        assert_eq!(component_key("matchtimer_r2!"), "matchtimer_r2");
        let removed = old.uninstall_keeping(|p| p.eq_ignore_ascii_case("elite_dlls/matchtimer.dll")).unwrap();
        assert_eq!(removed, vec!["Elite_DLLs/Old.dll".to_string()]);
        assert!(dir.join("Elite_DLLs/MatchTimer.dll").is_file());
        assert!(!dir.join("Elite_DLLs/Old.dll").exists());
        assert!(Game::component_ids(&dir).is_empty(), "the orphan's state is forgotten");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn vanilla_copy_maps_elite_dlls_to_the_patch_folder() {
        let dir = std::env::temp_dir().join(format!("elite_vanilla_test_{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(dir.join("Elite_DLLs")).unwrap();
        let v = Game::vanilla_component(&dir, "automatch");
        assert_eq!(v.rel_path("Elite_DLLs/MMFind.dll"), "dow2-patches/MMFind.dll");
        assert_eq!(v.rel_path("elite_dlls/OwnLobby.ini"), "dow2-patches/OwnLobby.ini");
        assert_eq!(v.rel_path("winmm.dll"), "winmm.dll");
        assert_eq!(Game::component(&dir, "automatch").rel_path("Elite_DLLs/MMFind.dll"), "Elite_DLLs/MMFind.dll");
        let fe = |p: &str| FileEntry { path: p.into(), size: 1, sha: [0; 32], chunks: vec![] };
        let man = Manifest { version: "mmfind-0.45".into(), files: vec![fe("Elite_DLLs/MMFind.dll"), fe("Elite_DLLs/OwnLobby.dll"), fe("winmm.dll"), fe("Elite.exe"), fe("Elite_DLLs/")] };
        let vm = vanilla_files(&man);
        assert_eq!(vm.files.iter().map(|f| f.path.as_str()).collect::<Vec<_>>(), vec!["Elite_DLLs/MMFind.dll", "Elite_DLLs/OwnLobby.dll"]);
        // its own state, never one of the component states the Elite side walks
        fs::create_dir_all(dir.join("dow2-patches")).unwrap();
        fs::write(dir.join("dow2-patches/MMFind.dll"), b"abc").unwrap();
        let (size, mt) = mtime(&dir.join("dow2-patches/MMFind.dll")).unwrap();
        v.save_state(&State { version: "mmfind-0.45".into(), channel: "automatch".into(),
            files: vec![StateFile { path: "Elite_DLLs/MMFind.dll".into(), size, mtime: mt, sha: String::new() }] }).unwrap();
        assert!(Game::component_ids(&dir).is_empty());
        assert_eq!(Game::vanilla_ids(&dir), vec!["automatch".to_string()]);
        assert_eq!(v.intact_files(), vec!["dow2-patches/MMFind.dll".to_string()]);
        fs::write(dir.join("dow2-patches/MMFind.dll"), b"changed by hand").unwrap();
        assert!(v.intact_files().is_empty(), "a file changed by hand is not the launcher's any more");
        assert_eq!(v.uninstall().unwrap(), 1);
        assert!(!dir.join("dow2-patches/MMFind.dll").exists() && !dir.join("Elite_DLLs/MMFind.dll").exists());
        // the loader: put away into the cache and back
        fs::write(dir.join("winmm.dll"), b"loader").unwrap();
        let l = Game::vanilla_loader(&dir);
        let sha = hex(&File::open(dir.join("winmm.dll")).and_then(cdc::sha256).unwrap().0);
        l.save_state(&State { version: "vloader-1".into(), channel: "vanilla".into(), files: vec![StateFile { path: "winmm.dll".into(), size: 6, mtime: 0, sha: sha.clone() }] }).unwrap();
        assert!(l.file_is_installed("winmm.dll"));
        assert!(l.put_away("winmm.dll") && !dir.join("winmm.dll").exists());
        assert!(dir.join(".elite_cache").join(&sha).is_file());
        assert!(!l.file_is_installed("winmm.dll"));
        let _ = fs::remove_dir_all(&dir);
    }
}
