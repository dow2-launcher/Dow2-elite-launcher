//! Help when the game hangs (owner 01.11.2026, its own tick in Settings). Everything works from OUTSIDE the game - nothing is
//! injected into it, so this can never crash it (in-game crash handlers did, earlier):
//! - every 2 s Windows is asked whether the game's window still answers (IsHungAppWindow, a check that sends it nothing);
//! - silent for 10 s: the mouse is set free (a hung full-screen game keeps the cursor clipped to itself and stays "topmost",
//!   so even Task Manager could not be clicked) and the window is told the game hangs (offer: close the game / wait);
//! - silent for 15 s: a minidump of the game is written from outside (stacks of all threads, the module list, ~1-5 MB)
//!   into <launcher data>/dumps - "Send logs" takes it, and the stack shows where the game stopped;
//! - Ctrl+Alt+End closes the game when the mouse does nothing at all (a hung game at once, a running one on a second press
//!   within 3 s - never by one stray key press in a match).
#![cfg_attr(not(windows), allow(unused_imports, dead_code))]
use serde_json::json;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

pub static ENABLED: AtomicBool = AtomicBool::new(true);
static HUNG_PID: AtomicU32 = AtomicU32::new(0);
static LAST_DUMP: Mutex<Option<(u32, PathBuf)>> = Mutex::new(None);

pub const RELEASE_AFTER: u64 = 10;
pub const DUMP_AFTER: u64 = 15;

#[cfg(windows)]
#[allow(non_snake_case, clippy::upper_case_acronyms)]
mod win {
    use std::ffi::c_void;
    pub type HWND = isize;
    pub type HANDLE = isize;
    pub type BOOL = i32;
    #[repr(C)] #[derive(Default, Clone, Copy)] pub struct RECT { pub l: i32, pub t: i32, pub r: i32, pub b: i32 }
    #[repr(C)] #[derive(Default)] pub struct MSG { pub hwnd: HWND, pub message: u32, pub wparam: usize, pub lparam: isize, pub time: u32, pub x: i32, pub y: i32 }
    #[link(name = "user32")]
    extern "system" {
        pub fn EnumWindows(cb: extern "system" fn(HWND, isize) -> BOOL, lp: isize) -> BOOL;
        pub fn GetWindowThreadProcessId(h: HWND, pid: *mut u32) -> u32;
        pub fn GetWindowRect(h: HWND, r: *mut RECT) -> BOOL;
        pub fn GetParent(h: HWND) -> HWND;
        pub fn IsHungAppWindow(h: HWND) -> BOOL;
        pub fn ClipCursor(r: *const RECT) -> BOOL;
        pub fn SetWindowPos(h: HWND, after: HWND, x: i32, y: i32, cx: i32, cy: i32, flags: u32) -> BOOL;
        pub fn RegisterHotKey(h: HWND, id: i32, mods: u32, vk: u32) -> BOOL;
        pub fn GetMessageW(m: *mut MSG, h: HWND, a: u32, b: u32) -> BOOL;
    }
    #[link(name = "kernel32")]
    extern "system" {
        pub fn OpenProcess(access: u32, inherit: BOOL, pid: u32) -> HANDLE;
        pub fn QueryFullProcessImageNameW(h: HANDLE, flags: u32, buf: *mut u16, size: *mut u32) -> BOOL;
        pub fn TerminateProcess(h: HANDLE, code: u32) -> BOOL;
        pub fn CloseHandle(h: HANDLE) -> BOOL;
    }
    #[link(name = "dbghelp")]
    extern "system" {
        pub fn MiniDumpWriteDump(p: HANDLE, pid: u32, file: HANDLE, kind: u32, e: *const c_void, u: *const c_void, c: *const c_void) -> BOOL;
    }
    pub const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;
    pub const PROCESS_QUERY_INFORMATION: u32 = 0x0400;
    pub const PROCESS_VM_READ: u32 = 0x0010;
    pub const PROCESS_TERMINATE: u32 = 0x0001;
    pub const HWND_NOTOPMOST: HWND = -2;
    pub const SWP_NOSIZE: u32 = 0x1; pub const SWP_NOMOVE: u32 = 0x2; pub const SWP_NOACTIVATE: u32 = 0x10; pub const SWP_ASYNCWINDOWPOS: u32 = 0x4000;
    pub const MOD_ALT: u32 = 0x1; pub const MOD_CONTROL: u32 = 0x2; pub const MOD_NOREPEAT: u32 = 0x4000;
    pub const VK_END: u32 = 0x23; pub const WM_HOTKEY: u32 = 0x0312;
    // MiniDumpNormal | MiniDumpWithUnloadedModules | MiniDumpWithThreadInfo: stacks + modules, small
    pub const DUMP_KIND: u32 = 0x0000 | 0x0020 | 0x1000;
}

