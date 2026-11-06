//! Online block, "Watch" on a running match (the LiveReplay add-on, 1.4.18, owner 06.11.2026): the match of our battle servers
//! as a replay in the game that keeps growing, a fixed delay behind (the server's setting). The launcher talks to LiveReplay.dll
//! in the game as to RoomJoin: the pipe `\\.\pipe\EliteLiveReplay-<pid of DOW2.exe>` (Linux: Elite_DLLs/lrbridge.exe through
//! the game's Proton, see roomjoin.rs), one JSON object per line - `{"cmd":"watch","match":"<id>","base":"<ladder>"}`; the
//! game answers accepted / fetching / starting / playing / over / failed (reason) and status lines. The game fetches the
//! replay from the ladder itself; the launcher only says which match.

use crate::roomjoin::{self, Conn, LR};
use serde_json::{json, Value};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// The watch that runs now; a new one or Cancel moves it on, so an older session stops telling the window.
static GEN: AtomicU64 = AtomicU64::new(0);

/// Is LiveReplay's pipe up in a running game (and which game it is).
#[tauri::command]
pub async fn live_watch_probe(app: AppHandle) -> Value {
    tauri::async_runtime::spawn_blocking(move || {
        let g = roomjoin::games_of(&app, &LR);
        json!({"running": crate::is_game_running() || !g.is_empty(),
               "games": g.iter().map(|(c, s)| json!({"pid": c.pid(), "status": s, "kind": roomjoin::kind(c)})).collect::<Vec<_>>()})
    }).await.unwrap_or(Value::Null)
}

/// Watch: wait up to `wait` s for a game with the pipe (the window has just started it), bring it to the front, send the watch
/// and pass the game's events on to the window ("live_watch": {ev, match, reason}) until it plays, fails, or 3 minutes pass.
#[tauri::command]
pub fn live_watch(app: AppHandle, id: String, game: Option<String>, base: Option<String>, wait: Option<u64>) -> Result<Value, String> {
    if id.is_empty() || id.len() > 24 || !id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_') { return Err("no match".into()); }
    let base = base.unwrap_or_default();
    let base = if base.starts_with("https://") || base.starts_with("http://127.0.0.1") { base } else { "https://rts.fintebtc.de".into() };
    if base.len() > 150 || base.contains('"') || base.contains('\\') { return Err("bad server".into()); }
    let want: &'static str = if game.as_deref() == Some("vanilla") { "vanilla" } else { "elite" };
    let gen = GEN.fetch_add(1, Ordering::SeqCst) + 1;
    let wait = Duration::from_secs(wait.unwrap_or(0).min(300));
    crate::c_log(&format!("live: watch {id} ({want}) from {base}, waiting up to {} s for the game", wait.as_secs()));
    if !cfg!(any(windows, target_os = "linux")) { return Err("not on this system".into()); }
    std::thread::spawn(move || session(app, gen, id, want, base, wait));
    Ok(json!({"started": true}))
}

fn session(app: AppHandle, gen: u64, id: String, want: &'static str, base: String, wait: Duration) {
    let tell = |v: Value| { if GEN.load(Ordering::SeqCst) == gen { let _ = app.emit("live_watch", v); } };
    let fail = |reason: &str| { crate::c_log(&format!("live: watch {id}: {reason}")); tell(json!({"ev": "failed", "match": id, "reason": reason})); };
    let t0 = Instant::now();
    let mut told = false;
    let mut conn: Conn = loop {
        if GEN.load(Ordering::SeqCst) != gen { return; }
        let mut found = roomjoin::games_of(&app, &LR);
        let n_all = found.len();
        found.retain(|(c, _)| roomjoin::kind(c).map_or(true, |k| k == want));
        if !found.is_empty() {
            let k = found.iter().position(|(_, s)| s["screen"] == "main").unwrap_or(0);
            break found.swap_remove(k).0;
        }
        if t0.elapsed() >= wait {
            fail(if n_all > 0 { "wrong_game" } else if crate::is_game_running() { "no_pipe" } else { "no_game" }); return;
        }
        if roomjoin::launch_failed_since(t0) || roomjoin::launched_long_ago(t0, 60) && !crate::is_game_running() { fail("no_game"); return; }
        if !told { told = true; tell(json!({"ev": "waiting_game", "match": id})); }
        std::thread::sleep(Duration::from_millis(700));
    };
    let pid = conn.pid();
    if pid != 0 { roomjoin::bring_to_front(pid); }
    if GEN.load(Ordering::SeqCst) != gen { return; }
    let cmd = json!({"cmd": "watch", "match": id, "base": base});
    crate::c_log(&format!("live: game {pid}: {cmd}"));
    if !conn.send(&cmd) { fail("game_closed"); return; }
    let end = Instant::now() + Duration::from_secs(180);
    loop {
        if GEN.load(Ordering::SeqCst) != gen { let _ = conn.send(&json!({"cmd": "stop"})); return; }
        if Instant::now() >= end { fail("no_answer"); return; }
        match conn.line(500) {
            Err(()) => { fail("game_closed"); return; }
            Ok(None) => {}
            Ok(Some(v)) => {
                let ev = v["ev"].as_str().unwrap_or("").to_string();
                if ev == "status" || ev == "error" || v["match"].as_str().is_some_and(|m| m != id) { continue; }
                crate::c_log(&format!("live: watch {id}: {v}"));
                tell(v);
                if ev == "playing" || ev == "failed" || ev == "over" { return; }
            }
        }
    }
}

/// Cancel: the waiting stops, the game is told to stop fetching (a replay that already plays stays - the player leaves it in the game).
#[tauri::command]
pub async fn live_watch_cancel(app: AppHandle) -> Value {
    GEN.fetch_add(1, Ordering::SeqCst);
    tauri::async_runtime::spawn_blocking(move || {
        let mut n = 0;
        for (mut c, _) in roomjoin::games_of(&app, &LR) { if c.send(&json!({"cmd": "stop"})) { n += 1; } }
        json!({"told": n})
    }).await.unwrap_or(Value::Null)
}
