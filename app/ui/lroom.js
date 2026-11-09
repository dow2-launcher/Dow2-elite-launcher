// Launcher rooms (owner 05.11.2026): a lobby in the launcher like the game's own - the map, who plays in which team with which
// race and hero, everybody presses Ready, a 10 s countdown (any "not ready" stops it), then the game starts for everyone and
// they all land in one match; the room shows who reaches which of our servers, everybody's pings and the server the match uses.
// The room lives on the ladder (lroom.py), its changes come on the live stream ("lroom" = the room's whole view). lroom.rs: the
// calls (token added there), the pings, the launch over MMFind's pipe. Loaded after app.js (its t, esc, invoke, listen, S, CH...).
'use strict';
Object.assign(T.en, {
  lrTitle: 'Launcher rooms', lrNote: 'Set up a match here: the map, the teams, everybody\'s race and hero. When all are ready, a 10 s countdown - then the game starts for everyone and you all land in this match (our servers, not rated).',
  lrCreate: 'Create a room', lrNone: 'No rooms yet - create one and send its name to your friends.', lrJoin: 'Join', lrFull: 'full', lrPlaying: 'playing',
  lrSignIn: 'Sign in with Steam (the chat on the main page) to create or join a room.', lrSignInBtn: 'Sign in',
  lrLeave: 'Leave the room', lrTeam: 'Team {n}', lrFree: 'Open slot', lrSit: 'Take this slot', lrKick: 'Remove from the room', lrOwner: 'Room owner',
  lrReady: 'Ready', lrNotReady: 'Not ready', lrIsReady: 'ready', lrWaiting: 'not ready', lrAway: 'launcher closed',
  lrMap: 'Map', lrMode: 'Mode', lrRace: 'Race', lrHero: 'Hero', lrRandomHero: 'Random hero', lrName: 'Room name',
  lrNet: 'Our servers from each player', lrNetPick: 'The match will play on: {node} (the worst delay {ms} ms)', lrNetMeasuring: 'Measuring the delays…',
  lrNetNone: 'None of our servers is reached by every player: the game will try the first one, a player who can not reach it may drop.',
  lrNetVia: 'through {node}', lrNetNoStream: 'answers, but the stream does not come through', lrNetMs: '{ms} ms', lrNetAgain: 'Measure again',
  lrCd: 'All ready - the game starts in {n} s', lrCdHint: 'Press Not ready to stop it.', lrNeedAll: 'Waiting for every slot to be taken and everybody to be ready.',
  lrLaunching: 'Starting the games…', lrCancel: 'Cancel the start', lrPlayingNow: 'The match is on. After it you are back in this room.',
  lrWhyAddon: 'Turn on the add-on “Automatch v2.0” in Add-ons - the room\'s match goes through it.', lrWhyVer: 'This room is for Elite {v}, you have Elite {mine}.',
  lrWhyOs: 'Rooms work on Windows and Linux.', lrWhyVan: 'This room is for vanilla Retribution - the launcher here has no vanilla game.',
  g_starting: 'starting the game', g_waiting_game: 'waiting for the game', g_accepted: 'the game took it', g_walking: 'to Find a Game', g_army: 'setting the army',
  g_searching: 'in the search', g_matched: 'match made', g_room: 'host\'s room up', g_in_room: 'in the room', g_loading: 'loading', g_playing: 'playing', g_failed: 'failed',
  n_joined: '{who} joined the room.', n_left: '{who} left the room.', n_gone: '{who} closed the launcher and is out of the room.', n_kicked: '{who} was removed from the room.',
  n_unready: '{who} is not ready - the countdown stopped.', n_changed: '{who} changed the army or the slot - the countdown stopped.', n_conf: '{who} changed the room - everybody presses Ready again.',
  n_cd_stop: 'The countdown stopped.', n_late: 'Not everybody got into the search in {secs} s ({who}) - the start is off.', n_version: 'Another version of the game or the mod: {who} - the start is off.',
  n_match: 'The match did not come together ({why}){who2} - the start is off.', n_left_search: '{who} stopped the search - the start is off.', n_cancel: '{who} cancelled the start.',
  n_game_failed: 'The game of {who} could not start the search ({why}) - the start is off.', n_played: 'The match is over - welcome back. Press Ready for another one.',
  e_full: 'The room is full.', e_state: 'The room is starting a match right now.', e_kicked: 'You were removed from this room - wait a bit.', e_busy: 'Finish the start of your room first.',
  e_no_room: 'The room is gone.', e_auth: 'Sign in with Steam first.', e_owner: 'Only the room owner can change that.', e_too_many_players: 'Too many players for that mode.', e_bad: 'Not possible.',
  gf_no_pipe: 'the game runs without “Automatch v2.0” (MMFind 0.47+) - restart it from the launcher', gf_no_game: 'the game did not start', gf_wrong_game: 'another game is running',
  gf_busy_match: 'the game is in a match', gf_in_lobby: 'the game is in a Custom Games lobby', gf_not_menu: 'the game is not in its main menu', gf_no_ownlobby: 'no OwnLobby in the game',
  gf_walk_timeout: 'Find a Game did not open', gf_race: 'the race could not be set', gf_left_screen: 'Find a Game was left', gf_refused: 'the search was refused',
  gf_server_cancelled: 'the server called it off', gf_cancelled: 'cancelled', gf_game_closed: 'the game closed', gf_no_answer: 'the game did not answer', gf_busy_room: 'another room is starting',
  lrMaps: 'Maps', lrMapsPick: 'Choose maps', lrMapsN: '{n} maps ticked', lrMapsRandom: 'The match takes one of the ticked maps at random.', lrMapsDone: 'Done', lrMapsFilter: 'Find a map',
  lrMatchMap: 'The match map: {name}', lrOpts: 'Match settings', opt_win: 'Victory condition', win_vpc: 'Victory Point Control', win_annihilate: 'Annihilate',
  win_vpc_hero: 'VPC - Hero Assault', win_annihilate_hero: 'Annihilate - Hero Assault', opt_vp: 'Victory points', opt_start: 'Starting locations', start_fixed: 'Fixed', start_random: 'Random',
  opt_res: 'Starting resources', res_standard: 'Standard', res_high: 'High Resources', lrGameVan: 'Vanilla Retribution', lrSeatsNote: 'The host sits first in his team; the others take their seats in the room\'s order.',
});
Object.assign(T.ru, {
  lrTitle: 'Комнаты лаунчера', lrNote: 'Соберите матч здесь: карта, команды, раса и герой каждого. Когда все готовы — отсчёт 10 секунд, потом у всех запускается игра и вы попадаете в этот матч (наши серверы, без рейтинга).',
  lrCreate: 'Создать комнату', lrNone: 'Комнат пока нет — создайте свою и скажите друзьям её название.', lrJoin: 'Войти', lrFull: 'полная', lrPlaying: 'идёт матч',
  lrSignIn: 'Войдите через Steam (чат на главной), чтобы создать комнату или войти в неё.', lrSignInBtn: 'Войти',
  lrLeave: 'Выйти из комнаты', lrTeam: 'Команда {n}', lrFree: 'Свободное место', lrSit: 'Занять это место', lrKick: 'Убрать из комнаты', lrOwner: 'Хозяин комнаты',
  lrReady: 'Готов', lrNotReady: 'Не готов', lrIsReady: 'готов', lrWaiting: 'не готов', lrAway: 'лаунчер закрыт',
  lrMap: 'Карта', lrMode: 'Режим', lrRace: 'Раса', lrHero: 'Герой', lrRandomHero: 'Случайный герой', lrName: 'Название комнаты',
  lrNet: 'Наши серверы от каждого игрока', lrNetPick: 'Матч пойдёт через: {node} (худшая задержка {ms} мс)', lrNetMeasuring: 'Меряем задержки…',
  lrNetNone: 'Ни до одного нашего сервера нет связи у всех: игра попробует первый, игрок без связи с ним может отвалиться.',
  lrNetVia: 'через {node}', lrNetNoStream: 'отвечает, но поток не проходит', lrNetMs: '{ms} мс', lrNetAgain: 'Перемерить',
  lrCd: 'Все готовы — игра запустится через {n} с', lrCdHint: 'Нажмите «Не готов», чтобы остановить.', lrNeedAll: 'Ждём, пока займут все места и все нажмут «Готов».',
  lrLaunching: 'Запускаем игры…', lrCancel: 'Отменить запуск', lrPlayingNow: 'Матч идёт. После него вы снова в этой комнате.',
  lrWhyAddon: 'Включите дополнение «Автоматч v2.0» во вкладке «Дополнения» — матч комнаты идёт через него.', lrWhyVer: 'Комната для Elite {v}, а у вас Elite {mine}.',
  lrWhyOs: 'Комнаты работают на Windows и Linux.', lrWhyVan: 'Комната для ванильной Retribution — а в этом лаунчере ванильной игры нет.',
  g_starting: 'запускает игру', g_waiting_game: 'ждём игру', g_accepted: 'игра приняла', g_walking: 'идёт в Find a Game', g_army: 'ставит армию',
  g_searching: 'в поиске', g_matched: 'матч собран', g_room: 'комната хоста готова', g_in_room: 'в комнате', g_loading: 'загрузка', g_playing: 'играет', g_failed: 'ошибка',
  n_joined: '{who} вошёл в комнату.', n_left: '{who} вышел из комнаты.', n_gone: '{who} закрыл лаунчер и выбыл из комнаты.', n_kicked: '{who} убран из комнаты.',
  n_unready: '{who} не готов — отсчёт остановлен.', n_changed: '{who} сменил армию или место — отсчёт остановлен.', n_conf: '{who} изменил комнату — всем снова нажать «Готов».',
  n_cd_stop: 'Отсчёт остановлен.', n_late: 'Не все попали в поиск за {secs} с ({who}) — запуск отменён.', n_version: 'Другая версия игры или мода: {who} — запуск отменён.',
  n_match: 'Матч не собрался ({why}){who2} — запуск отменён.', n_left_search: '{who} остановил поиск — запуск отменён.', n_cancel: '{who} отменил запуск.',
  n_game_failed: 'Игра у {who} не смогла начать поиск ({why}) — запуск отменён.', n_played: 'Матч закончился — с возвращением. Нажмите «Готов» для следующего.',
  e_full: 'В комнате нет мест.', e_state: 'Комната сейчас запускает матч.', e_kicked: 'Вас убрали из этой комнаты — подождите немного.', e_busy: 'Сначала дождитесь запуска своей комнаты.',
  e_no_room: 'Комнаты больше нет.', e_auth: 'Сначала войдите через Steam.', e_owner: 'Это может менять только хозяин комнаты.', e_too_many_players: 'Для этого режима слишком много игроков.', e_bad: 'Так нельзя.',
  gf_no_pipe: 'игра запущена без «Автоматч v2.0» (MMFind 0.47+) — перезапустите её из лаунчера', gf_no_game: 'игра не запустилась', gf_wrong_game: 'запущена другая игра',
  gf_busy_match: 'игра в матче', gf_in_lobby: 'игра в лобби Custom Games', gf_not_menu: 'игра не в главном меню', gf_no_ownlobby: 'в игре нет OwnLobby',
  gf_walk_timeout: 'Find a Game не открылся', gf_race: 'не удалось выставить расу', gf_left_screen: 'ушли с экрана Find a Game', gf_refused: 'поиск не принят',
  gf_server_cancelled: 'сервер отменил', gf_cancelled: 'отменено', gf_game_closed: 'игра закрылась', gf_no_answer: 'игра не ответила', gf_busy_room: 'запускается другая комната',
  lrMaps: 'Карты', lrMapsPick: 'Выбрать карты', lrMapsN: 'Отмечено карт: {n}', lrMapsRandom: 'Матч возьмёт одну из отмеченных карт наугад.', lrMapsDone: 'Готово', lrMapsFilter: 'Найти карту',
  lrMatchMap: 'Карта матча: {name}', lrOpts: 'Настройки матча', opt_win: 'Условие победы', win_vpc: 'Контроль точек (VPC)', win_annihilate: 'Уничтожение',
  win_vpc_hero: 'VPC — Hero Assault', win_annihilate_hero: 'Уничтожение — Hero Assault', opt_vp: 'Очки победы', opt_start: 'Стартовые позиции', start_fixed: 'Фиксированные', start_random: 'Случайные',
  opt_res: 'Стартовые ресурсы', res_standard: 'Стандартные', res_high: 'Много (High Resources)', lrGameVan: 'Ваниль Retribution', lrSeatsNote: 'Хост садится первым в своей команде, остальные — по порядку мест комнаты.',
});
// es / fr / de (stage 2, 06.11.2026)
Object.assign(T.es, { "lrTitle": "Salas del launcher", "lrNote": "Prepara aquí una partida: el mapa, los equipos, la raza y el héroe de cada uno. Cuando todos estén listos, cuenta atrás de 10 s; luego el juego se inicia para todos y entráis en esta partida (nuestros servidores, sin rating).", "lrCreate": "Crear sala", "lrNone": "Aún no hay salas: crea una y pasa su nombre a tus amigos.", "lrJoin": "Entrar", "lrFull": "llena", "lrPlaying": "en partida", "lrSignIn": "Inicia sesión con Steam (el chat de la página principal) para crear una sala o entrar en ella.", "lrSignInBtn": "Iniciar sesión", "lrLeave": "Salir de la sala", "lrTeam": "Equipo {n}", "lrFree": "Plaza libre", "lrSit": "Ocupar esta plaza", "lrKick": "Quitar de la sala", "lrOwner": "Dueño de la sala", "lrReady": "Listo", "lrNotReady": "No listo", "lrIsReady": "listo", "lrWaiting": "no listo", "lrAway": "launcher cerrado", "lrMap": "Mapa", "lrMode": "Modo", "lrRace": "Raza", "lrHero": "Héroe", "lrRandomHero": "Héroe aleatorio", "lrName": "Nombre de la sala", "lrNet": "Nuestros servidores desde cada jugador", "lrNetPick": "La partida irá por: {node} (peor retardo {ms} ms)", "lrNetMeasuring": "Midiendo los retardos…", "lrNetNone": "Ningún servidor nuestro llega a todos los jugadores: el juego probará el primero; quien no llegue puede desconectarse.", "lrNetVia": "a través de {node}", "lrNetNoStream": "responde, pero el flujo no pasa", "lrNetMs": "{ms} ms", "lrNetAgain": "Medir de nuevo", "lrCd": "Todos listos: el juego se inicia en {n} s", "lrCdHint": "Pulsa No listo para detenerlo.", "lrNeedAll": "Esperando a que se ocupen todas las plazas y todos estén listos.", "lrLaunching": "Iniciando los juegos…", "lrCancel": "Cancelar el inicio", "lrPlayingNow": "La partida está en curso. Después volverás a esta sala.", "lrWhyAddon": "Activa el complemento «Automatch v2.0» en Complementos: la partida de la sala va por él.", "lrWhyVer": "Esta sala es para Elite {v} y tú tienes Elite {mine}.", "lrWhyOs": "Las salas funcionan en Windows y Linux.", "lrWhyVan": "Esta sala es para Retribution vanilla y este launcher no tiene el juego vanilla.", "g_starting": "iniciando el juego", "g_waiting_game": "esperando el juego", "g_accepted": "el juego lo aceptó", "g_walking": "hacia Find a Game", "g_army": "eligiendo el ejército", "g_searching": "buscando", "g_matched": "partida formada", "g_room": "sala del anfitrión lista", "g_in_room": "en la sala", "g_loading": "cargando", "g_playing": "jugando", "g_failed": "error", "n_joined": "{who} entró en la sala.", "n_left": "{who} salió de la sala.", "n_gone": "{who} cerró el launcher y salió de la sala.", "n_kicked": "{who} fue quitado de la sala.", "n_unready": "{who} no está listo: la cuenta atrás se detuvo.", "n_changed": "{who} cambió el ejército o la plaza: la cuenta atrás se detuvo.", "n_conf": "{who} cambió la sala: todos deben pulsar Listo otra vez.", "n_cd_stop": "La cuenta atrás se detuvo.", "n_late": "No todos entraron en la búsqueda en {secs} s ({who}): el inicio se canceló.", "n_version": "Otra versión del juego o del mod: {who}: el inicio se canceló.", "n_match": "La partida no se formó ({why}){who2}: el inicio se canceló.", "n_left_search": "{who} detuvo la búsqueda: el inicio se canceló.", "n_cancel": "{who} canceló el inicio.", "n_game_failed": "El juego de {who} no pudo empezar la búsqueda ({why}): el inicio se canceló.", "n_played": "La partida terminó, bienvenido de vuelta. Pulsa Listo para otra.", "e_full": "La sala está llena.", "e_state": "La sala está iniciando una partida ahora.", "e_kicked": "Te quitaron de esta sala: espera un poco.", "e_busy": "Primero termina el inicio de tu sala.", "e_no_room": "La sala ya no existe.", "e_auth": "Primero inicia sesión con Steam.", "e_owner": "Solo el dueño de la sala puede cambiar eso.", "e_too_many_players": "Demasiados jugadores para ese modo.", "e_bad": "No es posible.", "gf_no_pipe": "el juego corre sin «Automatch v2.0» (MMFind 0.47+): reinícialo desde el launcher", "gf_no_game": "el juego no se inició", "gf_wrong_game": "hay otro juego abierto", "gf_busy_match": "el juego está en una partida", "gf_in_lobby": "el juego está en una sala de Custom Games", "gf_not_menu": "el juego no está en su menú principal", "gf_no_ownlobby": "no hay OwnLobby en el juego", "gf_walk_timeout": "Find a Game no se abrió", "gf_race": "no se pudo poner la raza", "gf_left_screen": "se salió de Find a Game", "gf_refused": "la búsqueda fue rechazada", "gf_server_cancelled": "el servidor la canceló", "gf_cancelled": "cancelado", "gf_game_closed": "el juego se cerró", "gf_no_answer": "el juego no respondió", "gf_busy_room": "se está iniciando otra sala", "lrMaps": "Mapas", "lrMapsPick": "Elegir mapas", "lrMapsN": "{n} mapas marcados", "lrMapsRandom": "La partida usará uno de los mapas marcados al azar.", "lrMapsDone": "Listo", "lrMapsFilter": "Buscar mapa", "lrMatchMap": "Mapa de la partida: {name}", "lrOpts": "Ajustes de la partida", "opt_win": "Condición de victoria", "win_vpc": "Control de puntos de victoria", "win_annihilate": "Aniquilación", "win_vpc_hero": "VPC - Hero Assault", "win_annihilate_hero": "Aniquilación - Hero Assault", "opt_vp": "Puntos de victoria", "opt_start": "Posiciones iniciales", "start_fixed": "Fijas", "start_random": "Aleatorias", "opt_res": "Recursos iniciales", "res_standard": "Estándar", "res_high": "Recursos altos", "lrGameVan": "Retribution vanilla", "lrSeatsNote": "El anfitrión ocupa la primera plaza de su equipo; los demás, en el orden de la sala." });
Object.assign(T.fr, { "lrTitle": "Salons du launcher", "lrNote": "Préparez une partie ici : la carte, les équipes, la race et le héros de chacun. Quand tout le monde est prêt, compte à rebours de 10 s, puis le jeu se lance pour tous et vous arrivez tous dans cette partie (nos serveurs, sans classement).", "lrCreate": "Créer un salon", "lrNone": "Pas encore de salon : créez-en un et donnez son nom à vos amis.", "lrJoin": "Rejoindre", "lrFull": "plein", "lrPlaying": "en partie", "lrSignIn": "Connectez-vous avec Steam (le chat de la page principale) pour créer ou rejoindre un salon.", "lrSignInBtn": "Se connecter", "lrLeave": "Quitter le salon", "lrTeam": "Équipe {n}", "lrFree": "Place libre", "lrSit": "Prendre cette place", "lrKick": "Retirer du salon", "lrOwner": "Propriétaire du salon", "lrReady": "Prêt", "lrNotReady": "Pas prêt", "lrIsReady": "prêt", "lrWaiting": "pas prêt", "lrAway": "launcher fermé", "lrMap": "Carte", "lrMode": "Mode", "lrRace": "Race", "lrHero": "Héros", "lrRandomHero": "Héros aléatoire", "lrName": "Nom du salon", "lrNet": "Nos serveurs depuis chaque joueur", "lrNetPick": "La partie passera par : {node} (pire délai {ms} ms)", "lrNetMeasuring": "Mesure des délais…", "lrNetNone": "Aucun de nos serveurs n'est joignable par tous : le jeu essaiera le premier, un joueur qui ne le joint pas peut décrocher.", "lrNetVia": "via {node}", "lrNetNoStream": "répond, mais le flux ne passe pas", "lrNetMs": "{ms} ms", "lrNetAgain": "Mesurer à nouveau", "lrCd": "Tous prêts : le jeu se lance dans {n} s", "lrCdHint": "Appuyez sur Pas prêt pour l'arrêter.", "lrNeedAll": "En attente que toutes les places soient prises et que tout le monde soit prêt.", "lrLaunching": "Lancement des jeux…", "lrCancel": "Annuler le lancement", "lrPlayingNow": "La partie est en cours. Ensuite vous revenez dans ce salon.", "lrWhyAddon": "Activez le module « Automatch v2.0 » dans Modules : la partie du salon passe par lui.", "lrWhyVer": "Ce salon est pour Elite {v}, vous avez Elite {mine}.", "lrWhyOs": "Les salons fonctionnent sous Windows et Linux.", "lrWhyVan": "Ce salon est pour Retribution vanilla et ce launcher n'a pas le jeu vanilla.", "g_starting": "lance le jeu", "g_waiting_game": "attend le jeu", "g_accepted": "le jeu a accepté", "g_walking": "vers Find a Game", "g_army": "choix de l'armée", "g_searching": "en recherche", "g_matched": "partie formée", "g_room": "salon de l'hôte prêt", "g_in_room": "dans le salon", "g_loading": "chargement", "g_playing": "en jeu", "g_failed": "échec", "n_joined": "{who} a rejoint le salon.", "n_left": "{who} a quitté le salon.", "n_gone": "{who} a fermé le launcher et a quitté le salon.", "n_kicked": "{who} a été retiré du salon.", "n_unready": "{who} n'est pas prêt : le compte à rebours s'est arrêté.", "n_changed": "{who} a changé d'armée ou de place : le compte à rebours s'est arrêté.", "n_conf": "{who} a modifié le salon : tout le monde doit appuyer à nouveau sur Prêt.", "n_cd_stop": "Le compte à rebours s'est arrêté.", "n_late": "Tout le monde n'est pas entré dans la recherche en {secs} s ({who}) : lancement annulé.", "n_version": "Autre version du jeu ou du mod : {who} : lancement annulé.", "n_match": "La partie ne s'est pas formée ({why}){who2} : lancement annulé.", "n_left_search": "{who} a arrêté la recherche : lancement annulé.", "n_cancel": "{who} a annulé le lancement.", "n_game_failed": "Le jeu de {who} n'a pas pu lancer la recherche ({why}) : lancement annulé.", "n_played": "La partie est terminée, bon retour. Appuyez sur Prêt pour une autre.", "e_full": "Le salon est plein.", "e_state": "Le salon lance une partie en ce moment.", "e_kicked": "Vous avez été retiré de ce salon : patientez un peu.", "e_busy": "Terminez d'abord le lancement de votre salon.", "e_no_room": "Le salon n'existe plus.", "e_auth": "Connectez-vous d'abord avec Steam.", "e_owner": "Seul le propriétaire du salon peut changer cela.", "e_too_many_players": "Trop de joueurs pour ce mode.", "e_bad": "Impossible.", "gf_no_pipe": "le jeu tourne sans « Automatch v2.0 » (MMFind 0.47+) : relancez-le depuis le launcher", "gf_no_game": "le jeu ne s'est pas lancé", "gf_wrong_game": "un autre jeu est lancé", "gf_busy_match": "le jeu est en partie", "gf_in_lobby": "le jeu est dans un salon Custom Games", "gf_not_menu": "le jeu n'est pas dans son menu principal", "gf_no_ownlobby": "pas d'OwnLobby dans le jeu", "gf_walk_timeout": "Find a Game ne s'est pas ouvert", "gf_race": "la race n'a pas pu être choisie", "gf_left_screen": "Find a Game a été quitté", "gf_refused": "la recherche a été refusée", "gf_server_cancelled": "le serveur l'a annulée", "gf_cancelled": "annulé", "gf_game_closed": "le jeu s'est fermé", "gf_no_answer": "le jeu n'a pas répondu", "gf_busy_room": "un autre salon se lance", "lrMaps": "Cartes", "lrMapsPick": "Choisir les cartes", "lrMapsN": "{n} cartes cochées", "lrMapsRandom": "La partie prendra au hasard une des cartes cochées.", "lrMapsDone": "OK", "lrMapsFilter": "Chercher une carte", "lrMatchMap": "Carte de la partie : {name}", "lrOpts": "Réglages de la partie", "opt_win": "Condition de victoire", "win_vpc": "Contrôle des points de victoire", "win_annihilate": "Annihilation", "win_vpc_hero": "VPC - Hero Assault", "win_annihilate_hero": "Annihilation - Hero Assault", "opt_vp": "Points de victoire", "opt_start": "Positions de départ", "start_fixed": "Fixes", "start_random": "Aléatoires", "opt_res": "Ressources de départ", "res_standard": "Standard", "res_high": "Ressources élevées", "lrGameVan": "Retribution vanilla", "lrSeatsNote": "L'hôte prend la première place de son équipe ; les autres, dans l'ordre du salon." });
Object.assign(T.de, { "lrTitle": "Launcher-Räume", "lrNote": "Stellt hier ein Spiel zusammen: Karte, Teams, Volk und Held jedes Spielers. Sind alle bereit, läuft ein 10-s-Countdown – dann startet das Spiel bei allen und ihr landet alle in diesem Match (unsere Server, ohne Wertung).", "lrCreate": "Raum erstellen", "lrNone": "Noch keine Räume – erstelle einen und gib deinen Freunden seinen Namen.", "lrJoin": "Beitreten", "lrFull": "voll", "lrPlaying": "im Spiel", "lrSignIn": "Melde dich mit Steam an (Chat auf der Hauptseite), um einen Raum zu erstellen oder beizutreten.", "lrSignInBtn": "Anmelden", "lrLeave": "Raum verlassen", "lrTeam": "Team {n}", "lrFree": "Freier Platz", "lrSit": "Diesen Platz nehmen", "lrKick": "Aus dem Raum entfernen", "lrOwner": "Raumbesitzer", "lrReady": "Bereit", "lrNotReady": "Nicht bereit", "lrIsReady": "bereit", "lrWaiting": "nicht bereit", "lrAway": "Launcher geschlossen", "lrMap": "Karte", "lrMode": "Modus", "lrRace": "Volk", "lrHero": "Held", "lrRandomHero": "Zufälliger Held", "lrName": "Raumname", "lrNet": "Unsere Server von jedem Spieler aus", "lrNetPick": "Das Match läuft über: {node} (schlechteste Verzögerung {ms} ms)", "lrNetMeasuring": "Verzögerungen werden gemessen…", "lrNetNone": "Keinen unserer Server erreichen alle Spieler: Das Spiel versucht den ersten, wer ihn nicht erreicht, kann rausfliegen.", "lrNetVia": "über {node}", "lrNetNoStream": "antwortet, aber der Datenstrom kommt nicht durch", "lrNetMs": "{ms} ms", "lrNetAgain": "Neu messen", "lrCd": "Alle bereit – das Spiel startet in {n} s", "lrCdHint": "Mit Nicht bereit anhalten.", "lrNeedAll": "Warten, bis alle Plätze besetzt und alle bereit sind.", "lrLaunching": "Spiele werden gestartet…", "lrCancel": "Start abbrechen", "lrPlayingNow": "Das Match läuft. Danach bist du wieder in diesem Raum.", "lrWhyAddon": "Aktiviere das Add-on „Automatch v2.0“ unter Add-ons – das Match des Raums läuft darüber.", "lrWhyVer": "Dieser Raum ist für Elite {v}, du hast Elite {mine}.", "lrWhyOs": "Räume funktionieren unter Windows und Linux.", "lrWhyVan": "Dieser Raum ist für Vanilla-Retribution – dieser Launcher hat das Vanilla-Spiel nicht.", "g_starting": "startet das Spiel", "g_waiting_game": "wartet auf das Spiel", "g_accepted": "Spiel hat übernommen", "g_walking": "zu Find a Game", "g_army": "wählt die Armee", "g_searching": "sucht", "g_matched": "Match gebildet", "g_room": "Raum des Hosts bereit", "g_in_room": "im Raum", "g_loading": "lädt", "g_playing": "spielt", "g_failed": "Fehler", "n_joined": "{who} ist dem Raum beigetreten.", "n_left": "{who} hat den Raum verlassen.", "n_gone": "{who} hat den Launcher geschlossen und ist raus.", "n_kicked": "{who} wurde aus dem Raum entfernt.", "n_unready": "{who} ist nicht bereit – der Countdown wurde angehalten.", "n_changed": "{who} hat Armee oder Platz geändert – der Countdown wurde angehalten.", "n_conf": "{who} hat den Raum geändert – alle drücken erneut Bereit.", "n_cd_stop": "Der Countdown wurde angehalten.", "n_late": "Nicht alle waren in {secs} s in der Suche ({who}) – der Start wurde abgebrochen.", "n_version": "Andere Version des Spiels oder Mods: {who} – der Start wurde abgebrochen.", "n_match": "Das Match kam nicht zustande ({why}){who2} – der Start wurde abgebrochen.", "n_left_search": "{who} hat die Suche beendet – der Start wurde abgebrochen.", "n_cancel": "{who} hat den Start abgebrochen.", "n_game_failed": "Das Spiel von {who} konnte die Suche nicht starten ({why}) – der Start wurde abgebrochen.", "n_played": "Das Match ist vorbei – willkommen zurück. Drücke Bereit für das nächste.", "e_full": "Der Raum ist voll.", "e_state": "Der Raum startet gerade ein Match.", "e_kicked": "Du wurdest aus diesem Raum entfernt – warte ein wenig.", "e_busy": "Schließe zuerst den Start deines Raums ab.", "e_no_room": "Den Raum gibt es nicht mehr.", "e_auth": "Melde dich zuerst mit Steam an.", "e_owner": "Nur der Raumbesitzer kann das ändern.", "e_too_many_players": "Zu viele Spieler für diesen Modus.", "e_bad": "Nicht möglich.", "gf_no_pipe": "das Spiel läuft ohne „Automatch v2.0“ (MMFind 0.47+) – starte es aus dem Launcher neu", "gf_no_game": "das Spiel ist nicht gestartet", "gf_wrong_game": "ein anderes Spiel läuft", "gf_busy_match": "das Spiel ist in einem Match", "gf_in_lobby": "das Spiel ist in einer Custom-Games-Lobby", "gf_not_menu": "das Spiel ist nicht im Hauptmenü", "gf_no_ownlobby": "kein OwnLobby im Spiel", "gf_walk_timeout": "Find a Game hat sich nicht geöffnet", "gf_race": "das Volk ließ sich nicht setzen", "gf_left_screen": "Find a Game wurde verlassen", "gf_refused": "die Suche wurde abgelehnt", "gf_server_cancelled": "der Server hat abgebrochen", "gf_cancelled": "abgebrochen", "gf_game_closed": "das Spiel wurde geschlossen", "gf_no_answer": "das Spiel hat nicht geantwortet", "gf_busy_room": "ein anderer Raum startet", "lrMaps": "Karten", "lrMapsPick": "Karten wählen", "lrMapsN": "{n} Karten markiert", "lrMapsRandom": "Das Match nimmt zufällig eine der markierten Karten.", "lrMapsDone": "Fertig", "lrMapsFilter": "Karte suchen", "lrMatchMap": "Karte des Matches: {name}", "lrOpts": "Match-Einstellungen", "opt_win": "Siegbedingung", "win_vpc": "Siegpunkt-Kontrolle", "win_annihilate": "Vernichtung", "win_vpc_hero": "VPC - Hero Assault", "win_annihilate_hero": "Vernichtung - Hero Assault", "opt_vp": "Siegpunkte", "opt_start": "Startpositionen", "start_fixed": "Fest", "start_random": "Zufällig", "opt_res": "Startressourcen", "res_standard": "Standard", "res_high": "Hohe Ressourcen", "lrGameVan": "Vanilla-Retribution", "lrSeatsNote": "Der Host sitzt zuerst in seinem Team, die anderen in der Reihenfolge des Raums." });
// the heroes' names in Russian (the game's own; the server sends the English ones of the Elite data)
const LR_HERO_RU = { 'Chaos Lord': 'Лорд Хаоса', 'Plague Champion': 'Чумной чемпион', 'Chaos Sorcerer': 'Колдун Хаоса', 'Warlock': 'Варлок', 'Warp Spider Exarch': 'Экзарх Варп-пауков',
  'Farseer': 'Провидец', 'Inquisitor': 'Инквизитор', 'Commissar': 'Комиссар', 'Lord General': 'Лорд-генерал', 'Brother-Captain': 'Брат-капитан', 'Eversor Assassin': 'Ассасин Эверсор',
  'Daemonhunter': 'Охотник на демонов', 'Warboss': 'Варбосс', 'Kommando Nob': 'Коммандо-ноб', 'Mekboy': 'Мекбой', 'Force Commander': 'Командор', 'Apothecary': 'Апотекарий',
  'Techmarine': 'Техмарин', 'XV-8 Crisis Commander': 'Командир «Кризис» XV-8', 'Ethereal': 'Эфирный', 'Hive Tyrant': 'Тиран улья', 'Ravener Alpha': 'Альфа-потрошитель', 'Lictor Alpha': 'Альфа-ликтор' };
