//! Elite Launcher — window around elite-core.
//!
//! Rules that shape this file:
//! * the game can always be started: a new version is only *offered*, never forced;
//! * everything the Elite team may want to change (versions, news, announcements, links,
//!   mirrors, launch commands) comes from the signed launcher.json, not from this code;
//! * the launcher works offline with the last verified config.
#![recursion_limit = "256"]   // get_status' json! grew past the default 128
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod netgame;
mod reach;

use elite_core::config::{version_newer, LauncherConfig};
use elite_core::{elite, game, net::Mirrors, update, LAUNCHER_VERSION};
use std::collections::BTreeMap;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, LazyLock, Mutex};
use std::time::{Duration, Instant};
use tauri::menu::{MenuBuilder, MenuItem, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, Wry};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::UpdaterExt;

/// Mirrors compiled into the launcher; launcher.json can add more. Order = preference.
/// Use hosts from different providers/domains so the launcher can start even if one is blocked.
/// Built-in mirrors, set at build time: `ELITE_MIRRORS="https://a/;https://b/" cargo build`.
/// Not stored in the repository; more mirrors can come later from the signed launcher.json.
const BUILTIN_MIRRORS: &str = match option_env!("ELITE_MIRRORS") { Some(v) => v, None => "" };
/// Public key of the launcher self-update (tauri-plugin-updater): only updates signed with its private half
/// (the TAURI_SIGNING_PRIVATE_KEY secret, CI only) are installed. A new key pair means a new `keys/updater.pub`.
const UPDATER_PUBKEY: &str = include_str!("../../keys/updater.pub");
/// The last resort of the self-update (1.3.16: GitHub Releases are the release, the mirrors copy them).
const GITHUB_UPDATER: &str = "https://github.com/dow2-launcher/Dow2-elite-launcher/releases/latest/download/updater.json";
const DEFAULT_CACHE_MB: u64 = 6144;

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(default)]
struct Settings {
    game_dir: Option<PathBuf>,
    channel: Option<String>,
    /// "" = system language
    lang: String,
    extra_mirror: String,
    cache_mb: Option<u64>,
    dismissed: Vec<String>,
    /// Component id → ticked by the player (missing = component default).
    components: BTreeMap<String, bool>,
    /// "component.option" → ticked by the player (missing = option default).
    comp_options: BTreeMap<String, bool>,
    /// "component.option" → the player's pick for an option with choices (missing = option default).
    comp_values: BTreeMap<String, String>,
    /// Channel the player switched away from — the quick "back to …" button.
    prev_channel: Option<String>,
    /// Mirror that worked last time — tried first (R2 is blocked in some countries, our server in others).
    last_mirror: String,
    /// The order of the mirrors and of the API hosts from the last check (reach.rs): used at the start until this run's
    /// check is done.
    net_data: Vec<reach::Probe>,
    net_api: Vec<reach::Probe>,
    /// Anonymous usage count (see usage_ping). None = on.
    usage_stats: Option<bool>,
    /// 1.3.12: no sound when someone @mentions me in the chat (owner: a beep by default, a tick to turn it off)
    mute_mention: Option<bool>,
    /// 1.3.12: the close button quits instead of hiding in the tray
    close_quits: Option<bool>,
    /// Random secret for the daily usage hash; never sent itself.
    ping_secret: String,
    /// Day number (UTC days since 1970) of the last successful usage ping.
    ping_day: u64,
    /// Feedback chat: random id that ties the player's messages together (kept across restarts), and the name they gave.
    fb_uid: String,
    fb_name: String,
    /// Elite files from/to other launchers on the local network (elite_core::lan). None = on.
    lan_share: Option<bool>,
    /// Hotkeys the player changed: "scope:name" -> "Control+A" ("grid:AB_key_1" for Grid Hotkeys); see elite_core::hotkeys.
    hotkeys: BTreeMap<String, String>,
    /// Community (chat, who is online): the session token from the Steam sign-in and the profile it belongs to.
    c_token: String,
    c_steam: String,
    c_name: String,
    c_avatar: String,
}

struct App {
    settings: Mutex<Settings>,
    config: Mutex<Option<LauncherConfig>>,
    busy: AtomicBool,
    /// DOW2.exe is running (checked every few seconds): its files are locked, add-ons and updates wait for it to close.
    game_running: AtomicBool,
    cancel: Mutex<Option<Arc<AtomicBool>>>,
    last_error: Mutex<String>,
    /// Version id → bytes a switch to it would download (0 = instant). Filled in the background.
    costs: Mutex<BTreeMap<String, u64>>,
    /// Newer launcher found by `launcher_check`, installed by `launcher_install`.
    launcher_update: Mutex<Option<tauri_plugin_updater::Update>>,
    /// Release notes from GitHub (see fetch_release_news), shown as news next to the ones from launcher.json.
    release_news: Mutex<Vec<Value>>,
}

/// Tray menu items, relabelled from the window when the language changes.
struct Tray {
    open: MenuItem<Wry>,
    quit: MenuItem<Wry>,
}

fn show_window(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

#[tauri::command]
fn set_tray_labels(tray: State<'_, Tray>, open: String, quit: String) {
    let _ = tray.open.set_text(open);
    let _ = tray.quit.set_text(quit);
}

/// Work out how much each version would download (manifests are fetched once and cached for good).
fn compute_costs(app: &AppHandle) {
    let st = app.state::<App>();
    let Some(cfg) = st.config.lock().unwrap().clone() else { return };
    let Some(dir) = game_dir(&st) else { return };
    let s = st.settings.lock().unwrap().clone();
    let m = mirrors(&s, Some(&cfg));
    let g = update::Game::new(&dir);
    // Elite already in the folder but not installed by the launcher: recognise the version (main channel first)
    if g.load_state().files.is_empty() && dir.join("Elite.module").is_file() && !st.busy.load(Ordering::Relaxed) {
        let mut chans: Vec<_> = cfg.channels.iter().collect();
        chans.sort_by_key(|c| !c.default);
        for c in chans {
            if let Ok(man) = update::load_manifest(&g, &m, &c.version) {
                if update::adopt_existing(&g, &man, &c.id) {
                    break;
                }
            }
        }
    }
    let mut out = BTreeMap::new();
    let old_man = {
        let v = g.load_state().version;
        if v.is_empty() { None } else { update::load_manifest(&g, &m, &v).ok() }
    };
    for c in &cfg.channels {
        if let Ok(man) = update::load_manifest(&g, &m, &c.version) {
            out.insert(c.version.clone(), update::switch_cost(&g, old_man.as_ref(), &man));
        }
    }
    *st.costs.lock().unwrap() = out;
}

fn data_dir() -> PathBuf {
    let d = dirs::config_dir().unwrap_or_else(std::env::temp_dir).join("EliteLauncher");
    let _ = std::fs::create_dir_all(&d);
    d
}

fn load_settings() -> Settings {
    std::fs::read(data_dir().join("settings.json")).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default()
}

/// Remember the mirror that just worked (tried first next time).
fn remember_mirror(st: &App, worked: String) {
    if worked.is_empty() { return; }
    let mut s = st.settings.lock().unwrap();
    if s.last_mirror != worked { s.last_mirror = worked; save_settings(&s); }
}

fn save_settings(s: &Settings) {
    let _ = std::fs::write(data_dir().join("settings.json"), serde_json::to_vec_pretty(s).unwrap());
}

fn cached_config() -> Option<LauncherConfig> {
    let raw = std::fs::read(data_dir().join("launcher.json")).ok()?;
    let sig = std::fs::read_to_string(data_dir().join("launcher.json.sig")).ok()?;
    update::parse_signed_config(&raw, &sig)
}

fn os_name() -> &'static str {
    if cfg!(windows) {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    }
}

fn mirrors(s: &Settings, cfg: Option<&LauncherConfig>) -> Mirrors {
    let mut v: Vec<String> = Vec::new();
    if !s.extra_mirror.trim().is_empty() {
        v.push(s.extra_mirror.trim().to_string());
    }
    // зеркала из подписанного launcher.json — первыми (так команда меняет порядок без нового лаунчера), потом встроенные
    if let Some(c) = cfg {
        v.extend(c.mirrors.iter().cloned());
    }
    v.extend(BUILTIN_MIRRORS.split(';').map(str::trim).filter(|x| !x.is_empty()).map(String::from));
    // 02.11 (owner: the launcher must download everywhere): the order is the one that answers best from this computer -
    // checked once at the start, again only when a mirror stops answering (reach.rs); a mirror the player typed in
    // stays first. Before the first check: the order of the last run, then the order above (Moscow, Germany, the rest).
    let _ = &s.last_mirror;
    let mut seen = std::collections::HashSet::new();
    v.retain(|m| seen.insert(m.trim_end_matches('/').to_ascii_lowercase()));
    let own = s.extra_mirror.trim().to_string();
    let rest: Vec<String> = v.iter().filter(|m| own.is_empty() || m.as_str() != own).cloned().collect();
    reach::set_candidates(reach::Pool::Data, rest.clone());
    let mut out = if own.is_empty() { vec![] } else { vec![own] };
    out.extend(reach::order(reach::Pool::Data, rest));
    Mirrors::new(out)
}

/// After a run through the mirrors: the first one in the order did not answer (another one did, or none) - it is lost
/// and the mirrors are checked again in the background (reach.rs).
fn data_note(m: &Mirrors, ok: bool) {
    let first = m.first_base();
    if first.is_empty() { return; }
    if !ok || m.current_base() != first { reach::lost(reach::Pool::Data, &first); }
}

/// The API hosts of the signed launcher.json (02.11: new servers - Poland, Cloudflare - without a new launcher).
static CFG_API_HOSTS: Mutex<Vec<String>> = Mutex::new(Vec::new());
fn note_config(c: &LauncherConfig) {
    *CFG_API_HOSTS.lock().unwrap() = c.api_hosts.iter().map(|h| h.trim().trim_end_matches('/').to_string()).filter(|h| h.starts_with("https://")).collect();
    reach::set_candidates(reach::Pool::Api, api_hosts());
}
/// Every host with our API: the build's (ELITE_LOG_HOSTS), then launcher.json's api_hosts.
fn api_hosts() -> Vec<String> {
    let mut v: Vec<String> = option_env!("ELITE_LOG_HOSTS").unwrap_or("").split(';').map(str::trim).filter(|x| !x.is_empty()).map(String::from).collect();
    v.extend(CFG_API_HOSTS.lock().unwrap().iter().cloned());
    let mut seen = std::collections::HashSet::new();
    v.retain(|h| seen.insert(h.trim_end_matches('/').to_ascii_lowercase()));
    v
}
/// A request to an API host failed on the way (no connection, timeout, a gateway that got no answer): the host is lost.
/// An answer of the server itself (404, 400, a rejection) says nothing about the way there.
fn api_err(host: &str, e: &ureq::Error) {
    if matches!(e, ureq::Error::Transport(_) | ureq::Error::Status(502..=504, _)) { reach::lost(reach::Pool::Api, host); }
}

/// What the window shows in Settings: every mirror and API host with the time of its answer, the best first.
fn net_status_json() -> Value {
    let one = |pool: reach::Pool| { let (list, checked) = reach::snapshot(pool); json!({"list": list, "checked": checked}) };
    json!({"data": one(reach::Pool::Data), "api": one(reach::Pool::Api)})
}
#[tauri::command]
fn net_status() -> Value { net_status_json() }
/// 1.4.2 (owner 03.11.2026): the way to Relic's game servers, checked at launcher start - the launcher offers our forwarding
/// servers (add-on relay_fwd, off by default) to the players it would help, they tick it themselves. Two checks:
/// - a connect to Relic's battle relays (ports 27000-27099 carry every online game) - closed or slow ports;
/// - a STREAM to Relic: 16 requests of ~7 KB on one kept connection (110 KB) - in Russia the way to foreign hosting often
///   passes a connect and the first ~33 KB, then stops (DPI; NetProbe 2-3.11.2026), and a match on such a way drops later.
/// Problem = a relay port closed, the median connect over 200 ms (players in Europe and Moscow connect in 100-130 ms; TvangeS,
/// Ukraine, 327 ms -> 540-640 ms round trips in the game, jerky), or the stream stopped / took over 12 s.
/// Also offered to players whose Relay.ini still says Mode=bridge: before Relay 17 (02.11.2026) "every game through our server"
/// was a mode of the one tick; the new forwarding tick is separate and off, so those players silently lost it.
const RELIC_RELAYS: [&str; 3] = ["54.87.3.63:27008", "44.203.117.150:27004", "184.198.184.150:27002"];
fn relay_ini(app: &App) -> String {
    game_dir(app).and_then(|d| std::fs::read_to_string(d.join("Elite_DLLs").join("Relay.ini")).ok()).unwrap_or_default()
}
fn old_bridge(ini: &str) -> bool { ini.lines().any(|l| l.trim().eq_ignore_ascii_case("Mode=bridge")) }
/// 1.4.5: not while the game runs (the check would compete with a match for the line) - the window asks again once it closes.
#[tauri::command]
async fn relic_probe(app: State<'_, App>) -> Result<Value, String> {
    if app.game_running.load(Ordering::Relaxed) || is_game_running() { return Ok(json!({"problem": false, "skipped": "game"})); }
    let old_bridge = old_bridge(&relay_ini(&app));
    Ok(tauri::async_runtime::spawn_blocking(move || relic_check(old_bridge))
        .await.unwrap_or_else(|e| json!({"problem": false, "why": e.to_string()})))
}
fn relic_check(old_bridge: bool) -> Value {
    {
        use std::net::{SocketAddr, TcpStream};
        let mut ms: Vec<i64> = Vec::new(); let mut closed = 0;
        for a in RELIC_RELAYS {
            let t0 = std::time::Instant::now();
            match a.parse::<SocketAddr>().map(|sa| TcpStream::connect_timeout(&sa, Duration::from_secs(3))) {
                Ok(Ok(_)) => ms.push(t0.elapsed().as_millis() as i64),
                _ => { closed += 1; ms.push(-1); }
            }
        }
        let mut ok: Vec<i64> = ms.iter().copied().filter(|m| *m >= 0).collect(); ok.sort();
        let median = ok.get(ok.len() / 2).copied().unwrap_or(-1);
        let agent = ureq::AgentBuilder::new().timeout(Duration::from_secs(6)).build();     // one kept connection for all requests
        let t0 = std::time::Instant::now(); let mut got = 0usize; let mut bytes = 0usize; let mut err = String::new();
        for _ in 0..16 {
            match agent.get("https://dow-api.reliclink.com/community/leaderboard/getAvailableLeaderboards?title=dow2r").call() {
                Ok(r) => { let b = r.into_string().unwrap_or_default(); bytes += b.len(); got += 1; }
                Err(e) => { err = e.to_string(); break; }
            }
            if t0.elapsed() > Duration::from_secs(12) { err = "too slow".into(); break; }
        }
        let secs = t0.elapsed().as_secs_f64();
        let stream_ok = got == 16;
        let slow = median > 200;
        let problem = closed > 0 || slow || !stream_ok || old_bridge;
        let why = if closed > 0 { format!("{closed} of {} Relic game server ports do not answer", RELIC_RELAYS.len()) }
            else if !stream_ok { format!("the stream to Relic stopped after {} KB ({err})", bytes / 1024) }
            else if slow { format!("Relic answers in {median} ms") }
            else if old_bridge { "your earlier setting sent every game through our server".into() } else { String::new() };
        c_log(&format!("relic probe: relays {:?} ms, stream {got}/16 requests {} KB in {:.1} s{}{}", ms, bytes / 1024, secs,
                       if problem { " - PROBLEM: " } else { "" }, why));
        json!({"relays": RELIC_RELAYS, "relays_ms": ms, "median_ms": median, "closed": closed, "stream_ok": stream_ok, "stream_kb": bytes / 1024,
               "stream_s": (secs * 10.0).round() / 10.0, "stream_got": got, "problem": problem, "why": why, "old_bridge": old_bridge})
    }
}

