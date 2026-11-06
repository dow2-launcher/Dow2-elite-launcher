// Elite Launcher UI. Draws itself from the status the Rust side returns (get_status) and the
// signed launcher.json inside it. Rule: Play is never blocked by a new version — it is only offered.
'use strict';
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const $ = id => document.getElementById(id);

const T = {
  en: {
    "chToday": "Today",
    "chYesterday": "Yesterday",
    "chNeedBrowser": "This Steam account signed in from another computer: confirm once in the browser.",
    "chNoSteam": "Steam is not running here: signing in through the browser.",
    "chLoginFail": "Could not sign in. Press “Send logs” in Settings so we can see why.",
    "chLoginAs": "Sign in as {name}",
    "onMin": "{n} min",
    "setGeneral": "General",
    "chWaiting": "Waiting for the Steam sign-in in the browser…",
    "chCancel": "Cancel",
    "prNote": "Your name, 1v1 rating and the players’ chat.",
    "prGames": "Games: {n} · {pct}% won",
    "prNoGames": "No ladder games this season yet",
    "nickStats": "Player stats",
    "nickSteam": "Steam profile",
    "chSending": "Sending…",
    "chNotSent": "Not sent",
    "chRetry": "Retry",
    "chDelete": "Delete",
    "chOrig": "Original",
    "onWatcher": "spectator",
    "onWatchers": "Spectators",
    "chAll": "General",
    "chDev": "Developers",
    "chLogin": "Sign in with Steam",
    "chLogout": "Sign out",
    "chSignInToWrite": "Sign in with Steam to write in the chat.",
    "chPlaceholder": "Message… (Enter sends, Shift+Enter a new line)",
    "chMembers": "In the launcher",
    "chEmpty": "Quiet here. Say hi!",
    "chWaitLogin": "Sign in with Steam in the browser, then come back here.",
    "st_menu": "in the menu",
    "st_game": "in the game",
    "st_search": "looking for a game",
    "st_match": "in a match",
    "chSignedIn": "Signed in as {name}",
    "fbTitle": "Write to the developers",
    "fbName": "Your name:",
    "fbAttach": "🖼 Picture",
    "fbSend": "Send",
    "fbPlaceholder": "Bug, idea, question… Paste a screenshot with Ctrl+V. Answers appear here.",
    "fbEmpty": "No messages yet. Tell us what is wrong or what you would like — we read everything and answer here.",
    "fbSent": "Sent, thank you!",
    "fbDev": "Elite developers",
    "fbMe": "You",
    "fbTooBig": "Picture is too big (max 8 MB)",
    "home": "Home",
    "settings": "Settings",
    "hotkeys": "Hotkeys",
    "hkGrid": "Grid hotkeys (QWER / ASDF / ZXCV)",
    "hkGridNote": "abilities and unit building by position on the keyboard instead of first letters; the same switch as Options → Grid Hotkeys in the game",
    "hkMain": "Main commands",
    "hkAll": "All keys",
    "hkGridShadow": "Not used with Grid Hotkeys on: the grid keys above apply",
    "hkGrpObserver": "Observer and replays",
    "hkSearch": "Search: command or key",
    "hkReset": "Game defaults",
    "hkHow": "click a key, then press the new one (with Ctrl / Shift / Alt if you want); Esc cancels. Applies at the next game start.",
    "hkSaved": "Hotkeys saved — they apply at the next game start",
    "hkUnsaved": "Not saved: close the game, then press Save",
    "hkDup": "Same key twice: {k}",
    "hkCustom": "your changes: {n}",
    "hkNone": "game defaults",
    "hkAb": "Abilities",
    "hkUc1": "Build, row 1",
    "hkUc2": "Build, row 2",
    "hkUc3": "Build, row 3",
    "hkPress": "press a key…",
    "unTitle": "Remove Elite",
    "unBtn": "Remove Elite completely",
    "unNote": "the mod, all add-ons and the launcher's files in the game folder; then Steam checks the game and you have clean vanilla",
    "unSure": "Sure? Press again to remove",
    "unDone": "Elite removed ({n} files). Steam is checking the game files now",
    "news": "News",
    "version": "Version",
    "links": "Links",
    "play": "Play",
    "install": "Install Elite",
    "updating": "Updating…",
    "running": "Game is running",
    "gameRunningAddons": "The game is running: close it to change add-ons. Updates are installed once it closes.",
    "inGameDir": "The launcher is in the Dawn of War II folder - this can crash the game. Move the launcher folder anywhere else (for example to Documents) and start it from there.",
    "installed": "Installed",
    "current": "You have: {v}",
    "notInstalled": "Elite is not installed yet",
    "ready": "Elite {v} is ready",
    "switchTo": "Switch to {name} — download the changes",
    "updateNow": "Update now",
    "checking": "Checking files… {p}%",
    "netChecking": "Checking connection to the server…",
    "netTry": "Mirror {k}/{n}: {host}…",
    "netFail": "{host} is not responding, trying the next one…",
    "downloading": "Updating {file}",
    "meta": "Downloaded {dl} · reused from disk {re} · from local cache {fc} · mirror {m}",
    "done": "Done: {n} file(s) updated, downloaded {dl}",
    "doneLine": "Done ✓",
    "metaDone": "Downloaded {dl} · reused from disk {re} · from cache {fc}",
    "upToDate": "Everything is up to date",
    "cancel": "Cancel",
    "cancelled": "Cancelled",
    "connecting": "Connecting to the update server…",
    "offline": "No connection to the update server — you can still play the installed version.",
    "noGame": "Dawn of War II: Retribution not found",
    "noGameText": "Elite Mod is installed on top of the Steam version of the game.",
    "getGame": "Get it on Steam",
    "browse": "Browse…",
    "rescan": "Search again",
    "getSteam": "Install Steam",
    "gameFolder": "Game folder",
    "open": "Open",
    "language": "Language",
    "cache": "Keep previous versions",
    "usageTitle": "Anonymous usage count",
    "usage": "Count me as a launcher user",
    "usageNote": "Once a day the launcher sends a hash that changes every day, plus its version, OS and the Elite version. No names, Steam or hardware data; days can't be linked to each other.",
    "onTag": "Mention in the chat", "roomsTab": "Lobbies", "roomsTitle": "Open lobbies", "roomsNote": "Custom games being set up right now - the same list as the game browser. Elite or vanilla is told by the races, the army badges and the map.", "roomsNone": "Nobody is setting up a game right now.", "roomsErr": "The list is not available right now.", "roomsFree": "open", "roomsVan": "vanilla", "roomsOther": "other mod", "roomsObs": "observers", "roomsPw": "password", "roomsJoin": "Join", "roomsJoinStart": "Starting the game and joining {name}...", "roomsJoinRunning": "The game is running: switch to it, the join starts there", "roomsJoinBusy": "You are searching for a match or playing one: stop the search (or finish the match), then press Join again", "roomsVerAsk": "Another Elite version", "roomsVerOther": "This game was created on Elite {v}, and you have Elite {mine}. You cannot join it with another version.", "roomsVerUp": "Update to Elite {v}", "roomsVerSw": "Switch to Elite {v}", "roomsVerClose": "Close", "rjSwitchAsk": "Go to another lobby?", "rjSwitchText": "You are in the lobby “{a}” now. Leave it and join “{b}”?", "rjSwitchHost": "You are the host of that lobby: if you leave, it closes for every player in it.", "rjSwitchGo": "Leave and join", "rjSwitchOld": "You are in the lobby “{a}”. Going from one lobby to another needs a newer add-on “Join a lobby from the launcher” - for now leave the lobby yourself.", "rjLeaving": "Leaving the lobby you are in, then joining {name}…", "rjCurLobby": "the current lobby", "roomsHere": "You are here", "roomsInOther": "You are already in the lobby {name} - leave it in the game first.", "roomsVerAfter": "Switching to Elite {v}. When it is done, press Join again.", "roomsVerNoCh": "The launcher has no Elite {v} to switch to.", "roomsVerGame": "Close the game first to switch the version.", "roomsVerBusy": "The launcher is updating the game right now - wait until it is done.", "rjCancel": "Cancel", "rjStarting": "Starting the game to join {name}…", "rjWaitGame": "Waiting for the game to start…", "rjAccepted": "The game took the request: {name}", "rjWalking": "The game is going to its main menu…", "rjJoining": "Connecting to {name}…", "rjInLobby": "You are in the lobby {name}", "rjFailed": "Could not join {name}: {why}", "rjCancelled": "Join cancelled", "rjNoPipe": "The game is running without the add-on “Join a lobby from the launcher”. Turn it on in Add-ons and restart the game.", "rjOnlyWin": "Joining from the launcher works on Windows and Linux only.", "rjAddonOff": "To join from a link, turn on the add-on “Join a lobby from the launcher” in Add-ons, then click the link again.", "rjWhy_full": "the lobby is full", "rjWhy_closed": "the lobby is gone or its game is starting", "rjWhy_password": "it needs a password", "rjWhy_version": "another version of the game or the mod", "rjWhy_timeout": "the lobby did not answer", "rjWhy_busy_search": "a search is on in Find a Game - stop it first", "rjWhy_busy_match": "you are in a match", "rjWhy_busy_join": "the game is joining another lobby", "rjWhy_not_menu": "the game is not in its main menu - go there first", "rjWhy_other_lobby": "you are in another lobby - leave it first", "rjWhy_cancelled": "cancelled", "rjWhy_game_closed": "the game closed", "rjWhy_no_answer": "the game did not answer", "rjWhy_no_game": "the game did not start", "rjWhy_no_pipe": "the game has no add-on “Join a lobby from the launcher” - turn it on and restart the game", "rjWhy_error": "the game could not join", "behTitle": "Chat and window", "muteMention": "No sound when someone mentions me (@name) in the chat", "closeQuits": "The close button quits the launcher (instead of hiding it in the tray)",
    "lanTitle": "Local network",
    "lanShare": "Download Elite from other launchers on the local network and share it with them (faster; every file is checked against the signed version)",
    "trayOpen": "Open Elite Launcher",
    "trayQuit": "Quit",
    "cacheNote": "switching back to them is instant",
    "mirror": "Extra mirror (optional)",
    "netTitle": "Our servers from this computer", "netCheck": "Check again", "netChecking": "Checking…", "netFiles": "Files (Elite and add-on updates)", "netApi": "Chat, Online, rooms, launcher updates", "netMoscow": "Moscow", "netGermany": "Germany", "netR2": "Cloudflare (storage)", "netMs": "{n} ms", "netNone": "no answer", "netUsed": "in use", "netWait": "Checking our servers…", "netNoteDone": "Checked at the start; again when a server stops answering. No ping - one small download from each.", "netNoteOld": "The order of the last start; this one is being checked.",
    "save": "Save",
    "repairTitle": "Repair",
    "repair": "Check & repair files",
    "repairNote": "checks every file and re-downloads only damaged parts",
    "junkTitle": "Clean up",
    "junk": "Clean up the junk",
    "junkNote": "removes stray plugins left from old versions and hand-installed packages (dow2-patches, old copies in Elite_DLLs), then sets everything up again from your ticks",
    "junkAsk": "Clean up the junk?",
    "junkText": "Everything that is neither Elite's own nor an add-on you have ticked goes to a backup folder: the dow2-patches package, old copies of add-ons, leftovers from earlier launcher versions. Then the files are checked and the ticked add-ons are put back.",
    "junkDo": "Clean up",
    "junkCancel": "Cancel",
    "junkDone": "Cleaned up: {n} files moved to {dir}",
    "junkNone": "Nothing to clean up",
    "launcherUpdate": "New launcher {v} is available — click to download",
    "starting": "Starting the game…",
    "mirrors": "{n} mirror(s) configured",
    "allNews": "All news",
    "components": "Add-ons",
    "conflictActive": "An old hand-installed copy is in the game folder (dow2-patches) — it will be put aside and the launcher version installed",
    "main": "Main",
    "mainNote": "the lobbies play this",
    "active": "Installed now",
    "switchBtn": "Switch",
    "installBtn": "Install",
    "instant": "instant",
    "upTo": "up to {s}",
    "needDl": "needs a download",
    "archive": "Archive versions ({n})",
    "youPlay": "You play {name}",
    "notMain": "— the lobbies play {name}",
    "switching": "Switching to {name}…",
    "diagTitle": "Help the developers",
    "diagName": "Your nickname (optional)",
    "sendLogs": "Send logs",
    "sendLogsNote": "sends the logs of the add-ons and the game (lobby stats, observer lag, Continue button) to the developer",
    "logsSent": "Logs sent, thank you! Reference: {id}",
    "sending": "Sending…",
    "sendLogsHome": "Send logs to the developer",
    "versions": "Versions",
    "archiveH": "Archive",
    "installedTag": "installed",
    "notInstalledShort": "not installed",
    "addonInfo": "About: {name}",
    "addonVer": "Version {v}",
    "addonNext": "version {v} comes with the next update",
    "addonCheck": "Check add-ons for updates", "addonChecking": "Checking…", "addonSame": "Everything is up to date ({time})", "addonChanged": "Add-ons updated", "addonNew": "new: {name}", "addonGone": "removed: {name}", "addonChgVer": "{name}: {from} → {to}", "addonOpts": "{name}: its settings changed",
    "addonLater": "takes effect the next time the game starts",
    "addonChangedN": "Add-ons changed: {n} - marked below",
    "chipNew": "new", "chipUpdated": "updated", "chipOpts": "settings changed",
    "newsAll": "Read all", "newsLess": "Collapse", "newsLink": "Open the link",
    "evTitle": "Events", "newsRelLauncher": "Launcher {v}", "newsRelPatches": "Add-ons {v}", "netTab": "Network and servers", "langDefault": "Default ({name})", "myStats": "My stats", "addonSettings": "Settings", "cat_network": "Network and automatch", "cat_interface": "Interface", "cat_gameplay": "Gameplay", "cat_fixes": "Fixes", "cat_experiment": "Experiments", "evNow": "on now", "evInM": "in {n} min", "evInH": "in {n} h", "evInD": "in {n} d",
    "guardOff": "Turned off before the start (add-ons that are off in the launcher, hand-installed copies): {list}.", "guardLoader": "A stand-alone dow2-patches loader (winmm.dll) is still in the game folder: Settings → Clean up.",
    "playAfterSync": "Updating the add-ons first — the game starts by itself after that.",
    // 1.4.11: the vanilla game next to Play
    "rjHintRelay": "If it happens again, try once with {list} off in Add-ons.", "rjFailedAsk": "Could not join the lobby", "rjWrongAsk": "Another game is running", "rjWrongVan": "This lobby is in vanilla Retribution, and the game running now is Elite. Close it (the launcher does not close a game itself) - then the launcher starts vanilla and joins the lobby.", "rjWrongElite": "This lobby is in Elite, and the game running now is vanilla Retribution. Close it (the launcher does not close a game itself) - then the launcher starts Elite and joins the lobby.", "rjWrongGo": "Join after I close it", "rjCloseGame": "Close the game - then the launcher starts {game} and joins {name}.", "rjWhy_wrong_game": "the other game is running (Elite instead of vanilla, or vanilla instead of Elite)", "rjVanAddonOff": "To join vanilla lobbies, turn on the add-on “Join a lobby from the launcher” in Add-ons (it works in vanilla too).", "rjVanNo": "This launcher does not start vanilla Retribution on this computer.", "vanillaH": "Without the mod", "vanillaName": "Vanilla Retribution", "vanillaNote": "The game without Elite, with our add-ons that work there", "vanillaTag": "our add-ons", "vanillaWarn": "You play vanilla Retribution: Elite lobbies and the add-ons for Elite only are not there.", "eliteOnly": "Elite only", "eliteOnlyNote": "Works only in Elite: not loaded in vanilla Retribution.", "readyVanilla": "Vanilla Retribution is ready", "guardVanillaLoader": "The loader of the add-ons is not in place yet: vanilla starts without them.", "toVanilla": "Getting vanilla Retribution ready…", "vanillaCopy": "in vanilla: version {v}",
    "launcherNew": "Elite Launcher {v} is out",
    "launcherUpdateBtn": "Update the launcher", "fwdOffer": "Your connection to Relic's game servers has trouble ({why}). Our forwarding servers can carry your games to Relic.", "fwdOn": "Turn on forwarding", "fwdLater": "Not now", "fwdDone": "Forwarding servers are on - they work from the next game start.",
    "gnTab": "Online play", "gnTitle": "Game servers from this computer", "gnCheck": "Check", "gnChecking": "Checking… (10-20 s)", "gnNote": "Checked by the same rules the add-ons use when they pick a server. Never while the game runs.", "gnGame": "The game is running: the check waits until it closes, so it does not disturb the match.", "gnNever": "Not checked yet.", "gnWhen": "checked at {time}", "gnRelic": "Relic", "gnRelicRelay": "Relic game server", "gnRelicApi": "Relic API (16 requests)", "gnClosed": "port closed", "gnSlowMs": "{n} ms - slow", "gnStreamOk": "{kb} KB in {s} s", "gnStreamCut": "stopped at {kb} KB", "gnRelicOk": "The connection to Relic is fine.", "gnRelicBad": "The connection to Relic has trouble: {why}. Forwarding servers can help.", "gnRelicFwdOn": "The connection to Relic has trouble: {why}. Forwarding is on.", "gnRelicWait": "Relic is checked a few seconds after the launcher starts.", "gnOwn": "Our game servers (Automatch)", "gnFwd": "Forwarding servers", "gnTickOn": "on", "gnTickOff": "off", "gnTickNone": "no such add-on", "gnUdpMs": "UDP {n} ms", "gnUdpNone": "no answer over UDP", "gnBurst": "stream {got}/{n}", "gnBurstCut": "stream stops: {got}/{n}, {tail} of the last 6", "gnTcpOk": "TCP {kb} KB", "gnTcpCut": "TCP stops at {kb} KB", "gnTcpNone": "TCP: no connection", "gnNearest": "nearest", "gnNotUsed": "not used", "gnOwnPick": "Our automatch would put your game on: {node}.", "gnOwnNone": "None of our servers is usable from here - automatch games may not connect.", "gnOwnOff": "Automatch is off. The tick is on the Add-ons tab.", "gnOwnHow": "Automatch games always go through our servers: the one best for all players, or through your nearest one. Other lobbies are Relic games.", "gnFwdVia": "Relic games would go through: {node}.", "gnFwdNone": "No forwarding server is usable from here - games go straight to Relic.", "gnFwdFit": "Usable as forwarding servers: {list}.", "gnFwdOff": "Off: games go to Relic directly. The tick is on the Add-ons tab.", "gnFwdNotNeeded": "Off - not needed while the connection to Relic is fine.", "gnTcpInfo": "The game reaches our servers over UDP only. TCP is for information: a stop at ~33 KB means the line cuts long connections.", "gnListLadder": "Server list of the ladder (signed), UDP port {port}.", "gnListBuiltin": "Built-in server list (the ladder did not answer), UDP port {port}.", "gnPoland": "Poland", "gnMoscow2": "Moscow 2",
    "gnLobby": "Our automatch servers (lobby)", "gnLobbyConn": "connect {n} ms", "gnLobbyNone": "no connection", "gnLobbyDns": "name not found", "gnLobbyStream": "stream {b} bytes in {s} s", "gnLobbyCut": "the stream stops (DPI?): {b} bytes in {s} s", "gnLobbyNoAns": "stream check: no answer", "gnLobbyNoStream": "stream check off (StreamCheck=0)", "gnLobbyUsed": "will be used", "gnLobbyPick": "The game's automatch goes to our lobby server {host}.", "gnLobbyRelic": "None of our lobby servers is usable: the game talks to Relic directly (no new automatch, the classic search).", "gnLobbyOff": "Automatch is off: the game's lobby is Relic's. The tick is on the Add-ons tab.", "gnLobbyHow": "Servers in order; the first that answers within 2.5 s and passes the stream check (60000+ of 64 KB in 4 s) is used.",
    "gnWhyClosed": "{n} of {m} Relic game server ports do not answer", "gnWhyStream": "the stream to Relic stopped at {kb} KB", "gnWhySlow": "Relic answers in {n} ms", "gnWhyBridge": "your earlier setting sent every game through our server",
    "launcherUpdating": "Updating the launcher… {p}",
    "launcherFail": "Could not update the launcher: {e}",
    "noNews": "No news yet",
    "online": "Online",
    "onSearching": "Looking for a game",
    "onStateCreating": "Getting ready",
    "onStateLobby": "In the lobby",
    "onStatePlaying": "Playing",
    "lvTurnOn": "Turn it on and watch", "lvWatch": "Watch", "lvTitle": "Watch this match in the game as a replay (a few minutes behind)", "lvAsk": "Watch the match",
    "lvAddonOff": "Watching needs the add-on “Watch running matches”: turn it on in Add-ons, then press Watch again.",
    "lvWrongGame": "The other game is running. Close it first, then press Watch again.", "lvBusy": "You are searching for a match or playing one.",
    "lvStarting": "Starting the game to watch the match…", "lvSent": "The game opens the match…", "lvWaitGame": "Waiting for the game to start…",
    "lvFetching": "The game is fetching the match…", "lvLoading": "The match is loading in the game", "lvFailed": "Could not open the match: {why}",
    "lvWhy_no_match": "the match is over or not on our servers", "lvWhy_server": "our server did not answer", "lvWhy_busy_match": "the game is in a match or a replay - leave it first",
    "lvWhy_busy_lobby": "the game is in a lobby - leave it first", "lvWhy_start": "the game did not start the replay", "lvWhy_file": "the replay file could not be written",
    "lvWhy_no_pipe": "the game runs without the add-on “Watch running matches” - turn it on and restart the game", "lvWhy_no_game": "the game did not start",
    "lvWhy_wrong_game": "the other game is running", "lvWhy_game_closed": "the game closed", "lvWhy_no_answer": "the game did not answer",
    "onNobody": "Nobody is looking for a game. Start the game and press “Find a Game”.",
    "onOffline": "No connection to the ladder server, trying again…",
    "onLoading": "Loading who is online…",
    "onLadder": "Ladder and match history ›",
    "race_space_marines": "Space Marines",
    "race_chaos_marines": "Chaos",
    "race_eldar": "Eldar",
    "race_orks": "Orks",
    "race_tyranids": "Tyranids",
    "race_imperial_guard": "Imperial Guard",
    "race_t_tau": "Tau",
    "race_z_unecron": "Necrons",
    "race_ordo_malleus": "Ordo Malleus",
    "race_random": "Random race",
    "allAddons": "All ›",
    "onInMatchH": "In a match"
  },
  ru: {
    "chToday": "Сегодня",
    "chYesterday": "Вчера",
    "chNeedBrowser": "Этот Steam-аккаунт уже входил с другого компьютера — подтвердите один раз в браузере.",
    "chNoSteam": "Steam на этом компьютере не запущен — входим через браузер.",
    "chLoginFail": "Не получилось войти. Нажмите «Отправить логи» в настройках — разберёмся.",
    "chLoginAs": "Войти как {name}",
    "onMin": "{n} мин",
    "setGeneral": "Общие",
    "chWaiting": "Ждём вход через Steam в браузере…",
    "chCancel": "Отмена",
    "prNote": "Ник, рейтинг 1v1 и чат с игроками.",
    "prGames": "Игр: {n} · побед {pct}%",
    "prNoGames": "В этом сезоне ещё без игр в ладдере",
    "nickStats": "Статистика игрока",
    "nickSteam": "Профиль Steam",
    "chSending": "Отправляется…",
    "chNotSent": "Не отправлено",
    "chRetry": "Повторить",
    "chDelete": "Удалить",
    "chOrig": "Оригинал",
    "onWatcher": "зритель",
    "onWatchers": "Зрители",
    "chAll": "Общий",
    "chDev": "Разработчикам",
    "chLogin": "Войти через Steam",
    "chLogout": "Выйти",
    "chSignInToWrite": "Чтобы писать в чат, войдите через Steam.",
    "chPlaceholder": "Сообщение… (Enter — отправить, Shift+Enter — новая строка)",
    "chMembers": "В лаунчере",
    "chEmpty": "Пока тихо. Напишите первым!",
    "chWaitLogin": "Войдите через Steam в браузере и вернитесь сюда.",
    "st_menu": "в меню",
    "st_game": "в игре",
    "st_search": "ищет игру",
    "st_match": "в матче",
    "chSignedIn": "Вы вошли как {name}",
    "fbTitle": "Написать разработчикам",
    "fbName": "Как вас зовут:",
    "fbAttach": "🖼 Картинка",
    "fbSend": "Отправить",
    "fbPlaceholder": "Баг, идея, вопрос… Скриншот можно вставить через Ctrl+V. Ответ придёт сюда.",
    "fbEmpty": "Сообщений пока нет. Напишите, что не так или чего хочется — читаем всё и отвечаем здесь.",
    "fbSent": "Отправлено, спасибо!",
    "fbDev": "Разработчики Elite",
    "fbMe": "Вы",
    "fbTooBig": "Картинка слишком большая (до 8 МБ)",
    "home": "Главная",
    "settings": "Настройки",
    "hotkeys": "Горячие клавиши",
    "hkGrid": "Сетка клавиш (QWER / ASDF / ZXCV)",
    "hkGridNote": "способности и постройка юнитов по положению на клавиатуре, а не по первым буквам; тот же переключатель, что «Параметры → Grid Hotkeys» в игре",
    "hkMain": "Основные команды",
    "hkAll": "Все клавиши",
    "hkGridShadow": "При включённой сетке не действуют: работают клавиши сетки выше",
    "hkGrpObserver": "Наблюдатель и повторы",
    "hkSearch": "Поиск: команда или клавиша",
    "hkReset": "Как в игре по умолчанию",
    "hkHow": "нажмите на клавишу, затем новую (можно с Ctrl / Shift / Alt); Esc — отмена. Действует со следующего запуска игры.",
    "hkSaved": "Клавиши сохранены — заработают при следующем запуске игры",
    "hkUnsaved": "Не сохранено: закройте игру и нажмите «Сохранить»",
    "hkDup": "Одна клавиша дважды: {k}",
    "hkCustom": "ваших изменений: {n}",
    "hkNone": "как в игре по умолчанию",
    "hkAb": "Способности",
    "hkUc1": "Постройка, ряд 1",
    "hkUc2": "Постройка, ряд 2",
    "hkUc3": "Постройка, ряд 3",
    "hkPress": "нажмите клавишу…",
    "unTitle": "Удалить Elite",
    "unBtn": "Удалить Elite полностью",
    "unNote": "мод, все дополнения и файлы лаунчера в папке игры; затем Steam проверит игру — останется чистая ванила",
    "unSure": "Точно? Нажмите ещё раз, чтобы удалить",
    "unDone": "Elite удалён ({n} файлов). Steam сейчас проверяет файлы игры",
    "news": "Новости",
    "version": "Версия",
    "links": "Ссылки",
    "play": "Играть",
    "install": "Установить Elite",
    "updating": "Обновление…",
    "running": "Игра запущена",
    "gameRunningAddons": "Игра запущена: закройте её, чтобы менять дополнения. Обновления установятся после закрытия.",
    "inGameDir": "Лаунчер лежит в папке с Dawn of War II — из-за этого игра может падать. Перенесите папку лаунчера в любое другое место (например, в «Документы») и запускайте оттуда.",
    "installed": "Установлена",
    "current": "У вас: {v}",
    "notInstalled": "Elite ещё не установлен",
    "ready": "Elite {v} готов",
    "switchTo": "Перейти на {name} — скачать изменения",
    "updateNow": "Обновить",
    "checking": "Проверка файлов… {p}%",
    "netChecking": "Проверяю связь с сервером…",
    "netTry": "Зеркало {k}/{n}: {host}…",
    "netFail": "{host} не отвечает, пробую следующее…",
    "downloading": "Обновляю {file}",
    "meta": "Скачано {dl} · взято с диска {re} · из локального кэша {fc} · зеркало {m}",
    "done": "Готово: обновлено файлов {n}, скачано {dl}",
    "doneLine": "Готово ✓",
    "metaDone": "Скачано {dl} · взято с диска {re} · из кэша {fc}",
    "upToDate": "Всё актуально",
    "cancel": "Отмена",
    "cancelled": "Отменено",
    "connecting": "Подключаюсь к серверу обновлений…",
    "offline": "Нет связи с сервером обновлений — установленную версию можно запускать.",
    "noGame": "Dawn of War II: Retribution не найдена",
    "noGameText": "Elite ставится поверх Steam-версии игры.",
    "getGame": "Купить в Steam",
    "browse": "Указать папку…",
    "rescan": "Искать снова",
    "getSteam": "Установить Steam",
    "gameFolder": "Папка игры",
    "open": "Открыть",
    "language": "Язык",
    "cache": "Хранить прошлые версии",
    "usageTitle": "Анонимная статистика",
    "usage": "Учитывать меня в числе пользователей лаунчера",
    "usageNote": "Раз в сутки лаунчер отправляет хеш, который каждый день новый, плюс свою версию, ОС и версию Elite. Никаких ников, Steam или данных о компьютере; связать дни между собой нельзя.",
    "onTag": "Упомянуть в чате", "roomsTab": "Комнаты", "roomsJoin": "Войти", "roomsJoinStart": "Запускаю игру и вхожу в {name}...", "roomsJoinRunning": "Игра уже запущена: переключитесь в неё, вход начнётся там", "roomsJoinBusy": "Идёт поиск автоматча или вы в матче: остановите поиск (или доиграйте матч) и нажмите «Войти» ещё раз", "roomsVerAsk": "Другая версия Elite", "roomsVerOther": "Эта игра создана на Elite {v}, а у вас Elite {mine}. С другой версией в неё не войти.", "roomsVerUp": "Обновить до Elite {v}", "roomsVerSw": "Перейти на Elite {v}", "roomsVerClose": "Закрыть", "rjSwitchAsk": "Перейти в другое лобби?", "rjSwitchText": "Вы сейчас в лобби «{a}». Выйти из него и войти в «{b}»?", "rjSwitchHost": "Вы хост этого лобби: если выйти, оно закроется для всех игроков в нём.", "rjSwitchGo": "Выйти и войти", "rjSwitchOld": "Вы в лобби «{a}». Чтобы переходить из лобби в лобби, нужно новое дополнение «Вход в лобби из лаунчера» — пока выйдите из лобби сами.", "rjLeaving": "Выхожу из текущего лобби, потом вхожу в {name}…", "rjCurLobby": "текущее лобби", "roomsHere": "Вы здесь", "roomsInOther": "Вы уже в лобби {name} — сначала выйдите из него в игре.", "roomsVerAfter": "Переключаю на Elite {v}. Когда закончится, нажмите «Войти» ещё раз.", "roomsVerNoCh": "Elite {v} нет в лаунчере — переключиться на неё нельзя.", "roomsVerGame": "Чтобы переключить версию, сначала закройте игру.", "roomsVerBusy": "Лаунчер сейчас обновляет игру — дождитесь, пока закончит.", "rjCancel": "Отмена", "rjStarting": "Запускаю игру, чтобы войти в {name}…", "rjWaitGame": "Жду, пока запустится игра…", "rjAccepted": "Игра приняла запрос: {name}", "rjWalking": "Игра переходит в главное меню…", "rjJoining": "Подключаюсь к {name}…", "rjInLobby": "Вы в лобби {name}", "rjFailed": "Не удалось войти в {name}: {why}", "rjCancelled": "Вход отменён", "rjNoPipe": "Игра запущена без дополнения «Вход в лобби из лаунчера». Включите его во вкладке «Дополнения» и перезапустите игру.", "rjOnlyWin": "Вход из лаунчера работает только на Windows и Linux.", "rjAddonOff": "Чтобы входить по ссылке, включите дополнение «Вход в лобби из лаунчера» во вкладке «Дополнения» и нажмите ссылку ещё раз.", "rjWhy_full": "комната заполнена", "rjWhy_closed": "комнаты больше нет или её игра уже стартует", "rjWhy_password": "нужен пароль", "rjWhy_version": "другая версия игры или мода", "rjWhy_timeout": "комната не ответила", "rjWhy_busy_search": "идёт поиск в Find a Game — сначала остановите его", "rjWhy_busy_match": "вы в матче", "rjWhy_busy_join": "игра уже входит в другую комнату", "rjWhy_not_menu": "игра не в главном меню — сначала перейдите туда", "rjWhy_other_lobby": "вы в другом лобби — сначала выйдите из него", "rjWhy_cancelled": "отменено", "rjWhy_game_closed": "игра закрылась", "rjWhy_no_answer": "игра не ответила", "rjWhy_no_game": "игра не запустилась", "rjWhy_no_pipe": "в игре нет дополнения «Вход в лобби из лаунчера» — включите его и перезапустите игру", "rjWhy_error": "игре не удалось войти", "roomsTitle": "Открытые лобби", "roomsNote": "Кастомки, которые сейчас собираются, — тот же список, что в браузере игр. Elite или ваниль — по расам, значкам армий и карте.", "roomsNone": "Сейчас никто не собирает игру.", "roomsErr": "Список сейчас недоступен.", "roomsFree": "свободно", "roomsVan": "ваниль", "roomsOther": "другой мод", "roomsObs": "наблюдатели", "roomsPw": "с паролем", "behTitle": "Чат и окно", "muteMention": "Без звука, когда меня упоминают (@ник) в чате", "closeQuits": "Крестик закрывает лаунчер (а не сворачивает в трей)",
    "lanTitle": "Локальная сеть",
    "lanShare": "Качать Elite с других лаунчеров в локальной сети и раздавать им (быстрее; каждый файл сверяется с подписанной версией)",
    "trayOpen": "Открыть Elite Launcher",
    "trayQuit": "Выход",
    "cacheNote": "переключение на них — мгновенно",
    "mirror": "Дополнительное зеркало (необязательно)",
    "netTitle": "Наши серверы с этого компьютера", "netCheck": "Проверить заново", "netChecking": "Проверяю…", "netFiles": "Файлы (обновления Elite и дополнений)", "netApi": "Чат, онлайн, комнаты, обновление лаунчера", "netMoscow": "Москва", "netGermany": "Германия", "netR2": "Cloudflare (хранилище)", "netMs": "{n} мс", "netNone": "нет ответа", "netUsed": "используется", "netWait": "Проверяю наши серверы…", "netNoteDone": "Проверено при запуске; заново — если сервер перестал отвечать. Без пинга: по одной маленькой загрузке с каждого.", "netNoteOld": "Порядок с прошлого запуска, сейчас проверяется.",
    "save": "Сохранить",
    "repairTitle": "Починка",
    "repair": "Проверить и починить",
    "repairNote": "проверяет все файлы и докачивает только повреждённые части",
    "junkTitle": "Очистка",
    "junk": "Очистить от хлама",
    "junkNote": "убирает левые плагины, оставшиеся от старых версий и ручных установок (dow2-patches, старые копии в Elite_DLLs), и заново всё выставляет по вашим галочкам",
    "junkAsk": "Очистить от хлама?",
    "junkText": "Всё, что не относится к самой Elite и к отмеченным дополнениям, переносится в резервную папку: пакет dow2-patches, старые копии дополнений, остатки прошлых версий лаунчера. Затем файлы проверяются, а отмеченные дополнения ставятся заново.",
    "junkDo": "Очистить",
    "junkCancel": "Отмена",
    "junkDone": "Очищено: {n} файлов перенесено в {dir}",
    "junkNone": "Чистить нечего",
    "launcherUpdate": "Вышел новый лаунчер {v} — нажмите, чтобы скачать",
    "starting": "Запускаю игру…",
    "mirrors": "зеркал настроено: {n}",
    "allNews": "Все новости",
    "components": "Дополнения",
    "conflictActive": "В папке игры старая ручная копия (dow2-patches) — она будет убрана, встанет версия из лаунчера",
    "main": "Основная",
    "mainNote": "на ней играют в лобби",
    "active": "Сейчас стоит",
    "switchBtn": "Переключить",
    "installBtn": "Установить",
    "instant": "мгновенно",
    "upTo": "до {s}",
    "needDl": "нужно скачать",
    "archive": "Архивные версии ({n})",
    "youPlay": "У вас {name}",
    "notMain": "— в лобби играют на {name}",
    "switching": "Переключаю на {name}…",
    "diagTitle": "Помочь разработчикам",
    "diagName": "Ваш ник (необязательно)",
    "sendLogs": "Отправить логи",
    "sendLogsNote": "отправляет разработчику логи дополнений и игры (статистика лобби, тормоза обсервера, кнопка Continue)",
    "logsSent": "Логи отправлены, спасибо! Номер: {id}",
    "sending": "Отправляю…",
    "sendLogsHome": "Отправить логи разработчику",
    "versions": "Версии",
    "archiveH": "Архив",
    "installedTag": "установлена",
    "notInstalledShort": "не установлена",
    "addonInfo": "Подробнее: {name}",
    "addonVer": "Версия {v}",
    "addonNext": "версия {v} встанет со следующим обновлением",
    "addonCheck": "Проверить обновления дополнений", "addonChecking": "Проверяю…", "addonSame": "Всё актуально ({time})", "addonChanged": "Дополнения обновились", "addonNew": "новое: {name}", "addonGone": "убрано: {name}", "addonChgVer": "{name}: {from} → {to}", "addonOpts": "{name}: изменились настройки",
    "addonLater": "действует со следующего запуска игры",
    "addonChangedN": "Изменилось дополнений: {n} — отмечены в списке",
    "chipNew": "новое", "chipUpdated": "обновлено", "chipOpts": "изменились настройки",
    "newsAll": "Читать полностью", "newsLess": "Свернуть", "newsLink": "Открыть ссылку",
    "evTitle": "События", "newsRelLauncher": "Лаунчер {v}", "newsRelPatches": "Дополнения {v}", "netTab": "Сеть и серверы", "langDefault": "По умолчанию ({name})", "myStats": "Моя статистика", "addonSettings": "Настройки", "cat_network": "Сеть и автоматч", "cat_interface": "Интерфейс", "cat_gameplay": "Игра", "cat_fixes": "Исправления", "cat_experiment": "Эксперименты", "evNow": "идёт сейчас", "evInM": "через {n} мин", "evInH": "через {n} ч", "evInD": "через {n} дн.",
    "guardOff": "Отключено перед запуском (выключенные в лаунчере дополнения, их ручные копии): {list}.", "guardLoader": "В папке игры остался отдельный загрузчик dow2-patches (winmm.dll): Настройки → Очистить от хлама.",
    "playAfterSync": "Сначала обновляю дополнения — игра запустится сама.",
    // 1.4.11: the vanilla game next to Play
    "rjHintRelay": "Если повторится — попробуйте один раз выключить {list} во вкладке «Дополнения».", "rjFailedAsk": "Не удалось войти в лобби", "rjWrongAsk": "Запущена другая игра", "rjWrongVan": "Это лобби ванильного Retribution, а сейчас запущена Elite. Закройте её (сам лаунчер игру не закрывает) — потом лаунчер запустит ваниль и войдёт в лобби.", "rjWrongElite": "Это лобби Elite, а сейчас запущен ванильный Retribution. Закройте его (сам лаунчер игру не закрывает) — потом лаунчер запустит Elite и войдёт в лобби.", "rjWrongGo": "Войти, когда я закрою", "rjCloseGame": "Закройте игру — потом лаунчер запустит {game} и войдёт в {name}.", "rjWhy_wrong_game": "запущена другая игра (Elite вместо ванили или ваниль вместо Elite)", "rjVanAddonOff": "Чтобы входить в ванильные лобби, включите дополнение «Вход в лобби из лаунчера» во вкладке «Дополнения» (оно работает и в ванили).", "rjVanNo": "На этом компьютере лаунчер не запускает ванильный Retribution.", "vanillaH": "Без мода", "vanillaName": "Ваниль Retribution", "vanillaNote": "Игра без Elite, с нашими дополнениями, которые там работают", "vanillaTag": "наши дополнения", "vanillaWarn": "Вы играете в ванильный Retribution: лобби Elite и дополнений только для Elite здесь нет.", "eliteOnly": "Только Elite", "eliteOnlyNote": "Работает только в Elite: в ванильном Retribution не загружается.", "readyVanilla": "Ваниль Retribution готова", "guardVanillaLoader": "Загрузчик дополнений ещё не на месте: ваниль запустится без них.", "toVanilla": "Готовлю ванильный Retribution…", "vanillaCopy": "в ванили: версия {v}",
    "launcherNew": "Вышел Elite Launcher {v}",
    "launcherUpdateBtn": "Обновить лаунчер", "fwdOffer": "Связь с игровыми серверами Relic с проблемами ({why}). Наши форвардинг-серверы могут вести ваши игры до Relic.", "fwdOn": "Включить форвардинг", "fwdLater": "Не сейчас", "fwdDone": "Форвардинг-серверы включены — работают со следующего запуска игры.",
    "gnTab": "Сетевая игра", "gnTitle": "Игровые серверы с этого компьютера", "gnCheck": "Проверить", "gnChecking": "Проверяю… (10–20 с)", "gnNote": "По тем же правилам, по которым дополнения выбирают сервер. Пока игра запущена, не проверяется.", "gnGame": "Игра запущена: проверка подождёт, пока она закроется, чтобы не мешать матчу.", "gnNever": "Ещё не проверялось.", "gnWhen": "проверено в {time}", "gnRelic": "Relic", "gnRelicRelay": "Игровой сервер Relic", "gnRelicApi": "API Relic (16 запросов)", "gnClosed": "порт закрыт", "gnSlowMs": "{n} мс — медленно", "gnStreamOk": "{kb} КБ за {s} с", "gnStreamCut": "оборвалось на {kb} КБ", "gnRelicOk": "Связь с Relic в порядке.", "gnRelicBad": "Связь с Relic с проблемами: {why}. Помогут форвардинг-серверы.", "gnRelicFwdOn": "Связь с Relic с проблемами: {why}. Форвардинг включён.", "gnRelicWait": "Relic проверяется через несколько секунд после запуска лаунчера.", "gnOwn": "Наши игровые серверы (Автоматч)", "gnFwd": "Форвардинг-серверы", "gnTickOn": "вкл.", "gnTickOff": "выкл.", "gnTickNone": "нет такого дополнения", "gnUdpMs": "UDP {n} мс", "gnUdpNone": "нет ответа по UDP", "gnBurst": "поток {got}/{n}", "gnBurstCut": "поток обрывается: {got}/{n}, {tail} из последних 6", "gnTcpOk": "TCP {kb} КБ", "gnTcpCut": "TCP обрыв на {kb} КБ", "gnTcpNone": "TCP: нет соединения", "gnNearest": "ближайший", "gnNotUsed": "не используется", "gnOwnPick": "Наш автоматч поставил бы вашу игру на: {node}.", "gnOwnNone": "Ни один наш сервер отсюда не годится — игры автоматча могут не соединиться.", "gnOwnOff": "Автоматч выключен. Галочка — на вкладке «Дополнения».", "gnOwnHow": "Игры автоматча всегда идут через наши серверы: лучший для всех игроков или через ваш ближайший. Остальные лобби — игры Relic.", "gnFwdVia": "Игры Relic пошли бы через: {node}.", "gnFwdNone": "Ни один форвардинг-сервер отсюда не годится — игры идут напрямую к Relic.", "gnFwdFit": "Годятся как форвардинг-серверы: {list}.", "gnFwdOff": "Выключено: игры идут к Relic напрямую. Галочка — на вкладке «Дополнения».", "gnFwdNotNeeded": "Выключено — не нужно, пока связь с Relic в порядке.", "gnTcpInfo": "Игра ходит к нашим серверам только по UDP. TCP — для сведения: обрыв на ~33 КБ значит, что линия режет длинные соединения.", "gnListLadder": "Список серверов с ладдера (подписан), UDP-порт {port}.", "gnListBuiltin": "Встроенный список серверов (ладдер не ответил), UDP-порт {port}.", "gnPoland": "Польша", "gnMoscow2": "Москва 2",
    "gnLobby": "Наши серверы автоматча (лобби)", "gnLobbyConn": "коннект {n} мс", "gnLobbyNone": "нет соединения", "gnLobbyDns": "имя не найдено", "gnLobbyStream": "поток {b} байт за {s} с", "gnLobbyCut": "поток обрывается (DPI?): {b} байт за {s} с", "gnLobbyNoAns": "проверка потока: нет ответа", "gnLobbyNoStream": "проверка потока выключена (StreamCheck=0)", "gnLobbyUsed": "будет использован", "gnLobbyPick": "Автоматч игры пойдёт на наш лобби-сервер {host}.", "gnLobbyRelic": "Ни один наш лобби-сервер не годится: игра идёт в Relic напрямую (новый автоматч недоступен, будет классический поиск).", "gnLobbyOff": "Автоматч выключен: лобби игры — у Relic. Галочка — на вкладке «Дополнения».", "gnLobbyHow": "Серверы по порядку; используется первый, что ответил за 2,5 с и прошёл проверку потока (60000+ из 64 КБ за 4 с).",
    "gnWhyClosed": "{n} из {m} портов игровых серверов Relic не отвечают", "gnWhyStream": "поток к Relic оборвался на {kb} КБ", "gnWhySlow": "Relic отвечает за {n} мс", "gnWhyBridge": "прежняя настройка вела все игры через наш сервер",
    "launcherUpdating": "Обновляю лаунчер… {p}",
    "launcherFail": "Не удалось обновить лаунчер: {e}",
    "noNews": "Новостей пока нет",
    "online": "Онлайн",
    "onSearching": "Ищут игру",
    "onStateCreating": "Собирается",
    "onStateLobby": "В лобби",
    "onStatePlaying": "Идёт",
    "lvTurnOn": "Включить и смотреть", "lvWatch": "Смотреть", "lvTitle": "Смотреть этот матч в игре как реплей (с отставанием на несколько минут)", "lvAsk": "Просмотр матча",
    "lvAddonOff": "Для просмотра нужно дополнение «Смотреть идущие матчи»: включите его в Дополнениях и нажмите «Смотреть» ещё раз.",
    "lvWrongGame": "Запущена другая игра. Закройте её и нажмите «Смотреть» ещё раз.", "lvBusy": "Вы ищете матч или играете.",
    "lvStarting": "Запускаю игру для просмотра матча…", "lvSent": "Игра открывает матч…", "lvWaitGame": "Жду запуска игры…",
    "lvFetching": "Игра загружает матч…", "lvLoading": "Матч загружается в игре", "lvFailed": "Не удалось открыть матч: {why}",
    "lvWhy_no_match": "матч закончился или идёт не на наших серверах", "lvWhy_server": "наш сервер не ответил", "lvWhy_busy_match": "в игре идёт матч или реплей — сначала выйдите из него",
    "lvWhy_busy_lobby": "игра в лобби — сначала выйдите из него", "lvWhy_start": "игра не запустила реплей", "lvWhy_file": "не удалось записать файл реплея",
    "lvWhy_no_pipe": "игра запущена без дополнения «Смотреть идущие матчи» — включите его и перезапустите игру", "lvWhy_no_game": "игра не запустилась",
    "lvWhy_wrong_game": "запущена другая игра", "lvWhy_game_closed": "игра закрылась", "lvWhy_no_answer": "игра не ответила",
    "onNobody": "Никто не ищет игру. Запусти игру и нажми «Find a Game».",
    "onOffline": "Нет связи с сервером ладдера, пробую снова…",
    "onLoading": "Загружаю, кто онлайн…",
    "onLadder": "Ладдер и история матчей ›",
    "race_space_marines": "Космодесант",
    "race_chaos_marines": "Хаос",
    "race_eldar": "Эльдар",
    "race_orks": "Орки",
    "race_tyranids": "Тираниды",
    "race_imperial_guard": "Имперская гвардия",
    "race_t_tau": "Тау",
    "race_z_unecron": "Некроны",
    "race_ordo_malleus": "Ордо Маллеус",
    "race_random": "Случайная раса",
    "allAddons": "Все ›",
    "onInMatchH": "В матче"
  },
  es: {
    "chToday": "Hoy",
    "chYesterday": "Ayer",
    "chNeedBrowser": "Esta cuenta de Steam entró desde otro ordenador: confírmalo una vez en el navegador.",
    "chNoSteam": "Steam no está abierto aquí: entrando por el navegador.",
    "chLoginFail": "No se pudo entrar. Pulsa «Enviar registros» en Ajustes.",
    "chLoginAs": "Entrar como {name}",
    "onMin": "{n} min",
    "setGeneral": "General",
    "chWaiting": "Esperando el inicio de sesión de Steam en el navegador…",
    "chCancel": "Cancelar",
    "prNote": "Tu nombre, rating 1v1 y el chat de jugadores.",
    "prGames": "Partidas: {n} · {pct}% ganadas",
    "prNoGames": "Aún sin partidas de ladder esta temporada",
    "nickStats": "Estadísticas del jugador",
    "nickSteam": "Perfil de Steam",
    "chSending": "Enviando…",
    "chNotSent": "No enviado",
    "chRetry": "Reintentar",
    "chDelete": "Borrar",
    "chOrig": "Original",
    "onWatcher": "espectador",
    "onWatchers": "Espectadores",
    "chAll": "General",
    "chDev": "Desarrolladores",
    "chLogin": "Entrar con Steam",
    "chLogout": "Salir",
    "chSignInToWrite": "Entra con Steam para escribir en el chat.",
    "chPlaceholder": "Mensaje… (Enter envía, Shift+Enter nueva línea)",
    "chMembers": "En el launcher",
    "chEmpty": "Todo tranquilo. ¡Saluda!",
    "chWaitLogin": "Entra con Steam en el navegador y vuelve aquí.",
    "st_menu": "en el menú",
    "st_game": "en el juego",
    "st_search": "buscando partida",
    "st_match": "en partida",
    "chSignedIn": "Conectado como {name}",
    "fbTitle": "Escribir a los desarrolladores",
    "fbName": "Tu nombre:",
    "fbAttach": "🖼 Imagen",
    "fbSend": "Enviar",
    "fbPlaceholder": "Error, idea, pregunta… Pega una captura con Ctrl+V. La respuesta llegará aquí.",
    "fbEmpty": "Aún no hay mensajes.",
    "fbSent": "¡Enviado, gracias!",
    "fbDev": "Desarrolladores de Elite",
    "fbMe": "Tú",
    "fbTooBig": "Imagen demasiado grande (máx. 8 MB)",
    "home": "Inicio",
    "settings": "Ajustes",
    "hotkeys": "Hotkeys",
    "hkGrid": "Grid hotkeys (QWER / ASDF / ZXCV)",
    "hkGridNote": "abilities and unit building by position on the keyboard instead of first letters; the same switch as Options → Grid Hotkeys in the game",
    "hkMain": "Main commands",
    "hkAll": "All keys",
    "hkGridShadow": "Sin efecto con la cuadrícula activada: se usan las teclas de arriba",
    "hkGrpObserver": "Observador y repeticiones",
    "hkSearch": "Search: command or key",
    "hkReset": "Game defaults",
    "hkHow": "click a key, then press the new one (with Ctrl / Shift / Alt if you want); Esc cancels. Applies at the next game start.",
    "hkSaved": "Hotkeys saved — they apply at the next game start",
    "hkUnsaved": "Sin guardar: cierra el juego y pulsa Guardar",
    "hkDup": "Same key twice: {k}",
    "hkCustom": "your changes: {n}",
    "hkNone": "game defaults",
    "hkAb": "Abilities",
    "hkUc1": "Build, row 1",
    "hkUc2": "Build, row 2",
    "hkUc3": "Build, row 3",
    "hkPress": "press a key…",
    "unTitle": "Remove Elite",
    "unBtn": "Remove Elite completely",
    "unNote": "the mod, all add-ons and the launcher's files in the game folder; then Steam checks the game and you have clean vanilla",
    "unSure": "Sure? Press again to remove",
    "unDone": "Elite removed ({n} files). Steam is checking the game files now",
    "news": "Noticias",
    "version": "Versión",
    "links": "Enlaces",
    "play": "Jugar",
    "install": "Instalar Elite",
    "updating": "Actualizando…",
    "running": "Juego en marcha",
    "gameRunningAddons": "El juego está en marcha: ciérralo para cambiar los complementos. Las actualizaciones se instalan al cerrarlo.",
    "inGameDir": "El launcher está en la carpeta de Dawn of War II: esto puede hacer que el juego se cierre. Mueve la carpeta del launcher a otro sitio y ábrelo desde allí.",
    "installed": "Instalada",
    "current": "Tienes: {v}",
    "notInstalled": "Elite aún no está instalado",
    "ready": "Elite {v} está listo",
    "switchTo": "Cambiar a {name}: descargar los cambios",
    "updateNow": "Actualizar",
    "checking": "Comprobando archivos… {p}%",
    "downloading": "Actualizando {file}",
    "meta": "Descargado {dl} · reutilizado del disco {re} · de la caché local {fc} · espejo {m}",
    "done": "Listo: {n} archivo(s) actualizados, descargado {dl}",
    "upToDate": "Todo está al día",
    "cancel": "Cancelar",
    "cancelled": "Cancelado",
    "connecting": "Conectando con el servidor de actualizaciones…",
    "offline": "Sin conexión con el servidor de actualizaciones: aún puedes jugar con la versión instalada.",
    "noGame": "No se encontró Dawn of War II: Retribution",
    "noGameText": "Elite Mod se instala sobre la versión de Steam del juego.",
    "getGame": "Conseguirlo en Steam",
    "browse": "Elegir carpeta…",
    "rescan": "Buscar de nuevo",
    "getSteam": "Instalar Steam",
    "gameFolder": "Carpeta del juego",
    "open": "Abrir",
    "language": "Idioma",
    "cache": "Guardar versiones anteriores",
    "usageTitle": "Estadística anónima",
    "usage": "Contarme como usuario del launcher",
    "usageNote": "Una vez al día el launcher envía un hash que cambia cada día, más su versión, el sistema y la versión de Elite. Sin nombres, sin Steam ni datos del equipo; los días no se pueden relacionar entre sí.",
    "onTag": "Mencionar en el chat", "roomsTab": "Salas", "roomsTitle": "Salas abiertas", "roomsNote": "Partidas personalizadas que se están preparando ahora, la misma lista que el navegador de partidas. Elite o vanilla se deduce por razas, insignias y mapa.", "roomsNone": "Nadie está preparando una partida.", "roomsErr": "La lista no está disponible ahora.", "roomsFree": "libre", "roomsVan": "vanilla", "roomsOther": "otro mod", "roomsObs": "observadores", "roomsPw": "contraseña", "behTitle": "Chat y ventana", "muteMention": "Sin sonido cuando me mencionan (@nombre) en el chat", "closeQuits": "El botón de cerrar cierra el launcher (en vez de ocultarlo en la bandeja)",
    "lanTitle": "Red local",
    "lanShare": "Descargar Elite de otros launchers de la red local y compartirlo con ellos",
    "trayOpen": "Abrir Elite Launcher",
    "trayQuit": "Salir",
    "cacheNote": "volver a ellas es instantáneo",
    "mirror": "Espejo adicional (opcional)",
    "netTitle": "Nuestros servidores desde este equipo", "netCheck": "Comprobar de nuevo", "netChecking": "Comprobando…", "netFiles": "Archivos (actualizaciones de Elite y complementos)", "netApi": "Chat, en línea, salas, actualización del launcher", "netMoscow": "Moscú", "netGermany": "Alemania", "netR2": "Cloudflare (almacenamiento)", "netMs": "{n} ms", "netNone": "sin respuesta", "netUsed": "en uso", "netWait": "Comprobando nuestros servidores…", "netNoteDone": "Comprobado al iniciar; de nuevo si un servidor deja de responder. Sin ping: una pequeña descarga de cada uno.", "netNoteOld": "El orden del último inicio; se está comprobando.",
    "save": "Guardar",
    "repairTitle": "Reparar",
    "repair": "Comprobar y reparar archivos",
    "repairNote": "comprueba cada archivo y vuelve a descargar solo las partes dañadas",
    "junkTitle": "Limpieza",
    "junk": "Limpiar la basura",
    "junkNote": "quita los plugins sobrantes de versiones antiguas e instalaciones manuales (dow2-patches, copias viejas en Elite_DLLs) y vuelve a configurarlo todo según tus casillas",
    "junkAsk": "¿Limpiar la basura?",
    "junkText": "Todo lo que no es de Elite ni un complemento marcado se mueve a una carpeta de copia: el paquete dow2-patches, copias viejas de complementos, restos de versiones anteriores del launcher. Luego se comprueban los archivos y se reinstalan los complementos marcados.",
    "junkDo": "Limpiar",
    "junkCancel": "Cancelar",
    "junkDone": "Limpio: {n} archivos movidos a {dir}",
    "junkNone": "No hay nada que limpiar",
    "launcherUpdate": "Hay un nuevo launcher {v}: haz clic para descargarlo",
    "starting": "Iniciando el juego…",
    "mirrors": "{n} espejo(s) configurados",
    "allNews": "Todas las noticias",
    "components": "Complementos",
    "conflictActive": "Hay una copia antigua instalada a mano (dow2-patches): se apartará y se instalará la versión del launcher",
    "main": "Principal",
    "mainNote": "se juega en los lobbies",
    "active": "Instalada",
    "switchBtn": "Cambiar",
    "installBtn": "Instalar",
    "instant": "instantáneo",
    "upTo": "hasta {s}",
    "needDl": "requiere descarga",
    "archive": "Versiones archivadas ({n})",
    "youPlay": "Juegas {name}",
    "notMain": "— en los lobbies se juega {name}",
    "switching": "Cambiando a {name}…",
    "diagTitle": "Ayuda a los desarrolladores",
    "diagName": "Tu nick (opcional)",
    "sendLogs": "Enviar registros",
    "sendLogsNote": "envía al desarrollador los registros de los complementos y del juego (estadísticas del lobby, lag del observador, botón Continue)",
    "logsSent": "Registros enviados, ¡gracias! Referencia: {id}",
    "sending": "Enviando…",
    "sendLogsHome": "Enviar registros al desarrollador",
    "versions": "Versiones",
    "archiveH": "Archivo",
    "installedTag": "instalada",
    "notInstalledShort": "no instalada",
    "addonInfo": "Detalles: {name}",
    "addonVer": "Versión {v}",
    "addonNext": "la versión {v} llega con la próxima actualización",
    "addonCheck": "Buscar actualizaciones de complementos", "addonChecking": "Comprobando…", "addonSame": "Todo al día ({time})", "addonChanged": "Complementos actualizados", "addonNew": "nuevo: {name}", "addonGone": "retirado: {name}", "addonChgVer": "{name}: {from} → {to}", "addonOpts": "{name}: cambiaron sus ajustes",
    "addonLater": "se aplica la próxima vez que inicies el juego",
    "addonChangedN": "Complementos cambiados: {n} — marcados abajo",
    "chipNew": "nuevo", "chipUpdated": "actualizado", "chipOpts": "ajustes cambiados",
    "newsAll": "Leer todo", "newsLess": "Contraer", "newsLink": "Abrir el enlace",
    "evTitle": "Eventos", "newsRelLauncher": "Launcher {v}", "newsRelPatches": "Complementos {v}", "netTab": "Red y servidores", "langDefault": "Predeterminado ({name})", "myStats": "Mis estadísticas", "addonSettings": "Ajustes", "cat_network": "Red y automatch", "cat_interface": "Interfaz", "cat_gameplay": "Juego", "cat_fixes": "Correcciones", "cat_experiment": "Experimentos", "evNow": "ahora", "evInM": "en {n} min", "evInH": "en {n} h", "evInD": "en {n} d",
    "guardOff": "Desactivado antes de iniciar (complementos apagados en el launcher, copias instaladas a mano): {list}.", "guardLoader": "Queda un cargador independiente de dow2-patches (winmm.dll) en la carpeta del juego: Ajustes → Limpiar.",
    "playAfterSync": "Primero se actualizan los complementos; luego el juego se inicia solo.",
    // 1.4.11: the vanilla game next to Play
    "vanillaH": "Sin el mod", "vanillaName": "Retribution vanilla", "vanillaNote": "El juego sin Elite, con nuestros complementos que funcionan allí", "vanillaTag": "nuestros complementos", "vanillaWarn": "Juegas a Retribution vanilla: aquí no están las salas de Elite ni los complementos solo para Elite.", "eliteOnly": "Solo Elite", "eliteOnlyNote": "Funciona solo en Elite: no se carga en Retribution vanilla.", "readyVanilla": "Retribution vanilla está listo", "guardVanillaLoader": "El cargador de los complementos aún no está en su sitio: vanilla se inicia sin ellos.", "toVanilla": "Preparando Retribution vanilla…", "vanillaCopy": "en vanilla: versión {v}",
    "launcherNew": "Ya está Elite Launcher {v}",
    "launcherUpdateBtn": "Actualizar el launcher", "fwdOffer": "Tu conexión con los servidores de Relic tiene problemas ({why}). Nuestros servidores de reenvío pueden llevar tus partidas a Relic.", "fwdOn": "Activar reenvío", "fwdLater": "Ahora no", "fwdDone": "Reenvío activado: funciona desde el próximo inicio del juego.",
    "gnTab": "Juego en línea", "gnTitle": "Servidores de juego desde este equipo", "gnCheck": "Comprobar", "gnChecking": "Comprobando… (10-20 s)", "gnNote": "Con las mismas reglas con las que los complementos eligen servidor. Nunca mientras el juego está abierto.", "gnGame": "El juego está en marcha: la comprobación espera a que se cierre para no molestar la partida.", "gnNever": "Aún sin comprobar.", "gnWhen": "comprobado a las {time}", "gnRelic": "Relic", "gnRelicRelay": "Servidor de juego de Relic", "gnRelicApi": "API de Relic (16 peticiones)", "gnClosed": "puerto cerrado", "gnSlowMs": "{n} ms - lento", "gnStreamOk": "{kb} KB en {s} s", "gnStreamCut": "cortado en {kb} KB", "gnRelicOk": "La conexión con Relic está bien.", "gnRelicBad": "La conexión con Relic tiene problemas: {why}. Los servidores de reenvío pueden ayudar.", "gnRelicFwdOn": "La conexión con Relic tiene problemas: {why}. El reenvío está activado.", "gnRelicWait": "Relic se comprueba unos segundos después de iniciar el launcher.", "gnOwn": "Nuestros servidores de juego (Automatch)", "gnFwd": "Servidores de reenvío", "gnTickOn": "activado", "gnTickOff": "desactivado", "gnTickNone": "no existe el complemento", "gnUdpMs": "UDP {n} ms", "gnUdpNone": "sin respuesta UDP", "gnBurst": "flujo {got}/{n}", "gnBurstCut": "el flujo se corta: {got}/{n}, {tail} de los 6 últimos", "gnTcpOk": "TCP {kb} KB", "gnTcpCut": "TCP se corta en {kb} KB", "gnTcpNone": "TCP: sin conexión", "gnNearest": "el más cercano", "gnNotUsed": "no se usa", "gnOwnPick": "Nuestro automatch pondría tu partida en: {node}.", "gnOwnNone": "Ninguno de nuestros servidores sirve desde aquí: puede que las partidas del automatch no conecten.", "gnOwnOff": "El automatch está desactivado. La casilla está en Complementos.", "gnOwnHow": "Las partidas del automatch siempre van por nuestros servidores: el mejor para todos o a través del más cercano a ti. Las demás salas son partidas de Relic.", "gnFwdVia": "Las partidas de Relic irían por: {node}.", "gnFwdNone": "Ningún servidor de reenvío sirve desde aquí: las partidas van directas a Relic.", "gnFwdFit": "Sirven como servidores de reenvío: {list}.", "gnFwdOff": "Desactivado: las partidas van directas a Relic. La casilla está en Complementos.", "gnFwdNotNeeded": "Desactivado: no hace falta mientras la conexión con Relic esté bien.", "gnTcpInfo": "El juego llega a nuestros servidores solo por UDP. TCP es informativo: un corte en ~33 KB significa que la línea corta las conexiones largas.", "gnListLadder": "Lista de servidores del ladder (firmada), puerto UDP {port}.", "gnListBuiltin": "Lista integrada (el ladder no respondió), puerto UDP {port}.", "gnPoland": "Polonia", "gnMoscow2": "Moscú 2",
    "gnLobby": "Nuestros servidores de automatch (salas)", "gnLobbyConn": "conexión {n} ms", "gnLobbyNone": "sin conexión", "gnLobbyDns": "nombre no encontrado", "gnLobbyStream": "flujo {b} bytes en {s} s", "gnLobbyCut": "el flujo se corta (¿DPI?): {b} bytes en {s} s", "gnLobbyNoAns": "prueba de flujo: sin respuesta", "gnLobbyNoStream": "prueba de flujo desactivada (StreamCheck=0)", "gnLobbyUsed": "se usará", "gnLobbyPick": "El automatch del juego irá a nuestro servidor de salas {host}.", "gnLobbyRelic": "Ninguno de nuestros servidores de salas sirve: el juego va directo a Relic (sin el nuevo automatch, búsqueda clásica).", "gnLobbyOff": "Automatch desactivado: la sala del juego es de Relic. La casilla está en Complementos.", "gnLobbyHow": "Servidores en orden; se usa el primero que responde en 2,5 s y pasa la prueba de flujo (60000+ de 64 KB en 4 s).",
    "gnWhyClosed": "{n} de {m} puertos de los servidores de Relic no responden", "gnWhyStream": "el flujo hacia Relic se cortó en {kb} KB", "gnWhySlow": "Relic responde en {n} ms", "gnWhyBridge": "tu ajuste anterior enviaba todas las partidas por nuestro servidor",
    "launcherUpdating": "Actualizando el launcher… {p}",
    "launcherFail": "No se pudo actualizar el launcher: {e}",
    "noNews": "Aún no hay noticias",
    "online": "En línea",
    "onSearching": "Buscan partida",
    "onStateCreating": "Preparándose",
    "onStateLobby": "En el lobby",
    "onStatePlaying": "En curso", "lvWatch": "Ver",
    "onNobody": "Nadie busca partida. Inicia el juego y pulsa «Find a Game».",
    "onOffline": "Sin conexión con el servidor de la ladder, reintentando…",
    "onLoading": "Cargando quién está en línea…",
    "onLadder": "Ladder e historial de partidas ›",
    "race_space_marines": "Marines Espaciales",
    "race_chaos_marines": "Caos",
    "race_eldar": "Eldar",
    "race_orks": "Orkos",
    "race_tyranids": "Tiránidos",
    "race_imperial_guard": "Guardia Imperial",
    "race_t_tau": "Tau",
    "race_z_unecron": "Necrones",
    "race_ordo_malleus": "Ordo Malleus",
    "race_random": "Raza aleatoria",
    "allAddons": "Todos ›",
    "onInMatchH": "En partida"
  },
  fr: {
    "chToday": "Aujourd'hui",
    "chYesterday": "Hier",
    "chNeedBrowser": "Ce compte Steam s'est connecté depuis un autre ordinateur : confirmez une fois dans le navigateur.",
    "chNoSteam": "Steam n'est pas lancé ici : connexion par le navigateur.",
    "chLoginFail": "Connexion impossible. Appuyez sur « Envoyer les journaux » dans les réglages.",
    "chLoginAs": "Se connecter en tant que {name}",
    "onMin": "{n} min",
    "setGeneral": "Général",
    "chWaiting": "En attente de la connexion Steam dans le navigateur…",
    "chCancel": "Annuler",
    "prNote": "Votre nom, classement 1v1 et le chat des joueurs.",
    "prGames": "Parties : {n} · {pct} % gagnées",
    "prNoGames": "Aucune partie classée cette saison",
    "nickStats": "Statistiques du joueur",
    "nickSteam": "Profil Steam",
    "chSending": "Envoi…",
    "chNotSent": "Non envoyé",
    "chRetry": "Réessayer",
    "chDelete": "Supprimer",
    "chOrig": "Original",
    "onWatcher": "spectateur",
    "onWatchers": "Spectateurs",
    "chAll": "Général",
    "chDev": "Développeurs",
    "chLogin": "Se connecter avec Steam",
    "chLogout": "Se déconnecter",
    "chSignInToWrite": "Connectez-vous avec Steam pour écrire dans le chat.",
    "chPlaceholder": "Message… (Entrée envoie, Maj+Entrée nouvelle ligne)",
    "chMembers": "Dans le launcher",
    "chEmpty": "C'est calme. Dites bonjour !",
    "chWaitLogin": "Connectez-vous avec Steam dans le navigateur, puis revenez ici.",
    "st_menu": "au menu",
    "st_game": "en jeu",
    "st_search": "cherche une partie",
    "st_match": "en match",
    "chSignedIn": "Connecté : {name}",
    "fbTitle": "Écrire aux développeurs",
    "fbName": "Votre nom :",
    "fbAttach": "🖼 Image",
    "fbSend": "Envoyer",
    "fbPlaceholder": "Bug, idée, question… Collez une capture avec Ctrl+V. La réponse arrivera ici.",
    "fbEmpty": "Pas encore de messages.",
    "fbSent": "Envoyé, merci !",
    "fbDev": "Développeurs d'Elite",
    "fbMe": "Vous",
    "fbTooBig": "Image trop grande (max 8 Mo)",
    "home": "Accueil",
    "settings": "Paramètres",
    "hotkeys": "Hotkeys",
    "hkGrid": "Grid hotkeys (QWER / ASDF / ZXCV)",
    "hkGridNote": "abilities and unit building by position on the keyboard instead of first letters; the same switch as Options → Grid Hotkeys in the game",
    "hkMain": "Main commands",
    "hkAll": "All keys",
    "hkGridShadow": "Sans effet avec la grille activée : les touches de grille ci-dessus s'appliquent",
    "hkGrpObserver": "Observateur et replays",
    "hkSearch": "Search: command or key",
    "hkReset": "Game defaults",
    "hkHow": "click a key, then press the new one (with Ctrl / Shift / Alt if you want); Esc cancels. Applies at the next game start.",
    "hkSaved": "Hotkeys saved — they apply at the next game start",
    "hkUnsaved": "Non enregistré : fermez le jeu puis cliquez sur Enregistrer",
    "hkDup": "Same key twice: {k}",
    "hkCustom": "your changes: {n}",
    "hkNone": "game defaults",
    "hkAb": "Abilities",
    "hkUc1": "Build, row 1",
    "hkUc2": "Build, row 2",
    "hkUc3": "Build, row 3",
    "hkPress": "press a key…",
    "unTitle": "Remove Elite",
    "unBtn": "Remove Elite completely",
    "unNote": "the mod, all add-ons and the launcher's files in the game folder; then Steam checks the game and you have clean vanilla",
    "unSure": "Sure? Press again to remove",
    "unDone": "Elite removed ({n} files). Steam is checking the game files now",
    "news": "Actualités",
    "version": "Version",
    "links": "Liens",
    "play": "Jouer",
    "install": "Installer Elite",
    "updating": "Mise à jour…",
    "running": "Jeu en cours",
    "gameRunningAddons": "Le jeu est lancé : fermez-le pour modifier les modules. Les mises à jour s’installent à sa fermeture.",
    "inGameDir": "Le launcher est dans le dossier de Dawn of War II : le jeu peut planter. Déplacez le dossier du launcher ailleurs et lancez-le depuis là.",
    "installed": "Installée",
    "current": "Vous avez : {v}",
    "notInstalled": "Elite n'est pas encore installé",
    "ready": "Elite {v} est prêt",
    "switchTo": "Passer à {name} — télécharger les changements",
    "updateNow": "Mettre à jour",
    "checking": "Vérification des fichiers… {p} %",
    "downloading": "Mise à jour de {file}",
    "meta": "Téléchargé {dl} · réutilisé du disque {re} · depuis le cache local {fc} · miroir {m}",
    "done": "Terminé : {n} fichier(s) mis à jour, téléchargé {dl}",
    "upToDate": "Tout est à jour",
    "cancel": "Annuler",
    "cancelled": "Annulé",
    "connecting": "Connexion au serveur de mises à jour…",
    "offline": "Pas de connexion au serveur de mises à jour — vous pouvez quand même jouer à la version installée.",
    "noGame": "Dawn of War II: Retribution introuvable",
    "noGameText": "Elite Mod s'installe par-dessus la version Steam du jeu.",
    "getGame": "L'obtenir sur Steam",
    "browse": "Choisir le dossier…",
    "rescan": "Rechercher à nouveau",
    "getSteam": "Installer Steam",
    "gameFolder": "Dossier du jeu",
    "open": "Ouvrir",
    "language": "Langue",
    "cache": "Garder les versions précédentes",
    "usageTitle": "Statistiques anonymes",
    "usage": "Me compter parmi les utilisateurs du launcher",
    "usageNote": "Une fois par jour, le launcher envoie un hash qui change chaque jour, avec sa version, le système et la version d'Elite. Aucun nom, rien de Steam ni du PC ; les jours ne peuvent pas être reliés entre eux.",
    "onTag": "Mentionner dans le chat", "roomsTab": "Salons", "roomsTitle": "Salons ouverts", "roomsNote": "Parties personnalisées en préparation, la même liste que le navigateur de parties. Elite ou vanilla d'après les races, les insignes et la carte.", "roomsNone": "Personne ne prépare de partie.", "roomsErr": "La liste n'est pas disponible.", "roomsFree": "libre", "roomsVan": "vanilla", "roomsOther": "autre mod", "roomsObs": "observateurs", "roomsPw": "mot de passe", "behTitle": "Chat et fenêtre", "muteMention": "Pas de son quand on me mentionne (@nom) dans le chat", "closeQuits": "Le bouton fermer quitte le launcher (au lieu de le cacher dans la zone de notification)",
    "lanTitle": "Réseau local",
    "lanShare": "Télécharger Elite depuis les autres launchers du réseau local et le partager avec eux",
    "trayOpen": "Ouvrir Elite Launcher",
    "trayQuit": "Quitter",
    "cacheNote": "y revenir est instantané",
    "mirror": "Miroir supplémentaire (facultatif)",
    "netTitle": "Nos serveurs depuis cet ordinateur", "netCheck": "Vérifier à nouveau", "netChecking": "Vérification…", "netFiles": "Fichiers (mises à jour d’Elite et des modules)", "netApi": "Chat, en ligne, salons, mise à jour du lanceur", "netMoscow": "Moscou", "netGermany": "Allemagne", "netR2": "Cloudflare (stockage)", "netMs": "{n} ms", "netNone": "pas de réponse", "netUsed": "utilisé", "netWait": "Vérification de nos serveurs…", "netNoteDone": "Vérifié au démarrage ; à nouveau si un serveur ne répond plus. Sans ping : un petit téléchargement depuis chacun.", "netNoteOld": "L’ordre du dernier démarrage ; vérification en cours.",
    "save": "Enregistrer",
    "repairTitle": "Réparer",
    "repair": "Vérifier et réparer les fichiers",
    "repairNote": "vérifie chaque fichier et ne retélécharge que les parties endommagées",
    "junkTitle": "Nettoyage",
    "junk": "Nettoyer les restes",
    "junkNote": "retire les plugins restés d'anciennes versions et d'installations manuelles (dow2-patches, vieilles copies dans Elite_DLLs), puis remet tout en place selon vos cases",
    "junkAsk": "Nettoyer les restes ?",
    "junkText": "Tout ce qui n'est ni à Elite ni un module coché part dans un dossier de sauvegarde : le paquet dow2-patches, les vieilles copies de modules, les restes des anciennes versions du launcher. Ensuite les fichiers sont vérifiés et les modules cochés réinstallés.",
    "junkDo": "Nettoyer",
    "junkCancel": "Annuler",
    "junkDone": "Nettoyé : {n} fichiers déplacés dans {dir}",
    "junkNone": "Rien à nettoyer",
    "launcherUpdate": "Nouveau launcher {v} disponible — cliquez pour le télécharger",
    "starting": "Lancement du jeu…",
    "mirrors": "{n} miroir(s) configuré(s)",
    "allNews": "Toutes les actualités",
    "components": "Modules",
    "conflictActive": "Une ancienne copie installée à la main est dans le dossier du jeu (dow2-patches) — elle sera mise de côté et la version du launcher installée",
    "main": "Principale",
    "mainNote": "c'est celle des lobbies",
    "active": "Installée",
    "switchBtn": "Changer",
    "installBtn": "Installer",
    "instant": "instantané",
    "upTo": "jusqu'à {s}",
    "needDl": "téléchargement nécessaire",
    "archive": "Versions archivées ({n})",
    "youPlay": "Vous jouez {name}",
    "notMain": "— les lobbies jouent {name}",
    "switching": "Passage à {name}…",
    "diagTitle": "Aider les développeurs",
    "diagName": "Votre pseudo (facultatif)",
    "sendLogs": "Envoyer les journaux",
    "sendLogsNote": "envoie au développeur les journaux des modules et du jeu (statistiques du lobby, lag de l'observateur, bouton Continue)",
    "logsSent": "Journaux envoyés, merci ! Référence : {id}",
    "sending": "Envoi…",
    "sendLogsHome": "Envoyer les journaux au développeur",
    "versions": "Versions",
    "archiveH": "Archives",
    "installedTag": "installée",
    "notInstalledShort": "non installée",
    "addonInfo": "Détails : {name}",
    "addonVer": "Version {v}",
    "addonNext": "la version {v} arrive avec la prochaine mise à jour",
    "addonCheck": "Vérifier les mises à jour des modules", "addonChecking": "Vérification…", "addonSame": "Tout est à jour ({time})", "addonChanged": "Modules mis à jour", "addonNew": "nouveau : {name}", "addonGone": "retiré : {name}", "addonChgVer": "{name} : {from} → {to}", "addonOpts": "{name} : ses réglages ont changé",
    "addonLater": "s’applique au prochain lancement du jeu",
    "addonChangedN": "Modules modifiés : {n} — marqués ci-dessous",
    "chipNew": "nouveau", "chipUpdated": "mis à jour", "chipOpts": "réglages modifiés",
    "newsAll": "Tout lire", "newsLess": "Réduire", "newsLink": "Ouvrir le lien",
    "evTitle": "Événements", "newsRelLauncher": "Lanceur {v}", "newsRelPatches": "Modules {v}", "netTab": "Réseau et serveurs", "langDefault": "Par défaut ({name})", "myStats": "Mes statistiques", "addonSettings": "Réglages", "cat_network": "Réseau et automatch", "cat_interface": "Interface", "cat_gameplay": "Jeu", "cat_fixes": "Correctifs", "cat_experiment": "Expériences", "evNow": "en cours", "evInM": "dans {n} min", "evInH": "dans {n} h", "evInD": "dans {n} j",
    "guardOff": "Désactivé avant le lancement (modules éteints dans le lanceur, copies installées à la main) : {list}.", "guardLoader": "Un chargeur autonome dow2-patches (winmm.dll) reste dans le dossier du jeu : Paramètres → Nettoyer.",
    "playAfterSync": "Mise à jour des modules d'abord — le jeu démarrera ensuite tout seul.",
    // 1.4.11: the vanilla game next to Play
    "vanillaH": "Sans le mod", "vanillaName": "Retribution vanilla", "vanillaNote": "Le jeu sans Elite, avec nos modules qui y fonctionnent", "vanillaTag": "nos modules", "vanillaWarn": "Vous jouez à Retribution vanilla : les salons Elite et les modules réservés à Elite n'y sont pas.", "eliteOnly": "Elite uniquement", "eliteOnlyNote": "Ne fonctionne que dans Elite : pas chargé dans Retribution vanilla.", "readyVanilla": "Retribution vanilla est prêt", "guardVanillaLoader": "Le chargeur des modules n'est pas encore en place : vanilla démarre sans eux.", "toVanilla": "Préparation de Retribution vanilla…", "vanillaCopy": "en vanilla : version {v}",
    "launcherNew": "Elite Launcher {v} est disponible",
    "launcherUpdateBtn": "Mettre à jour le launcher", "fwdOffer": "Votre connexion aux serveurs de Relic a des problèmes ({why}). Nos serveurs de relais peuvent acheminer vos parties vers Relic.", "fwdOn": "Activer le relais", "fwdLater": "Plus tard", "fwdDone": "Relais activé : actif au prochain lancement du jeu.",
    "gnTab": "Jeu en ligne", "gnTitle": "Serveurs de jeu depuis cet ordinateur", "gnCheck": "Vérifier", "gnChecking": "Vérification… (10-20 s)", "gnNote": "Avec les mêmes règles que les modules pour choisir un serveur. Jamais pendant que le jeu tourne.", "gnGame": "Le jeu est lancé : la vérification attend sa fermeture pour ne pas gêner la partie.", "gnNever": "Pas encore vérifié.", "gnWhen": "vérifié à {time}", "gnRelic": "Relic", "gnRelicRelay": "Serveur de jeu Relic", "gnRelicApi": "API Relic (16 requêtes)", "gnClosed": "port fermé", "gnSlowMs": "{n} ms - lent", "gnStreamOk": "{kb} Ko en {s} s", "gnStreamCut": "coupé à {kb} Ko", "gnRelicOk": "La connexion à Relic va bien.", "gnRelicBad": "La connexion à Relic a des problèmes : {why}. Les serveurs de relais peuvent aider.", "gnRelicFwdOn": "La connexion à Relic a des problèmes : {why}. Le relais est activé.", "gnRelicWait": "Relic est vérifié quelques secondes après le démarrage du lanceur.", "gnOwn": "Nos serveurs de jeu (Automatch)", "gnFwd": "Serveurs de relais", "gnTickOn": "activé", "gnTickOff": "désactivé", "gnTickNone": "module absent", "gnUdpMs": "UDP {n} ms", "gnUdpNone": "pas de réponse UDP", "gnBurst": "flux {got}/{n}", "gnBurstCut": "le flux se coupe : {got}/{n}, {tail} des 6 derniers", "gnTcpOk": "TCP {kb} Ko", "gnTcpCut": "TCP coupé à {kb} Ko", "gnTcpNone": "TCP : pas de connexion", "gnNearest": "le plus proche", "gnNotUsed": "non utilisé", "gnOwnPick": "Notre automatch mettrait votre partie sur : {node}.", "gnOwnNone": "Aucun de nos serveurs n’est utilisable d’ici : les parties de l’automatch risquent de ne pas se connecter.", "gnOwnOff": "L’automatch est désactivé. La case est dans Modules.", "gnOwnHow": "Les parties de l’automatch passent toujours par nos serveurs : le meilleur pour tous, ou via votre plus proche. Les autres salons sont des parties Relic.", "gnFwdVia": "Les parties Relic passeraient par : {node}.", "gnFwdNone": "Aucun serveur de relais n’est utilisable d’ici : les parties vont directement à Relic.", "gnFwdFit": "Utilisables comme serveurs de relais : {list}.", "gnFwdOff": "Désactivé : les parties vont directement à Relic. La case est dans Modules.", "gnFwdNotNeeded": "Désactivé - inutile tant que la connexion à Relic va bien.", "gnTcpInfo": "Le jeu joint nos serveurs uniquement en UDP. TCP est indicatif : une coupure vers ~33 Ko signifie que la ligne coupe les longues connexions.", "gnListLadder": "Liste des serveurs du ladder (signée), port UDP {port}.", "gnListBuiltin": "Liste intégrée (le ladder n’a pas répondu), port UDP {port}.", "gnPoland": "Pologne", "gnMoscow2": "Moscou 2",
    "gnLobby": "Nos serveurs d’automatch (salons)", "gnLobbyConn": "connexion {n} ms", "gnLobbyNone": "pas de connexion", "gnLobbyDns": "nom introuvable", "gnLobbyStream": "flux {b} octets en {s} s", "gnLobbyCut": "le flux se coupe (DPI ?) : {b} octets en {s} s", "gnLobbyNoAns": "test du flux : pas de réponse", "gnLobbyNoStream": "test du flux désactivé (StreamCheck=0)", "gnLobbyUsed": "sera utilisé", "gnLobbyPick": "L’automatch du jeu ira sur notre serveur de salons {host}.", "gnLobbyRelic": "Aucun de nos serveurs de salons n’est utilisable : le jeu parle directement à Relic (pas de nouvel automatch, recherche classique).", "gnLobbyOff": "Automatch désactivé : le salon du jeu est celui de Relic. La case est dans Modules.", "gnLobbyHow": "Serveurs dans l’ordre ; le premier qui répond en 2,5 s et passe le test du flux (60000+ sur 64 Ko en 4 s) est utilisé.",
    "gnWhyClosed": "{n} des {m} ports des serveurs de Relic ne répondent pas", "gnWhyStream": "le flux vers Relic s’est coupé à {kb} Ko", "gnWhySlow": "Relic répond en {n} ms", "gnWhyBridge": "votre ancien réglage faisait passer toutes les parties par notre serveur",
    "launcherUpdating": "Mise à jour du launcher… {p}",
    "launcherFail": "Impossible de mettre à jour le launcher : {e}",
    "noNews": "Pas encore d’actualités",
    "online": "En ligne",
    "onSearching": "Cherchent une partie",
    "onStateCreating": "En préparation",
    "onStateLobby": "Dans le salon",
    "onStatePlaying": "En cours", "lvWatch": "Regarder",
    "onNobody": "Personne ne cherche de partie. Lancez le jeu et appuyez sur « Find a Game ».",
    "onOffline": "Pas de connexion au serveur du ladder, nouvel essai…",
    "onLoading": "Chargement des joueurs en ligne…",
    "onLadder": "Ladder et historique des parties ›",
    "race_space_marines": "Space Marines",
    "race_chaos_marines": "Chaos",
    "race_eldar": "Eldar",
    "race_orks": "Orks",
    "race_tyranids": "Tyranides",
    "race_imperial_guard": "Garde impériale",
    "race_t_tau": "Tau",
    "race_z_unecron": "Nécrons",
    "race_ordo_malleus": "Ordo Malleus",
    "race_random": "Race aléatoire",
    "allAddons": "Tous ›",
    "onInMatchH": "En partie"
  },
  de: {
    "chToday": "Heute",
    "chYesterday": "Gestern",
    "chNeedBrowser": "Dieses Steam-Konto war an einem anderen PC angemeldet: einmal im Browser bestätigen.",
    "chNoSteam": "Steam läuft hier nicht: Anmeldung über den Browser.",
    "chLoginFail": "Anmeldung fehlgeschlagen. In den Einstellungen „Logs senden“ drücken.",
    "chLoginAs": "Anmelden als {name}",
    "onMin": "{n} Min.",
    "setGeneral": "Allgemein",
    "chWaiting": "Warte auf die Steam-Anmeldung im Browser…",
    "chCancel": "Abbrechen",
    "prNote": "Dein Name, 1v1-Rating und der Spieler-Chat.",
    "prGames": "Spiele: {n} · {pct} % gewonnen",
    "prNoGames": "Diese Saison noch keine Ladder-Spiele",
    "nickStats": "Spielerstatistik",
    "nickSteam": "Steam-Profil",
    "chSending": "Wird gesendet…",
    "chNotSent": "Nicht gesendet",
    "chRetry": "Erneut senden",
    "chDelete": "Löschen",
    "chOrig": "Original",
    "onWatcher": "Zuschauer",
    "onWatchers": "Zuschauer",
    "chAll": "Allgemein",
    "chDev": "Entwickler",
    "chLogin": "Mit Steam anmelden",
    "chLogout": "Abmelden",
    "chSignInToWrite": "Mit Steam anmelden, um im Chat zu schreiben.",
    "chPlaceholder": "Nachricht… (Enter sendet, Umschalt+Enter neue Zeile)",
    "chMembers": "Im Launcher",
    "chEmpty": "Noch still hier. Sag hallo!",
    "chWaitLogin": "Im Browser mit Steam anmelden und hierher zurückkommen.",
    "st_menu": "im Menü",
    "st_game": "im Spiel",
    "st_search": "sucht ein Spiel",
    "st_match": "im Match",
    "chSignedIn": "Angemeldet als {name}",
    "fbTitle": "An die Entwickler schreiben",
    "fbName": "Dein Name:",
    "fbAttach": "🖼 Bild",
    "fbSend": "Senden",
    "fbPlaceholder": "Fehler, Idee, Frage… Screenshot mit Strg+V einfügen. Die Antwort kommt hierher.",
    "fbEmpty": "Noch keine Nachrichten.",
    "fbSent": "Gesendet, danke!",
    "fbDev": "Elite-Entwickler",
    "fbMe": "Du",
    "fbTooBig": "Bild zu groß (max. 8 MB)",
    "home": "Start",
    "settings": "Einstellungen",
    "hotkeys": "Hotkeys",
    "hkGrid": "Grid hotkeys (QWER / ASDF / ZXCV)",
    "hkGridNote": "abilities and unit building by position on the keyboard instead of first letters; the same switch as Options → Grid Hotkeys in the game",
    "hkMain": "Main commands",
    "hkAll": "All keys",
    "hkGridShadow": "Ohne Wirkung bei aktivem Raster: es gelten die Raster-Tasten oben",
    "hkGrpObserver": "Beobachter und Wiederholungen",
    "hkSearch": "Search: command or key",
    "hkReset": "Game defaults",
    "hkHow": "click a key, then press the new one (with Ctrl / Shift / Alt if you want); Esc cancels. Applies at the next game start.",
    "hkSaved": "Hotkeys saved — they apply at the next game start",
    "hkUnsaved": "Nicht gespeichert: Spiel schließen, dann Speichern drücken",
    "hkDup": "Same key twice: {k}",
    "hkCustom": "your changes: {n}",
    "hkNone": "game defaults",
    "hkAb": "Abilities",
    "hkUc1": "Build, row 1",
    "hkUc2": "Build, row 2",
    "hkUc3": "Build, row 3",
    "hkPress": "press a key…",
    "unTitle": "Remove Elite",
    "unBtn": "Remove Elite completely",
    "unNote": "the mod, all add-ons and the launcher's files in the game folder; then Steam checks the game and you have clean vanilla",
    "unSure": "Sure? Press again to remove",
    "unDone": "Elite removed ({n} files). Steam is checking the game files now",
    "news": "Neuigkeiten",
    "version": "Version",
    "links": "Links",
    "play": "Spielen",
    "install": "Elite installieren",
    "updating": "Aktualisiere…",
    "running": "Spiel läuft",
    "gameRunningAddons": "Das Spiel läuft: schließe es, um Add-ons zu ändern. Updates werden nach dem Schließen installiert.",
    "inGameDir": "Der Launcher liegt im Dawn-of-War-II-Ordner – das kann das Spiel abstürzen lassen. Verschiebe den Launcher-Ordner woandershin und starte ihn von dort.",
    "installed": "Installiert",
    "current": "Installiert: {v}",
    "notInstalled": "Elite ist noch nicht installiert",
    "ready": "Elite {v} ist bereit",
    "switchTo": "Zu {name} wechseln — Änderungen herunterladen",
    "updateNow": "Aktualisieren",
    "checking": "Prüfe Dateien… {p} %",
    "downloading": "Aktualisiere {file}",
    "meta": "Heruntergeladen {dl} · von der Festplatte übernommen {re} · aus dem lokalen Cache {fc} · Mirror {m}",
    "done": "Fertig: {n} Datei(en) aktualisiert, {dl} heruntergeladen",
    "upToDate": "Alles ist aktuell",
    "cancel": "Abbrechen",
    "cancelled": "Abgebrochen",
    "connecting": "Verbinde mit dem Update-Server…",
    "offline": "Keine Verbindung zum Update-Server — die installierte Version kannst du trotzdem spielen.",
    "noGame": "Dawn of War II: Retribution nicht gefunden",
    "noGameText": "Elite Mod wird über der Steam-Version des Spiels installiert.",
    "getGame": "Auf Steam holen",
    "browse": "Ordner wählen…",
    "rescan": "Erneut suchen",
    "getSteam": "Steam installieren",
    "gameFolder": "Spielordner",
    "open": "Öffnen",
    "language": "Sprache",
    "cache": "Frühere Versionen behalten",
    "usageTitle": "Anonyme Statistik",
    "usage": "Mich als Launcher-Nutzer mitzählen",
    "usageNote": "Einmal am Tag sendet der Launcher einen Hash, der sich täglich ändert, dazu seine Version, das System und die Elite-Version. Keine Namen, keine Steam- oder Hardwaredaten; Tage lassen sich nicht miteinander verknüpfen.",
    "onTag": "Im Chat erwähnen", "roomsTab": "Lobbys", "roomsTitle": "Offene Lobbys", "roomsNote": "Eigene Spiele, die gerade vorbereitet werden, dieselbe Liste wie der Spielbrowser. Elite oder Vanilla nach Völkern, Abzeichen und Karte.", "roomsNone": "Gerade bereitet niemand ein Spiel vor.", "roomsErr": "Die Liste ist gerade nicht verfügbar.", "roomsFree": "frei", "roomsVan": "Vanilla", "roomsOther": "anderer Mod", "roomsObs": "Zuschauer", "roomsPw": "Passwort", "behTitle": "Chat und Fenster", "muteMention": "Kein Ton, wenn mich jemand im Chat erwähnt (@Name)", "closeQuits": "Das Schließen-Kreuz beendet den Launcher (statt ihn im Infobereich zu verstecken)",
    "lanTitle": "Lokales Netzwerk",
    "lanShare": "Elite von anderen Launchern im lokalen Netzwerk laden und mit ihnen teilen",
    "trayOpen": "Elite Launcher öffnen",
    "trayQuit": "Beenden",
    "cacheNote": "zurückwechseln geht sofort",
    "mirror": "Zusätzlicher Mirror (optional)",
    "netTitle": "Unsere Server von diesem Computer aus", "netCheck": "Erneut prüfen", "netChecking": "Prüfe…", "netFiles": "Dateien (Updates von Elite und Erweiterungen)", "netApi": "Chat, Online, Lobbys, Launcher-Update", "netMoscow": "Moskau", "netGermany": "Deutschland", "netR2": "Cloudflare (Speicher)", "netMs": "{n} ms", "netNone": "keine Antwort", "netUsed": "in Benutzung", "netWait": "Prüfe unsere Server…", "netNoteDone": "Beim Start geprüft; erneut, wenn ein Server nicht mehr antwortet. Kein Ping – ein kleiner Download von jedem.", "netNoteOld": "Die Reihenfolge des letzten Starts; wird gerade geprüft.",
    "save": "Speichern",
    "repairTitle": "Reparieren",
    "repair": "Dateien prüfen und reparieren",
    "repairNote": "prüft jede Datei und lädt nur beschädigte Teile neu",
    "junkTitle": "Aufräumen",
    "junk": "Altlasten entfernen",
    "junkNote": "entfernt übrig gebliebene Plugins alter Versionen und manueller Installationen (dow2-patches, alte Kopien in Elite_DLLs) und richtet danach alles nach deinen Häkchen neu ein",
    "junkAsk": "Altlasten entfernen?",
    "junkText": "Alles, was weder zu Elite gehört noch ein angehaktes Add-on ist, wandert in einen Sicherungsordner: das dow2-patches-Paket, alte Add-on-Kopien, Reste früherer Launcher-Versionen. Danach werden die Dateien geprüft und die angehakten Add-ons neu installiert.",
    "junkDo": "Aufräumen",
    "junkCancel": "Abbrechen",
    "junkDone": "Aufgeräumt: {n} Dateien nach {dir} verschoben",
    "junkNone": "Nichts aufzuräumen",
    "launcherUpdate": "Neuer Launcher {v} verfügbar — zum Herunterladen klicken",
    "starting": "Spiel wird gestartet…",
    "mirrors": "{n} Mirror(s) eingerichtet",
    "allNews": "Alle Neuigkeiten",
    "components": "Erweiterungen",
    "conflictActive": "Eine alte, von Hand installierte Kopie liegt im Spielordner (dow2-patches) – sie wird beiseitegelegt und die Launcher-Version installiert",
    "main": "Haupt",
    "mainNote": "diese Version spielen die Lobbys",
    "active": "Jetzt installiert",
    "switchBtn": "Wechseln",
    "installBtn": "Installieren",
    "instant": "sofort",
    "upTo": "bis {s}",
    "needDl": "Download nötig",
    "archive": "Archivversionen ({n})",
    "youPlay": "Du spielst {name}",
    "notMain": "— die Lobbys spielen {name}",
    "switching": "Wechsle zu {name}…",
    "diagTitle": "Den Entwicklern helfen",
    "diagName": "Dein Nickname (optional)",
    "sendLogs": "Logs senden",
    "sendLogsNote": "schickt dem Entwickler die Logs der Erweiterungen und des Spiels (Lobby-Statistik, Beobachter-Lag, Continue-Knopf)",
    "logsSent": "Logs gesendet, danke! Nummer: {id}",
    "sending": "Sende…",
    "sendLogsHome": "Logs an den Entwickler senden",
    "versions": "Versionen",
    "archiveH": "Archiv",
    "installedTag": "installiert",
    "notInstalledShort": "nicht installiert",
    "addonInfo": "Details: {name}",
    "addonVer": "Version {v}",
    "addonNext": "Version {v} kommt mit dem nächsten Update",
    "addonCheck": "Erweiterungen auf Updates prüfen", "addonChecking": "Prüfe…", "addonSame": "Alles aktuell ({time})", "addonChanged": "Erweiterungen aktualisiert", "addonNew": "neu: {name}", "addonGone": "entfernt: {name}", "addonChgVer": "{name}: {from} → {to}", "addonOpts": "{name}: Einstellungen geändert",
    "addonLater": "gilt ab dem nächsten Spielstart",
    "addonChangedN": "Geänderte Erweiterungen: {n} — unten markiert",
    "chipNew": "neu", "chipUpdated": "aktualisiert", "chipOpts": "Einstellungen geändert",
    "newsAll": "Alles lesen", "newsLess": "Einklappen", "newsLink": "Link öffnen",
    "evTitle": "Events", "newsRelLauncher": "Launcher {v}", "newsRelPatches": "Erweiterungen {v}", "netTab": "Netz und Server", "langDefault": "Standard ({name})", "myStats": "Meine Statistik", "addonSettings": "Einstellungen", "cat_network": "Netz und Automatch", "cat_interface": "Oberfläche", "cat_gameplay": "Spiel", "cat_fixes": "Fehlerbehebungen", "cat_experiment": "Experimente", "evNow": "läuft jetzt", "evInM": "in {n} Min.", "evInH": "in {n} Std.", "evInD": "in {n} T.",
    "guardOff": "Vor dem Start deaktiviert (im Launcher ausgeschaltete Erweiterungen, von Hand installierte Kopien): {list}.", "guardLoader": "Ein eigenständiger dow2-patches-Lader (winmm.dll) liegt noch im Spielordner: Einstellungen → Aufräumen.",
    "playAfterSync": "Zuerst werden die Add-ons aktualisiert – das Spiel startet danach von selbst.",
    // 1.4.11: the vanilla game next to Play
    "vanillaH": "Ohne Mod", "vanillaName": "Vanilla Retribution", "vanillaNote": "Das Spiel ohne Elite, mit unseren Add-ons, die dort funktionieren", "vanillaTag": "unsere Add-ons", "vanillaWarn": "Du spielst Vanilla Retribution: Elite-Lobbys und die Add-ons nur für Elite gibt es hier nicht.", "eliteOnly": "Nur Elite", "eliteOnlyNote": "Funktioniert nur in Elite: wird in Vanilla Retribution nicht geladen.", "readyVanilla": "Vanilla Retribution ist bereit", "guardVanillaLoader": "Der Lader der Add-ons ist noch nicht da: Vanilla startet ohne sie.", "toVanilla": "Vanilla Retribution wird vorbereitet…", "vanillaCopy": "in Vanilla: Version {v}",
    "launcherNew": "Elite Launcher {v} ist da",
    "launcherUpdateBtn": "Launcher aktualisieren", "fwdOffer": "Deine Verbindung zu Relics Spielservern hat Probleme ({why}). Unsere Weiterleitungsserver können deine Spiele zu Relic bringen.", "fwdOn": "Weiterleitung einschalten", "fwdLater": "Nicht jetzt", "fwdDone": "Weiterleitung eingeschaltet - ab dem nächsten Spielstart.",
    "gnTab": "Online-Spiel", "gnTitle": "Spielserver von diesem Computer aus", "gnCheck": "Prüfen", "gnChecking": "Prüfe… (10-20 s)", "gnNote": "Nach denselben Regeln, mit denen die Erweiterungen einen Server wählen. Nie, während das Spiel läuft.", "gnGame": "Das Spiel läuft: die Prüfung wartet, bis es geschlossen ist, um das Match nicht zu stören.", "gnNever": "Noch nicht geprüft.", "gnWhen": "geprüft um {time}", "gnRelic": "Relic", "gnRelicRelay": "Relic-Spielserver", "gnRelicApi": "Relic-API (16 Anfragen)", "gnClosed": "Port zu", "gnSlowMs": "{n} ms - langsam", "gnStreamOk": "{kb} KB in {s} s", "gnStreamCut": "bei {kb} KB abgebrochen", "gnRelicOk": "Die Verbindung zu Relic ist in Ordnung.", "gnRelicBad": "Die Verbindung zu Relic hat Probleme: {why}. Weiterleitungsserver können helfen.", "gnRelicFwdOn": "Die Verbindung zu Relic hat Probleme: {why}. Weiterleitung ist eingeschaltet.", "gnRelicWait": "Relic wird einige Sekunden nach dem Start des Launchers geprüft.", "gnOwn": "Unsere Spielserver (Automatch)", "gnFwd": "Weiterleitungsserver", "gnTickOn": "ein", "gnTickOff": "aus", "gnTickNone": "Erweiterung fehlt", "gnUdpMs": "UDP {n} ms", "gnUdpNone": "keine UDP-Antwort", "gnBurst": "Strom {got}/{n}", "gnBurstCut": "Strom bricht ab: {got}/{n}, {tail} der letzten 6", "gnTcpOk": "TCP {kb} KB", "gnTcpCut": "TCP bricht bei {kb} KB ab", "gnTcpNone": "TCP: keine Verbindung", "gnNearest": "am nächsten", "gnNotUsed": "nicht benutzt", "gnOwnPick": "Unser Automatch würde dein Spiel auf {node} legen.", "gnOwnNone": "Keiner unserer Server ist von hier nutzbar - Automatch-Spiele verbinden sich womöglich nicht.", "gnOwnOff": "Automatch ist aus. Das Häkchen ist unter Erweiterungen.", "gnOwnHow": "Automatch-Spiele laufen immer über unsere Server: den besten für alle oder über deinen nächsten. Andere Lobbys sind Relic-Spiele.", "gnFwdVia": "Relic-Spiele liefen über: {node}.", "gnFwdNone": "Kein Weiterleitungsserver ist von hier nutzbar - Spiele gehen direkt zu Relic.", "gnFwdFit": "Als Weiterleitungsserver nutzbar: {list}.", "gnFwdOff": "Aus: Spiele gehen direkt zu Relic. Das Häkchen ist unter Erweiterungen.", "gnFwdNotNeeded": "Aus - nicht nötig, solange die Verbindung zu Relic in Ordnung ist.", "gnTcpInfo": "Das Spiel erreicht unsere Server nur über UDP. TCP dient zur Info: ein Abbruch bei ~33 KB heißt, die Leitung kappt lange Verbindungen.", "gnListLadder": "Serverliste des Ladders (signiert), UDP-Port {port}.", "gnListBuiltin": "Eingebaute Serverliste (der Ladder antwortete nicht), UDP-Port {port}.", "gnPoland": "Polen", "gnMoscow2": "Moskau 2",
    "gnLobby": "Unsere Automatch-Server (Lobby)", "gnLobbyConn": "Verbindung {n} ms", "gnLobbyNone": "keine Verbindung", "gnLobbyDns": "Name nicht gefunden", "gnLobbyStream": "Strom {b} Bytes in {s} s", "gnLobbyCut": "der Strom bricht ab (DPI?): {b} Bytes in {s} s", "gnLobbyNoAns": "Stromprüfung: keine Antwort", "gnLobbyNoStream": "Stromprüfung aus (StreamCheck=0)", "gnLobbyUsed": "wird benutzt", "gnLobbyPick": "Der Automatch des Spiels geht auf unseren Lobby-Server {host}.", "gnLobbyRelic": "Keiner unserer Lobby-Server ist nutzbar: das Spiel spricht direkt mit Relic (kein neuer Automatch, klassische Suche).", "gnLobbyOff": "Automatch aus: die Lobby des Spiels ist die von Relic. Das Häkchen ist unter Erweiterungen.", "gnLobbyHow": "Server der Reihe nach; benutzt wird der erste, der in 2,5 s antwortet und die Stromprüfung besteht (60000+ von 64 KB in 4 s).",
    "gnWhyClosed": "{n} von {m} Ports der Relic-Spielserver antworten nicht", "gnWhyStream": "der Strom zu Relic brach bei {kb} KB ab", "gnWhySlow": "Relic antwortet in {n} ms", "gnWhyBridge": "deine frühere Einstellung schickte jedes Spiel über unseren Server",
    "launcherUpdating": "Launcher wird aktualisiert… {p}",
    "launcherFail": "Launcher konnte nicht aktualisiert werden: {e}",
    "noNews": "Noch keine Neuigkeiten",
    "online": "Online",
    "onSearching": "Suchen ein Spiel",
    "onStateCreating": "Wird vorbereitet",
    "onStateLobby": "In der Lobby",
    "onStatePlaying": "Läuft", "lvWatch": "Zuschauen",
    "onNobody": "Niemand sucht ein Spiel. Starte das Spiel und drücke „Find a Game“.",
    "onOffline": "Keine Verbindung zum Ladder-Server, neuer Versuch…",
    "onLoading": "Lade, wer online ist…",
    "onLadder": "Ladder und Spielverlauf ›",
    "race_space_marines": "Space Marines",
    "race_chaos_marines": "Chaos",
    "race_eldar": "Eldar",
    "race_orks": "Orks",
    "race_tyranids": "Tyraniden",
    "race_imperial_guard": "Imperiale Armee",
    "race_t_tau": "Tau",
    "race_z_unecron": "Necrons",
    "race_ordo_malleus": "Ordo Malleus",
    "race_random": "Zufällige Rasse",
    "allAddons": "Alle ›",
    "onInMatchH": "Im Spiel"
  },
};

