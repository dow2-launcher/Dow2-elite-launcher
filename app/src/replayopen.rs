//! Replays tab, "Watch" (the ReplayOpen add-on, 1.6.13, siritos fb 1210): the replay opens in the game straight from the
//! launcher. The launcher talks to ReplayOpen.dll as to RoomJoin / LiveReplay: the pipe `\\.\pipe\EliteReplayOpen-<pid of
//! DOW2.exe>` (Linux: Elite_DLLs/robridge.exe through the game's Proton, see roomjoin.rs), one JSON object per line -
//! `{"cmd":"play","file":"<a name in the game's Playback folder>"}`, `{"cmd":"cancel"}`; the game answers accepted /
//! data_mismatch (another Elite build: it still plays) / loading / playing / over / failed (reason) and status lines
//! (`"ver":"1"`). The game copies the file to Playback\launcher_replay.rec itself and starts it as Game History -> Load
//! Replay does; a game that is not running is started by the window first (the pipe comes ~16 s later).

use crate::roomjoin::{self, Conn, RO};
use elite_core::replay;
use serde_json::{json, Value};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// The replay that is being opened now; a new one or Cancel moves it on, so an older session stops telling the window.
static GEN: AtomicU64 = AtomicU64::new(0);

/// Is ReplayOpen's pipe up in a running game (and which game it is, its status with "ver").
#[tauri::command]
pub async fn replay_open_probe(app: AppHandle) -> Value {
    tauri::async_runtime::spawn_blocking(move || {
        let g = roomjoin::games_of(&app, &RO);
        json!({"running": crate::is_game_running() || !g.is_empty(),
               "games": g.iter().map(|(c, s)| json!({"pid": c.pid(), "status": s, "kind": roomjoin::kind(c)})).collect::<Vec<_>>()})
    }).await.unwrap_or(Value::Null)
}

/// A replay of the Playback folder by its bare name (nothing outside the folder).
fn playback_name(name: &str) -> bool {
    !name.is_empty() && name.len() <= 200 && !name.contains(['/', '\\', ':', '"']) && !name.starts_with('.')
        && !name.chars().any(char::is_control) && name.to_ascii_lowercase().ends_with(".rec")
        && replay::playback_dir().is_some_and(|d| d.join(name).is_file())
}

/// Watch: wait up to `wait` s for a game with the pipe (the window has just started it), bring it to the front, send the
/// replay and pass the game's events on to the window ("replay_open": {ev, file, reason, ...}) until it plays, fails, or
/// 6 minutes pass (ReplayOpen itself waits up to 2 minutes for the menu and 3 for the replay to load).
#[tauri::command]
pub fn replay_open(app: AppHandle, file: String, game: Option<String>, wait: Option<u64>) -> Result<Value, String> {
    if !playback_name(&file) { return Ok(json!({"started": false, "error": "no_file"})); }
    let want: &'static str = if game.as_deref() == Some("vanilla") { "vanilla" } else { "elite" };
    let gen = GEN.fetch_add(1, Ordering::SeqCst) + 1;
    let wait = Duration::from_secs(wait.unwrap_or(0).min(300));
    crate::c_log(&format!("replay: open {file} ({want}), waiting up to {} s for the game", wait.as_secs()));
    if !cfg!(any(windows, target_os = "linux")) { return Err("not on this system".into()); }
    std::thread::spawn(move || session(app, gen, file, want, wait));
    Ok(json!({"started": true}))
}

fn session(app: AppHandle, gen: u64, file: String, want: &'static str, wait: Duration) {
    let tell = |v: Value| { if GEN.load(Ordering::SeqCst) == gen { let _ = app.emit("replay_open", v); } };
    let fail = |reason: &str| { crate::c_log(&format!("replay: {file}: {reason}")); tell(json!({"ev": "failed", "file": file, "reason": reason})); };
    let t0 = Instant::now();
    let mut told = false;
    let mut conn: Conn = loop {
        if GEN.load(Ordering::SeqCst) != gen { return; }
        let mut found = roomjoin::games_of(&app, &RO);
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
        if !told { told = true; tell(json!({"ev": "waiting_game", "file": file})); }
        std::thread::sleep(Duration::from_millis(700));
    };
    let pid = conn.pid();
    if pid != 0 { roomjoin::bring_to_front(pid); }
    if GEN.load(Ordering::SeqCst) != gen { return; }
    let cmd = json!({"cmd": "play", "file": file});
    crate::c_log(&format!("replay: game {pid}: {cmd}"));
    if !conn.send(&cmd) { fail("game_closed"); return; }
    let end = Instant::now() + Duration::from_secs(360);
    loop {
        if GEN.load(Ordering::SeqCst) != gen { let _ = conn.send(&json!({"cmd": "cancel"})); return; }
        if Instant::now() >= end { fail("no_answer"); return; }
        match conn.line(500) {
            Err(()) => { fail("game_closed"); return; }
            Ok(None) => {}
            Ok(Some(v)) => {
                let ev = v["ev"].as_str().unwrap_or("").to_string();
                if ev == "status" || ev == "error" { continue; }
                crate::c_log(&format!("replay: {file}: {v}"));
                tell(v);
                if ev == "playing" || ev == "failed" || ev == "over" { return; }
            }
        }
    }
}

/// Cancel: the waiting stops, the game is told (a replay that already plays stays - the player leaves it in the game).
#[tauri::command]
pub async fn replay_open_cancel(app: AppHandle) -> Value {
    GEN.fetch_add(1, Ordering::SeqCst);
    tauri::async_runtime::spawn_blocking(move || {
        let mut n = 0;
        for (mut c, _) in roomjoin::games_of(&app, &RO) { if c.send(&json!({"cmd": "cancel"})) { n += 1; } }
        json!({"told": n})
    }).await.unwrap_or(Value::Null)
}
