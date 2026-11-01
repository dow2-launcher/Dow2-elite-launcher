# Launcher screenshots

`./shots.sh <dir>` takes the launcher's UI from `app/ui`, runs it in headless Chrome with `shot-shim.js` standing in for
Tauri, and writes home / add-ons / settings in English and Russian (1120x700, the launcher's window). The add-on list,
the chat and Online come live from our servers; the "game" is shown installed with the usual ticks on. Nothing is
downloaded or installed. The shim is the Android viewer's one with a fetch bridge (Chrome runs with --disable-web-security
for the shots only). `site/img/launcher.png` = en_home, `launcher_addons.png` = en_addons.
