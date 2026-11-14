//! Elite-specific tweaks: the DLL list in Elite.launchconfig and the LobbyStats settings file.
use std::fs;
use std::path::Path;

pub const LAUNCHCONFIG: &str = "Elite.launchconfig";

/// Add or remove `dll` in every `*.launchconfig` of the game folder (Elite.launchconfig, Elite_Test.launchconfig of the
/// public test, …). Returns the names of the files that changed.
/// Set `key=value` in `[section]` of a simple ini file (created if missing). Keeps everything else as is.
pub fn set_ini_value(path: &Path, section: &str, key: &str, value: &str) -> std::io::Result<()> {
    if let Some(d) = path.parent() { fs::create_dir_all(d)?; }
    let text = fs::read_to_string(path).unwrap_or_default();
    let crlf = text.contains("\r\n") || text.is_empty();
    let mut out: Vec<String> = Vec::new();
    let (mut in_sec, mut done, mut seen_sec) = (false, false, false);
    for l in text.lines() {
        let t = l.trim();
        if t.starts_with('[') && t.ends_with(']') {
            if in_sec && !done { out.push(format!("{key}={value}")); done = true; }
            in_sec = t[1..t.len() - 1].trim().eq_ignore_ascii_case(section);
            seen_sec |= in_sec;
        } else if in_sec && !done {
            if let Some((k, _)) = t.split_once('=') {
                if k.trim().eq_ignore_ascii_case(key) { out.push(format!("{key}={value}")); done = true; continue; }
            }
        }
        out.push(l.to_string());
    }
    if !done {
        if !seen_sec { if !out.is_empty() { out.push(String::new()); } out.push(format!("[{section}]")); }
        else { /* section was the last one */ }
        out.push(format!("{key}={value}"));
    }
    let nl = if crlf { "\r\n" } else { "\n" };
    fs::write(path, out.join(nl) + nl)
}

/// 1.6.5: a launch config names the DLL only when its own DLL folder has it - `X.launchconfig` <-> `X_DLLs/` (Elite_DLLs,
/// Elite_Test_DLLs, IgRework_DLLs): X.exe refuses to start at all ("Failed to find a specific injected file required by this
/// mod") when a name in its InjectedFiles is not in X_DLLs. Our add-ons are installed into Elite_DLLs only, so up to 1.6.3
/// every add-on that was on kept grantovich's IgRework.exe from starting the game. `enable` with the DLL missing there removes it.
pub fn set_injected_all(game_dir: &Path, dll: &str, enable: bool) -> std::io::Result<Vec<String>> {
    let mut changed = Vec::new();
    for (name, path, dlls) in launchconfigs(game_dir)? {
        if set_injected_file(&path, dll, enable && dlls.join(dll).is_file())? { changed.push(name); }
    }
    Ok(changed)
}

/// 1.6.5: `dll` out of every launch config whose own DLL folder does not have it (the others stay as they are). Returns the
/// names of the files that changed.
pub fn unlist_missing(game_dir: &Path, dll: &str) -> std::io::Result<Vec<String>> {
    let mut changed = Vec::new();
    for (name, path, dlls) in launchconfigs(game_dir)? {
        if !dlls.join(dll).is_file() && set_injected_file(&path, dll, false)? { changed.push(name); }
    }
    Ok(changed)
}

/// Every `X.launchconfig` file at the top of the game folder: (file name, path, its DLL folder `X_DLLs`).
fn launchconfigs(game_dir: &Path) -> std::io::Result<Vec<(String, std::path::PathBuf, std::path::PathBuf)>> {
    let mut out = Vec::new();
    for e in fs::read_dir(game_dir)?.flatten() {
        let name = e.file_name().to_string_lossy().to_string();
        let Some(n) = name.len().checked_sub(13).filter(|&n| name.is_char_boundary(n) && name[n..].eq_ignore_ascii_case(".launchconfig")) else { continue };
        if !e.path().is_file() { continue; }
        let dlls = game_dir.join(format!("{}_DLLs", &name[..n]));
        out.push((name, e.path(), dlls));
    }
    Ok(out)
}

/// Add or remove `dll` in the `InjectedFiles=` line of Elite.launchconfig. Returns true if the file changed.
pub fn set_injected(game_dir: &Path, dll: &str, enable: bool) -> std::io::Result<bool> {
    set_injected_file(&game_dir.join(LAUNCHCONFIG), dll, enable)
}

