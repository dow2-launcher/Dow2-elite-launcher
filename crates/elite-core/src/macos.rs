//! The native macOS game (Feral Interactive's port, Mac 1.0.3): finding the .app, its version, the Windows-only files
//! of Elite that are not installed there, and how the launcher starts it with our dylibs (crossplay_fix first).
//!
//! Everything here is plain path/text logic without `cfg` so the Linux tests cover it; only the callers are macOS-only.
use crate::manifest::Manifest;
use std::path::{Path, PathBuf};

/// The file in the folder of the game's data (next to the .app). There is no DOW2.exe on a Mac.
pub const MARKER: &str = "DOW2.module";
/// The Feral build our dylibs patch (their addresses are for this one).
pub const SUPPORTED_VERSION: &str = "1.0.3";
/// The bundle's usual name in steamapps/common/Dawn of War II - Retribution/.
pub const APP_NAME: &str = "Dawn of War II - Retribution.app";
/// The game's process name (CFBundleExecutable) - for "is the game running".
pub const PROCESS_NAME: &str = "Dawn of War II - Retribution";
/// The dylib that has to be the first one in DYLD_INSERT_LIBRARIES: its protfix keeps Feral's integrity check from
/// killing the game after any patch, and it carries the Mac<->Windows sync fixes.
pub const CROSSPLAY: &str = "crossplay_fix";

/// The game's .app in its folder (one level down): the usual name first, else any *.app.
pub fn mac_app(dir: &Path) -> Option<PathBuf> {
    let usual = dir.join(APP_NAME);
    if usual.join("Contents").is_dir() {
        return Some(usual);
    }
    let mut apps: Vec<PathBuf> = std::fs::read_dir(dir).ok()?.flatten().map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|x| x.eq_ignore_ascii_case("app")) && p.join("Contents").is_dir())
        .collect();
    apps.sort();
    apps.into_iter().next()
}

/// `<key>K</key><string>V</string>` of an XML Info.plist (Feral's is XML).
pub fn plist_string(xml: &str, key: &str) -> Option<String> {
    let at = xml.find(&format!("<key>{key}</key>"))?;
    let rest = &xml[at..];
    let s = rest.find("<string>")? + "<string>".len();
    // the value must belong to this key: no other <key> before it
    if rest[..s].matches("<key>").count() != 1 { return None; }
    let e = rest[s..].find("</string>")?;
    Some(rest[s..s + e].trim().to_string())
}

fn info_plist(app: &Path) -> Option<String> {
    std::fs::read_to_string(app.join("Contents").join("Info.plist")).ok()
}

/// The game's executable inside the bundle (Contents/MacOS/<CFBundleExecutable>).
pub fn mac_binary(app: &Path) -> Option<PathBuf> {
    let name = info_plist(app).and_then(|t| plist_string(&t, "CFBundleExecutable")).unwrap_or_else(|| PROCESS_NAME.into());
    if name.contains('/') || name.contains("..") { return None; }
    let p = app.join("Contents").join("MacOS").join(name);
    p.is_file().then_some(p)
}

/// CFBundleShortVersionString of the game (Feral: "1.0.3").
pub fn game_version(app: &Path) -> Option<String> {
    info_plist(app).and_then(|t| plist_string(&t, "CFBundleShortVersionString"))
}

/// The game folder on a Mac: DOW2.module there and the game's .app next to it.
pub fn is_game_dir(dir: &Path) -> bool {
    dir.join(MARKER).is_file() && mac_app(dir).and_then(|a| mac_binary(&a)).is_some()
}

/// Where Feral's game keeps "Documents" (My Games/... lives under it): its VFS in Application Support.
pub fn vfs_documents(home: &Path) -> PathBuf {
    home.join("Library/Application Support/Feral Interactive/Dawn of War II - Retribution/VFS/User/AppData/Roaming")
}

/// The launcher's own folder for Mac add-ons (dylibs and their ini): never inside the .app (Steam's file check would put it
/// back) nor in the game's data.
pub fn addons_dir(home: &Path) -> PathBuf {
    home.join("Library/Application Support/EliteLauncher/mac_addons")
}

