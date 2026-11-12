//! The Codex tab (1.5.8, owner 12.11.2026 - the testers asked): a reference of the installed Elite version - squads, heroes,
//! weapons, abilities, buildings, economy. It is a static offline site built from the version's attribute files (RU/EN,
//! search, compare), published per Elite version on the data mirrors next to the versions' files, so a new Elite patch
//! brings its own Codex without a new launcher:
//!
//! * `<mirror>wiki/index.json` - `{"wikis": [{"id": "3.2.1", "elite": ["3.2.1"], "title": "Elite 3.2.1", "built": "...",
//!   "archive": "3.2.1/site-<sha12>.tar.gz", "sha256": "...", "size": N}]}`; an entry covers the Elite versions in `elite`
//!   (compared like the rooms compare them: 3.2.1.0.0 = 3.2.1);
//! * the archive: the site as a .tar.gz, its name changes with its content (a mirror's cache never mixes two builds).
//!
//! The launcher asks for it when the tab is opened: any mirror, the best first (reach.rs, like every download), checks the
//! SHA-256, unpacks it into `<data>/wiki/<id>/` and keeps it there for offline use (the last index too). The window shows it
//! in a frame through the launcher's own scheme `codex://` (Windows: http://codex.localhost/), served from that folder only.
//! The site loads nothing from outside; the frame is another origin than the window, with no access to the launcher's
//! commands, and every page goes out with a CSP that forbids any connection.

use crate::{data_dir, data_note, mirrors, App};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::io::Read;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

/// The scheme of the frame (registered in main.rs).
pub const SCHEME: &str = "codex";
const ARCHIVE_MAX: u64 = 64 << 20;
const UNPACK_MAX: u64 = 256 << 20;
const FILES_MAX: usize = 20_000;
/// One download / unpack at a time (two clicks on the tab, two windows of the same run).
static BUSY: Mutex<()> = Mutex::new(());

fn root() -> PathBuf { data_dir().join("wiki") }

/// Where the window finds a page of a Codex folder: the custom scheme as the platform's webview names it.
fn base_url() -> String {
    if cfg!(windows) { format!("http://{SCHEME}.localhost/") } else { format!("{SCHEME}://localhost/") }
}

/// An Elite version as the rooms compare them (app.js verSame): the numbers, trailing zero parts dropped - "3.2.1.0.0" and
/// "3.2.1" are one version. Not a number ("igrework-1"): the name itself.
fn ver_key(v: &str) -> String {
    let v = v.trim();
    if !v.starts_with(|c: char| c.is_ascii_digit()) { return v.to_ascii_lowercase(); }
    let mut p: Vec<u64> = v.split(|c: char| !c.is_ascii_digit()).filter(|x| !x.is_empty()).map(|x| x.parse().unwrap_or(0)).collect();
    while p.len() > 1 && p.last() == Some(&0) { p.pop(); }
    p.iter().map(|x| x.to_string()).collect::<Vec<_>>().join(".")
}

fn safe_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 40 && !id.starts_with('.') && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'.' || b == b'-' || b == b'_')
}

/// A path inside the index (the archive): relative, no "..", no scheme.
fn safe_rel(p: &str) -> bool {
    !p.is_empty() && p.len() <= 200 && !p.starts_with('/') && !p.contains("..") && !p.contains('\\') && !p.contains(':')
        && p.bytes().all(|b| b.is_ascii_alphanumeric() || b"./-_".contains(&b))
}

#[derive(Clone, Debug, PartialEq)]
struct Entry { id: String, elite: Vec<String>, title: String, built: String, archive: String, sha256: String, size: u64 }

fn entries(v: &Value) -> Vec<Entry> {
    let s = |x: &Value, k: &str| x[k].as_str().unwrap_or("").to_string();
    v["wikis"].as_array().map(|a| a.iter().filter_map(|x| {
        let e = Entry {
            id: s(x, "id"),
            elite: x["elite"].as_array().map(|l| l.iter().filter_map(|y| y.as_str().map(String::from)).collect()).unwrap_or_default(),
            title: s(x, "title"),
            built: s(x, "built"),
            archive: s(x, "archive"),
            sha256: s(x, "sha256").to_ascii_lowercase(),
            size: x["size"].as_u64().unwrap_or(0),
        };
        (safe_id(&e.id) && safe_rel(&e.archive) && e.sha256.len() == 64 && e.sha256.bytes().all(|b| b.is_ascii_hexdigit())
            && e.size > 0 && e.size <= ARCHIVE_MAX).then_some(e)
    }).collect()).unwrap_or_default()
}