fn set_injected_file(path: &Path, dll: &str, enable: bool) -> std::io::Result<bool> {
    let path = path.to_path_buf();
    let text = fs::read_to_string(&path)?;
    let crlf = text.contains("\r\n");
    let mut changed = false;
    let mut found = false;
    let lines: Vec<String> = text
        .lines()
        .map(|l| {
            let Some(rest) = l.strip_prefix("InjectedFiles=") else { return l.to_string() };
            found = true;
            let mut items: Vec<String> = rest.split(',').map(|x| x.trim().to_string()).filter(|x| !x.is_empty()).collect();
            let has = items.iter().any(|x| x.eq_ignore_ascii_case(dll));
            if enable && !has {
                items.push(dll.to_string());
                changed = true;
            } else if !enable && has {
                items.retain(|x| !x.eq_ignore_ascii_case(dll));
                changed = true;
            }
            format!("InjectedFiles={}", items.join(", "))
        })
        .collect();
    let mut lines = lines;
    if !found && enable {
        lines.push(format!("InjectedFiles={dll}"));
        changed = true;
    }
    if changed {
        let nl = if crlf { "\r\n" } else { "\n" };
        let mut out = lines.join(nl);
        if text.ends_with('\n') {
            out.push_str(nl);
        }
        fs::write(&path, out)?;
    }
    Ok(changed)
}

/// LobbyStats.ini: keep the player's own lines, drop everything left over from the old host filter
/// (the [Guard], [UI] and [Chat] sections and the "!filter" hint). Creates a minimal file if there is none.
pub fn clean_lobbystats_ini(game_dir: &Path) -> std::io::Result<()> {
    let dir = game_dir.join("Elite_DLLs");
    let path = dir.join("LobbyStats.ini");
    let old = fs::read_to_string(&path).unwrap_or_default();
    let mut out = String::new();
    let mut skip = false;
    for line in old.lines() {
        let t = line.trim();
        if t.starts_with('[') {
            let sec = t.to_ascii_lowercase();
            skip = sec == "[guard]" || sec == "[ui]" || sec == "[chat]";
        }
        if skip || t.contains("!filter") { continue; }
        out.push_str(line);
        out.push_str("\r\n");
    }
    if !out.to_ascii_lowercase().contains("[lobbystats]") {
        out = format!("[LobbyStats]\r\nShowRatingInName=1\r\n{out}");
    }
    if out != old {
        fs::create_dir_all(&dir)?;
        fs::write(&path, out)?;
    }
    Ok(())
}

#[cfg(test)]
mod launchconfig_tests {
    use super::*;
    #[test]
    fn a_launch_config_names_only_dlls_of_its_own_folder() {
        let d = std::env::temp_dir().join(format!("lc_test_{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        for p in ["Elite_DLLs", "IgRework_DLLs"] { fs::create_dir_all(d.join(p)).unwrap(); }
        for f in ["Elite_DLLs/Cooldowns.dll", "IgRework_DLLs/CullspherePatch.dll"] { fs::write(d.join(f), b"MZ").unwrap(); }
        fs::write(d.join("Elite.launchconfig"), "InjectedFiles=CullspherePatch.dll\r\n").unwrap();
        fs::write(d.join("IgRework.launchconfig"), "InjectedFiles=CullspherePatch.dll, Cooldowns.dll\r\n").unwrap();
        let lc = |n: &str| fs::read_to_string(d.join(n)).unwrap();
        assert_eq!(set_injected_all(&d, "Cooldowns.dll", true).unwrap().len(), 2, "added to Elite's, taken out of IG Rework's");
        assert!(lc("Elite.launchconfig").contains("Cooldowns.dll"));
        assert_eq!(lc("IgRework.launchconfig"), "InjectedFiles=CullspherePatch.dll\r\n", "no Cooldowns.dll in IgRework_DLLs");
        fs::write(d.join("IgRework.launchconfig"), "InjectedFiles=CullspherePatch.dll, Cooldowns.dll\r\n").unwrap();
        assert_eq!(unlist_missing(&d, "Cooldowns.dll").unwrap(), ["IgRework.launchconfig"]);
        assert!(lc("Elite.launchconfig").contains("Cooldowns.dll"), "Elite's add-on stays");
        assert!(unlist_missing(&d, "CullspherePatch.dll").unwrap() == ["Elite.launchconfig"] && lc("IgRework.launchconfig").contains("CullspherePatch.dll"));
        let _ = fs::remove_dir_all(&d);
    }
}
