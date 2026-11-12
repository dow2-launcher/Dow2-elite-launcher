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
   lrTeam: 'Team {n}', lrFree: 'Open slot',   lrOwner: 'Room owner',
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
  e_full: 'The room is full.', e_state: 'The room is starting a match right now.', e_kicked: 'You were removed from this lobby.', e_busy: 'Finish the start of your room first.',
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
   lrTeam: 'Команда {n}', lrFree: 'Свободное место',   lrOwner: 'Хост лобби',
  lrReady: 'Готов', lrNotReady: 'Не готов', lrIsReady: 'готов', lrWaiting: 'не готов', lrAway: 'лаунчер закрыт',
  lrMap: 'Карта', lrMode: 'Режим', lrRace: 'Раса', lrHero: 'Герой', lrRandomHero: 'Случайный герой', lrName: 'Название комнаты',
  lrNet: 'Наши серверы от каждого игрока', lrNetPick: 'Матч пойдёт через: {node} (худшая задержка {ms} мс)', lrNetMeasuring: 'Меряем задержки…',
  lrNetNone: 'Ни до одного нашего сервера нет связи у всех: игра попробует первый, игрок без связи с ним может отвалиться.',
  lrNetVia: 'через {node}', lrNetNoStream: 'отвечает, но поток не проходит', lrNetMs: '{ms} мс', lrNetAgain: 'Перемерить',
  lrCd: 'Все готовы — игра запустится через {n} с', lrCdHint: 'Нажмите «Не готов», чтобы остановить.', lrNeedAll: 'Ждём, пока займут все места и все нажмут «Готов».',
  lrLaunching: 'Запускаем игры…', lrCancel: 'Отменить запуск', lrPlayingNow: 'Матч идёт. После него вы снова в этой комнате.',
  lrWhyAddon: 'Включите дополнение «Automatch v2.0» во вкладке «Дополнения» — матч комнаты идёт через него.', lrWhyVer: 'Комната для Elite {v}, а у вас Elite {mine}.',
  lrWhyOs: 'Комнаты работают на Windows и Linux.', lrWhyVan: 'Комната для ванильной Retribution — а в этом лаунчере ванильной игры нет.',
  g_starting: 'запускает игру', g_waiting_game: 'ждём игру', g_accepted: 'игра приняла', g_walking: 'идёт в Find a Game', g_army: 'ставит армию',
  g_searching: 'в поиске', g_matched: 'матч собран', g_room: 'комната хоста готова', g_in_room: 'в комнате', g_loading: 'загрузка', g_playing: 'играет', g_failed: 'ошибка',
  n_joined: '{who} вошёл в комнату.', n_left: '{who} вышел из комнаты.', n_gone: '{who} закрыл лаунчер и выбыл из комнаты.', n_kicked: '{who} убран из комнаты.',
  n_unready: '{who} не готов — отсчёт остановлен.', n_changed: '{who} сменил армию или место — отсчёт остановлен.', n_conf: '{who} изменил комнату — всем снова нажать «Готов».',
  n_cd_stop: 'Отсчёт остановлен.', n_late: 'Не все попали в поиск за {secs} с ({who}) — запуск отменён.', n_version: 'Другая версия игры или мода: {who} — запуск отменён.',
  n_match: 'Матч не собрался ({why}){who2} — запуск отменён.', n_left_search: '{who} остановил поиск — запуск отменён.', n_cancel: '{who} отменил запуск.',
  n_game_failed: 'Игра у {who} не смогла начать поиск ({why}) — запуск отменён.', n_played: 'Матч закончился — с возвращением. Нажмите «Готов» для следующего.',
  e_full: 'В комнате нет мест.', e_state: 'Комната сейчас запускает матч.', e_kicked: 'Вас убрали из этого лобби.', e_busy: 'Сначала дождитесь запуска своей комнаты.',
  e_no_room: 'Комнаты больше нет.', e_auth: 'Сначала войдите через Steam.', e_owner: 'Это может менять только хост.', e_too_many_players: 'Для этого режима слишком много игроков.', e_bad: 'Так нельзя.',
  gf_no_pipe: 'игра запущена без «Automatch v2.0» (MMFind 0.47+) — перезапустите её из лаунчера', gf_no_game: 'игра не запустилась', gf_wrong_game: 'запущена другая игра',
  gf_busy_match: 'игра в матче', gf_in_lobby: 'игра в лобби Custom Games', gf_not_menu: 'игра не в главном меню', gf_no_ownlobby: 'в игре нет OwnLobby',
  gf_walk_timeout: 'Find a Game не открылся', gf_race: 'не удалось выставить расу', gf_left_screen: 'ушли с экрана Find a Game', gf_refused: 'поиск не принят',
  gf_server_cancelled: 'сервер отменил', gf_cancelled: 'отменено', gf_game_closed: 'игра закрылась', gf_no_answer: 'игра не ответила', gf_busy_room: 'запускается другая комната',
  lrMaps: 'Карты', lrMapsPick: 'Выбрать карты', lrMapsN: 'Отмечено карт: {n}', lrMapsRandom: 'Матч возьмёт одну из отмеченных карт наугад.', lrMapsDone: 'Готово', lrMapsFilter: 'Найти карту',
  lrMatchMap: 'Карта матча: {name}', lrOpts: 'Настройки матча', opt_win: 'Условие победы', win_vpc: 'Контроль точек (VPC)', win_annihilate: 'Уничтожение',
  win_vpc_hero: 'VPC — Hero Assault', win_annihilate_hero: 'Уничтожение — Hero Assault', opt_vp: 'Очки победы', opt_start: 'Стартовые позиции', start_fixed: 'Фиксированные', start_random: 'Случайные',
  opt_res: 'Стартовые ресурсы', res_standard: 'Стандартные', res_high: 'Много (High Resources)', lrGameVan: 'Ваниль Retribution', lrSeatsNote: 'Хост садится первым в своей команде, остальные — по порядку мест комнаты.',
});
// es / fr / de (stage 2, 06.11.2026)
Object.assign(T.es, { "lrTitle": "Salas del launcher", "lrNote": "Prepara aquí una partida: el mapa, los equipos, la raza y el héroe de cada uno. Cuando todos estén listos, cuenta atrás de 10 s; luego el juego se inicia para todos y entráis en esta partida (nuestros servidores, sin rating).", "lrCreate": "Crear sala", "lrNone": "Aún no hay salas: crea una y pasa su nombre a tus amigos.", "lrJoin": "Entrar", "lrFull": "llena", "lrPlaying": "en partida", "lrSignIn": "Inicia sesión con Steam (el chat de la página principal) para crear una sala o entrar en ella.", "lrSignInBtn": "Iniciar sesión",  "lrTeam": "Equipo {n}", "lrFree": "Plaza libre",   "lrOwner": "Dueño de la sala", "lrReady": "Listo", "lrNotReady": "No listo", "lrIsReady": "listo", "lrWaiting": "no listo", "lrAway": "launcher cerrado", "lrMap": "Mapa", "lrMode": "Modo", "lrRace": "Raza", "lrHero": "Héroe", "lrRandomHero": "Héroe aleatorio", "lrName": "Nombre de la sala", "lrNet": "Nuestros servidores desde cada jugador", "lrNetPick": "La partida irá por: {node} (peor retardo {ms} ms)", "lrNetMeasuring": "Midiendo los retardos…", "lrNetNone": "Ningún servidor nuestro llega a todos los jugadores: el juego probará el primero; quien no llegue puede desconectarse.", "lrNetVia": "a través de {node}", "lrNetNoStream": "responde, pero el flujo no pasa", "lrNetMs": "{ms} ms", "lrNetAgain": "Medir de nuevo", "lrCd": "Todos listos: el juego se inicia en {n} s", "lrCdHint": "Pulsa No listo para detenerlo.", "lrNeedAll": "Esperando a que se ocupen todas las plazas y todos estén listos.", "lrLaunching": "Iniciando los juegos…", "lrCancel": "Cancelar el inicio", "lrPlayingNow": "La partida está en curso. Después volverás a esta sala.", "lrWhyAddon": "Activa el complemento «Automatch v2.0» en Complementos: la partida de la sala va por él.", "lrWhyVer": "Esta sala es para Elite {v} y tú tienes Elite {mine}.", "lrWhyOs": "Las salas funcionan en Windows y Linux.", "lrWhyVan": "Esta sala es para Retribution vanilla y este launcher no tiene el juego vanilla.", "g_starting": "iniciando el juego", "g_waiting_game": "esperando el juego", "g_accepted": "el juego lo aceptó", "g_walking": "hacia Find a Game", "g_army": "eligiendo el ejército", "g_searching": "buscando", "g_matched": "partida formada", "g_room": "sala del anfitrión lista", "g_in_room": "en la sala", "g_loading": "cargando", "g_playing": "jugando", "g_failed": "error", "n_joined": "{who} entró en la sala.", "n_left": "{who} salió de la sala.", "n_gone": "{who} cerró el launcher y salió de la sala.", "n_kicked": "{who} fue quitado de la sala.", "n_unready": "{who} no está listo: la cuenta atrás se detuvo.", "n_changed": "{who} cambió el ejército o la plaza: la cuenta atrás se detuvo.", "n_conf": "{who} cambió la sala: todos deben pulsar Listo otra vez.", "n_cd_stop": "La cuenta atrás se detuvo.", "n_late": "No todos entraron en la búsqueda en {secs} s ({who}): el inicio se canceló.", "n_version": "Otra versión del juego o del mod: {who}: el inicio se canceló.", "n_match": "La partida no se formó ({why}){who2}: el inicio se canceló.", "n_left_search": "{who} detuvo la búsqueda: el inicio se canceló.", "n_cancel": "{who} canceló el inicio.", "n_game_failed": "El juego de {who} no pudo empezar la búsqueda ({why}): el inicio se canceló.", "n_played": "La partida terminó, bienvenido de vuelta. Pulsa Listo para otra.", "e_full": "La sala está llena.", "e_state": "La sala está iniciando una partida ahora.", "e_kicked": "Te quitaron de esta sala.", "e_busy": "Primero termina el inicio de tu sala.", "e_no_room": "La sala ya no existe.", "e_auth": "Primero inicia sesión con Steam.", "e_owner": "Solo el dueño de la sala puede cambiar eso.", "e_too_many_players": "Demasiados jugadores para ese modo.", "e_bad": "No es posible.", "gf_no_pipe": "el juego corre sin «Automatch v2.0» (MMFind 0.47+): reinícialo desde el launcher", "gf_no_game": "el juego no se inició", "gf_wrong_game": "hay otro juego abierto", "gf_busy_match": "el juego está en una partida", "gf_in_lobby": "el juego está en una sala de Custom Games", "gf_not_menu": "el juego no está en su menú principal", "gf_no_ownlobby": "no hay OwnLobby en el juego", "gf_walk_timeout": "Find a Game no se abrió", "gf_race": "no se pudo poner la raza", "gf_left_screen": "se salió de Find a Game", "gf_refused": "la búsqueda fue rechazada", "gf_server_cancelled": "el servidor la canceló", "gf_cancelled": "cancelado", "gf_game_closed": "el juego se cerró", "gf_no_answer": "el juego no respondió", "gf_busy_room": "se está iniciando otra sala", "lrMaps": "Mapas", "lrMapsPick": "Elegir mapas", "lrMapsN": "{n} mapas marcados", "lrMapsRandom": "La partida usará uno de los mapas marcados al azar.", "lrMapsDone": "Listo", "lrMapsFilter": "Buscar mapa", "lrMatchMap": "Mapa de la partida: {name}", "lrOpts": "Ajustes de la partida", "opt_win": "Condición de victoria", "win_vpc": "Control de puntos de victoria", "win_annihilate": "Aniquilación", "win_vpc_hero": "VPC - Hero Assault", "win_annihilate_hero": "Aniquilación - Hero Assault", "opt_vp": "Puntos de victoria", "opt_start": "Posiciones iniciales", "start_fixed": "Fijas", "start_random": "Aleatorias", "opt_res": "Recursos iniciales", "res_standard": "Estándar", "res_high": "Recursos altos", "lrGameVan": "Retribution vanilla", "lrSeatsNote": "El anfitrión ocupa la primera plaza de su equipo; los demás, en el orden de la sala." });
Object.assign(T.fr, { "lrTitle": "Salons du launcher", "lrNote": "Préparez une partie ici : la carte, les équipes, la race et le héros de chacun. Quand tout le monde est prêt, compte à rebours de 10 s, puis le jeu se lance pour tous et vous arrivez tous dans cette partie (nos serveurs, sans classement).", "lrCreate": "Créer un salon", "lrNone": "Pas encore de salon : créez-en un et donnez son nom à vos amis.", "lrJoin": "Rejoindre", "lrFull": "plein", "lrPlaying": "en partie", "lrSignIn": "Connectez-vous avec Steam (le chat de la page principale) pour créer ou rejoindre un salon.", "lrSignInBtn": "Se connecter",  "lrTeam": "Équipe {n}", "lrFree": "Place libre",   "lrOwner": "Propriétaire du salon", "lrReady": "Prêt", "lrNotReady": "Pas prêt", "lrIsReady": "prêt", "lrWaiting": "pas prêt", "lrAway": "launcher fermé", "lrMap": "Carte", "lrMode": "Mode", "lrRace": "Race", "lrHero": "Héros", "lrRandomHero": "Héros aléatoire", "lrName": "Nom du salon", "lrNet": "Nos serveurs depuis chaque joueur", "lrNetPick": "La partie passera par : {node} (pire délai {ms} ms)", "lrNetMeasuring": "Mesure des délais…", "lrNetNone": "Aucun de nos serveurs n'est joignable par tous : le jeu essaiera le premier, un joueur qui ne le joint pas peut décrocher.", "lrNetVia": "via {node}", "lrNetNoStream": "répond, mais le flux ne passe pas", "lrNetMs": "{ms} ms", "lrNetAgain": "Mesurer à nouveau", "lrCd": "Tous prêts : le jeu se lance dans {n} s", "lrCdHint": "Appuyez sur Pas prêt pour l'arrêter.", "lrNeedAll": "En attente que toutes les places soient prises et que tout le monde soit prêt.", "lrLaunching": "Lancement des jeux…", "lrCancel": "Annuler le lancement", "lrPlayingNow": "La partie est en cours. Ensuite vous revenez dans ce salon.", "lrWhyAddon": "Activez le module « Automatch v2.0 » dans Modules : la partie du salon passe par lui.", "lrWhyVer": "Ce salon est pour Elite {v}, vous avez Elite {mine}.", "lrWhyOs": "Les salons fonctionnent sous Windows et Linux.", "lrWhyVan": "Ce salon est pour Retribution vanilla et ce launcher n'a pas le jeu vanilla.", "g_starting": "lance le jeu", "g_waiting_game": "attend le jeu", "g_accepted": "le jeu a accepté", "g_walking": "vers Find a Game", "g_army": "choix de l'armée", "g_searching": "en recherche", "g_matched": "partie formée", "g_room": "salon de l'hôte prêt", "g_in_room": "dans le salon", "g_loading": "chargement", "g_playing": "en jeu", "g_failed": "échec", "n_joined": "{who} a rejoint le salon.", "n_left": "{who} a quitté le salon.", "n_gone": "{who} a fermé le launcher et a quitté le salon.", "n_kicked": "{who} a été retiré du salon.", "n_unready": "{who} n'est pas prêt : le compte à rebours s'est arrêté.", "n_changed": "{who} a changé d'armée ou de place : le compte à rebours s'est arrêté.", "n_conf": "{who} a modifié le salon : tout le monde doit appuyer à nouveau sur Prêt.", "n_cd_stop": "Le compte à rebours s'est arrêté.", "n_late": "Tout le monde n'est pas entré dans la recherche en {secs} s ({who}) : lancement annulé.", "n_version": "Autre version du jeu ou du mod : {who} : lancement annulé.", "n_match": "La partie ne s'est pas formée ({why}){who2} : lancement annulé.", "n_left_search": "{who} a arrêté la recherche : lancement annulé.", "n_cancel": "{who} a annulé le lancement.", "n_game_failed": "Le jeu de {who} n'a pas pu lancer la recherche ({why}) : lancement annulé.", "n_played": "La partie est terminée, bon retour. Appuyez sur Prêt pour une autre.", "e_full": "Le salon est plein.", "e_state": "Le salon lance une partie en ce moment.", "e_kicked": "Vous avez été retiré de ce salon.", "e_busy": "Terminez d'abord le lancement de votre salon.", "e_no_room": "Le salon n'existe plus.", "e_auth": "Connectez-vous d'abord avec Steam.", "e_owner": "Seul le propriétaire du salon peut changer cela.", "e_too_many_players": "Trop de joueurs pour ce mode.", "e_bad": "Impossible.", "gf_no_pipe": "le jeu tourne sans « Automatch v2.0 » (MMFind 0.47+) : relancez-le depuis le launcher", "gf_no_game": "le jeu ne s'est pas lancé", "gf_wrong_game": "un autre jeu est lancé", "gf_busy_match": "le jeu est en partie", "gf_in_lobby": "le jeu est dans un salon Custom Games", "gf_not_menu": "le jeu n'est pas dans son menu principal", "gf_no_ownlobby": "pas d'OwnLobby dans le jeu", "gf_walk_timeout": "Find a Game ne s'est pas ouvert", "gf_race": "la race n'a pas pu être choisie", "gf_left_screen": "Find a Game a été quitté", "gf_refused": "la recherche a été refusée", "gf_server_cancelled": "le serveur l'a annulée", "gf_cancelled": "annulé", "gf_game_closed": "le jeu s'est fermé", "gf_no_answer": "le jeu n'a pas répondu", "gf_busy_room": "un autre salon se lance", "lrMaps": "Cartes", "lrMapsPick": "Choisir les cartes", "lrMapsN": "{n} cartes cochées", "lrMapsRandom": "La partie prendra au hasard une des cartes cochées.", "lrMapsDone": "OK", "lrMapsFilter": "Chercher une carte", "lrMatchMap": "Carte de la partie : {name}", "lrOpts": "Réglages de la partie", "opt_win": "Condition de victoire", "win_vpc": "Contrôle des points de victoire", "win_annihilate": "Annihilation", "win_vpc_hero": "VPC - Hero Assault", "win_annihilate_hero": "Annihilation - Hero Assault", "opt_vp": "Points de victoire", "opt_start": "Positions de départ", "start_fixed": "Fixes", "start_random": "Aléatoires", "opt_res": "Ressources de départ", "res_standard": "Standard", "res_high": "Ressources élevées", "lrGameVan": "Retribution vanilla", "lrSeatsNote": "L'hôte prend la première place de son équipe ; les autres, dans l'ordre du salon." });
Object.assign(T.de, { "lrTitle": "Launcher-Räume", "lrNote": "Stellt hier ein Spiel zusammen: Karte, Teams, Volk und Held jedes Spielers. Sind alle bereit, läuft ein 10-s-Countdown – dann startet das Spiel bei allen und ihr landet alle in diesem Match (unsere Server, ohne Wertung).", "lrCreate": "Raum erstellen", "lrNone": "Noch keine Räume – erstelle einen und gib deinen Freunden seinen Namen.", "lrJoin": "Beitreten", "lrFull": "voll", "lrPlaying": "im Spiel", "lrSignIn": "Melde dich mit Steam an (Chat auf der Hauptseite), um einen Raum zu erstellen oder beizutreten.", "lrSignInBtn": "Anmelden",  "lrTeam": "Team {n}", "lrFree": "Freier Platz",   "lrOwner": "Raumbesitzer", "lrReady": "Bereit", "lrNotReady": "Nicht bereit", "lrIsReady": "bereit", "lrWaiting": "nicht bereit", "lrAway": "Launcher geschlossen", "lrMap": "Karte", "lrMode": "Modus", "lrRace": "Volk", "lrHero": "Held", "lrRandomHero": "Zufälliger Held", "lrName": "Raumname", "lrNet": "Unsere Server von jedem Spieler aus", "lrNetPick": "Das Match läuft über: {node} (schlechteste Verzögerung {ms} ms)", "lrNetMeasuring": "Verzögerungen werden gemessen…", "lrNetNone": "Keinen unserer Server erreichen alle Spieler: Das Spiel versucht den ersten, wer ihn nicht erreicht, kann rausfliegen.", "lrNetVia": "über {node}", "lrNetNoStream": "antwortet, aber der Datenstrom kommt nicht durch", "lrNetMs": "{ms} ms", "lrNetAgain": "Neu messen", "lrCd": "Alle bereit – das Spiel startet in {n} s", "lrCdHint": "Mit Nicht bereit anhalten.", "lrNeedAll": "Warten, bis alle Plätze besetzt und alle bereit sind.", "lrLaunching": "Spiele werden gestartet…", "lrCancel": "Start abbrechen", "lrPlayingNow": "Das Match läuft. Danach bist du wieder in diesem Raum.", "lrWhyAddon": "Aktiviere das Add-on „Automatch v2.0“ unter Add-ons – das Match des Raums läuft darüber.", "lrWhyVer": "Dieser Raum ist für Elite {v}, du hast Elite {mine}.", "lrWhyOs": "Räume funktionieren unter Windows und Linux.", "lrWhyVan": "Dieser Raum ist für Vanilla-Retribution – dieser Launcher hat das Vanilla-Spiel nicht.", "g_starting": "startet das Spiel", "g_waiting_game": "wartet auf das Spiel", "g_accepted": "Spiel hat übernommen", "g_walking": "zu Find a Game", "g_army": "wählt die Armee", "g_searching": "sucht", "g_matched": "Match gebildet", "g_room": "Raum des Hosts bereit", "g_in_room": "im Raum", "g_loading": "lädt", "g_playing": "spielt", "g_failed": "Fehler", "n_joined": "{who} ist dem Raum beigetreten.", "n_left": "{who} hat den Raum verlassen.", "n_gone": "{who} hat den Launcher geschlossen und ist raus.", "n_kicked": "{who} wurde aus dem Raum entfernt.", "n_unready": "{who} ist nicht bereit – der Countdown wurde angehalten.", "n_changed": "{who} hat Armee oder Platz geändert – der Countdown wurde angehalten.", "n_conf": "{who} hat den Raum geändert – alle drücken erneut Bereit.", "n_cd_stop": "Der Countdown wurde angehalten.", "n_late": "Nicht alle waren in {secs} s in der Suche ({who}) – der Start wurde abgebrochen.", "n_version": "Andere Version des Spiels oder Mods: {who} – der Start wurde abgebrochen.", "n_match": "Das Match kam nicht zustande ({why}){who2} – der Start wurde abgebrochen.", "n_left_search": "{who} hat die Suche beendet – der Start wurde abgebrochen.", "n_cancel": "{who} hat den Start abgebrochen.", "n_game_failed": "Das Spiel von {who} konnte die Suche nicht starten ({why}) – der Start wurde abgebrochen.", "n_played": "Das Match ist vorbei – willkommen zurück. Drücke Bereit für das nächste.", "e_full": "Der Raum ist voll.", "e_state": "Der Raum startet gerade ein Match.", "e_kicked": "Du wurdest aus dieser Lobby entfernt.", "e_busy": "Schließe zuerst den Start deines Raums ab.", "e_no_room": "Den Raum gibt es nicht mehr.", "e_auth": "Melde dich zuerst mit Steam an.", "e_owner": "Nur der Raumbesitzer kann das ändern.", "e_too_many_players": "Zu viele Spieler für diesen Modus.", "e_bad": "Nicht möglich.", "gf_no_pipe": "das Spiel läuft ohne „Automatch v2.0“ (MMFind 0.47+) – starte es aus dem Launcher neu", "gf_no_game": "das Spiel ist nicht gestartet", "gf_wrong_game": "ein anderes Spiel läuft", "gf_busy_match": "das Spiel ist in einem Match", "gf_in_lobby": "das Spiel ist in einer Custom-Games-Lobby", "gf_not_menu": "das Spiel ist nicht im Hauptmenü", "gf_no_ownlobby": "kein OwnLobby im Spiel", "gf_walk_timeout": "Find a Game hat sich nicht geöffnet", "gf_race": "das Volk ließ sich nicht setzen", "gf_left_screen": "Find a Game wurde verlassen", "gf_refused": "die Suche wurde abgelehnt", "gf_server_cancelled": "der Server hat abgebrochen", "gf_cancelled": "abgebrochen", "gf_game_closed": "das Spiel wurde geschlossen", "gf_no_answer": "das Spiel hat nicht geantwortet", "gf_busy_room": "ein anderer Raum startet", "lrMaps": "Karten", "lrMapsPick": "Karten wählen", "lrMapsN": "{n} Karten markiert", "lrMapsRandom": "Das Match nimmt zufällig eine der markierten Karten.", "lrMapsDone": "Fertig", "lrMapsFilter": "Karte suchen", "lrMatchMap": "Karte des Matches: {name}", "lrOpts": "Match-Einstellungen", "opt_win": "Siegbedingung", "win_vpc": "Siegpunkt-Kontrolle", "win_annihilate": "Vernichtung", "win_vpc_hero": "VPC - Hero Assault", "win_annihilate_hero": "Vernichtung - Hero Assault", "opt_vp": "Siegpunkte", "opt_start": "Startpositionen", "start_fixed": "Fest", "start_random": "Zufällig", "opt_res": "Startressourcen", "res_standard": "Standard", "res_high": "Hohe Ressourcen", "lrGameVan": "Vanilla-Retribution", "lrSeatsNote": "Der Host sitzt zuerst in seinem Team, die anderen in der Reihenfolge des Raums." });
// the heroes' names in Russian (the game's own; the server sends the English ones of the Elite data)
const LR_HERO_RU = { 'Chaos Lord': 'Лорд Хаоса', 'Plague Champion': 'Чумной чемпион', 'Chaos Sorcerer': 'Колдун Хаоса', 'Warlock': 'Варлок', 'Warp Spider Exarch': 'Экзарх Варп-пауков',
  'Farseer': 'Провидец', 'Inquisitor': 'Инквизитор', 'Commissar': 'Комиссар', 'Lord General': 'Лорд-генерал', 'Brother-Captain': 'Брат-капитан', 'Eversor Assassin': 'Ассасин Эверсор',
  'Daemonhunter': 'Охотник на демонов', 'Warboss': 'Варбосс', 'Kommando Nob': 'Коммандо-ноб', 'Mekboy': 'Мекбой', 'Force Commander': 'Командор', 'Apothecary': 'Апотекарий',
  'Techmarine': 'Техмарин', 'XV-8 Crisis Commander': 'Командир «Кризис» XV-8', 'Ethereal': 'Эфирный', 'Hive Tyrant': 'Тиран улья', 'Ravener Alpha': 'Альфа-потрошитель', 'Lictor Alpha': 'Альфа-ликтор' };