/// 1.4.5 (owner 03.11.2026): Settings -> "Online play" - Relic, our nodes and forwarding from this computer by the rules the
/// add-ons use (netgame.rs); 1.4.6: + our lobby servers (OwnLobby.dll). By the button (and once when the tab is first opened); ~10-20 s; never while the game runs.
static GAME_NET_BUSY: AtomicBool = AtomicBool::new(false);
#[tauri::command]
async fn game_net_check(app: State<'_, App>) -> Result<Value, String> {
    if app.game_running.load(Ordering::Relaxed) || is_game_running() { return Ok(json!({"skipped": "game"})); }
    if GAME_NET_BUSY.swap(true, Ordering::SeqCst) { return Ok(json!({"skipped": "busy"})); }
    let ini = relay_ini(&app);
    let lobby_ini = game_dir(&app).and_then(|d| std::fs::read_to_string(d.join("Elite_DLLs").join("OwnLobby.ini")).ok()).unwrap_or_default();
    let r = tauri::async_runtime::spawn_blocking(move || {
        // the node list: the DLL's three + the signed ladder list (what MMFind gives Relay.ini) + Relay.ini Nodes=
        let mut ladder: Option<Vec<(std::net::Ipv4Addr, String)>> = None;
        for host in fb_hosts() {
            match HTTP.get(&format!("{host}/ladder/api/relays")).timeout(Duration::from_secs(8)).call() {
                Ok(r) => { ladder = serde_json::from_str::<Value>(&r.into_string().unwrap_or_default()).ok().and_then(|d| netgame::signed_relays(&d)); break; }
                Err(e) => api_err(&host, &e),
            }
        }
        let (ini_nodes, port) = netgame::ini_nodes(&ini);
        let port = port.unwrap_or(netgame::GAME_PORT);
        let nodes = netgame::node_set(ladder.as_deref().unwrap_or(&[]), &ini_nodes);
        // UDP one node after another, as the DLL's ping loop does (bursts must not overlap); then Relic and TCP together
        let mut udp: Vec<Value> = Vec::new();
        for n in &nodes {
            if is_game_running() { return json!({"skipped": "game"}); }   // the game started meanwhile: stop, the line is its
            udp.push(netgame::measure(n.ip, port));
        }
        if is_game_running() { return json!({"skipped": "game"}); }
        let ob = old_bridge(&ini);
        let relic = std::thread::spawn(move || relic_check(ob));
        // 1.4.6: our lobby servers (OwnLobby.dll 2) - each as its watcher checks them, all of them (the DLL stops at the first usable)
        let (lobbies, lobby_stream) = netgame::lobby_ini(&lobby_ini);
        let lob: Vec<_> = lobbies.iter().cloned().map(|(h, p)| std::thread::spawn(move || netgame::lobby_check(&h, p, lobby_stream))).collect();
        let tcp: Vec<_> = nodes.iter().map(|n| { let ip = n.ip; std::thread::spawn(move || netgame::tcp_stream(ip)) }).collect();
        let tcp: Vec<Value> = tcp.into_iter().map(|h| h.join().unwrap_or(json!({"state": "none"}))).collect();
        let relic = relic.join().unwrap_or(json!({"problem": false}));
        let lob: Vec<Value> = lobbies.iter().zip(lob).map(|((h, p), j)| {
            let mut v = j.join().unwrap_or(json!({"state": "none"})); v["host"] = json!(h); v["port"] = json!(p); v }).collect();
        let lob_pick = netgame::lobby_pick(&lob);
        c_log(&format!("game net: lobby servers {}; used {}", lob.iter().map(|r| format!("{}:{} {}{}", r["host"].as_str().unwrap_or(""), r["port"],
            r["state"].as_str().unwrap_or(""), r["bytes"].as_u64().map(|b| format!(" {b} B")).unwrap_or_default())).collect::<Vec<_>>().join(", "),
            lob_pick.map(|i| format!("{}:{}", lob[i]["host"].as_str().unwrap_or(""), lob[i]["port"])).unwrap_or("none (Relic)".into())));
        let rows: Vec<Value> = nodes.iter().zip(udp).zip(tcp).map(|((n, u), t)| json!({"ip": n.ip.to_string(), "name": n.name, "src": n.src, "udp": u, "tcp": t})).collect();
        let near = netgame::nearest(&rows);
        c_log(&format!("game net: {} node(s) ({}), port {port}: {}; nearest {}", rows.len(), if ladder.is_some() { "ladder list" } else { "built-in list" },
            rows.iter().map(|r| format!("{} {} {}/{} tcp {}", r["ip"].as_str().unwrap_or(""), r["udp"]["ms"].as_u64().map(|m| format!("{m}ms")).unwrap_or("-".into()),
                r["udp"]["got"], netgame::BURST_N, r["tcp"]["state"].as_str().unwrap_or(""))).collect::<Vec<_>>().join(", "),
            near.map(|i| rows[i]["ip"].as_str().unwrap_or("").to_string()).unwrap_or("none".into())));
        json!({"nodes": rows, "nearest": near.map(|i| rows[i]["ip"].clone()).unwrap_or(json!("")), "port": port,
               "list": if ladder.is_some() { "ladder" } else { "builtin" }, "relic": relic,
               "lobby": {"servers": lob, "pick": lob_pick, "stream_check": lobby_stream},
               "ts": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)})
    }).await.map_err(|e| e.to_string());
    GAME_NET_BUSY.store(false, Ordering::SeqCst);
    r
}

/// "Check again" in Settings: both pools now (the answer comes as the net_rank event too).
#[tauri::command]
async fn net_check() -> Value {
    let _ = tauri::async_runtime::spawn_blocking(|| {
        let a = std::thread::spawn(|| { let b = reach::snapshot_candidates(reach::Pool::Data); reach::check(reach::Pool::Data, &b); });
        let b = reach::snapshot_candidates(reach::Pool::Api); reach::check(reach::Pool::Api, &b);
        let _ = a.join();
    }).await;
    net_status_json()
}

fn game_dir(app: &App) -> Option<PathBuf> {
    let cfg = app.config.lock().unwrap().clone().unwrap_or_default();
    let mut s = app.settings.lock().unwrap();
    if let Some(d) = &s.game_dir {
        if game::is_game_dir(d, &cfg.game.marker) {
            return Some(d.clone());
        }
    }
    let found = game::find_game(&cfg.game.folder, &cfg.game.marker);
    if found.is_some() {
        s.game_dir = found.clone();
        save_settings(&s);
    }
    found
}

fn current_channel(app: &App, cfg: &LauncherConfig, installed: &update::State) -> String {
    let s = app.settings.lock().unwrap();
    let want = s.channel.clone().filter(|c| cfg.channels.iter().any(|x| &x.id == c));
    want.or_else(|| Some(installed.channel.clone()).filter(|c| cfg.channels.iter().any(|x| &x.id == c)))
        .or_else(|| cfg.channels.iter().find(|c| c.default).map(|c| c.id.clone()))
        .or_else(|| cfg.channels.first().map(|c| c.id.clone()))
        .unwrap_or_default()
}

/// Hotkeys: every binding of the game (defaults + the player's changes) and the Grid Hotkeys setting.
#[tauri::command]
fn hotkeys_get(app: State<'_, App>) -> Result<Value, String> {
    // what the game uses now (keydefaults.lua), with the launcher's own list on top
    let mut o = elite_core::hotkeys::file_overrides();
    o.extend(app.settings.lock().unwrap().hotkeys.clone());
    elite_core::hotkeys::load(&o)
}

/// Save the player's hotkeys: only the bindings that differ from the game's defaults are kept.
#[tauri::command]
fn hotkeys_save(app: State<'_, App>, changes: BTreeMap<String, String>, grid: bool) -> Result<Value, String> {
    ensure_game_closed(&app)?;     // the game rewrites configuration.lua when it closes
    let mut s = app.settings.lock().unwrap();
    // changes already in keydefaults.lua but not in our list (see hotkeys_get) are kept, not dropped by the rewrite
    for (k, v) in elite_core::hotkeys::file_overrides() { s.hotkeys.entry(k).or_insert(v); }
    // system keys (menu, camera) are not reassigned, campaign / "plain letters" ones are not shown: changes to them are ignored
    let defaults: BTreeMap<String, String> = elite_core::hotkeys::load(&BTreeMap::new())?["bindings"].as_array().cloned().unwrap_or_default()
        .iter().filter(|b| !matches!(b["group"].as_str(), Some("system" | "campaign" | "letters"))).map(|b| (format!("{}:{}", b["scope"].as_str().unwrap_or(""), b["name"].as_str().unwrap_or("")), b["default"].as_str().unwrap_or("").to_string())).collect();
    for (k, v) in changes {
        if defaults.get(&k) == Some(&v) { s.hotkeys.remove(&k); } else if defaults.contains_key(&k) { s.hotkeys.insert(k, v); }
    }
    elite_core::hotkeys::apply(&s.hotkeys, Some(grid))?;
    save_settings(&s);
    let o = s.hotkeys.clone(); drop(s);
    elite_core::hotkeys::load(&o)
}

/// Back to the game's own hotkeys: no keydefaults.lua, no changes kept (Grid Hotkeys stays as it is).
#[tauri::command]
fn hotkeys_reset(app: State<'_, App>) -> Result<Value, String> {
    ensure_game_closed(&app)?;
    let mut s = app.settings.lock().unwrap();
    s.hotkeys.clear();
    elite_core::hotkeys::apply(&s.hotkeys, None)?;
    save_settings(&s); drop(s);
    elite_core::hotkeys::load(&BTreeMap::new())
}

/// Remove Elite completely: the mod, every add-on, the launcher's files in the game folder, then Steam checks the game
/// files and restores what Elite replaced - a clean vanilla game to start over from.
#[tauri::command]
fn uninstall_elite(app: State<'_, App>, handle: AppHandle) -> Result<Value, String> {
    ensure_game_closed(&app)?;
    if app.busy.load(Ordering::Relaxed) { return Err("files are being updated, wait a few seconds".into()); }
    let dir = game_dir(&app).ok_or("game folder not found")?;
    if !dir.join("DOW2.exe").is_file() { return Err("this is not the game folder".into()); }
    let cfg = app.config.lock().unwrap().clone().unwrap_or_default();
    let mut files = 0usize;
    for c in &cfg.components { files += update::Game::component(&dir, &c.id).uninstall().unwrap_or(0); restore_originals(&dir, &c.id); }
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
        s.channel = None; s.prev_channel = None; save_settings(&s);
    }
    // Steam puts back the original files Elite had replaced (and the ones we just removed if they were the game's)
    let _ = handle.opener().open_url("steam://validate/56400", None::<&str>);
    Ok(json!({"files": files, "removed": gone}))
}

/// Is the game (DOW2.exe) running? Its DLLs are locked then: add-ons can not be switched or updated under it.
/// 1.3.12: the process list is read here (Toolhelp snapshot). Before, a tasklist.exe was started every 3 s: a new process
/// each time, checked by the antivirus - players noticed the game stutter with the launcher open (01.11.2026).
#[cfg(windows)]
mod procs {
    #[repr(C)]
    pub struct Entry { pub size: u32, pub usage: u32, pub pid: u32, pub heap: usize, pub module: u32, pub threads: u32,
                       pub parent: u32, pub prio: i32, pub flags: u32, pub exe: [u16; 260] }
    #[link(name = "kernel32")]
    extern "system" {
        pub fn CreateToolhelp32Snapshot(flags: u32, pid: u32) -> isize;
        pub fn Process32FirstW(snap: isize, e: *mut Entry) -> i32;
        pub fn Process32NextW(snap: isize, e: *mut Entry) -> i32;
        pub fn CloseHandle(h: isize) -> i32;
        fn MultiByteToWideChar(cp: u32, flags: u32, s: *const u8, n: i32, w: *mut u16, wn: i32) -> i32;
    }
    #[link(name = "user32")]
    extern "system" {
        fn FindWindowW(class: *const u16, title: *const u16) -> isize;
        fn IsIconic(w: isize) -> i32;
        fn ShowWindow(w: isize, cmd: i32) -> i32;
        fn SetForegroundWindow(w: isize) -> i32;
    }
    /// The game's window to the front, restored if minimized (Lobbies, Join while the game runs: 03.11.2026). Right after the
    /// player's click in the launcher, Windows lets the launcher hand the foreground on. -> a window was there
    pub fn game_to_front() -> bool {
        let title: Vec<u16> = "Dawn of War II".encode_utf16().chain(std::iter::once(0)).collect();
        unsafe {
            let w = FindWindowW(std::ptr::null(), title.as_ptr());
            if w == 0 { return false; }
            if IsIconic(w) != 0 { ShowWindow(w, 9 /* SW_RESTORE */); }
            SetForegroundWindow(w); true
        }
    }
    /// Text a console program wrote (OEM code page: cp866 on a Russian Windows) as a String.
    pub fn oem_text(b: &[u8]) -> String {
        if b.is_empty() || b.len() > i32::MAX as usize { return String::from_utf8_lossy(b).into_owned(); }
        unsafe {
            let n = MultiByteToWideChar(1 /* CP_OEMCP */, 0, b.as_ptr(), b.len() as i32, std::ptr::null_mut(), 0);
            if n <= 0 { return String::from_utf8_lossy(b).into_owned(); }
            let mut w = vec![0u16; n as usize];
            MultiByteToWideChar(1, 0, b.as_ptr(), b.len() as i32, w.as_mut_ptr(), n);
            String::from_utf16_lossy(&w)
        }
    }
    pub fn running(name: &str) -> bool {
        unsafe {
            let snap = CreateToolhelp32Snapshot(2 /* TH32CS_SNAPPROCESS */, 0);
            if snap == -1 { return false; }
            let mut e: Entry = std::mem::zeroed(); e.size = std::mem::size_of::<Entry>() as u32;
            let mut found = false; let mut ok = Process32FirstW(snap, &mut e);
            while ok != 0 {
                let n = e.exe.iter().position(|&c| c == 0).unwrap_or(e.exe.len());
                if String::from_utf16_lossy(&e.exe[..n]).eq_ignore_ascii_case(name) { found = true; break; }
                ok = Process32NextW(snap, &mut e);
            }
            CloseHandle(snap); found
        }
    }
}
/// The game, or Elite's own starter that is about to start it (it waits up to a minute for the game's window): while
/// either runs, the add-on files stay as they are (1.4.2 - a second Play right after the first one, or an add-on update
/// in that minute, changed DLLs under the starting game).
fn is_game_running() -> bool {
    #[cfg(windows)]
    { procs::running("DOW2.exe") || procs::running("Elite.exe") }
    #[cfg(not(windows))]
    {
        std::process::Command::new("pgrep").args(["-fi", "dow2\\.exe|[\\\\/]elite\\.exe"]).output().map(|o| o.status.success()).unwrap_or(false)
    }
}

