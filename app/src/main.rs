//! Elite Launcher — window around elite-core.
//!
//! Rules that shape this file:
//! * the game can always be started: a new version is only *offered*, never forced;
//! * everything the Elite team may want to change (versions, news, announcements, links,
//!   mirrors, launch commands) comes from the signed launcher.json, not from this code;
//! * the launcher works offline with the last verified config.
//!
//! The modules (1.6.17: main.rs split by subject; main.rs keeps the app's state, the settings, launcher.json, the status,
//! the tray and main()):
//! * the game and its files - install (the folder, the update, the removal), addons (the add-ons' files), vanilla (the vanilla
//!   game), launch (Play), gameproc (is the game running), prefs (hotkeys, the UI scale), logs (Send logs);
//! * the network - netcheck (our hosts and Relic from here), reach (the hosts' order), conntest / netgame (the connection test);
//! * our servers - community (sign-in, the chat), stream (the live stream), feedback (the developers' chat), feeds (lobbies,
//!   matches, events, release news, the usage count), lroom (launcher lobbies), roomjoin / livewatch / replayopen (the game's
//!   lobbies, a match to watch, a replay to open), replays;
//! * selfupdate - the launcher's own update; tray - the tray's icon (a mention's dot) and the copy beside an elevated one.
#![recursion_limit = "256"]   // get_status' json! grew past the default 128
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod conntest;
mod netgame;
mod reach;
mod roomjoin;
mod lroom;
mod replays;
mod livewatch;
mod replayopen;
mod netcheck;
mod prefs;
mod gameproc;
mod selfupdate;
mod addons;
mod vanilla;
mod install;
mod logs;
mod launch;
mod feedback;
mod community;
mod stream;
mod feeds;
mod winstate;
mod tray;
// every module's items reachable crate-wide (crate::X), as when they were all in this file; some are used on one OS only
#[allow(unused_imports)]
pub(crate) use self::{netcheck::*, prefs::*, gameproc::*, selfupdate::*, addons::*, vanilla::*, install::*, logs::*, launch::*, feedback::*, community::*, stream::*, feeds::*};

use elite_core::config::{version_newer, LauncherConfig};
use elite_core::{elite, game, net::Mirrors, update, LAUNCHER_VERSION};
use std::collections::BTreeMap;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, LazyLock, Mutex};
use std::time::{Duration, Instant};
use tauri::menu::{MenuBuilder, MenuItem, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, Wry};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::UpdaterExt;

/// Mirrors compiled into the launcher; launcher.json can add more. Order = preference.
/// Use hosts from different providers/domains so the launcher can start even if one is blocked.
/// Built-in mirrors, set at build time: `ELITE_MIRRORS="https://a/;https://b/" cargo build`.
/// Not stored in the repository; more mirrors can come later from the signed launcher.json.
const BUILTIN_MIRRORS: &str = match option_env!("ELITE_MIRRORS") { Some(v) => v, None => "" };
/// Public key of the launcher self-update (tauri-plugin-updater): only updates signed with its private half
/// (the TAURI_SIGNING_PRIVATE_KEY secret, CI only) are installed. A new key pair means a new `keys/updater.pub`.
const UPDATER_PUBKEY: &str = include_str!("../../keys/updater.pub");
/// The self-update's first source (1.5.1; the last one 1.3.16 - 1.5.0): GitHub Releases are the release, the mirrors copy them.
const GITHUB_UPDATER: &str = "https://github.com/dow2-launcher/Dow2-elite-launcher/releases/latest/download/updater.json";
const DEFAULT_CACHE_MB: u64 = 6144;

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(default)]
struct Settings {
    game_dir: Option<PathBuf>,
    channel: Option<String>,
    /// "" = system language
    lang: String,
    extra_mirror: String,
    cache_mb: Option<u64>,
    dismissed: Vec<String>,
    /// Component id → ticked by the player (missing = component default).
    components: BTreeMap<String, bool>,
    /// "component.option" → ticked by the player (missing = option default).
    comp_options: BTreeMap<String, bool>,
    /// "component.option" → the player's pick for an option with choices (missing = option default).
    comp_values: BTreeMap<String, String>,
    /// Channel the player switched away from — the quick "back to …" button.
    prev_channel: Option<String>,
    /// The order of our hosts from the last check (reach.rs): used at the start until this run's check is done. 1.6.22: one
    /// list for everything (net_data, the files' list before it, is dropped).
    net_hosts: Vec<reach::Probe>,
    /// The API hosts' order of 1.6.21 and before: read once to seed net_hosts, never written again.
    #[serde(skip_serializing)]
    net_api: Vec<reach::Probe>,
    /// Anonymous usage count (see usage_ping). None = on.
    usage_stats: Option<bool>,
    /// 1.3.12: no sound when someone @mentions me in the chat (owner: a beep by default, a tick to turn it off)
    mute_mention: Option<bool>,
    /// 1.3.12: the close button quits instead of hiding in the tray
    close_quits: Option<bool>,
    /// 1.5.3: the sound of a launcher lobby's ping / invitation: "sharp", anything else (none) the soft one
    lobby_sound: String,
    /// Random secret for the daily usage hash; never sent itself.
    ping_secret: String,
    /// Day number (UTC days since 1970) of the last successful usage ping.
    ping_day: u64,
    /// Feedback chat: random id that ties the player's messages together (kept across restarts), and the name they gave.
    fb_uid: String,
    fb_name: String,
    /// Elite files from/to other launchers on the local network (elite_core::lan). None = on.
    lan_share: Option<bool>,
    /// Hotkeys the player changed: "scope:name" -> "Control+A" ("grid:AB_key_1" for Grid Hotkeys); see elite_core::hotkeys.
    hotkeys: BTreeMap<String, String>,
    /// 1.6.20: the rating the player picked in the profile menu ("elite" / anything else = Relic), for the in-game add-ons
    /// (addons::write_rating_ini); the window keeps it in localStorage.ratingSys and sends it here at the start and on a change
    rating_sys: String,
    /// Community (chat, who is online): the session token from the Steam sign-in and the profile it belongs to.
    c_token: String,
    c_steam: String,
    c_name: String,
    c_avatar: String,
    /// 1.4.11 (owner 05.11.2026): "vanilla" - Play starts plain Dawn of War II: Retribution with the add-ons that work there;
    /// anything else - Elite (the default).
    game_mode: String,
}

