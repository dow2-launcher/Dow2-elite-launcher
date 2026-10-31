//! Hotkeys of the game: Documents\My Games\Dawn of War II - Retribution\Settings.
//! The game writes `_keydefaults.lua` (all default bindings of the running mod) on every start and uses `keydefaults.lua`
//! instead when it exists. "Grid Hotkeys" (abilities and unit building on QWER / ASDF / ZXCV) is the `gridkeys` setting
//! of `configuration.lua`; with it on, the `grid_keys = { ... }` table inside the bindings wins over the plain ones.
//! We keep the player's changes as overrides and build `keydefaults.lua` = the current `_keydefaults.lua` + overrides,
//! so after a game or Elite patch the file is rebuilt from the new defaults instead of going stale.
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

/// One binding line: `name = "Value",`. `scope` is "grid" inside `grid_keys = { }`, "" elsewhere.
#[derive(Clone, Debug, serde::Serialize)]
pub struct Binding {
    pub scope: String,
    pub name: String,
    pub value: String,
    pub default: String,
    pub section: String,
    /// What the launcher does with it: a race key of the launcher ("space_marines", "orks", ...) for that race's
    /// units, "common" (orders, selection, groups), "observer" (observer / replay panels), "grid" (the grid table);
    /// not shown: "system" (menu, camera - not to be reassigned), "campaign" (single player only), "letters".
    pub group: String,
    #[serde(skip)]
    pub line: usize,
}

/// The group of a section heading of `_keydefaults.lua` (see Binding::group).
fn group_of(section: &str, campaign: bool) -> &'static str {
    let s = section.to_ascii_lowercase();
    if campaign { return "campaign"; }
    if s.starts_with("system commands") || s.starts_with("universal taskbar") { return "system"; }
    if s.starts_with("plain old letters") { return "letters"; }
    if s.starts_with("observer") || s.starts_with("playback") { return "observer"; }
    for (p, g) in [("space marine", "space_marines"), ("ork", "orks"), ("eldar", "eldar"), ("tyranid", "tyranids"), ("chaos", "chaos_marines"),
                   ("ig ", "imperial_guard"), ("grey knights", "ordo_malleus"), ("tau", "t_tau")] {
        if s.starts_with(p) { return g; }
    }
    "common"
}

pub fn settings_dir() -> Option<PathBuf> {
    dirs::document_dir().map(|d| d.join("My Games").join("Dawn of War II - Retribution").join("Settings"))
}

fn key_line(l: &str) -> Option<(String, String)> {
    let t = l.trim_start();
    if t.starts_with("--") { return None; }
    let (k, rest) = t.split_once('=')?;
    let k = k.trim();
    if k.is_empty() || !k.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') || k.chars().next()?.is_ascii_digit() { return None; }
    let rest = rest.trim();
    let v = rest.strip_prefix('"')?;
    let end = v.find('"')?;
    Some((k.to_string(), v[..end].to_string()))
}

/// All bindings of `_keydefaults.lua` with the section heading each one sits under.
pub fn parse(text: &str) -> Vec<Binding> {
    let mut out = Vec::new();
    // campaign abilities: from "SP Specific abilities" (also "XP2 SP Specific") up to the next race's units or buildings
    let (mut section, mut in_grid, mut depth, mut campaign) = (String::new(), false, 0i32, false);
    for (i, l) in text.lines().enumerate() {
        let t = l.trim();
        if t.starts_with("--") {
            let h = t.trim_start_matches('-').trim().trim_end_matches('-').trim();
            if h.len() > 2 && h.chars().any(|c| c.is_alphabetic()) && !h.contains('=') && !h.starts_with('(') {
                section = h.to_string();
                let s = h.to_ascii_lowercase();
                if s.contains("sp specific") { campaign = true; } else if s.contains("buildings") || s.contains("unit creation") { campaign = false; }
            }
            continue;
        }
        if !in_grid && t.starts_with("grid_keys") && t.contains('=') { in_grid = true; depth = 0; section = "Grid keys".into(); continue; }
        if in_grid {
            depth += t.matches('{').count() as i32 - t.matches('}').count() as i32;
            if depth <= 0 && t.starts_with('}') { in_grid = false; continue; }
        }
        if let Some((k, v)) = key_line(l) {
            let group = if in_grid { "grid" } else { group_of(&section, campaign) };
            out.push(Binding { scope: if in_grid { "grid".into() } else { String::new() }, name: k, value: v.clone(), default: v, section: section.clone(), group: group.into(), line: i });
        }
    }
    out
}

fn defaults_text(dir: &Path) -> Result<String, String> {
    fs::read_to_string(dir.join("_keydefaults.lua"))
        .map_err(|_| "the game has not written its key settings yet: start the game once, then come back".to_string())
}

