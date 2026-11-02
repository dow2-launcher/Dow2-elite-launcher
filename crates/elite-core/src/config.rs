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
    /// The group on the Add-ons tab: "network", "interface", "gameplay", "experiment" (02.11.2026); empty - the window
    /// picks one by the id.
    pub category: String,
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
}
