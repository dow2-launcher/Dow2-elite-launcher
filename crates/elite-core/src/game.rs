//! Finding Dawn of War II: Retribution and Steam on Windows, Linux and macOS.
use std::path::{Path, PathBuf};

pub fn is_game_dir(dir: &Path, marker: &str) -> bool {
    dir.join(marker).is_file()
}

/// Steam installation folders that exist on this machine.
pub fn steam_roots() -> Vec<PathBuf> {
    let mut v: Vec<PathBuf> = Vec::new();
    #[cfg(windows)]
    {
        use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
        use winreg::RegKey;
        if let Ok(k) = RegKey::predef(HKEY_CURRENT_USER).open_subkey("Software\\Valve\\Steam") {
            if let Ok(p) = k.get_value::<String, _>("SteamPath") {
                v.push(PathBuf::from(p.replace('/', "\\")));
            }
        }
        for key in ["SOFTWARE\\WOW6432Node\\Valve\\Steam", "SOFTWARE\\Valve\\Steam"] {
            if let Ok(k) = RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey(key) {
                if let Ok(p) = k.get_value::<String, _>("InstallPath") {
                    v.push(PathBuf::from(p));
                }
            }
        }
        v.push(PathBuf::from("C:\\Program Files (x86)\\Steam"));
    }
    if let Some(home) = dirs::home_dir() {
        #[cfg(target_os = "linux")]
        for p in [".steam/steam", ".steam/root", ".local/share/Steam", ".var/app/com.valvesoftware.Steam/.local/share/Steam"] {
            v.push(home.join(p));
        }
        #[cfg(target_os = "macos")]
        v.push(home.join("Library/Application Support/Steam"));
        let _ = &home;
    }
    let mut out: Vec<PathBuf> = Vec::new();
    for p in v {
        if p.join("steamapps").is_dir() {
            let c = p.canonicalize().unwrap_or(p);
            if !out.contains(&c) {
                out.push(c);
            }
        }
    }
    out
}

/// All Steam library folders (the main one + those listed in libraryfolders.vdf).
pub fn steam_libraries() -> Vec<PathBuf> {
    let mut libs = Vec::new();
    for root in steam_roots() {
        if !libs.contains(&root) {
            libs.push(root.clone());
        }
        let vdf = root.join("steamapps").join("libraryfolders.vdf");
        if let Ok(t) = std::fs::read_to_string(vdf) {
            for line in t.lines() {
                let l = line.trim();
                if let Some(rest) = l.strip_prefix("\"path\"") {
                    let p = rest.trim().trim_matches('"').replace("\\\\", "\\");
                    let pb = PathBuf::from(p);
                    if pb.join("steamapps").is_dir() && !libs.contains(&pb) {
                        libs.push(pb);
                    }
                }
            }
        }
    }
    libs
}

/// Where the game keeps Documents\My Games: the add-on "Documents fix" moved it (1.5.9: the game may not write to Documents -
/// DocsFix.redirect next to DocsFix.dll names the new place); on Linux under Proton - inside the game's prefix; else the user's Documents.
pub fn documents_dir() -> Option<PathBuf> {
    let g = crate::config::GameInfo::default();
    let game = find_game(&g.folder, &g.marker);
    if let Some(d) = game.as_deref().and_then(crate::docscheck::docsfix_redirect) {
        return Some(d);
    }
    #[cfg(target_os = "linux")]
    {
        if let Some(d) = game.as_deref().and_then(|dir| crate::proton::prefix_documents(dir, g.steam_appid)) {
            return Some(d);
        }
    }
    dirs::document_dir()
}

pub fn find_game(folder: &str, marker: &str) -> Option<PathBuf> {
    steam_libraries()
        .into_iter()
        .map(|l| l.join("steamapps").join("common").join(folder))
        .find(|d| is_game_dir(d, marker))
}

pub fn steam_installed() -> bool {
    !steam_roots().is_empty()
}


/// The Steam account logged in on this computer: (SteamID64, persona name). The running Steam client's user first
/// (Windows: HKCU\Software\Valve\Steam\ActiveProcess\ActiveUser), else the most recent one in config/loginusers.vdf.
pub fn steam_local_user() -> Option<(String, String)> {
    let mut active: Option<u64> = None;
    #[cfg(windows)]
    {
        use winreg::enums::HKEY_CURRENT_USER;
        use winreg::RegKey;
        if let Ok(k) = RegKey::predef(HKEY_CURRENT_USER).open_subkey("Software\\Valve\\Steam\\ActiveProcess") {
            if let Ok(id) = k.get_value::<u32, _>("ActiveUser") {
                if id != 0 { active = Some(76561197960265728u64 + id as u64); }
            }
        }
    }
    let mut users: Vec<(String, String, u64)> = Vec::new();
    for root in steam_roots() {
        let Ok(t) = std::fs::read_to_string(root.join("config").join("loginusers.vdf")) else { continue };
        users.extend(parse_loginusers(&t));
        if !users.is_empty() { break; }
    }
    if let Some(a) = active {
        let id = a.to_string();
        let name = users.iter().find(|u| u.0 == id).map(|u| u.1.clone()).unwrap_or_default();
        return Some((id, name));
    }
    users.iter().max_by_key(|u| u.2).map(|u| (u.0.clone(), u.1.clone()))
}

