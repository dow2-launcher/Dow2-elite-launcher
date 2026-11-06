//! Lobbies tab, "Join" (the RoomJoin add-on, 1.4.9): the launcher talks to RoomJoin.dll (RoomJoin 9+) in the running game over
//! a named pipe, `\\.\pipe\EliteRoomJoin-<pid of DOW2.exe>` - one per game process, only for the current user. One JSON object
//! per line: the launcher sends `{"cmd":"join","room":<id>,"name":"..."}`, `{"cmd":"status"}`, `{"cmd":"cancel"}`; the game
//! answers with events (`accepted`, `walking`, `joining`, `in_lobby`, `failed` with a reason) and `status` (screen, in_match,
//! searching, version). A status line comes as soon as the pipe is open: that is the heartbeat - a running game without the
//! pipe has no RoomJoin 9 in it (the add-on off, or an older one), and the player is told to restart the game with it on.
//! (Launcher 1.4.8 wrote Elite_DLLs/RoomJoin.txt and the DLL polled it; that file is gone from the launcher.)
//!
//! Also the links `elite://join/<id>?name=...` (the ladder site's Join on a lobby): the window comes up and the join runs as
//! from the Lobbies tab (see main.rs, the deep-link plugin).
//!
//! 1.4.11 (owner 05.11.2026): vanilla lobbies too. The launcher's vanilla game has RoomJoin.dll in dow2-patches (its copy for
//! vanilla); which game a running DOW2.exe is comes from its command line (Elite's starter adds -modname Elite) - a Join for
//! a vanilla lobby goes only to a vanilla game, an Elite one only to Elite; the other game running -> "wrong_game", the window
//! offers to start the right one once the player has closed this one (the launcher never closes a game itself).
//!
//! Linux: the game runs under Proton, whose named pipes live in its wineserver - a native launcher can't open them (and
//! AF_UNIX in Wine works only from Wine 11: Proton 9 / 10 say WSAEAFNOSUPPORT). So the launcher starts the add-on's
//! Elite_DLLs/rjbridge.exe through the same Proton in the game's prefix (`proton run`: it joins the game's wineserver) and
//! talks to its stdin / stdout - rjbridge passes the bytes to and from the game's pipe unchanged. No port, no file.

