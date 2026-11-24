//! 1.6.32 (owner 24.11.2026): the tray's own icon and the second launcher.
//! - The icon: the cross of the launcher's icon bigger than in the window's icon (it fills the tray's square), and the same with a
//!   yellow dot (the news dot's colour) while a mention of the player in the chat waits unseen (chat.js chMark -> tray_mark in
//!   main.rs). Raw RGBA made by scripts/tray_icons.py (no image decoder in the app); the size for the screen's scale (16 px at 100 %).
//! - A copy started while another one runs as administrator: the single-instance plugin can not open that one's mutex (access
//!   denied, not "already exists") and let the second launcher start in full (players reported two launchers). Checked here
//!   before the plugin: such a copy says so and quits.
use tauri::image::Image;
use tauri::{AppHandle, Manager};

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