const LR = { list: [], room: null, cat: {}, host: '', skew: 0, tick: 0, here: 0, pingT: 0, pinging: false, launched: 0, gameEv: null, pop: null };
const lrMmss = n => { n = Math.max(0, Math.round(+n || 0)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };   // 1:45, 0:30
const lrMe = () => (CH.me && CH.me.signed_in ? String(CH.me.steam || '') : '');
// in the room: on a seat, or (1.5.3) among its observers
const lrMine = r => !!(r && lrMe() && ((r.slots || []).some(s => s && s.steam === lrMe()) || (r.obs || []).some(o => o && o.steam === lrMe())));
const lrObsMe = r => !!(r && lrMe() && (r.obs || []).some(o => o && o.steam === lrMe()));
const lrAssets = () => (LR.host || LIVE.host || RM.host || 'https://rts.fintebtc.de') + '/elite/assets/';
const lrHeroName = n => (lang === 'ru' && LR_HERO_RU[n]) || n || '';
// 1.5.10: the node's place in the player's language (the server names them in English: "Moscow (pivolan)", "Poland (Amazon)")
const lrNodeName = (net, ip) => { const n = (net.nodes || []).find(x => x.ip === ip); const nm = n ? n.name : ip;
  return /moscow/i.test(nm) ? t(/pivolan/i.test(nm) ? 'gnMoscow2' : 'netMoscow') : /german/i.test(nm) ? t('netGermany') : /poland/i.test(nm) ? t('gnPoland') : nm; };

async function lrCatalog(game) {
  game = game === 'vanilla' ? 'vanilla' : 'elite';
  if (LR.cat[game]) return LR.cat[game];
  try { const c = await invoke('lroom_list', { what: 'catalog', game }); LR.cat[game] = c; if (c.host) LR.host = c.host; return c; } catch (e) { return null; }
}
async function lrCall(verb, body) {
  let r; try { r = await invoke('lroom_api', { verb, body: body || {} }); } catch (e) { toast(String(e), true); return null; }
  // 1.5.12: removed from a room a moment ago - when he may come back (the ladder says how long, when it keeps him out at all)
  if (r && r.ok === false && verb !== 'here') { const k = r.error === 'kicked' && r.left > 0 ? 'e_kicked_t' : 'e_' + r.error; toast(t(k) !== k ? t(k, { left: lrMmss(r.left) }) : errText(r.error), true); }
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
    owner: v.owner, owner_name: ((v.slots || []).find(s => s && s.steam === v.owner) || {}).name,
    slots: (v.slots || []).map(s => s ? { steam: s.steam, name: s.name, race: s.race, hero: s.hero, rating: s.rating, ready: !!s.ready } : null),
    obs: (v.obs || []).map(o => ({ steam: o.steam, name: o.name })) };
  if (i >= 0) LR.list[i] = sum; else LR.list.push(sum);
  lrRender(); lrLaunchCheck(); lrOnSoon();
  if (PG) renderPgBar();
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
  } else if (ev === 'lroom_kicked') { if (LR.room && LR.room.id === d.id) { const nm = LR.room.name; LR.room = null; toast(t('n_kicked_me', { name: nm }) + (d.left > 0 ? ' ' + t('kickedLeft', { left: lrMmss(d.left) }) : ''), true); } lrRender(); }
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
// 1.5.10: why a start is off, in the player's language: a reason of the game (MMFind: gf_*) or one of the ladder's own
// English phrases (ladder.py _nm_fail / lroom on_search_left) - an unknown one stays as the server sent it
const LR_WHY_SRV = { 'went silent': 'w_silent', 'the host never opened the room': 'w_host_room', 'did not join the room': 'w_no_join',
  'the match never started': 'w_no_start', 'searched again': 'w_again', 'left': 'w_left', 'failed': 'w_failed' };
const lrWhyTxt = w => t('gf_' + w) !== 'gf_' + w ? t('gf_' + w) : LR_WHY_SRV[w] ? t(LR_WHY_SRV[w]) : w;
const lrGameTxt = g => g ? (t('g_' + g) !== 'g_' + g ? t('g_' + g) : g) : '';
function lrNoteTxt(n) {
  if (!n || !n.k) return '';
  const who = (n.who || []).join(', ');
  const why = n.why ? (n.k === 'race' ? t('race_' + n.why) : lrWhyTxt(n.why)) : '';
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
    // 1.5.3 (owner 10.11): the empty avatar, the actions on the right - Sit here, Invite (a player of the launcher, a list like the maps')
    const can = lrMine(r) && open, dd = 'lrInv' + i, on = LR.drop === dd;
    const act = can ? `<span class="fs-act"><button class="btn small lr-sit" data-slot="${i}" data-tip="${esc(t('lrSit'))}" aria-label="${esc(t('lrSit'))}">${ico('seat')}<span class="l">${esc(t('lrSit'))}</span></button>`
      + `<span class="ldd lr-invw${on ? ' open' : ''}"><button class="btn small lr-inv" id="${dd}" data-tip="${esc(t('lrInviteTip'))}" aria-label="${esc(t('lrInviteTip'))}" aria-haspopup="dialog" aria-expanded="${on}">${ico('invite')}<span class="l">${esc(t('lrInvite'))}</span></button>${on ? lrInvMenu(r) : ''}</span></span>` : '';
    return `<div class="lr-slot free"><i class="av sk-av"></i><div class="lr-who"><span class="lr-line"><span class="fr-t">${esc(t('lrFree'))}</span></span>${can ? `<span class="fr-h">${esc(t('lrFreeHint'))}</span>` : ''}</div>${act}</div>`;
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
  const sg = lrSig(r, s);
  const tick = `<span class="flw" data-tip="${esc(tip)}"><button class="rdy${s.ready ? ' on' : ''}${mine && open ? ' mine' : ''}${mine && why && !s.ready ? ' dis' : ''}${sg.flash ? ' flash' : ''}"`
    + `${mine && open ? ' id="lrReadyTick"' : ' tabindex="-1"'} aria-label="${esc(tip)}" aria-pressed="${!!s.ready}"${!(mine && open) || (why && !s.ready) ? ' disabled' : ''}></button></span>`;
  return `<div class="lr-slot${mine ? ' me' : ''}${s.ready ? ' ready' : ''}${sg.cls}"><span class="av-w">${avatar(s.avatar)}${sg.av}</span><div class="lr-who"><span class="lr-line"><span class="nm" data-steam="${esc(s.steam)}" data-name="${esc(s.name)}">${esc(s.name)}</span>`
    + `${s.owner ? `<span class="lr-crown" title="${esc(t('lrOwner'))}" aria-label="${esc(t('lrOwner'))}">${ico('crown')}</span>` : ''}${s.rating ? `<span class="rt">${Number(s.rating) | 0}</span>` : ''}`
    + `${s.spoil ? `<span class="tag bad">${esc(t('lrSpoil', { n: s.spoil }))}</span>` : ''}</span><span class="lr-armyrow">${army}</span></div>`
    + `${gs}${sg.row}${owner && !mine && open ? `<button class="lr-kick" data-kick="${esc(s.steam)}" data-tip="${esc(t('lrKick'))}" aria-label="${esc(t('lrKick'))}">${ico('x')}</button>` : ''}${tick}</div>`;
}
// 1.5.12 (owner 12.11.2026): a ping seen in the room by everybody - who is being called right now (a bell with waves on his
// avatar; the variant "a" of the design puts it in the row's free space instead), then for a few seconds his answer: red - no,
// green - the host comes. A "yes" to a ready check is his tick itself (it flashes) - no second green mark next to it.
// r.ping (the ladder, 1.5.12): { ready|start: { t, until, ttl, from, from_name, to: [steam], ans: { steam: { a: 'yes'|'no', t } } } }
const BELL_SG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="b" d="M7 15.5V11a5 5 0 0 1 10 0v4.5l1.8 1.8H5.2z"/><path class="b" d="M10.3 19.6a1.8 1.8 0 0 0 3.4 0"/>'
  + '<path class="w w1" d="M3.6 8.2a8.6 8.6 0 0 1 2.2-3.4M20.4 8.2a8.6 8.6 0 0 0-2.2-3.4"/><path class="w w2" d="M1.2 9.6a11.6 11.6 0 0 1 2.4-5.8M22.8 9.6a11.6 11.6 0 0 0-2.4-5.8"/>'
  + '<path class="no" d="M4 4l16 16"/><path class="ok" d="M14.5 20.5l2.6 2.4 4.6-5.2"/></svg>';