struct App {
    settings: Mutex<Settings>,
    config: Mutex<Option<LauncherConfig>>,
    busy: AtomicBool,
    /// DOW2.exe is running (checked every few seconds): its files are locked, add-ons and updates wait for it to close.
    game_running: AtomicBool,
    cancel: Mutex<Option<Arc<AtomicBool>>>,
    last_error: Mutex<String>,
    /// Version id → bytes a switch to it would download (0 = instant). Filled in the background.
    costs: Mutex<BTreeMap<String, u64>>,
    /// Newer launcher found by `launcher_check`, installed by `launcher_install`.
    launcher_update: Mutex<Option<tauri_plugin_updater::Update>>,
    /// Release notes from GitHub (see fetch_release_news), shown as news next to the ones from launcher.json.
    release_news: Mutex<Vec<Value>>,
}

/// Tray menu items, relabelled from the window when the language changes.
struct Tray {
    open: MenuItem<Wry>,
    quit: MenuItem<Wry>,
    /// 1.6.32: the icon itself - its picture changes with a mention in the chat (tray_mark)
    icon: tauri::tray::TrayIcon<Wry>,
}

fn show_window(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
        tray::webview_shown(&w, true);   // 1.6.32: the page and WebView2 know they are seen again
    }
}

/// 1.6.32 (owner 24.11.2026): a mention of the player in the chat (@name, a reply to him, @all) not seen yet - the tray's icon with
/// a yellow dot and its tip saying so (chat.js chMark); off - the usual icon and tip.
#[tauri::command]
fn tray_mark(app: AppHandle, tr: State<'_, Tray>, on: bool, tip: Option<String>) {
    let _ = tr.icon.set_icon(Some(tray::icon(&app, on)));
    let tip = tip.filter(|t| on && !t.trim().is_empty()).unwrap_or_else(|| "Elite Launcher".into());
    let _ = tr.icon.set_tooltip(Some(tip));
}

#[tauri::command]
fn set_tray_labels(tray: State<'_, Tray>, open: String, quit: String) {
    let _ = tray.open.set_text(open);
    let _ = tray.quit.set_text(quit);
}

/// Work out how much each version would download (manifests are fetched once and cached for good).
fn compute_costs(app: &AppHandle) {
    let st = app.state::<App>();
    let Some(cfg) = st.config.lock().unwrap().clone() else { return };
    let Some(dir) = game_dir(&st) else { return };
    let s = st.settings.lock().unwrap().clone();
    let m = mirrors(&s, Some(&cfg));
    let g = update::Game::new(&dir);
    // Elite already in the folder but not installed by the launcher: recognise the version (main channel first)
    if g.load_state().files.is_empty() && dir.join("Elite.module").is_file() && !st.busy.load(Ordering::Relaxed) {
        let mut chans: Vec<_> = cfg.channels.iter().collect();
        chans.sort_by_key(|c| !c.default);
        for c in chans {
            if let Ok(man) = update::load_manifest(&g, &m, &c.version) {
                if update::adopt_existing(&g, &man, &c.id) {
                    break;
                }
            }
        }
    }
    let mut out = BTreeMap::new();
    let old_man = {
        let v = g.load_state().version;
        if v.is_empty() { None } else { update::load_manifest(&g, &m, &v).ok() }
    };
    for c in &cfg.channels {
        if let Ok(man) = update::load_manifest(&g, &m, &c.version) {
            out.insert(c.version.clone(), update::switch_cost(&g, old_man.as_ref(), &man));
        }
    }
    *st.costs.lock().unwrap() = out;
}

fn data_dir() -> PathBuf {
    let d = dirs::config_dir().unwrap_or_else(std::env::temp_dir).join("EliteLauncher");
    let _ = std::fs::create_dir_all(&d);
    d
}

