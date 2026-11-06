//! The connection test (launcher 1.4.16, owner 06.11.2026): "packets go just as in the game" - to each of our game nodes at once.
//!
//! The same way a match goes: our UDP tunnel "DU" v2 (the delivery of Relay.dll 23 / du_proto.py: one resend timer, a tail
//! probe, at most 10 resends then dead, a resend budget, copies at most twice per packet, 64 packets / 64 KB in flight, pacing,
//! ack limits, the fuse) to the node's udp_gateway (UDP 47100), which hands it to the battle server there as a TCP stream - when
//! UDP gets no answer, TCP straight to the battle server (as Relay.dll falls back). The stream starts with "DWRT" (battle_relay's
//! test mode: a session of its own, never a real one) and then is the game's own: hello, a turn (0x17) every 100 ms, pings
//! (0x14), proxy messages (0x10) to the other players at the rate of a real 1v1 / 2v2 / 3v3. The other 1 / 3 / 5 players are
//! virtual on the server: each puts a 16-byte turn into every tick (0x0a, every 100 ms), sends proxy messages and big 0x13s at
//! game rates and answers each proxy message part it gets at once.
//!
//! Measured (what the game feels): the delay of our turn (sent -> back in a tick), the stream's round trip (ping echo), the
//! ticks (pauses > 250 ms like battle_relay's gaps, jitter), the pauses of our turns as the server saw them, losses each way
//! (holes the receiver had to wait for), reordering, resends and copies, proxy parts (each must come back from the right player
//! only), whether the stream held (a cut like DPI) - and before the game stream the checks of Relay.dll: UDP ping (best of 3,
//! the number the matchmaker gets) and the burst of 40 x 1000 bytes (usable = 30+ answers, 3+ of the last 6). Then a verdict per
//! node ("excellent / playable / laggy / down"), the node the matchmaker would pick (ladder _best_relay for one player: the
//! usable node with the lowest ping, 0 ms = not reached, a tie by the list order) and hints of a VPN or an interceptor.
use serde_json::{json, Value};
use std::collections::{BTreeMap, HashMap, HashSet, VecDeque};
use std::io::{ErrorKind, Read, Write};
use std::net::{Ipv4Addr, Shutdown, SocketAddr, TcpStream, UdpSocket};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub const GAME_PORT: u16 = 47100;
pub const SECS_DEFAULT: u32 = 60;
/// our nodes and ports, for the "add to your VPN / zapret exceptions" hint (the lobby servers: 47443, its stream check 47445)
pub const KNOWN_NODES: [(&str, &str); 4] = [("15.220.68.107", "Poland"), ("116.202.106.150", "Germany"), ("83.217.192.34", "Moscow"), ("91.107.122.186", "Moscow 2")];
pub const LOBBY_PORTS: [u16; 2] = [47443, 47445];
const GAP: f64 = 0.25;              // a pause: turns / ticks this far apart (battle_relay GAP)
const CUT_SILENCE: f64 = 5.0;       // s without a byte from the server during the game: the stream is cut (the game drops a peer at ~10 s)

// ---------------------------------------------------------------- DU, as du_proto.py / relay/du_tunnel.h
const SYN: u8 = 1; const SYNACK: u8 = 2; const DATA: u8 = 3; const ACK: u8 = 4; const FIN: u8 = 5; const PING: u8 = 6; const PONG: u8 = 7;
const DATA2: u8 = 8; const ACK2: u8 = 9; const STATQ: u8 = 10; const STATA: u8 = 11;
const MAXP: usize = 1200; const BUDGET: usize = 1240; const COPIES: usize = 2; const RECV_AHEAD: u32 = 2048;
const WIN_PKTS: usize = 64; const WIN_BYTES: usize = 64 * 1024;
const RTO_MIN: f64 = 0.2; const RTO_MAX: f64 = 3.0; const RESEND_TICK: u32 = 8; const MAX_SENDS: u32 = 11;
const RESEND_FLOOR: f64 = 20.0; const RESEND_SHARE: f64 = 0.25; const COPY_MAX: u32 = 2;
const PACE: f64 = 250.0; const PACE_BURST: f64 = 20.0; const DUP_ACK_GAP: f64 = 0.02; const ACK_DELAY: f64 = 0.01; const TLP_MIN: f64 = 0.02;
const KEEPALIVE: f64 = 1.0; const IDLE: f64 = 30.0;
const FUSE_WINDOW: f64 = 5.0; const FUSE_EXTRA: f64 = 3.0; const FUSE_RATE: f64 = 300.0; const FUSE_MIN: u64 = 100;

fn hdr(t: u8, cid: u32) -> Vec<u8> { let mut v = vec![b'D', b'U', t]; v.extend_from_slice(&cid.to_le_bytes()); v }
fn rand_u64() -> u64 { let mut b = [0u8; 8]; let _ = getrandom::getrandom(&mut b); u64::from_le_bytes(b) | 1 }
fn u32le(b: &[u8]) -> u32 { u32::from_le_bytes([b[0], b[1], b[2], b[3]]) }
fn u16le(b: &[u8]) -> usize { b[0] as usize | (b[1] as usize) << 8 }

struct Bucket { rate: f64, cap: f64, tok: f64, t: f64 }
impl Bucket {
    fn new(rate: f64, cap: f64, now: f64) -> Self { Bucket { rate, cap, tok: cap, t: now } }
    fn take(&mut self, now: f64) -> bool {
        self.tok = self.cap.min(self.tok + (now - self.t) * self.rate); self.t = now;
        if self.tok >= 1.0 { self.tok -= 1.0; true } else { false }
    }
}

struct Un { payload: Vec<u8>, first: f64, last: f64, sends: u32, copies: u32 }

#[derive(Default, Clone, Debug)]
pub struct DuStats {
    pub rx: u64, pub tx: u64, pub resent: u64, pub lost_in: u64, pub copies: u64, pub filled: u64, pub max_rtt_ms: u64, pub acks: u64,
    pub dup_in: u64, pub pkts_in: u64, pub pkts_out: u64, pub bytes_in: u64, pub bytes_out: u64, pub budget_skip: u64,
    /// our measurements: packets of the server that arrived only after a later one and late (lost on the way, filled by a copy or
    /// a resend) / soon after it (reordered on the way)
    pub down_lost: u64, pub down_reordered: u64,
}

/// One DU connection, client side. Time in seconds since `base`.
pub struct Du {
    sock: UdpSocket, base: Instant, pub cid: u32, pub ver: u8,
    pending: VecDeque<Vec<u8>>, snd_next: u32, unacked: BTreeMap<u32, Un>, inflight: usize,
    rcv_next: u32, ooo: BTreeMap<u32, Vec<u8>>,
    pub srtt: f64, rttvar: f64, have_rtt: bool, backoff: f64, rto_at: Option<f64>, tlp_done: bool,
    last_ack_seen: i64, dups: u32, fast_done: i64, peer_ack: u32, peer_sack: u32,
    seen: f64, sent: f64, last_ack_out: f64, last_ack2: f64, ack_due: u8,
    pace: Bucket, rbucket: Bucket, fresh_rate: f64, fresh_mark: (f64, u64),
    copies_on: bool, pub fuse: bool, win: (f64, u64, u64, u64),
    pub st: DuStats, pub closed: Option<&'static str>, inbox: Vec<u8>,
    hi: Option<u32>, holes: HashMap<u32, f64>, by_copy: HashMap<u32, f64>, pub up_holes: HashSet<u32>, resent_seqs: HashSet<u32>,
    /// the gateway's counters of this connection (STATA): how our packets arrived there
    pub gw: Option<Value>,
}

impl Du {
    /// SYN (version 2) every 250 ms until a SYNACK, at most `wait` s. None = no answer (the caller tries TCP).
    pub fn open(ip: Ipv4Addr, port: u16, wait: f64) -> Option<(Du, f64)> {
        let sock = UdpSocket::bind((Ipv4Addr::UNSPECIFIED, 0)).ok()?;
        sock.connect((ip, port)).ok()?;
        let cid = rand_u64() as u32;
        let base = Instant::now();
        let mut b = [0u8; 1600];
        let mut first_syn = 0.0;
        while base.elapsed().as_secs_f64() < wait {
            let t_syn = base.elapsed().as_secs_f64();
            if first_syn == 0.0 { first_syn = t_syn; }
            let mut p = hdr(SYN, cid); p.push(2);
            let _ = sock.send(&p);
            let until = t_syn + 0.25;
            loop {
                let left = until - base.elapsed().as_secs_f64();
                if left <= 0.0 { break; }
                let _ = sock.set_read_timeout(Some(Duration::from_secs_f64(left.max(0.001))));
                match sock.recv(&mut b) {
                    Ok(n) if n >= 7 && &b[..2] == b"DU" && b[2] == SYNACK && u32le(&b[3..7]) == cid => {
                        let ver = if n > 7 && b[7] >= 2 { 2 } else { 1 };
                        let now = base.elapsed().as_secs_f64();
                        let _ = sock.set_nonblocking(true);
                        return Some((Du::new(sock, base, cid, ver, now), (now - t_syn) * 1000.0));
                    }
                    Ok(_) => continue,
                    Err(_) => break,
                }
            }
        }
        None
    }

