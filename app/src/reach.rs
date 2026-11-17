//! Our servers: ONE pool of hosts and ONE active host for every part of the launcher (1.6.22, owner 17.11.2026: "the chat on
//! one server, the downloads from another, the links on a third, the add-ons on a fourth - make it work the same everywhere").
//!
//! A host is one of our origins (`https://dow2ru.fintebtc.de`) with what it serves: the API (the ladder: chat, the stream, rooms,
//! the rating, the replays, logs, notices, the launcher's own updater.json) and / or the store (launcher.json, the manifests and
//! the blobs under a base path). The hosts come from the build (ELITE_LOG_HOSTS, ELITE_MIRRORS) and the signed launcher.json
//! (`api_hosts`, `mirrors`); a store base on an API host's origin is the same host. A store of its own (Cloudflare R2) is a host
//! that serves files only. Every subsystem asks this module - `api_hosts()` / `call()` for the API, `store_bases()` (through
//! `Store`, the `HostPolicy` of elite-core's `Mirrors`) for the files, `site_base()` for links and pictures - and tells it of a
//! failure on the way (`lost`, `note_err`) or of a host whose long connections die (`set_aside`); none keeps a list of its own.
//!
//! The order (owner 02.11.2026: the launcher must work and download everywhere; no ICMP ping): every host is checked at once
//! (threads) with an HTTPS GET that has to get a STREAM past ~33 KB - the first PROBE_BYTES of the last 120 chat messages on an
//! API host, of `<store>launcher.json` on a store-only one; the time to it is the score. Answered first, fastest first; not
//! checked yet; set aside; no answer at the end. The ACTIVE host - the first API host - is what every request tries first; it
//! stays active while it answers its checks (a check finding another host much faster - much_faster() - moves it), and changes at
//! once when a request to it fails on the way (it goes to the end: the next host that answered is active for everything) or
//! when it is set aside. Checked at the start (the order of the last run until then), every RECHECK_SECS, again in the
//! background after a failure (at most once in 30 s) and by the button in Settings. Each change of the active host is one line
//! in community.log with the reason.
//! 1.4.3 (03.11.2026, noofancy): a check of a tiny file picked a mirror whose streams stop after ~33 KB (DPI) - so the check
//! reads a stream. 1.6.19 (Malum 16.11.2026): a host whose LONG connection dies on this line (the stream cut twice within minutes,
//! a stream cut by the connection test) is set aside for SET_ASIDE_SECS: after every host that answered whatever its time, the
//! mark kept through checks and in the settings over a restart.
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant};

#[derive(Clone, Debug, Default, serde::Serialize, serde::Deserialize)]
pub struct Probe {
    /// The host's origin (`https://dow2ru.fintebtc.de`).
    pub base: String,
    /// The time of the check's answer; None - no answer (or lost since).
    pub ms: Option<u32>,
    #[serde(default)]
    pub err: String,
    /// Set aside until this unix time (0: not): its long connections die on this line (see the head of the file).
    #[serde(default, skip_serializing_if = "is_zero")]
    pub aside_until: u64,
    /// Why it was set aside (community.log, Settings).
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub aside: String,
}
fn is_zero(v: &u64) -> bool { *v == 0 }

/// One of our hosts and what it serves.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Host {
    pub origin: String,
    /// The store's base on it (ends with '/'), "" when it serves no files.
    pub store: String,
    /// It serves our API (the ladder).
    pub api: bool,
}

/// How long a host whose streams die stays set aside.
pub const SET_ASIDE_SECS: u64 = 6 * 3600;
/// A check of every host this often while the launcher runs (the order of the moment; the active host stays unless it fails or
/// another one is MUCH_FASTER).
pub const RECHECK_SECS: u64 = 10 * 60;
pub const NOT_CONFIGURED: &str = "the server is not configured in this build";

impl Probe {
    fn aside_at(&self, now: u64) -> bool { self.aside_until > now }
    /// The place in the order: answered (0), not checked yet (1), set aside but answering (2), no answer (3).
    fn tier(&self, now: u64) -> u8 { if self.ms.is_none() { 3 } else if self.aside_at(now) { 2 } else { 0 } }
}

/// Another host answered so much faster that the active one gives way to it: under half its time and over 300 ms less (two
/// names of one server, or Moscow against Germany 50 ms apart, never swap the host every check).
pub fn much_faster(best: u32, active: u32) -> bool { best.saturating_mul(2) < active && active - best > 300 }

#[derive(Default)]
struct State {
    hosts: Vec<Host>,
    /// The results of the checks (and of the requests since), by origin.
    list: Vec<Probe>,
    checked: bool,
    /// The active host was picked by a time it answered in (a check of this run or the last run's order), not just by the
    /// configured order: only then it holds against a host that is a little faster.
    measured: bool,
    /// The origin every request tries first ("" until there is an API host).
    active: String,
    /// A store base the player typed in (Settings): always the first for the files, never checked.
    own_store: String,
}

