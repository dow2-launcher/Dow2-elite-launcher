//! Linux: run Elite.exe through the Proton that Steam uses for Dawn of War II (owner 02.11.2026, a player's report:
//! `steam -applaunch 56400` starts plain DOW2.exe under Proton - vanilla, not Elite - so players had to edit the Steam
//! launch options by hand). Here: the compatibility tool Steam maps to the game (config.vdf CompatToolMapping, the
//! game's id or the default "0"), its `proton` script (GE-Proton etc. in compatibilitytools.d, Valve's Proton in a
//! library), the game's own prefix (steamapps/compatdata/56400), then `proton run Elite.exe` with the environment Steam
//! gives it. Anything missing -> None, and the launcher falls back to `steam -applaunch` with the hint.
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

/// A tiny VDF (Valve KeyValues text) reader: nested string maps, enough for config.vdf / compatibilitytool.vdf.
#[derive(Debug, Default, Clone, PartialEq)]
pub struct Vdf(pub BTreeMap<String, VdfVal>);
#[derive(Debug, Clone, PartialEq)]
pub enum VdfVal { Str(String), Map(Vdf) }

impl Vdf {
    pub fn parse(t: &str) -> Vdf {
        let toks = tokens(t);
        let mut i = 0;
        parse_map(&toks, &mut i)
    }
    pub fn get(&self, k: &str) -> Option<&VdfVal> {
        self.0.iter().find(|(kk, _)| kk.eq_ignore_ascii_case(k)).map(|(_, v)| v)
    }
    pub fn map(&self, k: &str) -> Option<&Vdf> {
        match self.get(k) { Some(VdfVal::Map(m)) => Some(m), _ => None }
    }
    pub fn str(&self, k: &str) -> Option<&str> {
        match self.get(k) { Some(VdfVal::Str(s)) => Some(s), _ => None }
    }
    /// The first map named `k` at any depth (CompatToolMapping sits under InstallConfigStore/Software/Valve/Steam).
    pub fn find(&self, k: &str) -> Option<&Vdf> {
        if let Some(m) = self.map(k) { return Some(m); }
        self.0.values().find_map(|v| if let VdfVal::Map(m) = v { m.find(k) } else { None })
    }
}

#[derive(Debug, PartialEq)]
enum Tok { S(String), Open, Close }
fn tokens(t: &str) -> Vec<Tok> {
    let mut out = Vec::new();
    let mut it = t.chars().peekable();
    while let Some(c) = it.next() {
        match c {
            '{' => out.push(Tok::Open),
            '}' => out.push(Tok::Close),
            '"' => {
                let mut s = String::new();
                while let Some(c) = it.next() {
                    match c {
                        '\\' => { if let Some(n) = it.next() { s.push(match n { 'n' => '\n', 't' => '\t', o => o }); } }
                        '"' => break,
                        o => s.push(o),
                    }
                }
                out.push(Tok::S(s));
            }
            '/' if it.peek() == Some(&'/') => { for c in it.by_ref() { if c == '\n' { break; } } }
            c if c.is_whitespace() => {}
            c => {   // an unquoted token
                let mut s = String::from(c);
                while let Some(&n) = it.peek() { if n.is_whitespace() || n == '{' || n == '}' || n == '"' { break; } s.push(n); it.next(); }
                out.push(Tok::S(s));
            }
        }
    }
    out
}
fn parse_map(toks: &[Tok], i: &mut usize) -> Vdf {
    let mut m = BTreeMap::new();
    while *i < toks.len() {
        match &toks[*i] {
            Tok::Close => { *i += 1; break; }
            Tok::Open => { *i += 1; }
            Tok::S(k) => {
                let k = k.clone(); *i += 1;
                match toks.get(*i) {
                    Some(Tok::S(v)) => { m.insert(k, VdfVal::Str(v.clone())); *i += 1; }
                    Some(Tok::Open) => { *i += 1; let sub = parse_map(toks, i); m.insert(k, VdfVal::Map(sub)); }
                    _ => {}
                }
            }
        }
    }
    Vdf(m)
}