use serde_json::{json, Value};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::io::{Read, Write};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// The join session that runs now; a new Join or Cancel moves it on, so an older session's thread stops telling the window.
static GEN: AtomicU64 = AtomicU64::new(0);
/// A link that came before the window was there to take it (the launcher started by the link).
static PENDING: Mutex<Option<(u64, String, &'static str)>> = Mutex::new(None);
/// When this launcher last started the game: its add-ons come in some seconds later (the window waits instead of warning).
static LAUNCHED: Mutex<Option<Instant>> = Mutex::new(None);
pub fn note_launch() { *LAUNCHED.lock().unwrap() = Some(Instant::now()); }
/// When a start of the game did not happen (the UAC question answered No): a Join waiting for that game stops.
static LAUNCH_FAILED: Mutex<Option<Instant>> = Mutex::new(None);
pub fn note_launch_failed() { *LAUNCH_FAILED.lock().unwrap() = Some(Instant::now()); }
/// 1.4.15 (the launcher rooms, lroom.rs): a start of the game since `t0` that did not happen (No to Windows' question).
pub(crate) fn launch_failed_since(t0: Instant) -> bool { LAUNCH_FAILED.lock().unwrap().is_some_and(|t| t >= t0) }
/// The launcher started the game since `t0`, more than `secs` ago.
pub(crate) fn launched_long_ago(t0: Instant, secs: u64) -> bool { LAUNCHED.lock().unwrap().is_some_and(|t| t >= t0 && t.elapsed() > Duration::from_secs(secs)) }
/// The game's window to the front (Windows; elsewhere nothing).
pub(crate) fn bring_to_front(_pid: u32) -> bool {
    #[cfg(windows)]
    { win::to_front(_pid) }
    #[cfg(not(windows))]
    { false }
}

/// Which add-on's pipe: RoomJoin's (Join a lobby) or MMFind's (1.4.15: the launcher rooms, lroom.rs) - its name before "-<pid>"
/// and its bridge for Linux (the same program, built for that pipe).
#[allow(dead_code)]   // prefix: the Windows pipe; bridge: the Linux bridge
pub struct PipeKind { pub prefix: &'static str, pub bridge: &'static str }
pub const RJ: PipeKind = PipeKind { prefix: "EliteRoomJoin", bridge: "rjbridge.exe" };
pub const MMF: PipeKind = PipeKind { prefix: "EliteMMFind", bridge: "mmbridge.exe" };

/// Linux: the game folder of the last bridge (the launcher's own game), for the game's kind (game_kind_linux).
#[cfg_attr(not(target_os = "linux"), allow(dead_code))]
static GAME_DIR: Mutex<Option<std::path::PathBuf>> = Mutex::new(None);

/// JSON lines read from a byte stream.
#[derive(Default)]
struct LineBuf { buf: Vec<u8> }
impl LineBuf {
    fn take(&mut self) -> Option<Value> {
        while let Some(p) = self.buf.iter().position(|&b| b == b'\n') {
            let l: Vec<u8> = self.buf.drain(..=p).collect();
            if let Ok(v) = serde_json::from_slice::<Value>(&l[..l.len() - 1]) { return Some(v); }
        }
        None
    }
    fn push(&mut self, b: &[u8]) { self.buf.extend_from_slice(b); if self.buf.len() > 256 * 1024 { self.buf.clear(); } }
}
fn line_of(v: &Value) -> Vec<u8> { let mut t = v.to_string(); t.push('\n'); t.into_bytes() }

/// Linux: rjbridge.exe of the add-on, through the game's Proton, to the game's pipe. Its stdout is read by a thread.
#[cfg_attr(not(target_os = "linux"), allow(dead_code))]
pub struct BridgeConn { child: std::process::Child, stdin: std::process::ChildStdin, rx: std::sync::mpsc::Receiver<Vec<u8>>, lb: LineBuf }
#[cfg_attr(not(target_os = "linux"), allow(dead_code))]
impl BridgeConn {
    /// rjbridge.exe exactly as the running game's wine runs: its environment (prefix, ESYNC / FSYNC, DLL paths - a wine
    /// client with other sync settings is refused by the game's wineserver) taken from the game's own process, its loader.
    #[cfg(target_os = "linux")]
    fn command(app: &AppHandle, pk: &PipeKind) -> Option<std::process::Command> {
        use tauri::Manager;
        let st = app.state::<crate::App>();
        let dir = crate::game_dir(&st)?;
        // the add-on's copy for Elite, or its vanilla copy (the same file) when only that one is there
        let exe = [dir.join("Elite_DLLs").join(pk.bridge), dir.join(elite_core::update::VANILLA_DIR).join(pk.bridge)].into_iter().find(|p| p.is_file())?;
        *GAME_DIR.lock().unwrap() = Some(dir.clone());
        let env = game_env(Some(&dir))?;
        let loader = env.iter().find(|(k, _)| k == "WINELOADER").map(|(_, v)| std::path::PathBuf::from(v)).filter(|p| p.is_file())
            .or_else(|| {
                let appid = st.config.lock().unwrap().as_ref().map(|c| c.game.steam_appid).unwrap_or(56400);
                elite_core::proton::plan(&dir, appid).ok().map(|r| r.proton.with_file_name("files").join("bin").join("wine")).filter(|p| p.is_file())
            })
            .unwrap_or_else(|| "wine".into());
        let mut c = std::process::Command::new(loader);
        c.arg(&exe).current_dir(&dir).env_clear().envs(env);
        Some(c)
    }
    #[cfg(not(target_os = "linux"))]
    fn command(_app: &AppHandle, _pk: &PipeKind) -> Option<std::process::Command> { None }
    pub fn open(app: &AppHandle, pk: &PipeKind) -> Option<BridgeConn> {
        use std::process::Stdio;
        let mut cmd = Self::command(app, pk)?;
        cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null());
        let mut child = cmd.spawn().ok()?;
        let (stdin, mut out) = (child.stdin.take()?, child.stdout.take()?);
        let (tx, rx) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            let mut b = [0u8; 8192];
            while let Ok(n) = out.read(&mut b) { if n == 0 || tx.send(b[..n].to_vec()).is_err() { break; } }
        });
        Some(BridgeConn { child, stdin, rx, lb: LineBuf::default() })
    }
    fn send(&mut self, v: &Value) -> bool { self.stdin.write_all(&line_of(v)).and_then(|_| self.stdin.flush()).is_ok() }
    /// The next JSON line within `ms`: Ok(None) = nothing yet, Err = the bridge ended (no pipe, or the game ended).
    fn line(&mut self, ms: u64) -> Result<Option<Value>, ()> {
        if let Some(v) = self.lb.take() { return Ok(Some(v)); }
        let end = Instant::now() + Duration::from_millis(ms.max(1));
        loop {
            let left = end.saturating_duration_since(Instant::now());
            match self.rx.recv_timeout(left) {
                Ok(b) => { self.lb.push(&b); if let Some(v) = self.lb.take() { return Ok(Some(v)); } }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => return Ok(None),
                Err(_) => return Err(()),
            }
            if Instant::now() >= end { return Ok(None); }
        }
    }
}
impl Drop for BridgeConn {
    fn drop(&mut self) { let _ = self.child.kill(); let _ = self.child.wait(); }   // (its stdin closing would end it too)
}
/// The environment of the running game's wine process (Linux: /proc/<pid>/environ of the process whose command line names
/// DOW2.exe and that has a WINEPREFIX), without what only that process may have (its wineserver socket fd, the preloader's
/// reservation); path lists keep only the folders that exist here (the game may run inside the Steam runtime's container).
/// 1.4.15 (stands 06.11.2026: two games under two Wine prefixes on one machine - the bridge went into the other one): the game
/// of the launcher's own folder first - the DOW2.exe whose working directory is that folder (Steam / Proton start it there),
/// then any.
#[cfg(target_os = "linux")]
fn game_pids_linux(dir: Option<&std::path::Path>) -> Vec<u32> {
    let mut v: Vec<(bool, u32)> = Vec::new();
    let want = dir.and_then(|d| std::fs::canonicalize(d).ok());
    for e in std::fs::read_dir("/proc").into_iter().flatten().flatten() {
        let Ok(pid) = e.file_name().to_string_lossy().parse::<u32>() else { continue };
        let Ok(cmd) = std::fs::read(format!("/proc/{pid}/cmdline")) else { continue };
        if !String::from_utf8_lossy(&cmd).to_ascii_lowercase().contains("dow2.exe") { continue; }
        let mine = want.as_ref().is_some_and(|w| std::fs::read_link(format!("/proc/{pid}/cwd")).ok().and_then(|c| std::fs::canonicalize(c).ok()).as_ref() == Some(w));
        v.push((!mine, pid));
    }
    v.sort();
    v.into_iter().map(|(_, p)| p).collect()
}
#[cfg(target_os = "linux")]
fn game_env(dir: Option<&std::path::Path>) -> Option<Vec<(String, String)>> {
    for pid in game_pids_linux(dir) {
        let Ok(raw) = std::fs::read(format!("/proc/{pid}/environ")) else { continue };
        let env: Vec<(String, String)> = String::from_utf8_lossy(&raw).split('\0')
            .filter_map(|kv| kv.split_once('=').map(|(k, v)| (k.to_string(), v.to_string())))
            .filter(|(k, _)| !matches!(k.as_str(), "WINESERVERSOCKET" | "WINELOADERNOEXEC" | "WINEPRELOADRESERVE" | "_"))
            .map(|(k, v)| if matches!(k.as_str(), "LD_LIBRARY_PATH" | "PATH" | "WINEDLLPATH") {
                let keep: Vec<&str> = v.split(':').filter(|d| !d.is_empty() && std::path::Path::new(d).is_dir()).collect();
                (k, keep.join(":"))
            } else { (k, v) })
            .collect();
        if env.iter().any(|(k, _)| k == "WINEPREFIX") { return Some(env); }
    }
    None
}