const LR = { list: [], room: null, cat: {}, host: '', skew: 0, tick: 0, here: 0, pingT: 0, pinging: false, launched: 0, gameEv: null, pop: null };
const lrMe = () => (CH.me && CH.me.signed_in ? String(CH.me.steam || '') : '');
const lrMine = r => !!(r && lrMe() && (r.slots || []).some(s => s && s.steam === lrMe()));
const lrAssets = () => (LR.host || LIVE.host || RM.host || 'https://rts.fintebtc.de') + '/elite/assets/';
const lrHeroName = n => (lang === 'ru' && LR_HERO_RU[n]) || n || '';
const lrNodeName = (net, ip) => { const n = (net.nodes || []).find(x => x.ip === ip); const nm = n ? n.name : ip;
  return /moscow/i.test(nm) ? (lang === 'ru' ? 'Москва' + (/pivolan/i.test(nm) ? ' 2' : '') : nm) : /german/i.test(nm) ? (lang === 'ru' ? 'Германия' : nm) : /poland/i.test(nm) ? (lang === 'ru' ? 'Польша' : nm) : nm; };

async function lrCatalog(game) {
  game = game === 'vanilla' ? 'vanilla' : 'elite';
  if (LR.cat[game]) return LR.cat[game];
  try { const c = await invoke('lroom_list', { what: 'catalog', game }); LR.cat[game] = c; if (c.host) LR.host = c.host; return c; } catch (e) { return null; }
}
async function lrCall(verb, body) {
  let r; try { r = await invoke('lroom_api', { verb, body: body || {} }); } catch (e) { toast(String(e), true); return null; }
  if (r && r.ok === false && verb !== 'here') toast(t('e_' + r.error) !== 'e_' + r.error ? t('e_' + r.error) : String(r.error), true);
  if (r && r.room) lrSet(r.room);
  return r;
}
function lrSet(v) {
  if (v.now) LR.skew = v.now - Date.now();
  if (LR.room && LR.room.id === v.id && LR.room.state === 'launching' && v.state === 'lobby' && LR.launched) {
    invoke('lroom_launch_cancel', { room: v.id }).catch(() => {});      // the start is off: the launcher's order to the game too
  }
  const mine = lrMine(v);
  if (mine) {
    const first = !LR.room || LR.room.id !== v.id;
    if (!LR.room || v.seq >= (LR.room.seq || 0) || first) LR.room = v;
    if (first) { LR.pingT = 0; lrCatalog(v.game).then(() => lrRender()); }
  } else if (LR.room && LR.room.id === v.id) LR.room = null;   // not in it any more (removed)
  const i = LR.list.findIndex(x => x.id === v.id), sum = { id: v.id, name: v.name, game: v.game, ver: v.ver, mode: v.mode, map: v.map, map_name: v.map_name, state: v.state,
    players: (v.slots || []).filter(Boolean).length, cap: (v.slots || []).length, names: (v.slots || []).filter(Boolean).map(s => s.name),
    owner: v.owner, owner_name: ((v.slots || []).find(s => s && s.steam === v.owner) || {}).name };
  if (i >= 0) LR.list[i] = sum; else LR.list.push(sum);
  lrRender(); lrLaunchCheck(); lrOnSoon();
}
async function lrLoad() {
  try { const d = await invoke('lroom_list', {}); LR.list = d.rooms || []; if (d.host) LR.host = d.host; lrOnSoon(); } catch (e) { /* the last list */ }
  if (lrMe() && !LR.room) {                                         // in a room from before (the launcher restarted): its view
    const r = await invoke('lroom_api', { verb: 'get', body: {} }).catch(() => null);
    if (r && r.ok && r.room) { LR.room = r.room; lrCatalog(r.room.game).then(() => lrRender()); lrLaunchCheck(); }   // a start under way goes on
  }
  lrRender();
}
listen('c_ev', e => {
  const { e: ev, d } = e.payload || {};
  if (ev === 'lroom') lrSet(d);
  else if (ev === 'lroom_gone') {
    LR.list = LR.list.filter(x => x.id !== d.id);
    if (LR.room && LR.room.id === d.id) LR.room = null;
    lrRender(); lrOnSoon();
  } else if (ev === 'lroom_kicked') { if (LR.room && LR.room.id === d.id) { LR.room = null; toast(t('e_kicked'), true); } lrRender(); }
});
listen('lroom_game', e => { LR.gameEv = e.payload || null; lrRender(); });
// while in a room: "here" every 15 s (the server keeps only those whose launcher is open), the room again when the stream is
// down; the delays to our servers on entering and every 2 minutes (not in a match)
setInterval(async () => {
  if (!LR.room || !lrMine(LR.room)) return;
  const now = Date.now();
  if (now - LR.here > 15000) {
    LR.here = now;
    const r = await invoke('lroom_api', { verb: 'here', body: {} }).catch(() => null);
    if (r && r.ok === false && r.error === 'no_room') { LR.room = null; lrRender(); return; }
    if (r && r.ok && LR.room && (r.seq !== LR.room.seq || !STREAM.up)) { const g = await invoke('lroom_api', { verb: 'get', body: {} }).catch(() => null); if (g && g.room) lrSet(g.room); }
  }
  if (LR.room && LR.room.state === 'lobby' && !LR.pinging && (!LR.pingT || now - LR.pingT > 120000) && !(S && S.game_running && LR.gameEv && LR.gameEv.ev === 'loading')) lrPings();
  if (LR.room && LR.room.state === 'countdown') lrCountdown();
}, 1000);
async function lrPings() {
  LR.pinging = true; LR.pingT = Date.now(); lrRender();
  try {
    const p = await invoke('lroom_pings');
    // a chain (a node he can't reach - through his nearest one) needs Relay 22+: inside Automatch v2.0 since mmfind-0.46 (Relay 23),
    // before that the tick relay_r2
    const comp = id => (S && S.components || []).find(c => String(c.id).replace(/_(r\d+|off)$/, '') === id && c.enabled);
    const relay = comp('relay'), am = comp('automatch');
    const num = c => Number(((String(c.version || c.latest || '').match(/(\d+(?:\.\d+)?)\s*$/) || [])[1]) || 0);
    const chain = (!!am && num(am) >= 0.46) || (!!relay && num(relay) >= 22);
    await invoke('lroom_api', { verb: 'pings', body: { pings: p.pings, raw: p.raw, chain } });
  } catch (e) { /* the next time */ }
  LR.pinging = false; lrRender();
}
function lrCountdown() { lrPlay(); }   // 1.5.0: the countdown is on Play

