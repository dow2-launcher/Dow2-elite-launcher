//! Elite in the game folder: the folder, its update, the removal of everything.
//! Split out of main.rs (1.6.17): the items as they were; main.rs keeps the app's state, settings, config and main().
use super::*;

/// Remove Elite completely: the mod, every add-on, the launcher's files in the game folder, then Steam checks the game
/// files and restores what Elite replaced - a clean vanilla game to start over from.
#[tauri::command]
pub fn uninstall_elite(app: State<'_, App>, handle: AppHandle) -> Result<Value, String> {
    ensure_game_closed(&app)?;
    if app.busy.load(Ordering::Relaxed) { return Err("files are being updated, wait a few seconds".into()); }
    let dir = game_dir(&app).ok_or("game folder not found")?;
    if !dir.join("DOW2.exe").is_file() { return Err("this is not the game folder".into()); }
    let cfg = app.config.lock().unwrap().clone().unwrap_or_default();
    let mut files = 0usize;
    for c in &cfg.components { files += update::Game::component(&dir, &c.id).uninstall().unwrap_or(0); restore_originals(&dir, &c.id); }
    for id in update::Game::vanilla_ids(&dir) { files += update::Game::vanilla_component(&dir, &id).uninstall().unwrap_or(0); }
    files += update::Game::vanilla_loader(&dir).uninstall().unwrap_or(0);
    files += update::Game::new(&dir).uninstall().map_err(|e| e.to_string())?;
    // what Elite and the add-ons leave next to the game: their folders, launch configs, the stand-alone patch loader
    let mut gone = Vec::new();
    for d in ["Elite", "Elite_bin", "Elite_bin_Test", "Elite_Test", "Elite_DLLs", "dow2-patches", ".elite_launcher"] {
        let p = dir.join(d);
        if p.is_dir() && std::fs::remove_dir_all(&p).is_ok() { gone.push(d.to_string()); }
    }
    if let Ok(rd) = std::fs::read_dir(&dir) {
        for e in rd.flatten() {
            let n = e.file_name().to_string_lossy().to_string(); let l = n.to_ascii_lowercase();
            let elite_file = l.starts_with("elite") && (l.ends_with(".exe") || l.ends_with(".module") || l.contains(".launchconfig") || l.ends_with(".config")
                || l.ends_with(".lua") || l.ends_with(".shells") || l.ends_with(".cullsphere") || l.ends_with(".bmp") || l.ends_with(".ico"));
            let loader = l == "winmm.dll" && std::fs::read(e.path()).map(|b| b.windows(12).any(|w| w == b"dow2-patches")).unwrap_or(false);
            if (elite_file || loader) && e.path().is_file() && std::fs::remove_file(e.path()).is_ok() { gone.push(n); }
        }
    }
    {
        let mut s = app.settings.lock().unwrap();
        s.channel = None; s.prev_channel = None; s.game_mode = String::new(); save_settings(&s);
    }
    // Steam puts back the original files Elite had replaced (and the ones we just removed if they were the game's)
    let _ = handle.opener().open_url("steam://validate/56400", None::<&str>);
    Ok(json!({"files": files, "removed": gone}))
}

#[tauri::command]
pub async fn pick_game_dir(app: AppHandle) -> Result<Value, String> {
    let picked = app.dialog().file().blocking_pick_folder();
    let st = app.state::<App>();
    if let Some(p) = picked.and_then(|p| p.into_path().ok()) {
        let g = st.config.lock().unwrap().clone().unwrap_or_default().game;
        let marker = g.marker;
        // macOS: the game's .app, a Steam library, its steamapps or common picked instead of the game folder - the game there
        let p = if cfg!(target_os = "macos") { elite_core::macos::resolve_picked(&p, &g.folder).unwrap_or(p) } else { p };
        if !game::is_game_dir(&p, &marker) {
            return Err(format!("{} not found in this folder", game::marker_shown(&marker)));
        }
        let mut s = st.settings.lock().unwrap();
        s.game_dir = Some(p);
        save_settings(&s);
    }
    Ok(get_status(app.state::<App>()))
}

#[tauri::command]
pub fn open_game_dir(app: State<'_, App>, handle: AppHandle) -> Result<(), String> {
    let d = game_dir(&app).ok_or("game folder not found")?;
    handle.opener().open_path(d.to_string_lossy(), None::<&str>).map_err(|e| e.to_string())
}

/// Install / update / switch version / repair in a background thread; progress goes to the window as events.
#[tauri::command]
pub fn start_update(app: AppHandle, repair: bool, components_only: Option<bool>) -> Result<(), String> {
    let components_only = components_only.unwrap_or(false);
    let st = app.state::<App>();
    ensure_game_closed(&st)?;
    if st.busy.swap(true, Ordering::SeqCst) {
        return Err("already running".into());
    }
    let cfg = st.config.lock().unwrap().clone();
    let Some(cfg) = cfg else {
        st.busy.store(false, Ordering::SeqCst);
        return Err("no connection to the update server yet".into());
    };
    let Some(dir) = game_dir(&st) else {
        st.busy.store(false, Ordering::SeqCst);
        return Err("game folder not found".into());
    };
    let g = update::Game::new(&dir);
    let channel = current_channel(&st, &cfg, &g.load_state());
    let version = cfg.channels.iter().find(|c| c.id == channel).map(|c| c.version.clone()).unwrap_or_default();
    let s = st.settings.lock().unwrap().clone();
    let mut m = mirrors(&s, Some(&cfg));
    *st.cancel.lock().unwrap() = Some(m.cancel.clone());
    {
        let appn = app.clone();
        m.on_status = Some(Box::new(move |msg| { let _ = appn.emit("net", msg); }));
    }
    st.last_error.lock().unwrap().clear();
    let app2 = app.clone();
    std::thread::spawn(move || {
        let _ = app2.emit("net", "start".to_string());
        let mut last = Instant::now() - Duration::from_secs(1);
        let mut emit = |p: &update::Progress| {
            if p.phase == "done" || last.elapsed() > Duration::from_millis(120) {
                let _ = app2.emit("progress", p);
                last = Instant::now();
            }
        };
        let r = (if components_only {
            Ok(update::Summary::default())
        } else {
            update::load_manifest(&g, &m, &version).and_then(|man| {
                enough_space(&dir, update::switch_cost(&g, None, &man))?;
                update::apply(&g, &m, &man, &update::Options { verify_all: repair, cache_limit: s.cache_mb.unwrap_or(DEFAULT_CACHE_MB) << 20, channel: channel.clone() }, &mut emit)
            })
        })
        .and_then(|sum| sync_components(&dir, &cfg, &s, &m, &mut emit).map(|_| sum));
        compute_costs(&app2);
        let st = app2.state::<App>();
        if r.is_ok() { remember_mirror(&st, m.current_base()); }
        if !m.cancel.load(Ordering::Relaxed) { data_note(&m, r.is_ok()); }   // a cancel says nothing about the mirrors
        st.busy.store(false, Ordering::SeqCst);
        let payload = match r {
            Ok(sum) => json!({"ok": true, "summary": sum}),
            Err(e) => {
                *st.last_error.lock().unwrap() = e.to_string();
                json!({"ok": false, "error": e.to_string(), "cancelled": matches!(e, update::Error::Cancelled)})
            }
        };
        let _ = app2.emit("update_done", payload);
    });
    Ok(())
}

#[tauri::command]
pub fn cancel_update(app: State<'_, App>) {
    if let Some(c) = app.cancel.lock().unwrap().as_ref() {
        c.store(true, Ordering::SeqCst);
    }
}
