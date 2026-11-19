//! Where the launcher's window opens (1.6.27, SirItos 19.11.2026: "make the launcher remember its window - every update resets how I
//! stretched it"). The launcher keeps the window's last size (logical px - the same on a 100 % and a 150 % screen), position (the
//! desktop's physical px, as the system reports it) and maximized state (app/src/winstate.rs, `<config>/EliteLauncher/window.json`,
//! the folder that survives updates); this decides where it goes on the screens there are now:
//! - the saved place when its title band is on one of the screens (enough of it to grab), pulled fully onto that screen's work area
//!   (no taskbar / dock overlap) and its size cut down to that area;
//! - else (that screen is gone, the place is off every screen, or no position - Wayland tells none): centred on the primary screen
//!   with the saved size cut down to its work area;
//! - never under the window's minimum (900 x 600, app/tauri.conf.json) unless the screen is smaller; broken numbers -> the default.
//! Pure: no window system here - the tests below run anywhere (cargo test -p elite-core).

/// The window as it was left.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Saved {
    /// Top-left corner of the outer window, desktop physical px; None = not known (Wayland).
    pub pos: Option<(i32, i32)>,
    /// Inner size, logical px.
    pub w: f64,
    pub h: f64,
    pub max: bool,
}

/// A screen's work area (desktop physical px) and its scale (1.0 = 100 %).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Area {
    pub x: i32,
    pub y: i32,
    pub w: u32,
    pub h: u32,
    pub scale: f64,
}

/// Where the window goes: the corner (None = centre it on the primary screen the system's way), the inner size (logical px), maximized.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Placed {
    pub pos: Option<(i32, i32)>,
    pub w: f64,
    pub h: f64,
    pub max: bool,
}

pub const MIN_W: f64 = 900.0;
pub const MIN_H: f64 = 600.0;
pub const DEFAULT_W: f64 = 1120.0;
pub const DEFAULT_H: f64 = 700.0;
/// The part of the window that must be on a screen to count as there: its top band (the title bar), this tall and this wide (logical px).
const GRAB_H: f64 = 24.0;
const GRAB_W: f64 = 120.0;

fn dim(v: f64, min: f64, def: f64) -> f64 {
    if v.is_finite() && v > 0.0 && v < 100_000.0 { v.max(min) } else { def }
}

/// The overlap (physical px) of [a0, a1) and [b0, b1).
fn overlap(a0: f64, a1: f64, b0: f64, b1: f64) -> f64 {
    (a1.min(b1) - a0.max(b0)).max(0.0)
}

/// The saved size cut down to an area (logical px of that area), not under the minimum unless the area itself is smaller.
fn fit(w: f64, h: f64, a: &Area) -> (f64, f64) {
    let (aw, ah) = (a.w as f64 / a.scale, a.h as f64 / a.scale);
    (w.min(aw.max(MIN_W.min(aw))), h.min(ah.max(MIN_H.min(ah))))
}

pub fn place(s: &Saved, areas: &[Area], primary: Option<usize>) -> Placed {
    let (w, h) = (dim(s.w, MIN_W, DEFAULT_W), dim(s.h, MIN_H, DEFAULT_H));
    let areas: Vec<Area> = areas.iter().copied().filter(|a| a.w > 0 && a.h > 0 && a.scale.is_finite() && a.scale > 0.0).collect();
    if areas.is_empty() {
        return Placed { pos: s.pos, w, h, max: s.max };      // the system told no screens: as it was
    }
    // the screen with the most of the window's title band on it
    let on = s.pos.and_then(|(x, y)| {
        areas.iter().map(|a| {
            let (x, y, pw) = (x as f64, y as f64, w * a.scale);
            let (ax, ay) = (a.x as f64, a.y as f64);
            let ow = overlap(x, x + pw, ax, ax + a.w as f64);
            let oh = overlap(y, y + GRAB_H * a.scale, ay, ay + a.h as f64);
            (a, ow, oh)
        }).filter(|(a, ow, oh)| *ow >= GRAB_W * a.scale && *oh >= GRAB_H * a.scale * 0.5).max_by(|p, q| (p.1 * p.2).total_cmp(&(q.1 * q.2))).map(|(a, ..)| (*a, x, y))
    });
    if let Some((a, x, y)) = on {
        let (w, h) = fit(w, h, &a);
        let (pw, ph) = ((w * a.scale).round() as i32, (h * a.scale).round() as i32);
        let cx = x.min(a.x + a.w as i32 - pw).max(a.x);
        let cy = y.min(a.y + a.h as i32 - ph).max(a.y);
        return Placed { pos: Some((cx, cy)), w, h, max: s.max };
    }
    let a = primary.and_then(|i| areas.get(i)).copied().unwrap_or(areas[0]);
    let (w, h) = fit(w, h, &a);
    let (pw, ph) = ((w * a.scale).round() as i32, (h * a.scale).round() as i32);
    let pos = s.pos.map(|_| (a.x + (a.w as i32 - pw).max(0) / 2, a.y + (a.h as i32 - ph).max(0) / 2));
    Placed { pos, w, h, max: s.max }
}

