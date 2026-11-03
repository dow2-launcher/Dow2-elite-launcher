//! 1.4.5 (owner 03.11.2026): Settings -> "Online play" - the game's servers as this computer reaches them, judged by the
//! SAME rules the add-ons use when they pick one, so the player sees what the game will do:
//!
//! - Our nodes (Relay.dll / RelayForward.dll, Dow2-patches relay/relay.c, Relay 18/19): the built-in three of the DLL, the
//!   signed list of the ladder (/ladder/api/relays, what MMFind writes into Relay.ini Nodes=) and Relay.ini Nodes= itself;
//!   UDP to the node's udp_gateway (port 47100, Relay.ini Port=): best of 3 PING/PONG (1.5 s each), then a stream of
//!   40 x 1000 bytes at ~1 MB/s. Usable = 30+ answers and 3+ of the last 6 (the ones past the ~33 KB where DPI on many
//!   Russian lines stops a stream); else "not used". Nearest = the usable one with the lowest delay - the node the DLL
//!   takes for a forwarded game and offers first to the matchmaker.
//! - TCP to the node's probe service (gameserver/probe_server.py, port 47110: "PRB1" + u32 BE size -> size bytes), for
//!   information only: the game talks to our nodes over UDP. 64 KB are asked; stopping short = the line cuts streams.
//! - Relic: main.rs relic_check (relays + the API stream, 200 ms), the one the start-up offer of forwarding uses.
//!
//! Only our nodes and the Relic addresses the launcher already checks are contacted. Never while the game runs.
use serde_json::{json, Value};
use std::io::{Read, Write};
use std::net::{Ipv4Addr, SocketAddr, TcpStream, UdpSocket};
use std::time::{Duration, Instant};

/// The DLL's own three (relay.c DllMain): Poland (AWS), Germany (Hetzner), Moscow (Timeweb).
pub const BUILTIN: [(&str, &str); 3] = [("15.220.68.107", "Poland"), ("116.202.106.150", "Germany"), ("83.217.192.34", "Moscow")];
pub const GAME_PORT: u16 = 47100;
pub const PROBE_PORT: u16 = 47110;
/// relay.c keeps at most 8 nodes.
const MAX_NODES: usize = 8;
const PING: u8 = 6;
const PONG: u8 = 7;
pub const BURST_N: usize = 40;
const BURST_LEN: usize = 1000;
const TCP_SIZE: usize = 64 << 10;