    fn new(sock: UdpSocket, base: Instant, cid: u32, ver: u8, now: f64) -> Du {
        Du { sock, base, cid, ver, pending: VecDeque::new(), snd_next: 0, unacked: BTreeMap::new(), inflight: 0, rcv_next: 0, ooo: BTreeMap::new(),
             srtt: 0.15, rttvar: 0.05, have_rtt: false, backoff: 1.0, rto_at: None, tlp_done: false,
             last_ack_seen: -1, dups: 0, fast_done: -1, peer_ack: 0, peer_sack: 0,
             seen: now, sent: now, last_ack_out: 0.0, last_ack2: 0.0, ack_due: 0,
             pace: Bucket::new(PACE, PACE_BURST, now), rbucket: Bucket::new(RESEND_FLOOR, RESEND_FLOOR, now), fresh_rate: 0.0, fresh_mark: (now, 0),
             copies_on: ver >= 2, fuse: false, win: (now, 0, 0, 0), st: DuStats::default(), closed: None, inbox: Vec::new(),
             hi: None, holes: HashMap::new(), by_copy: HashMap::new(), up_holes: HashSet::new(), resent_seqs: HashSet::new(), gw: None }
    }

    pub fn now(&self) -> f64 { self.base.elapsed().as_secs_f64() }

    fn out(&mut self, pkt: &[u8], now: f64, kind: u8) {
        let _ = self.sock.send(pkt);
        self.sent = now; self.win.3 += 1; self.st.pkts_out += 1; self.st.bytes_out += pkt.len() as u64;
        match kind { 0 => self.win.1 += 1, 1 => self.win.2 += 1, _ => {} }
    }

    fn rto(&self) -> f64 { let base = RTO_MAX.min(RTO_MIN.max(self.srtt + 4.0 * self.rttvar)); RTO_MAX.min(base * self.backoff) }

    /// bytes of the game stream; never refused (a test sends little)
    pub fn write(&mut self, data: &[u8]) {
        if self.closed.is_some() || data.is_empty() { return; }
        for chunk in data.chunks(MAXP) {
            match self.pending.back_mut() { Some(last) if last.len() + chunk.len() <= MAXP => last.extend_from_slice(chunk), _ => self.pending.push_back(chunk.to_vec()) }
        }
        let now = self.now(); self.flush(now);
    }

    fn flush(&mut self, now: f64) {
        while !self.pending.is_empty() && self.closed.is_none() && self.unacked.len() < WIN_PKTS && self.inflight < WIN_BYTES {
            if !self.pace.take(now) { break; }
            let payload = self.pending.pop_front().unwrap();
            let seq = self.snd_next; self.snd_next += 1;
            self.inflight += payload.len();
            self.unacked.insert(seq, Un { payload, first: now, last: now, sends: 1, copies: 0 });
            let p = self.packet(seq, now); self.out(&p, now, 0); self.st.tx += 1;
            if self.rto_at.is_none() { self.rto_at = Some(now + self.rto()); }
        }
    }

    fn sack(&self) -> u32 { (0..32).filter(|i| self.ooo.contains_key(&(self.rcv_next + 1 + i))).fold(0, |m, i| m | 1 << i) }

    fn copies(&mut self, below: u32, mut room: usize, now: f64) -> (Vec<u8>, u8) {
        let (mut out, mut k) = (Vec::new(), 0u8);
        if !self.copies_on { return (out, 0); }
        let age = (2.0 * self.srtt).max(RTO_MIN);
        let lo = below.saturating_sub(16);
        let mut s = below;
        while s > lo && (k as usize) < COPIES {
            s -= 1;
            let Some(u) = self.unacked.get_mut(&s) else { continue };
            if u.copies >= COPY_MAX || now - u.first > age || 6 + u.payload.len() > room { continue; }
            out.extend_from_slice(&s.to_le_bytes()); out.extend_from_slice(&(u.payload.len() as u16).to_le_bytes()); out.extend_from_slice(&u.payload);
            room -= 6 + u.payload.len(); u.copies += 1; k += 1;
        }
        self.st.copies += k as u64; self.win.2 += k as u64;
        (out, k)
    }

    fn packet(&mut self, seq: u32, now: f64) -> Vec<u8> {
        self.ack_due = 0; self.last_ack_out = now;
        let plen = self.unacked[&seq].payload.len();
        let (ack, sack) = (self.rcv_next, self.sack());
        if self.ver < 2 {
            let mut p = hdr(DATA, self.cid);
            for x in [seq, ack, sack] { p.extend_from_slice(&x.to_le_bytes()); }
            p.extend_from_slice(&self.unacked[&seq].payload); return p;
        }
        let (c, k) = self.copies(seq, BUDGET - 20 - plen, now);
        let mut p = hdr(DATA2, self.cid);
        for x in [seq, ack, sack] { p.extend_from_slice(&x.to_le_bytes()); }
        p.push(k); p.extend_from_slice(&c); p.extend_from_slice(&self.unacked[&seq].payload);
        p
    }

    fn send_ack(&mut self, now: f64, copies_ok: bool) {
        self.ack_due = 0; self.last_ack_out = now; self.st.acks += 1;
        let (ack, sack) = (self.rcv_next, self.sack());
        if self.ver >= 2 && copies_ok && now - self.last_ack2 >= (self.srtt / 4.0).max(ACK_DELAY) {
            let (c, k) = self.copies(self.snd_next, BUDGET - 16, now);
            if k > 0 {
                self.last_ack2 = now;
                let mut p = hdr(ACK2, self.cid); p.extend_from_slice(&ack.to_le_bytes()); p.extend_from_slice(&sack.to_le_bytes()); p.push(k); p.extend_from_slice(&c);
                self.out(&p, now, 2); return;
            }
        }
        let mut p = hdr(ACK, self.cid); p.extend_from_slice(&ack.to_le_bytes()); p.extend_from_slice(&sack.to_le_bytes());
        self.out(&p, now, 2);
    }

    fn resend(&mut self, seq: u32, now: f64) -> bool {
        let sends = self.unacked[&seq].sends;
        if sends >= MAX_SENDS { self.close("dead"); return false; }
        if !self.rbucket.take(now) { self.st.budget_skip += 1; return false; }
        { let u = self.unacked.get_mut(&seq).unwrap(); u.last = now; u.sends += 1; }
        self.st.resent += 1; self.resent_seqs.insert(seq);
        let p = self.packet(seq, now); self.out(&p, now, 1);
        true
    }

    fn on_ack(&mut self, ack: u32, sack: u32, now: f64) {
        // the peer's holes: below the newest it has (sack) and not acknowledged - lost on the way up (or reordered)
        if sack != 0 {
            let top = ack + 32 - sack.leading_zeros();
            for s in ack..top.min(ack + 33) {
                let got = s > ack && sack >> (s - ack - 1) & 1 == 1;
                if !got && self.unacked.contains_key(&s) { self.up_holes.insert(s); }
            }
        }
        let mut advanced = false; let mut clean = self.peer_sack == 0; let mut newest: Option<(u32, f64, u32)> = None;
        let gone: Vec<u32> = self.unacked.keys().copied().filter(|&s| s < ack || (s > ack && s - ack - 1 < 32 && sack >> (s - ack - 1) & 1 == 1)).collect();
        for s in gone {
            let u = self.unacked.remove(&s).unwrap(); self.inflight -= u.payload.len();
            if s < ack { advanced = true; }
            if u.sends > 1 || u.copies > 0 { clean = false; }
            if newest.map_or(true, |n| s > n.0) { newest = Some((s, u.first, u.sends)); }
        }
        if let (true, Some((_, first, 1))) = (clean, newest) {
            let r = now - first;
            if !self.have_rtt { self.srtt = r; self.rttvar = r / 2.0; self.have_rtt = true; }
            else { self.rttvar = 0.75 * self.rttvar + 0.25 * (self.srtt - r).abs(); self.srtt = 0.875 * self.srtt + 0.125 * r; }
            self.st.max_rtt_ms = self.st.max_rtt_ms.max((r * 1000.0).round() as u64);
        }
        if advanced { self.backoff = 1.0; self.tlp_done = false; self.rto_at = if self.unacked.is_empty() { None } else { Some(now + self.rto()) }; }
        else if self.unacked.is_empty() { self.rto_at = None; }
        if ack as i64 == self.last_ack_seen && sack != 0 && self.unacked.contains_key(&ack) {
            self.dups += 1;
            if self.dups >= 2 && self.fast_done != ack as i64 { self.fast_done = ack as i64; self.resend(ack, now); }
        } else { self.dups = 0; }
        self.last_ack_seen = ack as i64; self.peer_ack = ack; self.peer_sack = sack;
        self.flush(now);
    }