function lrSig(r, s) {
  const none = { cls: '', av: '', row: '', flash: false };
  if (!r.ping || r.state !== 'lobby') return none;
  const now = Date.now() + LR.skew;
  let st = '', k = '', flash = false;
  for (const kind of ['ready', 'start']) {
    const p = r.ping[kind];
    if (!p || !(p.to || []).includes(s.steam)) continue;
    const a = (p.ans || {})[s.steam];
    if (a && now - a.t < 5000) { if (kind === 'ready' && a.a === 'yes') { flash = now - a.t < 2500; continue; } st = a.a === 'yes' ? 'yes' : 'no'; k = kind; }
    else if (!a && now < p.t + (p.ttl || 30) * 1000 && !(kind === 'ready' && s.ready)) { st = 'wait'; k = kind; }
  }
  if (!st) return Object.assign({}, none, { flash });
  const tip = t('sg_' + k + '_' + st, { who: s.name });
  const el = where => `<span class="pg-sg ${where} ${st}" data-tip="${esc(tip)}" aria-label="${esc(tip)}">${BELL_SG}${where === 'in-row' ? `<em>${esc(t('sgShort_' + st))}</em>` : ''}</span>`;
  return { cls: ' sg-' + st, av: el('on-av'), row: el('in-row'), flash };
}
// what the signals look like now: the room is drawn again when it changes (a call ended, an answer's 5 s are over)
function lrSigKey(r) { return r && r.ping ? (r.slots || []).map(s => s ? lrSig(r, s).cls + (lrSig(r, s).flash ? 'f' : '') : '').join('|') : ''; }
const INV_MARK = 5000;
const lrInvSent = r => { LR.invited = LR.invited || {}; return (LR.invited[r.id] = LR.invited[r.id] || {}); };
function lrInvMenu(r) {
  const inRoom = new Set([...(r.slots || []).filter(Boolean), ...(r.obs || [])].map(s => String(s.steam))), f = (LR.invFind || '').toLowerCase();
  // 1.5.12 (owner 12.11, round 3): no timer here - who is in the lobby (a seat or an observer) is not in the list, anybody else can
  // be invited at any time; "✓ invited" only says it was sent (pressing it again sends again). The spam is held back by the ladder
  // (one delivery per player and room in 30 s, 10 invitations a minute per sender) and by the invited player's launcher (below)
  const sent = lrInvSent(r);
  for (const st of Object.keys(sent)) if (inRoom.has(st)) delete sent[st];   // came in (and maybe left): starts clean
  const people = (LIVE.launcher || []).filter(p => p && p.state !== 'game' && !inRoom.has(String(p.steam)) && onUser(p.steam).name && (!f || onUser(p.steam).name.toLowerCase().includes(f)))
    .sort((a, b) => (onUser(a.steam).name || '').localeCompare(onUser(b.steam).name || ''));
  const row = p => { const u = onUser(p.steam), at = sent[p.steam] || 0, was = Date.now() - at < INV_MARK;   // "✓ invited" for 5 s
    return `<button class="ii${was ? ' sent' : ''}" data-inv="${esc(p.steam)}"${was ? ` data-at="${at}"` : ''}>${avatar(u.avatar)}<span class="nm">${esc(u.name)}</span>${onRt(u.rating)}`
      + `<span class="ii-st">${esc(was ? '✓ ' + t('lrInvSent') : t('lrInvite'))}</span></button>`; };
  const g = (k, ps) => ps.length ? `<div class="ii-g"><span>${esc(t(k))}</span><span>${ps.length}</span></div>${ps.map(row).join('')}` : '';
  const list = g('lrInvMenu', people);
  return `<div class="ldd-l lr-invl" role="dialog" aria-label="${esc(t('lrInviteTip'))}"><input id="lrInvFind" placeholder="${esc(t('lrInvFind'))}" value="${esc(LR.invFind || '')}" autocomplete="off">`
    + `<div class="ii-list">${list || `<div class="note">${esc(t(f ? 'lrInvNoMatch' : 'lrInvNone'))}</div>`}</div></div>`;   // 1.5.12: no note under it (owner 12.11)
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
// 1.5.12 (owner 12.11.2026): the room's event under its head (who came or left, why a start is off) closes by itself - 8 s, 12 s
// for a red one, a line under it runs out, the mouse on it holds it - and by its cross; it slides open and shut. A state (the
// start, the match, why I can not play this room) stays while it lasts, without a cross.
LR.evGone = new Set(); LR.ev = null;
function lrEvHtml(txt, cls, key, sticky) {
  const x = `<button class="ev-x" data-tip="${esc(t('evClose'))}" aria-label="${esc(t('evClose'))}">${ico('x')}</button>`;
  // 1.5.12 (owner 12.11, round 3): a state line (the start, the match, why I can not play) has the cross too, no timer; closed, it
  // stays closed until the state changes
  if (sticky) return `<div class="lr-ev ${cls} st" data-ev="${esc(key)}"><div class="ev-c"><div class="ev-row">${ico('info')}<span>${esc(txt)}</span>${x}</div></div></div>`;
  if (!key) return `<div class="lr-ev ${cls}"><div class="ev-c"><div class="ev-row">${ico('info')}<span>${esc(txt)}</span></div></div></div>`;
  const now = Date.now(), ttl = cls === 'bad' ? 12000 : 8000;
  let fresh = false;
  if (!LR.ev || LR.ev.key !== key) { LR.ev = { key, at: now, held: 0, hold: 0 }; fresh = true; }
  const e = LR.ev, used = Math.max(0, now - e.at - e.held - (e.hold ? now - e.hold : 0));
  return `<div class="lr-ev ${cls} tm${fresh ? ' new' : ''}" data-ev="${esc(key)}" style="--ev-ttl:${ttl}ms;--ev-d:${-used}ms"><div class="ev-c"><div class="ev-row">${ico('info')}<span>${esc(txt)}</span>`
    + `<button class="ev-x" data-tip="${esc(t('evClose'))}" aria-label="${esc(t('evClose'))}">${ico('x')}</button><i class="ev-bar"></i></div></div></div>`;
}
function lrEvClose(el) {
  if (!el || el.classList.contains('closing')) return;
  LR.evGone.add(el.dataset.ev); el.classList.add('closing');
  setTimeout(() => { if (el.isConnected) el.remove(); }, 340);
}
function lrEvBind(box) {
  const st = box.querySelector('.lr-ev.st'); if (st) st.querySelector('.ev-x').onclick = () => lrEvClose(st);
  const el = box.querySelector('.lr-ev.tm'); if (!el) return;
  el.querySelector('.ev-x').onclick = () => lrEvClose(el);
  el.onmouseenter = () => { if (LR.ev && !LR.ev.hold) LR.ev.hold = Date.now(); };
  el.onmouseleave = () => { if (LR.ev && LR.ev.hold) { LR.ev.held += Date.now() - LR.ev.hold; LR.ev.hold = 0; } };
  el.querySelector('.ev-bar').onanimationend = () => lrEvClose(el);
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
  let ev = '', evc = '', evk = '', evs = '';
  if (r.state === 'launching') ev = t('lrLaunching') + (LR.gameEv && LR.gameEv.ev ? ' · ' + lrGameTxt(LR.gameEv.ev === 'failed' ? 'failed' : LR.gameEv.ev) + (LR.gameEv.reason ? ': ' + lrWhyTxt(LR.gameEv.reason) : '') : '');
  else if (r.state === 'playing') ev = t('lrPlayingNow');
  else if (why) { ev = why; evc = 'wa'; }
  if (ev) {                                                        // a state, not an event: closable, closed until it changes
    evs = r.id + ':s:' + (r.state === 'launching' || r.state === 'playing' ? r.state : 'why:' + why);
    if (LR.evGone.has(evs)) { ev = ''; evc = ''; evs = ''; } else evk = evs;
  }
  if (!ev && r.note && r.note.k) {                                 // the room's last event (closes by itself)
    const key = r.id + ':' + (r.note.t || 0) + ':' + r.note.k;
    if (!LR.evGone.has(key)) { ev = lrNoteTxt(r.note); evc = /late|version|match|left_search|game_failed|race|cancel|kicked/.test(r.note.k) ? 'bad' : ''; evk = key; }
  }
  const vt = r.game === 'vanilla' ? `<span class="tag van">${esc(t('lrGameVan'))}</span>` : '';
  const ping = lrPingBtn(r, 'lr-ping');
  const obs = (r.obs || []).length ? `<div class="lr-obsrow">${ico('eye')}<span class="k">${esc(t('lrObs'))} · ${r.obs.length}/${r.obs_cap != null ? r.obs_cap : Math.max(0, 8 - (r.slots || []).length)}</span>${r.obs.map(o => `<span class="o${o.steam === me ? ' me' : ''}">${avatar(o.avatar)}<span class="nm">${esc(o.name)}</span></span>`).join('')}</div>` : '';
  return `<div class="lr-head">${edit ? `<input id="lrNameIn" maxlength="48" value="${esc(r.name)}" aria-label="${esc(t('lrName'))}">` : `<span class="lr-title">${esc(r.name)}</span>`}`
    + `${modeSel}${vt}${ping}<button class="btn small" id="lrLeaveBtn">${esc(t('lrLeave'))}</button></div>`
    + (ev ? lrEvHtml(ev, evc, evk, !!evs) : '')
    + `<div class="lr-body"><div class="lr-teams">${team(0)}<div class="lr-vs">vs</div>${team(1)}${obs}</div>`
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
  // 1.5.3 (owner 10.11): observers - our automatch takes 8 - 2 x the team (3v3: 2, 2v2: 4, 1v1: 6); the lobby's go into its match
  const oc = x.obs_cap != null ? x.obs_cap : Math.max(0, 8 - (x.cap || 2)), on = (x.obs || []).length;
  const watch = !mine && open && on < oc ? `<button class="rjoin lr-watch" data-id="${esc(x.id)}" data-tip="${esc(t('lrWatchJoin', { n: on, m: oc }))}" aria-label="${esc(t('lrWatchJoin', { n: on, m: oc }))}">${ico('eye')}</button>` : '';
  // the room's game on every card: vanilla, or its Elite version (one look; a card of another version is dimmed)
  const vt = x.game === 'vanilla' ? `<span class="tag van">${esc(t('roomsVan'))}</span>` : `<span class="tag ver">Elite ${esc(x.ver || '')}</span>`;
  // 1.5.3 (owner 10.11): the teams as on a game lobby's card; a ladder without the seats in its list - the names in a line
  const per = Math.max(1, Math.round((x.cap || 2) / 2)), sl = Array.isArray(x.slots) && x.slots.length ? x.slots : null;
  const pic = p => !p.race || p.race === 'random' ? raceImg('random') : p.hero >= 0
    ? `<img src="${A}heroes/${esc(p.race)}_${p.hero | 0}.png" alt="" data-fb="${A}races/${esc(p.race)}.png">` : raceImg(p.race);
  const row = p => p ? `<div class="rp${p.steam === x.owner ? ' host' : ''}">${pic(p)}<span class="nm" data-steam="${esc(p.steam || '')}" data-name="${esc(p.name || '')}">${esc(p.name)}</span>`
    + `${p.ready ? `<span class="rk" title="${esc(t('lrIsReady'))}"></span>` : ''}${p.rating ? `<span class="rt">${Number(p.rating) | 0}</span>` : ''}</div>`
    : `<div class="rp free"><i class="sk"></i><span class="nm">${esc(t('roomsFree'))}</span></div>`;
  const teams = sl ? [0, 1].map(k => { const ps = sl.slice(k * per, k * per + per), rts = ps.filter(Boolean).map(p => p.rating).filter(Boolean);
    const avg = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
    return `<div class="team"><div class="th"><span>${esc(t('rTeamShort', { n: k + 1 }))}</span>${avg ? `<span>${esc(t('rAvg', { r: avg }))}</span>` : ''}</div>${ps.map(row).join('')}</div>`; }).join('') : '';
  return `<div class="room lr-card${vok ? '' : ' dim'}" data-kind="lr" data-mode="${esc(x.mode)}" data-vok="${vok ? 1 : 0}" data-van="${x.game === 'vanilla' ? 1 : 0}" data-free="${free > 0 && open ? 1 : 0}">`
    + mmapHtml(`${A}maps/${encodeURIComponent(x.map)}.png`, x.map_name || x.map) + '<div class="rb">'
    + `<div class="rh"><span class="tag lr">${esc(t('rTagLr'))}</span><span class="rn" title="${esc(x.name)}">${esc(x.name)}</span><span class="tag">${esc(x.mode)}</span></div>`
    + (sl ? `<div class="teams">${teams}</div>` : `<div class="lr-names">${(x.names || []).map(esc).join(', ')}</div>`)
    + (on ? `<div class="robs" title="${esc(t('roomsObs'))}">${ico('eye')}${x.obs.map(o => `<span class="nm">${esc(o.name)}</span>`).join('<span class="sep">·</span>')}</div>` : '')
    + `<div class="rfoot2">${vt}<span class="tag rcount">${x.players}/${x.cap}</span>${watch}${act}</div></div></div>`;
}
function lrListHtml() { return LR.list.map(lrCardHtml).join(''); }
const segf = (key, items, cur) => `<div class="seg" role="radiogroup">${items.map(([v, l, tip]) => `<button role="radio" aria-checked="${v === cur}" class="${v === cur ? 'on' : ''}" data-f="${key}" data-v="${esc(v)}"${tip ? ` data-tip="${esc(tip)}"` : ''}>${esc(l)}</button>`).join('')}</div>`;
function rFilters() {
  const mine = S && /^\d/.test(S.installed_version || '') ? 'Elite ' + S.installed_version : t('rFltMine');
  $('rFlt').innerHTML = `<span>${esc(t('rFltWhere'))}${segf('kind', [['all', t('rFltAll')], ['lr', t('rFltLr'), t('rFltLrTip')], ['game', t('rFltGame'), t('rFltGameTip')]], RF.kind)}</span>`
    + `<span>${esc(t('lrMode'))}${segf('mode', [['all', t('rFltAll')], ['1v1', '1v1'], ['2v2', '2v2'], ['3v3', '3v3']], RF.mode)}</span>`
    + `<label class="chk"><input type="checkbox" id="rFltFree"${RF.free ? ' checked' : ''}><span>${esc(t('rFltFree'))}</span></label>`
    + `<span>${esc(t('rFltVer'))}<select id="rFltVer"><option value="all"${RF.ver === 'all' ? ' selected' : ''}>${esc(t('rFltAll'))}</option><option value="mine"${RF.ver === 'mine' ? ' selected' : ''}>${esc(mine)}</option><option value="van"${RF.ver === 'van' ? ' selected' : ''}>${esc(t('roomsVan'))}</option></select></span>`;
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
    return `<div class="room live-card">${mmapHtml(`${A}maps/${encodeURIComponent(m.map || '')}.png`, map)}<div class="rb">`
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
    return `<div class="rmine-w"><button class="rmine${RV.view === 'mine' ? ' on' : ''}" id="rMine" data-tip="${esc(r.name)}"><span class="mi">${ico('crown')}</span><span class="k">${esc(t(r.owner === lrMe() ? 'rMineHost' : 'rMineIn'))}</span>`
      + `<b>${esc(r.name)}</b><small>${esc(r.mode)} · ${filled.length}/${(r.slots || []).length} · ${esc(st)}</small>${RV.view === 'mine' ? '' : `<span class="go">${esc(t('rBack'))}</span>`}</button>`
      + `<button class="rmine-x" id="rMineX" data-tip="${esc(t('lrLeave'))}" aria-label="${esc(t('lrLeave'))}">${ico('x')}</button></div>`;
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
  if ($('rMineX')) $('rMineX').onclick = e => { e.stopPropagation(); lrLeave(); };
  if ($('rCreate')) $('rCreate').onclick = lrCreate;
  if ($('rSignIn')) $('rSignIn').onclick = chLogin;
  document.querySelectorAll('.rnb[data-r]').forEach(b => { b.classList.toggle('on', b.dataset.r === RV.view); b.onclick = () => rShow(b.dataset.r); });
  $('rOpen').classList.toggle('hidden', RV.view !== 'open');
  $('rLive').classList.toggle('hidden', RV.view !== 'live');
  $('rooms').classList.toggle('in-lroom', RV.view === 'mine');
  if (!$('rFlt').innerHTML) rFilters();
  list.innerHTML = lrListHtml();
  list.querySelectorAll('.lr-join').forEach(b => b.onclick = () => lrCall('join', { id: b.dataset.id }));
  list.querySelectorAll('.lr-watch').forEach(b => b.onclick = () => lrCall('join', { id: b.dataset.id, as: 'obs' }));
  list.querySelectorAll('img[data-fb]').forEach(i => i.onerror = () => { i.onerror = null; i.src = i.dataset.fb; });
  list.querySelectorAll('.rp .nm[data-steam]').forEach(n => { if (n.dataset.steam) nickBind(n, n.dataset.steam, n.dataset.name); });
  tipCut(list);
  rApplyFilter(); rLiveRender(); lrPlay();
  if (!(r && RV.view === 'mine')) { box.classList.add('hidden'); box.innerHTML = ''; LR.drop = null; LR.mapsOpen = false; LR.pop = null; if (window.popClear) popClear(); return; }
  if (((LR.pop && LR.mapsOpen) || LR.drop || Date.now() < (LR.holdUntil || 0)) && !LR.popForce) return;   // a drop-down / the map list in use
  LR.popForce = 0;
  const focus = document.activeElement && document.activeElement.id;
  box.innerHTML = lrRoomHtml(r); box.classList.remove('hidden'); LR.sigKey = lrSigKey(r);
  lrBind(r);
  if (focus === 'lrNameIn' && $('lrNameIn')) $('lrNameIn').focus();
}
// leave my lobby: the lobby's button, the cross in the panel, the block on Home
async function lrLeave() {
  const r = LR.room; if (!r) return;
  LR.room = null; LR.drop = null; LR.mapsOpen = false; LR.pop = null; lrRender();
  await lrCall('leave'); invoke('lroom_launch_cancel', { room: r.id }).catch(() => {}); lrLoad();
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
  $('lrLeaveBtn').onclick = lrLeave;
  box.querySelectorAll('.lr-pingb[data-ping]').forEach(b => b.onclick = () => lrPing(b.dataset.ping));
  lrEvBind(box);
  // Invite on a free seat: the list of the launcher's players; a name sends the invitation (lroom.py "invite"), marked as sent
  box.querySelectorAll('.lr-inv').forEach(b => b.onclick = e => { e.stopPropagation(); LR.drop = LR.drop === b.id ? null : b.id; LR.invFind = ''; LR.popForce = 1; lrRender(); if ($('lrInvFind')) $('lrInvFind').focus(); });
  if ($('lrInvFind')) $('lrInvFind').oninput = e => { LR.invFind = e.target.value; LR.popForce = 1; lrRender(); const f = $('lrInvFind'); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } };
  box.querySelectorAll('.ii[data-inv]').forEach(b => b.onclick = async e => {
    e.stopPropagation(); const st = b.dataset.inv; lrInvSent(r)[st] = Date.now(); LR.popForce = 1; lrRender();
    const res = await lrCall('invite', { steam: st }); if (res && res.ok !== false) toast(t('lrInvToast', { name: onUser(st).name || '' }));
  });
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
  box.querySelectorAll('.lr-kick').forEach(b => b.onclick = () => { delete lrInvSent(r)[b.dataset.kick]; lrCall('kick', { steam: b.dataset.kick }); });
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
  if (window.popOut) popOut(box);   // layer.js: the open list over everything
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
  if ($('lobbySound') && document.activeElement !== $('lobbySound')) $('lobbySound').value = lrSoundPick();   // Settings: the launcher's pick
  wrap.removeAttribute('data-tip'); cf.classList.add('hidden'); play.classList.remove('lb', 'gl');
  lrMiniRender(r);
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
  } else if (r.hs && lrOthersReady(r)) {
    // 1.5.12 (owner 12.11): every OTHER seat taken and ready - the host's Start (it marks him ready as well), the others wait for the host
    const hostReady = !!(slots.find(s => s && s.steam === r.owner) || {}).ready;
    if (owner) { play.textContent = t('playStart'); play.disabled = false; play.classList.add('gl'); wrap.dataset.tip = t('tipStart'); play.onclick = () => lrStart(r); }
    else { play.textContent = t('playHost'); play.disabled = true; wrap.dataset.tip = t(hostReady ? 'tipHost' : 'tipHostNR'); }
  } else {
    const who = slots.map(s => !s ? null : s.ready ? '' : s.steam === me ? t('whoYou') : s.name).filter(x => x).concat(slots.some(s => !s) ? [t('whoFree')] : []);
    play.textContent = t('playWait', { n: nReady, m: cap }); play.disabled = true; wrap.dataset.tip = t('tipWait', { who: who.join(', ') });
  }
  // the version of my lobby is mine: the owner switched it in the footer - the room follows
  if (owner && r.game === 'elite' && /^\d/.test(S.installed_version || '') && r.ver && !verSame(r.ver, S.installed_version) && !S.busy && LR.verSent !== S.installed_version) {
    LR.verSent = S.installed_version; lrCall('conf', { ver: S.installed_version });
  }
}
// 1.5.3 (owner 10.11): the lobby I am in, a small block under Online on Home - a reminder: its map and name, how many are
// ready (no names), the observers, Back and Leave (the players themselves and who is ready are in the lobby; no line next to Play any more)
function lrMiniRender(r) {
  const box = $('lrMini'); if (!box) return;
  box.classList.toggle('hidden', !r);
  if (!r) { box.innerHTML = ''; return; }
  const me = lrMe(), slots = r.slots || [], A = lrAssets(), owner = r.owner === me, nObs = (r.obs || []).length;
  // the state in one line, without names: ready n of m, all ready, the countdown, the start, the match (owner 10.11)
  const all = r.all_ready != null ? r.all_ready : slots.every(s => s && s.ready);
  const st = r.state === 'countdown' ? t('playCd') + ' ' + Math.max(0, Math.ceil((r.cd_end - (Date.now() + LR.skew)) / 1000))
    : r.state === 'launching' ? t('lrLaunching') : r.state === 'playing' ? t('lrPlaying') : all ? t('rStAll')
    : t('playWait', { n: slots.filter(s => s && s.ready).length, m: slots.length });
  const go = r.state === 'countdown' || r.state === 'launching' || (r.state === 'lobby' && all);
  const sub = [st].concat(nObs ? [t('lmObs', { n: nObs })] : []).join(' · ');
  box.innerHTML = `<div class="h"><span>${esc(t(owner ? 'rMineHost' : 'rMineIn'))}</span><span class="tag">${esc(r.mode)}</span></div>`
    + `<button class="lm-head" id="lmGo" data-tip="${esc(t('lmBack'))}"><i class="lm-map" style="background-image:url('${A}maps/${encodeURIComponent(r.map)}.png')"></i><span class="lm-n"><b>${esc(r.name)}</b><small${go ? ' class="go"' : ''}>${esc(sub)}</small></span></button>`
    + `<div class="lm-act"><button class="btn small ghost" id="lmLeave">${esc(t('lmLeave'))}</button><button class="btn gold small" id="lmBack">${esc(t('lmBack'))}</button></div>`;
  const back = () => { const tab = document.querySelector('.tab[data-view="rooms"]'); if (tab) tab.click(); rShow('mine'); };
  $('lmGo').onclick = back; $('lmBack').onclick = back; $('lmLeave').onclick = lrLeave;
}
// 1.5.3 (owner 10.11): the host asks who is not ready (Ready check), a player calls the host when all are ready (Call the host) -
// in the lobby's head only (not in the block on Home) -
// lroom.py "ping" sends lroom_ping to them: a window with a sound (Settings: soft / sharp). 30 s between two of them.
// 1.5.12 (owner 12.11.2026): a player calls the host as soon as every OTHER seat is taken and ready (the host's own tick does not
// matter - his Start sets it). One call per room: the 30 s pause is the room's (r.ping from the ladder), every player's button
// shows it - "The host is called · 24" - and its tooltip says who called; the ladder refuses a second call meanwhile.
function lrOthersReady(r) { const sl = r.slots || []; return sl.length > 0 && sl.every(Boolean) && sl.every(s => s.steam === r.owner || s.ready); }
function lrPingLeft(r, kind) {
  const p = r.ping && r.ping[kind];
  if (p && p.until) return { left: Math.ceil((p.until - (Date.now() + LR.skew)) / 1000), from: p.from, from_name: p.from_name };
  // an older ladder: only my own press is known
  return LR.pinged && LR.pingedKind === kind && LR.pingedRoom === r.id ? { left: Math.ceil((LR.pinged + 30000 - Date.now()) / 1000), from: lrMe() } : { left: 0 };
}
function lrPingBtn(r, cls) {
  if (!r || r.state !== 'lobby' || lrObsMe(r)) return '';
  const me = lrMe(), owner = r.owner === me, slots = r.slots || [];
  const kind = owner ? (slots.some(s => s && s.steam !== me && !s.ready) ? 'ready' : '') : (r.hs && lrOthersReady(r) ? 'start' : '');
  if (!kind) return '';
  const w = lrPingLeft(r, kind), wait = w.left > 0;
  const who = !w.from || w.from === me ? t('sgYou') : (w.from_name || 'Player');
  const lab = wait ? t(kind === 'ready' ? 'lrPingReadyWait' : 'lrPingHostWait', { n: w.left }) : t(kind === 'ready' ? 'lrPingReady' : 'lrPingHost');
  const tip = wait ? t(kind === 'ready' ? 'lrPingReadyWaitTip' : 'lrPingHostWaitTip', { who, n: w.left }) : t(kind === 'ready' ? 'lrPingReadyTip' : 'lrPingHostTip');
  return `<span class="lr-pingw ${cls}${wait ? ' wait' : ''}" data-tip="${esc(tip)}"><button class="btn small lr-pingb" data-ping="${kind}"${wait ? ' disabled' : ''}>${ico('bell')}<span class="l">${esc(lab)}</span></button></span>`;
}
async function lrPing(kind) {
  const r = LR.room; if (!r) return;
  LR.pinged = Date.now(); LR.pingedKind = kind; LR.pingedRoom = r.id; LR.popForce = 1; lrRender();
  // not lrCall: "too soon" here means another player was a moment faster - said plainly, not as an error
  let res = null; try { res = await invoke('lroom_api', { verb: 'ping', body: { kind } }); } catch (e) { toast(String(e), true); }
  if (res && res.room) lrSet(res.room);
  if (res && res.ok !== false) { toast(t(kind === 'ready' ? 'lrPingReadyDone' : 'lrPingHostDone')); return; }
  LR.pinged = 0; LR.popForce = 1; lrRender();                   // refused: the room's own state then
  if (res && res.error === 'too_soon') toast(t(kind === 'ready' ? 'pgAlreadyReady' : 'pgAlreadyStart'));
  else if (res && res.error) toast(t('e_' + res.error) !== 'e_' + res.error ? t('e_' + res.error) : String(res.error), true);
}
// the host's Start when the others are ready: his tick first if it is off (a ladder before 1.5.12 wants everybody ready)
async function lrStart(r) {
  const me = (r.slots || []).find(s => s && s.steam === lrMe());
  if (me && !me.ready) { const x = await lrCall('ready', { on: true }); if (!x || x.ok === false) return; }
  lrCall('start');
}
// every second while in the lobby: the counters on the buttons (ping pause, invited), the room again when a pause or a signal ends
function lrTick() {
  const r = LR.room && lrMine(LR.room) ? LR.room : null; if (!r || r.state !== 'lobby') return;
  document.querySelectorAll('.ii.sent[data-at]').forEach(b => { if (Date.now() - +b.dataset.at >= INV_MARK) {   // the 5 s of "✓ invited" are over
    b.classList.remove('sent'); b.removeAttribute('data-at'); const st = b.querySelector('.ii-st'); if (st) st.textContent = t('lrInvite'); } });
  const pb = document.querySelector('.lr-pingb[data-ping]');
  if (pb) { const w = lrPingLeft(r, pb.dataset.ping), l = pb.querySelector('.l');
    if (w.left > 0) { const tx = t(pb.dataset.ping === 'ready' ? 'lrPingReadyWait' : 'lrPingHostWait', { n: w.left }); if (l.textContent !== tx) l.textContent = tx;
      const wr = pb.parentElement, tip = t(pb.dataset.ping === 'ready' ? 'lrPingReadyWaitTip' : 'lrPingHostWaitTip', { who: !w.from || w.from === lrMe() ? t('sgYou') : (w.from_name || 'Player'), n: w.left });
      if (wr.dataset.tip !== tip) wr.dataset.tip = tip; }
    else if (pb.disabled) { LR.popForce = 1; lrRender(); return; } }
  const k = lrSigKey(r); if (k !== LR.sigKey) { LR.sigKey = k; LR.popForce = 1; lrRender(); }
}
setInterval(lrTick, 1000);
// a ping came: the window (one at a time) and the sound. 1.5.12 (owner 12.11): a bigger window, the sigil in a ring that runs out
// over the 30 s (the ring's edge crosses the sigil), a caption under it in the spirit of the setting, two buttons at the bottom
// side by side - the left one says yes (a ready check: "I'm ready" - the tick and back to the lobby; a call of the host: "To the
// lobby"), the right one no; the answer goes to the room (ping_answer), everybody sees it next to the name for a few seconds
function lrPingAnswer(kind, ans) { invoke('lroom_api', { verb: 'ping_answer', body: { kind, ans } }).catch(() => {}); }
// what a ping asks of me now: the texts and buttons of its strip, and what the answers do
function lrPingCase(d) {
  const r = LR.room && lrMine(LR.room) ? LR.room : null, mine = r && (r.slots || []).find(s => s && s.steam === lrMe());
  const who = d.from_name || 'Player', name = d.name || (r && r.name) || '', kind = d.kind === 'start' ? 'start' : 'ready';
  const already = kind === 'ready' && !!(mine && mine.ready);
  // this launcher can not play the room's match (another Elite, Automatch off...): "To the lobby" with the reason, no tick
  const why = kind === 'ready' && r && !already ? lrWhyNot(r) : '', can = !why;
  const c = kind === 'ready'
    ? { kind, already, why, can, text: t('pgReadyText', { who, name }), note: already ? t('pgReadyAlready') : why,
        yes: already || !can ? t('pgToLobby') : t('pgReadyYes'), no: already ? t('pgClose') : t('pgReadyNo') }
    : { kind, already, why, can, text: t('pgStartText', { who, name }), note: '', yes: t('pgToLobby'), no: t('pgNotNow') };
  c.act = v => {
    if (v === 'yes') {
      const tab = document.querySelector('.tab[data-view="rooms"]'); if (tab) tab.click(); rShow('mine');
      if (kind === 'ready' && !already && can) { lrCall('ready', { on: true }); toast(t('pgReadyDone')); }
      if (!already) lrPingAnswer(kind, 'yes');
    } else if (v === 'no' && !already) lrPingAnswer(kind, 'no');
  };
  return c;
}
// 1.5.12 (owner 12.11, round 3): a ping comes as a strip under the header like the invitation - the Inquisition's sigil on the
// left, "Summons of the Inquisition" over who calls and where, a line running out over its 30 s, No / Yes on the right; the
// sound and the taskbar's flash as before (the window of 1.5.3 is gone).
let PG = null;
function lrPingGot(d) {
  const snd = lrSound(); invoke('lroom_attention', { running: !!(S && S.game_running), audio: 'ping ' + snd }).catch(() => {});
  const ttl = (d.ttl || 30) * 1000;
  PG = Object.assign({}, d, { at: Date.now(), ttl }); PG.wasReady = lrPingCase(d).already; renderPgBar();
  clearTimeout(LR.pgT); LR.pgT = setTimeout(() => { if (PG && Date.now() - PG.at >= PG.ttl - 50) { PG = null; renderPgBar(); toast(t('pgLate'), true); } }, ttl);
}
function renderPgBar() {
  const bar = $('pgBar'); if (!bar) return;
  if (!PG) { barHide(bar); return; }
  const c = lrPingCase(PG), used = Math.max(0, Date.now() - PG.at);
  if (c.kind === 'ready' && c.already && !PG.wasReady) { clearTimeout(LR.pgT); PG = null; barHide(bar); return; }   // he pressed Ready himself meanwhile
  bar.querySelector('.ub-ico').innerHTML = '<i class="pg-sig"></i>';
  const rm = LR.room && LR.room.id === PG.id ? LR.room.map : '';
  $('pgItems').innerHTML = (rm ? `<i class="inv-map" style="background-image:url('${lrAssets()}maps/${encodeURIComponent(rm)}.png')"></i>` : '')
    + `<span class="inv-tx"><small class="inv-k">${esc(t(c.kind === 'ready' ? 'pgCapReady' : 'pgCapStart'))}</small><b>${esc(c.text.replace(/\.$/, ''))}</b>`
    + `<small class="inv-m${c.why ? ' wa' : c.already ? ' ok' : ''}">${esc(c.note || t('pgMeta', { n: Math.round(PG.ttl / 1000) }))}</small></span>`
    + `<i class="inv-bar" style="--ttl:${PG.ttl}ms;--d:${-used}ms"></i>`;
  const done = v => { clearTimeout(LR.pgT); PG = null; renderPgBar(); c.act(v); };
  $('pgNo').textContent = c.no; $('pgYes').textContent = c.yes;
  $('pgNo').onclick = () => done('no'); $('pgYes').onclick = () => done('yes');
  barShow(bar);
}
listen('c_ev', e => { const { e: ev, d } = e.payload || {}; if (ev === 'lroom_ping' && d && (d.kind === 'ready' || d.kind === 'start')) lrPingGot(d); });
// the lobby's sound: soft - JoinSound's chime (E6 0.16 s, then B6, 0.55 s, 18 %, the same envelope); sharp - four loud square
// pulses (the game's own alert of JoinSound later). Settings: lobby_sound, soft by default.
const lrSoundPick = () => (S && S.lobby_sound === 'sharp' ? 'sharp' : 'soft');
let lrAudio = null;
// 1.5.12 (owner 12.11: "the pings make no sound"): a stopped AudioContext (the WebView's autoplay rule: no click in the window
// yet) is resumed first and the sound played when it runs - before, it was scheduled into the stopped clock and never heard.
// Its state goes back to the caller (-> lroom_attention -> community.log). tauri.conf.json: WebView2 may play without a click.
function lrSound(pick) {
  let st = 'none';
  try {
    lrAudio = lrAudio || new (window.AudioContext || window.webkitAudioContext)();
    st = lrAudio.state;
    if (lrAudio.state === 'running') lrSoundPlay(pick);
    else { const t0 = Date.now(); lrAudio.resume().then(() => { if (Date.now() - t0 < 3000) lrSoundPlay(pick); }, () => {}); }
  } catch (e) { st = 'error ' + ((e && e.name) || ''); }
  return st;
}
function lrSoundPlay(pick) {
  try {
    const ctx = lrAudio, rate = ctx.sampleRate;
    if ((pick || lrSoundPick()) === 'soft') {
      const n = Math.round(rate * 0.55), b = ctx.createBuffer(1, n, rate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const tt = i / rate, hi = tt >= 0.16, f = hi ? 1975.5 : 1318.5, t0 = hi ? tt - 0.16 : tt;
        const env = (t0 < 0.008 ? t0 / 0.008 : 1) * Math.exp(-t0 * (hi ? 6.5 : 9));
        d[i] = 0.18 * env * (Math.sin(2 * Math.PI * f * tt) + 0.25 * Math.sin(4 * Math.PI * f * tt)) / 1.25;
      }
      const src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); src.start();
    } else {
      const t0 = ctx.currentTime;
      [[988, 0], [1319, 0.13], [988, 0.26], [1319, 0.39]].forEach(([f, dl]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, t0 + dl); g.gain.exponentialRampToValueAtTime(0.2, t0 + dl + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dl + 0.11);
        o.start(t0 + dl); o.stop(t0 + dl + 0.12);
      });
    }
  } catch (e) {}
}
document.addEventListener('pointerdown', () => { try { lrAudio = lrAudio || new (window.AudioContext || window.webkitAudioContext)(); if (lrAudio.state === 'suspended') lrAudio.resume(); } catch (e) {} });
if ($('lobbySound')) {
  $('lobbySound').value = lrSoundPick();
  $('lobbySound').onchange = e => { const v = e.target.value; if (S) S.lobby_sound = v; invoke('set_setting', { key: 'lobby_sound', value: v }).catch(() => {}); lrSound(v); };
  $('lobbySoundTry').onclick = () => lrSound($('lobbySound').value);
}
// an invitation into a launcher lobby (lroom.py "invite" -> the live stream's lroom_invite): a strip under the header, 3 minutes.
// 1.5.12 (owner 12.11): in the setting's look - the winged skull (wh40k-icon adeptus-astartes.svg without its sword, AGPL-3.0 like
// --av-def), the lobby's minimap, "Invitation to a lobby" over who calls and where, a line running out over the 3 minutes
const INV_SKULL = '<svg viewBox="0 168 960.5 342" aria-hidden="true"><path d="M123.6,225.4c55,8.1,94.4,4.3,139.7-1.3c35.8-4.4,77.3-5.3,85.7,9.7c5.2,9.3,10.8,13.2,9.7,24.7c-0.9,9.7,1,13.3-1.7,20.3 c-2.2,5.9-3,1.5-4.7,7.7c-1.9,7.1-2.5,9.1,4.3,21.7c8,14.7,21.8,31.5,28.9,37.9c1.6,1.4,4-0.2,3.3-2.2 c-4.8-13.9-17.4-51.9-9.2-86.1c4.5-18.5,21.7-20.7,24.7-43.7c3-22.8-64-23.7-76.3-23.7s-82.7,10.3-141.7,11.6 c-59,1.3-92-3.3-182.3-23.3c-13.6-3,11.1,33.3,29,36.3C54.9,218.7,87.3,220,123.6,225.4zM244.3,260.1c11.3-1.7,22.8-3.7,34.5-6c19.4-3.7,38-7.8,55.6-12.2c1.2-0.3,2-1.6,1.7-2.8c-0.5-1.8-1.5-4-3.2-6 c-4.3-5-11.6-7-19-5.3c-11.1,1.2-22.6,2.3-34.3,3.2c-26.3,1.9-51.3,2.7-75,2.5c0.6,3.7,2.2,9.9,6.9,15.5 C223.1,262.8,242.7,260.3,244.3,260.1zM250.9,295.4c11.6-3.3,23.5-6.8,35.6-10.7c22.6-7.3,44-15,64.1-22.9c0.4-0.9,1.9-4.7,0.3-9.1c-1.3-3.8-4.1-5.7-5-6.3 c-15.5,4.3-32.4,8.3-50.7,11.7c-25.1,4.6-51,7.1-72,8.3c-0.8,2.7,0.9,8.1,3,13.9C229.7,289.2,239.5,295.2,250.9,295.4zM270.4,323.9c6.9-1.4,10.6-2.5,18.4-5c23.3-7.6,39.5-19,52.8-28.8c1-2.9,4.2-7.5,3-13.1c-0.3-1.3-0.6-2.5-1-3.6 c-18.6,8.2-39.2,16.2-62,23.3c-11.5,3.6-22.6,6.7-33.3,9.3c-0.1,1.1-0.7,7.6,4,13C257.8,325.4,269.6,324,270.4,323.9zM278.8,355.7c4,1.9,9.9,0.7,12.1,0.4c6.4-3.4,11-6.2,17.7-10.3c15.5-9.5,29.1-19.4,41-29c0.3-0.9,1.5-4.9-0.7-9.3 c-2-4-5.4-5.6-6.3-6c-11,6.9-23.8,14-38.3,20.7c-12.7,5.8-26.7,9.4-37.7,13C266.2,343.8,272.2,352.5,278.8,355.7zM308.4,383.9c5,1.1,9.3,0.4,12-0.3c8.7-7.2,18-15.4,27.5-25.8c6.7-7.3,10.6-14.5,15.7-21.3c-0.4-1.9,0.2-8.5-5.7-12.3 c-1.5-1-3-1.6-4.3-2c-6.9,7-15.2,14.5-25,22c-12.9,9.8-25.3,17.1-36.2,22.6c-1.6,0.8-2.1,2.8-1.2,4.3 C293.7,375,299.2,381.8,308.4,383.9zM327.6,392.3c2.9,1.4,7.5,3.1,10.7,3.8c4.4,0.9,9.2,2.3,10.3,1.8c2.4-1.6,5.2-7.5,7.7-9.5c14.1-11.6,19.8-24.6,23.7-35.1 c-0.6-1.3-1.7-3.1-3.3-4.9c-3.1-3.2-6.5-4.4-8.3-4.9c-6.4,10.4-13.2,18.1-23.4,29.6c-4,4.5-12.6,11.2-17.8,15.7 C326,389.8,326.2,391.6,327.6,392.3zM368.6,407.7c5,0.3,8.4-2.8,9-3.3c0.8-6.4,2.6-14.7,6.7-23.7c2.1-4.7,4.4-8.7,6.7-12c0-0.3,0.4-3.6-2-5.7 c-1.2-1-2.6-1.3-3.2-1.3c-2.1,3.3-3.2,7.6-5.4,11c-6.8,10.3-14.7,19-21.7,28C360.5,404.7,364.3,407.4,368.6,407.7zM70.4,258.7c34.8-1,49.8-3.2,92.2-10.2c7.3-1.2,18.5-1.5,32.2-2c1.5-0.1,2.6-1.3,2.5-2.8c-0.2-1.5-0.7-3.3-2.2-4.9 c-2.4-2.7-5.6-3-6.2-3c-47.4-3.9-94.9-7.8-142.3-11.7c-4.3-0.1-12.7,0.5-21.1,5.7c-2.3,1.5-4.3,3-5.9,4.6c-0.9,0.8-1,2.2-0.4,3.2 c1.8,3,4.3,6.5,7.6,10c5.3,5.5,10.7,8.9,14.7,10.9C47.8,258.7,57.9,259.1,70.4,258.7zM169.7,271.2c13.1-4.1,25.6-8.3,37.8-12.8c0-0.7-0.1-2.1-1-3.5c-1.4-2.3-3.7-2.9-4.3-3c-38.5,7.7-81.3,12.8-127.7,13.2 c-8.7,0.1-17.3,0-25.8-0.2c-2,1.2-8.1,5.2-8.7,11.2c-0.9,8.2,8.2,18.5,23.5,20.5C96.5,291.1,132.1,282.9,169.7,271.2zM215.4,282c0.6-0.7,3.2-4,2.8-8.8c-0.1-1.3-0.4-2.4-0.8-3.3c-0.8-1.9-2.9-2.7-4.8-2.1c-21.6,6.6-34.6,12.9-63.9,19.9 c-28.4,6.8-54.6,12.1-78.2,15.2c-0.8,0.6-12.3,6.2-11.5,15.2c0.9,9.6,15.3,20.7,31.3,18.2c34.3-14.6,68.7-29.5,103.2-44.8 C200.8,288.5,208.1,285.2,215.4,282zM217.9,311.5c3.8-2.4,7-4.6,9.8-6.5c2.5-1.7,3.2-5.2,1.5-7.7c-0.8-1.2-1.8-2.4-3-3.6c-2.1-2-4.3-3.3-6.1-4.1 c-1.8-0.8-3.9-0.6-5.5,0.6c-10.8,7.7-20.2,10-26.9,13.3c-27,13.4-41.8,15-73.4,31.2c-8.1,4.1-14.7,7.9-19.4,10.7 c-1.4,0.9-2.4,2.3-2.7,4c-0.5,3.2,0.3,5.2,0.6,6c2.5,5.8,11.3,9.1,21.3,6.6c0.4-0.1,0.7-0.3,1.1-0.4c25.2-9.2,36.4-16.3,49.5-22 C178.7,333.4,198.7,323.7,217.9,311.5zM230.9,342.2c6.9-3,15.5-6.1,17.2-13.1c1-4.3-0.3-10.5-4.5-14.9c-2-2-4.1-3.1-5.5-3.8c-2.5,1.1-6.6,2.9-11.5,5.2 c-29.1,13.8-40.5,22.9-65.5,35.2c-6,2.9-15,7.2-26.5,11.8c-2.5,2.5-5.6,6.2-8.2,11.2c-3.3,6.2-4.7,11.9-5.2,15.8 c2.5,1.5,6.3,3.4,11.2,4.5c7.4,1.6,13.6,0.6,17-0.2c26.9-15.9,27.1-16.1,27.1-16.1C224.1,349.3,213.6,349.8,230.9,342.2zM240.9,378.5c9.2-8.3,16.6-13.5,22.7-17.7c1.2-0.8,1.7-2.3,1.2-3.6c-0.9-2.7-1.2-6.7-2.9-9.9c-1.7-3.1-3.5-5.8-5.2-7.9 c-1.1-1.4-3.1-1.6-4.4-0.5c-3.5,2.9-8.3,6.7-14.1,10.9c-23.4,17.3-36,22.5-57.8,37.8c-6.3,4.4-15.2,11-25.7,19.8 c-1.2,1-1.5,2.8-0.6,4.1c2.1,3.2,5.7,7.4,11.3,10.4c8.9,4.7,17.8,3.3,21.2,2.8C207,421.1,214.1,402.7,240.9,378.5zM282.2,375.2c0.8-2.9,0.1-5.9-2-8c-2.9-3-6.9-2.3-7.2-2.2c-3.2,3.6-8.5,9.2-15.5,15.5c-15.2,13.7-24.2,17.8-38.5,29.8 c-5.3,4.4-13.6,10.3-22.1,19.5c-1.3,1.5-1.3,3.7,0.1,5.2c1.9,2,4.7,4.4,8,5.8c5.9,2.6,11.3,1.9,13.3,1.5c6.9-4.6,14.3-10,21.7-16.5 C259.7,408.5,273.2,390.2,282.2,375.2zM298.4,405c2.3-2.9,4.9-6,6.8-8.1c0.9-1,0.6-2.5-0.5-3.2c-1.5-0.8-3.3-1.6-5.3-2.3c-4.4-1.5-8.3-1.8-11-1.8 c-10.5,8-21.7,17.3-33,28.2c-6.8,6.6-13.1,13.2-18.8,19.5c1.8,2.3,6.1,7,13.2,9.8c5.3,2,10,2.1,12.8,2c6.4-4.5,10.9-9,13.6-12.1 C285.7,426.7,282.5,425.4,298.4,405zM327.2,401.6c-5.1-2.8-9.9-2.6-12.1-2.4c-5.9,7.6-11.8,15.7-17.8,24.5c-8.3,12.3-15.5,24.2-21.8,35.5 c2.5,0.9,5.6,1.8,9.3,2.1c7.6,0.8,13.8-0.8,17.5-2.1c2.5-3.3,5-6.8,7.5-10.5c9.9-14.7,17.4-29.2,23-42.5 C331.8,404.9,329.9,403.1,327.2,401.6zM336.7,469.7c3.4-5.2,6.8-8.4,10.2-14.5c6.6-11.7,12.2-23.1,16.9-33.8c0.5-1.2,0.3-2.6-0.6-3.6c-1.7-2-4.4-4.5-8.1-6.5 c-3.2-1.7-6.2-2.6-8.6-3.1c-1.6-0.3-3.3,0.6-3.9,2.2c-2.6,6.9-5.1,12.4-7.1,16.1c-7.3,14.3-13.2,20.3-19.8,35.5 c-1.4,3.3-2.5,6.2-3.3,8.5c-0.6,1.7,0.2,3.5,1.8,4.2c0,0,0,0,0,0c8.2,3.6,16.8-1.7,21-3.9C335.9,470.6,336.4,470.2,336.7,469.7zM378.2,419.5c-1.5,1.9-3.7,4.7-6.2,8.2c-3.3,4.7-13.2,19.1-25,51c-2.8,7.5-8.1,19.2-11.4,30.9c-0.6,2.2,1.3,4.3,3.5,3.8 c2.6-0.6,5.4-0.6,7.2-2.2c38.5-35.3,45.4-63.1,46.8-71.2c-0.1-2.2-0.8-8-5.2-13.5C384.3,422.3,380.2,420.3,378.2,419.5zM956.5,184.5c-90.3,20-123.3,24.6-182.3,23.3c-59-1.3-129.3-11.6-141.7-11.6c-12.3,0-79.3,0.9-76.3,23.7 c3,23,20.2,25.2,24.7,43.7c8.2,34.2-4.4,72.2-9.2,86.1c-0.7,2,1.7,3.6,3.3,2.2c7.1-6.5,20.9-23.2,28.9-37.9 c6.8-12.6,5-14.3,4.3-21.7c-0.7-7.3-2.8-4.8-4.7-7.7c-4.1-6.3-0.7-10.6-1.7-20.3c-1.1-11.4,4.5-15.4,9.7-24.7 c8.3-15,49.9-14.1,85.7-9.7c45.3,5.6,84.7,9.5,139.7,1.3c36.3-5.4,68.7-6.7,90.7-10.3C945.5,217.8,970.2,181.5,956.5,184.5zM681.7,259.9c11.8,2.2,23.3,4.2,34.5,6c1.6,0.2,21.2,2.7,32.8-11.2c4.7-5.7,6.3-11.8,6.9-15.5c-23.7,0.2-48.7-0.6-75-2.5 c-11.7-0.9-23.2-1.9-34.3-3.2c-7.4-1.6-14.7,0.3-19,5.3c-1.7,2-2.7,4.2-3.2,6c-0.3,1.2,0.4,2.5,1.7,2.8 C643.7,252.1,662.3,256.2,681.7,259.9zM609.5,258.5c-1.5,4.4,0,8.2,0.3,9.1c20.1,7.9,41.5,15.7,64.1,22.9c12.1,3.9,24,7.4,35.6,10.7c11.5-0.2,21.2-6.2,24.6-15.1 c2.2-5.8,3.8-11.2,3-13.9c-21-1.2-46.9-3.7-72-8.3c-18.3-3.3-35.2-7.4-50.7-11.7C613.6,252.8,610.9,254.7,609.5,258.5zM708.2,324.8c4.7-5.4,4.1-11.9,4-13c-10.7-2.7-21.9-5.7-33.3-9.3c-22.8-7.1-43.4-15.1-62-23.3c-0.4,1.1-0.8,2.3-1,3.6 c-1.1,5.6,2,10.1,3,13.1c13.3,9.9,29.6,21.2,52.8,28.8c7.8,2.6,11.4,3.6,18.4,5C690.9,329.8,702.7,331.2,708.2,324.8zM617.9,307.2c-0.9,0.4-4.4,2-6.3,6c-2.1,4.4-0.9,8.5-0.7,9.3c11.9,9.6,25.5,19.5,41,29c6.7,4.1,11.3,6.9,17.7,10.3 c2.2,0.3,8.1,1.6,12.1-0.4c6.6-3.2,12.6-11.9,12.2-20.6c-11-3.6-25-7.2-37.7-13C641.6,321.1,628.9,314,617.9,307.2zM602.5,329.8c-5.8,3.8-5.3,10.4-5.7,12.3c5.1,6.8,8.9,14,15.7,21.3c9.5,10.4,18.8,18.6,27.5,25.8c2.7,0.7,7,1.5,12,0.3 c9.2-2.1,14.7-8.8,17.2-12.9c0.9-1.5,0.4-3.5-1.2-4.3c-10.9-5.5-23.3-12.8-36.2-22.6c-9.8-7.5-18.1-15-25-22 C605.6,328.2,604.1,328.8,602.5,329.8zM583.9,354.2c-1.7,1.7-2.7,3.5-3.3,4.9c3.9,10.5,9.6,23.5,23.7,35.1c2.5,2,5.2,8,7.7,9.5c1.2,0.5,6-0.9,10.3-1.8 c3.2-0.7,7.8-2.4,10.7-3.8c1.4-0.7,1.6-2.5,0.5-3.5c-5.2-4.5-13.8-11.2-17.8-15.7c-10.1-11.5-16.9-19.2-23.4-29.6 C590.4,349.7,586.9,351,583.9,354.2zM574.8,367.5c-0.6,0.1-2,0.3-3.2,1.3c-2.4,2.1-2,5.4-2,5.7c2.2,3.3,4.6,7.3,6.7,12c4.1,9,5.9,17.3,6.7,23.7 c0.6,0.5,4,3.7,9,3.3c4.3-0.3,8.1-3,10-7c-6.9-9-14.8-17.7-21.7-28C578,375.1,576.8,370.8,574.8,367.5zM934.9,235.5c-8.3-5.2-16.8-5.7-21.1-5.7c-47.4,3.9-94.9,7.8-142.3,11.7c-0.6,0-3.8,0.3-6.2,3c-1.5,1.6-2,3.5-2.2,4.9 c-0.2,1.5,1,2.7,2.5,2.8c13.7,0.5,24.8,0.8,32.2,2c42.5,7,57.4,9.2,92.2,10.2c12.5,0.4,22.7,0,28.8-0.3c3.9-2,9.4-5.4,14.7-10.9 c3.4-3.5,5.8-7,7.6-10c0.6-1,0.5-2.4-0.4-3.2C939.2,238.6,937.3,237,934.9,235.5zM911.8,270.8c-8.4,0.2-17,0.3-25.8,0.2c-46.5-0.4-89.3-5.6-127.7-13.2c-0.5,0.1-2.8,0.7-4.3,3c-0.9,1.4-1,2.8-1,3.5 c12.1,4.4,24.7,8.7,37.8,12.8c37.6,11.7,73.2,19.8,106.2,25.5c15.3-2,24.4-12.3,23.5-20.5C919.9,275.9,913.8,272,911.8,270.8zM890,308.8c-23.7-3.2-49.9-8.5-78.2-15.2c-29.2-7-42.2-13.4-63.9-19.9c-2-0.6-4,0.2-4.8,2.1c-0.4,0.9-0.7,2.1-0.8,3.3 c-0.4,4.7,2.2,8.1,2.8,8.8c7.3,3.3,14.7,6.5,22,9.8c34.6,15.3,69,30.2,103.2,44.8c16,2.4,30.4-8.6,31.2-18.2 C902.4,314.9,890.8,309.3,890,308.8zM865.6,351.1c-4.6-2.8-11.3-6.5-19.4-10.7c-31.7-16.2-46.4-17.8-73.4-31.2c-6.7-3.3-16.1-5.6-26.9-13.3 c-1.6-1.1-3.7-1.4-5.5-0.6c-1.8,0.8-4,2.1-6.1,4.1c-1.2,1.2-2.2,2.4-3,3.6c-1.7,2.5-1,6,1.5,7.7c2.7,1.9,6,4.1,9.8,6.5 c19.3,12.2,39.3,21.9,53.2,28c13,5.7,24.2,12.8,49.5,22c0.4,0.1,0.7,0.3,1.1,0.4c10,2.6,18.7-0.8,21.3-6.6c0.3-0.8,1.1-2.9,0.6-6 C868,353.4,867,352,865.6,351.1zM825.8,368.5c-11.5-4.6-20.5-8.8-26.5-11.8c-25-12.3-36.4-21.5-65.5-35.2c-4.9-2.3-9-4.1-11.5-5.2 c-1.4,0.6-3.5,1.7-5.5,3.8c-4.2,4.3-5.5,10.6-4.5,14.9c1.7,7,10.4,10.2,17.2,13.1c17.4,7.5,6.9,7,54.4,35.7c0,0,0.3,0.2,27.1,16.1 c3.4,0.8,9.6,1.9,17,0.2c4.9-1.1,8.7-3,11.2-4.5c-0.6-3.9-1.9-9.6-5.2-15.8C831.4,374.7,828.3,371,825.8,368.5zM780,393.3c-21.7-15.2-34.4-20.5-57.8-37.8c-5.8-4.3-10.6-8.1-14.1-10.9c-1.4-1.1-3.4-0.9-4.4,0.5 c-1.7,2.2-3.5,4.8-5.2,7.9c-1.8,3.2-2,7.3-2.9,9.9c-0.5,1.3,0,2.8,1.2,3.6c6.1,4.2,13.5,9.4,22.7,17.7c26.8,24.3,33.9,42.6,54.2,46 c3.5,0.6,12.3,1.9,21.2-2.8c5.6-2.9,9.2-7.2,11.3-10.4c0.9-1.3,0.6-3.1-0.6-4.1C795.3,404.2,786.3,397.6,780,393.3zM741.5,416c-14.3-12-23.3-16.1-38.5-29.8c-7-6.3-12.3-11.9-15.5-15.5c-0.3-0.1-4.3-0.7-7.2,2.2c-2.1,2.1-2.8,5.1-2,8 c9,15,22.5,33.3,42.2,50.5c7.4,6.5,14.8,11.9,21.7,16.5c2,0.4,7.4,1.1,13.3-1.5c3.3-1.4,6.1-3.8,8-5.8c1.4-1.4,1.4-3.7,0.1-5.2 C755.1,426.3,746.8,420.4,741.5,416zM705,423.8c-11.3-10.9-22.5-20.3-33-28.2c-2.7,0-6.6,0.3-11,1.8c-2,0.7-3.8,1.5-5.3,2.3c-1.2,0.6-1.4,2.2-0.5,3.2 c1.9,2,4.5,5.1,6.8,8.1c15.9,20.4,12.8,21.7,22.1,32.1c2.8,3.1,7.2,7.6,13.6,12.1c2.8,0.1,7.5,0,12.8-2c7.1-2.7,11.4-7.4,13.2-9.8 C718.1,436.9,711.9,430.4,705,423.8zM645.3,405c-2.1-0.2-7-0.3-12.1,2.4c-2.7,1.5-4.5,3.2-5.7,4.6c5.6,13.3,13.1,27.8,23,42.5c2.5,3.7,5,7.2,7.5,10.5 c3.7,1.3,9.9,2.9,17.5,2.1c3.7-0.4,6.8-1.2,9.3-2.1c-6.2-11.3-13.4-23.2-21.8-35.5C657.1,420.7,651.2,412.6,645.3,405zM644.5,467.8c-6.5-15.2-12.5-21.2-19.8-35.5c-1.9-3.8-4.5-9.2-7.1-16.1c-0.6-1.6-2.2-2.5-3.9-2.2c-2.4,0.5-5.4,1.3-8.6,3.1 c-3.7,2-6.4,4.6-8.1,6.5c-0.9,1-1.1,2.4-0.6,3.6c4.8,10.8,10.3,22.1,16.9,33.8c3.4,6,6.8,9.3,10.2,14.5c0.3,0.5,0.8,0.9,1.3,1.2 c4.1,2.1,12.8,7.5,21,3.9c0,0,0,0,0,0c1.6-0.7,2.4-2.6,1.8-4.2C647,473.9,645.9,471,644.5,467.8zM613.5,484.5c-11.8-31.9-21.7-46.3-25-51c-2.5-3.5-4.7-6.4-6.2-8.2c-2.1,0.8-6.1,2.8-9.5,7c-4.4,5.5-5.1,11.3-5.2,13.5 c1.4,8.1,8.2,36,46.8,71.2c1.7,1.6,4.6,1.6,7.2,2.2c2.2,0.5,4.1-1.6,3.5-3.8C621.7,503.7,616.3,492,613.5,484.5zM562.2,366c-5.3-6.7,20.9-56.7,7.1-100.8c-16.2-51.8-64.1-59.9-84.9-60.9c0,0-1.8-0.1-4.8-0.1c0,0,0,0-0.1,0c0,0,0,0-0.1,0 c-3,0-4.8,0.1-4.8,0.1c-20.7,1.1-68.7,9.1-84.8,60.9c-13.8,44.2,12.4,94.1,7.1,100.8c-21.3,27,7.7,69.8,11.6,73.3 c7.1,6.4,29.8-6.5,26.2,0.1c-2.7,5.1-5.2,43.3-5.2,43.3h7l3.4-13.3l6-0.1l1.2,13.4h12.3l1.2-12.8l4.1-0.6l0.6,13.4h9.9l0.5-13.7 h8.1l0.5,13.7h9.9l0.6-13.4l4.1,0.6l1.2,12.8H512l1.2-13.4l6,0.1l3.4,13.3h7c0,0-2.5-38.2-5.2-43.3c-3.6-6.7,19.1,6.2,26.2-0.1 C554.5,435.8,583.5,393,562.2,366z M466.3,394c-2.8,3.4-6.8,7.5-12.2,10.8c-13.1,8.1-26,6.9-31.3,6.1c-0.3,0-0.7-0.2-1-0.4 c-11.4-7.9-15.8-20.3-12.4-28c0.5-1.2,2.4-5.1,8.4-7.5c0.3-0.1,0.7-0.2,1-0.2c7.2,0.7,16.2,2.3,26.2,5.7c8.1,2.7,14.9,6.1,20.5,9.3 C467,390.6,467.4,392.6,466.3,394z M493.7,440.7c0,0.9-1,1.2-1.5,0.5c-1.2-1.7-2.9-3.7-5.2-5.5c-2.4-1.9-4.7-3.2-6.6-3.9 c-1.8,0.7-4.1,1.9-6.6,3.9c-2.3,1.8-4,3.8-5.2,5.5c-0.5,0.7-1.5,0.3-1.5-0.5c-0.4-6.5-0.1-19.9,8.9-29.6c1.2-1.3,2.7-2.4,4.4-3.4 c1.7,1.1,3.3,2.2,4.4,3.4C493.8,420.8,494.1,434.2,493.7,440.7z M537.5,410.5c-0.3,0.2-0.6,0.3-1,0.4c-5.2,0.8-18.2,1.9-31.3-6.1 c-5.4-3.3-9.4-7.4-12.2-10.8c-1-1.3-0.7-3.3,0.7-4.1c5.6-3.2,12.5-6.5,20.5-9.3c10-3.4,19-5,26.2-5.7c0.3,0,0.7,0,1,0.2 c6,2.4,7.9,6.3,8.4,7.5C553.3,390.2,548.9,402.6,537.5,410.5z"/></svg>';
let INV = null;
function renderInvBar() {
  const bar = $('invBar'); if (!bar) return;
  const d = INV && Date.now() - INV.at < (INV.ttl || 180) * 1000 ? INV : null;
  if (!d) { barHide(bar); return; }
  barShow(bar);
  const ico0 = bar.querySelector('.ub-ico'); if (!ico0.querySelector('path')) ico0.innerHTML = INV_SKULL;
  const ttl = (d.ttl || 180) * 1000, used = Math.max(0, Date.now() - d.at);
  const meta = [d.mode, d.map_name, d.game === 'vanilla' ? t('roomsVan') : d.ver ? 'Elite ' + d.ver : '', d.cap ? t('invSeats', { n: d.players || 0, m: d.cap }) : ''].filter(Boolean).join(' · ');
  $('invItems').innerHTML = (d.map ? `<i class="inv-map" style="background-image:url('${lrAssets()}maps/${encodeURIComponent(d.map)}.png')"></i>` : '')
    + `<span class="inv-tx"><small class="inv-k">${esc(t('invKicker'))}</small><b>${esc(t('invText', { who: d.from_name || 'Player', name: d.name || '' }))}</b><small class="inv-m">${esc(meta)}</small></span>`
    + `<i class="inv-bar" style="--ttl:${ttl}ms;--d:${-used}ms"></i>`;
  $('invNo').textContent = t('invNo'); $('invYes').textContent = t(LR.room && lrMine(LR.room) ? 'invYesLeave' : 'invYes');
  $('invNo').onclick = () => { INV_NO[d.id] = Date.now() + INV_MUTE; INV = null; renderInvBar(); };
  $('invYes').onclick = async () => { INV = null; renderInvBar(); if (LR.room && lrMine(LR.room)) await lrLeave(); lrJoinHome(d.id); };
}
// 1.5.12 (owner 12.11, round 3): while one invitation is on the screen (its 3 minutes) every other one is dropped quietly - no
// strip, no sound; an invitation into the lobby I am in too; after "Decline" that lobby's invitations are dropped for 30 s
// (only after a Decline). The ladder's own limits stay (30 s per player and room, 10 a minute per sender).
const INV_MUTE = 30000, INV_NO = {};
function lrInvDrop(d) {
  const now = Date.now();
  if (INV && now - INV.at < (INV.ttl || 180) * 1000) return 'shown';
  if ((INV_NO[d.id] || 0) > now) return 'declined';
  if (LR.room && LR.room.id === d.id && lrMine(LR.room)) return 'here';
  return '';
}
listen('c_ev', e => { const { e: ev, d } = e.payload || {}; if (ev === 'lroom_invite' && d && d.id) {
  if (lrInvDrop(d)) return;
  INV = Object.assign({}, d, { at: Date.now() }); renderInvBar(); setTimeout(renderInvBar, (d.ttl || 180) * 1000 + 500);
  const snd = lrSound(); invoke('lroom_attention', { running: !!(S && S.game_running), audio: 'invite ' + snd }).catch(() => {}); } });
