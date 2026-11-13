//! `launcher.json` — everything the Elite team can change without shipping a new launcher.
//!
//! Every field is optional and unknown fields are ignored, so old launchers keep working
//! with newer configs for years. Texts can be a plain string or a map by language:
//! `"text": "Hello"` or `"text": {"en": "Hello", "ru": "Привет"}`.
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Text {
    #[default]
    None,
    Plain(String),
    ByLang(BTreeMap<String, String>),
}

impl Text {
    pub fn get(&self, lang: &str) -> String {
        match self {
            Text::None => String::new(),
            Text::Plain(s) => s.clone(),
            Text::ByLang(m) => m.get(lang).or_else(|| m.get("en")).or_else(|| m.values().next()).cloned().unwrap_or_default(),
        }
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct LauncherConfig {
    pub schema: u32,
    /// Shown in the window header, e.g. "Elite Mod".
    pub title: Text,
    pub subtitle: Text,
    pub channels: Vec<Channel>,
    /// Banner when a newer version of the player's channel exists. `{version}` and `{name}` are replaced.
    pub update_text: Text,
    pub news: Vec<NewsItem>,
    /// Button under the news list, e.g. the ModDB news page.
    pub news_more: Option<Link>,
    pub announcements: Vec<Announcement>,
    /// The nearest events, a banner above the news: [{id, title, start, end?, place?, url?}], passed to the window as is.
    /// None (no "events" in launcher.json) - the window shows its own example; Some([]) - no banner.
    pub events: Option<Vec<serde_json::Value>>,
    pub links: Vec<Link>,
    /// Extra mirrors (base URLs ending with '/'); tried after the built-in ones that answered.
    pub mirrors: Vec<String>,
    /// Extra hosts with our API (chat, the stream, rooms, logs) and /elite/dl/updater.json, e.g. "https://pl.example.org";
    /// the launcher uses the one that answers best (02.11.2026: new servers without a new launcher).
    pub api_hosts: Vec<String>,
    pub game: GameInfo,
    pub launch: Launch,
    pub launcher_update: Option<LauncherUpdate>,
    /// Optional add-ons the player can tick (e.g. LobbyStats). Each is a separately published version.
    pub components: Vec<Component>,
    /// 1.4.11: plain Dawn of War II: Retribution with our add-ons that work there ("Vanilla Retribution" next to Play).
    /// None or no loader - the launcher offers no vanilla. Older launchers ignore it.
    pub vanilla: Option<Vanilla>,
    /// 10.11.2026: the add-ons of the native Mac game (dylibs, e.g. crossplay_mac). A list of its own, not entries with
    /// `os` in `components`: launchers before the Mac support read only `components` and serde drops an unknown field of
    /// an entry, so an `os` there would not hide a Mac entry from them. `for_os` merges both lists for this system.
    pub components_macos: Vec<Component>,
}

/// The vanilla game (owner 05.11.2026): DOW2.exe without -modname, the add-ons whose `games` name "vanilla" are copied into
/// `<game>/dow2-patches/` (their Elite_DLLs files, same names) and the launcher's winmm.dll loader goes next to DOW2.exe.
/// Elite's own files are not touched in this mode.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct Vanilla {
    /// Version id of the loader (`<version>.manifest` with one file, `winmm.dll`): the launcher build of Dow2-patches
    /// vanilla-loader (-DLAUNCHER_LOADER) - a mod start (-modname Elite) loads only the early add-ons from Elite_DLLs, a vanilla
    /// start only the DLLs of dow2-patches.
    pub loader: String,
    /// The name in the picker next to Play; empty - the window's own ("Vanilla Retribution").
    pub name: Text,
    pub description: Text,
}

/// The system this launcher runs on: "windows", "linux" or "macos" (the names of `Component::os`).
pub fn this_os() -> &'static str {
    if cfg!(windows) { "windows" } else if cfg!(target_os = "macos") { "macos" } else { "linux" }
}

