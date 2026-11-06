//! 1.4.16 (owner 06.11.2026): "Check connection" - the button in the header. elite_core::nettest does the test (game traffic
//! through our UDP tunnel to every node at once, as in a match of 1v1 / 2v2 / 3v3); here: the node list (the one of Settings ->
//! Online play: the DLL's built-in three + the signed ladder list + Relay.ini), the progress events ("nettest"), the last runs
//! kept for comparing (the player marks each run "with VPN" / "without VPN") and the two files "Send to the developers" adds to
//! the log upload: nettest.json (the last runs, in full) and nettest.log (a line per node and run). Never while the game runs.
use crate::{api_err, c_log, data_dir, fb_hosts, is_game_running, netgame, os_name, relay_ini, App, HTTP};
use elite_core::{nettest as nt, LAUNCHER_VERSION};
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};

static BUSY: AtomicBool = AtomicBool::new(false);
static CANCEL: AtomicBool = AtomicBool::new(false);
/// runs kept for comparing (with / without VPN, different modes)
const KEEP: usize = 4;

fn hist_path() -> PathBuf { data_dir().join("nettest.json") }
fn log_path() -> PathBuf { data_dir().join("nettest.log") }

fn history() -> Vec<Value> {
    std::fs::read(hist_path()).ok().and_then(|b| serde_json::from_slice::<Value>(&b).ok())
        .and_then(|v| v.as_array().cloned()).unwrap_or_default()
}

/// What "Send to the developers" adds to the log upload (send_logs).
pub fn share_files() -> Vec<PathBuf> { [hist_path(), log_path()].into_iter().filter(|p| p.is_file()).collect() }

fn save(res: &Value) {
    let mut h = history();
    h.insert(0, res.clone());
    h.truncate(KEEP);
    let _ = std::fs::write(hist_path(), serde_json::to_vec(&Value::Array(h)).unwrap_or_default());
    // the log: one block per run, the newest at the end, at most 128 KB
    let when = res["ts"].as_u64().unwrap_or(0);
    let mut text = std::fs::read_to_string(log_path()).unwrap_or_default();
    text += &format!("--- {} · launcher {} · {} · ts {} · nodes from {}\n", res["mode"].as_str().unwrap_or(""), LAUNCHER_VERSION, os_name(), when,
        res["list"].as_str().unwrap_or(""));
    for l in nt::summary_lines(res) { text += &l; text += "\n"; }
    if text.len() > 128 << 10 { let mut k = text.len() - (128 << 10); while !text.is_char_boundary(k) { k += 1; } text = text[k..].to_string(); }
    let _ = std::fs::write(log_path(), text);
}

