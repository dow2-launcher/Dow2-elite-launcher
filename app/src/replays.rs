//! The Replays tab (1.6.0, owner 13.11.2026): the player's own replays from the game's Playback folder, read here
//! (elite_core::replay: the map, the players, the length, the version), and the shared pool on our server (the replay
//! service, dow2-ladder replay/app.py, /replay/api/...): search by mode, number of players, races, version; download into
//! Playback, so the game's Replays menu has it; put an own replay into the pool with one button (the Steam sign-in of
//! the chat says who did it) and write its description afterwards. The session token is added here, never in the page.
//! Answers keep the server's shape; a problem of this side is {"ok": false, "error": "<code>"} (the page has the texts).
use elite_core::replay;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

/// Parsed files by (name, size, time): the folder is read again on every visit of the tab, a file only once.
static CACHE: Mutex<Option<HashMap<(String, u64, u64), Value>>> = Mutex::new(None);
/// The server's version names by checksum, fetched once a run.
static VTABLE: Mutex<Option<Value>> = Mutex::new(None);

fn token(app: &AppHandle) -> String { app.state::<crate::App>().settings.lock().unwrap().c_token.clone() }

fn get(path: &str, secs: u64) -> Result<Value, String> {
    let mut last = "the server is not configured in this build".to_string();
    for h in crate::fb_hosts() {
        match crate::HTTP.get(&format!("{h}{path}")).timeout(Duration::from_secs(secs)).call() {
            Ok(r) => return serde_json::from_str(&r.into_string().unwrap_or_default()).map_err(|e| e.to_string()),
            Err(ureq::Error::Status(code, r)) if code < 500 => {
                return Ok(serde_json::from_str(&r.into_string().unwrap_or_default()).unwrap_or_else(|_| json!({"ok": false, "error": code})));
            }
            Err(e) => { crate::api_err(&h, &e); last = e.to_string(); }
        }
    }
    Err(last)
}
fn post(path: &str, body: &Value) -> Result<Value, String> {
    let b = body.to_string();
    let mut last = "the server is not configured in this build".to_string();
    for h in crate::fb_hosts() {
        match crate::HTTP.post(&format!("{h}{path}")).timeout(Duration::from_secs(20)).set("Content-Type", "application/json").send_string(&b) {
            Ok(r) => return serde_json::from_str(&r.into_string().unwrap_or_default()).map_err(|e| e.to_string()),
            Err(ureq::Error::Status(code, r)) if code < 500 => {
                return Ok(serde_json::from_str(&r.into_string().unwrap_or_default()).unwrap_or_else(|_| json!({"ok": false, "error": code})));
            }
            Err(e) => { crate::api_err(&h, &e); last = e.to_string(); }
        }
    }
    Err(last)
}
fn blocking<F: FnOnce() -> Result<Value, String> + Send + 'static>(f: F) -> impl std::future::Future<Output = Result<Value, String>> {
    async move { tauri::async_runtime::spawn_blocking(f).await.map_err(|e| e.to_string())? }
}
fn pool_id(id: &str) -> bool { id.len() == 16 && id.bytes().all(|b| b.is_ascii_hexdigit()) }
/// A file of the Playback folder by its bare name (nothing outside the folder).
fn own_file(name: &str) -> Option<PathBuf> {
    if name.is_empty() || name.len() > 200 || name.contains(['/', '\\', ':']) || name.starts_with('.') || !name.to_ascii_lowercase().ends_with(".rec") { return None; }
    let p = replay::playback_dir()?.join(name);
    p.is_file().then_some(p)
}

