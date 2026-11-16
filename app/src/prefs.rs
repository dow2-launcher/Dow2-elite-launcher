//! The game's hotkeys and the UI scale.
//! Split out of main.rs (1.6.17): the items as they were; main.rs keeps the app's state, settings, config and main().
use super::*;

/// Hotkeys: every binding of the game (defaults + the player's changes) and the Grid Hotkeys setting.
#[tauri::command]
pub fn hotkeys_get(app: State<'_, App>) -> Result<Value, String> {
    // what the game uses now (keydefaults.lua), with the launcher's own list on top
    let mut o = elite_core::hotkeys::file_overrides();
    o.extend(app.settings.lock().unwrap().hotkeys.clone());
    elite_core::hotkeys::load(&o)
}

/// Save the player's hotkeys: only the bindings that differ from the game's defaults are kept.
#[tauri::command]
pub fn hotkeys_save(app: State<'_, App>, changes: BTreeMap<String, String>, grid: bool) -> Result<Value, String> {
    ensure_game_closed(&app)?;     // the game rewrites configuration.lua when it closes
    let mut s = app.settings.lock().unwrap();
    // changes already in keydefaults.lua but not in our list (see hotkeys_get) are kept, not dropped by the rewrite
    for (k, v) in elite_core::hotkeys::file_overrides() { s.hotkeys.entry(k).or_insert(v); }
    // system keys (menu, camera) are not reassigned, campaign / "plain letters" ones are not shown: changes to them are ignored
    let defaults: BTreeMap<String, String> = elite_core::hotkeys::load(&BTreeMap::new())?["bindings"].as_array().cloned().unwrap_or_default()
        .iter().filter(|b| !matches!(b["group"].as_str(), Some("system" | "campaign" | "letters"))).map(|b| (format!("{}:{}", b["scope"].as_str().unwrap_or(""), b["name"].as_str().unwrap_or("")), b["default"].as_str().unwrap_or("").to_string())).collect();
    for (k, v) in changes {
        if defaults.get(&k) == Some(&v) { s.hotkeys.remove(&k); } else if defaults.contains_key(&k) { s.hotkeys.insert(k, v); }
    }
    elite_core::hotkeys::apply(&s.hotkeys, Some(grid))?;
    save_settings(&s);
    let o = s.hotkeys.clone(); drop(s);
    elite_core::hotkeys::load(&o)
}

/// Game UI scale (`uiscale` in configuration.lua, %): the value now and whether the file is there (not yet: the game writes it at its first start).
#[tauri::command]
pub fn ui_scale_get() -> Value {
    let (v, found) = elite_core::hotkeys::ui_scale_get();
    json!({"value": v, "found": found, "min": elite_core::hotkeys::UI_SCALE_MIN, "max": elite_core::hotkeys::UI_SCALE_MAX})
}

#[tauri::command]
pub fn ui_scale_set(app: State<'_, App>, value: u32) -> Result<Value, String> {
    ensure_game_closed(&app)?;     // the game rewrites configuration.lua when it closes
    elite_core::hotkeys::ui_scale_set(value)?;
    Ok(ui_scale_get())
}

/// Back to the game's own hotkeys: no keydefaults.lua, no changes kept (Grid Hotkeys stays as it is).
#[tauri::command]
pub fn hotkeys_reset(app: State<'_, App>) -> Result<Value, String> {
    ensure_game_closed(&app)?;
    let mut s = app.settings.lock().unwrap();
    s.hotkeys.clear();
    elite_core::hotkeys::apply(&s.hotkeys, None)?;
    save_settings(&s); drop(s);
    elite_core::hotkeys::load(&BTreeMap::new())
}