static ST: LazyLock<Mutex<State>> = LazyLock::new(|| Mutex::new(State::default()));
static BUSY: AtomicBool = AtomicBool::new(false);
/// A check was asked for while one ran: one more after it (a host added meanwhile is checked too).
static AGAIN: AtomicBool = AtomicBool::new(false);
static LAST: AtomicU64 = AtomicU64::new(0);
/// Called after every check and change of the order (the launcher saves it and tells the window).
static ON_CHECKED: Mutex<Option<Box<dyn Fn(&[Probe]) + Send>>> = Mutex::new(None);
/// Called when the active host changes: (from, to, why) - community.log and the window.
static ON_SWITCH: Mutex<Option<Box<dyn Fn(&str, &str, &str) + Send>>> = Mutex::new(None);

fn now() -> u64 { std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0) }

/// `https://Host:443/a/b` -> `https://host` (the key of a host); "" for anything else than http(s).
pub fn origin_of(url: &str) -> String {
    let u = url.trim();
    let lower = u.to_ascii_lowercase();
    let (scheme, rest) = if lower.starts_with("https://") { ("https", &u[8..]) } else if lower.starts_with("http://") { ("http", &u[7..]) } else { return String::new() };
    let auth = rest.split(['/', '?', '#']).next().unwrap_or("").to_ascii_lowercase();
    let auth = if scheme == "https" { auth.strip_suffix(":443").unwrap_or(&auth).to_string() } else { auth };
    if auth.is_empty() { String::new() } else { format!("{scheme}://{auth}") }
}

