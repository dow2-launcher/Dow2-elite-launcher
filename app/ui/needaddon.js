// 1.6.13 (siritos, fb 1210): a button that works through an add-on is always on - as Ready in the own lobby. Its add-on off:
// a small window offers to turn it on; yes - the launcher turns it on (the add-ons are brought before the game starts) and
// does what the button was pressed for (Watch -> ReplayOpen on -> the replay opens). The game running: an add-on comes in
// only at its next start - the window says so, and once the game is closed the launcher turns it on and goes on itself.
// An add-on that cannot do it yet (not out for players, not for vanilla, an older version in the game - the game's own
// status line on its pipe says which) - a window says that plainly. Used by Join / the eye of the lobbies (RoomJoin), Watch
// of a running match (LiveReplay), Watch of a replay (ReplayOpen), Ready of the own lobby (Automatch v2.0).
Object.assign(T.en, {
  naTitle: 'The add-on “{name}”', naOn: 'Turn on', naOnAfter: 'Turn on after the game',
  naAsk: '{what} works through the add-on “{name}”. Turn it on? The launcher brings it and goes on right away.',
  naAskRun: 'The game is running: an add-on comes in only at its next start. Close the game - the launcher turns the add-on on, starts the game and goes on.',
  naWait: 'Close the game: then “{name}” is turned on and the launcher goes on.',
  naMissing: '{what} needs the add-on “{name}” - it is not out for players yet.',
  naMissingVan: '{what} needs the add-on “{name}” - it does not work in vanilla yet.',
  naBlocked: 'This Elite version takes no add-ons: switch to another version for {what}.',
  naOld: '{what} needs “{name}” {need} or newer - the game has {have}.',
  naOldUpd: 'A newer one is out already: it is installed when the game closes.', naOldNone: 'That version is not out for players yet.',
  naOldAfter: 'Update after the game', naHave: 'an older one',
  na_roomjoin: 'Joining a lobby', na_roomjoin_obs: 'Joining a lobby as an observer', na_livereplay: 'Watching a running match',
  na_replayopen: 'Watching a replay from the launcher', na_automatch: 'The start of a launcher lobby',
});
Object.assign(T.ru, {
  naTitle: 'Дополнение «{name}»', naOn: 'Включить', naOnAfter: 'Включить после игры',
  naAsk: '{what} работает через дополнение «{name}». Включить его? Лаунчер установит его и сразу продолжит.',
  naAskRun: 'Игра запущена: дополнение подключится только при следующем запуске. Закройте игру — лаунчер включит дополнение, запустит игру и продолжит.',
  naWait: 'Закройте игру: тогда «{name}» включится, и лаунчер продолжит.',
  naMissing: 'Для этого ({what}) нужно дополнение «{name}» — оно ещё не вышло для игроков.',
  naMissingVan: 'Для этого ({what}) нужно дополнение «{name}» — в ванили оно пока не работает.',
  naBlocked: 'Эта версия Elite без дополнений: для этого ({what}) переключитесь на другую версию.',
  naOld: 'Для этого ({what}) нужна версия «{name}» {need} или новее — в игре {have}.',
  naOldUpd: 'Новая версия уже вышла: она установится, когда игра закроется.', naOldNone: 'Эта версия ещё не вышла для игроков.',
  naOldAfter: 'Обновить после игры', naHave: 'старая',
  na_roomjoin: 'Вход в лобби', na_roomjoin_obs: 'Вход в лобби наблюдателем', na_livereplay: 'Просмотр идущего матча',
  na_replayopen: 'Просмотр реплея из лаунчера', na_automatch: 'Старт лобби лаунчера',
});
Object.assign(T.es, {
  naTitle: 'El complemento «{name}»', naOn: 'Activar', naOnAfter: 'Activar después',
  naAsk: '{what} funciona con el complemento «{name}». ¿Activarlo? El launcher lo instala y sigue enseguida.',
  naAskRun: 'El juego está abierto: un complemento entra solo en su próximo inicio. Cierra el juego: el launcher activa el complemento, inicia el juego y sigue.',
  naWait: 'Cierra el juego: entonces se activa «{name}» y el launcher sigue.',
  naMissing: '{what} necesita el complemento «{name}», que aún no se ha publicado para los jugadores.',
  naMissingVan: '{what} necesita el complemento «{name}», que aún no funciona en vanilla.',
  naBlocked: 'Esta versión de Elite no admite complementos: cambia a otra versión para {what}.',
  naOld: '{what} necesita «{name}» {need} o más reciente; el juego tiene {have}.',
  naOldUpd: 'Ya hay una versión nueva: se instala al cerrar el juego.', naOldNone: 'Esa versión aún no se ha publicado para los jugadores.',
  naOldAfter: 'Actualizar después', naHave: 'una más antigua',
  na_roomjoin: 'Entrar en una sala', na_roomjoin_obs: 'Entrar en una sala como observador', na_livereplay: 'Ver una partida en curso',
  na_replayopen: 'Ver una repetición desde el launcher', na_automatch: 'El inicio de una sala del launcher',
});
Object.assign(T.fr, {
  naTitle: 'Le module « {name} »', naOn: 'Activer', naOnAfter: 'Activer après le jeu',
  naAsk: '{what} passe par le module « {name} ». L\'activer ? Le launcher l\'installe et continue aussitôt.',
  naAskRun: 'Le jeu est lancé : un module n\'arrive qu\'au prochain démarrage. Fermez le jeu - le launcher active le module, lance le jeu et continue.',
  naWait: 'Fermez le jeu : « {name} » sera alors activé et le launcher continuera.',
  naMissing: '{what} demande le module « {name} », pas encore publié pour les joueurs.',
  naMissingVan: '{what} demande le module « {name} », qui ne marche pas encore en vanilla.',
  naBlocked: 'Cette version d\'Elite ne prend pas de modules : passez à une autre version pour {what}.',
  naOld: '{what} demande « {name} » {need} ou plus récent ; le jeu a {have}.',
  naOldUpd: 'Une version plus récente est déjà sortie : elle s\'installe à la fermeture du jeu.', naOldNone: 'Cette version n\'est pas encore publiée pour les joueurs.',
  naOldAfter: 'Mettre à jour après', naHave: 'une plus ancienne',
  na_roomjoin: 'Rejoindre un salon', na_roomjoin_obs: 'Rejoindre un salon en observateur', na_livereplay: 'Regarder une partie en cours',
  na_replayopen: 'Regarder un replay depuis le launcher', na_automatch: 'Le départ d\'un salon du launcher',
});
Object.assign(T.de, {
  naTitle: 'Das Add-on „{name}“', naOn: 'Aktivieren', naOnAfter: 'Danach aktivieren',
  naAsk: '{what} läuft über das Add-on „{name}“. Aktivieren? Der Launcher installiert es und macht sofort weiter.',
  naAskRun: 'Das Spiel läuft: ein Add-on kommt erst beim nächsten Start dazu. Schließe das Spiel - der Launcher aktiviert das Add-on, startet das Spiel und macht weiter.',
  naWait: 'Schließe das Spiel: dann wird „{name}“ aktiviert und der Launcher macht weiter.',
  naMissing: '{what} braucht das Add-on „{name}“ - es ist für Spieler noch nicht erschienen.',
  naMissingVan: '{what} braucht das Add-on „{name}“ - in Vanilla geht es noch nicht.',
  naBlocked: 'Diese Elite-Version nimmt keine Add-ons: wechsle für {what} zu einer anderen Version.',
  naOld: '{what} braucht „{name}“ {need} oder neuer - im Spiel ist {have}.',
  naOldUpd: 'Eine neuere ist schon erschienen: sie wird installiert, wenn das Spiel geschlossen ist.', naOldNone: 'Diese Version ist für Spieler noch nicht erschienen.',
  naOldAfter: 'Danach aktualisieren', naHave: 'eine ältere',
  na_roomjoin: 'Einer Lobby beitreten', na_roomjoin_obs: 'Einer Lobby als Zuschauer beitreten', na_livereplay: 'Ein laufendes Match ansehen',
  na_replayopen: 'Ein Replay aus dem Launcher ansehen', na_automatch: 'Der Start einer Launcher-Lobby',
});

