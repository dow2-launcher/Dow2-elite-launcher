//! The vanilla game (1.4.11) - its add-ons copied next to DOW2.exe, the mode Play starts.
//! Split out of main.rs (1.6.17): the items as they were; main.rs keeps the app's state, settings, config and main().
use super::*;

// ---------- 1.4.11: the vanilla game (owner 05.11.2026) ----------
// "Vanilla Retribution" in the picker next to Play: DOW2.exe without -modname, the add-ons whose launcher.json entry names
// "vanilla" in `games`, copied from their own manifests into dow2-patches/ (their Elite_DLLs files, same names, their ini
// there too - every DLL reads its ini next to itself), and the launcher's winmm.dll loader (launcher.json vanilla.loader)
// next to DOW2.exe. Elite's own files (Elite_DLLs, Elite.launchconfig, Elite.exe, Profiler...) are not touched in this mode.
// An add-on for Elite only is never copied there, whatever its tick. Back in Elite the vanilla loader goes (into the version
// cache) and Automatch's early winmm.dll (EARLY_ONLY: OwnLobby before RLink) is put back as before. The loader itself also
// decides by the command line (a mod start loads only Elite_DLLs' early add-ons, like Automatch's), so a game started past
// the launcher never loads the vanilla copies into Elite.

/// Is the vanilla game offered: the catalog names its loader; not on macOS (the native game loads no Windows DLLs).
pub(crate) fn vanilla_offered(cfg: &LauncherConfig) -> bool {
    // macOS: no loader there (the Mac add-ons are dylibs, crossplay_fix loads in both games) - the catalog's vanilla entry is enough
    if os_name() == "macos" { cfg.vanilla.is_some() } else { cfg.vanilla_loader().is_some() }
}
/// Does Play start the vanilla game?
pub(crate) fn vanilla_on(cfg: &LauncherConfig, s: &Settings) -> bool {
    s.game_mode == "vanilla" && vanilla_offered(cfg)
}

/// The files the launcher put into dow2-patches for the vanilla game and nobody changed since (lower case game folder paths).
pub(crate) fn vanilla_owned(dir: &std::path::Path) -> std::collections::HashSet<String> {
    update::Game::vanilla_ids(dir).iter()
        .flat_map(|id| update::Game::vanilla_component(dir, id).intact_files())
        .map(|p| p.to_ascii_lowercase()).collect()
}

/// Elite: the vanilla loader out of the game folder (kept in the version cache for the next vanilla start). -> it was there
pub(crate) fn hide_vanilla_loader(dir: &std::path::Path) -> bool {
    let l = update::Game::vanilla_loader(dir);
    l.file_is_installed("winmm.dll") && l.put_away("winmm.dll")
}

/// Files at the top of the game folder of the Elite add-ons that are on (Automatch's early winmm.dll), put back from the
/// version cache when they are missing - at the start, after the vanilla loader went, without the network.
pub(crate) fn restore_root_files(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings) -> Vec<String> {
    let mut back = Vec::new();
    for c in cfg.components.iter().filter(|c| comp_on(dir, c, s)) {
        let g = update::Game::component(dir, &c.id);
        for f in g.load_state().files.iter().filter(|f| !f.path.contains('/') && !f.path.contains("..")) {
            let dst = g.file(&f.path);
            let cached = g.cache_dir().join(&f.sha);
            if !dst.exists() && cached.is_file() && std::fs::copy(&cached, &dst).is_ok() {
                g.accept_local_edit(&f.path);
                back.push(f.path.clone());
            }
        }
    }
    back
}

/// Leftovers of our DLLs in dow2-patches (X.dll.eliteupd of an update cut short, X.dll.old, X.dll.off): deleted.
pub(crate) fn drop_vanilla_leftovers(dir: &std::path::Path, cfg: &LauncherConfig) -> Vec<String> {
    let ours = our_dll_names(dir, cfg);
    let mut gone = Vec::new();
    let Ok(rd) = std::fs::read_dir(dir.join(update::VANILLA_DIR)) else { return gone };
    for e in rd.flatten() {
        let n = e.file_name().to_string_lossy().to_string();
        if e.path().is_file() && our_leftover(&n, &ours) && std::fs::remove_file(e.path()).is_ok() {
            gone.push(format!("{}/{n}", update::VANILLA_DIR));
        }
    }
    gone
}

/// The vanilla game: the launcher's loader loads every DLL in dow2-patches, so only the launcher's own copies stay there - any
/// other DLL (of an old package of ours, or a file changed by hand) is put aside like the old copies (kept in the version cache
/// folder, never deleted). -> what moved
pub(crate) fn put_aside_foreign_vanilla(dir: &std::path::Path) -> Vec<String> {
    let ours = vanilla_owned(dir);
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let bin = update::Game::new(dir).cache_dir().join(format!("old-addons-{stamp}")).join(update::VANILLA_DIR);
    let mut moved = Vec::new();
    let Ok(rd) = std::fs::read_dir(dir.join(update::VANILLA_DIR)) else { return moved };
    for e in rd.flatten() {
        let n = e.file_name().to_string_lossy().to_string();
        let rel = format!("{}/{n}", update::VANILLA_DIR);
        if !e.path().is_file() || !n.to_ascii_lowercase().ends_with(".dll") || ours.contains(&rel.to_ascii_lowercase()) { continue; }
        let _ = std::fs::create_dir_all(&bin);
        if std::fs::rename(e.path(), bin.join(&n)).is_ok() { moved.push(rel); }
    }
    moved
}