impl LauncherConfig {
    /// The catalog as this launcher uses it on `os`: `components` + `components_macos` (an entry there without `os` is
    /// for macos), only the ones for `os`; an id already taken by an earlier entry for `os` is skipped.
    pub fn for_os(mut self, os: &str) -> Self {
        let mac = std::mem::take(&mut self.components_macos).into_iter().map(|mut c| {
            if c.os.is_empty() { c.os = vec!["macos".into()]; }
            c
        });
        let mut seen = std::collections::HashSet::new();
        self.components = std::mem::take(&mut self.components).into_iter().chain(mac)
            .filter(|c| c.for_os(os) && seen.insert(c.id.clone())).collect();
        self
    }
    /// Is the vanilla mode offered by this catalog?
    pub fn vanilla_loader(&self) -> Option<&str> {
        self.vanilla.as_ref().map(|v| v.loader.as_str()).filter(|l| !l.is_empty())
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct Component {
    pub id: String,
    pub name: Text,
    pub description: Text,
    /// Version id on the mirrors (`<version>.manifest`), published like any build.
    pub version: String,
    /// Installed unless the player unticks it.
    pub default: bool,
    /// Also on the home screen, not only on the Add-ons tab: the ones players switch most (automatch, relay).
    pub home: bool,
    /// The group on the Add-ons tab: "network", "interface", "gameplay", "fixes", "performance" (09.11.2026), "experiment" (02.11.2026; no "other"
    /// since 1.4.8: the translation is interface, an unknown group is experiment); empty - the window picks one by the id.
    pub category: String,
    /// The place inside that group, smaller = higher (04.11.2026); none - the window picks one by the id.
    pub order: Option<i64>,
    /// DLL to add to `InjectedFiles=` in Elite.launchconfig while the component is on.
    pub inject: String,
    /// Switches the player can tick under the component; each one is written to an ini file in the game folder.
    pub options: Vec<ComponentOption>,
    /// The newer form of `options` (own values, choices, groups): used instead of `options` when present. Launchers
    /// older than 1.3 know only 1/0 ticks and keep reading `options`, so a choice never reaches them as a tick.
    pub settings: Vec<ComponentOption>,
    /// Files (relative to the game folder) of a hand-installed copy of the same patch, e.g. "dow2-patches/ObsFix.dll"
    /// from the stand-alone package. While any of them exists the launcher keeps its own copy off.
    pub conflicts: Vec<String>,
    /// 1.4.11: the games it works in: "elite", "vanilla". Empty = Elite only (every entry before 1.4.11). An add-on without
    /// "vanilla" is never copied for the vanilla game, whatever its tick says.
    pub games: Vec<String>,
    /// 09.11.2026: ids (without the _r2/_r3 ends) of add-ons it does not work together with; either side may list the
    /// other. The window only warns while both are on, it never unticks one.
    pub excludes: Vec<String>,
    /// 09.11.2026: ids of add-ons it does nothing without (any one of them on is enough); the window warns while none is on.
    pub requires: Vec<String>,
    /// 10.11.2026: the systems it is for: "windows", "linux", "macos". Empty = windows + linux (every entry before the Mac
    /// launcher). On a Mac the launcher offers only the entries with "macos", elsewhere it hides the macos-only ones.
    pub os: Vec<String>,
    /// 10.11.2026: always on where it is offered, the player cannot untick it (crossplay_mac: without it a Mac game
    /// desyncs from the Windows ones and Feral's integrity check ends it).
    pub required: bool,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct ComponentOption {
    pub id: String,
    pub name: Text,
    /// ini file relative to the game folder, e.g. "Elite_DLLs/LobbyStats.ini"
    pub ini: String,
    pub section: String,
    pub key: String,
    pub default: bool,
    /// Heading the option sits under in the add-on's card, e.g. "Match timer" inside Lobby rating.
    pub group: Text,
    /// Values written for a tick and for no tick; empty = "1" and "0".
    pub on: String,
    pub off: String,
    /// A pick from a list instead of a tick: the value of the chosen one is written.
    pub choices: Vec<OptionChoice>,
    /// The choice for new players; empty = the first one.
    pub default_value: String,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct OptionChoice {
    pub value: String,
    pub name: Text,
}

impl Component {
    /// The switches the player sees: `settings` when the config has them, else `options`.
    pub fn opts(&self) -> &[ComponentOption] {
        if self.settings.is_empty() { &self.options } else { &self.settings }
    }
    /// Is it for the system `os` ("windows" / "linux" / "macos")? No `os` = windows + linux.
    pub fn for_os(&self, os: &str) -> bool {
        if self.os.is_empty() { !os.eq_ignore_ascii_case("macos") } else { self.os.iter().any(|o| o.eq_ignore_ascii_case(os)) }
    }
    /// Does it work in `game` ("elite" / "vanilla")? No `games` = Elite only.
    pub fn for_game(&self, game: &str) -> bool {
        if self.games.is_empty() { game.eq_ignore_ascii_case("elite") } else { self.games.iter().any(|g| g.eq_ignore_ascii_case(game)) }
    }
}

impl ComponentOption {
    /// What goes into the ini: the player's pick (a known one, else the default), or the tick's value.
    pub fn ini_value(&self, on: bool, picked: Option<&String>) -> String {
        if !self.choices.is_empty() {
            let known = |v: &String| self.choices.iter().any(|c| &c.value == v);
            return picked.filter(|v| known(v)).or(Some(&self.default_value).filter(|v| known(v)))
                .unwrap_or(&self.choices[0].value).clone();
        }
        let (v, d) = if on { (&self.on, "1") } else { (&self.off, "0") };
        if v.is_empty() { d.to_string() } else { v.clone() }
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct Channel {
    pub id: String,
    pub name: Text,
    /// Version id on the mirrors: `<version>.manifest`.
    pub version: String,
    pub description: Text,
    /// Channel selected for new installs.
    pub default: bool,
    /// Small label next to the name, e.g. "BETA".
    pub badge: Text,
    /// Old version: shown in the collapsed "Archive" list instead of the main list.
    pub archive: bool,
    /// Program to start on Windows for this version, relative to the game folder (e.g. "Elite_Test.exe" for the
    /// public test that installs as a separate mod next to the main one). Empty = the default launch command.
    pub exe: String,
    /// Command-line arguments for this version on Windows. Old Elite (2.3, 2.9.3) has no launcher of its own and runs
    /// as a plain mod: `exe = "DOW2.exe"`, `args = ["-modname", "Elite"]`. Empty = the default arguments.
    pub args: Vec<String>,
    /// 1.5.4 (owner 10.11.2026): `"addons": false` - a version our add-ons do not work with (grantovich's IG Rework: the game
    /// crashes with them). While it is the installed version every add-on is off (uninstalled like an unticked one, the
    /// player's ticks are kept for the other versions). Missing = true; older launchers ignore the field.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub addons: Option<bool>,
    /// 1.6.5 (owner 13.11.2026): a version that is another mod with its own launcher exe (grantovich's IG Rework:
    /// IgRework.exe, IgRework.launchconfig, IgRework_DLLs) names its game here, e.g. "igrework". The add-ons whose `games`
    /// list it go into it as copies in dow2-patches, loaded by the launcher's winmm loader (loader vloader-3+: any -modname that is
    /// not Elite gets that folder), exactly like the vanilla game's; the others are off for it. Its launch config is never
    /// given our DLLs (its exe refuses to start when a DLL it names is not in its own _DLLs folder). Set, it wins over
    /// `addons` (main.rs channel_blocks) - which stays false in the catalog for launchers up to 1.6.3: they know no per-game
    /// add-ons and would put every ticked one into the mod's launch config.
    #[serde(skip_serializing_if = "String::is_empty")]
    pub game: String,
}

impl Channel {
    /// Do our add-ons go into the game with this version?
    pub fn addons_allowed(&self) -> bool {
        self.addons != Some(false)
    }
    /// The game of the add-ons' `games` for this version when it is another mod ("igrework"), None for Elite.
    pub fn addon_game(&self) -> Option<&str> {
        let g = self.game.trim();
        (!g.is_empty() && !g.eq_ignore_ascii_case("elite") && !g.eq_ignore_ascii_case("vanilla")).then_some(g)
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct NewsItem {
    pub date: String,
    pub title: Text,
    pub text: Text,
    pub url: String,
    pub image: String,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct Announcement {
    pub id: String,
    pub text: Text,
    pub url: String,
    /// "info" | "accent" | "warning"
    pub style: String,
    /// ISO date (YYYY-MM-DD) after which it is hidden.
    pub until: String,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct Link {
    pub title: Text,
    pub url: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct GameInfo {
    pub steam_appid: u32,
    pub name: String,
    /// Folder name inside steamapps/common.
    pub folder: String,
    /// File that must exist in the game folder.
    pub marker: String,
    pub store_url: String,
    pub web_store_url: String,
    /// Shown when the game is missing.
    pub requirements: Text,
}

impl Default for GameInfo {
    fn default() -> Self {
        Self {
            steam_appid: 56400,
            name: "Warhammer 40,000: Dawn of War II - Retribution".into(),
            folder: "Dawn of War II - Retribution".into(),
            marker: "DOW2.exe".into(),
            store_url: "steam://store/56400".into(),
            web_store_url: "https://store.steampowered.com/app/56400/".into(),
            requirements: Text::None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct Launch {
    pub windows: LaunchCmd,
    pub linux: LaunchCmd,
    pub macos: LaunchCmd,
}

impl Default for Launch {
    fn default() -> Self {
        Self {
            windows: LaunchCmd { program: "{game}/Elite.exe".into(), args: vec![], hint: Text::None },
            linux: LaunchCmd { program: "steam".into(), args: vec!["-applaunch".into(), "56400".into()], hint: Text::None },
            macos: LaunchCmd { program: "open".into(), args: vec!["steam://rungameid/56400".into()], hint: Text::None },
        }
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct LaunchCmd {
    /// `{game}` is replaced with the game folder.
    pub program: String,
    pub args: Vec<String>,
    /// Shown under the Play button on this OS (e.g. Steam launch options for Proton).
    pub hint: Text,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct LauncherUpdate {
    pub version: String,
    pub text: Text,
    /// Download page per OS: "windows", "linux", "macos" (or "all").
    pub urls: BTreeMap<String, String>,
}

/// Compare dotted versions ("1.2.10" > "1.2.9").
pub fn version_newer(a: &str, b: &str) -> bool {
    let p = |s: &str| s.split(|c: char| !c.is_ascii_digit()).filter(|x| !x.is_empty()).map(|x| x.parse::<u64>().unwrap_or(0)).collect::<Vec<_>>();
    p(a) > p(b)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn channel_addons_default_on() {
        let c: LauncherConfig = serde_json::from_str(r#"{"channels": [{"id": "stable", "version": "3.2.1.0"},
            {"id": "igrework", "version": "igrework-1", "exe": "IgRework.exe", "addons": false}, {"id": "x", "version": "x", "addons": true}]}"#).unwrap();
        let allowed: Vec<bool> = c.channels.iter().map(|c| c.addons_allowed()).collect();
        assert_eq!(allowed, vec![true, false, true]);
        assert!(Channel::default().addons_allowed());
        // a launcher.json written back keeps the field out when it was not there
        assert!(!serde_json::to_string(&c.channels[0]).unwrap().contains("addons"));
    }

    #[test]
    fn option_values() {
        let o: ComponentOption = serde_json::from_str(r#"{"id":"box","on":"2","off":"1"}"#).unwrap();
        assert_eq!((o.ini_value(true, None), o.ini_value(false, None)), ("2".into(), "1".into()));
        let tick: ComponentOption = serde_json::from_str(r#"{"id":"t"}"#).unwrap();
        assert_eq!((tick.ini_value(true, None), tick.ini_value(false, None)), ("1".into(), "0".into()));
        let pick: ComponentOption = serde_json::from_str(r#"{"id":"at","choices":[{"value":"0"},{"value":"1"},{"value":"2"}],"default_value":"2"}"#).unwrap();
        assert_eq!(pick.ini_value(false, None), "2");
        assert_eq!(pick.ini_value(false, Some(&"1".to_string())), "1");
        assert_eq!(pick.ini_value(false, Some(&"7".to_string())), "2");   // a choice the config dropped: back to the default
        let c: Component = serde_json::from_str(r#"{"options":[{"id":"a"}],"settings":[{"id":"b"},{"id":"c"}]}"#).unwrap();
        assert_eq!(c.opts().len(), 2);
    }

    #[test]
    fn games_and_vanilla() {
        // an entry before 1.4.11: Elite only; unknown fields of a newer catalog are ignored
        let old: Component = serde_json::from_str(r#"{"id":"relay_r2","inject":"Relay.dll","future":1}"#).unwrap();
        assert!(old.for_game("elite") && !old.for_game("vanilla"));
        let both: Component = serde_json::from_str(r#"{"id":"automatch","games":["elite","Vanilla"]}"#).unwrap();
        assert!(both.for_game("elite") && both.for_game("vanilla"));
        let van: Component = serde_json::from_str(r#"{"id":"x","games":["vanilla"]}"#).unwrap();
        assert!(!van.for_game("elite"));
        let cfg: LauncherConfig = serde_json::from_str(r#"{"components":[]}"#).unwrap();
        assert!(cfg.vanilla_loader().is_none());
        let cfg: LauncherConfig = serde_json::from_str(r#"{"vanilla":{"loader":"vloader-1","name":{"en":"Vanilla"}}}"#).unwrap();
        assert_eq!(cfg.vanilla_loader(), Some("vloader-1"));
        let cfg: LauncherConfig = serde_json::from_str(r#"{"vanilla":{}}"#).unwrap();
        assert!(cfg.vanilla_loader().is_none());
    }
    #[test]
    fn os_filter() {
        let raw = r#"{"components":[{"id":"automatch"},{"id":"winonly","os":["windows"]},{"id":"both","os":["linux","macos"]}],
            "components_macos":[{"id":"crossplay_mac","required":true,"games":["elite","vanilla"]},{"id":"automatch","os":["macos"]}]}"#;
        let cfg: LauncherConfig = serde_json::from_str(raw).unwrap();
        let ids = |os: &str| cfg.clone().for_os(os).components.iter().map(|c| c.id.clone()).collect::<Vec<_>>();
        assert_eq!(ids("windows"), ["automatch", "winonly"]);
        assert_eq!(ids("linux"), ["automatch", "both"]);
        assert_eq!(ids("macos"), ["both", "crossplay_mac", "automatch"]);
        let mac = cfg.clone().for_os("macos");
        assert!(mac.components[1].required && mac.components[1].for_game("vanilla") && mac.components_macos.is_empty());
        // a launcher before the Mac support: it knows only `components`, the Mac list never reaches it
        #[derive(serde::Deserialize)]
        struct Old { components: Vec<serde_json::Value> }
        let old: Old = serde_json::from_str(raw).unwrap();
        assert!(old.components.iter().all(|c| c["id"] != "crossplay_mac"));
    }
}
