//! The live stream: one open connection instead of polling (/ladder/api/c/stream).
//! Split out of main.rs (1.6.17): the items as they were; main.rs keeps the app's state, settings, config and main().
use super::*;

// ---------- The live stream: one open connection instead of polling ----------
// GET /ladder/api/c/stream on the log hosts (stream.py in dow2-ladder): the server sends only changes - Online
// (online, presence, match, match_end, user), the chat (msg, msg_tr, msg_del, reset) and the own card (me). Each event
// goes to the window as "c_ev" {e, d}; "c_stream" {up, host} tells it whether the stream works (else it polls).
pub(crate) static STREAM_GEN: AtomicU64 = AtomicU64::new(0);   // +1 on sign-in / sign-out: the stream reconnects with the new token
pub(crate) static STREAM_AFTER: LazyLock<Mutex<BTreeMap<String, u64>>> = LazyLock::new(|| Mutex::new(BTreeMap::new()));
pub(crate) static STREAM_UP: AtomicBool = AtomicBool::new(false);
/// The host the stream is up on ("" while down). 1.6.22: always the active host (reach.rs) - it moves when that one changes.
pub(crate) static STREAM_HOST: Mutex<String> = Mutex::new(String::new());

/// Is the stream connected now? The window asks once at start: the stream may have come up before it listened.
#[tauri::command]
pub fn c_stream_up() -> bool { STREAM_UP.load(Ordering::Relaxed) }

/// The newest message id per room the window has (from msgs and from the stream): the server sends what came after.
pub(crate) fn stream_note(m: &Value) {
    if let (Some(room), Some(id)) = (m["room"].as_str(), m["id"].as_u64()) {
        let mut a = STREAM_AFTER.lock().unwrap();
        let e = a.entry(room.to_string()).or_insert(0);
        if id > *e { *e = id; }
    }
}

// 1.4.21 (siritos brief, 06.11.2026): the stream is "up" only after its first event, not after the headers - a VPN, a proxy
// or an antivirus that holds the body back left the launcher "up" with no events, the window never fell back to polling and
// Online moved in jerks every 60 s (the read timeout). After a sleep or a network change the dead connection is left at once
// (its read would wait up to 60 s). community.log: the stream went down (why), came up (after how long), the window polls.

/// A sleep / wake seen from the stream's loop. The loop ticks every 250 ms; a tick that took over WAKE_GAP by the wall clock
/// OR by the monotonic one means the process stood still - the machine slept or hibernated. Both clocks, because they differ
/// by system: on Windows Instant (QueryPerformanceCounter) goes on through a sleep, on Linux / Proton (CLOCK_MONOTONIC) and
/// macOS it stops - the wall clock jumps either way. Chosen over Windows power events (WM_POWERBROADCAST /
/// RegisterSuspendResumeNotification): no window hook, no new Windows API, the same on Linux, testable with given clocks.
/// A wall clock set forward by hand or by a time sync gives one needless reconnect - harmless; set back - no gap.
pub(crate) const WAKE_GAP: Duration = Duration::from_secs(15);
pub(crate) struct WakeWatch { wall: std::time::SystemTime, mono: Instant }
impl WakeWatch {
    fn new(wall: std::time::SystemTime, mono: Instant) -> Self { WakeWatch { wall, mono } }
    /// The time the process stood still since the last tick, when it is a wake.
    fn tick(&mut self, wall: std::time::SystemTime, mono: Instant) -> Option<Duration> {
        let w = wall.duration_since(self.wall).unwrap_or_default();
        let m = mono.saturating_duration_since(self.mono);
        self.wall = wall; self.mono = mono;
        let g = w.max(m);
        (g > WAKE_GAP).then_some(g)
    }
}

/// A network change: the source address the system picks now for the stream's server (a UDP socket "connected" to it - only
/// the route is looked up, no packet goes out), checked every 5 s against the one at the connection's start. Another address
/// (Wi-Fi -> cable, a VPN up or down) or none: the old connection is on a way that is gone.
pub(crate) fn route_src(peer: Option<std::net::SocketAddr>) -> Option<std::net::IpAddr> {
    let peer = peer?;
    let s = std::net::UdpSocket::bind(if peer.is_ipv4() { "0.0.0.0:0" } else { "[::]:0" }).ok()?;
    s.connect(peer).ok()?;
    s.local_addr().ok().map(|a| a.ip())
}
pub(crate) fn host_addr(host: &str) -> Option<std::net::SocketAddr> {
    use std::net::ToSocketAddrs;
    let h = host.trim_start_matches("https://").trim_start_matches("http://").split('/').next().unwrap_or("");
    let hp = if h.contains(':') { h.to_string() } else { format!("{h}:443") };
    hp.to_socket_addrs().ok()?.next()
}

