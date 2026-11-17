//! Play: the game's command line (Windows, Proton, the native Mac game) and its start.
//! Split out of main.rs (1.6.17): the items as they were; main.rs keeps the app's state, settings, config and main().
use super::*;

/// Start the game. Never blocked by a pending update.
#[tauri::command]
pub fn play(app: State<'_, App>) -> Result<Value, String> {
    start_game(&app)
}

pub(crate) fn start_game(app: &App) -> Result<Value, String> {
    if app.busy.load(Ordering::Relaxed) {
        return Err("files are being updated, wait a few seconds".into());
    }
    if app.game_running.load(Ordering::Relaxed) {
        return Err("the game is already running".into());
    }
    let dir = game_dir(&app).ok_or("game folder not found")?;
    let cfg = app.config.lock().unwrap().clone().unwrap_or_default();
    // 1.4.9: Join goes over RoomJoin's pipe; a request file of launcher 1.4.8 left behind would still be read by RoomJoin 9
    for f in ["RoomJoin.txt", "RoomJoin_result.txt"] { let _ = std::fs::remove_file(dir.join("Elite_DLLs").join(f)); }
    // old copies of our add-ons (the stand-alone package, the old LobbyStats folder) would load next to the launcher's:
    // put aside without asking (owner 03.11.2026: one copy of every patch, the launcher's latest). The window brings
    // the launcher's versions first (Play syncs the add-ons before it starts), so normally there is nothing left here.
    let settings = app.settings.lock().unwrap().clone();
    let vanilla = vanilla_on(&cfg, &settings);
    let guard = prepare_start(&dir, &cfg, &settings);
    roomjoin::note_launch();     // 1.4.9: Join waits for the add-on of a game started just now
    if !vanilla { elite_core::hotkeys::refresh_if_stale(&settings.hotkeys); }     // a patch brought new defaults
    launch(&dir, &cfg, vanilla, guard)
}

/// The checks of the game folder right before a start (no network): what they did, for the player.
pub(crate) fn prepare_start(dir: &std::path::Path, cfg: &LauncherConfig, settings: &Settings) -> Value {
    let (dir, cfg) = (dir.to_path_buf(), cfg.clone());
    let settings = &effective_settings(&dir, &cfg, settings);   // 1.5.4: a version without add-ons - all of them off
    let vanilla = vanilla_on(&cfg, settings);
    // 1.6.20: the rating the in-game add-ons show, as the profile menu has it (Elite_DLLs / dow2-patches LobbyStats.ini)
    write_rating_ini(&dir, &settings.rating_sys);
    // macOS (Feral's native game): no Windows DLLs, winmm loader or Elite.exe there - nothing of the checks below applies;
    // our Mac patches are dylibs in mac_addons (see `launch`)
    if os_name() == "macos" {
        c_log(&format!("launch: {} (macOS)", if vanilla { "vanilla" } else { "elite" }));
        return json!({"off": [], "loader": false, "vanilla": vanilla, "vanilla_loader_missing": false,
                      "mac_addons": mac_on_ids(&cfg, settings, vanilla)});
    }
    let old = put_aside_old_copies(&dir, &cfg);
    // what the checks of our add-ons did is told to the player (siritos 02.11): only add-ons of launcher.json, the
    // leftovers of their DLLs, and the ones gone from the catalog (drop_orphans) - nothing else in the game folder;
    // loader: the stand-alone dow2-patches package's winmm.dll. The leftovers first: drop_orphans forgets the names.
    let mut off = old;
    let copies = copies_game(&dir, &cfg, settings);
    if let Some(game) = &copies {
        // 1.4.11: the vanilla game - only dow2-patches is checked, Elite's files stay as they are
        off.extend(drop_vanilla_leftovers(&dir, &cfg));
        off.extend(drop_vanilla_extra(&dir, &cfg, settings, game));
        off.extend(put_aside_foreign_vanilla(&dir));
        // 1.6.5: a mod version (IG Rework) - none of our DLLs in its launch config, or its exe does not start the game
        if game != "vanilla" { off.extend(unlist_mod_injected(&dir, &cfg)); }
    } else {
        // Elite: the vanilla loader out, Automatch's early winmm.dll back (both from the version cache, no network)
        if hide_vanilla_loader(&dir) { restore_root_files(&dir, &cfg, &settings); }
        off.extend(drop_leftovers(&dir, &cfg));
        off.extend(enforce_off(&dir, &cfg, &settings));
        off.extend(drop_orphans(&dir, &cfg));
        drop_conflicting(&dir, &cfg);
        for n in sync_injected(&dir, &cfg, &settings) {
            if !off.iter().any(|x| x.to_ascii_lowercase().ends_with(&n.to_ascii_lowercase())) { off.push(n); }
        }
    }
    let loader_missing = copies.is_some() && !update::Game::vanilla_loader(&dir).file_is_installed("winmm.dll");
    c_log(&format!("launch: {}{}", copies.as_deref().unwrap_or("elite"), if loader_missing { " (the vanilla loader is not in place - no add-ons)" } else { "" }));
    json!({"off": off, "loader": is_patches_loader_file(&dir, "winmm.dll"), "vanilla": vanilla, "vanilla_loader_missing": loader_missing,
           "game": copies.as_deref().unwrap_or("elite")})
}