// the owner picks another version in the footer while others are in his lobby: ask first (app.js, the version list)
async function lrVerAsk(name) {
  const r = LR.room && lrMine(LR.room) ? LR.room : null, me = lrMe();
  if (!r || r.owner !== me || r.game !== 'elite') return true;
  const others = (r.slots || []).filter(s => s && s.steam !== me).map(s => s.name);
  if (!others.length) return true;
  const ok = await askBox(t('verAskT'), [t('verAskText', { v: name }), t('verAskWho', { who: others.join(', ') })], [{ label: t('verAskGo', { v: name }), cls: 'gold', val: 1 }, { label: t('rjCancel'), val: 0 }]);
  return !!ok;
}
document.addEventListener('click', e => { if (LR.drop && !e.target.closest('.ldd, .poplayer')) { LR.drop = null; LR.popForce = 1; lrRender(); } });
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { if (!$('rooms').classList.contains('hidden')) lrLoad(); }));
lrLoad();
setTimeout(lrLoad, 4000);   // signed in by itself a moment after the start (app.js chInit)

// 06.11.2026: a start called off for another race in the game, the mark of who spoiled starts, the start's time limit
Object.assign(T.en, { n_race: '{who}: the game had another race ({why}) - the start is off. The launcher now sets the room\'s army itself; if it happens again, close Find a Game in the game first.', lrSpoil: 'spoiled a start ×{n}', gf_army: 'the army could not be set', gf_expired: 'the start was over' });
Object.assign(T.ru, { n_race: '{who}: в игре стояла другая раса ({why}) — запуск отменён. Лаунчер сам выставляет армию комнаты; если повторится — сначала закройте Find a Game в игре.', lrSpoil: 'сорвал запуск ×{n}', gf_army: 'не удалось выставить армию', gf_expired: 'запуск уже закончился' });
Object.assign(T.es, { n_race: '{who}: el juego tenía otra raza ({why}): el inicio se canceló.', lrSpoil: 'arruinó un inicio ×{n}', gf_army: 'no se pudo poner el ejército', gf_expired: 'el inicio ya terminó' });
Object.assign(T.fr, { n_race: '{who} : le jeu avait une autre race ({why}) : lancement annulé.', lrSpoil: 'a fait échouer un lancement ×{n}', gf_army: 'l\'armée n\'a pas pu être choisie', gf_expired: 'le lancement était terminé' });
Object.assign(T.de, { n_race: '{who}: Im Spiel war ein anderes Volk eingestellt ({why}) – der Start wurde abgebrochen.', lrSpoil: 'hat einen Start verhindert ×{n}', gf_army: 'die Armee ließ sich nicht setzen', gf_expired: 'der Start war vorbei' });
// 1.5.10: the ladder's reasons of a start called off (lrWhyTxt) and the room calls' errors without a text before
Object.assign(T.en, { w_silent: "the game went silent", w_host_room: "the host's game never opened the lobby", w_no_join: "did not get into the host's lobby", w_no_start: "the match never started", w_again: "started a new search", w_left: "left the search", w_failed: "the game reported an error", e_bad_map: "That map is not in the list for this mode.", e_taken: "That seat is taken.", e_too_many: "Too many rooms right now - try again in a minute.", e_unknown: "The server does not know this request - update the launcher." });
Object.assign(T.ru, { w_silent: "игра перестала отвечать", w_host_room: "игра хоста так и не открыла лобби", w_no_join: "не вошёл в лобби хоста", w_no_start: "матч так и не начался", w_again: "начал поиск заново", w_left: "вышел из поиска", w_failed: "игра сообщила об ошибке", e_bad_map: "Этой карты нет в списке для этого режима.", e_taken: "Это место уже занято.", e_too_many: "Сейчас слишком много комнат — попробуйте через минуту.", e_unknown: "Сервер не знает такой команды — обновите лаунчер." });
Object.assign(T.es, { w_silent: "el juego dejó de responder", w_host_room: "el juego del anfitrión no abrió la sala", w_no_join: "no entró en la sala del anfitrión", w_no_start: "la partida no llegó a empezar", w_again: "empezó a buscar de nuevo", w_left: "salió de la búsqueda", w_failed: "el juego informó de un error", e_bad_map: "Ese mapa no está en la lista de este modo.", e_taken: "Esa plaza ya está ocupada.", e_too_many: "Ahora hay demasiadas salas: inténtalo dentro de un minuto.", e_unknown: "El servidor no reconoce esta petición: actualiza el launcher." });
Object.assign(T.fr, { w_silent: "le jeu ne répond plus", w_host_room: "le jeu de l'hôte n'a jamais ouvert le salon", w_no_join: "n'est pas entré dans le salon de l'hôte", w_no_start: "la partie n'a jamais commencé", w_again: "a relancé la recherche", w_left: "a quitté la recherche", w_failed: "le jeu a signalé une erreur", e_bad_map: "Cette carte n'est pas dans la liste de ce mode.", e_taken: "Cette place est déjà prise.", e_too_many: "Trop de salons en ce moment : réessayez dans une minute.", e_unknown: "Le serveur ne connaît pas cette demande : mettez le launcher à jour." });
Object.assign(T.de, { w_silent: "das Spiel meldet sich nicht mehr", w_host_room: "das Spiel des Hosts hat die Lobby nie geöffnet", w_no_join: "ist der Lobby des Hosts nicht beigetreten", w_no_start: "das Match hat nie begonnen", w_again: "hat die Suche neu gestartet", w_left: "hat die Suche verlassen", w_failed: "das Spiel hat einen Fehler gemeldet", e_bad_map: "Diese Karte ist nicht in der Liste für diesen Modus.", e_taken: "Dieser Platz ist schon belegt.", e_too_many: "Gerade gibt es zu viele Räume – versuch es in einer Minute erneut.", e_unknown: "Der Server kennt diese Anfrage nicht – aktualisiere den Launcher." });

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
   rLiveNote: 'Only the matches on our servers: from the launcher\'s lobbies and from Find a Game. Watch - the game opens the match as a replay, a few minutes behind.',
   rFltAll: 'All',   rFltVer: 'Version', rFltMine: 'Mine', rFltFree: 'free seats', rFltFrom: 'From', rFltFromLr: 'Launcher lobbies',
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
   rLiveNote: 'Только матчи на наших серверах: из лобби лаунчера и из Find a Game. Смотреть — игра откроет матч как реплей, с отставанием на несколько минут.',
   rFltAll: 'Все',   rFltVer: 'Версия', rFltMine: 'Моя', rFltFree: 'есть места', rFltFrom: 'Откуда', rFltFromLr: 'Лобби лаунчера',
  rNone: 'Сейчас никто не собирает игру — создайте своё лобби, и оно появится здесь у всех.', rNoneFilter: 'По этим фильтрам ничего нет.', rLiveNone: 'Сейчас на наших серверах матчей нет.',
  rJoinTip: 'Войти в лобби «{name}»', rWatchTip: 'Смотреть этот матч в игре как реплей (с отставанием на несколько минут)', rHost: 'хост {name}',
  rSignInNote: 'Без входа можно смотреть списки; создать лобби или войти в него — после входа.', rStCd: 'идёт отсчёт', rStWait: 'ждём {n}', rStAll: 'все готовы',
  rMineHost: 'Ваше лобби', rMineIn: 'Вы в лобби', rBack: 'Вернуться в лобби ›', rBackShort: 'Вернуться ›', rInGame: 'Вы в лобби игры', rInGameNote: 'оно открыто в самой игре', rCreate: 'Создать лобби',
  rdyMine: 'Нажмите, когда будете готовы', rdyMineOn: 'Вы готовы — нажмите, чтобы снять готовность', playLaunching: 'Запуск…', playCd: 'Старт через', playStart: 'Начать матч', playHost: 'Ждём хоста',
  playWait: 'Готовы {n} из {m}', tipStop: 'Нажмите, чтобы остановить отсчёт', tipCd: 'Выход или снятая готовность остановят отсчёт', tipStart: 'Отсчёт 10 секунд, затем игра стартует у всех',
  tipHost: 'Все готовы — матч запускает хост', tipWait: 'Ждём: {who}', whoYou: 'вас', whoFree: 'свободные места', inLobby: 'Вы в лобби «{name}»',
  verAskT: 'Сменить версию лобби?', verAskText: 'Лобби перейдёт на {v}.', verAskWho: 'У {who} другая версия: их готовность снимется, им нужно будет переключиться или выйти из лобби.', verAskGo: 'Сменить на {v}',
  lrLeave: 'Выйти из лобби', lrKick: 'Убрать из лобби', lrSit: 'Сесть сюда' });