/// The compatibility tool Steam uses for `appid` (its own mapping, else the default "0"), from config/config.vdf.
pub fn tool_name(config_vdf: &str, appid: u32) -> Option<String> {
    let v = Vdf::parse(config_vdf);
    let map = v.find("CompatToolMapping")?;
    for key in [appid.to_string(), "0".to_string()] {
        if let Some(n) = map.map(&key).and_then(|m| m.str("name")) {
            if !n.is_empty() { return Some(n.to_string()); }
        }
    }
    None
}

/// Valve's internal names -> the folder in steamapps/common: proton_9 -> "Proton 9.0", proton_63 -> "Proton 6.3",
/// proton_513 -> "Proton 5.13", proton_experimental -> "Proton - Experimental", proton_hotfix -> "Proton Hotfix".
pub fn valve_folder(name: &str) -> Option<String> {
    let rest = name.strip_prefix("proton_")?;
    match rest {
        "experimental" => return Some("Proton - Experimental".into()),
        "hotfix" => return Some("Proton Hotfix".into()),
        _ => {}
    }
    if rest.is_empty() || !rest.chars().all(|c| c.is_ascii_digit()) { return None; }
    let (maj, min) = rest.split_at(1);
    Some(format!("Proton {}.{}", maj, if min.is_empty() { "0" } else { min }))
}

/// The `proton` script for the tool `name`: custom tools (compatibilitytools.d, by folder or by the internal name in
/// their compatibilitytool.vdf), then Valve's Proton in any library. With no name: the newest tool found.
pub fn find_proton(roots: &[PathBuf], libraries: &[PathBuf], name: Option<&str>) -> Option<PathBuf> {
    let mut custom_dirs: Vec<PathBuf> = roots.iter().map(|r| r.join("compatibilitytools.d")).collect();
    custom_dirs.push(PathBuf::from("/usr/share/steam/compatibilitytools.d"));
    let mut customs: Vec<(String, PathBuf)> = Vec::new();   // (internal name, dir)
    for d in &custom_dirs {
        let Ok(rd) = std::fs::read_dir(d) else { continue };
        for e in rd.flatten() {
            let p = e.path();
            if !p.join("proton").is_file() { continue; }
            let folder = e.file_name().to_string_lossy().to_string();
            customs.push((folder.clone(), p.clone()));
            if let Ok(t) = std::fs::read_to_string(p.join("compatibilitytool.vdf")) {
                if let Some(tools) = Vdf::parse(&t).find("compat_tools") {
                    for k in tools.0.keys() { customs.push((k.clone(), p.clone())); }
                }
            }
        }
    }
    let valve = |folder: &str| libraries.iter().map(|l| l.join("steamapps").join("common").join(folder).join("proton")).find(|p| p.is_file());
    if let Some(n) = name {
        if let Some((_, p)) = customs.iter().find(|(k, _)| k == n) { return Some(p.join("proton")); }
        if let Some(p) = valve_folder(n).and_then(|f| valve(&f)) { return Some(p); }
    }
    // no mapping or not found: the newest GE/custom tool, else the newest Valve Proton, else Experimental
    let mut c: Vec<&(String, PathBuf)> = customs.iter().collect();
    c.sort_by(|a, b| natural(&b.0).cmp(&natural(&a.0)));
    if let Some((_, p)) = c.first() { return Some(p.join("proton")); }
    let mut valves: Vec<PathBuf> = Vec::new();
    for l in libraries {
        let Ok(rd) = std::fs::read_dir(l.join("steamapps").join("common")) else { continue };
        for e in rd.flatten() {
            let f = e.file_name().to_string_lossy().to_string();
            if f.starts_with("Proton ") && e.path().join("proton").is_file() { valves.push(e.path()); }
        }
    }
    valves.sort_by(|a, b| natural(&b.file_name().unwrap().to_string_lossy()).cmp(&natural(&a.file_name().unwrap().to_string_lossy())));
    valves.first().map(|p| p.join("proton"))
}

/// A sort key that orders "GE-Proton9-20" after "GE-Proton9-3" and "Proton 9.0" after "Proton 8.0"
/// ("Experimental" / "Hotfix" last among Valve's: they carry no number).
fn natural(s: &str) -> Vec<u64> {
    let mut v = Vec::new(); let mut n: Option<u64> = None;
    for c in s.chars() {
        if let Some(d) = c.to_digit(10) { n = Some(n.unwrap_or(0) * 10 + d as u64); } else if let Some(x) = n.take() { v.push(x); }
    }
    if let Some(x) = n { v.push(x); }
    v
}