pub fn on_checked(f: impl Fn(&[Probe]) + Send + 'static) { *ON_CHECKED.lock().unwrap() = Some(Box::new(f)); }
pub fn on_switch(f: impl Fn(&str, &str, &str) + Send + 'static) { *ON_SWITCH.lock().unwrap() = Some(Box::new(f)); }

/// Our hosts from these lists, in this order of preference: `api` - API origins, `stores` - store bases (`https://h/path/`).
/// `own`: the player's store base (Settings), None - keep the one set before. The results of the checks stay.
pub fn configure(api: &[String], stores: &[String], own: Option<&str>) {
    let hosts = hosts_of(api, stores);
    let (changed, unchecked) = {
        let mut s = ST.lock().unwrap();
        if let Some(o) = own { s.own_store = norm_store(o); }
        let changed = s.hosts != hosts;
        let unchecked = s.checked && hosts.iter().any(|h| !s.list.iter().any(|p| p.base == h.origin));
        s.hosts = hosts;
        (changed, unchecked)
    };
    if changed { refresh_active("the list of our hosts"); }
    if changed && unchecked { check_soon(0); }   // a new host (launcher.json) after this run's check: checked now, not in 10 min
}
fn norm_store(b: &str) -> String {
    let b = b.trim();
    if origin_of(b).is_empty() { String::new() } else if b.ends_with('/') { b.to_string() } else { format!("{b}/") }
}
/// The hosts of `api` and `stores` merged by origin, in the order each origin first appears (an API origin before a store's).
fn hosts_of(api: &[String], stores: &[String]) -> Vec<Host> {
    let mut v: Vec<Host> = Vec::new();
    let mut add = |url: &str, store: bool| {
        let o = origin_of(url);
        if o.is_empty() { return; }
        let i = match v.iter().position(|h| h.origin == o) { Some(i) => i, None => { v.push(Host { origin: o, ..Default::default() }); v.len() - 1 } };
        if store { if v[i].store.is_empty() { v[i].store = norm_store(url); } } else { v[i].api = true; }
    };
    let (mut a, mut s) = (api.iter(), stores.iter());
    loop {   // one of each in turn: the team's order of either list decides, neither list pushes the other to the end
        let (x, y) = (a.next(), s.next());
        if x.is_none() && y.is_none() { break; }
        if let Some(x) = x { add(x, false); }
        if let Some(y) = y { add(y, true); }
    }
    v
}

/// The order of the last run, until this run's first check.
pub fn seed(saved: Vec<Probe>) {
    {
        let mut s = ST.lock().unwrap();
        if s.checked || !s.list.is_empty() { return; }
        s.list = saved.into_iter().map(|mut p| { p.base = origin_of(&p.base); p }).filter(|p| !p.base.is_empty()).collect();
    }
    refresh_active("the order of the last start");
}

/// The hosts in the order to try: the active one, then answered (fastest first), not checked yet (as configured), set aside,
/// no answer.
fn ordered(s: &State) -> Vec<Host> {
    let t = now();
    let rank = |h: &Host| s.list.iter().find(|p| p.base == h.origin).map(|p| (p.tier(t), p.ms.unwrap_or(0))).unwrap_or((1, 0));
    let mut v: Vec<(u8, u32, usize, Host)> = s.hosts.iter().enumerate().map(|(i, h)| { let (a, b) = rank(h); (a, b, i, h.clone()) }).collect();
    v.sort_by_key(|x| (x.0, x.1, x.2));
    let mut out: Vec<Host> = v.into_iter().map(|x| x.3).collect();
    if let Some(i) = out.iter().position(|h| h.origin == s.active) { let h = out.remove(i); out.insert(0, h); }
    out
}
/// The host to be active by the order of the moment: the active one while it answers (unless another one is MUCH_FASTER), else
/// the first API host.
fn pick_active(s: &State) -> String {
    let t = now();
    let probe = |o: &str| s.list.iter().find(|p| p.base == o);
    let mut v: Vec<(u8, u32, usize, &Host)> = s.hosts.iter().enumerate().filter(|(_, h)| h.api)
        .map(|(i, h)| { let (a, b) = probe(&h.origin).map(|p| (p.tier(t), p.ms.unwrap_or(0))).unwrap_or((1, 0)); (a, b, i, h) }).collect();
    v.sort_by_key(|x| (x.0, x.1, x.2));
    let Some(best) = v.first() else { return String::new() };
    if let Some(cur) = v.iter().find(|x| x.3.origin == s.active) {
        let keep = match cur.0 {
            0 => s.measured && !(best.0 == 0 && much_faster(best.1, cur.1)),
            1 => best.0 != 0,    // not checked yet (seeded or new): until a check finds an answering one
            _ => false,          // set aside or no answer
        };
        if keep { return cur.3.origin.clone(); }
    }
    best.3.origin.clone()
}
/// Pick the active host again after a change; a new one is told (log line + window) with `why`.
fn refresh_active(why: &str) {
    let (from, to, list) = {
        let mut s = ST.lock().unwrap();
        let to = pick_active(&s);
        let t = now();
        s.measured = s.list.iter().any(|p| p.base == to && p.tier(t) == 0);
        let from = std::mem::replace(&mut s.active, to.clone());
        (from, to, s.list.clone())
    };
    if from != to {
        if let Some(f) = ON_SWITCH.lock().unwrap().as_ref() { f(&from, &to, why); }
    }
    if let Some(f) = ON_CHECKED.lock().unwrap().as_ref() { f(&list); }
}

/// The active host's origin ("" when no API host is known).
pub fn active() -> String { ST.lock().unwrap().active.clone() }
/// The active host, or our site's default while none is known (a base for an address the game or the window fetches itself).
pub fn active_or_default() -> String { let a = active(); if a.is_empty() { SITE_DEFAULT.to_string() } else { a } }
/// Our API hosts in the order every API request tries them: the active one first.
pub fn api_hosts() -> Vec<String> { ordered(&ST.lock().unwrap()).into_iter().filter(|h| h.api).map(|h| h.origin).collect() }
/// The store bases in the order every download tries them: the player's own, then the active host's, then the others.
pub fn store_bases() -> Vec<String> {
    let s = ST.lock().unwrap();
    let mut v: Vec<String> = if s.own_store.is_empty() { vec![] } else { vec![s.own_store.clone()] };
    for h in ordered(&s) { if !h.store.is_empty() && !v.contains(&h.store) { v.push(h.store); } }
    v
}
/// Every host as Settings shows it: {base, ms, err, aside…, api, files} in the order of the moment, and the active one.
pub fn snapshot() -> (Vec<serde_json::Value>, bool, String) {
    let s = ST.lock().unwrap();
    let rows = ordered(&s).into_iter().map(|h| {
        let p = s.list.iter().find(|p| p.base == h.origin).cloned().unwrap_or(Probe { base: h.origin.clone(), ..Default::default() });
        let mut v = serde_json::to_value(&p).unwrap_or_default();
        v["api"] = serde_json::json!(h.api);
        v["files"] = serde_json::json!(!h.store.is_empty());
        v["checked"] = serde_json::json!(s.list.iter().any(|p| p.base == h.origin));
        v
    }).collect();
    (rows, s.checked, s.active.clone())
}

/// A real request to `host` (an origin or any URL on it) failed on the way: it goes to the end - the next one is active for
/// everything - and the pool is checked again in the background (a host already at the end stays there).
pub fn lost(host: &str, why: &str) {
    let o = origin_of(host);
    if o.is_empty() { return; }
    {
        let mut s = ST.lock().unwrap();
        if !s.hosts.iter().any(|h| h.origin == o) { return; }   // the player's own store, a test server: not ours to order
        let err = format!("lost: {}", why.chars().take(100).collect::<String>());
        match s.list.iter().position(|p| p.base == o) {
            Some(j) => { let mut p = s.list.remove(j); p.ms = None; p.err = err; s.list.push(p); }
            None => s.list.push(Probe { base: o.clone(), ms: None, err, ..Default::default() }),
        }
    }
    refresh_active(&format!("{o} failed: {why}"));
    check_soon(30);
}

/// A request to `host` failed: a failure on the way (no connection, a timeout, a gateway that got no answer) makes the host
/// lost; an answer of the server itself (404, 400, a refusal) says nothing about the way there.
pub fn note_err(host: &str, what: &str, e: &ureq::Error) {
    if way_error(e) { lost(host, &format!("{what}: {e}")); }
}
pub fn way_error(e: &ureq::Error) -> bool { matches!(e, ureq::Error::Transport(_) | ureq::Error::Status(502..=504, _)) }

/// One request to our API: the hosts in order, the active one first, until one answers. `f` makes it on a host's origin; its
/// Ok ends it (a caller that takes a server's refusal as the answer turns it into its Ok). Any error goes on to the next host;
/// a failure on the way also makes the host lost (note_err) - the next one becomes the active host for everything.
pub fn call<T>(what: &str, mut f: impl FnMut(&str) -> Result<T, ureq::Error>) -> Result<T, String> {
    let mut last = NOT_CONFIGURED.to_string();
    for h in api_hosts() {
        match f(&h) {
            Ok(v) => return Ok(v),
            Err(e) => { note_err(&h, what, &e); last = e.to_string(); }
        }
    }
    Err(last)
}

/// `host` is set aside for SET_ASIDE_SECS (`why`: for the log and Settings); the pool is checked again (the mark stays through
/// the check). False when it was set aside already.
pub fn set_aside(host: &str, why: &str) -> bool {
    let o = origin_of(host);
    {
        let mut s = ST.lock().unwrap();
        let t = now();
        let j = match s.list.iter().position(|p| p.base == o) {
            Some(j) => j,
            None => { s.list.push(Probe { base: o.clone(), ms: None, ..Default::default() }); s.list.len() - 1 }
        };
        if s.list[j].aside_at(t) { return false; }
        s.list[j].aside_until = t + SET_ASIDE_SECS;
        s.list[j].aside = why.chars().take(120).collect();
    }
    refresh_active(&format!("{o} set aside: {why}"));
    check_soon(0);
    true
}

/// Check the pool in the background unless a check runs or ran less than `gap` seconds ago (0: always).
pub fn check_soon(gap: u64) {
    #[cfg(test)]
    if !TEST_BACKGROUND.load(Ordering::SeqCst) { return; }   // the unit tests set the results themselves (no network)
    if gap > 0 && now().saturating_sub(LAST.load(Ordering::Relaxed)) < gap { return; }
    if BUSY.swap(true, Ordering::SeqCst) { if gap == 0 { AGAIN.store(true, Ordering::SeqCst); } return; }
    std::thread::spawn(move || {
        loop {
            AGAIN.store(false, Ordering::SeqCst);
            if !ST.lock().unwrap().hosts.is_empty() { check(); }   // nothing to check (not configured yet): the order stays
            if !AGAIN.load(Ordering::SeqCst) { break; }
        }
        BUSY.store(false, Ordering::SeqCst);
    });
}
/// The periodic check: every RECHECK_SECS while the launcher runs (a thread of its own, started once).
pub fn start_recheck() {
    static STARTED: AtomicBool = AtomicBool::new(false);
    if STARTED.swap(true, Ordering::SeqCst) { return; }
    std::thread::spawn(|| loop {
        std::thread::sleep(Duration::from_secs(60));
        check_soon(RECHECK_SECS);
    });
}

fn probe_url(h: &Host) -> String {
    if h.api { format!("{}/ladder/api/c/msgs?room=all&after=0&limit=120", h.origin) } else { format!("{}launcher.json", h.store) }
}

/// What a check reads of an answer: well past the ~33-36 KB where a DPI stops a stream (1.4.3; Malum's lobby check 16.11.2026:
/// "cut 36200 B"), and no more - the chat's answer grows with the chat (60 KB in 11.2026 was 119 KB a few days later), and a
/// check that read all of it in its 8 s failed on a slow line for a size that says nothing. Read as it comes, no gzip: a
/// compressed answer of a few KB would get a host whose streams are cut past the point where it stops.
const PROBE_BYTES: u64 = 64 << 10;
/// The body of a check's answer: Ok(bytes read) when PROBE_BYTES came or the whole answer of at least 16 KB came (1.4.3: a
/// stream, not a ping); a read that stops on the way (a timeout, a reset) is no answer however much came before it.
fn probe_body(r: impl std::io::Read) -> Result<usize, String> {
    use std::io::Read;
    let mut v = Vec::new();
    r.take(PROBE_BYTES).read_to_end(&mut v).map_err(|e| format!("read: stopped after {} KB: {e}", v.len() >> 10))?;
    if v.len() < 16 << 10 { Err(format!("short answer ({} bytes)", v.len())) } else { Ok(v.len()) }
}

/// One host: the time of the answer's first PROBE_BYTES, or why there is none.
fn probe(h: &Host) -> Probe {
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(4))
        .timeout(Duration::from_secs(8))
        .user_agent(concat!("EliteLauncher/", env!("CARGO_PKG_VERSION"), " reach"))
        .try_proxy_from_env(true)
        .build();
    let t = Instant::now();
    // 1.6.20: ureq takes gzip - the check asks for the raw bytes, it measures the stream, not a packed answer
    let res = agent.get(&probe_url(h)).set("Accept-Encoding", "identity").call().map_err(|e| e.to_string()).and_then(|r| probe_body(r.into_reader()).map(|_| ()));
    match res {
        Ok(()) => Probe { base: h.origin.clone(), ms: Some(t.elapsed().as_millis().min(u32::MAX as u128) as u32), err: String::new(), ..Default::default() },
        Err(e) => Probe { base: h.origin.clone(), ms: None, err: e.chars().take(120).collect(), ..Default::default() },
    }
}

/// Check every host at once; the new order is kept.
pub fn check() {
    LAST.store(now(), Ordering::Relaxed);
    let hosts = ST.lock().unwrap().hosts.clone();
    let handles: Vec<_> = hosts.into_iter().map(|h| std::thread::spawn(move || probe(&h))).collect();
    let got: Vec<Probe> = handles.into_iter().filter_map(|h| h.join().ok()).collect();
    keep(got);
    refresh_active("the check of our hosts");
}

/// A check's results become the order (the set-aside marks kept).
fn keep(mut got: Vec<Probe>) {
    let mut s = ST.lock().unwrap();
    let t = now();
    for p in got.iter_mut() {
        if let Some(o) = s.list.iter().find(|o| o.base == p.base && o.aside_at(t)) { p.aside_until = o.aside_until; p.aside = o.aside.clone(); }
    }
    got.sort_by_key(|p| (p.tier(t), p.ms.unwrap_or(0)));   // stable: no answer keeps its order
    s.list = got;
    s.checked = true;
}

/// The store side of elite-core's `Mirrors`: the order and the failures go through this pool.
pub struct Store;
impl elite_core::net::HostPolicy for Store {
    fn bases(&self) -> Vec<String> { store_bases() }
    fn failed(&self, base: &str, why: &str) { lost(base, &format!("files: {why}")) }
}

// ---------- links and pictures: our site on the active host ----------
/// Our site's hosts: rts and dow2 (Germany) and dow2ru (Moscow, a proxy of the same origin) - one site, every path on each.
pub const SITE_HOSTS: [&str; 3] = ["rts.fintebtc.de", "dow2.fintebtc.de", "dow2ru.fintebtc.de"];
/// The site's base when no host of ours is known yet.
pub const SITE_DEFAULT: &str = "https://rts.fintebtc.de";
fn site_host(url: &str) -> Option<(String, usize)> {
    let lower = url.get(..8)?.to_ascii_lowercase();
    let start = if lower.starts_with("https://") { 8 } else if lower.starts_with("http://") { 7 } else { return None };
    let rest = &url[start..];
    let end = rest.find(['/', '?', '#']).unwrap_or(rest.len());
    let auth = rest[..end].to_ascii_lowercase();
    let host = auth.strip_suffix(":443").unwrap_or(&auth);
    SITE_HOSTS.contains(&host).then(|| (host.to_string(), start + end))
}
/// The base of our site: the first of our site's hosts in `hosts` (the API order: the active host first), else rts.
pub fn site_base_of(hosts: &[String]) -> String {
    hosts.iter().find_map(|h| site_host(h).map(|(host, _)| format!("https://{host}"))).unwrap_or_else(|| SITE_DEFAULT.to_string())
}
/// Our site on the active host.
pub fn site_base() -> String { site_base_of(&api_hosts()) }
/// A link to any of our hosts on the `base` host (its path, query and #part kept); any other link as it is.
pub fn site_link(url: &str, base: &str) -> String {
    match site_host(url) {
        Some((_, at)) => format!("{}{}", base.trim_end_matches('/'), &url[at..]),
        None => url.to_string(),
    }
}

#[cfg(test)]
pub(crate) static TEST_LOCK: Mutex<()> = Mutex::new(());
#[cfg(test)]
static TEST_BACKGROUND: AtomicBool = AtomicBool::new(false);

#[cfg(test)]
mod tests {
    use super::*;
    fn v(a: &[&str]) -> Vec<String> { a.iter().map(|s| s.to_string()).collect() }
    fn pr(base: &str, ms: Option<u32>) -> Probe { Probe { base: base.into(), ms, ..Default::default() } }
    const RU: &str = "https://dow2ru.fintebtc.de";
    const DE: &str = "https://dow2.fintebtc.de";
    const RTS: &str = "https://rts.fintebtc.de";
    const R2: &str = "https://pub-x.r2.dev";
    /// The pool as the launcher of 11.2026 has it: launcher.json api_hosts = Moscow, mirrors = Moscow, Germany, R2, rts; the build's
    /// API hosts dow2 and rts. A fresh state, no background checks.
    fn setup() -> std::sync::MutexGuard<'static, ()> {
        let g = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        *ST.lock().unwrap() = State::default();
        *ON_SWITCH.lock().unwrap() = None;
        *ON_CHECKED.lock().unwrap() = None;
        LAST.store(now(), Ordering::Relaxed);
        configure(&v(&[RU, DE, RTS]), &v(&["https://dow2ru.fintebtc.de/eu/s/", "https://dow2.fintebtc.de/eu/s/", "https://pub-x.r2.dev/eu/s/", "https://rts.fintebtc.de/eu/s/"]), Some(""));
        g
    }
    fn switches() -> std::sync::Arc<Mutex<Vec<String>>> {
        let l = std::sync::Arc::new(Mutex::new(vec![]));
        let l2 = l.clone();
        on_switch(move |a, b, why| l2.lock().unwrap().push(format!("{a} -> {b}: {why}")));
        l
    }

    #[test]
    fn one_list_of_hosts_from_both_lists() {
        let _g = setup();
        let h = ST.lock().unwrap().hosts.clone();
        assert_eq!(h.iter().map(|h| (h.origin.as_str(), h.api, h.store.as_str())).collect::<Vec<_>>(), vec![
            (RU, true, "https://dow2ru.fintebtc.de/eu/s/"), (DE, true, "https://dow2.fintebtc.de/eu/s/"),
            (RTS, true, "https://rts.fintebtc.de/eu/s/"), (R2, false, "https://pub-x.r2.dev/eu/s/")], "one of each list in turn");
        assert_eq!(origin_of("HTTPS://Dow2.fintebtc.de:443/eu/s/?x"), DE);
        assert_eq!(origin_of("steam://x"), "");
        // before any check: the configured order, Moscow active for the API and the files alike
        assert_eq!(active(), RU);
        assert_eq!(api_hosts(), v(&[RU, DE, RTS]));
        assert_eq!(store_bases()[0], "https://dow2ru.fintebtc.de/eu/s/");
    }

    #[test]
    fn the_api_and_the_files_go_to_the_same_host_and_fall_back_together() {
        let _g = setup();
        let sw = switches();
        keep(vec![pr(RU, Some(300)), pr(DE, Some(60)), pr(R2, Some(20)), pr(RTS, Some(70))]);
        refresh_active("check");
        assert_eq!(active(), DE, "the fastest API host");
        assert_eq!(api_hosts(), v(&[DE, RTS, RU]));
        assert_eq!(store_bases(), v(&["https://dow2.fintebtc.de/eu/s/", "https://pub-x.r2.dev/eu/s/", "https://rts.fintebtc.de/eu/s/", "https://dow2ru.fintebtc.de/eu/s/"]),
            "the files on the active host first, even with R2 faster");
        // a blob cut on the way to Germany: everything moves to the next host
        lost("https://dow2.fintebtc.de/eu/s/blobs/ab", "files: short read");
        assert_eq!(active(), RTS);
        assert_eq!(api_hosts(), v(&[RTS, RU, DE]));
        assert_eq!(store_bases()[0], "https://rts.fintebtc.de/eu/s/");
        assert_eq!(sw.lock().unwrap().as_slice(), &[
            format!("{RU} -> {DE}: check"),
            format!("{DE} -> {RTS}: {DE} failed: files: short read")]);
        // the player's own mirror stays first for the files and is never ordered
        configure(&v(&[RU, DE, RTS]), &v(&["https://dow2ru.fintebtc.de/eu/s/"]), Some("https://my.example.org/elite"));
        assert_eq!(store_bases()[0], "https://my.example.org/elite/");
        lost("https://my.example.org/elite/blobs/x", "cut");
        assert_eq!(active(), RTS);
    }

    #[test]
    fn the_active_host_stays_unless_it_fails_or_another_is_much_faster() {
        let _g = setup();
        keep(vec![pr(RU, Some(400)), pr(DE, Some(500)), pr(RTS, Some(520))]);
        refresh_active("check");
        assert_eq!(active(), RU);
        // the next check: Germany a little faster now - Moscow stays (no swapping on every check)
        keep(vec![pr(RU, Some(420)), pr(DE, Some(380)), pr(RTS, Some(390))]);
        refresh_active("check");
        assert_eq!(active(), RU);
        assert_eq!(api_hosts(), v(&[RU, DE, RTS]));
        // much faster: under half its time and 300 ms less
        keep(vec![pr(RU, Some(900)), pr(DE, Some(150)), pr(RTS, Some(160))]);
        refresh_active("check");
        assert_eq!(active(), DE);
        assert!(much_faster(150, 900) && !much_faster(150, 400) && !much_faster(380, 420));
        // the active host does not answer a check: the next one
        keep(vec![pr(RU, Some(200)), pr(DE, None), pr(RTS, Some(210))]);
        refresh_active("check");
        assert_eq!(active(), RU);
    }

    #[test]
    fn a_host_set_aside_goes_after_the_answered_ones_and_stays_there_through_a_check() {
        // Malum 16.11.2026: Germany answers the check fastest, but its stream dies every few minutes; Moscow works
        let _g = setup();
        let sw = switches();
        keep(vec![pr(DE, Some(40)), pr(RU, Some(90)), pr(RTS, None)]);
        refresh_active("check");
        assert_eq!(api_hosts(), v(&[DE, RU, RTS]));
        assert!(set_aside(DE, "stream cut twice"));
        assert!(!set_aside(DE, "again"), "once until it ends");
        assert_eq!(api_hosts(), v(&[RU, DE, RTS]), "after the answered ones, before no answer");
        assert_eq!(store_bases()[0], "https://dow2ru.fintebtc.de/eu/s/", "the files follow");
        assert_eq!(sw.lock().unwrap().last().unwrap(), &format!("{DE} -> {RU}: {DE} set aside: stream cut twice"));
        let (rows, _, act) = snapshot();
        assert_eq!(act, RU);
        assert_eq!(rows.iter().find(|r| r["base"] == DE).unwrap()["aside"], "stream cut twice");
        assert_eq!(rows[0]["base"], RU);
        // the next check: Germany's short answer is fast again - the mark stays
        keep(vec![pr(DE, Some(30)), pr(RU, Some(95)), pr(RTS, None)]);
        refresh_active("check");
        assert_eq!(api_hosts(), v(&[RU, DE, RTS]));
        // Moscow lost too: Germany (set aside, but it answers) before nothing
        keep(vec![pr(DE, Some(30)), pr(RU, None), pr(RTS, None)]);
        refresh_active("check");
        assert_eq!(active(), DE);
        // kept in the settings and read back at the next start (an old settings file has no mark)
        let saved = serde_json::to_string(&ST.lock().unwrap().list).unwrap();
        let back: Vec<Probe> = serde_json::from_str(&saved).unwrap();
        assert!(back[0].aside_until > now() + SET_ASIDE_SECS - 60);
        let old: Vec<Probe> = serde_json::from_str(r#"[{"base":"https://de","ms":30,"err":""}]"#).unwrap();
        assert_eq!(old[0].aside_until, 0);
        assert!(!saved.contains("\"aside\":\"\""), "no empty fields: {saved}");
    }

    #[test]
    fn the_last_run_seeds_the_order_and_a_check_replaces_it() {
        let _g = setup();
        // settings of 1.6.21 (net_api; the files' list net_data is dropped): Germany was best
        seed(vec![pr("https://dow2.fintebtc.de/", Some(50)), pr(RU, Some(300))]);
        assert_eq!(active(), DE);
        assert_eq!(api_hosts(), v(&[DE, RU, RTS]));
        keep(vec![pr(RU, Some(80)), pr(DE, None), pr(RTS, None)]);
        refresh_active("check");
        assert_eq!(active(), RU);
        seed(vec![pr(DE, Some(1))]);
        assert_eq!(active(), RU, "a seed after the check changes nothing");
        // the launcher's start: the last run's host holds against one a little faster (two names of one server: no switch, no
        // reconnect of the stream at every start), not against one much faster
        *ST.lock().unwrap() = State::default();
        seed(vec![pr(DE, Some(22)), pr(RTS, Some(20))]);
        configure(&v(&[RU, DE, RTS]), &[], Some(""));
        assert_eq!(active(), RTS);
        keep(vec![pr(DE, Some(18)), pr(RTS, Some(25)), pr(RU, Some(400))]);
        refresh_active("check");
        assert_eq!(active(), RTS);
    }

    #[test]
    fn a_call_falls_back_and_the_fallback_is_active_for_everything() {
        let _g = setup();
        keep(vec![pr(DE, Some(40)), pr(RU, Some(90)), pr(RTS, Some(60))]);
        refresh_active("check");
        let mut tried = vec![];
        let r = call("rooms", |h| { tried.push(h.to_string()); if h == DE { Err(ureq::Error::Status(504, ureq::Response::new(504, "x", "").unwrap())) } else { Ok(h.to_string()) } });
        assert_eq!(r.unwrap(), RTS);
        assert_eq!(tried, v(&[DE, RTS]));
        assert_eq!(active(), RTS);
        assert_eq!(store_bases()[0], "https://rts.fintebtc.de/eu/s/");
        // a refusal of the server (404, 413) goes on to the next host but marks nothing
        let r: Result<String, String> = call("x", |_| Err(ureq::Error::Status(404, ureq::Response::new(404, "x", "").unwrap())));
        assert!(r.is_err());
        assert_eq!(active(), RTS);
        // no hosts at all
        *ST.lock().unwrap() = State::default();
        assert_eq!(call("x", |h| Ok(h.to_string())), Err(NOT_CONFIGURED.to_string()));
    }

    /// A reader that gives `n` bytes, then fails as a stream stopped on the way does (or ends, when `end`).
    struct Cut { n: usize, end: bool }
    impl std::io::Read for Cut {
        fn read(&mut self, b: &mut [u8]) -> std::io::Result<usize> {
            if self.n == 0 { return if self.end { Ok(0) } else { Err(std::io::Error::new(std::io::ErrorKind::TimedOut, "timed out")) }; }
            let k = b.len().min(self.n).min(1400); b[..k].fill(b'x'); self.n -= k; Ok(k)
        }
    }
    #[test]
    fn the_check_reads_past_the_dpi_point_and_no_further() {
        assert_eq!(probe_body(Cut { n: 112 << 10, end: true }), Ok(64 << 10), "the chat's 112 KB: only the first 64 KB are read");
        assert_eq!(probe_body(Cut { n: 1 << 20, end: false }), Ok(64 << 10), "a long answer: 64 KB, no wait for the rest");
        assert_eq!(probe_body(Cut { n: 40 << 10, end: true }), Ok(40 << 10), "a whole answer under 64 KB");
        let e = probe_body(Cut { n: 36200, end: false }).unwrap_err();
        assert!(e.starts_with("read: stopped after 35 KB"), "a stream stopped by a DPI is no answer: {e}");
        assert!(probe_body(Cut { n: 9000, end: true }).unwrap_err().starts_with("short answer"));
        let h = |api, store: &str| Host { origin: "https://h".into(), store: store.into(), api };
        assert_eq!(probe_url(&h(true, "https://h/s/")), "https://h/ladder/api/c/msgs?room=all&after=0&limit=120");
        assert_eq!(probe_url(&h(false, "https://h/s/")), "https://h/s/launcher.json");
    }

    #[test]
    fn links_follow_the_active_host() {
        let ru = "https://dow2ru.fintebtc.de";
        assert_eq!(site_link("https://rts.fintebtc.de/ladder/table?mode=1v1&lang=ru#how", ru), "https://dow2ru.fintebtc.de/ladder/table?mode=1v1&lang=ru#how");
        assert_eq!(site_link("http://dow2.fintebtc.de/stats/?q=1", ru), "https://dow2ru.fintebtc.de/stats/?q=1");
        assert_eq!(site_link("https://rts.fintebtc.de:443/elite/", ru), "https://dow2ru.fintebtc.de/elite/");
        assert_eq!(site_link("https://discord.gg/elitemod", ru), "https://discord.gg/elitemod");
        assert_eq!(site_link("https://rts.fintebtc.de.evil.org/x", ru), "https://rts.fintebtc.de.evil.org/x");
        assert_eq!(site_base_of(&v(&["https://pl.example.org", "https://dow2.fintebtc.de/"])), "https://dow2.fintebtc.de");
        assert_eq!(site_base_of(&[]), SITE_DEFAULT);
        let _g = setup();
        keep(vec![pr(RTS, Some(40)), pr(RU, None), pr(DE, None)]);
        refresh_active("check");
        assert_eq!(site_base(), RTS);
    }

    /// Against the real servers (network): REACH_API / REACH_STORE = ";"-separated lists;
    /// cargo test -p elite-launcher live_check -- --ignored --nocapture
    #[test]
    #[ignore]
    fn live_check() {
        let _g = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let l = |k: &str| std::env::var(k).unwrap_or_default().split(';').filter(|x| !x.is_empty()).map(String::from).collect::<Vec<_>>();
        configure(&l("REACH_API"), &l("REACH_STORE"), Some(""));
        check();
        let (rows, _, act) = snapshot();
        for r in rows { println!("{:>8} {} {}", r["ms"].as_u64().map(|m| format!("{m} ms")).unwrap_or("-".into()), r["base"], r["err"]); }
        println!("active {act}; files {:?}", store_bases());
    }
}