/// A file of Elite's manifest that is for Windows only: the exe/dll, the Windows patch DLLs and their folders, the
/// starter's config, the ShellPatch/Cullsphere data. The Mac game reads only Elite.module and Elite/ (archives, data).
pub fn is_windows_only(rel: &str) -> bool {
    let l = rel.replace('\\', "/").to_ascii_lowercase();
    let top = l.split('/').next().unwrap_or("");
    if ["elite_bin", "elite_bin_test", "elite_dlls", "dow2-patches"].contains(&top) && l.len() > top.len() {
        return true;
    }
    let name = l.rsplit('/').next().unwrap_or("");
    [".exe", ".dll", ".pdb", ".launchconfig", ".shells", ".cullsphere", ".bat", ".cmd", ".ico"].iter().any(|x| name.ends_with(x))
        || name.contains(".launchconfig")
}

/// The manifest as installed on `os` ("windows" / "linux" / "macos"): on macos without the Windows-only files.
pub fn files_for_os(man: Manifest, os: &str) -> Manifest {
    if os != "macos" { return man; }
    Manifest { version: man.version, files: man.files.into_iter().filter(|f| !is_windows_only(&f.path)).collect() }
}

/// The dylibs to load, in order: crossplay_fix first, then the others by name. `addons` holds them flat or one folder per
/// add-on (mac_addons/<id>/*.dylib).
pub fn dylibs(addons: &Path) -> Vec<PathBuf> {
    fn scan(d: &Path, deeper: bool, v: &mut Vec<PathBuf>) -> Vec<PathBuf> {
        let mut sub = Vec::new();
        if let Ok(rd) = std::fs::read_dir(d) {
            for e in rd.flatten() {
                let p = e.path();
                if p.is_dir() && deeper { sub.push(p); } else if p.is_file() && p.extension().is_some_and(|x| x == "dylib") { v.push(p); }
            }
        }
        sub
    }
    let mut v = Vec::new();
    for d in scan(addons, true, &mut v) { scan(&d, false, &mut v); }
    let first = |p: &PathBuf| !is_crossplay(p);
    v.sort_by(|a, b| (first(a), a.file_name()).cmp(&(first(b), b.file_name())));
    // without crossplay_fix (protfix) no other patch may load: Feral's integrity check would end the game in ~15 min
    if v.first().is_some_and(first) { return Vec::new(); }
    v
}

fn is_crossplay(p: &Path) -> bool {
    p.file_stem().is_some_and(|s| s.to_string_lossy().to_ascii_lowercase().starts_with(CROSSPLAY))
}

/// The folder of the catalog's add-on `id` in `addons` (mac_addons/<id>/): the launcher installs it there, with its own
/// .elite_launcher state and .elite_cache.
pub fn addon_dir(addons: &Path, id: &str) -> PathBuf {
    addons.join(crate::update::component_key(id))
}

/// `dylibs` of only the add-ons `ids` (the ones on for the game being started): crossplay_fix first, none without it.
pub fn dylibs_of(addons: &Path, ids: &[String]) -> Vec<PathBuf> {
    let dirs: Vec<PathBuf> = ids.iter().map(|i| addon_dir(addons, i)).collect();
    let v: Vec<PathBuf> = dylibs(addons).into_iter().filter(|p| p.parent().is_some_and(|d| dirs.iter().any(|x| x == d))).collect();
    if v.first().is_some_and(|p| !is_crossplay(p)) { return Vec::new(); }
    v
}

/// What makes a downloaded dylib loadable, as the package's run_elite.command does: the quarantine flag off (Gatekeeper),
/// an ad-hoc signature. (program, args) pairs; a failure of either is not fatal.
pub fn prepare_commands(dylib: &Path) -> Vec<(&'static str, Vec<String>)> {
    let f = dylib.to_string_lossy().to_string();
    vec![
        ("xattr", vec!["-d".into(), "com.apple.quarantine".into(), f.clone()]),
        ("codesign", vec!["-f".into(), "-s".into(), "-".into(), f]),
    ]
}

/// The logs crossplay_fix writes (the package's scripts collect the same).
pub const TMP_LOGS: [&str; 2] = ["/tmp/elitefix.log", "/tmp/dow2_net.log"];

/// Feral's folder of the game in Application Support (its VFS: My Games, syncerror files).
pub fn feral_dir(home: &Path) -> PathBuf {
    home.join("Library/Application Support/Feral Interactive/Dawn of War II - Retribution")
}

