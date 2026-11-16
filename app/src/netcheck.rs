//! The network: our hosts' and Relic's reach from here, the game's network check.
//! Split out of main.rs (1.6.17): the items as they were; main.rs keeps the app's state, settings, config and main().
use super::*;

/// What the window shows in Settings: every mirror and API host with the time of its answer, the best first.
pub(crate) fn net_status_json() -> Value {
    let one = |pool: reach::Pool| { let (list, checked) = reach::snapshot(pool); json!({"list": list, "checked": checked}) };
    json!({"data": one(reach::Pool::Data), "api": one(reach::Pool::Api)})
}
#[tauri::command]
pub fn net_status() -> Value { net_status_json() }
/// 1.4.2 (owner 03.11.2026): the way to Relic's game servers, checked at launcher start - the launcher offers our forwarding
/// servers (add-on relay_fwd, off by default) to the players it would help, they tick it themselves. Two checks:
/// - a connect to Relic's battle relays (ports 27000-27099 carry every online game) - closed or slow ports;
/// - a STREAM to Relic: 16 requests of ~7 KB on one kept connection (110 KB) - in Russia the way to foreign hosting often
///   passes a connect and the first ~33 KB, then stops (DPI; NetProbe 2-3.11.2026), and a match on such a way drops later.
/// Problem = a relay port closed, the median connect over 200 ms (players in Europe and Moscow connect in 100-130 ms; TvangeS,
/// Ukraine, 327 ms -> 540-640 ms round trips in the game, jerky), or the stream stopped / took over 12 s.
/// Also offered to players whose Relay.ini still says Mode=bridge: before Relay 17 (02.11.2026) "every game through our server"
/// was a mode of the one tick; the new forwarding tick is separate and off, so those players silently lost it.
pub(crate) const RELIC_RELAYS: [&str; 3] = ["54.87.3.63:27008", "44.203.117.150:27004", "184.198.184.150:27002"];
pub(crate) fn relay_ini(app: &App) -> String {
    game_dir(app).and_then(|d| std::fs::read_to_string(d.join("Elite_DLLs").join("Relay.ini")).ok()).unwrap_or_default()
}
pub(crate) fn old_bridge(ini: &str) -> bool { ini.lines().any(|l| l.trim().eq_ignore_ascii_case("Mode=bridge")) }
/// 1.4.5: not while the game runs (the check would compete with a match for the line) - the window asks again once it closes.
#[tauri::command]
pub async fn relic_probe(app: State<'_, App>) -> Result<Value, String> {
    if app.game_running.load(Ordering::Relaxed) || is_game_running() { return Ok(json!({"problem": false, "skipped": "game"})); }
    let old_bridge = old_bridge(&relay_ini(&app));
    Ok(tauri::async_runtime::spawn_blocking(move || relic_check(old_bridge))
        .await.unwrap_or_else(|e| json!({"problem": false, "why": e.to_string()})))
}
pub(crate) fn relic_check(old_bridge: bool) -> Value {
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
pub(crate) static GAME_NET_BUSY: AtomicBool = AtomicBool::new(false);
#[tauri::command]
pub async fn game_net_check(app: State<'_, App>) -> Result<Value, String> {
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
pub async fn net_check() -> Value {
    let _ = tauri::async_runtime::spawn_blocking(|| {
        let a = std::thread::spawn(|| { let b = reach::snapshot_candidates(reach::Pool::Data); reach::check(reach::Pool::Data, &b); });
        let b = reach::snapshot_candidates(reach::Pool::Api); reach::check(reach::Pool::Api, &b);
        let _ = a.join();
    }).await;
    net_status_json()
}
