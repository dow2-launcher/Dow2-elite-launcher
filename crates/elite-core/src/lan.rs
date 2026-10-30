//! Elite files from other launchers on the same local network (owner 30.10.2026: «п2п качать элитку, если в локальной
//! сети тоже есть у кого-то»). Every launcher answers a UDP question «who has Elite?» on the LAN and hands out over TCP
//! the files it has installed, by their SHA-256. A launcher that downloads asks its neighbours for a whole file first; the
//! file is taken only when its SHA-256 matches the signed manifest (the caller checks), otherwise the mirrors as before.
//! Only private addresses (10/8, 172.16/12, 192.168/16, 169.254/16) are served and asked - never the internet.
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{IpAddr, Ipv4Addr, SocketAddr, TcpListener, TcpStream, UdpSocket};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub const PORT: u16 = 47120;
const ASK: &[u8] = b"ELITE-LAN?";
const HAVE: &[u8] = b"ELITE-LAN!";

/// Downloading from neighbours on (the launcher's setting; serving follows the same setting).
pub static ENABLED: AtomicBool = AtomicBool::new(true);

/// sha256 hex -> a file to hand out (None = we don't have it)
pub type Resolver = Arc<dyn Fn(&str) -> Option<(PathBuf, u64)> + Send + Sync>;

fn private(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(a) => a.is_private() || a.is_link_local() || a.is_loopback(),
        IpAddr::V6(_) => false,
    }
}

/// Start answering neighbours (UDP discovery + TCP file server) in background threads; quietly does nothing if the port is
/// taken or the firewall says no.
pub fn serve(resolve: Resolver) {
    if let Ok(u) = UdpSocket::bind(SocketAddr::new(IpAddr::V4(Ipv4Addr::UNSPECIFIED), PORT)) {
        std::thread::spawn(move || {
            let mut b = [0u8; 64];
            while let Ok((n, from)) = u.recv_from(&mut b) {
                if ENABLED.load(Ordering::Relaxed) && &b[..n] == ASK && private(from.ip()) {
                    let _ = u.send_to(HAVE, from);
                }
            }
        });
    }
    if let Ok(l) = TcpListener::bind(SocketAddr::new(IpAddr::V4(Ipv4Addr::UNSPECIFIED), PORT)) {
        std::thread::spawn(move || {
            for s in l.incoming().flatten() {
                let r = resolve.clone();
                std::thread::spawn(move || { let _ = answer(s, &r); });
            }
        });
    }
}

fn answer(mut s: TcpStream, resolve: &Resolver) -> std::io::Result<()> {
    let peer = s.peer_addr()?;
    s.set_read_timeout(Some(Duration::from_secs(10)))?;
    let mut line = String::new();
    BufReader::new(s.try_clone()?).read_line(&mut line)?;
    let sha = line.strip_prefix("GET /blob/").and_then(|r| r.split_whitespace().next()).unwrap_or("");
    let ok = ENABLED.load(Ordering::Relaxed) && private(peer.ip()) && sha.len() == 64 && sha.bytes().all(|c| c.is_ascii_hexdigit());
    match if ok { resolve(sha) } else { None } {
        Some((path, size)) => {
            let f = std::fs::File::open(&path)?;
            write!(s, "HTTP/1.1 200 OK\r\nContent-Length: {size}\r\nConnection: close\r\n\r\n")?;
            std::io::copy(&mut Read::take(f, size), &mut s)?;
        }
        None => { write!(s, "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")?; }
    }
    s.flush()
}

