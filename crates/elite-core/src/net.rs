//! HTTP with several mirrors. A mirror is any static host that supports Range requests.
//! Content is verified by SHA-256 and signatures, so mirrors do not need to be trusted.
//! 1.6.22 (owner 17.11.2026: one way to our servers in every part of the launcher): the launcher gives a `HostPolicy` - the
//! order of the mirrors comes from it on every request (its active host first) and a failure on the way is told to it at once,
//! so a download moves with the rest of the launcher; a list of its own (`Mirrors::new`, elite-cli, tests) works as before.
use std::io::{Read, Seek, SeekFrom, Write};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// Where the mirrors come from when the launcher's shared host pool decides (app/src/reach.rs).
pub trait HostPolicy: Send + Sync {
    /// The bases to try now, the active host's first.
    fn bases(&self) -> Vec<String>;
    /// A request to `base` failed on the way (no connection, a timeout, a cut transfer, a gateway with no answer).
    fn failed(&self, base: &str, why: &str);
}

pub struct Mirrors {
    bases: Vec<String>,
    dead: Vec<AtomicBool>,
    current: std::sync::atomic::AtomicUsize,
    /// The shared order (the launcher); None: `bases` with the run's own dead marks, as before 1.6.22.
    policy: Option<Arc<dyn HostPolicy>>,
    /// The base that answered last (policy mode).
    worked: Mutex<String>,
    agent: ureq::Agent,
    pub downloaded: Arc<AtomicU64>,
    pub cancel: Arc<AtomicBool>,
    /// Optional sink for network-phase status (which mirror is being tried / failed over), so the UI can show it.
    pub on_status: Option<Box<dyn Fn(String) + Send>>,
}

#[derive(Debug)]
pub enum NetError {
    Cancelled,
    Failed(String),
}

impl std::fmt::Display for NetError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NetError::Cancelled => write!(f, "cancelled"),
            NetError::Failed(s) => write!(f, "{s}"),
        }
    }
}

/// Why one mirror did not give a file.
#[derive(Clone, Copy, Debug, PartialEq)]
enum Miss {
    /// Not there (404), or a problem of this side (the disk, a cancel): the next mirror, no mark.
    NotFound,
    /// The server answered with an error (403, 500, no Range): the next mirror; marks it only in a run of its own.
    Server,
    /// The way to it: no connection, a timeout, a cut transfer, 502-504 - the next mirror, and the shared pool hears of it.
    Way,
}
fn miss_of(e: &ureq::Error) -> Miss {
    match e {
        ureq::Error::Status(404, _) => Miss::NotFound,
        ureq::Error::Status(502..=504, _) => Miss::Way,
        ureq::Error::Status(..) => Miss::Server,
        ureq::Error::Transport(_) => Miss::Way,
    }
}

fn norm(b: &str) -> Option<String> {
    let b = b.trim();
    let b = if b.ends_with('/') { b.to_string() } else { format!("{b}/") };
    (b.starts_with("https://") || b.starts_with("http://")).then_some(b)
}

impl Mirrors {
    pub fn new(bases: Vec<String>) -> Self {
        let mut uniq: Vec<String> = Vec::new();
        for b in bases.iter().filter_map(|b| norm(b)) {
            if !uniq.contains(&b) {
                uniq.push(b);
            }
        }
        let agent = ureq::AgentBuilder::new()
            .timeout_connect(Duration::from_secs(8))
            .timeout_read(Duration::from_secs(30))
            .user_agent(concat!("EliteLauncher/", env!("CARGO_PKG_VERSION")))
            .try_proxy_from_env(true)
            .build();
        Mirrors {
            dead: uniq.iter().map(|_| AtomicBool::new(false)).collect(),
            bases: uniq,
            current: 0.into(),
            policy: None,
            worked: Mutex::new(String::new()),
            agent,
            downloaded: Arc::new(AtomicU64::new(0)),
            cancel: Arc::new(AtomicBool::new(false)),
            on_status: None,
        }
    }

    /// 1.6.22: the mirrors in the order of the launcher's shared pool, asked again on every request.
    pub fn with_policy(policy: Arc<dyn HostPolicy>) -> Self {
        let mut m = Mirrors::new(vec![]);
        m.policy = Some(policy);
        m
    }