/// loginusers.vdf: "users" { "7656119…" { "PersonaName" ".." "MostRecent" "1" "timestamp" "…" … } … } -> (id, name, rank):
/// rank = the last sign-in time; MostRecent "1" (older Steam clients) ranks above everything.
pub fn parse_loginusers(t: &str) -> Vec<(String, String, u64)> {
    let mut out = Vec::new();
    let mut toks: Vec<String> = Vec::new();
    let mut it = t.chars().peekable();
    while let Some(c) = it.next() {
        match c {
            '"' => { let mut s = String::new(); while let Some(c) = it.next() { if c == '\\' { if let Some(n) = it.next() { s.push(n); } continue; } if c == '"' { break; } s.push(c); } toks.push(s); }
            '{' => toks.push("{".into()),
            '}' => toks.push("}".into()),
            _ => {}
        }
    }
    let mut i = 0;
    while i + 1 < toks.len() {
        let id = &toks[i];
        if id.len() == 17 && id.starts_with("7656119") && id.bytes().all(|b| b.is_ascii_digit()) && toks[i + 1] == "{" {
            let (mut name, mut recent, mut ts) = (String::new(), false, 0u64);
            let mut j = i + 2;
            while j + 1 < toks.len() && toks[j] != "}" {
                let k = toks[j].to_ascii_lowercase();
                if k == "personaname" { name = toks[j + 1].clone(); }
                if k == "mostrecent" { recent = toks[j + 1] == "1"; }
                if k == "timestamp" { ts = toks[j + 1].parse().unwrap_or(0); }
                j += 2;
            }
            out.push((id.clone(), name, if recent { u64::MAX } else { ts }));
            i = j;
        }
        i += 1;
    }
    out
}

/// A stable id of this computer, hashed (the raw one never leaves the machine). Empty if none is found.
pub fn machine_id() -> String {
    let mut raw = String::new();
    #[cfg(windows)]
    {
        use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_64KEY};
        use winreg::RegKey;
        if let Ok(k) = RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey_with_flags("SOFTWARE\\Microsoft\\Cryptography", KEY_READ | KEY_WOW64_64KEY) {
            raw = k.get_value::<String, _>("MachineGuid").unwrap_or_default();
        }
    }
    #[cfg(target_os = "linux")]
    { raw = std::fs::read_to_string("/etc/machine-id").or_else(|_| std::fs::read_to_string("/var/lib/dbus/machine-id")).unwrap_or_default(); }
    #[cfg(target_os = "macos")]
    {
        if let Ok(o) = std::process::Command::new("ioreg").args(["-rd1", "-c", "IOPlatformExpertDevice"]).output() {
            let t = String::from_utf8_lossy(&o.stdout);
            if let Some(l) = t.lines().find(|l| l.contains("IOPlatformUUID")) { raw = l.split('"').nth(3).unwrap_or("").to_string(); }
        }
    }
    let raw = raw.trim();
    if raw.is_empty() { return String::new(); }
    use sha2::{Digest, Sha256};
    let h = Sha256::digest(format!("elite-launcher:{raw}").as_bytes());
    h.iter().take(16).map(|b| format!("{b:02x}")).collect()
}

#[cfg(test)]
mod steam_user_tests {
    #[test]
    fn loginusers() {
        let t = "\"users\"\n{\n\t\"76561198000000001\"\n\t{\n\t\t\"AccountName\"\t\t\"a\"\n\t\t\"PersonaName\"\t\t\"Old \\\"one\\\"\"\n\t\t\"MostRecent\"\t\t\"0\"\n\t}\n\t\"76561198000000002\"\n\t{\n\t\t\"PersonaName\"\t\t\"Новый\"\n\t\t\"MostRecent\"\t\t\"1\"\n\t}\n}\n";
        let u = super::parse_loginusers(t);
        assert_eq!(u.len(), 2);
        assert_eq!(u[0], ("76561198000000001".into(), "Old \"one\"".into(), 0));
        assert_eq!(u[1], ("76561198000000002".into(), "Новый".into(), u64::MAX));
        // newer Steam: no MostRecent, the latest timestamp wins
        let n = super::parse_loginusers("\"users\" { \"76561198000000003\" { \"PersonaName\" \"a\" \"timestamp\" \"100\" } \"76561198000000004\" { \"PersonaName\" \"b\" \"timestamp\" \"200\" } }");
        assert_eq!(n.iter().max_by_key(|u| u.2).unwrap().1, "b");
    }
}