// ---------- can I play this room's match from here ----------
function lrWhyNot(r) {
  if (!S || (S.os !== 'windows' && S.os !== 'linux')) return t('lrWhyOs');
  if (r.game === 'vanilla') { if (!S.vanilla_offered) return t('lrWhyVan'); }
  else {
    const mine = S.installed_version;
    if (r.ver && /^\d/.test(mine || '') && !verSame(r.ver, mine)) return t('lrWhyVer', { v: r.ver, mine });
  }
  const am = (S.components || []).find(c => String(c.id).replace(/_(r\d+|off)$/, '') === 'automatch');
  if (am && !am.enabled) return t('lrWhyAddon');
  return '';
}

// ---------- the launch: the countdown is over ----------
async function lrLaunchCheck() {
  const r = LR.room;
  if (!r || r.state !== 'launching' || !r.launch || !lrMine(r) || LR.launched === r.launch.t) return;
  LR.launched = r.launch.t; LR.gameEv = { ev: 'starting' };
  const tk = await invoke('lroom_api', { verb: 'ticket', body: {} }).catch(() => null);
  if (!tk || !tk.ok) return;
  const ticket = tk.ticket;
  const report = reason => invoke('lroom_api', { verb: 'game', body: { ev: 'failed', reason } }).catch(() => {});
  const why = lrWhyNot(r); if (why) { report('no_pipe'); toast(why, true); return; }
  try {
    const p = await invoke('lroom_probe') || {};
    const want = ticket.game === 'vanilla' ? 'vanilla' : 'elite';
    const mine = (p.games || []).filter(g => !g.kind || g.kind === want);
    let wait = 0;
    if (!mine.length) {
      if (p.running) wait = 90;                                     // just started, or without the pipe: the session tells
      else {
        wait = 240;
        if ((want === 'vanilla') !== VAN()) { try { S = await invoke('set_game_mode', { mode: want }); render(); } catch (e) { /* the chosen game then */ } }
        doPlay(false);
      }
    }
    await invoke('lroom_launch', { ticket, wait });
  } catch (e) { report('error'); toast(String(e), true); }
}

