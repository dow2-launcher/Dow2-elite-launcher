//! The add-ons' files: on / off, their options, conflicts, the leftovers and the junk, the Mac add-ons.
//! Split out of main.rs (1.6.17): the items as they were; main.rs keeps the app's state, settings, config and main().
use super::*;

#[tauri::command]
pub fn set_component(app: State<'_, App>, id: String, on: bool) -> Result<(), String> {
    ensure_game_closed(&app)?;
    let required = app.config.lock().unwrap().as_ref().is_some_and(|c| c.components.iter().any(|c| c.id == id && c.required));
    if required && !on { return Err("this add-on is required and cannot be turned off".into()); }
    let mut s = app.settings.lock().unwrap();
    s.components.insert(id, on);
    save_settings(&s);
    Ok(())
}

/// 1.6.20 (owner 17.11.2026): which rating the in-game add-ons show - LobbyStats 0.12 and LoadingRatings 5 read
/// `[LobbyStats] Rating=own|relic` from LobbyStats.ini next to them: Elite_DLLs for Elite, dow2-patches for the launcher's vanilla
/// copies. The player's pick of the profile menu (rating.js rtSet), Relic by default; the file is made when missing, only in a
/// folder that is there (dow2-patches only while it holds our copies - a stand-alone package's folder is put aside empty).
pub(crate) fn write_rating_ini(dir: &std::path::Path, sys: &str) {
    let v = rating_value(sys);
    for sub in ["Elite_DLLs", "dow2-patches"] {
        let d = dir.join(sub);
        if !d.is_dir() || (sub == "dow2-patches" && vanilla_owned(dir).is_empty()) { continue; }
        let _ = elite::set_ini_value(&d.join("LobbyStats.ini"), "LobbyStats", "Rating", v);
    }
}

/// The add-ons' `Rating=` of the profile menu's pick: "elite" (or "own") = our rating, anything else = Relic's.
fn rating_value(sys: &str) -> &'static str {
    if sys == "elite" || sys == "own" { "own" } else { "relic" }
}

/// 1.6.25: the Mac's LobbyStats (catalog components_macos `lobbystats_mac`, LobbyStats 0.12's lobby part, Dow2-patches
/// mac/lobbystats/lobbystats.c) reads `[LobbyStats] Rating=own|relic` and `Server=` (bare hosts, `;`, 4 of them, 192 chars) from
/// LobbyStats.ini next to its dylib - mac_addons/lobbystats_mac/, the Mac game has no Elite_DLLs - so up to 1.6.24 the rating pick
/// and the active host never reached it. The other Mac add-ons (ctrlattack, overwatchonce, nohints, reinforcefix, herolabelfix
/// _mac) read no server.
pub(crate) const MAC_LOBBYSTATS_ID: &str = "lobbystats_mac";
pub(crate) const MAC_LOBBYSTATS: AddonServer =
    AddonServer { dll: "LobbyStats.dylib", ini: "LobbyStats.ini", section: "LobbyStats", max: 4, url: false, cap: 191 };
/// Its ini in `addons` (mac_addons_root) when the add-on is installed (its state or its dylib there; the file is made when
/// missing), else None - nothing is made for an add-on that is not there.
fn mac_lobbystats_ini(addons: &std::path::Path) -> Option<std::path::PathBuf> {
    let d = elite_core::macos::addon_dir(addons, MAC_LOBBYSTATS_ID);
    let installed = file_ci(&d, MAC_LOBBYSTATS.dll).is_some()
        || !update::Game::component(&d, MAC_LOBBYSTATS_ID).load_state().version.is_empty();
    installed.then(|| file_ci(&d, MAC_LOBBYSTATS.ini).unwrap_or_else(|| d.join(MAC_LOBBYSTATS.ini)))
}
/// `Rating=` of the Mac's LobbyStats (the caller holds INI_LOCK) -> written.
fn mac_rating_ini(addons: &std::path::Path, sys: &str) -> bool {
    let Some(ini) = mac_lobbystats_ini(addons) else { return false };
    let v = rating_value(sys);
    let cur = ini_get(&std::fs::read_to_string(&ini).unwrap_or_default(), MAC_LOBBYSTATS.section, "Rating");
    cur.as_deref() != Some(v) && elite::set_ini_value(&ini, MAC_LOBBYSTATS.section, "Rating", v).is_ok()
}
/// macOS: the rating pick into mac_addons/lobbystats_mac/LobbyStats.ini as well. `wait`: for a sync that runs (before a game
/// start); without it (the window's pick, on its thread) a running sync means no write now - the next start writes it.
pub(crate) fn write_mac_rating_ini(sys: &str, wait: bool) {
    if os_name() != "macos" { return; }
    let _w = if wait { INI_LOCK.lock().unwrap_or_else(|e| e.into_inner()) } else {
        match INI_LOCK.try_lock() { Ok(g) => g, Err(std::sync::TryLockError::Poisoned(e)) => e.into_inner(), Err(_) => return }
    };
    if mac_rating_ini(&mac_addons_root(), sys) { c_log(&format!("mac add-on {MAC_LOBBYSTATS_ID}: Rating={}", rating_value(sys))); }
}
/// `Server=` of the Mac's LobbyStats, by the rules of server_inis (the caller holds INI_LOCK) -> the file written.
fn mac_server_ini(addons: &std::path::Path, hosts: &[String], known: &[String]) -> Option<String> {
    let ini = mac_lobbystats_ini(addons)?;
    server_ini(&ini, &MAC_LOBBYSTATS, hosts, known).then(|| format!("mac_addons/{MAC_LOBBYSTATS_ID}/{}", MAC_LOBBYSTATS.ini))
}