let S = null;          // last status from Rust
let lang = 'en';
// the system's language (WebView2 takes the Windows display language): the first of ours among the preferred ones, else en
const LANG_NAMES = { en: 'English', ru: 'Русский', es: 'Español', fr: 'Français', de: 'Deutsch' };
function sysLang() {
  for (const l of (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'])) {
    const c = String(l).slice(0, 2).toLowerCase(); if (LANG_NAMES[c]) return c;
  }
  return 'en';
}
let prog = null;       // last progress event

const t = (k, vars = {}) => (T[lang][k] || T.en[k] || k).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? '');
const L = x => x == null ? '' : typeof x === 'string' ? x : (x[lang] || x.en || Object.values(x)[0] || '');
const mb = b => b >= 1e9 ? (b / 1e9).toFixed(2) + ' GB' : (b / 1e6).toFixed(b < 1e7 ? 2 : 1) + ' MB';
const mbps = b => b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB/s' : Math.max(1, Math.round(b / 1e3)) + ' KB/s';
// a round avatar: the picture over the default figure, which shows while it loads, when it fails or when there is none
const NEWS_OPEN = new Set();   // news items the player unfolded (date|title), for this run only
// "Read all" only where there is more to read: a text cut at 4 lines, or more than 3 items in the list. Measured only
// while the news are on screen (siritos 02.11: the window is redrawn also on another tab - a hidden text measures 0 and
// every button went), and again whenever the list shows up or changes its size.
function newsFolds() {
  const box = $('news');
  if (!box || !box.offsetWidth) return;   // not on screen: keep what was measured, the observer comes back
  box.querySelectorAll('.news-item').forEach(el => {
    const x = el.querySelector('.x'), b = el.querySelector('.news-fold');
    b.classList.toggle('hidden', !(el.classList.contains('open') || b.dataset.more === '1' || (x && x.scrollHeight > x.clientHeight + 1)));
  });
}
try { new ResizeObserver(() => newsFolds()).observe(document.getElementById('news')); } catch (e) {}
if (document.fonts) document.fonts.ready.then(() => newsFolds());
// the footer links' icons, by where they lead: Discord, ModDB (the mod's news), our stats / ladder (a chart), else a link
function linkIcon(url) {
  const u = String(url || '').toLowerCase();
  const svg = (body, fill) => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${fill ? 'fill' : ''}">${body}</svg>`;
  if (u.includes('discord')) return svg('<path d="M19.6 5.3A17 17 0 0 0 15.4 4l-.5 1.1a15.7 15.7 0 0 0-5.8 0L8.6 4a17 17 0 0 0-4.2 1.3C1.7 9.3 1 13.2 1.3 17a17.2 17.2 0 0 0 5.2 2.6l1.1-1.8a11 11 0 0 1-1.7-.8l.4-.3a12.2 12.2 0 0 0 11.4 0l.4.3a11 11 0 0 1-1.7.8l1.1 1.8a17.2 17.2 0 0 0 5.2-2.6c.4-4.4-.6-8.3-3.1-11.7zM8.7 14.7c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z"/>', true);
  if (u.includes('moddb')) return svg('<path d="M4 5h13a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V5z"/><path d="M19 9h1a1 1 0 0 1 1 1v8a1 1 0 0 1-2 0"/><path d="M7 9h8M7 12h8M7 15h5"/>');
  if (/\/(stats|ladder)\b/.test(u)) return svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>');
  return svg('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>');
}