fn load_settings() -> Settings {
    std::fs::read(data_dir().join("settings.json")).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default()
}


fn save_settings(s: &Settings) {
    let _ = std::fs::write(data_dir().join("settings.json"), serde_json::to_vec_pretty(s).unwrap());
}

fn cached_config() -> Option<LauncherConfig> {
    let raw = std::fs::read(data_dir().join("launcher.json")).ok()?;
    let sig = std::fs::read_to_string(data_dir().join("launcher.json.sig")).ok()?;
    update::parse_signed_config(&raw, &sig)
}

fn os_name() -> &'static str {
    if cfg!(windows) {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    }
}

/// Our hosts for the shared pool (reach.rs): the signed launcher.json's first (the team changes the order without a new launcher),
/// then the build's; the API hosts (`api_hosts`, ELITE_LOG_HOSTS) and the store bases (`mirrors`, ELITE_MIRRORS) of one origin
/// are one host. `s`: the player's own store (Settings), first for the files; None keeps it.
fn configure_hosts(s: Option<&Settings>, cfg: Option<&LauncherConfig>) {
    let split = |v: &str| v.split(';').map(str::trim).filter(|x| !x.is_empty()).map(String::from).collect::<Vec<_>>();
    let mut api: Vec<String> = cfg.map(|c| c.api_hosts.iter().map(|h| h.trim().trim_end_matches('/').to_string()).filter(|h| h.starts_with("https://")).collect()).unwrap_or_default();
    api.extend(split(option_env!("ELITE_LOG_HOSTS").unwrap_or("")));
    let mut stores: Vec<String> = cfg.map(|c| c.mirrors.clone()).unwrap_or_default();
    stores.extend(split(BUILTIN_MIRRORS));
    reach::configure(&api, &stores, s.map(|s| s.extra_mirror.trim()));
}
/// The store for a download: the shared pool's order, the active host first (02.11, owner: the launcher must download
/// everywhere; 1.6.22: from the same host as everything else, and a failure moves everything).
fn mirrors(s: &Settings, cfg: Option<&LauncherConfig>) -> Mirrors {
    configure_hosts(Some(s), cfg);
    Mirrors::with_policy(Arc::new(reach::Store))
}

/// The signed launcher.json came: its hosts join the pool (02.11: new servers without a new launcher).
fn note_config(c: &LauncherConfig) { configure_hosts(None, Some(c)); }

fn game_dir(app: &App) -> Option<PathBuf> {
    let cfg = app.config.lock().unwrap().clone().unwrap_or_default();
    let mut s = app.settings.lock().unwrap();
    if let Some(d) = &s.game_dir {
        if game::is_game_dir(d, &cfg.game.marker) {
            return Some(d.clone());
        }
    }
    let found = game::find_game(&cfg.game.folder, &cfg.game.marker);
    if found.is_some() {
        s.game_dir = found.clone();
        save_settings(&s);
    }
    found
}

fn current_channel(app: &App, cfg: &LauncherConfig, installed: &update::State) -> String {
    let s = app.settings.lock().unwrap();
    let want = s.channel.clone().filter(|c| cfg.channels.iter().any(|x| &x.id == c));
    want.or_else(|| Some(installed.channel.clone()).filter(|c| cfg.channels.iter().any(|x| &x.id == c)))
        .or_else(|| cfg.channels.iter().find(|c| c.default).map(|c| c.id.clone()))
        .or_else(|| cfg.channels.first().map(|c| c.id.clone()))
        .unwrap_or_default()
}