/// The entry for this Elite version: its `elite` list (or its id) names it.
fn pick<'a>(list: &'a [Entry], ver: &str) -> Option<&'a Entry> {
    let k = ver_key(ver);
    if k.is_empty() { return None; }
    list.iter().find(|e| e.elite.iter().any(|x| ver_key(x) == k)).or_else(|| list.iter().find(|e| ver_key(&e.id) == k))
}

/// The newest entry (by its version numbers) - offered when this version has none.
fn newest(list: &[Entry]) -> Option<&Entry> {
    list.iter().max_by(|a, b| {
        let p = |s: &str| s.split(|c: char| !c.is_ascii_digit()).filter(|x| !x.is_empty()).map(|x| x.parse::<u64>().unwrap_or(0)).collect::<Vec<_>>();
        p(&a.id).cmp(&p(&b.id))
    })
}

/// The SHA-256 the folder of `id` was unpacked from ("" - not there).
fn have(id: &str) -> String {
    let d = root().join(id);
    if !d.join("index.html").is_file() { return String::new(); }
    std::fs::read_to_string(d.join(".sha256")).map(|s| s.trim().to_string()).unwrap_or_default()
}

fn unpack(gz: &[u8], dst: &Path) -> Result<usize, String> {
    let mut ar = tar::Archive::new(flate2::read::GzDecoder::new(gz));
    let (mut n, mut total) = (0usize, 0u64);
    for e in ar.entries().map_err(|e| e.to_string())? {
        let mut e = e.map_err(|e| e.to_string())?;
        let kind = e.header().entry_type();
        let path = e.path().map_err(|e| e.to_string())?.into_owned();
        // only plain names inside the folder: no "..", no absolute path, no links
        let mut rel = PathBuf::new();
        for c in path.components() {
            match c {
                Component::Normal(x) => rel.push(x),
                Component::CurDir => {}
                _ => return Err(format!("bad path in the archive: {}", path.display())),
            }
        }
        if rel.as_os_str().is_empty() { continue; }
        if kind.is_dir() { std::fs::create_dir_all(dst.join(&rel)).map_err(|e| e.to_string())?; continue; }
        if !kind.is_file() { continue; }
        n += 1;
        total += e.size();
        if n > FILES_MAX || total > UNPACK_MAX { return Err("the archive is too big".into()); }
        let out = dst.join(&rel);
        if let Some(p) = out.parent() { std::fs::create_dir_all(p).map_err(|e| e.to_string())?; }
        let mut f = std::fs::File::create(&out).map_err(|e| e.to_string())?;
        let size = e.size();
        std::io::copy(&mut (&mut e).take(size), &mut f).map_err(|e| e.to_string())?;
    }
    if !dst.join("index.html").is_file() { return Err("no index.html in the archive".into()); }
    Ok(n)
}

/// Download, check and unpack `e` into its folder (the old copy is replaced only once the new one is complete).
fn fetch(app: &AppHandle, e: &Entry) -> Result<(), String> {
    let st = app.state::<App>();
    let s = st.settings.lock().unwrap().clone();
    let m = mirrors(&s, st.config.lock().unwrap().as_ref());
    let r = m.get(&format!("wiki/{}", e.archive));
    data_note(&m, r.is_ok());
    let gz = r.map_err(|x| x.to_string())?;
    if gz.len() as u64 != e.size { return Err(format!("size {} instead of {}", gz.len(), e.size)); }
    let sha: String = Sha256::digest(&gz).iter().map(|b| format!("{b:02x}")).collect();
    if sha != e.sha256 { return Err("the checksum does not match".into()); }
    let dir = root().join(&e.id);
    let new = root().join(format!("{}.new", e.id));
    let old = root().join(format!("{}.old", e.id));
    let _ = std::fs::remove_dir_all(&new);
    let _ = std::fs::remove_dir_all(&old);
    std::fs::create_dir_all(&new).map_err(|x| x.to_string())?;
    let n = match unpack(&gz, &new) {
        Ok(n) => n,
        Err(x) => { let _ = std::fs::remove_dir_all(&new); return Err(x); }
    };
    std::fs::write(new.join(".sha256"), &sha).map_err(|x| x.to_string())?;
    if dir.exists() { std::fs::rename(&dir, &old).map_err(|x| x.to_string())?; }
    if let Err(x) = std::fs::rename(&new, &dir) {
        let _ = std::fs::rename(&old, &dir);
        return Err(x.to_string());
    }
    let _ = std::fs::remove_dir_all(&old);
    crate::c_log(&format!("codex: {} ({} files, {} KB) from {}", e.id, n, gz.len() >> 10, m.current_host()));
    Ok(())
}