    fn on_data(&mut self, seq: u32, payload: &[u8], copy: bool, now: f64) -> bool {
        if seq < self.rcv_next || self.ooo.contains_key(&seq) || seq - self.rcv_next > RECV_AHEAD {
            // the original of a packet a copy already gave us, soon after: it was only late (reordered), not lost
            if !copy { if let Some(t) = self.by_copy.remove(&seq) { if now - t < 1.0 { self.st.down_lost = self.st.down_lost.saturating_sub(1); self.st.down_reordered += 1; } } }
            return false;
        }
        // losses / reordering on the way down: a number that comes after a later one
        match self.hi {
            Some(h) if seq > h + 1 => { for s in (h + 1).max(self.rcv_next)..seq.min(h + 65) { self.holes.entry(s).or_insert(now); } }
            None if seq > self.rcv_next => { for s in self.rcv_next..seq.min(self.rcv_next + 64) { self.holes.entry(s).or_insert(now); } }
            _ => {}
        }
        if self.hi.map_or(true, |h| seq > h) { self.hi = Some(seq); }
        if let Some(t) = self.holes.remove(&seq) {
            if !copy && now - t < (self.srtt / 2.0).max(0.03) { self.st.down_reordered += 1; } else { self.st.down_lost += 1; }
        } else if copy {
            self.st.down_lost += 1; self.by_copy.insert(seq, now);
            if self.by_copy.len() > 256 { self.by_copy.retain(|_, t| now - *t < 2.0); }
        }
        self.ooo.insert(seq, payload.to_vec());
        if copy { self.st.filled += 1; } else if seq != self.rcv_next { self.st.lost_in += 1; }
        while let Some(d) = self.ooo.remove(&self.rcv_next) {
            self.rcv_next += 1; self.st.rx += 1;
            if self.closed.is_none() { self.inbox.extend_from_slice(&d); }
        }
        true
    }

    fn got_data(&mut self, new: bool, now: f64) {
        if new {
            if !self.ooo.is_empty() || now - self.last_ack_out >= ACK_DELAY { self.send_ack(now, true); } else { self.ack_due = 1; }
        } else {
            self.st.dup_in += 1;
            if now - self.last_ack_out >= DUP_ACK_GAP { self.send_ack(now, false); } else if self.ack_due == 0 { self.ack_due = 2; }
        }
    }

    fn datagram(&mut self, d: &[u8], now: f64) {
        if d.len() < 7 || &d[..2] != b"DU" || u32le(&d[3..7]) != self.cid || self.closed.is_some() { return; }
        let (t, body) = (d[2], &d[7..]);
        if t == STATA { self.gw = serde_json::from_slice(body).ok(); return; }
        self.seen = now; self.st.pkts_in += 1; self.st.bytes_in += d.len() as u64;
        if t == DATA && body.len() >= 12 {
            let (seq, ack, sack) = (u32le(body), u32le(&body[4..]), u32le(&body[8..]));
            self.on_ack(ack, sack, now);
            let new = self.on_data(seq, &body[12..], false, now); self.got_data(new, now);
        } else if (t == DATA2 && body.len() >= 13) || (t == ACK2 && body.len() >= 9) {
            let (seq, ack, sack, k, mut o) = if t == DATA2 { (Some(u32le(body)), u32le(&body[4..]), u32le(&body[8..]), body[12], 13) }
                                             else { (None, u32le(body), u32le(&body[4..]), body[8], 9) };
            let mut copies = Vec::new(); let mut bad = false;
            for _ in 0..k {
                if o + 6 > body.len() { bad = true; break; }
                let (s, n) = (u32le(&body[o..]), u16le(&body[o + 4..]));
                if n > MAXP || o + 6 + n > body.len() { bad = true; break; }
                copies.push((s, body[o + 6..o + 6 + n].to_vec())); o += 6 + n;
            }
            self.on_ack(ack, sack, now);
            let mut took = 0;
            for (s, b) in copies.iter().rev() { if self.on_data(*s, b, true, now) { took += 1; } }
            match seq {
                Some(seq) => {
                    let mine = !bad && body.len() - o <= MAXP && { let p = body[o..].to_vec(); self.on_data(seq, &p, false, now) };
                    self.got_data(mine || took > 0, now);
                }
                None => if took > 0 { self.ack_due = 1; },
            }
        } else if t == ACK && body.len() >= 8 {
            self.on_ack(u32le(body), u32le(&body[4..]), now);
        } else if t == FIN {
            self.closed = Some("peer");
        }
    }

    /// the clock: every ~10 ms
    fn tick(&mut self, now: f64) {
        if self.closed.is_some() { return; }
        if now - self.seen > IDLE { self.close("silent"); return; }
        let (t0, n0) = self.fresh_mark;
        if now - t0 >= 1.0 {
            self.fresh_rate = 0.7 * self.fresh_rate + 0.3 * (self.st.tx - n0) as f64 / (now - t0);
            self.fresh_mark = (now, self.st.tx);
            let r = if self.fuse { RESEND_FLOOR } else { RESEND_FLOOR.max(RESEND_SHARE * self.fresh_rate) };
            self.rbucket.rate = r; self.rbucket.cap = r;
        }
        if let (false, Some(at)) = (self.tlp_done, self.rto_at) {
            if now < at {
                if let Some((&newest, u)) = self.unacked.iter().next_back() {
                    if now - u.last >= (self.srtt + 2.0 * self.rttvar + ACK_DELAY).max(TLP_MIN) {
                        self.tlp_done = true; self.resend(newest, now);
                        if self.closed.is_some() { return; }
                    }
                }
            }
        }
        if let Some(at) = self.rto_at {
            if now >= at && !self.unacked.is_empty() {
                let base = *self.unacked.keys().next().unwrap();
                if self.resend(base, now) { self.up_holes.insert(base); }
                if self.closed.is_some() { return; }
                let hb = 32 - self.peer_sack.leading_zeros();
                let hi = (self.peer_ack + hb).min(base + 1 + RESEND_TICK);
                for s in base + 1..hi {
                    let due = self.unacked.get(&s).map_or(false, |u| now - u.last > self.srtt);
                    if due && !self.resend(s, now) { break; }
                    if self.closed.is_some() { return; }
                }
                if self.backoff * RTO_MAX.min(RTO_MIN.max(self.srtt + 4.0 * self.rttvar)) < RTO_MAX { self.backoff *= 2.0; }
                self.rto_at = Some(now + self.rto());
            }
        }
        self.flush(now);
        if self.ack_due != 0 && now - self.last_ack_out >= if self.ack_due == 2 { DUP_ACK_GAP } else { ACK_DELAY } { let c = self.ack_due == 1; self.send_ack(now, c); }
        else if now - self.sent > KEEPALIVE { self.send_ack(now, true); }
        let (wt, fresh, extra, out) = self.win;
        if now - wt >= FUSE_WINDOW {
            let secs = now - wt;
            if !self.fuse && ((extra as f64 > FUSE_EXTRA * fresh.max(1) as f64 && extra >= FUSE_MIN) || out as f64 / secs > FUSE_RATE) {
                self.fuse = true; self.copies_on = false; self.rbucket.rate = RESEND_FLOOR; self.rbucket.cap = RESEND_FLOOR;
            }
            self.win = (now, 0, 0, 0);
        }
    }