Object.assign(T.es, { lrSaving: 'Guardando…', rOpen: 'Salas abiertas', rLive: 'Partidas en curso', rTagLr: 'launcher', rLegLr: 'sala del launcher: la partida en nuestros servidores, el inicio para todos a la vez.',
   rLiveNote: 'Solo partidas en nuestros servidores: de las salas del launcher y de Find a Game. Ver: el juego abre la partida como repetición, unos minutos por detrás.',
   rFltAll: 'Todas',   rFltVer: 'Versión', rFltMine: 'La mía', rFltFree: 'con plazas', rFltFrom: 'Origen', rFltFromLr: 'Salas del launcher',
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
   rLiveNote: 'Seulement les parties sur nos serveurs : des salons du launcher et de Find a Game. Regarder : le jeu ouvre la partie en replay, quelques minutes de retard.',
   rFltAll: 'Tous',   rFltVer: 'Version', rFltMine: 'La mienne', rFltFree: 'places libres', rFltFrom: 'Origine', rFltFromLr: 'Salons du launcher',
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
   rLiveNote: 'Nur Matches auf unseren Servern: aus Launcher-Lobbys und Find a Game. Zuschauen – das Spiel öffnet das Match als Replay, ein paar Minuten zurück.',
   rFltAll: 'Alle',   rFltVer: 'Version', rFltMine: 'Meine', rFltFree: 'freie Plätze', rFltFrom: 'Quelle', rFltFromLr: 'Launcher-Lobbys',
  rNone: 'Gerade bereitet niemand ein Spiel vor – erstelle deine Lobby, alle sehen sie hier.', rNoneFilter: 'Nichts mit diesen Filtern.', rLiveNone: 'Gerade keine Matches auf unseren Servern.',
  rJoinTip: 'Der Lobby „{name}“ beitreten', rWatchTip: 'Dieses Match im Spiel als Replay ansehen (ein paar Minuten zurück)', rHost: 'Host {name}',
  rSignInNote: 'Ohne Anmeldung kannst du die Listen sehen; zum Erstellen oder Beitreten anmelden.', rStCd: 'Countdown läuft', rStWait: 'warten auf {n}', rStAll: 'alle bereit',
  rMineHost: 'Deine Lobby', rMineIn: 'Du bist in der Lobby', rBack: 'Zurück zur Lobby ›', rBackShort: 'Zurück ›', rInGame: 'Du bist in einer Spiel-Lobby', rInGameNote: 'sie ist im Spiel selbst offen', rCreate: 'Lobby erstellen',
  rdyMine: 'Drücken, wenn du bereit bist', rdyMineOn: 'Du bist bereit – drücken, um es zurückzunehmen', playLaunching: 'Start…', playCd: 'Start in', playStart: 'Match starten', playHost: 'Warten auf den Host',
  playWait: 'Bereit {n} von {m}', tipStop: 'Drücken, um den Countdown anzuhalten', tipCd: 'Verlassen oder „bereit“ zurücknehmen hält ihn an', tipStart: '10-s-Countdown, dann startet das Spiel bei allen',
  tipHost: 'Alle bereit – der Host startet das Match', tipWait: 'Warten auf: {who}', whoYou: 'dich', whoFree: 'freie Plätze', inLobby: 'Du bist in der Lobby „{name}“',
  verAskT: 'Version der Lobby ändern?', verAskText: 'Die Lobby wechselt auf {v}.', verAskWho: '{who} haben eine andere Version: ihr „bereit“ fällt weg, sie wechseln oder verlassen die Lobby.', verAskGo: 'Auf {v} wechseln',
  lrLeave: 'Lobby verlassen', lrKick: 'Aus der Lobby entfernen', lrSit: 'Hier setzen' });