/// The bindings of the keydefaults.lua the game uses now that differ from the defaults ("scope:name" -> key): changes
/// made by hand, by another copy of the launcher, or saved before the launcher kept its own list. Empty without the file.
pub fn file_overrides() -> BTreeMap<String, String> {
    let Some(dir) = settings_dir() else { return BTreeMap::new() };
    let (Ok(custom), Ok(defaults)) = (fs::read_to_string(dir.join("keydefaults.lua")), defaults_text(&dir)) else { return BTreeMap::new() };
    // a few names are set twice in a file (with different keys): the last one wins in Lua, so compare those on both sides
    let last = |t: &str| -> BTreeMap<String, String> { parse(t).into_iter().map(|b| (format!("{}:{}", b.scope, b.name), b.value)).collect() };
    let def = last(&defaults);
    last(&custom).into_iter().filter(|(k, v)| def.get(k).is_some_and(|d| d != v)).collect()
}

/// Current state: every binding (defaults + overrides), the Grid Hotkeys setting, whether a custom file is in use.
pub fn load(overrides: &BTreeMap<String, String>) -> Result<serde_json::Value, String> {
    let dir = settings_dir().ok_or("Documents folder not found")?;
    let mut b = parse(&defaults_text(&dir)?);
    for x in b.iter_mut() {
        if let Some(v) = overrides.get(&format!("{}:{}", x.scope, x.name)) { x.value = v.clone(); }
    }
    Ok(serde_json::json!({
        "bindings": b, "grid": grid_on(&dir), "custom": dir.join("keydefaults.lua").is_file(),
    }))
}

fn grid_on(dir: &Path) -> bool {
    let t = fs::read_to_string(dir.join("configuration.lua")).unwrap_or_default();
    let Some(i) = t.find("\"gridkeys\"") else { return false };
    t[i..].lines().take(3).any(|l| l.trim().trim_end_matches(',').replace(' ', "") == "value=1")
}

fn set_grid(dir: &Path, on: bool) -> Result<(), String> {
    let p = dir.join("configuration.lua");
    let t = fs::read_to_string(&p).map_err(|e| format!("configuration.lua: {e}"))?;
    let v = if on { 1 } else { 0 };
    let new = if let Some(i) = t.find("\"gridkeys\"") {
        let rest = &t[i..];
        let Some(j) = rest.find("value") else { return Err("configuration.lua: gridkeys has no value".into()) };
        let k = rest[j..].find(',').map(|k| j + k).unwrap_or(rest.len());
        format!("{}value = {}{}", &t[..i + j], v, &t[i + k..])
    } else {
        let Some(end) = t.rfind('}') else { return Err("configuration.lua is not what we expect".into()) };
        let nl = if t.contains("\r\n") { "\r\n" } else { "\n" };
        format!("{}\t {nl}\t{{{nl}\t\tsetting = \"gridkeys\",{nl}\t\tvalue = {v},{nl}\t}},{nl}{}", &t[..end], &t[end..])
    };
    fs::write(&p, new).map_err(|e| format!("configuration.lua: {e}"))
}

/// Key names the game accepts ("Control+Shift+A" style).
pub fn valid_key(v: &str) -> bool {
    const NAMED: &[&str] = &["Backspace", "Tab", "Enter", "Escape", "Space", "Apostrophe", "Comma", "Minus", "Period", "Slash", "Semicolon",
        "Equal", "LBracket", "Backslash", "RBracket", "Grave", "Up", "Down", "Left", "Right", "Control", "Shift", "Alt", "CapsLock", "NumLock",
        "ScrollLock", "Insert", "Delete", "Home", "End", "PageUp", "PageDown", "PrintScreen", "Pause", "MouseLeft", "MouseRight", "MouseMiddle",
        "MouseTop", "MouseBottom", "ScreenLeft", "ScreenRight", "ScreenTop", "ScreenBottom", "NumpadMultiply", "NumpadPlus", "NumpadSeparator",
        "NumpadMinus", "NumpadPeriod", "NumpadSlash"];
    !v.is_empty() && v.split('+').all(|p| {
        (p.len() == 1 && p.chars().all(|c| c.is_ascii_alphanumeric()))
            || NAMED.contains(&p)
            || (p.starts_with('F') && p[1..].parse::<u8>().map_or(false, |n| (1..=12).contains(&n)))
            || (p.starts_with("Numpad") && p[6..].parse::<u8>().map_or(false, |n| n <= 9))
    })
}

