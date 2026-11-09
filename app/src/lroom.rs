//! Launcher rooms (owner 05.11.2026): a lobby in the launcher like the game's own - the map, who plays in which team with
//! which race and hero, everybody presses Ready, a 10 s countdown, then the game starts for everyone and they all land in
//! one match. The room lives on our ladder server (dow2-ladder ladder/lroom.py); the window talks to it through
//! `lroom_api` (POST /ladder/api/lroom/<verb>, the community session token added here, never in the page) and hears every
//! change on the live stream (event "lroom" - the room's whole view - and "lroom_gone").
//!
//! The network: `lroom_pings` measures our game servers as Relay.dll does (netgame.rs: UDP PING + a stream of 40 x 1000
//! bytes; a node without the stream is "no answer" for the match), the window sends it to the room; the server shows
//! everybody against every node and picks the match's node by the native automatch's rule.
//!
//! The launch: at the end of the countdown the room is "launching"; the window takes its ticket (mode, map, race, hero),
//! starts the game if it is not running (Play), and `lroom_launch` orders the match over MMFind's pipe
//! `\\.\pipe\EliteMMFind-<pid of DOW2.exe>` (MMFind 0.46; Linux: Elite_DLLs/mmbridge.exe through the game's Proton, as
//! RoomJoin's rjbridge): MMFind walks to Find a Game, sets the room's mode / race / hero and searches with the room's id;
//! the ladder makes the match from the room. What the game says goes to the window ("lroom_game" events) and to the room
//! (verb "game"), so everybody sees how far each game is; a failure calls the launch off for all.
use crate::roomjoin::{self, Conn, MMF};
use serde_json::{json, Value};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

const VERBS: [&str; 16] = ["create", "join", "leave", "seat", "army", "ready", "conf", "kick", "pings", "here", "get", "ticket", "game", "cancel", "start", "stop"];

/// One room call: Ok(the server's answer) whatever it says, Err only when no host answered.
fn call(token: &str, verb: &str, body: &Value) -> Result<Value, String> {
    let mut b = if body.is_object() { body.clone() } else { json!({}) };
    b["token"] = json!(token);
    let b = b.to_string();
    let mut last = "the server is not configured in this build".to_string();
    for h in crate::fb_hosts() {
        match crate::HTTP.post(&format!("{h}/ladder/api/lroom/{verb}")).timeout(Duration::from_secs(15)).set("Content-Type", "application/json").send_string(&b) {
            Ok(r) => return serde_json::from_str(&r.into_string().unwrap_or_default()).map_err(|e| e.to_string()),
            Err(e) => { crate::api_err(&h, &e); last = e.to_string(); }
        }
    }
    Err(last)
}
fn token(app: &AppHandle) -> String { app.state::<crate::App>().settings.lock().unwrap().c_token.clone() }

#[tauri::command]
pub async fn lroom_api(app: AppHandle, verb: String, body: Option<Value>) -> Result<Value, String> {
    if !VERBS.contains(&verb.as_str()) { return Err("unknown call".into()); }
    let tok = token(&app);
    if tok.is_empty() { return Ok(json!({"ok": false, "error": "auth"})); }
    let body = body.unwrap_or_else(|| json!({}));
    tauri::async_runtime::spawn_blocking(move || {
        let r = call(&tok, &verb, &body);
        if let Ok(v) = &r { if v["ok"] == false && verb != "here" { crate::c_log(&format!("lroom {verb}: {}", v["error"])); } }
        if let Err(e) = &r { if verb != "here" { crate::c_log(&format!("lroom {verb}: {e}")); } }
        r
    }).await.map_err(|e| e.to_string())?
}

/// The open rooms (public) and what a room may have (the maps of each mode, the races and their heroes).
#[tauri::command]
pub async fn lroom_list(what: Option<String>, game: Option<String>) -> Result<Value, String> {
    let path = if what.as_deref() == Some("catalog") { format!("catalog?game={}", if game.as_deref() == Some("vanilla") { "vanilla" } else { "elite" }) } else { "list".into() };
    tauri::async_runtime::spawn_blocking(move || {
        let mut last = "the server is not configured in this build".to_string();
        for h in crate::fb_hosts() {
            match crate::HTTP.get(&format!("{h}/ladder/api/lroom/{path}")).timeout(Duration::from_secs(10)).call() {
                Ok(r) => {
                    let mut v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).map_err(|e| e.to_string())?;
                    v["host"] = json!(h);
                    return Ok(v);
                }
                Err(e) => { crate::api_err(&h, &e); last = e.to_string(); }
            }
        }
        Err(last)
    }).await.map_err(|e| e.to_string())?
}