// 1.5.3 (owner 10.11): Invite, the free seat, the block on Home, the invitation, the filter's words
Object.assign(T.en, { lrInvite: 'Invite', lrInviteTip: 'Invite a player of the launcher to this seat', lrInvFind: 'Find a player', lrInvMenu: 'In the launcher',
  lrInvSent: 'invited', lrInvNone: 'Nobody else is in the launcher right now.', lrInvNoMatch: 'Nobody by that name.', lrInvNote: 'Only who is in the launcher now (in the game an invitation is not seen): a strip on top with Join.',
  lrPingReady: 'Ready check', lrPingReadyTip: 'Everybody who is not ready gets a call with a sound', lrPingHost: 'Call the host', lrPingHostTip: 'All players are ready - the host gets a call with a sound to start the match',
  lrPingSent: 'Sent', lrPingSentN: 'Sent · {n}', pgLate: 'The time to answer is over', pgReadyDone: 'You are ready', lmPlayers: 'players {n}/{m}', lmObs: 'observers {n}', lrWatchJoin: 'Join as an observer ({n} of {m} seats taken)', lrPingReadyDone: 'Ready check sent', lrPingHostDone: 'The host is called', lrObs: 'Observers', pgReadyT: 'Ready check', pgReadyText: '{who} checks who is ready in the lobby “{name}”.',
  pgReadyAlready: 'You are marked ready already.', pgReadyYes: 'I am ready', pgStartT: 'All are ready', pgStartText: '{who} calls you to start the match: everybody in “{name}” is ready.',
  lsTitle: 'The lobby\'s sound', lsNote: 'an invitation, a ready check, a call of the host', lsSoft: 'Soft', lsSharp: 'Sharp', lsTry: 'Listen',
  lrInvToast: 'Invitation sent: {name}', lrFreeHint: 'Invite a player or move here', invText: '{who} invites you to the lobby “{name}”', invYes: 'Join the lobby', invYesLeave: 'Leave mine and join',
  invNo: 'Decline', lmBack: 'Back to the lobby', lmLeave: 'Leave',
  rFltWhere: 'Lobbies', rFltLr: 'Launcher', rFltGame: 'Regular', rFltLrTip: 'Made in the launcher: the match on our servers, the start for everyone at once',
  rFltGameTip: 'Made in the game itself (Custom Games): the launcher starts the game and joins it', rLegGame: 'Unmarked - a regular lobby made in the game: the launcher starts the game and joins it by itself.' });