/// What the connection's thread hands to the stream's loop. End: why, and whether the read waited out its timeout (nothing came
/// for the read timeout - the server pings every 20 s, so the way stopped carrying the stream).
/// Fail(busy, marked, why): marked - the request's failure already made the host lost (reach::note_err).
pub(crate) enum Got { Peer(Option<std::net::SocketAddr>), Line(String), End(String, bool), Fail(bool, bool, String) }

// 1.6.19 (Malum 16.11.2026, log bundle 20261116-205024): his line (a DPI) stops long connections to Germany after 2-5 minutes,
// Moscow holds them for hours. After a restart the check picked Germany (its short answer passes) and the stream went down by
// a read timeout every ~4 min and came back to the SAME host each time - the chat stood empty while it hung. Now a host whose
// stream stops twice within CUT_WINDOW (a read timeout after it was up, or an answer that gives no event) is set aside
// (reach.rs set_aside: after every host that answers, for hours, kept over a restart): the stream and every API call go to the
// next host and community.log says so.
pub(crate) const CUT_WINDOW: Duration = Duration::from_secs(15 * 60);
/// The cuts of the stream's host in a row (another host, or a long stream, starts it again).
#[derive(Default)]
pub(crate) struct CutWatch { host: String, n: u32, first: Option<Instant> }
impl CutWatch {
    /// One more cut on `host`: true when it is the second within CUT_WINDOW - set it aside.
    fn cut(&mut self, host: &str, now: Instant) -> bool {
        let fresh = self.host != host || self.first.map_or(true, |f| now.saturating_duration_since(f) > CUT_WINDOW);
        if fresh { self.host = host.to_string(); self.n = 0; self.first = Some(now); }
        self.n += 1;
        if self.n >= 2 { *self = CutWatch::default(); return true; }
        false
    }
}

/// One SSE frame at a time: lines in, (event, data) out at the blank line that ends an event. "retry:" and ": ping" lines and
/// a frame without "event:" give nothing.
#[derive(Default)]
pub(crate) struct Sse { ev: String, data: String }
impl Sse {
    fn line(&mut self, line: &str) -> Option<(String, Value)> {
        if line.is_empty() {
            let out = if self.ev.is_empty() { None } else { serde_json::from_str::<Value>(&self.data).ok().map(|d| (std::mem::take(&mut self.ev), d)) };
            self.ev.clear(); self.data.clear();
            return out;
        }
        if let Some(v) = line.strip_prefix("event:") { self.ev = v.trim().to_string(); }
        else if let Some(v) = line.strip_prefix("data:") { self.data.push_str(v.trim_start()); }
        None
    }
}

/// The stream's state for community.log: short lines only - down (why), up (after how long), polling; never per event or ping.
pub(crate) struct StreamLog { down_at: Instant, tries: u32, err_logged: bool, poll_logged: bool }
impl StreamLog {
    fn new(now: Instant) -> Self { StreamLog { down_at: now, tries: 0, err_logged: false, poll_logged: false } }
    fn up(&mut self, host: &str, now: Instant) -> String {
        let s = format!("stream up {host}: {} s after it went down, {} tr{}", now.saturating_duration_since(self.down_at).as_secs(), self.tries, if self.tries == 1 { "y" } else { "ies" });
        self.tries = 0; self.err_logged = false; self.poll_logged = false;
        s
    }
    fn down(&mut self, host: &str, why: &str, up_for: Duration, now: Instant) -> String {
        self.down_at = now; self.tries = 0; self.err_logged = false; self.poll_logged = false;
        format!("stream down {host}: {why} (was up {} s)", up_for.as_secs())
    }
    /// A failed try while down: only the first of the series is written.
    fn failed(&mut self, host: &str, why: &str) -> Option<String> {
        if self.err_logged { return None; }
        self.err_logged = true;
        Some(format!("stream {host}: {why}"))
    }
    /// 30 s without the stream - the window polls (app.js streamState: the same 30 s), once per time down.
    fn polling(&mut self, now: Instant) -> Option<String> {
        if self.poll_logged || now.saturating_duration_since(self.down_at) < Duration::from_secs(30) { return None; }
        self.poll_logged = true;
        Some("stream: none for 30 s - the window polls the chat and Online until it is back".to_string())
    }
}

/// The pause before the next try: 1, 2, 5, 10, 30 s by the failed tries in a row plus 0-2 s at random, so a server restart is
/// not hit by everyone in the same second; 30 s when the server is full.
pub(crate) fn stream_pause(fails: usize, busy: bool, rnd: u16) -> Duration {
    let base = if busy { 30 } else { [1u64, 2, 5, 10, 30][fails.min(4)] };
    Duration::from_millis(base * 1000 + rnd as u64 % 2000)
}