// ---------- the events, a slider above the news (siritos 02.11) ----------
// launcher.json "events": [{id, title, start, end?, place?, url?}] (title / place: a string or {en, ru, ...}; start / end:
// ISO time with its zone). Shown: what goes on now and what starts in the next 14 days, one card at a time, as high as
// the player's card; the arrows, the dots or a swipe go to the next. The date is the main thing; "in 25 min" / "on now"
// only in the last 2 hours before the start.
// Where they come from (siritos 02.11): launcher.json "events" when the owner sets them; else events.json of the
// launcher repository, edited in git (events_get: GitHub, jsDelivr, the last copy, the built-in one), every 15 minutes.
let EVENTS = [];
function eventsLoad() { invoke('events_get').then(d => { EVENTS = (d && Array.isArray(d.events)) ? d.events : []; renderEvents(); }).catch(() => {}); }
eventsLoad();
setInterval(eventsLoad, 15 * 60000);
const EV = { i: 0, n: 0 };
function renderEvents() {
  const box = $('evBox'); if (!box || !S) return;
  const real = Array.isArray((S.config || {}).events), now = Date.now(), soon = now + 14 * 86400000;
  const list = (real ? S.config.events : EVENTS).map(e => ({ ...e, s: Date.parse(e.start), e: Date.parse(e.end || e.start) || Date.parse(e.start) }))
    .filter(e => e.s && e.e >= now && e.s <= soon).sort((a, b) => a.s - b.s);
  box.classList.toggle('hidden', !list.length);
  if (!list.length) return;
  EV.n = list.length; EV.i = Math.min(EV.i, EV.n - 1);
  // siritos 02.11: the card must say what and when - the title large (two lines), the day, the time from - to, the place;
  // big buttons on the sides to go to the next one
  const mins = e => Math.max(1, Math.round((e.s - now) / 60000));
  const soonTag = e => e.s <= now ? `<span class="ev-tag now">${esc(t('evNow'))}</span>`
    : e.s - now < 2 * 3600000 ? `<span class="ev-tag">${esc(mins(e) < 60 ? t('evInM', { n: mins(e) }) : t('evInH', { n: Math.round(mins(e) / 60) }))}</span>` : '';
  const d = ms => new Date(ms), hm = ms => d(ms).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  // the points under the title: "info" - a list, or {ru: [...], en: [...]}; an older event's "place" as one point
  const info = e => { const i = e.info, arr = Array.isArray(i) ? i : (i && typeof i === 'object' ? (i[lang] || i.en || []) : []);
    return (arr.length ? arr : e.place ? [L(e.place)] : []).slice(0, 3); };
  const card = e => `<div class="ev-card"><div class="ev-date"><b>${d(e.s).getDate()}</b><span>${esc(d(e.s).toLocaleDateString(lang, { month: 'short' }).replace('.', ''))}</span><i>${esc(hm(e.s))}</i></div>`
    + `<div class="ev-body"><div class="ev-t"><span title="${esc(L(e.title))}">${esc(L(e.title))}</span>${soonTag(e)}`
    + (e.url ? `<button class="news-link ev-link" data-url="${esc(e.url)}" title="${esc(t('newsLink'))}" aria-label="${esc(t('newsLink'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></button>` : '') + '</div>'
    + (info(e).length ? `<ul class="ev-info">${info(e).map(x => `<li title="${esc(x)}">${esc(x)}</li>`).join('')}</ul>` : '') + '</div>'
    + '</div>';
  const side = dir => EV.n > 1 ? `<button class="ev-side" data-d="${dir}" aria-label="${dir < 0 ? '‹' : '›'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}"/></svg></button>` : '';
  box.innerHTML = `<div class="ev-head"><span class="ev-h">${esc(t('evTitle'))}</span>${EV.n > 1 ? `<span class="ev-count">${EV.i + 1} / ${EV.n}</span>` : ''}</div>`
    + `<div class="ev-stage">${side(-1)}<div class="ev-view"><div class="ev-track" style="transform:translateX(-${EV.i * 100}%)">${list.map(card).join('')}</div></div>${side(1)}</div>`;
  const go = i => { EV.i = (i + EV.n) % EV.n; renderEvents(); };
  box.querySelectorAll('.ev-side').forEach(b => b.onclick = () => go(EV.i + Number(b.dataset.d)));
  box.querySelectorAll('[data-url]').forEach(b => b.onclick = () => open(b.dataset.url));
  // a swipe (mouse or touch) to the side: the next / the previous
  const view = box.querySelector('.ev-view'); let x0 = null;
  view.onpointerdown = e => { x0 = e.clientX; };
  view.onpointerup = e => { if (x0 != null && Math.abs(e.clientX - x0) > 40 && EV.n > 1) go(EV.i + (e.clientX < x0 ? 1 : -1)); x0 = null; };
}
setInterval(renderEvents, 60000);   // "in 25 min" goes on counting
const avatar = (url, cls = '') => `<i class="av ${cls}"${url ? ` style="--av:url('${String(url).replace(/['"()\\\s<>&]/g, encodeURIComponent)}')"` : ''}></i>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const open = url => url && invoke('open_url', { url }).catch(e => toast(e, true));
// Windows long-path prefix from canonicalize() is noise for the player: \\?\G:\Steam → G:\Steam
const winPath = p => String(p || '').replace(/\\\\\?\\/g, '');
const day = d => {
  const x = new Date(String(d).slice(0, 10) + 'T12:00:00');
  return isNaN(x) ? d : x.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: x.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
};