Object.assign(T.ru, { lrInvite: 'Пригласить', lrInviteTip: 'Пригласить на это место игрока из лаунчера', lrInvFind: 'Найти игрока', lrInvMenu: 'В лаунчере',
  lrInvSent: 'приглашён', lrInvNone: 'Сейчас в лаунчере больше никого.', lrInvNoMatch: 'Никого с таким именем.', lrInvNote: 'Только те, кто сейчас в лаунчере (в игре приглашение не видно): у них появится полоса сверху с кнопкой «Войти».',
  lrPingReady: 'Проверить готовность', lrPingReadyTip: 'Всем, кто не готов, придёт призыв со звуком', lrPingHost: 'Позвать хоста', lrPingHostTip: 'Все игроки готовы — хосту придёт призыв со звуком, чтобы он начал матч',
  lrPingSent: 'Отправлено', lrPingSentN: 'Отправлено · {n}', pgLate: 'Время ответа вышло', pgReadyDone: 'Вы отмечены готовым', lmPlayers: 'игроков {n}/{m}', lmObs: 'наблюдателей {n}', lrWatchJoin: 'Войти наблюдателем (занято {n} из {m})', lrPingReadyDone: 'Проверка готовности отправлена', lrPingHostDone: 'Хост позван', lrObs: 'Наблюдатели', pgReadyT: 'Проверка готовности', pgReadyText: '{who} проверяет готовность в лобби «{name}».',
  pgReadyAlready: 'Вы уже отмечены готовым.', pgReadyYes: 'Я готов', pgStartT: 'Все готовы', pgStartText: '{who} зовёт вас начать матч: в лобби «{name}» все игроки готовы.',
  lsTitle: 'Звук лобби', lsNote: 'приглашение, проверка готовности, «позвать хоста»', lsSoft: 'Мягкий', lsSharp: 'Резкий', lsTry: 'Прослушать',
  lrInvToast: 'Приглашение отправлено: {name}', lrFreeHint: 'Пригласите игрока или пересядьте сюда', invText: '{who} зовёт вас в лобби «{name}»', invYes: 'Войти в лобби', invYesLeave: 'Выйти из своего и войти',
  invNo: 'Отклонить', lmBack: 'Вернуться в лобби', lmLeave: 'Выйти',
  rFltWhere: 'Лобби', rFltLr: 'Лаунчера', rFltGame: 'Обычные', rFltLrTip: 'Собраны в лаунчере: матч на наших серверах, старт у всех сразу',
  rFltGameTip: 'Созданы в самой игре (Custom Games): лаунчер запустит игру и зайдёт в лобби', rLegGame: 'Без пометки — обычное лобби, созданное в игре: лаунчер сам запустит игру и зайдёт в него.' });
// 1.5.3: es / fr / de of the block above; the ladder's new answers (observers, pings, invitations)
Object.assign(T.es, { lrInvite: 'Invitar', lrInviteTip: 'Invitar a esta plaza a un jugador del launcher', lrInvFind: 'Buscar jugador', lrInvMenu: 'En el launcher',
  lrInvSent: 'invitado', lrInvNone: 'Ahora no hay nadie más en el launcher.', lrInvNoMatch: 'Nadie con ese nombre.', lrInvNote: 'Solo quien está ahora en el launcher (en el juego la invitación no se ve): le aparece una franja arriba con «Entrar».',
  lrPingReady: 'Comprobar si están listos', lrPingReadyTip: 'Quien no esté listo recibe un aviso con sonido', lrPingHost: 'Llamar al anfitrión', lrPingHostTip: 'Todos los jugadores listos: el anfitrión recibe un aviso con sonido para empezar',
  lrPingSent: 'Enviado', lrPingSentN: 'Enviado · {n}', pgLate: 'Se acabó el tiempo para responder', pgReadyDone: 'Estás listo', lmPlayers: 'jugadores {n}/{m}', lmObs: 'observadores {n}',
  lrWatchJoin: 'Entrar como observador ({n} de {m} plazas ocupadas)', lrPingReadyDone: 'Comprobación enviada', lrPingHostDone: 'Anfitrión llamado', lrObs: 'Observadores',
  pgReadyT: '¿Listos?', pgReadyText: '{who} comprueba quién está listo en la sala «{name}».', pgReadyAlready: 'Ya estás marcado como listo.', pgReadyYes: 'Estoy listo',
  pgStartT: 'Todos listos', pgStartText: '{who} te llama a empezar la partida: en «{name}» todos están listos.', lsTitle: 'Sonido de la sala', lsNote: 'invitación, comprobación, llamada al anfitrión',
  lsSoft: 'Suave', lsSharp: 'Fuerte', lsTry: 'Escuchar', lrInvToast: 'Invitación enviada: {name}', lrFreeHint: 'Invita a un jugador o cámbiate aquí',
  invText: '{who} te invita a la sala «{name}»', invYes: 'Entrar en la sala', invYesLeave: 'Salir de la mía y entrar', invNo: 'Rechazar', lmBack: 'Volver a la sala', lmLeave: 'Salir',
  rFltWhere: 'Salas', rFltLr: 'Launcher', rFltGame: 'Normales', rFltLrTip: 'Creadas en el launcher: la partida en nuestros servidores, el inicio para todos a la vez',
  rFltGameTip: 'Creadas en el propio juego (Custom Games): el launcher inicia el juego y entra', rLegGame: 'Sin marca: una sala normal creada en el juego; el launcher inicia el juego y entra solo.',
  e_too_soon: 'Demasiado pronto: espera unos segundos.', e_obs_full: 'No quedan plazas de observador.', e_obs: 'Un observador no puede hacer eso.', e_not_ready: 'Aún no están todos listos.', n_joined_obs: '{who} entró como observador.' });