/// Neighbours that answered (asked once a minute at most: a broadcast and 700 ms for the answers).
fn peers() -> Vec<SocketAddr> {
    static CACHE: Mutex<Option<(Instant, Vec<SocketAddr>)>> = Mutex::new(None);
    let mut c = CACHE.lock().unwrap();
    if let Some((t, p)) = c.as_ref() { if t.elapsed() < Duration::from_secs(60) { return p.clone(); } }
    let mut found: Vec<SocketAddr> = Vec::new();
    if let Ok(u) = UdpSocket::bind(SocketAddr::new(IpAddr::V4(Ipv4Addr::UNSPECIFIED), 0)) {
        let _ = u.set_broadcast(true);
        let _ = u.send_to(ASK, SocketAddr::new(IpAddr::V4(Ipv4Addr::BROADCAST), PORT));
        let end = Instant::now() + Duration::from_millis(700);
        let mut b = [0u8; 64];
        while let Some(left) = end.checked_duration_since(Instant::now()) {
            if left.is_zero() || u.set_read_timeout(Some(left)).is_err() { break; }
            match u.recv_from(&mut b) {
                Ok((n, from)) if &b[..n] == HAVE && private(from.ip()) => {
                    let a = SocketAddr::new(from.ip(), PORT);
                    if !found.contains(&a) { found.push(a); }
                }
                Ok(_) => {}
                Err(_) => break,
            }
        }
    }
    *c = Some((Instant::now(), found.clone()));
    found
}

/// The whole file `sha` (`size` bytes) from a neighbour into `out`. true = all bytes came; the caller checks the SHA-256.
pub fn fetch(sha: &str, size: u64, out: &mut dyn Write, cancel: &AtomicBool) -> bool {
    if !ENABLED.load(Ordering::Relaxed) { return false; }
    for p in peers() {
        match fetch_from(p, sha, size, out, cancel) { Some(true) => return true, Some(false) => return false, None => continue }
    }
    false
}

/// One neighbour: None = it does not have the file (try the next), Some(true) = all bytes came, Some(false) = broke midway.
fn fetch_from(p: SocketAddr, sha: &str, size: u64, out: &mut dyn Write, cancel: &AtomicBool) -> Option<bool> {
    {
        let Ok(mut s) = TcpStream::connect_timeout(&p, Duration::from_millis(800)) else { return None };
        let _ = s.set_read_timeout(Some(Duration::from_secs(15)));
        if write!(s, "GET /blob/{sha} HTTP/1.1\r\nHost: lan\r\nConnection: close\r\n\r\n").is_err() { return None; }
        let mut r = BufReader::new(s);
        let mut status = String::new();
        if r.read_line(&mut status).is_err() || !status.starts_with("HTTP/1.1 200") { return None; }
        let mut len = None;
        loop {
            let mut h = String::new();
            if r.read_line(&mut h).unwrap_or(0) == 0 { break; }
            let h = h.trim_end();
            if h.is_empty() { break; }
            if let Some(v) = h.strip_prefix("Content-Length: ") { len = v.trim().parse::<u64>().ok(); }
        }
        if len != Some(size) { return None; }
        let mut buf = vec![0u8; 1 << 20];
        let mut got = 0u64;
        while got < size {
            if cancel.load(Ordering::Relaxed) { return Some(false); }
            match r.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => { if out.write_all(&buf[..n]).is_err() { return Some(false); } got += n as u64; }
            }
        }
        Some(got == size)   // false: the output has a part of a broken transfer - the caller starts over from the mirrors
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn serve_and_fetch_on_loopback() {
        let dir = std::env::temp_dir().join("elite_lan_test"); let _ = std::fs::create_dir_all(&dir);
        let data: Vec<u8> = (0..3_000_000u32).map(|i| (i * 7 % 251) as u8).collect();
        let path = dir.join("blob.bin"); std::fs::write(&path, &data).unwrap();
        let sha = "ab".repeat(32); let (p2, s2, n) = (path.clone(), sha.clone(), data.len() as u64);
        serve(Arc::new(move |h: &str| (h == s2).then(|| (p2.clone(), n))));
        std::thread::sleep(Duration::from_millis(300));
        let peer = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), PORT);
        let mut out = Vec::new(); let c = AtomicBool::new(false);
        assert_eq!(fetch_from(peer, &sha, n, &mut out, &c), Some(true));
        assert_eq!(out, data);
        let mut o2 = Vec::new();
        assert_eq!(fetch_from(peer, &"cd".repeat(32), 10, &mut o2, &c), None);      // a file it does not have
    }
}