/// Can this copy replace itself? Not the portable zip: there is no installer next to it, and the Windows
/// update (the NSIS installer) would put a second copy into AppData instead.
fn self_update_supported() -> bool {
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
async fn launcher_check(app: AppHandle) -> Option<Value> {
    if !self_update_supported() {
        return None;
    }
    // where to ask (02.11): our hosts in the order that answers best from here (each one's updater.json links its own
    // files), GitHub Releases last; a build without our hosts keeps the endpoints of tauri.conf.json
    let mut urls: Vec<tauri::Url> = fb_hosts().iter().filter_map(|h| tauri::Url::parse(&format!("{h}/elite/dl/updater.json")).ok()).collect();
    urls.extend(tauri::Url::parse(GITHUB_UPDATER).ok());
    let updater = if urls.len() > 1 { app.updater_builder().endpoints(urls).ok()?.build().ok()? } else { app.updater().ok()? };
    let upd = updater.check().await.ok()??;
    let info = json!({"version": upd.version, "notes": upd.body});
    *app.state::<App>().launcher_update.lock().unwrap() = Some(upd);
    Some(info)
}

/// Download the new launcher, check its signature, install it and start it. On Windows the installer
/// closes this window itself; elsewhere we restart into the new copy.
#[tauri::command]
async fn launcher_install(app: AppHandle) -> Result<(), String> {
    ensure_game_closed(&app.state::<App>())?;   // the installer closes the launcher; never in the middle of a game
    let upd = app.state::<App>().launcher_update.lock().unwrap().clone().ok_or("no launcher update found")?;
    let h = app.clone();
    let mut done = 0u64;
    let progress = move |n: usize, total: Option<u64>| {
        done += n as u64;
        let _ = h.emit("launcher_progress", json!({"done": done, "total": total}));
    };
    #[cfg(windows)]
    {
        // The NSIS installer checks first thing that the launcher is closed, and gives up with "Failed to close Elite
        // Launcher" when it catches it half-way through closing (siritos 29.10: the plugin starts the installer and only
        // then exits). So: download (the signature is checked there), then the installer is started 3 s after this
        // process is gone, with the plugin's own arguments (passive, update, restart). The plugin's way if that fails.
        let bytes = upd.download(progress, || {}).await.map_err(|e| e.to_string())?;
        let path = std::env::temp_dir().join(format!("EliteLauncher-{}-setup.exe", upd.version));
        if std::fs::write(&path, &bytes).is_ok() {
            use std::os::windows::process::CommandExt;
            let line = format!("ping -n 4 127.0.0.1 >NUL & start \"\" \"{}\" /P /UPDATE /R /ARGS", path.display());
            let started = std::process::Command::new("cmd").arg("/C").raw_arg(&line)
                .creation_flags(0x0800_0000 /* CREATE_NO_WINDOW */ | 0x0000_0200 /* CREATE_NEW_PROCESS_GROUP */)
                .stdin(std::process::Stdio::null()).stdout(std::process::Stdio::null()).stderr(std::process::Stdio::null())
                .spawn().is_ok();
            if started { std::process::exit(0); }
        }
        upd.install(bytes).map_err(|e| e.to_string())?;
        app.restart()
    }
    #[cfg(not(windows))]
    {
        upd.download_and_install(progress, || {}).await.map_err(|e| e.to_string())?;
        app.restart()
    }
}

fn ensure_game_closed(app: &App) -> Result<(), String> {
    if app.game_running.load(Ordering::Relaxed) {
        return Err("the game is running: close it to change add-ons or update".into());
    }
    Ok(())
}

/// Everything the window needs to draw itself.
/// The launcher itself sits in the game folder (or below it): its files there break the game (crash while a match loads).
fn launcher_in_game_dir() -> bool {
    let Ok(exe) = std::env::current_exe() else { return false };
    exe.ancestors().skip(1).take(3).any(|d| d.join("DOW2.exe").is_file())
}

#[tauri::command]
fn get_status(app: State<'_, App>) -> Value {
    let cfg = app.config.lock().unwrap().clone();
    let dir = game_dir(&app);
    let installed = dir.as_ref().map(|d| update::Game::new(d).load_state()).unwrap_or_default();
    let cfgd = cfg.clone().unwrap_or_default();
    let channel = current_channel(&app, &cfgd, &installed);
    let target = cfgd.channels.iter().find(|c| c.id == channel).cloned();
    let s = app.settings.lock().unwrap().clone();
    let launcher_update = cfgd.launcher_update.as_ref().filter(|u| version_newer(&u.version, LAUNCHER_VERSION)).map(|u| {
        json!({"version": u.version, "text": u.text, "url": u.urls.get(os_name()).or_else(|| u.urls.get("all")).cloned().unwrap_or_default()})
    });
    json!({
        "launcher_version": LAUNCHER_VERSION,
        "in_game_dir": launcher_in_game_dir(),
        "os": os_name(),
        "lang": s.lang,
        "config": cfg,
        "config_loaded": cfg.is_some(),
        "steam_found": game::steam_installed(),
        "game_dir": dir,
        "game_found": dir.is_some(),
        "installed_version": installed.version,
        "installed_channel": installed.channel,
        "channel": channel,
        "target_version": target.as_ref().map(|t| t.version.clone()).unwrap_or_default(),
        "update_available": !installed.version.is_empty() && target.as_ref().is_some_and(|t| t.version != installed.version),
        "launcher_update": launcher_update,
        "busy": app.busy.load(Ordering::Relaxed),
        "game_running": app.game_running.load(Ordering::Relaxed),
        // RoomJoin.dll in the game folder (its add-on, or a copy put there by hand for a test): the Lobbies tab offers "Join"
        "roomjoin_dll": dir.as_ref().map(|d| d.join("Elite_DLLs").join("RoomJoin.dll").is_file()).unwrap_or(false),
        "last_error": app.last_error.lock().unwrap().clone(),
        "cache_mb": s.cache_mb.unwrap_or(DEFAULT_CACHE_MB),
        "extra_mirror": s.extra_mirror,
        "dismissed": s.dismissed,
        "mirror_count": mirrors(&s, cfg.as_ref()).count(),
        // old copies of our add-ons: the window syncs the add-ons (they are put aside there) before Play starts the game
        "old_copies": dir.as_ref().map(|d| old_copies(d, &cfgd)).unwrap_or_default(),
        "components": cfgd.components.iter().map(|c| json!({
            "id": c.id, "name": c.name, "description": c.description, "latest": c.version, "home": c.home, "category": c.category, "order": c.order,
            "enabled": s.components.get(&c.id).copied().unwrap_or(c.default),
            "conflicts": dir.as_ref().map(|d| found_conflicts(d, c)).unwrap_or_default(),
            "installed": dir.as_ref().map(|d| update::Game::component(d, &c.id).load_state().version).unwrap_or_default(),
            "options": c.opts().iter().map(|o| {
                let k = format!("{}.{}", c.id, o.id);
                json!({
                    "id": o.id, "name": o.name, "group": o.group,
                    "on": s.comp_options.get(&k).copied().unwrap_or(o.default),
                    "choices": o.choices, "value": if o.choices.is_empty() { String::new() } else { o.ini_value(false, s.comp_values.get(&k)) },
                })
            }).collect::<Vec<_>>(),
        })).collect::<Vec<_>>(),
        "usage_stats": s.usage_stats.unwrap_or(true),
        "mute_mention": s.mute_mention.unwrap_or(false),
        "close_quits": s.close_quits.unwrap_or(false),
        "lan_share": s.lan_share.unwrap_or(true),
        "release_news": app.release_news.lock().unwrap().clone(),
        "costs": app.costs.lock().unwrap().clone(),
        "prev_channel": s.prev_channel.filter(|p| p != &channel && cfgd.channels.iter().any(|c| &c.id == p)),
        "main_channel": cfgd.channels.iter().find(|c| c.default).map(|c| c.id.clone()).unwrap_or_default(),
    })
}

/// Fetch the newest launcher.json (falls back to the cached one when offline).
#[tauri::command]
async fn refresh(app: AppHandle) -> Result<Value, String> {
    let st = app.state::<App>();
    let s = st.settings.lock().unwrap().clone();
    let cached = st.config.lock().unwrap().clone();
    let appn = app.clone();
    let res = tauri::async_runtime::spawn_blocking(move || {
        let mut m = mirrors(&s, cached.as_ref());
        m.on_status = Some(Box::new(move |msg| { let _ = appn.emit("net", msg); }));
        let r = update::fetch_config(&m).map(|r| (r, m.current_base()));
        data_note(&m, r.is_ok());
        r
    })
    .await
    .map_err(|e| e.to_string())?;
    match res {
        Ok(((cfg, raw, sig), worked)) => {
            remember_mirror(&st, worked);
            let _ = std::fs::write(data_dir().join("launcher.json"), raw);
            let _ = std::fs::write(data_dir().join("launcher.json.sig"), sig);
            note_config(&cfg);
            *st.config.lock().unwrap() = Some(cfg);
            st.last_error.lock().unwrap().clear();
        }
        Err(e) => *st.last_error.lock().unwrap() = format!("offline: {e}"),
    }
    let a2 = app.clone();
    let _ = tauri::async_runtime::spawn_blocking(move || compute_costs(&a2)).await;
    Ok(get_status(app.state::<App>()))
}

#[tauri::command]
fn set_channel(app: State<'_, App>, id: String) {
    let mut s = app.settings.lock().unwrap();
    s.channel = Some(id);
    save_settings(&s);
}

/// One click: remember where we came from, pick the version and install it right away.
#[tauri::command]
fn switch_to(app: AppHandle, id: String) -> Result<(), String> {
    {
        let st = app.state::<App>();
        if st.busy.load(Ordering::Relaxed) {
            return Err("already running".into());
        }
        let cfg = st.config.lock().unwrap().clone().unwrap_or_default();
        let installed = game_dir(&st).map(|d| update::Game::new(d).load_state()).unwrap_or_default();
        let cur = current_channel(&st, &cfg, &installed);
        let mut s = st.settings.lock().unwrap();
        if !installed.version.is_empty() && cur != id {
            s.prev_channel = Some(cur);
        }
        s.channel = Some(id);
        save_settings(&s);
    }
    start_update(app, false, None)
}

#[tauri::command]
fn set_setting(app: State<'_, App>, key: String, value: Value) {
    let mut s = app.settings.lock().unwrap();
    match key.as_str() {
        "lang" => s.lang = value.as_str().unwrap_or("").to_string(),
        "extra_mirror" => s.extra_mirror = value.as_str().unwrap_or("").to_string(),
        "cache_mb" => s.cache_mb = value.as_u64(),
        "usage_stats" => s.usage_stats = value.as_bool(),
        "mute_mention" => s.mute_mention = value.as_bool(),
        "close_quits" => s.close_quits = value.as_bool(),
        "lan_share" => { s.lan_share = value.as_bool(); elite_core::lan::ENABLED.store(s.lan_share.unwrap_or(true), Ordering::Relaxed); }
        "dismiss" => {
            if let Some(id) = value.as_str() {
                s.dismissed.push(id.to_string());
            }
        }
        _ => {}
    }
    save_settings(&s);
}

#[tauri::command]
fn set_component(app: State<'_, App>, id: String, on: bool) -> Result<(), String> {
    ensure_game_closed(&app)?;
    let mut s = app.settings.lock().unwrap();
    s.components.insert(id, on);
    save_settings(&s);
    Ok(())
}

/// Write every component option to its ini file (only for installed components).
fn apply_options(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings) {
    for c in &cfg.components {
        if update::Game::component(dir, &c.id).load_state().version.is_empty() { continue; }
        for o in c.opts() {
            if o.ini.is_empty() || o.ini.contains("..") { continue; }
            let k = format!("{}.{}", c.id, o.id);
            let on = s.comp_options.get(&k).copied().unwrap_or(o.default);
            let _ = elite::set_ini_value(&dir.join(&o.ini), &o.section, &o.key, &o.ini_value(on, s.comp_values.get(&k)));
        }
    }
}

/// Tick/untick an option of an add-on: saved and written to the game folder right away (takes effect on next game start).
#[tauri::command]
fn set_comp_option(app: State<'_, App>, comp: String, opt: String, on: bool) -> Result<(), String> {
    ensure_game_closed(&app)?;
    let s = {
        let mut s = app.settings.lock().unwrap();
        s.comp_options.insert(format!("{comp}.{opt}"), on);
        save_settings(&s);
        s.clone()
    };
    if let (Some(dir), Some(cfg)) = (game_dir(&app), app.config.lock().unwrap().clone()) {
        apply_options(&dir, &cfg, &s);
    }
    Ok(())
}

/// Pick one of an option's choices (e.g. where the match timer sits): saved and written like a tick.
#[tauri::command]
fn set_comp_value(app: State<'_, App>, comp: String, opt: String, value: String) -> Result<(), String> {
    ensure_game_closed(&app)?;
    let s = {
        let mut s = app.settings.lock().unwrap();
        s.comp_values.insert(format!("{comp}.{opt}"), value);
        save_settings(&s);
        s.clone()
    };
    if let (Some(dir), Some(cfg)) = (game_dir(&app), app.config.lock().unwrap().clone()) {
        apply_options(&dir, &cfg, &s);
    }
    Ok(())
}

/// Hand-installed copies of a component that are in the game folder right now (see Component::conflicts).
fn found_conflicts(dir: &std::path::Path, c: &elite_core::config::Component) -> Vec<String> {
    hand_copy_paths(c).into_iter().filter(|f| !f.contains("..") && update::Game::new(dir).file(f).is_file()).collect()
}

/// Where a hand-installed copy of a component can be: its `conflicts` list and, for every add-on with a DLL, the stand-alone
/// package's dow2-patches/<dll> (its winmm.dll loads every DLL there, whatever the launcher's ticks say).
fn hand_copy_paths(c: &elite_core::config::Component) -> Vec<String> {
    let mut v = c.conflicts.clone();
    if !c.inject.is_empty() {
        let p = format!("dow2-patches/{}", c.inject);
        if !v.iter().any(|x| x.eq_ignore_ascii_case(&p)) { v.push(p); }
    }
    v
}

/// 1.3.9 (owner 31.10.2026: an add-on that is off must not be loaded at all). Before every start an add-on that is off
/// has no DLL in Elite_DLLs: a copy left there (e.g. from before an add-on id changed) was loaded when the game was
/// started past the launcher (Steam, Elite.exe) with an older Elite.launchconfig. 1.4.2: the DLL is deleted, not renamed
/// to *.off - nothing of an add-on that is off stays in Elite_DLLs (players' logs 31.10-02.11: X.dll.off files among the
/// game's modules); turned on again, the add-on is installed again (its files come from the version cache).
/// Hand-installed copies are not touched here any more: old_copies() finds them and the start waits until they are gone.
/// Only our add-ons (the ones in launcher.json): never a file of Elite itself, never a DLL an add-on that is on injects.
/// -> what it did, for the player: "Elite_DLLs/X.dll" for every DLL that went.
fn enforce_off(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings) -> Vec<String> {
    let elite_owned = elite_files(dir);
    let on_injects: std::collections::HashSet<String> = cfg.components.iter()
        .filter(|c| !c.inject.is_empty() && s.components.get(&c.id).copied().unwrap_or(c.default))
        .map(|c| c.inject.to_ascii_lowercase()).collect();
    let mut done = Vec::new();
    for c in &cfg.components {
        if c.inject.is_empty() || s.components.get(&c.id).copied().unwrap_or(c.default) { continue; }
        let cg = update::Game::component(dir, &c.id);
        let dll = dir.join("Elite_DLLs").join(&c.inject);
        let was = dll.is_file();
        if !cg.load_state().version.is_empty() { let _ = cg.uninstall(); }
        let rel = format!("Elite_DLLs/{}", c.inject);
        if dll.is_file() && !on_injects.contains(&c.inject.to_ascii_lowercase()) && !elite_owned.contains(&rel.to_ascii_lowercase()) {
            let _ = std::fs::remove_file(&dll);
        }
        if was && !dll.is_file() { done.push(rel); }
    }
    done
}

/// The files of Elite itself (its installed version's manifest), lower case "Elite_DLLs/X.dll" paths: never touched.
fn elite_files(dir: &std::path::Path) -> std::collections::HashSet<String> {
    update::Game::new(dir).load_state().files.iter().map(|f| f.path.to_ascii_lowercase()).collect()
}

/// Every DLL name that is ours (lower case): what the add-ons of the catalog inject, the retired ones, and every DLL a
/// component the launcher ever installed lists (renamed add-ons included) - minus the files of Elite itself.
fn our_dll_names(dir: &std::path::Path, cfg: &LauncherConfig) -> std::collections::HashSet<String> {
    let mut v: std::collections::HashSet<String> = cfg.components.iter().filter(|c| !c.inject.is_empty())
        .map(|c| c.inject.to_ascii_lowercase()).collect();
    v.extend(RETIRED_DLLS.iter().map(|n| n.to_ascii_lowercase()));
    for id in update::Game::component_ids(dir) {
        for f in update::Game::component(dir, &id).load_state().files {
            let name = f.path.rsplit('/').next().unwrap_or(&f.path).to_ascii_lowercase();
            if name.ends_with(".dll") { v.insert(name); }
        }
    }
    let elite = elite_files(dir);
    v.retain(|n| !elite.contains(&format!("elite_dlls/{n}")));
    v
}

/// Is this file name a leftover of one of our DLLs: "<ours>.dll.<anything>" - X.dll.off (older launchers turned add-ons
/// off that way), X.dll.eliteupd (an update cut short), X.dll.bak, X.dll.old...
fn our_leftover(name: &str, ours: &std::collections::HashSet<String>) -> bool {
    let l = name.to_ascii_lowercase();
    l.find(".dll.").map_or(false, |i| ours.contains(&l[..i + 4]) && l.len() > i + 5)
}

/// 1.4.2: before every start, the leftovers of our DLLs go from Elite_DLLs (deleted - they are ours and come back from
/// the version cache or the server if ever needed). Players' logs 31.10-02.11: Cooldowns.dll.off, Relay.dll.off,
/// Relay.dll.eliteupd... among the modules of a running game. Files of Elite and anything not ours stay as they are.
fn drop_leftovers(dir: &std::path::Path, cfg: &LauncherConfig) -> Vec<String> {
    let ours = our_dll_names(dir, cfg);
    let mut gone = Vec::new();
    let Ok(rd) = std::fs::read_dir(dir.join("Elite_DLLs")) else { return gone };
    for e in rd.flatten() {
        let n = e.file_name().to_string_lossy().to_string();
        if e.path().is_file() && our_leftover(&n, &ours) && std::fs::remove_file(e.path()).is_ok() {
            gone.push(format!("Elite_DLLs/{n}"));
        }
    }
    gone
}

/// Old copies of our add-ons outside what the launcher installs, which the game would load next to (or instead of) the
/// launcher's: the stand-alone dow2-patches package (its winmm.dll loads every DLL in dow2-patches/, whatever the ticks
/// say) and the even older LobbyStats/ folder. Put aside without asking before every add-on sync and every start (owner
/// 03.11.2026: one copy of every patch - the launcher's latest). Paths relative to the game folder.
fn old_copies(dir: &std::path::Path, cfg: &LauncherConfig) -> Vec<String> {
    let mut v: Vec<String> = Vec::new();
    for c in &cfg.components {
        for f in found_conflicts(dir, c) { if !v.iter().any(|x| x.eq_ignore_ascii_case(&f)) { v.push(f); } }
    }
    if dir.join("LobbyStats").join("LobbyStats.dll").is_file() { v.push("LobbyStats/LobbyStats.dll".into()); }
    v
}

/// Put the old copies aside: into <game>/.elite_cache/old-addons-<time>/ (never deleted - can be put back by hand), with
/// their .ini next to them; the stand-alone loader (winmm.dll, its readmes) too once dow2-patches has no DLL left.
/// -> what moved
fn put_aside_old_copies(dir: &std::path::Path, cfg: &LauncherConfig) -> Vec<String> {
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let bin = update::Game::new(dir).cache_dir().join(format!("old-addons-{stamp}"));
    let mut moved = Vec::new();
    let mut put = |rel: &str| {
        let from = dir.join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
        if !from.is_file() { return; }
        let to = bin.join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
        if let Some(p) = to.parent() { let _ = std::fs::create_dir_all(p); }
        if std::fs::rename(&from, &to).is_ok() { moved.push(rel.to_string()); }
    };
    for f in old_copies(dir, cfg) {
        put(&f);
        if let Some((a, _)) = f.rsplit_once('.') { put(&format!("{a}.ini")); }
    }
    let pd = dir.join("dow2-patches");
    let dlls_left = std::fs::read_dir(&pd).map(|rd| rd.flatten().any(|e| e.file_name().to_string_lossy().to_ascii_lowercase().ends_with(".dll"))).unwrap_or(false);
    if !dlls_left {
        for name in ["winmm.dll", "README_EN.txt", "README_RU.txt"] {
            if is_patches_loader_file(dir, name) { put(name); }
        }
        if pd.is_dir() && std::fs::read_dir(&pd).map(|mut rd| rd.next().is_none()).unwrap_or(false) {
            let _ = std::fs::remove_dir(&pd);
        }
    }
    let lf = dir.join("LobbyStats");
    if lf.is_dir() && std::fs::read_dir(&lf).map(|rd| !rd.flatten().any(|e| e.file_name().to_string_lossy().to_ascii_lowercase().ends_with(".dll"))).unwrap_or(false) {
        if let Ok(rd) = std::fs::read_dir(&lf) {
            for e in rd.flatten() { if e.path().is_file() { put(&format!("LobbyStats/{}", e.file_name().to_string_lossy())); } }
        }
        let _ = std::fs::remove_dir(&lf);
    }
    moved
}

/// A file of the stand-alone dow2-patches package at the top of the game folder (its winmm.dll loader names its folder
/// in UTF-16, the readmes in plain text) - and not some other winmm.dll.
fn is_patches_loader_file(dir: &std::path::Path, name: &str) -> bool {
    let wide: Vec<u8> = "dow2-patches".encode_utf16().flat_map(|u| u.to_le_bytes()).collect();
    std::fs::read(dir.join(name))
        .map(|b| b.windows(12).any(|w| w == b"dow2-patches") || b.windows(wide.len()).any(|w| w == wide.as_slice()))
        .unwrap_or(false)
}

/// DLLs of add-ons that are gone from the catalog without a component of their own to clean up after them
/// (02.11.2026: LoadingRatings.dll is part of LobbyStats.dll again). Deleted like enforce_off does, unless an add-on of
/// the catalog injects that name again.
const RETIRED_DLLS: &[&str] = &["LoadingRatings.dll"];

/// Add-ons that are no longer in the catalog: renamed ones (matchtimer -> matchtimer_r2, lobbystats -> lobbystats_r3...)
/// and retired ones. Nothing else ever touches them: enforce_off and sync_components go only through the catalog, so
/// their state and their DLLs stayed in the game folder for good (players' logs 01-02.11.2026: MatchTimer v4, Relay 2,
/// LoadingRatings loaded with those add-ons off). Their files go, except the ones a current add-on or Elite owns now;
/// a DLL that goes leaves InjectedFiles unless a current add-on injects it. Before every start and every update.
fn drop_orphans(dir: &std::path::Path, cfg: &LauncherConfig) -> Vec<String> {
    use std::collections::HashSet;
    let known: HashSet<String> = cfg.components.iter().map(|c| update::component_key(&c.id)).collect();
    let main = update::Game::new(dir);
    let mut owned: HashSet<String> = main.load_state().files.iter().map(|f| f.path.to_ascii_lowercase()).collect();
    for c in &cfg.components {
        owned.extend(update::Game::component(dir, &c.id).load_state().files.iter().map(|f| f.path.to_ascii_lowercase()));
    }
    let injected: HashSet<String> = cfg.components.iter().filter(|c| !c.inject.is_empty()).map(|c| c.inject.to_ascii_lowercase()).collect();
    let mut gone = Vec::new();
    let unlist = |name: &str| {
        if !injected.contains(&name.to_ascii_lowercase()) {
            if let Ok(names) = elite::set_injected_all(dir, name, false) { for n in names { main.accept_local_edit(&n); } }
        }
    };
    for id in update::Game::component_ids(dir) {
        if known.contains(&id) { continue; }
        let g = update::Game::component(dir, &id);
        let n_files = g.load_state().files.len();
        let Ok(removed) = g.uninstall_keeping(|p| owned.contains(&p.to_ascii_lowercase())) else { continue };
        // its saved game originals go back only if nothing of it is shared with a current add-on (a renamed one would
        // get its files overwritten)
        if removed.len() == n_files { restore_originals(dir, &id); }
        for f in removed {
            let name = f.rsplit('/').next().unwrap_or(&f).to_string();
            if name.to_ascii_lowercase().ends_with(".dll") { unlist(&name); }
            gone.push(format!("{id}: {f}"));
        }
    }
    for name in RETIRED_DLLS {
        if injected.contains(&name.to_ascii_lowercase()) { continue; }
        let p = dir.join("Elite_DLLs").join(name);
        if p.is_file() && std::fs::remove_file(&p).is_ok() { gone.push(format!("retired: Elite_DLLs/{name}")); }
        unlist(name);
    }
    gone
}

/// Component wanted by the player and not replaced by a hand-installed copy.
fn comp_on(dir: &std::path::Path, c: &elite_core::config::Component, s: &Settings) -> bool {
    s.components.get(&c.id).copied().unwrap_or(c.default) && found_conflicts(dir, c).is_empty()
}

/// The launch config lists exactly the add-ons that are on and whose DLL is in place. Elite updates and Elite's own
/// tools rewrite Elite.launchconfig, so this runs before every start, not only when a checkbox changes.
/// -> the DLLs of our add-ons it took out of a launch config (an add-on that is off was still listed there).
fn sync_injected(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings) -> Vec<String> {
    let main = update::Game::new(dir);
    let mut out = Vec::new();
    for c in cfg.components.iter().filter(|c| !c.inject.is_empty()) {
        let on = comp_on(dir, c, s) && dir.join("Elite_DLLs").join(&c.inject).is_file();
        if let Ok(names) = elite::set_injected_all(dir, &c.inject, on) {
            if !on && !names.is_empty() { out.push(c.inject.clone()); }
            for name in names { main.accept_local_edit(&name); }
        }
    }
    out
}

/// Turn off launcher copies of components that now have a hand-installed copy (checked before every game start).
fn drop_conflicting(dir: &std::path::Path, cfg: &LauncherConfig) {
    let main = update::Game::new(dir);
    for c in &cfg.components {
        if found_conflicts(dir, c).is_empty() { continue; }
        let g = update::Game::component(dir, &c.id);
        if !g.load_state().version.is_empty() { let _ = g.uninstall(); }
        if !c.inject.is_empty() {
            if let Ok(names) = elite::set_injected_all(dir, &c.inject, false) {
                for name in names { main.accept_local_edit(&name); }
            }
        }
    }
}

/// "Clean up the junk" in Settings (owner 01.11.2026: clear all stray plugins, then set everything up again). Moves into
/// <game>/.elite_cache/junk-<time>/ (never deleted - a mistake can be put back by hand):
/// - the whole stand-alone package: dow2-patches/, the old LobbyStats/ folder, its winmm.dll loader in the game folder;
/// - every DLL-like file at the top of Elite_DLLs (*.dll, *.off, *.bak, *.dll.*) that is neither Elite's own (the installed
///   version's manifest) nor a file of an add-on that is on; the add-ons' .ini / .log / caches stay (players' settings);
/// - InjectedFiles entries whose DLL is not in Elite_DLLs any more.
/// The window runs "check & repair" right after it: Elite's files and the ticked add-ons come back as they should be.
#[tauri::command]
fn clean_junk(app: State<'_, App>) -> Result<Value, String> {
    ensure_game_closed(&app)?;
    let dir = game_dir(&app).ok_or("game folder not found")?;
    let cfg = app.config.lock().unwrap().clone().unwrap_or_default();
    let s = app.settings.lock().unwrap().clone();
    Ok(junk_cleanup(&dir, &cfg, &s))
}

fn junk_cleanup(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings) -> Value {
    let main = update::Game::new(dir);
    let mut keep: std::collections::HashSet<String> = main.load_state().files.iter().map(|f| f.path.to_ascii_lowercase()).collect();
    for c in &cfg.components {
        if comp_on(dir, c, s) {
            keep.extend(update::Game::component(dir, &c.id).load_state().files.iter().map(|f| f.path.to_ascii_lowercase()));
        }
    }
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let bin = main.cache_dir().join(format!("junk-{stamp}"));
    let mut moved: Vec<String> = Vec::new();
    let mut put = |rel: &str| {
        let from = main.file(rel);
        if !from.exists() || keep.contains(&rel.to_ascii_lowercase()) { return; }
        let to = bin.join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
        if let Some(p) = to.parent() { let _ = std::fs::create_dir_all(p); }
        if std::fs::rename(&from, &to).is_ok() { moved.push(rel.to_string()); }
    };
    for folder in ["dow2-patches", "LobbyStats"] {
        if dir.join(folder).is_dir() { put(folder); }
    }
    if dir.join("winmm.dll").is_file() { put("winmm.dll"); }
    if let Ok(rd) = std::fs::read_dir(dir.join("Elite_DLLs")) {
        for e in rd.flatten() {
            if !e.path().is_file() { continue; }
            let n = e.file_name().to_string_lossy().to_string();
            let l = n.to_ascii_lowercase();
            if l.ends_with(".dll") || l.ends_with(".off") || l.contains(".bak") || l.contains(".dll.") {
                put(&format!("Elite_DLLs/{n}"));
            }
        }
    }
    // InjectedFiles: names whose DLL is gone
    let mut dropped = Vec::new();
    if let Ok(text) = std::fs::read_to_string(dir.join(elite::LAUNCHCONFIG)) {
        if let Some(line) = text.lines().find_map(|l| l.strip_prefix("InjectedFiles=")) {
            for name in line.split(',').map(|x| x.trim().to_string()).filter(|x| !x.is_empty()) {
                if !dir.join("Elite_DLLs").join(&name).is_file() {
                    if let Ok(files) = elite::set_injected_all(dir, &name, false) {
                        for f in files { main.accept_local_edit(&f); }
                    }
                    dropped.push(name);
                }
            }
        }
    }
    json!({"moved": moved, "uninjected": dropped, "backup": bin.display().to_string()})
}

fn backup_dir(dir: &std::path::Path, id: &str) -> PathBuf {
    let id: String = id.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_').collect();
    dir.join(".elite_launcher").join("backup").join(id)
}
/// Copy the game files this add-on is about to overwrite (only files that exist and have no backup yet).
fn backup_originals(dir: &std::path::Path, id: &str, man: &elite_core::manifest::Manifest) {
    let b = backup_dir(dir, id);
    for f in &man.files {
        if f.path.contains("..") { continue; }
        let src = update::Game::new(dir).file(&f.path);
        let dst = b.join(f.path.replace('/', std::path::MAIN_SEPARATOR_STR));
        if src.is_file() && !dst.exists() {
            if let Some(p) = dst.parent() { let _ = std::fs::create_dir_all(p); }
            let _ = std::fs::copy(&src, &dst);
        }
    }
}
/// Put back the originals saved by backup_originals and forget the backup.
fn restore_originals(dir: &std::path::Path, id: &str) {
    let b = backup_dir(dir, id);
    fn walk(root: &std::path::Path, cur: &std::path::Path, dir: &std::path::Path) {
        let Ok(rd) = std::fs::read_dir(cur) else { return };
        for e in rd.flatten() {
            let p = e.path();
            if p.is_dir() { walk(root, &p, dir); continue; }
            if let Ok(rel) = p.strip_prefix(root) {
                let dst = dir.join(rel);
                if let Some(d) = dst.parent() { let _ = std::fs::create_dir_all(d); }
                let _ = std::fs::copy(&p, &dst);
            }
        }
    }
    if b.is_dir() { walk(&b, &b, dir); let _ = std::fs::remove_dir_all(&b); }
}

/// Install ticked components, remove unticked ones, keep Elite.launchconfig in sync.
fn sync_components(dir: &std::path::Path, cfg: &LauncherConfig, s: &Settings, m: &Mirrors, progress: &mut dyn FnMut(&update::Progress)) -> Result<(), update::Error> {
    let main = update::Game::new(dir);
    if main.load_state().version.is_empty() {
        return Ok(()); // Elite itself is not installed yet
    }
    put_aside_old_copies(dir, cfg);      // one copy of every patch: the launcher's (owner 03.11.2026)
    drop_leftovers(dir, cfg);
    drop_orphans(dir, cfg);
    for c in &cfg.components {
        let on = comp_on(dir, c, s);
        let g = update::Game::component(dir, &c.id);
        if on {
            let man = update::load_manifest(&g, m, &c.version)?;
            // an add-on that replaces game files (e.g. a translation): keep the originals the first time, put them back when it is off
            if g.load_state().version.is_empty() { backup_originals(dir, &c.id, &man); }
            update::apply(&g, m, &man, &update::Options { verify_all: false, cache_limit: s.cache_mb.unwrap_or(DEFAULT_CACHE_MB) << 20, channel: c.id.clone() }, progress)?;
            if c.id == "lobbystats" {
                elite::clean_lobbystats_ini(dir).map_err(|e| update::Error::Io(e.to_string()))?;
            }
        } else if !g.load_state().version.is_empty() {
            g.uninstall()?;
            restore_originals(dir, &c.id);
        }
        if !c.inject.is_empty() {
            for name in elite::set_injected_all(dir, &c.inject, on).map_err(|e| update::Error::Io(e.to_string()))? {
                main.accept_local_edit(&name);
            }
        }
    }
    apply_options(dir, cfg, s);
    Ok(())
}

#[tauri::command]
async fn pick_game_dir(app: AppHandle) -> Result<Value, String> {
    let picked = app.dialog().file().blocking_pick_folder();
    let st = app.state::<App>();
    if let Some(p) = picked.and_then(|p| p.into_path().ok()) {
        let marker = st.config.lock().unwrap().clone().unwrap_or_default().game.marker;
        if !game::is_game_dir(&p, &marker) {
            return Err(format!("{marker} not found in this folder"));
        }
        let mut s = st.settings.lock().unwrap();
        s.game_dir = Some(p);
        save_settings(&s);
    }
    Ok(get_status(app.state::<App>()))
}

#[tauri::command]
fn open_url(app: AppHandle, url: String) -> Result<(), String> {
    let ok = url.starts_with("https://") || url.starts_with("http://") || url.starts_with("steam://");
    if !ok {
        return Err("unsupported link".into());
    }
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_game_dir(app: State<'_, App>, handle: AppHandle) -> Result<(), String> {
    let d = game_dir(&app).ok_or("game folder not found")?;
    handle.opener().open_path(d.to_string_lossy(), None::<&str>).map_err(|e| e.to_string())
}

/// Install / update / switch version / repair in a background thread; progress goes to the window as events.
#[tauri::command]
fn start_update(app: AppHandle, repair: bool, components_only: Option<bool>) -> Result<(), String> {
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
fn cancel_update(app: State<'_, App>) {
    if let Some(c) = app.cancel.lock().unwrap().as_ref() {
        c.store(true, Ordering::SeqCst);
    }
}

/// «Отправить логи»: логи наших DLL (Elite_DLLs) и свежие логи игры из «Документов» уходят на сервер,
/// оттуда — разработчику. Каждый файл обрезается до последних 3 МБ.
#[tauri::command]
async fn send_logs(app: AppHandle, who: String) -> Result<String, String> {
    let st = app.state::<App>();
    let dir = game_dir(&st);
    let installed = dir.as_ref().map(|d| update::Game::new(d).load_state()).unwrap_or_default();
    let uid = fb_uid(&st);
    let running = st.game_running.load(Ordering::Relaxed);
    let fb_name = st.settings.lock().unwrap().fb_name.clone();
    let elite_v = installed.version.clone();
    let comps: Vec<String> = {
        let cfg = st.config.lock().unwrap().clone().unwrap_or_default();
        let s = st.settings.lock().unwrap().clone();
        cfg.components.iter().map(|c| match dir.as_ref() {
            Some(d) => {
                let on = s.components.get(&c.id).copied().unwrap_or(c.default);
                let have = update::Game::component(d, &c.id).load_state().version;
                let conf = found_conflicts(d, c);
                let dll = !c.inject.is_empty() && d.join("Elite_DLLs").join(&c.inject).is_file();
                let injected = !c.inject.is_empty() && std::fs::read_to_string(d.join(elite::LAUNCHCONFIG)).map(|t| t.lines()
                    .any(|l| l.strip_prefix("InjectedFiles=").map_or(false, |r| r.split(',').any(|x| x.trim().eq_ignore_ascii_case(&c.inject))))).unwrap_or(false);
                format!("{}: {} (latest {}, installed {}{}{}{})", c.id, if on { "ON" } else { "off" }, c.version,
                    if have.is_empty() { "-" } else { &have }, if dll { ", dll" } else { "" }, if injected { ", injected" } else { "" },
                    if conf.is_empty() { String::new() } else { format!(", hand-installed copy: {}", conf.join(" ")) })
            }
            None => format!("{}: {}", c.id, c.version),
        }).collect()
    };
    tauri::async_runtime::spawn_blocking(move || {
        let patches = dir.as_ref().and_then(|d| std::fs::read_dir(d.join("dow2-patches")).ok()).map(|rd| {
            let mut v: Vec<String> = rd.flatten().map(|e| e.file_name().to_string_lossy().to_string()).collect(); v.sort(); v.join(" ") }).unwrap_or_default();
        // 1.4.2: every DLL-like file in Elite_DLLs with its size - what the game can load (players' logs: X.dll.off files
        // among the modules were only seen in a Windows error report)
        let elite_dlls = dir.as_ref().and_then(|d| std::fs::read_dir(d.join("Elite_DLLs")).ok()).map(|rd| {
            let mut v: Vec<String> = rd.flatten().filter(|e| e.path().is_file()).filter_map(|e| {
                let n = e.file_name().to_string_lossy().to_string();
                let l = n.to_ascii_lowercase();
                (l.ends_with(".dll") || l.contains(".dll.") || l.ends_with(".off") || l.ends_with(".asi"))
                    .then(|| format!("{n} ({})", e.metadata().map(|m| m.len()).unwrap_or(0)))
            }).collect();
            v.sort_by_key(|x| x.to_ascii_lowercase()); v.join(", ") }).unwrap_or_default();
        let mut out = format!("Elite Launcher {} · {} · Elite {} ({})\nadd-ons:\n  {}\ngame: {}\ndow2-patches: {}\nElite_DLLs: {}\n\n",
            LAUNCHER_VERSION, os_name(), installed.version, installed.channel, comps.join("\n  "),
            dir.as_ref().map(|d| d.display().to_string()).unwrap_or_default(), if patches.is_empty() { "-" } else { &patches },
            if elite_dlls.is_empty() { "-" } else { &elite_dlls });
        // всё, что может помочь понять краш: логи дополнений, логи игры, дампы, отчёты Windows об ошибках
        let mut files: Vec<PathBuf> = Vec::new();
        let recent = |p: &std::path::Path, days: u64| std::fs::metadata(p).and_then(|m| m.modified()).ok()
            .and_then(|m| m.elapsed().ok()).map(|e| e.as_secs() < days * 86400).unwrap_or(false);
        let ext_of = |p: &std::path::Path| p.extension().and_then(|x| x.to_str()).unwrap_or("").to_ascii_lowercase();
        // файлы каталога (с подкаталогами до depth), новые сначала
        fn walk(root: &std::path::Path, depth: u32, out: &mut Vec<(std::time::SystemTime, PathBuf)>) {
            let Ok(rd) = std::fs::read_dir(root) else { return };
            for e in rd.flatten() {
                let p = e.path(); let Ok(md) = e.metadata() else { continue };
                if md.is_dir() { if depth > 0 { walk(&p, depth - 1, out); } continue; }
                out.push((md.modified().unwrap_or(std::time::UNIX_EPOCH), p));
            }
        }
        let mut take = |root: PathBuf, depth: u32, exts: &[&str], days: u64, max: usize, files: &mut Vec<PathBuf>| {
            let mut v = Vec::new(); walk(&root, depth, &mut v);
            v.retain(|(_, p)| exts.contains(&ext_of(p).as_str()) && recent(p, days));
            v.sort_by(|a, b| b.0.cmp(&a.0));
            files.extend(v.into_iter().take(max).map(|x| x.1));
        };
        if let Some(d) = &dir {
            take(d.join("Elite_DLLs"), 0, &["log", "ini", "txt", "dmp"], 30, 40, &mut files);
            take(d.clone(), 0, &["log", "txt", "dmp", "mdmp", "launchconfig"], 7, 20, &mut files);
        }
        take(data_dir(), 0, &["log", "old"], 30, 4, &mut files);   // the launcher's own: community.log (Steam sign-in, chat)
        // Linux under Proton: the game's Documents are inside its prefix (compatdata/56400/pfx/.../steamuser/Documents)
        let doc = dir.as_ref().and_then(|d| elite_core::proton::prefix_documents(d, 56400)).or_else(elite_core::game::documents_dir);
        if let Some(doc) = doc {
            take(doc.join("My Games").join("Dawn of War II - Retribution"), 3, &["txt", "log", "dmp", "mdmp", "xml", "ini"], 3, 40, &mut files);
        }
        // дампы и отчёты Windows (WER) о падениях игры
        let is_game = |p: &std::path::Path| { let s = p.to_string_lossy().to_ascii_lowercase(); s.contains("dow2") || s.contains("elite") };
        let mut wer_roots: Vec<PathBuf> = Vec::new();
        if let Some(la) = dirs::data_local_dir() {
            let mut v = Vec::new(); walk(&la.join("CrashDumps"), 0, &mut v);
            let starter = |p: &std::path::Path| p.file_name().map(|x| x.to_string_lossy().to_ascii_lowercase()).map_or(false, |n| n.starts_with("elite.exe") || n.starts_with("elite_test.exe"));
            v.retain(|(_, p)| is_game(p) && !starter(p) && recent(p, 7)); v.sort_by(|a, b| b.0.cmp(&a.0));
            files.extend(v.into_iter().take(2).map(|x| x.1));
            wer_roots.push(la.join("Microsoft").join("Windows").join("WER"));
        }
        wer_roots.push(PathBuf::from(std::env::var("ProgramData").unwrap_or_else(|_| "C:\\ProgramData".into())).join("Microsoft").join("Windows").join("WER"));
        for w in wer_roots {
            for q in ["ReportArchive", "ReportQueue"] {
                let mut v = Vec::new(); walk(&w.join(q), 1, &mut v);
                v.retain(|(_, p)| is_game(p.parent().unwrap_or(p)) && recent(p, 7) && ["wer", "txt", "xml", "csv"].contains(&ext_of(p).as_str()));
                v.sort_by(|a, b| b.0.cmp(&a.0));
                files.extend(v.into_iter().take(12).map(|x| x.1));
            }
        }
        // инкремент: метки «сколько уже отправлено» по каждому растущему .log (data_dir/log_sent.json)
        let marks: serde_json::Map<String, Value> = std::fs::read(data_dir().join("log_sent.json")).ok()
            .and_then(|b| serde_json::from_slice::<Value>(&b).ok())
            .and_then(|v| v.as_object().cloned())
            .unwrap_or_default();
        let mut newmarks: serde_json::Map<String, Value> = serde_json::Map::new();
        let mut n = 0; let mut total = 0usize;
        let mut sent_dumps: Vec<PathBuf> = Vec::new(); let mut sent_addon_logs: Vec<PathBuf> = Vec::new();
        for f in files {
            let Ok(b) = std::fs::read(&f) else { continue };
            if total > 30 << 20 { out += &format!("=== {} ({} bytes) — skipped, upload is full ===\n", f.display(), b.len()); continue; }
            let ext = ext_of(&f);
            if ext == "dmp" || ext == "mdmp" {
                use base64::Engine;
                let fname = f.file_name().map(|x| x.to_string_lossy().to_ascii_lowercase()).unwrap_or_default();
                if fname.starts_with("elite.exe") || fname.starts_with("elite_test.exe") { continue; }
                let key = f.display().to_string();
                if marks.get(&key).and_then(|v| v.as_array()).and_then(|a| a.first()).and_then(|x| x.as_u64()) == Some(b.len() as u64) { continue; }
                newmarks.insert(key, serde_json::json!([b.len() as u64, "dump"]));
                sent_dumps.push(f.clone());
                if b.len() > 12 << 20 { out += &format!("=== {} ({} bytes) — dump too big, skipped ===\n", f.display(), b.len()); continue; }
                out += &format!("=== {} ({} bytes, base64) ===\n", f.display(), b.len());
                out += &base64::engine::general_purpose::STANDARD.encode(&b);
                total += b.len() * 4 / 3;
            } else {
                let is_u16 = b.len() >= 2 && b[0] == 0xFF && b[1] == 0xFE;
                let key = f.display().to_string();
                // растущие .log (и крупные .txt) шлём инкрементно: только добавленное с прошлой удачной отправки.
                // ротацию/обрезание ловим по отпечатку начала файла; UTF-16-отчёты WER шлём целиком.
                let incr = !is_u16 && (ext == "log" || (ext == "txt" && b.len() > (256 << 10)));
                let prefix: String = b.iter().take(32).map(|x| format!("{:02x}", x)).collect();
                let mut start = 0usize;
                if incr {
                    if let Some(a) = marks.get(&key).and_then(|v| v.as_array()) {
                        let plen = a.first().and_then(|x| x.as_u64()).unwrap_or(0) as usize;
                        if a.get(1).and_then(|x| x.as_str()) == Some(prefix.as_str()) && plen <= b.len() { start = plen; }
                    }
                    newmarks.insert(key.clone(), serde_json::json!([b.len() as u64, prefix]));
                }
                let text = if is_u16 {
                    let u: Vec<u16> = b[2..].chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
                    String::from_utf16_lossy(&u)
                } else { String::from_utf8_lossy(&b[start..]).into_owned() };
                let cap = 256usize << 10;
                let tail = if text.len() > cap { let mut k = text.len() - cap; while !text.is_char_boundary(k) { k += 1; } &text[k..] } else { &text[..] };
                if ext == "log" && f.parent().and_then(|p| p.file_name()).map_or(false, |n| n.eq_ignore_ascii_case("Elite_DLLs")) { sent_addon_logs.push(f.clone()); }
                if incr && start > 0 && tail.is_empty() { continue; }   // с прошлой отправки ничего нового — файл не шлём
                let tag = if start > 0 { format!(", +{} new", b.len() - start) } else { String::new() };
                out += &format!("=== {} ({} bytes{}) ===\n", f.display(), b.len(), tag);
                out += tail; total += tail.len();
            }
            out += "\n\n"; n += 1;
        }
        // журнал Windows: падения игры (Application Error / WER)
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            let q = "*[System[(EventID=1000 or EventID=1001 or EventID=1002 or EventID=1026) and TimeCreated[timediff(@SystemTime) <= 604800000]]]";
            if let Ok(o) = std::process::Command::new("wevtutil").args(["qe", "Application", "/c:60", "/rd:true", "/f:text", &format!("/q:{q}")])
                .creation_flags(0x0800_0000).output() {
                // wevtutil writes text in the console's OEM code page (players' logs: Russian Windows came out as ������)
                let t = procs::oem_text(&o.stdout);
                let ev: Vec<&str> = t.split("Event[").filter(|e| { let l = e.to_ascii_lowercase(); l.contains("dow2") || l.contains("elite") }).collect();
                // Elite's own starter giving up waiting for the game's window (the game goes on) - not a game crash
                let starter = ev.iter().filter(|e| { let l = e.to_ascii_lowercase(); l.contains("elite.exe") && l.contains("78da5") }).count();
                out += &format!("=== Windows event log: game crashes, last 7 days ({} events{}) ===\n", ev.len(),
                    if starter > 0 { format!(", {starter} of them Elite.exe+0x78da5: Elite's starter did not see the game window in time, the game itself goes on") } else { String::new() });
                for e in ev { out += "Event["; out += e; }
                out += "\n\n"; n += 1;
            }
        }
        if n == 0 { return Err("no log files found yet — play once with the add-ons on, then send".into()); }
        let who: String = who.chars().filter(|c| c.is_alphanumeric() || "._-".contains(*c)).take(32).collect();
        let who = if who.is_empty() { "anon".to_string() } else { who };
        let mut last = String::new();
        // куда слать логи — задаётся при сборке: ELITE_LOG_HOSTS="https://a;https://b" (в репозитории адресов нет)
        let hosts = fb_hosts();   // the best answering first (reach.rs)
        if hosts.is_empty() { return Err("log upload is not configured in this build".into()); }
        for host in hosts {
            match HTTP.post(&format!("{host}/stats/api/logs?who={who}&uid={uid}")).set("Content-Type", "text/plain; charset=utf-8").send_bytes(out.as_bytes()) {
                Ok(r) => {
                    let v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).unwrap_or_default();
                    let note = json!({"uid": uid, "name": if fb_name.is_empty() { who.clone() } else { fb_name.clone() },
                        "text": format!("📋 Отправил логи · sent logs: {} ({} files). Ответ придёт сюда · the answer comes here.", v["id"].as_str().unwrap_or("?"), n),
                        "launcher": LAUNCHER_VERSION, "os": os_name(), "elite": elite_v}).to_string();
                    let _ = HTTP.post(&format!("{host}/ladder/api/fb/send")).timeout(Duration::from_secs(20))
                        .set("Content-Type", "application/json").send_string(&note);
                    // запомним, докуда дошли по каждому растущему логу — в следующий раз только новый хвост
                    let _ = std::fs::write(data_dir().join("log_sent.json"), serde_json::to_vec(&Value::Object(newmarks.clone())).unwrap_or_default());
                    if !running {
                        for f in &sent_addon_logs { let _ = std::fs::OpenOptions::new().write(true).truncate(true).open(f); }
                        for f in &sent_dumps { let _ = std::fs::remove_file(f); }
                    }
                    return Ok(format!("{} ({} files)", v["id"].as_str().unwrap_or("ok"), n));
                }
                Err(e) => { api_err(&host, &e); last = e.to_string(); }
            }
        }
        Err(format!("could not send logs: {last}"))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Start the game. Never blocked by a pending update.
#[tauri::command]
fn play(app: State<'_, App>) -> Result<Value, String> {
    start_game(&app)
}

fn start_game(app: &App) -> Result<Value, String> {
    if app.busy.load(Ordering::Relaxed) {
        return Err("files are being updated, wait a few seconds".into());
    }
    if app.game_running.load(Ordering::Relaxed) {
        return Err("the game is already running".into());
    }
    let dir = game_dir(&app).ok_or("game folder not found")?;
    let cfg = app.config.lock().unwrap().clone().unwrap_or_default();
    // old copies of our add-ons (the stand-alone package, the old LobbyStats folder) would load next to the launcher's:
    // put aside without asking (owner 03.11.2026: one copy of every patch, the launcher's latest). The window brings
    // the launcher's versions first (Play syncs the add-ons before it starts), so normally there is nothing left here.
    let old = put_aside_old_copies(&dir, &cfg);
    // what the checks of our add-ons did is told to the player (siritos 02.11): only add-ons of launcher.json, the
    // leftovers of their DLLs, and the ones gone from the catalog (drop_orphans) - nothing else in the game folder;
    // loader: the stand-alone dow2-patches package's winmm.dll. The leftovers first: drop_orphans forgets the names.
    let mut off = old;
    off.extend(drop_leftovers(&dir, &cfg));
    off.extend(enforce_off(&dir, &cfg, &app.settings.lock().unwrap().clone()));
    off.extend(drop_orphans(&dir, &cfg));
    drop_conflicting(&dir, &cfg);
    for n in sync_injected(&dir, &cfg, &app.settings.lock().unwrap().clone()) {
        if !off.iter().any(|x| x.to_ascii_lowercase().ends_with(&n.to_ascii_lowercase())) { off.push(n); }
    }
    let guard = json!({"off": off, "loader": dir.join("winmm.dll").is_file() && dir.join("dow2-patches").is_dir()});
    elite_core::hotkeys::refresh_if_stale(&app.settings.lock().unwrap().hotkeys);     // a patch brought new defaults
    let mut cmd = match os_name() {
        "windows" => cfg.launch.windows.clone(),
        "macos" => cfg.launch.macos.clone(),
        _ => cfg.launch.linux.clone(),
    };
    // у версии может быть свой exe (публичный тест 3.2 — отдельный мод Elite_Test рядом с основным)
    let installed = update::Game::new(&dir).load_state();
    if let Some(ch) = cfg.channels.iter().find(|c| c.id == installed.channel && c.version == installed.version) {
        if !ch.exe.is_empty() && os_name() == "windows" {
            cmd.program = format!("{{game}}/{}", ch.exe);
        }
        // старые версии (2.3, 2.9.3) — без своего Elite.exe, запускаются как мод: DOW2.exe -modname Elite
        if !ch.args.is_empty() && os_name() == "windows" {
            cmd.args = ch.args.clone();
        }
    }
    // путь к игре без «длинного» префикса \\?\ (canonicalize на Windows его добавляет, а с ним Windows не принимает «/»)
    let game = dir.to_string_lossy().to_string();
    let game = game.strip_prefix(r"\\?\").unwrap_or(&game).to_string();
    let sub = |x: &str| {
        let v = x.replace("{game}", &game);
        if cfg!(windows) { v.replace('/', "\\") } else { v }
    };
    // Linux: `steam -applaunch 56400` starts plain DOW2.exe under Proton (vanilla, not Elite). Run Elite.exe (or the
    // version's own exe) through the Proton Steam uses for the game instead; anything missing -> the old way + the hint.
    #[cfg(target_os = "linux")]
    if cmd.program == "steam" && cmd.args.iter().any(|a| a == "-applaunch") {
        let exe_name = cfg.channels.iter().find(|c| c.id == installed.channel && c.version == installed.version)
            .map(|c| c.exe.clone()).filter(|e| !e.is_empty()).unwrap_or_else(|| "Elite.exe".into());
        let exe = dir.join(&exe_name);
        match elite_core::proton::plan(&dir, cfg.game.steam_appid) {
            Ok(run) if exe.is_file() => {
                ensure_steam_running();
                c_log(&format!("launch: {} run {} (prefix {}, runtime {})", run.proton.display(), exe.display(), run.compat_data.display(),
                               run.runtime.as_ref().map(|p| p.display().to_string()).unwrap_or_else(|| "none".into())));
                // 1.4.1: Proton's own output goes to proton.log; how it ended goes to community.log (Send logs carries it) -
                // 1.4.0 showed only "launch:", never why the game did not come up
                let plog = data_dir().join("proton.log");
                let mut c = run.command(&exe, &[], &dir);
                if let Ok(f) = std::fs::File::create(&plog) {
                    if let Ok(f2) = f.try_clone() { c.stdout(f).stderr(f2); }
                }
                return match c.spawn() {
                    Ok(mut child) => {
                        std::thread::spawn(move || {
                            let t0 = std::time::Instant::now();
                            let st = child.wait();
                            let secs = t0.elapsed().as_secs();
                            let tail = std::fs::read_to_string(&plog).unwrap_or_default();
                            let tail: Vec<&str> = tail.lines().filter(|l| !l.trim().is_empty()).collect();
                            let tail = tail[tail.len().saturating_sub(8)..].join(" | ");
                            match st {
                                Ok(s) if secs < 60 => c_log(&format!("launch: Proton ended after {secs} s ({s}) - the game did not run; proton.log: {}", tail.chars().take(1500).collect::<String>())),
                                Ok(s) => c_log(&format!("launch: the game ended after {secs} s ({s})")),
                                Err(e) => c_log(&format!("launch: cannot wait for Proton: {e}")),
                            }
                        });
                        Ok(guard)
                    }
                    Err(e) => Err(format!("cannot start {} through Proton: {e}", exe_name)),
                };
            }
            Ok(_) => c_log(&format!("launch: {} not in the game folder - steam -applaunch", exe_name)),
            Err(e) => c_log(&format!("launch: no Proton run ({e}) - steam -applaunch")),
        }
    }
    let program = sub(&cmd.program);
    let mut c = std::process::Command::new(&program);
    c.args(cmd.args.iter().map(|a| sub(a))).current_dir(&game);
    match c.spawn() {
        Ok(_) => Ok(guard),
        // 740 = программа требует прав администратора (Elite.exe так помечен). Обычный запуск такого не умеет,
        // а оболочка Windows умеет: `start` показывает обычный запрос UAC и задаёт рабочую папку.
        #[cfg(windows)]
        Err(e) if e.raw_os_error() == Some(740) => {
            use std::os::windows::process::CommandExt;
            let mut sh = std::process::Command::new("cmd");
            sh.args(["/C", "start", "", "/D", &game, &program]).args(cmd.args.iter().map(|a| sub(a)));
            sh.creation_flags(0x0800_0000); // CREATE_NO_WINDOW — без мигающей консоли
            sh.spawn().map(|_| guard).map_err(|e2| format!("cannot start {program} as administrator: {e2}"))
        }
        Err(e) => Err(format!("cannot start {program}: {e}")),
    }
}

/// Linux: DoW2's Steam login goes through the Steam client, which must be running before the game starts under Proton.
#[cfg(target_os = "linux")]
fn ensure_steam_running() {
    let running = || std::process::Command::new("pgrep").args(["-x", "steam"]).output().map(|o| o.status.success()).unwrap_or(false)
        || std::process::Command::new("pgrep").args(["-f", "steamwebhelper"]).output().map(|o| o.status.success()).unwrap_or(false);
    if running() { return; }
    c_log("launch: Steam is not running - starting it");
    let _ = std::process::Command::new("steam").arg("-silent").spawn();
    for _ in 0..40 { std::thread::sleep(std::time::Duration::from_millis(500)); if running() { std::thread::sleep(std::time::Duration::from_secs(5)); return; } }
}

// ---------- Feedback chat with the developers ----------
// Messages and pasted pictures go to the ladder service on the log hosts (/ladder/api/fb/*), answers come back the same way.
// The player is known only by a random id kept in the settings, plus the name they chose to give.
/// One agent for every call to our servers: connections are kept and reused instead of a new TCP + TLS handshake per
/// request. A request's own .timeout() still caps the whole request.
static HTTP: LazyLock<ureq::Agent> = LazyLock::new(|| {
    ureq::AgentBuilder::new().timeout_connect(Duration::from_secs(10)).timeout_read(Duration::from_secs(20)).build()
});

/// Our API hosts, the one that answers best from here first (reach.rs). Every call to our API goes through this.
fn fb_hosts() -> Vec<String> {
    reach::order(reach::Pool::Api, api_hosts())
}
fn fb_uid(app: &App) -> String {
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
fn fb_info(app: State<'_, App>) -> Value {
    let uid = fb_uid(&app);
    json!({"uid": uid, "name": app.settings.lock().unwrap().fb_name.clone(), "configured": !fb_hosts().is_empty()})
}

#[tauri::command]
fn fb_set_name(app: State<'_, App>, name: String) {
    let mut s = app.settings.lock().unwrap();
    s.fb_name = name.trim().chars().take(48).collect();
    save_settings(&s);
}

#[tauri::command]
async fn fb_send(app: AppHandle, text: String, images: Vec<String>) -> Result<Value, String> {
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
async fn fb_thread(app: AppHandle) -> Result<Value, String> {
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

// ---------- Community: Steam sign-in, the players' chat, who has the launcher open ----------
// The ladder service (/ladder/api/c/*, ladder/community.py in dow2-ladder) on the log hosts. Reading is open; writing needs
// a Steam sign-in: the browser goes through Steam's own OpenID page (the launcher never sees the password), the server
// checks the answer with Steam and hands the launcher a session token for the random nonce it made.
fn c_profile(s: &Settings) -> Value {
    let local = elite_core::game::steam_local_user();
    json!({"signed_in": !s.c_token.is_empty(), "steam": s.c_steam, "name": s.c_name, "avatar": s.c_avatar, "configured": !fb_hosts().is_empty(),
           "local_name": local.as_ref().map(|l| l.1.clone()).unwrap_or_default(), "local_found": local.is_some()})
}

/// community.log in the launcher's folder: every sign-in step and failed call (goes with "Send logs"); kept under 256 KB.
fn c_log(msg: &str) {
    let p = data_dir().join("community.log");
    if std::fs::metadata(&p).map(|m| m.len() > 256 << 10).unwrap_or(false) { let _ = std::fs::rename(&p, data_dir().join("community.log.old")); }
    let t = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&p) {
        use std::io::Write;
        let _ = writeln!(f, "{t} {msg}");
    }
}

fn c_save(app: &AppHandle, v: &Value) -> Value {
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
fn c_local_call(token: &str) -> Result<Value, String> {
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
async fn c_login_local(app: AppHandle) -> Result<Value, String> {
    let app2 = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let v = c_local_call("")?;
        if v["ok"].as_bool() == Some(true) { return Ok(c_save(&app2, &v)); }
        Ok(v)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
fn c_status(app: State<'_, App>) -> Value { c_profile(&app.settings.lock().unwrap()) }

/// The sign-in being waited for: a new click or Cancel bumps it, and the older wait stops by itself, so the button
/// never stays grey for minutes when the browser tab was closed.
static LOGIN_GEN: AtomicU64 = AtomicU64::new(0);

#[tauri::command]
fn c_login_cancel() { LOGIN_GEN.fetch_add(1, Ordering::SeqCst); }

#[tauri::command]
async fn c_login(app: AppHandle) -> Result<Value, String> {
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
fn c_logout(app: State<'_, App>) -> Value {
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
async fn c_api(app: AppHandle, path: String, body: Option<Value>) -> Result<Value, String> {
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

// ---------- The live stream: one open connection instead of polling ----------
// GET /ladder/api/c/stream on the log hosts (stream.py in dow2-ladder): the server sends only changes - Online
// (online, presence, match, match_end, user), the chat (msg, msg_tr, msg_del, reset) and the own card (me). Each event
// goes to the window as "c_ev" {e, d}; "c_stream" {up, host} tells it whether the stream works (else it polls).
static STREAM_GEN: AtomicU64 = AtomicU64::new(0);   // +1 on sign-in / sign-out: the stream reconnects with the new token
static STREAM_AFTER: LazyLock<Mutex<BTreeMap<String, u64>>> = LazyLock::new(|| Mutex::new(BTreeMap::new()));
static STREAM_UP: AtomicBool = AtomicBool::new(false);

/// Is the stream connected now? The window asks once at start: the stream may have come up before it listened.
#[tauri::command]
fn c_stream_up() -> bool { STREAM_UP.load(Ordering::Relaxed) }

/// The newest message id per room the window has (from msgs and from the stream): the server sends what came after.
fn stream_note(m: &Value) {
    if let (Some(room), Some(id)) = (m["room"].as_str(), m["id"].as_u64()) {
        let mut a = STREAM_AFTER.lock().unwrap();
        let e = a.entry(room.to_string()).or_insert(0);
        if id > *e { *e = id; }
    }
}

fn stream_loop(app: AppHandle) {
    use std::io::BufRead;
    // its own agent: a read may wait up to 60 s (the server pings every 20 s), and no overall timeout - in ureq 2 that
    // would cap the whole response and cut the stream
    let agent = ureq::AgentBuilder::new().timeout_connect(Duration::from_secs(10)).timeout_read(Duration::from_secs(60)).build();
    if api_hosts().is_empty() { return; }
    let (mut host_i, mut fails) = (0usize, 0usize);
    loop {
        let gen = STREAM_GEN.load(Ordering::SeqCst);
        // the order of the moment (reach.rs): the start uses the last run's, the check of this run may change it
        let hosts = fb_hosts();
        let host = hosts[host_i % hosts.len()].clone();
        let (token, state) = {
            let st = app.state::<App>();
            let token = st.settings.lock().unwrap().c_token.clone();
            (token, if st.game_running.load(Ordering::Relaxed) { "game" } else { "menu" })
        };
        let after = STREAM_AFTER.lock().unwrap().iter().map(|(k, v)| format!("{k}:{v}")).collect::<Vec<_>>().join(",");
        let mut req = agent.get(&format!("{host}/ladder/api/c/stream?after={after}")).set("Accept", "text/event-stream").set("X-State", state);
        if !token.is_empty() { req = req.set("X-Token", &token); }   // in a header, never in the address
        let mut busy = false;
        match req.call() {
            Ok(r) => {
                fails = 0;
                STREAM_UP.store(true, Ordering::Relaxed);
                let _ = app.emit("c_stream", json!({"up": true, "host": host}));
                let (mut ev, mut data) = (String::new(), String::new());
                for line in std::io::BufReader::new(r.into_reader()).lines() {
                    let Ok(line) = line else { break };
                    if STREAM_GEN.load(Ordering::SeqCst) != gen { break; }
                    if line.is_empty() {
                        if let Ok(d) = serde_json::from_str::<Value>(&data) {
                            if ev == "msg" { stream_note(&d); }
                            let _ = app.emit("c_ev", json!({"e": ev, "d": d}));
                        }
                        ev.clear(); data.clear();
                    } else if let Some(v) = line.strip_prefix("event:") { ev = v.trim().to_string(); }
                    else if let Some(v) = line.strip_prefix("data:") { data.push_str(v.trim_start()); }
                }
                STREAM_UP.store(false, Ordering::Relaxed);
                let _ = app.emit("c_stream", json!({"up": false}));
            }
            Err(ureq::Error::Status(503, _)) => busy = true,   // the server is full: it asks for 30 s
            Err(e) => {
                if fails == 0 { c_log(&format!("stream {host}: {e}")); }
                api_err(&host, &e);
                // a lost host went to the end of the order: the new first one is tried; else the next one
                host_i = if fb_hosts().first() != Some(&host) { 0 } else { host_i + 1 };
                fails += 1;
            }
        }
        if STREAM_GEN.load(Ordering::SeqCst) != gen { continue; }   // signed in / out: at once, with the new token
        // 1, 2, 5, 10, 30 s plus 0-2 s at random, so a server restart is not hit by everyone in the same second
        let mut b = [0u8; 2];
        let _ = getrandom::getrandom(&mut b);
        let base = if busy { 30 } else { [1u64, 2, 5, 10, 30][fails.min(4)] };
        let end = Instant::now() + Duration::from_millis(base * 1000 + u16::from_le_bytes(b) as u64 % 2000);
        while Instant::now() < end && STREAM_GEN.load(Ordering::SeqCst) == gen { std::thread::sleep(Duration::from_millis(250)); }
    }
}

/// Lobbies tab, "Join" (RoomJoin add-on, experiment 03.11.2026): the request for RoomJoin.dll in the game - Elite_DLLs/RoomJoin.txt,
/// line 1 the room id (Relic's advertisement id), line 2 its name. The DLL takes it in the main menu (a request older than 3 minutes
/// is dropped there) and writes RoomJoin_result.txt. The window then starts the game the usual way (Play) unless it runs.
#[tauri::command]
fn room_join(app: State<'_, App>, id: u64, name: String) -> Result<Value, String> {
    let dir = game_dir(&app).ok_or("no game folder")?;
    let d = dir.join("Elite_DLLs");
    if !d.is_dir() { return Err("no Elite_DLLs folder".into()); }
    let _ = std::fs::remove_file(d.join("RoomJoin_result.txt"));
    let name: String = name.chars().filter(|c| !c.is_control()).take(64).collect();
    std::fs::write(d.join("RoomJoin.txt"), format!("{id}\n{name}\n")).map_err(|e| e.to_string())?;
    c_log(&format!("rooms: join request for room {id} ({name})"));
    let running = app.game_running.load(Ordering::Relaxed) || is_game_running();
    #[cfg(windows)]
    let front = running && procs::game_to_front();
    #[cfg(not(windows))]
    let front = false;
    Ok(json!({ "running": running, "front": front }))
}

/// 1.3.15 (owner 02.11.2026): the open lobbies - Relic's list of custom games being set up, from our ladder server
/// (/ladder/api/rooms: map, mode, game Elite / vanilla / other, players with race, hero, flag and rating).
#[tauri::command]
async fn rooms_live() -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut last = "the ladder server is not configured in this build".to_string();
        for host in fb_hosts() {
            match ureq::get(&format!("{host}/ladder/api/rooms")).timeout(Duration::from_secs(10)).call() {
                Ok(r) => {
                    let mut v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).map_err(|e| e.to_string())?;
                    v["host"] = json!(host);
                    return Ok(v);
                }
                Err(e) => { api_err(&host, &e); last = e.to_string(); }
            }
        }
        Err(last)
    }).await.map_err(|e| e.to_string())?
}

/// The Online block without the stream (a ladder server that has no /c/live yet): who is looking for a game and the
/// matches, from /ladder/api/mm/live; the window joins it with /c/online (who has the launcher open).
#[tauri::command]
async fn mm_live() -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut last = "the ladder server is not configured in this build".to_string();
        for host in fb_hosts() {
            match HTTP.get(&format!("{host}/ladder/api/mm/live")).timeout(Duration::from_secs(10)).call() {
                Ok(r) => {
                    let mut v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).map_err(|e| e.to_string())?;
                    v["host"] = json!(host);
                    return Ok(v);
                }
                Err(e) => { api_err(&host, &e); last = e.to_string(); }
            }
        }
        Err(last)
    }).await.map_err(|e| e.to_string())?
}

/// The events banner (siritos 02.11: kept in git - events.json of this repository, edited and pushed to main): read from
/// GitHub, then jsDelivr (GitHub is blocked in places), at the start and every 15 minutes by the window; the last good
/// copy is kept for offline; never read - the copy built into this launcher. launcher.json "events", when the owner
/// sets them, still go first (the window decides).
const EVENTS_URLS: [&str; 2] = [
    "https://raw.githubusercontent.com/dow2-launcher/Dow2-elite-launcher/main/events.json",
    "https://cdn.jsdelivr.net/gh/dow2-launcher/Dow2-elite-launcher@main/events.json",
];
const EVENTS_BUILT_IN: &str = include_str!("../../events.json");
#[tauri::command]
async fn events_get() -> Value {
    tauri::async_runtime::spawn_blocking(|| {
        let ok = |v: &Value| v["events"].is_array();
        for url in EVENTS_URLS {
            let Ok(r) = HTTP.get(url).timeout(Duration::from_secs(10)).call() else { continue };
            let Ok(text) = r.into_string() else { continue };
            if let Ok(v) = serde_json::from_str::<Value>(&text) {
                if ok(&v) {
                    let _ = std::fs::write(data_dir().join("events.json"), &text);
                    return json!({"events": v["events"], "source": url});
                }
            }
        }
        if let Some(v) = std::fs::read(data_dir().join("events.json")).ok().and_then(|b| serde_json::from_slice::<Value>(&b).ok()).filter(ok) {
            return json!({"events": v["events"], "source": "cache"});
        }
        let v: Value = serde_json::from_str(EVENTS_BUILT_IN).unwrap_or_default();
        json!({"events": if ok(&v) { v["events"].clone() } else { json!([]) }, "source": "built-in"})
    }).await.unwrap_or_else(|_| json!({"events": []}))
}

/// Repositories whose GitHub Releases become news: CI makes every release from the changelog,
/// so a new launcher or patch set shows up in the news without anyone writing it by hand.
const NEWS_REPOS: [&str; 2] = ["dow2-launcher/Dow2-elite-launcher", "dow2-launcher/Dow2-patches"];

/// The latest releases of NEWS_REPOS as news: {date, title, items, url}, newest first.
/// None when GitHub can't be reached: the cached copy (news.json) stays.
fn fetch_release_news() -> Option<Vec<Value>> {
    let mut out = Vec::new();
    for repo in NEWS_REPOS {
        let body = HTTP.get(&format!("https://api.github.com/repos/{repo}/releases?per_page=4"))
            .set("Accept", "application/vnd.github+json")
            .set("User-Agent", &format!("EliteLauncher/{LAUNCHER_VERSION}"))
            .timeout(Duration::from_secs(15))
            .call()
            .ok()?
            .into_string()
            .ok()?;
        let list: Vec<Value> = serde_json::from_str(&body).ok()?;
        for r in list.iter().filter(|r| r["draft"] != true && r["prerelease"] != true) {
            let s = |k: &str| r[k].as_str().unwrap_or("").to_string();
            let title = if s("name").is_empty() { s("tag_name") } else { s("name") };
            // 02.11 (siritos): no link - a release page on GitHub is not news for a player; the full time and the repo
            // to order two releases of one day and to say "Launcher" / "Add-ons" in the player's language
            out.push(json!({
                "date": s("published_at").chars().take(10).collect::<String>(),
                "ts": s("published_at"),
                "title": title,
                "version": s("tag_name").trim_start_matches('v'),
                "kind": if repo.ends_with("Dow2-patches") { "patches" } else { "launcher" },
                "items": release_items(&s("body")),
                "items_ru": release_items(&release_ru(repo, s("tag_name").trim_start_matches('v'))),
            }));
        }
    }
    out.sort_by(|a, b| b["ts"].as_str().cmp(&a["ts"].as_str()));
    Some(out)
}

/// The Russian notes of a release (siritos 02.11: releases in en and ru, Russian when the launcher speaks Russian):
/// changelog/<version>/ru.md of the repository on main - GitHub, then jsDelivr where GitHub is blocked; "" when there is
/// none (the window shows the English body then).
fn release_ru(repo: &str, version: &str) -> String {
    if version.is_empty() || !version.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-') { return String::new(); }
    for url in [format!("https://raw.githubusercontent.com/{repo}/main/changelog/{version}/ru.md"),
                format!("https://cdn.jsdelivr.net/gh/{repo}@main/changelog/{version}/ru.md")] {
        match HTTP.get(&url).timeout(Duration::from_secs(8)).call() {
            Ok(r) => return r.into_string().unwrap_or_default(),
            Err(ureq::Error::Status(404, _)) => return String::new(),   // no Russian notes for this version
            Err(_) => continue,                                         // GitHub not reachable: the next host
        }
    }
    String::new()
}

/// The list items of a release body ("- …", continuation lines joined), markdown cut down to plain text.
fn release_items(body: &str) -> Vec<String> {
    let mut items: Vec<String> = Vec::new();
    let mut in_item = false;
    for line in body.lines() {
        let l = line.trim();
        if let Some(x) = l.strip_prefix("- ").or_else(|| l.strip_prefix("* ")) {
            items.push(x.to_string());
            in_item = true;
        } else if in_item && !l.is_empty() && line.starts_with(' ') {
            if let Some(last) = items.last_mut() {
                last.push(' ');
                last.push_str(l);
            }
        } else {
            in_item = false;
        }
    }
    items.iter().map(|i| plain_text(i)).take(8).collect()
}

/// `[text](url)` → text, no `**` or backticks: the window shows these as text, not HTML.
fn plain_text(md: &str) -> String {
    let mut out = String::new();
    let mut rest = md;
    while let Some(open) = rest.find('[') {
        let Some(mid) = rest[open..].find("](").map(|i| open + i) else { break };
        let Some(close) = rest[mid..].find(')').map(|i| mid + i) else { break };
        out.push_str(&rest[..open]);
        out.push_str(&rest[open + 1..mid]);
        rest = &rest[close + 1..];
    }
    out.push_str(rest);
    out.replace("**", "").replace('`', "")
}

/// Anonymous usage count: at most one request per day, sent to the log hosts, carrying only
/// sha256(random local secret + day number) cut to 128 bits, the launcher version, the OS and the installed Elite version.
/// The hash changes every day, so even the server can't tell whether two days came from the same install.
/// No hardware, Steam or account data, no game folder, no names. Off in Settings.
fn usage_ping(app: &AppHandle) {
    use sha2::{Digest, Sha256};
    let st = app.state::<App>();
    let day = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() / 86400).unwrap_or(0);
    let secret = {
        let mut s = st.settings.lock().unwrap();
        if !s.usage_stats.unwrap_or(true) || s.ping_day == day || day == 0 { return; }
        if s.ping_secret.len() != 64 {
            let mut b = [0u8; 32];
            if getrandom::getrandom(&mut b).is_err() { return; }
            s.ping_secret = b.iter().map(|x| format!("{x:02x}")).collect();
            save_settings(&s);
        }
        s.ping_secret.clone()
    };
    let mut h = Sha256::new();
    h.update(secret.as_bytes());
    h.update(day.to_le_bytes());
    let hash: String = h.finalize().iter().take(16).map(|x| format!("{x:02x}")).collect();
    let elite = game_dir(&st).map(|d| update::Game::new(d).load_state().version).filter(|v| !v.is_empty()).unwrap_or_else(|| "none".into());
    let elite: String = elite.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '.' || *c == '-').take(16).collect();
    for host in fb_hosts() {
        let url = format!("{host}/stats/api/ping?h={hash}&v={LAUNCHER_VERSION}&os={}&elite={elite}", os_name());
        if HTTP.get(&url).timeout(Duration::from_secs(15)).call().is_ok() {
            let mut s = st.settings.lock().unwrap();
            s.ping_day = day;
            save_settings(&s);
            return;
        }
    }
}

fn main() {
    let settings = load_settings();
    let config = cached_config();
    tauri::Builder::default()
        // one launcher at a time: starting it again (shortcut, Start menu) brings the running one back, also from the
        // tray. Two copies also broke the self-update: the installer could not close the one hidden in the tray.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_window(app)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().pubkey(UPDATER_PUBKEY.trim()).build())
        .manage(App {
            settings: Mutex::new(settings),
            config: Mutex::new(config),
            busy: AtomicBool::new(false),
            game_running: AtomicBool::new(is_game_running()),
            cancel: Mutex::new(None),
            last_error: Mutex::new(String::new()),
            costs: Mutex::new(BTreeMap::new()),
            launcher_update: Mutex::new(None),
            release_news: Mutex::new(
                std::fs::read(data_dir().join("news.json")).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default(),
            ),
        })
        .setup(|app| {
            // Elite for the neighbours on the local network: the files of the installed version and of the version cache,
            // only those still as installed (same size; the neighbour checks the SHA-256 against the signed manifest anyway)
            elite_core::lan::ENABLED.store(app.state::<App>().settings.lock().unwrap().lan_share.unwrap_or(true), Ordering::Relaxed);
            let hl = app.handle().clone();
            elite_core::lan::serve(Arc::new(move |sha: &str| {
                let st = hl.state::<App>();
                let g = update::Game::new(game_dir(&st)?);
                let c = g.cache_dir().join(sha);
                if let Ok(md) = std::fs::metadata(&c) { if md.is_file() { return Some((c, md.len())); } }
                let f = g.load_state().files.into_iter().find(|f| f.sha.eq_ignore_ascii_case(sha))?;
                let p = g.file(&f.path);
                (std::fs::metadata(&p).ok()?.len() == f.size).then_some((p, f.size))
            }));
            // 1.3.13 (owner: no traces of the 1.3.10 hang help): the hang dumps it wrote into our own folder go, once, quietly
            let _ = std::fs::remove_dir_all(data_dir().join("dumps"));
            // which mirror and which API host answer best from here: checked once now (no ICMP - one small HTTPS answer
            // per host), again only when a host stops answering (reach.rs); the order is kept for the next start
            {
                let st = app.state::<App>();
                let s = st.settings.lock().unwrap().clone();
                reach::seed(reach::Pool::Data, s.net_data.clone());
                reach::seed(reach::Pool::Api, s.net_api.clone());
                if let Some(c) = st.config.lock().unwrap().as_ref() { note_config(c); }
                let _ = mirrors(&s, st.config.lock().unwrap().as_ref());   // sets the data candidates
            }
            let hn = app.handle().clone();
            reach::on_checked(move |pool, list| {
                let st = hn.state::<App>();
                {
                    let mut s = st.settings.lock().unwrap();
                    match pool { reach::Pool::Data => s.net_data = list.to_vec(), reach::Pool::Api => s.net_api = list.to_vec() }
                    save_settings(&s);
                }
                let _ = hn.emit("net_rank", net_status_json());
            });
            reach::check_soon(reach::Pool::Data, 0);
            reach::check_soon(reach::Pool::Api, 0);
            let hs = app.handle().clone();
            std::thread::spawn(move || stream_loop(hs));
            // watch the game: the window locks add-ons while it runs and picks pending updates up once it closes
            let hg = app.handle().clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_secs(3));
                let now = is_game_running();
                if hg.state::<App>().game_running.swap(now, Ordering::SeqCst) != now {
                    let _ = hg.emit("game_running", now);
                }
            });
            let open = MenuItemBuilder::with_id("open", "Open Elite Launcher").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&open, &quit]).build()?;
            let mut tray = TrayIconBuilder::new()
                .tooltip("Elite Launcher")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => show_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                // Linux delivers no tray clicks, only the menu: "Open" is there for it
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        show_window(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            app.manage(Tray { open, quit });

            // release notes as news: now and every hour; the window redraws when they change
            let hn = app.handle().clone();
            std::thread::spawn(move || loop {
                if let Some(news) = fetch_release_news() {
                    let st = hn.state::<App>();
                    let changed = *st.release_news.lock().unwrap() != news;
                    if changed {
                        let _ = std::fs::write(data_dir().join("news.json"), serde_json::to_vec(&news).unwrap_or_default());
                        *st.release_news.lock().unwrap() = news;
                        let _ = hn.emit("news", ());
                    }
                }
                std::thread::sleep(Duration::from_secs(3600));
            });
            let h = app.handle().clone();
            // once now (after the window is up) and then every few hours for launchers left open over midnight
            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_secs(30));
                usage_ping(&h);
                std::thread::sleep(Duration::from_secs(4 * 3600));
            });
            Ok(())
        })
        // the close button hides to the tray, only the tray's "Quit" ends the launcher; minimising is an ordinary
        // minimise to the taskbar. The tray icon (or its "Open" item, or starting the launcher again) brings it back
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 1.3.12 (owner): a tick in Settings - the close button quits the launcher instead of hiding it in the tray
                if window.app_handle().state::<App>().settings.lock().unwrap().close_quits.unwrap_or(false) {
                    window.app_handle().exit(0);
                    return;
                }
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_status, refresh, set_channel, switch_to, send_logs, set_comp_option, set_setting, set_component, clean_junk, pick_game_dir, open_url, set_comp_value, open_game_dir, start_update, cancel_update, play,
            fb_info, fb_set_name, fb_send, fb_thread, set_tray_labels, launcher_check, launcher_install, rooms_live, room_join,
            hotkeys_get, hotkeys_save, hotkeys_reset, uninstall_elite,
            c_status, c_login, c_login_local, c_login_cancel, c_logout, c_api, c_stream_up, net_status, net_check, mm_live, events_get,
            relic_probe, game_net_check
        ])
        .build(tauri::generate_context!())
        .expect("error while running Elite Launcher")
        .run(|_app, _event| {
            // macOS: a click on the Dock icon brings back the window the close button hid
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = _event {
                show_window(_app);
            }
        });
}