/// Which game a DOW2.exe runs, from its command line: "elite" (-modname: Elite's starter, the public test, old Elite as a mod)
/// or "vanilla"; None = not known (the command line could not be read).
pub fn kind_of_cmdline(cmd: &str) -> &'static str {
    let l = cmd.to_ascii_lowercase();
    if l.contains("-modname") || l.contains("/modname") { "elite" } else { "vanilla" }
}
#[cfg(target_os = "linux")]
fn game_kind_linux() -> Option<&'static str> {
    let dir = GAME_DIR.lock().unwrap().clone();
    for pid in game_pids_linux(dir.as_deref()) {                   // 1.4.15: the launcher's own game first
        let Ok(cmd) = std::fs::read(format!("/proc/{pid}/cmdline")) else { continue };
        let c = String::from_utf8_lossy(&cmd).replace('\0', " ");
        // the game's own process (its command line starts with the exe), not a shell or Proton's script naming it
        let first = c.split_whitespace().next().unwrap_or("").to_ascii_lowercase();
        if first.ends_with("dow2.exe") { return Some(kind_of_cmdline(&c)); }
    }
    None
}
/// The game a connection talks to.
pub(crate) fn kind(c: &Conn) -> Option<&'static str> {
    match c {
        #[cfg(windows)]
        Conn::Pipe(p) => win::kind(p.pid),
        #[cfg(target_os = "linux")]
        Conn::Bridge(_) => game_kind_linux(),
        #[allow(unreachable_patterns)]
        _ => None,
    }
}