Object.assign(T.fr, { lrInvite: 'Inviter', lrInviteTip: 'Inviter un joueur du launcher à cette place', lrInvFind: 'Chercher un joueur', lrInvMenu: 'Dans le launcher',
  lrInvSent: 'invité', lrInvNone: 'Personne d\'autre dans le launcher pour l\'instant.', lrInvNoMatch: 'Personne avec ce nom.', lrInvNote: 'Seulement ceux qui sont dans le launcher (en jeu l\'invitation ne se voit pas) : une bande en haut avec « Rejoindre ».',
  lrPingReady: 'Vérifier qui est prêt', lrPingReadyTip: 'Ceux qui ne sont pas prêts reçoivent un appel sonore', lrPingHost: 'Appeler l\'hôte', lrPingHostTip: 'Tous les joueurs sont prêts : l\'hôte reçoit un appel sonore pour lancer la partie',
  lrPingSent: 'Envoyé', lrPingSentN: 'Envoyé · {n}', pgLate: 'Le temps pour répondre est écoulé', pgReadyDone: 'Vous êtes prêt', lmPlayers: 'joueurs {n}/{m}', lmObs: 'observateurs {n}',
  lrWatchJoin: 'Rejoindre en observateur ({n} places sur {m} prises)', lrPingReadyDone: 'Vérification envoyée', lrPingHostDone: 'Hôte appelé', lrObs: 'Observateurs',
  pgReadyT: 'Prêts ?', pgReadyText: '{who} vérifie qui est prêt dans le salon « {name} ».', pgReadyAlready: 'Vous êtes déjà marqué prêt.', pgReadyYes: 'Je suis prêt',
  pgStartT: 'Tous prêts', pgStartText: '{who} vous appelle à lancer la partie : dans « {name} » tout le monde est prêt.', lsTitle: 'Son du salon', lsNote: 'invitation, vérification, appel de l\'hôte',
  lsSoft: 'Doux', lsSharp: 'Fort', lsTry: 'Écouter', lrInvToast: 'Invitation envoyée : {name}', lrFreeHint: 'Invitez un joueur ou changez de place',
  invText: '{who} vous invite dans le salon « {name} »', invYes: 'Rejoindre le salon', invYesLeave: 'Quitter le mien et rejoindre', invNo: 'Refuser', lmBack: 'Retour au salon', lmLeave: 'Quitter',
  rFltWhere: 'Salons', rFltLr: 'Launcher', rFltGame: 'Normaux', rFltLrTip: 'Créés dans le launcher : la partie sur nos serveurs, le départ pour tous en même temps',
  rFltGameTip: 'Créés dans le jeu (Custom Games) : le launcher lance le jeu et y entre', rLegGame: 'Sans marque : un salon normal créé dans le jeu ; le launcher lance le jeu et y entre tout seul.',
  e_too_soon: 'Trop tôt : attendez quelques secondes.', e_obs_full: 'Plus de place d\'observateur.', e_obs: 'Un observateur ne peut pas faire cela.', e_not_ready: 'Tout le monde n\'est pas encore prêt.', n_joined_obs: '{who} est entré en observateur.' });
Object.assign(T.de, { lrInvite: 'Einladen', lrInviteTip: 'Einen Spieler aus dem Launcher auf diesen Platz einladen', lrInvFind: 'Spieler suchen', lrInvMenu: 'Im Launcher',
  lrInvSent: 'eingeladen', lrInvNone: 'Gerade ist sonst niemand im Launcher.', lrInvNoMatch: 'Niemand mit diesem Namen.', lrInvNote: 'Nur wer gerade im Launcher ist (im Spiel ist die Einladung nicht zu sehen): oben erscheint ein Streifen mit „Beitreten“.',
  lrPingReady: 'Bereitschaft prüfen', lrPingReadyTip: 'Wer nicht bereit ist, bekommt einen Ruf mit Ton', lrPingHost: 'Host rufen', lrPingHostTip: 'Alle Spieler bereit – der Host bekommt einen Ruf mit Ton, um das Match zu starten',
  lrPingSent: 'Gesendet', lrPingSentN: 'Gesendet · {n}', pgLate: 'Die Zeit zum Antworten ist um', pgReadyDone: 'Du bist bereit', lmPlayers: 'Spieler {n}/{m}', lmObs: 'Zuschauer {n}',
  lrWatchJoin: 'Als Zuschauer beitreten ({n} von {m} Plätzen belegt)', lrPingReadyDone: 'Prüfung gesendet', lrPingHostDone: 'Host gerufen', lrObs: 'Zuschauer',
  pgReadyT: 'Bereit?', pgReadyText: '{who} prüft, wer in der Lobby „{name}“ bereit ist.', pgReadyAlready: 'Du bist schon als bereit markiert.', pgReadyYes: 'Ich bin bereit',
  pgStartT: 'Alle bereit', pgStartText: '{who} ruft dich zum Start: in „{name}“ sind alle bereit.', lsTitle: 'Ton der Lobby', lsNote: 'Einladung, Bereitschaftsprüfung, Ruf an den Host',
  lsSoft: 'Leise', lsSharp: 'Laut', lsTry: 'Anhören', lrInvToast: 'Einladung gesendet: {name}', lrFreeHint: 'Lade einen Spieler ein oder setz dich hierher',
  invText: '{who} lädt dich in die Lobby „{name}“ ein', invYes: 'Der Lobby beitreten', invYesLeave: 'Meine verlassen und beitreten', invNo: 'Ablehnen', lmBack: 'Zurück zur Lobby', lmLeave: 'Verlassen',
  rFltWhere: 'Lobbys', rFltLr: 'Launcher', rFltGame: 'Normale', rFltLrTip: 'Im Launcher erstellt: das Match auf unseren Servern, Start für alle gleichzeitig',
  rFltGameTip: 'Im Spiel selbst erstellt (Custom Games): der Launcher startet das Spiel und tritt bei', rLegGame: 'Ohne Markierung – eine normale Lobby aus dem Spiel: der Launcher startet das Spiel und tritt selbst bei.',
  e_too_soon: 'Zu früh – warte ein paar Sekunden.', e_obs_full: 'Keine Zuschauerplätze mehr frei.', e_obs: 'Ein Zuschauer kann das nicht.', e_not_ready: 'Noch sind nicht alle bereit.', n_joined_obs: '{who} ist als Zuschauer beigetreten.' });
Object.assign(T.en, { e_too_soon: 'Too soon - wait a few seconds.', e_obs_full: 'No observer seats left.', e_obs: 'An observer can not do that.', e_not_ready: 'Not everybody is ready yet.', n_joined_obs: '{who} joined as an observer.' });
Object.assign(T.ru, { e_too_soon: 'Слишком часто — подождите несколько секунд.', e_obs_full: 'Мест наблюдателей не осталось.', e_obs: 'Наблюдателю это нельзя.', e_not_ready: 'Ещё не все готовы.', n_joined_obs: '{who} вошёл наблюдателем.' });
// the strings of this file (the Rooms tab's panel) came after app.js: a render that ran before it is done again in them
if (typeof S !== 'undefined' && S) render();

// 1.5.12 (owner 12.11.2026): the host is called when the OTHER players are ready, the room's ping pause for everybody, the answers
// next to the names, the bigger ping window, the event line that closes, invitations again, the time a removed player waits.
// "Хост" everywhere in Russian (was "хозяин").
Object.assign(T.en, {
  lrPingHostWait: 'Host called · {n}', lrPingReadyWait: 'Check sent · {n}', lrPingHostWaitTip: 'The host has been called ({who}). Again in {n} s.',
  lrPingReadyWaitTip: 'The ready check has been sent. Again in {n} s.', sgYou: 'you', tipHostNR: 'All players are ready - waiting for the host. Call him with “Call the host” in the lobby.',
  sg_ready_wait: '{who}: waiting for an answer to the ready check', sg_ready_no: '{who}: not ready (answered the check)',
  sg_start_wait: '{who}: being called to start the match', sg_start_yes: '{who}: coming to the lobby', sg_start_no: '{who}: asks to wait',
  sgShort_wait: 'calling', sgShort_yes: 'coming', sgShort_no: 'no', evClose: 'Close',
  pgCapReady: 'Summons of the Inquisition', pgCapStart: 'Summons of the Inquisition', pgReadyNo: 'Not ready', pgClose: 'Close', pgToLobby: 'To the lobby', pgNotNow: 'Not now',
  e_kicked_t: 'You were removed from this lobby - you can come back in {left}.',
  n_kicked_me: 'You were removed from the lobby “{name}”. You can join it again at any time.', kickedLeft: 'By yourself - in {left}.',
  pgAlreadyStart: 'The host has just been called by another player - waiting for his answer.', pgAlreadyReady: 'The ready check has just been sent.',
});
Object.assign(T.ru, {
  lrPingHostWait: 'Хост позван · {n}', lrPingReadyWait: 'Проверка · {n}', lrPingHostWaitTip: 'Хоста уже позвали ({who}). Снова — через {n} с.',
  lrPingReadyWaitTip: 'Проверка уже отправлена. Снова — через {n} с.', sgYou: 'вы', tipHostNR: 'Все игроки готовы — ждём хоста. Его можно позвать кнопкой «Позвать хоста» в лобби.',
  sg_ready_wait: '{who}: ждём ответа на проверку готовности', sg_ready_no: '{who}: не готов (ответ на проверку)',
  sg_start_wait: '{who}: хоста зовут начать матч', sg_start_yes: '{who}: идёт в лобби', sg_start_no: '{who}: просит подождать',
  sgShort_wait: 'зовём', sgShort_yes: 'идёт', sgShort_no: 'отказ', evClose: 'Закрыть',
  pgCapReady: 'Призыв Инквизиции', pgCapStart: 'Призыв Инквизиции', pgReadyNo: 'Не готов', pgClose: 'Закрыть', pgToLobby: 'В лобби', pgNotNow: 'Не сейчас',
  e_kicked_t: 'Вас убрали из этого лобби — вернуться можно через {left}.',
  n_kicked_me: 'Вас убрали из лобби «{name}». Войти снова можно в любой момент.', kickedLeft: 'Самому — через {left}.',
  pgAlreadyStart: 'Хоста только что позвал другой игрок — ждём его ответа.', pgAlreadyReady: 'Проверка готовности только что отправлена.',
});
Object.assign(T.en, { invKicker: 'Invitation to a lobby', invSeats: '{n} of {m} seats taken', });
Object.assign(T.ru, { invKicker: 'Приглашение в лобби', invSeats: 'занято {n} из {m}', });
Object.assign(T.en, { pgMeta: '{n} seconds to answer' });
Object.assign(T.ru, { pgMeta: '{n} секунд на ответ' });
// 1.5.12: the new words in es / fr / de; the pings are strips now (no "window" in the tips)
Object.assign(T.es, {
  lrPingHostWait: 'Anfitrión llamado · {n}', lrPingReadyWait: 'Comprobación · {n}', lrPingHostWaitTip: 'Ya se llamó al anfitrión ({who}). De nuevo en {n} s.',
  lrPingReadyWaitTip: 'La comprobación ya se envió. De nuevo en {n} s.', sgYou: 'tú', tipHostNR: 'Todos los jugadores listos: esperando al anfitrión. Llámalo con «Llamar al anfitrión» en la sala.',
  sg_ready_wait: '{who}: esperando respuesta a la comprobación', sg_ready_no: '{who}: no está listo (respondió)', sg_start_wait: '{who}: lo llaman para empezar',
  sg_start_yes: '{who}: va a la sala', sg_start_no: '{who}: pide esperar', sgShort_wait: 'llamando', sgShort_yes: 'va', sgShort_no: 'no', evClose: 'Cerrar',
  pgCapReady: 'Convocatoria de la Inquisición', pgCapStart: 'Convocatoria de la Inquisición', pgReadyNo: 'No listo', pgClose: 'Cerrar', pgToLobby: 'A la sala', pgNotNow: 'Ahora no',
  e_kicked_t: 'Te quitaron de esta sala: puedes volver en {left}.',
  n_kicked_me: 'Te quitaron de la sala «{name}». Puedes volver a entrar cuando quieras.', kickedLeft: 'Por tu cuenta: en {left}.',
  pgAlreadyStart: 'Otro jugador acaba de llamar al anfitrión: esperando su respuesta.', pgAlreadyReady: 'La comprobación acaba de enviarse.',
  invKicker: 'Invitación a una sala', invSeats: '{n} de {m} plazas ocupadas', pgMeta: '{n} segundos para responder' });
Object.assign(T.fr, {
  lrPingHostWait: 'Hôte appelé · {n}', lrPingReadyWait: 'Vérification · {n}', lrPingHostWaitTip: 'L\'hôte a déjà été appelé ({who}). À nouveau dans {n} s.',
  lrPingReadyWaitTip: 'La vérification a déjà été envoyée. À nouveau dans {n} s.', sgYou: 'vous', tipHostNR: 'Tous les joueurs sont prêts : on attend l\'hôte. Appelez-le avec « Appeler l\'hôte » dans le salon.',
  sg_ready_wait: '{who} : réponse à la vérification attendue', sg_ready_no: '{who} : pas prêt (a répondu)', sg_start_wait: '{who} : appelé pour lancer la partie',
  sg_start_yes: '{who} : arrive dans le salon', sg_start_no: '{who} : demande d\'attendre', sgShort_wait: 'appel', sgShort_yes: 'arrive', sgShort_no: 'non', evClose: 'Fermer',
  pgCapReady: 'Convocation de l\'Inquisition', pgCapStart: 'Convocation de l\'Inquisition', pgReadyNo: 'Pas prêt', pgClose: 'Fermer', pgToLobby: 'Au salon', pgNotNow: 'Pas maintenant',
  e_kicked_t: 'Vous avez été retiré de ce salon : retour possible dans {left}.',
  n_kicked_me: 'Vous avez été retiré du salon « {name} ». Vous pouvez y revenir à tout moment.', kickedLeft: 'Par vous-même : dans {left}.',
  pgAlreadyStart: 'Un autre joueur vient d\'appeler l\'hôte : on attend sa réponse.', pgAlreadyReady: 'La vérification vient d\'être envoyée.',
  invKicker: 'Invitation dans un salon', invSeats: '{n} places prises sur {m}', pgMeta: '{n} secondes pour répondre' });
Object.assign(T.de, {
  lrPingHostWait: 'Host gerufen · {n}', lrPingReadyWait: 'Bereitschaft · {n}', lrPingHostWaitTip: 'Der Host wurde schon gerufen ({who}). Wieder in {n} s.',
  lrPingReadyWaitTip: 'Die Bereitschaftsabfrage ist schon raus. Wieder in {n} s.', sgYou: 'du', tipHostNR: 'Alle Spieler bereit – wir warten auf den Host. Ruf ihn mit „Host rufen“ in der Lobby.',
  sg_ready_wait: '{who}: Antwort auf die Abfrage steht aus', sg_ready_no: '{who}: nicht bereit (geantwortet)', sg_start_wait: '{who}: wird zum Start gerufen',
  sg_start_yes: '{who}: kommt in die Lobby', sg_start_no: '{who}: bittet zu warten', sgShort_wait: 'Ruf', sgShort_yes: 'kommt', sgShort_no: 'nein', evClose: 'Schließen',
  pgCapReady: 'Ruf der Inquisition', pgCapStart: 'Ruf der Inquisition', pgReadyNo: 'Nicht bereit', pgClose: 'Schließen', pgToLobby: 'Zur Lobby', pgNotNow: 'Nicht jetzt',
  e_kicked_t: 'Du wurdest aus dieser Lobby entfernt – zurück in {left}.',
  n_kicked_me: 'Du wurdest aus der Lobby „{name}“ entfernt. Du kannst jederzeit wieder beitreten.', kickedLeft: 'Selbst – in {left}.',
  pgAlreadyStart: 'Ein anderer Spieler hat den Host gerade gerufen – wir warten auf seine Antwort.', pgAlreadyReady: 'Die Bereitschaftsabfrage wurde gerade gesendet.',
  invKicker: 'Einladung in eine Lobby', invSeats: '{n} von {m} Plätzen belegt', pgMeta: '{n} Sekunden zum Antworten' });