    /// The bases of a policy, normalized and without repeats.
    fn policy_bases(p: &dyn HostPolicy) -> Vec<String> {
        let mut v: Vec<String> = Vec::new();
        for b in p.bases().iter().filter_map(|b| norm(b)) {
            if !v.contains(&b) {
                v.push(b);
            }
        }
        v
    }

    /// Base URL of the mirror that answered last (to try it first next time).
    pub fn current_base(&self) -> String {
        if let Some(p) = &self.policy {
            let w = self.worked.lock().unwrap().clone();
            return if w.is_empty() { Self::policy_bases(p.as_ref()).into_iter().next().unwrap_or_default() } else { w };
        }
        self.bases.get(self.current.load(Ordering::Relaxed)).cloned().unwrap_or_default()
    }

    /// The mirror this run starts with.
    pub fn first_base(&self) -> String {
        match &self.policy {
            Some(p) => Self::policy_bases(p.as_ref()).into_iter().next().unwrap_or_default(),
            None => self.bases.first().cloned().unwrap_or_default(),
        }
    }

    pub fn current_host(&self) -> String {
        host_of(&self.current_base())
    }

    pub fn count(&self) -> usize {
        match &self.policy {
            Some(p) => Self::policy_bases(p.as_ref()).len(),
            None => self.bases.len(),
        }
    }

    /// Try the mirrors: in the policy's order of the moment (a failure on the way is told to it at once, so the next request
    /// starts on the host it picks then), or - a list of its own - in order starting from the last one that worked.
    fn each<T>(&self, mut f: impl FnMut(&str) -> Result<T, (Miss, String)>) -> Result<T, NetError> {
        if let Some(p) = &self.policy {
            let bases = Self::policy_bases(p.as_ref());
            if bases.is_empty() {
                return Err(NetError::Failed("no mirrors configured".into()));
            }
            let n = bases.len();
            let mut last = String::new();
            for (k, b) in bases.iter().enumerate() {
                if self.cancel.load(Ordering::Relaxed) {
                    return Err(NetError::Cancelled);
                }
                if let Some(cb) = &self.on_status {
                    cb(format!("try\t{}\t{}\t{}", host_of(b), k + 1, n));
                }
                match f(b) {
                    Ok(v) => {
                        *self.worked.lock().unwrap() = b.clone();
                        return Ok(v);
                    }
                    Err((miss, e)) => {
                        last = format!("{}: {e}", host_of(b));
                        if let Some(cb) = &self.on_status {
                            cb(format!("fail\t{}\t{}", host_of(b), e));
                        }
                        if miss == Miss::Way && !self.cancel.load(Ordering::Relaxed) {
                            p.failed(b, &e);
                        }
                    }
                }
            }
            return Err(NetError::Failed(last));
        }
        let n = self.bases.len();
        if n == 0 {
            return Err(NetError::Failed("no mirrors configured".into()));
        }
        let start = self.current.load(Ordering::Relaxed);
        let mut last = String::new();
        for k in 0..n {
            if self.cancel.load(Ordering::Relaxed) {
                return Err(NetError::Cancelled);
            }
            let i = (start + k) % n;
            if self.dead[i].load(Ordering::Relaxed) && k < n - 1 {
                continue;
            }
            if let Some(cb) = &self.on_status {
                cb(format!("try\t{}\t{}\t{}", host_of(&self.bases[i]), k + 1, n));
            }
            match f(&self.bases[i]) {
                Ok(v) => {
                    self.current.store(i, Ordering::Relaxed);
                    self.dead[i].store(false, Ordering::Relaxed);
                    return Ok(v);
                }
                Err((miss, e)) => {
                    last = format!("{}: {e}", host_of(&self.bases[i]));
                    if let Some(cb) = &self.on_status {
                        cb(format!("fail\t{}\t{}", host_of(&self.bases[i]), e));
                    }
                    if miss != Miss::NotFound {
                        self.dead[i].store(true, Ordering::Relaxed);
                    }
                }
            }
        }
        Err(NetError::Failed(last))
    }

    /// Whole small file (configs, manifests).
    pub fn get(&self, rel: &str) -> Result<Vec<u8>, NetError> {
        self.each(|base| {
            let r = self.agent.get(&format!("{base}{rel}")).call().map_err(|e| (miss_of(&e), e.to_string()))?;
            let mut v = Vec::new();
            r.into_reader().take(64 << 20).read_to_end(&mut v).map_err(|e| (Miss::Way, e.to_string()))?;
            self.downloaded.fetch_add(v.len() as u64, Ordering::Relaxed);
            Ok(v)
        })
    }

