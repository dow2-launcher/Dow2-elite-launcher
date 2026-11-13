//! elite-cli [--game DIR] [--mirror URL]... [--channel ID | --version V] [--verify] [status|update|channels]
//! elite-cli nettest [--mode 1v1|2v2|3v3] [--secs N] [--port P] [--node IP[=name]]... [--json FILE]   (the launcher's connection test)
//! elite-cli replay <file.rec>...   what the launcher's Replays tab reads from a replay, one JSON line per file
use elite_core::{config::LauncherConfig, game, net::Mirrors, update};

/// Default mirrors, set at build time like the launcher (ELITE_MIRRORS, separated by `;`).
const DEFAULT_MIRRORS: &str = match option_env!("ELITE_MIRRORS") { Some(v) => v, None => "" };

fn main() {
    let a: Vec<String> = std::env::args().skip(1).collect();
    if a.first().map(String::as_str) == Some("nettest") { return nettest(&a[1..]); }
    if a.first().map(String::as_str) == Some("replay") {
        for f in &a[1..] {
            match elite_core::replay::parse_file(std::path::Path::new(f)) {
                Some(r) => println!("{}", serde_json::to_string(&r).unwrap_or_default()),
                None => println!("{}", serde_json::json!({"file": f, "error": "not a replay"})),
            }
        }
        return;
    }
    let (mut dir, mut mirrors, mut channel, mut version, mut verify, mut cmd) = (None, Vec::new(), None, None, false, "status".to_string());
    let mut i = 0;
    while i < a.len() {
        match a[i].as_str() {
            "--game" => { dir = a.get(i + 1).cloned(); i += 1 }
            "--mirror" => { if let Some(m) = a.get(i + 1) { mirrors.push(m.clone()) } i += 1 }
            "--channel" => { channel = a.get(i + 1).cloned(); i += 1 }
            "--version" => { version = a.get(i + 1).cloned(); i += 1 }
            "--verify" => verify = true,
            c => cmd = c.to_string(),
        }
        i += 1;
    }
    let cfg0 = LauncherConfig::default();
    let dir = dir.map(std::path::PathBuf::from).or_else(|| game::find_game(&cfg0.game.folder, &cfg0.game.marker));
    let Some(dir) = dir else { eprintln!("game folder not found, use --game"); std::process::exit(2) };
    if mirrors.is_empty() {
        mirrors = DEFAULT_MIRRORS.split(';').map(str::trim).filter(|x| !x.is_empty()).map(String::from).collect();
    }
    let m = Mirrors::new(mirrors.clone());
    let (cfg, _, _) = match update::fetch_config(&m) {
        Ok(c) => c,
        Err(e) => { eprintln!("config: {e}"); std::process::exit(3) }
    };
    let m = Mirrors::new(mirrors.into_iter().chain(cfg.mirrors.iter().cloned()).collect());
    let g = update::Game::new(&dir);
    let st = g.load_state();
    println!("Game: {}\nInstalled: {} ({})", dir.display(), if st.version.is_empty() { "-" } else { &st.version }, st.channel);
    for c in &cfg.channels {
        println!("  channel {:<8} -> {}", c.id, c.version);
    }
    if cmd != "update" {
        return;
    }
    let ch = channel.unwrap_or_else(|| if st.channel.is_empty() { cfg.channels.iter().find(|c| c.default).map(|c| c.id.clone()).unwrap_or_default() } else { st.channel.clone() });
    let ver = version.unwrap_or_else(|| cfg.channels.iter().find(|c| c.id == ch).map(|c| c.version.clone()).unwrap_or_default());
    let man = match update::load_manifest(&g, &m, &ver) {
        Ok(x) => x,
        Err(e) => { eprintln!("{e}"); std::process::exit(4) }
    };
    println!("Updating to {ver} [{ch}] via {}", m.current_host());
    let mut last = String::new();
    let r = update::apply(&g, &m, &man, &update::Options { verify_all: verify, cache_limit: 6 << 30, channel: ch }, &mut |p| {
        if p.phase == "downloading" && p.file != last {
            println!("  {}", p.file);
            last = p.file.clone();
        }
    });
    match r {
        Ok(s) => println!("Done: {} updated, {} removed. Downloaded {:.2} MB, reused {:.1} MB, from cache {:.1} MB", s.updated, s.removed, s.downloaded as f64 / 1e6, s.reused as f64 / 1e6, s.from_cache as f64 / 1e6),
        Err(e) => { eprintln!("Failed: {e}"); std::process::exit(5) }
    }
}

/// The launcher's connection test from a console (the same code as the launcher's button): our four nodes by default.
fn nettest(a: &[String]) {
    use elite_core::nettest;
    let (mut mode, mut secs, mut port, mut nodes, mut out) = ("1v1".to_string(), nettest::SECS_DEFAULT, nettest::GAME_PORT, Vec::new(), None);
    let mut i = 0;
    while i < a.len() {
        let v = a.get(i + 1).cloned().unwrap_or_default();
        match a[i].as_str() {
            "--mode" => mode = v, "--secs" => secs = v.parse().unwrap_or(secs), "--port" => port = v.parse().unwrap_or(port),
            "--json" => out = Some(v),
            "--node" => { let (ip, name) = v.split_once('=').unwrap_or((&v, "")); if let Ok(ip) = ip.parse() { nodes.push((ip, name.to_string())); } }
            x => { eprintln!("unknown {x}"); std::process::exit(2) }
        }
        i += 2;
    }
    if nodes.is_empty() { nodes = nettest::KNOWN_NODES.iter().map(|(ip, n)| (ip.parse().unwrap(), n.to_string())).collect(); }
    let cancel = std::sync::atomic::AtomicBool::new(false);
    let res = nettest::run(&nodes, port, nettest::players_of(&mode), secs, &cancel, &|p| {
        let s: Vec<String> = p["nodes"].as_array().into_iter().flatten().map(|n| format!("{} {} {}", n["ip"].as_str().unwrap_or(""), n["phase"].as_str().unwrap_or(""), n["rtt"])).collect();
        eprint!("\r{:>5}s  {}   ", p["elapsed"], s.join(" | "));
    });
    eprintln!();
    for l in nettest::summary_lines(&res) { println!("{l}"); }
    if let Some(f) = out { let _ = std::fs::write(f, serde_json::to_string_pretty(&res).unwrap_or_default()); }
}
