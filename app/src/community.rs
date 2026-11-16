//! The community: Steam sign-in, the players' chat, who has the launcher open (/ladder/api/c/*).
//! Split out of main.rs (1.6.17): the items as they were; main.rs keeps the app's state, settings, config and main().
use super::*;

// ---------- Community: Steam sign-in, the players' chat, who has the launcher open ----------
// The ladder service (/ladder/api/c/*, ladder/community.py in dow2-ladder) on the log hosts. Reading is open; writing needs
// a Steam sign-in: the browser goes through Steam's own OpenID page (the launcher never sees the password), the server
// checks the answer with Steam and hands the launcher a session token for the random nonce it made.
pub(crate) fn c_profile(s: &Settings) -> Value {
    let local = elite_core::game::steam_local_user();
    json!({"signed_in": !s.c_token.is_empty(), "steam": s.c_steam, "name": s.c_name, "avatar": s.c_avatar, "configured": !fb_hosts().is_empty(),
           "local_name": local.as_ref().map(|l| l.1.clone()).unwrap_or_default(), "local_found": local.is_some()})
}

pub(crate) fn c_save(app: &AppHandle, v: &Value) -> Value {
    let st = app.state::<App>();
    let mut s = st.settings.lock().unwrap();
    s.c_token = v["token"].as_str().unwrap_or("").into();
    s.c_steam = v["steam"].as_str().unwrap_or("").into();
    s.c_name = v["name"].as_str().unwrap_or("").into();
    s.c_avatar = v["avatar"].as_str().unwrap_or("").into();
    save_settings(&s);
    STREAM_GEN.fetch_add(1, Ordering::SeqCst);
    c_profile(&s)
}

/// POST /ladder/api/c/local: the Steam account of this computer + the hashed machine id (+ the token of a browser
/// sign-in, which binds this computer to the account). Ok(answer) whatever it says; Err only if no server answered.
pub(crate) fn c_local_call(token: &str) -> Result<Value, String> {
    let Some((steam, name)) = elite_core::game::steam_local_user() else {
        c_log("local: no Steam account found on this computer (loginusers.vdf / ActiveUser)");
        return Ok(json!({"ok": false, "no_steam": true, "error": "no Steam account found on this computer"}));
    };
    let device = elite_core::game::machine_id();
    c_log(&format!("local: steam {steam} name {name:?} device {}", if device.is_empty() { "-" } else { &device[..8] }));
    let body = json!({"steam": steam, "name": name, "device": device, "token": token, "launcher": LAUNCHER_VERSION, "os": os_name()}).to_string();
    let mut last = "the server is not configured in this build".to_string();
    for h in fb_hosts() {
        match HTTP.post(&format!("{h}/ladder/api/c/local")).timeout(Duration::from_secs(20)).set("Content-Type", "application/json").send_string(&body) {
            Ok(r) => {
                let v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).unwrap_or_default();
                c_log(&format!("local: {h} -> ok={} {}", v["ok"], v["error"].as_str().unwrap_or("")));
                return Ok(v);
            }
            Err(e) => { c_log(&format!("local: {h} failed: {e}")); api_err(&h, &e); last = e.to_string(); }
        }
    }
    Err(last)
}