/// Our game servers as this computer reaches them, by Relay.dll's rule: {pings: {ip: ms | -1}, raw: {ip: {ms, got, ok}}}.
/// One node after another (the bursts must not overlap); ~2 s a node. Not while a match runs (the window asks only in the room).
#[tauri::command]
pub async fn lroom_pings(app: AppHandle) -> Result<Value, String> {
    let ini = crate::relay_ini(&app.state::<crate::App>());
    tauri::async_runtime::spawn_blocking(move || {
        let mut ladder: Option<Vec<(std::net::Ipv4Addr, String)>> = None;
        for host in crate::fb_hosts() {
            match crate::HTTP.get(&format!("{host}/ladder/api/relays")).timeout(Duration::from_secs(8)).call() {
                Ok(r) => { ladder = serde_json::from_str::<Value>(&r.into_string().unwrap_or_default()).ok().and_then(|d| crate::netgame::signed_relays(&d)); break; }
                Err(e) => crate::api_err(&host, &e),
            }
        }
        let (ini_nodes, port) = crate::netgame::ini_nodes(&ini);
        let port = port.unwrap_or(crate::netgame::GAME_PORT);
        let nodes = crate::netgame::node_set(ladder.as_deref().unwrap_or(&[]), &ini_nodes);
        let (mut pings, mut raw) = (serde_json::Map::new(), serde_json::Map::new());
        for n in &nodes {
            let m = crate::netgame::measure(n.ip, port);
            let ok = m["usable"].as_bool().unwrap_or(false);
            pings.insert(n.ip.to_string(), json!(if ok { m["ms"].as_u64().unwrap_or(0) as i64 } else { -1 }));
            raw.insert(n.ip.to_string(), json!({"ms": m["ms"], "got": m["got"], "ok": ok, "name": n.name}));
        }
        crate::c_log(&format!("lroom pings: {}", raw.iter().map(|(ip, v)| format!("{ip} {}{}", v["ms"], if v["ok"] == true { "" } else { " (no stream)" })).collect::<Vec<_>>().join(", ")));
        Ok(json!({"pings": pings, "raw": raw}))
    }).await.map_err(|e| e.to_string())?
}

/// The launch that runs now; a new one or Cancel moves it on, so an older session stops telling.
static GEN: AtomicU64 = AtomicU64::new(0);

/// The room's match into the game: wait up to `wait` s for a game with MMFind's pipe (the window started it, or it is
/// starting), send the room's order and pass every event on until the match loads, the game says no, or 4 minutes pass.
#[tauri::command]
pub fn lroom_launch(app: AppHandle, ticket: Value, wait: Option<u64>) -> Result<Value, String> {
    let room = ticket["room"].as_str().unwrap_or("").to_string();
    if room.is_empty() || room.len() > 20 || !room.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit()) { return Err("no room".into()); }
    let gen = GEN.fetch_add(1, Ordering::SeqCst) + 1;
    // 1.4.18: never longer than the room's start lasts (the ticket's ttl): a game started later must not walk into an old start
    let ttl = ticket["ttl"].as_u64().filter(|t| *t > 0).unwrap_or(300).min(300);
    let wait = Duration::from_secs(wait.unwrap_or(0).min(ttl));
    crate::c_log(&format!("lroom {room}: launch {} (race {} hero {}), waiting up to {} s for the game", ticket["mode"], ticket["race"], ticket["hero"], wait.as_secs()));
    if !cfg!(any(windows, target_os = "linux")) { return Err("not on this system".into()); }
    std::thread::spawn(move || session(app, gen, ticket, wait));
    Ok(json!({"started": true}))
}

