//! 1.6.37 (HellRaIzeR 28.11.2026: Play Elite brings up plain Retribution): how Steam is set up for the game, for "Send logs".
//!
//! DOW2.exe's steam_api.dll, SteamAPI_RestartAppIfNecessary (disassembled 28.11.2026): no SteamAppId in the environment and
//! no steam_appid.txt in the game folder -> it reads HKLM\SOFTWARE\Valve\Steam InstallPath (32-bit view = WOW6432Node),
//! runs "<InstallPath>\steam.exe -applaunch 56400 <its own arguments>" and the game exits with 123; Steam starts it again.
//! That is how every start through Elite.exe goes (CrashLog: ExitProcess(123) 0.1 s after the start, then a DOW2.exe whose
//! parent is steam.exe). When that Steam drops the arguments, Elite's "-modname Elite" is gone and plain Retribution comes up.
//! No InstallPath at all: no restart, the game runs as started.
use std::path::{Path, PathBuf};

/// "LaunchOptions" of app `appid` in a Steam localconfig.vdf (Steam > the game > Properties > Launch options).
/// None: the app is not in the file; Some("") : the app is there without launch options.
pub fn launch_options(vdf: &str, appid: u32) -> Option<String> {
    let key = format!("\"{appid}\"");
    let mut from = 0;
    while let Some(i) = vdf[from..].find(&key) {
        let at = from + i + key.len();
        from = at;
        // the block of the app: the next non-blank character is '{'
        let rest = &vdf[at..];
        let t = rest.trim_start();
        if !t.starts_with('{') { continue; }
        let body_start = at + (rest.len() - t.len()) + 1;
        let (mut depth, mut j, b) = (1i32, body_start, vdf.as_bytes());
        let mut in_str = false;
        let mut found: Option<String> = None;
        while j < b.len() && depth > 0 {
            match b[j] {
                b'\\' if in_str => { j += 1; }
                b'"' => {
                    if !in_str && depth == 1 && vdf[j..].starts_with("\"LaunchOptions\"") {
                        let after = &vdf[j + "\"LaunchOptions\"".len()..];
                        let a = after.trim_start();
                        if let Some(v) = a.strip_prefix('"') {
                            let mut s = String::new(); let mut esc = false;
                            for c in v.chars() {
                                if esc { s.push(c); esc = false; continue; }
                                if c == '\\' { esc = true; continue; }
                                if c == '"' { break; }
                                s.push(c);
                            }
                            found = Some(s);
                        }
                    }
                    in_str = !in_str;
                }
                b'{' if !in_str => depth += 1,
                b'}' if !in_str => depth -= 1,
                _ => {}
            }
            j += 1;
        }
        return Some(found.unwrap_or_default());
    }
    None
}

/// The Steam library folder (the one with steamapps) the game folder is in.
pub fn library_of(game: &Path) -> Option<PathBuf> {
    game.ancestors().find(|a| a.file_name().map_or(false, |n| n.eq_ignore_ascii_case("steamapps"))).and_then(|s| s.parent()).map(Path::to_path_buf)
}