/// The game's own logs worth sending from Feral's folder: syncerror* and warnings* files at any depth (up to 8), changed
/// in the last `days`, newest first, at most `max`.
pub fn game_logs(home: &Path, days: u64, max: usize) -> Vec<PathBuf> {
    fn walk(d: &Path, depth: u32, out: &mut Vec<(std::time::SystemTime, PathBuf)>) {
        let Ok(rd) = std::fs::read_dir(d) else { return };
        for e in rd.flatten() {
            let (p, Ok(md)) = (e.path(), e.metadata()) else { continue };
            if md.is_dir() { if depth > 0 { walk(&p, depth - 1, out); } continue; }
            let n = e.file_name().to_string_lossy().to_ascii_lowercase();
            if n.contains("syncerror") || n.starts_with("warnings") {
                out.push((md.modified().unwrap_or(std::time::UNIX_EPOCH), p));
            }
        }
    }
    let mut v = Vec::new();
    walk(&feral_dir(home), 8, &mut v);
    v.retain(|(t, _)| t.elapsed().map(|e| e.as_secs() < days * 86400).unwrap_or(true));
    v.sort_by(|a, b| b.0.cmp(&a.0));
    v.into_iter().take(max).map(|x| x.1).collect()
}

/// Free bytes from the output of `df -Pk <path>` (POSIX form, the same on macOS and Linux).
pub fn df_free_bytes(out: &str) -> Option<u64> {
    out.lines().nth(1)?.split_whitespace().nth(3)?.parse::<u64>().ok().map(|kb| kb * 1024)
}

/// Why the start is not the full one (shown to the player).
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Warn {
    /// No crossplay_fix in mac_addons: the start goes through Steam, without our patches.
    NoDylib,
    /// The game is not Mac 1.0.3: started without dylibs (their addresses would be wrong).
    GameVersion(String),
}

/// How the launcher starts the game itself: the binary right away (not through sh/open - SIP drops DYLD_* there).
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Launch {
    pub program: PathBuf,
    pub args: Vec<String>,
    pub cwd: PathBuf,
    pub env: Vec<(String, String)>,
}

/// The arguments: Elite = `-modname Elite -nomovies`, vanilla = `-nomovies`.
pub fn args(vanilla: bool) -> Vec<String> {
    let v: &[&str] = if vanilla { &["-nomovies"] } else { &["-modname", "Elite", "-nomovies"] };
    v.iter().map(|s| s.to_string()).collect()
}

/// The start for the game folder `dir`. Err(None) = no game there; Err(Some(Warn::NoDylib)) = start through Steam
/// (the fallback, launch.macos of launcher.json). Ok(launch, warnings): a version other than 1.0.3 starts without dylibs.
pub fn plan(dir: &Path, vanilla: bool, addons: &Path, appid: u32) -> Result<(Launch, Vec<Warn>), Option<Warn>> {
    plan_with(dir, vanilla, dylibs(addons), appid)
}

/// `plan` with the dylibs already picked (`dylibs_of` the add-ons on for this game).
pub fn plan_with(dir: &Path, vanilla: bool, libs: Vec<PathBuf>, appid: u32) -> Result<(Launch, Vec<Warn>), Option<Warn>> {
    let app = mac_app(dir).ok_or(None)?;
    let program = mac_binary(&app).ok_or(None)?;
    let cwd = program.parent().map(Path::to_path_buf).unwrap_or_default();
    let mut warn = Vec::new();
    if libs.is_empty() { return Err(Some(Warn::NoDylib)); }
    let ver = game_version(&app).unwrap_or_default();
    let mut env = vec![("SteamAppId".to_string(), appid.to_string()), ("SteamGameId".to_string(), appid.to_string())];
    if ver == SUPPORTED_VERSION {
        let list = libs.iter().map(|p| p.to_string_lossy().to_string()).collect::<Vec<_>>().join(":");
        env.push(("DYLD_INSERT_LIBRARIES".into(), list));
    } else {
        warn.push(Warn::GameVersion(if ver.is_empty() { "?".into() } else { ver }));
    }
    Ok((Launch { program, args: args(vanilla), cwd, env }, warn))
}