#[tauri::command]
fn get_status(app: State<'_, App>) -> Value {
    let cfg = app.config.lock().unwrap().clone();
    let dir = game_dir(&app);
    let installed = dir.as_ref().map(|d| update::Game::new(d).load_state()).unwrap_or_default();
    let cfgd = cfg.clone().unwrap_or_default();
    let channel = current_channel(&app, &cfgd, &installed);
    let target = cfgd.channels.iter().find(|c| c.id == channel).cloned();
    let s = app.settings.lock().unwrap().clone();
    // 1.5.4: the installed version takes no add-ons (they are off, the ticks greyed out); `next`: the version picked does not
    let addons_off = dir.as_ref().is_some_and(|d| addons_blocked(d, &cfgd, &s));
    // 1.6.5: a mod version with add-ons of its own game (IG Rework): the others are off and greyed for it
    let mod_g = if vanilla_on(&cfgd, &s) { None } else { dir.as_ref().and_then(|d| copies_game(d, &cfgd, &s)) };
    let addons_off_next = !vanilla_on(&cfgd, &s) && channel_blocks(&cfgd, &channel);
    let launcher_update = cfgd.launcher_update.as_ref().filter(|u| version_newer(&u.version, LAUNCHER_VERSION)).map(|u| {
        json!({"version": u.version, "text": u.text, "url": u.urls.get(os_name()).or_else(|| u.urls.get("all")).cloned().unwrap_or_default()})
    });
    // the add-on cards; `preview`: a macOS showcase entry (components_preview) - shown, never installed
    let comp_json = |c: &elite_core::config::Component, preview: bool| json!({
            "id": c.id, "name": c.name, "description": c.description, "latest": c.version, "home": c.home, "category": c.category, "order": c.order, "excludes": c.excludes, "requires": c.requires,
            "vanilla_ok": c.for_game("vanilla"), "elite_ok": c.for_game("elite"),
            "vanilla_installed": dir.as_ref().map(|d| update::Game::vanilla_component(d, &c.id).load_state().version).unwrap_or_default(),
            "game_ok": mod_g.as_deref().is_none_or(|g| c.for_game(g)),
            "enabled": !addons_off && mod_g.as_deref().is_none_or(|g| c.for_game(g))   // a version without add-ons (or not for this mod) wins
                && (c.required || s.components.get(&c.id).copied().unwrap_or(c.on_by_default())),
            "chosen": c.required || s.components.get(&c.id).copied().unwrap_or(c.on_by_default()),
            // 1.6.35: on for a new player (the "defaults" of the presets, app.js compPresets); never a dangerous one
            "default": c.on_by_default(),
            "required": c.required, "os": c.os, "danger": c.danger,   // 1.6.29: the card's warning, asked before it goes on
            "conflicts": if preview { Vec::new() } else { dir.as_ref().map(|d| found_conflicts(d, c)).unwrap_or_default() },
            "preview": preview,
            "installed": if preview { String::new() } else if os_name() == "macos" {
                update::Game::component(elite_core::macos::addon_dir(&mac_addons_root(), &c.id), &c.id).load_state().version
            } else { dir.as_ref().map(|d| update::Game::component(d, &c.id).load_state().version).unwrap_or_default() },
            "options": c.opts().iter().map(|o| {
                let k = format!("{}.{}", c.id, o.id);
                json!({
                    "id": o.id, "name": o.name, "group": o.group,
                    "on": s.comp_options.get(&k).copied().unwrap_or(o.default),
                    "choices": o.choices, "value": if o.choices.is_empty() { String::new() } else { o.ini_value(false, s.comp_values.get(&k)) },
                })
            }).collect::<Vec<_>>(),
    });
    json!({
        "launcher_version": LAUNCHER_VERSION,
        "in_game_dir": launcher_in_game_dir(),
        "os": os_name(),
        "lang": s.lang,
        "config": cfg,
        "config_loaded": cfg.is_some(),
        "steam_found": game::steam_installed(),
        // 16.11.2026: macOS - Steam and Feral's game as found (the status line), else null
        "mac": if os_name() == "macos" { mac_status(dir.as_deref(), &cfgd) } else { Value::Null },
        "game_dir": dir,
        "game_found": dir.is_some(),
        "installed_version": installed.version,
        "installed_channel": installed.channel,
        "channel": channel,
        "target_version": target.as_ref().map(|t| t.version.clone()).unwrap_or_default(),
        "update_available": !installed.version.is_empty() && target.as_ref().is_some_and(|t| t.version != installed.version),
        "launcher_update": launcher_update,
        "busy": app.busy.load(Ordering::Relaxed),
        "game_running": app.game_running.load(Ordering::Relaxed),
        // RoomJoin.dll in the game folder (its add-on, or a copy put there by hand for a test): the Lobbies tab offers "Join"
        "roomjoin_dll": dir.as_ref().map(|d| d.join("Elite_DLLs").join("RoomJoin.dll").is_file()).unwrap_or(false),
        "last_error": app.last_error.lock().unwrap().clone(),
        "cache_mb": s.cache_mb.unwrap_or(DEFAULT_CACHE_MB),
        "extra_mirror": s.extra_mirror,
        "dismissed": s.dismissed,
        "mirror_count": reach::store_bases().len(),
        "host": reach::active(),
        // old copies of our add-ons: the window syncs the add-ons (they are put aside there) before Play starts the game
        "old_copies": dir.as_ref().map(|d| old_copies(d, &cfgd)).unwrap_or_default(),
        // 1.4.11: the game Play starts ("elite" / "vanilla"), whether the catalog offers vanilla, and whether the game folder
        // still has to be brought to that game (Play syncs first)
        "game_mode": if vanilla_on(&cfgd, &s) { "vanilla" } else { "elite" },
        "vanilla_offered": vanilla_offered(&cfgd),
        "vanilla": cfgd.vanilla.as_ref().map(|v| json!({"name": v.name, "description": v.description})),
        "mode_sync": dir.as_ref().map(|d| mode_sync_needed(d, &cfgd, &s)).unwrap_or(false),
        "addons_blocked": addons_off,
        "addons_blocked_next": addons_off_next,
        "addon_game": mod_g,
        "components": cfgd.components.iter().map(|c| comp_json(c, false)).collect::<Vec<_>>(),
        "components_preview": cfgd.components_preview.iter().map(|c| comp_json(c, true)).collect::<Vec<_>>(),
        "usage_stats": s.usage_stats.unwrap_or(true),
        "mute_mention": s.mute_mention.unwrap_or(false),
        "close_quits": s.close_quits.unwrap_or(false),
        "lobby_sound": if s.lobby_sound == "sharp" { "sharp" } else { "soft" },
        "lan_share": s.lan_share.unwrap_or(true),
        "release_news": app.release_news.lock().unwrap().clone(),
        "costs": app.costs.lock().unwrap().clone(),
        "prev_channel": s.prev_channel.filter(|p| p != &channel && cfgd.channels.iter().any(|c| &c.id == p)),
        "main_channel": cfgd.channels.iter().find(|c| c.default).map(|c| c.id.clone()).unwrap_or_default(),
    })
}

