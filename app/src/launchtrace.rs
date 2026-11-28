//! 1.6.37 (HellRaIzeR 28.11.2026: Play Elite brings up plain Retribution, his game's log said only "no -modname"): what
//! happens to the game's processes in the two and a half minutes after Play, line by line into community.log (Send logs
//! takes it). Every DOW2.exe / Elite.exe / steam.exe that starts: its parent and command line; every one that ends: after
//! how long and its exit code. DOW2.exe ending with 123 = it handed itself to Steam (steam_api.dll: "<HKLM InstallPath>\
//! steam.exe -applaunch 56400 <its arguments>", see elite_core::steamcheck); the DOW2.exe Steam starts then shows whether
//! the arguments came through. Nothing is changed - only looked at.
#[cfg(windows)]
use super::*;

/// Called right before the game (or Elite's starter) is started: what runs already is not traced.
#[cfg(windows)]
pub(crate) fn start(game: Option<std::path::PathBuf>) {
    use std::collections::{HashMap, HashSet};
    const NAMES: [&str; 3] = ["DOW2.exe", "Elite.exe", "steam.exe"];
    #[link(name = "kernel32")]
    extern "system" {
        fn OpenProcess(access: u32, inherit: i32, pid: u32) -> isize;
        fn GetExitCodeProcess(h: isize, code: *mut u32) -> i32;
        fn CloseHandle(h: isize) -> i32;
    }
    let snap = || -> Vec<(u32, u32, String)> {
        let mut out = Vec::new();
        unsafe {
            let s = procs::CreateToolhelp32Snapshot(2 /* TH32CS_SNAPPROCESS */, 0);
            if s == -1 { return out; }
            let mut e: procs::Entry = std::mem::zeroed(); e.size = std::mem::size_of::<procs::Entry>() as u32;
            let mut ok = procs::Process32FirstW(s, &mut e);
            while ok != 0 {
                let n = e.exe.iter().position(|&c| c == 0).unwrap_or(e.exe.len());
                out.push((e.pid, e.parent, String::from_utf16_lossy(&e.exe[..n])));
                ok = procs::Process32NextW(s, &mut e);
            }
            procs::CloseHandle(s);
        }
        out
    };
    let ours = |n: &str| NAMES.iter().any(|x| x.eq_ignore_ascii_case(n));
    let before: HashSet<u32> = snap().into_iter().filter(|p| ours(&p.2)).map(|p| p.0).collect();
    c_log(&format!("launch trace: {}", elite_core::steamcheck::summary(game.as_deref())));
    std::thread::spawn(move || {
        struct Seen { exe: String, h: isize, at: Instant, args: String }
        let t0 = Instant::now();
        let mut live: HashMap<u32, Seen> = HashMap::new();
        let mut done: HashSet<u32> = HashSet::new();
        let mut up = false;
        while t0.elapsed() < Duration::from_secs(150) {
            let all = snap();
            for (pid, parent, exe) in all.iter().filter(|p| ours(&p.2)) {
                if before.contains(pid) || live.contains_key(pid) || done.contains(pid) { continue; }
                let pname = all.iter().find(|p| p.0 == *parent).map(|p| p.2.clone()).unwrap_or_else(|| "(already gone)".into());
                let args = roomjoin::win::cmdline(*pid).unwrap_or_else(|| "(can't be read)".into());
                let h = unsafe { OpenProcess(0x1000 | 0x0010_0000 /* PROCESS_QUERY_LIMITED_INFORMATION | SYNCHRONIZE */, 0, *pid) };
                c_log(&format!("launch trace: +{exe} pid {pid} at {:.1} s, parent {pname} {parent}, command line: {args}", t0.elapsed().as_secs_f32()));
                live.insert(*pid, Seen { exe: exe.clone(), h, at: Instant::now(), args });
            }
            let gone: Vec<u32> = live.keys().filter(|pid| !all.iter().any(|p| p.0 == **pid)).copied().collect();
            for pid in gone {
                let s = live.remove(&pid).unwrap();
                let mut code = 0u32;
                let have = s.h != 0 && unsafe { GetExitCodeProcess(s.h, &mut code) } != 0;
                if s.h != 0 { unsafe { CloseHandle(s.h); } }
                let note = if s.exe.eq_ignore_ascii_case("DOW2.exe") && have && code == 123 {
                    " (= the game handed itself to Steam: steam.exe -applaunch 56400 + its arguments; Steam starts it again)" } else { "" };
                c_log(&format!("launch trace: -{} pid {pid} at {:.1} s, ran {:.1} s, exit code {}{note}", s.exe, t0.elapsed().as_secs_f32(),
                    s.at.elapsed().as_secs_f32(), if have { code.to_string() } else { "?".into() }));
                done.insert(pid);
            }
            if let Some((pid, s)) = live.iter().find(|(_, s)| s.exe.eq_ignore_ascii_case("DOW2.exe") && s.at.elapsed() >= Duration::from_secs(30)) {
                c_log(&format!("launch trace: the game is up {:.0} s after Play: DOW2.exe pid {pid} as {} ({})", t0.elapsed().as_secs_f32(),
                    roomjoin::kind_of_cmdline(&s.args), s.args));
                up = true;
                break;
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        if !up { c_log("launch trace: no DOW2.exe ran 30 s within 150 s after Play"); }
        for (_, s) in live { if s.h != 0 { unsafe { CloseHandle(s.h); } } }
    });
}
#[cfg(not(windows))]
pub(crate) fn start(_game: Option<std::path::PathBuf>) {}
