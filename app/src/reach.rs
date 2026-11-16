//! Which of our hosts this computer reaches best (owner 02.11.2026: the launcher must work and download everywhere; no
//! ICMP ping; checked once at the start and again only when access is lost).
//!
//! Two pools:
//! - Data: the mirrors (launcher.json, Elite's and the add-ons' files) - Moscow, Germany, Cloudflare R2, whatever the
//!   signed launcher.json lists. Checked with `<base>launcher.json` (~46 KB).
//! - Api: our servers with the ladder API (chat, the stream, rooms, logs, usage) and the launcher's own updater.json.
//!   Checked with the last 120 chat messages (~110 KB of JSON in 11.2026; the first PROBE_BYTES of it are read).
//! 1.4.3 (03.11.2026, noofancy: "dow2 does not answer, trying the next one... 0.02 MB of 2.54 MB", fine with a VPN): the checks
//! were a tiny file (89 bytes) and a few hundred bytes - on many Russian lines the way to Europe passes that and the first
//! ~33 KB of a connection, then stops (DPI; NetProbe 2-3.11). A mirror that answered a tiny file fastest was picked and every
//! real download stalled on it. A check now has to get a STREAM past that point; a host that stops on it is "no answer".
//!
//! A check is an HTTPS GET with short timeouts, every host at once (threads); the time to the whole answer is its score
//! (DNS + TCP + TLS + HTTP - what a real request costs, unlike a ping). The ones that answered come first, fastest
//! first; the ones that did not stay at the end as a last resort. A host that fails a real request goes to the end at
//! once and the pool is checked again in the background (at most once in 30 s). Until the first check of this run is
//! done the order of the last run is used (kept in the settings).
//! 1.6.19 (Malum 16.11.2026: an empty chat after a restart): a host whose LONG connection dies on this line - the live stream
//! cut by a read timeout or giving no event twice within minutes (stream.rs) or a stream cut by the connection test - is "set
//! aside" for SET_ASIDE_SECS: it goes after every host that answered, whatever its time, a check of the pool keeps the mark
//! (a DPI that cuts streams after minutes lets the check's short answer through), and the mark is kept in the settings with the
//! order, so a restart does not go back to it.
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant};

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Pool { Data, Api }

impl Pool {
    fn i(self) -> usize { match self { Pool::Data => 0, Pool::Api => 1 } }
}

#[derive(Clone, Debug, Default, serde::Serialize, serde::Deserialize)]
pub struct Probe {
    pub base: String,
    /// The time of the whole answer; None - no answer (or lost since).
    pub ms: Option<u32>,
    #[serde(default)]
    pub err: String,
    /// Set aside until this unix time (0: not): its long connections die on this line (see the head of the file).
    #[serde(default, skip_serializing_if = "is_zero")]
    pub aside_until: u64,
    /// Why it was set aside (community.log, Settings).
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub aside: String,
}
fn is_zero(v: &u64) -> bool { *v == 0 }

/// How long a host whose streams die stays set aside.
pub const SET_ASIDE_SECS: u64 = 6 * 3600;

impl Probe {
    fn aside_at(&self, now: u64) -> bool { self.aside_until > now }
    /// The place in the order: answered (0), set aside but answering (2), no answer (3); a host not checked yet is 1 (order()).
    fn tier(&self, now: u64) -> u8 { if self.ms.is_none() { 3 } else if self.aside_at(now) { 2 } else { 0 } }
}
fn sort_list(list: &mut [Probe], now: u64) { list.sort_by_key(|p| (p.tier(now), p.ms.unwrap_or(0))); }   // stable: no answer keeps its order

struct Rank { list: Vec<Probe>, checked: bool }

static RANK: LazyLock<[Mutex<Rank>; 2]> = LazyLock::new(|| [Mutex::new(Rank { list: vec![], checked: false }), Mutex::new(Rank { list: vec![], checked: false })]);
static BUSY: [AtomicBool; 2] = [AtomicBool::new(false), AtomicBool::new(false)];
static LAST: [AtomicU64; 2] = [AtomicU64::new(0), AtomicU64::new(0)];
/// The hosts of each pool as the launcher knows them now (set by the launcher before it asks for an order).
static CANDIDATES: LazyLock<[Mutex<Vec<String>>; 2]> = LazyLock::new(|| [Mutex::new(vec![]), Mutex::new(vec![])]);
/// Called after every check (the launcher saves the order and tells the window).
static ON_CHECKED: Mutex<Option<Box<dyn Fn(Pool, &[Probe]) + Send>>> = Mutex::new(None);

fn now() -> u64 { std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0) }
fn key(b: &str) -> String { b.trim_end_matches('/').to_ascii_lowercase() }