/// Write keydefaults.lua from the current _keydefaults.lua with the overrides; no overrides = no custom file.
pub fn apply(overrides: &BTreeMap<String, String>, grid: Option<bool>) -> Result<(), String> {
    let dir = settings_dir().ok_or("Documents folder not found")?;
    if let Some(g) = grid { set_grid(&dir, g)?; }
    let custom = dir.join("keydefaults.lua");
    if overrides.is_empty() {
        if custom.is_file() { fs::remove_file(&custom).map_err(|e| format!("keydefaults.lua: {e}"))?; }
        return Ok(());
    }
    for (k, v) in overrides { if !valid_key(v) { return Err(format!("{k}: \"{v}\" is not a key the game knows")); } }
    let text = defaults_text(&dir)?;
    let nl = if text.contains("\r\n") { "\r\n" } else { "\n" };
    let map: BTreeMap<usize, String> = parse(&text).into_iter()
        .filter_map(|b| overrides.get(&format!("{}:{}", b.scope, b.name)).map(|v| (b.line, v.clone()))).collect();
    let out: Vec<String> = text.lines().enumerate().map(|(i, l)| match map.get(&i) {
        Some(v) => {
            let (a, rest) = l.split_once('"').unwrap_or((l, ""));
            let tail = rest.split_once('"').map(|x| x.1).unwrap_or("");
            format!("{a}\"{v}\"{tail}")
        }
        None => l.to_string(),
    }).collect();
    let head = format!("-- Written by Elite Launcher from _keydefaults.lua + your changes in the launcher. Edit them there:{nl}-- the launcher rebuilds this file after game patches.{nl}");
    fs::write(&custom, head + &out.join(nl) + nl).map_err(|e| format!("keydefaults.lua: {e}"))
}

/// After a game/Elite patch the defaults change: rebuild the custom file if it is older than the new defaults.
pub fn refresh_if_stale(overrides: &BTreeMap<String, String>) {
    let Some(dir) = settings_dir() else { return };
    if overrides.is_empty() { return; }
    let m = |p: &Path| fs::metadata(p).and_then(|m| m.modified()).ok();
    match (m(&dir.join("_keydefaults.lua")), m(&dir.join("keydefaults.lua"))) {
        (Some(d), Some(c)) if d <= c => {}
        (Some(_), _) => { let _ = apply(overrides, None); }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    const T: &str = "bindings\t=\n{\n\t-- Global Commands\n\tattack\t\t= \"A\",\n\treinforce\t= \"R\",\n\t--retire = \"X\",\n\tgrid_keys\t=\n\t{\n\t\tAB_key_1\t= \"Q\",\n\t\treinforce\t= \"Z\", --\"R\"\n\t},\n\ta = \"A\",\n}\n";
    #[test]
    fn parses_scopes_and_sections() {
        let b = parse(T);
        let names: Vec<_> = b.iter().map(|x| format!("{}:{}={}", x.scope, x.name, x.value)).collect();
        assert_eq!(names, [":attack=A", ":reinforce=R", "grid:AB_key_1=Q", "grid:reinforce=Z", ":a=A"]);
        assert_eq!(b[0].section, "Global Commands");
    }
    #[test]
    fn keys() {
        assert!(valid_key("Control+Shift+A") && valid_key("F12") && valid_key("Numpad7") && valid_key("LBracket"));
        assert!(!valid_key("Ctrl+A") && !valid_key("F13") && !valid_key(""));
    }
}

#[cfg(test)]
mod real_file {
    // HOME=/tmp/hkhome cargo test -p elite-core real_file -- --ignored
    #[test] #[ignore]
    fn apply_on_real_defaults() {
        use std::collections::BTreeMap;
        let mut o = BTreeMap::new();
        o.insert("grid:AB_key_1".to_string(), "Z".to_string());
        o.insert(":attack".to_string(), "Control+Q".to_string());
        super::apply(&o, Some(false)).unwrap();
        let dir = super::settings_dir().unwrap();
        let t = std::fs::read_to_string(dir.join("keydefaults.lua")).unwrap();
        let b = super::parse(&t);
        let get = |s: &str, n: &str| b.iter().find(|x| x.scope == s && x.name == n).map(|x| x.value.clone());
        assert_eq!(get("grid", "AB_key_1").as_deref(), Some("Z"));
        assert_eq!(get("", "attack").as_deref(), Some("Control+Q"));
        assert_eq!(get("grid", "AB_key_2").as_deref(), Some("W"));
        assert_eq!(b.len(), super::parse(&std::fs::read_to_string(dir.join("_keydefaults.lua")).unwrap()).len());
        assert!(!super::grid_on(&dir));
        super::apply(&o, Some(true)).unwrap(); assert!(super::grid_on(&dir));
        super::apply(&BTreeMap::new(), None).unwrap(); assert!(!dir.join("keydefaults.lua").exists());
        println!("bindings {}", b.len());
    }
}
