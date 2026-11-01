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
    "prRankT": "Place on the ladder (1v1, this season)",
    "chAll": "General",
    "chDev": "Developers",
    "chLogin": "Sign in with Steam",
    "chLogout": "Sign out",
    "chSignInToWrite": "Sign in with Steam to write in the chat.",
    "chPlaceholder": "Message… (Enter sends, Shift+Enter a new line)",
    "chMembers": "In the launcher",
    "chEmpty": "Quiet here. Say hi!",
    "chPending": "sending…",
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
    "lanTitle": "Local network",
    "lanShare": "Download Elite from other launchers on the local network and share it with them (faster; every file is checked against the signed version)",
    "hangTitle": "When the game hangs",
    "hangHelp": "Help when the game hangs: free the mouse, offer to close the game (or Ctrl+Alt+End), save a hang report for the developers. Works from outside the game - nothing is added to it",
    "crashDumps": "Save crash reports",
    "crashDumpsNote": "Windows writes a small report when the game crashes (asks for administrator rights once)",
    "crashDumpsOn": "crash reports are on",
    "hangAsk": "The game is not responding",
    "hangText": "No answer for {secs} s. The mouse is free again. You can wait or close the game.",
    "hangDump": "A hang report was saved - press \"Send logs\" so we can see where it stopped.",
    "hangKill": "Close the game",
    "hangWait": "Wait",
    "hangConfirm": "Press Ctrl+Alt+End once more to close the game",
    "trayOpen": "Open Elite Launcher",
    "trayQuit": "Quit",
    "cacheNote": "switching back to them is instant",
    "mirror": "Extra mirror (optional)",
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
    "conflictTitle": "This patch is already in your game folder",
    "conflictText": "Found a hand-installed copy: {files}. It conflicts with the launcher version, so the launcher keeps its own copy off while these files are there.",
    "conflictRemove": "Delete these files",
    "conflictKeep": "Leave as is",
    "conflictKeepNote": "Leave it as is and everything will work: the copy in the folder does the job.",
    "conflictActive": "Using the copy from the game folder (dow2-patches) — the launcher version is off",
    "conflictRemoved": "Deleted: {files}",
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
    "addonLater": "takes effect the next time the game starts",
    "launcherNew": "Elite Launcher {v} is out",
    "launcherUpdateBtn": "Update the launcher",
    "launcherUpdating": "Updating the launcher… {p}",
    "launcherFail": "Could not update the launcher: {e}",
    "noNews": "No news yet",
    "online": "Online",
    "onSearching": "Looking for a game",
    "onStateCreating": "Getting ready",
    "onStateLobby": "In the lobby",
    "onStatePlaying": "Playing",
    "onNobody": "Nobody is looking for a game. Start the game and press “Find a Game”.",
    "onOffline": "No connection to the ladder server, trying again…",
    "onIdle": "In the game, in the menu",
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
    "prRankT": "Место в ладдере (1v1, этот сезон)",
    "chAll": "Общий",
    "chDev": "Разработчикам",
    "chLogin": "Войти через Steam",
    "chLogout": "Выйти",
    "chSignInToWrite": "Чтобы писать в чат, войдите через Steam.",
    "chPlaceholder": "Сообщение… (Enter — отправить, Shift+Enter — новая строка)",
    "chMembers": "В лаунчере",
    "chEmpty": "Пока тихо. Напишите первым!",
    "chPending": "отправляется…",
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
    "lanTitle": "Локальная сеть",
    "lanShare": "Качать Elite с других лаунчеров в локальной сети и раздавать им (быстрее; каждый файл сверяется с подписанной версией)",
    "hangTitle": "Если игра зависла",
    "hangHelp": "Помощь при зависании игры: освободить мышь, предложить закрыть игру (или Ctrl+Alt+End), сохранить отчёт о зависании для разработчиков. Работает снаружи игры — в неё ничего не добавляется",
    "crashDumps": "Записывать отчёты о вылетах",
    "crashDumpsNote": "Windows сохраняет маленький отчёт, когда игра вылетает (один раз попросит права администратора)",
    "crashDumpsOn": "отчёты о вылетах включены",
    "hangAsk": "Игра не отвечает",
    "hangText": "Нет ответа уже {secs} с. Мышь освобождена. Можно подождать или закрыть игру.",
    "hangDump": "Отчёт о зависании сохранён — нажмите «Отправить логи», чтобы мы увидели, где она встала.",
    "hangKill": "Закрыть игру",
    "hangWait": "Подождать",
    "hangConfirm": "Нажмите Ctrl+Alt+End ещё раз, чтобы закрыть игру",
    "trayOpen": "Открыть Elite Launcher",
    "trayQuit": "Выход",
    "cacheNote": "переключение на них — мгновенно",
    "mirror": "Дополнительное зеркало (необязательно)",
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
    "conflictTitle": "Этот патч уже лежит в папке с игрой",
    "conflictText": "Найдена копия, поставленная вручную: {files}. Она будет конфликтовать с версией из лаунчера, поэтому пока эти файлы на месте, лаунчер свою копию не включает.",
    "conflictRemove": "Удалить эти файлы",
    "conflictKeep": "Оставить как есть",
    "conflictKeepNote": "Если оставить как есть — всё и так будет работать: копия в папке делает то же самое.",
    "conflictActive": "Работает копия из папки игры (dow2-patches) — версия лаунчера отключена",
    "conflictRemoved": "Удалено: {files}",
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
    "addonLater": "действует со следующего запуска игры",
    "launcherNew": "Вышел Elite Launcher {v}",
    "launcherUpdateBtn": "Обновить лаунчер",
    "launcherUpdating": "Обновляю лаунчер… {p}",
    "launcherFail": "Не удалось обновить лаунчер: {e}",
    "noNews": "Новостей пока нет",
    "online": "Онлайн",
    "onSearching": "Ищут игру",
    "onStateCreating": "Собирается",
    "onStateLobby": "В лобби",
    "onStatePlaying": "Идёт",
    "onNobody": "Никто не ищет игру. Запусти игру и нажми «Find a Game».",
    "onOffline": "Нет связи с сервером ладдера, пробую снова…",
    "onIdle": "В игре, в меню",
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
    "prRankT": "Puesto en el ladder (1v1, esta temporada)",
    "chAll": "General",
    "chDev": "Desarrolladores",
    "chLogin": "Entrar con Steam",
    "chLogout": "Salir",
    "chSignInToWrite": "Entra con Steam para escribir en el chat.",
    "chPlaceholder": "Mensaje… (Enter envía, Shift+Enter nueva línea)",
    "chMembers": "En el launcher",
    "chEmpty": "Todo tranquilo. ¡Saluda!",
    "chPending": "enviando…",
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
    "lanTitle": "Red local",
    "lanShare": "Descargar Elite de otros launchers de la red local y compartirlo con ellos",
    "hangTitle": "Si el juego se cuelga",
    "hangHelp": "Ayuda si el juego se cuelga: liberar el ratón, ofrecer cerrar el juego (o Ctrl+Alt+End), guardar un informe para los desarrolladores. Funciona desde fuera del juego: no se le añade nada",
    "crashDumps": "Guardar informes de cierres",
    "crashDumpsNote": "Windows guarda un informe pequeño cuando el juego se cierra de golpe (pide permisos de administrador una vez)",
    "crashDumpsOn": "informes de cierres activados",
    "hangAsk": "El juego no responde",
    "hangText": "Sin respuesta desde hace {secs} s. El ratón vuelve a estar libre. Puedes esperar o cerrar el juego.",
    "hangDump": "Se guardó un informe: pulsa \"Enviar registros\" para que veamos dónde se quedó.",
    "hangKill": "Cerrar el juego",
    "hangWait": "Esperar",
    "hangConfirm": "Pulsa Ctrl+Alt+End otra vez para cerrar el juego",
    "trayOpen": "Abrir Elite Launcher",
    "trayQuit": "Salir",
    "cacheNote": "volver a ellas es instantáneo",
    "mirror": "Espejo adicional (opcional)",
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
    "conflictTitle": "Este parche ya está en la carpeta del juego",
    "conflictText": "Se encontró una copia instalada a mano: {files}. Entra en conflicto con la versión del launcher, así que el launcher no activa la suya mientras estos archivos estén ahí.",
    "conflictRemove": "Borrar estos archivos",
    "conflictKeep": "Dejar como está",
    "conflictKeepNote": "Si lo dejas como está, todo funcionará igual: la copia de la carpeta hace el mismo trabajo.",
    "conflictActive": "Se usa la copia de la carpeta del juego (dow2-patches); la versión del launcher está desactivada",
    "conflictRemoved": "Borrado: {files}",
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
    "addonLater": "se aplica la próxima vez que inicies el juego",
    "launcherNew": "Ya está Elite Launcher {v}",
    "launcherUpdateBtn": "Actualizar el launcher",
    "launcherUpdating": "Actualizando el launcher… {p}",
    "launcherFail": "No se pudo actualizar el launcher: {e}",
    "noNews": "Aún no hay noticias",
    "online": "En línea",
    "onSearching": "Buscan partida",
    "onStateCreating": "Preparándose",
    "onStateLobby": "En el lobby",
    "onStatePlaying": "En curso",
    "onNobody": "Nadie busca partida. Inicia el juego y pulsa «Find a Game».",
    "onOffline": "Sin conexión con el servidor de la ladder, reintentando…",
    "onIdle": "En el juego, en el menú",
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
    "prRankT": "Place au classement (1v1, cette saison)",
    "chAll": "Général",
    "chDev": "Développeurs",
    "chLogin": "Se connecter avec Steam",
    "chLogout": "Se déconnecter",
    "chSignInToWrite": "Connectez-vous avec Steam pour écrire dans le chat.",
    "chPlaceholder": "Message… (Entrée envoie, Maj+Entrée nouvelle ligne)",
    "chMembers": "Dans le launcher",
    "chEmpty": "C'est calme. Dites bonjour !",
    "chPending": "envoi…",
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
    "lanTitle": "Réseau local",
    "lanShare": "Télécharger Elite depuis les autres launchers du réseau local et le partager avec eux",
    "hangTitle": "Si le jeu se fige",
    "hangHelp": "Aide si le jeu se fige : libérer la souris, proposer de fermer le jeu (ou Ctrl+Alt+Fin), enregistrer un rapport pour les développeurs. Fonctionne depuis l'extérieur du jeu : rien ne lui est ajouté",
    "crashDumps": "Enregistrer les rapports de plantage",
    "crashDumpsNote": "Windows enregistre un petit rapport quand le jeu plante (demande les droits administrateur une fois)",
    "crashDumpsOn": "rapports de plantage activés",
    "hangAsk": "Le jeu ne répond pas",
    "hangText": "Pas de réponse depuis {secs} s. La souris est libre. Vous pouvez attendre ou fermer le jeu.",
    "hangDump": "Un rapport a été enregistré : cliquez sur « Envoyer les journaux » pour que nous voyions où il s'est arrêté.",
    "hangKill": "Fermer le jeu",
    "hangWait": "Attendre",
    "hangConfirm": "Appuyez encore sur Ctrl+Alt+Fin pour fermer le jeu",
    "trayOpen": "Ouvrir Elite Launcher",
    "trayQuit": "Quitter",
    "cacheNote": "y revenir est instantané",
    "mirror": "Miroir supplémentaire (facultatif)",
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
    "conflictTitle": "Ce patch est déjà dans le dossier du jeu",
    "conflictText": "Une copie installée à la main a été trouvée : {files}. Elle entre en conflit avec la version du launcher, donc le launcher garde la sienne désactivée tant que ces fichiers sont là.",
    "conflictRemove": "Supprimer ces fichiers",
    "conflictKeep": "Laisser tel quel",
    "conflictKeepNote": "Si vous laissez tel quel, tout fonctionnera : la copie du dossier fait le même travail.",
    "conflictActive": "La copie du dossier du jeu (dow2-patches) est utilisée — la version du launcher est désactivée",
    "conflictRemoved": "Supprimé : {files}",
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
    "addonLater": "s’applique au prochain lancement du jeu",
    "launcherNew": "Elite Launcher {v} est disponible",
    "launcherUpdateBtn": "Mettre à jour le launcher",
    "launcherUpdating": "Mise à jour du launcher… {p}",
    "launcherFail": "Impossible de mettre à jour le launcher : {e}",
    "noNews": "Pas encore d’actualités",
    "online": "En ligne",
    "onSearching": "Cherchent une partie",
    "onStateCreating": "En préparation",
    "onStateLobby": "Dans le salon",
    "onStatePlaying": "En cours",
    "onNobody": "Personne ne cherche de partie. Lancez le jeu et appuyez sur « Find a Game ».",
    "onOffline": "Pas de connexion au serveur du ladder, nouvel essai…",
    "onIdle": "En jeu, dans le menu",
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
    "prRankT": "Platz in der Ladder (1v1, diese Saison)",
    "chAll": "Allgemein",
    "chDev": "Entwickler",
    "chLogin": "Mit Steam anmelden",
    "chLogout": "Abmelden",
    "chSignInToWrite": "Mit Steam anmelden, um im Chat zu schreiben.",
    "chPlaceholder": "Nachricht… (Enter sendet, Umschalt+Enter neue Zeile)",
    "chMembers": "Im Launcher",
    "chEmpty": "Noch still hier. Sag hallo!",
    "chPending": "wird gesendet…",
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
    "lanTitle": "Lokales Netzwerk",
    "lanShare": "Elite von anderen Launchern im lokalen Netzwerk laden und mit ihnen teilen",
    "hangTitle": "Wenn das Spiel hängt",
    "hangHelp": "Hilfe, wenn das Spiel hängt: Maus freigeben, Schließen anbieten (oder Strg+Alt+Ende), Bericht für die Entwickler speichern. Arbeitet von außerhalb des Spiels - ihm wird nichts hinzugefügt",
    "crashDumps": "Absturzberichte speichern",
    "crashDumpsNote": "Windows speichert einen kleinen Bericht, wenn das Spiel abstürzt (fragt einmal nach Administratorrechten)",
    "crashDumpsOn": "Absturzberichte sind an",
    "hangAsk": "Das Spiel reagiert nicht",
    "hangText": "Seit {secs} s keine Antwort. Die Maus ist wieder frei. Du kannst warten oder das Spiel schließen.",
    "hangDump": "Ein Bericht wurde gespeichert - klicke auf \"Logs senden\", damit wir sehen, wo es hing.",
    "hangKill": "Spiel schließen",
    "hangWait": "Warten",
    "hangConfirm": "Drücke Strg+Alt+Ende noch einmal, um das Spiel zu schließen",
    "trayOpen": "Elite Launcher öffnen",
    "trayQuit": "Beenden",
    "cacheNote": "zurückwechseln geht sofort",
    "mirror": "Zusätzlicher Mirror (optional)",
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
    "conflictTitle": "Dieser Patch liegt schon im Spielordner",
    "conflictText": "Eine von Hand installierte Kopie wurde gefunden: {files}. Sie kollidiert mit der Launcher-Version, daher lässt der Launcher seine eigene aus, solange diese Dateien da sind.",
    "conflictRemove": "Diese Dateien löschen",
    "conflictKeep": "So lassen",
    "conflictKeepNote": "Wenn du es so lässt, funktioniert trotzdem alles: die Kopie im Ordner erledigt dasselbe.",
    "conflictActive": "Die Kopie aus dem Spielordner (dow2-patches) wird verwendet – die Launcher-Version ist aus",
    "conflictRemoved": "Gelöscht: {files}",
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
    "addonLater": "gilt ab dem nächsten Spielstart",
    "launcherNew": "Elite Launcher {v} ist da",
    "launcherUpdateBtn": "Launcher aktualisieren",
    "launcherUpdating": "Launcher wird aktualisiert… {p}",
    "launcherFail": "Launcher konnte nicht aktualisiert werden: {e}",
    "noNews": "Noch keine Neuigkeiten",
    "online": "Online",
    "onSearching": "Suchen ein Spiel",
    "onStateCreating": "Wird vorbereitet",
    "onStateLobby": "In der Lobby",
    "onStatePlaying": "Läuft",
    "onNobody": "Niemand sucht ein Spiel. Starte das Spiel und drücke „Find a Game“.",
    "onOffline": "Keine Verbindung zum Ladder-Server, neuer Versuch…",
    "onIdle": "Im Spiel, im Menü",
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
let prog = null;       // last progress event