/// The player's replays: {dir, items: [elite_core::replay::Info + "version"]}, the newest first.
#[tauri::command]
pub async fn replays_local() -> Result<Value, String> {
    blocking(|| {
        let Some(dir) = replay::playback_dir() else { return Ok(json!({"ok": false, "error": "no_dir"})) };
        let mut files: Vec<(String, u64, u64)> = Vec::new();
        if let Ok(rd) = std::fs::read_dir(&dir) {
            for e in rd.flatten() {
                let name = e.file_name().to_string_lossy().into_owned();
                if !name.to_ascii_lowercase().ends_with(".rec") { continue; }
                let Ok(m) = e.metadata() else { continue };
                if !m.is_file() { continue; }
                let t = m.modified().ok().and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok()).map_or(0, |x| x.as_secs());
                files.push((name, m.len(), t));
            }
        }
        files.sort_by(|a, b| b.2.cmp(&a.2));
        files.truncate(1000);
        let vt = vtable();
        let mut cache = CACHE.lock().unwrap();
        let cache = cache.get_or_insert_with(HashMap::new);
        let mut items = Vec::new();
        for k in files {
            let v = match cache.get(&k) {
                Some(v) => v.clone(),
                None => {
                    let v = replay::parse_file(&dir.join(&k.0)).map(|r| serde_json::to_value(r).unwrap_or(Value::Null))
                        .unwrap_or_else(|| json!({"file": k.0, "size": k.1, "mtime": k.2, "broken": true}));
                    cache.insert(k.clone(), v.clone());
                    v
                }
            };
            let mut v = v;
            if let Some(h) = v["vhash"].as_str() { v["version"] = vt.get(h).cloned().unwrap_or(Value::Null); }
            items.push(v);
        }
        Ok(json!({"ok": true, "dir": dir.to_string_lossy(), "exists": dir.is_dir(), "items": items}))
    }).await
}

/// The version names of the server ({checksum: "3.2.1"}); an empty table while the server is out of reach.
fn vtable() -> Value {
    if let Some(v) = VTABLE.lock().unwrap().clone() { return v; }
    match get("/replay/api/vtable", 10) {
        Ok(v) if v.is_object() => { *VTABLE.lock().unwrap() = Some(v.clone()); v }
        _ => json!({}),
    }
}

/// The pool: {total, page, items, maps}; `q` = the filters (q, map, race "a,b", mode, players, version, author, mine, page, n).
#[tauri::command]
pub async fn replays_pool(app: AppHandle, q: Option<Value>) -> Result<Value, String> {
    let mut b = q.filter(Value::is_object).unwrap_or_else(|| json!({}));
    b["token"] = json!(token(&app));
    blocking(move || post("/replay/api/list", &b)).await
}

/// The versions in the pool, the newest first: [{version, count, last}].
#[tauri::command]
pub async fn replays_versions() -> Result<Value, String> { blocking(|| get("/replay/api/versions", 15)).await }

/// Which of these own files are in the pool: {file id: replay id}.
#[tauri::command]
pub async fn replays_have(ids: Vec<String>) -> Result<Value, String> {
    let ids: Vec<String> = ids.into_iter().filter(|i| pool_id(i)).take(2000).collect();
    blocking(move || post("/replay/api/have", &json!({"ids": ids}))).await
}

/// One replay of the pool: its meta, the caption and the report of the server's analysis.
#[tauri::command]
pub async fn replay_info(id: String) -> Result<Value, String> {
    if !pool_id(&id) { return Ok(json!({"ok": false, "error": "bad_id"})); }
    blocking(move || get(&format!("/replay/api/r/{id}"), 15)).await
}

/// Put an own replay (a file of Playback) into the pool. Needs the Steam sign-in: the player is its author.
#[tauri::command]
pub async fn replay_upload(app: AppHandle, file: String) -> Result<Value, String> {
    let tok = token(&app);
    if tok.is_empty() { return Ok(json!({"ok": false, "error": "auth"})); }
    blocking(move || {
        let Some(p) = own_file(&file) else { return Ok(json!({"ok": false, "error": "no_file"})) };
        let data = std::fs::read(&p).map_err(|e| e.to_string())?;
        if !replay::is_replay(&data) { return Ok(json!({"ok": false, "error": "not_replay"})); }
        if data.len() > 30 * 1024 * 1024 { return Ok(json!({"ok": false, "error": "too_big"})); }
        let name: String = file.bytes().map(|b| if b.is_ascii_alphanumeric() || b"-_.".contains(&b) { (b as char).to_string() } else { format!("%{b:02X}") }).collect();
        let mut last = "the server is not configured in this build".to_string();
        for h in crate::fb_hosts() {
            let req = crate::HTTP.post(&format!("{h}/replay/api/upload")).timeout(Duration::from_secs(120))
                .set("Content-Type", "application/octet-stream").set("X-Filename", &name).set("X-Token", &tok);
            match req.send_bytes(&data) {
                Ok(r) => {
                    let mut v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).map_err(|e| e.to_string())?;
                    v["ok"] = json!(true);
                    crate::c_log(&format!("replays: {file} put into the pool as {}", v["id"]));
                    return Ok(v);
                }
                Err(ureq::Error::Status(code, r)) if code < 500 || code == 507 => {
                    let v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).unwrap_or(Value::Null);
                    crate::c_log(&format!("replays: {file} not taken ({code}): {}", v["error"]));
                    return Ok(json!({"ok": false, "error": match code { 429 => "too_many", 507 => "full", 413 => "too_big", _ => "rejected" }}));
                }
                Err(e) => { crate::api_err(&h, &e); last = e.to_string(); }
            }
        }
        Err(last)
    }).await
}