function toast(msg, err) {
  const el = $('toast'); el.textContent = String(msg); el.className = 'toast' + (err ? ' err' : '');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.add('hidden'), 4500);
}

function channelOf(id) { return (S.config?.channels || []).find(c => c.id === id); }

function verOpen(on) {
  $('verList').classList.toggle('hidden', !on);
  $('verBtn').classList.toggle('on', on);
}

// the add-on name in front of the number goes ("lobbystats-0.10.1" -> 0.10.1; the ids got "_r2"/"_r3" on 30.10 and no longer matched)
const verNum = x => String(x || '').replace(/^[a-z_]+-(?=[0-9])/i, '');
// what the last check changed, per add-on (siritos 02.11: marked on the add-on itself, not one line for all): new / ver / opts
const COMP_CHG = {};
// the Add-ons tab: what the last check changed, next to the name (the versions are in the line under the description)
function compChips(c) {
  const k = COMP_CHG[c.id];
  return '<span class="addon-chips">'
    + (k ? `<span class="chip hot">${esc(t(k === 'new' ? 'chipNew' : k === 'ver' ? 'chipUpdated' : 'chipOpts'))}</span>` : '')
    + '</span>';
}
// "Version 0.7.0", plus the one the next update brings
function compVer(c) {
  const v = verNum;
  if (VAN()) return !c.vanilla_ok ? t('eliteOnlyNote') : c.vanilla_installed ? t('vanillaCopy', { v: v(c.vanilla_installed) }) : c.latest ? t('addonVer', { v: v(c.latest) }) : '';
  return c.installed ? t('addonVer', { v: v(c.installed) }) + (c.latest && c.latest !== c.installed ? ', ' + t('addonNext', { v: v(c.latest) }) : '')
    : c.latest ? t('addonVer', { v: v(c.latest) }) : '';
}

// an add-on's options: ticks, or a list when the option has choices; the options of one group in a block under its heading
function optsHtml(c, lock) {
  const one = o => {
    const data = `data-comp="${esc(c.id)}" data-opt="${esc(o.id)}" ${lock ? 'disabled' : ''}`;
    return (o.choices || []).length
      ? `<label class="addon-opt pick"><span>${esc(L(o.name) || o.id)}</span><select ${data}>`
        + o.choices.map(ch => `<option value="${esc(ch.value)}" ${ch.value === o.value ? 'selected' : ''}>${esc(L(ch.name) || ch.value)}</option>`).join('') + '</select></label>'
      : `<label class="addon-opt"><input type="checkbox" ${data} ${o.on ? 'checked' : ''}>${esc(L(o.name) || o.id)}</label>`;
  };
  const parts = [];
  c.options.forEach(o => { const g = L(o.group), last = parts[parts.length - 1]; last && last.g === g ? last.list.push(o) : parts.push({ g, list: [o] }); });
  return parts.map(p => p.g ? `<div class="addon-sub"><div class="addon-grp">${esc(p.g)}</div>${p.list.map(one).join('')}</div>` : p.list.map(one).join('')).join('');
}

// The groups of the Add-ons tab, in this order. 1.4.8 (siritos 04.11): each add-on names its group and its place in it in
// its own launcher.json entry - "category" and "order" (a number, smaller = higher; Dow2-patches addons.json / store-texts.json).
// COMP_GROUPS is only the fallback for an entry without them (the store before those fields: the forwarding servers jumped
// between groups there); ids without the "_r2"/"_r3" ends
const COMP_CATS = ['network', 'interface', 'gameplay', 'fixes', 'experiment'];
const COMP_GROUPS = {
  network: ['relay', 'relay_fwd', 'automatch', 'steamkeep', 'ownlobby'],
  interface: ['matchtimer', 'apm', 'cooldowns', 'lobbystats', 'loadingratings', 'joinsound', 'rusifikator'],
  gameplay: ['reverse', 'jumpretry', 'reinforcefix'],
  fixes: ['elitefix_wmic', 'obsfix', 'crashlog'],
  experiment: ['roomjoin', 'netprobe'],
};
const compBase = c => String(c.id).replace(/_(r\d+|off)$/, '');
// an entry with "order" is a new one: its category is trusted; an old entry (no "order") keeps the old category only for an
// id this list does not know
const compCat = c => (Number.isFinite(c.order) && COMP_CATS.includes(c.category) && c.category)
  || COMP_CATS.find(k => COMP_GROUPS[k].includes(compBase(c)))
  || (COMP_CATS.includes(c.category) ? c.category : 'experiment');
const compRank = c => {
  if (Number.isFinite(c.order)) return c.order;
  const i = COMP_GROUPS[compCat(c)].indexOf(compBase(c));
  return i < 0 ? 1e6 : (i + 1) * 10;
};
// the groups the player folded (only a convenience: without storage everything is open)
const COMP_SHUT = new Set();
try { JSON.parse(localStorage.getItem('compShut') || '[]').forEach(k => COMP_SHUT.add(k)); } catch (e) {}
// an add-on taken away from everyone (its version "...-off": the old AI, the developers' diagnostics) is not shown at all
const compShown = c => !/(^|-)off$/i.test(String(c.latest || ''));
// 1.4.11 (owner 05.11.2026): Play starts vanilla Retribution - the add-ons for Elite only are grey there, their switch locked
const VAN = () => !!(S && S.game_mode === 'vanilla');
const naHere = c => VAN() && !c.vanilla_ok;
// add-on rows: a switch each and its own options under it once it is on; the details behind "?" on the home screen,
// written out on the Add-ons tab (full)
function compList(box, list, full) {
  const lock = S.busy || S.game_running;   // the game holds the add-on files while it runs
  const nameHtml = c => { const n = L(c.name) || c.id, m = n.match(/^(.+?)\s*\(([^()]+)\)$/); return m ? `${esc(m[1])}<small>${esc(m[2])}</small>` : esc(n); };
  const card = c => `<div class="addon ${c.enabled && !naHere(c) ? '' : 'off'} ${naHere(c) ? 'na' : ''}"><div class="addon-row"><span class="addon-name" title="${esc(L(c.name) || c.id)}">${nameHtml(c)}</span>`
      + (full ? compChips(c) : '') + (naHere(c) ? `<span class="chip na" title="${esc(t('eliteOnlyNote'))}">${esc(t('eliteOnly'))}</span>` : '')
      + (c.enabled && (c.conflicts || []).length ? `<span class="addon-warn" title="${esc(t('conflictActive'))}">!</span>` : '')
      + (full ? '' : `<button class="qm ${$('pop').dataset.id === c.id ? 'on' : ''}" data-info="${esc(c.id)}" aria-label="${esc(t('addonInfo', { name: L(c.name) || c.id }))}">?</button>`)
      + `<label class="switch"><input type="checkbox" role="switch" data-id="${esc(c.id)}" aria-label="${esc(L(c.name) || c.id)}" ${c.enabled ? 'checked' : ''} ${lock || naHere(c) ? 'disabled' : ''}><i></i></label></div>`
      + (full ? (L(c.description) ? `<p class="addon-desc">${esc(L(c.description))}</p>` : '')
          + `<div class="addon-ver">${esc([compVer(c), t('addonLater')].filter(Boolean).join(' · '))}</div>`
          + (c.enabled && (c.conflicts || []).length ? `<div class="addon-note">${esc(t('conflictActive'))}</div>` : '') : '')
      // the Add-ons tab: no box around the options (siritos 02.11) - "Settings" and the list under it
      + (c.enabled && !naHere(c) && (c.options || []).length ? '<div class="addon-opts">' + (full ? `<div class="addon-opts-h">${esc(t('addonSettings'))}</div>` : '') + optsHtml(c, lock) + '</div>' : '')
      + '</div>';
  // the Add-ons tab in groups (siritos 02.11): launcher.json "category" when the owner sets it, else by the add-on id
  const groups = full ? COMP_CATS.map(k => ({ k, list: list.filter(c => compCat(c) === k).map((c, i) => [c, i]).sort((a, b) => compRank(a[0]) - compRank(b[0]) || a[1] - b[1]).map(x => x[0]) })).filter(g => g.list.length) : null;
  box.innerHTML = (S.game_running ? `<div class="addon-note">${esc(t('gameRunningAddons'))}</div>` : '')
    // a group folds on a click on its heading (kept for the next start); the heading says how many are on: "2 / 4"
    + (full ? groups.map(g => { const shut = COMP_SHUT.has(g.k), on = g.list.filter(c => c.enabled && !naHere(c)).length;
        return `<div class="addon-group ${shut ? 'shut' : ''}"><button class="addon-gh" data-cat="${g.k}" aria-expanded="${!shut}"><b class="chev"></b>${esc(t('cat_' + g.k))}<span>${on} / ${g.list.length}</span></button>`
          + (shut ? '' : `<div class="addon-cols">${g.list.map(card).join('')}</div>`) + '</div>'; }).join('')
      : list.map(card).join(''));
  box.querySelectorAll('.addon-gh[data-cat]').forEach(b => b.onclick = () => {
    COMP_SHUT.has(b.dataset.cat) ? COMP_SHUT.delete(b.dataset.cat) : COMP_SHUT.add(b.dataset.cat);
    try { localStorage.setItem('compShut', JSON.stringify([...COMP_SHUT])); } catch (e) {}
    render();
  });
  box.querySelectorAll('.qm').forEach(b => b.onclick = e => { e.stopPropagation(); popAddon(b, list.find(c => c.id === b.dataset.info)); });
  box.querySelectorAll('input[data-opt]').forEach(cb => cb.onchange = () =>
    invoke('set_comp_option', { comp: cb.dataset.comp, opt: cb.dataset.opt, on: cb.checked }).then(reload).catch(e => toast(e, true)));
  box.querySelectorAll('select[data-opt]').forEach(sel => sel.onchange = () =>
    invoke('set_comp_value', { comp: sel.dataset.comp, opt: sel.dataset.opt, value: sel.value }).then(reload).catch(e => toast(e, true)));
  box.querySelectorAll('input[data-id]').forEach(cb => cb.onchange = async () => {
    await invoke('set_component', { id: cb.dataset.id, on: cb.checked });
    if (S.installed_version || VAN()) { try { await invoke('start_update', { repair: false, componentsOnly: true }); S.busy = true; render(); } catch (e) { toast(e, true); } }
    else reload();
  });
}

// details of an add-on next to its "?": description, version, a hand-installed copy in the game folder
function popAddon(btn, c) {
  const pop = $('pop');
  if (!c || (pop.dataset.id === c.id && !pop.classList.contains('hidden'))) return popClose();
  pop.innerHTML = `<b>${esc(L(c.name) || c.id)}</b>` + (L(c.description) ? `<p>${esc(L(c.description))}</p>` : '')
    + `<div class="v">${esc([compVer(c), t('addonLater')].filter(Boolean).join(' · '))}</div>`
    + (c.enabled && (c.conflicts || []).length ? `<div class="w">${esc(t('conflictActive'))}</div>` : '');
  pop.dataset.id = c.id;
  pop.classList.remove('nick');
  pop.classList.remove('hidden');
  document.querySelectorAll('.qm.on').forEach(x => x.classList.remove('on'));
  btn.classList.add('on');
  // to the left of the add-on panel, level with the row, so it covers none of the switches
  const r = btn.getBoundingClientRect(), panel = btn.closest('.panel').getBoundingClientRect();
  pop.style.left = Math.max(8, panel.left - pop.offsetWidth - 8) + 'px';
  pop.style.top = Math.max(8, Math.min(window.innerHeight - pop.offsetHeight - 8, r.top - 12)) + 'px';
}
function popClose() {
  $('pop').classList.add('hidden');
  $('pop').dataset.id = '';
  document.querySelectorAll('.qm.on').forEach(x => x.classList.remove('on'));
}

