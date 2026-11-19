//! The main window's size, position and maximized state across starts and updates (1.6.27, SirItos 19.11.2026: "every update resets
//! how I stretched it"). Kept in `<config>/EliteLauncher/window.json` - data_dir(), the folder of settings.json that the installer and
//! the self-update never touch; a file of its own, so the writes while the window is dragged never touch settings.json. Sizes in
//! logical px (the same on a 100 % and a 150 % screen), the corner in the desktop's physical px. Where the window goes on the screens
//! of the moment (gone screen, off-screen, bigger than the work area, the 900 x 600 minimum): elite_core::winplace, tested there.
//! The window starts hidden (app/tauri.conf.json "visible": false): .setup places it, then shows it - no jump.
//! Saved: half a second after the last move / resize, when the close button hides or quits, and when the launcher exits.
use super::*;
use elite_core::winplace::{self, Area, Saved};
use std::sync::OnceLock;
use tauri::{LogicalSize, PhysicalPosition, WebviewWindow};

const FILE: &str = "window.json";
/// The last normal (not maximized) rect: a maximized window keeps the one it will go back to.
static NORMAL: Mutex<Option<Saved>> = Mutex::new(None);
static TX: OnceLock<Mutex<std::sync::mpsc::Sender<()>>> = OnceLock::new();

fn load() -> Option<Saved> {
    let v: Value = serde_json::from_slice(&std::fs::read(data_dir().join(FILE)).ok()?).ok()?;
    let int = |k: &str| v.get(k).and_then(Value::as_i64).map(|n| n.clamp(i32::MIN as i64, i32::MAX as i64) as i32);
    let pos = match (int("x"), int("y")) { (Some(x), Some(y)) => Some((x, y)), _ => None };
    Some(Saved { pos, w: v.get("w")?.as_f64()?, h: v.get("h")?.as_f64()?, max: v.get("max").and_then(Value::as_bool).unwrap_or(false) })
}

fn write(s: &Saved) {
    let mut v = json!({ "w": (s.w * 10.0).round() / 10.0, "h": (s.h * 10.0).round() / 10.0, "max": s.max });
    if let Some((x, y)) = s.pos { v["x"] = json!(x); v["y"] = json!(y); }
    let (p, tmp) = (data_dir().join(FILE), data_dir().join("window.json.tmp"));
    if std::fs::write(&tmp, serde_json::to_vec(&v).unwrap_or_default()).is_ok() { let _ = std::fs::rename(&tmp, &p); }
}

/// The window now: None while minimized (Windows parks it at -32000) - the place before stays.
fn snapshot(w: &WebviewWindow) -> Option<Saved> {
    if w.is_minimized().unwrap_or(false) { return None; }
    let max = w.is_maximized().unwrap_or(false);
    let mut normal = NORMAL.lock().unwrap();
    if !max {
        let sf = w.scale_factor().ok()?;
        let size = w.inner_size().ok()?.to_logical::<f64>(sf);
        let pos = w.outer_position().ok().map(|p| (p.x, p.y));      // Wayland: none
        *normal = Some(Saved { pos, w: size.width, h: size.height, max: false });
    }
    let base = (*normal).or_else(load).unwrap_or(Saved { pos: None, w: winplace::DEFAULT_W, h: winplace::DEFAULT_H, max: false });
    Some(Saved { max, ..base })
}

pub fn save_now(w: &WebviewWindow) {
    if let Some(s) = snapshot(w) { write(&s); }
}

/// A move / resize: saved once the window has been still for half a second (one write per drag, not one per pixel).
pub fn touch() {
    if let Some(t) = TX.get() { let _ = t.lock().unwrap().send(()); }
}

/// At the start, before the window shows: put it where it was (or the nearest sane place), then the saver.
pub fn restore(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        if let Some(s) = load() {
            let mons = w.available_monitors().unwrap_or_default();
            let areas: Vec<Area> = mons.iter().map(|m| {
                let a = m.work_area();
                Area { x: a.position.x, y: a.position.y, w: a.size.width, h: a.size.height, scale: m.scale_factor() }
            }).collect();
            let prim = w.primary_monitor().ok().flatten().and_then(|p| mons.iter().position(|m| m.position() == p.position() && m.size() == p.size()));
            let p = winplace::place(&s, &areas, prim);
            let _ = w.set_size(LogicalSize::new(p.w, p.h));
            match p.pos { Some((x, y)) => { let _ = w.set_position(PhysicalPosition::new(x, y)); } None => { let _ = w.center(); } }
            if p.max { let _ = w.maximize(); }
            *NORMAL.lock().unwrap() = Some(Saved { pos: p.pos, w: p.w, h: p.h, max: false });
        }
    }
    let (tx, rx) = std::sync::mpsc::channel::<()>();
    let _ = TX.set(Mutex::new(tx));
    let h = app.clone();
    std::thread::spawn(move || {
        while rx.recv().is_ok() {
            while rx.recv_timeout(Duration::from_millis(500)).is_ok() {}
            if let Some(w) = h.get_webview_window("main") { save_now(&w); }
        }
    });
}
