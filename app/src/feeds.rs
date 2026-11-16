//! What the pages read from our servers: the lobbies and the matches on, the Events banner, the release news, the usage count.
//! Split out of main.rs (1.6.17): the items as they were; main.rs keeps the app's state, settings, config and main().
use super::*;

/// 1.3.15 (owner 02.11.2026): the open lobbies - Relic's list of custom games being set up, from our ladder server
/// (/ladder/api/rooms: map, mode, game Elite / vanilla / other, players with race, hero, flag and rating).
#[tauri::command]
pub async fn rooms_live() -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut last = "the ladder server is not configured in this build".to_string();
        for host in fb_hosts() {
            match ureq::get(&format!("{host}/ladder/api/rooms")).timeout(Duration::from_secs(10)).call() {
                Ok(r) => {
                    let mut v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).map_err(|e| e.to_string())?;
                    v["host"] = json!(host);
                    return Ok(v);
                }
                Err(e) => { api_err(&host, &e); last = e.to_string(); }
            }
        }
        Err(last)
    }).await.map_err(|e| e.to_string())?
}

/// The Online block without the stream (a ladder server that has no /c/live yet): who is looking for a game and the
/// matches, from /ladder/api/mm/live; the window joins it with /c/online (who has the launcher open).
#[tauri::command]
pub async fn mm_live() -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut last = "the ladder server is not configured in this build".to_string();
        for host in fb_hosts() {
            match HTTP.get(&format!("{host}/ladder/api/mm/live")).timeout(Duration::from_secs(10)).call() {
                Ok(r) => {
                    let mut v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).map_err(|e| e.to_string())?;
                    v["host"] = json!(host);
                    return Ok(v);
                }
                Err(e) => { api_err(&host, &e); last = e.to_string(); }
            }
        }
        Err(last)
    }).await.map_err(|e| e.to_string())?
}

/// The events banner (siritos 02.11: kept in git - events.json of this repository, edited and pushed to main): read from
/// GitHub, then jsDelivr (GitHub is blocked in places), at the start and every 15 minutes by the window; the last good
/// copy is kept for offline; never read - the copy built into this launcher. launcher.json "events", when the owner
/// sets them, still go first (the window decides).
pub(crate) const EVENTS_URLS: [&str; 2] = [
    "https://raw.githubusercontent.com/dow2-launcher/Dow2-elite-launcher/main/events.json",
    "https://cdn.jsdelivr.net/gh/dow2-launcher/Dow2-elite-launcher@main/events.json",
];
pub(crate) const EVENTS_BUILT_IN: &str = include_str!("../../events.json");
#[tauri::command]
pub async fn events_get() -> Value {
    tauri::async_runtime::spawn_blocking(|| {
        let ok = |v: &Value| v["events"].is_array();
        for url in EVENTS_URLS {
            let Ok(r) = HTTP.get(url).timeout(Duration::from_secs(10)).call() else { continue };
            let Ok(text) = r.into_string() else { continue };
            if let Ok(v) = serde_json::from_str::<Value>(&text) {
                if ok(&v) {
                    let _ = std::fs::write(data_dir().join("events.json"), &text);
                    return json!({"events": v["events"], "source": url});
                }
            }
        }
        if let Some(v) = std::fs::read(data_dir().join("events.json")).ok().and_then(|b| serde_json::from_slice::<Value>(&b).ok()).filter(ok) {
            return json!({"events": v["events"], "source": "cache"});
        }
        let v: Value = serde_json::from_str(EVENTS_BUILT_IN).unwrap_or_default();
        json!({"events": if ok(&v) { v["events"].clone() } else { json!([]) }, "source": "built-in"})
    }).await.unwrap_or_else(|_| json!({"events": []}))
}

/// Repositories whose GitHub Releases become news: CI makes every release from the changelog,
/// so a new launcher or patch set shows up in the news without anyone writing it by hand.
pub(crate) const NEWS_REPOS: [&str; 2] = ["dow2-launcher/Dow2-elite-launcher", "dow2-launcher/Dow2-patches"];

/// The latest releases of NEWS_REPOS as news: {date, title, items, url}, newest first.
/// None when GitHub can't be reached: the cached copy (news.json) stays.
pub(crate) fn fetch_release_news() -> Option<Vec<Value>> {
    let mut out = Vec::new();
    for repo in NEWS_REPOS {
        let body = HTTP.get(&format!("https://api.github.com/repos/{repo}/releases?per_page=4"))
            .set("Accept", "application/vnd.github+json")
            .set("User-Agent", &format!("EliteLauncher/{LAUNCHER_VERSION}"))
            .timeout(Duration::from_secs(15))
            .call()
            .ok()?
            .into_string()
            .ok()?;
        let list: Vec<Value> = serde_json::from_str(&body).ok()?;
        for r in list.iter().filter(|r| r["draft"] != true && r["prerelease"] != true) {
            let s = |k: &str| r[k].as_str().unwrap_or("").to_string();
            let title = if s("name").is_empty() { s("tag_name") } else { s("name") };
            // 02.11 (siritos): no link - a release page on GitHub is not news for a player; the full time and the repo
            // to order two releases of one day and to say "Launcher" / "Add-ons" in the player's language
            out.push(json!({
                "date": s("published_at").chars().take(10).collect::<String>(),
                "ts": s("published_at"),
                "title": title,
                "version": s("tag_name").trim_start_matches('v'),
                "kind": if repo.ends_with("Dow2-patches") { "patches" } else { "launcher" },
                "items": release_items(&s("body")),
                "items_ru": release_items(&release_ru(repo, s("tag_name").trim_start_matches('v'))),
            }));
        }
    }
    out.sort_by(|a, b| b["ts"].as_str().cmp(&a["ts"].as_str()));
    Some(out)
}