pub fn on_checked(f: impl Fn(Pool, &[Probe]) + Send + 'static) { *ON_CHECKED.lock().unwrap() = Some(Box::new(f)); }

/// The order of the last run, until this run's check is done.
pub fn seed(pool: Pool, saved: Vec<Probe>) {
    let mut r = RANK[pool.i()].lock().unwrap();
    if !r.checked && r.list.is_empty() { r.list = saved; }
}

pub fn set_candidates(pool: Pool, bases: Vec<String>) { *CANDIDATES[pool.i()].lock().unwrap() = bases; }
pub fn snapshot_candidates(pool: Pool) -> Vec<String> { CANDIDATES[pool.i()].lock().unwrap().clone() }

/// `bases` in the order to try: answered (fastest first), not checked yet (as given), set aside (fastest first), no answer.
pub fn order(pool: Pool, bases: Vec<String>) -> Vec<String> {
    let r = RANK[pool.i()].lock().unwrap();
    let t = now();
    let pos = |b: &String| r.list.iter().position(|p| key(&p.base) == key(b));
    let mut v: Vec<(u8, u32, usize, String)> = bases.into_iter().enumerate().map(|(i, b)| match pos(&b).map(|j| &r.list[j]) {
        Some(p) => (p.tier(t), p.ms.unwrap_or(0), i, b),
        None => (1, 0, i, b),
    }).collect();
    v.sort_by_key(|x| (x.0, x.1, x.2));
    v.into_iter().map(|x| x.3).collect()
}

pub fn snapshot(pool: Pool) -> (Vec<Probe>, bool) {
    let r = RANK[pool.i()].lock().unwrap();
    (r.list.clone(), r.checked)
}

/// A real request to `base` failed (no connection, timeout, a gateway error): it goes to the end and the pool is checked
/// again in the background. Nothing happens for a host that is already at the end.
pub fn lost(pool: Pool, base: &str) {
    {
        let mut r = RANK[pool.i()].lock().unwrap();
        match r.list.iter().position(|p| key(&p.base) == key(base)) {
            Some(j) if r.list[j].ms.is_some() => { let mut p = r.list.remove(j); p.ms = None; p.err = "lost".into(); r.list.push(p); }
            Some(_) => return,
            None => r.list.push(Probe { base: base.to_string(), ms: None, err: "lost".into(), ..Default::default() }),
        }
    }
    check_soon(pool, 30);
}

/// `base` is set aside for SET_ASIDE_SECS (`why`: for the log and Settings); the order is kept at once and the pool is checked
/// again (the mark stays through the check). False when it was set aside already.
pub fn set_aside(pool: Pool, base: &str, why: &str) -> bool {
    let list = {
        let mut r = RANK[pool.i()].lock().unwrap();
        let t = now();
        let j = match r.list.iter().position(|p| key(&p.base) == key(base)) {
            Some(j) => j,
            None => { r.list.push(Probe { base: base.to_string(), ms: None, err: String::new(), ..Default::default() }); r.list.len() - 1 }
        };
        if r.list[j].aside_at(t) { return false; }
        r.list[j].aside_until = t + SET_ASIDE_SECS;
        r.list[j].aside = why.chars().take(120).collect();
        sort_list(&mut r.list, t);
        r.list.clone()
    };
    if let Some(f) = ON_CHECKED.lock().unwrap().as_ref() { f(pool, &list); }
    check_soon(pool, 0);
    true
}

/// Check the pool in the background unless a check runs or ran less than `gap` seconds ago (0: always).
pub fn check_soon(pool: Pool, gap: u64) {
    if gap > 0 && now().saturating_sub(LAST[pool.i()].load(Ordering::Relaxed)) < gap { return; }
    if BUSY[pool.i()].swap(true, Ordering::SeqCst) { return; }
    std::thread::spawn(move || {
        let bases = CANDIDATES[pool.i()].lock().unwrap().clone();
        if !bases.is_empty() { check(pool, &bases); }   // nothing to check (not configured yet): the order stays
        BUSY[pool.i()].store(false, Ordering::SeqCst);
    });
}

fn probe_url(pool: Pool, base: &str) -> String {
    match pool {
        Pool::Data => format!("{}/launcher.json", base.trim_end_matches('/')),
        Pool::Api => format!("{}/ladder/api/c/msgs?room=all&after=0&limit=120", base.trim_end_matches('/')),
    }
}

/// What a check reads of an answer: well past the ~33-36 KB where a DPI stops a stream (1.4.3; Malum's lobby check 16.11.2026:
/// "cut 36200 B"), and no more - the chat's answer grows with the chat (60 KB in 11.2026 was 112 KB a few days later), and a
/// check that read all of it in its 8 s failed on a slow line for a size that says nothing. Read as it comes, no gzip: a
/// compressed answer of a few KB would get a host whose streams are cut past the point where it stops.
const PROBE_BYTES: u64 = 64 << 10;
/// The body of a check's answer: Ok(bytes read) when PROBE_BYTES came or the whole answer of at least 16 KB came (1.4.3: a
/// stream, not a ping); a read that stops on the way (a timeout, a reset) is no answer however much came before it.
fn probe_body(r: impl std::io::Read) -> Result<usize, String> {
    use std::io::Read;
    let mut v = Vec::new();
    r.take(PROBE_BYTES).read_to_end(&mut v).map_err(|e| format!("read: stopped after {} KB: {e}", v.len() >> 10))?;
    if v.len() < 16 << 10 { Err(format!("short answer ({} bytes)", v.len())) } else { Ok(v.len()) }
}

/// One host: the time of the answer's first PROBE_BYTES, or why there is none.
fn probe(pool: Pool, base: &str) -> Probe {
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(4))
        .timeout(Duration::from_secs(8))
        .user_agent(concat!("EliteLauncher/", env!("CARGO_PKG_VERSION"), " reach"))
        .try_proxy_from_env(true)
        .build();
    let t = Instant::now();
    let res = agent.get(&probe_url(pool, base)).call().map_err(|e| e.to_string()).and_then(|r| probe_body(r.into_reader()).map(|_| ()));
    match res {
        Ok(()) => Probe { base: base.to_string(), ms: Some(t.elapsed().as_millis().min(u32::MAX as u128) as u32), err: String::new(), ..Default::default() },
        Err(e) => Probe { base: base.to_string(), ms: None, err: e.chars().take(120).collect(), ..Default::default() },
    }
}