    /// Bytes [from, to) of `rel` appended to `out`. A broken transfer goes on from the byte it reached on the next mirror
    /// (1.6.22; the content is the same on every mirror and the whole file's SHA-256 is checked after).
    pub fn get_range<W: Write + Seek>(&self, rel: &str, from: u64, to: u64, out: &mut W) -> Result<(), NetError> {
        self.get_range_cb(rel, from, to, out, &mut |_| {})
    }

    /// `get_range`, telling `got` (bytes of this range written so far, kept over a change of mirror).
    pub fn get_range_cb<W: Write + Seek>(&self, rel: &str, from: u64, to: u64, out: &mut W, got_cb: &mut dyn FnMut(u64)) -> Result<(), NetError> {
        let start = out.stream_position().map_err(|e| NetError::Failed(e.to_string()))?;
        let mut done = 0u64;
        self.each(|base| {
            out.seek(SeekFrom::Start(start + done)).map_err(|e| (Miss::NotFound, e.to_string()))?;
            if done >= to - from {
                return Ok(());
            }
            let r = self
                .agent
                .get(&format!("{base}{rel}"))
                .set("Range", &format!("bytes={}-{}", from + done, to - 1))
                .call()
                .map_err(|e| (miss_of(&e), e.to_string()))?;
            if r.status() != 206 {
                return Err((Miss::Server, format!("no range support (HTTP {})", r.status())));
            }
            let mut rd = r.into_reader().take(to - from - done);
            let mut buf = vec![0u8; 1 << 18];
            let mut got = 0u64;
            loop {
                if self.cancel.load(Ordering::Relaxed) {
                    return Err((Miss::NotFound, "cancelled".into()));
                }
                let n = rd.read(&mut buf).map_err(|e| (Miss::Way, format!("{e} after {got} bytes")))?;
                if n == 0 {
                    break;
                }
                out.write_all(&buf[..n]).map_err(|e| (Miss::NotFound, e.to_string()))?;
                got += n as u64;
                done += n as u64;
                self.downloaded.fetch_add(n as u64, Ordering::Relaxed);
                got_cb(done);
            }
            if done != to - from {
                return Err((Miss::Way, format!("short read {done}/{}", to - from)));
            }
            Ok(())
        })
        .map_err(|e| if self.cancel.load(Ordering::Relaxed) { NetError::Cancelled } else { e })
    }
}