const t = (k, vars = {}) => (T[lang][k] || T.en[k] || k).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? '');
const L = x => x == null ? '' : typeof x === 'string' ? x : (x[lang] || x.en || Object.values(x)[0] || '');
const mb = b => b >= 1e9 ? (b / 1e9).toFixed(2) + ' GB' : (b / 1e6).toFixed(b < 1e7 ? 2 : 1) + ' MB';
const mbps = b => b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB/s' : Math.max(1, Math.round(b / 1e3)) + ' KB/s';
// a round avatar: the picture over the default figure, which shows while it loads, when it fails or when there is none
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

// "Version 0.7.0", plus the one the next update brings
function compVer(c) {
  const v = x => 'v' + String(x || '').replace(new RegExp('^' + c.id + '-'), '');
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

// add-on rows: a switch each and its own options under it once it is on; the details behind "?" on the home screen,
// written out on the Add-ons tab (full)
function compList(box, list, full) {
  const lock = S.busy || S.game_running;   // the game holds the add-on files while it runs
  const nameHtml = c => { const n = L(c.name) || c.id, m = n.match(/^(.+?)\s*\(([^()]+)\)$/); return m ? `${esc(m[1])}<small>${esc(m[2])}</small>` : esc(n); };
  box.innerHTML = (S.game_running ? `<div class="addon-note">${esc(t('gameRunningAddons'))}</div>` : '')
    + list.map(c => `<div class="addon ${c.enabled ? '' : 'off'}"><div class="addon-row"><span class="addon-name" title="${esc(L(c.name) || c.id)}">${nameHtml(c)}</span>`
      + (c.enabled && (c.conflicts || []).length ? `<span class="addon-warn" title="${esc(t('conflictActive'))}">!</span>` : '')
      + (full ? '' : `<button class="qm ${$('pop').dataset.id === c.id ? 'on' : ''}" data-info="${esc(c.id)}" aria-label="${esc(t('addonInfo', { name: L(c.name) || c.id }))}">?</button>`)
      + `<label class="switch"><input type="checkbox" role="switch" data-id="${esc(c.id)}" aria-label="${esc(L(c.name) || c.id)}" ${c.enabled ? 'checked' : ''} ${lock ? 'disabled' : ''}><i></i></label></div>`
      + (full ? (L(c.description) ? `<p class="addon-desc">${esc(L(c.description))}</p>` : '')
          + `<div class="addon-ver">${esc([compVer(c), t('addonLater')].filter(Boolean).join(' · '))}</div>`
          + (c.enabled && (c.conflicts || []).length ? `<div class="addon-note">${esc(t('conflictActive'))}</div>` : '') : '')
      + (c.enabled && (c.options || []).length ? '<div class="addon-opts">' + optsHtml(c, lock) + '</div>' : '')
      + '</div>').join('');
  box.querySelectorAll('.qm').forEach(b => b.onclick = e => { e.stopPropagation(); popAddon(b, list.find(c => c.id === b.dataset.info)); });
  box.querySelectorAll('input[data-opt]').forEach(cb => cb.onchange = () =>
    invoke('set_comp_option', { comp: cb.dataset.comp, opt: cb.dataset.opt, on: cb.checked }).then(reload).catch(e => toast(e, true)));
  box.querySelectorAll('select[data-opt]').forEach(sel => sel.onchange = () =>
    invoke('set_comp_value', { comp: sel.dataset.comp, opt: sel.dataset.opt, value: sel.value }).then(reload).catch(e => toast(e, true)));
  box.querySelectorAll('input[data-id]').forEach(cb => cb.onchange = async () => {
    const comp = list.find(c => c.id === cb.dataset.id);
    if (cb.checked && comp && (comp.conflicts || []).length) {
      const del = await askConflict(comp.conflicts);
      if (del) {
        try { toast(t('conflictRemoved', { files: (await invoke('remove_conflicts', { id: comp.id })).join(', ') })); }
        catch (e) { toast(e, true); }
      }
    }
    await invoke('set_component', { id: cb.dataset.id, on: cb.checked });
    if (S.installed_version) { try { await invoke('start_update', { repair: false, componentsOnly: true }); S.busy = true; render(); } catch (e) { toast(e, true); } }
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
  lang = S.lang || 'ru';                     // Russian unless the player picked another language in Settings
  if (!T[lang]) lang = 'en';
  document.documentElement.lang = lang;
  syncTrayLabels();
  document.querySelectorAll('[data-t]').forEach(e => e.textContent = t(e.dataset.t));
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
  const news = (cfg.news || []).map(n => ({ date: n.date || '', title: L(n.title), text: L(n.text), url: n.url }))
    .concat((S.release_news || []).map(n => ({ date: n.date, title: n.title, items: n.items || [], url: n.url })))
    .sort((x, y) => String(y.date).localeCompare(String(x.date))).slice(0, 12);
  $('news').innerHTML = news.map(n => (n.url ? `<a class="news-item" href="#" data-url="${esc(n.url)}">` : '<div class="news-item">')
    + `<div class="t">${esc(n.title)}</div>` + (n.date ? `<div class="d">${esc(day(n.date))}</div>` : '')
    + (n.text ? `<div class="x">${esc(n.text)}</div>` : '')
    + (n.items && n.items.length ? `<ul>${n.items.slice(0, 3).map(x => `<li>${esc(x)}</li>`).join('')}${n.items.length > 3 ? '<li>…</li>' : ''}</ul>` : '')
    + (n.url ? '</a>' : '</div>')).join('')
    || `<div class="news-empty">${esc(S.config_loaded ? t('noNews') : t('connecting'))}</div>`;
  $('news').querySelectorAll('[data-url]').forEach(el => el.onclick = e => { e.preventDefault(); open(el.dataset.url); });
  const more = cfg.news_more;
  $('newsMore').classList.toggle('hidden', !more?.url);
  if (more?.url) { $('newsMore').textContent = (L(more.title) || t('allNews')) + ' ›'; $('newsMore').onclick = () => open(more.url); }

  // links
  const links = cfg.links || [];
  $('linksBox').classList.toggle('hidden', !links.length);
  $('links').innerHTML = links.map((l, i) => `<button data-i="${i}">${esc(L(l.title))}</button>`).join('');
  $('links').querySelectorAll('button').forEach(b => b.onclick = () => open(links[+b.dataset.i].url));

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
  const item = c => {
    const isActive = activeCh && c.id === activeCh.id, isMain = c.id === S.main_channel;
    const cost = (S.costs || {})[c.version];
    const hint = isActive ? '✓' : cost === undefined ? t('needDl') : cost === 0 ? t('instant') : t('upTo', { s: mb(cost) });
    const tags = (isMain ? `<span class="tag main">${esc(t('main'))}</span>` : '') + (L(c.badge) && !isMain ? `<span class="tag beta">${esc(L(c.badge))}</span>` : '');
    const note = isMain ? t('mainNote') : L(c.description);
    return `<button class="vi ${isActive ? 'act' : ''}" data-id="${esc(c.id)}" ${isActive || locked ? 'disabled' : ''}><span class="nm"><b>${esc(L(c.name) || c.id)}</b>${tags}`
      + `${note ? `<small>${esc(note)}</small>` : ''}</span><span class="cost ${isActive || cost === 0 ? 'ok' : ''}"${isActive ? ` title="${esc(t('installedTag'))}"` : ''}>${esc(hint)}</span></button>`;
  };
  const live = chans.filter(c => !c.archive), arch = chans.filter(c => c.archive);
  $('verList').innerHTML = `<div class="lh">${esc(t('versions'))}</div>` + live.map(item).join('')
    + (arch.length ? `<div class="lh">${esc(t('archiveH'))}</div>` + arch.map(item).join('') : '');
  $('verList').querySelectorAll('.vi:not(:disabled)').forEach(b => b.onclick = () => { verOpen(false); switchTo(b.dataset.id); });
  const shown = activeCh || (!S.installed_version && mainCh);
  $('verBtn').innerHTML = shown
    ? `<b>${esc(L(shown.name) || shown.id)}</b><small class="${activeCh ? 'ok' : ''}">${esc(activeCh ? '✓ ' + t('installedTag') : t('notInstalledShort'))}</small>`
    // the installed version is in no channel any more (the main one moved on): "3.2" → "Elite 3.2"
    : `<b>${esc(/^\d/.test(S.installed_version) ? 'Elite ' + S.installed_version : S.installed_version || '—')}</b>${S.installed_version ? `<small class="ok">✓ ${esc(t('installedTag'))}</small>` : ''}`;
  $('verBtn').disabled = !chans.length;
  if (!chans.length) verOpen(false);
  const notMain = activeCh && mainCh && activeCh.id !== mainCh.id;
  $('verWarn').classList.toggle('hidden', !notMain);
  if (notMain) $('verWarn').textContent = t('youPlay', { name: L(activeCh.name) }) + ' ' + t('notMain', { name: L(mainCh.name) });

  // add-ons: only the game server on the home screen (or what launcher.json marks "home"), all of them on the Add-ons tab
  const comps = S.components || [];
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
  else if (!S.installed_version) { play.textContent = t('install'); play.classList.add('install'); play.disabled = !S.config_loaded; }
  else { play.textContent = t('play'); play.disabled = false; }
  play.onclick = () => (S.installed_version ? doPlay() : switchTo(S.main_channel || S.channel));

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
      : S.installed_version ? esc(t('ready', { v: activeCh ? L(activeCh.name).replace(/^Elite\s+/i, '') : S.installed_version })) : (S.config_loaded ? '' : esc(t('connecting')));
    const hint = L(cfg.launch?.[S.os]?.hint);
    $('statusMeta').textContent = [hint, winPath(S.game_dir)].filter(Boolean).join(' · ');
  }

  // settings
  $('gameDir').textContent = winPath(S.game_dir) || '—';
  $('lang').value = S.lang || '';
  $('cache').value = String(S.cache_mb);
  $('usage').checked = S.usage_stats !== false;
  $('lanShare').checked = S.lan_share !== false;
  $('hangHelp').checked = S.hang_help !== false;
  $('crashDumps').classList.toggle('hidden', !!S.crash_dumps || (S.os && S.os !== 'windows'));
  $('crashDumpsNote').textContent = S.crash_dumps ? t('crashDumpsOn') : t('crashDumpsNote');
  $('mirror').value = S.extra_mirror || '';
  $('mirrorInfo').textContent = t('mirrors', { n: S.mirror_count });
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

// the add-on is already installed by hand (stand-alone dow2-patches package): delete those files or keep them
function askConflict(files) {
  return new Promise(done => {
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `<div class="box"><h3>${esc(t('conflictTitle'))}</h3><p>${esc(t('conflictText', { files: files.join(', ') }))}</p>
      <p class="note">${esc(t('conflictKeepNote'))}</p><div class="row"><button class="btn red" id="cfDel">${esc(t('conflictRemove'))}</button>
      <button class="btn gold" id="cfKeep">${esc(t('conflictKeep'))}</button></div></div>`;
    document.body.appendChild(m);
    const close = v => { m.remove(); done(v); };
    m.querySelector('#cfDel').onclick = () => close(true);
    m.querySelector('#cfKeep').onclick = () => close(false);
  });
}

async function reload() { S = await invoke('get_status'); render(); }
async function refresh() {
  try { S = await invoke('refresh'); render(); } catch (e) { toast(e, true); return; }
  // add-ons follow their checkboxes on their own: install missing ones, remove unticked ones
  const comps = S.components || [];
  if (S.installed_version && !S.busy && !S.game_running && comps.some(c => { const want = c.enabled && !(c.conflicts || []).length; return want !== !!c.installed || (want && c.latest && c.installed && c.installed !== c.latest); })) {
    try { await invoke('start_update', { repair: false, componentsOnly: true }); S.busy = true; render(); } catch (e) { /* will retry next refresh */ }
  }
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

async function doPlay() {
  try { await invoke('play'); toast(t('starting')); } catch (e) { toast(e, true); }
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
listen('game_running', e => { if (!S) return; S.game_running = e.payload; render(); if (!e.payload) refresh(); chHello(); });   // "in the game" for the others right away, not at the next 30 s hello
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
});

document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('hidden', v.id !== b.dataset.view));
});
$('allComps').onclick = () => document.querySelector('.tab[data-view="addons"]').click();
$('cancel').onclick = () => invoke('cancel_update');
$('browse').onclick = pickDir;
$('openDir').onclick = () => invoke('open_game_dir').catch(e => toast(e, true));
$('lang').onchange = e => invoke('set_setting', { key: 'lang', value: e.target.value }).then(reload);
$('usage').onchange = e => invoke('set_setting', { key: 'usage_stats', value: e.target.checked }).then(reload);
$('lanShare').onchange = e => invoke('set_setting', { key: 'lan_share', value: e.target.checked }).then(reload);
$('hangHelp').onchange = e => invoke('set_setting', { key: 'hang_help', value: e.target.checked }).then(reload);
$('crashDumps').onclick = async () => { try { await invoke('enable_crash_dumps'); toast(t('crashDumpsOn')); reload(); } catch (e) { toast(e, true); } };
// the game does not answer (watchdog.rs): the launcher comes to the front over it - close it or wait
let hangBox = null, hangWaitUntil = 0;
listen('game_hang', e => {
  const v = e.payload || {};
  if (v.state === 'confirm_kill') { toast(t('hangConfirm')); return; }
  if (v.state !== 'hung') { if (hangBox) { hangBox.remove(); hangBox = null; } hangWaitUntil = 0; return; }
  if (Date.now() < hangWaitUntil) return;
  if (!hangBox) {
    hangBox = document.createElement('div'); hangBox.className = 'modal';
    hangBox.innerHTML = `<div class="box"><h3>${esc(t('hangAsk'))}</h3><p id="hgText"></p><p class="note" id="hgDump"></p>
      <div class="row"><button class="btn red" id="hgKill">${esc(t('hangKill'))}</button><button class="btn gold" id="hgWait">${esc(t('hangWait'))}</button></div></div>`;
    document.body.appendChild(hangBox);
    hangBox.querySelector('#hgKill').onclick = async () => { try { await invoke('kill_game'); } catch (err) { toast(err, true); } if (hangBox) { hangBox.remove(); hangBox = null; } };
    hangBox.querySelector('#hgWait').onclick = () => { hangWaitUntil = Date.now() + 30000; if (hangBox) { hangBox.remove(); hangBox = null; } };
  }
  hangBox.querySelector('#hgText').textContent = t('hangText', { secs: v.secs || 0 });
  hangBox.querySelector('#hgDump').textContent = v.dump ? t('hangDump') : '';
});
$('cache').onchange = e => invoke('set_setting', { key: 'cache_mb', value: +e.target.value }).then(reload);
$('saveMirror').onclick = () => invoke('set_setting', { key: 'extra_mirror', value: $('mirror').value.trim() }).then(refresh);
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
try { $('diagName').value = localStorage.getItem('diagName') || ''; } catch (e) {}
$('diagName').onchange = () => { try { localStorage.setItem('diagName', $('diagName').value.trim()); } catch (e) {} };
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