/// 1.6.22 (owner 17.11.2026: every part the same): our in-game add-ons call our servers themselves, each with its own list in its
/// ini (Dow2-patches main 17.11.2026) - the launcher writes its ACTIVE host first, the other API hosts after it in the pool's order
/// (reach.rs), so the game goes where the launcher goes. (DLL, its ini, section, key = `Server`, at most hosts, a full URL or bare
/// hosts, the DLL's buffer in characters): MMFind mmfind.c:2496 (`;, `-separated, 4 hosts, 128), LobbyStats and LoadingRatings
/// lobbystats.c:990 (LS_NAME.ini [LobbyStats], 4, 192), EliteAI eliteai.c:1223 ([Replays], 6, 256), LiveReplay livereplay.c:853
/// (one base URL, 200). NetProbe has its hosts in the code (netprobe.c:103, no ini) - nothing to write; JoinSound reads no server.
pub(crate) struct AddonServer { pub dll: &'static str, pub ini: &'static str, pub section: &'static str, pub max: usize, pub url: bool, pub cap: usize }
pub(crate) const ADDON_SERVERS: [AddonServer; 5] = [
    AddonServer { dll: "MMFind.dll", ini: "MMFind.ini", section: "MMFind", max: 4, url: false, cap: 127 },
    AddonServer { dll: "LobbyStats.dll", ini: "LobbyStats.ini", section: "LobbyStats", max: 4, url: false, cap: 191 },
    AddonServer { dll: "LoadingRatings.dll", ini: "LoadingRatings.ini", section: "LobbyStats", max: 4, url: false, cap: 191 },
    AddonServer { dll: "EliteAI.dll", ini: "EliteAI.ini", section: "Replays", max: 6, url: false, cap: 255 },
    AddonServer { dll: "LiveReplay.dll", ini: "LiveReplay.ini", section: "LiveReplay", max: 1, url: true, cap: 199 },
];
/// The bare host of an origin the add-ons can use (HTTPS on 443: `https://host`), else None.
fn addon_host(origin: &str) -> Option<String> {
    let h = origin.trim().trim_end_matches('/').strip_prefix("https://")?.to_ascii_lowercase();
    (!h.is_empty() && h.len() < 64 && !h.contains(['/', ':', '?', '#', ';', ',', ' '])).then_some(h)
}
/// The `Server=` value for one add-on: the hosts in order (the active one first), as many as it takes and its buffer holds.
pub(crate) fn addon_server_value(a: &AddonServer, hosts: &[String]) -> String {
    let mut out = String::new();
    for h in hosts.iter().filter_map(|h| addon_host(h)).take(a.max) {
        let item = if a.url { format!("https://{h}") } else { h };
        let next = if out.is_empty() { item } else { format!("{out};{item}") };
        if next.chars().count() > a.cap { break; }
        out = next;
    }
    out
}
/// One value of an ini file (the first `key=` of the section), None when there is none.
fn ini_get(text: &str, section: &str, key: &str) -> Option<String> {
    let mut in_sec = false;
    for l in text.lines() {
        let t = l.trim();
        if t.starts_with('[') && t.ends_with(']') { in_sec = t[1..t.len() - 1].trim().eq_ignore_ascii_case(section); continue; }
        if in_sec { if let Some((k, v)) = t.split_once('=') { if k.trim().eq_ignore_ascii_case(key) { return Some(v.trim().to_string()); } } }
    }
    None
}
/// A `Server=` the launcher may replace: none, or only our hosts (the add-on's default, or what the launcher wrote before); a
/// server the player or a tester put there by hand (a test ladder, an own host) stays.
pub(crate) fn addon_server_ours(cur: &str, known: &[String]) -> bool {
    cur.split([';', ',', ' ']).filter(|t| !t.is_empty()).all(|t| {
        let t = t.trim().trim_end_matches('/').to_ascii_lowercase();
        let t = t.strip_prefix("https://").unwrap_or(&t).to_string();
        known.iter().any(|k| *k == t)
    })
}
/// A file of `d` by its name in any case (the game folder under Proton keeps the manifests' names, a hand copy may not).
fn file_ci(d: &std::path::Path, name: &str) -> Option<std::path::PathBuf> {
    let p = d.join(name);
    if p.is_file() { return Some(p); }
    std::fs::read_dir(d).ok()?.flatten().find(|e| e.file_name().to_string_lossy().eq_ignore_ascii_case(name)).map(|e| e.path())
}
/// The add-ons' ini files are written by one writer at a time: the sync of the add-ons (sync_components_with) holds it for its
/// whole run, the Server= lists below take it too (reviewer 17.11.2026: no write into a file the sync is putting in place).
pub(crate) static INI_LOCK: Mutex<()> = Mutex::new(());
/// Write the hosts (the active one first) into every add-on's `Server=` of Elite_DLLs and of our vanilla dow2-patches - only where its
/// DLL is, only over a value of our hosts. Before every game start (the DLLs read it once, at the game's start; waits for a sync
/// that runs). -> the files written.
pub(crate) fn write_server_inis(dir: &std::path::Path, hosts: &[String]) -> Vec<String> {
    let _w = INI_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    server_inis(dir, hosts)
}
/// The same when the active host changes (main.rs, the hosts' worker): only when no sync runs now (None) - the next game start
/// writes it anyway.
pub(crate) fn try_write_server_inis(dir: &std::path::Path, hosts: &[String]) -> Option<Vec<String>> {
    let _w = match INI_LOCK.try_lock() { Ok(g) => g, Err(std::sync::TryLockError::Poisoned(e)) => e.into_inner(), Err(_) => return None };
    Some(server_inis(dir, hosts))
}
fn server_inis(dir: &std::path::Path, hosts: &[String]) -> Vec<String> {
    let known = server_known(hosts);
    let mut wrote = Vec::new();
    for sub in ["Elite_DLLs", "dow2-patches"] {
        let d = dir.join(sub);
        if !d.is_dir() || (sub == "dow2-patches" && vanilla_owned(dir).is_empty()) { continue; }
        for a in &ADDON_SERVERS {
            if file_ci(&d, a.dll).is_none() { continue; }
            let ini = file_ci(&d, a.ini).unwrap_or_else(|| d.join(a.ini));
            if server_ini(&ini, a, hosts, &known) { wrote.push(format!("{sub}/{}", a.ini)); }
        }
    }
    // 1.6.25: the Mac's add-ons are not in the game folder - LobbyStats reads its Server= in mac_addons/lobbystats_mac/ (the
    // tests of the game folder above leave the real home alone; mac_server_ini has its own test)
    if os_name() == "macos" && !cfg!(test) { wrote.extend(mac_server_ini(&mac_addons_root(), hosts, &known)); }
    wrote
}
/// The hosts a `Server=` may hold for the launcher to replace it: the site's and the pool's.
fn server_known(hosts: &[String]) -> Vec<String> {
    let mut known: Vec<String> = reach::SITE_HOSTS.iter().map(|h| h.to_string()).collect();
    known.extend(hosts.iter().filter_map(|h| addon_host(h)));
    known
}
/// One add-on's `Server=` in `ini`: the hosts in order, only over none or our own hosts -> written.
fn server_ini(ini: &std::path::Path, a: &AddonServer, hosts: &[String], known: &[String]) -> bool {
    let v = addon_server_value(a, hosts);
    if v.is_empty() { return false; }
    let cur = ini_get(&std::fs::read_to_string(ini).unwrap_or_default(), a.section, "Server").unwrap_or_default();
    if cur == v || !addon_server_ours(&cur, known) { return false; }
    elite::set_ini_value(ini, a.section, "Server", &v).is_ok()
}

/// 1.6.20: the window's rating pick (at its start and on every change): kept for the next game start and written to the add-ons'
/// ini right away; no game folder yet - only kept.
#[tauri::command]
pub fn rating_sys_set(app: State<'_, App>, sys: String) {
    let sys = if sys == "elite" { "elite" } else { "relic" }.to_string();
    {
        let mut s = app.settings.lock().unwrap();
        if s.rating_sys != sys { s.rating_sys = sys.clone(); save_settings(&s); }
    }
    if let Some(d) = game_dir(&app) { write_rating_ini(&d, &sys); }
    write_mac_rating_ini(&sys, false);   // 1.6.25: no game folder needed - mac_addons is the launcher's
}

/// Write every component option to its ini file (only for installed components).
pub(crate) fn apply_options(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings) {
    for c in &cfg.components {
        if update::Game::component(dir, &c.id).load_state().version.is_empty() { continue; }
        for o in c.opts() {
            if o.ini.is_empty() || o.ini.contains("..") { continue; }
            let k = format!("{}.{}", c.id, o.id);
            let on = s.comp_options.get(&k).copied().unwrap_or(o.default);
            let _ = elite::set_ini_value(&dir.join(&o.ini), &o.section, &o.key, &o.ini_value(on, s.comp_values.get(&k)));
        }
    }
}

/// Tick/untick an option of an add-on: saved and written to the game folder right away (takes effect on next game start).
#[tauri::command]
pub fn set_comp_option(app: State<'_, App>, comp: String, opt: String, on: bool) -> Result<(), String> {
    ensure_game_closed(&app)?;
    let s = {
        let mut s = app.settings.lock().unwrap();
        s.comp_options.insert(format!("{comp}.{opt}"), on);
        save_settings(&s);
        s.clone()
    };
    if let (Some(dir), Some(cfg)) = (game_dir(&app), app.config.lock().unwrap().clone()) {
        apply_options(&dir, &cfg, &s);
        apply_vanilla_options(&dir, &cfg, &s);
    }
    Ok(())
}

/// Pick one of an option's choices (e.g. where the match timer sits): saved and written like a tick.
#[tauri::command]
pub fn set_comp_value(app: State<'_, App>, comp: String, opt: String, value: String) -> Result<(), String> {
    ensure_game_closed(&app)?;
    let s = {
        let mut s = app.settings.lock().unwrap();
        s.comp_values.insert(format!("{comp}.{opt}"), value);
        save_settings(&s);
        s.clone()
    };
    if let (Some(dir), Some(cfg)) = (game_dir(&app), app.config.lock().unwrap().clone()) {
        apply_options(&dir, &cfg, &s);
        apply_vanilla_options(&dir, &cfg, &s);
    }
    Ok(())
}

/// Hand-installed copies of a component that are in the game folder right now (see Component::conflicts).
/// 1.4.11: the vanilla copies the launcher put into dow2-patches itself are not hand copies.
pub(crate) fn found_conflicts(dir: &std::path::Path, c: &elite_core::config::Component) -> Vec<String> {
    let ours = vanilla_owned(dir);
    hand_copy_paths(c).into_iter().filter(|f| !f.contains("..") && !ours.contains(&f.to_ascii_lowercase()) && update::Game::new(dir).file(f).is_file()).collect()
}

/// Where a hand-installed copy of a component can be: its `conflicts` list and, for every add-on with a DLL, the stand-alone
/// package's dow2-patches/<dll> (its winmm.dll loads every DLL there, whatever the launcher's ticks say).
pub(crate) fn hand_copy_paths(c: &elite_core::config::Component) -> Vec<String> {
    let mut v = c.conflicts.clone();
    if !c.inject.is_empty() {
        let p = format!("dow2-patches/{}", c.inject);
        if !v.iter().any(|x| x.eq_ignore_ascii_case(&p)) { v.push(p); }
    }
    v
}

/// 1.3.9 (owner 31.10.2026: an add-on that is off must not be loaded at all). Before every start an add-on that is off
/// has no DLL in Elite_DLLs: a copy left there (e.g. from before an add-on id changed) was loaded when the game was
/// started past the launcher (Steam, Elite.exe) with an older Elite.launchconfig. 1.4.2: the DLL is deleted, not renamed
/// to *.off - nothing of an add-on that is off stays in Elite_DLLs (players' logs 31.10-02.11: X.dll.off files among the
/// game's modules); turned on again, the add-on is installed again (its files come from the version cache).
/// Hand-installed copies are not touched here any more: old_copies() finds them and the start waits until they are gone.
/// Only our add-ons (the ones in launcher.json): never a file of Elite itself, never a DLL an add-on that is on injects.
/// -> what it did, for the player: "Elite_DLLs/X.dll" for every DLL that went.
pub(crate) fn enforce_off(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings) -> Vec<String> {
    let elite_owned = elite_files(dir);
    let on_injects: std::collections::HashSet<String> = cfg.components.iter()
        .filter(|c| !c.inject.is_empty() && s.components.get(&c.id).copied().unwrap_or(c.on_by_default()))
        .map(|c| c.inject.to_ascii_lowercase()).collect();
    let mut done = Vec::new();
    for c in &cfg.components {
        if c.inject.is_empty() || s.components.get(&c.id).copied().unwrap_or(c.on_by_default()) { continue; }
        let cg = update::Game::component(dir, &c.id);
        let dll = dir.join("Elite_DLLs").join(&c.inject);
        let was = dll.is_file();
        if !cg.load_state().version.is_empty() { let _ = cg.uninstall(); }
        let rel = format!("Elite_DLLs/{}", c.inject);
        if dll.is_file() && !on_injects.contains(&c.inject.to_ascii_lowercase()) && !elite_owned.contains(&rel.to_ascii_lowercase()) {
            let _ = std::fs::remove_file(&dll);
        }
        if was && !dll.is_file() { done.push(rel); }
    }
    done
}

/// The files of Elite itself (its installed version's manifest), lower case "Elite_DLLs/X.dll" paths: never touched.
pub(crate) fn elite_files(dir: &std::path::Path) -> std::collections::HashSet<String> {
    update::Game::new(dir).load_state().files.iter().map(|f| f.path.to_ascii_lowercase()).collect()
}

/// Every DLL name that is ours (lower case): what the add-ons of the catalog inject, the retired ones, and every DLL a
/// component the launcher ever installed lists (renamed add-ons included) - minus the files of Elite itself.
pub(crate) fn our_dll_names(dir: &std::path::Path, cfg: &LauncherConfig) -> std::collections::HashSet<String> {
    let mut v: std::collections::HashSet<String> = cfg.components.iter().filter(|c| !c.inject.is_empty())
        .map(|c| c.inject.to_ascii_lowercase()).collect();
    v.extend(RETIRED_DLLS.iter().map(|n| n.to_ascii_lowercase()));
    for id in update::Game::component_ids(dir) {
        for f in update::Game::component(dir, &id).load_state().files {
            let name = f.path.rsplit('/').next().unwrap_or(&f.path).to_ascii_lowercase();
            if name.ends_with(".dll") { v.insert(name); }
        }
    }
    let elite = elite_files(dir);
    v.retain(|n| !elite.contains(&format!("elite_dlls/{n}")));
    v
}

/// Is this file name a leftover of one of our DLLs: "<ours>.dll.<anything>" - X.dll.off (older launchers turned add-ons
/// off that way), X.dll.eliteupd (an update cut short), X.dll.bak, X.dll.old...
pub(crate) fn our_leftover(name: &str, ours: &std::collections::HashSet<String>) -> bool {
    let l = name.to_ascii_lowercase();
    l.find(".dll.").map_or(false, |i| ours.contains(&l[..i + 4]) && l.len() > i + 5)
}

/// 1.4.2: before every start, the leftovers of our DLLs go from Elite_DLLs (deleted - they are ours and come back from
/// the version cache or the server if ever needed). Players' logs 31.10-02.11: Cooldowns.dll.off, Relay.dll.off,
/// Relay.dll.eliteupd... among the modules of a running game. Files of Elite and anything not ours stay as they are.
pub(crate) fn drop_leftovers(dir: &std::path::Path, cfg: &LauncherConfig) -> Vec<String> {
    let ours = our_dll_names(dir, cfg);
    let mut gone = Vec::new();
    let Ok(rd) = std::fs::read_dir(dir.join("Elite_DLLs")) else { return gone };
    for e in rd.flatten() {
        let n = e.file_name().to_string_lossy().to_string();
        if e.path().is_file() && our_leftover(&n, &ours) && std::fs::remove_file(e.path()).is_ok() {
            gone.push(format!("Elite_DLLs/{n}"));
        }
    }
    gone
}

/// Old copies of our add-ons outside what the launcher installs, which the game would load next to (or instead of) the
/// launcher's: the stand-alone dow2-patches package (its winmm.dll loads every DLL in dow2-patches/, whatever the ticks
/// say) and the even older LobbyStats/ folder. Put aside without asking before every add-on sync and every start (owner
/// 03.11.2026: one copy of every patch - the launcher's latest). Paths relative to the game folder.
pub(crate) fn old_copies(dir: &std::path::Path, cfg: &LauncherConfig) -> Vec<String> {
    let mut v: Vec<String> = Vec::new();
    for c in &cfg.components {
        for f in found_conflicts(dir, c) { if !v.iter().any(|x| x.eq_ignore_ascii_case(&f)) { v.push(f); } }
    }
    if dir.join("LobbyStats").join("LobbyStats.dll").is_file() { v.push("LobbyStats/LobbyStats.dll".into()); }
    // 1.4.11: dow2-patches is the vanilla game's folder of the launcher now - a retired DLL of ours there is an old copy too
    let ours = vanilla_owned(dir);
    for n in RETIRED_DLLS {
        let p = format!("{}/{n}", update::VANILLA_DIR);
        if dir.join(update::VANILLA_DIR).join(n).is_file() && !ours.contains(&p.to_ascii_lowercase()) && !v.iter().any(|x| x.eq_ignore_ascii_case(&p)) { v.push(p); }
    }
    v
}

/// Put the old copies aside: into <game>/.elite_cache/old-addons-<time>/ (never deleted - can be put back by hand), with
/// their .ini next to them; the stand-alone loader (winmm.dll, its readmes) too once dow2-patches has no DLL left.
/// -> what moved
pub(crate) fn put_aside_old_copies(dir: &std::path::Path, cfg: &LauncherConfig) -> Vec<String> {
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let bin = update::Game::new(dir).cache_dir().join(format!("old-addons-{stamp}"));
    let mut moved = Vec::new();
    let mut put = |rel: &str| {
        let from = dir.join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
        if !from.is_file() { return; }
        let to = bin.join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
        if let Some(p) = to.parent() { let _ = std::fs::create_dir_all(p); }
        if std::fs::rename(&from, &to).is_ok() { moved.push(rel.to_string()); }
    };
    for f in old_copies(dir, cfg) {
        put(&f);
        if let Some((a, _)) = f.rsplit_once('.') { put(&format!("{a}.ini")); }
    }
    let pd = dir.join("dow2-patches");
    // 1.4.11: the launcher's own vanilla copies do not count - and while they are there the stand-alone loader goes anyway
    // (it would load them into Elite too, next to Elite_DLLs)
    let ours = vanilla_owned(dir);
    let dlls_left = std::fs::read_dir(&pd).map(|rd| rd.flatten().any(|e| {
        let n = e.file_name().to_string_lossy().to_ascii_lowercase();
        n.ends_with(".dll") && !ours.contains(&format!("dow2-patches/{n}"))
    })).unwrap_or(false);
    if !dlls_left || !ours.is_empty() {
        for name in ["winmm.dll", "README_EN.txt", "README_RU.txt"] {
            if is_patches_loader_file(dir, name) { put(name); }
        }
        if pd.is_dir() && std::fs::read_dir(&pd).map(|mut rd| rd.next().is_none()).unwrap_or(false) {
            let _ = std::fs::remove_dir(&pd);
        }
    }
    let lf = dir.join("LobbyStats");
    if lf.is_dir() && std::fs::read_dir(&lf).map(|rd| !rd.flatten().any(|e| e.file_name().to_string_lossy().to_ascii_lowercase().ends_with(".dll"))).unwrap_or(false) {
        if let Ok(rd) = std::fs::read_dir(&lf) {
            for e in rd.flatten() { if e.path().is_file() { put(&format!("LobbyStats/{}", e.file_name().to_string_lossy())); } }
        }
        let _ = std::fs::remove_dir(&lf);
    }
    moved
}

/// A file of the stand-alone dow2-patches package at the top of the game folder (its winmm.dll loader names its folder
/// in UTF-16, the readmes in plain text) - and not some other winmm.dll.
pub(crate) fn is_patches_loader_file(dir: &std::path::Path, name: &str) -> bool {
    if name.eq_ignore_ascii_case("winmm.dll") && update::Game::vanilla_loader(dir).file_is_installed("winmm.dll") { return false; }   // the launcher's own
    let wide: Vec<u8> = "dow2-patches".encode_utf16().flat_map(|u| u.to_le_bytes()).collect();
    std::fs::read(dir.join(name))
        .map(|b| b.windows(12).any(|w| w == b"dow2-patches") || b.windows(wide.len()).any(|w| w == wide.as_slice()))
        .unwrap_or(false)
}

/// DLLs of add-ons that are gone from the catalog without a component of their own to clean up after them
/// (02.11.2026: LoadingRatings.dll is part of LobbyStats.dll again). Deleted like enforce_off does, unless an add-on of
/// the catalog injects that name again.
pub(crate) const RETIRED_DLLS: &[&str] = &["LoadingRatings.dll"];

/// Add-ons that are no longer in the catalog: renamed ones (matchtimer -> matchtimer_r2, lobbystats -> lobbystats_r3...)
/// and retired ones. Nothing else ever touches them: enforce_off and sync_components go only through the catalog, so
/// their state and their DLLs stayed in the game folder for good (players' logs 01-02.11.2026: MatchTimer v4, Relay 2,
/// LoadingRatings loaded with those add-ons off). Their files go, except the ones a current add-on or Elite owns now;
/// a DLL that goes leaves InjectedFiles unless a current add-on injects it. Before every start and every update.
pub(crate) fn drop_orphans(dir: &std::path::Path, cfg: &LauncherConfig) -> Vec<String> {
    use std::collections::HashSet;
    let known: HashSet<String> = cfg.components.iter().map(|c| update::component_key(&c.id)).collect();
    let main = update::Game::new(dir);
    let mut owned: HashSet<String> = main.load_state().files.iter().map(|f| f.path.to_ascii_lowercase()).collect();
    for c in &cfg.components {
        owned.extend(update::Game::component(dir, &c.id).load_state().files.iter().map(|f| f.path.to_ascii_lowercase()));
    }
    let injected: HashSet<String> = cfg.components.iter().filter(|c| !c.inject.is_empty()).map(|c| c.inject.to_ascii_lowercase()).collect();
    let mut gone = Vec::new();
    let unlist = |name: &str| {
        if !injected.contains(&name.to_ascii_lowercase()) {
            if let Ok(names) = elite::set_injected_all(dir, name, false) { for n in names { main.accept_local_edit(&n); } }
        }
    };
    for id in update::Game::component_ids(dir) {
        if known.contains(&id) { continue; }
        let g = update::Game::component(dir, &id);
        let n_files = g.load_state().files.len();
        let Ok(removed) = g.uninstall_keeping(|p| owned.contains(&p.to_ascii_lowercase())) else { continue };
        // its saved game originals go back only if nothing of it is shared with a current add-on (a renamed one would
        // get its files overwritten)
        if removed.len() == n_files { restore_originals(dir, &id); }
        for f in removed {
            let name = f.rsplit('/').next().unwrap_or(&f).to_string();
            if name.to_ascii_lowercase().ends_with(".dll") { unlist(&name); }
            gone.push(format!("{id}: {f}"));
        }
    }
    for name in RETIRED_DLLS {
        if injected.contains(&name.to_ascii_lowercase()) { continue; }
        let p = dir.join("Elite_DLLs").join(name);
        if p.is_file() && std::fs::remove_file(&p).is_ok() { gone.push(format!("retired: Elite_DLLs/{name}")); }
        unlist(name);
    }
    gone
}

/// Component wanted by the player and not replaced by a hand-installed copy.
// ---------- 1.5.4: versions without our add-ons (owner 10.11.2026) ----------
// grantovich's IG Rework crashes with our add-ons: its channel in launcher.json says `"addons": false`. While such a version is
// installed and Play starts it, every add-on is treated as unticked - the sync uninstalls them like an untick does (their DLLs
// out of the game folder and of every launch config, Automatch's early winmm.dll too), the window greys the ticks out. The
// player's ticks are not changed: back on a version with add-ons, the same sync installs what they chose.

/// Is this channel one our add-ons do not go into? 1.6.5: a mod version with its own game (channel "game", IG Rework) takes
/// the add-ons of that game as the vanilla game does - through the launcher's loader, so not where there is none (macOS).
pub(crate) fn channel_blocks(cfg: &LauncherConfig, id: &str) -> bool {
    cfg.channels.iter().find(|c| c.id == id).is_some_and(|c| match c.addon_game() {
        Some(_) => os_name() == "macos" || cfg.vanilla_loader().is_none(),
        None => !c.addons_allowed(),
    })
}

// ---------- 1.6.5: add-ons in another mod's version (owner 13.11.2026) ----------
// grantovich's IG Rework is Elite 3.2 + his data with his own IgRework.exe, IgRework.launchconfig and IgRework_DLLs. Its exe
// refuses to start the game when its launch config names a DLL that is not in IgRework_DLLs - up to 1.6.3 every ticked add-on
// went into every *.launchconfig while its DLL stayed in Elite_DLLs, hence `"addons": false` (1.5.4). Now: launch configs name
// a DLL only when their own folder has it (elite::set_injected_all), and a channel with "game" (e.g. "igrework") gets the
// add-ons whose `games` list that game as copies in dow2-patches with the launcher's loader next to DOW2.exe - the vanilla
// game's way (sync_vanilla); loader vloader-3+ loads that folder for any -modname that is not Elite. The rest are off for that version.

/// A mod version: our add-ons' DLL names out of every launch config whose own DLL folder does not have them (IgRework.launchconfig;
/// Elite.launchconfig keeps its add-ons for Elite). -> the add-on DLLs that went
pub(crate) fn unlist_mod_injected(dir: &std::path::Path, cfg: &LauncherConfig) -> Vec<String> {
    let main = update::Game::new(dir);
    let mut out = Vec::new();
    for c in cfg.components.iter().filter(|c| !c.inject.is_empty()) {
        if let Ok(names) = elite::unlist_missing(dir, &c.inject) {
            if !names.is_empty() { out.push(c.inject.clone()); }
            for name in names { main.accept_local_edit(&name); }
        }
    }
    out
}

/// The game of the installed version when it is another mod with its own add-ons ("igrework"), else None.
pub(crate) fn mod_game(dir: &std::path::Path, cfg: &LauncherConfig) -> Option<String> {
    let ch = update::Game::new(dir).load_state().channel;
    cfg.channels.iter().find(|c| c.id == ch).and_then(|c| c.addon_game()).map(str::to_string)
}
/// The game whose add-on copies dow2-patches holds for Play: "vanilla", a mod's ("igrework"), or None (Elite: Elite_DLLs).
pub(crate) fn copies_game(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings) -> Option<String> {
    if vanilla_on(cfg, s) { return Some("vanilla".into()); }
    if os_name() == "macos" || cfg.vanilla_loader().is_none() { return None; }
    mod_game(dir, cfg)
}
/// Does the game Play starts from this folder take no add-ons (the installed version's channel, not the vanilla game)?
pub(crate) fn addons_blocked(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings) -> bool {
    !vanilla_on(cfg, s) && channel_blocks(cfg, &update::Game::new(dir).load_state().channel)
}
/// The ticks the game folder is brought to: the player's, or every add-on off for such a version.
pub(crate) fn effective_settings(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings) -> Settings {
    let mut e = s.clone();
    if addons_blocked(dir, cfg, s) {
        for c in &cfg.components { e.components.insert(c.id.clone(), false); }
    } else if let Some(g) = copies_game(dir, cfg, s).filter(|g| g != "vanilla") {
        // 1.6.5: a mod version - the add-ons not made for its game are off (the player's ticks stay for Elite)
        for c in cfg.components.iter().filter(|c| !c.for_game(&g)) { e.components.insert(c.id.clone(), false); }
    }
    e
}

pub(crate) fn comp_on(dir: &std::path::Path, c: &elite_core::config::Component, s: &Settings) -> bool {
    (c.required || s.components.get(&c.id).copied().unwrap_or(c.on_by_default())) && found_conflicts(dir, c).is_empty()
}

// ---------- 10.11.2026: the add-ons of the native Mac game (Feral 1.0.3) ----------

/// The Mac's folder of add-ons: ~/Library/Application Support/EliteLauncher/mac_addons (one folder per add-on).
pub(crate) fn mac_addons_root() -> std::path::PathBuf {
    elite_core::macos::addons_dir(&dirs::home_dir().unwrap_or_default())
}

/// The Mac add-ons on for the game started (vanilla or Elite): required or ticked, and made for that game.
pub(crate) fn mac_on_ids(cfg: &LauncherConfig, s: &Settings, vanilla: bool) -> Vec<String> {
    let game = if vanilla { "vanilla" } else { "elite" };
    cfg.components.iter()
        .filter(|c| c.for_os("macos") && c.for_game(game) && (c.required || s.components.get(&c.id).copied().unwrap_or(c.on_by_default())))
        .map(|c| c.id.clone()).collect()
}

/// macOS: the add-ons are dylibs in mac_addons/<id>/ (never in the game's .app - Steam's file check would put it back - nor
/// in its data). Ticked and required ones are installed there for both games (the start picks the dylibs of its game), the
/// rest and the folders gone from the catalog are removed. A dylib just downloaded (its SHA-256 = the manifest's, checked by
/// apply and once more here) loses the quarantine flag and gets an ad-hoc signature (`prepare`, as run_elite.command does).
/// The signature makes the file differ from the manifest, so the next sync puts the exact file back from .elite_cache (no
/// network) and signs it again: what loads is always the published file with a fresh signature.
pub(crate) fn sync_mac_addons(addons: &std::path::Path, cfg: &LauncherConfig, s: &Settings, m: &Mirrors, progress: &mut dyn FnMut(&update::Progress),
                   load: LoadManifest, prepare: bool) -> Result<(), update::Error> {
    use elite_core::macos;
    let mut known = std::collections::HashSet::new();
    for c in cfg.components.iter().filter(|c| c.for_os("macos")) {
        let d = macos::addon_dir(addons, &c.id);
        known.insert(d.clone());
        let g = update::Game::component(&d, &c.id);
        if c.required || s.components.get(&c.id).copied().unwrap_or(c.on_by_default()) {
            std::fs::create_dir_all(&d).map_err(|e| update::Error::Io(e.to_string()))?;
            let man = load(&g, &c.version)?;
            update::apply(&g, m, &man, &update::Options { verify_all: false, cache_limit: s.cache_mb.unwrap_or(DEFAULT_CACHE_MB) << 20, channel: c.id.clone() }, progress)?;
            for f in man.files.iter().filter(|f| f.path.to_ascii_lowercase().ends_with(".dylib")) {
                if !g.file_is_installed(&f.path) {
                    return Err(update::Error::Bad(format!("{}: {} differs from the manifest", c.id, f.path)));
                }
                // the published file into .elite_cache before the signature changes it (apply moves a cached file out
                // since 1.5.4): the next sync puts it back from there, also offline, instead of downloading it again
                g.seed_cache(&g.file(&f.path), &elite_core::cdc::hex(&f.sha));
                if prepare {
                    for (prog, args) in macos::prepare_commands(&g.file(&f.path)) {
                        let r = std::process::Command::new(prog).args(&args).output();
                        c_log(&format!("mac add-on {}: {prog} -> {}", c.id, r.map(|o| o.status.to_string()).unwrap_or_else(|e| e.to_string())));
                    }
                }
            }
        } else if !g.load_state().version.is_empty() {
            g.uninstall()?;
        }
    }
    // folders of add-ons gone from the catalog: whatever the launcher installed there goes (a hand-put dylib stays)
    for e in std::fs::read_dir(addons).into_iter().flatten().flatten() {
        let d = e.path();
        if !d.is_dir() || known.contains(&d) { continue; }
        for id in update::Game::component_ids(&d) { update::Game::component(&d, &id).uninstall()?; }
    }
    Ok(())
}

/// macOS: do the Mac add-ons differ from what the catalog and the ticks want (a wanted one missing, of another version or
/// without its files; an unwanted one still installed)? Then the window syncs them before Play - without it the vanilla game
/// never got crossplay_fix (1.6.17: the vanilla mode looked only at the game folder). The files are checked for being there,
/// not by SHA-256: the ad-hoc signature the sync puts on a dylib changes it.
pub(crate) fn mac_addons_sync_needed(addons: &std::path::Path, cfg: &LauncherConfig, s: &Settings) -> bool {
    cfg.components.iter().filter(|c| c.for_os("macos")).any(|c| {
        let g = update::Game::component(&elite_core::macos::addon_dir(addons, &c.id), &c.id);
        let st = g.load_state();
        if c.required || s.components.get(&c.id).copied().unwrap_or(c.on_by_default()) {
            st.version != c.version || st.files.is_empty() || st.files.iter().any(|f| !g.file(&f.path).is_file())
        } else {
            !st.version.is_empty()
        }
    })
}

/// The launch config lists exactly the add-ons that are on and whose DLL is in place. Elite updates and Elite's own
/// tools rewrite Elite.launchconfig, so this runs before every start, not only when a checkbox changes.
/// -> the DLLs of our add-ons it took out of a launch config (an add-on that is off was still listed there).
pub(crate) fn sync_injected(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings) -> Vec<String> {
    let main = update::Game::new(dir);
    let mut out = Vec::new();
    for c in cfg.components.iter().filter(|c| !c.inject.is_empty()) {
        let on = comp_on(dir, c, s) && dir.join("Elite_DLLs").join(&c.inject).is_file();
        if let Ok(names) = elite::set_injected_all(dir, &c.inject, on) {
            if !on && !names.is_empty() { out.push(c.inject.clone()); }
            for name in names { main.accept_local_edit(&name); }
        }
    }
    out
}

/// Turn off launcher copies of components that now have a hand-installed copy (checked before every game start).
pub(crate) fn drop_conflicting(dir: &std::path::Path, cfg: &LauncherConfig) {
    let main = update::Game::new(dir);
    for c in &cfg.components {
        if found_conflicts(dir, c).is_empty() { continue; }
        let g = update::Game::component(dir, &c.id);
        if !g.load_state().version.is_empty() { let _ = g.uninstall(); }
        if !c.inject.is_empty() {
            if let Ok(names) = elite::set_injected_all(dir, &c.inject, false) {
                for name in names { main.accept_local_edit(&name); }
            }
        }
    }
}

/// "Clean up the junk" in Settings (owner 01.11.2026: clear all stray plugins, then set everything up again). Moves into
/// <game>/.elite_cache/junk-<time>/ (never deleted - a mistake can be put back by hand):
/// - the whole stand-alone package: dow2-patches/, the old LobbyStats/ folder, its winmm.dll loader in the game folder;
/// - every DLL-like file at the top of Elite_DLLs (*.dll, *.off, *.bak, *.dll.*) that is neither Elite's own (the installed
///   version's manifest) nor a file of an add-on that is on; the add-ons' .ini / .log / caches stay (players' settings);
/// - InjectedFiles entries whose DLL is not in Elite_DLLs any more.
/// The window runs "check & repair" right after it: Elite's files and the ticked add-ons come back as they should be.
#[tauri::command]
pub fn clean_junk(app: State<'_, App>) -> Result<Value, String> {
    ensure_game_closed(&app)?;
    let dir = game_dir(&app).ok_or("game folder not found")?;
    let cfg = app.config.lock().unwrap().clone().unwrap_or_default();
    let s = app.settings.lock().unwrap().clone();
    Ok(junk_cleanup(&dir, &cfg, &s))
}

pub(crate) fn junk_cleanup(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings) -> Value {
    let s = &effective_settings(dir, cfg, s);
    let main = update::Game::new(dir);
    let mut keep: std::collections::HashSet<String> = main.load_state().files.iter().map(|f| f.path.to_ascii_lowercase()).collect();
    for c in &cfg.components {
        if comp_on(dir, c, s) {
            keep.extend(update::Game::component(dir, &c.id).load_state().files.iter().map(|f| f.path.to_ascii_lowercase()));
        }
    }
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let bin = main.cache_dir().join(format!("junk-{stamp}"));
    let mut moved: Vec<String> = Vec::new();
    let mut put = |rel: &str| {
        let from = main.file(rel);
        if !from.exists() || keep.contains(&rel.to_ascii_lowercase()) { return; }
        let to = bin.join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
        if let Some(p) = to.parent() { let _ = std::fs::create_dir_all(p); }
        if std::fs::rename(&from, &to).is_ok() { moved.push(rel.to_string()); }
    };
    for folder in ["dow2-patches", "LobbyStats"] {
        if dir.join(folder).is_dir() { put(folder); }
    }
    if dir.join("winmm.dll").is_file() { put("winmm.dll"); }
    if let Ok(rd) = std::fs::read_dir(dir.join("Elite_DLLs")) {
        for e in rd.flatten() {
            if !e.path().is_file() { continue; }
            let n = e.file_name().to_string_lossy().to_string();
            let l = n.to_ascii_lowercase();
            if l.ends_with(".dll") || l.ends_with(".off") || l.contains(".bak") || l.contains(".dll.") {
                put(&format!("Elite_DLLs/{n}"));
            }
        }
    }
    // InjectedFiles: names whose DLL is gone
    let mut dropped = Vec::new();
    if let Ok(text) = std::fs::read_to_string(dir.join(elite::LAUNCHCONFIG)) {
        if let Some(line) = text.lines().find_map(|l| l.strip_prefix("InjectedFiles=")) {
            for name in line.split(',').map(|x| x.trim().to_string()).filter(|x| !x.is_empty()) {
                if !dir.join("Elite_DLLs").join(&name).is_file() {
                    if let Ok(files) = elite::set_injected_all(dir, &name, false) {
                        for f in files { main.accept_local_edit(&f); }
                    }
                    dropped.push(name);
                }
            }
        }
    }
    // 1.4.11: dow2-patches and winmm.dll went with the rest - the vanilla copies and the loader are set up again by the check
    // that follows (in the vanilla game) or the next vanilla start
    for id in update::Game::vanilla_ids(dir) { update::Game::vanilla_component(dir, &id).forget(); }
    update::Game::vanilla_loader(dir).forget();
    json!({"moved": moved, "uninjected": dropped, "backup": bin.display().to_string()})
}

pub(crate) fn backup_dir(dir: &std::path::Path, id: &str) -> PathBuf {
    let id: String = id.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_').collect();
    dir.join(".elite_launcher").join("backup").join(id)
}
/// Copy the game files this add-on is about to overwrite (only files that exist and have no backup yet).
pub(crate) fn backup_originals(dir: &std::path::Path, id: &str, man: &elite_core::manifest::Manifest) {
    let b = backup_dir(dir, id);
    for f in &man.files {
        if f.path.contains("..") { continue; }
        let src = update::Game::new(dir).file(&f.path);
        let dst = b.join(f.path.replace('/', std::path::MAIN_SEPARATOR_STR));
        if src.is_file() && !dst.exists() {
            if let Some(p) = dst.parent() { let _ = std::fs::create_dir_all(p); }
            let _ = std::fs::copy(&src, &dst);
        }
    }
}
/// Put back the originals saved by backup_originals and forget the backup.
pub(crate) fn restore_originals(dir: &std::path::Path, id: &str) {
    let b = backup_dir(dir, id);
    fn walk(root: &std::path::Path, cur: &std::path::Path, dir: &std::path::Path) {
        let Ok(rd) = std::fs::read_dir(cur) else { return };
        for e in rd.flatten() {
            let p = e.path();
            if p.is_dir() { walk(root, &p, dir); continue; }
            if let Ok(rel) = p.strip_prefix(root) {
                let dst = dir.join(rel);
                if let Some(d) = dst.parent() { let _ = std::fs::create_dir_all(d); }
                let _ = std::fs::copy(&p, &dst);
            }
        }
    }
    if b.is_dir() { walk(&b, &b, dir); let _ = std::fs::remove_dir_all(&b); }
}

/// 10.11.2026: is there room for `need` bytes (+ 200 MB) on the disk of `dir`? Elite is ~2.9 GB; a full disk mid-install
/// leaves a broken game. Unix (macOS, Linux) asks `df -Pk`; elsewhere, or when df gives nothing, it is not checked.
pub(crate) fn enough_space(dir: &std::path::Path, need: u64) -> Result<(), update::Error> {
    if cfg!(windows) || need == 0 { return Ok(()); }
    let out = std::process::Command::new("df").arg("-Pk").arg(dir).output().ok().map(|o| String::from_utf8_lossy(&o.stdout).to_string());
    match out.as_deref().and_then(elite_core::macos::df_free_bytes) {
        Some(free) if free < need + (200 << 20) => Err(update::Error::Bad(format!(
            "not enough disk space: {:.1} GB needed, {:.1} GB free on the game's disk", need as f64 / 1e9, free as f64 / 1e9))),
        _ => Ok(()),
    }
}

/// Install ticked components, remove unticked ones, keep Elite.launchconfig in sync.
pub(crate) fn sync_components(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings, m: &Mirrors, progress: &mut dyn FnMut(&update::Progress)) -> Result<(), update::Error> {
    sync_components_with(dir, cfg, s, m, progress, &|g, v| update::load_manifest(g, m, v))
}
/// A version's manifest (update::load_manifest; the tests give their own).
pub(crate) type LoadManifest<'a> = &'a dyn Fn(&update::Game, &str) -> Result<elite_core::manifest::Manifest, update::Error>;
pub(crate) fn sync_components_with(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings, m: &Mirrors, progress: &mut dyn FnMut(&update::Progress), load: LoadManifest) -> Result<(), update::Error> {
    let _ini = INI_LOCK.lock().unwrap_or_else(|e| e.into_inner());   // 1.6.22: no Server= write into a file being put in place
    if os_name() == "macos" {
        return sync_mac_addons(&mac_addons_root(), cfg, s, m, progress, load, true);
    }
    if let Some(g) = copies_game(dir, cfg, s) {
        if g != "vanilla" { unlist_mod_injected(dir, cfg); }   // 1.6.5: none of our DLLs in the mod's launch config
        return sync_vanilla(dir, cfg, s, m, progress, load, &g);   // 1.4.11: Elite's files stay as they are
    }
    hide_vanilla_loader(dir);            // Elite: no vanilla loader next to DOW2.exe (Automatch's early one comes back below)
    let s = &effective_settings(dir, cfg, s);   // 1.5.4: a version without add-ons - all of them off
    let main = update::Game::new(dir);
    if main.load_state().version.is_empty() {
        return Ok(()); // Elite itself is not installed yet
    }
    put_aside_old_copies(dir, cfg);      // one copy of every patch: the launcher's (owner 03.11.2026)
    drop_leftovers(dir, cfg);
    drop_orphans(dir, cfg);
    for c in &cfg.components {
        let on = comp_on(dir, c, s);
        let g = update::Game::component(dir, &c.id);
        if on {
            let man = load(&g, &c.version)?;
            // an add-on that replaces game files (e.g. a translation): keep the originals the first time, put them back when it is off
            if g.load_state().version.is_empty() { backup_originals(dir, &c.id, &man); }
            update::apply(&g, m, &man, &update::Options { verify_all: false, cache_limit: s.cache_mb.unwrap_or(DEFAULT_CACHE_MB) << 20, channel: c.id.clone() }, progress)?;
            if c.id == "lobbystats" {
                elite::clean_lobbystats_ini(dir).map_err(|e| update::Error::Io(e.to_string()))?;
            }
        } else if !g.load_state().version.is_empty() {
            g.uninstall()?;
            restore_originals(dir, &c.id);
        }
        if !c.inject.is_empty() {
            for name in elite::set_injected_all(dir, &c.inject, on).map_err(|e| update::Error::Io(e.to_string()))? {
                main.accept_local_edit(&name);
            }
        }
    }
    apply_options(dir, cfg, s);
    Ok(())
}

#[cfg(test)]
mod enforce_off_tests {
    use super::*;
    #[test]
    fn the_active_host_goes_first_into_every_addons_server_list() {
        let hosts = |a: &[&str]| a.iter().map(|s| s.to_string()).collect::<Vec<_>>();
        let pool = hosts(&["https://dow2ru.fintebtc.de", "https://dow2.fintebtc.de", "https://rts.fintebtc.de"]);
        let by = |dll: &str| ADDON_SERVERS.iter().find(|a| a.dll == dll).unwrap();
        assert_eq!(addon_server_value(by("MMFind.dll"), &pool), "dow2ru.fintebtc.de;dow2.fintebtc.de;rts.fintebtc.de");
        assert_eq!(addon_server_value(by("LiveReplay.dll"), &pool), "https://dow2ru.fintebtc.de", "one base URL");
        // not usable by an add-on (HTTPS on 443, a bare host): skipped; no more than it takes, never past its buffer
        let odd = hosts(&["http://127.0.0.1:8217", "https://a.example.org:8443", "https://b.example.org/x/", "https://c.example.org"]);
        assert_eq!(addon_server_value(by("EliteAI.dll"), &odd), "c.example.org", "a plain http, a port or a path: not for an add-on");
        let many: Vec<String> = (0..9).map(|i| format!("https://h{i}-{}.example.org", "x".repeat(40))).collect();
        let v = addon_server_value(by("MMFind.dll"), &many);
        assert!(v.chars().count() <= 127 && v.starts_with("h0-") && v.split(';').count() == 2, "{v}");
        // only our hosts are replaced: the DLL's default, the launcher's own earlier write, none; a hand-made server stays
        let known = hosts(&["rts.fintebtc.de", "dow2.fintebtc.de", "dow2ru.fintebtc.de"]);
        assert!(addon_server_ours("", &known) && addon_server_ours("rts.fintebtc.de;dow2.fintebtc.de, dow2ru.fintebtc.de", &known));
        assert!(addon_server_ours("https://rts.fintebtc.de/", &known));
        assert!(!addon_server_ours("127.0.0.1:8217", &known) && !addon_server_ours("rts.fintebtc.de;my.test.org", &known));

        let d = std::env::temp_dir().join(format!("srv_ini_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        let e = d.join("Elite_DLLs");
        std::fs::create_dir_all(&e).unwrap();
        std::fs::create_dir_all(d.join("dow2-patches")).unwrap();
        for f in ["MMFind.dll", "lobbystats.dll", "EliteAI.dll", "LiveReplay.dll", "Cooldowns.dll"] { std::fs::write(e.join(f), b"MZ").unwrap(); }
        std::fs::write(e.join("MMFind.ini"), "[MMFind]\r\nLang=ru\r\nServer=rts.fintebtc.de\r\n").unwrap();
        std::fs::write(e.join("LobbyStats.ini"), "[LobbyStats]\r\nRating=own\r\n").unwrap();
        std::fs::write(e.join("EliteAI.ini"), "[Lua]\r\nx=1\r\n[Replays]\r\nServer=my.test.org\r\n").unwrap();
        let mut w = write_server_inis(&d, &pool);
        w.sort();
        assert_eq!(w, ["Elite_DLLs/LiveReplay.ini", "Elite_DLLs/LobbyStats.ini", "Elite_DLLs/MMFind.ini"], "the tester's EliteAI server stays; no LoadingRatings.dll - no ini");
        let rd = |f: &str| std::fs::read_to_string(e.join(f)).unwrap();
        assert_eq!(rd("MMFind.ini"), "[MMFind]\r\nLang=ru\r\nServer=dow2ru.fintebtc.de;dow2.fintebtc.de;rts.fintebtc.de\r\n");
        assert!(rd("LobbyStats.ini").contains("Rating=own") && rd("LobbyStats.ini").contains("Server=dow2ru.fintebtc.de;dow2.fintebtc.de;rts.fintebtc.de"));
        assert!(rd("EliteAI.ini").contains("Server=my.test.org"));
        assert!(rd("LiveReplay.ini").contains("[LiveReplay]") && rd("LiveReplay.ini").contains("Server=https://dow2ru.fintebtc.de"));
        assert!(!d.join("dow2-patches/MMFind.ini").exists(), "no vanilla copies of ours there - nothing made");
        // the active host changed: the lists follow; the same list again writes nothing
        let pool2 = hosts(&["https://rts.fintebtc.de", "https://dow2ru.fintebtc.de", "https://dow2.fintebtc.de"]);
        assert_eq!(write_server_inis(&d, &pool2).len(), 3);
        assert!(rd("MMFind.ini").contains("Server=rts.fintebtc.de;dow2ru.fintebtc.de;dow2.fintebtc.de"));
        assert!(write_server_inis(&d, &pool2).is_empty());
        assert!(write_server_inis(&d, &[]).is_empty(), "no hosts known: the lists stay");
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn rating_pick_reaches_the_lobbystats_ini() {
        // 1.6.20: Rating=own|relic in Elite_DLLs/LobbyStats.ini, the other keys kept; no dow2-patches of ours - not made there
        let d = std::env::temp_dir().join(format!("rt_ini_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        write_rating_ini(&d, "elite");   // no game folder content at all - nothing made
        assert!(!d.join("Elite_DLLs").exists());
        std::fs::create_dir_all(d.join("Elite_DLLs")).unwrap();
        std::fs::create_dir_all(d.join("dow2-patches")).unwrap();
        std::fs::write(d.join("Elite_DLLs/LobbyStats.ini"), "[LobbyStats]\r\nShow=1\r\n").unwrap();
        write_rating_ini(&d, "elite");
        let t = std::fs::read_to_string(d.join("Elite_DLLs/LobbyStats.ini")).unwrap();
        assert!(t.contains("Show=1") && t.contains("Rating=own"), "{t}");
        write_rating_ini(&d, "relic");
        let t = std::fs::read_to_string(d.join("Elite_DLLs/LobbyStats.ini")).unwrap();
        assert!(t.contains("Rating=relic") && !t.contains("Rating=own"), "{t}");
        assert!(!d.join("dow2-patches/LobbyStats.ini").exists(), "a folder without our vanilla copies stays as it is");
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn mac_lobbystats_ini_gets_the_rating_and_the_hosts() {
        // 1.6.25: the Mac's LobbyStats reads mac_addons/lobbystats_mac/LobbyStats.ini - the rating pick and the hosts reach it
        let root = std::env::temp_dir().join(format!("mac_ls_ini_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let hosts = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();
        let pool = hosts(&["https://dow2ru.fintebtc.de", "https://dow2.fintebtc.de", "https://rts.fintebtc.de"]);
        let known = server_known(&pool);
        // not installed: nothing made
        assert!(!mac_rating_ini(&root, "elite") && mac_server_ini(&root, &pool, &known).is_none());
        assert!(!root.join("lobbystats_mac").exists());
        // installed (the dylib there), its ini missing: made with both keys
        let d = root.join("lobbystats_mac");
        std::fs::create_dir_all(&d).unwrap();
        std::fs::write(d.join("LobbyStats.dylib"), b"\xcf\xfa\xed\xfe").unwrap();
        assert!(mac_rating_ini(&root, "elite"));
        assert_eq!(mac_server_ini(&root, &pool, &known).as_deref(), Some("mac_addons/lobbystats_mac/LobbyStats.ini"));
        let rd = || std::fs::read_to_string(d.join("LobbyStats.ini")).unwrap();
        assert_eq!(ini_get(&rd(), "LobbyStats", "Rating").as_deref(), Some("own"));
        assert_eq!(ini_get(&rd(), "LobbyStats", "Server").as_deref(), Some("dow2ru.fintebtc.de;dow2.fintebtc.de;rts.fintebtc.de"));
        // the published ini (LF, a commented Server=): Rating replaced, Server= added, the rest kept; the same again writes nothing
        std::fs::write(d.join("LobbyStats.ini"), "[LobbyStats]\n; which rating\nEnabled=1\nRating=relic\n; hosts\n;Server=\n").unwrap();
        assert!(mac_rating_ini(&root, "own") && mac_server_ini(&root, &pool, &known).is_some());
        let t = rd();
        assert!(t.contains("Enabled=1\nRating=own\n") && t.contains(";Server=\n") && !t.contains('\r'), "{t}");
        assert_eq!(ini_get(&t, "LobbyStats", "Server").as_deref(), Some("dow2ru.fintebtc.de;dow2.fintebtc.de;rts.fintebtc.de"));
        assert!(!mac_rating_ini(&root, "elite") && mac_server_ini(&root, &pool, &known).is_none());
        assert!(mac_rating_ini(&root, "relic") && rd().contains("Rating=relic") && !rd().contains("Rating=own"));
        // the active host changed: the list follows; a server put there by hand stays
        let pool2 = hosts(&["https://rts.fintebtc.de", "https://dow2ru.fintebtc.de", "https://dow2.fintebtc.de"]);
        assert!(mac_server_ini(&root, &pool2, &server_known(&pool2)).is_some());
        assert_eq!(ini_get(&rd(), "LobbyStats", "Server").as_deref(), Some("rts.fintebtc.de;dow2ru.fintebtc.de;dow2.fintebtc.de"));
        elite::set_ini_value(&d.join("LobbyStats.ini"), "LobbyStats", "Server", "my.test.org").unwrap();
        assert!(mac_server_ini(&root, &pool, &known).is_none());
        assert_eq!(ini_get(&rd(), "LobbyStats", "Server").as_deref(), Some("my.test.org"));
        // installed by the launcher (its state) but the dylib gone: still its ini
        std::fs::remove_file(d.join("LobbyStats.dylib")).unwrap();
        assert!(!mac_rating_ini(&root, "own"), "neither the dylib nor the launcher's state: not installed");
        std::fs::create_dir_all(d.join(".elite_launcher")).unwrap();
        std::fs::write(d.join(".elite_launcher/component-lobbystats_mac.json"),
            r#"{"version":"lobbystats_mac-1","channel":"lobbystats_mac","files":[]}"#).unwrap();
        assert!(mac_rating_ini(&root, "own") && rd().contains("Rating=own"));
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn a_version_without_addons_turns_them_all_off_and_back() {
        let d = std::env::temp_dir().join(format!("noaddons_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        for p in ["Elite_DLLs", ".elite_launcher"] { std::fs::create_dir_all(d.join(p)).unwrap(); }
        for f in ["Elite_DLLs/MMFind.dll", "winmm.dll", "Elite_DLLs/Cooldowns.dll"] { std::fs::write(d.join(f), b"x").unwrap(); }
        for lc in ["Elite.launchconfig", "IgRework.launchconfig"] {
            std::fs::write(d.join(lc), "[Launch]\r\nInjectedFiles=MMFind.dll,Cooldowns.dll\r\n").unwrap();
        }
        let st = |ch: &str| std::fs::write(d.join(".elite_launcher/state.json"), format!(r#"{{"version":"{ch}-1","channel":"{ch}","files":[]}}"#)).unwrap();
        std::fs::write(d.join(".elite_launcher/component-automatch.json"),
            r#"{"version":"mmfind-0.49","channel":"automatch","files":[{"path":"Elite_DLLs/MMFind.dll","size":1,"mtime":0,"sha":""},{"path":"winmm.dll","size":1,"mtime":0,"sha":""}]}"#).unwrap();
        std::fs::write(d.join(".elite_launcher/component-cooldowns.json"),
            r#"{"version":"cooldowns-8","channel":"cooldowns","files":[{"path":"Elite_DLLs/Cooldowns.dll","size":1,"mtime":0,"sha":""}]}"#).unwrap();
        let mut cfg: LauncherConfig = serde_json::from_str(r#"{"channels": [{"id": "stable", "version": "stable-1", "default": true},
            {"id": "igrework", "version": "igrework-1", "exe": "IgRework.exe", "addons": false}]}"#).unwrap();
        let comp = |id: &str, dll: &str, def: bool| elite_core::config::Component { id: id.into(), inject: dll.into(), default: def, ..Default::default() };
        cfg.components = vec![comp("automatch", "MMFind.dll", true), comp("cooldowns", "Cooldowns.dll", false)];
        let mut s = Settings::default();
        s.components.insert("cooldowns".into(), true);
        let chosen = s.components.clone();
        // the installed version takes add-ons: the player's ticks
        st("stable");
        assert!(!addons_blocked(&d, &cfg, &s));
        let e = effective_settings(&d, &cfg, &s);
        assert!(cfg.components.iter().all(|c| comp_on(&d, c, &e)));
        // IG Rework installed: everything off at the start - DLLs, Automatch's early winmm.dll, every launch config
        st("igrework");
        assert!(addons_blocked(&d, &cfg, &s));
        assert!(cfg.components.iter().all(|c| !comp_on(&d, c, &effective_settings(&d, &cfg, &s))));
        let off = prepare_start(&d, &cfg, &s)["off"].clone();
        for f in ["Elite_DLLs/MMFind.dll", "winmm.dll", "Elite_DLLs/Cooldowns.dll"] { assert!(!d.join(f).exists(), "{f} is gone ({off})"); }
        for lc in ["Elite.launchconfig", "IgRework.launchconfig"] {
            let t = std::fs::read_to_string(d.join(lc)).unwrap();
            assert!(!t.contains("MMFind") && !t.contains("Cooldowns"), "{lc}: {t}");
        }
        assert_eq!(s.components, chosen, "the player's ticks are kept");
        assert!(update::Game::component_ids(&d).is_empty(), "uninstalled like an untick");
        // the vanilla game is another game: its add-ons are not blocked by the Elite version
        let mut v = s.clone();
        v.game_mode = "vanilla".into();
        cfg.vanilla = Some(serde_json::from_str(r#"{"loader": "vloader-1"}"#).unwrap());
        if vanilla_on(&cfg, &v) { assert!(!addons_blocked(&d, &cfg, &v)); }
        // back on the main version: what the player chose
        st("stable");
        let e = effective_settings(&d, &cfg, &s);
        assert!(cfg.components.iter().all(|c| comp_on(&d, c, &e)));
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn off_addons_and_hand_copies_are_not_loadable() {
        let d = std::env::temp_dir().join(format!("eo_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        for p in ["dow2-patches", "Elite_DLLs", "LobbyStats"] { std::fs::create_dir_all(d.join(p)).unwrap(); }
        for f in ["dow2-patches/Relay.dll", "dow2-patches/ObsFix.dll", "dow2-patches/MMFind.dll", "Elite_DLLs/Relay.dll",
                  "Elite_DLLs/MMFind.dll", "LobbyStats/LobbyStats.dll", "dow2-patches/Other.dll"] { std::fs::write(d.join(f), b"x").unwrap(); }
        let comp = |id: &str, dll: &str, def: bool, conf: &[&str]| elite_core::config::Component { id: id.into(), inject: dll.into(), default: def,
            conflicts: conf.iter().map(|s| s.to_string()).collect(), ..Default::default() };
        let mut cfg = LauncherConfig::default();
        cfg.components = vec![comp("relay_r2", "Relay.dll", false, &[]), comp("automatch", "MMFind.dll", true, &["dow2-patches/MMFind.dll"]),
                              comp("obsfix_r2", "ObsFix.dll", false, &["dow2-patches/ObsFix.dll"]),
                              comp("lobbystats_r3", "LobbyStats.dll", false, &["dow2-patches/LobbyStats.dll", "LobbyStats/LobbyStats.dll"])];
        let ex = |f: &str| d.join(f).is_file();
        // the old copies are found (they stop the start) and put aside on request; the foreign DLL stays
        let old = old_copies(&d, &cfg);
        for f in ["dow2-patches/Relay.dll", "dow2-patches/ObsFix.dll", "dow2-patches/MMFind.dll", "LobbyStats/LobbyStats.dll"] {
            assert!(old.iter().any(|x| x == f), "{f} in {old:?}");
        }
        assert!(!old.iter().any(|x| x.contains("Other")), "{old:?}");
        let moved = put_aside_old_copies(&d, &cfg);
        assert_eq!(moved.len(), 4, "{moved:?}");
        assert!(old_copies(&d, &cfg).is_empty());
        assert!(!ex("dow2-patches/Relay.dll") && !ex("dow2-patches/Relay.dll.off") && !ex("LobbyStats/LobbyStats.dll"));
        assert!(ex("dow2-patches/Other.dll"), "files that are not ours stay");
        assert!(std::fs::read_dir(d.join(".elite_cache")).unwrap().flatten().any(|e| e.path().join("dow2-patches").join("Relay.dll").is_file()), "kept aside");
        // an add-on that is off: its DLL is deleted, no X.dll.off left behind
        enforce_off(&d, &cfg, &Settings::default());
        assert!(!ex("Elite_DLLs/Relay.dll") && !ex("Elite_DLLs/Relay.dll.off"));
        assert!(ex("Elite_DLLs/MMFind.dll"), "an add-on that is on keeps its DLL");
        enforce_off(&d, &cfg, &Settings::default());            // a second start: nothing breaks
        assert!(ex("Elite_DLLs/MMFind.dll"));
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn leftovers_of_our_dlls_go_and_nothing_else() {
        let d = std::env::temp_dir().join(format!("lo_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        for p in ["Elite_DLLs", ".elite_launcher"] { std::fs::create_dir_all(d.join(p)).unwrap(); }
        // what players' logs showed among the game's modules, plus Elite's own files and a foreign mod with its own .bak
        for f in ["Elite_DLLs/Relay.dll.off", "Elite_DLLs/Relay.dll.eliteupd", "Elite_DLLs/Cooldowns.dll.off", "Elite_DLLs/LobbyStats.dll.bak",
                  "Elite_DLLs/LoadingRatings.dll.off", "Elite_DLLs/OldTimer.dll.off", "Elite_DLLs/MMFind.dll", "Elite_DLLs/MMFind.ini",
                  "Elite_DLLs/MiscFixes.dll", "Elite_DLLs/MiscFixes.dll.bak", "Elite_DLLs/Foreign.dll", "Elite_DLLs/Foreign.dll.off",
                  "Elite_DLLs/Relay.log"] { std::fs::write(d.join(f), b"MZ").unwrap(); }
        // Elite's MiscFixes.dll (main manifest); an add-on gone from the catalog that once installed OldTimer.dll
        std::fs::write(d.join(".elite_launcher/state.json"), r#"{"files":[{"path":"Elite_DLLs/MiscFixes.dll","size":2,"mtime":0,"sha":""}]}"#).unwrap();
        std::fs::write(d.join(".elite_launcher/component-oldtimer.json"), r#"{"version":"t-1","files":[{"path":"Elite_DLLs/OldTimer.dll","size":2,"mtime":0,"sha":""}]}"#).unwrap();
        let comp = |id: &str, dll: &str, def: bool| elite_core::config::Component { id: id.into(), inject: dll.into(), default: def, ..Default::default() };
        let mut cfg = LauncherConfig::default();
        cfg.components = vec![comp("automatch", "MMFind.dll", true), comp("relay_r2", "Relay.dll", true),
                              comp("cooldowns_r2", "Cooldowns.dll", false), comp("lobbystats_r3", "LobbyStats.dll", false)];
        let gone = drop_leftovers(&d, &cfg);
        let ex = |f: &str| d.join(f).is_file();
        for f in ["Relay.dll.off", "Relay.dll.eliteupd", "Cooldowns.dll.off", "LobbyStats.dll.bak", "LoadingRatings.dll.off", "OldTimer.dll.off"] {
            assert!(!ex(&format!("Elite_DLLs/{f}")), "{f} should go: {gone:?}");
        }
        for f in ["MMFind.dll", "MMFind.ini", "MiscFixes.dll", "MiscFixes.dll.bak", "Foreign.dll", "Foreign.dll.off", "Relay.log"] {
            assert!(ex(&format!("Elite_DLLs/{f}")), "{f} is not a leftover of ours");
        }
        assert_eq!(gone.len(), 6, "{gone:?}");
        assert!(drop_leftovers(&d, &cfg).is_empty(), "a second start: nothing more");
        let _ = std::fs::remove_dir_all(&d);
    }
}

#[cfg(test)]
mod junk_tests {
    use super::*;
    #[test]
    fn stray_plugins_go_to_the_backup_and_ours_stay() {
        let d = std::env::temp_dir().join(format!("junk_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        for p in ["dow2-patches", "Elite_DLLs", "LobbyStats", ".elite_launcher"] { std::fs::create_dir_all(d.join(p)).unwrap(); }
        for f in ["dow2-patches/ReinforceFix.dll", "dow2-patches/ObsFix.dll.off", "winmm.dll", "LobbyStats/LobbyStats.dll",
                  "Elite_DLLs/MiscFixes.dll", "Elite_DLLs/MMFind.dll", "Elite_DLLs/Relay.dll", "Elite_DLLs/Relay.dll.off",
                  "Elite_DLLs/LobbyStats.dll.bak", "Elite_DLLs/MMFind.ini", "Elite_DLLs/Relay.log", "DOW2.exe"] { std::fs::write(d.join(f), b"x").unwrap(); }
        std::fs::write(d.join("Elite.launchconfig"), "IsRetribution=true\nInjectedFiles=MiscFixes.dll, Relay.dll, MMFind.dll\n").unwrap();
        // what the launcher installed: Elite's MiscFixes.dll (main manifest) and the automatch add-on (on by default)
        std::fs::write(d.join(".elite_launcher/state.json"), r#"{"files":[{"path":"Elite_DLLs/MiscFixes.dll","size":1,"mtime":0,"sha":""}]}"#).unwrap();
        std::fs::write(d.join(".elite_launcher/component-automatch.json"), r#"{"version":"mmfind-0.32","files":[{"path":"Elite_DLLs/MMFind.dll","size":1,"mtime":0,"sha":""}]}"#).unwrap();
        let comp = |id: &str, dll: &str, def: bool| elite_core::config::Component { id: id.into(), inject: dll.into(), default: def, ..Default::default() };
        let mut cfg = LauncherConfig::default();
        cfg.components = vec![comp("automatch", "MMFind.dll", true), comp("relay_r2", "Relay.dll", false)];
        let r = junk_cleanup(&d, &cfg, &Settings::default());
        let ex = |f: &str| d.join(f).exists();
        assert!(!ex("dow2-patches") && !ex("winmm.dll") && !ex("LobbyStats"), "the stand-alone package goes: {r}");
        assert!(!ex("Elite_DLLs/Relay.dll") && !ex("Elite_DLLs/Relay.dll.off") && !ex("Elite_DLLs/LobbyStats.dll.bak"), "{r}");
        assert!(ex("Elite_DLLs/MiscFixes.dll") && ex("Elite_DLLs/MMFind.dll"), "Elite's own and ticked add-ons stay: {r}");
        assert!(ex("Elite_DLLs/MMFind.ini") && ex("Elite_DLLs/Relay.log") && ex("DOW2.exe"), "settings, logs, the game stay");
        let lc = std::fs::read_to_string(d.join("Elite.launchconfig")).unwrap();
        assert!(lc.contains("MMFind.dll") && lc.contains("MiscFixes.dll") && !lc.contains("Relay.dll"), "{lc}");
        let bin = std::path::PathBuf::from(r["backup"].as_str().unwrap());
        assert!(bin.join("dow2-patches").join("ReinforceFix.dll").is_file() && bin.join("Elite_DLLs").join("Relay.dll").is_file(), "kept in the backup");
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn start_checks_tell_what_they_did_with_our_addons_only() {
        let d = std::env::temp_dir().join(format!("guard_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        for p in ["Elite_DLLs", "dow2-patches", ".elite_launcher"] { std::fs::create_dir_all(d.join(p)).unwrap(); }
        // Relay is off but its DLL is still there and listed; a hand copy of MMFind in dow2-patches; Other.dll is not ours
        for f in ["Elite_DLLs/MMFind.dll", "Elite_DLLs/Relay.dll", "Elite_DLLs/Other.dll", "dow2-patches/MMFind.dll"] { std::fs::write(d.join(f), b"x").unwrap(); }
        std::fs::write(d.join("Elite.launchconfig"), "IsRetribution=true\nInjectedFiles=MMFind.dll, Relay.dll, Other.dll\n").unwrap();
        let comp = |id: &str, dll: &str, def: bool| elite_core::config::Component { id: id.into(), inject: dll.into(), default: def, ..Default::default() };
        let mut cfg = LauncherConfig::default();
        cfg.components = vec![comp("automatch", "MMFind.dll", true), comp("relay_r2", "Relay.dll", false)];
        let s = Settings::default();
        assert_eq!(old_copies(&d, &cfg), vec!["dow2-patches/MMFind.dll".to_string()], "the hand copy stops the start");
        let off = enforce_off(&d, &cfg, &s);
        assert_eq!(off, vec!["Elite_DLLs/Relay.dll".to_string()], "{off:?}");
        assert!(d.join("dow2-patches/MMFind.dll").is_file(), "hand copies are not touched without asking");
        sync_injected(&d, &cfg, &s);
        let lc = std::fs::read_to_string(d.join("Elite.launchconfig")).unwrap();
        assert!(!lc.contains("Relay.dll") && lc.contains("Other.dll"), "ours out, a foreign DLL left alone: {lc}");
        assert!(d.join("Elite_DLLs/Other.dll").is_file());
        let _ = std::fs::remove_dir_all(&d);
    }
}