    pub fn close(&mut self, by: &'static str) {
        if self.closed.is_some() { return; }
        self.closed = Some(by);
        if by != "peer" { for _ in 0..3 { let _ = self.sock.send(&hdr(FIN, self.cid)); } }
    }

    /// wait up to `wait` for datagrams, take all that came, run the clock
    fn pump(&mut self, wait: Duration) {
        let mut b = [0u8; 2048];
        let _ = self.sock.set_nonblocking(false);
        let _ = self.sock.set_read_timeout(Some(wait.max(Duration::from_millis(1))));
        let mut first = true;
        loop {
            match self.sock.recv(&mut b) {
                Ok(n) => { let now = self.now(); self.datagram(&b[..n], now); }
                Err(_) => break,
            }
            if first { first = false; let _ = self.sock.set_nonblocking(true); }
        }
        let now = self.now(); self.tick(now);
    }
}

// ---------------------------------------------------------------- the link: DU or TCP
enum Link { Du(Du), Tcp { s: TcpStream, out: Vec<u8>, inbox: Vec<u8>, closed: Option<&'static str> } }
impl Link {
    fn write(&mut self, d: &[u8]) {
        match self {
            Link::Du(du) => du.write(d),
            Link::Tcp { s, out, closed, .. } => {
                if closed.is_some() { return; }
                out.extend_from_slice(d);
                match s.write(out) { Ok(n) => { out.drain(..n); } Err(e) if e.kind() == ErrorKind::WouldBlock => {} Err(_) => *closed = Some("reset") }
            }
        }
    }
    fn pump(&mut self, wait: Duration) {
        match self {
            Link::Du(du) => du.pump(wait),
            Link::Tcp { s, out, inbox, closed } => {
                if closed.is_some() { std::thread::sleep(wait); return; }
                if !out.is_empty() {
                    match s.write(out) { Ok(n) => { out.drain(..n); } Err(e) if e.kind() == ErrorKind::WouldBlock => {} Err(_) => { *closed = Some("reset"); return } }
                }
                let _ = s.set_nonblocking(false);
                let _ = s.set_read_timeout(Some(wait.max(Duration::from_millis(1))));
                let mut b = [0u8; 16384];
                let mut first = true;
                loop {
                    match s.read(&mut b) {
                        Ok(0) => { *closed = Some("peer"); break }
                        Ok(n) => inbox.extend_from_slice(&b[..n]),
                        Err(e) if matches!(e.kind(), ErrorKind::WouldBlock | ErrorKind::TimedOut) => break,
                        Err(_) => { *closed = Some("reset"); break }
                    }
                    if first { first = false; let _ = s.set_nonblocking(true); }
                }
                let _ = s.set_nonblocking(true);
            }
        }
    }
    fn inbox(&mut self) -> &mut Vec<u8> { match self { Link::Du(du) => &mut du.inbox, Link::Tcp { inbox, .. } => inbox } }
    fn closed(&self) -> Option<&'static str> { match self { Link::Du(du) => du.closed, Link::Tcp { closed, .. } => *closed } }
    fn close(&mut self) {
        match self { Link::Du(du) => du.close("us"), Link::Tcp { s, closed, .. } => { if closed.is_none() { *closed = Some("us"); } let _ = s.shutdown(Shutdown::Both); } }
    }
}

// ---------------------------------------------------------------- small helpers
fn pct(v: &[f64], q: f64) -> f64 { if v.is_empty() { return 0.0; } let mut s = v.to_vec(); s.sort_by(|a, b| a.partial_cmp(b).unwrap()); s[((s.len() as f64 * q) as usize).min(s.len() - 1)] }
fn avg(v: &[f64]) -> f64 { if v.is_empty() { 0.0 } else { v.iter().sum::<f64>() / v.len() as f64 } }
fn r1(x: f64) -> f64 { (x * 10.0).round() / 10.0 }
fn stats(v: &[f64]) -> Value {
    if v.is_empty() { return json!({"n": 0}); }
    json!({"n": v.len(), "avg": r1(avg(v)), "p50": r1(pct(v, 0.5)), "p95": r1(pct(v, 0.95)), "max": r1(pct(v, 1.0))})
}

struct Rng(u64);
impl Rng {
    fn f(&mut self) -> f64 { self.0 ^= self.0 << 13; self.0 ^= self.0 >> 7; self.0 ^= self.0 << 17; (self.0 >> 11) as f64 / (1u64 << 53) as f64 }
    fn exp(&mut self, rate: f64) -> f64 { -(1.0 - self.f()).max(1e-9).ln() / rate }
}

/// the mode by its name: "1v1" / "2v2" / "3v3" -> players in the match
pub fn players_of(mode: &str) -> u8 { match mode { "2v2" => 4, "3v3" => 6, _ => 2 } }
/// proxy messages a second from the player to the others (one message for all of them): 1v1 capture ~0.2/s, 3v3 counters 3.4/s
fn proxy_rate(players: u8) -> f64 { match players { 4 => 2.0, 6 => 3.4, _ => 0.25 } }
fn proxy_size(r: &mut Rng) -> usize { let x = r.f(); if x < 0.8 { 44 } else if x < 0.95 { 120 } else { 540 } }

// ---------------------------------------------------------------- the checks of Relay.dll before the game
/// DU PING/PONG: round trips in ms (fractions kept: under 1 ms from a far address = something local answers)
pub fn udp_pings(ip: Ipv4Addr, port: u16, n: usize, timeout_ms: u64) -> Vec<f64> {
    let Ok(u) = UdpSocket::bind((Ipv4Addr::UNSPECIFIED, 0)) else { return vec![] };
    if u.connect((ip, port)).is_err() { return vec![]; }
    let cid = rand_u64() as u32; let mut out = vec![]; let mut b = [0u8; 256];
    for k in 0..n as u32 {
        let mut p = hdr(PING, cid); p.extend_from_slice(&(0xA000_0000u32 | k).to_le_bytes()); p.extend_from_slice(b"nettest");
        let t0 = Instant::now();
        if u.send(&p).is_err() { break; }
        loop {
            let left = Duration::from_millis(timeout_ms).saturating_sub(t0.elapsed());
            if left.is_zero() { break; }
            let _ = u.set_read_timeout(Some(left));
            match u.recv(&mut b) {
                Ok(m) if m >= 11 && &b[..2] == b"DU" && b[2] == PONG && u32le(&b[3..7]) == cid && u32le(&b[7..11]) == 0xA000_0000 | k => { out.push(t0.elapsed().as_secs_f64() * 1000.0); break }
                Ok(_) => continue,
                Err(_) => break,
            }
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    out
}

/// Relay 18's stream check: 40 x 1000 bytes, 4 at a time 2 ms apart; (answers, answers among the last 6)
pub fn udp_burst(ip: Ipv4Addr, port: u16) -> (usize, usize) {
    const N: usize = 40;
    let Ok(u) = UdpSocket::bind((Ipv4Addr::UNSPECIFIED, 0)) else { return (0, 0) };
    if u.connect((ip, port)).is_err() { return (0, 0); }
    let cid = rand_u64() as u32;
    let mut pk = vec![0x5au8; 7 + 1000]; pk[..7].copy_from_slice(&hdr(PING, cid));
    let mut got = [false; N]; let mut b = [0u8; 64];
    let note = |b: &[u8], got: &mut [bool; N]| {
        if b.len() >= 11 && &b[..2] == b"DU" && b[2] == PONG && u32le(&b[3..7]) == cid { let q = u32le(&b[7..11]); if q >> 28 == 0xB && ((q & 0xff) as usize) < N { got[(q & 0xff) as usize] = true; } }
    };
    let _ = u.set_nonblocking(true);
    for n in 0..N {
        pk[7..11].copy_from_slice(&(n as u32 | 0xB000_0000).to_le_bytes());
        let _ = u.send(&pk);
        if n % 4 == 3 { std::thread::sleep(Duration::from_millis(2)); }
        while let Ok(r) = u.recv(&mut b) { note(&b[..r], &mut got); }
    }
    let _ = u.set_nonblocking(false);
    let until = Instant::now() + Duration::from_millis(1500);
    while got.iter().any(|g| !g) {
        let left = until.saturating_duration_since(Instant::now());
        if left.is_zero() || u.set_read_timeout(Some(left)).is_err() { break; }
        match u.recv(&mut b) { Ok(r) => note(&b[..r], &mut got), Err(_) => break }
    }
    (got.iter().filter(|g| **g).count(), got[N - 6..].iter().filter(|g| **g).count())
}

/// TCP connect to the game port (ms), None = no connection in 3 s
fn tcp_connect(ip: Ipv4Addr, port: u16) -> Option<f64> {
    let t0 = Instant::now();
    TcpStream::connect_timeout(&SocketAddr::from((ip, port)), Duration::from_secs(3)).ok().map(|_| t0.elapsed().as_secs_f64() * 1000.0)
}

// ---------------------------------------------------------------- the game model of one node
#[derive(Default)]
struct Game {
    players: u8, turn_k: u32, ping_k: u32, proxy_k: u32,
    turn_sent: HashMap<u32, f64>, turn_lat: Vec<f64>, turn_t: Vec<f64>,
    ping_sent: HashMap<u32, f64>, rtt: Vec<f64>, rtt_t: Vec<f64>,
    proxy_sent: HashMap<u32, (f64, u8)>, proxy_rtt: Vec<f64>, parts_ok: u64, parts_wrong: u64, parts_sent: u64,
    ticks: Vec<f64>, vturns: u64, silent: u64,
    vnext: HashMap<u8, u32>, vproxy: u64, vproxy_gap: u64, vbig: u64,
    hello_ms: Option<f64>, hello_t: f64, end: Option<Value>, last_rx: f64, bytes_in: u64,
}

fn frame(m: &[u8]) -> Vec<u8> { let mut v = (m.len() as u16).to_be_bytes().to_vec(); v.extend_from_slice(m); v }

impl Game {
    fn turn(&mut self, now: f64) -> Vec<u8> {
        let k = self.turn_k; self.turn_k += 1; self.turn_sent.insert(k, now);
        let mut d = b"NT".to_vec(); d.extend_from_slice(&k.to_le_bytes()); d.extend_from_slice(&((now * 1e6) as u64).to_le_bytes()); d.extend_from_slice(&[0, 0]);
        let mut m = vec![0x17, 1]; m.extend_from_slice(&[0u8; 4]); m.extend_from_slice(&k.to_le_bytes()); m.extend_from_slice(&[0x09, 0xfe]);
        m.extend_from_slice(&(d.len() as u16).to_le_bytes()); m.extend_from_slice(&d);
        frame(&m)
    }
    fn ping(&mut self, now: f64) -> Vec<u8> {
        let k = self.ping_k; self.ping_k += 1; self.ping_sent.insert(k, now);
        let mut m = vec![0x14]; m.extend_from_slice(&k.to_le_bytes()); frame(&m)
    }
    fn proxy(&mut self, now: f64, size: usize) -> Vec<u8> {
        let k = self.proxy_k; self.proxy_k += 1;
        let dsts: Vec<u8> = (2..=self.players).collect();
        let mask = dsts.iter().fold(0u8, |m, d| m | 1 << d);
        self.proxy_sent.insert(k, (now, mask)); self.parts_sent += dsts.len() as u64;
        let mut data = b"NP".to_vec(); data.extend_from_slice(&k.to_le_bytes()); data.extend_from_slice(&((now * 1e6) as u64).to_le_bytes());
        data.resize(size.max(14), 0x47);
        for d in &dsts { data.extend_from_slice(&[1, *d]); data.extend_from_slice(&k.to_le_bytes()); data.extend_from_slice(&[0u8; 4]); data.extend_from_slice(&[0u8; 5]); }
        let mut m = vec![0x10, 1]; m.extend_from_slice(&(dsts.len() as u16).to_le_bytes()); m.extend_from_slice(&dsts);
        m.extend_from_slice(&(data.len() as u16).to_le_bytes()); m.extend_from_slice(&data);
        frame(&m)
    }

    fn on_frame(&mut self, m: &[u8], now: f64) {
        if m.is_empty() { return; }
        match m[0] {
            0x0a if m.len() >= 3 => {
                self.ticks.push(now);
                let (c, mut o) = (m[2] as usize, 3usize);
                for _ in 0..c {
                    if o + 3 > m.len() { return; }
                    let (i, l) = (m[o], u16le(&m[o + 1..])); let d = &m[(o + 3).min(m.len())..(o + 3 + l).min(m.len())]; o += 3 + l;
                    if i == 1 && d.len() >= 6 && &d[..2] == b"NT" {
                        if let Some(t) = self.turn_sent.remove(&u32le(&d[2..6])) { self.turn_lat.push((now - t) * 1000.0); self.turn_t.push(now); }
                    } else if d.len() >= 2 && &d[..2] == b"VT" { self.vturns += 1; }
                }
                if o < m.len() { self.silent += m[o] as u64; }
            }
            0x10 if m.len() >= 7 => {
                let src = m[1]; let body = &m[7..];
                if body.len() >= 6 && &body[..2] == b"NR" {
                    let k = u32le(&body[2..6]);
                    match self.proxy_sent.get_mut(&k) {
                        Some((t, mask)) if src < 8 && *mask & 1 << src != 0 => { *mask &= !(1 << src); self.parts_ok += 1; self.proxy_rtt.push((now - *t) * 1000.0); }
                        _ => self.parts_wrong += 1,
                    }
                } else if body.len() >= 6 && &body[..2] == b"NV" {
                    let k = u32le(&body[2..6]); let e = self.vnext.entry(src).or_insert(0);
                    if k != *e { self.vproxy_gap += 1; }
                    *e = k + 1; self.vproxy += 1;
                }
            }
            0x13 => self.vbig += 1,
            0x14 if m.len() >= 5 => { if let Some(t) = self.ping_sent.remove(&u32le(&m[1..5])) { self.rtt.push((now - t) * 1000.0); self.rtt_t.push(now); } }
            0x15 => { if self.hello_ms.is_none() { self.hello_ms = Some((now - self.hello_t) * 1000.0); } }
            0x7e => { self.end = serde_json::from_slice(&m[1..]).ok().or(Some(json!({"bad": true}))); }
            _ => {}
        }
    }
}

/// The live state of one node while the test runs (for the progress view).
#[derive(Clone, Default)]
pub struct Live { pub phase: &'static str, pub secs: f64, pub rtt_ms: Option<f64>, pub turn_ms: Option<f64>, pub pauses: u64, pub transport: &'static str }

/// The whole test of one node. `secs` of game traffic; `cancel` stops it at once.
pub fn run_node(ip: Ipv4Addr, port: u16, players: u8, secs: u32, cancel: &AtomicBool, burst_lock: &Mutex<()>, live: &Mutex<Live>, ready: &Ready) -> Value {
    let set = |f: &dyn Fn(&mut Live)| { if let Ok(mut l) = live.lock() { f(&mut l) } };
    let r = checks(ip, port, cancel, burst_lock, &set);
    ready.arrive_and_wait(cancel);
    if r.get("cancelled").is_some() { return r; }
    game(r, ip, port, players, secs, cancel, &set)
}

/// The game streams of all nodes start together, once every node's checks are over (a burst or a TCP check of one node must
/// not fall into another node's game): each node arrives once, then waits for the others (20 s at most).
pub struct Ready { n: usize, at: std::sync::atomic::AtomicUsize }
impl Ready {
    pub fn new(n: usize) -> Self { Ready { n, at: std::sync::atomic::AtomicUsize::new(0) } }
    fn arrive_and_wait(&self, cancel: &AtomicBool) {
        self.at.fetch_add(1, Ordering::SeqCst);
        let t0 = Instant::now();
        while self.at.load(Ordering::SeqCst) < self.n && t0.elapsed() < Duration::from_secs(20) && !cancel.load(Ordering::Relaxed) { std::thread::sleep(Duration::from_millis(20)); }
    }
}

fn checks(ip: Ipv4Addr, port: u16, cancel: &AtomicBool, burst_lock: &Mutex<()>, set: &dyn Fn(&dyn Fn(&mut Live))) -> Value {
    set(&|l| l.phase = "ping");
    // 1. the checks of Relay.dll: UDP ping (best of 3 in ms - what the matchmaker gets), the stream of 40 x 1000 bytes
    let pings = udp_pings(ip, port, 5, 1500);
    let best = pings.iter().cloned().fold(f64::INFINITY, f64::min);
    let (got, tail) = if pings.is_empty() || cancel.load(Ordering::Relaxed) { (0, 0) } else { set(&|l| l.phase = "burst"); let _g = burst_lock.lock(); udp_burst(ip, port) };
    let usable = !pings.is_empty() && got >= 30 && tail >= 3;
    // what Relay.dll reports: whole ms of the best of three; 0 = "not reached" for the ladder (something local answers)
    let mm_ms = if pings.is_empty() { -1 } else { pings.iter().take(3).cloned().fold(f64::INFINITY, f64::min).floor() as i64 };
    let mut r = json!({"ip": ip.to_string(), "ping": {"n": pings.len(), "best": if pings.is_empty() { Value::Null } else { json!(r1(best)) },
        "med": if pings.is_empty() { Value::Null } else { json!(r1(pct(&pings, 0.5))) }, "relay_ms": mm_ms},
        "burst": {"got": got, "tail": tail, "n": 40, "usable": usable}});
    if cancel.load(Ordering::Relaxed) { r["cancelled"] = json!(true); return r; }
    // 2. TCP to the game port (informational - UDP is the game's way; "UDP no, TCP yes" is a VPN / firewall sign)
    set(&|l| l.phase = "tcp");
    let tcp = tcp_connect(ip, port);
    r["tcp"] = json!({"connect_ms": tcp.map(r1)});
    set(&|l| l.phase = "wait");
    r
}

fn game(mut r: Value, ip: Ipv4Addr, port: u16, players: u8, secs: u32, cancel: &AtomicBool, set: &dyn Fn(&dyn Fn(&mut Live))) -> Value {
    // 3. the game stream: DU (as Relay.dll), TCP when UDP gives no SYNACK in 2 s
    set(&|l| l.phase = "connect");
    let (mut link, syn_ms) = match Du::open(ip, port, 2.0) {
        Some((du, ms)) => { let v = du.ver; r["transport"] = json!("udp"); r["du_ver"] = json!(v); (Link::Du(du), Some(ms)) }
        None => match TcpStream::connect_timeout(&SocketAddr::from((ip, port)), Duration::from_secs(3)) {
            Ok(s) => { let _ = s.set_nodelay(true); let _ = s.set_nonblocking(true); r["transport"] = json!("tcp");
                       (Link::Tcp { s, out: vec![], inbox: vec![], closed: None }, None) }
            Err(_) => { r["transport"] = json!("none"); r["verdict"] = json!("down"); r["why"] = json!(["no_answer"]); set(&|l| { l.phase = "done"; l.transport = "none" }); return r; }
        },
    };
    r["syn_ms"] = json!(syn_ms.map(r1));
    let transport = if matches!(link, Link::Du(_)) { "udp" } else { "tcp" };
    set(&|l| { l.phase = "game"; l.transport = transport });
    let base = Instant::now(); let now = || base.elapsed().as_secs_f64();
    let mut g = Game { players, ..Default::default() };
    let mut rng = Rng(rand_u64());
    let secs_f = secs as f64;
    // preamble: "DWRT" + version + players + seconds + flags + 2 reserved, then the hello
    let mut pre = b"DWRT".to_vec(); pre.extend_from_slice(&[1, players, secs.min(90) as u8, 0, 0, 0]);
    let sid = rand_u64();
    let mut hello = vec![0x15]; hello.extend_from_slice(&(sid as u32).to_le_bytes()); hello.extend_from_slice(&[0u8; 4]); hello.extend_from_slice(&(sid >> 8).to_le_bytes()); hello.push(0);
    g.hello_t = now(); pre.extend_from_slice(&frame(&hello));
    link.write(&pre);
    let (mut next_turn, mut next_ping, mut next_proxy) = (0.05, 0.1, rng.exp(proxy_rate(players)));
    let mut cut: Option<(f64, &'static str)> = None; g.last_rx = 0.0;
    let mut tl: Vec<Value> = Vec::new(); let mut sec_mark = 1.0;
    let (mut ti0, mut ri0, mut ki0) = (0usize, 0usize, 0usize);
    loop {
        let t = now();
        if cancel.load(Ordering::Relaxed) { r["cancelled"] = json!(true); break; }
        if g.end.is_some() { break; }
        if t > secs_f + 6.0 { break; }                     // the server's end frame did not come
        if t < secs_f - 0.2 {
            while next_turn <= t { let f = g.turn(t); link.write(&f); next_turn += 0.1; }
            while next_ping <= t { let f = g.ping(t); link.write(&f); next_ping += 0.25; }
            while next_proxy <= t { let sz = proxy_size(&mut rng); let f = g.proxy(t, sz); link.write(&f); next_proxy += rng.exp(proxy_rate(players)); }
        }
        let wait = (next_turn.min(next_ping) - now()).clamp(0.001, 0.01);
        link.pump(Duration::from_secs_f64(wait));
        let t = now();
        let inbox = link.inbox();
        if !inbox.is_empty() { g.last_rx = t; g.bytes_in += inbox.len() as u64; }
        let mut o = 0;
        let mut frames = Vec::new();
        while inbox.len() >= o + 2 { let n = (inbox[o] as usize) << 8 | inbox[o + 1] as usize; if inbox.len() < o + 2 + n { break; } frames.push(inbox[o + 2..o + 2 + n].to_vec()); o += 2 + n; }
        inbox.drain(..o);
        for f in frames { g.on_frame(&f, t); }
        if let Some(why) = link.closed() { if g.end.is_none() { cut = Some((t, why)); } break; }
        if t > 3.0 && t - g.last_rx > CUT_SILENCE { cut = Some((t, "silent")); break; }
        if t >= sec_mark {                                 // one point a second for the chart: the worst turn, the mean ping, pauses
            let tw: Vec<f64> = g.turn_lat[ti0..].to_vec(); let rw: Vec<f64> = g.rtt[ri0..].to_vec();
            let pz = g.ticks[ki0.saturating_sub(1).min(g.ticks.len())..].windows(2).filter(|w| w[1] - w[0] > GAP).count();
            tl.push(json!([sec_mark as u32, if tw.is_empty() { Value::Null } else { json!(r1(pct(&tw, 1.0))) }, if rw.is_empty() { Value::Null } else { json!(r1(avg(&rw))) }, pz]));
            ti0 = g.turn_lat.len(); ri0 = g.rtt.len(); ki0 = g.ticks.len(); sec_mark += 1.0;
            let gaps = g.ticks.windows(2).filter(|w| w[1] - w[0] > GAP).count() as u64;
            let (rl, tlast) = (g.rtt.last().copied(), if tw.is_empty() { None } else { Some(avg(&tw)) });
            set(&|l| { l.secs = t; if rl.is_some() { l.rtt_ms = rl; } if tlast.is_some() { l.turn_ms = tlast; } l.pauses = gaps; });
        }
    }
    let t_end = now();
    if let (Link::Du(du), None) = (&mut link, cut) {           // how our packets arrived at the gateway (its STATA; an old one is silent)
        let mut q = hdr(STATQ, du.cid); q.resize(7 + 400, 0);
        for _ in 0..4 { if du.gw.is_some() { break; } let _ = du.sock.send(&q); let until = Instant::now() + Duration::from_millis(250);
            while du.gw.is_none() && Instant::now() < until { du.pump(Duration::from_millis(20)); } }
    }
    link.close();
    // ---- the numbers
    let iv: Vec<f64> = g.ticks.windows(2).map(|w| (w[1] - w[0]) * 1000.0).collect();
    let gaps: Vec<f64> = iv.iter().cloned().filter(|x| *x > GAP * 1000.0).collect();
    let jitter = avg(&iv.iter().map(|x| (x - 100.0).abs()).collect::<Vec<_>>());
    let played = t_end.min(secs_f).max(0.1);
    let expected_ticks = (played * 10.0).floor();
    let missing_turns = g.turn_sent.keys().filter(|k| **k + 15 < g.turn_k).count();   // sent and never back (the last 1.5 s may be in flight)
    let missing_parts: u64 = g.proxy_sent.values().filter(|(t, _)| *t < played - 2.0).map(|(_, m)| m.count_ones() as u64).sum();
    r["secs"] = json!(r1(t_end)); r["players"] = json!(players);
    r["turn"] = stats(&g.turn_lat); r["turn"]["sent"] = json!(g.turn_k); r["turn"]["missing"] = json!(missing_turns);
    r["rtt"] = stats(&g.rtt); r["hello_ms"] = json!(g.hello_ms.map(r1));
    r["ticks"] = json!({"n": g.ticks.len(), "expected": expected_ticks, "pauses": gaps.len(), "max_gap_ms": r1(pct(&iv, 1.0)), "jitter_ms": r1(jitter),
        "vturns": g.vturns, "silent": g.silent});
    r["proxy"] = json!({"sent": g.proxy_k, "parts": g.parts_sent, "back": g.parts_ok, "wrong": g.parts_wrong, "missing": missing_parts,
        "rtt": stats(&g.proxy_rtt), "from_players": g.vproxy, "from_gaps": g.vproxy_gap, "big": g.vbig});
    r["tl"] = json!(tl);
    if let Some(e) = &g.end { r["server"] = e.clone(); }
    if let Some((at, why)) = cut { r["cut"] = json!({"at": r1(at), "why": why}); }
    if let Link::Du(du) = &link {
        let s = &du.st; let rx = s.rx.max(1) as f64;
        // up: what the gateway saw (holes + copies that filled one) - else our own guess from its acks (blind to copies)
        let gwn = |k: &str| du.gw.as_ref().and_then(|g| g[k].as_u64());
        // up: what the gateway counted (STATA up_lost: a packet that came only as a copy, or late into a hole) - an old gateway
        // says nothing: then our guess from its acks and our resends (blind to the holes copies fill)
        let (up_lost, up_src) = match gwn("up_lost") {
            Some(c) => (c, "gateway"), None => (du.up_holes.len().max(du.resent_seqs.len()) as u64, "acks") };
        let up_base = gwn("rx").unwrap_or(s.tx).max(1) as f64;
        r["du"] = json!({"ver": du.ver, "tx": s.tx, "rx": s.rx, "resent": s.resent, "copies": s.copies, "filled": s.filled,
            "up_lost": up_lost, "up_loss_pct": r1(up_lost as f64 * 100.0 / up_base), "up_from": up_src, "gw": du.gw.clone(),
            "down_lost": s.down_lost, "down_loss_pct": r1(s.down_lost as f64 * 100.0 / rx), "reordered": s.down_reordered,
            "reorder_pct": r1(s.down_reordered as f64 * 100.0 / rx), "srtt_ms": r1(du.srtt * 1000.0), "max_rtt_ms": s.max_rtt_ms,
            "pkts_in": s.pkts_in, "pkts_out": s.pkts_out, "kb_in": s.bytes_in / 1024, "kb_out": s.bytes_out / 1024, "storm": du.fuse, "budget_skip": s.budget_skip});
    }
    let (v, why) = verdict(&r);
    r["verdict"] = json!(v); r["why"] = json!(why);
    set(&|l| l.phase = "done");
    r
}

/// The verdict of one node from its numbers: "excellent" / "playable" / "laggy" / "down", and why (codes, the launcher words them).
/// The game is a lockstep at 10 turns a second: what spoils it is a turn coming late (the round trip and its spikes) and above all
/// a pause - every pause > 250 ms is a visible stall for everybody in the match.
pub fn verdict(r: &Value) -> (&'static str, Vec<&'static str>) {
    let f = |p: &str| r.pointer(p).and_then(|x| x.as_f64());
    if r["transport"] == "none" { return ("down", vec!["no_answer"]); }
    let mut why = vec![];
    if r["transport"] == "tcp" { why.push("tcp_only"); }
    let ticks = f("/ticks/n").unwrap_or(0.0); let exp = f("/ticks/expected").unwrap_or(1.0).max(1.0);
    if r.get("cut").map_or(false, |c| !c.is_null()) { why.insert(0, "cut"); return ("down", why); }
    if r.get("cancelled").is_some() { return ("down", vec!["cancelled"]); }
    if ticks < exp * 0.5 || r["turn"]["n"].as_u64().unwrap_or(0) == 0 { why.insert(0, "no_flow"); return ("down", why); }
    let mins = (f("/secs").unwrap_or(60.0) / 60.0).max(0.25);
    let pauses = f("/ticks/pauses").unwrap_or(0.0) + f("/server/gaps").unwrap_or(0.0);
    let max_gap = f("/ticks/max_gap_ms").unwrap_or(0.0).max(f("/server/max_gap_ms").unwrap_or(0.0));
    let rtt = f("/rtt/avg").unwrap_or(0.0); let rtt95 = f("/rtt/p95").unwrap_or(0.0);
    let loss = f("/du/up_loss_pct").unwrap_or(0.0).max(f("/du/down_loss_pct").unwrap_or(0.0));
    let jitter = f("/ticks/jitter_ms").unwrap_or(0.0);
    let lost_parts = f("/proxy/missing").unwrap_or(0.0) + f("/proxy/wrong").unwrap_or(0.0) + f("/turn/missing").unwrap_or(0.0);
    let mut bad = false; let mut meh = false;
    if rtt > 150.0 { why.push("high_ping"); bad = true; } else if rtt > 80.0 { why.push("ping"); meh = true; }
    if rtt95 > 250.0 { why.push("spikes"); bad = true; } else if rtt95 > rtt.max(1.0) * 1.6 && rtt95 > 60.0 { why.push("spikes"); meh = true; }
    if pauses / mins > 2.0 || max_gap > 1000.0 { why.push("pauses"); bad = true; } else if pauses > 0.0 { why.push("pauses"); meh = true; }
    if loss > 5.0 { why.push("loss"); bad = true; } else if loss > 1.0 { why.push("loss"); meh = true; }
    if jitter > 30.0 { why.push("jitter"); bad = true; } else if jitter > 15.0 { why.push("jitter"); meh = true; }
    if lost_parts > 0.0 { why.push("lost_msgs"); bad = true; }
    (if bad { "laggy" } else if meh || r["transport"] == "tcp" { "playable" } else { "excellent" }, why)
}

/// The node the matchmaker would take for this player alone (ladder _best_relay with Relay.dll's pings): of the usable nodes
/// (UDP answers and the stream check passes - Relay 18) with a ping above 0 ms, the lowest; a tie goes by the list order.
pub fn matchmaker_pick(rows: &[Value]) -> Option<usize> {
    let mut best: Option<(usize, i64)> = None;
    for (i, r) in rows.iter().enumerate() {
        let ms = r["ping"]["relay_ms"].as_i64().unwrap_or(-1);
        if !r["burst"]["usable"].as_bool().unwrap_or(false) || ms <= 0 { continue; }
        if best.map_or(true, |(_, b)| ms < b) { best = Some((i, ms)); }
    }
    best.map(|b| b.0)
}

/// Signs of a VPN, a blocking bypass or anything else on the way that answers or reshuffles for our servers.
pub fn hints(rows: &[Value]) -> Vec<Value> {
    let mut h = vec![];
    let ip = |r: &Value| r["ip"].as_str().unwrap_or("").to_string();
    let zero: Vec<String> = rows.iter().filter(|r| r["ping"]["best"].as_f64().map_or(false, |b| b < 1.0)).map(ip).collect();
    if !zero.is_empty() { h.push(json!({"code": "zero_ping", "nodes": zero})); }
    let udp_no: Vec<String> = rows.iter().filter(|r| r["ping"]["n"].as_u64() == Some(0) && r["transport"] != "udp" && r["tcp"]["connect_ms"].is_number()).map(ip).collect();
    if !udp_no.is_empty() { h.push(json!({"code": "udp_blocked", "nodes": udp_no})); }
    let reo: Vec<String> = rows.iter().filter(|r| r["du"]["reorder_pct"].as_f64().map_or(false, |p| p > 2.0)).map(ip).collect();
    if !reo.is_empty() { h.push(json!({"code": "reorder", "nodes": reo})); }
    let cut: Vec<String> = rows.iter().filter(|r| r["burst"]["got"].as_u64().map_or(false, |g| g > 0) && !r["burst"]["usable"].as_bool().unwrap_or(false)).map(ip).collect();
    if !cut.is_empty() { h.push(json!({"code": "stream_cut", "nodes": cut})); }
    let none: Vec<String> = rows.iter().filter(|r| r["transport"] == "none").map(ip).collect();
    if !none.is_empty() && none.len() == rows.len() { h.push(json!({"code": "all_down", "nodes": none})); }
    h
}

/// The test of all nodes at once (each in a thread of its own, the UDP bursts one at a time as Relay.dll's).
/// `progress` gets the live view about twice a second.
pub fn run(nodes: &[(Ipv4Addr, String)], port: u16, players: u8, secs: u32, cancel: &AtomicBool, progress: &dyn Fn(Value)) -> Value {
    let started = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let burst = Arc::new(Mutex::new(()));
    let ready = Arc::new(Ready::new(nodes.len()));
    let lives: Vec<Arc<Mutex<Live>>> = nodes.iter().map(|_| Arc::new(Mutex::new(Live { phase: "wait", ..Default::default() }))).collect();
    let cancel_flag = Arc::new(AtomicBool::new(false));
    let hs: Vec<_> = nodes.iter().zip(&lives).map(|((ip, _), live)| {
        let (ip, live, burst, c, ready) = (*ip, live.clone(), burst.clone(), cancel_flag.clone(), ready.clone());
        std::thread::spawn(move || run_node(ip, port, players, secs, &c, &burst, &live, &ready))
    }).collect();
    let t0 = Instant::now();
    while hs.iter().any(|h| !h.is_finished()) {
        if cancel.load(Ordering::Relaxed) { cancel_flag.store(true, Ordering::Relaxed); }
        let rows: Vec<Value> = nodes.iter().zip(&lives).map(|((ip, name), l)| {
            let l = l.lock().map(|x| x.clone()).unwrap_or_default();
            json!({"ip": ip.to_string(), "name": name, "phase": l.phase, "secs": r1(l.secs), "rtt": l.rtt_ms.map(r1), "turn": l.turn_ms.map(r1), "pauses": l.pauses, "transport": l.transport})
        }).collect();
        progress(json!({"elapsed": r1(t0.elapsed().as_secs_f64()), "secs": secs, "nodes": rows}));
        std::thread::sleep(Duration::from_millis(500));
    }
    let mut rows: Vec<Value> = hs.into_iter().zip(nodes).map(|(h, (ip, name))| {
        let mut r = h.join().unwrap_or_else(|_| json!({"ip": ip.to_string(), "transport": "none", "verdict": "down", "why": ["error"]}));
        r["name"] = json!(name); r
    }).collect();
    let pick = matchmaker_pick(&rows);
    if let Some(i) = pick { rows[i]["pick"] = json!(true); }
    let hints = hints(&rows);
    json!({"v": 1, "ts": started, "players": players, "mode": match players { 4 => "2v2", 6 => "3v3", _ => "1v1" }, "secs": secs, "port": port,
           "cancelled": cancel.load(Ordering::Relaxed), "pick": pick.map(|i| rows[i]["ip"].clone()), "hints": hints, "nodes": rows})
}

/// One line per node for logs and the console.
pub fn summary_lines(res: &Value) -> Vec<String> {
    let mut out = vec![format!("connection test {} ({} s){}", res["mode"].as_str().unwrap_or("?"), res["secs"], if res["vpn"] == true { ", VPN on" } else if res["vpn"] == false { ", no VPN" } else { "" })];
    for r in res["nodes"].as_array().into_iter().flatten() {
        let f = |p: &str| r.pointer(p).map(|v| v.to_string()).unwrap_or("-".into());
        out.push(format!("  {:<16} {:<10} {:<9} {} ping {} relay_ms {} burst {}/40 | rtt avg {} p95 {} max {} | turn avg {} p95 {} | pauses {} max {} jitter {} | loss up {}% down {}% reord {}% resent {} | proxy {}/{} wrong {} | {}{}",
            r["ip"].as_str().unwrap_or(""), r["name"].as_str().unwrap_or(""), r["verdict"].as_str().unwrap_or(""), r["transport"].as_str().unwrap_or(""),
            f("/ping/best"), f("/ping/relay_ms"), f("/burst/got"), f("/rtt/avg"), f("/rtt/p95"), f("/rtt/max"), f("/turn/avg"), f("/turn/p95"),
            f("/ticks/pauses"), f("/ticks/max_gap_ms"), f("/ticks/jitter_ms"), f("/du/up_loss_pct"), f("/du/down_loss_pct"), f("/du/reorder_pct"), f("/du/resent"),
            f("/proxy/back"), f("/proxy/parts"), f("/proxy/wrong"), r["why"], if r["pick"] == true { " <- matchmaker" } else { "" }));
    }
    let h: Vec<String> = res["hints"].as_array().into_iter().flatten().map(|x| format!("{} {}", x["code"].as_str().unwrap_or(""), x["nodes"])).collect();
    if !h.is_empty() { out.push(format!("  hints: {}", h.join("; "))); }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(ip: &str, ms: i64, usable: bool) -> Value { json!({"ip": ip, "ping": {"relay_ms": ms, "best": ms as f64, "n": 5}, "burst": {"usable": usable, "got": if usable { 40 } else { 10 }}}) }

    #[test]
    fn matchmaker_takes_the_lowest_usable_above_zero() {
        let rows = vec![row("a", 40, true), row("b", 0, true), row("c", 20, false), row("d", 30, true), row("e", 30, true)];
        assert_eq!(matchmaker_pick(&rows), Some(3), "0 ms = not reached, unusable skipped, a tie by order");
        assert_eq!(matchmaker_pick(&rows[1..3]), None);
        let h = hints(&rows);
        assert!(h.iter().any(|x| x["code"] == "zero_ping" && x["nodes"] == json!(["b"])));
        assert!(h.iter().any(|x| x["code"] == "stream_cut" && x["nodes"] == json!(["c"])));
    }

    fn game(rtt: f64, p95: f64, pauses: u64, loss: f64) -> Value {
        json!({"transport": "udp", "secs": 60.0, "ticks": {"n": 600, "expected": 600, "pauses": pauses, "max_gap_ms": 120, "jitter_ms": 4},
               "turn": {"n": 590, "missing": 0}, "rtt": {"avg": rtt, "p95": p95}, "du": {"up_loss_pct": loss, "down_loss_pct": 0.0}, "proxy": {"missing": 0, "wrong": 0}})
    }

    #[test]
    fn verdicts() {
        assert_eq!(verdict(&game(30.0, 40.0, 0, 0.0)).0, "excellent");
        assert_eq!(verdict(&game(100.0, 120.0, 0, 0.0)).0, "playable");
        assert_eq!(verdict(&game(30.0, 40.0, 1, 0.0)).0, "playable");
        assert_eq!(verdict(&game(30.0, 40.0, 5, 0.0)).0, "laggy");
        assert_eq!(verdict(&game(30.0, 40.0, 0, 7.0)).0, "laggy");
        assert_eq!(verdict(&game(200.0, 220.0, 0, 0.0)).0, "laggy");
        let mut c = game(30.0, 40.0, 0, 0.0); c["cut"] = json!({"at": 20.0, "why": "dead"});
        assert_eq!(verdict(&c), ("down", vec!["cut"]));
        let mut t = game(30.0, 40.0, 0, 0.0); t["transport"] = json!("tcp");
        assert_eq!(verdict(&t), ("playable", vec!["tcp_only"]));
        assert_eq!(verdict(&json!({"transport": "none"})).0, "down");
    }

    /// Two DU ends over loopback with a lossy "wire" in between: everything arrives in order, the losses are counted.
    #[test]
    fn du_delivers_through_loss() {
        let a = UdpSocket::bind("127.0.0.1:0").unwrap(); let b = UdpSocket::bind("127.0.0.1:0").unwrap();
        a.connect(b.local_addr().unwrap()).unwrap(); b.connect(a.local_addr().unwrap()).unwrap();
        let base = Instant::now();
        let mut x = Du::new(a, base, 7, 2, 0.0); let mut y = Du::new(b, base, 7, 2, 0.0);
        let mut rng = Rng(12345); let mut sent = 0u32; let mut buf = [0u8; 2048];
        let t_end = Instant::now() + Duration::from_secs(4);
        while Instant::now() < t_end {
            if sent < 300 { x.write(&sent.to_le_bytes()); sent += 1; }
            for d in [&mut x, &mut y] {
                let _ = d.sock.set_nonblocking(true);
                while let Ok(n) = d.sock.recv(&mut buf) {
                    if rng.f() < 0.1 { continue; }               // 10 % lost on the way, both ways
                    let now = d.now(); d.datagram(&buf[..n], now);
                }
                let now = d.now(); d.tick(now);
            }
            std::thread::sleep(Duration::from_millis(3));
            if y.inbox.len() >= 1200 && x.unacked.is_empty() { break; }
        }
        assert_eq!(y.inbox.len(), 1200, "all 300 records arrived");
        for (i, c) in y.inbox.chunks(4).enumerate() { assert_eq!(u32le(c), i as u32, "in order"); }
        assert!(x.closed.is_none() && y.closed.is_none());
        assert!(x.st.resent + x.st.copies > 0, "the losses were repaired: {:?}", x.st);
        let lost = y.st.down_lost as f64 / y.st.rx as f64;
        assert!(lost > 0.04 && lost < 0.2, "the receiver counts ~10 % lost: {:?}", y.st);
    }
}