/// steam_appid.txt next to the binary: without it SteamAPI_RestartAppIfNecessary restarts the game through Steam and
/// the dylibs are lost.
pub fn write_steam_appid(cwd: &Path, appid: u32) -> std::io::Result<()> {
    let p = cwd.join("steam_appid.txt");
    if std::fs::read_to_string(&p).is_ok_and(|t| t.trim() == appid.to_string()) { return Ok(()); }
    std::fs::write(p, format!("{appid}\n"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::manifest::FileEntry;
    use std::fs;

    const PLIST: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
	<key>CFBundleExecutable</key>
	<string>Dawn of War II - Retribution</string>
	<key>CFBundleIdentifier</key>
	<string>com.feralinteractive.dawnofwar2retribution</string>
	<key>CFBundleShortVersionString</key>
	<string>VER</string>
</dict></plist>"#;

    /// steamapps/common/Dawn of War II - Retribution/ as Steam puts it on a Mac.
    fn fake_game(name: &str, ver: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!("elite_mac_{name}_{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        let dir = root.join("Dawn of War II - Retribution");
        let app = dir.join(APP_NAME).join("Contents");
        fs::create_dir_all(app.join("MacOS")).unwrap();
        fs::create_dir_all(app.join("Frameworks")).unwrap();
        fs::write(app.join("Info.plist"), PLIST.replace("VER", ver)).unwrap();
        fs::write(app.join("MacOS").join(PROCESS_NAME), b"\xcf\xfa\xed\xfe").unwrap();
        fs::create_dir_all(dir.join("GameAssets")).unwrap();
        fs::write(dir.join(MARKER), b"[global]").unwrap();
        dir
    }

    #[test]
    fn finds_the_app_and_its_binary() {
        let dir = fake_game("find", "1.0.3");
        assert!(is_game_dir(&dir));
        let app = mac_app(&dir).unwrap();
        assert_eq!(app.file_name().unwrap(), APP_NAME);
        assert_eq!(mac_binary(&app).unwrap(), app.join("Contents/MacOS").join(PROCESS_NAME));
        assert_eq!(game_version(&app).as_deref(), Some("1.0.3"));
        // no DOW2.module -> not the game; another .app name is still found
        fs::remove_file(dir.join(MARKER)).unwrap();
        assert!(!is_game_dir(&dir));
        fs::write(dir.join(MARKER), b"").unwrap();
        fs::rename(&app, dir.join("DoW2.app")).unwrap();
        assert!(is_game_dir(&dir));
        assert!(!dir.join("DOW2.exe").exists());
        let _ = fs::remove_dir_all(dir.parent().unwrap());
    }

    #[test]
    fn plist_values() {
        let t = PLIST.replace("VER", "1.0.3");
        assert_eq!(plist_string(&t, "CFBundleIdentifier").as_deref(), Some("com.feralinteractive.dawnofwar2retribution"));
        assert_eq!(plist_string(&t, "Missing"), None);
        // a key without a string value does not borrow the next key's
        assert_eq!(plist_string("<key>A</key><true/><key>B</key><string>b</string>", "A"), None);
    }

    #[test]
    fn windows_files_are_not_installed_on_macos() {
        for p in ["Elite.exe", "Elite_Test.exe", "winmm.dll", "Elite_DLLs/MMFind.dll", "Elite_DLLs/MMFind.ini", "Elite_bin/x.dat",
                  "Elite.launchconfig", "Elite.shells", "Elite.cullsphere", "dow2-patches/Relay.dll", "elite_dlls\\a.txt"] {
            assert!(is_windows_only(p), "{p}");
        }
        for p in ["Elite.module", "Elite/Archives/EliteData.sga", "Elite/DataAttrib/x.lua", "Elite/Locale/English/ui.ucs", "Elite_DLLs"] {
            assert!(!is_windows_only(p), "{p}");
        }
        let fe = |p: &str| FileEntry { path: p.into(), size: 1, sha: [0; 32], chunks: vec![] };
        let man = Manifest { version: "3.2.1".into(), files: vec![fe("Elite.exe"), fe("Elite.module"), fe("Elite/Archives/a.sga"), fe("Elite_DLLs/X.dll")] };
        let mac = files_for_os(man.clone(), "macos");
        assert_eq!(mac.files.iter().map(|f| f.path.as_str()).collect::<Vec<_>>(), vec!["Elite.module", "Elite/Archives/a.sga"]);
        assert_eq!(files_for_os(man, "windows").files.len(), 4);
    }

    #[test]
    fn launch_plan() {
        let dir = fake_game("plan", "1.0.3");
        let addons = dir.parent().unwrap().join("mac_addons");
        // no dylibs -> the Steam fallback
        assert_eq!(plan(&dir, false, &addons, 56400), Err(Some(Warn::NoDylib)));
        fs::create_dir_all(addons.join("matchtimer")).unwrap();
        fs::write(addons.join("matchtimer/matchtimer.dylib"), b"x").unwrap();
        // another dylib without crossplay_fix must not load alone
        assert!(dylibs(&addons).is_empty());
        fs::create_dir_all(addons.join("crossplay_mac")).unwrap();
        fs::write(addons.join("crossplay_mac/crossplay_fix.dylib"), b"x").unwrap();
        fs::write(addons.join("crossplay_mac/crossplay_fix.ini"), b"x").unwrap();
        fs::write(addons.join("aaa.dylib"), b"x").unwrap();
        let libs = dylibs(&addons);
        assert_eq!(libs.iter().map(|p| p.file_name().unwrap().to_string_lossy().to_string()).collect::<Vec<_>>(),
                   vec!["crossplay_fix.dylib", "aaa.dylib", "matchtimer.dylib"]);
        let (l, w) = plan(&dir, false, &addons, 56400).unwrap();
        assert!(w.is_empty());
        assert_eq!(l.args, vec!["-modname", "Elite", "-nomovies"]);
        assert_eq!(l.cwd, dir.join(APP_NAME).join("Contents/MacOS"));
        let env: std::collections::HashMap<_, _> = l.env.iter().cloned().collect();
        assert_eq!(env["SteamAppId"], "56400");
        assert_eq!(env["SteamGameId"], "56400");
        assert!(env["DYLD_INSERT_LIBRARIES"].starts_with(&addons.join("crossplay_mac/crossplay_fix.dylib").to_string_lossy().to_string()));
        assert_eq!(env["DYLD_INSERT_LIBRARIES"].matches(':').count(), 2);
        assert_eq!(plan(&dir, true, &addons, 56400).unwrap().0.args, vec!["-nomovies"]);
        write_steam_appid(&l.cwd, 56400).unwrap();
        assert_eq!(fs::read_to_string(l.cwd.join("steam_appid.txt")).unwrap().trim(), "56400");
        // another game version: no dylibs, a warning
        fs::write(dir.join(APP_NAME).join("Contents/Info.plist"), PLIST.replace("VER", "1.0.4")).unwrap();
        let (l2, w2) = plan(&dir, false, &addons, 56400).unwrap();
        assert_eq!(w2, vec![Warn::GameVersion("1.0.4".into())]);
        assert!(!l2.env.iter().any(|(k, _)| k == "DYLD_INSERT_LIBRARIES"));
        // not a game folder
        assert_eq!(plan(&addons, false, &addons, 56400), Err(None));
        let _ = fs::remove_dir_all(dir.parent().unwrap());
    }

    #[test]
    fn mac_paths() {
        let h = Path::new("/Users/p");
        assert_eq!(vfs_documents(h).join("My Games"), PathBuf::from("/Users/p/Library/Application Support/Feral Interactive/Dawn of War II - Retribution/VFS/User/AppData/Roaming/My Games"));
        assert_eq!(addons_dir(h), PathBuf::from("/Users/p/Library/Application Support/EliteLauncher/mac_addons"));
    }
    #[test]
    fn addons_of_the_game_and_logs() {
        let root = std::env::temp_dir().join(format!("mac_addons_test_{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        let addons = addons_dir(&root);
        for (id, f) in [("crossplay_mac", "crossplay_fix.dylib"), ("chathide_mac", "ChatHide.dylib"), ("old", "Old.dylib")] {
            fs::create_dir_all(addon_dir(&addons, id)).unwrap();
            fs::write(addon_dir(&addons, id).join(f), b"x").unwrap();
        }
        let names = |v: Vec<PathBuf>| v.iter().map(|p| p.file_name().unwrap().to_string_lossy().to_string()).collect::<Vec<_>>();
        assert_eq!(names(dylibs_of(&addons, &["chathide_mac".into(), "crossplay_mac".into()])), ["crossplay_fix.dylib", "ChatHide.dylib"]);
        assert!(dylibs_of(&addons, &["chathide_mac".into()]).is_empty(), "nothing loads without crossplay_fix");
        let c = prepare_commands(&addon_dir(&addons, "crossplay_mac").join("crossplay_fix.dylib"));
        assert_eq!((c[0].0, c[1].0, c[1].1[..3].join(" ")), ("xattr", "codesign", "-f -s -".to_string()));
        let logs = feral_dir(&root).join("VFS/User/AppData/Roaming/My Games/Dawn of War II - Retribution/LogFiles");
        fs::create_dir_all(&logs).unwrap();
        for f in ["warnings.txt", "syncerror_1.txt", "other.txt"] { fs::write(logs.join(f), b"x").unwrap(); }
        let mut got = names(game_logs(&root, 3, 10));
        got.sort();
        assert_eq!(got, ["syncerror_1.txt", "warnings.txt"]);
        let _ = fs::remove_dir_all(&root);
        let df = "Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/disk3s5 488245288 300000000 3000000 99% /System/Volumes/Data\n";
        assert_eq!(df_free_bytes(df), Some(3_000_000 * 1024));
        assert_eq!(df_free_bytes("garbage"), None);
    }
}