// the player menu (Online, chat, rooms, own card): mention him in the chat (signed in, not me, the name known), his stats
// on our site (the page finds him by SteamID and opens his card) or his Steam profile. Only the SteamID is needed.
function nickMenu(btn, steam, name, noTag) {
  // no SteamID (a player in the rooms while the server sends none): the stats found by his name, no Steam profile
  const pop = $('pop'), q = steam || name, id = 'nick:' + q;
  if (!q || (pop.dataset.id === id && !pop.classList.contains('hidden'))) return popClose();
  const host = LIVE.host || 'https://dow2.fintebtc.de';
  const urls = [host + '/stats/?q=' + encodeURIComponent(q) + '&lang=' + encodeURIComponent(lang), steam ? 'https://steamcommunity.com/profiles/' + steam : ''];
  // noTag: a player who is not in our chat (the rooms: Relic's players) - no "mention"
  const tag = !noTag && name && CH.me && CH.me.signed_in && String(CH.me.steam) !== String(steam);
  pop.innerHTML = '<div class="nick-menu">' + (tag ? `<button data-tag="1">${esc(t('onTag'))}</button>` : '')
    + `<button data-u="0">${esc(t('nickStats'))}</button>` + (steam ? `<button data-u="1">${esc(t('nickSteam'))}</button>` : '') + '</div>';
  pop.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { popClose(); open(urls[b.dataset.u]); });
  pop.querySelectorAll('[data-tag]').forEach(b => b.onclick = () => { popClose(); chMention(name); });
  pop.dataset.id = id;
  pop.classList.add('nick');
  pop.classList.remove('hidden');
  // under the name, kept inside the window
  const r = btn.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(window.innerWidth - pop.offsetWidth - 8, r.left)) + 'px';
  pop.style.top = (r.bottom + 4 + pop.offsetHeight > window.innerHeight - 8 ? r.top - pop.offsetHeight - 4 : r.bottom + 4) + 'px';
}
// a player's name or avatar: the menu on a click and on a right click; mention = a name in the chat, where a click
// mentions him (the owner's 1.3.6 / 1.3.12) and only the right click opens the menu
function nickBind(el, steam, name, mention, noTag) {
  if (!el) return;
  const menu = e => { e.preventDefault(); e.stopPropagation(); nickMenu(el, steam, name, noTag); };
  if (steam || name) { el.oncontextmenu = menu; el.style.cursor = 'pointer'; }
  if (mention && name) el.onclick = e => { e.stopPropagation(); popClose(); chMention(name); };
  else if (steam || name) el.onclick = menu;
}