/// What the stream's loop needs from the launcher - the app below; a test gives its own hosts, clocks and a log it reads.
pub(crate) trait StreamSide: Send + Sync + 'static {
    fn hosts(&self) -> Vec<String>;
    fn who(&self) -> (String, &'static str);                     // the session token, "menu" | "game"
    fn event(&self, ev: &str, d: Value);
    fn up(&self, up: bool, host: &str);
    fn log(&self, l: &str);
    fn gen(&self) -> u64 { STREAM_GEN.load(Ordering::SeqCst) }
    fn clocks(&self) -> (std::time::SystemTime, Instant) { (std::time::SystemTime::now(), Instant::now()) }
    fn route(&self, peer: Option<std::net::SocketAddr>) -> Option<std::net::IpAddr> { route_src(peer) }
    fn stop(&self) -> bool { false }
    /// The read timeout of the stream's connection (the server pings every 20 s).
    fn read_timeout(&self) -> Duration { Duration::from_secs(60) }
    /// The host's streams die on this line: set it aside (reach.rs); the order after it.
    fn set_aside(&self, host: &str, why: &str) -> Vec<String> { reach::set_aside(host, why); self.hosts() }
    /// 1.6.22: the stream failed on the way to the host (no connection, or an answer whose events never came): the shared pool
    /// hears of it - the next host is active for everything, the stream included.
    fn lost(&self, host: &str, why: &str) { reach::lost(host, why) }
    /// How often a stream that is up looks whether the active host is still its host.
    fn follow_every(&self) -> Duration { Duration::from_secs(5) }
}
pub(crate) struct AppStream(AppHandle);
impl StreamSide for AppStream {
    fn hosts(&self) -> Vec<String> { reach::api_hosts() }
    fn who(&self) -> (String, &'static str) {
        let st = self.0.state::<App>();
        let token = st.settings.lock().unwrap().c_token.clone();
        (token, if st.game_running.load(Ordering::Relaxed) { "game" } else { "menu" })
    }
    fn event(&self, ev: &str, d: Value) {
        if ev == "msg" { stream_note(&d); }
        let _ = self.0.emit("c_ev", json!({"e": ev, "d": d}));
    }
    fn up(&self, up: bool, host: &str) {
        STREAM_UP.store(up, Ordering::Relaxed);
        *STREAM_HOST.lock().unwrap() = if up { host.to_string() } else { String::new() };
        let _ = self.0.emit("c_stream", if up { json!({"up": true, "host": host}) } else { json!({"up": false}) });
    }
    fn log(&self, l: &str) { c_log(l) }
}

pub(crate) fn stream_loop(app: AppHandle) {
    if reach::api_hosts().is_empty() { return; }
    stream_run(Arc::new(AppStream(app)));
}

