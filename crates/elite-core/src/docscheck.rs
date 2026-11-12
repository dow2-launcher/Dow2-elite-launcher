//! 1.5.9: can the game write its folder in Documents? (Malum, 12.11.2026: the volume reset after every start, no replay
//! since 30.08 - configuration.lua and Playback\temp.rec of 30.08 in Documents\My Games\Dawn of War II - Retribution while
//! the game kept reading that folder.) "Send logs" carries what this finds; the game process checks itself too (the add-on
//! "Documents fix", DocsFix.dll, writes the same check to DocsFix.log at the start and after every match).
//! Nothing here changes anything: one small test file is created and deleted again in Settings and in Playback.
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub const GAME_FOLDER: &str = "Dawn of War II - Retribution";

/// The add-on "Documents fix" (DocsFix.dll) moved the game's Documents: `<game>\Elite_DLLs\DocsFix.redirect` (vanilla:
/// `dow2-patches\`) names the new Documents, as long as DocsFix.dll is next to it (unticked = the DLL is gone = the game is
/// back on the usual Documents). The newest marker wins (Elite and vanilla copies point at the same place).
pub fn docsfix_redirect(game_dir: &Path) -> Option<PathBuf> {
    let mut best: Option<(SystemTime, PathBuf)> = None;
    for sub in ["Elite_DLLs", "dow2-patches"] {
        let d = game_dir.join(sub);
        if !d.join("DocsFix.dll").is_file() { continue; }
        let m = d.join("DocsFix.redirect");
        let Ok(t) = std::fs::read_to_string(&m) else { continue };
        let p = PathBuf::from(t.lines().next().unwrap_or("").trim().trim_start_matches('\u{feff}'));
        if p.as_os_str().is_empty() || !p.join("My Games").join(GAME_FOLDER).is_dir() { continue; }
        let mt = std::fs::metadata(&m).and_then(|x| x.modified()).unwrap_or(UNIX_EPOCH);
        if best.as_ref().map_or(true, |b| mt > b.0) { best = Some((mt, p)); }
    }
    best.map(|b| b.1)
}

/// "2026-08-30 18:46 UTC" (no time zone library in the launcher)
pub fn utc(t: SystemTime) -> String {
    let s = t.duration_since(UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0);
    let (days, rem) = (s.div_euclid(86400), s.rem_euclid(86400));
    // civil from days (H. Hinnant)
    let z = days + 719468; let era = z.div_euclid(146097); let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365; let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100); let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1; let m = if mp < 10 { mp + 3 } else { mp - 9 }; let y = if m <= 2 { y + 1 } else { y };
    format!("{y:04}-{m:02}-{d:02} {:02}:{:02} UTC", rem / 3600, rem % 3600 / 60)
}

fn mtime(p: &Path) -> Option<SystemTime> { std::fs::metadata(p).and_then(|m| m.modified()).ok() }

/// Windows file attributes worth naming (read-only, redirected / OneDrive, cloud placeholders)
fn attrs(p: &Path) -> String {
    let Ok(m) = std::fs::metadata(p) else { return "missing".into() };
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        let a = m.file_attributes();
        let mut v: Vec<&str> = Vec::new();
        for (f, n) in [(0x1, "READONLY"), (0x400, "REPARSE"), (0x1000, "OFFLINE"), (0x40000, "CLOUD-RECALL-ON-OPEN"),
                       (0x400000, "CLOUD-RECALL-ON-ACCESS"), (0x80000, "pinned"), (0x100000, "unpinned"), (0x4000, "encrypted")] {
            if a & f != 0 { v.push(n); }
        }
        return if v.is_empty() { format!("ok (0x{a:X})") } else { format!("{} (0x{a:X})", v.join(" ")) };
    }
    #[cfg(not(windows))]
    { if m.permissions().readonly() { "READONLY".into() } else { "ok".into() } }
}