// the add-ons by their id without the _r2 / _off ends; their names when the store has no entry for them yet
const naComp = id => (S && S.components || []).find(c => String(c.id).replace(/_(r\d+|off)$/, '') === id);
const NA_NAMES = { roomjoin: 'Lobby join', livereplay: 'Live replay', replayopen: 'Replay from the launcher', automatch: 'Automatch v2.0' };
const naName = (id, c) => (c && L(c.name)) || NA_NAMES[id] || id;
// what waits for the game to close: {id, run, until}
const NA = { after: null };
// id: the add-on; what: the key of the action's name (na_*); game: 'elite' | 'vanilla'; run: the action again (after the game
// closed). true: the add-on is on - go on now; false: stopped (a window said why, or the action waits for the game to close)
async function naNeed(id, what, game, run) {
  const c = naComp(id), name = naName(id, c), w = t(what), title = t('naTitle', { name });
  if (!S || (S.os !== 'windows' && S.os !== 'linux')) { rjModal(title, [t('rjOnlyWin')]); return false; }
  if (!c || (game === 'vanilla' ? !c.vanilla_ok : c.elite_ok === false)) { rjModal(title, [t(c && game === 'vanilla' ? 'naMissingVan' : 'naMissing', { what: w, name })]); return false; }
  if (c.enabled) return true;
  if (c.chosen && !S.game_running) { rjModal(title, [t('naBlocked', { what: w })]); return false; }   // ticked, the version takes none
  const running = !!S.game_running;
  // 1.6.29: an add-on marked dangerous (app.js compDanger): its warning in the same question, the button red
  const ok = await askBox(title, [t('naAsk', { what: w, name }), compDanger(c), compDanger(c) ? t('dangerAsk') : '', running ? t('naAskRun') : ''],
    [{ label: t(running ? 'naOnAfter' : 'naOn'), cls: compDanger(c) ? 'red' : 'gold', val: 1 }, { label: t('rjCancel'), val: 0 }]);
  if (!ok) return false;
  if (running) { NA.after = { id: c.id, run, until: Date.now() + 15 * 60000 }; toast(t('naWait', { name })); return false; }
  try { await invoke('set_component', { id: c.id, on: true }); await reload(); }
  catch (e) { toast(errText(e), true); return false; }
  return true;
}
// the game has an older add-on than the action needs (its status line on the pipe): a newer one in the store - it comes when
// the game closes (then the action again), else it is not out yet
async function naOld(id, what, need, have, run) {
  const c = naComp(id), name = naName(id, c), title = t('naTitle', { name });
  const upd = !!(c && c.enabled && c.latest && c.installed && c.latest !== c.installed);
  const lines = [t('naOld', { what: t(what), name, need, have: have || t('naHave') }), t(upd ? 'naOldUpd' : 'naOldNone')];
  if (!upd || !S.game_running) { rjModal(title, lines); return; }
  const ok = await askBox(title, lines, [{ label: t('naOldAfter'), cls: 'gold', val: 1 }, { label: t('roomsVerClose'), val: 0 }]);
  if (ok) { NA.after = { id: c.id, run, until: Date.now() + 15 * 60000 }; toast(t('naWait', { name })); }
}
// the game closed: the add-on on (the update / the add-on itself comes with the next start), then the action - it starts the game
listen('game_running', e => {
  if (e.payload || !NA.after) return;
  const a = NA.after; NA.after = null;
  if (Date.now() > a.until) return;
  setTimeout(async () => {
    try { await invoke('set_component', { id: a.id, on: true }); await reload(); } catch (x) { /* the action says what is missing */ }
    a.run();
  }, 1500);
});