/// 1.4.26 (owner 07.11.2026): the vanilla game starts without the intro movies, as Elite does (Elite.launchconfig
/// LaunchParams=-nomovies) - Play, Join, the launcher's rooms and Watch all start it through `launch`.
pub(crate) const VANILLA_ARGS: &[&str] = &["-nomovies"];

/// Is this `steam -applaunch <appid>` (Steam hands whatever follows the appid to the game)?
pub(crate) fn is_steam_applaunch(cmd: &elite_core::config::LaunchCmd) -> bool {
    cmd.program == "steam" && cmd.args.iter().any(|a| a == "-applaunch")
}

/// The command Play runs on `os` before `{game}` is put in: Elite's launch.<os> (the version's own exe/args on Windows), or
/// for the vanilla game DOW2.exe itself with VANILLA_ARGS (Windows) / `steam -applaunch 56400 -nomovies` (Linux; normally
/// the launcher runs DOW2.exe through the game's Proton instead, with the same arguments - see `proton_args`).
pub(crate) fn launch_cmd(cfg: &LauncherConfig, installed: &update::State, os: &str, vanilla: bool) -> elite_core::config::LaunchCmd {
    let mut cmd = match os {
        "windows" => cfg.launch.windows.clone(),
        "macos" => cfg.launch.macos.clone(),
        _ => cfg.launch.linux.clone(),
    };
    // у версии может быть свой exe (публичный тест 3.2 — отдельный мод Elite_Test рядом с основным)
    if let Some(ch) = cfg.channels.iter().find(|c| c.id == installed.channel && c.version == installed.version) {
        if !ch.exe.is_empty() && os == "windows" {
            cmd.program = format!("{{game}}/{}", ch.exe);
        }
        // старые версии (2.3, 2.9.3) — без своего Elite.exe, запускаются как мод: DOW2.exe -modname Elite
        if !ch.args.is_empty() && os == "windows" {
            cmd.args = ch.args.clone();
        }
    }
    if vanilla {
        match os {
            // 1.4.11: the vanilla game - DOW2.exe itself, no -modname (Elite's starter is what adds it)
            "windows" => {
                cmd.program = "{game}/DOW2.exe".into();
                cmd.args = VANILLA_ARGS.iter().map(|a| a.to_string()).collect();
            }
            _ if is_steam_applaunch(&cmd) => {
                for a in VANILLA_ARGS { if !cmd.args.iter().any(|x| x.eq_ignore_ascii_case(a)) { cmd.args.push(a.to_string()); } }
            }
            // macOS: normally the launcher starts Feral's game itself with crossplay_fix (mac_launch); this is the fallback
            // through Steam. launch.macos of the catalogs before 16.11.2026 named the CrossOver Elite.exe - not a native start
            "macos" if !cmd.args.iter().any(|a| a.starts_with("steam://")) => {
                cmd.program = "open".into();
                cmd.args = vec![format!("steam://rungameid/{}", cfg.game.steam_appid)];
            }
            _ => {}
        }
    }
    cmd
}

/// The game's arguments when the launcher runs its exe through Proton itself (Linux): Elite.exe takes its own from
/// Elite.launchconfig, DOW2.exe for the vanilla game gets VANILLA_ARGS.
#[cfg_attr(not(target_os = "linux"), allow(dead_code))]
pub(crate) fn proton_args(vanilla: bool) -> Vec<String> {
    if vanilla { VANILLA_ARGS.iter().map(|a| a.to_string()).collect() } else { Vec::new() }
}