/// 1.4.1: the Steam Linux Runtime a compatibility tool asks for (its toolmanifest.vdf: "require_tool_appid", e.g. 1628350 =
/// SteamLinuxRuntime_sniper for Proton 8+ and GE-Proton) - its `_v2-entry-point` in whichever library holds it. Steam always runs
/// such a tool inside that runtime; run outside it, current Proton / GE-Proton may exit at once without a word (1.4.0, ZHDH).
pub fn runtime_for(tool_dir: &Path, libraries: &[PathBuf]) -> Option<PathBuf> {
    let t = std::fs::read_to_string(tool_dir.join("toolmanifest.vdf")).ok()?;
    let id = Vdf::parse(&t).find("manifest").and_then(|m| m.str("require_tool_appid").map(|x| x.to_string()))?;
    for l in libraries {
        let acf = l.join("steamapps").join(format!("appmanifest_{id}.acf"));
        let Ok(a) = std::fs::read_to_string(&acf) else { continue };
        let Some(dir) = Vdf::parse(&a).find("AppState").and_then(|m| m.str("installdir").map(|x| x.to_string())) else { continue };
        let ep = l.join("steamapps").join("common").join(dir).join("_v2-entry-point");
        if ep.is_file() { return Some(ep); }
    }
    None
}

/// Everything `proton run` needs for the game in `game_dir` (…/steamapps/common/<game>), or why not.
#[derive(Debug, Clone)]
pub struct ProtonRun {
    pub proton: PathBuf,
    pub compat_data: PathBuf,
    pub steam_root: PathBuf,
    pub appid: u32,
    /// the Steam Linux Runtime entry point the tool needs (None: the tool runs without one, e.g. Proton 5-7)
    pub runtime: Option<PathBuf>,
    pub game_dir: PathBuf,
    pub libraries: Vec<PathBuf>,
}

pub fn plan(game_dir: &Path, appid: u32) -> Result<ProtonRun, String> {
    // the library holding the game: …/steamapps/common/<folder>
    let lib = game_dir.parent().and_then(|c| c.parent()).and_then(|s| s.parent()).ok_or("the game is not in a Steam library")?;
    let compat_data = lib.join("steamapps").join("compatdata").join(appid.to_string());
    if !compat_data.join("pfx").is_dir() {
        return Err(format!("no Proton prefix {} - start the game once from Steam", compat_data.display()));
    }
    let roots = crate::game::steam_roots();
    let steam_root = roots.first().cloned().ok_or("Steam not found")?;
    let name = roots.iter().find_map(|r| std::fs::read_to_string(r.join("config").join("config.vdf")).ok().and_then(|t| tool_name(&t, appid)));
    let libs = crate::game::steam_libraries();
    let proton = find_proton(&roots, &libs, name.as_deref()).ok_or_else(|| format!("no Proton found (Steam maps the game to {:?})", name))?;
    let runtime = proton.parent().and_then(|d| runtime_for(d, &libs));
    Ok(ProtonRun { proton, compat_data, steam_root, appid, runtime, game_dir: game_dir.to_path_buf(), libraries: libs })
}