fn host_of(b: &str) -> String {
    b.split("://").nth(1).unwrap_or(b).split('/').next().unwrap_or("").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;
    use std::net::TcpListener;

    /// A mirror on 127.0.0.1: answers a Range request of `data` with 206; `cut_after`: stops after that many bytes of the body
    /// (a DPI or a broken line); `range: false` answers 200 with the whole file. Counts the requests and keeps their Range headers.
    fn mirror(data: Arc<Vec<u8>>, cut_after: Option<usize>, range: bool) -> (String, Arc<Mutex<Vec<String>>>) {
        let l = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}/", l.local_addr().unwrap());
        let seen = Arc::new(Mutex::new(Vec::new()));
        let seen2 = seen.clone();
        std::thread::spawn(move || {
            for c in l.incoming() {
                let Ok(mut c) = c else { continue };
                let mut req = Vec::new();
                let mut b = [0u8; 1];
                while !req.ends_with(b"\r\n\r\n") && c.read(&mut b).map(|n| n == 1).unwrap_or(false) { req.push(b[0]); }
                let req = String::from_utf8_lossy(&req).to_string();
                let r = req.lines().find_map(|l| l.strip_prefix("Range: bytes=")).unwrap_or("").to_string();
                seen2.lock().unwrap().push(r.clone());
                let (a, z) = r.split_once('-').map(|(a, z)| (a.parse::<usize>().unwrap_or(0), z.parse::<usize>().unwrap_or(data.len() - 1))).unwrap_or((0, data.len() - 1));
                let body: &[u8] = if range { &data[a..=z] } else { &data[..] };
                let head = format!("HTTP/1.1 {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", if range { "206 Partial Content" } else { "200 OK" }, body.len());
                let _ = c.write_all(head.as_bytes());
                let _ = c.write_all(&body[..cut_after.unwrap_or(body.len()).min(body.len())]);
                // a cut: the connection ends short (the client reads an early end)
            }
        });
        (url, seen)
    }
    struct Pol { order: Mutex<Vec<String>>, failed: Mutex<Vec<String>> }
    impl HostPolicy for Pol {
        fn bases(&self) -> Vec<String> { self.order.lock().unwrap().clone() }
        // as the launcher's pool does: a host that failed on the way goes to the end
        fn failed(&self, base: &str, _why: &str) {
            self.failed.lock().unwrap().push(base.to_string());
            let mut o = self.order.lock().unwrap();
            if let Some(i) = o.iter().position(|b| b == base) { let b = o.remove(i); o.push(b); }
        }
    }

    #[test]
    fn a_cut_range_goes_on_from_its_byte_on_the_next_mirror_and_the_pool_hears_of_it() {
        let data: Arc<Vec<u8>> = Arc::new((0..300_000u32).map(|i| (i * 7 % 251) as u8).collect());
        let (de, de_seen) = mirror(data.clone(), Some(100_000), true);
        let (ru, ru_seen) = mirror(data.clone(), None, true);
        let pol = Arc::new(Pol { order: Mutex::new(vec![de.clone(), ru.clone()]), failed: Mutex::new(vec![]) });
        let m = Mirrors::with_policy(pol.clone());
        let mut out = Cursor::new(Vec::new());
        let mut got = Vec::new();
        m.get_range_cb("blobs/x", 1000, 251_000, &mut out, &mut |g| got.push(g)).unwrap();
        assert_eq!(out.get_ref().as_slice(), &data[1000..251_000], "the bytes of both mirrors make the range");
        assert_eq!(*pol.failed.lock().unwrap(), vec![de.clone()], "the cut is told to the pool");
        assert_eq!(*de_seen.lock().unwrap(), vec!["1000-250999"]);
        assert_eq!(*ru_seen.lock().unwrap(), vec!["101000-250999"], "the next mirror starts where the cut one stopped");
        assert!(got.windows(2).all(|w| w[0] <= w[1]) && *got.last().unwrap() == 250_000, "the progress never goes back");
        assert_eq!(m.current_base(), ru);
        // the next request starts on the host the pool puts first now (Moscow), not on the cut one
        let mut out2 = Cursor::new(Vec::new());
        m.get_range("blobs/x", 0, 10, &mut out2).unwrap();
        assert_eq!(de_seen.lock().unwrap().len(), 1);
        assert_eq!(ru_seen.lock().unwrap().last().map(String::as_str), Some("0-9"));
    }

    #[test]
    fn a_server_answer_moves_on_without_marking_the_host() {
        let data: Arc<Vec<u8>> = Arc::new(vec![5u8; 5000]);
        let (no_range, _) = mirror(data.clone(), None, false);
        let (ok, _) = mirror(data.clone(), None, true);
        let pol = Arc::new(Pol { order: Mutex::new(vec![no_range.clone(), ok.clone()]), failed: Mutex::new(vec![]) });
        let m = Mirrors::with_policy(pol.clone());
        let mut out = Cursor::new(Vec::new());
        m.get_range("blobs/y", 0, 4000, &mut out).unwrap();
        assert_eq!(out.get_ref().len(), 4000);
        assert!(pol.failed.lock().unwrap().is_empty(), "a host without Range is no way problem: the active host stays");
        assert_eq!(pol.bases(), vec![no_range, ok]);
    }

    #[test]
    fn a_list_of_its_own_works_as_before() {
        let data: Arc<Vec<u8>> = Arc::new(vec![9u8; 3000]);
        let (a, _) = mirror(data.clone(), Some(10), true);
        let (b, _) = mirror(data.clone(), None, true);
        let m = Mirrors::new(vec![a.clone(), b.clone()]);
        let mut out = Cursor::new(Vec::new());
        m.get_range("blobs/z", 0, 3000, &mut out).unwrap();
        assert_eq!(out.get_ref().len(), 3000);
        assert_eq!(m.current_base(), b);
        assert_eq!(m.first_base(), a);
        assert_eq!(m.count(), 2);
    }
}