/// Sign in with the Steam account of this computer, no browser. {need_browser: true} when the account is bound to
/// another computer; {no_steam: true} when Steam has no logged-in account here.
#[tauri::command]
pub async fn c_login_local(app: AppHandle) -> Result<Value, String> {
    let app2 = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let v = c_local_call("")?;
        if v["ok"].as_bool() == Some(true) { return Ok(c_save(&app2, &v)); }
        Ok(v)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn c_status(app: State<'_, App>) -> Value { c_profile(&app.settings.lock().unwrap()) }

/// The sign-in being waited for: a new click or Cancel bumps it, and the older wait stops by itself, so the button
/// never stays grey for minutes when the browser tab was closed.
pub(crate) static LOGIN_GEN: AtomicU64 = AtomicU64::new(0);

#[tauri::command]
pub fn c_login_cancel() { LOGIN_GEN.fetch_add(1, Ordering::SeqCst); }

#[tauri::command]
pub async fn c_login(app: AppHandle) -> Result<Value, String> {
    let host = fb_hosts().into_iter().next().ok_or("the server is not configured in this build")?;
    let attempt = LOGIN_GEN.fetch_add(1, Ordering::SeqCst) + 1;
    let mut b = [0u8; 24];
    getrandom::getrandom(&mut b).map_err(|e| e.to_string())?;
    let nonce: String = b.iter().map(|x| format!("{x:02x}")).collect();
    c_log(&format!("browser: opening {host}/ladder/api/c/login (nonce {})", &nonce[..8]));
    if let Err(e) = app.opener().open_url(format!("{host}/ladder/api/c/login?nonce={nonce}"), None::<&str>) { c_log(&format!("browser: could not open: {e}")); return Err(e.to_string()); }
    let app2 = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        // the player signs in in the browser: ask for the token every 2 s, for up to 5 minutes
        for _ in 0..150 {
            std::thread::sleep(Duration::from_secs(2));
            if LOGIN_GEN.load(Ordering::SeqCst) != attempt { c_log("browser: cancelled (Cancel or a new click)"); return Err("cancelled".to_string()); }
            for h in fb_hosts() {
                let r = match HTTP.get(&format!("{h}/ladder/api/c/claim?nonce={nonce}")).timeout(Duration::from_secs(10)).call() {
                    Ok(r) => r,
                    Err(e) => { c_log(&format!("browser: claim at {h} failed: {e}")); api_err(&h, &e); continue; }
                };
                let v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).unwrap_or_default();
                if v["ok"].as_bool() == Some(true) {
                    c_log(&format!("browser: signed in as {}", v["steam"].as_str().unwrap_or("")));
                    let prof = c_save(&app2, &v);
                    let _ = c_local_call(v["token"].as_str().unwrap_or(""));   // binds this computer: next time no browser
                    return Ok(prof);
                }
                if let Some(e) = v["error"].as_str() { c_log(&format!("browser: claim error {e}")); return Err(e.to_string()); }
                break;
            }
        }
        c_log("browser: no answer from Steam in 5 minutes (the Steam page did not come back - blocked, closed or not signed in)");
        Err("timeout".to_string())
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn c_logout(app: State<'_, App>) -> Value {
    let mut s = app.settings.lock().unwrap();
    let token = std::mem::take(&mut s.c_token);
    s.c_steam.clear(); s.c_name.clear(); s.c_avatar.clear();
    save_settings(&s);
    STREAM_GEN.fetch_add(1, Ordering::SeqCst);
    let body = json!({"token": token}).to_string();
    std::thread::spawn(move || for h in fb_hosts() {
        if HTTP.post(&format!("{h}/ladder/api/c/logout")).timeout(Duration::from_secs(10)).set("Content-Type", "application/json").send_string(&body).is_ok() { break; }
    });
    c_profile(&s)
}

/// One call to the community API: "msgs?room=ru&limit=100&before=5", "online" and "live" are read (GET); "hello",
/// "say" (with the window's cid), "me" are sent (POST) with the session token added here, so the page never holds it.
#[tauri::command]
pub async fn c_api(app: AppHandle, path: String, body: Option<Value>) -> Result<Value, String> {
    let name = path.split('?').next().unwrap_or("").to_string();
    if !["msgs", "online", "live", "hello", "say", "me"].contains(&name.as_str()) { return Err("unknown call".into()); }
    // the server holds a message up to 30 s for moderation and translation: say waits longer than that
    let secs = if name == "say" { 40 } else { 15 };
    let post = body.map(|mut b| {
        if !b.is_object() { b = json!({}); }
        b["token"] = json!(app.state::<App>().settings.lock().unwrap().c_token.clone());
        b.to_string()
    });
    tauri::async_runtime::spawn_blocking(move || {
        let mut last = "the server is not configured in this build".to_string();
        for h in fb_hosts() {
            let url = format!("{h}/ladder/api/c/{path}");
            let r = match &post {
                Some(b) => HTTP.post(&url).timeout(Duration::from_secs(secs)).set("Content-Type", "application/json").send_string(b),
                None => HTTP.get(&url).timeout(Duration::from_secs(secs)).call(),
            };
            match r {
                Ok(r) => {
                    let mut v = serde_json::from_str::<Value>(&r.into_string().unwrap_or_default()).map_err(|e| e.to_string())?;
                    if name == "msgs" { for m in v["msgs"].as_array().into_iter().flatten() { stream_note(m); } }
                    if name == "live" { v["host"] = json!(h); }
                    return Ok(v);
                }
                Err(e) => { api_err(&h, &e); last = e.to_string(); }
            }
        }
        if name != "msgs" && name != "online" && name != "hello" { c_log(&format!("api {name}: {last}")); }
        Err(last)
    }).await.map_err(|e| e.to_string())?
}