#[cfg(test)]
mod enforce_off_tests {
    use super::*;
    #[test]
    fn off_addons_and_hand_copies_are_not_loadable() {
        let d = std::env::temp_dir().join(format!("eo_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        for p in ["dow2-patches", "Elite_DLLs", "LobbyStats"] { std::fs::create_dir_all(d.join(p)).unwrap(); }
        for f in ["dow2-patches/Relay.dll", "dow2-patches/ObsFix.dll", "dow2-patches/MMFind.dll", "Elite_DLLs/Relay.dll",
                  "Elite_DLLs/MMFind.dll", "LobbyStats/LobbyStats.dll", "dow2-patches/Other.dll"] { std::fs::write(d.join(f), b"x").unwrap(); }
        let comp = |id: &str, dll: &str, def: bool, conf: &[&str]| elite_core::config::Component { id: id.into(), inject: dll.into(), default: def,
            conflicts: conf.iter().map(|s| s.to_string()).collect(), ..Default::default() };
        let mut cfg = LauncherConfig::default();
        cfg.components = vec![comp("relay_r2", "Relay.dll", false, &[]), comp("automatch", "MMFind.dll", true, &["dow2-patches/MMFind.dll"]),
                              comp("obsfix_r2", "ObsFix.dll", false, &["dow2-patches/ObsFix.dll"]),
                              comp("lobbystats_r3", "LobbyStats.dll", false, &["dow2-patches/LobbyStats.dll", "LobbyStats/LobbyStats.dll"])];
        let ex = |f: &str| d.join(f).is_file();
        // the old copies are found (they stop the start) and put aside on request; the foreign DLL stays
        let old = old_copies(&d, &cfg);
        for f in ["dow2-patches/Relay.dll", "dow2-patches/ObsFix.dll", "dow2-patches/MMFind.dll", "LobbyStats/LobbyStats.dll"] {
            assert!(old.iter().any(|x| x == f), "{f} in {old:?}");
        }
        assert!(!old.iter().any(|x| x.contains("Other")), "{old:?}");
        let moved = put_aside_old_copies(&d, &cfg);
        assert_eq!(moved.len(), 4, "{moved:?}");
        assert!(old_copies(&d, &cfg).is_empty());
        assert!(!ex("dow2-patches/Relay.dll") && !ex("dow2-patches/Relay.dll.off") && !ex("LobbyStats/LobbyStats.dll"));
        assert!(ex("dow2-patches/Other.dll"), "files that are not ours stay");
        assert!(std::fs::read_dir(d.join(".elite_cache")).unwrap().flatten().any(|e| e.path().join("dow2-patches").join("Relay.dll").is_file()), "kept aside");
        // an add-on that is off: its DLL is deleted, no X.dll.off left behind
        enforce_off(&d, &cfg, &Settings::default());
        assert!(!ex("Elite_DLLs/Relay.dll") && !ex("Elite_DLLs/Relay.dll.off"));
        assert!(ex("Elite_DLLs/MMFind.dll"), "an add-on that is on keeps its DLL");
        enforce_off(&d, &cfg, &Settings::default());            // a second start: nothing breaks
        assert!(ex("Elite_DLLs/MMFind.dll"));
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn leftovers_of_our_dlls_go_and_nothing_else() {
        let d = std::env::temp_dir().join(format!("lo_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        for p in ["Elite_DLLs", ".elite_launcher"] { std::fs::create_dir_all(d.join(p)).unwrap(); }
        // what players' logs showed among the game's modules, plus Elite's own files and a foreign mod with its own .bak
        for f in ["Elite_DLLs/Relay.dll.off", "Elite_DLLs/Relay.dll.eliteupd", "Elite_DLLs/Cooldowns.dll.off", "Elite_DLLs/LobbyStats.dll.bak",
                  "Elite_DLLs/LoadingRatings.dll.off", "Elite_DLLs/OldTimer.dll.off", "Elite_DLLs/MMFind.dll", "Elite_DLLs/MMFind.ini",
                  "Elite_DLLs/MiscFixes.dll", "Elite_DLLs/MiscFixes.dll.bak", "Elite_DLLs/Foreign.dll", "Elite_DLLs/Foreign.dll.off",
                  "Elite_DLLs/Relay.log"] { std::fs::write(d.join(f), b"MZ").unwrap(); }
        // Elite's MiscFixes.dll (main manifest); an add-on gone from the catalog that once installed OldTimer.dll
        std::fs::write(d.join(".elite_launcher/state.json"), r#"{"files":[{"path":"Elite_DLLs/MiscFixes.dll","size":2,"mtime":0,"sha":""}]}"#).unwrap();
        std::fs::write(d.join(".elite_launcher/component-oldtimer.json"), r#"{"version":"t-1","files":[{"path":"Elite_DLLs/OldTimer.dll","size":2,"mtime":0,"sha":""}]}"#).unwrap();
        let comp = |id: &str, dll: &str, def: bool| elite_core::config::Component { id: id.into(), inject: dll.into(), default: def, ..Default::default() };
        let mut cfg = LauncherConfig::default();
        cfg.components = vec![comp("automatch", "MMFind.dll", true), comp("relay_r2", "Relay.dll", true),
                              comp("cooldowns_r2", "Cooldowns.dll", false), comp("lobbystats_r3", "LobbyStats.dll", false)];
        let gone = drop_leftovers(&d, &cfg);
        let ex = |f: &str| d.join(f).is_file();
        for f in ["Relay.dll.off", "Relay.dll.eliteupd", "Cooldowns.dll.off", "LobbyStats.dll.bak", "LoadingRatings.dll.off", "OldTimer.dll.off"] {
            assert!(!ex(&format!("Elite_DLLs/{f}")), "{f} should go: {gone:?}");
        }
        for f in ["MMFind.dll", "MMFind.ini", "MiscFixes.dll", "MiscFixes.dll.bak", "Foreign.dll", "Foreign.dll.off", "Relay.log"] {
            assert!(ex(&format!("Elite_DLLs/{f}")), "{f} is not a leftover of ours");
        }
        assert_eq!(gone.len(), 6, "{gone:?}");
        assert!(drop_leftovers(&d, &cfg).is_empty(), "a second start: nothing more");
        let _ = std::fs::remove_dir_all(&d);
    }
}

#[cfg(test)]
mod junk_tests {
    use super::*;
    #[test]
    fn stray_plugins_go_to_the_backup_and_ours_stay() {
        let d = std::env::temp_dir().join(format!("junk_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        for p in ["dow2-patches", "Elite_DLLs", "LobbyStats", ".elite_launcher"] { std::fs::create_dir_all(d.join(p)).unwrap(); }
        for f in ["dow2-patches/ReinforceFix.dll", "dow2-patches/ObsFix.dll.off", "winmm.dll", "LobbyStats/LobbyStats.dll",
                  "Elite_DLLs/MiscFixes.dll", "Elite_DLLs/MMFind.dll", "Elite_DLLs/Relay.dll", "Elite_DLLs/Relay.dll.off",
                  "Elite_DLLs/LobbyStats.dll.bak", "Elite_DLLs/MMFind.ini", "Elite_DLLs/Relay.log", "DOW2.exe"] { std::fs::write(d.join(f), b"x").unwrap(); }
        std::fs::write(d.join("Elite.launchconfig"), "IsRetribution=true\nInjectedFiles=MiscFixes.dll, Relay.dll, MMFind.dll\n").unwrap();
        // what the launcher installed: Elite's MiscFixes.dll (main manifest) and the automatch add-on (on by default)
        std::fs::write(d.join(".elite_launcher/state.json"), r#"{"files":[{"path":"Elite_DLLs/MiscFixes.dll","size":1,"mtime":0,"sha":""}]}"#).unwrap();
        std::fs::write(d.join(".elite_launcher/component-automatch.json"), r#"{"version":"mmfind-0.32","files":[{"path":"Elite_DLLs/MMFind.dll","size":1,"mtime":0,"sha":""}]}"#).unwrap();
        let comp = |id: &str, dll: &str, def: bool| elite_core::config::Component { id: id.into(), inject: dll.into(), default: def, ..Default::default() };
        let mut cfg = LauncherConfig::default();
        cfg.components = vec![comp("automatch", "MMFind.dll", true), comp("relay_r2", "Relay.dll", false)];
        let r = junk_cleanup(&d, &cfg, &Settings::default());
        let ex = |f: &str| d.join(f).exists();
        assert!(!ex("dow2-patches") && !ex("winmm.dll") && !ex("LobbyStats"), "the stand-alone package goes: {r}");
        assert!(!ex("Elite_DLLs/Relay.dll") && !ex("Elite_DLLs/Relay.dll.off") && !ex("Elite_DLLs/LobbyStats.dll.bak"), "{r}");
        assert!(ex("Elite_DLLs/MiscFixes.dll") && ex("Elite_DLLs/MMFind.dll"), "Elite's own and ticked add-ons stay: {r}");
        assert!(ex("Elite_DLLs/MMFind.ini") && ex("Elite_DLLs/Relay.log") && ex("DOW2.exe"), "settings, logs, the game stay");
        let lc = std::fs::read_to_string(d.join("Elite.launchconfig")).unwrap();
        assert!(lc.contains("MMFind.dll") && lc.contains("MiscFixes.dll") && !lc.contains("Relay.dll"), "{lc}");
        let bin = std::path::PathBuf::from(r["backup"].as_str().unwrap());
        assert!(bin.join("dow2-patches").join("ReinforceFix.dll").is_file() && bin.join("Elite_DLLs").join("Relay.dll").is_file(), "kept in the backup");
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn start_checks_tell_what_they_did_with_our_addons_only() {
        let d = std::env::temp_dir().join(format!("guard_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        for p in ["Elite_DLLs", "dow2-patches", ".elite_launcher"] { std::fs::create_dir_all(d.join(p)).unwrap(); }
        // Relay is off but its DLL is still there and listed; a hand copy of MMFind in dow2-patches; Other.dll is not ours
        for f in ["Elite_DLLs/MMFind.dll", "Elite_DLLs/Relay.dll", "Elite_DLLs/Other.dll", "dow2-patches/MMFind.dll"] { std::fs::write(d.join(f), b"x").unwrap(); }
        std::fs::write(d.join("Elite.launchconfig"), "IsRetribution=true\nInjectedFiles=MMFind.dll, Relay.dll, Other.dll\n").unwrap();
        let comp = |id: &str, dll: &str, def: bool| elite_core::config::Component { id: id.into(), inject: dll.into(), default: def, ..Default::default() };
        let mut cfg = LauncherConfig::default();
        cfg.components = vec![comp("automatch", "MMFind.dll", true), comp("relay_r2", "Relay.dll", false)];
        let s = Settings::default();
        assert_eq!(old_copies(&d, &cfg), vec!["dow2-patches/MMFind.dll".to_string()], "the hand copy stops the start");
        let off = enforce_off(&d, &cfg, &s);
        assert_eq!(off, vec!["Elite_DLLs/Relay.dll".to_string()], "{off:?}");
        assert!(d.join("dow2-patches/MMFind.dll").is_file(), "hand copies are not touched without asking");
        sync_injected(&d, &cfg, &s);
        let lc = std::fs::read_to_string(d.join("Elite.launchconfig")).unwrap();
        assert!(!lc.contains("Relay.dll") && lc.contains("Other.dll"), "ours out, a foreign DLL left alone: {lc}");
        assert!(d.join("Elite_DLLs/Other.dll").is_file());
        let _ = std::fs::remove_dir_all(&d);
    }
}