/// Vanilla copies that must not be there: of an add-on that is off, not for `game` (vanilla, or a mod's since 1.6.5), or gone
/// from the catalog. -> what went
pub(crate) fn drop_vanilla_extra(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings, game: &str) -> Vec<String> {
    let mut gone = Vec::new();
    for id in update::Game::vanilla_ids(dir) {
        let keep = cfg.components.iter().find(|c| update::component_key(&c.id) == id)
            .is_some_and(|c| c.for_game(game) && comp_on(dir, c, s));
        if keep { continue; }
        let v = update::Game::vanilla_component(dir, &id);
        if let Ok(removed) = v.uninstall_keeping(|_| false) { gone.extend(removed.iter().map(|p| v.rel_path(p))); }
    }
    gone
}

/// The options of the vanilla copies: the same ini names, in dow2-patches (only options of the add-on's Elite_DLLs ini).
/// 1.6.5: of every copy there (vanilla's or a mod version's - the folder holds one game's at a time).
pub(crate) fn apply_vanilla_options(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings) {
    for c in &cfg.components {
        let v = update::Game::vanilla_component(dir, &c.id);
        if v.load_state().version.is_empty() { continue; }
        for o in c.opts() {
            if o.ini.contains("..") || !o.ini.get(..11).is_some_and(|h| h.eq_ignore_ascii_case("Elite_DLLs/")) { continue; }
            let k = format!("{}.{}", c.id, o.id);
            let on = s.comp_options.get(&k).copied().unwrap_or(o.default);
            let _ = elite::set_ini_value(&v.file(&o.ini), &o.section, &o.key, &o.ini_value(on, s.comp_values.get(&k)));
        }
    }
}

/// The vanilla game's add-ons and loader as the ticks and the catalog want them. Never touches Elite's files.
/// 1.6.5: `game` "vanilla", or a mod version's game ("igrework") - its add-ons the same way (copies in dow2-patches + loader).
pub(crate) fn sync_vanilla(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings, m: &Mirrors, progress: &mut dyn FnMut(&update::Progress), load: LoadManifest, game: &str) -> Result<(), update::Error> {
    put_aside_old_copies(dir, cfg);      // hand copies in dow2-patches, the stand-alone loader: one copy of every patch
    drop_vanilla_leftovers(dir, cfg);
    drop_vanilla_extra(dir, cfg, s, game);
    put_aside_foreign_vanilla(dir);
    let opts = |id: &str| update::Options { verify_all: false, cache_limit: s.cache_mb.unwrap_or(DEFAULT_CACHE_MB) << 20, channel: id.to_string() };
    for c in cfg.components.iter().filter(|c| c.for_game(game) && comp_on(dir, c, s)) {
        let g = update::Game::component(dir, &c.id);
        let v = update::Game::vanilla_component(dir, &c.id);
        let man = update::vanilla_files(&load(&g, &c.version)?);
        if man.files.is_empty() { if !v.load_state().version.is_empty() { v.uninstall()?; } continue; }
        // the same files Elite's copy already has: from the disk, not the network
        let est = g.load_state();
        for f in &man.files {
            let h = elite_core::cdc::hex(&f.sha);
            if est.files.iter().any(|x| x.path == f.path && x.sha == h) { v.seed_cache(&g.file(&f.path), &h); }
        }
        update::apply(&v, m, &man, &opts(&c.id), progress)?;
    }
    if let Some(ver) = cfg.vanilla_loader() {
        let l = update::Game::vanilla_loader(dir);
        let man = load(&l, ver)?;
        update::apply(&l, m, &man, &opts("vanilla"), progress)?;
    }
    apply_vanilla_options(dir, cfg, s);
    Ok(())
}

/// Does the game folder differ from what the chosen game wants (Play syncs first then)? Vanilla: the loader or a vanilla copy
/// missing, old or extra. Elite: the vanilla loader still next to DOW2.exe.
pub(crate) fn mode_sync_needed(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings) -> bool {
    if os_name() == "macos" { return false; }   // the same files for both games there; the start picks the dylibs
    let l = update::Game::vanilla_loader(dir);
    let Some(game) = copies_game(dir, cfg, s) else { return l.file_is_installed("winmm.dll") };   // 1.6.5: or a mod version's
    if cfg.vanilla_loader() != Some(l.load_state().version.as_str()) || !l.file_is_installed("winmm.dll") { return true; }
    let s = &effective_settings(dir, cfg, s);
    let want: std::collections::HashMap<String, &str> = cfg.components.iter().filter(|c| c.for_game(&game) && comp_on(dir, c, s))
        .map(|c| (update::component_key(&c.id), c.version.as_str())).collect();
    let have = update::Game::vanilla_ids(dir);
    if have.iter().any(|id| !want.contains_key(id)) { return true; }
    want.iter().any(|(id, ver)| {
        let v = update::Game::vanilla_component(dir, id);
        let st = v.load_state();
        st.version != *ver || v.intact_files().len() != st.files.len()
    })
}

/// Pick the game Play starts: "vanilla" or Elite (anything else). The window syncs the add-ons for it right after.
#[tauri::command]
pub fn set_game_mode(app: State<'_, App>, mode: String) -> Result<Value, String> {
    ensure_game_closed(&app)?;
    if app.busy.load(Ordering::Relaxed) { return Err("files are being updated, wait a few seconds".into()); }
    {
        let mut s = app.settings.lock().unwrap();
        s.game_mode = if mode == "vanilla" { "vanilla".into() } else { String::new() };
        save_settings(&s);
    }
    c_log(&format!("game: {}", if mode == "vanilla" { "vanilla" } else { "elite" }));
    Ok(get_status(app))
}

#[cfg(test)]
mod vanilla_tests {
    use super::*;
    use elite_core::manifest::{FileEntry, Manifest};
    use std::collections::BTreeMap;

    const EARLY: &[u8] = b"MZ early loader of Automatch (only OwnLobby)";
    const LOADER: &[u8] = b"MZ launcher loader (by -modname)";