/// Start the game Play is for: Elite's command of launch.<os> (the version's own exe/args), or DOW2.exe for vanilla.
pub(crate) fn launch(dir: &std::path::Path, cfg: &LauncherConfig, vanilla: bool, guard: Value) -> Result<Value, String> {
    let (dir, cfg) = (dir.to_path_buf(), cfg.clone());
    let installed = update::Game::new(&dir).load_state();
    let cmd = launch_cmd(&cfg, &installed, os_name(), vanilla);
    // путь к игре без «длинного» префикса \\?\ (canonicalize на Windows его добавляет, а с ним Windows не принимает «/»)
    let game = dir.to_string_lossy().to_string();
    let game = game.strip_prefix(r"\\?\").unwrap_or(&game).to_string();
    let sub = |x: &str| {
        let v = x.replace("{game}", &game);
        if cfg!(windows) { v.replace('/', "\\") } else { v }
    };
    // Linux: `steam -applaunch 56400` starts plain DOW2.exe under Proton (vanilla, not Elite). Run Elite.exe (or the
    // version's own exe) through the Proton Steam uses for the game instead; anything missing -> the old way + the hint.
    #[cfg(target_os = "linux")]
    if is_steam_applaunch(&cmd) {
        let exe_name = if vanilla { "DOW2.exe".to_string() } else { cfg.channels.iter().find(|c| c.id == installed.channel && c.version == installed.version)
            .map(|c| c.exe.clone()).filter(|e| !e.is_empty()).unwrap_or_else(|| "Elite.exe".into()) };
        let exe = dir.join(&exe_name);
        match elite_core::proton::plan(&dir, cfg.game.steam_appid) {
            Ok(run) if exe.is_file() => {
                ensure_steam_running();
                c_log(&format!("launch: {} run {}{} (prefix {}, runtime {})", run.proton.display(), exe.display(),
                               proton_args(vanilla).iter().map(|a| format!(" {a}")).collect::<String>(), run.compat_data.display(),
                               run.runtime.as_ref().map(|p| p.display().to_string()).unwrap_or_else(|| "none".into())));
                // 1.4.1: Proton's own output goes to proton.log; how it ended goes to community.log (Send logs carries it) -
                // 1.4.0 showed only "launch:", never why the game did not come up
                let plog = data_dir().join("proton.log");
                let mut c = run.command(&exe, &proton_args(vanilla), &dir);
                if let Ok(f) = std::fs::File::create(&plog) {
                    if let Ok(f2) = f.try_clone() { c.stdout(f).stderr(f2); }
                }
                return match c.spawn() {
                    Ok(mut child) => {
                        std::thread::spawn(move || {
                            let t0 = std::time::Instant::now();
                            let st = child.wait();
                            let secs = t0.elapsed().as_secs();
                            let tail = std::fs::read_to_string(&plog).unwrap_or_default();
                            let tail: Vec<&str> = tail.lines().filter(|l| !l.trim().is_empty()).collect();
                            let tail = tail[tail.len().saturating_sub(8)..].join(" | ");
                            match st {
                                Ok(s) if secs < 60 => c_log(&format!("launch: Proton ended after {secs} s ({s}) - the game did not run; proton.log: {}", tail.chars().take(1500).collect::<String>())),
                                Ok(s) => c_log(&format!("launch: the game ended after {secs} s ({s})")),
                                Err(e) => c_log(&format!("launch: cannot wait for Proton: {e}")),
                            }
                        });
                        Ok(guard)
                    }
                    Err(e) => Err(format!("cannot start {} through Proton: {e}", exe_name)),
                };
            }
            Ok(_) => c_log(&format!("launch: {} not in the game folder - steam -applaunch", exe_name)),
            Err(e) => c_log(&format!("launch: no Proton run ({e}) - steam -applaunch")),
        }
    }
    #[cfg(target_os = "macos")]
    let guard = match mac_launch(&dir, &cfg, vanilla, guard) {
        Ok(g) => return Ok(g),
        Err(g) => g,
    };
    let program = sub(&cmd.program);
    c_log(&format!("launch: {}{}", program, cmd.args.iter().map(|a| format!(" {}", sub(a))).collect::<String>()));
    let mut c = std::process::Command::new(&program);
    c.args(cmd.args.iter().map(|a| sub(a))).current_dir(&game);
    match c.spawn() {
        Ok(_) => Ok(guard),
        // 740 = программа требует прав администратора (Elite.exe так помечен). Обычный запуск такого не умеет,
        // а оболочка Windows умеет: `start` показывает обычный запрос UAC и задаёт рабочую папку.
        #[cfg(windows)]
        Err(e) if e.raw_os_error() == Some(740) => {
            use std::os::windows::process::CommandExt;
            let mut sh = std::process::Command::new("cmd");
            sh.args(["/C", "start", "", "/D", &game, &program]).args(cmd.args.iter().map(|a| sub(a)));
            sh.creation_flags(0x0800_0000); // CREATE_NO_WINDOW — без мигающей консоли
            // 1.4.10: `start` ends with an error code when the player says No to the UAC question - a Join waiting for this
            // game hears it (siritos 05.11: it waited on, and the game he started himself later got the old Join)
            sh.spawn().map(|mut ch| {
                std::thread::spawn(move || {
                    if let Ok(st) = ch.wait() { if !st.success() { c_log(&format!("launch: the start as administrator did not happen ({st})")); roomjoin::note_launch_failed(); } }
                });
                guard
            }).map_err(|e2| format!("cannot start {program} as administrator: {e2}"))
        }
        Err(e) => Err(format!("cannot start {program}: {e}")),
    }
}

/// macOS (Feral's native game): the launcher runs the .app's binary itself - not through open/sh/Steam, which drop
/// DYLD_INSERT_LIBRARIES - with crossplay_fix (+ the other dylibs of mac_addons on for this game), steam_appid.txt next to
/// the binary (else the game restarts itself through Steam and loses the dylibs) and the Steam client running (the game
/// signs in through it; 16.11.2026: the launcher starts Steam itself and the game when Steam is up). The game's own output
/// goes to mac_game.log in the launcher's folder (Send logs takes it).
/// Ok = started (the guard tells the player what was not as it should be); Err(guard + the reason) = no crossplay_fix or
/// no game binary: the caller starts the game the old way (`open steam://rungameid/56400`) without our patches.
#[cfg(target_os = "macos")]
pub(crate) fn mac_launch(dir: &std::path::Path, cfg: &LauncherConfig, vanilla: bool, mut guard: Value) -> Result<Value, Value> {
    use elite_core::macos;
    let home = dirs::home_dir().unwrap_or_default();
    let addons = macos::addons_dir(&home);
    let appid = cfg.game.steam_appid;
    let mut warn: Vec<String> = Vec::new();
    let ids: Vec<String> = serde_json::from_value(guard["mac_addons"].clone()).unwrap_or_default();
    let (l, w) = match macos::plan_with(dir, vanilla, macos::dylibs_of(&addons, &ids), appid) {
        Ok(v) => v,
        Err(why) => {
            c_log(&format!("launch: macOS - {} - through Steam, without our patches",
                           if why.is_some() { format!("no {}.dylib in {}", macos::CROSSPLAY, addons.display()) } else { "the game's .app not found".into() }));
            warn.push("no_dylib".into());
            guard["mac_warn"] = json!(warn);
            return Err(guard);
        }
    };
    for x in w {
        if let macos::Warn::GameVersion(v) = x { warn.push("game_version".into()); guard["mac_game_version"] = json!(v); }
    }
    if let Err(e) = macos::write_steam_appid(&l.cwd, appid) { c_log(&format!("launch: cannot write steam_appid.txt: {e}")); }
    let steam_up = steam_running();
    if !steam_up {
        if game::steam_installed() { warn.push("steam_starting".into()); } else { warn.push("no_steam".into()); }
    }
    c_log(&format!("launch: {}{} (in {}; {}){}", l.program.display(), l.args.iter().map(|a| format!(" {a}")).collect::<String>(), l.cwd.display(),
                   l.env.iter().map(|(k, v)| format!("{k}={v}")).collect::<Vec<_>>().join(" "), if steam_up { "" } else { " - Steam is not running" }));
    let glog = data_dir().join("mac_game.log");
    let spawn = move || -> std::io::Result<std::process::Child> {
        let mut c = std::process::Command::new(&l.program);
        c.args(&l.args).current_dir(&l.cwd).envs(l.env.iter().map(|(k, v)| (k.as_str(), v.as_str())));
        if let Ok(f) = std::fs::File::create(&glog) {
            if let Ok(f2) = f.try_clone() { c.stdout(f).stderr(f2); }
        }
        c.spawn()
    };
    let watch = |mut child: std::process::Child| {
        std::thread::spawn(move || {
            let t0 = std::time::Instant::now();
            let st = child.wait();
            let secs = t0.elapsed().as_secs();
            let tail = std::fs::read_to_string(data_dir().join("mac_game.log")).unwrap_or_default();
            let tail: Vec<&str> = tail.lines().filter(|l| !l.trim().is_empty()).collect();
            let tail = tail[tail.len().saturating_sub(8)..].join(" | ");
            let st = st.map(|s| s.to_string()).unwrap_or_else(|e| e.to_string());
            if secs < 60 { c_log(&format!("launch: the game ended after {secs} s ({st}) - it did not run; mac_game.log: {}", tail.chars().take(1500).collect::<String>())); }
            else { c_log(&format!("launch: the game ended after {secs} s ({st})")); }
        });
    };
    guard["mac_warn"] = json!(warn);
    if !steam_up {
        // Steam first, the game when it is up: in the background - Play (a command on the window's thread) must not wait
        std::thread::spawn(move || {
            start_steam_mac();
            match spawn() {
                Ok(child) => watch(child),
                Err(e) => { c_log(&format!("launch: cannot start the game: {e}")); roomjoin::note_launch_failed(); }
            }
        });
        return Ok(guard);
    }
    match spawn() {
        Ok(child) => { watch(child); Ok(guard) }
        Err(e) => {
            c_log(&format!("launch: cannot start the game directly: {e} - through Steam"));
            warn.push("direct_failed".into());
            guard["mac_warn"] = json!(warn);
            Err(guard)
        }
    }
}

/// macOS: start the Steam client (Steam.app, in the background) and wait until it is up and has had a moment to sign in:
/// up to 60 s for steam_osx, then 10 s more.
#[cfg(target_os = "macos")]
pub(crate) fn start_steam_mac() {
    c_log("launch: Steam is not running - starting it");
    let ok = std::process::Command::new("open").args(["-g", "-a", "Steam"]).status().map(|s| s.success()).unwrap_or(false)
        || std::process::Command::new("open").args(["-g", "steam://open/main"]).status().map(|s| s.success()).unwrap_or(false);
    if !ok { c_log("launch: cannot start Steam (open -a Steam failed)"); return; }
    for _ in 0..120 {
        std::thread::sleep(std::time::Duration::from_millis(500));
        if steam_running() { c_log("launch: Steam is up"); std::thread::sleep(std::time::Duration::from_secs(10)); return; }
    }
    c_log("launch: Steam did not come up in 60 s - starting the game anyway");
}

/// macOS: the window's status line (16.11.2026) - Steam found (Steam.app or its folder) and running, the game's folder and
/// version (the dylibs are for SUPPORTED_VERSION), crossplay_fix installed. Also written into Send logs.
pub(crate) fn mac_status(dir: Option<&std::path::Path>, cfg: &LauncherConfig) -> Value {
    use elite_core::macos;
    let home = dirs::home_dir().unwrap_or_default();
    let f = macos::detect(&home, &macos::app_dirs(&home), &cfg.game.folder);
    let app = dir.and_then(macos::mac_app);
    let crossplay = cfg.components.iter().filter(|c| c.for_os("macos") && c.id.starts_with("crossplay"))
        .map(|c| update::Game::component(macos::addon_dir(&mac_addons_root(), &c.id), &c.id).load_state().version)
        .find(|v| !v.is_empty()).unwrap_or_default();
    json!({"steam": f.steam(), "steam_running": steam_running(), "steam_root": f.steam_root, "steam_app": f.steam_app,
           "libraries": f.libraries, "found": f.game, "app": app, "version": app.as_deref().and_then(macos::game_version).unwrap_or_default(),
           "supported": macos::SUPPORTED_VERSION, "crossplay": crossplay})
}

/// Linux: DoW2's Steam login goes through the Steam client, which must be running before the game starts under Proton.
#[cfg(target_os = "linux")]
pub(crate) fn ensure_steam_running() {
    let running = || std::process::Command::new("pgrep").args(["-x", "steam"]).output().map(|o| o.status.success()).unwrap_or(false)
        || std::process::Command::new("pgrep").args(["-f", "steamwebhelper"]).output().map(|o| o.status.success()).unwrap_or(false);
    if running() { return; }
    c_log("launch: Steam is not running - starting it");
    let _ = std::process::Command::new("steam").arg("-silent").spawn();
    for _ in 0..40 { std::thread::sleep(std::time::Duration::from_millis(500)); if running() { std::thread::sleep(std::time::Duration::from_secs(5)); return; } }
}

#[cfg(test)]
mod launch_cmd_tests {
    use super::*;
    use elite_core::config::LaunchCmd;

    fn cfg() -> LauncherConfig {
        let mut c = LauncherConfig::default();
        c.launch.windows = LaunchCmd { program: "{game}/Elite.exe".into(), args: vec![], ..Default::default() };
        c.launch.linux = LaunchCmd { program: "steam".into(), args: vec!["-applaunch".into(), "56400".into()], ..Default::default() };
        c
    }
    fn line(c: &LaunchCmd) -> String { std::iter::once(c.program.clone()).chain(c.args.iter().cloned()).collect::<Vec<_>>().join(" ") }

    #[test]
    fn vanilla_starts_without_movies() {
        let (cfg, st) = (cfg(), update::State::default());
        // Windows: DOW2.exe itself, -nomovies, no -modname
        assert_eq!(line(&launch_cmd(&cfg, &st, "windows", true)), "{game}/DOW2.exe -nomovies");
        // Linux through Steam: Steam hands what follows the appid to the game
        assert_eq!(line(&launch_cmd(&cfg, &st, "linux", true)), "steam -applaunch 56400 -nomovies");
        // Linux through the game's Proton (the usual way): DOW2.exe gets the same
        assert_eq!(proton_args(true), vec!["-nomovies".to_string()]);
        // a catalog that already says -nomovies does not get it twice
        let mut c2 = cfg.clone(); c2.launch.linux.args.push("-nomovies".into());
        assert_eq!(line(&launch_cmd(&c2, &st, "linux", true)), "steam -applaunch 56400 -nomovies");
    }

    #[test]
    fn mac_vanilla_falls_back_to_steam() {
        let (mut cfg, st) = (cfg(), update::State::default());
        // the catalog's old launch.macos (CrossOver: open Elite.exe) is no native start: the game through Steam instead
        cfg.launch.macos = LaunchCmd { program: "open".into(), args: vec!["{game}/Elite.exe".into()], ..Default::default() };
        assert_eq!(line(&launch_cmd(&cfg, &st, "macos", true)), "open steam://rungameid/56400");
        // a catalog's own Steam start stays
        cfg.launch.macos = LaunchCmd { program: "open".into(), args: vec!["steam://run/56400".into()], ..Default::default() };
        assert_eq!(line(&launch_cmd(&cfg, &st, "macos", true)), "open steam://run/56400");
        assert!(mac_vanilla_only("macos") && !mac_vanilla_only("windows") && !mac_vanilla_only("linux"));
    }

    #[test]
    fn elite_stays_as_it_was() {
        let (cfg, st) = (cfg(), update::State::default());
        assert_eq!(line(&launch_cmd(&cfg, &st, "windows", false)), "{game}/Elite.exe");
        assert_eq!(line(&launch_cmd(&cfg, &st, "linux", false)), "steam -applaunch 56400");
        assert!(proton_args(false).is_empty(), "Elite.exe takes its arguments from Elite.launchconfig");
        // an old version started as a mod keeps its own args; vanilla never takes them
        let mut c2 = cfg.clone();
        let mut ch = elite_core::config::Channel::default();
        ch.id = "v2.3".into(); ch.version = "2.3".into(); ch.args = vec!["-modname".into(), "Elite".into()];
        c2.channels.push(ch);
        let st2 = update::State { channel: "v2.3".into(), version: "2.3".into(), ..Default::default() };
        assert_eq!(line(&launch_cmd(&c2, &st2, "windows", false)), "{game}/Elite.exe -modname Elite");
        assert_eq!(line(&launch_cmd(&c2, &st2, "windows", true)), "{game}/DOW2.exe -nomovies");
        // what RoomJoin reads off the running game still says vanilla
        assert_eq!(roomjoin::kind_of_cmdline(r#""C:\Games\DOW2.exe" -nomovies"#), "vanilla");
    }
}