fn norm(p: &str) -> String {
    let p = p.trim().trim_matches('"').replace('/', "\\");
    p.strip_prefix(r"\\?\").unwrap_or(&p).trim_end_matches('\\').to_ascii_lowercase()
}

#[cfg(windows)]
mod w {
    #[repr(C)]
    pub struct Entry { pub size: u32, pub usage: u32, pub pid: u32, pub heap: usize, pub module: u32, pub threads: u32,
                       pub parent: u32, pub prio: i32, pub flags: u32, pub exe: [u16; 260] }
    #[link(name = "kernel32")]
    extern "system" {
        pub fn CreateToolhelp32Snapshot(flags: u32, pid: u32) -> isize;
        pub fn Process32FirstW(snap: isize, e: *mut Entry) -> i32;
        pub fn Process32NextW(snap: isize, e: *mut Entry) -> i32;
        pub fn CloseHandle(h: isize) -> i32;
        pub fn OpenProcess(access: u32, inherit: i32, pid: u32) -> isize;
        pub fn QueryFullProcessImageNameW(h: isize, flags: u32, buf: *mut u16, len: *mut u32) -> i32;
    }
    #[link(name = "advapi32")]
    extern "system" {
        pub fn OpenProcessToken(h: isize, access: u32, tok: *mut isize) -> i32;
        pub fn GetTokenInformation(tok: isize, class: u32, info: *mut u8, len: u32, ret: *mut u32) -> i32;
    }
    /// (pid, parent pid, exe name) of every process.
    pub fn processes() -> Vec<(u32, u32, String)> {
        let mut out = Vec::new();
        unsafe {
            let snap = CreateToolhelp32Snapshot(2 /* TH32CS_SNAPPROCESS */, 0);
            if snap == -1 { return out; }
            let mut e: Entry = std::mem::zeroed(); e.size = std::mem::size_of::<Entry>() as u32;
            let mut ok = Process32FirstW(snap, &mut e);
            while ok != 0 {
                let n = e.exe.iter().position(|&c| c == 0).unwrap_or(e.exe.len());
                out.push((e.pid, e.parent, String::from_utf16_lossy(&e.exe[..n])));
                ok = Process32NextW(snap, &mut e);
            }
            CloseHandle(snap);
        }
        out
    }
    /// The full path of a process' exe and whether it runs elevated (None: may not be asked - e.g. elevated, we are not).
    pub fn path_and_elevation(pid: u32) -> (Option<String>, Option<bool>) {
        unsafe {
            let h = OpenProcess(0x1000 /* PROCESS_QUERY_LIMITED_INFORMATION */, 0, pid);
            if h == 0 { return (None, None); }
            let mut buf = [0u16; 1024]; let mut len = buf.len() as u32;
            let path = (QueryFullProcessImageNameW(h, 0, buf.as_mut_ptr(), &mut len) != 0).then(|| String::from_utf16_lossy(&buf[..len as usize]));
            let mut tok = 0isize; let mut elev: Option<bool> = None;
            if OpenProcessToken(h, 0x8 /* TOKEN_QUERY */, &mut tok) != 0 {
                let mut v = 0u32; let mut ret = 0u32;
                if GetTokenInformation(tok, 20 /* TokenElevation */, &mut v as *mut u32 as *mut u8, 4, &mut ret) != 0 { elev = Some(v != 0); }
                CloseHandle(tok);
            }
            CloseHandle(h);
            (path, elev)
        }
    }
}

/// The Steam that DOW2.exe hands itself to (HKLM InstallPath, 32-bit view) - what steam_api.dll reads.
#[cfg(windows)]
pub fn restart_steam() -> Option<String> {
    use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_32KEY};
    winreg::RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey_with_flags("SOFTWARE\\Valve\\Steam", KEY_READ | KEY_WOW64_32KEY).ok()
        .and_then(|k| k.get_value::<String, _>("InstallPath").ok())
}
#[cfg(not(windows))]
pub fn restart_steam() -> Option<String> { None }

/// The running steam.exe processes: (pid, path, elevated).
#[cfg(windows)]
pub fn running_steam() -> Vec<(u32, Option<String>, Option<bool>)> {
    w::processes().into_iter().filter(|p| p.2.eq_ignore_ascii_case("steam.exe")).map(|p| { let (a, b) = w::path_and_elevation(p.0); (p.0, a, b) }).collect()
}
#[cfg(not(windows))]
pub fn running_steam() -> Vec<(u32, Option<String>, Option<bool>)> { Vec::new() }

/// One line for community.log at Play: where the game will hand itself to and which Steam runs.
pub fn summary(game: Option<&Path>) -> String {
    let rs = restart_steam();
    let running: Vec<String> = running_steam().iter().map(|(pid, p, e)| format!("{} pid {pid}{}", p.as_deref().unwrap_or("?"),
        match e { Some(true) => " (as administrator)", Some(false) => "", None => " (can't be asked)" })).collect();
    let appid_txt = game.map(|g| g.join("steam_appid.txt").is_file()).unwrap_or(false);
    format!("the game hands itself to {} (HKLM InstallPath){}; Steam running: {}; steam_appid.txt {}; SteamAppId {}",
        rs.as_deref().map(|p| format!("{p}\\steam.exe")).unwrap_or_else(|| "nobody - no InstallPath, it runs as started".into()),
        match (&rs, running_steam().first()) {
            (Some(r), Some((_, Some(p), _))) if norm(&format!("{r}\\steam.exe")) != norm(p) => " - NOT the Steam that runs",
            _ => "",
        },
        if running.is_empty() { "none".into() } else { running.join(", ") },
        if appid_txt { "yes" } else { "no" },
        std::env::var("SteamAppId").map(|v| format!("={v}")).unwrap_or_else(|_| "not set".into()))
}