#[derive(Clone, Debug, PartialEq)]
pub struct Node { pub ip: Ipv4Addr, pub name: String, pub src: &'static str }

/// The relays of a signed ladder answer, or None when it is not ours (the signature is over the canonical JSON
/// {"v":1,"relays":[...],"ts":N} - publish_relays.py on the ladder server, the key of launcher.json).
pub fn signed_relays(doc: &Value) -> Option<Vec<(Ipv4Addr, String)>> {
    if doc.get("v")?.as_i64()? != 1 { return None; }
    let relays = doc.get("relays")?;
    let ts = doc.get("ts")?.as_i64()?;
    let sig = doc.get("sig")?.as_str()?;
    let msg = format!("{{\"v\":1,\"relays\":{},\"ts\":{ts}}}", serde_json::to_string(relays).ok()?);
    if !elite_core::sign::verify(msg.as_bytes(), sig) { return None; }
    Some(relays.as_array()?.iter().filter_map(|r| {
        let ip: Ipv4Addr = r.get("ip")?.as_str()?.trim().parse().ok()?;
        Some((ip, r.get("name").and_then(|n| n.as_str()).unwrap_or("").to_string()))
    }).collect())
}

/// Relay.ini [Relay] Nodes= and Port= (relay.c merge_nodes: ';', ',' or ' ' between addresses).
pub fn ini_nodes(ini: &str) -> (Vec<Ipv4Addr>, Option<u16>) {
    let (mut sec, mut nodes, mut port) = (String::new(), vec![], None);
    for l in ini.lines() {
        let l = l.trim();
        if l.starts_with('[') { sec = l.trim_matches(|c| c == '[' || c == ']').to_ascii_lowercase(); continue; }
        if sec != "relay" { continue; }
        let Some((k, v)) = l.split_once('=') else { continue };
        match k.trim().to_ascii_lowercase().as_str() {
            "nodes" => nodes = v.split([';', ',', ' ']).filter_map(|x| x.trim().parse::<Ipv4Addr>().ok()).filter(|ip| !ip.is_unspecified()).collect(),
            "port" => port = v.trim().parse().ok().filter(|p| *p > 0),
            _ => {}
        }
    }
    (nodes, port)
}

/// The node set of the DLL: its built-in three, then the ladder's, then Relay.ini's - each address once, 8 at most.
pub fn node_set(ladder: &[(Ipv4Addr, String)], ini: &[Ipv4Addr]) -> Vec<Node> {
    let mut v: Vec<Node> = BUILTIN.iter().map(|(ip, n)| Node { ip: ip.parse().unwrap(), name: n.to_string(), src: "builtin" }).collect();
    for (ip, name) in ladder {
        match v.iter_mut().find(|n| n.ip == *ip) {
            Some(n) => { if !name.is_empty() { n.name = name.clone(); } }
            None => v.push(Node { ip: *ip, name: name.clone(), src: "ladder" }),
        }
    }
    for ip in ini { if !v.iter().any(|n| n.ip == *ip) { v.push(Node { ip: *ip, name: String::new(), src: "ini" }); } }
    v.truncate(MAX_NODES);
    v
}

fn cid() -> u32 { let mut b = [0u8; 4]; let _ = getrandom::getrandom(&mut b); u32::from_le_bytes(b) }
fn hdr(t: u8, cid: u32) -> [u8; 7] { let c = cid.to_le_bytes(); [b'D', b'U', t, c[0], c[1], c[2], c[3]] }
fn is_pong(b: &[u8], cid: u32) -> bool { b.len() >= 7 && b[0] == b'D' && b[1] == b'U' && b[2] == PONG && b[3..7] == cid.to_le_bytes() }
fn udp_to(ip: Ipv4Addr, port: u16) -> Option<UdpSocket> {
    let u = UdpSocket::bind((Ipv4Addr::UNSPECIFIED, 0)).ok()?;
    u.connect((ip, port)).ok()?;
    Some(u)
}

/// One PING/PONG (relay.c udp_rtt): the delay in ms, None = no answer within `ms`.
pub fn udp_rtt(ip: Ipv4Addr, port: u16, ms: u64) -> Option<u32> {
    let u = udp_to(ip, port)?;
    let c = cid();
    let mut pk = hdr(PING, c).to_vec();
    let t0 = Instant::now();
    pk.extend_from_slice(&(t0.elapsed().as_nanos() as u64).to_le_bytes());
    u.send(&pk).ok()?;
    let until = t0 + Duration::from_millis(ms);
    let mut b = [0u8; 64];
    loop {
        let left = until.saturating_duration_since(Instant::now());
        if left.is_zero() { return None; }
        u.set_read_timeout(Some(left)).ok()?;
        match u.recv(&mut b) {
            Ok(n) if is_pong(&b[..n], c) => return Some(t0.elapsed().as_millis().min(u32::MAX as u128) as u32),
            Ok(_) => continue,
            Err(_) => return None,
        }
    }
}

/// The stream check of Relay 18 (relay.c udp_burst): 40 x 1000 bytes, 4 at a time 2 ms apart (~1 MB/s); the gateway answers
/// each with a short PONG carrying its number. (answers, answers among the last 6)
pub fn udp_burst(ip: Ipv4Addr, port: u16) -> (usize, usize) {
    let Some(u) = udp_to(ip, port) else { return (0, 0) };
    let c = cid();
    let mut pk = vec![0x5au8; 7 + BURST_LEN];
    pk[..7].copy_from_slice(&hdr(PING, c));
    let mut got = [false; BURST_N];
    let mut inb = [0u8; 64];
    let note = |b: &[u8], got: &mut [bool; BURST_N]| {
        if b.len() >= 11 && is_pong(b, c) {
            let q = u32::from_le_bytes([b[7], b[8], b[9], b[10]]);
            if q >> 28 == 0xB && ((q & 0xff) as usize) < BURST_N { got[(q & 0xff) as usize] = true; }
        }
    };
    let _ = u.set_nonblocking(true);
    for n in 0..BURST_N {
        pk[7..11].copy_from_slice(&(n as u32 | 0xB000_0000).to_le_bytes());
        let _ = u.send(&pk);
        if n % 4 == 3 { std::thread::sleep(Duration::from_millis(2)); }
        while let Ok(r) = u.recv(&mut inb) { note(&inb[..r], &mut got); }
    }
    let _ = u.set_nonblocking(false);
    let until = Instant::now() + Duration::from_millis(1500);
    while got.iter().any(|g| !g) {
        let left = until.saturating_duration_since(Instant::now());
        if left.is_zero() || u.set_read_timeout(Some(left)).is_err() { break; }
        match u.recv(&mut inb) { Ok(r) => note(&inb[..r], &mut got), Err(_) => break }
    }
    (got.iter().filter(|g| **g).count(), got[BURST_N - 6..].iter().filter(|g| **g).count())
}

/// relay.c measure(): the rule a node is used by.
pub fn usable(ms: Option<u32>, got: usize, tail: usize) -> bool { ms.is_some() && got >= 30 && tail >= 3 }

/// relay.c measure() for one node: best of 3 pings 50 ms apart, then the stream when it answered.
pub fn measure(ip: Ipv4Addr, port: u16) -> Value {
    let mut best: Option<u32> = None;
    for _ in 0..3 {
        if let Some(r) = udp_rtt(ip, port, 1500) { best = Some(best.map_or(r, |b| b.min(r))); }
        std::thread::sleep(Duration::from_millis(50));
    }
    let (got, tail) = if best.is_some() { udp_burst(ip, port) } else { (0, 0) };
    json!({"ms": best, "got": got, "tail": tail, "n": BURST_N, "usable": usable(best, got, tail)})
}

/// A TCP download of 64 KB from the node's probe service: "ok", "cut" (stopped short - no byte for 6 s, or closed), "none"
/// (no connection in 5 s).
pub fn tcp_stream(ip: Ipv4Addr) -> Value {
    let t0 = Instant::now();
    let Ok(mut s) = TcpStream::connect_timeout(&SocketAddr::from((ip, PROBE_PORT)), Duration::from_secs(5)) else {
        return json!({"state": "none"});
    };
    let connect_ms = t0.elapsed().as_millis() as u64;
    let _ = s.set_read_timeout(Some(Duration::from_secs(6)));
    let mut req = *b"PRB1\0\0\0\0";
    req[4..].copy_from_slice(&(TCP_SIZE as u32).to_be_bytes());
    let mut got = 0usize;
    if s.write_all(&req).is_ok() {
        let mut buf = vec![0u8; 16 << 10];
        while got < TCP_SIZE && t0.elapsed() < Duration::from_secs(15) {
            match s.read(&mut buf) { Ok(0) | Err(_) => break, Ok(n) => got += n }
        }
    }
    json!({"state": if got >= TCP_SIZE { "ok" } else { "cut" }, "kb": got / 1024, "ms": t0.elapsed().as_millis() as u64, "connect_ms": connect_ms})
}

/// The nearest usable node (relay.c nearest(): the lowest delay, the first one on a tie).
pub fn nearest(rows: &[Value]) -> Option<usize> {
    let mut best: Option<(usize, u64)> = None;
    for (i, r) in rows.iter().enumerate() {
        if !r["udp"]["usable"].as_bool().unwrap_or(false) { continue; }
        let ms = r["udp"]["ms"].as_u64().unwrap_or(u64::MAX);
        if best.map_or(true, |(_, b)| ms < b) { best = Some((i, ms)); }
    }
    best.map(|b| b.0)
}

// ---------- our lobby servers (OwnLobby.dll 2, Dow2-patches ownlobby/ownlobby.c, 1.4.6) ----------
// OwnLobby puts the game's Relic lobby connection (the automatch) on our lobby server. Its rules: the servers of OwnLobby.ini
// [OwnLobby] Servers= in order (default: the Moscow mirror, then rts), 4 at most; each: a TCP connect within 2.5 s, then -
// unless StreamCheck=0 - the stream check: port + 2 sends 64 KB and closes, usable with 60000+ bytes within 4 s (the
// connect included). The FIRST usable one is used; none - the game talks to Relic directly (the classic search).
pub const LOBBY_DEFAULT: &str = "83.217.192.34:47443;rts.fintebtc.de:47443";
pub const LOBBY_STREAM_NEED: usize = 60000;

/// OwnLobby.ini: (host, port) in order and the stream check (StreamCheck=, default on).
pub fn lobby_ini(ini: &str) -> (Vec<(String, u16)>, bool) {
    let (mut sec, mut servers, mut stream) = (String::new(), None::<String>, true);
    for l in ini.lines() {
        let l = l.trim();
        if l.starts_with('[') { sec = l.trim_matches(|c| c == '[' || c == ']').to_ascii_lowercase(); continue; }
        if sec != "ownlobby" { continue; }
        let Some((k, v)) = l.split_once('=') else { continue };
        match k.trim().to_ascii_lowercase().as_str() {
            "servers" => servers = Some(v.trim().to_string()),
            // GetPrivateProfileInt: the leading number, 0 = off
            "streamcheck" => stream = v.trim().chars().take_while(|c| c.is_ascii_digit() || *c == '-').collect::<String>().parse::<i64>().map(|n| n != 0).unwrap_or(false),
            _ => {}
        }
    }
    let list = servers.unwrap_or_else(|| LOBBY_DEFAULT.to_string());
    let mut v = vec![];
    for t in list.split([';', ',', ' ']).filter(|t| !t.is_empty()) {
        if v.len() >= 4 { break; }
        let (h, port) = match t.rsplit_once(':') { Some((h, p)) => (h, p.chars().take_while(|c| c.is_ascii_digit()).take(6).collect::<String>().parse::<i64>().unwrap_or(0)), None => (t, 47443) };
        if !h.is_empty() && port > 0 && port < 65536 { v.push((h.to_string(), port as u16)); }
    }
    (v, stream)
}

fn resolve4(host: &str, port: u16) -> Option<SocketAddr> {
    use std::net::ToSocketAddrs;
    (host, port).to_socket_addrs().ok()?.find(|a| a.is_ipv4())
}

/// One lobby server as OwnLobby's watcher sees it.
pub fn lobby_check(host: &str, port: u16, stream: bool) -> Value {
    let Some(sa) = resolve4(host, port) else { return json!({"state": "dns"}) };
    let t0 = Instant::now();
    if TcpStream::connect_timeout(&sa, Duration::from_millis(2500)).is_err() { return json!({"state": "none", "ip": sa.ip().to_string()}); }
    let connect_ms = t0.elapsed().as_millis() as u64;
    if !stream { return json!({"state": "ok", "ip": sa.ip().to_string(), "connect_ms": connect_ms, "stream": false}); }
    let t1 = Instant::now();
    let mut got: Option<usize> = None;
    if let Ok(mut s) = TcpStream::connect_timeout(&SocketAddr::new(sa.ip(), port.wrapping_add(2)), Duration::from_millis(2500)) {
        let mut n = 0usize; let mut buf = [0u8; 8192];
        while n < 65536 {
            let left = Duration::from_millis(4000).saturating_sub(t1.elapsed());
            if left.is_zero() || s.set_read_timeout(Some(left)).is_err() { break; }
            match s.read(&mut buf) { Ok(0) | Err(_) => break, Ok(k) => n += k }
        }
        got = Some(n);
    }
    let ms = t1.elapsed().as_millis() as u64;
    let state = match got { Some(n) if n >= LOBBY_STREAM_NEED => "ok", Some(_) => "cut", None => "noanswer" };
    json!({"state": state, "ip": sa.ip().to_string(), "connect_ms": connect_ms, "stream": true, "bytes": got, "stream_ms": ms})
}

/// The one OwnLobby takes: the first usable in order.
pub fn lobby_pick(rows: &[Value]) -> Option<usize> { rows.iter().position(|r| r["state"] == "ok") }

#[cfg(test)]
mod tests {
    use super::*;

