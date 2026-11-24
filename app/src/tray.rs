//! 1.6.32 (owner 24.11.2026): the tray's own icon and the second launcher.
//! - The icon: the cross of the launcher's icon bigger than in the window's icon (it fills the tray's square), and the same with a
//!   yellow dot (the news dot's colour) while a mention of the player in the chat waits unseen (chat.js chMark -> tray_mark in
//!   main.rs). Raw RGBA made by scripts/tray_icons.py (no image decoder in the app); the size for the screen's scale (16 px at 100 %).
//! - A copy started while another one runs as administrator: the single-instance plugin can not open that one's mutex (access
//!   denied, not "already exists") and let the second launcher start in full (players reported two launchers). Checked here
//!   before the plugin: such a copy says so and quits. A copy older than 1.3.7 has no single-instance check at all: found by
//!   its process (old_copies) and told in the window.
//! - The window hidden in the tray: WebView2 does not notice it by itself (document.hidden stayed false, nothing was throttled) -
//!   webview_shown tells it (IsVisible) and asks it to keep little memory meanwhile (MemoryUsageTargetLevel Low), and tells the page.
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::image::Image;
use tauri::{AppHandle, Emitter, Manager};

static WEB_HIDDEN: AtomicBool = AtomicBool::new(false);

/// 1.6.32 (memory, players: "the launcher eats a lot of memory"): the window went to the tray (false) or came back (true). Only a
/// change acts. The page hears "win_vis" (app.js WINVIS); on Windows the WebView2 controller is made invisible and its memory target
/// Low - it drops what it keeps for drawing while nobody sees it; scripts and the stream go on.
pub fn webview_shown(w: &tauri::WebviewWindow, on: bool) {
    if WEB_HIDDEN.swap(!on, Ordering::SeqCst) == !on { return; }
    let _ = w.app_handle().emit("win_vis", on);
    #[cfg(windows)]
    {
        let _ = w.with_webview(move |pv| unsafe {
            use webview2_com::Microsoft::Web::WebView2::Win32::{ICoreWebView2_19, COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL};
            use windows_core::Interface;
            let c = pv.controller();
            if on { let _ = c.SetIsVisible(true); }
            if let Ok(wv) = c.CoreWebView2() {
                if let Ok(w19) = wv.cast::<ICoreWebView2_19>() {   // WebView2 runtime 1.0.2210+; an older one: just the visibility
                    let _ = w19.SetMemoryUsageTargetLevel(COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL(if on { 0 } else { 1 }));
                }
            }
            if !on { let _ = c.SetIsVisible(false); }
        });
    }
}

/// Windows: other launcher processes (not this one) - a copy older than 1.3.7 (no single-instance check) under any of the
/// launcher's names. Asked 20 s after the start, so a second copy that is just being turned away by the plugin is gone by then.
#[cfg(windows)]
pub fn old_copies() -> Vec<u32> {
    let me = std::process::id();
    let mut names: Vec<String> = ["Elite Launcher.exe", "EliteLauncher.exe", "elite-launcher.exe", "DoW Launcher.exe"].iter().map(|s| s.to_string()).collect();
    if let Some(n) = std::env::current_exe().ok().and_then(|p| p.file_name().map(|n| n.to_string_lossy().into_owned())) { names.push(n); }
    crate::gameproc::procs::pids_named(&names).into_iter().filter(|&p| p != me).collect()
}

const SIZES: [u32; 4] = [16, 24, 32, 48];
const PLAIN: [&[u8]; 4] = [include_bytes!("../icons/tray/16.rgba"), include_bytes!("../icons/tray/24.rgba"),
                           include_bytes!("../icons/tray/32.rgba"), include_bytes!("../icons/tray/48.rgba")];
const DOT: [&[u8]; 4] = [include_bytes!("../icons/tray/16-dot.rgba"), include_bytes!("../icons/tray/24-dot.rgba"),
                         include_bytes!("../icons/tray/32-dot.rgba"), include_bytes!("../icons/tray/48-dot.rgba")];

/// The smallest of our sizes that covers the tray's square at this scale (16 px x the scale); the largest past 300 %.
fn pick(scale: f64) -> usize {
    let want = (16.0 * if scale.is_finite() && scale > 0.0 { scale } else { 1.0 }).round() as u32;
    SIZES.iter().position(|&s| s >= want).unwrap_or(SIZES.len() - 1)
}

/// The tray's icon for the main window's screen; `dot` - a mention of the player waits.
pub fn icon(app: &AppHandle, dot: bool) -> Image<'static> {
    let scale = app.get_webview_window("main").and_then(|w| w.scale_factor().ok()).unwrap_or(1.0);
    let i = pick(scale);
    Image::new(if dot { DOT[i] } else { PLAIN[i] }, SIZES[i], SIZES[i])
}

/// Windows: another copy of the launcher runs with more rights (as administrator) - its single-instance mutex is there but can
/// not be opened. The plugin's own check covers every other case (the same rights: the running one is brought to the front).
#[cfg(windows)]
pub fn elevated_copy_runs(identifier: &str) -> bool {
    #[link(name = "kernel32")]
    extern "system" {
        fn OpenMutexW(access: u32, inherit: i32, name: *const u16) -> isize;
        fn GetLastError() -> u32;
        fn CloseHandle(h: isize) -> i32;
    }
    // the plugin's name: "<identifier>-sim" (tauri-plugin-single-instance, no "semver" feature)
    let name: Vec<u16> = format!("{identifier}-sim").encode_utf16().chain(std::iter::once(0)).collect();
    unsafe {
        let h = OpenMutexW(0x0010_0000 /* SYNCHRONIZE */, 0, name.as_ptr());
        if h != 0 { CloseHandle(h); return false; }
        GetLastError() == 5 /* ERROR_ACCESS_DENIED */
    }
}

/// The message of a copy that quits because another one runs as administrator (before any window: the system's own box).
#[cfg(windows)]
pub fn tell_elevated_copy() {
    #[link(name = "user32")]
    extern "system" { fn MessageBoxW(w: isize, text: *const u16, caption: *const u16, kind: u32) -> i32; }
    let w = |s: &str| s.encode_utf16().chain(std::iter::once(0)).collect::<Vec<u16>>();
    let text = w("DoW Launcher is already running as administrator.\n\nOpen it from the tray (the icon by the clock). To start it \
                  the usual way, quit that one first (right click on its tray icon - Quit).");
    unsafe { MessageBoxW(0, text.as_ptr(), w("DoW Launcher").as_ptr(), 0x40 /* MB_ICONINFORMATION */ | 0x0001_0000 /* MB_SETFOREGROUND */); }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn the_size_covers_the_tray_square() {
        assert_eq!(SIZES[pick(1.0)], 16);
        assert_eq!(SIZES[pick(1.25)], 24);
        assert_eq!(SIZES[pick(1.5)], 24);
        assert_eq!(SIZES[pick(2.0)], 32);
        assert_eq!(SIZES[pick(3.0)], 48);
        assert_eq!(SIZES[pick(4.0)], 48);
        assert_eq!(SIZES[pick(f64::NAN)], 16);
        for (i, s) in SIZES.iter().enumerate() {
            assert_eq!(PLAIN[i].len(), (s * s * 4) as usize);
            assert_eq!(DOT[i].len(), (s * s * 4) as usize);
        }
    }
}