/// Fetch the newest launcher.json (falls back to the cached one when offline).
#[tauri::command]
async fn refresh(app: AppHandle) -> Result<Value, String> {
    let st = app.state::<App>();
    let s = st.settings.lock().unwrap().clone();
    let cached = st.config.lock().unwrap().clone();
    let appn = app.clone();
    let res = tauri::async_runtime::spawn_blocking(move || {
        let mut m = mirrors(&s, cached.as_ref());
        m.on_status = Some(Box::new(move |msg| { let _ = appn.emit("net", msg); }));
        update::fetch_config(&m)
    })
    .await
    .map_err(|e| e.to_string())?;
    match res {
        Ok((cfg, raw, sig)) => {
            let _ = std::fs::write(data_dir().join("launcher.json"), raw);
            let _ = std::fs::write(data_dir().join("launcher.json.sig"), sig);
            note_config(&cfg);
            *st.config.lock().unwrap() = Some(cfg);
            st.last_error.lock().unwrap().clear();
        }
        Err(e) => *st.last_error.lock().unwrap() = format!("offline: {e}"),
    }
    let a2 = app.clone();
    let _ = tauri::async_runtime::spawn_blocking(move || compute_costs(&a2)).await;
    Ok(get_status(app.state::<App>()))
}

#[tauri::command]
fn set_channel(app: State<'_, App>, id: String) {
    let mut s = app.settings.lock().unwrap();
    s.channel = Some(id);
    save_settings(&s);
}

/// One click: remember where we came from, pick the version and install it right away.
#[tauri::command]
fn switch_to(app: AppHandle, id: String) -> Result<(), String> {
    {
        let st = app.state::<App>();
        if st.busy.load(Ordering::Relaxed) {
            return Err("already running".into());
        }
        let cfg = st.config.lock().unwrap().clone().unwrap_or_default();
        let installed = game_dir(&st).map(|d| update::Game::new(d).load_state()).unwrap_or_default();
        let cur = current_channel(&st, &cfg, &installed);
        let mut s = st.settings.lock().unwrap();
        if !installed.version.is_empty() && cur != id {
            s.prev_channel = Some(cur);
        }
        s.channel = Some(id);
        s.game_mode = String::new();     // 1.4.11: a version of Elite picked = Elite
        save_settings(&s);
    }
    start_update(app, false, None)
}

#[tauri::command]
fn set_setting(app: State<'_, App>, key: String, value: Value) {
    let mut s = app.settings.lock().unwrap();
    match key.as_str() {
        "lang" => s.lang = value.as_str().unwrap_or("").to_string(),
        "extra_mirror" => s.extra_mirror = value.as_str().unwrap_or("").to_string(),
        "cache_mb" => s.cache_mb = value.as_u64(),
        "usage_stats" => s.usage_stats = value.as_bool(),
        "mute_mention" => s.mute_mention = value.as_bool(),
        "close_quits" => s.close_quits = value.as_bool(),
        "lobby_sound" => s.lobby_sound = if value.as_str() == Some("sharp") { "sharp".into() } else { String::new() },
        "lan_share" => { s.lan_share = value.as_bool(); elite_core::lan::ENABLED.store(s.lan_share.unwrap_or(true), Ordering::Relaxed); }
        "dismiss" => {
            if let Some(id) = value.as_str() {
                s.dismissed.push(id.to_string());
            }
        }
        _ => {}
    }
    save_settings(&s);
}