// ---------- drawing ----------
const lrGameTxt = g => g ? (t('g_' + g) !== 'g_' + g ? t('g_' + g) : g) : '';
function lrNoteTxt(n) {
  if (!n || !n.k) return '';
  const who = (n.who || []).join(', ');
  const why = n.why ? (n.k === 'race' ? t('race_' + n.why) : t('gf_' + n.why) !== 'gf_' + n.why ? t('gf_' + n.why) : n.why) : '';
  const s = t('n_' + n.k, { who, why, secs: n.secs || '', who2: who ? ': ' + who : '' });
  return s === 'n_' + n.k ? '' : s;
}
// 1.5.0 (D): race and hero as two drop-downs under my name (no army block under the teams), with their pictures: a button
// with the current one, the list under it (the race's icon on a dark square, the hero's portrait). The room is not redrawn
// while one is open (LR.drop), a click outside closes it.
function lrDrop(id, cur, items) {
  const c = items.find(x => String(x.v) === String(cur)) || items[0], open = LR.drop === id;
  return `<span class="ldd${open ? ' open' : ''}"><button class="ldd-b" id="${id}" aria-haspopup="listbox" aria-expanded="${open}" aria-label="${esc(t(id === 'lrRace' ? 'lrRace' : 'lrHero'))}">${c.pic}<span>${esc(c.label)}</span><i class="chev"></i></button>`
    + (open ? `<div class="ldd-l" role="listbox">${items.map(x => `<button class="ldd-i${String(x.v) === String(c.v) ? ' on' : ''}" role="option" aria-selected="${String(x.v) === String(c.v)}" data-dd="${id}" data-v="${esc(String(x.v))}">${x.pic}<span>${esc(x.label)}</span></button>`).join('')}</div>` : '')
    + '</span>';
}
const lrRaceBox = k => `<span class="rbox">${raceImg(k)}</span>`;
function lrRaceSel(r, me, cat) {
  const order = (cat && cat.race_order) || [];
  return lrDrop('lrRace', me.race || 'random', ['random', ...order].map(k => ({ v: k, pic: lrRaceBox(k), label: t('race_' + k) })));
}
function lrHeroSel(r, me, cat) {
  if (!me.race || me.race === 'random') return '';
  const names = ((cat && cat.heroes) || {})[me.race] || [], A = lrAssets();
  const pic = i => i >= 0 ? `<span class="hbox"><img src="${A}heroes/${me.race}_${i}.png" alt="" data-fb="${A}races/${me.race}.png"></span>` : '<span class="hbox q">?</span>';
  return lrDrop('lrHero', me.hero >= 0 && names[me.hero] ? me.hero : -1, [...names.map((n, i) => ({ v: i, pic: pic(i), label: lrHeroName(n) })), { v: -1, pic: pic(-1), label: t('lrRandomHero') }]);
}
function lrSlot(r, s, i, cat) {
  const me = lrMe(), owner = r.owner === me, A = lrAssets(), open = r.state === 'lobby' || r.state === 'countdown';
  if (!s) {
    const can = lrMine(r) && open;
    return `<div class="lr-slot free"><span>${esc(t('lrFree'))}</span>${can ? `<button class="btn small lr-sit" data-slot="${i}">${esc(t('lrSit'))}</button>` : ''}</div>`;
  }
  const mine = s.steam === me;
  const heroes = ((cat && cat.heroes) || {})[s.race] || [];
  const armyTxt = s.race === 'random' ? t('race_random') : t('race_' + s.race) + (s.hero >= 0 && heroes[s.hero] ? ' · ' : '');
  const army = mine && open ? lrRaceSel(r, s, cat) + lrHeroSel(r, s, cat)
    : `<span class="lr-army">${raceImg(s.race)}<em>${esc(armyTxt)}</em>${s.race !== 'random' ? `<em class="lr-hn">${esc(s.hero >= 0 && heroes[s.hero] ? lrHeroName(heroes[s.hero]) : t('lrRandomHero'))}</em>` : ''}</span>`;
  // the game's step while starting / playing; a closed launcher; another version (the room's changed)
  const gs = r.state === 'launching' || r.state === 'playing' ? `<span class="lr-gs g-${esc(s.game || '')}">${esc(lrGameTxt(s.game))}</span>`
    : !s.here ? `<span class="lr-gs away">${esc(t('lrAway'))}</span>` : '';
  const why = mine ? lrWhyNot(r) : '';
  const tip = mine ? (why || t(s.ready ? 'rdyMineOn' : 'rdyMine')) : t(s.ready ? 'lrIsReady' : 'lrWaiting');
  const tick = `<span class="flw" data-tip="${esc(tip)}"><button class="rdy${s.ready ? ' on' : ''}${mine && open ? ' mine' : ''}${mine && why && !s.ready ? ' dis' : ''}"`
    + `${mine && open ? ' id="lrReadyTick"' : ' tabindex="-1"'} aria-label="${esc(tip)}" aria-pressed="${!!s.ready}"${!(mine && open) || (why && !s.ready) ? ' disabled' : ''}></button></span>`;
  return `<div class="lr-slot${mine ? ' me' : ''}${s.ready ? ' ready' : ''}">${avatar(s.avatar)}<div class="lr-who"><span class="lr-line"><span class="nm" data-steam="${esc(s.steam)}" data-name="${esc(s.name)}">${esc(s.name)}</span>`
    + `${s.owner ? `<span class="lr-crown" title="${esc(t('lrOwner'))}" aria-label="${esc(t('lrOwner'))}">${ico('crown')}</span>` : ''}${s.rating ? `<span class="rt">${Number(s.rating) | 0}</span>` : ''}`
    + `${s.spoil ? `<span class="tag bad">${esc(t('lrSpoil', { n: s.spoil }))}</span>` : ''}</span><span class="lr-armyrow">${army}</span></div>`
    + `${gs}${owner && !mine && open ? `<button class="lr-kick" data-kick="${esc(s.steam)}" data-tip="${esc(t('lrKick'))}" aria-label="${esc(t('lrKick'))}">${ico('x')}</button>` : ''}${tick}</div>`;
}
function lrNet(r) {
  const net = r.net || {}, rows = net.rows || [], nodes = net.nodes || [];
  if (!rows.length) return '';
  const name = s => { const x = (r.slots || []).find(q => q && q.steam === s); return x ? x.name : 'Player'; };
  let nqAny = false;
  const cell = (row, ip) => {
    const p = (row.ping || {})[ip], raw = (row.raw || {})[ip] || {}, via = (row.via || {})[ip], pick = ip === net.pick;
    let cls = pick ? 'pick' : '', title = '', txt;
    if (p > 0) txt = t('lrNetMs', { ms: p });
    else if (via && row.cost && row.cost[ip] != null) { cls = 'via' + (pick ? ' pick' : ''); title = t('lrNetVia', { node: lrNodeName(net, via) }); txt = '↪ ' + t('lrNetMs', { ms: row.cost[ip] }); }
    else if (raw.ms != null && !raw.ok) { cls = 'bad'; title = t('lrNetNoStream'); txt = t('lrNetMs', { ms: raw.ms }) + '*'; }
    else { cls = 'bad'; txt = p === undefined && row.age == null ? '…' : '—'; }
    // 1.4.24: this node is not used for this player - his connection to it was bad lately (nodeq.js)
    const nq = window.nqRoomTitle ? nqRoomTitle((row.nq || {})[ip], name(row.steam)) : null;
    if (nq) { nqAny = true; cls += ' nq-off'; title = nq + (title ? ' · ' + title : ''); }
    return `<td class="${cls.trim()}"${title ? ` title="${esc(title)}"` : ''}>${esc(txt)}${nq ? `<small class="nq-tag">${esc(t('nqRoomTag'))}</small>` : ''}</td>`;
  };
  const sum = net.why === 'ok' ? t('lrNetPick', { node: lrNodeName(net, net.pick), ms: net.worst }) : net.why === 'none' ? t('lrNetNone') : t('lrNetMeasuring');
  const body = rows.map(row => `<tr><th>${esc(name(row.steam))}</th>${nodes.map(n => cell(row, n.ip)).join('')}</tr>`).join('');
  return `<div class="lr-net"><div class="lr-sub">${esc(t('lrNet'))}<button class="btn-line lr-reping"${LR.pinging ? ' disabled' : ''}>${esc(LR.pinging ? t('lrNetMeasuring') : t('lrNetAgain'))}</button></div>`
    + `<table><thead><tr><th></th>${nodes.map(n => `<th class="${n.ip === net.pick ? 'pick' : ''}">${esc(lrNodeName(net, n.ip))}</th>`).join('')}</tr></thead><tbody>`
    + body
    + `</tbody></table><div class="lr-pick ${net.why === 'ok' ? 'ok' : net.why === 'none' ? 'bad' : ''}">${esc(sum)}</div>`
    + (net.nq_ignored ? `<div class="lr-pick bad">${esc(t('nqRoomIgnored'))}</div>` : '')
    + (nqAny ? `<div class="note nq-note">${esc(t('nqRoomNote'))}</div>` : '') + '</div>';
}
function lrRoomHtml(r) {
  const cat = LR.cat[r.game === 'vanilla' ? 'vanilla' : 'elite'];
  const me = lrMe(), owner = r.owner === me;
  const n = r.size || 1, A = lrAssets(), edit = owner && (r.state === 'lobby' || r.state === 'countdown');
  const team = k => `<div class="lr-team"><div class="lr-sub">${esc(t('lrTeam', { n: k + 1 }))}</div>`
    + r.slots.slice(k * n, k * n + n).map((s, i) => lrSlot(r, s, k * n + i, cat)).join('') + '</div>';
  const maps = (cat && cat.maps && cat.maps[r.mode]) || [];
  const ticked = (r.maps && r.maps.length ? r.maps : [{ key: r.map, name: r.map_name }]);
  const la = r.launch || {};
  const shownMap = la.map || r.map;
  let mapSel = `<div class="lr-mapname">${esc(la.map ? t('lrMatchMap', { name: la.map_name || la.map }) : ticked.map(m => m.name).join(', '))}</div>`;
  if (edit && maps.length) {
    mapSel += `<button class="btn small lr-maps-btn" id="lrMapsBtn" aria-expanded="${!!LR.mapsOpen}"${LR.mapsSaving ? ' disabled' : ''}>${LR.mapsSaving ? `<span class="spin"></span>${esc(t('lrSaving'))}` : `${esc(t('lrMapsPick'))} · ${ticked.length}`}</button>`;
    if (LR.mapsOpen) {
      const on = new Set(LR.mapsEdit || ticked.map(m => m.key));
      mapSel += `<div class="lr-maps"><input id="lrMapsFind" placeholder="${esc(t('lrMapsFilter'))}" value="${esc(LR.mapsFind || '')}">`
        + `<div class="lr-maps-list">${maps.filter(m => !LR.mapsFind || m.name.toLowerCase().includes(LR.mapsFind.toLowerCase())).map(m => `<label class="chk"><input type="checkbox" data-map="${esc(m.key)}"${on.has(m.key) ? ' checked' : ''}><span>${esc(m.name)}</span></label>`).join('')}</div>`
        + `<button class="btn small gold" id="lrMapsDone">${esc(t('lrMapsDone'))}</button></div>`;
    }
  }
  if (ticked.length > 1 && !la.map) mapSel += `<div class="note lr-maps-note">${esc(t('lrMapsRandom'))}</div>`;
  const o = r.opts || {}, co = (cat && cat.opts) || { win: ['vpc', 'annihilate'], vp: [250, 500, 1000], start: ['fixed', 'random'], res: ['standard', 'high'] };
  const optRow = (k, vals, lab, cur) => `<div class="lr-opt"><span>${esc(t('opt_' + k))}</span>` + (edit
    ? `<select data-opt="${k}">${vals.map(v => `<option value="${esc(String(v))}"${String(v) === String(cur) ? ' selected' : ''}>${esc(lab(v))}</option>`).join('')}</select>`
    : `<b>${esc(lab(cur))}</b>`) + '</div>';
  const optsHtml = `<div class="lr-opts"><div class="lr-sub">${esc(t('lrOpts'))}</div>`
    + optRow('win', co.win, v => t('win_' + v), o.win || 'vpc')
    + ((o.win || 'vpc') === 'vpc' ? optRow('vp', co.vp, v => String(v), o.vp || 500) : '')
    + optRow('start', co.start, v => t('start_' + v), o.start || 'fixed')
    + optRow('res', co.res, v => t('res_' + v), o.res || 'standard') + '</div>';
  const modeSel = edit ? `<select id="lrModeSel" aria-label="${esc(t('lrMode'))}">${['1v1', '2v2', '3v3'].map(m => `<option${m === r.mode ? ' selected' : ''}>${m}</option>`).join('')}</select>` : `<span class="tag">${esc(r.mode)}</span>`;
  // the room's last event under its heading (who changed what, why a start is off, a game step); my reason not to play; the
  // match on. No "Ready" bar at the bottom: the ticks are in the rows, the start and the countdown are on Play (lrPlay)
  const why = lrWhyNot(r);
  let ev = '', evc = '';
  if (r.state === 'launching') ev = t('lrLaunching') + (LR.gameEv && LR.gameEv.ev ? ' · ' + lrGameTxt(LR.gameEv.ev === 'failed' ? 'failed' : LR.gameEv.ev) + (LR.gameEv.reason ? ': ' + t('gf_' + LR.gameEv.reason) : '') : '');
  else if (r.state === 'playing') ev = t('lrPlayingNow');
  else if (why) { ev = why; evc = 'wa'; }
  else if (r.note && r.note.k) { ev = lrNoteTxt(r.note); evc = /late|version|match|left_search|game_failed|race|cancel|kicked/.test(r.note.k) ? 'bad' : ''; }
  const vt = r.game === 'vanilla' ? `<span class="tag van">${esc(t('lrGameVan'))}</span>` : '';
  return `<div class="lr-head">${edit ? `<input id="lrNameIn" maxlength="48" value="${esc(r.name)}" aria-label="${esc(t('lrName'))}">` : `<span class="lr-title">${esc(r.name)}</span>`}`
    + `${modeSel}${vt}<button class="btn small" id="lrLeaveBtn">${esc(t('lrLeave'))}</button></div>`
    + (ev ? `<div class="lr-ev ${evc}">${ico('info')}<span>${esc(ev)}</span></div>` : '')
    + `<div class="lr-body"><div class="lr-teams">${team(0)}<div class="lr-vs">vs</div>${team(1)}</div>`
    + `<div class="lr-side"><div class="lr-blk"><div class="lr-sub">${esc(t('lrMap'))}</div><div class="lr-mapbox"><div class="lr-mm" style="background-image:url('${A}maps/${encodeURIComponent(shownMap)}.png')"></div><div class="lr-mapcol">${mapSel}</div></div></div>`
    + `<div class="lr-blk">${optsHtml}</div><div class="lr-blk">${lrNet(r)}</div></div></div>`;
}