impl ProtonRun {
    /// The game as Steam starts it: `<runtime>/_v2-entry-point --verb=waitforexitandrun -- <proton> waitforexitandrun <exe>`
    /// when the tool needs the Steam Linux Runtime, else `<proton> run <exe>`; with the environment Steam sets for the game
    /// (the STEAM_COMPAT_* paths also tell the runtime's container which folders to show) and without the launcher's own
    /// AppImage environment (its LD_LIBRARY_PATH / GTK / GStreamer / Python paths break Proton and Wine).
    pub fn command(&self, exe: &Path, args: &[String], cwd: &Path) -> std::process::Command {
        let mut c = match &self.runtime {
            Some(rt) => {
                let mut c = std::process::Command::new(rt);
                c.arg("--verb=waitforexitandrun").arg("--").arg(&self.proton).arg("waitforexitandrun");
                c
            }
            None => { let mut c = std::process::Command::new(&self.proton); c.arg("run"); c }
        };
        c.arg(exe).args(args).current_dir(cwd);
        if std::env::var_os("APPIMAGE").is_some() || std::env::var_os("APPDIR").is_some() {
            for k in ["LD_LIBRARY_PATH", "LD_PRELOAD", "PYTHONHOME", "PYTHONPATH", "PERLLIB", "QT_PLUGIN_PATH", "GTK_PATH", "GTK_EXE_PREFIX",
                      "GTK_DATA_PREFIX", "GTK_IM_MODULE_FILE", "GDK_PIXBUF_MODULE_FILE", "GDK_PIXBUF_MODULEDIR", "GIO_MODULE_DIR",
                      "GSETTINGS_SCHEMA_DIR", "GST_PLUGIN_PATH", "GST_PLUGIN_SYSTEM_PATH", "GST_PLUGIN_SYSTEM_PATH_1_0",
                      "GST_PLUGIN_SCANNER", "GST_PLUGIN_SCANNER_1_0", "APPDIR", "APPIMAGE", "ARGV0", "OWD"] {
                c.env_remove(k);
            }
        }
        let tool = self.proton.parent().map(|d| d.to_path_buf()).unwrap_or_default();
        let libs = self.libraries.iter().map(|l| l.to_string_lossy().to_string()).collect::<Vec<_>>().join(":");
        c.env("STEAM_COMPAT_DATA_PATH", &self.compat_data)
            .env("STEAM_COMPAT_CLIENT_INSTALL_PATH", &self.steam_root)
            .env("STEAM_COMPAT_INSTALL_PATH", &self.game_dir)
            .env("STEAM_COMPAT_TOOL_PATHS", &tool)
            .env("STEAM_COMPAT_LIBRARY_PATHS", libs)
            .env("STEAM_COMPAT_APP_ID", self.appid.to_string())
            .env("SteamAppId", self.appid.to_string())
            .env("SteamGameId", self.appid.to_string());
        c
    }
}

/// The game's Documents inside its Proton prefix (My Games\Dawn of War II - Retribution lives there under Proton).
pub fn prefix_documents(game_dir: &Path, appid: u32) -> Option<PathBuf> {
    let lib = game_dir.parent()?.parent()?.parent()?;
    let d = lib.join("steamapps").join("compatdata").join(appid.to_string()).join("pfx").join("drive_c").join("users").join("steamuser").join("Documents");
    if d.is_dir() { Some(d) } else { None }
}

#[cfg(test)]
mod tests {
    use super::*;
    const CONFIG: &str = r#""InstallConfigStore"
{
	"Software"
	{
		"Valve"
		{
			"Steam"
			{
				"CompatToolMapping"
				{
					"0"
					{
						"name"		"proton_9"
						"config"		""
						"priority"		"75"
					}
					"56400"
					{
						"name"		"GE-Proton9-20"
						"config"		""
						"priority"		"250"
					}
				}
			}
		}
	}
}"#;
    #[test]
    fn mapping() {
        assert_eq!(tool_name(CONFIG, 56400).as_deref(), Some("GE-Proton9-20"));
        assert_eq!(tool_name(CONFIG, 15620).as_deref(), Some("proton_9"));
        assert_eq!(tool_name("\"x\" { }", 56400), None);
    }
    #[test]
    fn valve_names() {
        assert_eq!(valve_folder("proton_9").as_deref(), Some("Proton 9.0"));
        assert_eq!(valve_folder("proton_63").as_deref(), Some("Proton 6.3"));
        assert_eq!(valve_folder("proton_513").as_deref(), Some("Proton 5.13"));
        assert_eq!(valve_folder("proton_experimental").as_deref(), Some("Proton - Experimental"));
        assert_eq!(valve_folder("GE-Proton9-20"), None);
    }
    #[test]
    fn newest_first() {
        assert!(natural("GE-Proton9-20") > natural("GE-Proton9-3"));
        assert!(natural("Proton 9.0") > natural("Proton 8.0"));
    }
    #[test]
    fn finds_tools() {
        let t = std::env::temp_dir().join(format!("elite-proton-test-{}", std::process::id()));
        let root = t.join("steam"); let lib = t.join("lib");
        for d in [root.join("compatibilitytools.d/GE-Proton9-20"), root.join("compatibilitytools.d/GE-Proton8-1"), lib.join("steamapps/common/Proton 9.0")] {
            std::fs::create_dir_all(&d).unwrap(); std::fs::write(d.join("proton"), "#!/bin/sh\n").unwrap();
        }
        let roots = vec![root.clone()]; let libs = vec![lib.clone()];
        assert_eq!(find_proton(&roots, &libs, Some("GE-Proton9-20")).unwrap(), root.join("compatibilitytools.d/GE-Proton9-20/proton"));
        assert_eq!(find_proton(&roots, &libs, Some("proton_9")).unwrap(), lib.join("steamapps/common/Proton 9.0/proton"));
        assert_eq!(find_proton(&roots, &libs, None).unwrap(), root.join("compatibilitytools.d/GE-Proton9-20/proton"));
        std::fs::remove_dir_all(&t).ok();
    }

