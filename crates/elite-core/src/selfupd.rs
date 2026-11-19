//! The launcher's own update on Windows: the arguments of the NSIS installer (1.6.30, TvangeS 19.11.2026, fb 1912/1913/1916:
//! "updated to 1.6.29 three times - after a restart it is 1.6.15 again, a second icon in the tray").
//!
//! Tauri's installer.nsi (tauri-bundler 2.x) picks the folder of an update like this: `InstallDir` is a placeholder; in .onInit,
//! while $INSTDIR is still that placeholder, it takes the default (currentUser: `%LOCALAPPDATA%\Elite Launcher`) and then
//! `RestorePreviousInstallLocation` - the folder the LAST install wrote to `HKCU\Software\<manufacturer>\<product>`. /UPDATE
//! changes nothing there. So a launcher the player keeps in a folder of his own (D:\elite launcher, files copied or installed there
//! before another install) was "updated" into the registry's folder: the new copy started there (/R), his shortcut still opened the
//! old exe. NSIS's own `/D=<dir>` sets $INSTDIR before .onInit - the placeholder test fails, neither the default nor the registry
//! is used: the update replaces the running copy where it is. /D= must be the LAST argument, unquoted, spaces allowed.
//! Pure: the tests run anywhere (cargo test -p elite-core).

/// The folder for `/D=`: the running exe's folder as NSIS wants it - no `\\?\` (verbatim) prefix (`\\?\UNC\srv\share` ->
/// `\\srv\share`), no trailing backslash (a drive root keeps its one: `C:\`). None when it can not be given to NSIS: empty, a `"`
/// in it, a line break.
pub fn nsis_dir(dir: &str) -> Option<String> {
    let d = if let Some(rest) = dir.strip_prefix(r"\\?\UNC\") { format!(r"\\{rest}") } else { dir.strip_prefix(r"\\?\").unwrap_or(dir).to_string() };
    let d = d.replace('/', "\\");
    let mut d = d.trim_end_matches('\\').to_string();
    if d.len() == 2 && d.ends_with(':') { d.push('\\'); }          // "C:" -> "C:\"
    if d.is_empty() || d.contains('"') || d.contains('\n') || d.contains('\r') { return None; }
    Some(d)
}

/// The installer's arguments of a self-update: passive, update, restart into the new copy, and - when the running copy's folder
/// is known and writable - `/D=<that folder>` last. None: as before 1.6.30 (the installer's own pick: the registry / the default),
/// e.g. a copy under Program Files, which this per-user installer can not write to.
pub fn nsis_update_args(dir: Option<&str>) -> String {
    match dir.and_then(nsis_dir) {
        Some(d) => format!("/P /UPDATE /R /ARGS /D={d}"),
        None => "/P /UPDATE /R /ARGS".to_string(),
    }
}

/// The `cmd /V:ON /C` line that starts the installer ~3 s after the launcher is gone. The installer's path and the arguments come
/// through the environment (ELITE_SETUP, ELITE_SETUP_ARGS) and !delayed! expansion: expanded after cmd split the line, so a
/// folder with `&`, `^`, `%`, `(` or spaces reaches the installer as it is.
pub const CMD_LINE: &str = "ping -n 4 127.0.0.1 >NUL & start \"\" \"!ELITE_SETUP!\" !ELITE_SETUP_ARGS!";

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn the_folder_as_nsis_wants_it() {
        assert_eq!(nsis_dir(r"D:\elite launcher").as_deref(), Some(r"D:\elite launcher"));
        assert_eq!(nsis_dir(r"D:\elite launcher\").as_deref(), Some(r"D:\elite launcher"));
        assert_eq!(nsis_dir(r"\\?\D:\elite launcher").as_deref(), Some(r"D:\elite launcher"));
        assert_eq!(nsis_dir(r"\\?\UNC\nas\games\Elite Launcher").as_deref(), Some(r"\\nas\games\Elite Launcher"));
        assert_eq!(nsis_dir(r"C:\Users\Ив Ан\AppData\Local\Elite Launcher").as_deref(), Some(r"C:\Users\Ив Ан\AppData\Local\Elite Launcher"));
        assert_eq!(nsis_dir("D:/games/elite").as_deref(), Some(r"D:\games\elite"));
        assert_eq!(nsis_dir(r"E:\").as_deref(), Some(r"E:\"));
        assert_eq!(nsis_dir(r"\\?\E:\").as_deref(), Some(r"E:\"));
        assert_eq!(nsis_dir(r"D:\Games & Mods (x86)\100% Elite").as_deref(), Some(r"D:\Games & Mods (x86)\100% Elite"));
        assert_eq!(nsis_dir(""), None);
        assert_eq!(nsis_dir("D:\\a\" b"), None);
        assert_eq!(nsis_dir("D:\\a\nb"), None);
    }
    #[test]
    fn the_arguments_d_last() {
        assert_eq!(nsis_update_args(Some(r"\\?\D:\elite launcher\")), r"/P /UPDATE /R /ARGS /D=D:\elite launcher");
        let a = nsis_update_args(Some(r"D:\x y"));
        assert!(a.ends_with(r"/D=D:\x y") && !a.contains('"') && a.matches("/D=").count() == 1);
        assert_eq!(nsis_update_args(None), "/P /UPDATE /R /ARGS");
        assert_eq!(nsis_update_args(Some("")), "/P /UPDATE /R /ARGS");
    }
    #[test]
    fn the_cmd_line_takes_both_from_the_environment() {
        assert!(CMD_LINE.contains("\"!ELITE_SETUP!\" !ELITE_SETUP_ARGS!") && CMD_LINE.starts_with("ping -n 4 127.0.0.1 >NUL & start \"\" "));
    }
}