// ---------- the Rooms tab: the panel, the one list with its filters, the running matches ----------
const RV = { view: 'open', seen: '' };
const RF = { kind: 'all', mode: 'all', ver: 'all', free: false, from: 'all', lmode: 'all' };
try { Object.assign(RF, JSON.parse(localStorage.getItem('roomsFilter') || '{}')); } catch (e) {}
function lrCardHtml(x) {
  const A = lrAssets(), mine = LR.room && LR.room.id === x.id && lrMine(LR.room), open = x.state === 'lobby' || x.state === 'countdown', free = (x.cap || 0) - (x.players || 0);
  const vok = x.game === 'vanilla' ? !!(S && S.vanilla_offered) : !x.ver || !S || !/^\d/.test(S.installed_version || '') || verSame(x.ver, S.installed_version);
  const act = mine ? `<span class="tag here">${esc(t('roomsHere'))}</span>`
    : !open ? `<span class="tag playing">${esc(t('lrPlaying'))}</span>`
    : free <= 0 ? `<span class="tag">${esc(t('lrFull'))}</span>`
    : `<button class="rjoin lr-join${vok ? ' go' : ''}" data-id="${esc(x.id)}" data-tip="${esc(t('rJoinTip', { name: x.name }))}" aria-label="${esc(t('rJoinTip', { name: x.name }))}">${ico('enter')}</button>`;
  // the room's game on every card: vanilla, or its Elite version (one look; a card of another version is dimmed)
  const vt = x.game === 'vanilla' ? `<span class="tag van">${esc(t('roomsVan'))}</span>` : `<span class="tag ver">Elite ${esc(x.ver || '')}</span>`;
  return `<div class="room lr-card${vok ? '' : ' dim'}" data-kind="lr" data-mode="${esc(x.mode)}" data-vok="${vok ? 1 : 0}" data-van="${x.game === 'vanilla' ? 1 : 0}" data-free="${free > 0 && open ? 1 : 0}">`
    + `<div class="mmap" style="background-image:url('${A}maps/${encodeURIComponent(x.map)}.png')"><span>${esc(x.map_name || x.map)}</span></div><div class="rb">`
    + `<div class="rh"><span class="tag lr">${esc(t('rTagLr'))}</span><span class="rn" title="${esc(x.name)}">${esc(x.name)}</span><span class="tag">${esc(x.mode)}</span></div>`
    + `<div class="lr-names">${(x.names || []).map(esc).join(', ')}</div>`
    + `<div class="rfoot2">${vt}<span class="tag rcount">${x.players}/${x.cap}</span>${act}</div></div></div>`;
}
function lrListHtml() { return LR.list.map(lrCardHtml).join(''); }
const segf = (key, items, cur) => `<div class="seg" role="radiogroup">${items.map(([v, l]) => `<button role="radio" aria-checked="${v === cur}" class="${v === cur ? 'on' : ''}" data-f="${key}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
function rFilters() {
  const mine = S && /^\d/.test(S.installed_version || '') ? 'Elite ' + S.installed_version : t('rFltMine');
  $('rFlt').innerHTML = `<span>${esc(t('rFltWhere'))}${segf('kind', [['all', t('rFltAll')], ['lr', t('rFltLr')], ['game', t('rFltGame')]], RF.kind)}</span>`
    + `<span>${esc(t('lrMode'))}${segf('mode', [['all', t('rFltAll')], ['1v1', '1v1'], ['2v2', '2v2'], ['3v3', '3v3']], RF.mode)}</span>`
    + `<span>${esc(t('rFltVer'))}<select id="rFltVer"><option value="all"${RF.ver === 'all' ? ' selected' : ''}>${esc(t('rFltAll'))}</option><option value="mine"${RF.ver === 'mine' ? ' selected' : ''}>${esc(mine)}</option><option value="van"${RF.ver === 'van' ? ' selected' : ''}>${esc(t('roomsVan'))}</option></select></span>`
    + `<label class="chk"><input type="checkbox" id="rFltFree"${RF.free ? ' checked' : ''}><span>${esc(t('rFltFree'))}</span></label>`;
  $('rLiveFlt').innerHTML = `<span>${esc(t('rFltFrom'))}${segf('from', [['all', t('rFltAll')], ['lr', t('rFltFromLr')], ['fag', 'Find a Game']], RF.from)}</span>`
    + `<span>${esc(t('lrMode'))}${segf('lmode', [['all', t('rFltAll')], ['1v1', '1v1'], ['2v2', '2v2'], ['3v3', '3v3']], RF.lmode)}</span>`;
  const save = () => { try { localStorage.setItem('roomsFilter', JSON.stringify(RF)); } catch (e) {} };
  document.querySelectorAll('#rFlt [data-f], #rLiveFlt [data-f]').forEach(b => b.onclick = () => { RF[b.dataset.f] = b.dataset.v; save(); rFilters(); rApplyFilter(); rLiveRender(); });
  $('rFltVer').onchange = e => { RF.ver = e.target.value; save(); rApplyFilter(); };
  $('rFltFree').onchange = e => { RF.free = e.target.checked; save(); rApplyFilter(); };
}
// the filters hide cards (both kinds sit in one grid); nothing left - say so
function rApplyFilter() {
  const cards = document.querySelectorAll('#rCards .room');
  let shown = 0;
  cards.forEach(c => {
    const d = c.dataset;
    const ok = (RF.kind === 'all' || d.kind === RF.kind) && (RF.mode === 'all' || d.mode === RF.mode)
      && (RF.ver === 'all' || (RF.ver === 'van' ? d.van === '1' : d.vok === '1' && d.van !== '1')) && (!RF.free || d.free === '1');
    c.classList.toggle('hidden', !ok); if (ok) shown++;
  });
  const total = cards.length;
  $('rEmpty').classList.toggle('hidden', shown > 0);
  $('rEmpty').textContent = total ? t('rNoneFilter') : (RM.err ? t('roomsErr') : t('rNone'));
  $('roomsN').textContent = total ? String(total) : '';
  $('rOpenN').textContent = total ? String(total) : '';
}
// a running match of our servers that a launcher room started: the room playing with these players
function lrMatchOf(m) {
  if (m.lroom) return LR.list.find(x => x.id === m.lroom) || { id: m.lroom, name: '' };   // the ladder says it (09.11.2026)
  const names = new Set([...(m.team1 || []), ...(m.team2 || [])].map(p => (LIVE.users[p.steam] || {}).name).filter(Boolean));
  return LR.list.find(x => x.state === 'playing' && (x.names || []).some(n => names.has(n)));
}
function rLiveRender() {
  const box = $('rLiveCards'); if (!box) return;
  const A = lrAssets();
  const ms = (LIVE.ingame || []).map(m => ({ m, lr: lrMatchOf(m) }))
    .filter(({ m, lr }) => (RF.from === 'all' || (RF.from === 'lr') === !!lr) && (RF.lmode === 'all' || m.mode === RF.lmode));
  const pl = x => `<div class="rp">${raceImg(x.race)}<span class="nm" data-steam="${esc(x.steam)}" data-name="${esc(onUser(x.steam).name || '')}">${esc(onUser(x.steam).name || 'Player')}</span>${onUser(x.steam).rating ? `<span class="rt">${Number(onUser(x.steam).rating) | 0}</span>` : ''}</div>`;
  box.innerHTML = ms.map(({ m, lr }) => {
    const map = String(m.map || '').replace(/^\d+p_/i, '').replace(/_/g, ' ');
    const act = m.live ? `<button class="rjoin lvw go" data-m="${esc(m.id)}" data-g="${esc(m.live)}" data-tip="${esc(t('rWatchTip'))}" aria-label="${esc(t('rWatchTip'))}">${ico('eye')}</button>` : '';
    return `<div class="room live-card"><div class="mmap" style="background-image:url('${A}maps/${encodeURIComponent(m.map || '')}.png')"><span>${esc(map)}</span></div><div class="rb">`
      + `<div class="rh">${lr ? `<span class="tag lr">${esc(t('rTagLr'))}</span>` : ''}<span class="rn">${esc(lr && lr.name ? lr.name : map)}</span><span class="tag">${esc(m.mode)}</span></div>`
      + `<div class="teams"><div class="team">${(m.team1 || []).map(pl).join('')}</div><div class="team">${(m.team2 || []).map(pl).join('')}</div></div>`
      + `<div class="rfoot2"><span class="rhost">${esc(m.state === 'playing' ? t('onStatePlaying') + (m.started ? ' · ' + onMins(m.started) : '') : t('onStateCreating'))}</span>${act}</div></div></div>`;
  }).join('') || `<div class="note">${esc(t('rLiveNone'))}</div>`;
  box.querySelectorAll('.lvw[data-m]').forEach(b => b.onclick = () => liveWatch(b.dataset.m, b.dataset.g === 'vanilla' ? 'vanilla' : 'elite'));
  box.querySelectorAll('.rp .nm[data-steam]').forEach(n => nickBind(n, n.dataset.steam, n.dataset.name));
  tipCut(box);
  $('rLiveN').textContent = (LIVE.ingame || []).length ? String((LIVE.ingame || []).length) : '';
  $('rLiveN2').textContent = $('rLiveN').textContent;
}
// the top of the panel: Create a lobby; in a launcher lobby - its card (back to it); signed out - Sign in
function rTop(r) {
  if (!lrMe()) return `<button class="btn gold rcreate" id="rSignIn" data-tip="${esc(t('chLogin'))}">${ico('steam')}<span class="lbl">${esc(t('chLogin'))}</span></button><div class="note lbl rtop-note">${esc(t('rSignInNote'))}</div>`;
  if (r) {
    const filled = (r.slots || []).filter(Boolean), wait = (r.slots || []).filter(s => !s || !s.ready).length;
    const st = r.state === 'countdown' ? t('rStCd') : r.state === 'launching' ? t('lrLaunching') : r.state === 'playing' ? t('lrPlaying') : wait ? t('rStWait', { n: wait }) : t('rStAll');
    return `<button class="rmine${RV.view === 'mine' ? ' on' : ''}" id="rMine" data-tip="${esc(r.name)}"><span class="mi">${ico('crown')}</span><span class="k">${esc(t(r.owner === lrMe() ? 'rMineHost' : 'rMineIn'))}</span>`
      + `<b>${esc(r.name)}</b><small>${esc(r.mode)} · ${filled.length}/${(r.slots || []).length} · ${esc(st)}</small>${RV.view === 'mine' ? '' : `<span class="go">${esc(t('rBack'))}</span>`}</button>`;
  }
  if (RM.mine) return `<div class="rmine gm" data-tip="${esc(t('rInGame') + ': ' + RM.mine.name)}"><span class="mi">${ico('door')}</span><span class="k">${esc(t('rInGame'))}</span><b>${esc(RM.mine.name)}</b><small>${esc(t('rInGameNote'))}</small></div>`;
  return `<button class="btn gold rcreate" id="rCreate" data-tip="${esc(t('rCreate'))}">${ico('plus')}<span class="lbl">${esc(t('rCreate'))}</span></button>`;
}
function rShow(view) { RV.view = view; lrRender(); }
function lrRender() {
  const box = $('lrRoom'), list = $('lrList'); if (!box || !list) return;
  const r = LR.room && lrMine(LR.room) ? LR.room : null;
  if (r && RV.seen !== r.id) { RV.seen = r.id; RV.view = 'mine'; }        // just joined / created: its view
  if (!r) { RV.seen = ''; if (RV.view === 'mine') RV.view = 'open'; }
  $('rTop').innerHTML = rTop(r);
  if ($('rMine')) $('rMine').onclick = () => rShow('mine');
  if ($('rCreate')) $('rCreate').onclick = lrCreate;
  if ($('rSignIn')) $('rSignIn').onclick = chLogin;
  document.querySelectorAll('.rnb[data-r]').forEach(b => { b.classList.toggle('on', b.dataset.r === RV.view); b.onclick = () => rShow(b.dataset.r); });
  $('rOpen').classList.toggle('hidden', RV.view !== 'open');
  $('rLive').classList.toggle('hidden', RV.view !== 'live');
  $('rooms').classList.toggle('in-lroom', RV.view === 'mine');
  if (!$('rFlt').innerHTML) rFilters();
  list.innerHTML = lrListHtml();
  list.querySelectorAll('.lr-join').forEach(b => b.onclick = () => lrCall('join', { id: b.dataset.id }));
  tipCut(list);
  rApplyFilter(); rLiveRender(); lrPlay();
  if (((LR.pop && LR.mapsOpen) || LR.drop || Date.now() < (LR.holdUntil || 0)) && !LR.popForce) return;   // a drop-down / the map list in use
  LR.popForce = 0;
  if (r && RV.view === 'mine') {
    const focus = document.activeElement && document.activeElement.id;
    box.innerHTML = lrRoomHtml(r); box.classList.remove('hidden');
    lrBind(r);
    if (focus === 'lrNameIn' && $('lrNameIn')) $('lrNameIn').focus();
  } else { box.classList.add('hidden'); box.innerHTML = ''; }
}
// A drop-down of the room is being used: no redraw under it for a while (a redraw replaces the element and the pick is lost).
// Not by focus: WebKitGTK (the Linux launcher, 06.11.2026) blurs the select when its popup opens and focuses it again after.
// lrHold: from a press on a select, 8 s at most; a pick (change) ends it at once; the redraws held back are done after.
function lrHold(on) {
  clearTimeout(LR.holdT);
  LR.holdUntil = on ? Date.now() + 8000 : 0;
  if (on) LR.holdT = setTimeout(() => { LR.holdUntil = 0; lrRender(); }, 8100);
}
function lrBind(r) {
  const box = $('lrRoom');
  box.querySelectorAll('img[data-fb]').forEach(i => i.onerror = () => { i.onerror = null; i.src = i.dataset.fb; });
  box.querySelectorAll('.lr-slot .nm[data-steam]').forEach(n => nickBind(n, n.dataset.steam, n.dataset.name, false, true));
  $('lrLeaveBtn').onclick = async () => { const id = r.id; LR.room = null; await lrCall('leave'); invoke('lroom_launch_cancel', { room: id }).catch(() => {}); lrLoad(); };
  if ($('lrReadyTick')) $('lrReadyTick').onclick = () => { const me = r.slots.find(s => s && s.steam === lrMe()); lrCall('ready', { on: !(me && me.ready) }); };
  const hold = el => { if (!el) return; el.onmousedown = el.onkeydown = () => lrHold(true); };
  box.querySelectorAll('.ldd-b').forEach(b => b.onclick = e => { e.stopPropagation(); LR.drop = LR.drop === b.id ? null : b.id; LR.popForce = 1; lrRender(); });
  box.querySelectorAll('.ldd-i').forEach(b => b.onclick = e => {
    e.stopPropagation(); LR.drop = null; LR.popForce = 1;
    const me = r.slots.find(s => s && s.steam === lrMe());
    if (b.dataset.dd === 'lrRace') lrCall('army', { race: b.dataset.v, hero: -1 }); else lrCall('army', { race: me.race, hero: +b.dataset.v });
    lrRender();
  });
  box.querySelectorAll('.lr-sit').forEach(b => b.onclick = () => lrCall('seat', { slot: +b.dataset.slot }));
  box.querySelectorAll('.lr-kick').forEach(b => b.onclick = () => lrCall('kick', { steam: b.dataset.kick }));
  if ($('lrMapsBtn')) $('lrMapsBtn').onclick = () => { LR.mapsOpen = !LR.mapsOpen; LR.mapsEdit = null; LR.mapsFind = ''; LR.pop = LR.mapsOpen ? 1 : null; LR.popForce = 1; lrRender(); };
  if ($('lrMapsFind')) { $('lrMapsFind').oninput = e => { LR.mapsFind = e.target.value; LR.popForce = 1; lrRender(); const f = $('lrMapsFind'); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } }; }
  box.querySelectorAll('.lr-maps input[data-map]').forEach(c => c.onchange = () => {
    const cur = new Set(LR.mapsEdit || (r.maps || []).map(m => m.key)); c.checked ? cur.add(c.dataset.map) : cur.delete(c.dataset.map); LR.mapsEdit = [...cur]; });
  // Done closes the list at once; the change goes to the server - the button says so until the room comes back
  if ($('lrMapsDone')) $('lrMapsDone').onclick = () => {
    const ms = LR.mapsEdit; LR.mapsOpen = false; LR.pop = null; LR.mapsEdit = null; LR.popForce = 1;
    if (ms && ms.length) { LR.mapsSaving = true; lrCall('conf', { maps: ms }).finally(() => { LR.mapsSaving = false; LR.popForce = 1; lrRender(); }); }
    lrRender();
  };
  box.querySelectorAll('select[data-opt]').forEach(sel => { hold(sel);
    sel.onchange = () => { lrHold(false); const v = sel.dataset.opt === 'vp' ? +sel.value : sel.value; lrCall('conf', { opts: { [sel.dataset.opt]: v } }); }; });
  if ($('lrModeSel')) { hold($('lrModeSel')); $('lrModeSel').onchange = e => { lrHold(false); lrCall('conf', { mode: e.target.value }); }; }
  if ($('lrNameIn')) { const save = e => { const v = e.target.value.trim(); if (v && v !== r.name) lrCall('conf', { name: v }); };
    $('lrNameIn').onchange = save; $('lrNameIn').onkeydown = e => { if (e.key === 'Enter') e.target.blur(); }; }
  const rp = box.querySelector('.lr-reping'); if (rp) rp.onclick = () => lrPings();
}
// 1.5.0: a room of this launcher waits for its owner's Play (start: 'host'), its version is the version picked in the footer
async function lrCreate() {
  const game = VAN() ? 'vanilla' : 'elite';
  const cat = await lrCatalog(game); const maps = (cat && cat.maps && cat.maps['1v1']) || [];
  const name = (CH.me && CH.me.name ? CH.me.name : 'Player') + ': 1v1';
  lrCall('create', { game, ver: game === 'elite' ? (S && S.installed_version) || '' : '', mode: '1v1', map: maps.length ? maps[Math.floor(Math.random() * maps.length)].key : '', name, start: 'host' });
}