reload().then(refresh);
launcherCheck();
// every 15 minutes: new Elite versions, announcements and a newer launcher
setInterval(() => { if (S && !S.busy) refresh(); launcherCheck(); }, 15 * 60 * 1000);


// ---------- Online (home, above the add-ons): who is looking for a game, who is in a match ----------
// The same list the ladder page shows: /ladder/api/mm/live of the ladder service on the log hosts, every 15 seconds
// (every minute while the window is hidden). Only names here; the details are on the ladder page linked below the block.
const ON = { d: null, err: false, timer: null, shut: new Set(), users: [] };   // users: who has the launcher open (from the players' chat "hello")
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
// the ladder server knows no avatars: take it from the launcher list (the chat "hello") or the signed-in card, by SteamID
const onAv = p => {
  if (p.avatar || !p.steam) return p.avatar || '';
  const me = CH.me && CH.me.signed_in ? [CH.me] : [];
  const u = [...ON.users, ...me].find(u => String(u.steam) === String(p.steam));
  return u ? u.avatar : '';
};
// the 1v1 rating; none yet (no ladder games this season) - a dash, so the dots after it stay in one column
const onRt = r => r ? `<span class="rt">${Number(r) | 0}</span>` : `<span class="rt none" title="${esc(t('prNoGames'))}">—</span>`;
const onWho = p => `<button class="nm" data-steam="${esc(p.steam || '')}" title="${esc(p.steam ? 'Steam ' + p.steam : '')}">${esc(p.name || 'Player')}</button>`;