#[tauri::command]
fn open_url(app: AppHandle, url: String) -> Result<(), String> {
    let ok = url.starts_with("https://") || url.starts_with("http://") || url.starts_with("steam://");
    if !ok {
        return Err("unsupported link".into());
    }
    // 1.6.21 (owner 17.11.2026): a link to our site - built here, from launcher.json, notice.json or the server - opens on the
    // mirror the launcher uses now
    let url = reach::site_link(&url, &reach::site_base());
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

/// 1.6.21: our site's base for the window (app.js siteBase); 1.6.22: the active host of the shared pool (reach.rs), the window
/// hears of a change by the "host_active" event.
#[tauri::command]
fn site_host() -> String { reach::site_base() }

// ---------- our servers: one HTTP agent and the community log (every module calls them as crate::X); the hosts: reach.rs ----------
/// One agent for every call to our servers: connections are kept and reused instead of a new TCP + TLS handshake per
/// request. A request's own .timeout() still caps the whole request.
static HTTP: LazyLock<ureq::Agent> = LazyLock::new(|| {
    ureq::AgentBuilder::new().timeout_connect(Duration::from_secs(10)).timeout_read(Duration::from_secs(20)).build()
});

/// 1.6.19: a connection test found the stream to these addresses cut on the way (DPI): our hosts at them are set aside
/// (reach.rs) - the stream, the API and the files go to another host. `what`: which test, for community.log.
fn api_set_aside_at(ips: &[std::net::IpAddr], what: &str) {
    if ips.is_empty() { return; }
    for h in reach::api_hosts() {
        let Some(a) = stream::host_addr(&h) else { continue };
        if ips.contains(&a.ip()) && reach::set_aside(&h, &format!("{what}: the stream to {} is cut on the way", a.ip())) {
            c_log(&format!("{what}: the stream to {} ({h}) is cut on the way - set aside for {} h, everything goes to {}", a.ip(),
                reach::SET_ASIDE_SECS / 3600, reach::api_hosts().into_iter().find(|x| *x != h).unwrap_or_else(|| "no other host".into())));
        }
    }
}

/// What the shared host pool (reach.rs) tells the launcher; handled by host_worker, never in the pool's callback.
enum HostEv { Order(Vec<reach::Probe>), Switch(String, String, String) }
static HOST_EV: std::sync::OnceLock<Mutex<std::sync::mpsc::Sender<HostEv>>> = std::sync::OnceLock::new();
fn host_ev(e: HostEv) { if let Some(tx) = HOST_EV.get() { let _ = tx.lock().unwrap_or_else(|e| e.into_inner()).send(e); } }
/// The hosts' worker (one thread): the order into the settings and the window, a change of the active host into community.log, the
/// window and - while no game runs and no sync writes them - the add-ons' Server= lists.
fn host_worker(app: AppHandle, rx: std::sync::mpsc::Receiver<HostEv>) {
    while let Ok(first) = rx.recv() {
        let mut evs = vec![first];
        evs.extend(rx.try_iter());
        let order = evs.iter().rev().find_map(|e| if let HostEv::Order(l) = e { Some(l.clone()) } else { None });   // the newest order only
        for e in evs {
            let HostEv::Switch(from, to, why) = e else { continue };
            c_log(&format!("mirror: active host {} -> {} ({why})", if from.is_empty() { "none" } else { &from }, if to.is_empty() { "none" } else { &to }));
            let _ = app.emit("host_active", json!({"host": to, "site": reach::site_base()}));
            // the in-game add-ons read their Server= at the game's start: the next start goes to the new host too (launch.rs writes it
            // before every start as well)
            let st = app.state::<App>();
            if st.game_running.load(Ordering::SeqCst) || is_game_running() { continue; }
            if let Some(d) = game_dir(&st) {
                match addons::try_write_server_inis(&d, &reach::api_hosts()) {
                    Some(w) if !w.is_empty() => c_log(&format!("mirror: the add-ons' Server= now {to} ({})", w.join(", "))),
                    _ => {}
                }
            }
        }
        if let Some(list) = order {
            let st = app.state::<App>();
            {
                let mut s = st.settings.lock().unwrap();
                if s.net_hosts.len() != list.len() || serde_json::to_value(&s.net_hosts).ok() != serde_json::to_value(&list).ok() {
                    s.net_hosts = list;
                    save_settings(&s);
                }
            }
            let _ = app.emit("net_rank", net_status_json());
        }
    }
}

/// community.log in the launcher's folder: every sign-in step and failed call (goes with "Send logs"); kept under 256 KB.
fn c_log(msg: &str) {
    let p = data_dir().join("community.log");
    if std::fs::metadata(&p).map(|m| m.len() > 256 << 10).unwrap_or(false) { let _ = std::fs::rename(&p, data_dir().join("community.log.old")); }
    let t = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&p) {
        use std::io::Write;
        let _ = writeln!(f, "{t} {msg}");
    }
}