// ---------- Play while I am in a launcher lobby: the lobby's button on every tab (owner 08.11.2026) ----------
// its label says the state - "Ready 2 of 4", then "Start the match" for the owner ("Waiting for the host" for the others), then
// "Start in 7" (the owner's Play again stops it); hover - whom we wait for. The footer's status line says which lobby I am in,
// with Back, while I am not on its screen.
function lrPlay() {
  const play = $('play'), wrap = $('playWrap'), cf = $('lrCancelFoot'); if (!play || !wrap || !S) return;
  const r = LR.room && lrMine(LR.room) ? LR.room : null;
  wrap.removeAttribute('data-tip'); cf.classList.add('hidden'); play.classList.remove('lb', 'gl');
  if ($('lrBackLnk')) $('statusText').innerHTML = '';                       // my own line from the last time
  // out of the lobby (left it, removed, gone): Play back as the usual one - render sets it (and comes back here with no room)
  if (!r && play.dataset.lb) { delete play.dataset.lb; render(); return; }
  if (!r || S.busy || r.state === 'playing') return;                        // the usual Play (render)
  const me = lrMe(), owner = r.owner === me, slots = r.slots || [], cap = slots.length;
  const nReady = slots.filter(s => s && s.ready).length;
  play.classList.add('lb'); play.dataset.lb = '1'; play.onclick = null;
  if (r.state === 'launching') { play.textContent = t('playLaunching'); play.disabled = true; cf.classList.remove('hidden'); cf.onclick = () => { lrCall('cancel'); invoke('lroom_launch_cancel', { room: r.id }).catch(() => {}); }; }
  else if (r.state === 'countdown') {
    const n = Math.max(0, Math.ceil((r.cd_end - (Date.now() + LR.skew)) / 1000));
    play.innerHTML = `<span class="pcd">${esc(t('playCd'))} <b>${n}</b></span>`; play.classList.add('gl');
    const stop = owner && r.hs; play.disabled = !stop; wrap.dataset.tip = t(stop ? 'tipStop' : 'tipCd');
    if (stop) play.onclick = () => lrCall('stop');
  } else if (r.hs && (r.all_ready != null ? r.all_ready : slots.every(s => s && s.ready))) {
    if (owner) { play.textContent = t('playStart'); play.disabled = false; play.classList.add('gl'); wrap.dataset.tip = t('tipStart'); play.onclick = () => lrCall('start'); }
    else { play.textContent = t('playHost'); play.disabled = true; wrap.dataset.tip = t('tipHost'); }
  } else {
    const who = slots.map(s => !s ? null : s.ready ? '' : s.steam === me ? t('whoYou') : s.name).filter(x => x).concat(slots.some(s => !s) ? [t('whoFree')] : []);
    play.textContent = t('playWait', { n: nReady, m: cap }); play.disabled = true; wrap.dataset.tip = t('tipWait', { who: who.join(', ') });
  }
  // the version of my lobby is mine: the owner switched it in the footer - the room follows
  if (owner && r.game === 'elite' && /^\d/.test(S.installed_version || '') && r.ver && !verSame(r.ver, S.installed_version) && !S.busy && LR.verSent !== S.installed_version) {
    LR.verSent = S.installed_version; lrCall('conf', { ver: S.installed_version });
  }
  // which lobby I am in, with Back, while I am not on its screen
  const onIt = !$('rooms').classList.contains('hidden') && RV.view === 'mine';
  if (!onIt && !S.last_error && !$('statusText').textContent.trim()) {
    $('statusText').innerHTML = `${ico('crown')}<span>${esc(t('inLobby', { name: r.name }))}</span> <button class="lnk" id="lrBackLnk">${esc(t('rBackShort'))}</button>`;
    $('lrBackLnk').onclick = () => { const tab = document.querySelector('.tab[data-view="rooms"]'); if (tab) tab.click(); rShow('mine'); };
  }
}
// the owner picks another version in the footer while others are in his lobby: ask first (app.js, the version list)
async function lrVerAsk(name) {
  const r = LR.room && lrMine(LR.room) ? LR.room : null, me = lrMe();
  if (!r || r.owner !== me || r.game !== 'elite') return true;
  const others = (r.slots || []).filter(s => s && s.steam !== me).map(s => s.name);
  if (!others.length) return true;
  const ok = await askBox(t('verAskT'), [t('verAskText', { v: name }), t('verAskWho', { who: others.join(', ') })], [{ label: t('verAskGo', { v: name }), cls: 'gold', val: 1 }, { label: t('rjCancel'), val: 0 }]);
  return !!ok;
}
document.addEventListener('click', e => { if (LR.drop && !e.target.closest('.ldd')) { LR.drop = null; LR.popForce = 1; lrRender(); } });
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { if (!$('rooms').classList.contains('hidden')) lrLoad(); }));
lrLoad();
setTimeout(lrLoad, 4000);   // signed in by itself a moment after the start (app.js chInit)