/// Folders of versions the index no longer lists, and leftovers of a broken unpack, go.
fn prune(list: &[Entry]) {
    let Ok(rd) = std::fs::read_dir(root()) else { return };
    for d in rd.flatten() {
        let name = d.file_name().to_string_lossy().to_string();
        if d.path().is_dir() && !list.iter().any(|e| e.id == name) { let _ = std::fs::remove_dir_all(d.path()); }
    }
}

fn open_blocking(app: &AppHandle, ver: &str, any: bool) -> Value {
    let _one = BUSY.lock().unwrap_or_else(|p| p.into_inner());
    let _ = std::fs::create_dir_all(root());
    // the index from the mirrors; without them the last one (offline)
    let st = app.state::<App>();
    let s = st.settings.lock().unwrap().clone();
    let m = mirrors(&s, st.config.lock().unwrap().as_ref());
    let got = m.get("wiki/index.json");
    // every mirror said "not found": nothing is published (not a way that is lost - the mirrors' order stays)
    let missing = matches!(&got, Err(e) if e.to_string().contains("404"));
    data_note(&m, got.is_ok() || missing);
    if missing { return json!({"ok": false, "why": "none", "ver": ver, "others": []}); }
    let (index, online, err) = match got.map(|b| (serde_json::from_slice::<Value>(&b).ok(), b)) {
        Ok((Some(v), b)) if v["wikis"].is_array() => {
            let _ = std::fs::write(root().join("index.json"), &b);
            (Some(v), true, String::new())
        }
        Ok(_) => (None, true, "bad index".to_string()),
        Err(x) => (None, false, x.to_string()),
    };
    let index = index.or_else(|| std::fs::read(root().join("index.json")).ok().and_then(|b| serde_json::from_slice(&b).ok()));
    let Some(index) = index else { return json!({"ok": false, "why": "offline", "error": err}) };
    let list = entries(&index);
    let fresh = online && err.is_empty();
    let e = match pick(&list, ver) {
        Some(e) => e,
        None if any => match newest(&list) { Some(e) => e, None => return json!({"ok": false, "why": "none", "ver": ver, "others": []}) },
        None => {
            let others: Vec<Value> = newest(&list).map(|e| json!({"id": e.id, "title": e.title})).into_iter().collect();
            return json!({"ok": false, "why": "none", "ver": ver, "others": others});
        }
    };
    let mut stale = false;
    if have(&e.id) != e.sha256 {
        if let Err(x) = fetch(app, e) {
            crate::c_log(&format!("codex: {} not downloaded: {x}", e.id));
            if have(&e.id).is_empty() { return json!({"ok": false, "why": if fresh { "error" } else { "offline" }, "error": x}); }
            stale = true;   // the copy on the disk is an older build of this version: shown, told
        }
    }
    if fresh { prune(&list); }
    json!({"ok": true, "url": format!("{}{}/index.html", base_url(), e.id), "id": e.id, "title": e.title, "built": e.built,
           "exact": pick(&list, ver).map(|x| x.id == e.id).unwrap_or(false), "offline": !fresh, "stale": stale})
}

/// The tab: the Codex of Elite `ver` (the installed one, else the one Play installs) - downloaded when it is not on the
/// disk yet or a newer build is out. `any`: none for this version - open the newest one there is.
#[tauri::command]
pub async fn codex_open(app: AppHandle, ver: String, any: Option<bool>) -> Value {
    tauri::async_runtime::spawn_blocking(move || open_blocking(&app, &ver, any.unwrap_or(false)))
        .await
        .unwrap_or_else(|_| json!({"ok": false, "why": "error", "error": "internal"}))
}

fn mime(p: &Path) -> &'static str {
    match p.extension().and_then(|x| x.to_str()).unwrap_or("").to_ascii_lowercase().as_str() {
        "html" | "htm" => "text/html; charset=utf-8",
        "js" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "json" => "application/json",
        "webp" => "image/webp",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        "woff2" => "font/woff2",
        "woff" => "font/woff",
        "txt" => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    }
}

