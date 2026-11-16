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
    json!({"uid": uid, "name": app.settings.lock().unwrap().fb_name.clone(), "configured": !fb_hosts().is_empty()})
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
    tauri::async_runtime::spawn_blocking(move || {
        let mut last = "feedback is not configured in this build".to_string();
        for host in fb_hosts() {
            match HTTP.post(&format!("{host}/ladder/api/fb/send")).timeout(Duration::from_secs(60))
                .set("Content-Type", "application/json").send_string(&body) {
                Ok(r) => {
                    let v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).unwrap_or_default();
                    if v["ok"].as_bool() == Some(true) { return Ok(v); }
                    return Err(v["error"].as_str().unwrap_or("rejected").to_string());
                }
                Err(e) => { api_err(&host, &e); last = e.to_string(); }
            }
        }
        Err(last)
    }).await.map_err(|e| e.to_string())?
}

/// The whole conversation; picture links point to the host that answered.
#[tauri::command]
pub async fn fb_thread(app: AppHandle) -> Result<Value, String> {
    let uid = fb_uid(&app.state::<App>());
    tauri::async_runtime::spawn_blocking(move || {
        let mut last = "feedback is not configured in this build".to_string();
        for host in fb_hosts() {
            match HTTP.get(&format!("{host}/ladder/api/fb/thread?uid={uid}")).timeout(Duration::from_secs(20)).call() {
                Ok(r) => {
                    let mut v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).unwrap_or_default();
                    v["img_base"] = json!(format!("{host}/ladder/api/fb/img/"));
                    v["uid"] = json!(uid);
                    return Ok(v);
                }
                Err(e) => { api_err(&host, &e); last = e.to_string(); }
            }
        }
        Err(last)
    }).await.map_err(|e| e.to_string())?
}