// 06.11.2026: a start called off for another race in the game, the mark of who spoiled starts, the start's time limit
Object.assign(T.en, { n_race: '{who}: the game had another race ({why}) - the start is off. The launcher now sets the room\'s army itself; if it happens again, close Find a Game in the game first.', lrSpoil: 'spoiled a start ×{n}', gf_army: 'the army could not be set', gf_expired: 'the start was over' });
Object.assign(T.ru, { n_race: '{who}: в игре стояла другая раса ({why}) — запуск отменён. Лаунчер сам выставляет армию комнаты; если повторится — сначала закройте Find a Game в игре.', lrSpoil: 'сорвал запуск ×{n}', gf_army: 'не удалось выставить армию', gf_expired: 'запуск уже закончился' });
Object.assign(T.es, { n_race: '{who}: el juego tenía otra raza ({why}): el inicio se canceló.', lrSpoil: 'arruinó un inicio ×{n}', gf_army: 'no se pudo poner el ejército', gf_expired: 'el inicio ya terminó' });
Object.assign(T.fr, { n_race: '{who} : le jeu avait une autre race ({why}) : lancement annulé.', lrSpoil: 'a fait échouer un lancement ×{n}', gf_army: 'l\'armée n\'a pas pu être choisie', gf_expired: 'le lancement était terminé' });
Object.assign(T.de, { n_race: '{who}: Im Spiel war ein anderes Volk eingestellt ({why}) – der Start wurde abgebrochen.', lrSpoil: 'hat einen Start verhindert ×{n}', gf_army: 'die Armee ließ sich nicht setzen', gf_expired: 'der Start war vorbei' });

// 1.4.25 (owner 06.11.2026: "I made a room in the launcher and the Online list on the main page does not show it - nobody in the chat
// sees that someone made a game"): the open rooms in the Online block (app.js onRender), as the searching list - the host, the mode,
// seats taken / all, Join (the Rooms tab and into this room). The list is LR.list: "lrooms" of the snapshot (c/live, ladder 06.11),
// then the lroom / lroom_gone events; an older ladder without it - the list from lroom/list as before.
Object.assign(T.en, { onRooms: 'In rooms' });
Object.assign(T.ru, { onRooms: 'В комнатах' });
Object.assign(T.es, { onRooms: 'En salas' });
Object.assign(T.fr, { onRooms: 'Dans des salons' });
Object.assign(T.de, { onRooms: 'In Räumen' });
function lrOnSoon() { if (typeof onSoon === 'function') onSoon(); }
function lrFromLive(rooms) { LR.list = rooms; lrRender(); }
function lrOnRooms() { return LR.list.filter(x => x.state === 'lobby' || x.state === 'countdown'); }
function lrOnGroup(group, rooms) {
  return group('lroom', t('onRooms'), rooms.reduce((n, x) => n + (x.players || 0), 0), rooms.map(x => {
    const known = x.owner && LIVE.users[x.owner], mine = LR.room && LR.room.id === x.id && lrMine(LR.room);
    const tip = [x.name, x.map_name || x.map, x.game === 'vanilla' ? t('roomsVan') : 'Elite ' + (x.ver || '')].filter(Boolean).join(' · ');
    return `<div class="on-p" title="${esc(tip)}">${avatar(known ? onUser(x.owner).avatar : '')}`
      + (known ? onWho(x.owner) : `<span class="nm">${esc(x.owner_name || 'Player')}</span>`)
      + `<span class="tag lr-m">${esc(x.mode)}</span>${x.game === 'vanilla' ? `<span class="tag van">${esc(t('roomsVan'))}</span>` : ''}`
      + `<span class="since">${esc(String(x.players))}/${esc(String(x.cap))}</span>`
      + (mine || x.players < x.cap ? `<button class="lr-go" data-id="${esc(x.id)}">${esc(t(mine ? 'roomsHere' : 'lrJoin'))}</button>` : `<span class="tag">${esc(t('lrFull'))}</span>`)
      + '</div>';
  }).join(''));
}
function lrOnBind(box) { box.querySelectorAll('.lr-go[data-id]').forEach(b => b.onclick = () => lrJoinHome(b.dataset.id)); }
async function lrJoinHome(id) {
  const tab = document.querySelector('.tab[data-view="rooms"]'); if (tab) tab.click();   // the Rooms tab; not signed in - it says how
  if (!lrMe() || (LR.room && LR.room.id === id && lrMine(LR.room))) return;
  await lrCall('join', { id });
}

// 1.5.0 (D): the Rooms tab's panel, the one list, the running matches, Play as the lobby's button
Object.assign(T.en, { lrSaving: 'Saving…', rOpen: 'Open lobbies', rLive: 'Running matches', rTagLr: 'launcher', rLegLr: 'a lobby in the launcher: the match on our servers, the start for everyone at once.',
  rLegGame: 'Unmarked - a lobby in the game: the launcher starts the game and joins it by itself.', rLiveNote: 'Only the matches on our servers: from the launcher\'s lobbies and from Find a Game. Watch - the game opens the match as a replay, a few minutes behind.',
  rFltWhere: 'Where', rFltAll: 'All', rFltLr: 'In the launcher', rFltGame: 'In the game', rFltVer: 'Version', rFltMine: 'Mine', rFltFree: 'free seats', rFltFrom: 'From', rFltFromLr: 'Launcher lobbies',
  rNone: 'Nobody is setting up a game right now - create your lobby and everybody sees it here.', rNoneFilter: 'Nothing under these filters.', rLiveNone: 'No matches on our servers right now.',
  rJoinTip: 'Join the lobby “{name}”', rWatchTip: 'Watch this match in the game as a replay (a few minutes behind)', rHost: 'host {name}',
  rSignInNote: 'Without signing in you can look at the lists; to create a lobby or join one - sign in.', rStCd: 'counting down', rStWait: 'waiting for {n}', rStAll: 'all ready',
  rMineHost: 'Your lobby', rMineIn: 'You are in the lobby', rBack: 'Back to the lobby ›', rBackShort: 'Back ›', rInGame: 'You are in a game lobby', rInGameNote: 'it is open in the game itself', rCreate: 'Create a lobby',
  rdyMine: 'Press when you are ready', rdyMineOn: 'You are ready - press to take it back', playLaunching: 'Starting…', playCd: 'Start in', playStart: 'Start the match', playHost: 'Waiting for the host',
  playWait: 'Ready {n} of {m}', tipStop: 'Press to stop the countdown', tipCd: 'Leaving or taking back "ready" stops it', tipStart: 'A 10 s countdown, then the game starts for everyone',
  tipHost: 'All ready - the host starts the match', tipWait: 'Waiting for: {who}', whoYou: 'you', whoFree: 'free seats', inLobby: 'You are in the lobby “{name}”',
  verAskT: 'Change the lobby\'s version?', verAskText: 'The lobby moves to {v}.', verAskWho: '{who} have another version: their "ready" goes, they switch to it or leave the lobby.', verAskGo: 'Change to {v}',
  lrLeave: 'Leave the lobby', lrKick: 'Remove from the lobby', lrSit: 'Sit here' });