fn session(app: AppHandle, gen: u64, ticket: Value, wait: Duration) {
    let room = ticket["room"].as_str().unwrap_or("").to_string();
    let want = if ticket["game"] == "vanilla" { "vanilla" } else { "elite" };
    let tok = token(&app);
    let (room2, app_t) = (room.clone(), app.clone());
    // to the window and to the room (the others see how far this game is)
    let tell = move |v: Value| {
        if GEN.load(Ordering::SeqCst) != gen { return; }
        let _ = app_t.emit("lroom_game", v.clone());
        let body = json!({"ev": v["ev"], "reason": v["reason"]});
        if let Err(e) = call(&tok, "game", &body) { crate::c_log(&format!("lroom {room2}: telling the room failed: {e}")); }
    };
    let fail = |reason: &str| { crate::c_log(&format!("lroom {room}: {reason}")); tell(json!({"ev": "failed", "room": room, "reason": reason, "text": ""})); };
    let t0 = Instant::now();
    let mut told = false;
    let mut conn: Conn = loop {
        if GEN.load(Ordering::SeqCst) != gen { return; }
        let mut found = roomjoin::games_of(&app, &MMF);
        let n_all = found.len();
        found.retain(|(c, _)| roomjoin::kind(c).map_or(true, |k| k == want));
        if !found.is_empty() {
            let k = found.iter().position(|(_, s)| s["screen"] == "main").unwrap_or(0);
            break found.swap_remove(k).0;
        }
        let wrong = n_all > 0;
        if t0.elapsed() >= wait {
            fail(if wrong { "wrong_game" } else if crate::is_game_running() { "no_pipe" } else { "no_game" }); return;
        }
        if roomjoin::launch_failed_since(t0) || roomjoin::launched_long_ago(t0, 60) && !crate::is_game_running() { fail("no_game"); return; }
        if !told { told = true; tell(json!({"ev": "waiting_game", "room": room})); }
        std::thread::sleep(Duration::from_millis(700));
    };
    let pid = conn.pid();
    if pid != 0 { roomjoin::bring_to_front(pid); }
    if GEN.load(Ordering::SeqCst) != gen { return; }
    let mode = ticket["mode"].as_str().unwrap_or("1v1");
    let ttl_left = ticket["ttl"].as_u64().filter(|t| *t > 0).map(|t| t.saturating_sub(t0.elapsed().as_secs()).max(5));
    let mut cmd = json!({"cmd": "room", "room": room, "mode": mode, "race": ticket["race_ui"].as_i64().unwrap_or(-1), "hero": ticket["hero"].as_i64().unwrap_or(-1)});
    // the host's game writes the match options (victory condition, tickets, start positions, resources): only his ticket has them
    for k in ["win", "vptk", "sloc", "rsst"] { if let Some(v) = ticket["opts"][k].as_i64() { cmd[k] = json!(v); } }
    if let Some(t) = ttl_left { cmd["ttl"] = json!(t); }                // MMFind 0.48: it gives up when the room's start is over
    crate::c_log(&format!("lroom {room}: game {pid}: {cmd}"));
    if !conn.send(&cmd) { fail("game_closed"); return; }
    let end = Instant::now() + Duration::from_secs(240);
    loop {
        if GEN.load(Ordering::SeqCst) != gen {                          // cancelled (or a new launch): the game is told
            let _ = conn.send(&json!({"cmd": "cancel", "room": room})); return; }
        if Instant::now() >= end { fail("no_answer"); return; }
        match conn.line(500) {
            Err(()) => { fail("game_closed"); return; }
            Ok(None) => {}
            Ok(Some(v)) => {
                let ev = v["ev"].as_str().unwrap_or("").to_string();
                if ev == "status" || ev == "error" || v["room"].as_str().is_some_and(|r| r != room) { continue; }
                crate::c_log(&format!("lroom {room}: {v}"));
                tell(v);
                if ev == "loading" || ev == "failed" { return; }
            }
        }
    }
}

/// Cancel the launch: the waiting stops and every game with MMFind's pipe is told (only this room's launch).
#[tauri::command]
pub async fn lroom_launch_cancel(app: AppHandle, room: String) -> Value {
    GEN.fetch_add(1, Ordering::SeqCst);
    tauri::async_runtime::spawn_blocking(move || {
        let mut n = 0;
        for (mut c, _) in roomjoin::games_of(&app, &MMF) { if c.send(&json!({"cmd": "cancel", "room": room})) { n += 1; } }
        crate::c_log(&format!("lroom {room}: launch cancelled ({n} game(s) told)"));
        json!({"told": n})
    }).await.unwrap_or(Value::Null)
}

/// Is MMFind's pipe up in a running game (MMFind 0.46+): the window shows it before Ready.
#[tauri::command]
pub async fn lroom_probe(app: AppHandle) -> Value {
    tauri::async_runtime::spawn_blocking(move || {
        let g = roomjoin::games_of(&app, &MMF);
        json!({"running": crate::is_game_running() || !g.is_empty(), "games": g.iter().map(|(c, s)| json!({"pid": c.pid(), "status": s, "kind": roomjoin::kind(c)})).collect::<Vec<_>>()})
    }).await.unwrap_or(Value::Null)
}