    /// The answer of /ladder/api/relays on 03.11.2026, signed on the ladder server with the key of launcher.json.
    const LADDER: &str = r#"{"v":1,"relays":[{"ip":"15.220.68.107","name":"Poland (Amazon)","region":"eu"},{"ip":"116.202.106.150","name":"Germany","region":"eu"},{"ip":"83.217.192.34","name":"Moscow","region":"ru"},{"ip":"91.107.122.186","name":"Moscow (pivolan)","region":"ru"}],"ts":1793638194,"sig":"8NE8lKMyhQmRUNrnDfaF2p1rlEwiLa6bvsLNftFbwRBams7ot6Ivg0zrSWuUGaNTsf9hTMFvVVLLvBPf5NYNBQ=="}"#;

    #[test]
    fn ladder_list_signed_and_merged_like_the_dll() {
        let doc: Value = serde_json::from_str(LADDER).unwrap();
        let l = signed_relays(&doc).expect("signature of the ladder list");
        assert_eq!(l.len(), 4);
        let mut bad = doc.clone();
        bad["relays"][0]["ip"] = json!("1.2.3.4");
        assert!(signed_relays(&bad).is_none(), "a changed list is not ours");
        let (ini, port) = ini_nodes("[Relay]\r\nNodes=91.107.122.186;10.0.0.5, bad\r\nPort=47101\r\n[Other]\r\nNodes=9.9.9.9\r\n");
        assert_eq!(port, Some(47101));
        let v = node_set(&l, &ini);
        let ips: Vec<String> = v.iter().map(|n| n.ip.to_string()).collect();
        assert_eq!(ips, ["15.220.68.107", "116.202.106.150", "83.217.192.34", "91.107.122.186", "10.0.0.5"]);
        assert_eq!(v[0].name, "Poland (Amazon)");
        assert_eq!((v[3].src, v[4].src), ("ladder", "ini"));
    }