/// The description of an own replay of the pool (only its author may; the server checks).
#[tauri::command]
pub async fn replay_describe(app: AppHandle, id: String, text: String) -> Result<Value, String> {
    let tok = token(&app);
    if tok.is_empty() { return Ok(json!({"ok": false, "error": "auth"})); }
    if !pool_id(&id) { return Ok(json!({"ok": false, "error": "bad_id"})); }
    let text: String = text.chars().take(1000).collect();
    blocking(move || post(&format!("/replay/api/r/{id}/describe"), &json!({"token": tok, "text": text}))).await
}

/// Download a replay of the pool into Playback (the game's Replays menu lists it): {ok, file}.
#[tauri::command]
pub async fn replay_download(id: String, name: Option<String>) -> Result<Value, String> {
    if !pool_id(&id) { return Ok(json!({"ok": false, "error": "bad_id"})); }
    blocking(move || {
        let Some(dir) = replay::playback_dir() else { return Ok(json!({"ok": false, "error": "no_dir"})) };
        let mut last = "the server is not configured in this build".to_string();
        for h in crate::fb_hosts() {
            match crate::HTTP.get(&format!("{h}/replay/api/r/{id}/replay.rec")).timeout(Duration::from_secs(120)).call() {
                Ok(r) => {
                    let mut data = Vec::new();
                    { use std::io::Read; r.into_reader().take(40 * 1024 * 1024).read_to_end(&mut data).map_err(|e| e.to_string())?; }
                    if !replay::is_replay(&data) { return Ok(json!({"ok": false, "error": "not_replay"})); }
                    // the same file is there already: nothing to write
                    if let Ok(rd) = std::fs::read_dir(&dir) {
                        for e in rd.flatten() {
                            if e.metadata().map_or(true, |m| m.len() != data.len() as u64) { continue; }
                            if std::fs::read(e.path()).map_or(false, |d| d == data) {
                                return Ok(json!({"ok": true, "file": e.file_name().to_string_lossy(), "had": true}));
                            }
                        }
                    }
                    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
                    let p = replay::free_name(&dir, name.as_deref().unwrap_or(&id));
                    std::fs::write(&p, &data).map_err(|e| e.to_string())?;
                    crate::c_log(&format!("replays: {id} downloaded to {}", p.display()));
                    return Ok(json!({"ok": true, "file": p.file_name().map(|f| f.to_string_lossy().into_owned())}));
                }
                Err(ureq::Error::Status(code, _)) if code < 500 => return Ok(json!({"ok": false, "error": "not_found"})),
                Err(e) => { crate::api_err(&h, &e); last = e.to_string(); }
            }
        }
        Err(last)
    }).await
}

/// Open the Playback folder.
#[tauri::command]
pub fn replays_open_dir(app: AppHandle) -> Result<Value, String> {
    let Some(d) = replay::playback_dir() else { return Ok(json!({"ok": false, "error": "no_dir"})) };
    let _ = std::fs::create_dir_all(&d);
    app.opener().open_path(d.to_string_lossy(), None::<&str>).map_err(|e| e.to_string())?;
    Ok(json!({"ok": true}))
}