/// The Russian notes of a release (siritos 02.11: releases in en and ru, Russian when the launcher speaks Russian):
/// changelog/<version>/ru.md of the repository on main - GitHub, then jsDelivr where GitHub is blocked; "" when there is
/// none (the window shows the English body then).
pub(crate) fn release_ru(repo: &str, version: &str) -> String {
    if version.is_empty() || !version.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-') { return String::new(); }
    for url in [format!("https://raw.githubusercontent.com/{repo}/main/changelog/{version}/ru.md"),
                format!("https://cdn.jsdelivr.net/gh/{repo}@main/changelog/{version}/ru.md")] {
        match HTTP.get(&url).timeout(Duration::from_secs(8)).call() {
            Ok(r) => return r.into_string().unwrap_or_default(),
            Err(ureq::Error::Status(404, _)) => return String::new(),   // no Russian notes for this version
            Err(_) => continue,                                         // GitHub not reachable: the next host
        }
    }
    String::new()
}

/// The list items of a release body ("- …", continuation lines joined), markdown cut down to plain text.
pub(crate) fn release_items(body: &str) -> Vec<String> {
    let mut items: Vec<String> = Vec::new();
    let mut in_item = false;
    for line in body.lines() {
        let l = line.trim();
        if let Some(x) = l.strip_prefix("- ").or_else(|| l.strip_prefix("* ")) {
            items.push(x.to_string());
            in_item = true;
        } else if in_item && !l.is_empty() && line.starts_with(' ') {
            if let Some(last) = items.last_mut() {
                last.push(' ');
                last.push_str(l);
            }
        } else {
            in_item = false;
        }
    }
    items.iter().map(|i| plain_text(i)).take(8).collect()
}

/// `[text](url)` → text, no `**` or backticks: the window shows these as text, not HTML.
pub(crate) fn plain_text(md: &str) -> String {
    let mut out = String::new();
    let mut rest = md;
    while let Some(open) = rest.find('[') {
        let Some(mid) = rest[open..].find("](").map(|i| open + i) else { break };
        let Some(close) = rest[mid..].find(')').map(|i| mid + i) else { break };
        out.push_str(&rest[..open]);
        out.push_str(&rest[open + 1..mid]);
        rest = &rest[close + 1..];
    }
    out.push_str(rest);
    out.replace("**", "").replace('`', "")
}

/// Anonymous usage count: at most one request per day, sent to the log hosts, carrying only
/// sha256(random local secret + day number) cut to 128 bits, the launcher version, the OS and the installed Elite version.
/// The hash changes every day, so even the server can't tell whether two days came from the same install.
/// No hardware, Steam or account data, no game folder, no names. Off in Settings.
pub(crate) fn usage_ping(app: &AppHandle) {
    use sha2::{Digest, Sha256};
    let st = app.state::<App>();
    let day = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() / 86400).unwrap_or(0);
    let secret = {
        let mut s = st.settings.lock().unwrap();
        if !s.usage_stats.unwrap_or(true) || s.ping_day == day || day == 0 { return; }
        if s.ping_secret.len() != 64 {
            let mut b = [0u8; 32];
            if getrandom::getrandom(&mut b).is_err() { return; }
            s.ping_secret = b.iter().map(|x| format!("{x:02x}")).collect();
            save_settings(&s);
        }
        s.ping_secret.clone()
    };
    let mut h = Sha256::new();
    h.update(secret.as_bytes());
    h.update(day.to_le_bytes());
    let hash: String = h.finalize().iter().take(16).map(|x| format!("{x:02x}")).collect();
    let elite = game_dir(&st).map(|d| update::Game::new(d).load_state().version).filter(|v| !v.is_empty()).unwrap_or_else(|| "none".into());
    let elite: String = elite.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '.' || *c == '-').take(16).collect();
    for host in fb_hosts() {
        let url = format!("{host}/stats/api/ping?h={hash}&v={LAUNCHER_VERSION}&os={}&elite={elite}", os_name());
        if HTTP.get(&url).timeout(Duration::from_secs(15)).call().is_ok() {
            let mut s = st.settings.lock().unwrap();
            s.ping_day = day;
            save_settings(&s);
            return;
        }
    }
}