// 1.6.13: the eye of a game's lobby (app.js roomObsBtn), its join as an observer (RoomJoin 14+)
Object.assign(T.en, {
  rObsTip: 'Join as an observer ({n} free)', rObsTip0: 'Join as an observer', rObsAsk: 'Join as an observer',
  rObsNone: 'The host has no free observer seat in this lobby.', rObsNoneHint: 'In the game the observer seats are closed until the host opens them.',
  rjInLobbyObs: 'You are in the lobby {name} as an observer', rjWhy_no_obs_slot: 'no free observer seat - the game left the lobby',
});
Object.assign(T.ru, {
  rObsTip: 'Войти наблюдателем (свободно: {n})', rObsTip0: 'Войти наблюдателем', rObsAsk: 'Вход наблюдателем',
  rObsNone: 'В этом лобби нет свободных мест наблюдателей.', rObsNoneHint: 'В игре места наблюдателей закрыты, пока их не откроет хост.',
  rjInLobbyObs: 'Вы в лобби {name} наблюдателем', rjWhy_no_obs_slot: 'нет свободного места наблюдателя — игра вышла из лобби',
});
Object.assign(T.es, {
  rObsTip: 'Entrar como observador ({n} libres)', rObsTip0: 'Entrar como observador', rObsAsk: 'Entrar como observador',
  rObsNone: 'El anfitrión no tiene plazas de observador libres en esta sala.', rObsNoneHint: 'En el juego las plazas de observador están cerradas hasta que el anfitrión las abre.',
  rjInLobbyObs: 'Estás en la sala {name} como observador', rjWhy_no_obs_slot: 'no hay plaza de observador libre: el juego salió de la sala',
});
Object.assign(T.fr, {
  rObsTip: 'Rejoindre en observateur ({n} libres)', rObsTip0: 'Rejoindre en observateur', rObsAsk: 'Rejoindre en observateur',
  rObsNone: 'L\'hôte n\'a aucune place d\'observateur libre dans ce salon.', rObsNoneHint: 'Dans le jeu, les places d\'observateur restent fermées tant que l\'hôte ne les ouvre pas.',
  rjInLobbyObs: 'Vous êtes dans le salon {name} en observateur', rjWhy_no_obs_slot: 'aucune place d\'observateur libre - le jeu a quitté le salon',
});
Object.assign(T.de, {
  rObsTip: 'Als Zuschauer beitreten ({n} frei)', rObsTip0: 'Als Zuschauer beitreten', rObsAsk: 'Als Zuschauer beitreten',
  rObsNone: 'Der Host hat in dieser Lobby keinen freien Zuschauerplatz.', rObsNoneHint: 'Im Spiel sind die Zuschauerplätze zu, bis der Host sie öffnet.',
  rjInLobbyObs: 'Du bist als Zuschauer in der Lobby {name}', rjWhy_no_obs_slot: 'kein freier Zuschauerplatz - das Spiel hat die Lobby verlassen',
});