// launcher self-update, offered and never forced. LU: a newer launcher this copy can install itself (launcher_check);
// without it the launcher_update of launcher.json links to the download page, as before.
let LU = null;
function renderLauncherBanner() {
  const lu = S.launcher_update, v = LU ? LU.version : lu?.version, b = $('launcherBanner');
  if (S.in_game_dir) {                      // the launcher sits in the game folder: say so first, it breaks the game
    b.classList.remove('hidden'); b.classList.remove('link'); $('launcherBtn').classList.add('hidden');
    $('launcherText').textContent = t('inGameDir'); b.onclick = null; return;
  }
  b.classList.toggle('hidden', !v);
  if (!v) return;
  // launcher.json already names a newer launcher and the updater has not found it yet (the mirrors copy a release a
  // little later): ask again every minute, not every 15, so Update comes without a restart (owner 03.11.2026)
  if (lu && (!LU || versionNewer(lu.version, LU.version))) launcherRetrySoon();
  b.classList.toggle('link', !LU);
  $('launcherBtn').classList.toggle('hidden', !LU || !!LU.installing);
  if (LU) {
    $('launcherText').textContent = LU.installing ? t('launcherUpdating', { p: LU.pct || '' }) : t('launcherNew', { v });
    $('launcherBtn').textContent = t('launcherUpdateBtn');
    $('launcherBtn').disabled = !!S.busy || !!S.game_running;
    $('launcherBtn').onclick = launcherInstall;
    b.onclick = null;
  } else {
    $('launcherText').textContent = L(lu.text) || t('launcherUpdate', { v });
    b.onclick = () => open(lu.url);
  }
}
// 1.4.2 (owner 03.11.2026): Relic's game servers checked at start (relic_probe); players with a bad way to them are OFFERED our
// forwarding servers (add-on relay_fwd, off by default) - never turned on for them. "Not now" hides the offer for this month.
let FWD = null;
function renderFwdBanner() {
  const b = $('fwdBanner'); if (!b) return;
  const c = (S?.components || []).find(x => x.id === 'relay_fwd');
  const key = 'fwdoffer:' + new Date().toISOString().slice(0, 7);
  const show = FWD && FWD.problem && c && !c.enabled && !(S.dismissed || []).includes(key) && !S.in_game_dir;
  b.classList.toggle('hidden', !show);
  if (!show) return;
  $('fwdText').textContent = t('fwdOffer', { why: relicWhy(FWD) }); b.title = $('fwdText').textContent;
  $('fwdBtn').textContent = t('fwdOn'); $('fwdLater').textContent = t('fwdLater');
  $('fwdBtn').disabled = !!S.busy || !!S.game_running;
  $('fwdBtn').onclick = fwdTurnOn;
  $('fwdLater').onclick = async () => { try { await invoke('set_setting', { key: 'dismiss', value: key }); } catch (e) {} FWD = null; reload(); };
}
// the reason in the player's language, from the check's fields (its "why" is the English line of the log)
function relicWhy(r) {
  if (!r) return '';
  if (r.closed > 0) return t('gnWhyClosed', { n: r.closed, m: (r.relays || r.relays_ms || []).length || 3 });
  if (r.stream_ok === false) return t('gnWhyStream', { kb: r.stream_kb || 0 });
  if (r.median_ms > 200) return t('gnWhySlow', { n: r.median_ms });
  if (r.old_bridge) return t('gnWhyBridge');
  return r.why || '';
}
async function fwdTurnOn() {
  try {
    await invoke('set_component', { id: 'relay_fwd', on: true });
    if (S.installed_version) { await invoke('start_update', { repair: false, componentsOnly: true }); S.busy = true; }
    toast(t('fwdDone')); FWD = null; reload();
  } catch (e) { toast(e, true); }
}
var FWD_LAST = null;   // the last Relic check that ran (the banner's FWD is cleared once the player answers it)
async function relicProbe() {
  try { FWD = await invoke('relic_probe'); } catch (e) { FWD = null; }
  if (FWD && !FWD.skipped) FWD_LAST = FWD;
  if (S) { renderFwdBanner(); renderGameNet(); }
}
let luRetry = null, luTries = 0;
function launcherRetrySoon() {
  if (luRetry || luTries >= 60) return;          // an hour at most (a portable copy never finds one: no self-update)
  luRetry = setTimeout(() => { luRetry = null; luTries++; launcherCheck(); }, luTries ? 60000 : 0);   // the first one at once
}
// "1.4.10" > "1.4.9"
function versionNewer(a, b) {
  const x = String(a || '').split('.').map(n => parseInt(n, 10) || 0), y = String(b || '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
  return false;
}
async function launcherCheck() {
  try { const r = await invoke('launcher_check'); if (r && !LU?.installing) LU = r; } catch (e) { /* offline: try again later */ }
  if (S) renderLauncherBanner();
}
async function launcherInstall() {
  LU.installing = true; LU.pct = ''; renderLauncherBanner();
  try { await invoke('launcher_install'); }   // the launcher restarts into the new version
  catch (e) { LU.installing = false; renderLauncherBanner(); toast(t('launcherFail', { e }), true); }
}

let trayLang = '';
function syncTrayLabels() {
  if (trayLang === lang) return;
  trayLang = lang;
  invoke('set_tray_labels', { open: t('trayOpen'), quit: t('trayQuit') }).catch(() => {});
}

function render() {
  // the player's pick in Settings; none - the system's language (siritos 02.11), English when we have no translation
  lang = S.lang || sysLang();
  if (!T[lang]) lang = 'en';
  document.documentElement.lang = lang;
  syncTrayLabels();
  document.querySelectorAll('[data-t]').forEach(e => e.textContent = t(e.dataset.t));
  renderFwdBanner();
  document.querySelectorAll('[data-tp]').forEach(e => e.placeholder = t(e.dataset.tp));
  document.querySelectorAll('[data-ta]').forEach(e => { e.title = t(e.dataset.ta); e.setAttribute('aria-label', e.title); });   // icon buttons
  const cfg = S.config || {};

  renderLauncherBanner();

  // announcements
  const today = new Date().toISOString().slice(0, 10);
  $('announcements').innerHTML = (cfg.announcements || [])
    .filter(a => !(S.dismissed || []).includes(a.id) && (!a.until || a.until >= today))
    .map(a => `<div class="ann ${esc(a.style)}" data-url="${esc(a.url)}"><span class="tx">${esc(L(a.text))}</span>${a.id ? `<span class="cl" data-id="${esc(a.id)}">✕</span>` : ''}</div>`).join('');
  $('announcements').querySelectorAll('.ann').forEach(el => el.onclick = e => {
    if (e.target.dataset.id) { invoke('set_setting', { key: 'dismiss', value: e.target.dataset.id }).then(reload); return; }
    open(el.dataset.url);
  });

  // news: the team's posts from launcher.json and the release notes of the launcher and the patches, newest first
  // 02.11 (siritos): newest first also within one day (by the version in the title: 1.3.16 above 1.3.15); a release is
  // left out when the team wrote its own post about that version (in the player's language); a release has no link
  // (its GitHub page is not news for a player) and its title says "Launcher 1.3.16" / "Add-ons 0.1.6" in his language
  const verOf = s => (String(s || '').match(/(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  const cmpVer = (a, b) => { for (let i = 0; i < 3; i++) { const d = (b[i] || 0) - (a[i] || 0); if (d) return d; } return 0; };
  // a link only when it leads somewhere about the post: the site's front page (".../elite/", what the launcher version
  // posts carry) is no link at all
  const posts = (cfg.news || []).map(n => ({ date: n.date || '', title: L(n.title), text: L(n.text), url: /^https?:\/\//.test(n.url || '') && !/^https?:\/\/[^/]+\/elite\/?$/.test(n.url) ? n.url : '' }));
  const told = new Set(posts.map(p => verOf(p.title).join('.')).filter(Boolean));
  const rel = (S.release_news || []).filter(n => !(n.kind !== 'patches' && told.has(verOf(n.version || n.title).join('.'))))
    .map(n => ({ date: n.date, ts: n.ts, title: n.version ? t(n.kind === 'patches' ? 'newsRelPatches' : 'newsRelLauncher', { v: n.version }) : n.title, items: (lang === 'ru' && (n.items_ru || []).length ? n.items_ru : n.items) || [] }));
  const news = posts.concat(rel)
    .sort((x, y) => String(y.date).localeCompare(String(x.date)) || cmpVer(verOf(x.title), verOf(y.title)) || String(y.ts || '').localeCompare(String(x.ts || '')))
    .slice(0, 12);
  // a news item is plain text (siritos 02.11: the whole item as a link led nowhere and cut the text): the link, when
  // there is one, is an icon next to the title; a long text or list folds open and shut under "Read all / Collapse"
  const nkey = n => n.date + '|' + n.title;
  $('news').innerHTML = news.map(n => {
    const isOpen = NEWS_OPEN.has(nkey(n)), items = n.items || [];
    return `<div class="news-item ${isOpen ? 'open' : ''}" data-k="${esc(nkey(n))}"><div class="nt"><div class="t">${esc(n.title)}</div>`
      + (n.url ? `<button class="news-link" data-url="${esc(n.url)}" title="${esc(t('newsLink'))}" aria-label="${esc(t('newsLink'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></button>` : '')
      + '</div>' + (n.date ? `<div class="d">${esc(day(n.date))}</div>` : '')
      + (n.text ? `<div class="x">${esc(n.text)}</div>` : '')
      + (items.length ? `<ul>${(isOpen ? items : items.slice(0, 3)).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '')
      + `<button class="news-fold hidden" data-more="${items.length > 3 ? 1 : 0}">${esc(t(isOpen ? 'newsLess' : 'newsAll'))}</button></div>`;
  }).join('') || `<div class="news-empty">${esc(S.config_loaded ? t('noNews') : t('connecting'))}</div>`;
  $('news').querySelectorAll('.news-link').forEach(b => b.onclick = () => open(b.dataset.url));
  $('news').querySelectorAll('.news-item').forEach(el => {
    el.querySelector('.news-fold').onclick = () => { const k = el.dataset.k; NEWS_OPEN.has(k) ? NEWS_OPEN.delete(k) : NEWS_OPEN.add(k); render(); };
  });
  newsFolds();
  renderEvents();

  // links (siritos 02.11): no block of their own and no "All news on ModDB" under the news - icons in the footer, where
  // "Elite 3.2 is ready" and the game folder used to stand (the version is on the version button anyway)
  const links = cfg.links || [];
  $('footLinks').innerHTML = links.map((l, i) => `<button class="foot-link" data-i="${i}" title="${esc(l.url || '')}">${linkIcon(l.url)}<span>${esc(L(l.title))}</span></button>`).join('');
  $('footLinks').querySelectorAll('button').forEach(b => b.onclick = () => open(links[+b.dataset.i].url));

  // game / steam missing → guide the player
  const setup = $('setup');
  if (!S.game_found) {
    const g = cfg.game || {};
    setup.innerHTML = `<h2>${esc(t('noGame'))}</h2><p>${esc(L(g.requirements) || t('noGameText'))}</p><div class="row">
      ${S.steam_found ? '' : `<button class="btn red" id="getSteam">${esc(t('getSteam'))}</button>`}
      <button class="btn gold" id="getGame">${esc(t('getGame'))}</button>
      <button class="btn" id="pick">${esc(t('browse'))}</button><button class="btn" id="rescan">${esc(t('rescan'))}</button></div>`;
    setup.classList.remove('hidden');
    $('getGame').onclick = () => open(g.store_url || 'steam://store/56400');
    if ($('getSteam')) $('getSteam').onclick = () => open('https://store.steampowered.com/about/');
    $('pick').onclick = pickDir; $('rescan').onclick = reload;
  } else setup.classList.add('hidden');

  // versions: a picker next to Play at the bottom; the main one marked, the installed one ticked, any other one switches in one click
  const chans = cfg.channels || [];
  const activeCh = chans.find(c => c.version === S.installed_version && c.id === S.installed_channel) || chans.find(c => c.version === S.installed_version);
  const mainCh = chans.find(c => c.id === S.main_channel);
  const locked = S.busy || S.game_running || !S.game_found || !S.config_loaded;
  // 1.4.11: in vanilla no Elite version is the one Play starts: the installed one is a click back to Elite (no download)
  const item = c => {
    const isActive = !VAN() && activeCh && c.id === activeCh.id, isMain = c.id === S.main_channel;
    const cost = (S.costs || {})[c.version];
    const hint = isActive ? '✓' : (activeCh && c.id === activeCh.id) ? t('installedTag') : cost === undefined ? t('needDl') : cost === 0 ? t('instant') : t('upTo', { s: mb(cost) });
    const tags = (isMain ? `<span class="tag main">${esc(t('main'))}</span>` : '') + (L(c.badge) && !isMain ? `<span class="tag beta">${esc(L(c.badge))}</span>` : '');
    const note = isMain ? t('mainNote') : L(c.description);
    return `<button class="vi ${isActive ? 'act' : ''}" data-id="${esc(c.id)}" ${isActive || locked ? 'disabled' : ''}><span class="nm"><b>${esc(L(c.name) || c.id)}</b>${tags}`
      + `${note ? `<small>${esc(note)}</small>` : ''}</span><span class="cost ${isActive || cost === 0 ? 'ok' : ''}"${isActive ? ` title="${esc(t('installedTag'))}"` : ''}>${esc(hint)}</span></button>`;
  };
  const live = chans.filter(c => !c.archive), arch = chans.filter(c => c.archive);
  const vanName = L(S.vanilla?.name) || t('vanillaName');
  const vanItem = S.vanilla_offered ? `<div class="lh">${esc(t('vanillaH'))}</div><button class="vi ${VAN() ? 'act' : ''}" data-game="vanilla" ${VAN() || S.busy || S.game_running || !S.game_found ? 'disabled' : ''}>`
    + `<span class="nm"><b>${esc(vanName)}</b><small>${esc(L(S.vanilla?.description) || t('vanillaNote'))}</small></span><span class="cost ok">${VAN() ? '✓' : ''}</span></button>` : '';
  $('verList').innerHTML = `<div class="lh">${esc(t('versions'))}</div>` + live.map(item).join('')
    + (arch.length ? `<div class="lh">${esc(t('archiveH'))}</div>` + arch.map(item).join('') : '') + vanItem;
  $('verList').querySelectorAll('.vi:not(:disabled)').forEach(b => b.onclick = () => {
    verOpen(false);
    if (b.dataset.game === 'vanilla') return setGame('vanilla');
    if (VAN() && activeCh && b.dataset.id === activeCh.id) return setGame('elite');   // back to the installed Elite
    switchTo(b.dataset.id);
  });
  const shown = activeCh || (!S.installed_version && mainCh);
  if (VAN()) $('verBtn').innerHTML = `<b title="${esc(t('vanillaTag'))}">${esc(vanName)}</b>`;
  else $('verBtn').innerHTML = shown
    ? `<b>${esc(L(shown.name) || shown.id)}</b><small class="${activeCh ? 'ok' : ''}">${esc(activeCh ? '✓ ' + t('installedTag') : t('notInstalledShort'))}</small>`
    // the installed version is in no channel any more (the main one moved on): "3.2" → "Elite 3.2"
    : `<b>${esc(/^\d/.test(S.installed_version) ? 'Elite ' + S.installed_version : S.installed_version || '—')}</b>${S.installed_version ? `<small class="ok">✓ ${esc(t('installedTag'))}</small>` : ''}`;
  $('verBtn').disabled = !chans.length && !S.vanilla_offered;
  if (!chans.length && !S.vanilla_offered) verOpen(false);
  const notMain = !VAN() && activeCh && mainCh && activeCh.id !== mainCh.id;
  $('verWarn').classList.toggle('hidden', !notMain && !VAN());
  if (VAN()) $('verWarn').textContent = t('vanillaWarn');
  else if (notMain) $('verWarn').textContent = t('youPlay', { name: L(activeCh.name) }) + ' ' + t('notMain', { name: L(mainCh.name) });

  // add-ons: only the game server on the home screen (or what launcher.json marks "home"), all of them on the Add-ons tab
  const comps = (S.components || []).filter(compShown);
  const pinned = comps.some(c => c.home) ? comps.filter(c => c.home)
    : comps.filter(c => c.id === 'relay');   // until launcher.json marks them
  $('compBox').classList.toggle('hidden', !pinned.length);
  compList($('components'), pinned, false);
  compList($('allCompList'), comps, true);

  // Play
  const play = $('play');
  play.classList.remove('install');
  $('cancel').classList.toggle('hidden', !S.busy);
  if (S.busy) { play.textContent = t('updating'); play.classList.add('install'); play.disabled = true; }
  else if (S.game_running) { play.textContent = t('running'); play.disabled = true; }
  else if (!S.game_found) { play.textContent = t('play'); play.disabled = true; }
  else if (!S.installed_version && !VAN()) { play.textContent = t('install'); play.classList.add('install'); play.disabled = !S.config_loaded; }
  else { play.textContent = t('play'); play.disabled = false; }
  play.onclick = () => (S.installed_version || VAN() ? doPlay() : switchTo(S.main_channel || S.channel));

  // a newer version of the installed one: offered at the bottom of the home screen's right column, never forced
  const target = channelOf(S.installed_channel) || channelOf(S.channel);
  const showUpd = !!(S.game_found && target && S.installed_version && target.version !== S.installed_version && !S.busy && !S.game_running && !S.last_error);
  $('updBox').classList.toggle('hidden', !showUpd);
  if (showUpd) {
    const cost = (S.costs || {})[target.version];
    $('updText').innerHTML = `<b>${esc((L(cfg.update_text) || t('switchTo', { name: '{name}' })).replace('{name}', L(target.name)).replace('{version}', target.version))}</b>`
      + (cost ? `<small>${esc(t('upTo', { s: mb(cost) }))}</small>` : '');
    $('updateBtn').textContent = t('updateNow');
    $('updateBtn').onclick = () => switchTo(target.id);
  }

  // status line
  if (!S.busy && !LU?.installing) {
    $('bar').classList.add('hidden');
    $('statusText').classList.toggle('err', !!(S.last_error && S.config_loaded));
    $('statusText').innerHTML = S.last_error && !S.config_loaded ? esc(t('offline'))
      : S.last_error ? esc(winPath(S.last_error))
      : VAN() ? esc(t('readyVanilla'))
      : S.installed_version ? esc(t('ready', { v: activeCh ? L(activeCh.name).replace(/^Elite\s+/i, '') : S.installed_version })) : (S.config_loaded ? '' : esc(t('connecting')));
    const hint = VAN() ? '' : L(cfg.launch?.[S.os]?.hint);   // the launch hint is about starting Elite
    $('statusMeta').textContent = [hint, winPath(S.game_dir)].filter(Boolean).join(' · ');
    // all is well (ready, no launch hint): the line steps aside for the links (siritos 02.11: "Elite 3.2 is ready" and the
    // game folder are not news); any download, check or error writes the line again and it comes back (CSS :has)
    if (!S.last_error && (S.installed_version || VAN()) && !hint) { $('statusText').innerHTML = ''; $('statusMeta').textContent = ''; }
  }

  // settings
  $('gameDir').textContent = winPath(S.game_dir) || '—';
  $('lang').value = S.lang || '';
  $('lang').options[0].textContent = t('langDefault', { name: LANG_NAMES[sysLang()] });   // "Default (English)": what the system gives
  $('cache').value = String(S.cache_mb);
  $('usage').checked = S.usage_stats !== false;
  $('lanShare').checked = S.lan_share !== false;
  $('muteMention').checked = !!S.mute_mention; $('closeQuits').checked = !!S.close_quits;
  $('mirror').value = S.extra_mirror || '';
  $('mirrorInfo').textContent = t('mirrors', { n: S.mirror_count });
  renderNet();
  renderGameNet();
  $('repair').disabled = S.busy || S.game_running || !S.installed_version;
  $('junk').disabled = S.busy || S.game_running || !S.installed_version;
  $('about').textContent = `Elite Launcher ${S.launcher_version} · ${S.os}`;
  $('hdrVer').textContent = S.launcher_version ? 'v' + S.launcher_version : '';
  onRender();
}

function renderProgress(p) {
  $('bar').classList.remove('hidden');
  const pct = p.bytes_total ? Math.min(100, Math.round(100 * p.bytes_done / p.bytes_total)) : 0;
  $('barFill').style.width = pct + '%';
  let spd = '';
  if (p.phase !== 'checking') {
    const now = performance.now();
    if (dlPrev && p.downloaded >= dlPrev.b) {
      const dt = (now - dlPrev.t) / 1000;
      if (dt >= 0.25) { const bps = (p.downloaded - dlPrev.b) / dt; speedEMA = speedEMA ? speedEMA * 0.65 + bps * 0.35 : bps; dlPrev = { b: p.downloaded, t: now }; }
    } else { dlPrev = { b: p.downloaded, t: now }; }
    if (speedEMA > 0) spd = ` · ${mbps(speedEMA)}`;
  }
  $('statusText').classList.remove('err');
  $('statusText').innerHTML = (p.phase === 'checking' ? esc(t('checking', { p: pct })) : esc(t('downloading', { file: p.file.split('/').pop() })) + ` <b>${pct}%</b>`) + spd;
  $('statusMeta').textContent = t('meta', { dl: mb(p.downloaded), re: mb(p.reused), fc: mb(p.from_cache), m: p.mirror });
}

async function reload() { S = await invoke('get_status'); render(); }
// 1.3.13 (owner): "check add-ons for updates" - what the fresh launcher.json changed is told, also after the automatic checks
const compSnap = cfg => Object.fromEntries(((cfg && cfg.components) || []).map(c => [c.id, { v: c.version, n: L(c.name) || c.id,
  o: ((c.settings && c.settings.length ? c.settings : c.options) || []).map(o => o.id + ':' + (o.choices || []).map(x => x.value).join('/')).join(',') }]));
// -> [{id, k: new | ver | opts | gone, text}]
function compDiff(a, b) {
  const out = [];
  for (const id in b) {
    if (!a[id]) out.push({ id, k: 'new', text: t('addonNew', { name: b[id].n }) });
    else if (a[id].v !== b[id].v) out.push({ id, k: 'ver', text: t('addonChgVer', { name: b[id].n, from: verNum(a[id].v), to: verNum(b[id].v) }) });
    else if (a[id].o !== b[id].o) out.push({ id, k: 'opts', text: t('addonOpts', { name: b[id].n }) });
  }
  for (const id in a) if (!b[id]) out.push({ id, k: 'gone', text: t('addonGone', { name: a[id].n }) });
  return out;
}
async function refresh() {
  const before = S && S.config ? compSnap(S.config) : null;
  try { S = await invoke('refresh'); } catch (e) { toast(e, true); return null; }
  const changes = before && S.config ? compDiff(before, compSnap(S.config)) : [];
  changes.forEach(c => { if (c.k !== 'gone') COMP_CHG[c.id] = c.k; });   // the marks on the add-ons stay until the launcher closes
  render();
  if (changes.length) {
    // the count here and in a toast, what changed is marked on each add-on (a removed one is named: it is not in the list)
    const gone = changes.filter(c => c.k === 'gone').map(c => c.text);
    const msg = t('addonChangedN', { n: changes.length }) + (gone.length ? ' · ' + gone.join('; ') : '');
    const note = $('addonCheckNote'); if (note) note.textContent = msg;
    toast(msg);
  }
  // add-ons follow their checkboxes on their own: install missing ones, remove unticked ones
  const comps = S.components || [];
  if ((S.installed_version || VAN()) && !S.busy && !S.game_running && compsNeedSync()) {
    try { await invoke('start_update', { repair: false, componentsOnly: true }); S.busy = true; render(); } catch (e) { /* will retry next refresh */ }
  }
  return changes;
}
async function pickDir() { try { S = await invoke('pick_game_dir'); render(); } catch (e) { toast(e, true); } }

async function switchTo(id) {
  const c = channelOf(id);
  try { await invoke('switch_to', { id }); S.busy = true; render(); if (c) $('statusText').textContent = t('switching', { name: L(c.name) }); }
  catch (e) { toast(e, true); }
}

async function startUpdate(repair) {
  try { await invoke('start_update', { repair }); S.busy = true; render(); }
  catch (e) { toast(e, true); }
}

// the add-ons differ from what the launcher wants: one that is on is missing or older than the catalog's, one that is off
// is still installed, or an old hand-installed copy of ours is in the game folder (the sync puts it aside - owner
// 03.11.2026: one copy of every patch, the launcher's latest, nothing asked)
// 1.4.11: mode_sync - the game folder is not yet as the chosen game wants it (vanilla: its loader and copies; Elite: the
// vanilla loader still next to DOW2.exe); in vanilla the Elite installs of the add-ons are not looked at
const compsNeedSync = () => (S.old_copies || []).length > 0 || !!S.mode_sync || (!VAN() && (S.components || []).some(c => {
  if ((c.conflicts || []).length) return true;
  return !!c.enabled !== !!c.installed || (c.enabled && c.latest && c.installed && c.installed !== c.latest);
}));
// pick the game Play starts and bring the add-ons for it right away (vanilla: the copies and the loader; Elite: Automatch's
// early loader back) - the same bar as an update; the game is not started
async function setGame(mode) {
  try { S = await invoke('set_game_mode', { mode }); render(); } catch (e) { toast(e, true); return; }
  if (compsNeedSync() && (S.installed_version || VAN())) {
    try { await invoke('start_update', { repair: false, componentsOnly: true }); S.busy = true; render(); if (VAN()) $('statusText').textContent = t('toVanilla'); }
    catch (e) { toast(e, true); }
  }
}
let playAfterSync = false;
// 1.4.2 (owner 03.11.2026): Play with the add-ons out of sync runs the same process as an update - the bar, Play waits -
// and the game starts by itself when it is done; the launcher also clears the leftovers of our DLLs before the start
async function doPlay(synced) {
  try { await reload(); } catch (e) { /* the last status then */ }   // what is in the game folder now, not when the window last looked
  if (!synced && (S.installed_version || VAN()) && !S.busy && compsNeedSync()) {
    try { await invoke('start_update', { repair: false, componentsOnly: true }); S.busy = true; playAfterSync = true; render(); toast(t('playAfterSync')); return; }
    catch (e) { /* not now: start with what is there */ }
  }
  try {
    const g = await invoke('play') || {};
    // the check before the start (launch_guard): what was taken out of the game's list, a stray stand-alone loader
    const said = [(g.off || []).length ? t('guardOff', { list: g.off.join(', ') }) : '', g.loader ? t('guardLoader') : '',
      g.vanilla_loader_missing ? t('guardVanillaLoader') : ''].filter(Boolean);
    toast(said.length ? t('starting') + ' ' + said.join(' ') : t('starting'), !!(g.loader || g.vanilla_loader_missing));
  } catch (e) { toast(e, true); }
}

let netActive = false;
let dlPrev = null, speedEMA = 0;
listen('net', e => {
  const a = String(e.payload).split('\t');
  if (a[0] === 'start') { netActive = true; dlPrev = null; speedEMA = 0; if (S) S.busy = true; $('bar').classList.add('hidden'); $('statusText').textContent = t('netChecking'); $('statusMeta').textContent = ''; }
  else if (a[0] === 'try') { if (netActive) $('statusText').textContent = t('netTry', { host: a[1], k: a[2], n: a[3] }); }
  else if (a[0] === 'fail') { $('statusText').textContent = t('netFail', { host: a[1] }); }
});
listen('launcher_progress', e => {
  if (!LU) return;
  const { done, total } = e.payload;
  const pct = total ? Math.min(100, Math.round(100 * done / total)) : 0;
  LU.pct = total ? pct + '%' : mb(done);
  renderLauncherBanner();
  // the same bar at the bottom as for Elite and add-on updates
  $('bar').classList.remove('hidden');
  $('barFill').style.width = pct + '%';
  $('statusText').classList.remove('err');
  $('statusText').innerHTML = esc(t('launcherUpdating', { p: '' })) + ` <b>${esc(LU.pct)}</b>`;
  $('statusMeta').textContent = total ? `${mb(done)} / ${mb(total)}` : mb(done);
});
listen('news', () => { if (S) reload(); });
listen('game_running', e => { if (!S) return; S.game_running = e.payload; render(); if (!e.payload) refresh();
  if (!e.payload && RJ.after) { const a = RJ.after; RJ.after = null; setTimeout(() => roomJoin(a.id, a.name, null, false, a.want), 1500); }   /* 1.4.11: the other game closed */ chHello(); if (!e.payload && FWD && FWD.skipped) setTimeout(relicProbe, 20000); });   // 1.4.5: the Relic check of the start waited for the game   // menu / game goes to the server when it changes, not on a timer
listen('progress', e => { netActive = false; prog = e.payload; if (S) { S.busy = true; renderProgress(prog); } });
listen('update_done', async e => {
  await reload();
  const r = e.payload;
  if (r.ok) {
    toast(r.summary.updated ? t('done', { n: r.summary.updated, dl: mb(r.summary.downloaded) }) : t('upToDate'));
    if (r.summary.updated) {
      $('bar').classList.add('hidden');
      $('statusText').innerHTML = `<b>${esc(t('doneLine'))}</b>`;
      $('statusMeta').textContent = t('metaDone', { dl: mb(r.summary.downloaded), re: mb(r.summary.reused), fc: mb(r.summary.from_cache) });
    }
  } else toast(r.cancelled ? t('cancelled') : r.error, !r.cancelled);
  // Play brought the add-ons first: now the game (also when that failed - the game can always be started; not after Cancel)
  if (playAfterSync) { playAfterSync = false; if (!r.cancelled && S && !S.busy && !S.game_running) doPlay(true); }
});

document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('hidden', v.id !== b.dataset.view));
});
$('allComps').onclick = () => document.querySelector('.tab[data-view="addons"]').click();

// 1.3.15 (owner 02.11.2026): the Lobbies tab - open custom games from Relic's list through our ladder server, every 15 s while shown
const RM = { timer: 0, host: '' };
const roomFlag = c => /^[a-z]{2}$/i.test(c || '') ? String.fromCodePoint(...[...c.toUpperCase()].map(x => 0x1F1A5 + x.charCodeAt(0))) : '';
// RoomJoin (experiment 03.11.2026): "Join" on an Elite room without a password while the add-on is on - the game starts (or is
// already running) and RoomJoin.dll walks into the room from the main menu; if it can't, the game shows the public games list
// 1.4.11 (owner 05.11.2026): vanilla lobbies too - from the launcher's vanilla game, with RoomJoin's copy for vanilla
const rjComp = () => (S && S.components || []).find(c => String(c.id).replace(/_(r\d+|off)$/, '') === 'roomjoin');
const roomJoinOn = game => {
  if (!S || (S.os !== 'windows' && S.os !== 'linux')) return false;
  const c = rjComp();
  if (game === 'vanilla') return !!(S.vanilla_offered && c && c.enabled && c.vanilla_ok);
  return !!(S.roomjoin_dll || (c && c.enabled));
};
const roomGame = r => r && r.game === 'vanilla' ? 'vanilla' : 'elite';
// 1.4.8 (review of RoomJoin 1, 03.11): no Join while I search or play (a Join then could break the match the automatch walks
// the menus to; RoomJoin 8 drops such a request too) - from the Online block's live lists, when signed in
const meBusy = () => {
  const me = CH.me && CH.me.signed_in ? String(CH.me.steam || '') : '';
  if (!me) return false;
  return LIVE.searching.some(p => String(p.steam) === me)
    || LIVE.ingame.some(m => [...(m.team1 || []), ...(m.team2 || [])].some(p => String(p.steam) === me) || (m.watchers || []).map(String).includes(me));
};
// the room's version (the ladder's exact type: the game's own mod name and version from Relic) against the installed Elite;
// "3.2" = "3.2.0"; an installed build that is not a plain number (a test channel) is not compared
const verParts = v => String(v || '').split(/[^0-9]+/).filter(Boolean).map(Number);
const verSame = (a, b) => { const x = verParts(a), y = verParts(b); while (x.length && !x[x.length - 1]) x.pop(); while (y.length && !y[y.length - 1]) y.pop(); return x.join('.') === y.join('.'); };
// 1.4.10 (siritos 05.11): the room's version is not shown on the card any more and does not hide Join. It comes with the list
// (no wait on the click). Another version than mine: no join - a window says so plainly and, when the launcher has that
// version, offers to switch to it ("Update to" a newer one, "Switch to" an older one). A version not known yet: Join as is,
// the game itself says "another version" then. '' = join, else the room's version
function roomJoinWhy(r) {
  if (!r.exact) return '';   // an older ladder without the exact fields, or the version is not known yet
  const mine = S && S.installed_version;
  return r.version && /^\d/.test(mine || '') && !verSame(r.version, mine) ? String(r.version) : '';
}
const verNewer = (a, b) => { const x = verParts(a), y = verParts(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] | 0) !== (y[i] | 0)) return (x[i] | 0) > (y[i] | 0); } return false; };
function roomVerOther(v) {
  const mine = S.installed_version;
  const ch = (S.config?.channels || []).find(c => verSame(c.version, v));
  const why = !ch ? t('roomsVerNoCh', { v }) : S.game_running ? t('roomsVerGame') : S.busy ? t('roomsVerBusy') : '';
  const up = verNewer(v, mine);
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box"><h3>${esc(t('roomsVerAsk'))}</h3><p>${esc(t('roomsVerOther', { v, mine }))}</p>${why ? `<p class="note">${esc(why)}</p>` : ''}<div class="row">`
    + (ch && !why ? `<button class="btn gold" id="rvSw">${esc(t(up ? 'roomsVerUp' : 'roomsVerSw', { v }))}</button>` : '')
    + `<button class="btn" id="rvNo">${esc(t('roomsVerClose'))}</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector('#rvNo').onclick = () => m.remove();
  m.onclick = e => { if (e.target === m) m.remove(); };
  const sw = m.querySelector('#rvSw');
  if (sw) { sw.onclick = () => { m.remove(); switchTo(ch.id); toast(t('roomsVerAfter', { v })); }; sw.focus(); }
  else m.querySelector('#rvNo').focus();
}
// the Join buttons follow my search / match at once (the list itself reloads every 15 s). 1.4.10 (siritos 05.11: "I started a
// search, pressed Join - nothing happened, and no word why"): not disabled any more - dimmed, and a click says why
function roomsJoinState() {
  const busy = meBusy();
  document.querySelectorAll('#roomsList .rjoin').forEach(b => { b.classList.toggle('wait', busy); b.title = busy ? t('roomsJoinBusy') : t('roomsJoin'); });
}
function roomCard(r) {
  const A = (RM.host || 'https://rts.fintebtc.de') + '/elite/assets/';
  const why = r.game === 'elite' ? roomJoinWhy(r) : '';
  const tag = r.game === 'elite' ? `<span class="tag elite">Elite</span>`
    : r.game === 'vanilla' ? `<span class="tag van">${esc(t('roomsVan'))}</span>`
    : r.game === 'other' ? `<span class="tag oth">${esc(t('roomsOther'))}</span>` : '';
  const cap = r.cap || (((r.map || '').match(/^(\d)p_/) || [])[1] | 0) || 0;
  const per = cap ? Math.max(1, Math.round(cap / 2)) : 0;
  // no race in the slot (Relic's slot info has 255 there: Random, or not picked yet): the "?" of the searching list (03.11.2026)
  const pl = p => `<div class="rp${p.host ? ' host' : ''}">`
    + (p.race ? `<img src="${A}${p.hero != null ? 'heroes/' + p.race + '_' + p.hero : 'races/' + p.race}.png" alt="" data-fb="${A}races/${p.race}.png">`
       : raceImg('random'))
    + `<span>${roomFlag(p.country)}</span><span class="nm" data-steam="${esc(p.steam || '')}" data-name="${esc(p.name || '')}">${esc(p.name)}</span>${p.rating ? `<span class="rt">${p.rating}</span>` : ''}</div>`;
  // observers (03.11.2026, siritos: a slot of their own with its own icon, under the teams): the players the server marks as
  // observers or puts in no team, else only Relic's count of them
  const isObs = p => p.observer || !(p.team === 0 || p.team === 1 || p.team == null);
  const obsP = (r.players || []).filter(isObs), nObs = Math.max(r.observers | 0, obsP.length);
  const teams = [0, 1].map(tm => {
    const ps = (r.players || []).filter(p => !isObs(p) && (p.team | 0) === tm);
    return `<div class="team">${ps.map(pl).join('')}${Array(per ? Math.max(0, per - ps.length) : 0).fill(`<div class="rp free">${esc(t('roomsFree'))}</div>`).join('')}</div>`;
  }).join('');
  const EYE = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="currentColor" d="M12 5C6.5 5 2.7 9.2 1.5 12c1.2 2.8 5 7 10.5 7s9.3-4.2 10.5-7C21.3 9.2 17.5 5 12 5zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/></svg>';
  const obs = nObs ? `<div class="robs" title="${esc(t('roomsObs'))}">${EYE}`
    + (obsP.length ? obsP.map(p => `<span>${roomFlag(p.country)}</span><span class="nm" data-steam="${esc(p.steam || '')}" data-name="${esc(p.name || '')}">${esc(p.name)}</span>`).join('<span class="sep">·</span>')
      + (nObs > obsP.length ? ` <span class="oc">+${nObs - obsP.length}</span>` : '') : `<span class="oc">${nObs}</span>`) + '</div>' : '';
  const map = r.map_title || String(r.map || '').replace(/^\d+p_/i, '').replace(/_/g, ' ');
  const full = r.free != null ? r.free <= 0 : false;
  const here = RM.mine && String(RM.mine.room) === String(r.id);
  const join = here ? `<span class="tag here">${esc(t('roomsHere'))}</span>`
    : (r.game === 'elite' || r.game === 'vanilla') && roomJoinOn(r.game) && !r.password && !full && r.id
    ? `<button class="rjoin${meBusy() ? ' wait' : ''}" title="${esc(meBusy() ? t('roomsJoinBusy') : t('roomsJoin'))}" aria-label="${esc(t('roomsJoin'))}" data-room="${esc(String(r.id))}" data-name="${esc(r.name || '')}" data-why="${esc(why)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg></button>` : '';
  return `<div class="room"><div class="mmap" style="${r.minimap ? `background-image:url('${A}${esc(r.minimap)}')` : ''}"></div><div style="min-width:0">`
    + `<div class="rh">${r.mode ? `<span class="tag">${esc(r.mode)}</span>` : ''}${tag}${r.password ? '<span class="tag">🔒</span>' : ''}<span class="rn" title="${esc(r.name || '')}">${esc(r.name || '—')}</span>${join}</div>`
    + `<div class="rmap">${esc(map)}${cap ? ' · ' + (r.players || []).length + '/' + cap : ''}</div><div class="teams">${teams}</div>${obs}`
    + (r.password ? `<div class="rfoot">${esc(t('roomsPw'))}</div>` : '') + '</div></div>';
}
// 1.4.10 (siritos 05.11): the lobby I am in - no Join on it ("You are here"), and Join on another one says "leave it first"
// (the game would refuse it too). From the list: my SteamID among its players (the ladder has them from Relic, the list is up
// to ~30 s old); right after a Join from here, the game's "in the lobby" until the list shows me in it - or 45 s without
function roomMine(R) {
  const me = CH.me && CH.me.signed_in ? String(CH.me.steam || '') : '';
  const gone = RM.gone && Date.now() < RM.gone.until ? RM.gone.room : '';   // the game said I left it: the late list is not believed
  const r = me && R.find(x => String(x.id) !== gone && (x.players || []).some(p => String(p.steam || '') === me));
  if (r) return { room: String(r.id), name: r.name || '', ts: Date.now(), list: true };
  if (me) return null;   // signed in: the list decides alone (05.11: the plaque stayed on a room I had left, its players right)
  const j = RJ.here;     // signed out: the game's "in the lobby" after a Join from here, 45 s
  return j && R.some(x => String(x.id) === j.room) && Date.now() - j.ts < 45000 ? j : null;
}
async function roomsLoad() {
  const box = $('roomsList'); if (!box) return;
  try {
    const d = await invoke('rooms_live'); RM.host = d.host || RM.host;
    const R = d.rooms || [];
    RM.last = R; RM.mine = roomMine(R);
    $('roomsN').textContent = R.length;
    box.innerHTML = R.length ? R.map(roomCard).join('') : `<div class="note">${esc(t('roomsNone'))}</div>`;
    box.querySelectorAll('img[data-fb]').forEach(i => i.onerror = () => { i.onerror = null; i.src = i.dataset.fb; });   // no hero icon: the race's (CSP: no inline handlers)
    // a player with a SteamID (the server sends it from Relic's "/steam/<id64>"): the player menu on his name
    box.querySelectorAll('.rjoin').forEach(b => b.onclick = () => roomTry(b.dataset.room, b.dataset.name, b));   // the room's game from the list
    box.querySelectorAll('.rp .nm[data-name], .robs .nm[data-name]').forEach(n => nickBind(n, n.dataset.steam, n.dataset.name, false, true));   // the stats (by name until the server sends SteamIDs), Steam when there; no "mention"
  } catch (e) { box.innerHTML = `<div class="note">${esc(t('roomsErr'))}</div>`; }
}
// 1.4.9: Join talks to RoomJoin.dll (RoomJoin 9) in the game over its pipe (roomjoin.rs) - no request file any more. The game
// running without the pipe = without the add-on (or an older one): restart it with the add-on on. Not running: Play, then the
// launcher waits for the game's pipe. What the game says (accepted, walking, joining, in the lobby, why not) shows above the list.
const RJ = { room: '', name: '', hide: 0, here: null };
function rjShow(text, kind, cancel) {
  const b = $('rjStatus'); if (!b) return;
  clearTimeout(RJ.hide);
  b.classList.remove('hidden', 'ok', 'err'); if (kind) b.classList.add(kind);
  $('rjText').textContent = text; $('rjCancel').classList.toggle('hidden', !cancel);
  if (kind) RJ.hide = setTimeout(() => b.classList.add('hidden'), kind === 'ok' ? 10000 : 30000);
}
// a window with a title, lines of text and buttons [{label, cls, val}]; resolves the button's val (null: closed)
function askBox(title, lines, buttons) {
  return new Promise(done => {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="box"><h3>${esc(title)}</h3>${lines.filter(Boolean).map(l => `<p>${esc(l)}</p>`).join('')}<div class="row">`
      + buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('') + '</div></div>';
    document.body.appendChild(m);
    const end = v => { m.remove(); done(v); };
    m.querySelectorAll('button[data-i]').forEach(b => b.onclick = () => end(buttons[+b.dataset.i].val));
    m.onclick = e => { if (e.target === m) end(null); };
    const first = m.querySelector('button[data-i]'); if (first) first.focus();
  });
}
// 1.4.17 (owner 06.11.2026): the questions and the errors of a Join are siritos's small windows again (askBox) - "не перекрывать
// экран" was about RoomJoin's black screen in the game only (gone since RoomJoin 12). The status line keeps the progress.
// One error window at a time (a second failure replaces the text).
let RJ_MODAL = null;
function rjModal(title, lines) {
  if (RJ_MODAL) RJ_MODAL.remove();
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box"><h3>${esc(title)}</h3>${lines.filter(Boolean).map(l => `<p>${esc(l)}</p>`).join('')}<div class="row"><button class="btn gold">${esc(t('roomsVerClose'))}</button></div></div>`;
  document.body.appendChild(m); RJ_MODAL = m;
  const end = () => { m.remove(); if (RJ_MODAL === m) RJ_MODAL = null; };
  m.querySelector('button').onclick = end; m.onclick = e => { if (e.target === m) end(); };
  m.querySelector('button').focus();
}
const roomById = id => (RM.last || []).find(x => String(x.id) === String(id));
const roomIHost = r => { const me = CH.me && CH.me.signed_in ? String(CH.me.steam || '') : ''; return !!(me && r && (r.players || []).some(p => p.host && String(p.steam || '') === me)); };
// Join on a room's card: its version first (another one: say so, offer to switch), then the join
async function roomTry(id, name, btn) {
  if (!S || (S.os !== 'windows' && S.os !== 'linux')) { rjShow(t('rjOnlyWin'), 'err'); return; }
  if (meBusy()) { rjShow(t('roomsJoinBusy'), 'err'); roomsJoinState(); return; }
  const r = roomById(id);
  const v = r && r.game === 'elite' ? roomJoinWhy(r) : '';
  if (v) { roomVerOther(v); return; }                               // another version: say so, offer to switch
  return roomJoin(id, (r && r.name) || name || '', btn, false, roomGame(r));
}
// 1.4.11: the other game runs (Elite for a vanilla lobby or the other way round): the launcher never closes it - the player
// closes it, then the right game starts and the join goes on (game_running below)
async function rjWrongGame(id, name, want) {
  const ok = await askBox(t('rjWrongAsk'), [t(want === 'vanilla' ? 'rjWrongVan' : 'rjWrongElite')],
    [{ label: t('rjWrongGo'), cls: 'gold', val: 1 }, { label: t('rjCancel'), val: 0 }]);
  if (!ok) return;
  RJ.after = { id, name, want };
  rjShow(t('rjCloseGame', { game: want === 'vanilla' ? (L(S.vanilla?.name) || t('vanillaName')) : 'Elite', name }), '', true);
}
async function roomJoin(id, name, btn, leave, game) {
  if (!S || (S.os !== 'windows' && S.os !== 'linux')) { rjShow(t('rjOnlyWin'), 'err'); return; }
  if (meBusy()) { rjShow(t('roomsJoinBusy'), 'err'); roomsJoinState(); return; }
  const room = Number(id); if (!Number.isSafeInteger(room) || room <= 0) return;
  if (btn) btn.disabled = true;
  setTimeout(() => { if (btn) btn.disabled = false; }, 2000);   // a double click only: a second Join for the same room just goes on
  RJ.room = String(room); RJ.name = name || ''; RJ.after = null;
  const want = game === 'vanilla' ? 'vanilla' : game === 'elite' ? 'elite' : roomGame(roomById(id));
  RJ.want = want;
  if (want === 'vanilla' && !S.vanilla_offered) { rjShow(t('rjVanNo'), 'err'); return; }
  if (!roomJoinOn(want)) { rjShow(t(want === 'vanilla' ? 'rjVanAddonOff' : 'rjAddonOff'), 'err'); return; }
  try {
    const p = await invoke('room_join_probe') || {};
    // the other game runs (its command line says): no join into it - close it first, then the right one starts
    const mine = (p.games || []).filter(g => !g.kind || g.kind === want);
    if (p.running && !mine.length && (p.running_kind && p.running_kind !== want || (p.games || []).length)) { rjWrongGame(id, name, want); return; }
    // the lobby I am in: the game itself says (its status, RoomJoin 9+), else the list (my SteamID in a room) while the game runs
    const g0raw = mine[0], st = (g0raw && g0raw.status) || {};
    const g0 = st.screen === 'unknown' ? null : g0raw;   // the game has not seen its menu yet: its room 0 says nothing, the list decides
    // the game answered: its word decides (0 = in no room, the list may still show me in one for 30 s); no answer: the list
    const inRoom = g0 ? (st.room ? String(st.room) : '') : p.running && RM.mine ? RM.mine.room : '';
    if (g0 && RM.mine && RM.mine.room !== inRoom) { RM.gone = { room: RM.mine.room, until: Date.now() + 40000 }; RM.mine = null; RJ.here = null; }   // the list is late: not there any more
    if (inRoom === String(room)) { RJ.here = { room: RJ.room, name: RJ.name, ts: Date.now() }; rjShow(t('rjInLobby', { name: RJ.name }), 'ok'); roomsLoad(); return; }
    if (inRoom && !leave) {                                         // 1.4.10 (siritos 05.11): offer to switch, the host warned
      const cur = roomById(inRoom), a = (cur && cur.name) || t('rjCurLobby');
      if (st.proto != null && st.proto < 2) { rjShow(t('rjSwitchOld', { a }), 'err'); return; }   // RoomJoin 10 and older can't leave
      const ok = await askBox(t('rjSwitchAsk'), [t('rjSwitchText', { a, b: RJ.name }), roomIHost(cur) ? t('rjSwitchHost') : ''],
        [{ label: t('rjSwitchGo'), cls: roomIHost(cur) ? 'red' : 'gold', val: 1 }, { label: t('rjCancel'), val: 0 }]);
      if (!ok) return;
      leave = true;
    }
    let wait = 0;
    if (!mine.length) {
      if (p.running && !p.young) { rjShow(t('rjNoPipe'), 'err'); return; }      // the heartbeat: a running game without the pipe
      if (p.running) { wait = 90; rjShow(t('rjWaitGame'), '', true); }          // just started: its add-ons are not in yet
      else {
        wait = 240; rjShow(t('rjStarting', { name: RJ.name }), '', true);
        // 1.4.11: the game of the lobby - vanilla for a vanilla one, Elite for an Elite one
        if ((want === 'vanilla') !== VAN()) { try { S = await invoke('set_game_mode', { mode: want }); render(); } catch (e) { /* the chosen game then */ } }
        doPlay(false);   // the add-ons synced first, then the game
      }
    }
    await invoke('room_join', { id: room, name: RJ.name, wait, leave: !!leave, game: want });
  } catch (e) { rjShow(String(e), 'err'); }
}
listen('room_join', e => {
  const v = e.payload || {}; const name = RJ.name;
  if (v.room && String(v.room) !== RJ.room) return;
  switch (v.ev) {
    case 'waiting_game': rjShow(t('rjWaitGame'), '', true); break;
    case 'accepted': rjShow(t('rjAccepted', { name }), '', true); break;
    case 'walking': rjShow(t('rjWalking'), '', true); break;
    case 'leaving': rjShow(t('rjLeaving', { name }), '', true); break;
    case 'joining': rjShow(t('rjJoining', { name }), '', true); break;
    case 'in_lobby': rjShow(t('rjInLobby', { name }), 'ok'); RJ.here = { room: RJ.room, name, ts: Date.now() }; roomsLoad(); break;
    case 'failed': {
      if (v.reason === 'no_pipe') { rjShow(t('rjNoPipe'), 'err'); rjModal(t('rjFailedAsk'), [t('rjNoPipe')]); break; }
      if (v.reason === 'wrong_game') { rjWrongGame(RJ.room, name, RJ.want || 'elite'); break; }
      const why = T[lang]['rjWhy_' + v.reason] || T.en['rjWhy_' + v.reason] ? t('rjWhy_' + v.reason) : t('rjWhy_error');
      // 1.4.13: no answer from the room while our game servers carry the games - say which ticks to try without
      const relays = (S.components || []).filter(c => /^relay(_r\d+|_fwd)?$/.test(String(c.id)) && c.enabled && (!VAN() || c.vanilla_ok));
      const hint = (v.reason === 'timeout' || v.reason === 'no_answer') && relays.length ? ' ' + t('rjHintRelay', { list: relays.map(c => '«' + (L(c.name) || c.id) + '»').join(', ') }) : '';
      const msg = t('rjFailed', { name, why }) + (v.text ? ' (' + v.text + ')' : '');
      rjShow(msg + hint, v.reason === 'cancelled' ? 'ok' : 'err');
      // 1.4.17 (owner 06.11.2026): a failed join is a small window, as siritos's questions are (the line keeps the progress)
      if (v.reason !== 'cancelled') rjModal(t('rjFailedAsk'), [msg, hint.trim()]);
      break; }
  }
});
$('rjCancel').onclick = async () => { RJ.after = null; await invoke('room_join_cancel').catch(() => {}); rjShow(t('rjCancelled'), 'ok'); };
// elite://join/<id>?name=... (the ladder site's Join): the Lobbies tab and the same Join, if the add-on is on
async function roomLink() {
  if (!S) return;                                     // the window takes it once its status is there (below)
  const l = await invoke('room_link_take').catch(() => null); if (!l) return;
  const tab = document.querySelector('.tab[data-view="rooms"]'); if (tab) tab.click();
  if (S.os !== 'windows' && S.os !== 'linux') { rjShow(t('rjOnlyWin'), 'err'); return; }
  // 1.4.11: the lobby's game - the link's own word, else the room in the list (a vanilla lobby opens vanilla)
  let game = l.game;
  if (!game) { try { const d = await invoke('rooms_live'); RM.last = d.rooms || RM.last; } catch (e) { /* the last list then */ } game = roomGame(roomById(l.id)); }
  roomJoin(l.id, l.name, null, false, game);
}
listen('room_link', roomLink);
function roomsWatch() {
  clearInterval(RM.timer); RM.timer = 0;
  if ($('rooms') && !$('rooms').classList.contains('hidden')) { roomsLoad(); RM.timer = setInterval(() => { if (!document.hidden) roomsLoad(); }, 15000); }
}
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', roomsWatch));
$('cancel').onclick = () => invoke('cancel_update');
$('browse').onclick = pickDir;
$('openDir').onclick = () => invoke('open_game_dir').catch(e => toast(e, true));
$('lang').onchange = e => invoke('set_setting', { key: 'lang', value: e.target.value }).then(reload);
$('usage').onchange = e => invoke('set_setting', { key: 'usage_stats', value: e.target.checked }).then(reload);
$('lanShare').onchange = e => invoke('set_setting', { key: 'lan_share', value: e.target.checked }).then(reload);
$('muteMention').onchange = e => invoke('set_setting', { key: 'mute_mention', value: e.target.checked }).then(reload);
$('addonCheck').onclick = async () => {
  const b = $('addonCheck'), note = $('addonCheckNote'); b.disabled = true; note.textContent = t('addonChecking');
  const changes = await refresh();
  b.disabled = false;
  if (changes && !changes.length) note.textContent = t('addonSame', { time: new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) });
  else if (changes === null) note.textContent = '';
};
$('closeQuits').onchange = e => invoke('set_setting', { key: 'close_quits', value: e.target.checked }).then(reload);
$('cache').onchange = e => invoke('set_setting', { key: 'cache_mb', value: +e.target.value }).then(reload);
// ---------- Settings: how our servers answer from here (reach.rs) ----------
// two groups - the files (updates of Elite and the add-ons) and everything else (chat, Online, rooms, the launcher's own
// update); in each the one in use first; checked at the start and when one stops answering, or by the button
const NET_PLACE = { 'dow2ru.fintebtc.de': 'netMoscow', 'dow2.fintebtc.de': 'netGermany', 'rts.fintebtc.de': 'netGermany' };
const netHost = b => String(b || '').replace(/^https?:\/\//, '').split('/')[0];
const netPlace = b => { const h = netHost(b); return NET_PLACE[h] ? t(NET_PLACE[h]) : /\.r2\.dev$/.test(h) ? t('netR2') : h; };
var NET_LAST = null;   // (var: render() may call renderNet before this line ran) the last answer, drawn again with the rest of the window (the language may come later)
function renderNet(d) {
  if (d) NET_LAST = d; else d = NET_LAST;
  if (!d || !$('netList')) return;
  const grp = (key, g) => {
    const list = (g && g.list) || [];
    if (!list.length) return '';
    return `<div class="net-g"><div class="net-gh">${esc(t(key))}</div>` + list.map((p, i) => `<div class="net-r ${p.ms != null ? 'ok' : 'off'}">`
      + `<i></i><span class="net-p">${esc(netPlace(p.base))}</span><span class="net-h">${esc(netHost(p.base))}</span>`
      + `<span class="net-ms">${p.ms != null ? esc(t('netMs', { n: p.ms })) : esc(t('netNone'))}</span>`
      + (i === 0 && p.ms != null ? `<span class="chip">${esc(t('netUsed'))}</span>` : '<span></span>') + '</div>').join('') + '</div>';
  };
  $('netList').innerHTML = grp('netFiles', d.data) + grp('netApi', d.api) || `<div class="note">${esc(t('netWait'))}</div>`;
  const checked = d.data && d.data.checked && d.api && d.api.checked;
  $('netNote').textContent = checked ? t('netNoteDone') : t('netNoteOld');
}
invoke('net_status').then(renderNet).catch(() => {});
listen('net_rank', e => renderNet(e.payload));
// 1.4.10 (siritos 05.11): while a check runs - a spinner on its Check button, the results of the last one dimmed under it
function netBusy(btn, list, on) { btn.classList.toggle('busy', on); btn.setAttribute('aria-busy', on ? 'true' : 'false'); if (list) list.classList.toggle('busy', on); }
$('netCheck').onclick = async () => {
  const b = $('netCheck'); b.disabled = true; $('netNote').textContent = t('netChecking');
  netBusy(b, $('netList'), true);
  try { renderNet(await invoke('net_check')); } catch (e) { toast(e, true); }
  b.disabled = false; netBusy(b, $('netList'), false);
};
// ---------- Settings -> Online play (1.4.5, owner 03.11.2026): Relic, our game servers and forwarding from this computer ----------
// judged by the rules of the add-ons (netgame.rs / relay.c Relay 18-19): a node is usable when it answers UDP and a stream of
// 40 x 1000 bytes gets through (30+ answers, 3+ of the last 6); the nearest usable one is the one the game takes. By the button,
// and once when the tab is first opened; never while the game runs.
var GN = null, GN_BUSY = false, GN_OPENED = false;
var GN_PLACE = { '15.220.68.107': 'gnPoland', '116.202.106.150': 'netGermany', '83.217.192.34': 'netMoscow', '91.107.122.186': 'gnMoscow2' };
function gnName(n) { return GN_PLACE && GN_PLACE[n.ip] ? t(GN_PLACE[n.ip]) : (n.name || n.ip); }
function renderGameNet() {
  const box = $('gnList'); if (!box || !S) return;
  const comp = id => (S.components || []).find(x => x.id === id);
  // 1.4.14 (owner 05.11.2026): our game servers are part of Automatch now (its Relay.dll) - the tick relay_r2 is gone from the store
  const own = comp('relay_r2') || comp('automatch'), fwd = comp('relay_fwd');
  const tick = c => !c ? `<span class="chip">${esc(t('gnTickNone'))}</span>` : `<span class="chip ${c.enabled ? 'hot' : ''}">${esc(t(c.enabled ? 'gnTickOn' : 'gnTickOff'))}</span>`;
  const row = (cls, place, host, info, chip) => `<div class="net-r ${cls}"><i></i><span class="net-p">${esc(place)}</span><span class="net-h">${esc(host)}</span>`
    + `<span class="gn-i">${esc(info)}</span>${chip || '<span></span>'}</div>`;
  const wait = key => S.game_running ? '' : `<div class="note">${esc(t(key))}</div>`;   // while the game runs the note at the top says it once
  const sum = (cls, text, btn) => `<div class="gn-sum ${cls}"><span>${esc(text)}</span>${btn || ''}</div>`;
  let h = '';
  // Relic: the full check's answer, else the one of the launcher's start
  const R = (GN && GN.relic) || FWD_LAST;
  h += `<div class="net-g"><div class="net-gh">${esc(t('gnRelic'))}</div>`;
  if (R && R.relays_ms) {
    (R.relays || []).forEach((a, i) => {
      const ms = R.relays_ms[i];
      h += row(ms < 0 ? 'bad' : ms > 200 ? 'warn' : 'ok', t('gnRelicRelay'), a, ms < 0 ? t('gnClosed') : ms > 200 ? t('gnSlowMs', { n: ms }) : t('netMs', { n: ms }));
    });
    h += row(R.stream_ok ? 'ok' : 'bad', t('gnRelicApi'), 'dow-api.reliclink.com', R.stream_ok ? t('gnStreamOk', { kb: R.stream_kb, s: R.stream_s }) : t('gnStreamCut', { kb: R.stream_kb }));
    const fwdOn = fwd && fwd.enabled;   // the offer's button is under Forwarding servers below
    h += !R.problem ? sum('ok', t('gnRelicOk')) : sum(fwdOn ? 'warn' : 'bad', t(fwdOn ? 'gnRelicFwdOn' : 'gnRelicBad', { why: relicWhy(R) }));
  } else h += wait('gnRelicWait');
  h += '</div>';
  // our nodes - one list for both ticks (Relay.dll and RelayForward.dll use the same nodes and the same rule)
  const nodes = (GN && GN.nodes) || [];
  const usable = nodes.filter(n => n.udp && n.udp.usable);
  const near = nodes.find(n => GN && n.ip === GN.nearest);
  h += `<div class="net-g"><div class="net-gh">${esc(t('gnOwn'))} ${tick(own)}</div>`;
  if (nodes.length) {
    nodes.forEach(n => {
      const u = n.udp || {}, tc = n.tcp || {};
      const cls = u.usable ? 'ok' : u.ms != null ? 'warn' : 'bad';
      const parts = [u.ms != null ? t('gnUdpMs', { n: u.ms }) : t('gnUdpNone')];
      if (u.ms != null) parts.push(u.usable ? t('gnBurst', { got: u.got, n: u.n }) : t('gnBurstCut', { got: u.got, n: u.n, tail: u.tail }));
      parts.push(tc.state === 'ok' ? t('gnTcpOk', { kb: tc.kb }) : tc.state === 'cut' ? t('gnTcpCut', { kb: tc.kb }) : t('gnTcpNone'));
      const chip = n === near ? `<span class="chip">${esc(t('gnNearest'))}</span>` : !u.usable ? `<span class="chip off">${esc(t('gnNotUsed'))}</span>` : '';
      h += row(cls, gnName(n), n.ip, parts.join(' · '), chip);
    });
    h += !own ? '' : !own.enabled ? sum('na', t('gnOwnOff')) : near ? sum('ok', t('gnOwnPick', { node: gnName(near) })) : sum('bad', t('gnOwnNone'));
    h += `<div class="note">${esc(t('gnOwnHow'))} ${esc(t('gnTcpInfo'))}</div>`;
    h += `<div class="note">${esc(t(GN.list === 'ladder' ? 'gnListLadder' : 'gnListBuiltin', { port: GN.port }))}</div>`;
  } else h += wait(GN_BUSY ? 'gnChecking' : 'gnNever');
  h += '</div>';
  // 1.4.6: our automatch (lobby) servers - OwnLobby.dll: the first usable one in order, none = Relic directly
  const LB = GN && GN.lobby, ol = comp('ownlobby') || comp('automatch');   // OwnLobby.dll ships with Automatch (the ownlobby tick is gone)
  h += `<div class="net-g"><div class="net-gh">${esc(t('gnLobby'))} ${tick(ol)}</div>`;
  if (LB && LB.servers) {
    const sec = ms => (Math.round((ms || 0) / 100) / 10).toString();
    LB.servers.forEach((r, i) => {
      const parts = [r.state === 'dns' ? t('gnLobbyDns') : r.state === 'none' ? t('gnLobbyNone') : t('gnLobbyConn', { n: r.connect_ms })];
      if (r.connect_ms != null) parts.push(!r.stream ? t('gnLobbyNoStream') : r.state === 'ok' ? t('gnLobbyStream', { b: r.bytes, s: sec(r.stream_ms) })
        : r.state === 'cut' ? t('gnLobbyCut', { b: r.bytes, s: sec(r.stream_ms) }) : t('gnLobbyNoAns'));
      const cls = r.state === 'ok' ? 'ok' : r.connect_ms != null ? 'warn' : 'bad';
      const chip = i === LB.pick ? `<span class="chip">${esc(t('gnLobbyUsed'))}</span>` : r.state !== 'ok' ? `<span class="chip off">${esc(t('gnNotUsed'))}</span>` : '';
      h += row(cls, r.host + ':' + r.port, r.ip && r.ip !== r.host ? r.ip : '', parts.join(' · '), chip);
    });
    const used = LB.pick != null ? LB.servers[LB.pick] : null;
    h += !ol ? '' : !ol.enabled ? sum('na', t('gnLobbyOff')) : used ? sum('ok', t('gnLobbyPick', { host: used.host + ':' + used.port })) : sum('bad', t('gnLobbyRelic'));
    h += `<div class="note">${esc(t('gnLobbyHow'))}</div>`;
  } else h += wait(GN_BUSY ? 'gnChecking' : 'gnNever');
  h += '</div>';
  // forwarding: the nearest usable node carries every Relic game (RelayForward.dll)
  h += `<div class="net-g"><div class="net-gh">${esc(t('gnFwd'))} ${tick(fwd)}</div>`;
  if (nodes.length && fwd) {
    if (usable.length) h += sum(fwd.enabled ? 'ok' : 'na', t('gnFwdFit', { list: usable.map(gnName).join(', ') }));
    if (fwd.enabled) h += near ? sum('ok', t('gnFwdVia', { node: gnName(near) })) : sum('bad', t('gnFwdNone'));
    else if (R && R.problem) h += near ? sum('warn', t('gnFwdOff'), `<button class="btn gold small" id="gnFwdOn"${S.busy || S.game_running ? ' disabled' : ''}>${esc(t('fwdOn'))}</button>`) : sum('bad', t('gnFwdNone'));
    else h += sum('na', R ? t('gnFwdNotNeeded') : t('gnFwdOff'));
  } else if (!nodes.length) h += wait(GN_BUSY ? 'gnChecking' : 'gnNever');
  h += '</div>';
  box.innerHTML = h;
  if ($('gnFwdOn')) $('gnFwdOn').onclick = fwdTurnOn;
  $('gnCheck').disabled = GN_BUSY || !!S.game_running;
  netBusy($('gnCheck'), box, GN_BUSY);
  $('gnNote').textContent = S.game_running ? t('gnGame') : GN_BUSY ? t('gnChecking') : t('gnNote');
  $('gnWhen').textContent = GN && GN.ts ? t('gnWhen', { time: new Date(GN.ts * 1000).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) }) : '';
}
async function gameNetCheck() {
  if (GN_BUSY || !S || S.game_running) { renderGameNet(); return; }
  GN_BUSY = true; renderGameNet();
  try {
    const r = await invoke('game_net_check');
    if (r && !r.skipped) {
      GN = r;
      if (r.relic && r.relic.relays_ms) { FWD_LAST = FWD = r.relic; renderFwdBanner(); }   // the offer follows the newest check
    }
  } catch (e) { toast(e, true); }
  GN_BUSY = false; renderGameNet();
}
$('gnCheck').onclick = gameNetCheck;
$('saveMirror').onclick =() => invoke('set_setting', { key: 'extra_mirror', value: $('mirror').value.trim() }).then(refresh);
$('repair').onclick = () => startUpdate(true);
// "Clean up the junk": stray plugins into a backup folder, then check & repair puts Elite and the ticked add-ons back
$('junk').onclick = () => {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box"><h3>${esc(t('junkAsk'))}</h3><p>${esc(t('junkText'))}</p><div class="row"><button class="btn red" id="jkDo">${esc(t('junkDo'))}</button>
    <button class="btn gold" id="jkNo">${esc(t('junkCancel'))}</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector('#jkNo').onclick = () => m.remove();
  m.querySelector('#jkDo').onclick = async () => {
    m.remove();
    try {
      const r = await invoke('clean_junk');
      toast((r.moved || []).length ? t('junkDone', { n: r.moved.length, dir: r.backup }) : t('junkNone'));
      await startUpdate(true);
    } catch (e) { toast(e, true); }
  };
};
// ник для логов запоминаем (localStorage может быть недоступен — тогда просто без ника)
let diagSaved = '', diagTyped = false;
try { diagSaved = localStorage.getItem('diagName') || ''; } catch (e) {}
$('diagName').value = diagSaved;
$('diagName').oninput = () => { diagTyped = true; };
$('diagName').onchange = () => { diagSaved = $('diagName').value.trim(); try { localStorage.setItem('diagName', diagSaved); } catch (e) {} };
// signed in: the field shows the profile's name (owner 03.11.2026) - the player sees what goes with the logs and can
// change it; signed out: the nickname typed before, as it was
function diagNameFromProfile() {
  // the developers' chat (its name goes with the logs too): an empty one gets the profile's name and keeps it; a name of one's own stays
  const me0 = CH.me && CH.me.signed_in ? CH.me : null;
  if (me0 && me0.name && $('fbName') && !$('fbName').value.trim()) { $('fbName').value = me0.name; invoke('fb_set_name', { name: me0.name }).catch(() => {}); }
  if (diagTyped) return;
  const me = CH.me && CH.me.signed_in ? CH.me : null;
  $('diagName').value = me && me.name ? me.name : diagSaved;
}
async function sendLogs(btn, label) {
  btn.disabled = true; btn.textContent = t('sending');
  try { const id = await invoke('send_logs', { who: $('diagName').value.trim() }); toast(t('logsSent', { id })); }
  catch (e) { toast(e, true); }
  finally { btn.disabled = false; btn.textContent = t(label); }
}
$('sendLogs').onclick = () => sendLogs($('sendLogs'), 'sendLogs');
$('sendLogsHome').onclick = () => sendLogs($('sendLogsHome'), 'sendLogs');

$('verBtn').onclick = e => { e.stopPropagation(); verOpen($('verList').classList.contains('hidden')); };
document.addEventListener('click', e => {
  if (!$('verList').contains(e.target)) verOpen(false);
  if (!$('pop').contains(e.target)) popClose();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { verOpen(false); popClose(); } });
window.addEventListener('resize', popClose);

reload().then(() => { roomLink(); return refresh(); });
launcherCheck();
setTimeout(relicProbe, 8000);                 // after start-up traffic settles; once per launcher start
// every 15 minutes: new Elite versions, announcements and a newer launcher
setInterval(() => { if (S && !S.busy) refresh(); launcherCheck(); }, 15 * 60 * 1000);


// ---------- Online (home, above the add-ons): who is looking for a game, who is in a match ----------
// The same list the ladder page shows: /ladder/api/mm/live of the ladder service on the log hosts, every 15 seconds
// (every minute while the window is hidden). Only names here; the details are on the ladder page linked below the block.
// The Online block comes ready from the ladder server: the snapshot (online / c/live) and then only changes over the
// stream (presence, match, match_end, user). Each person is in one group only, the server sorts that out.
const LIVE = { users: {}, searching: [], ingame: [], launcher: [], host: '', ok: false, skew: 0 };
const ON = { err: false, shut: new Set(), t: null };
// the groups the player folded stay folded (only a convenience: without storage everything opens)
try { ON.shut = new Set(JSON.parse(localStorage.getItem('onShut') || '[]')); } catch (e) {}
const RACES = ['space_marines', 'chaos_marines', 'eldar', 'orks', 'tyranids', 'imperial_guard', 't_tau', 'z_unecron', 'ordo_malleus'];
// MMFind sends these three under their own names (the server passes the searching list on as is); "random" - a random race
const RACE_ALIAS = { chaos_space_marines: 'chaos_marines', tau: 't_tau', necron: 'z_unecron' };
const raceImg = r => {
  r = RACE_ALIAS[r] || r;
  if (r === 'random') return `<span class="race race-rnd" role="img" aria-label="${esc(t('race_random'))}" title="${esc(t('race_random'))}">?</span>`;
  return RACES.includes(r) ? `<img class="race" src="races/${r}.png" alt="${esc(t('race_' + r))}" title="${esc(t('race_' + r))}">` : '<span class="race"></span>';
};
// the 1v1 rating; none yet (no ladder games this season) - a dash, so the dots after it stay in one column
const onRt = r => r ? `<span class="rt">${Number(r) | 0}</span>` : `<span class="rt none" title="${esc(t('prNoGames'))}">—</span>`;
const onUser = s => LIVE.users[s] || {};
const onWho = s => `<button class="nm" data-steam="${esc(s)}" data-name="${esc(onUser(s).name || '')}">${esc(onUser(s).name || 'Player')}</button>`;
// the server sends unix times and its own clock with every snapshot: minutes count right even when the PC clock is off
const onMins = ts => t('onMin', { n: Math.max(0, Math.round((Date.now() / 1000 + LIVE.skew - ts) / 60)) });

// The snapshot of the Online block: /c/live; a ladder server without it yet (02.11: the live servers answer 404) - the
// same snapshot put together from the old answers, /mm/live (searching, matches) and /c/online (the launcher open)
async function liveSnapshot() {
  try { const d = await invoke('c_api', { path: 'live' }); if (d && d.users) return d; } catch (e) { /* the old way below */ }
  const [mm, on] = await Promise.all([invoke('mm_live'), invoke('c_api', { path: 'online' })]);
  const now = Math.floor(Date.now() / 1000), users = {}, sid = x => String(x || '');
  const put = p => { const s = sid(p && p.steam); if (s && !users[s]) users[s] = { name: p.name || 'Player', avatar: p.avatar || '', rating: p.rating }; return s; };
  (on.online || []).forEach(put);   // these carry the avatars: first
  const ingame = (mm.matches || []).map(m => ({
    id: m.id, mode: m.mode, map: m.map, state: m.state === 'playing' ? 'playing' : 'setup',
    started: m.state === 'playing' && m.since != null ? now - m.since : null,
    team1: (m.team1 || []).map(p => ({ steam: put(p), race: p.race })), team2: (m.team2 || []).map(p => ({ steam: put(p), race: p.race })),
    watchers: (m.watchers || []).map(put).filter(Boolean),
  }));
  const busy = new Set(ingame.flatMap(m => [...m.team1, ...m.team2].map(x => x.steam).concat(m.watchers)));
  const searching = (mm.searching || []).filter(p => p.steam && !busy.has(sid(p.steam)))
    .map(p => ({ steam: put(p), mode: p.mode, race: p.race, since: now - (p.waiting || 0) }));
  searching.forEach(p => busy.add(p.steam));
  const launcher = (on.online || []).filter(u => u.steam && !busy.has(sid(u.steam))).map(u => ({ steam: sid(u.steam), state: u.state || 'menu' }));
  return { now, host: mm.host, users, searching, ingame, launcher };
}

function onLive(d) {   // a full snapshot
  Object.assign(LIVE, { users: d.users || {}, searching: d.searching || [], ingame: d.ingame || [], launcher: d.launcher || [], ok: true });
  if (d.host) LIVE.host = d.host;
  if (d.now) LIVE.skew = d.now - Date.now() / 1000;
  ON.err = false; onSoon();
}
function onEvent(ev, d) {
  if (ev === 'online') return onLive(d);
  if (ev === 'user') { LIVE.users[d.steam] = { name: d.name, avatar: d.avatar, rating: d.rating }; if (CH.me && d.steam === CH.me.steam) chMe(); }
  else if (ev === 'presence') {
    // out of every group, then into the new one (ingame: the match event carries the teams)
    LIVE.searching = LIVE.searching.filter(p => p.steam !== d.steam);
    LIVE.launcher = LIVE.launcher.filter(p => p.steam !== d.steam);
    if (d.group === 'searching') LIVE.searching.push({ steam: d.steam, mode: d.mode, race: d.race, since: d.since });
    if (d.group === 'launcher') LIVE.launcher.push({ steam: d.steam, state: d.state });
  } else if (ev === 'match') {
    const i = LIVE.ingame.findIndex(m => m.id === d.id);
    if (i >= 0) LIVE.ingame[i] = d; else LIVE.ingame.push(d);
  } else if (ev === 'match_end') LIVE.ingame = LIVE.ingame.filter(m => m.id !== d.id);
  else return;
  onSoon();
}
function onSoon() {   // at most one redraw in 500 ms, however many events come
  if (ON.t) return;
  ON.t = setTimeout(() => { ON.t = null; onRender(); roomsJoinState(); }, 500);
}

function onRender() {
  if (!S) return;
  const group = (key, title, n, body) => {
    const open = !ON.shut.has(key);
    return `<div class="on-g ${key} ${open ? '' : 'shut'}"><button class="on-gh" data-g="${key}" aria-expanded="${open}" ${body ? '' : 'disabled'}>`
      + `<i></i>${esc(title)}<span>${esc(String(n))}</span>${body ? '<b class="chev"></b>' : ''}</button>${open ? body : ''}</div>`;
  };
  const look = LIVE.searching, matches = LIVE.ingame, inL = LIVE.launcher;
  const players = matches.flatMap(m => [...m.team1, ...m.team2]);
  let html = '';
  // first load: grey rows in place of the names; no answer: say so
  if (!LIVE.ok) html = ON.err ? `<div class="on-empty">${esc(t('onOffline'))}</div>`
    : `<div class="on-skel" role="status" aria-label="${esc(t('onLoading'))}">${'<div><i></i><b></b></div>'.repeat(5)}</div>`;
  else {
    if (ON.err) html += `<div class="on-stale">${esc(t('onOffline'))}</div>`;   // the last list stays, marked as old
    if (!look.length && !matches.length && !inL.length) html += `<div class="on-empty">${esc(t('onNobody'))}</div>`;
    // looking for a game: avatar, name, race, mode (spectators marked); no time (owner 03.11.2026: not needed)
    if (look.length) html += group('look', t('onSearching'), look.length, look.map(p => `<div class="on-p">${avatar(onUser(p.steam).avatar)}${onWho(p.steam)}${raceImg(p.race)}`
      + `<span class="tag">${esc(p.mode === 'watch' ? t('onWatcher') : p.mode)}</span></div>`).join(''));
    // the launcher open: avatar, 1v1 rating, a dot for menu / game
    if (inL.length) html += group('launcher', t('chMembers'), inL.length, [...inL].sort((a, b) => (onUser(a.steam).name || '').localeCompare(onUser(b.steam).name || ''))
      .map(p => `<div class="on-p on-u">${avatar(onUser(p.steam).avatar)}${onWho(p.steam)}${onRt(onUser(p.steam).rating)}`
        + `<span class="st st-${esc(p.state)}" title="${esc(t('st_' + p.state))}"></span></div>`).join(''));
    // in a match, the last group and the biggest: a card per match - mode, map, getting ready / how long it plays -
    // team against team, the spectators
    const pl = x => `<div class="on-p">${avatar(onUser(x.steam).avatar)}${onWho(x.steam)}${raceImg(x.race)}${onRt(onUser(x.steam).rating)}</div>`;
    const map = m => String(m || '').replace(/^\d+p_/i, '').replace(/_/g, ' ');
    if (matches.length) html += group('match', t('onInMatchH'), players.length, matches.map(m => `<div class="on-mc"><div class="on-mh">`
      + `<span class="tag ${m.state === 'playing' ? 'playing' : 'creating'}">${esc(m.mode)}</span><span class="map">${esc(map(m.map))}</span>`
      + `<span class="since">${esc(m.state === 'playing' ? t('onStatePlaying') + (m.started ? ' · ' + onMins(m.started) : '') : t('onStateCreating'))}</span>`
      + (m.live ? `<button class="lvw" data-m="${esc(m.id)}" data-g="${esc(m.live)}" title="${esc(t('lvTitle'))}">${esc(t('lvWatch'))}</button>` : '') + '</div>'
      + m.team1.map(pl).join('') + '<div class="vs">vs</div>' + m.team2.map(pl).join('')
      + (m.watchers.length ? `<div class="on-wt">${esc(t('onWatchers'))}: ${m.watchers.map(onWho).join(', ')}</div>` : '') + '</div>').join(''));
  }
  // "Online N" in the heading: everyone in the groups once, spectators too
  const ids = new Set([...look.map(p => p.steam), ...players.map(x => x.steam), ...matches.flatMap(m => m.watchers), ...inL.map(p => p.steam)]);
  $('onTotal').textContent = LIVE.ok ? String(ids.size) : '';
  $('onGroups').innerHTML = html;
  // a name: the menu (mention in the chat - the owner's 1.3.12 click - / stats / Steam); the avatar opens the Steam profile (1.3.12)
  // the name and the avatar of a player: the player menu (stats, Steam, mention in the chat)
  $('onGroups').querySelectorAll('.nm[data-steam]').forEach(b => nickBind(b, b.dataset.steam, b.dataset.name));
  $('onGroups').querySelectorAll('.on-p').forEach(r => { const n = r.querySelector('.nm[data-steam]');
    if (n) nickBind(r.querySelector('.av'), n.dataset.steam, n.dataset.name); });
  $('onGroups').querySelectorAll('.lvw[data-m]').forEach(b => b.onclick = () => liveWatch(b.dataset.m, b.dataset.g === 'vanilla' ? 'vanilla' : 'elite'));
  $('onGroups').querySelectorAll('.on-gh[data-g]').forEach(b => b.onclick = () => {
    ON.shut.has(b.dataset.g) ? ON.shut.delete(b.dataset.g) : ON.shut.add(b.dataset.g);
    try { localStorage.setItem('onShut', JSON.stringify([...ON.shut])); } catch (e) {}
    onRender();
  });
  $('onLadder').classList.toggle('hidden', !LIVE.host);
  $('onLadder').onclick = () => open(LIVE.host + '/ladder/');
}
setInterval(() => LIVE.ok && onRender(), 30000);   // the minutes go on without any event

// 1.4.18 (owner 06.11.2026): "Watch" on a running match of our servers - the LiveReplay add-on opens it in the game as a replay
// that keeps growing, a few minutes behind (livewatch.rs; the game fetches the replay from the ladder itself)
const lvComp = () => (S && S.components || []).find(c => String(c.id).replace(/_(r\d+|off)$/, '') === 'livereplay');
async function liveWatch(id, game) {
  if (!S || (S.os !== 'windows' && S.os !== 'linux')) { toast(t('rjOnlyWin'), true); return; }
  if (meBusy()) { toast(t('lvBusy'), true); return; }
  const c = lvComp();
  if (game === 'vanilla' && !S.vanilla_offered) { rjModal(t('lvAsk'), [t('rjVanNo')]); return; }
  try {
    let p = await invoke('live_watch_probe') || {};
    if (!c || !c.enabled || (game === 'vanilla' && !c.vanilla_ok)) {
      // the add-on is off: with the game closed the launcher turns it on (it comes with the start), else restart with it
      if (!c || (game === 'vanilla' && !c.vanilla_ok) || p.running) { rjModal(t('lvAsk'), [t('lvAddonOff')]); return; }
      const ok = await askBox(t('lvAsk'), [t('lvAddonOff')], [{ label: t('lvTurnOn'), cls: 'gold', val: 1 }, { label: t('rjCancel'), val: 0 }]);
      if (!ok) return;
      await invoke('set_component', { id: c.id, on: true }); await reload().catch(() => {});
      p = { running: false, games: [] };
    }
    const mine = (p.games || []).filter(g => !g.kind || g.kind === game);
    if (p.running && !mine.length && (p.games || []).length) { rjModal(t('lvAsk'), [t('lvWrongGame')]); return; }
    let wait = 0;
    if (!mine.length) {
      if (p.running) wait = 90;                                     // just started (its add-ons come later), or without the add-on
      else {
        wait = 240;
        if ((game === 'vanilla') !== VAN()) { try { S = await invoke('set_game_mode', { mode: game }); render(); } catch (e) { /* the chosen game then */ } }
        doPlay(false);
      }
    }
    toast(t(mine.length ? 'lvSent' : 'lvStarting'));
    await invoke('live_watch', { id, game, base: LIVE.host || 'https://rts.fintebtc.de', wait });
  } catch (e) { toast(String(e), true); }
}
listen('live_watch', e => {
  const v = e.payload || {};
  if (v.ev === 'waiting_game') toast(t('lvWaitGame'));
  else if (v.ev === 'accepted' || v.ev === 'fetching') toast(t('lvFetching'));
  else if (v.ev === 'starting' || v.ev === 'playing') toast(t('lvLoading'));
  else if (v.ev === 'failed') { const k = 'lvWhy_' + v.reason; rjModal(t('lvAsk'), [t('lvFailed', { why: T[lang][k] || T.en[k] ? t(k) : (v.reason || '?') })]); }
});


// ---------- feedback chat with the developers ----------
const FB = { pics: [], last: '', timer: null };
async function fbInit() {
  try {
    const i = await invoke('fb_info');
    $('fbName').value = i.name || ''; $('fbId').textContent = 'id ' + i.uid.slice(0, 8);
    diagNameFromProfile();   // an empty name: the signed-in profile's
  } catch (e) {}
  $('fbName').onchange = () => invoke('fb_set_name', { name: $('fbName').value });
  $('fbText').placeholder = t('fbPlaceholder');
  $('fbSend').onclick = fbSend;
  $('fbText').onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) fbSend(); };
  $('fbAttach').onclick = () => $('fbFile').click();
  $('fbFile').onchange = e => { [...e.target.files].forEach(fbAddFile); e.target.value = ''; };
  document.addEventListener('paste', e => {
    const items = [...(e.clipboardData?.items || [])].filter(i => i.type.startsWith('image/'));
    if (!items.length) return;
    e.preventDefault(); items.forEach(i => fbAddFile(i.getAsFile()));
  });
  fbWatch();
}
function fbAddFile(f) {
  if (!f) return;
  if (f.size > 8 << 20) return toast(t('fbTooBig'), true);
  const r = new FileReader();
  r.onload = () => { FB.pics.push(r.result); fbPics(); };
  r.readAsDataURL(f);
}
function fbPics() {
  $('fbPics').innerHTML = FB.pics.map((p, i) => `<div><img src="${p}"><b data-i="${i}">×</b></div>`).join('');
  $('fbPics').querySelectorAll('b').forEach(b => b.onclick = () => { FB.pics.splice(+b.dataset.i, 1); fbPics(); });
}
async function fbSend() {
  const text = $('fbText').value.trim();
  if (!text && !FB.pics.length) return;
  $('fbSend').disabled = true;
  try {
    await invoke('fb_set_name', { name: $('fbName').value });
    await invoke('fb_send', { text, images: FB.pics });
    $('fbText').value = ''; FB.pics = []; fbPics(); toast(t('fbSent')); fbLoad();
  } catch (e) { toast(e, true); }
  $('fbSend').disabled = false;
}
function fbWatch() {   // the developers' chat: asked every 20 s only while its tab is open and the window seen
  clearInterval(FB.timer); FB.timer = null;
  if (!FB.open || document.hidden) return;
  fbLoad(); FB.timer = setInterval(fbLoad, 20000);
}
document.addEventListener('visibilitychange', () => fbWatch());
async function fbLoad() {
  let d; try { d = await invoke('fb_thread'); } catch (e) { return; }
  const key = JSON.stringify(d.messages.map(m => m.id));
  if (key === FB.last) return; FB.last = key;
  const box = $('fbMsgs'), atEnd = box.scrollTop + box.clientHeight > box.scrollHeight - 30;
  const when = ts => new Date(ts * 1000).toLocaleString(lang, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  box.innerHTML = d.messages.length ? d.messages.map(m => `<div class="fb-m ${m.author === 'dev' ? 'dev' : 'me'}"><div class="w">${esc(m.author === 'dev' ? t('fbDev') : (m.name || t('fbMe')))} · ${when(m.ts)}</div>${esc(m.text)}` +
    m.images.map(f => `<img src="${d.img_base}${encodeURIComponent(f)}?uid=${encodeURIComponent(d.uid)}" data-u="${d.img_base}${encodeURIComponent(f)}?uid=${encodeURIComponent(d.uid)}">`).join('') + '</div>').join('')
    : `<div class="fb-empty">${esc(t('fbEmpty'))}</div>`;
  box.querySelectorAll('img').forEach(i => i.onclick = () => open(i.dataset.u));
  if (atEnd || !FB.shown) box.scrollTop = box.scrollHeight; FB.shown = true;
}
fbInit();

// ---------- players' chat, Steam sign-in and the player's card (ladder service /ladder/api/c/*) ----------
// Rooms General / RU / EN (the server's all / ru / en) next to the developers' chat.
const CH = { room: 'all', msgs: {}, out: [], unread: {}, full: {}, me: null, prof: null, waiting: false };
try { CH.room = localStorage.getItem('chRoom') || 'all'; } catch (e) {}
function chShowRoom() {
  document.querySelectorAll('.ch-tab').forEach(b => b.classList.toggle('on', b.dataset.room === CH.room));
  $('chatPane').classList.toggle('hidden', CH.room === 'dev');
  $('devPane').classList.toggle('hidden', CH.room !== 'dev');
  if (CH.room !== 'dev') { CH.chatRoom = CH.room; CH.unread[chKey(CH.room)] = 0; chRender(true); if (!CH.msgs[chKey(CH.room)]) chLoad(chKey(CH.room)); }
  chUnread(); FB.open = CH.room === 'dev'; fbWatch();
}
// the card above the news: avatar, name, 1v1 rating and games of the season (the stream's me); signed out - the Steam button
function chMe() {
  diagNameFromProfile();
  const me = CH.me && CH.me.signed_in ? CH.me : null, box = $('meBox');
  box.classList.toggle('hidden', !CH.me || CH.me.configured === false);
  box.classList.toggle('out', !me);
  if (me) {
    const p = CH.prof || {}, st = p.stats;
    const rating = p.rating || (LIVE.users[me.steam] || {}).rating;
    // no ladder place (#N): the server would build the whole season board for one player (plan, decision 4)
    const line = rating ? `<b>${Number(rating) | 0}</b> 1v1` : '';
    const games = !st ? '' : st.games ? `<div class="me-st" title="${esc(st.wins + ' – ' + st.losses)}">${esc(t('prGames', { n: st.games, pct: Math.round(100 * st.wins / st.games) }))}</div>`
      : `<div class="me-st">${esc(t('prNoGames'))}</div>`;
    // the name and the sign-out icon on one line, everything under the name on the same left edge
    box.innerHTML = avatar(me.avatar, 'me-av')
      + `<div class="me-info"><div class="me-top"><button class="nm" id="meName" title="${esc(t('chSignedIn', { name: me.name }))}">${esc(me.name || me.steam)}</button>`
      // my stats (my dossier on our stats page) next to the sign-out (siritos 02.11: where the stats link went)
      + `<button class="me-out me-stats" id="meStats" title="${esc(t('myStats'))}" aria-label="${esc(t('myStats'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg></button>`
      + `<button class="me-out" id="chOut" title="${esc(t('chLogout'))}" aria-label="${esc(t('chLogout'))}"><svg viewBox="0 0 24 24" aria-hidden="true">`
      + '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg></button></div>'
      + (line ? `<div class="me-rt">${line}</div>` : '') + games + '</div>';
    // my own name and avatar: the menu (no "mention": that is me)
    nickBind($('meName'), me.steam, ''); nickBind(box.querySelector('.me-av'), me.steam, '');
    $('chOut').onclick = chLogout;
    $('meStats').onclick = () => open((LIVE.host || 'https://dow2.fintebtc.de') + '/stats/?q=' + encodeURIComponent(me.steam) + '&lang=' + encodeURIComponent(lang));
  } else {
    // waiting for the browser: the button stays live (a new click opens Steam again), Cancel stops the wait
    box.innerHTML = `<div class="me-note">${esc(t(CH.waiting ? 'chWaiting' : 'prNote'))}</div><div class="me-act"><button class="btn gold small" id="chIn">${esc(CH.me && CH.me.local_name ? t('chLoginAs', { name: CH.me.local_name }) : t('chLogin'))}</button>`
      + (CH.waiting ? `<button class="me-cancel" id="chCancel">${esc(t('chCancel'))}</button>` : '') + '</div>';
    $('chIn').onclick = chLogin;
    if ($('chCancel')) $('chCancel').onclick = () => { invoke('c_login_cancel').catch(() => {}); CH.waiting = false; chMe(); };
  }
  $('chLoginRow').classList.toggle('hidden', !!me);
  $('chSendRow').classList.toggle('hidden', !me);
}
async function chLogin() {
  // the Steam account of this computer first: no browser (the Steam page does not open everywhere)
  let r = null;
  try { r = await invoke('c_login_local'); } catch (e) { r = { error: String(e) }; }
  try { localStorage.removeItem('chNoAuto'); } catch (e) {}
  if (r && r.signed_in) { CH.me = r; CH.waiting = false; chMe(); chHello(); chProfile(); toast(t('chSignedIn', { name: CH.me.name })); return; }
  // then the browser: the button stays live (a new click starts over), Cancel stops the wait
  CH.waiting = true; chMe();
  toast(r && r.need_browser ? t('chNeedBrowser') : r && r.no_steam ? t('chNoSteam') : t('chWaitLogin'));
  try {
    CH.me = await invoke('c_login'); CH.waiting = false; chMe(); chHello(); chProfile();
    toast(t('chSignedIn', { name: CH.me.name }));
  } catch (e) {
    if (String(e) === 'cancelled') return;   // a newer click or Cancel took over
    CH.waiting = false; chMe(); toast(t('chLoginFail') + ' ' + e, true);
  }
}
async function chLogout() { try { localStorage.setItem('chNoAuto', '1'); } catch (e) {} try { CH.me = await invoke('c_logout'); } catch (e) {} CH.prof = null; chMe(); }
async function chProfile() {
  if (!CH.me || !CH.me.signed_in) return;
  try { const d = await invoke('c_api', { path: 'me', body: {} }); if (d.ok) CH.prof = d; } catch (e) { return; }
  chMe();
}
// 1.3.12 (owner): a short beep when someone tags me (@my name) in the chat; Settings: "No sound when someone mentions me"
let chAudio = null;
function chBeep() {
  if (S && S.mute_mention) return;
  try {
    chAudio = chAudio || new (window.AudioContext || window.webkitAudioContext)();
    if (chAudio.state === 'suspended') chAudio.resume();
    const t0 = chAudio.currentTime;
    [[880, 0], [1320, 0.12]].forEach(([f, d]) => {
      const o = chAudio.createOscillator(), g = chAudio.createGain();
      o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(chAudio.destination);
      g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.25, t0 + d + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.11); o.start(t0 + d); o.stop(t0 + d + 0.12);
    });
  } catch (e) {}
}
document.addEventListener('pointerdown', () => { try { chAudio = chAudio || new (window.AudioContext || window.webkitAudioContext)(); if (chAudio.state === 'suspended') chAudio.resume(); } catch (e) {} });
function chMentionsMe(m) {
  const me = CH.me && CH.me.signed_in ? CH.me : null;
  if (!me || !me.name || m.steam === me.steam) return false;
  return String(chOrig(m) || '').toLowerCase().includes('@' + me.name.toLowerCase());
}
// Two kinds of server (siritos 02.11: on the live, older one the tabs changed nothing):
// - the new one (ladder 9f6817f) keeps one common chat: every message carries orig / ru / en, General shows the original,
//   RU and EN its translation - one list ("feed") for all three tabs, the tab only picks the language;
// - the older one has three rooms of their own (all / ru / en) and no translations - a list per tab, as in 1.3.15.
// Which one: the first messages tell (an "orig" field); until then the rooms of their own.
const chKey = room => CH.feed ? 'feed' : (room === 'ru' || room === 'en' ? room : 'all');
const chKeys = () => CH.feed ? ['feed'] : ['all', 'ru', 'en'];
function chFeedSeen(ms) {   // a message with "orig": the new server - the room lists become the one feed
  if (CH.feed || !(ms || []).some(m => m && m.orig !== undefined)) return;
  CH.feed = true;
  const all = [].concat(CH.msgs.all || [], CH.msgs.ru || [], CH.msgs.en || []);
  CH.msgs = {}; CH.full = {};
  chPut('feed', all.filter((m, i) => all.findIndex(x => x.id === m.id) === i));
  CH.unread = {}; chUnread();
}
const chOrig = m => m.orig || m.text;
const chText = m => CH.room === 'ru' ? (m.ru || chOrig(m)) : CH.room === 'en' ? (m.en || chOrig(m)) : chOrig(m);
// live: messages that just came (the stream, or the poll while it is down), not history - a mention of me beeps once (1.3.12)
function chPut(key, ms, live) {   // messages into a list in id order, each once; ours waiting in the queue are confirmed by their cid
  const list = CH.msgs[key] || (CH.msgs[key] = []);
  let changed = false, ping = false;
  CH.pinged = CH.pinged || new Set();
  for (const m of ms) {
    const i = list.findIndex(x => x.id === m.id);
    if (i >= 0) { list[i] = m; continue; }
    let j = list.length; while (j > 0 && list[j - 1].id > m.id) j--;
    list.splice(j, 0, m); changed = true;
    // ours waiting grey in the queue: confirmed by the cid (a new server), by the id the "say" answer gave, or - a server
    // that keeps neither - by our own text sent in the last minute
    const mine = CH.me && CH.me.signed_in && String(m.steam) === String(CH.me.steam);
    const done = o => (m.cid && o.cid === m.cid) || (o.id && o.id === m.id)
      || (o.state === 'sent' && mine && chOrig(m) === o.text && Math.abs((m.ts || 0) - o.ts) < 120);
    if (CH.out.some(done)) { const o = CH.out.find(done); CH.out = CH.out.filter(x => x !== o); chOutSave(); }
    if (live && chMentionsMe(m) && !CH.pinged.has(m.id)) { CH.pinged.add(m.id); ping = true; }
  }
  if (ping) chBeep();
  return changed;
}
// history: the last 100 at start, 100 older when scrolled to the top; after an id while the stream is down
async function chLoad(key, how) {
  // the feed is asked as "all": the server would cut a translated tab at the first message still being translated, here
  // the original shows until its msg_tr comes; a room of its own is asked as itself
  const room = key === 'feed' ? 'all' : key, list = CH.msgs[key] || [];
  const q = how === 'older' ? `limit=100&before=${list[0].id}` : how === 'new' && list.length ? `after=${list[list.length - 1].id}` : 'limit=100';
  let d; try { d = await invoke('c_api', { path: `msgs?room=${room}&${q}` }); } catch (e) { return; }
  if (!CH.feed && key !== 'feed') { chFeedSeen(d.msgs); if (CH.feed) key = 'feed'; }
  let changed = chPut(key, d.msgs || [], how === 'new');
  if ((d.deleted || []).length) { const n = CH.msgs[key].length; CH.msgs[key] = CH.msgs[key].filter(m => !d.deleted.includes(m.id)); changed = changed || n !== CH.msgs[key].length; }
  if (how === 'older') CH.full[key] = (d.msgs || []).length < 100;
  if ((changed || !CH.shown) && chKey(CH.room) === key) chRender(false, how === 'older');
}
function chRender(force, older) {
  const box = $('chMsgs'), key = chKey(CH.room), list = CH.msgs[key] || [];
  const atEnd = box.scrollTop + box.clientHeight > box.scrollHeight - 30, h0 = box.scrollHeight, top0 = box.scrollTop;
  const time = ts => new Date(ts * 1000).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  // a heading for every day: Today, Yesterday, 29 October (with the year when it is not this one)
  const dayKey = ts => { const d = new Date(ts * 1000); return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(); };
  const dayName = ts => {
    const d = new Date(ts * 1000), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return t('chToday');
    if (d.toDateString() === y.toDateString()) return t('chYesterday');
    return d.toLocaleDateString(lang, d.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const me = CH.me && CH.me.signed_in ? CH.me : null, mine = me ? me.steam : '';
  const myName = me ? (me.name || '') : '';
  // @mentions: the names of the players in this room (longest first, so "@Ab Cd" wins over "@Ab"), escaped like the text
  const names = [...new Set(list.map(m => m.name).filter(Boolean))].sort((a, b) => b.length - a.length);
  const mention = html => names.reduce((h, n) => h.split('@' + esc(n)).join(`\u0000${n === myName ? 1 : 0}${esc(n)}\u0001`), html)
    .replace(/\u0000([01])([^\u0001]*)\u0001/g, (_, me, n) => `<span class="ch-at${me === '1' ? ' me' : ''}">@${n}</span>`);
  let prev = null;
  const row = (m, extra, tail) => {
    const k = dayKey(m.ts), head = k !== prev ? `<div class="ch-day"><span>${esc(dayName(m.ts))}</span></div>` : ''; prev = k;
    const text = chText(m), tr = text !== chOrig(m);   // translated: the original on hover
    return head + `<div class="ch-m ${m.steam === mine ? 'mine' : ''} ${extra}"><span class="ch-av" data-steam="${esc(m.steam)}" data-name="${esc(m.name || '')}">` + avatar(m.avatar) + `</span>`
      + `<div><div class="w"><b data-name="${esc(m.name)}" data-steam="${esc(m.steam || '')}">${esc(m.name)}</b><span title="${esc(new Date(m.ts * 1000).toLocaleString(lang))}">${time(m.ts)}</span>${tail}</div>`
      + `<div class="tx ${tr ? 'tr' : ''}" ${tr ? `title="${esc(t('chOrig') + ': ' + chOrig(m))}"` : ''}>${mention(esc(text))}</div></div></div>`;
  };
  const sent = list.map(m => row(m, '', '')).join('');   // first: the day headings run on into the queue
  // ours not confirmed yet stay at the bottom: a clock while sending, "Not sent · Retry · Delete" when it failed
  const out = CH.out.filter(o => chKey(o.room) === key).map(o => row({ ts: o.ts, steam: mine, name: me ? me.name : '', avatar: me ? me.avatar : '', orig: o.text }, o.state === 'failed' ? 'failed' : o.state === 'sent' ? '' : 'sending',
    o.state === 'sent' ? '' : o.state === 'failed' ? `<span class="ch-fail">${esc(t('chNotSent'))} · <button data-retry="${esc(o.cid)}">${esc(t('chRetry'))}</button> · <button data-drop="${esc(o.cid)}">${esc(t('chDelete'))}</button></span>`
      : `<span class="ch-wait" title="${esc(t('chSending'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>`));
  const html = sent + out.join('');
  box.innerHTML = html || `<div class="ch-empty">${esc(t('chEmpty'))}</div>`;
  // the owner's 1.3.6 behaviour stays in the chat: a name tags the player, the avatar opens the Steam profile
  box.querySelectorAll('.ch-av[data-steam]').forEach(a => nickBind(a, a.dataset.steam, a.dataset.name));
  // the chat: a click on a name mentions the player (1.3.6), a right click and the avatar open the player menu
  box.querySelectorAll('b[data-name]').forEach(b => nickBind(b, b.dataset.steam, b.dataset.name, true));
  box.querySelectorAll('[data-retry]').forEach(b => b.onclick = () => { const o = CH.out.find(x => x.cid === b.dataset.retry); if (o) { o.state = 'sending'; o.tries = 0; chOutSave(); chRender(); chPump(); } });
  box.querySelectorAll('[data-drop]').forEach(b => b.onclick = () => { CH.out = CH.out.filter(x => x.cid !== b.dataset.drop); chOutSave(); chRender(); });
  if (older) box.scrollTop = box.scrollHeight - h0 + top0;   // older messages added on top: the view stays where it was
  else if (atEnd || force || !CH.shown) box.scrollTop = box.scrollHeight;
  CH.shown = true;
}
function chMention(name) {                                     // a click on a name in the chat tags that player in my message
  const el = $('chText'); if (!el || !name) return;
  const at = '@' + name + ' ', s0 = el.selectionStart ?? el.value.length, s1 = el.selectionEnd ?? s0;
  const before = el.value.slice(0, s0), pre = before && !/\s$/.test(before) ? ' ' : '';
  el.value = before + pre + at + el.value.slice(s1);
  const pos = (before + pre + at).length; el.focus(); el.setSelectionRange(pos, pos);
}
// unread messages on a tab the player is not looking at (RU and EN together: one feed)
function chUnread() {
  // rooms of their own: each tab its own number; one feed: the number on one tab only - the open one, or the last chat
  // tab while the developers' chat is open
  const at = CH.room === 'dev' ? (CH.chatRoom || 'all') : CH.room;
  document.querySelectorAll('.ch-tab').forEach(b => {
    const r = b.dataset.room;
    b.dataset.n = r === 'dev' ? '' : CH.feed ? (r === at ? (CH.unread.feed || '') : '') : (CH.unread[chKey(r)] || '');
  });
}
// sending: the message is in the feed at once with a clock, the box is cleared, the button never locks. One sender for
// all, in order; the same cid on every try, so a retry never makes a duplicate. The queue survives a restart.
function chOutSave() {
  try { localStorage.setItem('chOut', JSON.stringify(CH.out.map(({ cid, room, text, ts, state, id }) => ({ cid, room, text, ts, state, id })))); } catch (e) {}
}
function chSay() {
  if (CH.room === 'dev') return;
  const el = $('chText'), text = el.value.trim(); if (!text) return;
  const cid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  CH.out.push({ cid, room: CH.room, text, ts: Math.floor(Date.now() / 1000), state: 'sending', tries: 0 });
  el.value = ''; chOutSave(); chRender(true); chPump();
}
const chSleep = ms => new Promise(r => setTimeout(r, ms));
async function chPump() {
  if (CH.pumping) return; CH.pumping = true;
  try {
    for (let o; (o = CH.out.find(x => x.state === 'sending'));) {
      let r; try { r = await invoke('c_api', { path: 'say', body: { room: o.room, text: o.text, cid: o.cid } }); } catch (e) { r = { ok: false, error: String(e), retry: true }; }
      if (!CH.out.includes(o)) continue;                      // deleted, or confirmed by the stream meanwhile
      if (r.ok && r.msg) { CH.out = CH.out.filter(x => x !== o); chPut(chKey(o.room), [r.msg]); }
      else if (r.ok) {
        // accepted, the answer has no message (an older server): the copy is not dropped - it just turns normal at once
        // (siritos 02.11: it blinked out and came back seconds later); the server's copy takes its place quietly
        const me = CH.me || {};
        if (r.id) {
          CH.out = CH.out.filter(x => x !== o);
          chPut(chKey(o.room), [{ id: r.id, room: o.room, steam: me.steam, name: me.name, avatar: me.avatar, text: o.text, orig: o.text, ts: o.ts, cid: o.cid }]);
          chOutSave(); chRender();
          continue;
        }
        o.state = 'sent'; chOutSave(); chRender();
        await chLoad(chKey(o.room), 'new');
        setTimeout(() => { if (CH.out.includes(o) && o.state === 'sent') { CH.out = CH.out.filter(x => x !== o); chOutSave(); chRender(); } }, 300000);
        continue;
      }
      else if (r.retry_after) await chSleep(r.retry_after);    // too fast: wait as long as the server says
      else if (r.retry) {                                      // no answer (network, the 30 s of the check): 3 more tries, then "Not sent"
        o.tries = (o.tries || 0) + 1;
        if (o.tries > 3) o.state = 'failed'; else await chSleep([2000, 5000, 10000][o.tries - 1]);
      } else {                                                 // rejected (moderation, ban, signed out): the text back in the box, why in a toast
        CH.out = CH.out.filter(x => x !== o);
        if (!$('chText').value.trim()) $('chText').value = o.text;
        toast(r.error || 'error', true);
      }
      chOutSave(); chRender();
    }
  } finally { CH.pumping = false; }
}
// stream events of the chat and the own card
function chEvent(ev, d) {
  if (ev === 'msg') {
    chFeedSeen([d]);
    const key = chKey(d.room);
    if (!chPut(key, [d], true)) return;
    if (key !== chKey(CH.room) || CH.room === 'dev' || document.hidden) { CH.unread[key] = (CH.unread[key] || 0) + 1; chUnread(); }
    if (key === chKey(CH.room)) chRender();
  } else if (ev === 'msg_tr') {
    const m = (CH.msgs[chKey(CH.room)] || []).find(x => x.id === d.id);
    if (m) { m.ru = d.ru; m.en = d.en; if (CH.room === 'ru' || CH.room === 'en') chRender(); }
  } else if (ev === 'msg_del') {
    for (const k of Object.keys(CH.msgs)) CH.msgs[k] = CH.msgs[k].filter(m => m.id !== d.id);
    chRender();
  } else if (ev === 'reset') { CH.msgs[chKey(d.room)] = []; chLoad(chKey(d.room)); }
  else if (ev === 'me') { CH.prof = { ok: true, rating: d.rating, stats: { games: d.games, wins: d.wins, losses: d.losses } }; chMe(); }
}
// "I'm here" with menu / game: at start and when that changes (the stream itself keeps the presence)
async function chHello() {
  let d; try { d = await invoke('c_api', { path: 'hello', body: { state: S && S.game_running ? 'game' : 'menu' } }); } catch (e) { return; }
  if (d.signed_in === false && CH.me && CH.me.signed_in) { CH.me = await invoke('c_logout'); CH.prof = null; chMe(); }   // the session is gone on the server
}
// without the stream (not up in 30 s, or down): Online every 15 s and the chat every 5 s while the window is seen
const STREAM = { up: false, timer: null, poll: null, n: 0 };
function streamState(up) {
  STREAM.up = up; clearTimeout(STREAM.timer);
  if (up) { clearInterval(STREAM.poll); STREAM.poll = null; return; }
  STREAM.timer = setTimeout(() => {
    if (STREAM.up || STREAM.poll) return;
    STREAM.poll = setInterval(async () => {
      if (document.hidden) return;
      // without the stream the server does not see that the launcher is open: "I'm here" every 30 s (it forgets in 90)
      if (STREAM.n % 6 === 0) chHello();
      if (STREAM.n++ % 3 === 0) { try { onLive(await liveSnapshot()); } catch (e) { ON.err = true; onRender(); } }
      chKeys().forEach(k => chLoad(k, 'new'));
    }, 5000);
  }, 30000);
}
async function chInit() {
  try { CH.me = await invoke('c_status'); } catch (e) {}
  // the queue of the last run; one already accepted ("sent") is in the history by now - dropped after 10 minutes
  try { CH.out = JSON.parse(localStorage.getItem('chOut') || '[]').map(o => ({ ...o, tries: 0 })).filter(o => o.state !== 'sent' || Date.now() / 1000 - o.ts < 600); } catch (e) {}
  listen('c_ev', e => { const { e: ev, d } = e.payload; onEvent(ev, d); chEvent(ev, d); });
  listen('c_stream', e => { if (e.payload.host) LIVE.host = e.payload.host; streamState(e.payload.up); });
  document.querySelectorAll('.ch-tab').forEach(b => b.onclick = () => { CH.room = b.dataset.room; try { localStorage.setItem('chRoom', CH.room); } catch (e) {} chShowRoom(); });
  $('chIn2').onclick = chLogin;
  $('chSend').onclick = chSay;
  $('chText').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chSay(); } };
  $('chMsgs').onscroll = () => {   // at the top: 100 older ones
    const key = chKey(CH.room), box = $('chMsgs');
    if (box.scrollTop < 40 && !CH.full[key] && !CH.older && (CH.msgs[key] || []).length) { CH.older = true; chLoad(key, 'older').finally(() => { CH.older = false; }); }
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { CH.unread[chKey(CH.room)] = 0; chUnread(); } });
  chMe(); chShowRoom();
  // signed in by itself with the Steam account of this computer (no button, no browser, quiet on failure);
  // not after the player pressed "Sign out" - until they sign in again by hand
  let noAuto = false; try { noAuto = localStorage.getItem('chNoAuto') === '1'; } catch (e) {}
  if (!(CH.me && CH.me.signed_in) && CH.me && CH.me.local_found && CH.me.configured !== false && !noAuto) {
    try { const r = await invoke('c_login_local'); if (r && r.signed_in) { CH.me = r; chMe(); } } catch (e) {}
  }
  // the stream may already be up: the snapshot, the card and the history are read once here, the rest comes as events
  try { onLive(await liveSnapshot()); } catch (e) { ON.err = true; onRender(); }
  try { streamState(await invoke('c_stream_up')); } catch (e) { streamState(false); }
  chHello(); chProfile();
  chKeys().forEach(k => chLoad(k));
  if (CH.out.some(o => o.state === 'sending')) chPump();
}
chInit();

// ---------------- hotkeys ----------------
const HK = { data: null, edits: {}, grid: false, wait: null, dirty: false, open: new Set() };
const HK_GROUPS = ['space_marines', 'chaos_marines', 'eldar', 'orks', 'tyranids', 'imperial_guard', 'ordo_malleus', 't_tau', 'observer'];
const AB = [1, 2, 3, 4, 5, 6, 7].map(i => 'grid:AB_key_' + i);
const UC = r => [1, 2, 3, 4, 5, 6, 7].map(c => `grid:UC_Row${r}_Col${c}`);
const MAIN = ['attack', 'retreat', 'retreat_queue', 'repair', 'reinforce', 'overwatch', 'attackground', 'attackmelee', 'halt', 'stance', 'rally', 'unload',
  'retire', 'select_all', 'select_hq', 'select_hero', 'retreat_hero', 'retreat_all', 'retreat_beacon', 'next_primary_selection'];   // no system keys (menu, event cue)
const hkKey = b => b.scope + ':' + b.name;
const HK_RU = { attack: 'Атака', retreat: 'Отступление', retreat_queue: 'Отступление в очередь', repair: 'Ремонт', reinforce: 'Подкрепление', overwatch: 'Автоподкрепление',
  attackground: 'Атака по земле', attackmelee: 'Рукопашная атака', halt: 'Стоп', stance: 'Стойка', rally: 'Точка сбора', unload: 'Высадить', retire: 'Распустить',
  select_all: 'Выбрать всех', select_hq: 'Выбрать штаб', select_hero: 'Выбрать героя', retreat_hero: 'Отступление героя', retreat_all: 'Отступление всех',
  retreat_beacon: 'Маяк отступления', next_primary_selection: 'Следующий выбранный', event_cue_cycle: 'К последнему событию', systemmenu: 'Меню' };
const HK_EN = { overwatch: 'auto-reinforce' };   // the game's name says overwatch, the command is auto-reinforce
// A main command that each race also has as its own ability: the game's global "repair" is E, but every race's units
// repair with their own ability on P. The main row shows the key the races share and sets the global command and every
// race that follows it; a race changed on its own (in its group) keeps its key.
const HK_LINK = { repair: [':sm_repair_pvp', ':ork_repair', ':eld_repair', ':tau_repair'] };
const hkLinked = n => (HK_LINK[n] || []).filter(k => HK.data.map[k]);
// the key most of the linked races use: the shared one
function hkLinkVal(n) {
  const c = {}; hkLinked(n).forEach(k => { const v = hkVal(k); c[v] = (c[v] || 0) + 1; });
  return Object.keys(c).sort((a, b) => c[b] - c[a])[0];
}
// the keys a new key of the main row goes to: the global command and the races that still follow the shared key
function hkMulti(n) {
  const r = hkLinked(n); if (!r.length) return [];
  const v = hkLinkVal(n);
  return [':' + n].filter(k => HK.data.map[k]).concat(r.filter(k => hkVal(k) === v));
}
function hkVal(k) { const b = HK.data.map[k]; return k in HK.edits ? HK.edits[k] : b ? b.value : ''; }
function hkPretty(name) { return name.replace(/_/g, ' ').replace(/^AB key /, '').replace(/^UC Row(\d) Col(\d)/, 'row $1 · $2'); }
async function hkLoad() {
  try { const d = await invoke('hotkeys_get'); HK.data = d; HK.data.map = {}; d.bindings.forEach(b => HK.data.map[hkKey(b)] = b); HK.grid = d.grid; HK.edits = {}; hkRender(); }
  catch (e) { $('hkGridBox').innerHTML = `<div class="note">${esc(String(e))}</div>`; }
}
// with Grid Hotkeys on, the grid table re-assigns some commands (reinforce, melee, stance, repair) - those are the ones that work
function hkMainKey(n) { const r = hkLinked(n); if (r.length) { const v = hkLinkVal(n); return r.find(k => hkVal(k) === v); } return HK.grid && HK.data.map['grid:' + n] ? 'grid:' + n : ':' + n; }
function hkDups() {
  // keys used twice among commands that work at the same moment: a selected squad (main commands + abilities with the grid on);
  // building keys work only with a building selected - checked among themselves
  const groups = [MAIN.map(hkMainKey).concat(HK.grid ? AB : []), HK.grid ? UC(1).concat(UC(2), UC(3)) : []];
  const dup = new Set();
  groups.forEach(keys => { const seen = {};
    keys.filter(k => HK.data.map[k]).forEach(k => { const v = hkVal(k).toLowerCase(); if (!v) return; (seen[v] = seen[v] || []).push(k); });
    // only clashes the player made: the game's own defaults share some keys on purpose (context decides)
    Object.values(seen).forEach(ks => { if (ks.length > 1 && ks.some(k => hkVal(k) !== HK.data.map[k].default)) ks.forEach(k => dup.add(k)); }); });
  return dup;
}
function hkBtn(k, multi) {
  const b = HK.data.map[k]; if (!b) return '<span></span>';
  const chg = hkVal(k) !== b.default;
  return `<button class="kk${chg ? ' chg' : ''}" data-k="${esc(k)}"${multi && multi.length > 1 ? ` data-multi="${esc(multi.join(','))}"` : ''} title="${esc(b.name)} — ${esc(t('hkNone'))}: ${esc(b.default)}">${esc(hkVal(k))}</button>`;
}
function hkRender() {
  if (!HK.data) return;
  $('hkGrid').checked = HK.grid;
  const g = $('hkGridBox'); g.classList.toggle('off', !HK.grid);
  g.innerHTML = [[t('hkAb'), AB], [t('hkUc1'), UC(1)], [t('hkUc2'), UC(2)], [t('hkUc3'), UC(3)]]
    .map(([l, ks]) => `<span class="lbl">${esc(l)}</span>` + ks.map(hkBtn).join('')).join('');
  const label = n => lang === 'ru' && HK_RU[n] || HK_EN[n] || hkPretty(n);   // the full name (and the game's) on hover: long ones are cut
  $('hkMain').innerHTML = MAIN.filter(n => HK.data.map[hkMainKey(n)]).map(n => `<div class="hk-row"><span title="${esc(label(n) + '\n' + n)}">${esc(label(n))}</span>${hkBtn(hkMainKey(n), hkMulti(n))}</div>`).join('');
  // every key by group: each race and observer (the common orders and the grid are shown above). System keys (menu,
  // camera) are not to be reassigned,
  // campaign abilities and the "plain letters" table do nothing in multiplayer: not shown. A group opens on a click;
  // a search opens every group with a match.
  const q = ($('hkSearch').value || '').toLowerCase();
  const hit = b => !q || b.name.toLowerCase().includes(q) || hkVal(hkKey(b)).toLowerCase() === q || b.section.toLowerCase().includes(q);
  $('hkAllList').innerHTML = HK_GROUPS.map(gr => {
    const bs = HK.data.bindings.filter(b => b.group === gr && hit(b));
    if (!bs.length) return '';
    const open = q || HK.open.has(gr); let sec = '';
    // with Grid Hotkeys on the game takes these by the button's place (the grid keys above), not by the unit: dimmed and said so
    const shadow = s => HK.grid && /unit creation|unit abilities|hero abilities|unit upgrades|hero upgrades|hero wargear/i.test(s);
    const rows = !open ? '' : bs.map(b => (b.section !== sec ? `<div class="hk-sec${shadow(b.section) ? ' off' : ''}">${esc(sec = b.section)}`
        + (shadow(b.section) ? `<small>${esc(t('hkGridShadow'))}</small>` : '') + '</div>' : '')
      + `<div class="hk-row${shadow(b.section) ? ' off' : ''}"><span title="${esc(hkPretty(b.name) + '\n' + b.name)}">${esc(hkPretty(b.name))}</span>${hkBtn(hkKey(b))}</div>`).join('');
    const race = RACES.includes(gr), title = race ? t('race_' + gr) : t('hkGrpObserver');
    return `<div class="hk-grp${open ? ' open' : ''}"><button class="hk-gh" data-g="${gr}" aria-expanded="${!!open}">${race ? raceImg(gr) : ''}`
      + `<b>${esc(title)}</b><span>${bs.length}</span></button>${open ? `<div class="hk-list">${rows}</div>` : ''}</div>`;
  }).join('');
  $('hkAllList').querySelectorAll('.hk-gh').forEach(b => b.onclick = () => { const g = b.dataset.g; HK.open.has(g) ? HK.open.delete(g) : HK.open.add(g); hkRender(); });
  const dup = hkDups();
  document.querySelectorAll('#hotkeys .kk').forEach(el => { el.classList.toggle('dup', dup.has(el.dataset.k)); el.onclick = () => hkWait(el); });
  const n = Object.keys(HK.edits).filter(k => HK.edits[k] !== HK.data.map[k].value).length + HK.data.bindings.filter(b => b.value !== b.default && !(hkKey(b) in HK.edits)).length;
  $('hkState').textContent = HK.dirty ? t('hkUnsaved') : n ? t('hkCustom', { n }) : '';   // nothing changed: the Reset button next to it already says "as in the game"
  $('hkState').classList.toggle('warn', !!HK.dirty);
  $('hkSave').classList.toggle('hidden', !HK.dirty);   // only to retry a save that failed (the game was running)
}
function hkWait(el) {
  document.querySelectorAll('#hotkeys .kk.wait').forEach(x => { x.classList.remove('wait'); x.textContent = hkVal(x.dataset.k); });
  HK.wait = el.dataset.k; HK.waitAll = el.dataset.multi ? el.dataset.multi.split(',') : null; el.classList.add('wait'); el.textContent = t('hkPress');
}
const KEYMAP = { Space: 'Space', Tab: 'Tab', Enter: 'Enter', Backspace: 'Backspace', Comma: 'Comma', Period: 'Period', Slash: 'Slash', Semicolon: 'Semicolon',
  Quote: 'Apostrophe', BracketLeft: 'LBracket', BracketRight: 'RBracket', Backslash: 'Backslash', Minus: 'Minus', Equal: 'Equal', Backquote: 'Grave',
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Delete: 'Delete', Insert: 'Insert', Home: 'Home', End: 'End', PageUp: 'PageUp',
  PageDown: 'PageDown', Pause: 'Pause', CapsLock: 'CapsLock', NumpadAdd: 'NumpadPlus', NumpadSubtract: 'NumpadMinus', NumpadMultiply: 'NumpadMultiply',
  NumpadDivide: 'NumpadSlash', NumpadDecimal: 'NumpadPeriod' };
function dowKey(e) {
  let k = null; const c = e.code;
  if (/^Key[A-Z]$/.test(c)) k = c.slice(3); else if (/^Digit\d$/.test(c)) k = c.slice(5); else if (/^F([1-9]|1[0-2])$/.test(c)) k = c;
  else if (/^Numpad\d$/.test(c)) k = c; else k = KEYMAP[c] || null;
  if (!k) return null;
  return (e.ctrlKey ? 'Control+' : '') + (e.shiftKey ? 'Shift+' : '') + (e.altKey ? 'Alt+' : '') + k;
}
document.addEventListener('keydown', e => {
  if (!HK.wait) return;
  if (['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(e.code)) return;
  e.preventDefault(); e.stopPropagation();
  const ks = HK.waitAll || [HK.wait]; HK.wait = HK.waitAll = null;
  if (e.code !== 'Escape') { const v = dowKey(e); if (v) { ks.forEach(k => HK.edits[k] = v); HK.dirty = true; } }
  hkRender();
  if (HK.dirty) hkCommit();
}, true);
$('hkGrid').onchange = e => { HK.grid = e.target.checked; HK.dirty = true; hkRender(); hkCommit(); };
$('hkSearch').oninput = () => hkRender();
// every change is written at once: changes kept only in the window were lost on Play or on closing the launcher, while
// "your changes: N" already counted them (siritos 30.10). With the game running the file can't be written: the
// changes wait, marked, and the Save button retries.
async function hkCommit() {
  const dup = hkDups();
  try { const d = await invoke('hotkeys_save', { changes: HK.edits, grid: HK.grid }); HK.data = d; HK.data.map = {}; d.bindings.forEach(b => HK.data.map[hkKey(b)] = b); HK.grid = d.grid; HK.edits = {}; HK.dirty = false; hkRender();
    toast(dup.size ? t('hkSaved') + '. ' + t('hkDup', { k: [...dup].map(k => hkVal(k)).filter((v, i, a) => a.indexOf(v) === i).join(', ') }) : t('hkSaved'), !!dup.size); }
  catch (e) { hkRender(); toast(String(e), true); }
}
$('hkSave').onclick = hkCommit;
$('hkReset').onclick = async () => {
  try { const d = await invoke('hotkeys_reset'); HK.data = d; HK.data.map = {}; d.bindings.forEach(b => HK.data.map[hkKey(b)] = b); HK.grid = d.grid; HK.edits = {}; HK.dirty = false; hkRender(); toast(t('hkSaved')); }
  catch (e) { toast(String(e), true); }
};
// Settings: General, Network and servers (1.4.8: the game servers and the launcher's servers in one tab; the game servers are
// checked when it is first opened), Hotkeys (the bindings are read when the tab is first opened)
document.querySelectorAll('.set-tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.set-tab').forEach(x => x.classList.toggle('on', x === b));
  ['setMain', 'setNet', 'hotkeys'].forEach(id => $(id).classList.toggle('hidden', id !== b.dataset.set));
  if (b.dataset.set === 'hotkeys' && !HK.data) hkLoad();
  if (b.dataset.set === 'setNet' && !GN_OPENED) { GN_OPENED = true; if (!GN) gameNetCheck(); }
});

// ---------------- remove Elite completely ----------------
let unArmed = 0;
$('uninstall').onclick = async () => {
  const b = $('uninstall');
  if (Date.now() - unArmed > 6000) { unArmed = Date.now(); b.textContent = t('unSure'); setTimeout(() => { if (Date.now() - unArmed >= 6000) b.textContent = t('unBtn'); }, 6100); return; }
  unArmed = 0; b.disabled = true;
  try { const r = await invoke('uninstall_elite'); toast(t('unDone', { n: r.files })); refresh(); }
  catch (e) { toast(String(e), true); }
  b.disabled = false; b.textContent = t('unBtn');
};
