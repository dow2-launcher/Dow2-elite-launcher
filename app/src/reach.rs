//! Which of our hosts this computer reaches best (owner 02.11.2026: the launcher must work and download everywhere; no
//! ICMP ping; checked once at the start and again only when access is lost).
//!
//! Two pools:
//! - Data: the mirrors (launcher.json, Elite's and the add-ons' files) - Moscow, Germany, Cloudflare R2, whatever the
//!   signed launcher.json lists. Checked with `<base>launcher.json` (~46 KB).
//! - Api: our servers with the ladder API (chat, the stream, rooms, logs, usage) and the launcher's own updater.json.
//!   Checked with the last 120 chat messages (~60 KB of JSON).
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
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant};

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Pool { Data, Api }

impl Pool {
    fn i(self) -> usize { match self { Pool::Data => 0, Pool::Api => 1 } }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct Probe {
    pub base: String,
    /// The time of the whole answer; None - no answer (or lost since).
    pub ms: Option<u32>,
    #[serde(default)]
    pub err: String,
}

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

/// `bases` in the order to try: answered (fastest first), not checked yet (as given), no answer.
pub fn order(pool: Pool, bases: Vec<String>) -> Vec<String> {
    let r = RANK[pool.i()].lock().unwrap();
    let pos = |b: &String| r.list.iter().position(|p| key(&p.base) == key(b));
    let mut v: Vec<(u8, u32, usize, String)> = bases.into_iter().enumerate().map(|(i, b)| match pos(&b).map(|j| &r.list[j]) {
        Some(Probe { ms: Some(ms), .. }) => (0, *ms, i, b),
        Some(_) => (2, 0, i, b),
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
            None => r.list.push(Probe { base: base.to_string(), ms: None, err: "lost".into() }),
        }
    }
    check_soon(pool, 30);
}

/// Check the pool in the background unless a check runs or ran less than `gap` seconds ago (0: always).
pub fn check_soon(pool: Pool, gap: u64) {
    if gap > 0 && now().saturating_sub(LAST[pool.i()].load(Ordering::Relaxed)) < gap { return; }
    if BUSY[pool.i()].swap(true, Ordering::SeqCst) { return; }
    std::thread::spawn(move || {
        let bases = CANDIDATES[pool.i()].lock().unwrap().clone();
        check(pool, &bases);
        BUSY[pool.i()].store(false, Ordering::SeqCst);
    });
}

fn probe_url(pool: Pool, base: &str) -> String {
    match pool {
        Pool::Data => format!("{}/launcher.json", base.trim_end_matches('/')),
        Pool::Api => format!("{}/ladder/api/c/msgs?room=all&after=0&limit=120", base.trim_end_matches('/')),
    }
}

/// One host: the time of a whole small answer, or why there is none.
fn probe(pool: Pool, base: &str) -> Probe {
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(4))
        .timeout(Duration::from_secs(8))
        .user_agent(concat!("EliteLauncher/", env!("CARGO_PKG_VERSION"), " reach"))
        .try_proxy_from_env(true)
        .build();
    let t = Instant::now();
    let res = agent.get(&probe_url(pool, base)).call().map_err(|e| e.to_string()).and_then(|r| {
        use std::io::Read;
        let mut v = Vec::new();
        r.into_reader().take(256 << 10).read_to_end(&mut v).map_err(|e| e.to_string())?;
        if v.len() < 16 << 10 { Err(format!("short answer ({} bytes)", v.len())) } else { Ok(()) }   // 1.4.3: a stream, not a ping
    });
    match res {
        Ok(()) => Probe { base: base.to_string(), ms: Some(t.elapsed().as_millis().min(u32::MAX as u128) as u32), err: String::new() },
        Err(e) => Probe { base: base.to_string(), ms: None, err: e.chars().take(120).collect() },
    }
}

/// Check every host of the pool at once; the new order is kept and returned.
pub fn check(pool: Pool, bases: &[String]) -> Vec<Probe> {
    LAST[pool.i()].store(now(), Ordering::Relaxed);
    let handles: Vec<_> = bases.iter().cloned().map(|b| std::thread::spawn(move || probe(pool, &b))).collect();
    let mut got: Vec<Probe> = handles.into_iter().filter_map(|h| h.join().ok()).collect();
    // answered first, fastest first; no answer at the end in the given order (sort_by_key is stable)
    got.sort_by_key(|p| (p.ms.is_none(), p.ms.unwrap_or(0)));
    {
        let mut r = RANK[pool.i()].lock().unwrap();
        r.list = got.clone();
        r.checked = true;
    }
    if let Some(f) = ON_CHECKED.lock().unwrap().as_ref() { f(pool, &got); }
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
                Probe { base: "https://slow/".into(), ms: Some(300), err: String::new() },
                Probe { base: "https://fast/".into(), ms: Some(40), err: String::new() },
                Probe { base: "https://dead/".into(), ms: None, err: "timeout".into() },
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