fn main() {
    // 1.6.32 (players: "two launchers start"): another copy runs as administrator - the single-instance plugin can not see it
    // (its mutex: access denied) and would start this one in full; say so and quit (tray.rs)
    #[cfg(windows)]
    if tray::elevated_copy_runs("mod.elite.launcher") {
        tray::tell_elevated_copy();
        return;
    }
    let settings = load_settings();
    let config = cached_config();
    tauri::Builder::default()
        // one launcher at a time: starting it again (shortcut, Start menu) brings the running one back, also from the
        // tray. Two copies also broke the self-update: the installer could not close the one hidden in the tray.
        // 1.4.9: an elite://join/<id> link given to a second copy reaches this one through the deep-link plugin (the
        // single-instance plugin hands it the arguments first), see .setup
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_window(app)))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().pubkey(UPDATER_PUBKEY.trim()).build())
        .manage(App {
            settings: Mutex::new(settings),
            config: Mutex::new(config),
            busy: AtomicBool::new(false),
            game_running: AtomicBool::new(is_game_running()),
            cancel: Mutex::new(None),
            last_error: Mutex::new(String::new()),
            costs: Mutex::new(BTreeMap::new()),
            launcher_update: Mutex::new(None),
            release_news: Mutex::new(
                std::fs::read(data_dir().join("news.json")).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default(),
            ),
        })
        .setup(|app| {
            // 1.6.27 (SirItos 19.11.2026): the window opens where the player left it (size, place, maximized - winstate.rs); it is
            // created hidden (tauri.conf.json) and shown only here, once placed. Shown whatever happens - a launcher never stays invisible
            let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| winstate::restore(app.handle())));
            if let Some(w) = app.get_webview_window("main") { let _ = w.show(); }
            // 1.4.9: links elite://join/<id>?name=... (the ladder site's Join): registered for this user at every start (the
            // installer does it too; this covers the portable zip and the AppImage), handled like Join in the Lobbies tab
            #[cfg(any(windows, target_os = "linux"))]
            if let Err(e) = app.deep_link().register_all() { c_log(&format!("rooms: elite:// links not registered: {e}")); }
            let hl = app.handle().clone();
            app.deep_link().on_open_url(move |ev| {
                show_window(&hl);
                for u in ev.urls() { roomjoin::on_link(&hl, u.as_str()); }
            });
            if let Ok(Some(urls)) = app.deep_link().get_current() {     // started by a link
                for u in urls { roomjoin::on_link(app.handle(), u.as_str()); }
            }
            // Elite for the neighbours on the local network: the files of the installed version and of the version cache,
            // only those still as installed (same size; the neighbour checks the SHA-256 against the signed manifest anyway)
            elite_core::lan::ENABLED.store(app.state::<App>().settings.lock().unwrap().lan_share.unwrap_or(true), Ordering::Relaxed);
            let hl = app.handle().clone();
            elite_core::lan::serve(Arc::new(move |sha: &str| {
                let st = hl.state::<App>();
                let g = update::Game::new(game_dir(&st)?);
                let c = g.cache_dir().join(sha);
                if let Ok(md) = std::fs::metadata(&c) { if md.is_file() { return Some((c, md.len())); } }
                let f = g.load_state().files.into_iter().find(|f| f.sha.eq_ignore_ascii_case(sha))?;
                let p = g.file(&f.path);
                (std::fs::metadata(&p).ok()?.len() == f.size).then_some((p, f.size))
            }));
            // 1.3.13 (owner: no traces of the 1.3.10 hang help): the hang dumps it wrote into our own folder go, once, quietly
            let _ = std::fs::remove_dir_all(data_dir().join("dumps"));
            // our hosts (reach.rs, 1.6.22: one pool, one active host for everything): the order of the last start until the check that
            // starts now (no ICMP - one HTTPS answer per host); again every 10 minutes and when a host stops answering; the order is
            // kept for the next start. One line in community.log per change of the active host; the window builds its links and
            // pictures on it ("host_active")
            // the pool's callbacks come from any thread (a download, the stream, a request, a check) - they only hand the event to
            // the hosts' worker, which saves, logs, tells the window and writes the add-ons' Server= (reviewer 17.11.2026: no lock
            // and no disk in a callback - the first one came while the config's lock was held and game_dir took it again)
            let (tx, rx) = std::sync::mpsc::channel::<HostEv>();
            let _ = HOST_EV.set(Mutex::new(tx));
            let hw = app.handle().clone();
            std::thread::spawn(move || host_worker(hw, rx));
            reach::on_checked(|list| host_ev(HostEv::Order(list.to_vec())));
            reach::on_switch(|from, to, why| host_ev(HostEv::Switch(from.to_string(), to.to_string(), why.to_string())));
            {
                let st = app.state::<App>();
                let s = st.settings.lock().unwrap().clone();
                let cfg = st.config.lock().unwrap().clone();   // no lock held over the pool's calls
                reach::seed(if s.net_hosts.is_empty() { s.net_api.clone() } else { s.net_hosts.clone() });
                configure_hosts(Some(&s), cfg.as_ref());
            }
            reach::check_soon(0);
            reach::start_recheck();
            let hs = app.handle().clone();
            std::thread::spawn(move || stream_loop(hs));
            // watch the game: the window locks add-ons while it runs and picks pending updates up once it closes
            let hg = app.handle().clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_secs(3));
                let now = is_game_running();
                reach::GAME_RUNNING.store(now, Ordering::SeqCst);   // no periodic check of our hosts during a match
                if hg.state::<App>().game_running.swap(now, Ordering::SeqCst) != now {
                    let _ = hg.emit("game_running", now);
                }
            });
            let open = MenuItemBuilder::with_id("open", "Open Elite Launcher").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&open, &quit]).build()?;
            let tb = TrayIconBuilder::with_id("main")
                .tooltip("Elite Launcher")
                .icon(tray::icon(app.handle(), false))   // 1.6.32: the cross bigger than the window's icon (tray.rs)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => show_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                // Linux delivers no tray clicks, only the menu: "Open" is there for it
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        show_window(tray.app_handle());
                    }
                });
            let icon = tb.build(app)?;
            app.manage(Tray { open, quit, icon });
            // 1.6.32 (players: "two launchers"): a copy older than 1.3.7 runs beside this one - said in the window (app.js), in the log
            #[cfg(windows)]
            {
                let ho = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_secs(20));
                    let old = tray::old_copies();
                    if !old.is_empty() {
                        c_log(&format!("another launcher process runs beside this one: pid {:?}", old));
                        let _ = ho.emit("other_copy", old.len());
                    }
                });
            }

            // release notes as news: now and every hour; the window redraws when they change
            let hn = app.handle().clone();
            std::thread::spawn(move || loop {
                if let Some(news) = fetch_release_news() {
                    let st = hn.state::<App>();
                    let changed = *st.release_news.lock().unwrap() != news;
                    if changed {
                        let _ = std::fs::write(data_dir().join("news.json"), serde_json::to_vec(&news).unwrap_or_default());
                        *st.release_news.lock().unwrap() = news;
                        let _ = hn.emit("news", ());
                    }
                }
                std::thread::sleep(Duration::from_secs(3600));
            });
            let h = app.handle().clone();
            // once now (after the window is up) and then every few hours for launchers left open over midnight
            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_secs(30));
                usage_ping(&h);
                std::thread::sleep(Duration::from_secs(4 * 3600));
            });
            Ok(())
        })
        // the close button hides to the tray, only the tray's "Quit" ends the launcher; minimising is an ordinary
        // minimise to the taskbar. The tray icon (or its "Open" item, or starting the launcher again) brings it back
        .on_window_event(|window, event| {
            // 1.6.27: the window's size and place are kept (winstate.rs): after a move / resize, and when it is closed or hidden
            if matches!(event, tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_)) { winstate::touch(); }
            // 1.6.32 (memory): WebView2 does not notice its window hidden in the tray (document.hidden stays false) - the page is
            // told (app.js WINVIS: its polls and redraws wait, the animations stop); a focused window is seen again
            if let tauri::WindowEvent::Focused(true) = event {
                if let Some(w) = window.app_handle().get_webview_window(window.label()) { tray::webview_shown(&w, true); }
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if let Some(w) = window.app_handle().get_webview_window(window.label()) { winstate::save_now(&w); }
                // 1.3.12 (owner): a tick in Settings - the close button quits the launcher instead of hiding it in the tray
                if window.app_handle().state::<App>().settings.lock().unwrap().close_quits.unwrap_or(false) {
                    window.app_handle().exit(0);
                    return;
                }
                api.prevent_close();
                let _ = window.hide();
                if let Some(w) = window.app_handle().get_webview_window(window.label()) { tray::webview_shown(&w, false); }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_status, refresh, set_channel, switch_to, logs::send_logs, addons::set_comp_option, set_setting, addons::set_component, addons::rating_sys_set, addons::clean_junk, install::pick_game_dir, open_url, site_host, addons::set_comp_value, install::open_game_dir, install::start_update, install::cancel_update, launch::play,
            feedback::fb_info, feedback::fb_set_name, feedback::fb_send, feedback::fb_thread, set_tray_labels, tray_mark, selfupdate::launcher_check, selfupdate::launcher_install, feeds::rooms_live,
            roomjoin::room_join, roomjoin::room_join_probe, roomjoin::room_join_cancel, roomjoin::room_link_take,
            livewatch::live_watch, livewatch::live_watch_probe, livewatch::live_watch_cancel,
            replayopen::replay_open, replayopen::replay_open_probe, replayopen::replay_open_cancel,
            replays::replays_local, replays::replays_pool, replays::replays_steams, replays::replays_versions, replays::replays_have, replays::replay_info, replays::replay_upload,
            replays::replay_describe, replays::replay_download, replays::replay_delete, replays::replays_open_dir,
            lroom::lroom_api, lroom::lroom_list, lroom::fame_get, lroom::own_get, lroom::notice_get, lroom::lroom_pings, lroom::lroom_launch, lroom::lroom_launch_cancel, lroom::lroom_probe, lroom::lroom_attention,
            prefs::hotkeys_get, prefs::hotkeys_save, prefs::hotkeys_reset, prefs::ui_scale_get, prefs::ui_scale_set, install::uninstall_elite,
            community::c_status, community::c_login, community::c_login_local, community::c_login_cancel, community::c_logout, community::c_api, stream::c_stream_up, netcheck::net_status, netcheck::net_check, feeds::mm_live, feeds::events_get,
            netcheck::relic_probe, netcheck::game_net_check, vanilla::set_game_mode,
            conntest::nettest_run, conntest::nettest_cancel, conntest::nettest_history, conntest::nq_api
        ])
        .build(tauri::generate_context!())
        .expect("error while running Elite Launcher")
        .run(|_app, _event| {
            // 1.6.27: the tray's Quit (and any exit): the window's last size and place kept
            if let tauri::RunEvent::ExitRequested { .. } = _event {
                if let Some(w) = _app.get_webview_window("main") { winstate::save_now(&w); }
            }
            // macOS: a click on the Dock icon brings back the window the close button hid
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = _event {
                show_window(_app);
            }
        });
}