pub(crate) fn stream_run(side: Arc<dyn StreamSide>) {
    use std::io::BufRead;
    use std::sync::mpsc::{channel, RecvTimeoutError};
    // its own agent: a read may wait up to 60 s (the server pings every 20 s), and no overall timeout - in ureq 2 that
    // would cap the whole response and cut the stream
    let agent = ureq::AgentBuilder::new().timeout_connect(Duration::from_secs(10)).timeout_read(side.read_timeout()).build();
    let mut fails = 0usize;
    let mut cuts = CutWatch::default();
    let (w0, m0) = side.clocks();
    let mut watch = WakeWatch::new(w0, m0);
    let mut slog = StreamLog::new(m0);
    while !side.stop() {
        let gen = side.gen();
        // the active host of the moment (reach.rs): the start uses the last run's order, the checks of this run may change it
        let hosts = side.hosts();
        if hosts.is_empty() { return; }
        let host = hosts[0].clone();
        let (token, state) = side.who();
        let after = STREAM_AFTER.lock().unwrap().iter().map(|(k, v)| format!("{k}:{v}")).collect::<Vec<_>>().join(",");
        let mut req = agent.get(&format!("{host}/ladder/api/c/stream?after={after}")).set("Accept", "text/event-stream").set("Accept-Encoding", "identity").set("X-State", state);   // 1.6.20: ureq takes gzip now - a packed SSE would wait for a proxy's buffer
        if !token.is_empty() { req = req.set("X-Token", &token); }   // in a header, never in the address
        // the connection in its own thread: after a wake the loop leaves it at once instead of waiting out its read (60 s);
        // a left one ends by itself at its next line (nobody listens) or its read timeout, and touches nothing after that
        let (tx, rx) = channel::<Got>();
        let live = Arc::new(AtomicBool::new(true));
        {
            let (host, live) = (host.clone(), live.clone());
            std::thread::spawn(move || {
                let _ = tx.send(Got::Peer(host_addr(&host)));
                match req.call() {
                    Ok(r) => {
                        for line in std::io::BufReader::new(r.into_reader()).lines() {
                            match line {
                                Ok(l) => if tx.send(Got::Line(l)).is_err() { return; },
                                Err(e) => {
                                    let stalled = matches!(e.kind(), std::io::ErrorKind::TimedOut | std::io::ErrorKind::WouldBlock) || e.to_string().contains("timed out");
                                    let _ = tx.send(Got::End(format!("read: {e}"), stalled)); return;
                                }
                            }
                        }
                        let _ = tx.send(Got::End("closed by the server".into(), false));
                    }
                    Err(ureq::Error::Status(503, _)) => { let _ = tx.send(Got::Fail(true, false, "503: the server is full".into())); }   // it asks for 30 s
                    Err(e) => {
                        let marked = reach::way_error(&e);
                        if live.load(Ordering::SeqCst) && marked { reach::note_err(&host, "stream", &e); }
                        let _ = tx.send(Got::Fail(false, marked, e.to_string()));
                    }
                }
            });
        }
        slog.tries += 1;
        let mut sse = Sse::default();
        let (mut up_at, mut peer, mut src): (Option<Instant>, Option<std::net::SocketAddr>, Option<std::net::IpAddr>) = (None, None, None);
        let (mut fail, mut busy, mut kick, mut stalled, mut marked) = (false, false, false, false, false);
        let mut route_at = Instant::now();
        let mut follow_at = Instant::now();
        let why: String = loop {
            match rx.recv_timeout(Duration::from_millis(250)) {
                Ok(Got::Peer(p)) => { peer = p; src = side.route(p); route_at = Instant::now(); }
                Ok(Got::Line(line)) => if let Some((ev, d)) = sse.line(&line) {
                    if up_at.is_none() {                    // the first event: the stream works (the server sends "online" at once)
                        up_at = Some(Instant::now()); fails = 0;
                        side.log(&slog.up(&host, side.clocks().1));
                        side.up(true, &host);
                    }
                    side.event(&ev, d);
                },
                Ok(Got::End(e, st)) => { stalled = st; break e; }
                Ok(Got::Fail(b, m, e)) => { fail = true; busy = b; marked = m; break e; }
                Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => break "the connection's thread ended".into(),
            }
            if side.gen() != gen { break "signed in / out".into(); }
            if side.stop() { break "stopped".into(); }
            let (w, m) = side.clocks();
            if let Some(g) = watch.tick(w, m) { kick = true; break format!("wake (the clocks jumped {} s)", g.as_secs()); }
            if peer.is_some() && route_at.elapsed() >= Duration::from_secs(5) {
                route_at = Instant::now();
                let now_src = side.route(peer);
                if now_src != src { kick = true; break format!("network changed ({} -> {})", src.map_or("none".into(), |a| a.to_string()), now_src.map_or("none".into(), |a| a.to_string())); }
            }
            // 1.6.22: the active host changed (a request failed on the way to this one, a check found a much faster one): the stream
            // goes there too, so the chat, its history and every other call come from one host
            if up_at.is_some() && follow_at.elapsed() >= side.follow_every() {
                follow_at = Instant::now();
                if let Some(a) = side.hosts().first().filter(|a| **a != host) { kick = true; break format!("the active host is {a} now"); }
            }
            if up_at.is_none() { if let Some(l) = slog.polling(m) { side.log(&l); } }
        };
        live.store(false, Ordering::SeqCst);
        drop(rx);
        // a cut of this host's stream: up, then nothing for the read timeout; or an answer without any event
        let cut = !kick && side.gen() == gen && !side.stop() && if up_at.is_some() { stalled } else { !fail };
        if let Some(t) = up_at {
            side.up(false, &host);
            side.log(&slog.down(&host, &why, t.elapsed(), side.clocks().1));
            if !stalled && t.elapsed() >= CUT_WINDOW { cuts = CutWatch::default(); }   // a long stream ended normally: a new count
        } else if kick {
            side.log(&format!("stream {host}: {why} before the first event - again at once"));
        } else if side.gen() == gen {
            // no event: no connection, or an answer whose body never came (a proxy holding it) - the next host, a longer pause
            let what = if fail { why.clone() } else { format!("answered, but no event came ({why})") };
            if let Some(l) = slog.failed(&host, &what) { side.log(&l); }
            if !busy {
                // no connection (marked lost already by the request), an HTTP error of the host (4xx / 5xx: as before 1.6.22 the
                // stream moves on) or an answer without events: the shared pool hears of it, the next host is active - the stream
                // tries it next
                if !marked { side.lost(&host, &format!("stream: {what}")); }
                fails += 1;
            }
        }
        if cut && cuts.cut(&host, Instant::now()) {
            let what = if up_at.is_some() { "nothing came for the read timeout" } else { "answered, but no event came" };
            let order = side.set_aside(&host, &format!("the stream stopped twice in {} min ({what})", CUT_WINDOW.as_secs() / 60));
            let next = order.iter().find(|h| **h != host).cloned();
            side.log(&match &next {
                Some(n) => format!("stream {host}: stopped twice within {} min ({what}) - set aside for {} h; the stream and the API go to {n}",
                                   CUT_WINDOW.as_secs() / 60, reach::SET_ASIDE_SECS / 3600),
                None => format!("stream {host}: stopped twice within {} min ({what}) - no other host to go to", CUT_WINDOW.as_secs() / 60),
            });
        }
        if side.gen() != gen { continue; }   // signed in / out: at once, with the new token
        if kick { let (w, m) = side.clocks(); watch = WakeWatch::new(w, m); continue; }   // woke up / new network: at once
        let mut b = [0u8; 2];
        let _ = getrandom::getrandom(&mut b);
        let end = Instant::now() + stream_pause(fails, busy, u16::from_le_bytes(b));
        while Instant::now() < end && side.gen() == gen && !side.stop() {
            std::thread::sleep(Duration::from_millis(250));
            let (w, m) = side.clocks();
            if watch.tick(w, m).is_some() { break; }   // a wake while waiting: at once
            if let Some(l) = slog.polling(m) { side.log(&l); }
        }
    }
}

