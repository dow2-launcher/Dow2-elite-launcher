//! The launcher's own update (the Tauri updater, GitHub Releases).
//! Split out of main.rs (1.6.17): the items as they were; main.rs keeps the app's state, settings, config and main().
use super::*;

/// Can this copy replace itself? Not the portable zip: there is no installer next to it, and the Windows
/// update (the NSIS installer) would put a second copy into AppData instead.
pub(crate) fn self_update_supported() -> bool {
    let Ok(exe) = std::env::current_exe() else { return false };
    if cfg!(windows) {
        exe.parent().is_some_and(|d| d.join("uninstall.exe").is_file())
    } else if cfg!(target_os = "macos") {
        exe.to_string_lossy().contains(".app/Contents/MacOS/")
    } else {
        // AppImage, or the .deb in /usr/bin (the updater asks for the password to install it)
        std::env::var_os("APPIMAGE").is_some() || exe.starts_with("/usr")
    }
}

/// Is a newer launcher published (updater.json on the latest GitHub Release, see build.yml)?
/// {version, notes} or null; offline or no release yet is not an error for the player.
#[tauri::command]
pub async fn launcher_check(app: AppHandle) -> Option<Value> {
    if !self_update_supported() {
        return None;
    }
    // 1.5.1 (owner 09.11.2026): the launcher comes from GitHub Releases first - its download counters are the launcher's
    // statistics; our hosts after it. GitHub not answering from here in 8 s (blocked in places): our hosts only, as before.
    let gh = tauri::async_runtime::spawn_blocking(github_reachable).await.unwrap_or(false);
    let upd = launcher_updater(&app, gh)?.check().await.ok()??;
    let info = json!({"version": upd.version, "notes": upd.body});
    *app.state::<App>().launcher_update.lock().unwrap() = Some(upd);
    Some(info)
}

/// Does GitHub Releases answer from here: the latest updater.json in 8 s (a redirect to githubusercontent, followed)?
pub(crate) fn github_reachable() -> bool {
    HTTP.get(GITHUB_UPDATER).timeout(Duration::from_secs(8)).call().map(|r| r.status() == 200).unwrap_or(false)
}
/// The self-update's endpoints: GitHub Releases first when it answers (1.5.1, owner 09.11.2026: its download counters are the
/// launcher's statistics), then our hosts in the shared order - the active host first (reach.rs; each one's updater.json links
/// its own copies of the files). A build without our hosts keeps tauri.conf.json's.
pub(crate) fn launcher_updater(app: &AppHandle, github: bool) -> Option<tauri_plugin_updater::Updater> {
    let mut urls: Vec<tauri::Url> = Vec::new();
    if github { urls.extend(tauri::Url::parse(GITHUB_UPDATER).ok()); }
    urls.extend(reach::api_hosts().iter().filter_map(|h| tauri::Url::parse(&format!("{h}/elite/dl/updater.json")).ok()));
    let b = app.updater_builder();
    let b = if urls.is_empty() { b } else { b.endpoints(urls).ok()? };
    // 1.6.30: the plugin's own install (the fallback of launcher_install) replaces this copy where it is too - /D= last
    let d: Vec<String> = update_dir().as_deref().and_then(elite_core::selfupd::nsis_dir).map(|d| format!("/D={d}")).into_iter().collect();
    b.installer_args(d).build().ok()
}
/// 1.6.30 (TvangeS 19.11.2026: "updated three times, after a restart it is the old one again"): the running copy's folder for the
/// installer's /D= (elite_core::selfupd: Tauri's installer otherwise takes the folder of the last install from the registry).
/// None when this user can not write there (Program Files: the per-user installer keeps its own pick, as before) or on Linux / macOS.
pub(crate) fn update_dir() -> Option<String> {
    if !cfg!(windows) { return None; }
    let dir = std::env::current_exe().ok()?.parent()?.to_path_buf();
    let probe = dir.join(".elite-update-probe");
    std::fs::write(&probe, b"").ok()?;
    let _ = std::fs::remove_file(&probe);
    Some(dir.to_string_lossy().into_owned())
}
/// The launcher's download progress for the window (the footer's bar), counted from 0.
pub(crate) fn launcher_progress(app: &AppHandle) -> impl FnMut(usize, Option<u64>) + Send + 'static {
    let h = app.clone();
    let mut done = 0u64;
    move |n: usize, total: Option<u64>| {
        done += n as u64;
        let _ = h.emit("launcher_progress", json!({"done": done, "total": total}));
    }
}
/// The new launcher's file from where its updater.json points; from GitHub and failing there (blocked, cut half-way):
/// again from our hosts, whose updater.json links their own copy. The signature is checked by the plugin either way.
pub(crate) async fn launcher_download(app: &AppHandle, upd: tauri_plugin_updater::Update) -> Result<(tauri_plugin_updater::Update, Vec<u8>), String> {
    let from_gh = upd.download_url.host_str().is_some_and(|h| h.ends_with("github.com") || h.ends_with("githubusercontent.com"));
    match upd.download(launcher_progress(app), || {}).await {
        Ok(bytes) => Ok((upd, bytes)),
        Err(e) if from_gh => {
            c_log(&format!("launcher update: GitHub failed ({e}), from our hosts"));
            let alt = launcher_updater(app, false).ok_or_else(|| e.to_string())?.check().await.map_err(|e| e.to_string())?
                .ok_or("no launcher update on our hosts")?;
            let bytes = alt.download(launcher_progress(app), || {}).await.map_err(|e| e.to_string())?;
            Ok((alt, bytes))
        }
        Err(e) => Err(e.to_string()),
    }
}