function onRender() {
  if (!S) return;
  const d = ON.d, look = (d?.searching || []).filter(p => p.mode !== 'watch'), matches = d?.matches || [];   // spectators wait to watch, not to play
  // a group folds on a click on its heading
  const group = (key, title, n, body) => {
    const open = !ON.shut.has(key);
    return `<div class="on-g ${key} ${open ? '' : 'shut'}"><button class="on-gh" data-g="${key}" aria-expanded="${open}" ${body ? '' : 'disabled'}>`
      + `<i></i>${esc(title)}<span>${esc(String(n))}</span>${body ? '<b class="chev"></b>' : ''}</button>${open ? body : ''}</div>`;
  };
  const st = { creating: 'onStateCreating', lobby: 'onStateLobby', playing: 'onStatePlaying' };
  let html = '';
  // first load: grey rows in place of the names; no answer: say so
  if (!d) html = ON.err ? `<div class="on-empty">${esc(t('onOffline'))}</div>`
    : `<div class="on-skel" role="status" aria-label="${esc(t('onLoading'))}">${'<div><i></i><b></b></div>'.repeat(5)}</div>`;
  else {
    if (ON.err) html += `<div class="on-stale">${esc(t('onOffline'))}</div>`;   // the last list stays, marked as old
    // looking for a game: avatar, name, race, the mode on the right
    if (look.length) html += group('look', t('onSearching'), look.length,
      look.map(p => `<div class="on-p">${avatar(onAv(p))}${onWho(p)}${raceImg(p.race)}<span class="tag">${esc(p.mode)}</span></div>`).join(''));
    if (!look.length && !matches.length) html += `<div class="on-empty">${esc(t('onNobody'))}</div>`;
    // who has the launcher open (signed in with Steam): the avatar, the 1v1 rating and a dot for menu / game / search / match;
    // those already named above (looking for a game) or below (playing in a match) are not named twice
    const sid = p => String(p.steam || '');
    const players = matches.flatMap(m => [...(m.team1 || []), ...(m.team2 || [])]);
    const shown = new Set([...look, ...players].map(sid).filter(Boolean));
    const users = ON.users.filter(u => !shown.has(sid(u)));
    if (users.length) html += group('launcher', t('chMembers'), users.length, users.map(u => '<div class="on-p on-u">'
      + avatar(u.avatar) + onWho(u)
      + onRt(u.rating) + `<span class="st st-${esc(u.state)}" title="${esc(t('st_' + u.state))}"></span></div>`).join(''));
    // the last group, only a number: games that talked to the ladder server in the last minute (the number on the ladder
    // page) minus those looking for a game or watching, those in a match and those already named above with the game on
    const inMatches = matches.reduce((n, m) => n + (m.team1 || []).length + (m.team2 || []).length + (m.watchers || []).length, 0);
    const counted = new Set([...(d.searching || []), ...matches.flatMap(m => m.watchers || []), ...players].map(sid).filter(Boolean));
    const named = users.filter(u => u.state === 'game' && !counted.has(sid(u))).length;   // not subtracted twice
    html += group('idle', t('onIdle'), Math.max(0, (Number(d.online) || 0) - (d.searching || []).length - inMatches - named), '');
    // in a match, the last group and the biggest: a card per match - mode, map, how long - and who plays which race, team against team
    const pl = p => `<div class="on-p">${avatar(onAv(p))}${onWho(p)}${raceImg(p.race)}${onRt(p.rating)}</div>`;
    const map = m => String(m || '').replace(/^\d+p_/i, '').replace(/_/g, ' ');
    if (matches.length) html += group('match', t('onInMatchH'), matches.reduce((n, m) => n + (m.team1 || []).length + (m.team2 || []).length, 0),
      matches.map(m => `<div class="on-mc"><div class="on-mh"><span class="tag ${esc(m.state)}">${esc(m.mode)}</span><span class="map">${esc(map(m.map))}</span>`
        + `<span class="since">${esc(t(st[m.state] || 'onStateCreating'))}${m.state === 'playing' && m.since ? ' · ' + esc(t('onMin', { n: Math.round(m.since / 60) })) : ''}</span></div>`
        + (m.team1 || []).map(pl).join('') + '<div class="vs">vs</div>' + (m.team2 || []).map(pl).join('') + '</div>').join(''));
  }
  $('onGroups').innerHTML = html;
  $('onGroups').querySelectorAll('.nm[data-steam]').forEach(b => b.onclick = () => b.dataset.steam && open('https://steamcommunity.com/profiles/' + b.dataset.steam));
  $('onGroups').querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
    ON.shut.has(b.dataset.g) ? ON.shut.delete(b.dataset.g) : ON.shut.add(b.dataset.g);
    try { localStorage.setItem('onShut', JSON.stringify([...ON.shut])); } catch (e) {}
    onRender();
  });
  $('onLadder').classList.toggle('hidden', !d?.host);
  $('onLadder').onclick = () => open((ON.d?.host || '') + '/ladder/');
}
async function onLoad() {
  try { ON.d = await invoke('online_live'); ON.err = false; }
  catch (e) { ON.err = true; }
  onRender();
}
function onPoll() {
  clearTimeout(ON.timer);
  onLoad().finally(() => { ON.timer = setTimeout(onPoll, document.hidden ? 60000 : 15000); });
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) onPoll(); });
onPoll();