Object.assign(T.ru, { lrSaving: 'Сохраняю…', rOpen: 'Открытые лобби', rLive: 'Идущие матчи', rTagLr: 'лаунчер', rLegLr: 'лобби в лаунчере: матч на наших серверах, старт у всех сразу.',
  rLegGame: 'Без пометки — лобби в игре: лаунчер сам запустит игру и зайдёт в него.', rLiveNote: 'Только матчи на наших серверах: из лобби лаунчера и из Find a Game. Смотреть — игра откроет матч как реплей, с отставанием на несколько минут.',
  rFltWhere: 'Где', rFltAll: 'Все', rFltLr: 'В лаунчере', rFltGame: 'В игре', rFltVer: 'Версия', rFltMine: 'Моя', rFltFree: 'есть места', rFltFrom: 'Откуда', rFltFromLr: 'Лобби лаунчера',
  rNone: 'Сейчас никто не собирает игру — создайте своё лобби, и оно появится здесь у всех.', rNoneFilter: 'По этим фильтрам ничего нет.', rLiveNone: 'Сейчас на наших серверах матчей нет.',
  rJoinTip: 'Войти в лобби «{name}»', rWatchTip: 'Смотреть этот матч в игре как реплей (с отставанием на несколько минут)', rHost: 'хост {name}',
  rSignInNote: 'Без входа можно смотреть списки; создать лобби или войти в него — после входа.', rStCd: 'идёт отсчёт', rStWait: 'ждём {n}', rStAll: 'все готовы',
  rMineHost: 'Ваше лобби', rMineIn: 'Вы в лобби', rBack: 'Вернуться в лобби ›', rBackShort: 'Вернуться ›', rInGame: 'Вы в лобби игры', rInGameNote: 'оно открыто в самой игре', rCreate: 'Создать лобби',
  rdyMine: 'Нажмите, когда будете готовы', rdyMineOn: 'Вы готовы — нажмите, чтобы снять готовность', playLaunching: 'Запуск…', playCd: 'Старт через', playStart: 'Начать матч', playHost: 'Ждём хозяина',
  playWait: 'Готовы {n} из {m}', tipStop: 'Нажмите, чтобы остановить отсчёт', tipCd: 'Выход или снятая готовность остановят отсчёт', tipStart: 'Отсчёт 10 секунд, затем игра стартует у всех',
  tipHost: 'Все готовы — матч запускает хозяин лобби', tipWait: 'Ждём: {who}', whoYou: 'вас', whoFree: 'свободные места', inLobby: 'Вы в лобби «{name}»',
  verAskT: 'Сменить версию лобби?', verAskText: 'Лобби перейдёт на {v}.', verAskWho: 'У {who} другая версия: их готовность снимется, им нужно будет переключиться или выйти из лобби.', verAskGo: 'Сменить на {v}',
  lrLeave: 'Выйти из лобби', lrKick: 'Убрать из лобби', lrSit: 'Сесть сюда' });
Object.assign(T.es, { lrSaving: 'Guardando…', rOpen: 'Salas abiertas', rLive: 'Partidas en curso', rTagLr: 'launcher', rLegLr: 'sala del launcher: la partida en nuestros servidores, el inicio para todos a la vez.',
  rLegGame: 'Sin marca: sala del juego; el launcher inicia el juego y entra solo.', rLiveNote: 'Solo partidas en nuestros servidores: de las salas del launcher y de Find a Game. Ver: el juego abre la partida como repetición, unos minutos por detrás.',
  rFltWhere: 'Dónde', rFltAll: 'Todas', rFltLr: 'En el launcher', rFltGame: 'En el juego', rFltVer: 'Versión', rFltMine: 'La mía', rFltFree: 'con plazas', rFltFrom: 'Origen', rFltFromLr: 'Salas del launcher',
  rNone: 'Nadie está preparando una partida: crea tu sala y todos la verán aquí.', rNoneFilter: 'Nada con estos filtros.', rLiveNone: 'Ahora no hay partidas en nuestros servidores.',
  rJoinTip: 'Entrar en la sala «{name}»', rWatchTip: 'Ver esta partida en el juego como repetición (unos minutos por detrás)', rHost: 'anfitrión {name}',
  rSignInNote: 'Sin iniciar sesión puedes ver las listas; para crear o entrar en una sala, inicia sesión.', rStCd: 'cuenta atrás', rStWait: 'faltan {n}', rStAll: 'todos listos',
  rMineHost: 'Tu sala', rMineIn: 'Estás en la sala', rBack: 'Volver a la sala ›', rBackShort: 'Volver ›', rInGame: 'Estás en una sala del juego', rInGameNote: 'está abierta en el propio juego', rCreate: 'Crear sala',
  rdyMine: 'Pulsa cuando estés listo', rdyMineOn: 'Estás listo: pulsa para quitarlo', playLaunching: 'Iniciando…', playCd: 'Inicio en', playStart: 'Empezar la partida', playHost: 'Esperando al anfitrión',
  playWait: 'Listos {n} de {m}', tipStop: 'Pulsa para detener la cuenta atrás', tipCd: 'Salir o quitar «listo» la detiene', tipStart: 'Cuenta atrás de 10 s, luego el juego se inicia para todos',
  tipHost: 'Todos listos: el anfitrión inicia la partida', tipWait: 'Esperando a: {who}', whoYou: 'ti', whoFree: 'plazas libres', inLobby: 'Estás en la sala «{name}»',
  verAskT: '¿Cambiar la versión de la sala?', verAskText: 'La sala pasa a {v}.', verAskWho: '{who} tienen otra versión: pierden el «listo» y deben cambiarla o salir.', verAskGo: 'Cambiar a {v}',
  lrLeave: 'Salir de la sala', lrKick: 'Quitar de la sala', lrSit: 'Sentarse aquí' });
Object.assign(T.fr, { lrSaving: 'Enregistrement…', rOpen: 'Salons ouverts', rLive: 'Parties en cours', rTagLr: 'launcher', rLegLr: 'salon du launcher : la partie sur nos serveurs, le départ pour tous en même temps.',
  rLegGame: 'Sans marque : salon du jeu ; le launcher lance le jeu et y entre tout seul.', rLiveNote: 'Seulement les parties sur nos serveurs : des salons du launcher et de Find a Game. Regarder : le jeu ouvre la partie en replay, quelques minutes de retard.',
  rFltWhere: 'Où', rFltAll: 'Tous', rFltLr: 'Dans le launcher', rFltGame: 'Dans le jeu', rFltVer: 'Version', rFltMine: 'La mienne', rFltFree: 'places libres', rFltFrom: 'Origine', rFltFromLr: 'Salons du launcher',
  rNone: 'Personne ne prépare de partie : créez votre salon et tout le monde le verra ici.', rNoneFilter: 'Rien avec ces filtres.', rLiveNone: 'Aucune partie sur nos serveurs en ce moment.',
  rJoinTip: 'Rejoindre le salon « {name} »', rWatchTip: 'Regarder cette partie dans le jeu en replay (quelques minutes de retard)', rHost: 'hôte {name}',
  rSignInNote: 'Sans connexion vous voyez les listes ; pour créer ou rejoindre un salon, connectez-vous.', rStCd: 'compte à rebours', rStWait: 'il manque {n}', rStAll: 'tous prêts',
  rMineHost: 'Votre salon', rMineIn: 'Vous êtes dans le salon', rBack: 'Retour au salon ›', rBackShort: 'Retour ›', rInGame: 'Vous êtes dans un salon du jeu', rInGameNote: 'il est ouvert dans le jeu', rCreate: 'Créer un salon',
  rdyMine: 'Appuyez quand vous êtes prêt', rdyMineOn: 'Vous êtes prêt : appuyez pour annuler', playLaunching: 'Lancement…', playCd: 'Départ dans', playStart: 'Lancer la partie', playHost: 'En attente de l\'hôte',
  playWait: 'Prêts {n} sur {m}', tipStop: 'Appuyez pour arrêter le compte à rebours', tipCd: 'Partir ou annuler « prêt » l\'arrête', tipStart: 'Compte à rebours de 10 s, puis le jeu démarre pour tous',
  tipHost: 'Tous prêts : l\'hôte lance la partie', tipWait: 'En attente de : {who}', whoYou: 'vous', whoFree: 'places libres', inLobby: 'Vous êtes dans le salon « {name} »',
  verAskT: 'Changer la version du salon ?', verAskText: 'Le salon passe à {v}.', verAskWho: '{who} ont une autre version : leur « prêt » est retiré, ils doivent changer ou quitter.', verAskGo: 'Passer à {v}',
  lrLeave: 'Quitter le salon', lrKick: 'Retirer du salon', lrSit: 'S\'asseoir ici' });
Object.assign(T.de, { lrSaving: 'Speichern…', rOpen: 'Offene Lobbys', rLive: 'Laufende Matches', rTagLr: 'Launcher', rLegLr: 'Lobby im Launcher: das Match auf unseren Servern, Start für alle gleichzeitig.',
  rLegGame: 'Ohne Markierung – Lobby im Spiel: der Launcher startet das Spiel und tritt selbst bei.', rLiveNote: 'Nur Matches auf unseren Servern: aus Launcher-Lobbys und Find a Game. Zuschauen – das Spiel öffnet das Match als Replay, ein paar Minuten zurück.',
  rFltWhere: 'Wo', rFltAll: 'Alle', rFltLr: 'Im Launcher', rFltGame: 'Im Spiel', rFltVer: 'Version', rFltMine: 'Meine', rFltFree: 'freie Plätze', rFltFrom: 'Quelle', rFltFromLr: 'Launcher-Lobbys',
  rNone: 'Gerade bereitet niemand ein Spiel vor – erstelle deine Lobby, alle sehen sie hier.', rNoneFilter: 'Nichts mit diesen Filtern.', rLiveNone: 'Gerade keine Matches auf unseren Servern.',
  rJoinTip: 'Der Lobby „{name}“ beitreten', rWatchTip: 'Dieses Match im Spiel als Replay ansehen (ein paar Minuten zurück)', rHost: 'Host {name}',
  rSignInNote: 'Ohne Anmeldung kannst du die Listen sehen; zum Erstellen oder Beitreten anmelden.', rStCd: 'Countdown läuft', rStWait: 'warten auf {n}', rStAll: 'alle bereit',
  rMineHost: 'Deine Lobby', rMineIn: 'Du bist in der Lobby', rBack: 'Zurück zur Lobby ›', rBackShort: 'Zurück ›', rInGame: 'Du bist in einer Spiel-Lobby', rInGameNote: 'sie ist im Spiel selbst offen', rCreate: 'Lobby erstellen',
  rdyMine: 'Drücken, wenn du bereit bist', rdyMineOn: 'Du bist bereit – drücken, um es zurückzunehmen', playLaunching: 'Start…', playCd: 'Start in', playStart: 'Match starten', playHost: 'Warten auf den Host',
  playWait: 'Bereit {n} von {m}', tipStop: 'Drücken, um den Countdown anzuhalten', tipCd: 'Verlassen oder „bereit“ zurücknehmen hält ihn an', tipStart: '10-s-Countdown, dann startet das Spiel bei allen',
  tipHost: 'Alle bereit – der Host startet das Match', tipWait: 'Warten auf: {who}', whoYou: 'dich', whoFree: 'freie Plätze', inLobby: 'Du bist in der Lobby „{name}“',
  verAskT: 'Version der Lobby ändern?', verAskText: 'Die Lobby wechselt auf {v}.', verAskWho: '{who} haben eine andere Version: ihr „bereit“ fällt weg, sie wechseln oder verlassen die Lobby.', verAskGo: 'Auf {v} wechseln',
  lrLeave: 'Lobby verlassen', lrKick: 'Aus der Lobby entfernen', lrSit: 'Hier setzen' });
// the strings of this file (the Rooms tab's panel) came after app.js: a render that ran before it is done again in them
if (typeof S !== 'undefined' && S) render();