#[cfg(test)]
mod stream_tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};
    #[test]
    fn a_wake_is_seen_by_either_clock() {
        let (w0, m0) = (UNIX_EPOCH + Duration::from_secs(1_800_000_000), Instant::now());
        let mut w = WakeWatch::new(w0, m0);
        // ordinary ticks: 250 ms on both clocks
        assert_eq!(w.tick(w0 + Duration::from_millis(250), m0 + Duration::from_millis(250)), None);
        assert_eq!(w.tick(w0 + Duration::from_millis(500), m0 + Duration::from_millis(500)), None);
        // a sleep on Linux / macOS: the monotonic clock stood, the wall clock went on an hour
        assert_eq!(w.tick(w0 + Duration::from_secs(3600), m0 + Duration::from_millis(750)), Some(Duration::from_millis(3_599_500)));
        // a sleep on Windows (QPC runs through it): both jumped
        let (w1, m1) = (w0 + Duration::from_secs(3600), m0 + Duration::from_millis(750));
        assert_eq!(w.tick(w1 + Duration::from_secs(600), m1 + Duration::from_secs(600)), Some(Duration::from_secs(600)));
        // a short stall (10 s of a busy machine) is not a wake; the wall clock set back is not either
        let (w2, m2) = (w1 + Duration::from_secs(600), m1 + Duration::from_secs(600));
        assert_eq!(w.tick(w2 + Duration::from_secs(10), m2 + Duration::from_secs(10)), None);
        assert_eq!(w.tick(w2 - Duration::from_secs(7200), m2 + Duration::from_secs(10) + Duration::from_millis(250)), None);
        let _ = SystemTime::now();
    }
    #[test]
    fn up_only_on_the_first_event() {
        let mut s = Sse::default();
        // what stream.py sends: retry, the missed messages, online; headers alone or "retry:" are no event
        assert!(s.line("retry: 5000").is_none());
        assert!(s.line("").is_none());
        assert!(s.line(": ping").is_none() && s.line("").is_none());
        assert!(s.line("event: online").is_none());
        assert!(s.line("data: {\"users\":{}}").is_none());
        let (ev, d) = s.line("").expect("online is an event");
        assert_eq!(ev, "online"); assert!(d["users"].is_object());
        // a broken data line: no event, and the next one is whole again
        assert!(s.line("event: msg").is_none() && s.line("data: {broken").is_none() && s.line("").is_none());
        assert!(s.line("event: msg").is_none() && s.line("data: {\"id\":5,\"room\":\"all\"}").is_none());
        assert_eq!(s.line("").unwrap().1["id"], 5);
    }
    #[test]
    fn the_log_says_down_up_and_polling_once() {
        let t0 = Instant::now();
        let mut l = StreamLog::new(t0);
        assert!(l.polling(t0 + Duration::from_secs(29)).is_none());
        assert!(l.polling(t0 + Duration::from_secs(30)).is_some());
        assert!(l.polling(t0 + Duration::from_secs(60)).is_none(), "once per time down");
        l.tries = 3;
        assert!(l.failed("h", "timeout").is_some()); assert!(l.failed("h", "timeout").is_none(), "only the first failure of a series");
        assert_eq!(l.up("h", t0 + Duration::from_secs(42)), "stream up h: 42 s after it went down, 3 tries");
        assert_eq!(l.down("h", "read: timed out", Duration::from_secs(600), t0 + Duration::from_secs(642)), "stream down h: read: timed out (was up 600 s)");
        assert!(l.failed("h", "x").is_some(), "a new time down: its first failure is written again");
    }
    #[test]
    fn the_pause_grows_with_a_spread() {
        assert_eq!(stream_pause(0, false, 0), Duration::from_secs(1));
        assert_eq!(stream_pause(1, false, 0), Duration::from_secs(2));
        assert_eq!(stream_pause(9, false, 1999), Duration::from_millis(31_999));
        assert_eq!(stream_pause(0, true, 2000), Duration::from_secs(30));
    }
    // ---- the loop itself against a local server: one that holds the body back, one that streams ----
    use std::io::{Read, Write};
    use std::sync::atomic::AtomicUsize;
    struct Fake { host: String, log: Mutex<Vec<String>>, ups: Mutex<Vec<bool>>, events: Mutex<Vec<String>>, wall_off: AtomicU64,
                  route: Mutex<Option<std::net::IpAddr>>, stop: AtomicBool,
                  more: Mutex<Vec<String>>, aside: Mutex<Vec<String>>, up_on: Mutex<Vec<String>>, rt: Duration, lost: Mutex<Vec<String>> }
    impl StreamSide for Fake {
        // the hosts as reach.rs orders them: the ones set aside after the others, the lost ones at the end
        fn hosts(&self) -> Vec<String> {
            let aside = self.aside.lock().unwrap().clone();
            let lost = self.lost.lock().unwrap().clone();
            let all: Vec<String> = std::iter::once(self.host.clone()).chain(self.more.lock().unwrap().iter().cloned()).collect();
            all.iter().filter(|h| !aside.contains(h) && !lost.contains(h)).chain(all.iter().filter(|h| aside.contains(h) && !lost.contains(h)))
                .chain(all.iter().filter(|h| lost.contains(h))).cloned().collect()
        }
        fn lost(&self, host: &str, _why: &str) { let mut l = self.lost.lock().unwrap(); l.retain(|h| h != host); l.push(host.to_string()); }
        fn follow_every(&self) -> Duration { Duration::from_millis(300) }
        fn who(&self) -> (String, &'static str) { (String::new(), "menu") }
        fn event(&self, ev: &str, _d: Value) { self.events.lock().unwrap().push(ev.to_string()); }
        fn up(&self, up: bool, host: &str) { self.ups.lock().unwrap().push(up); if up { self.up_on.lock().unwrap().push(host.to_string()); } }
        fn read_timeout(&self) -> Duration { self.rt }
        fn set_aside(&self, host: &str, _why: &str) -> Vec<String> { self.aside.lock().unwrap().push(host.to_string()); self.hosts() }
        fn log(&self, l: &str) { self.log.lock().unwrap().push(l.to_string()); }
        fn gen(&self) -> u64 { 0 }
        // the wall clock moved by the test (a sleep as Linux sees it: the monotonic clock stood)
        fn clocks(&self) -> (std::time::SystemTime, Instant) {
            (std::time::SystemTime::now() + Duration::from_secs(self.wall_off.load(Ordering::SeqCst)), Instant::now())
        }
        fn route(&self, peer: Option<std::net::SocketAddr>) -> Option<std::net::IpAddr> { peer.and(*self.route.lock().unwrap()) }
        fn stop(&self) -> bool { self.stop.load(Ordering::SeqCst) }
    }
    /// stall: the headers, then nothing (a proxy holding the body); else stream.py's start and a ping every 500 ms
    fn server(stall: bool) -> (String, Arc<AtomicUsize>) { server_as(if stall { Srv::Stall } else { Srv::Stream }) }
    #[derive(Clone, Copy, PartialEq)]
    enum Srv { Stream, Stall, Cut, Missing }
    /// Cut: stream.py's start, then nothing - a DPI that stops a long connection after its first bytes (Malum 16.11.2026)
    fn server_as(mode: Srv) -> (String, Arc<AtomicUsize>) {
        let l = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}", l.local_addr().unwrap());
        let n = Arc::new(AtomicUsize::new(0));
        let n2 = n.clone();
        std::thread::spawn(move || for c in l.incoming() {
            let Ok(mut c) = c else { continue };
            n2.fetch_add(1, Ordering::SeqCst);
            std::thread::spawn(move || {
                let mut buf = [0u8; 4096]; let _ = c.read(&mut buf);
                if mode == Srv::Missing { let _ = c.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"); return; }
                let _ = c.write_all(b"HTTP/1.1 200 OK\r\nContent-Type: text/event-stream; charset=utf-8\r\nCache-Control: no-store\r\n\r\n");
                let _ = c.flush();
                if mode == Srv::Stall { std::thread::sleep(Duration::from_secs(120)); return; }
                let _ = c.write_all(b"retry: 5000\n\nevent: online\ndata: {\"searching\":[],\"ingame\":[],\"launcher\":[],\"users\":{}}\n\n");
                if mode == Srv::Cut { std::thread::sleep(Duration::from_secs(120)); return; }
                loop { std::thread::sleep(Duration::from_millis(500)); if c.write_all(b": ping\n\n").is_err() { return; } }
            });
        });
        (url, n)
    }
    fn fake(host: String) -> Arc<Fake> { fake_with(host, vec![], Duration::from_secs(60)) }
    fn fake_with(host: String, more: Vec<String>, rt: Duration) -> Arc<Fake> {
        Arc::new(Fake { host, log: Mutex::new(vec![]), ups: Mutex::new(vec![]), events: Mutex::new(vec![]), wall_off: AtomicU64::new(0),
                        route: Mutex::new(Some("10.0.0.1".parse().unwrap())), stop: AtomicBool::new(false),
                        more: Mutex::new(more), aside: Mutex::new(vec![]), up_on: Mutex::new(vec![]), rt, lost: Mutex::new(vec![]) })
    }
    fn wait(secs: u64, f: impl Fn() -> bool) -> bool {
        let end = Instant::now() + Duration::from_secs(secs);
        while Instant::now() < end { if f() { return true; } std::thread::sleep(Duration::from_millis(50)); }
        f()
    }
    #[test]
    fn headers_without_a_body_are_not_up_and_the_window_polls() {
        // before 1.4.21 the stream was "up" right after these headers; the window never polled and Online stood for 60 s
        let (url, n) = server(true);
        let f = fake(url);
        let side: Arc<dyn StreamSide> = f.clone();
        std::thread::spawn(move || stream_run(side));
        assert!(wait(5, || n.load(Ordering::SeqCst) >= 1), "connected");
        std::thread::sleep(Duration::from_secs(31));
        f.stop.store(true, Ordering::SeqCst);
        assert!(f.ups.lock().unwrap().is_empty(), "never up: {:?}", f.ups.lock().unwrap());
        let log = f.log.lock().unwrap().join("\n");
        assert!(log.contains("stream: none for 30 s - the window polls"), "{log}");
        assert!(!log.contains("stream up"), "{log}");
    }
    #[test]
    fn up_on_the_first_event_and_at_once_again_after_a_wake() {
        let (url, n) = server(false);
        let f = fake(url);
        let side: Arc<dyn StreamSide> = f.clone();
        std::thread::spawn(move || stream_run(side));
        assert!(wait(5, || *f.ups.lock().unwrap() == vec![true]), "up: {:?}", f.ups.lock().unwrap());
        assert_eq!(f.events.lock().unwrap().first().map(String::as_str), Some("online"));
        std::thread::sleep(Duration::from_secs(2));
        assert_eq!(n.load(Ordering::SeqCst), 1, "pings keep the one connection");
        let t = Instant::now();
        f.wall_off.store(3600, Ordering::SeqCst);                     // the machine slept an hour
        assert!(wait(3, || *f.ups.lock().unwrap() == vec![true, false, true]), "down and up again: {:?}", f.ups.lock().unwrap());
        assert!(t.elapsed() < Duration::from_millis(1500), "at once, not after a pause or the 60 s read timeout: {:?}", t.elapsed());
        assert_eq!(n.load(Ordering::SeqCst), 2);
        let log = f.log.lock().unwrap().join("\n");
        assert!(log.contains("stream down") && log.contains("wake (the clocks jumped 3600 s)"), "{log}");
        assert_eq!(log.matches("stream up").count(), 2, "{log}");
        f.stop.store(true, Ordering::SeqCst);
    }
    #[test]
    fn a_new_network_reconnects_at_once() {
        let (url, n) = server(false);
        let f = fake(url);
        let side: Arc<dyn StreamSide> = f.clone();
        std::thread::spawn(move || stream_run(side));
        assert!(wait(5, || *f.ups.lock().unwrap() == vec![true]));
        *f.route.lock().unwrap() = Some("192.168.1.7".parse().unwrap());   // Wi-Fi -> another network / a VPN came up
        assert!(wait(8, || n.load(Ordering::SeqCst) == 2 && f.ups.lock().unwrap().len() == 3), "{:?}", f.ups.lock().unwrap());
        let log = f.log.lock().unwrap().join("\n");
        assert!(log.contains("network changed (10.0.0.1 -> 192.168.1.7)"), "{log}");
        f.stop.store(true, Ordering::SeqCst);
    }
    #[test]
    fn a_host_whose_stream_stops_twice_is_set_aside_and_the_stream_moves() {
        // Malum 16.11.2026: Germany first in the order, its stream stops after its first bytes (read timeout), Moscow streams
        let (de, n_de) = server_as(Srv::Cut);
        let (ru, n_ru) = server_as(Srv::Stream);
        let f = fake_with(de.clone(), vec![ru.clone()], Duration::from_secs(1));
        let side: Arc<dyn StreamSide> = f.clone();
        std::thread::spawn(move || stream_run(side));
        assert!(wait(20, || f.up_on.lock().unwrap().contains(&ru)), "moved to the other host: {:?}\n{}", f.up_on.lock().unwrap(), f.log.lock().unwrap().join("\n"));
        f.stop.store(true, Ordering::SeqCst);
        assert_eq!(n_de.load(Ordering::SeqCst), 2, "two cuts, not more: the same host is not tried a third time");
        assert_eq!(n_ru.load(Ordering::SeqCst), 1);
        assert_eq!(*f.aside.lock().unwrap(), vec![de.clone()]);
        let log = f.log.lock().unwrap().join("\n");
        assert_eq!(log.matches(&format!("stream down {de}: read:")).count(), 2, "{log}");
        assert!(log.contains(&format!("stream {de}: stopped twice within 15 min (nothing came for the read timeout) - set aside for 6 h; the stream and the API go to {ru}")), "{log}");
        assert!(log.contains(&format!("stream up {ru}")), "{log}");
    }
    #[test]
    fn the_stream_moves_to_a_new_active_host() {
        // 1.6.22: a request of the window failed on the way to Germany - the pool makes Moscow active; the stream that is up on
        // Germany goes there at once, so the chat's history, its events and every other call come from one host
        let (de, n_de) = server_as(Srv::Stream);
        let (ru, n_ru) = server_as(Srv::Stream);
        let f = fake_with(de.clone(), vec![ru.clone()], Duration::from_secs(60));
        let side: Arc<dyn StreamSide> = f.clone();
        std::thread::spawn(move || stream_run(side));
        assert!(wait(5, || *f.up_on.lock().unwrap() == vec![de.clone()]));
        f.lost.lock().unwrap().push(de.clone());
        let t = Instant::now();
        assert!(wait(5, || f.up_on.lock().unwrap().contains(&ru)), "{}", f.log.lock().unwrap().join("\n"));
        assert!(t.elapsed() < Duration::from_secs(2), "at once, no pause: {:?}", t.elapsed());
        f.stop.store(true, Ordering::SeqCst);
        assert_eq!((n_de.load(Ordering::SeqCst), n_ru.load(Ordering::SeqCst)), (1, 1));
        assert!(f.aside.lock().unwrap().is_empty(), "a move is no cut");
        assert!(f.log.lock().unwrap().join("\n").contains(&format!("stream down {de}: the active host is {ru} now")));
    }
    #[test]
    fn an_http_error_of_the_host_moves_the_stream_on() {
        // reviewer 17.11.2026: a 404 / 500 of the stream's address (a host without the stream) is told to the pool, the stream goes on
        let (bad, n_bad) = server_as(Srv::Missing);
        let (ru, _) = server_as(Srv::Stream);
        let f = fake_with(bad.clone(), vec![ru.clone()], Duration::from_secs(60));
        let side: Arc<dyn StreamSide> = f.clone();
        std::thread::spawn(move || stream_run(side));
        assert!(wait(10, || f.up_on.lock().unwrap().contains(&ru)), "{}", f.log.lock().unwrap().join("\n"));
        f.stop.store(true, Ordering::SeqCst);
        assert_eq!(n_bad.load(Ordering::SeqCst), 1);
        assert_eq!(*f.lost.lock().unwrap(), vec![bad.clone()]);
    }
    #[test]
    fn an_answer_without_events_twice_sets_the_host_aside_too() {
        let (de, n_de) = server_as(Srv::Stall);
        let (ru, _) = server_as(Srv::Stream);
        let f = fake_with(de.clone(), vec![ru.clone()], Duration::from_secs(1));
        let side: Arc<dyn StreamSide> = f.clone();
        std::thread::spawn(move || stream_run(side));
        assert!(wait(20, || f.up_on.lock().unwrap().contains(&ru)), "{}", f.log.lock().unwrap().join("\n"));
        // the first no-event try already moves to the next host (1.6.22: the pool hears of it - it is lost for every call); the mark
        // comes with the second one
        std::thread::sleep(Duration::from_secs(1));
        f.stop.store(true, Ordering::SeqCst);
        assert_eq!(n_de.load(Ordering::SeqCst), 1);
        assert_eq!(*f.lost.lock().unwrap(), vec![de.clone()], "the pool heard of it");
        assert!(f.aside.lock().unwrap().is_empty(), "one stall is no reason yet");
    }
    #[test]
    fn cuts_count_per_host_within_the_window() {
        let t0 = Instant::now();
        let mut c = CutWatch::default();
        assert!(!c.cut("de", t0));
        assert!(c.cut("de", t0 + Duration::from_secs(240)), "the second within 15 min");
        assert!(!c.cut("de", t0 + Duration::from_secs(300)), "counted again from there");
        assert!(!c.cut("de", t0 + Duration::from_secs(300) + CUT_WINDOW + Duration::from_secs(1)), "too long apart: a new first one");
        assert!(!c.cut("ru", t0 + Duration::from_secs(2000)), "another host starts again");
        assert!(!c.cut("de", t0 + Duration::from_secs(2010)));
    }
    #[test]
    fn route_of_the_loopback() {
        assert_eq!(host_addr("https://127.0.0.1:8217"), Some("127.0.0.1:8217".parse().unwrap()));
        assert_eq!(route_src(host_addr("https://127.0.0.1:8217")), Some("127.0.0.1".parse().unwrap()));
        assert_eq!(route_src(None), None);
    }
}
