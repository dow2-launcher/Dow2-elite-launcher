//! The game's replays (.rec, Documents\My Games\Dawn of War II - Retribution\Playback): what is in a file without
//! playing it - the map, the players with their teams, races, heroes and army levels, the length, when it was recorded,
//! the game version it needs and the number of commands. The Replays tab of the launcher (1.6.0, owner 13.11.2026) shows it for the
//! player's own files; the shared pool on our server parses the same way (dow2-ladder replay/dow2rec.py).
//!
//! The file: "DOW2_REC" at 12, the recording time (UTF-16) at 0x14, two "Relic Chunky" trees (FOLDPOST/DATADATA: the
//! number of ticks; DATASDSC: the map; FOLDINFO/FOLDGPLY/DATAINFO: one per slot), then the stream of commands (records:
//! type 0 = a tick with the players' commands, type 1 = a chat line). A tick is 1/10 s.
//! Bytes 4..7 are a checksum of the game data the match ran on: one value per Elite release (and per test build), one for
//! vanilla - the server's table names them (GET /replay/api/vtable).
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};

#[derive(Serialize, Clone, Debug, Default)]
pub struct Player {
    pub name: String,
    /// 0 host / 3 player / 5 observer (slot type of the file)
    pub kind: u32,
    pub team: u32,
    pub race: String,
    pub hero: u32,
    pub level: u32,
    pub profile: u32,
}

#[derive(Serialize, Clone, Debug, Default)]
pub struct Info {
    /// sha256 of the file, first 16 hex: the id the pool knows the file by
    pub id: String,
    pub file: String,
    pub size: u64,
    /// the file's time, seconds since 1970
    pub mtime: u64,
    pub recorded: String,
    pub map: String,
    pub players: Vec<Player>,
    pub observers: Vec<String>,
    pub ticks: u32,
    pub duration: u32,
    /// "1v1" .. "4v4", "ffa", "?"
    pub mode: String,
    /// the game data checksum (8 hex), the version is looked up by it
    pub vhash: String,
    pub actions: u32,
}

fn u32le(d: &[u8], o: usize) -> Option<u32> { d.get(o..o + 4).map(|b| u32::from_le_bytes([b[0], b[1], b[2], b[3]])) }
fn utf16(d: &[u8], o: usize, chars: usize) -> Option<String> {
    let b = d.get(o..o.checked_add(chars.checked_mul(2)?)?)?;
    let w: Vec<u16> = b.chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
    Some(String::from_utf16_lossy(&w))
}

struct Rd<'a> { d: &'a [u8], o: usize }
impl<'a> Rd<'a> {
    fn u32(&mut self) -> Option<u32> { let v = u32le(self.d, self.o)?; self.o += 4; Some(v) }
    fn skip(&mut self, n: usize) { self.o = self.o.saturating_add(n); }
    fn utf16(&mut self) -> Option<String> { let n = self.u32()? as usize; if n > 4096 { return None; } let s = utf16(self.d, self.o, n)?; self.o += n * 2; Some(s) }
    fn ascii(&mut self) -> Option<String> {
        let n = self.u32()? as usize; if n > 4096 { return None; }
        let b = self.d.get(self.o..self.o + n)?; self.o += n;
        Some(b.iter().map(|&c| c as char).collect())
    }
}

/// One level of a chunky tree: (type "FOLDINFO", payload offset, payload size).
fn chunks(d: &[u8], mut off: usize, end: usize) -> Vec<(String, usize, usize)> {
    let mut out = Vec::new();
    while off + 28 <= end.min(d.len()) {
        let tid = &d[off..off + 8];
        if &tid[..4] != b"FOLD" && &tid[..4] != b"DATA" { break; }
        let (Some(size), Some(nlen)) = (u32le(d, off + 12), u32le(d, off + 16)) else { break };
        let payload = off + 28 + nlen as usize;
        if payload + size as usize > d.len() { break; }
        out.push((String::from_utf8_lossy(tid).into_owned(), payload, size as usize));
        off = payload + size as usize;
    }
    out
}
fn find(d: &[u8], what: &[u8], from: usize) -> Option<usize> {
    d.get(from..)?.windows(what.len()).position(|w| w == what).map(|p| p + from)
}