#[cfg(test)]
mod tests {
    use super::*;
    const FHD: Area = Area { x: 0, y: 0, w: 1920, h: 1040, scale: 1.0 };       // 1080p, a 40 px taskbar at the bottom
    const RIGHT: Area = Area { x: 1920, y: 0, w: 2560, h: 1400, scale: 1.0 };  // a second screen to the right
    fn sv(x: i32, y: i32, w: u32, h: u32) -> Saved { Saved { pos: Some((x, y)), w: w as f64, h: h as f64, max: false } }

    #[test]
    fn kept_where_it_was() {
        assert_eq!(place(&sv(100, 80, 1300, 800), &[FHD], Some(0)), Placed { pos: Some((100, 80)), w: 1300.0, h: 800.0, max: false });
    }
    #[test]
    fn maximized_kept_with_its_normal_rect() {
        let s = Saved { max: true, ..sv(100, 80, 1300, 800) };
        assert_eq!(place(&s, &[FHD], Some(0)), Placed { pos: Some((100, 80)), w: 1300.0, h: 800.0, max: true });
    }
    #[test]
    fn on_the_second_screen() {
        assert_eq!(place(&sv(2100, 50, 1600, 1000), &[FHD, RIGHT], Some(0)).pos, Some((2100, 50)));
    }
    #[test]
    fn second_screen_gone_centred_on_the_primary_and_cut_down() {
        let p = place(&sv(2100, 50, 2400, 1300), &[FHD], Some(0));
        assert_eq!((p.w, p.h), (1920.0, 1040.0));
        assert_eq!(p.pos, Some((0, 0)));
        let p = place(&sv(2100, 50, 1200, 750), &[FHD], Some(0));
        assert_eq!(p.pos, Some(((1920 - 1200) / 2, (1040 - 750) / 2)));
    }
    #[test]
    fn half_off_the_right_edge_pulled_in() {
        let p = place(&sv(1500, 100, 1200, 700), &[FHD], Some(0));
        assert_eq!(p.pos, Some((1920 - 1200, 100)));
    }
    #[test]
    fn title_bar_above_the_screen_is_off() {
        // only the lower part of the window is on the screen, its title bar above it: not grabbable - centred
        let p = place(&sv(200, -500, 1200, 700), &[FHD], Some(0));
        assert_eq!(p.pos, Some(((1920 - 1200) / 2, (1040 - 700) / 2)));
    }
    #[test]
    fn under_the_taskbar_pulled_up() {
        let p = place(&sv(100, 900, 1200, 700), &[FHD], Some(0));
        assert_eq!(p.pos, Some((100, 1040 - 700)));
    }
    #[test]
    fn hidpi_logical_size_kept_physical_checks() {
        // a 4K screen at 150 %: 2560 x 1386 logical; 1300 x 800 logical = 1950 x 1200 physical, fits
        let k4 = Area { x: 0, y: 0, w: 3840, h: 2080, scale: 1.5 };
        let p = place(&sv(300, 200, 1300, 800), &[k4], Some(0));
        assert_eq!(p, Placed { pos: Some((300, 200)), w: 1300.0, h: 800.0, max: false });
        // 2600 logical wide does not fit (2560): cut to the area, the corner pulled in
        let p = place(&sv(300, 200, 2600, 800), &[k4], Some(0));
        assert_eq!(p.w, 2560.0);
        assert_eq!(p.pos, Some((0, 200)));
    }
    #[test]
    fn never_under_the_minimum() {
        let p = place(&sv(10, 10, 400, 300), &[FHD], Some(0));
        assert_eq!((p.w, p.h), (MIN_W, MIN_H));
    }
    #[test]
    fn a_screen_smaller_than_the_minimum_wins() {
        let tiny = Area { x: 0, y: 0, w: 800, h: 560, scale: 1.0 };
        let p = place(&sv(0, 0, 1120, 700), &[tiny], Some(0));
        assert_eq!((p.w, p.h, p.pos), (800.0, 560.0, Some((0, 0))));
    }
    #[test]
    fn broken_numbers_give_the_default() {
        let p = place(&Saved { pos: Some((0, 0)), w: f64::NAN, h: -5.0, max: false }, &[FHD], Some(0));
        assert_eq!((p.w, p.h), (DEFAULT_W, DEFAULT_H));
    }
    #[test]
    fn no_position_wayland() {
        let p = place(&Saved { pos: None, w: 1300.0, h: 800.0, max: false }, &[FHD], Some(0));
        assert_eq!(p, Placed { pos: None, w: 1300.0, h: 800.0, max: false });
    }
    #[test]
    fn no_screens_told() {
        let s = sv(5000, 5000, 1300, 800);
        assert_eq!(place(&s, &[], None), Placed { pos: Some((5000, 5000)), w: 1300.0, h: 800.0, max: false });
    }
    #[test]
    fn a_screen_to_the_left_negative_coordinates() {
        let left = Area { x: -1920, y: 0, w: 1920, h: 1040, scale: 1.0 };
        assert_eq!(place(&sv(-1800, 100, 1200, 700), &[FHD, left], Some(0)).pos, Some((-1800, 100)));
    }
    #[test]
    fn primary_not_first() {
        let p = place(&sv(9000, 9000, 1200, 700), &[RIGHT, FHD], Some(1));
        assert_eq!(p.pos, Some(((1920 - 1200) / 2, (1040 - 700) / 2)));
    }
}