/// A game's connection, whichever way it goes.
#[cfg_attr(not(target_os = "linux"), allow(dead_code))]
pub enum Conn { #[cfg(windows)] Pipe(win::Conn), Bridge(BridgeConn) }
impl Conn {
    pub(crate) fn send(&mut self, v: &Value) -> bool {
        match self { #[cfg(windows)] Conn::Pipe(c) => c.send(v), Conn::Bridge(c) => c.send(v) }
    }
    pub(crate) fn line(&mut self, ms: u64) -> Result<Option<Value>, ()> {
        match self { #[cfg(windows)] Conn::Pipe(c) => c.line(ms), Conn::Bridge(c) => c.line(ms) }
    }
    /// The first line the game sends on a new connection: its status (through the bridge: once it is up).
    pub(crate) fn status(&mut self) -> Option<Value> {
        let end = Instant::now() + Duration::from_millis(if matches!(self, Conn::Bridge(_)) { 15000 } else { 1500 });
        while Instant::now() < end {
            match self.line(300) {
                Ok(Some(v)) if v["ev"] == "status" => return Some(v),
                Ok(_) => {}
                Err(_) => return None,
            }
        }
        None
    }
    /// The game process on Windows (its window to the front); 0 through the bridge.
    pub(crate) fn pid(&self) -> u32 { match self { #[cfg(windows)] Conn::Pipe(c) => c.pid, Conn::Bridge(_) => 0 } }
}
/// Every game this launcher can talk to, with its status: the pipes of all DOW2.exe (Windows); the game through rjbridge (Linux).
fn games(app: &AppHandle) -> Vec<(Conn, Value)> { games_of(app, &RJ) }
/// The same for either add-on's pipe (1.4.15: MMFind's for the launcher rooms).
pub(crate) fn games_of(_app: &AppHandle, pk: &PipeKind) -> Vec<(Conn, Value)> {
    #[allow(unused_mut)]
    let mut out: Vec<(Conn, Value)> = Vec::new();
    #[cfg(windows)]
    for p in win::game_pids() { if let Some(mut c) = win::Conn::open(p, pk.prefix).map(Conn::Pipe) { if let Some(s) = c.status() { out.push((c, s)); } } }
    #[cfg(target_os = "linux")]
    if crate::is_game_running() {
        let t0 = Instant::now();
        if let Some(mut c) = BridgeConn::open(_app, pk).map(Conn::Bridge) {
            if let Some(s) = c.status() { crate::c_log(&format!("rooms: {} up in {} ms", pk.bridge, t0.elapsed().as_millis())); out.push((c, s)); }
        }
    }
    out
}

/// `elite://join/<id>?name=<url-encoded>` -> (room id, name); anything else -> None. The id: digits only (Relic's
/// advertisement id), the name: printable, at most 64 characters.
pub fn parse_link(url: &str) -> Option<(u64, String)> {
    let u = url.trim();
    let rest = u.get(..8).filter(|p| p.eq_ignore_ascii_case("elite://")).map(|_| &u[8..])?;
    let (path, query) = match rest.split_once('?') { Some((p, q)) => (p, q), None => (rest, "") };
    let path = path.trim_end_matches('/');
    let (verb, id) = path.split_once('/')?;
    if !verb.eq_ignore_ascii_case("join") || id.is_empty() || id.len() > 20 || !id.bytes().all(|b| b.is_ascii_digit()) { return None; }
    let id: u64 = id.parse().ok().filter(|&n| n > 0)?;
    let mut name = String::new();
    for kv in query.split('&') {
        if let Some(v) = kv.strip_prefix("name=") { name = pct_decode(v); }
    }
    let name: String = name.chars().filter(|c| !c.is_control()).take(64).collect();
    Some((id, name))
}
fn pct_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        match b[i] {
            b'+' => { out.push(b' '); i += 1; }
            b'%' if i + 2 < b.len() => {
                match u8::from_str_radix(std::str::from_utf8(&b[i + 1..i + 3]).unwrap_or("zz"), 16) {
                    Ok(v) => { out.push(v); i += 3; }
                    Err(_) => { out.push(b'%'); i += 1; }
                }
            }
            c => { out.push(c); i += 1; }
        }
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// A link: to the window now (it runs the same Join as the Lobbies tab, with its checks), and kept for a window that is not
/// up yet (`room_link_take`).
pub fn on_link(app: &AppHandle, url: &str) {
    let Some((id, name)) = parse_link(url) else { crate::c_log(&format!("rooms: link not understood: {}", url.chars().take(200).collect::<String>())); return; };
    let game = link_game(url);
    crate::c_log(&format!("rooms: link to join room {id} ({name}{})", if game.is_empty() { String::new() } else { format!(", {game}") }));
    *PENDING.lock().unwrap() = Some((id, name.clone(), game));
    let _ = app.emit("room_link", json!({"id": id.to_string(), "name": name, "game": game}));
}

/// 1.4.11: `&game=vanilla` / `&game=elite` of a link ("" - not said: the window finds the room's game in the list).
pub fn link_game(url: &str) -> &'static str {
    let q = url.split_once('?').map(|(_, q)| q).unwrap_or("");
    for kv in q.split('&') {
        if let Some(v) = kv.strip_prefix("game=") {
            if v.eq_ignore_ascii_case("vanilla") { return "vanilla"; }
            if v.eq_ignore_ascii_case("elite") { return "elite"; }
        }
    }
    ""
}

/// The window asks for a link it may have missed (it was still loading); a link is taken once.
#[tauri::command]
pub fn room_link_take() -> Value {
    match PENDING.lock().unwrap().take() {
        Some((id, name, game)) => json!({"id": id.to_string(), "name": name, "game": game}),
        None => Value::Null,
    }
}

#[cfg(windows)]
mod win {
    use serde_json::Value;
    use std::fs::{File, OpenOptions};
    use std::io::{Read, Write};
    use std::os::windows::fs::OpenOptionsExt;
    use std::os::windows::io::AsRawHandle;
    use std::time::{Duration, Instant};

    #[repr(C)]
    struct Entry { size: u32, usage: u32, pid: u32, heap: usize, module: u32, threads: u32, parent: u32, prio: i32, flags: u32, exe: [u16; 260] }
    #[repr(C)]
    #[derive(Default, Clone, Copy)]
    struct FileTime { lo: u32, hi: u32 }
    #[link(name = "kernel32")]
    extern "system" {
        fn CreateToolhelp32Snapshot(flags: u32, pid: u32) -> isize;
        fn Process32FirstW(snap: isize, e: *mut Entry) -> i32;
        fn Process32NextW(snap: isize, e: *mut Entry) -> i32;
        fn CloseHandle(h: isize) -> i32;
        fn OpenProcess(access: u32, inherit: i32, pid: u32) -> isize;
        fn GetProcessTimes(h: isize, c: *mut FileTime, e: *mut FileTime, k: *mut FileTime, u: *mut FileTime) -> i32;
        fn GetSystemTimeAsFileTime(t: *mut FileTime);
        fn PeekNamedPipe(h: isize, buf: *mut u8, size: u32, read: *mut u32, avail: *mut u32, left: *mut u32) -> i32;
        fn GetNamedPipeServerProcessId(h: isize, pid: *mut u32) -> i32;
        fn WaitNamedPipeW(name: *const u16, ms: u32) -> i32;
    }
    #[link(name = "ntdll")]
    extern "system" {
        fn NtQueryInformationProcess(h: isize, class: u32, info: *mut u8, len: u32, ret: *mut u32) -> i32;
    }
    /// The command line of a process (ProcessCommandLineInformation, Windows 8.1+; limited query rights are enough, also for
    /// the elevated game Elite's starter runs). None: can't be read.
    pub fn cmdline(pid: u32) -> Option<String> {
        unsafe {
            let h = OpenProcess(0x1000 /* PROCESS_QUERY_LIMITED_INFORMATION */, 0, pid);
            if h == 0 { return None; }
            let mut buf = vec![0u8; 8192];
            let mut ret = 0u32;
            let st = NtQueryInformationProcess(h, 60 /* ProcessCommandLineInformation */, buf.as_mut_ptr(), buf.len() as u32, &mut ret);
            CloseHandle(h);
            if st < 0 { return None; }
            // UNICODE_STRING { u16 Length, u16 MaximumLength, PWSTR Buffer } with the text right behind it, in our buffer
            let len = u16::from_le_bytes([buf[0], buf[1]]) as usize;
            let ptr = std::ptr::read_unaligned(buf.as_ptr().add(std::mem::size_of::<usize>()) as *const usize) as *const u16;
            let (lo, hi) = (buf.as_ptr() as usize, buf.as_ptr() as usize + buf.len());
            if ptr.is_null() || (ptr as usize) < lo || (ptr as usize) + len > hi { return None; }
            Some(String::from_utf16_lossy(std::slice::from_raw_parts(ptr, len / 2)))
        }
    }
    #[repr(C)]
    struct ModEntry { size: u32, module_id: u32, pid: u32, glbl: u32, proc_cnt: u32, base: *mut u8, base_size: u32, hmod: isize,
                      module: [u16; 256], path: [u16; 260] }
    #[link(name = "kernel32")]
    extern "system" {
        fn Module32FirstW(snap: isize, e: *mut ModEntry) -> i32;
        fn Module32NextW(snap: isize, e: *mut ModEntry) -> i32;
    }
    /// The paths of the modules a process has loaded (None: not allowed - e.g. the elevated game of Elite's starter).
    pub fn modules(pid: u32) -> Option<Vec<String>> {
        unsafe {
            let snap = CreateToolhelp32Snapshot(0x8 | 0x10 /* TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32 */, pid);
            if snap == -1 { return None; }
            let mut e: ModEntry = std::mem::zeroed(); e.size = std::mem::size_of::<ModEntry>() as u32;
            let mut out = Vec::new();
            let mut ok = Module32FirstW(snap, &mut e);
            while ok != 0 {
                let n = e.path.iter().position(|&c| c == 0).unwrap_or(e.path.len());
                out.push(String::from_utf16_lossy(&e.path[..n]));
                ok = Module32NextW(snap, &mut e);
            }
            CloseHandle(snap);
            if out.is_empty() { None } else { Some(out) }
        }
    }
    /// Which game a DOW2.exe runs: its command line (Windows 8.1+), else what it has loaded - a DLL from Elite_DLLs = Elite,
    /// one from dow2-patches = vanilla (Profiler.dll says nothing: Elite's copy replaces the game's own, vanilla loads it too,
    /// stand 05.11). None: not known (then nothing is decided by it).
    pub fn kind(pid: u32) -> Option<&'static str> {
        if let Some(l) = cmdline(pid) { return Some(super::kind_of_cmdline(&l)); }
        let m: Vec<String> = modules(pid)?.into_iter().map(|p| p.to_ascii_lowercase()).collect();
        if m.iter().any(|l| l.contains("\\elite_dlls\\")) { return Some("elite"); }
        if m.iter().any(|l| l.contains("\\dow2-patches\\")) { return Some("vanilla"); }
        None
    }
    #[link(name = "user32")]
    extern "system" {
        fn EnumWindows(cb: extern "system" fn(isize, isize) -> i32, l: isize) -> i32;
        fn GetWindowThreadProcessId(w: isize, pid: *mut u32) -> u32;
        fn IsWindowVisible(w: isize) -> i32;
        fn GetWindow(w: isize, cmd: u32) -> isize;
        fn IsIconic(w: isize) -> i32;
        fn ShowWindow(w: isize, cmd: i32) -> i32;
        fn SetForegroundWindow(w: isize) -> i32;
    }

    /// The process ids of every running DOW2.exe (two copies of the game: two pipes).
    pub fn game_pids() -> Vec<u32> {
        let mut out = Vec::new();
        unsafe {
            let snap = CreateToolhelp32Snapshot(2 /* TH32CS_SNAPPROCESS */, 0);
            if snap == -1 { return out; }
            let mut e: Entry = std::mem::zeroed(); e.size = std::mem::size_of::<Entry>() as u32;
            let mut ok = Process32FirstW(snap, &mut e);
            while ok != 0 {
                let n = e.exe.iter().position(|&c| c == 0).unwrap_or(e.exe.len());
                if String::from_utf16_lossy(&e.exe[..n]).eq_ignore_ascii_case("DOW2.exe") { out.push(e.pid); }
                ok = Process32NextW(snap, &mut e);
            }
            CloseHandle(snap);
        }
        out
    }
    /// How long the process has run (None: can't be asked).
    pub fn age(pid: u32) -> Option<Duration> {
        unsafe {
            let h = OpenProcess(0x1000 /* PROCESS_QUERY_LIMITED_INFORMATION */, 0, pid);
            if h == 0 { return None; }
            let (mut c, mut e, mut k, mut u, mut now) = (FileTime::default(), FileTime::default(), FileTime::default(), FileTime::default(), FileTime::default());
            let ok = GetProcessTimes(h, &mut c, &mut e, &mut k, &mut u);
            CloseHandle(h);
            if ok == 0 { return None; }
            GetSystemTimeAsFileTime(&mut now);
            let t = |f: FileTime| ((f.hi as u64) << 32) | f.lo as u64;
            Some(Duration::from_micros(t(now).saturating_sub(t(c)) / 10))
        }
    }
    /// EnumWindows' callback: l points to (the pid looked for, the window found)
    extern "system" fn by_pid(w: isize, l: isize) -> i32 {
        unsafe {
            let want = &mut *(l as *mut (u32, isize));
            let mut pid = 0u32; GetWindowThreadProcessId(w, &mut pid);
            if pid == want.0 && IsWindowVisible(w) != 0 && GetWindow(w, 4 /* GW_OWNER */) == 0 { want.1 = w; return 0; }
        }
        1
    }
    /// The game's window to the front, found by its process id (review of RoomJoin 8 p.10: not by the title), restored if
    /// minimized. Right after the player's click in the launcher, Windows lets the launcher hand the foreground on.
    pub fn to_front(pid: u32) -> bool {
        unsafe {
            let mut want: (u32, isize) = (pid, 0);
            EnumWindows(by_pid, &mut want as *mut (u32, isize) as isize);
            let w = want.1;
            if w == 0 { return false; }
            if IsIconic(w) != 0 { ShowWindow(w, 9 /* SW_RESTORE */); }
            SetForegroundWindow(w) != 0
        }
    }

    /// One client connection to a game's pipe.
    pub struct Conn { f: File, buf: Vec<u8>, pub pid: u32 }
    impl Conn {
        /// Open the pipe of this game process; None = it has no RoomJoin 9 (or it is not up yet).
        pub fn open(pid: u32, prefix: &str) -> Option<Conn> {
            let name = format!(r"\\.\pipe\{prefix}-{pid}");
            let wide: Vec<u16> = name.encode_utf16().chain(std::iter::once(0)).collect();
            for _ in 0..6 {
                // SECURITY_IDENTIFICATION: whoever serves the pipe can't act as us
                match OpenOptions::new().read(true).write(true).security_qos_flags(0x0001_0000).open(&name) {
                    Ok(f) => {
                        let mut server = 0u32;
                        let ok = unsafe { GetNamedPipeServerProcessId(f.as_raw_handle() as isize, &mut server) } != 0;
                        if ok && server != pid { return None; }               // somebody else's pipe under the game's name
                        return Some(Conn { f, buf: Vec::new(), pid });
                    }
                    Err(e) if e.raw_os_error() == Some(231 /* ERROR_PIPE_BUSY */) => unsafe { WaitNamedPipeW(wide.as_ptr(), 300); },
                    Err(_) => return None,
                }
            }
            None
        }
        pub fn send(&mut self, v: &Value) -> bool {
            let mut s = v.to_string(); s.push('\n');
            self.f.write_all(s.as_bytes()).and_then(|_| self.f.flush()).is_ok()
        }
        /// The next JSON line within `ms`: Ok(None) = nothing yet, Err = the pipe closed (the game ended).
        pub fn line(&mut self, ms: u64) -> Result<Option<Value>, ()> {
            let end = Instant::now() + Duration::from_millis(ms);
            loop {
                while let Some(p) = self.buf.iter().position(|&b| b == b'\n') {
                    let l: Vec<u8> = self.buf.drain(..=p).collect();
                    if let Ok(v) = serde_json::from_slice::<Value>(&l[..l.len() - 1]) { return Ok(Some(v)); }
                }
                let mut avail = 0u32;
                if unsafe { PeekNamedPipe(self.f.as_raw_handle() as isize, std::ptr::null_mut(), 0, std::ptr::null_mut(), &mut avail, std::ptr::null_mut()) } == 0 {
                    return Err(());
                }
                if avail > 0 {
                    let mut b = vec![0u8; avail.min(16384) as usize];
                    match self.f.read(&mut b) { Ok(0) | Err(_) => return Err(()), Ok(n) => self.buf.extend_from_slice(&b[..n]) }
                    if self.buf.len() > 256 * 1024 { self.buf.clear(); }
                    continue;
                }
                if Instant::now() >= end { return Ok(None); }
                std::thread::sleep(Duration::from_millis(40));
            }
        }
    }
}

/// Before a Join: is the game running, and does it have RoomJoin's pipe. `young`: a game started less than 90 s ago (or
/// Elite's starter without the game yet) - its add-ons may not be in yet, the window waits for the pipe instead of warning.
#[tauri::command]
pub async fn room_join_probe(app: AppHandle) -> Value {
    tauri::async_runtime::spawn_blocking(move || probe(&app)).await.unwrap_or(Value::Null)
}
fn probe(app: &AppHandle) -> Value {
    let games = games(app);
    let running = crate::is_game_running();
    let launched = LAUNCHED.lock().unwrap().is_some_and(|t| t.elapsed() < Duration::from_secs(120));
    #[cfg(windows)]
    let young = launched || running && win::game_pids().is_empty()
        || win::game_pids().iter().any(|&p| win::age(p).is_some_and(|a| a < Duration::from_secs(90)));
    #[cfg(not(windows))]
    let young = launched;
    // 1.4.11: which game each one is (a vanilla lobby is joined only from vanilla); also a running game without the pipe
    #[cfg(windows)]
    let running_kind = win::game_pids().first().and_then(|&p| win::kind(p));
    #[cfg(target_os = "linux")]
    let running_kind = if running { game_kind_linux() } else { None };
    #[cfg(not(any(windows, target_os = "linux")))]
    let running_kind: Option<&str> = None;
    json!({
        "supported": cfg!(any(windows, target_os = "linux")), "running": running || !games.is_empty(), "young": games.is_empty() && young,
        "games": games.iter().map(|(c, s)| json!({"pid": c.pid(), "status": s, "kind": kind(c)})).collect::<Vec<_>>(),
        "running_kind": running_kind,
    })
}

/// Join: wait up to `wait` seconds for a game with the pipe (the window has just started it, or it is starting), bring it to
/// the front, send the join and pass every event on to the window ("room_join" events: {ev, room, reason, text, pid}) until
/// the game says in_lobby / failed, the pipe closes, or 3 minutes pass. Returns at once; the events tell the rest.
/// `leave` (1.4.10): the player said yes to leaving the lobby he is in for this one (RoomJoin 11 presses Back there first).
#[tauri::command]
/// `game` (1.4.11): "vanilla" for a vanilla lobby - only a vanilla game takes it; anything else - Elite.
pub fn room_join(app: AppHandle, id: u64, name: String, wait: Option<u64>, leave: Option<bool>, game: Option<String>) -> Result<Value, String> {
    if id == 0 { return Err("no room id".into()); }
    let name: String = name.chars().filter(|c| !c.is_control()).take(64).collect();
    let gen = GEN.fetch_add(1, Ordering::SeqCst) + 1;
    let wait = Duration::from_secs(wait.unwrap_or(0).min(300));
    let leave = leave.unwrap_or(false);
    let want: &'static str = if game.as_deref() == Some("vanilla") { "vanilla" } else { "elite" };
    ROOM_NOW.store(id, Ordering::SeqCst);
    crate::c_log(&format!("rooms: join room {id} ({name}, {want}){}, waiting up to {} s for the game", if leave { ", leaving the current lobby" } else { "" }, wait.as_secs()));
    if !cfg!(any(windows, target_os = "linux")) { return Err("not on this system".into()); }
    std::thread::spawn(move || session(app, gen, id, name, wait, leave, want));
    Ok(json!({"started": true}))
}

/// The session's join was cancelled by the window (not replaced by a new Join): GEN's value after that Cancel. The session
/// then still passes on a late "in_lobby" for its room (review 05.11 L1: the window said "cancelled" while the player was in).
static CANCELLED_AT: AtomicU64 = AtomicU64::new(0);
/// The room of the join that runs now (0: none) - a Cancel names it, so the game cancels only that one (review 05.11 M4).
static ROOM_NOW: AtomicU64 = AtomicU64::new(0);

fn session(app: AppHandle, gen: u64, id: u64, name: String, wait: Duration, leave: bool, want: &'static str) {
    // a late answer (after a timeout, or a Cancel of this very join) is told too - as long as no other Join started since
    let ours = || { let g = GEN.load(Ordering::SeqCst); g == gen || (g == gen + 1 && CANCELLED_AT.load(Ordering::SeqCst) == g) };
    let tell = |v: Value| { if GEN.load(Ordering::SeqCst) == gen { let _ = app.emit("room_join", v); } };
    let fail = |reason: &str| {
        crate::c_log(&format!("rooms: join room {id}: {reason}"));
        if GEN.load(Ordering::SeqCst) == gen { let _ = app.emit("room_join", json!({"ev": "failed", "room": id, "reason": reason, "text": ""})); }
    };
    // the game with the pipe: the first one in the main menu if there are two, else the first one
    let t0 = Instant::now();
    let mut told_wait = false;
    let mut conn = loop {
        if GEN.load(Ordering::SeqCst) != gen { return; }
        let mut found = games(&app);
        // only the game the lobby is for (a game whose command line could not be read is taken as it is)
        let n_all = found.len();
        found.retain(|(c, _)| kind(c).map_or(true, |k| k == want));
        let wrong = n_all > found.len();
        if !found.is_empty() {
            let k = found.iter().position(|(_, s)| s["screen"] == "main").unwrap_or(0);
            break found.swap_remove(k).0;
        }
        if wrong && wait.is_zero() { fail("wrong_game"); return; }
        if t0.elapsed() >= wait { fail(if wrong { "wrong_game" } else if crate::is_game_running() { "no_pipe" } else { "no_game" }); return; }
        // 1.4.10 (siritos 05.11: Windows asked, he said No, the game never started - and the game he started himself a minute
        // later got the old Join): the launcher started the game for this Join and 45 s on there is no game - no Join any more
        // (the add-ons' sync before the start is not counted: only from the start itself)
        if LAUNCH_FAILED.lock().unwrap().is_some_and(|t| t >= t0) { fail("no_game"); return; }     // No to Windows' question
        if LAUNCHED.lock().unwrap().is_some_and(|t| t >= t0 && t.elapsed() > Duration::from_secs(45)) && !crate::is_game_running() {
            fail("no_game"); return;
        }
        if !told_wait { told_wait = true; tell(json!({"ev": "waiting_game", "room": id})); }
        std::thread::sleep(Duration::from_millis(700));
    };
    let pid = conn.pid();
    #[cfg(windows)]
    let front = pid != 0 && win::to_front(pid);
    #[cfg(not(windows))]
    let front = false;
    crate::c_log(&format!("rooms: join room {id}: {}{}", if pid != 0 { format!("game {pid} over its pipe") } else { "the game over TCP".into() },
                          if front { ", brought to the front" } else { "" }));
    // (review 05.11 M4) a Cancel or a new Join while the game was looked for / brought to the front: no join sent at all
    if GEN.load(Ordering::SeqCst) != gen { crate::c_log(&format!("rooms: join room {id}: cancelled before it was sent")); return; }
    let mut cmd = json!({"cmd": "join", "room": id, "name": name});
    if leave { cmd["leave"] = json!(true); }
    if !conn.send(&cmd) { fail("game_closed"); return; }
    let end = Instant::now() + Duration::from_secs(180);
    let mut late: Option<Instant> = None;                       // after "failed" (timeout / cancelled): the game watches 15 s more
    loop {
        if !ours() { return; }                                  // a new Join: this one is over for the window
        if GEN.load(Ordering::SeqCst) != gen && late.is_none() { late = Some(Instant::now() + Duration::from_secs(17)); }   // cancelled: only a late in_lobby now
        if late.is_some_and(|t| Instant::now() >= t) { return; }
        if late.is_none() && Instant::now() >= end { fail("no_answer"); return; }
        match conn.line(500) {
            Err(()) => { if late.is_none() { fail("game_closed"); } return; }
            Ok(None) => {}
            Ok(Some(mut v)) => {
                let ev = v["ev"].as_str().unwrap_or("").to_string();
                if ev == "status" || v["room"].as_u64().is_some_and(|r| r != id) { continue; }   // not about this join
                v["pid"] = json!(pid);
                crate::c_log(&format!("rooms: join room {id}: {}", v));
                if late.is_some() {
                    if ev == "in_lobby" { let _ = app.emit("room_join", v); return; }   // in after all: the window says so
                    continue;
                }
                let reason = v["reason"].as_str().unwrap_or("").to_string();
                tell(v);
                if ev == "in_lobby" { return; }
                if ev == "failed" {
                    if reason == "timeout" || reason == "cancelled" { late = Some(Instant::now() + Duration::from_secs(17)); continue; }
                    return;
                }
            }
        }
    }
}

/// Cancel: the waiting for the game stops, and every game with the pipe is told - for the room of this join only (RoomJoin 11;
/// an older one cancels whatever it does); its cover's Cancel; a lobby it is in stays.
#[tauri::command]
pub async fn room_join_cancel(app: AppHandle) -> Value {
    let g = GEN.fetch_add(1, Ordering::SeqCst) + 1;
    CANCELLED_AT.store(g, Ordering::SeqCst);
    let room = ROOM_NOW.load(Ordering::SeqCst);
    tauri::async_runtime::spawn_blocking(move || {
        let mut n = 0;
        let cmd = if room != 0 { json!({"cmd": "cancel", "room": room}) } else { json!({"cmd": "cancel"}) };
        for (mut c, _) in games(&app) { if c.send(&cmd) { n += 1; } }
        crate::c_log(&format!("rooms: join of room {room} cancelled ({n} game(s) told)"));
        json!({"told": n})
    }).await.unwrap_or(Value::Null)
}

#[cfg(test)]
mod tests {
    /// The stand (Wine): every running DOW2.exe - its command line, which game, RoomJoin's status over its pipe.
    /// The command line of this very process through the same call (Wine 11 has no ProcessCommandLineInformation: None there,
    /// the modules decide).
    #[cfg(windows)]
    #[test]
    #[ignore]
    fn stand_cmdline_self() {
        println!("self: {:?}", super::win::cmdline(std::process::id()));
    }
    #[cfg(windows)]
    #[test]
    #[ignore]
    fn stand_probe() {
        for p in super::win::game_pids() {
            let cmd = super::win::cmdline(p);
            let kind = super::win::kind(p);
            if std::env::var_os("VT_DEBUG").is_some() { println!("  modules: {:?}", super::win::modules(p).map(|m| m.into_iter().filter(|x| x.to_ascii_lowercase().contains("dll") && (x.contains("Elite") || x.contains("patches") || x.contains("Profiler"))).collect::<Vec<_>>())); }
            let st = super::win::Conn::open(p, super::RJ.prefix).map(super::Conn::Pipe).and_then(|mut c| c.status());
            println!("DOW2.exe {p}: kind {kind:?}, command line {cmd:?}, RoomJoin status {}", st.map(|v| v.to_string()).unwrap_or_else(|| "none (no pipe)".into()));
            // VT_JOIN=<room id>: a join as the launcher sends it, every event for up to 90 s (a room that does not exist: the
            // walk through the menus and its "failed")
            if let Some(room) = std::env::var("VT_JOIN").ok().and_then(|v| v.parse::<u64>().ok()) {
                let Some(mut c) = super::win::Conn::open(p, super::RJ.prefix).map(super::Conn::Pipe) else { continue };
                let _ = c.status();
                println!("  join {room}: sent {}", c.send(&serde_json::json!({"cmd": "join", "room": room, "name": "stand test"})));
                let end = std::time::Instant::now() + std::time::Duration::from_secs(90);
                while std::time::Instant::now() < end {
                    match c.line(500) {
                        Ok(Some(v)) => { println!("  {v}"); if v["ev"] == "failed" || v["ev"] == "in_lobby" { break; } }
                        Ok(None) => {}
                        Err(()) => { println!("  pipe closed"); break; }
                    }
                }
                if let Some(st) = c.status() { println!("  status after: {st}"); }
            }
        }
    }

    use super::parse_link;
    #[test]
    fn links() {
        assert_eq!(parse_link("elite://join/69371236?name=3v3%20%2Fhmm"), Some((69371236, "3v3 /hmm".into())));
        assert_eq!(parse_link("ELITE://Join/5/"), Some((5, String::new())));
        assert_eq!(parse_link("elite://join/12?x=1&name=a+b%D0%BF"), Some((12, "a bп".into())));
        assert_eq!(parse_link("elite://join/12?name=%zz%4"), Some((12, "%zz%4".into())));
        assert_eq!(parse_link("elite://join/0"), None);
        assert_eq!(parse_link("elite://join/-1"), None);
        assert_eq!(parse_link("elite://join/123456789012345678901"), None);
        assert_eq!(parse_link("elite://play/12"), None);
        assert_eq!(parse_link("http://join/12"), None);
        assert_eq!(parse_link("elite://join/1?name=%0Aevil"), Some((1, "evil".into())));
        let long = format!("elite://join/7?name={}", "x".repeat(200));
        assert_eq!(parse_link(&long).unwrap().1.chars().count(), 64);
        use super::{link_game, kind_of_cmdline};
        assert_eq!(link_game("elite://join/7?name=a&game=vanilla"), "vanilla");
        assert_eq!(link_game("elite://join/7?game=Elite"), "elite");
        assert_eq!(link_game("elite://join/7?name=game=vanilla"), "");
        assert_eq!(link_game("elite://join/7"), "");
        assert_eq!(kind_of_cmdline(r#""C:\Games\Dawn of War II - Retribution\DOW2.exe" -modname Elite -nomovies"#), "elite");
        assert_eq!(kind_of_cmdline("DOW2.exe -modname Elite_Test"), "elite");
        assert_eq!(kind_of_cmdline(r#""C:\Games\Dawn of War II - Retribution\DOW2.exe""#), "vanilla");
        assert_eq!(kind_of_cmdline("DOW2.exe -dev -nomovies -init x.lua"), "vanilla");
    }
}