pub fn is_replay(d: &[u8]) -> bool { d.get(12..20) == Some(b"DOW2_REC") }

/// The id the pool knows a file by: sha256, first 16 hex.
pub fn file_id(d: &[u8]) -> String { Sha256::digest(d).iter().take(8).map(|b| format!("{b:02x}")).collect() }

/// Parse a replay held in memory. None: not a replay of this game.
pub fn parse(d: &[u8]) -> Option<Info> {
    if !is_replay(d) { return None; }
    let mut r = Info { vhash: format!("{:08x}", u32le(d, 4)?), ..Default::default() };
    // the recording time: UTF-16 text right after the magic
    let mut w = Vec::new();
    let mut o = 0x14;
    while o + 1 < d.len().min(0x60) && (0x20..0x7f).contains(&d[o]) && d[o + 1] == 0 { w.push(d[o] as u16); o += 2; }
    r.recorded = String::from_utf16_lossy(&w);
    const CH: &[u8] = b"Relic Chunky\r\n\x1a\x00";
    let c1 = find(d, CH, 0)?;
    for (tid, po, ps) in chunks(d, c1 + u32le(d, c1 + 24)? as usize, d.len()).into_iter().take(1) {
        if tid == "FOLDPOST" {
            for (t2, po2, _) in chunks(d, po, po + ps) { if t2 == "DATADATA" { r.ticks = u32le(d, po2).unwrap_or(0); } }
        }
    }
    let c2 = find(d, CH, c1 + 16)?;
    let mut stream = None;
    for (tid, po, ps) in chunks(d, c2 + u32le(d, c2 + 24)? as usize, d.len()) {
        if tid == "DATASDSC" {
            let mut rd = Rd { d, o: po };
            rd.skip(4);
            let _built = rd.utf16();
            rd.skip(4);
            if d.get(rd.o..rd.o + 4) == Some(b"DOW2") {
                rd.skip(4);
                let m = rd.ascii().unwrap_or_default();
                r.map = m.replace('/', "\\").rsplit('\\').next().unwrap_or("").to_ascii_lowercase();
            }
        } else if tid == "FOLDINFO" {
            for (t2, po2, ps2) in chunks(d, po, po + ps) {
                if t2 != "FOLDGPLY" { continue; }
                for (t3, po3, _) in chunks(d, po2, po2 + ps2) {
                    if t3 != "DATAINFO" { continue; }
                    let mut rd = Rd { d, o: po3 };
                    let name = rd.utf16().unwrap_or_default();
                    let kind = rd.u32().unwrap_or(7);
                    let team = rd.u32().unwrap_or(0);
                    let race = rd.ascii().unwrap_or_default();
                    if race.is_empty() {
                        if kind == 5 && !name.is_empty() { r.observers.push(name); }
                        continue;
                    }
                    let profile = rd.u32().unwrap_or(0);
                    rd.skip(4);
                    let level = rd.u32().unwrap_or(0);
                    rd.skip(8);
                    let hero = rd.u32().unwrap_or(0);
                    r.players.push(Player { name, kind, team, race, hero, level, profile });
                }
            }
            stream = Some(po + ps);
        }
    }
    let teams: std::collections::BTreeSet<u32> = r.players.iter().map(|p| p.team).collect();
    let per = (r.players.len() / teams.len().max(1)).max(1);
    r.mode = match teams.len() { 2 => format!("{per}v{per}"), 0 | 1 => "?".into(), _ => "ffa".into() };
    // the command stream: the number of commands (type 1 records are chat lines in a layout not decoded yet - skipped)
    if let Some(mut o) = stream {
        let mut last_tick = 0u32;
        while o + 8 <= d.len() {
            let (Some(kind), Some(len)) = (u32le(d, o), u32le(d, o + 4)) else { break };
            let start = o + 8;
            let end = start.saturating_add(len as usize);
            if end > d.len() { break; }
            match kind {
                1 => {}
                0 => {
                    let mut p = start + 1;
                    last_tick = u32le(d, p).unwrap_or(last_tick);
                    p += 4 + 8;
                    let nb = u32le(d, p).unwrap_or(0); p += 4;
                    for _ in 0..nb.min(64) {
                        p += 8;
                        let Some(bl) = u32le(d, p) else { break };
                        p += 5;
                        let bend = (p + bl as usize).min(end);
                        while p < bend {
                            let al = d[p] as usize;
                            if al < 8 { break; }
                            r.actions += 1;
                            p += al;
                        }
                        p = bend;
                    }
                }
                _ => break,
            }
            o = end;
        }
        if r.ticks == 0 { r.ticks = last_tick; }
    }
    r.duration = r.ticks / 10;
    Some(r)
}