fn unescape(s: &str) -> Option<String> {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' {
            let h = std::str::from_utf8(b.get(i + 1..i + 3)?).ok()?;
            out.push(u8::from_str_radix(h, 16).ok()?);
            i += 3;
        } else {
            out.push(b[i]);
            i += 1;
        }
    }
    String::from_utf8(out).ok()
}

/// A file of an unpacked Codex for the frame: `/<id>/<path>` -> `<data>/wiki/<id>/<path>`; nothing outside those folders.
fn file_of(path: &str) -> Option<PathBuf> {
    let p = unescape(path.trim_start_matches('/'))?;
    let mut parts: Vec<&str> = p.split('/').collect();
    if parts.last() == Some(&"") { parts.pop(); parts.push("index.html"); }
    if parts.len() < 2 || !safe_id(parts[0]) { return None; }
    let mut f = root();
    for x in &parts {
        if x.is_empty() || x.starts_with('.') || x.contains('\\') || x.contains(':') || x.contains('\0') { return None; }
        f.push(x);
    }
    f.is_file().then_some(f)
}

/// A link of the page `page` ("<id>/unit/x.html") to `rel` ("../img/a.webp") as a path inside the same Codex ("<id>/img/a.webp");
/// None for anything else (another scheme, an absolute path, a query, a way out of the Codex folder).
fn resolve(page: &str, rel: &str) -> Option<String> {
    if rel.is_empty() || rel.contains(':') || rel.starts_with('/') || rel.contains('?') || rel.contains('#') || rel.contains('\\') { return None; }
    let mut parts: Vec<&str> = page.split('/').collect();
    parts.pop();
    for x in rel.split('/') {
        match x {
            "" | "." => {}
            ".." => { if parts.len() <= 1 { return None; } parts.pop(); }
            x => parts.push(x),
        }
    }
    Some(parts.join("/"))
}

/// 1.5.12 (Malum 12.11, Windows: the Codex opened without its pictures): a page goes out WITH its style sheet, scripts and
/// pictures (data: URIs), so the frame needs one request per page - the navigation, which every webview hands to the scheme.
/// WebView2 serves a custom scheme as http://codex.localhost/ and the requests a frame of another origin makes itself
/// (its pictures) do not reliably reach the scheme's handler there (WebView2Feedback #1114; newer Chromium also checks
/// requests to *.localhost from a page with no address as "local network access"). Nothing of the site changes; a file
/// that is missing or too big keeps its link.
fn inline(page: &str, html: &str) -> String {
    const MAX: u64 = 4 << 20;
    let read = |rel: &str| -> Option<(PathBuf, Vec<u8>)> {
        let f = file_of(&format!("/{}", resolve(page, rel)?))?;
        if std::fs::metadata(&f).ok()?.len() > MAX { return None; }
        Some((f.clone(), std::fs::read(&f).ok()?))
    };
    // replace every `<head>VALUE<tail>` by what `f` makes of VALUE (None: leave it)
    let each = |src: &str, head: &str, tail: &str, f: &dyn Fn(&str) -> Option<String>| -> String {
        let mut out = String::with_capacity(src.len());
        let mut rest = src;
        while let Some(i) = rest.find(head) {
            let after = &rest[i + head.len()..];
            let Some(j) = after.find(tail) else { break };
            out.push_str(&rest[..i]);
            match f(&after[..j]) {
                Some(x) => out.push_str(&x),
                None => { out.push_str(head); out.push_str(&after[..j]); out.push_str(tail); }
            }
            rest = &after[j + tail.len()..];
        }
        out.push_str(rest);
        out
    };
    let text = |rel: &str| read(rel).and_then(|(_, b)| String::from_utf8(b).ok());
    let html = each(html, "<link rel=\"stylesheet\" href=\"", "\">", &|rel| text(rel).map(|c| format!("<style>{}</style>", c.replace("</style", "<\\/style"))));
    let html = each(&html, "<script src=\"", "\"></script>", &|rel| text(rel).map(|c| format!("<script>{}</script>", c.replace("</script", "<\\/script").replace("<!--", "<\\!--"))));
    each(&html, " src=\"", "\"", &|rel| {
        let (f, b) = read(rel)?;
        let m = mime(&f);
        if !m.starts_with("image/") { return None; }
        use base64::Engine;
        Some(format!(" src=\"data:{m};base64,{}\"", base64::engine::general_purpose::STANDARD.encode(&b)))
    })
}

