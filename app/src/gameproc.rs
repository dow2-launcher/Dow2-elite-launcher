//! Is the game running (its DLLs are locked then); a call that changes files refuses while it runs.
//! Split out of main.rs (1.6.17): the items as they were; main.rs keeps the app's state, settings, config and main().
use super::*;

/// Is the game (DOW2.exe) running? Its DLLs are locked then: add-ons can not be switched or updated under it.
/// 1.3.12: the process list is read here (Toolhelp snapshot). Before, a tasklist.exe was started every 3 s: a new process
/// each time, checked by the antivirus - players noticed the game stutter with the launcher open (01.11.2026).
#[cfg(windows)]
pub(crate) mod procs {   // logs.rs reads the OEM code page of Windows' tools with procs::oem_text
    #[repr(C)]
    pub struct Entry { pub size: u32, pub usage: u32, pub pid: u32, pub heap: usize, pub module: u32, pub threads: u32,
                       pub parent: u32, pub prio: i32, pub flags: u32, pub exe: [u16; 260] }
    #[link(name = "kernel32")]
    extern "system" {
        pub fn CreateToolhelp32Snapshot(flags: u32, pid: u32) -> isize;
        pub fn Process32FirstW(snap: isize, e: *mut Entry) -> i32;
        pub fn Process32NextW(snap: isize, e: *mut Entry) -> i32;
        pub fn CloseHandle(h: isize) -> i32;
        fn MultiByteToWideChar(cp: u32, flags: u32, s: *const u8, n: i32, w: *mut u16, wn: i32) -> i32;
    }
    /// Text a console program wrote (OEM code page: cp866 on a Russian Windows) as a String.
    pub fn oem_text(b: &[u8]) -> String {
        if b.is_empty() || b.len() > i32::MAX as usize { return String::from_utf8_lossy(b).into_owned(); }
        unsafe {
            let n = MultiByteToWideChar(1 /* CP_OEMCP */, 0, b.as_ptr(), b.len() as i32, std::ptr::null_mut(), 0);
            if n <= 0 { return String::from_utf8_lossy(b).into_owned(); }
            let mut w = vec![0u16; n as usize];
            MultiByteToWideChar(1, 0, b.as_ptr(), b.len() as i32, w.as_mut_ptr(), n);
            String::from_utf16_lossy(&w)
        }
    }
    /// 1.6.32: the ids of the processes with any of these exe names (letter case aside) - tray.rs old_copies
    pub fn pids_named(names: &[String]) -> Vec<u32> {
        let mut out = Vec::new();
        unsafe {
            let snap = CreateToolhelp32Snapshot(2 /* TH32CS_SNAPPROCESS */, 0);
            if snap == -1 { return out; }
            let mut e: Entry = std::mem::zeroed(); e.size = std::mem::size_of::<Entry>() as u32;
            let mut ok = Process32FirstW(snap, &mut e);
            while ok != 0 {
                let n = e.exe.iter().position(|&c| c == 0).unwrap_or(e.exe.len());
                let exe = String::from_utf16_lossy(&e.exe[..n]);
                if names.iter().any(|x| x.eq_ignore_ascii_case(&exe)) { out.push(e.pid); }
                ok = Process32NextW(snap, &mut e);
            }
            CloseHandle(snap);
        }
        out
    }
    pub fn running(name: &str) -> bool {
        unsafe {
            let snap = CreateToolhelp32Snapshot(2 /* TH32CS_SNAPPROCESS */, 0);
            if snap == -1 { return false; }
            let mut e: Entry = std::mem::zeroed(); e.size = std::mem::size_of::<Entry>() as u32;
            let mut found = false; let mut ok = Process32FirstW(snap, &mut e);
            while ok != 0 {
                let n = e.exe.iter().position(|&c| c == 0).unwrap_or(e.exe.len());
                if String::from_utf16_lossy(&e.exe[..n]).eq_ignore_ascii_case(name) { found = true; break; }
                ok = Process32NextW(snap, &mut e);
            }
            CloseHandle(snap); found
        }
    }
}
/// The game, or Elite's own starter that is about to start it (it waits up to a minute for the game's window): while
/// either runs, the add-on files stay as they are (1.4.2 - a second Play right after the first one, or an add-on update
/// in that minute, changed DLLs under the starting game).
pub(crate) fn is_game_running() -> bool {
    #[cfg(windows)]
    { procs::running("DOW2.exe") || procs::running("Elite.exe") }
    // macOS: Feral's native game (no exe), its binary in the .app
    #[cfg(target_os = "macos")]
    {
        let pat = format!("Contents/MacOS/{}", elite_core::macos::PROCESS_NAME);
        std::process::Command::new("pgrep").args(["-f", &pat]).output().map(|o| o.status.success()).unwrap_or(false)
    }
    #[cfg(all(not(windows), not(target_os = "macos")))]
    {
        std::process::Command::new("pgrep").args(["-fi", "dow2\\.exe|[\\\\/]elite\\.exe"]).output().map(|o| o.status.success()).unwrap_or(false)
    }
}

/// macOS: is the Steam client running (steam_osx, started by Steam.app)? The game signs in through it. Elsewhere: false (not
/// asked there).
pub(crate) fn steam_running() -> bool {
    #[cfg(target_os = "macos")]
    {
        let pg = |a: &[&str]| std::process::Command::new("pgrep").args(a).output().map(|o| o.status.success()).unwrap_or(false);
        pg(&["-x", elite_core::macos::STEAM_PROCESS]) || pg(&["-f", "Steam.AppBundle/Steam/Contents/MacOS/"])
    }
    #[cfg(not(target_os = "macos"))]
    { false }
}

pub(crate) fn ensure_game_closed(app: &App) -> Result<(), String> {
    if app.game_running.load(Ordering::Relaxed) {
        return Err("the game is running: close it to change add-ons or update".into());
    }
    Ok(())
}