/// create + write + delete a small file from the launcher's process: None = fine, Some(os error) else
fn write_test(dir: &Path) -> Option<(i32, String)> {
    use std::io::Write;
    if !dir.is_dir() { return Some((3, "no such folder".into())); }
    let p = dir.join("elite_launcher_write_test.tmp");
    let r = std::fs::OpenOptions::new().write(true).create(true).truncate(true).open(&p)
        .and_then(|mut f| f.write_all(b"Elite launcher write test\r\n"))
        .and_then(|_| std::fs::remove_file(&p));
    r.err().map(|e| (e.raw_os_error().unwrap_or(-1), e.to_string()))
}

fn wt_str(r: &Option<(i32, String)>) -> String {
    match r { None => "ok".into(), Some((c, m)) => format!("FAILED (os error {c}: {m})") }
}

/// What one game folder (`<Documents>\My Games\Dawn of War II - Retribution`) looks like: lines for the log and a short summary.
pub struct FolderCheck { pub lines: Vec<String>, pub settings_write: Option<(i32, String)>, pub playback_write: Option<(i32, String)>,
                         pub cfg: Option<SystemTime>, pub rec: Option<SystemTime>, pub log_start: String }

pub fn check_folder(f: &Path) -> FolderCheck {
    let st = f.join("Settings"); let pb = f.join("Playback");
    let cfg = mtime(&st.join("configuration.lua")); let rec = mtime(&pb.join("temp.rec"));
    let (mut n, mut newest): (usize, Option<(SystemTime, String)>) = (0, None);
    if let Ok(rd) = std::fs::read_dir(&pb) {
        for e in rd.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            if !name.to_ascii_lowercase().ends_with(".rec") { continue; }
            n += 1;
            if let Some(t) = e.metadata().ok().and_then(|m| m.modified().ok()) { if newest.as_ref().map_or(true, |x| t > x.0) { newest = Some((t, name)); } }
        }
    }
    // the game's own log: when it last wrote it, which mod
    let w = f.join("Logfiles").join("warnings.txt");
    let head = std::fs::read(&w).map(|b| String::from_utf8_lossy(&b[..b.len().min(4096)]).into_owned()).unwrap_or_default();
    let started = head.lines().find(|l| l.contains(" started at ")).and_then(|l| l.split(" started at ").nth(1)).unwrap_or("").trim().to_string();
    let modname = head.lines().find(|l| l.contains("Initializing mod '")).and_then(|l| l.split("Initializing mod '").nth(1)).and_then(|x| x.split('\'').next()).unwrap_or("").to_string();
    let log_start = if started.is_empty() { "-".into() } else { format!("{started} (mod {})", if modname.is_empty() { "?" } else { &modname }) };
    let ini = std::fs::read_to_string(st.join("Local.ini")).unwrap_or_default();
    let matches = ini.lines().find_map(|l| l.trim().strip_prefix("total_matches=")).unwrap_or("-").to_string();
    let sw = write_test(&st); let pw = write_test(&pb);
    let t = |x: Option<SystemTime>| x.map(utc).unwrap_or_else(|| "missing".into());
    let lines = vec![
        format!("folder {}: {}", f.display(), attrs(f)),
        format!("  Settings: {}; configuration.lua written {} ({}); Local.ini total_matches={matches}", attrs(&st), t(cfg), attrs(&st.join("configuration.lua"))),
        format!("  Playback: {}; temp.rec written {}; {n} .rec files, newest {}", attrs(&pb), t(rec),
                newest.as_ref().map(|x| format!("{} ({})", x.1, utc(x.0))).unwrap_or_else(|| "-".into())),
        format!("  Logfiles\\warnings.txt: the game last started writing it {log_start}, file written {}", t(mtime(&w))),
        format!("  write test from the launcher: Settings {}, Playback {}", wt_str(&sw), wt_str(&pw)),
    ];
    FolderCheck { lines, settings_write: sw, playback_write: pw, cfg, rec, log_start }
}