// ---------- feedback chat with the developers ----------
const FB = { pics: [], last: '', timer: null };
async function fbInit() {
  try {
    const i = await invoke('fb_info');
    $('fbName').value = i.name || ''; $('fbId').textContent = 'id ' + i.uid.slice(0, 8);
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
  fbLoad(); FB.timer = setInterval(fbLoad, 20000);
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
const CH = { room: 'all', last: {}, msgs: {}, pending: {}, me: null, prof: null, waiting: false, timer: null };   // pending: sent, not yet back from the server
try { CH.room = localStorage.getItem('chRoom') || 'all'; } catch (e) {}
function chShowRoom() {
  document.querySelectorAll('.ch-tab').forEach(b => b.classList.toggle('on', b.dataset.room === CH.room));
  $('chatPane').classList.toggle('hidden', CH.room === 'dev');
  $('devPane').classList.toggle('hidden', CH.room !== 'dev');
  if (CH.room !== 'dev') { chRender(true); chLoad(); }
}
// the card above the news: avatar, name, 1v1 rating, place and games of the season; signed out - the Steam button
function chMe() {
  const me = CH.me && CH.me.signed_in ? CH.me : null, box = $('meBox');
  box.classList.toggle('hidden', !CH.me || CH.me.configured === false);
  box.classList.toggle('out', !me);
  if (me) {
    const p = CH.prof || {}, st = p.stats;
    const rating = p.rating || (ON.users.find(u => u.steam === me.steam) || {}).rating;
    const line = [rating ? `<b>${Number(rating) | 0}</b> 1v1` : '', st && st.rank ? `<span title="${esc(t('prRankT'))}">#${Number(st.rank) | 0}</span>` : ''].filter(Boolean).join(' · ');
    const games = !st ? '' : st.games ? `<div class="me-st" title="${esc(st.wins + ' – ' + st.losses)}">${esc(t('prGames', { n: st.games, pct: Math.round(100 * st.wins / st.games) }))}</div>`
      : `<div class="me-st">${esc(t('prNoGames'))}</div>`;
    box.innerHTML = avatar(me.avatar, 'me-av')
      + `<div class="me-info"><button class="nm" id="meName" title="${esc(t('chSignedIn', { name: me.name }))}">${esc(me.name || me.steam)}</button>`
      + (line ? `<div class="me-rt">${line}</div>` : '') + games + `</div><button class="me-out" id="chOut">${esc(t('chLogout'))}</button>`;
    $('meName').onclick = () => open('https://steamcommunity.com/profiles/' + me.steam);
    $('chOut').onclick = chLogout;
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
async function chLoad(room) {
  const r = room || CH.room; if (r === 'dev') return;
  let d; try { d = await invoke('c_api', { path: `msgs?room=${r}&after=${CH.last[r] || 0}` }); } catch (e) { return; }
  const list = CH.msgs[r] || (CH.msgs[r] = []);
  let changed = false;
  for (const m of d.msgs || []) if (!list.some(x => x.id === m.id)) { list.push(m); changed = true; }
  if ((d.deleted || []).length) { const n = list.length; CH.msgs[r] = list.filter(m => !d.deleted.includes(m.id)); changed = changed || n !== CH.msgs[r].length; }
  const l2 = CH.msgs[r]; if (l2.length > 2000) l2.splice(0, l2.length - 2000);
  if (l2.length) CH.last[r] = Math.max(CH.last[r] || 0, l2[l2.length - 1].id);
  if (r === CH.room && (changed || !CH.shown)) chRender();
}
function chRender(force) {
  const box = $('chMsgs'), list = CH.msgs[CH.room] || [];
  const atEnd = box.scrollTop + box.clientHeight > box.scrollHeight - 30;
  const time = ts => new Date(ts * 1000).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  // a heading for every day: Today, Yesterday, 29 October (with the year when it is not this one)
  const dayKey = ts => { const d = new Date(ts * 1000); return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(); };
  const dayName = ts => {
    const d = new Date(ts * 1000), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return t('chToday');
    if (d.toDateString() === y.toDateString()) return t('chYesterday');
    return d.toLocaleDateString(lang, d.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const mine = CH.me && CH.me.signed_in ? CH.me.steam : '';
  const myName = CH.me && CH.me.signed_in ? (CH.me.name || '') : '';
  // @mentions: the names of the players in this room (longest first, so "@Ab Cd" wins over "@Ab"), escaped like the text
  const names = [...new Set(list.map(m => m.name).filter(Boolean))].sort((a, b) => b.length - a.length);
  const mention = html => names.reduce((h, n) => h.split('@' + esc(n)).join(`\u0000${n === myName ? 1 : 0}${esc(n)}\u0001`), html)
    .replace(/\u0000([01])([^\u0001]*)\u0001/g, (_, me, n) => `<span class="ch-at${me === '1' ? ' me' : ''}">@${n}</span>`);
  let prev = null;
  const pend = (CH.pending[CH.room] || []).map(p => `<div class="ch-m mine pending">` + avatar(CH.me && CH.me.avatar)
    + `<div><div class="w"><b>${esc((CH.me && CH.me.name) || '')}</b><span>${esc(t('chPending'))}</span></div><div class="tx">${esc(p.text)}</div></div></div>`).join('');
  box.innerHTML = (list.length || pend) ? list.map(m => {
    const k = dayKey(m.ts), head = k !== prev ? `<div class="ch-day"><span>${esc(dayName(m.ts))}</span></div>` : ''; prev = k;
    return head + `<div class="ch-m ${m.steam === mine ? 'mine' : ''}"><span class="ch-av" data-steam="${esc(m.steam)}" title="Steam">` + avatar(m.avatar) + `</span>`
      + `<div><div class="w"><b data-name="${esc(m.name)}">${esc(m.name)}</b><span title="${esc(new Date(m.ts * 1000).toLocaleString(lang))}">${time(m.ts)}</span></div><div class="tx">${mention(esc(m.text))}</div></div></div>`;
  }).join('') + pend : `<div class="ch-empty">${esc(t('chEmpty'))}</div>`;
  box.querySelectorAll('.ch-av[data-steam]').forEach(a => a.onclick = () => open('https://steamcommunity.com/profiles/' + a.dataset.steam));
  box.querySelectorAll('b[data-name]').forEach(b => b.onclick = () => chMention(b.dataset.name));
  if (atEnd || force || !CH.shown) box.scrollTop = box.scrollHeight; CH.shown = true;
}
function chMention(name) {                                     // a click on a name in the chat tags that player in my message
  const el = $('chText'); if (!el || !name) return;
  const at = '@' + name + ' ', s0 = el.selectionStart ?? el.value.length, s1 = el.selectionEnd ?? s0;
  const before = el.value.slice(0, s0), pre = before && !/\s$/.test(before) ? ' ' : '';
  el.value = before + pre + at + el.value.slice(s1);
  const pos = (before + pre + at).length; el.focus(); el.setSelectionRange(pos, pos);
}
async function chSay() {
  if (CH.sending || CH.room === 'dev') return;                 // one send at a time: extra Enter presses do nothing (no duplicates)
  const el = $('chText'), text = el.value.trim(); if (!text) return;
  CH.sending = true; $('chSend').disabled = true;
  el.value = '';                                               // clear at once: the message leaves the box the moment you press Enter
  const room = CH.room, p = { text }, pl = CH.pending[room] || (CH.pending[room] = []);
  pl.push(p); chRender(true);                                  // in the chat at once, grey, until the server has published it
  const drop = () => { const i = pl.indexOf(p); if (i >= 0) pl.splice(i, 1); };
  try {
    const r = await invoke('c_api', { path: 'say', body: { room, text } });
    if (r.ok) { await chLoad(room); drop(); if (room === CH.room) chRender(true); }   // the published one takes its place
    else { drop(); chRender(); el.value = text; toast(r.error || 'error', true); }  // rejected by moderation: the text back in the box
  } catch (e) { drop(); chRender(); el.value = text; toast(e, true); }
  CH.sending = false; $('chSend').disabled = false;
}
async function chHello() {
  let d; try { d = await invoke('c_api', { path: 'hello', body: { state: S && S.game_running ? 'game' : 'menu' } }); } catch (e) { return; }
  if (d.signed_in === false && CH.me && CH.me.signed_in) { CH.me = await invoke('c_logout'); CH.prof = null; chMe(); }   // the session is gone on the server
  ON.users = d.online || []; onRender();       // shown in the Online block on the right
  if (CH.me && CH.me.signed_in && !CH.prof) chMe();   // the rating from this list until the profile answers
}
async function chInit() {
  try { CH.me = await invoke('c_status'); } catch (e) {}
  document.querySelectorAll('.ch-tab').forEach(b => b.onclick = () => { CH.room = b.dataset.room; try { localStorage.setItem('chRoom', CH.room); } catch (e) {} chShowRoom(); });
  $('chIn2').onclick = chLogin;
  $('chSend').onclick = chSay;
  $('chText').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chSay(); } };
  chMe(); chShowRoom();
  // signed in by itself with the Steam account of this computer (no button, no browser, quiet on failure);
  // not after the player pressed "Sign out" - until they sign in again by hand
  let noAuto = false; try { noAuto = localStorage.getItem('chNoAuto') === '1'; } catch (e) {}
  if (!(CH.me && CH.me.signed_in) && CH.me && CH.me.local_found && CH.me.configured !== false && !noAuto) {
    try { const r = await invoke('c_login_local'); if (r && r.signed_in) { CH.me = r; chMe(); } } catch (e) {}
  }
  chHello(); chProfile();
  ['all', 'ru', 'en'].forEach(r => r !== CH.room && chLoad(r));          // every room's history at once: switching tabs is instant
  setInterval(() => chLoad(), 5000); setInterval(chHello, 30000); setInterval(chProfile, 10 * 60 * 1000);
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
// Settings has two tabs, General and Hotkeys (the bindings are read when the tab is first opened)
document.querySelectorAll('.set-tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.set-tab').forEach(x => x.classList.toggle('on', x === b));
  ['setMain', 'hotkeys'].forEach(id => $(id).classList.toggle('hidden', id !== b.dataset.set));
  if (b.dataset.set === 'hotkeys' && !HK.data) hkLoad();
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