    #[test]
    fn usable_and_nearest_follow_relay_18() {
        assert!(usable(Some(40), 30, 3));
        assert!(!usable(Some(40), 29, 6), "fewer than 30 answers");
        assert!(!usable(Some(40), 34, 2), "the stream stopped near the end (~33 KB)");
        assert!(!usable(None, 40, 6));
        let row = |ms: Option<u32>, ok: bool| json!({"udp": {"ms": ms, "usable": ok}});
        let rows = vec![row(Some(20), false), row(Some(60), true), row(None, false), row(Some(45), true), row(Some(45), true)];
        assert_eq!(nearest(&rows), Some(3));
        assert_eq!(nearest(&rows[..3]), Some(1));
        assert_eq!(nearest(&rows[..1]), None);
    }

    #[test]
    fn lobby_servers_as_ownlobby_reads_them() {
        let (v, st) = lobby_ini("");
        assert_eq!(v, vec![("83.217.192.34".to_string(), 47443), ("rts.fintebtc.de".to_string(), 47443)]);
        assert!(st);
        let (v, st) = lobby_ini("[OwnLobby]\r\nServers=a.example:1000, b.example;c.example:0;d:1;e:2;f:3\r\nStreamCheck=0\r\n");
        assert_eq!(v, vec![("a.example".to_string(), 1000), ("b.example".to_string(), 47443), ("d".to_string(), 1), ("e".to_string(), 2)]);
        assert!(!st);
        let rows = vec![json!({"state": "cut"}), json!({"state": "none"}), json!({"state": "ok"}), json!({"state": "ok"})];
        assert_eq!(lobby_pick(&rows), Some(2));
        assert_eq!(lobby_pick(&rows[..2]), None);
    }

    /// Against our nodes (network): cargo test -p elite-launcher live_nodes -- --ignored --nocapture
    #[test]
    #[ignore]
    fn live_nodes() {
        let doc: Value = serde_json::from_str(LADDER).unwrap();
        for n in node_set(&signed_relays(&doc).unwrap(), &[]) {
            println!("{:<16} {:<18} udp {} tcp {}", n.ip, n.name, measure(n.ip, GAME_PORT), tcp_stream(n.ip));
        }
        for (h, p) in lobby_ini("").0 { println!("lobby {h}:{p} {}", lobby_check(&h, p, true)); }
    }
}