/// Download the new launcher, check its signature, install it and start it. On Windows the installer
/// closes this window itself; elsewhere we restart into the new copy.
#[tauri::command]
pub async fn launcher_install(app: AppHandle) -> Result<(), String> {
    ensure_game_closed(&app.state::<App>())?;   // the installer closes the launcher; never in the middle of a game
    let upd = app.state::<App>().launcher_update.lock().unwrap().clone().ok_or("no launcher update found")?;
    let (upd, bytes) = launcher_download(&app, upd).await?;
    #[cfg(windows)]
    {
        // The NSIS installer checks first thing that the launcher is closed, and gives up with "Failed to close Elite
        // Launcher" when it catches it half-way through closing (siritos 29.10: the plugin starts the installer and only
        // then exits). So: download (the signature is checked there), then the installer is started 3 s after this
        // process is gone, with the plugin's own arguments (passive, update, restart). The plugin's way if that fails.
        // 1.6.30: + /D=<this copy's folder> (elite_core::selfupd) - the update replaces the running copy where it is, not the
        // registry's folder; the path and the arguments go through the environment (cmd's !delayed! expansion: & % ^ in a folder)
        let path = std::env::temp_dir().join(format!("EliteLauncher-{}-setup.exe", upd.version));
        if std::fs::write(&path, &bytes).is_ok() {
            use std::os::windows::process::CommandExt;
            let args = elite_core::selfupd::nsis_update_args(update_dir().as_deref());
            c_log(&format!("launcher update: {} {args}", path.display()));
            let started = std::process::Command::new("cmd").arg("/V:ON").arg("/C").raw_arg(elite_core::selfupd::CMD_LINE)
                .env("ELITE_SETUP", &path).env("ELITE_SETUP_ARGS", &args)
                .creation_flags(0x0800_0000 /* CREATE_NO_WINDOW */ | 0x0000_0200 /* CREATE_NEW_PROCESS_GROUP */)
                .stdin(std::process::Stdio::null()).stdout(std::process::Stdio::null()).stderr(std::process::Stdio::null())
                .spawn().is_ok();
            // 1.6.32 (players: "two launchers"): the tray's icon is taken away first - a process ended by exit() leaves its icon in
            // the tray until the mouse passes over it, next to the new launcher's own
            if started { app.cleanup_before_exit(); std::process::exit(0); }
        }
        upd.install(bytes).map_err(|e| e.to_string())?;
        app.restart()
    }
    #[cfg(not(windows))]
    {
        upd.install(bytes).map_err(|e| e.to_string())?;
        app.restart()
    }
}

/// Everything the window needs to draw itself.
/// The launcher itself sits in the game folder (or below it): its files there break the game (crash while a match loads).
pub(crate) fn launcher_in_game_dir() -> bool {
    let Ok(exe) = std::env::current_exe() else { return false };
    exe.ancestors().skip(1).take(3).any(|d| d.join("DOW2.exe").is_file())
}