    // a manifest of in-memory files, their blobs put into the version cache (no network: every file comes from there)
    fn man(dir: &std::path::Path, version: &str, files: &[(&str, &[u8])]) -> Manifest {
        let cache = dir.join(".elite_cache");
        std::fs::create_dir_all(&cache).unwrap();
        Manifest { version: version.into(), files: files.iter().map(|(p, b)| {
            let (chunks, sha, size) = elite_core::cdc::scan(*b).unwrap();
            std::fs::write(cache.join(elite_core::cdc::hex(&sha)), b).unwrap();
            FileEntry { path: p.to_string(), size, sha, chunks }
        }).collect() }
    }
    fn snap(d: &std::path::Path) -> BTreeMap<String, (Vec<u8>, std::time::SystemTime)> {
        std::fs::read_dir(d).unwrap().flatten().filter(|e| e.path().is_file())
            .map(|e| (e.file_name().to_string_lossy().to_string(), (std::fs::read(e.path()).unwrap(), e.metadata().unwrap().modified().unwrap()))).collect()
    }

    #[test]
    fn mac_addons_sync() {
        use elite_core::macos;
        let root = std::env::temp_dir().join(format!("mac_addons_sync_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let addons = macos::addons_dir(&root);
        let mut mans: std::collections::HashMap<String, Manifest> = Default::default();
        for (id, ver, f, b) in [("crossplay_mac", "crossplay_mac-26", "crossplay_fix.dylib", &b"cp"[..]), ("chat_mac", "chat_mac-1", "ChatHide.dylib", b"ch")] {
            let m = man(&macos::addon_dir(&addons, id), ver, &[(f, b), ("README.txt", b"r")]);
            mans.insert(m.version.clone(), m);
        }
        let load = |_: &update::Game, v: &str| mans.get(v).cloned().ok_or_else(|| update::Error::Bad(format!("no {v}")));
        let raw = r#"{"components":[{"id":"automatch","version":"mmfind-0.49","default":true}],"vanilla":{"loader":"vloader-1"},
            "components_macos":[{"id":"crossplay_mac","version":"crossplay_mac-26","required":true,"games":["elite","vanilla"]},
                                {"id":"chat_mac","version":"chat_mac-1","default":true}]}"#;
        let cfg = serde_json::from_str::<LauncherConfig>(raw).unwrap().for_os("macos");
        let (m, mut nop) = (Mirrors::new(vec![]), |_: &update::Progress| {});
        let mut s = Settings::default();
        s.components.insert("crossplay_mac".into(), false);   // required: a stale "off" changes nothing
        // a folder of an add-on gone from the catalog, installed by an older catalog
        let old = macos::addon_dir(&addons, "gone_mac");
        let om = man(&old, "gone-1", &[("Gone.dylib", b"g")]);
        update::apply(&update::Game::component(&old, "gone_mac"), &m, &om, &update::Options { verify_all: false, cache_limit: 1 << 30, channel: "x".into() }, &mut nop).unwrap();
        sync_mac_addons(&addons, &cfg, &s, &m, &mut nop, &load, false).unwrap();
        let cp = macos::addon_dir(&addons, "crossplay_mac").join("crossplay_fix.dylib");
        assert!(cp.is_file() && macos::addon_dir(&addons, "chat_mac").join("ChatHide.dylib").is_file() && !old.join("Gone.dylib").exists());
        assert_eq!(mac_on_ids(&cfg, &s, false), ["crossplay_mac", "chat_mac"]);
        assert_eq!(mac_on_ids(&cfg, &s, true), ["crossplay_mac"]);   // chat_mac is for Elite only
        assert_eq!(macos::dylibs_of(&addons, &mac_on_ids(&cfg, &s, true)), std::slice::from_ref(&cp));
        // the signature changed the file: the next sync puts the published one back from the cache (and signs it again)
        std::fs::write(&cp, b"cp signed").unwrap();
        sync_mac_addons(&addons, &cfg, &s, &m, &mut nop, &load, false).unwrap();
        assert_eq!(std::fs::read(&cp).unwrap(), b"cp");
        s.components.insert("chat_mac".into(), false);
        sync_mac_addons(&addons, &cfg, &s, &m, &mut nop, &load, false).unwrap();
        assert!(!macos::addon_dir(&addons, "chat_mac").join("ChatHide.dylib").exists() && cp.is_file());
        assert!(cfg.components.iter().all(|c| c.id != "automatch"), "Windows/Linux add-ons are not offered on a Mac");
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn a_mod_version_gets_its_addons_as_copies() {
        // 1.6.5: IG Rework (channel "game": "igrework") - the add-ons for its game as copies in dow2-patches + the loader, none of
        // our DLLs in IgRework.launchconfig (IgRework.exe does not start the game when a name there is not in IgRework_DLLs)
        if os_name() == "macos" { return; }
        let d = std::env::temp_dir().join(format!("mod_version_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        std::fs::write(d.join("DOW2.exe"), b"game").unwrap();
        const IG_LC: &[u8] = b"IsRetribution=true\r\nInjectedFiles=CullspherePatch.dll, MiscFixes.dll\r\n";
        let mut mans: std::collections::HashMap<String, Manifest> = Default::default();
        for m in [
            man(&d, "igrework-4", &[("Elite_DLLs/MiscFixes.dll", b"elite's own"), ("Elite.launchconfig", b"IsRetribution=true\nInjectedFiles=MiscFixes.dll\n"),
                ("IgRework_DLLs/CullspherePatch.dll", b"ig cull"), ("IgRework_DLLs/MiscFixes.dll", b"ig misc"), ("IgRework.launchconfig", IG_LC), ("IgRework.exe", b"ig exe")]),
            man(&d, "mmfind-0.50", &[("Elite_DLLs/MMFind.dll", b"mmfind"), ("Elite_DLLs/OwnLobby.dll", b"ownlobby"), ("winmm.dll", EARLY)]),
            man(&d, "matchtimer-8", &[("Elite_DLLs/MatchTimer.dll", b"timer")]),
            man(&d, "shellfix-1", &[("Elite_DLLs/ShellFix.dll", b"shell")]),
            man(&d, "vloader-2", &[("winmm.dll", LOADER)]),
        ] { mans.insert(m.version.clone(), m); }
        let load = |_: &update::Game, v: &str| mans.get(v).cloned().ok_or_else(|| update::Error::Bad(format!("no {v}")));
        let comp = |id: &str, ver: &str, dll: &str, def: bool, games: &[&str]| elite_core::config::Component {
            id: id.into(), version: ver.into(), inject: dll.into(), default: def, games: games.iter().map(|g| g.to_string()).collect(), ..Default::default() };
        let mut cfg: LauncherConfig = serde_json::from_str(r#"{"channels": [{"id": "stable", "version": "stable-1", "default": true},
            {"id": "igrework", "version": "igrework-4", "exe": "IgRework.exe", "addons": false, "game": "igrework"}],
            "vanilla": {"loader": "vloader-2"}}"#).unwrap();
        let mut mt = comp("matchtimer_r2", "matchtimer-8", "MatchTimer.dll", true, &["elite", "vanilla", "igrework"]);
        mt.options = vec![serde_json::from_str(r#"{"id":"style","ini":"Elite_DLLs/MatchTimer.ini","section":"MatchTimer","key":"Style","default":true}"#).unwrap()];
        cfg.components = vec![comp("automatch", "mmfind-0.50", "MMFind.dll", true, &["elite", "vanilla"]), mt,
                              comp("shellfix", "shellfix-1", "ShellFix.dll", true, &["elite"])];
        let (m, mut nop) = (Mirrors::new(vec![]), |_: &update::Progress| {});
        let s = Settings::default();
        update::apply(&update::Game::new(&d), &m, &mans["igrework-4"], &update::Options { verify_all: false, cache_limit: 1 << 30, channel: "igrework".into() }, &mut nop).unwrap();
        let ex = |f: &str| d.join(f).is_file();
        let read = |f: &str| std::fs::read(d.join(f)).unwrap_or_default();
        // what launchers up to 1.6.3 left: the add-ons in Elite_DLLs and their names in every launch config
        for v in ["mmfind-0.50", "matchtimer-8"] {
            let id = if v.starts_with("mmfind") { "automatch" } else { "matchtimer_r2" };
            update::apply(&update::Game::component(&d, id), &m, &mans[v], &update::Options { verify_all: false, cache_limit: 1 << 30, channel: id.into() }, &mut nop).unwrap();
        }
        std::fs::write(d.join("IgRework.launchconfig"), "IsRetribution=true\r\nInjectedFiles=CullspherePatch.dll, MiscFixes.dll, MMFind.dll, MatchTimer.dll\r\n").unwrap();

        assert_eq!(mod_game(&d, &cfg).as_deref(), Some("igrework"));
        assert!(!channel_blocks(&cfg, "igrework") && !addons_blocked(&d, &cfg, &s));
        let e = effective_settings(&d, &cfg, &s);
        let on: Vec<&str> = cfg.components.iter().filter(|c| comp_on(&d, c, &e)).map(|c| c.id.as_str()).collect();
        assert_eq!(on, ["matchtimer_r2"], "only the add-ons made for IG Rework");
        assert!(mode_sync_needed(&d, &cfg, &s), "no loader yet");
        sync_components_with(&d, &cfg, &s, &m, &mut nop, &load).unwrap();
        assert_eq!(read("winmm.dll"), LOADER, "the launcher's loader, not Automatch's early one");
        assert_eq!(read("dow2-patches/MatchTimer.dll"), b"timer");
        assert!(!ex("dow2-patches/MMFind.dll") && !ex("dow2-patches/OwnLobby.dll") && !ex("dow2-patches/ShellFix.dll"));
        assert_eq!(read("IgRework.launchconfig"), IG_LC, "grantovich's launch config as he made it");
        assert!(String::from_utf8(read("dow2-patches/MatchTimer.ini")).unwrap().contains("Style=1"));
        assert!(!mode_sync_needed(&d, &cfg, &s));
        // Play: the mod's checks, nothing put back into its launch config
        std::fs::write(d.join("IgRework.launchconfig"), "IsRetribution=true\r\nInjectedFiles=CullspherePatch.dll, MiscFixes.dll, MatchTimer.dll\r\n").unwrap();
        let p = prepare_start(&d, &cfg, &s);
        assert_eq!(p["game"], "igrework");
        assert_eq!(p["vanilla"], false, "IgRework.exe starts it, not DOW2.exe");
        assert_eq!(read("IgRework.launchconfig"), IG_LC, "{p}");
        assert!(ex("dow2-patches/MatchTimer.dll") && read("winmm.dll") == LOADER);
        // no loader in the catalog (or a Mac): the version takes no add-ons, as with "addons": false
        cfg.vanilla = None;
        assert!(channel_blocks(&cfg, "igrework") && copies_game(&d, &cfg, &s).is_none());
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn vanilla_and_elite_back_and_forth() {
        if os_name() == "macos" { return; }   // the Mac's add-ons are dylibs in mac_addons: mac_addons_sync
        let d = std::env::temp_dir().join(format!("vanilla_mode_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(d.join("Elite_DLLs")).unwrap();
        std::fs::write(d.join("DOW2.exe"), b"game").unwrap();
        std::fs::write(d.join("Elite.launchconfig"), "IsRetribution=true\nInjectedFiles=MiscFixes.dll\n").unwrap();
        let mut mans: std::collections::HashMap<String, Manifest> = Default::default();
        for m in [
            man(&d, "elite-3.2", &[("Elite_DLLs/MiscFixes.dll", b"elite's own"), ("Elite.launchconfig", b"IsRetribution=true\nInjectedFiles=MiscFixes.dll\n")]),
            man(&d, "mmfind-0.45", &[("Elite_DLLs/MMFind.dll", b"mmfind"), ("Elite_DLLs/OwnLobby.dll", b"ownlobby"), ("winmm.dll", EARLY)]),
            man(&d, "relay-22", &[("Elite_DLLs/Relay.dll", b"relay")]),
            man(&d, "matchtimer-8", &[("Elite_DLLs/MatchTimer.dll", b"timer")]),
            man(&d, "shellfix-1", &[("Elite_DLLs/ShellFix.dll", b"shell")]),
            man(&d, "vloader-1", &[("winmm.dll", LOADER)]),
        ] { mans.insert(m.version.clone(), m); }
        let load = |_: &update::Game, v: &str| mans.get(v).cloned().ok_or_else(|| update::Error::Bad(format!("no {v}")));
        let comp = |id: &str, ver: &str, dll: &str, def: bool, games: &[&str]| elite_core::config::Component {
            id: id.into(), version: ver.into(), inject: dll.into(), default: def, games: games.iter().map(|g| g.to_string()).collect(), ..Default::default() };
        let mut cfg = LauncherConfig::default();
        let mut mt = comp("matchtimer_r2", "matchtimer-8", "MatchTimer.dll", false, &["elite", "vanilla"]);
        mt.options = vec![serde_json::from_str(r#"{"id":"style","ini":"Elite_DLLs/MatchTimer.ini","section":"MatchTimer","key":"Style","default":true}"#).unwrap()];
        cfg.components = vec![comp("automatch", "mmfind-0.45", "MMFind.dll", true, &["elite", "vanilla"]), comp("relay_r2", "relay-22", "Relay.dll", true, &[]),
                              mt, comp("shellfix", "shellfix-1", "ShellFix.dll", true, &["elite"])];
        cfg.vanilla = Some(elite_core::config::Vanilla { loader: "vloader-1".into(), ..Default::default() });
        let m = Mirrors::new(vec![]);
        let mut s = Settings::default();
        s.components.insert("matchtimer_r2".into(), true);
        let mut nop = |_: &update::Progress| {};
        let opt = update::Options { verify_all: false, cache_limit: 1 << 30, channel: "main".into() };
        update::apply(&update::Game::new(&d), &m, &mans["elite-3.2"], &opt, &mut nop).unwrap();
        let ex = |f: &str| d.join(f).is_file();
        let read = |f: &str| std::fs::read(d.join(f)).unwrap_or_default();

        // Elite as before: the add-ons in Elite_DLLs, Automatch's early loader next to DOW2.exe, nothing in dow2-patches
        sync_components_with(&d, &cfg, &s, &m, &mut nop, &load).unwrap();
        assert_eq!(read("winmm.dll"), EARLY);
        assert!(ex("Elite_DLLs/MMFind.dll") && ex("Elite_DLLs/Relay.dll") && ex("Elite_DLLs/ShellFix.dll") && ex("Elite_DLLs/MatchTimer.dll"));
        assert!(!d.join("dow2-patches").exists());
        assert!(!mode_sync_needed(&d, &cfg, &s));
        let elite_before = snap(&d.join("Elite_DLLs"));
        let lc_before = read("Elite.launchconfig");

        // -> vanilla: copies of the vanilla add-ons that are on, the launcher's loader; Elite's files not touched at all
        s.game_mode = "vanilla".into();
        assert!(vanilla_on(&cfg, &s));
        if os_name() == "macos" { let _ = std::fs::remove_dir_all(&d); return; }
        assert!(mode_sync_needed(&d, &cfg, &s));
        sync_components_with(&d, &cfg, &s, &m, &mut nop, &load).unwrap();
        assert_eq!(read("winmm.dll"), LOADER);
        assert_eq!(read("dow2-patches/MMFind.dll"), b"mmfind");
        assert_eq!(read("dow2-patches/OwnLobby.dll"), b"ownlobby");
        assert_eq!(read("dow2-patches/MatchTimer.dll"), b"timer");
        assert!(String::from_utf8(read("dow2-patches/MatchTimer.ini")).unwrap().contains("Style=1"), "the option next to its DLL");
        assert!(!ex("dow2-patches/Relay.dll") && !ex("dow2-patches/ShellFix.dll") && !ex("dow2-patches/winmm.dll"), "Elite only: never copied");
        assert_eq!(snap(&d.join("Elite_DLLs")), elite_before, "Elite_DLLs untouched");
        assert_eq!(read("Elite.launchconfig"), lc_before);
        assert!(!mode_sync_needed(&d, &cfg, &s));
        assert!(old_copies(&d, &cfg).is_empty(), "the launcher's copies are no hand copies");
        assert!(cfg.components.iter().all(|c| found_conflicts(&d, c).is_empty()));
        assert!(put_aside_old_copies(&d, &cfg).is_empty() && ex("winmm.dll") && ex("dow2-patches/MMFind.dll"));
        assert!(drop_vanilla_extra(&d, &cfg, &s, "vanilla").is_empty());

        // a tick off in vanilla: its copy goes, its Elite copy stays
        s.components.insert("matchtimer_r2".into(), false);
        assert!(mode_sync_needed(&d, &cfg, &s));
        sync_components_with(&d, &cfg, &s, &m, &mut nop, &load).unwrap();
        assert!(!ex("dow2-patches/MatchTimer.dll") && ex("Elite_DLLs/MatchTimer.dll"));
        s.components.insert("matchtimer_r2".into(), true);
        sync_components_with(&d, &cfg, &s, &m, &mut nop, &load).unwrap();

        // -> Elite: the vanilla loader goes, Automatch's early one is back; the vanilla copies wait in dow2-patches
        s.game_mode = String::new();
        assert!(mode_sync_needed(&d, &cfg, &s), "the vanilla loader is still next to DOW2.exe");
        sync_components_with(&d, &cfg, &s, &m, &mut nop, &load).unwrap();
        assert_eq!(read("winmm.dll"), EARLY);
        assert!(!mode_sync_needed(&d, &cfg, &s));
        assert!(ex("dow2-patches/MMFind.dll") && old_copies(&d, &cfg).is_empty());

        // the start of Elite right after vanilla without a sync (the window's own sync skipped): no network needed
        s.game_mode = "vanilla".into();
        sync_components_with(&d, &cfg, &s, &m, &mut nop, &load).unwrap();
        assert_eq!(read("winmm.dll"), LOADER);
        s.game_mode = String::new();
        assert!(hide_vanilla_loader(&d));
        assert_eq!(restore_root_files(&d, &cfg, &s), vec!["winmm.dll".to_string()]);
        assert_eq!(read("winmm.dll"), EARLY);
        assert!(!hide_vanilla_loader(&d), "Automatch's own loader is not the vanilla one");

        // Automatch off in Elite: no winmm.dll at all, also after vanilla
        s.game_mode = "vanilla".into();
        sync_components_with(&d, &cfg, &s, &m, &mut nop, &load).unwrap();
        s.game_mode = String::new();
        s.components.insert("automatch".into(), false);
        sync_components_with(&d, &cfg, &s, &m, &mut nop, &load).unwrap();
        assert!(!ex("winmm.dll") && !ex("Elite_DLLs/MMFind.dll"));
        s.components.insert("automatch".into(), true);
        sync_components_with(&d, &cfg, &s, &m, &mut nop, &load).unwrap();
        assert_eq!(read("winmm.dll"), EARLY);

        // a hand copy in dow2-patches (a DLL changed by hand, the stand-alone loader): put aside, the launcher's copy back
        s.game_mode = "vanilla".into();
        std::fs::write(d.join("dow2-patches/MatchTimer.dll"), b"timer v1 by hand").unwrap();
        std::fs::write(d.join("dow2-patches/Relay.dll"), b"relay by hand").unwrap();
        assert!(old_copies(&d, &cfg).contains(&"dow2-patches/MatchTimer.dll".to_string()));
        sync_components_with(&d, &cfg, &s, &m, &mut nop, &load).unwrap();
        assert_eq!(read("dow2-patches/MatchTimer.dll"), b"timer");
        assert!(!ex("dow2-patches/Relay.dll"), "a hand copy of an Elite-only add-on goes too");
        std::fs::write(d.join("dow2-patches/MMClient.dll"), b"an old experiment").unwrap();
        std::fs::write(d.join("dow2-patches/MMClient.ini"), b"[x]").unwrap();
        assert_eq!(prepare_start(&d, &cfg, &s)["off"], json!(["dow2-patches/MMClient.dll"]), "only the launcher's DLLs are loaded in vanilla");
        assert!(ex("dow2-patches/MMClient.ini") && ex("dow2-patches/MMFind.dll") && ex("winmm.dll"));
        s.game_mode = String::new();
        sync_components_with(&d, &cfg, &s, &m, &mut nop, &load).unwrap();
        let wide: Vec<u8> = "dow2-patches".encode_utf16().flat_map(|u| u.to_le_bytes()).collect();
        std::fs::write(d.join("winmm.dll"), [b"MZ full".as_slice(), &wide].concat()).unwrap();   // the stand-alone package's loader
        assert!(is_patches_loader_file(&d, "winmm.dll"));
        put_aside_old_copies(&d, &cfg);
        assert!(!ex("winmm.dll"), "with the launcher's copies there it would load them into Elite");

        // the catalog takes an add-on off vanilla: its copy goes
        s.game_mode = "vanilla".into();
        cfg.components[2].games = vec!["elite".into()];
        assert!(mode_sync_needed(&d, &cfg, &s));
        sync_components_with(&d, &cfg, &s, &m, &mut nop, &load).unwrap();
        assert!(!ex("dow2-patches/MatchTimer.dll") && ex("dow2-patches/MMFind.dll") && ex("Elite_DLLs/MatchTimer.dll"));
        assert!(!mode_sync_needed(&d, &cfg, &s));
        let _ = std::fs::remove_dir_all(&d);
    }

    /// Owner 05.11.2026: the tick relay_r2 ("Games through our servers", Elite_DLLs/Relay.dll) leaves the catalog and Relay.dll
    /// becomes a file of Automatch (mmfind-0.46: MMFind.dll loads it itself, it is in nobody's InjectedFiles). Whatever the
    /// player had and in whichever order the launcher gets there (the start checks without the network first, or a sync), he
    /// ends with exactly one Relay.dll - Automatch's new one -, nothing of relay_r2 is left and nothing removes that file later.
    #[test]
    fn relay_moves_into_automatch() {
        fn files(d: &std::path::Path, dir: &str, pre: &str) -> Vec<String> {
            let mut v: Vec<String> = std::fs::read_dir(d.join(dir)).map(|rd| rd.flatten().map(|e| e.file_name().to_string_lossy().to_string())
                .filter(|n| n.to_ascii_lowercase().starts_with(pre)).collect()).unwrap_or_default();
            v.sort(); v
        }
        // (relay_r2 tick, the start checks before the first sync, RelayForward on)
        for (n, (r2_on, start_first, fwd_on)) in [(true, false, false), (true, true, false), (false, false, false), (true, false, true), (true, true, true)].into_iter().enumerate() {
            let d = std::env::temp_dir().join(format!("relay_into_am_{}_{n}", std::process::id()));
            let _ = std::fs::remove_dir_all(&d);
            std::fs::create_dir_all(d.join("Elite_DLLs")).unwrap();
            std::fs::write(d.join("DOW2.exe"), b"game").unwrap();
            let lc0 = "IsRetribution=true\nInjectedFiles=MiscFixes.dll\n";
            std::fs::write(d.join("Elite.launchconfig"), lc0).unwrap();
            let mut mans: std::collections::HashMap<String, Manifest> = Default::default();
            for m in [
                man(&d, "elite-3.2", &[("Elite_DLLs/MiscFixes.dll", b"elite's own"), ("Elite.launchconfig", lc0.as_bytes())]),
                man(&d, "mmfind-0.45", &[("Elite_DLLs/MMFind.dll", b"mmfind 0.45"), ("Elite_DLLs/OwnLobby.dll", b"ownlobby"), ("winmm.dll", EARLY)]),
                man(&d, "mmfind-0.46", &[("Elite_DLLs/MMFind.dll", b"mmfind 0.46"), ("Elite_DLLs/OwnLobby.dll", b"ownlobby"), ("Elite_DLLs/Relay.dll", b"relay 23"), ("winmm.dll", EARLY)]),
                man(&d, "relay-22", &[("Elite_DLLs/Relay.dll", b"relay 22")]),
                man(&d, "relayfwd-22", &[("Elite_DLLs/RelayForward.dll", b"fwd 22")]),
                man(&d, "relayfwd-23", &[("Elite_DLLs/RelayForward.dll", b"fwd 23")]),
                man(&d, "vloader-1", &[("winmm.dll", LOADER)]),
            ] { mans.insert(m.version.clone(), m); }
            let load = |_: &update::Game, v: &str| mans.get(v).cloned().ok_or_else(|| update::Error::Bad(format!("no {v}")));
            let comp = |id: &str, ver: &str, dll: &str, def: bool, games: &[&str]| elite_core::config::Component {
                id: id.into(), version: ver.into(), inject: dll.into(), default: def, games: games.iter().map(|g| g.to_string()).collect(), ..Default::default() };
            let mut old = LauncherConfig::default();
            let mut am = comp("automatch", "mmfind-0.45", "MMFind.dll", true, &["elite", "vanilla"]);
            am.conflicts = vec!["dow2-patches/MMFind.dll".into()];
            old.components = vec![comp("relay_r2", "relay-22", "Relay.dll", true, &["elite"]), comp("relay_fwd", "relayfwd-22", "RelayForward.dll", false, &["elite", "vanilla"]), am.clone()];
            old.vanilla = Some(elite_core::config::Vanilla { loader: "vloader-1".into(), ..Default::default() });
            let mut new = old.clone();
            am.version = "mmfind-0.46".into();
            am.conflicts.push("dow2-patches/Relay.dll".into());
            new.components = vec![comp("relay_fwd", "relayfwd-23", "RelayForward.dll", false, &["elite", "vanilla"]), am];
            let m = Mirrors::new(vec![]);
            let mut s = Settings::default();
            s.components.insert("relay_r2".into(), r2_on);
            s.components.insert("relay_fwd".into(), fwd_on);
            let mut nop = |_: &update::Progress| {};
            let opt = update::Options { verify_all: false, cache_limit: 1 << 30, channel: "main".into() };
            update::apply(&update::Game::new(&d), &m, &mans["elite-3.2"], &opt, &mut nop).unwrap();
            let read = |f: &str| std::fs::read(d.join(f)).unwrap_or_default();
            let lc = || std::fs::read_to_string(d.join("Elite.launchconfig")).unwrap();
            let injected = |dll: &str| lc().lines().filter_map(|l| l.strip_prefix("InjectedFiles=")).any(|r| r.split(',').any(|x| x.trim().eq_ignore_ascii_case(dll)));

            // before: the old catalog as the players have it now
            sync_components_with(&d, &old, &s, &m, &mut nop, &load).unwrap();
            prepare_start(&d, &old, &s);
            assert_eq!(read("Elite_DLLs/Relay.dll"), if r2_on { b"relay 22".to_vec() } else { vec![] }, "case {n}");
            assert_eq!(injected("Relay.dll"), r2_on, "case {n}: {}", lc());

            // the new catalog
            if start_first {
                // Play right away, the start checks run on the new catalog before any sync: relay_r2's DLL goes for now
                prepare_start(&d, &new, &s);
                assert!(read("Elite_DLLs/Relay.dll").is_empty(), "case {n}");
            }
            sync_components_with(&d, &new, &s, &m, &mut nop, &load).unwrap();
            for round in 0..2 {
                prepare_start(&d, &new, &s);
                assert_eq!(files(&d, "Elite_DLLs", "relay."), vec!["Relay.dll".to_string()], "case {n}/{round}: one Relay.dll, no leftovers");
                assert_eq!(read("Elite_DLLs/Relay.dll"), b"relay 23", "case {n}/{round}: Automatch's Relay.dll");
                assert_eq!(read("Elite_DLLs/MMFind.dll"), b"mmfind 0.46");
                assert_eq!(read("winmm.dll"), EARLY);
                assert!(injected("MMFind.dll") && !injected("Relay.dll"), "case {n}: not injected by Elite - MMFind loads it: {}", lc());
                assert_eq!(injected("RelayForward.dll"), fwd_on, "case {n}: {}", lc());
                assert_eq!(read("Elite_DLLs/RelayForward.dll"), if fwd_on { b"fwd 23".to_vec() } else { vec![] }, "case {n}");
                assert!(!update::Game::component_ids(&d).contains(&"relay_r2".to_string()), "case {n}: relay_r2 forgotten");
                assert!(update::Game::component(&d, "automatch").load_state().files.iter().any(|f| f.path == "Elite_DLLs/Relay.dll"), "case {n}: owned by Automatch");
                if round == 0 { sync_components_with(&d, &new, &s, &m, &mut nop, &load).unwrap(); }   // the next refresh changes nothing
            }

            if os_name() != "macos" {
                // vanilla: Automatch's copy brings Relay.dll into dow2-patches; Elite's files stay
                s.game_mode = "vanilla".into();
                sync_components_with(&d, &new, &s, &m, &mut nop, &load).unwrap();
                let off = prepare_start(&d, &new, &s)["off"].clone();
                assert_eq!(off, json!([]), "case {n}: nothing of ours put aside in vanilla");
                assert_eq!(read("dow2-patches/Relay.dll"), b"relay 23", "case {n}");
                assert_eq!(read("dow2-patches/MMFind.dll"), b"mmfind 0.46");
                assert_eq!(read("winmm.dll"), LOADER);
                assert_eq!(read("Elite_DLLs/Relay.dll"), b"relay 23");
                assert_eq!(files(&d, "dow2-patches", "relay"), if fwd_on { vec!["Relay.dll".to_string(), "RelayForward.dll".to_string()] } else { vec!["Relay.dll".to_string()] }, "case {n}");
                // back to Elite: the vanilla copy waits in dow2-patches (the vanilla loader is not there), Elite's Relay.dll in place
                s.game_mode = String::new();
                sync_components_with(&d, &new, &s, &m, &mut nop, &load).unwrap();
                assert!(prepare_start(&d, &new, &s)["off"].as_array().unwrap().is_empty(), "case {n}: the launcher's vanilla copy is no hand copy");
                assert_eq!(read("Elite_DLLs/Relay.dll"), b"relay 23");
                assert_eq!(read("dow2-patches/Relay.dll"), b"relay 23");
                assert_eq!(read("winmm.dll"), EARLY);
            }

            // a hand copy of Relay.dll in dow2-patches in Elite (an old stand-alone package): put aside like MMFind's
            std::fs::remove_dir_all(d.join("dow2-patches")).ok();
            for id in update::Game::vanilla_ids(&d) { let _ = update::Game::vanilla_component(&d, &id).uninstall(); }
            std::fs::create_dir_all(d.join("dow2-patches")).unwrap();
            std::fs::write(d.join("dow2-patches/Relay.dll"), b"relay 9 by hand").unwrap();
            let off = prepare_start(&d, &new, &s)["off"].clone();
            assert!(off.as_array().unwrap().iter().any(|x| x == "dow2-patches/Relay.dll"), "case {n}: {off}");
            assert_eq!(read("Elite_DLLs/Relay.dll"), b"relay 23");

            // Automatch off: its Relay.dll goes with it, nothing listed
            s.components.insert("automatch".into(), false);
            sync_components_with(&d, &new, &s, &m, &mut nop, &load).unwrap();
            prepare_start(&d, &new, &s);
            assert!(files(&d, "Elite_DLLs", "relay.").is_empty() && !d.join("Elite_DLLs/MMFind.dll").exists() && !d.join("winmm.dll").exists(), "case {n}");
            assert!(!injected("MMFind.dll") && !injected("Relay.dll"), "case {n}: {}", lc());
            let _ = std::fs::remove_dir_all(&d);
        }
    }

    /// On a real game folder with a real (staging) store, as the window does it: the add-ons' sync for the chosen game, then
    /// the checks of the start. For the stand (Wine): VT_GAME=<game folder> VT_MIRROR=<store URL> VT_MODE=vanilla|elite
    /// [VT_TICKS=id=1,id=0] cargo test ... stand_sync -- --ignored --nocapture. The game is started by hand after it.
    #[test]
    #[ignore]
    fn stand_sync() {
        let env = |k: &str| std::env::var(k).unwrap_or_default();
        let dir = std::path::PathBuf::from(env("VT_GAME"));
        assert!(dir.join("DOW2.exe").is_file(), "VT_GAME");
        let m = Mirrors::new(vec![env("VT_MIRROR")]);
        let (cfg, _, _) = update::fetch_config(&m).expect("launcher.json from VT_MIRROR");
        let mut s = Settings::default();
        s.game_mode = if env("VT_MODE") == "vanilla" { "vanilla".into() } else { String::new() };
        for kv in env("VT_TICKS").split(',').filter(|x| !x.is_empty()) {
            if let Some((k, v)) = kv.split_once('=') { s.components.insert(k.into(), v == "1"); }
        }
        println!("mode {} (offered {}), sync needed before: {}", if vanilla_on(&cfg, &s) { "vanilla" } else { "elite" }, vanilla_offered(&cfg), mode_sync_needed(&dir, &cfg, &s));
        let mut last = String::new();
        sync_components(&dir, &cfg, &s, &m, &mut |p| { if p.phase == "downloading" && p.file != last { println!("  get {}", p.file); last = p.file.clone(); } }).expect("sync");
        let guard = prepare_start(&dir, &cfg, &s);
        println!("start checks: {guard}");
        println!("sync needed after: {}", mode_sync_needed(&dir, &cfg, &s));
        println!("old copies: {:?}", old_copies(&dir, &cfg));
        let mut owned: Vec<String> = vanilla_owned(&dir).into_iter().collect(); owned.sort();
        println!("vanilla copies: {owned:?}");
        let l = update::Game::vanilla_loader(&dir);
        println!("vanilla loader: {} in place {}", l.load_state().version, l.file_is_installed("winmm.dll"));
        for c in &cfg.components {
            let (e, v) = (update::Game::component(&dir, &c.id).load_state().version, update::Game::vanilla_component(&dir, &c.id).load_state().version);
            println!("  {:<18} on {:<5} games {:?} elite {:<20} vanilla {}", c.id, comp_on(&dir, c, &s), c.games, e, v);
        }
    }
}
