//! The feedback chat with the developers (/ladder/api/fb/*): the player's random id and chosen name.
//! Split out of main.rs (1.6.17): the items as they were; main.rs keeps the app's state, settings, config and main().
use super::*;

pub(crate) fn fb_uid(app: &App) -> String {
    let mut s = app.settings.lock().unwrap();
    if s.fb_uid.len() < 16 {
        let mut b = [0u8; 18];
        if getrandom::getrandom(&mut b).is_ok() {
            s.fb_uid = b.iter().map(|x| format!("{x:02x}")).collect();
            save_settings(&s);
        }
    }
    s.fb_uid.clone()
}

#[tauri::command]
pub fn fb_info(app: State<'_, App>) -> Value {
    let uid = fb_uid(&app);
    json!({"uid": uid, "name": app.settings.lock().unwrap().fb_name.clone(), "configured": !reach::api_hosts().is_empty()})
}

#[tauri::command]
pub fn fb_set_name(app: State<'_, App>, name: String) {
    let mut s = app.settings.lock().unwrap();
    s.fb_name = name.trim().chars().take(48).collect();
    save_settings(&s);
}

#[tauri::command]
pub async fn fb_send(app: AppHandle, text: String, images: Vec<String>) -> Result<Value, String> {
    let st = app.state::<App>();
    let uid = fb_uid(&st);
    let name = st.settings.lock().unwrap().fb_name.clone();
    let elite = game_dir(&st).map(|d| update::Game::new(d).load_state().version).unwrap_or_default();
    let body = json!({"uid": uid, "name": name, "text": text, "images": images,
                      "launcher": LAUNCHER_VERSION, "os": os_name(), "elite": elite}).to_string();
    // 1.6.20 (SirItos: the developers' chat): pictures take their time on a slow line - 60 s plus 1 s per 200 KB (up to 10 min),
    // not 60 s for 30 MB of photos. The next mirror only when this one did not take the message (no answer, 408 / 429 / 5xx); its
    // own refusal (413 too big, 400) comes back as it is - the same body to every mirror would only be refused again
    let secs = (60 + body.len() as u64 / 200_000).min(600);
    tauri::async_runtime::spawn_blocking(move || {
        let r = reach::call("dev chat send", |host| match HTTP.post(&format!("{host}/ladder/api/fb/send")).timeout(Duration::from_secs(secs))
            .set("Content-Type", "application/json").send_string(&body) {
            Ok(r) => {
                let v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).unwrap_or_default();
                Ok(if v["ok"].as_bool() == Some(true) { Ok(v) } else { Err(v["error"].as_str().unwrap_or("rejected").to_string()) })
            }
            Err(ureq::Error::Status(code, r)) if !matches!(code, 408 | 429 | 500..=599) => {
                let v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).unwrap_or_default();
                Ok(Err(v["error"].as_str().map(String::from).unwrap_or_else(|| format!("status code {code}"))))
            }
            Err(e) => Err(e),
        });
        r.and_then(|x| x)
    }).await.map_err(|e| e.to_string())?
}

/// The conversation; picture links point to the host that answered. 1.6.20 (Malum): `limit` = only its last n messages (the chat
/// opens with the last ~20), `after` = only the messages after that id (then every 20 s only the new ones, not the whole thread).
/// Neither = the whole thread, as before; a ladder without `limit` answers the whole thread, which the chat takes as well.
#[tauri::command]
pub async fn fb_thread(app: AppHandle, after: Option<u64>, limit: Option<u32>) -> Result<Value, String> {
    let uid = fb_uid(&app.state::<App>());
    let mut q = format!("uid={uid}");
    if let Some(a) = after.filter(|a| *a > 0) { q.push_str(&format!("&after={a}")); }
    if let Some(n) = limit.filter(|n| *n > 0) { q.push_str(&format!("&limit={}", n.min(200))); }
    tauri::async_runtime::spawn_blocking(move || {
        let r = reach::call("dev chat", |host| HTTP.get(&format!("{host}/ladder/api/fb/thread?{q}")).timeout(Duration::from_secs(20)).call())?;
        let mut v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).unwrap_or_default();
        // the pictures on the active host as well (1.6.22: it is the one that answered, or the next one the window falls back to)
        v["img_base"] = json!(format!("{}/ladder/api/fb/img/", reach::active_or_default()));
        v["uid"] = json!(uid);
        Ok(v)
    }).await.map_err(|e| e.to_string())?
}