/// The test: mode "1v1" / "2v2" / "3v3", vpn = what the player marked. The progress comes as "nettest" events, the result
/// (as elite_core::nettest::run + vpn/launcher/os) as the answer; {"skipped": "game" | "busy"} when it can't run now.
#[tauri::command]
pub async fn nettest_run(app: AppHandle, st: State<'_, App>, mode: String, vpn: bool) -> Result<Value, String> {
    if st.game_running.load(Ordering::Relaxed) || is_game_running() { return Ok(json!({"skipped": "game"})); }
    if BUSY.swap(true, Ordering::SeqCst) { return Ok(json!({"skipped": "busy"})); }
    CANCEL.store(false, Ordering::SeqCst);
    let ini = relay_ini(&st);
    let tok = st.settings.lock().unwrap().c_token.clone();
    let r = tauri::async_runtime::spawn_blocking(move || {
        let mut ladder: Option<Vec<(std::net::Ipv4Addr, String)>> = None;
        for host in fb_hosts() {
            match HTTP.get(&format!("{host}/ladder/api/relays")).timeout(Duration::from_secs(8)).call() {
                Ok(r) => { ladder = serde_json::from_str::<Value>(&r.into_string().unwrap_or_default()).ok().and_then(|d| netgame::signed_relays(&d)); break; }
                Err(e) => api_err(&host, &e),
            }
        }
        let (ini_nodes, port) = netgame::ini_nodes(&ini);
        let port = port.unwrap_or(nt::GAME_PORT);
        let nodes: Vec<(std::net::Ipv4Addr, String)> = netgame::node_set(ladder.as_deref().unwrap_or(&[]), &ini_nodes).into_iter().map(|n| (n.ip, n.name)).collect();
        let players = nt::players_of(&mode);
        let appp = app.clone();
        let mut res = nt::run(&nodes, port, players, nt::SECS_DEFAULT, &CANCEL, &move |p| { let _ = appp.emit("nettest", p); });
        res["vpn"] = json!(vpn); res["launcher"] = json!(LAUNCHER_VERSION); res["os"] = json!(os_name());
        res["list"] = json!(if ladder.is_some() { "ladder" } else { "builtin" });
        if !res["cancelled"].as_bool().unwrap_or(false) {
            save(&res);
            // 1.4.24 (owner 06.11.2026): the run goes to the ladder silently (only the node numbers, no logs) - it keeps per player
            // how each node does for him and stops using a node that is bad for him; the answer = his marks for the window
            if !tok.is_empty() { if let Some(a) = nq_call(&tok, "test", &nt::quality_rows(&res)) { if a["ok"] == true { res["nq_marks"] = a["marks"].clone(); } } }
        }
        c_log(&format!("nettest relic {} {}ms open {} api {}/5", res["relic"]["verdict"].as_str().unwrap_or(""), res["relic"]["ms"], res["relic"]["open"], res["relic"]["api"]["got"]));
        c_log(&format!("nettest {} vpn={} pick {}: {}", res["mode"].as_str().unwrap_or(""), vpn, res["pick"],
            res["nodes"].as_array().into_iter().flatten().map(|n| format!("{} {} {}{}", n["ip"].as_str().unwrap_or(""), n["verdict"].as_str().unwrap_or(""),
                n["transport"].as_str().unwrap_or(""), n["rtt"]["p50"].as_f64().map(|x| format!(" {x}ms")).unwrap_or_default())).collect::<Vec<_>>().join(", ")));
        res
    }).await.map_err(|e| e.to_string());
    BUSY.store(false, Ordering::SeqCst);
    r
}

#[tauri::command]
pub fn nettest_cancel() { CANCEL.store(true, Ordering::SeqCst); }

/// The kept runs, the newest first; "busy" while a test runs (the window may have been reopened meanwhile).
#[tauri::command]
pub fn nettest_history() -> Value { json!({"runs": history(), "busy": BUSY.load(Ordering::SeqCst), "nodes": nt::KNOWN_NODES.iter().map(|(ip, _)| *ip).collect::<Vec<_>>(), "lobby_ports": nt::LOBBY_PORTS}) }

/// One call of the ladder's node quality (POST /ladder/api/nq/<verb>, the community session token in the body): None when no
/// host answered. Quiet: no community.log lines (the run itself is logged above).
fn nq_call(token: &str, verb: &str, body: &Value) -> Option<Value> {
    let mut b = if body.is_object() { body.clone() } else { json!({}) };
    b["token"] = json!(token);
    let b = b.to_string();
    for h in fb_hosts() {
        match HTTP.post(&format!("{h}/ladder/api/nq/{verb}")).timeout(Duration::from_secs(10)).set("Content-Type", "application/json").send_string(&b) {
            Ok(r) => return serde_json::from_str(&r.into_string().unwrap_or_default()).ok(),
            Err(e) => api_err(&h, &e),
        }
    }
    None
}

/// 1.4.24 node quality per player: "marks" - our nodes the matchmaker does not use for this player now and why (losses, a stuck
/// or cut connection by his recent checks and matches), "force" {ip, on} - "use it anyway" for 24 h / back to the marks.
#[tauri::command]
pub async fn nq_api(app: AppHandle, verb: String, body: Option<Value>) -> Result<Value, String> {
    if verb != "marks" && verb != "force" { return Err("unknown call".into()); }
    let tok = app.state::<App>().settings.lock().unwrap().c_token.clone();
    if tok.is_empty() { return Ok(json!({"ok": false, "error": "auth"})); }
    let body = body.unwrap_or_else(|| json!({}));
    tauri::async_runtime::spawn_blocking(move || nq_call(&tok, &verb, &body).ok_or_else(|| "the server does not answer".to_string()))
        .await.map_err(|e| e.to_string())?
}