/// The scheme's answer (main.rs registers it; it runs off the window's thread).
pub fn serve(path: &str) -> tauri::http::Response<Vec<u8>> {
    let r = tauri::http::Response::builder();
    match file_of(path).and_then(|f| std::fs::read(&f).ok().map(|b| (f, b))) {
        Some((f, body)) => {
            let m = mime(&f);
            let body = if m.starts_with("text/html") {
                // the page's own path inside the Codex ("<id>/unit/x.html"), its links are relative to it
                let rel = f.strip_prefix(root()).ok().map(|p| p.components().map(|c| c.as_os_str().to_string_lossy().to_string()).collect::<Vec<_>>().join("/"));
                match (rel, String::from_utf8(body)) {
                    (Some(rel), Ok(h)) => inline(&rel, &h).into_bytes(),
                    (_, Ok(h)) => h.into_bytes(),
                    (_, Err(e)) => e.into_bytes(),
                }
            } else { body };
            r.status(200)
                .header("Content-Type", m)
                .header("Content-Length", body.len().to_string())
                .header("Cache-Control", "no-cache")
                // the site needs nothing from the network: no fetch, no forms, no plugins, no other origin's scripts
                .header("Content-Security-Policy", "default-src 'self' data: 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'")
                .header("X-Content-Type-Options", "nosniff")
                .body(body)
                .unwrap_or_default()
        }
        None => r.status(404).header("Content-Type", "text/plain").body(b"not found".to_vec()).unwrap_or_default(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn versions_compare_like_the_rooms() {
        assert_eq!(ver_key("3.2.1.0.0"), "3.2.1");
        assert_eq!(ver_key("3.2.1"), "3.2.1");
        assert_eq!(ver_key("3.2"), "3.2");
        assert_eq!(ver_key("3.0-r2"), "3.0.2");
        assert_eq!(ver_key("0"), "0");
        assert_eq!(ver_key("igrework-1"), "igrework-1");
        let idx: Value = serde_json::from_str(r#"{"wikis": [
            {"id": "3.2.1", "elite": ["3.2.1", "3.2.1.1"], "archive": "3.2.1/site-0123456789ab.tar.gz", "sha256": "0000000000000000000000000000000000000000000000000000000000000000", "size": 10},
            {"id": "3.2", "elite": ["3.2"], "archive": "3.2/site-0123456789ab.tar.gz", "sha256": "0000000000000000000000000000000000000000000000000000000000000000", "size": 10},
            {"id": "../x", "elite": ["9"], "archive": "x.tar.gz", "sha256": "0000000000000000000000000000000000000000000000000000000000000000", "size": 10},
            {"id": "9", "elite": ["9"], "archive": "../x.tar.gz", "sha256": "0000000000000000000000000000000000000000000000000000000000000000", "size": 10}
        ]}"#).unwrap();
        let l = entries(&idx);
        assert_eq!(l.len(), 2, "unsafe ids and archive paths are dropped");
        assert_eq!(pick(&l, "3.2.1.0.0").unwrap().id, "3.2.1");
        assert_eq!(pick(&l, "3.2.1.1").unwrap().id, "3.2.1");
        assert_eq!(pick(&l, "3.2.0").unwrap().id, "3.2");
        assert!(pick(&l, "3.2.2").is_none());
        assert!(pick(&l, "").is_none());
        assert_eq!(newest(&l).unwrap().id, "3.2.1");
    }

    #[test]
    fn the_frame_gets_files_of_the_codex_folders_only() {
        assert!(file_of("/../settings.json").is_none());
        assert!(file_of("/3.2.1/../../settings.json").is_none());
        assert!(file_of("/3.2.1/%2e%2e/%2e%2e/settings.json").is_none());
        assert!(file_of("/3.2.1/.sha256").is_none());
        assert!(file_of("/index.json").is_none());
        assert!(file_of("/3.2.1/C:/x").is_none());
        assert_eq!(unescape("a%20b"), Some("a b".into()));
        assert_eq!(unescape("a%2"), None);
    }

    /// 1.5.12: the merge of 1.5.9 lost `frame-src` from the window's CSP and WebView2 blocked the whole frame ("This content
    /// is blocked") - the window must let the frame load the scheme in every webview's form of it.
    #[test]
    fn the_window_lets_the_frame_in() {
        let conf: Value = serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        let csp = conf["app"]["security"]["csp"].as_str().unwrap_or("");
        let fs = csp.split(';').map(str::trim).find(|d| d.starts_with("frame-src ")).unwrap_or_else(|| panic!("no frame-src in the CSP: {csp}"));
        for src in [format!("{SCHEME}:"), format!("http://{SCHEME}.localhost"), format!("https://{SCHEME}.localhost")] {
            assert!(fs.split_whitespace().any(|x| x == src), "frame-src has no {src}: {fs}");
        }
        assert!(base_url().starts_with(if cfg!(windows) { "http://codex.localhost/" } else { "codex://localhost/" }));
    }

    #[test]
    fn links_resolve_inside_the_codex_only() {
        assert_eq!(resolve("3.2.1/unit/a.html", "../img/x.webp").as_deref(), Some("3.2.1/img/x.webp"));
        assert_eq!(resolve("3.2.1/index.html", "img/x.webp").as_deref(), Some("3.2.1/img/x.webp"));
        assert_eq!(resolve("3.2.1/index.html", "./assets/app.js").as_deref(), Some("3.2.1/assets/app.js"));
        assert!(resolve("3.2.1/index.html", "../x.webp").is_none());
        assert!(resolve("3.2.1/unit/a.html", "../../settings.json").is_none());
        assert!(resolve("3.2.1/index.html", "https://x/y.webp").is_none());
        assert!(resolve("3.2.1/index.html", "/img/x.webp").is_none());
        assert!(resolve("3.2.1/index.html", "data:image/png;base64,AA").is_none());
    }

    #[test]
    fn a_page_goes_out_with_its_files() {
        let id = format!("t{}", std::process::id());
        let d = root().join(&id);
        let _ = std::fs::remove_dir_all(&d);
        for p in ["unit", "img", "assets"] { std::fs::create_dir_all(d.join(p)).unwrap(); }
        std::fs::write(d.join("img/a.webp"), b"RIFF").unwrap();
        std::fs::write(d.join("assets/s.css"), "b{color:red}").unwrap();
        std::fs::write(d.join("assets/app.js"), "var x='</script>';").unwrap();
        let page = r#"<link rel="stylesheet" href="../assets/s.css"><img class="ic" src="../img/a.webp" alt=""><img src="../img/none.webp"><script src="../assets/app.js"></script><a href="../index.html">x</a>"#;
        std::fs::write(d.join("unit/u.html"), page).unwrap();
        let r = serve(&format!("/{id}/unit/u.html"));
        let body = String::from_utf8(r.body().clone()).unwrap();
        let _ = std::fs::remove_dir_all(&d);
        assert_eq!(r.status(), 200);
        assert!(body.contains("<style>b{color:red}</style>"), "{body}");
        assert!(body.contains(r#"<img class="ic" src="data:image/webp;base64,UklGRg==" alt="">"#), "{body}");
        assert!(body.contains(r#"<img src="../img/none.webp">"#), "a missing file keeps its link: {body}");
        assert!(body.contains(r#"<script>var x='<\/script>';</script>"#), "{body}");
        assert!(body.contains(r#"<a href="../index.html">"#));
        assert_eq!(r.headers()["Content-Type"], "text/html; charset=utf-8");
    }

    #[test]
    fn unpacks_only_plain_files_inside() {
        let mk = |files: &[(&str, &[u8])]| {
            let mut b = tar::Builder::new(flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::fast()));
            for (p, d) in files {
                let mut h = tar::Header::new_gnu();
                h.set_size(d.len() as u64);
                h.set_mode(0o644);
                h.set_entry_type(tar::EntryType::Regular);
                // set_path refuses "..": write the name raw, like a hostile archive would
                let name = h.as_old_mut().name.as_mut();
                name[..p.len()].copy_from_slice(p.as_bytes());
                h.set_cksum();
                b.append(&h, *d).unwrap();
            }
            b.into_inner().unwrap().finish().unwrap()
        };
        let d = std::env::temp_dir().join(format!("codex_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        let ok = mk(&[("index.html", b"<p>hi"), ("unit/a.html", b"a"), ("./img/x.webp", b"x")]);
        assert_eq!(unpack(&ok, &d).unwrap(), 3);
        assert_eq!(std::fs::read(d.join("unit/a.html")).unwrap(), b"a");
        let bad = mk(&[("index.html", b"x"), ("../evil.txt", b"x")]);
        let d2 = d.join("two");
        std::fs::create_dir_all(&d2).unwrap();
        assert!(unpack(&bad, &d2).is_err());
        assert!(!d.join("evil.txt").exists());
        assert!(unpack(&mk(&[("a.html", b"x")]), &d.join("three")).is_err(), "no index.html");
        let _ = std::fs::remove_dir_all(&d);
    }
}