/// Parse a file; `id`, `file`, `size`, `mtime` filled from it.
pub fn parse_file(p: &Path) -> Option<Info> {
    let d = std::fs::read(p).ok()?;
    let mut r = parse(&d)?;
    r.id = file_id(&d);
    r.file = p.file_name()?.to_string_lossy().into_owned();
    r.size = d.len() as u64;
    r.mtime = std::fs::metadata(p).and_then(|m| m.modified()).ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok()).map_or(0, |x| x.as_secs());
    Some(r)
}

/// The game's replay folder: <Documents>\My Games\Dawn of War II - Retribution\Playback (Documents as the game sees it).
pub fn playback_dir() -> Option<PathBuf> {
    crate::game::documents_dir().map(|d| d.join("My Games").join(crate::docscheck::GAME_FOLDER).join("Playback"))
}

/// A name for a downloaded replay in the folder: only letters, digits, - _ . [ ] and spaces, ".rec" at the end, and not
/// one that is there already ("name (2).rec").
pub fn free_name(dir: &Path, want: &str) -> PathBuf {
    let base: String = want.chars().map(|c| if c.is_alphanumeric() || "-_.[] ".contains(c) { c } else { '_' }).take(100).collect();
    let base = base.trim().trim_end_matches(".rec").trim_end_matches(".REC").trim_matches('.').to_string();
    let base = if base.is_empty() { "replay".to_string() } else { base };
    let mut p = dir.join(format!("{base}.rec"));
    let mut n = 2;
    while p.exists() { p = dir.join(format!("{base} ({n}).rec")); n += 1; }
    p
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn not_a_replay() {
        assert!(parse(b"hello").is_none());
        assert!(parse(&[0u8; 64]).is_none());
    }

    #[test]
    fn free_names() {
        let d = std::env::temp_dir().join(format!("elite_rec_test_{}", std::process::id()));
        std::fs::create_dir_all(&d).unwrap();
        assert_eq!(free_name(&d, "a/b:c.rec").file_name().unwrap(), "a_b_c.rec");
        std::fs::write(d.join("x.rec"), b"1").unwrap();
        assert_eq!(free_name(&d, "x.rec").file_name().unwrap(), "x (2).rec");
        assert_eq!(free_name(&d, "").file_name().unwrap(), "replay.rec");
        std::fs::remove_dir_all(&d).unwrap();
    }

    /// ELITE_TEST_REC=<a .rec file> cargo test -p elite-core replay: the header of a real replay
    #[test]
    fn real_file() {
        let Ok(p) = std::env::var("ELITE_TEST_REC") else { return };
        let r = parse_file(Path::new(&p)).expect("a replay");
        assert!(!r.map.is_empty() && !r.players.is_empty() && r.ticks > 0, "{r:?}");
        eprintln!("{}", serde_json::to_string_pretty(&r).unwrap());
    }
}