    #[test]
    fn plan_end_to_end() {
        // a home with Steam, a second library holding the game, its prefix, a GE-Proton mapped to the game
        let t = std::env::temp_dir().join(format!("elite-proton-plan-{}", std::process::id()));
        let root = t.join(".local/share/Steam"); let lib = t.join("games");
        std::fs::create_dir_all(root.join("steamapps")).unwrap();
        std::fs::create_dir_all(root.join("config")).unwrap();
        std::fs::write(root.join("config/config.vdf"), CONFIG).unwrap();
        std::fs::write(root.join("steamapps/libraryfolders.vdf"), format!("\"libraryfolders\" {{ \"1\" {{ \"path\" \"{}\" }} }}", lib.display())).unwrap();
        let ge = root.join("compatibilitytools.d/GE-Proton9-20"); std::fs::create_dir_all(&ge).unwrap(); std::fs::write(ge.join("proton"), "").unwrap();
        // GE-Proton asks for the sniper runtime; Steam keeps it in the first library
        std::fs::write(ge.join("toolmanifest.vdf"), "\"manifest\"\n{\n\t\"version\" \"2\"\n\t\"commandline\" \"/proton %verb%\"\n\t\"require_tool_appid\" \"1628350\"\n\t\"use_sessions\" \"1\"\n}\n").unwrap();
        std::fs::write(root.join("steamapps/appmanifest_1628350.acf"), "\"AppState\"\n{\n\t\"appid\" \"1628350\"\n\t\"installdir\" \"SteamLinuxRuntime_sniper\"\n}\n").unwrap();
        let slr = root.join("steamapps/common/SteamLinuxRuntime_sniper"); std::fs::create_dir_all(&slr).unwrap(); std::fs::write(slr.join("_v2-entry-point"), "").unwrap();
        let game = lib.join("steamapps/common/Dawn of War II - Retribution"); std::fs::create_dir_all(&game).unwrap();
        std::fs::write(game.join("DOW2.exe"), "").unwrap();
        let docs = lib.join("steamapps/compatdata/56400/pfx/drive_c/users/steamuser/Documents"); std::fs::create_dir_all(&docs).unwrap();
        let old = std::env::var_os("HOME"); std::env::set_var("HOME", &t);
        let r = plan(&game, 56400);
        if let Some(o) = old { std::env::set_var("HOME", o); }
        let r = r.unwrap();
        assert_eq!(r.proton, ge.join("proton").canonicalize().unwrap_or(ge.join("proton")));
        assert_eq!(r.compat_data, lib.join("steamapps/compatdata/56400"));
        assert_eq!(prefix_documents(&game, 56400), Some(docs));
        // 1.4.1: run inside the runtime, as Steam does
        let rt = r.runtime.clone().expect("the runtime GE-Proton asks for");
        assert!(rt.ends_with("SteamLinuxRuntime_sniper/_v2-entry-point"));
        let c = r.command(&game.join("Elite.exe"), &[], &game);
        let args: Vec<String> = c.get_args().map(|a| a.to_string_lossy().to_string()).collect();
        assert_eq!(c.get_program(), rt.as_os_str());
        assert_eq!(args[0], "--verb=waitforexitandrun"); assert_eq!(args[1], "--");
        assert!(args[2].ends_with("GE-Proton9-20/proton")); assert_eq!(args[3], "waitforexitandrun"); assert!(args[4].ends_with("Elite.exe"));
        std::fs::remove_dir_all(&t).ok();
    }
}