/// The game's main window: the biggest top-level window of a DOW2.exe process (GetWindowRect - nothing is sent to the
/// window, so asking a hung game never blocks the launcher). -> (pid, hwnd)
#[cfg(windows)]
fn game_window() -> Option<(u32, isize)> {
    use win::*;
    struct Acc { best: Option<(u32, isize, i64)>, names: std::collections::HashMap<u32, bool> }
    extern "system" fn cb(h: HWND, lp: isize) -> BOOL {
        let acc = unsafe { &mut *(lp as *mut Acc) };
        if unsafe { GetParent(h) } != 0 { return 1; }
        let mut pid = 0u32; unsafe { GetWindowThreadProcessId(h, &mut pid) };
        if pid == 0 { return 1; }
        let is_game = *acc.names.entry(pid).or_insert_with(|| {
            let p = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
            if p == 0 { return false; }
            let mut buf = [0u16; 1024]; let mut n = buf.len() as u32;
            let ok = unsafe { QueryFullProcessImageNameW(p, 0, buf.as_mut_ptr(), &mut n) } != 0;
            unsafe { CloseHandle(p) };
            ok && String::from_utf16_lossy(&buf[..n as usize]).to_ascii_lowercase().ends_with("\\dow2.exe")
        });
        if !is_game { return 1; }
        let mut r = RECT::default(); unsafe { GetWindowRect(h, &mut r) };
        let area = ((r.r - r.l) as i64).max(0) * ((r.b - r.t) as i64).max(0);
        if acc.best.map_or(true, |b| area > b.2) { acc.best = Some((pid, h, area)); }
        1
    }
    let mut acc = Acc { best: None, names: Default::default() };
    unsafe { EnumWindows(cb, &mut acc as *mut Acc as isize) };
    acc.best.map(|(p, h, _)| (p, h))
}

/// Mouse free, the hung window no longer "topmost" (both work on a window that does not answer).
#[cfg(windows)]
fn release_mouse(hwnd: isize) {
    use win::*;
    unsafe {
        ClipCursor(std::ptr::null());
        SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE | SWP_ASYNCWINDOWPOS);
    }
}

/// A minidump of the game written from outside (the launcher's own process does the work). -> the file
#[cfg(windows)]
pub fn dump(pid: u32, dir: &std::path::Path, why: &str) -> Option<PathBuf> {
    use std::os::windows::io::AsRawHandle;
    use win::*;
    let _ = std::fs::create_dir_all(dir);
    // keep the last 3: an old dump is no use, and they must not pile up
    if let Ok(rd) = std::fs::read_dir(dir) {
        let mut v: Vec<_> = rd.flatten().filter(|e| e.file_name().to_string_lossy().ends_with(".dmp"))
            .filter_map(|e| Some((e.metadata().ok()?.modified().ok()?, e.path()))).collect();
        v.sort(); while v.len() >= 3 { let _ = std::fs::remove_file(v.remove(0).1); }
    }
    let stamp = chrono_like_stamp();
    let path = dir.join(format!("DOW2-{why}-{stamp}.dmp"));
    let p = unsafe { OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, 0, pid) };
    if p == 0 { return None; }
    let ok = std::fs::File::create(&path).map(|f| unsafe {
        MiniDumpWriteDump(p, pid, f.as_raw_handle() as isize, DUMP_KIND, std::ptr::null(), std::ptr::null(), std::ptr::null()) != 0
    }).unwrap_or(false);
    unsafe { CloseHandle(p) };
    if ok { *LAST_DUMP.lock().unwrap() = Some((pid, path.clone())); Some(path) } else { let _ = std::fs::remove_file(&path); None }
}