/// The "Steam check" section of Send logs.
pub fn report(game: Option<&Path>) -> Vec<String> {
    let mut l: Vec<String> = Vec::new();
    l.push(format!("summary: {}", summary(game)));
    let mut roots: Vec<String> = Vec::new();
    #[cfg(windows)]
    {
        use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_32KEY, KEY_WOW64_64KEY};
        use winreg::RegKey;
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        for (view, flag) in [("32-bit (what the game reads)", KEY_WOW64_32KEY), ("64-bit", KEY_WOW64_64KEY)] {
            match hklm.open_subkey_with_flags("SOFTWARE\\Valve\\Steam", KEY_READ | flag) {
                Ok(k) => {
                    let ip = k.get_value::<String, _>("InstallPath").ok();
                    l.push(format!("HKLM\\SOFTWARE\\Valve\\Steam {view}: InstallPath {}{}", ip.as_deref().unwrap_or("-"),
                        ip.as_deref().map(|p| if Path::new(p).join("steam.exe").is_file() { " (steam.exe there)" } else { " (NO steam.exe there)" }).unwrap_or("")));
                    if let Some(p) = ip { roots.push(p); }
                }
                Err(e) => l.push(format!("HKLM\\SOFTWARE\\Valve\\Steam {view}: {e}")),
            }
        }
        match RegKey::predef(HKEY_CURRENT_USER).open_subkey("Software\\Valve\\Steam") {
            Ok(k) => {
                let g = |n: &str| k.get_value::<String, _>(n).unwrap_or_else(|_| "-".into());
                l.push(format!("HKCU\\Software\\Valve\\Steam: SteamPath {}, SteamExe {}, RunningAppID {}", g("SteamPath"), g("SteamExe"),
                    k.get_value::<u32, _>("RunningAppID").map(|v| v.to_string()).unwrap_or_else(|_| "-".into())));
                if let Ok(p) = k.get_value::<String, _>("SteamPath") { roots.push(p.replace('/', "\\")); }
                if let Ok(a) = k.open_subkey("ActiveProcess") {
                    let pid = a.get_value::<u32, _>("pid").unwrap_or(0);
                    let alive = w::processes().into_iter().find(|p| p.0 == pid && pid != 0);
                    l.push(format!("  ActiveProcess: pid {pid} ({}), SteamClientDll {}", match alive {
                        Some(p) => format!("running: {} {}", p.2, w::path_and_elevation(pid).0.unwrap_or_default()),
                        None => "NOT running".into() }, a.get_value::<String, _>("SteamClientDll").unwrap_or_else(|_| "-".into())));
                }
            }
            Err(e) => l.push(format!("HKCU\\Software\\Valve\\Steam: {e}")),
        }
        // Windows' compatibility settings (Properties > Compatibility: run as administrator, Windows 7 mode...) of the game,
        // Elite's starter, Steam and the launcher
        for (hive, name) in [(HKEY_CURRENT_USER, "HKCU"), (HKEY_LOCAL_MACHINE, "HKLM")] {
            if let Ok(k) = RegKey::predef(hive).open_subkey_with_flags("Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers", KEY_READ | KEY_WOW64_64KEY) {
                for (n, v) in k.enum_values().flatten() {
                    let lo = n.to_ascii_lowercase();
                    if ["dow2.exe", "elite.exe", "steam.exe", "elitelauncher", "elite launcher", "inj.exe"].iter().any(|x| lo.contains(x)) {
                        l.push(format!("compatibility ({name}): {n} = {}", v.to_string()));
                    }
                }
            }
        }
    }
    let running = running_steam();
    if running.is_empty() { l.push("steam.exe: not running".into()); }
    for (pid, p, e) in &running {
        l.push(format!("steam.exe running: pid {pid}, {}, {}", p.as_deref().unwrap_or("path can't be read"),
            match e { Some(true) => "as administrator", Some(false) => "not elevated", None => "elevation can't be asked (likely as administrator)" }));
        if let Some(p) = p { if let Some(d) = Path::new(p).parent() { roots.push(d.display().to_string()); } }
    }
    l.push(format!("the launcher's environment: SteamAppId {}, SteamGameId {}", std::env::var("SteamAppId").unwrap_or_else(|_| "-".into()),
        std::env::var("SteamGameId").unwrap_or_else(|_| "-".into())));
    if let Some(g) = game {
        let t = std::fs::read_to_string(g.join("steam_appid.txt")).ok();
        l.push(format!("game folder: steam_appid.txt {}; Steam library {}", t.map(|t| format!("present ({})", t.trim())).unwrap_or_else(|| "none".into()),
            library_of(g).map(|p| p.display().to_string()).unwrap_or_else(|| "? (not under a steamapps folder)".into())));
        for f in ["runoptions.cfg", "Elite.launchconfig.bak", "dxvk.conf", "d3d9.dll"] {
            if let Ok(m) = std::fs::metadata(g.join(f)) { l.push(format!("game folder: {f} ({} bytes)", m.len())); }
        }
        if let Ok(t) = std::fs::read_to_string(g.join("runoptions.cfg")) { l.push(format!("  runoptions.cfg: {}", t.chars().take(300).collect::<String>().replace('\n', " | "))); }
    }
    // Steam > the game > Properties > Launch options, every Steam account of every Steam folder
    let mut seen: Vec<String> = Vec::new();
    for r in roots {
        let key = norm(&r);
        if seen.contains(&key) { continue; }
        seen.push(key);
        let Ok(rd) = std::fs::read_dir(Path::new(&r).join("userdata")) else { continue };
        for u in rd.flatten() {
            let Ok(t) = std::fs::read_to_string(u.path().join("config").join("localconfig.vdf")) else { continue };
            l.push(format!("launch options of 56400 ({}\\userdata\\{}): {}", r, u.file_name().to_string_lossy(), match launch_options(&t, 56400) {
                None => "the game is not in this account's config".into(), Some(s) if s.trim().is_empty() => "empty".into(), Some(s) => format!("\"{s}\""),
            }));
        }
    }
    l
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn launch_options_found() {
        let v = "\"UserLocalConfigStore\"\n{\n\t\"Software\"\n\t{\n\t\t\"Valve\"\n\t\t{\n\t\t\t\"Steam\"\n\t\t\t{\n\t\t\t\t\"apps\"\n\t\t\t\t{\n\t\t\t\t\t\"15620\"\n\t\t\t\t\t{\n\t\t\t\t\t\t\"LaunchOptions\"\t\t\"-x\"\n\t\t\t\t\t}\n\t\t\t\t\t\"56400\"\n\t\t\t\t\t{\n\t\t\t\t\t\t\"LastPlayed\"\t\t\"1795\"\n\t\t\t\t\t\t\"cloud\"\n\t\t\t\t\t\t{\n\t\t\t\t\t\t\t\"LaunchOptions\"\t\t\"nested\"\n\t\t\t\t\t\t}\n\t\t\t\t\t\t\"LaunchOptions\"\t\t\"-modname \\\"Elite\\\" -dev\"\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n}\n";
        assert_eq!(launch_options(v, 56400).as_deref(), Some("-modname \"Elite\" -dev"));
        assert_eq!(launch_options(v, 15620).as_deref(), Some("-x"));
        assert_eq!(launch_options(v, 99999), None);
        let e = "\"apps\"\n{\n\"56400\"\n{\n\"LastPlayed\" \"1\"\n}\n}";
        assert_eq!(launch_options(e, 56400).as_deref(), Some(""));
        // "56400" as a value (not a block) is skipped
        let s = "\"x\" \"56400\"\n\"apps\" { \"56400\" { \"LaunchOptions\" \"-a\" } }";
        assert_eq!(launch_options(s, 56400).as_deref(), Some("-a"));
    }
    #[test]
    fn library() {
        assert_eq!(library_of(Path::new("/d/Games/Steam1/steamapps/common/Dawn of War II - Retribution")).as_deref(), Some(Path::new("/d/Games/Steam1")));
        assert_eq!(library_of(Path::new("/d/Games/DoW2")), None);
        assert_eq!(norm("\"C:/Program Files (x86)/Steam/\""), "c:\\program files (x86)\\steam");
    }
}