/// Windows Security > Ransomware protection > Controlled folder access, from the registry (the group policy value wins):
/// (state, DOW2.exe / Elite among the allowed apps). state: "off", "ON (blocks)", "audit only", ..., "unknown (...)"
pub fn controlled_folder_access() -> (String, String) {
    #[cfg(windows)]
    {
        use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_64KEY};
        use winreg::RegKey;
        let hk = RegKey::predef(HKEY_LOCAL_MACHINE);
        let mut state: Option<u32> = None; let mut err = String::new(); let mut allowed: Vec<String> = Vec::new(); let mut any_list = false;
        for k in ["SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Windows Defender Exploit Guard\\Controlled Folder Access",
                  "SOFTWARE\\Microsoft\\Windows Defender\\Windows Defender Exploit Guard\\Controlled Folder Access"] {
            match hk.open_subkey_with_flags(k, KEY_READ | KEY_WOW64_64KEY) {
                Ok(key) => {
                    if state.is_none() { if let Ok(v) = key.get_value::<u32, _>("EnableControlledFolderAccess") { state = Some(v); } }
                    if let Ok(a) = key.open_subkey_with_flags("AllowedApplications", KEY_READ | KEY_WOW64_64KEY) {
                        any_list = true;
                        for (name, _) in a.enum_values().flatten() {
                            let l = name.to_ascii_lowercase();
                            if l.contains("dow2") || l.contains("elite") || l.contains("dawn of war") { allowed.push(name); }
                        }
                    }
                }
                Err(e) if e.kind() != std::io::ErrorKind::NotFound => { if err.is_empty() { err = e.to_string(); } }
                Err(_) => {}
            }
        }
        let s = match state {
            Some(0) => "off".to_string(), Some(1) => "ON (blocks)".into(), Some(2) => "audit only".into(),
            Some(3) => "blocks disk changes only".into(), Some(4) => "audits disk changes only".into(), Some(v) => format!("value {v}"),
            None if !err.is_empty() => format!("unknown (registry: {err})"), None => "off (never set)".into(),
        };
        let a = if !allowed.is_empty() { format!("allowed apps: {}", allowed.join(", ")) } else if any_list { "DOW2.exe not among the allowed apps".into() } else { "no allowed apps".into() };
        return (s, a);
    }
    #[cfg(not(windows))]
    { ("not Windows".into(), String::new()) }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn utc_dates() {
        assert_eq!(utc(UNIX_EPOCH), "1970-01-01 00:00 UTC");
        assert_eq!(utc(UNIX_EPOCH + std::time::Duration::from_secs(1_788_115_601)), "2026-08-30 18:46 UTC");
    }
    #[test]
    fn redirect_needs_the_dll_and_the_folder() {
        let t = std::env::temp_dir().join(format!("docscheck_test_{}", std::process::id()));
        let game = t.join("game"); let newd = t.join("new");
        std::fs::create_dir_all(game.join("Elite_DLLs")).unwrap(); std::fs::create_dir_all(newd.join("My Games").join(GAME_FOLDER)).unwrap();
        std::fs::write(game.join("Elite_DLLs").join("DocsFix.redirect"), format!("{}\r\n", newd.display())).unwrap();
        assert_eq!(docsfix_redirect(&game), None, "no DocsFix.dll = unticked");
        std::fs::write(game.join("Elite_DLLs").join("DocsFix.dll"), b"MZ").unwrap();
        assert_eq!(docsfix_redirect(&game), Some(newd.clone()));
        std::fs::remove_dir_all(newd.join("My Games")).unwrap();
        assert_eq!(docsfix_redirect(&game), None, "the folder is gone");
        let c = check_folder(&t.join("nothing"));
        assert!(c.settings_write.is_some() && c.cfg.is_none());
        let _ = std::fs::remove_dir_all(&t);
    }
}