/// Check every host of the pool at once; the new order is kept and returned.
pub fn check(pool: Pool, bases: &[String]) -> Vec<Probe> {
    LAST[pool.i()].store(now(), Ordering::Relaxed);
    let handles: Vec<_> = bases.iter().cloned().map(|b| std::thread::spawn(move || probe(pool, &b))).collect();
    let got: Vec<Probe> = handles.into_iter().filter_map(|h| h.join().ok()).collect();
    let got = keep(pool, got);
    if let Some(f) = ON_CHECKED.lock().unwrap().as_ref() { f(pool, &got); }
    got
}

/// A check's results become the order (the set-aside marks kept).
fn keep(pool: Pool, mut got: Vec<Probe>) -> Vec<Probe> {
    {
        let mut r = RANK[pool.i()].lock().unwrap();
        // 1.6.19: a set-aside mark stays (taken under the lock: one set while this check ran too)
        let t = now();
        for p in got.iter_mut() {
            if let Some(o) = r.list.iter().find(|o| key(&o.base) == key(&p.base) && o.aside_at(t)) { p.aside_until = o.aside_until; p.aside = o.aside.clone(); }
        }
        // answered first, fastest first; set aside after them; no answer at the end in the given order (sort_by_key is stable)
        sort_list(&mut got, t);
        r.list = got.clone();
        r.checked = true;
    }
    got
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn order_answered_fastest_then_unchecked_then_dead() {
        let pool = Pool::Data;
        {
            let mut r = RANK[pool.i()].lock().unwrap();
            r.list = vec![
                Probe { base: "https://slow/".into(), ms: Some(300), ..Default::default() },
                Probe { base: "https://fast/".into(), ms: Some(40), ..Default::default() },
                Probe { base: "https://dead/".into(), ms: None, err: "timeout".into(), ..Default::default() },
            ];
        }
        let o = order(pool, vec!["https://dead/".into(), "https://new/".into(), "https://slow/".into(), "https://fast".into()]);
        assert_eq!(o, vec!["https://fast", "https://slow/", "https://new/", "https://dead/"]);
        // a real request to the fastest failed: it goes to the end, the slow one leads
        LAST[pool.i()].store(now(), Ordering::Relaxed);   // no background check in the test
        lost(pool, "https://fast/");
        let o = order(pool, vec!["https://fast/".into(), "https://slow/".into()]);
        assert_eq!(o, vec!["https://slow/", "https://fast/"]);
    }

    fn pr(base: &str, ms: Option<u32>) -> Probe { Probe { base: base.into(), ms, ..Default::default() } }
    #[test]
    fn a_host_set_aside_goes_after_the_answered_ones_and_stays_there_through_a_check() {
        // Malum 16.11.2026: Germany answers the check fastest, but its stream dies every few minutes; Moscow works
        let pool = Pool::Api;
        let hosts = || vec!["https://de".to_string(), "https://ru".to_string(), "https://dead".to_string()];
        RANK[pool.i()].lock().unwrap().list = vec![pr("https://de", Some(40)), pr("https://ru", Some(90)), pr("https://dead", None)];
        assert_eq!(order(pool, hosts()), vec!["https://de", "https://ru", "https://dead"]);
        assert!(set_aside(pool, "https://de", "stream cut twice"));
        assert!(!set_aside(pool, "https://de", "again"), "once until it ends");
        assert_eq!(order(pool, hosts()), vec!["https://ru", "https://de", "https://dead"], "after the answered ones, before no answer");
        let (l, _) = snapshot(pool);
        assert_eq!(l.iter().map(|p| p.base.as_str()).collect::<Vec<_>>(), vec!["https://ru", "https://de", "https://dead"], "Settings shows the same order");
        assert_eq!(l[1].aside, "stream cut twice");
        // the next check: Germany's short answer is fast again - the mark stays
        keep(pool, vec![pr("https://de", Some(30)), pr("https://ru", Some(95)), pr("https://dead", None)]);
        assert_eq!(order(pool, hosts()), vec!["https://ru", "https://de", "https://dead"]);
        // Moscow lost too: Germany (set aside, but it answers) before nothing
        keep(pool, vec![pr("https://de", Some(30)), pr("https://ru", None), pr("https://dead", None)]);
        assert_eq!(order(pool, hosts()), vec!["https://de", "https://ru", "https://dead"]);
        // kept in the settings and read back at the next start (an old settings file has no mark)
        let saved = serde_json::to_string(&snapshot(pool).0).unwrap();
        let back: Vec<Probe> = serde_json::from_str(&saved).unwrap();
        assert!(back[0].aside_until > now() + SET_ASIDE_SECS - 60);
        let old: Vec<Probe> = serde_json::from_str(r#"[{"base":"https://de","ms":30,"err":""}]"#).unwrap();
        assert_eq!(old[0].aside_until, 0);
        assert!(!saved.contains("\"aside\":\"\""), "no empty fields: {saved}");
        // the time is over: by the answer's time again
        RANK[pool.i()].lock().unwrap().list.iter_mut().for_each(|p| p.aside_until = p.aside_until.min(now().saturating_sub(1)));
        keep(pool, vec![pr("https://de", Some(30)), pr("https://ru", Some(95))]);
        assert_eq!(order(pool, hosts()), vec!["https://de", "https://ru", "https://dead"]);
    }
    /// A reader that gives `n` bytes, then fails as a stream stopped on the way does (or ends, when `end`).
    struct Cut { n: usize, end: bool }
    impl std::io::Read for Cut {
        fn read(&mut self, b: &mut [u8]) -> std::io::Result<usize> {
            if self.n == 0 { return if self.end { Ok(0) } else { Err(std::io::Error::new(std::io::ErrorKind::TimedOut, "timed out")) }; }
            let k = b.len().min(self.n).min(1400); b[..k].fill(b'x'); self.n -= k; Ok(k)
        }
    }
    #[test]
    fn the_check_reads_past_the_dpi_point_and_no_further() {
        assert_eq!(probe_body(Cut { n: 112 << 10, end: true }), Ok(64 << 10), "the chat's 112 KB: only the first 64 KB are read");
        assert_eq!(probe_body(Cut { n: 1 << 20, end: false }), Ok(64 << 10), "a long answer: 64 KB, no wait for the rest");
        assert_eq!(probe_body(Cut { n: 40 << 10, end: true }), Ok(40 << 10), "a whole answer under 64 KB");
        let e = probe_body(Cut { n: 36200, end: false }).unwrap_err();
        assert!(e.starts_with("read: stopped after 35 KB"), "a stream stopped by a DPI is no answer: {e}");
        assert!(probe_body(Cut { n: 9000, end: true }).unwrap_err().starts_with("short answer"));
    }

    /// Against the real servers (network): cargo test -p elite-launcher live_check -- --ignored --nocapture
    /// REACH_DATA / REACH_API: ";"-separated bases to check.
    #[test]
    #[ignore]
    fn live_check() {
        for (pool, var) in [(Pool::Data, "REACH_DATA"), (Pool::Api, "REACH_API")] {
            let bases: Vec<String> = std::env::var(var).unwrap_or_default().split(';').filter(|x| !x.is_empty()).map(String::from).collect();
            for p in check(pool, &bases) { println!("{pool:?} {:>6} {} {}", p.ms.map(|m| format!("{m} ms")).unwrap_or("-".into()), p.base, p.err); }
        }
    }
}