/// Close the game (the window's "Close the game" button, Ctrl+Alt+End): a hang dump first if there is none for it yet.
#[cfg(windows)]
pub fn kill_game(dir: &std::path::Path) -> Result<(), String> {
    use win::*;
    let (pid, _) = game_window().ok_or("the game is not running")?;
    let have = LAST_DUMP.lock().unwrap().as_ref().is_some_and(|(p, _)| *p == pid);
    if !have && HUNG_PID.load(Ordering::Relaxed) == pid { let _ = dump(pid, dir, "hang"); }
    let p = unsafe { OpenProcess(PROCESS_TERMINATE, 0, pid) };
    if p == 0 { return Err("Windows did not allow closing the game (it may run as administrator)".into()); }
    let ok = unsafe { TerminateProcess(p, 1) } != 0;
    unsafe { CloseHandle(p) };
    if ok { Ok(()) } else { Err("could not close the game".into()) }
}

#[cfg(not(windows))]
pub fn kill_game(_dir: &std::path::Path) -> Result<(), String> { Err("only on Windows".into()) }

fn chrono_like_stamp() -> String {
    let s = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    format!("{s}")
}

/// The watch and the hotkey (Windows only; elsewhere nothing happens). `emit(state)` goes to the window:
/// {state: "hung", secs, dump} while the game does not answer, {state: "ok"} when it is back or gone.
pub fn start(dumps: PathBuf, emit: impl Fn(serde_json::Value) + Send + Sync + 'static) {
    #[cfg(windows)]
    {
        let emit = std::sync::Arc::new(emit);
        let (d1, e1) = (dumps.clone(), emit.clone());
        std::thread::spawn(move || {
            let mut since: Option<(u32, Instant)> = None;
            let (mut released, mut tried, mut dumped, mut told) = (false, false, None::<PathBuf>, false);
            loop {
                std::thread::sleep(Duration::from_secs(2));
                let on = ENABLED.load(Ordering::Relaxed);
                let hung = if on { game_window().filter(|(_, h)| unsafe { win::IsHungAppWindow(*h) } != 0) } else { None };
                match hung {
                    Some((pid, hwnd)) => {
                        let t0 = match since { Some((p, t)) if p == pid => t, _ => { since = Some((pid, Instant::now())); released = false; tried = false; dumped = None; Instant::now() } };
                        HUNG_PID.store(pid, Ordering::Relaxed);
                        let secs = t0.elapsed().as_secs();
                        if secs >= RELEASE_AFTER && !released { release_mouse(hwnd); released = true; }
                        if secs >= DUMP_AFTER && !tried { tried = true; dumped = dump(pid, &d1, "hang"); }
                        if secs >= RELEASE_AFTER {
                            told = true;
                            e1(json!({"state": "hung", "secs": secs, "dump": dumped.as_ref().map(|p| p.display().to_string())}));
                        }
                    }
                    None => {
                        if since.take().is_some() { HUNG_PID.store(0, Ordering::Relaxed); }
                        if told { told = false; e1(json!({"state": "ok"})); }
                    }
                }
            }
        });
        std::thread::spawn(move || unsafe {
            use win::*;
            if RegisterHotKey(0, 0x454C, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, VK_END) == 0 { return; }   // taken by another program
            let mut last: Option<Instant> = None;
            let mut m = MSG::default();
            while GetMessageW(&mut m, 0, 0, 0) > 0 {
                if m.message != WM_HOTKEY || !ENABLED.load(Ordering::Relaxed) { continue; }
                let hung = game_window().is_some_and(|(_, h)| IsHungAppWindow(h) != 0);
                let second = last.is_some_and(|t| t.elapsed() < Duration::from_secs(3));
                if hung || second {
                    last = None;
                    if let Some((_, h)) = game_window() { release_mouse(h); }
                    let _ = kill_game(&dumps);
                    emit(json!({"state": "ok"}));
                } else {
                    last = Some(Instant::now());
                    emit(json!({"state": "confirm_kill"}));
                }
            }
        });
    }
    #[cfg(not(windows))]
    { let _ = (dumps, emit); }
}
