// The Replays tab (1.6.0, owner 13.11.2026): the player's own replays (the game's Playback folder, read by the launcher:
// the map, who played with which race, hero and army level, the length, the game version) and the shared pool on our
// server (search by mode, number of players, races, version; download into Playback so the game's Replays menu has it).
// An own replay goes into the pool with one button - the Steam sign-in of the chat says who put it there - and its
// author can write a description afterwards; the server analyses every replay that comes in (the report shown here).
// replays.rs: the calls (the session token added there). Loaded after app.js and lroom.js (t, esc, invoke, CH, raceImg,
// mmapHtml, lrAssets, lrCatalog, lrHeroName, segf, ico, toast).
'use strict';
Object.assign(T.en, {
  replaysTab: 'Replays', rpMine: 'My replays', rpPool: 'Shared pool',
  rpMineNote: 'The replays of the game on this computer (the Playback folder). Put one into the shared pool with one button - you are its author and can add a description.',
  rpPoolNote: 'Replays of all players: the ladder matches, the ones put in from the launcher and from the community Discord. Download puts the file into the game\'s replays.',
  rpSearch: 'Player, map, author, description', rpMode: 'Mode', rpAll: 'All', rpPlayers: 'Players', rpVersion: 'Version', rpRaces: 'Races',
  rpRacesTip: 'Only matches with every race picked here', rpOnlyMine: 'Only mine', rpMore: 'Show more', rpReload: 'Refresh', rpOpenDir: 'Open the folder',
  rpNone: 'No replays here yet.', rpNoneFilter: 'No replay fits the filters.', rpNoDir: 'The game\'s replay folder was not found.',
  rpPoolErr: 'The pool did not answer. Check the connection and press Refresh.', rpLoading: 'Loading…',
  rpPick: 'Pick a replay on the left to see it in detail.', rpVanilla: 'Vanilla', rpVerUnknown: 'unknown version', rpBroken: 'not a readable replay',
  rpLen: 'Length', rpRecorded: 'Recorded', rpUploaded: 'In the pool since', rpVer: 'Game version', rpCmds: 'Commands', rpSize: 'Size',
  rpTeam: 'Team {n}', rpLevel: 'level {n}', rpObservers: 'Observers', rpAuthor: 'Author', rpNoAuthor: 'not named', rpFrom: 'From',
  src_ladder: 'ladder', src_site: 'replay page', src_launcher: 'launcher', src_discord: 'Discord',
  rpDescr: 'Description', rpNoDescr: 'No description.', rpDescrEdit: 'Edit the description', rpDescrPh: 'What is worth watching: the build, the turn of the match, the players…',
  rpSave: 'Save', rpCancel: 'Cancel', rpSaved: 'Description saved', rpUpload: 'Put into the pool', rpUploading: 'Sending…',
  rpUploaded2: 'The replay is in the pool', rpUploadedOther: 'This match is in the pool already, put there by {name}', rpInPool: 'in the pool',
  rpInPoolTip: 'This replay is in the shared pool', rpShowPool: 'Show it in the pool', rpDownload: 'Download', rpDownloading: 'Downloading…',
  rpDownloaded: 'Saved to the game\'s replays: {file}', rpHad: 'Already in the game\'s replays: {file}', rpWatchHint: 'In the game: Replays in the main menu.',
  rpSignIn: 'Sign in with Steam to put replays into the pool - the pool shows you as their author.', rpSignInBtn: 'Sign in',
  rpReport: 'Analysis of the match', rpReportShow: 'Show the analysis', rpReportHide: 'Hide the analysis', rpReportWait: 'The server is still analysing this replay.',
  rpe_auth: 'Sign in with Steam first.', rpe_no_file: 'The file is gone from the replay folder.', rpe_not_replay: 'This is not a Dawn of War II replay.',
  rpe_too_big: 'The file is too big for the pool (30 MB at most).', rpe_too_many: 'Too many replays sent from here in the last hour - try again later.',
  rpe_full: 'The pool is full right now - try later.', rpe_rejected: 'The pool did not take the file.', rpe_not_yours: 'Only the one who put the replay into the pool can change its description.',
  rpe_not_found: 'The replay is gone from the pool.', rpe_no_dir: 'The game\'s replay folder was not found.', rpe_bad_id: 'Not a replay of the pool.', rpe_sign_in: 'Sign in with Steam first.',
});
Object.assign(T.ru, {
  replaysTab: 'Реплеи', rpMine: 'Мои реплеи', rpPool: 'Общий пул',
  rpMineNote: 'Реплеи игры на этом компьютере (папка Playback). Любой можно одной кнопкой отправить в общий пул — там вы будете его автором и сможете добавить описание.',
  rpPoolNote: 'Реплеи всех игроков: матчи ладдера, присланные из лаунчера и из Discord-сообществ. «Скачать» кладёт файл в реплеи игры.',
  rpSearch: 'Игрок, карта, автор, описание', rpMode: 'Режим', rpAll: 'Все', rpPlayers: 'Игроков', rpVersion: 'Версия', rpRaces: 'Расы',
  rpRacesTip: 'Только матчи, где есть все выбранные расы', rpOnlyMine: 'Только мои', rpMore: 'Показать ещё', rpReload: 'Обновить', rpOpenDir: 'Открыть папку',
  rpNone: 'Реплеев пока нет.', rpNoneFilter: 'Под фильтры ничего не подходит.', rpNoDir: 'Папка реплеев игры не найдена.',
  rpPoolErr: 'Пул не ответил. Проверьте соединение и нажмите «Обновить».', rpLoading: 'Загрузка…',
  rpPick: 'Выберите реплей слева, чтобы посмотреть подробно.', rpVanilla: 'Ваниль', rpVerUnknown: 'версия неизвестна', rpBroken: 'файл не читается как реплей',
  rpLen: 'Длительность', rpRecorded: 'Записан', rpUploaded: 'В пуле с', rpVer: 'Версия игры', rpCmds: 'Команд', rpSize: 'Размер',
  rpTeam: 'Команда {n}', rpLevel: 'уровень {n}', rpObservers: 'Зрители', rpAuthor: 'Автор', rpNoAuthor: 'не указан', rpFrom: 'Откуда',
  src_ladder: 'ладдер', src_site: 'страница реплеев', src_launcher: 'лаунчер', src_discord: 'Discord',
  rpDescr: 'Описание', rpNoDescr: 'Описания нет.', rpDescrEdit: 'Изменить описание', rpDescrPh: 'Что стоит посмотреть: билд, перелом матча, игроки…',
  rpSave: 'Сохранить', rpCancel: 'Отмена', rpSaved: 'Описание сохранено', rpUpload: 'В общий пул', rpUploading: 'Отправляю…',
  rpUploaded2: 'Реплей в общем пуле', rpUploadedOther: 'Этот матч уже есть в пуле, его прислал {name}', rpInPool: 'в пуле',
  rpInPoolTip: 'Этот реплей есть в общем пуле', rpShowPool: 'Открыть в пуле', rpDownload: 'Скачать', rpDownloading: 'Скачиваю…',
  rpDownloaded: 'Сохранён в реплеи игры: {file}', rpHad: 'Уже есть в реплеях игры: {file}', rpWatchHint: 'В игре: «Реплеи» в главном меню.',
  rpSignIn: 'Войдите через Steam, чтобы отправлять реплеи в пул — там вы будете указаны их автором.', rpSignInBtn: 'Войти',
  rpReport: 'Разбор матча', rpReportShow: 'Показать разбор', rpReportHide: 'Скрыть разбор', rpReportWait: 'Сервер ещё разбирает этот реплей.',
  rpe_auth: 'Сначала войдите через Steam.', rpe_no_file: 'Файла больше нет в папке реплеев.', rpe_not_replay: 'Это не реплей Dawn of War II.',
  rpe_too_big: 'Файл слишком большой для пула (не больше 30 МБ).', rpe_too_many: 'Отсюда за последний час прислано слишком много реплеев — попробуйте позже.',
  rpe_full: 'Пул сейчас заполнен — попробуйте позже.', rpe_rejected: 'Пул не принял файл.', rpe_not_yours: 'Описание может менять только тот, кто прислал реплей в пул.',
  rpe_not_found: 'Этого реплея больше нет в пуле.', rpe_no_dir: 'Папка реплеев игры не найдена.', rpe_bad_id: 'Это не реплей из пула.', rpe_sign_in: 'Сначала войдите через Steam.',
});
Object.assign(T.es, {
  replaysTab: 'Repeticiones', rpMine: 'Mis repeticiones', rpPool: 'Colección común',
  rpMineNote: 'Las repeticiones del juego en este equipo (la carpeta Playback). Cualquiera se envía a la colección común con un botón: allí apareces como autor y puedes añadir una descripción.',
  rpPoolNote: 'Repeticiones de todos los jugadores: partidas del ladder, las enviadas desde el launcher y desde el Discord de la comunidad. «Descargar» pone el archivo en las repeticiones del juego.',
  rpSearch: 'Jugador, mapa, autor, descripción', rpMode: 'Modo', rpAll: 'Todos', rpPlayers: 'Jugadores', rpVersion: 'Versión', rpRaces: 'Razas',
  rpRacesTip: 'Solo partidas con todas las razas elegidas', rpOnlyMine: 'Solo las mías', rpMore: 'Mostrar más', rpReload: 'Actualizar', rpOpenDir: 'Abrir la carpeta',
  rpNone: 'Aún no hay repeticiones.', rpNoneFilter: 'Ninguna repetición cumple los filtros.', rpNoDir: 'No se encontró la carpeta de repeticiones del juego.',
  rpPoolErr: 'La colección no respondió. Revisa la conexión y pulsa Actualizar.', rpLoading: 'Cargando…',
  rpPick: 'Elige una repetición a la izquierda para verla en detalle.', rpVanilla: 'Vanilla', rpVerUnknown: 'versión desconocida', rpBroken: 'no se puede leer como repetición',
  rpLen: 'Duración', rpRecorded: 'Grabada', rpUploaded: 'En la colección desde', rpVer: 'Versión del juego', rpCmds: 'Órdenes', rpSize: 'Tamaño',
  rpTeam: 'Equipo {n}', rpLevel: 'nivel {n}', rpObservers: 'Espectadores', rpAuthor: 'Autor', rpNoAuthor: 'sin indicar', rpFrom: 'Origen',
  src_ladder: 'ladder', src_site: 'página de repeticiones', src_launcher: 'launcher', src_discord: 'Discord',
  rpDescr: 'Descripción', rpNoDescr: 'Sin descripción.', rpDescrEdit: 'Editar la descripción', rpDescrPh: 'Qué merece la pena ver: la build, el giro de la partida, los jugadores…',
  rpSave: 'Guardar', rpCancel: 'Cancelar', rpSaved: 'Descripción guardada', rpUpload: 'Enviar a la colección', rpUploading: 'Enviando…',
  rpUploaded2: 'La repetición está en la colección', rpUploadedOther: 'Esta partida ya está en la colección, la envió {name}', rpInPool: 'en la colección',
  rpInPoolTip: 'Esta repetición está en la colección común', rpShowPool: 'Verla en la colección', rpDownload: 'Descargar', rpDownloading: 'Descargando…',
  rpDownloaded: 'Guardada en las repeticiones del juego: {file}', rpHad: 'Ya está en las repeticiones del juego: {file}', rpWatchHint: 'En el juego: Repeticiones en el menú principal.',
  rpSignIn: 'Inicia sesión con Steam para enviar repeticiones a la colección: allí apareces como su autor.', rpSignInBtn: 'Iniciar sesión',
  rpReport: 'Análisis de la partida', rpReportShow: 'Mostrar el análisis', rpReportHide: 'Ocultar el análisis', rpReportWait: 'El servidor aún está analizando esta repetición.',
  rpe_auth: 'Primero inicia sesión con Steam.', rpe_no_file: 'El archivo ya no está en la carpeta de repeticiones.', rpe_not_replay: 'No es una repetición de Dawn of War II.',
  rpe_too_big: 'El archivo es demasiado grande para la colección (30 MB como máximo).', rpe_too_many: 'Se han enviado demasiadas repeticiones desde aquí en la última hora; inténtalo más tarde.',
  rpe_full: 'La colección está llena ahora mismo; inténtalo más tarde.', rpe_rejected: 'La colección no aceptó el archivo.', rpe_not_yours: 'Solo quien envió la repetición puede cambiar su descripción.',
  rpe_not_found: 'La repetición ya no está en la colección.', rpe_no_dir: 'No se encontró la carpeta de repeticiones del juego.', rpe_bad_id: 'No es una repetición de la colección.', rpe_sign_in: 'Primero inicia sesión con Steam.',
});
Object.assign(T.fr, {
  replaysTab: 'Rediffusions', rpMine: 'Mes rediffusions', rpPool: 'Collection commune',
  rpMineNote: 'Les rediffusions du jeu sur cet ordinateur (le dossier Playback). Chacune s\'envoie dans la collection commune d\'un clic : vous y êtes son auteur et pouvez ajouter une description.',
  rpPoolNote: 'Les rediffusions de tous les joueurs : parties du ladder, envois du launcher et du Discord de la communauté. « Télécharger » place le fichier dans les rediffusions du jeu.',
  rpSearch: 'Joueur, carte, auteur, description', rpMode: 'Mode', rpAll: 'Tous', rpPlayers: 'Joueurs', rpVersion: 'Version', rpRaces: 'Races',
  rpRacesTip: 'Seulement les parties avec toutes les races choisies', rpOnlyMine: 'Seulement les miennes', rpMore: 'Afficher plus', rpReload: 'Actualiser', rpOpenDir: 'Ouvrir le dossier',
  rpNone: 'Pas encore de rediffusion.', rpNoneFilter: 'Aucune rediffusion ne correspond aux filtres.', rpNoDir: 'Le dossier des rediffusions du jeu est introuvable.',
  rpPoolErr: 'La collection n\'a pas répondu. Vérifiez la connexion et cliquez sur Actualiser.', rpLoading: 'Chargement…',
  rpPick: 'Choisissez une rediffusion à gauche pour la voir en détail.', rpVanilla: 'Vanilla', rpVerUnknown: 'version inconnue', rpBroken: 'illisible comme rediffusion',
  rpLen: 'Durée', rpRecorded: 'Enregistrée', rpUploaded: 'Dans la collection depuis', rpVer: 'Version du jeu', rpCmds: 'Ordres', rpSize: 'Taille',
  rpTeam: 'Équipe {n}', rpLevel: 'niveau {n}', rpObservers: 'Spectateurs', rpAuthor: 'Auteur', rpNoAuthor: 'non indiqué', rpFrom: 'Origine',
  src_ladder: 'ladder', src_site: 'page des rediffusions', src_launcher: 'launcher', src_discord: 'Discord',
  rpDescr: 'Description', rpNoDescr: 'Pas de description.', rpDescrEdit: 'Modifier la description', rpDescrPh: 'Ce qui vaut le coup d\'œil : le build, le tournant de la partie, les joueurs…',
  rpSave: 'Enregistrer', rpCancel: 'Annuler', rpSaved: 'Description enregistrée', rpUpload: 'Envoyer dans la collection', rpUploading: 'Envoi…',
  rpUploaded2: 'La rediffusion est dans la collection', rpUploadedOther: 'Cette partie est déjà dans la collection, envoyée par {name}', rpInPool: 'dans la collection',
  rpInPoolTip: 'Cette rediffusion est dans la collection commune', rpShowPool: 'La voir dans la collection', rpDownload: 'Télécharger', rpDownloading: 'Téléchargement…',
  rpDownloaded: 'Enregistrée dans les rediffusions du jeu : {file}', rpHad: 'Déjà dans les rediffusions du jeu : {file}', rpWatchHint: 'Dans le jeu : Rediffusions dans le menu principal.',
  rpSignIn: 'Connectez-vous avec Steam pour envoyer des rediffusions : la collection vous indique comme leur auteur.', rpSignInBtn: 'Se connecter',
  rpReport: 'Analyse de la partie', rpReportShow: 'Afficher l\'analyse', rpReportHide: 'Masquer l\'analyse', rpReportWait: 'Le serveur analyse encore cette rediffusion.',
  rpe_auth: 'Connectez-vous d\'abord avec Steam.', rpe_no_file: 'Le fichier n\'est plus dans le dossier des rediffusions.', rpe_not_replay: 'Ce n\'est pas une rediffusion de Dawn of War II.',
  rpe_too_big: 'Le fichier est trop gros pour la collection (30 Mo au plus).', rpe_too_many: 'Trop de rediffusions envoyées d\'ici depuis une heure ; réessayez plus tard.',
  rpe_full: 'La collection est pleine pour le moment ; réessayez plus tard.', rpe_rejected: 'La collection n\'a pas accepté le fichier.', rpe_not_yours: 'Seul celui qui a envoyé la rediffusion peut changer sa description.',
  rpe_not_found: 'La rediffusion n\'est plus dans la collection.', rpe_no_dir: 'Le dossier des rediffusions du jeu est introuvable.', rpe_bad_id: 'Ce n\'est pas une rediffusion de la collection.', rpe_sign_in: 'Connectez-vous d\'abord avec Steam.',
});
Object.assign(T.de, {
  replaysTab: 'Wiederholungen', rpMine: 'Meine Wiederholungen', rpPool: 'Gemeinsame Sammlung',
  rpMineNote: 'Die Wiederholungen des Spiels auf diesem Rechner (Ordner Playback). Jede geht mit einem Klick in die gemeinsame Sammlung – dort stehst du als Autor und kannst eine Beschreibung ergänzen.',
  rpPoolNote: 'Wiederholungen aller Spieler: Ladder-Spiele, Einsendungen aus dem Launcher und aus dem Discord der Community. „Herunterladen“ legt die Datei zu den Wiederholungen des Spiels.',
  rpSearch: 'Spieler, Karte, Autor, Beschreibung', rpMode: 'Modus', rpAll: 'Alle', rpPlayers: 'Spieler', rpVersion: 'Version', rpRaces: 'Völker',
  rpRacesTip: 'Nur Spiele mit allen gewählten Völkern', rpOnlyMine: 'Nur meine', rpMore: 'Mehr zeigen', rpReload: 'Aktualisieren', rpOpenDir: 'Ordner öffnen',
  rpNone: 'Noch keine Wiederholungen.', rpNoneFilter: 'Keine Wiederholung passt zu den Filtern.', rpNoDir: 'Der Wiederholungsordner des Spiels wurde nicht gefunden.',
  rpPoolErr: 'Die Sammlung hat nicht geantwortet. Prüfe die Verbindung und klicke auf Aktualisieren.', rpLoading: 'Lädt…',
  rpPick: 'Wähle links eine Wiederholung, um sie genau anzusehen.', rpVanilla: 'Vanilla', rpVerUnknown: 'unbekannte Version', rpBroken: 'als Wiederholung nicht lesbar',
  rpLen: 'Dauer', rpRecorded: 'Aufgenommen', rpUploaded: 'In der Sammlung seit', rpVer: 'Spielversion', rpCmds: 'Befehle', rpSize: 'Größe',
  rpTeam: 'Team {n}', rpLevel: 'Stufe {n}', rpObservers: 'Zuschauer', rpAuthor: 'Autor', rpNoAuthor: 'nicht angegeben', rpFrom: 'Herkunft',
  src_ladder: 'Ladder', src_site: 'Wiederholungsseite', src_launcher: 'Launcher', src_discord: 'Discord',
  rpDescr: 'Beschreibung', rpNoDescr: 'Keine Beschreibung.', rpDescrEdit: 'Beschreibung bearbeiten', rpDescrPh: 'Was sehenswert ist: der Build, die Wende des Spiels, die Spieler…',
  rpSave: 'Speichern', rpCancel: 'Abbrechen', rpSaved: 'Beschreibung gespeichert', rpUpload: 'In die Sammlung', rpUploading: 'Sende…',
  rpUploaded2: 'Die Wiederholung ist in der Sammlung', rpUploadedOther: 'Dieses Spiel ist schon in der Sammlung, eingesandt von {name}', rpInPool: 'in der Sammlung',
  rpInPoolTip: 'Diese Wiederholung ist in der gemeinsamen Sammlung', rpShowPool: 'In der Sammlung zeigen', rpDownload: 'Herunterladen', rpDownloading: 'Lade herunter…',
  rpDownloaded: 'In den Wiederholungen des Spiels gespeichert: {file}', rpHad: 'Schon in den Wiederholungen des Spiels: {file}', rpWatchHint: 'Im Spiel: Wiederholungen im Hauptmenü.',
  rpSignIn: 'Melde dich mit Steam an, um Wiederholungen einzusenden – die Sammlung nennt dich als Autor.', rpSignInBtn: 'Anmelden',
  rpReport: 'Analyse des Spiels', rpReportShow: 'Analyse zeigen', rpReportHide: 'Analyse ausblenden', rpReportWait: 'Der Server analysiert diese Wiederholung noch.',
  rpe_auth: 'Melde dich zuerst mit Steam an.', rpe_no_file: 'Die Datei ist nicht mehr im Wiederholungsordner.', rpe_not_replay: 'Das ist keine Wiederholung von Dawn of War II.',
  rpe_too_big: 'Die Datei ist zu groß für die Sammlung (höchstens 30 MB).', rpe_too_many: 'In der letzten Stunde wurden von hier zu viele Wiederholungen gesendet – versuch es später.',
  rpe_full: 'Die Sammlung ist gerade voll – versuch es später.', rpe_rejected: 'Die Sammlung hat die Datei nicht angenommen.', rpe_not_yours: 'Nur wer die Wiederholung eingesandt hat, kann ihre Beschreibung ändern.',
  rpe_not_found: 'Die Wiederholung ist nicht mehr in der Sammlung.', rpe_no_dir: 'Der Wiederholungsordner des Spiels wurde nicht gefunden.', rpe_bad_id: 'Keine Wiederholung der Sammlung.', rpe_sign_in: 'Melde dich zuerst mit Steam an.',
});

// ---- state ----
const RP = {
  view: 'mine', loaded: false,
  mine: { items: [], dir: '', err: '', have: {}, sel: '' },
  pool: { items: [], total: 0, page: 0, err: '', sel: '', loading: false },
  det: null, versions: [], cat: null,
  f: { q: '', mode: 'all', players: 'all', version: 'all', races: [], onlyMine: false },
};
try { Object.assign(RP.f, JSON.parse(localStorage.getItem('replaysFilter') || '{}')); } catch (e) {}
if (!Array.isArray(RP.f.races)) RP.f.races = [];
const rpSaveF = () => { try { localStorage.setItem('replaysFilter', JSON.stringify(RP.f)); } catch (e) {} };
const rpSigned = () => !!(CH.me && CH.me.signed_in);
const rpErr = e => { const k = 'rpe_' + (e && typeof e === 'object' ? e.error : e); return T.en[k] ? t(k) : (typeof errText === 'function' ? errText(String(e && e.error || e)) : String(e)); };

// one key per army whatever the version calls it (chaos_marines, z_tau of the Tau test builds, t_tau of 3.x)
const rpRace = r => {
  r = String(r || '').toLowerCase();
  if (r.includes('chaos')) return 'chaos_marines';
  if (r.includes('tau')) return 't_tau';
  if (r.includes('ork')) return 'orks';
  if (r.includes('tyranid')) return 'tyranids';
  if (r.includes('necron')) return 'z_unecron';
  return RACE_ALIAS[r] || r;
};
const RP_RACES = ['space_marines', 'chaos_marines', 'eldar', 'orks', 'tyranids', 'imperial_guard', 'ordo_malleus', 't_tau'];
const rpDur = s => { s = Number(s) || 0; const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const rpDate = sec => sec ? new Date(sec * 1000).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const rpVer = v => !v ? t('rpVerUnknown') : v === 'vanilla' ? t('rpVanilla') : v === 'unknown' ? t('rpVerUnknown') : v;
const rpMapName = k => {
  k = String(k || '').toLowerCase();
  const cat = RP.cat, all = cat && cat.maps ? Object.values(cat.maps).flat() : [];
  const m = all.find(x => x.key === k);
  if (m) return String(m.name).replace(/^\(\d+p\)\s*/i, '');
  return k.replace(/^\d+p_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};
const rpHero = (race, i) => {
  const hs = RP.cat && RP.cat.heroes ? RP.cat.heroes[rpRace(race)] || [] : [];
  return hs[i] ? lrHeroName(hs[i]) : '';
};
const rpMapImg = k => mmapHtml(`${lrAssets()}maps/${encodeURIComponent(String(k || '').toLowerCase())}.png`, rpMapName(k));
const rpTeams = pl => {
  const by = {};
  (pl || []).forEach(p => (by[p.team] = by[p.team] || []).push(p));
  return Object.keys(by).sort().map(k => by[k]);
};

// ---- loading ----
async function rpLoad(force) {
  if (!RP.cat) lrCatalog('elite').then(c => { if (c) { RP.cat = c; rpRender(); } });
  if (!RP.versions.length || force) invoke('replays_versions').then(v => { if (Array.isArray(v)) { RP.versions = v; rpFilters(); } }).catch(() => {});
  if (RP.view === 'mine') return rpLoadMine();
  return rpLoadPool(true);
}
async function rpLoadMine() {
  $('rpList').innerHTML = `<div class="note">${esc(t('rpLoading'))}</div>`;
  try {
    const r = await invoke('replays_local');
    RP.mine.err = r.ok ? '' : r.error; RP.mine.items = r.items || []; RP.mine.dir = r.dir || '';
  } catch (e) { RP.mine.err = String(e); RP.mine.items = []; }
  $('rpMineN').textContent = RP.mine.items.length ? String(RP.mine.items.length) : '';
  rpRender();
  const ids = RP.mine.items.map(x => x.id).filter(Boolean);
  if (ids.length) invoke('replays_have', { ids }).then(h => { if (h && typeof h === 'object') { RP.mine.have = h; rpRender(); } }).catch(() => {});
}
async function rpLoadPool(reset) {
  if (RP.pool.loading) return;
  RP.pool.loading = true;
  if (reset) { RP.pool.page = 0; $('rpList').innerHTML = `<div class="note">${esc(t('rpLoading'))}</div>`; }
  const f = RP.f;
  const q = { q: f.q, mode: f.mode === 'all' ? '' : f.mode, players: f.players === 'all' ? '' : f.players, version: f.version === 'all' ? '' : f.version,
              race: f.races.join(','), mine: f.onlyMine && rpSigned(), page: RP.pool.page, n: 50 };
  try {
    const r = await invoke('replays_pool', { q });
    RP.pool.err = '';
    RP.pool.items = reset ? r.items || [] : RP.pool.items.concat(r.items || []);
    RP.pool.total = r.total || 0;
  } catch (e) { RP.pool.err = String(e); if (reset) RP.pool.items = []; }
  RP.pool.loading = false;
  $('rpPoolN').textContent = RP.pool.total ? String(RP.pool.total) : '';
  rpRender();
}

// ---- filters ----
function rpFilters() {
  const f = RP.f, box = $('rpFlt'); if (!box) return;
  const vers = RP.view === 'mine' ? [...new Set(RP.mine.items.map(x => x.version || 'unknown'))] : RP.versions.map(v => v.version);
  if (f.version !== 'all' && !vers.includes(f.version)) vers.unshift(f.version);
  box.innerHTML = `<span class="rp-q"><input type="search" id="rpQ" value="${esc(f.q)}" placeholder="${esc(t('rpSearch'))}" aria-label="${esc(t('rpSearch'))}"></span>`
    + `<span>${esc(t('rpMode'))}${segf('mode', [['all', t('rpAll')], ['1v1', '1v1'], ['2v2', '2v2'], ['3v3', '3v3'], ['4v4', '4v4']], f.mode)}</span>`
    + `<span>${esc(t('rpPlayers'))}<select id="rpPl"><option value="all">${esc(t('rpAll'))}</option>${[2, 3, 4, 5, 6, 7, 8].map(n => `<option value="${n}"${String(f.players) === String(n) ? ' selected' : ''}>${n}</option>`).join('')}</select></span>`
    + `<span>${esc(t('rpVersion'))}<select id="rpVer"><option value="all">${esc(t('rpAll'))}</option>${vers.map(v => `<option value="${esc(v)}"${f.version === v ? ' selected' : ''}>${esc(rpVer(v))}</option>`).join('')}</select></span>`
    + `<span class="rp-races" data-tip="${esc(t('rpRacesTip'))}">${esc(t('rpRaces'))}${RP_RACES.map(r => `<button class="rp-race${f.races.includes(r) ? ' on' : ''}" data-race="${r}" aria-pressed="${f.races.includes(r)}">${raceImg(r)}</button>`).join('')}</span>`
    + (RP.view === 'pool' && rpSigned() ? `<label class="chk"><input type="checkbox" id="rpOnlyMine"${f.onlyMine ? ' checked' : ''}><span>${esc(t('rpOnlyMine'))}</span></label>` : '');
  const changed = () => { rpSaveF(); if (RP.view === 'pool') rpLoadPool(true); else rpRender(); };
  box.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { f[b.dataset.f] = b.dataset.v; rpFilters(); changed(); });
  box.querySelectorAll('.rp-race').forEach(b => b.onclick = () => {
    const r = b.dataset.race; f.races = f.races.includes(r) ? f.races.filter(x => x !== r) : f.races.concat(r); rpFilters(); changed();
  });
  $('rpPl').onchange = e => { f.players = e.target.value; changed(); };
  $('rpVer').onchange = e => { f.version = e.target.value; changed(); };
  let qt = 0;
  $('rpQ').oninput = e => { f.q = e.target.value; clearTimeout(qt); qt = setTimeout(changed, 350); };
  const om = $('rpOnlyMine'); if (om) om.onchange = e => { f.onlyMine = e.target.checked; changed(); };
}
// the own files are filtered here (the pool filters on the server)
function rpMineFiltered() {
  const f = RP.f, q = f.q.trim().toLowerCase();
  return RP.mine.items.filter(x => {
    if (x.broken) return !q && f.mode === 'all' && f.players === 'all' && f.version === 'all' && !f.races.length;
    const races = new Set((x.players || []).map(p => rpRace(p.race)));
    if (f.mode !== 'all' && x.mode !== f.mode) return false;
    if (f.players !== 'all' && (x.players || []).length !== Number(f.players)) return false;
    if (f.version !== 'all' && (x.version || 'unknown') !== f.version) return false;
    if (f.races.some(r => !races.has(r))) return false;
    if (q && !`${x.file} ${x.map} ${rpMapName(x.map)} ${(x.players || []).map(p => p.name).join(' ')}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

// ---- the list ----
function rpRow(x, kind) {
  const id = kind === 'mine' ? x.file : x.id, sel = (kind === 'mine' ? RP.mine.sel : RP.pool.sel) === id;
  if (x.broken) return `<button class="rp-row broken${sel ? ' on' : ''}" data-id="${esc(id)}"><div class="rp-r1"><b>${esc(x.file)}</b></div><div class="rp-r2 note">${esc(t('rpBroken'))}</div></button>`;
  const teams = rpTeams(x.players).map(tm => `<span class="rp-tm">${tm.map(p => `<span class="rp-p">${raceImg(rpRace(p.race))}<span class="nm">${esc(p.name || '?')}</span></span>`).join('')}</span>`).join('<i class="rp-vs">vs</i>');
  const inPool = kind === 'mine' && RP.mine.have[x.id];
  const when = kind === 'mine' ? rpDate(x.mtime) : rpDate(x.uploaded);
  const by = kind === 'pool' && x.author ? ` · ${esc(x.author)}` : '';
  return `<button class="rp-row${sel ? ' on' : ''}" data-id="${esc(id)}">`
    + `<div class="rp-r1"><b>${esc(rpMapName(x.map))}</b><span class="tag">${esc(x.mode || '?')}</span><span class="tag rp-v">${esc(rpVer(x.version))}</span>`
    + (inPool ? `<span class="tag rp-in" title="${esc(t('rpInPoolTip'))}">${esc(t('rpInPool'))}</span>` : '')
    + (kind === 'pool' && x.mine ? `<span class="tag rp-in">${esc(t('rpOnlyMine'))}</span>` : '')
    + `<em>${esc(rpDur(x.duration))} · ${esc(when)}${by}</em></div>`
    + `<div class="rp-r2">${teams}</div>`
    + (kind === 'pool' && x.descr ? `<div class="rp-r3">${esc(x.descr)}</div>` : '')
    + `</button>`;
}
function rpRender() {
  const list = $('rpList'); if (!list) return;
  const mine = RP.view === 'mine';
  $('rpNote').textContent = t(mine ? 'rpMineNote' : 'rpPoolNote');
  $('rpTitle').textContent = t(mine ? 'rpMine' : 'rpPool');
  $('rpAct').innerHTML = (mine ? `<button class="btn small" id="rpDir">${esc(t('rpOpenDir'))}</button>` : '') + `<button class="btn small" id="rpRe">${esc(t('rpReload'))}</button>`;
  $('rpRe').onclick = () => rpLoad(true);
  if ($('rpDir')) $('rpDir').onclick = () => invoke('replays_open_dir').then(r => { if (r && r.ok === false) toast(rpErr(r), true); }).catch(e => toast(String(e), true));
  let items, html;
  if (mine) {
    items = rpMineFiltered();
    $('rpCount').textContent = RP.mine.items.length ? (items.length === RP.mine.items.length ? String(items.length) : `${items.length} / ${RP.mine.items.length}`) : '';
    html = RP.mine.err === 'no_dir' ? `<div class="note">${esc(t('rpNoDir'))}</div>`
      : RP.mine.err ? `<div class="note">${esc(rpErr(RP.mine.err))}</div>`
      : items.length ? items.map(x => rpRow(x, 'mine')).join('')
      : `<div class="note">${esc(t(RP.mine.items.length ? 'rpNoneFilter' : 'rpNone'))}</div>`;
  } else {
    items = RP.pool.items;
    $('rpCount').textContent = RP.pool.total ? String(RP.pool.total) : '';
    html = RP.pool.err && !items.length ? `<div class="note">${esc(t('rpPoolErr'))}</div>`
      : items.length ? items.map(x => rpRow(x, 'pool')).join('') + (items.length < RP.pool.total ? `<button class="btn small rp-more" id="rpMore">${esc(t('rpMore'))}</button>` : '')
      : `<div class="note">${esc(t(RP.f.q || RP.f.races.length || RP.f.mode !== 'all' || RP.f.players !== 'all' || RP.f.version !== 'all' || RP.f.onlyMine ? 'rpNoneFilter' : 'rpNone'))}</div>`;
  }
  const top = list.scrollTop;
  list.innerHTML = html;
  list.scrollTop = top;
  list.querySelectorAll('.rp-row').forEach(b => b.onclick = () => rpSelect(b.dataset.id));
  const more = $('rpMore'); if (more) more.onclick = () => { RP.pool.page++; rpLoadPool(false); };
  rpDetail();
}
function rpSelect(id) {
  if (RP.view === 'mine') RP.mine.sel = id; else RP.pool.sel = id;
  RP.det = null;
  rpRender();
  const pid = RP.view === 'mine' ? RP.mine.have[(RP.mine.items.find(x => x.file === id) || {}).id] : id;
  if (pid) invoke('replay_info', { id: pid }).then(r => { if (r && r.meta) { RP.det = Object.assign(r, { pid }); rpDetail(); } }).catch(() => {});
}

// the server's analysis is markdown: headings, **bold**, lists and tables - drawn here, everything escaped first
function rpMd(md) {
  const inl = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const out = []; let tbl = null, list = false;
  const flush = () => { if (tbl) { out.push(`<table>${tbl.join('')}</table>`); tbl = null; } if (list) { out.push('</ul>'); list = false; } };
  for (const raw of String(md || '').split('\n')) {
    const l = raw.trimEnd();
    if (/^\|/.test(l)) {
      if (/^\|[\s:|-]+\|$/.test(l)) continue;
      if (!tbl) { flush(); tbl = []; }
      const cells = l.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      tbl.push(`<tr>${cells.map(c => (tbl.length ? `<td>${inl(c)}</td>` : `<th>${inl(c)}</th>`)).join('')}</tr>`);
      continue;
    }
    if (tbl) flush();
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) { flush(); out.push(`<h${Math.min(6, h[1].length + 3)}>${inl(h[2])}</h${Math.min(6, h[1].length + 3)}>`); continue; }
    const li = l.match(/^\s*[-*]\s+(.*)$/);
    if (li) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inl(li[1])}</li>`); continue; }
    if (list) flush();
    if (l.trim()) out.push(`<p>${inl(l)}</p>`);
  }
  flush();
  return out.join('');
}

// ---- the detail pane ----
function rpDetail() {
  const box = $('rpDet'); if (!box) return;
  const mine = RP.view === 'mine';
  const x = mine ? RP.mine.items.find(i => i.file === RP.mine.sel) : RP.pool.items.find(i => i.id === RP.pool.sel);
  if (!x) { box.innerHTML = `<div class="note rp-pick">${esc(t('rpPick'))}</div>`; return; }
  if (x.broken) { box.innerHTML = `<div class="rp-dh"><b>${esc(x.file)}</b></div><div class="note">${esc(t('rpBroken'))}</div>`; return; }
  const pid = mine ? RP.mine.have[x.id] : x.id;
  const meta = RP.det && RP.det.pid === pid ? RP.det.meta : (mine ? null : x);
  const kv = (k, v) => v ? `<div class="rp-kv"><span>${esc(t(k))}</span><b>${esc(v)}</b></div>` : '';
  const teams = rpTeams(x.players).map((tm, i) => `<div class="rp-team"><h4>${esc(t('rpTeam', { n: i + 1 }))}</h4>${tm.map(p => {
    const hero = rpHero(p.race, p.hero);
    return `<div class="rp-pl">${raceImg(rpRace(p.race))}<span class="nm">${esc(p.name || '?')}</span><em>${esc([hero, p.level ? t('rpLevel', { n: p.level }) : ''].filter(Boolean).join(' · '))}</em></div>`;
  }).join('')}</div>`).join('');
  const obs = (x.observers || []).length ? `<div class="rp-obs"><span>${esc(t('rpObservers'))}:</span> ${esc(x.observers.join(', '))}</div>` : '';
  const src = meta && meta.source ? String(meta.source) : '';
  const srcTxt = src.startsWith('discord') ? `${t('src_discord')}${src.includes(':') ? ' · ' + src.split(':')[1] : ''}` : (src && T.en['src_' + src] ? t('src_' + src) : '');
  let pool = '';
  if (meta) {
    const canEdit = !!meta.mine;
    pool = `<div class="rp-sec"><div class="rp-kvs">${kv('rpAuthor', meta.author || t('rpNoAuthor'))}${kv('rpFrom', srcTxt)}${kv('rpUploaded', rpDate(meta.uploaded))}</div>`
      + (meta.src_link ? `<button class="btn-line small rp-link" id="rpSrc">${esc(srcTxt || meta.src_link)}</button>` : '')
      + `<div class="rp-descr"><h4>${esc(t('rpDescr'))}${canEdit ? ` <button class="btn ghost" id="rpEdit">${esc(t('rpDescrEdit'))}</button>` : ''}</h4>`
      + `<div id="rpDescrBox">${meta.descr ? `<p>${esc(meta.descr)}</p>` : `<p class="note">${esc(t('rpNoDescr'))}</p>`}</div></div></div>`;
  }
  let acts = '';
  if (mine) {
    if (pid) acts += `<span class="tag rp-in">${esc(t('rpInPool'))}</span><button class="btn small" id="rpToPool">${esc(t('rpShowPool'))}</button>`;
    else if (rpSigned()) acts += `<button class="btn gold small" id="rpUp">${ico('upload')}${esc(t('rpUpload'))}</button>`;
    else acts += `<span class="note">${esc(t('rpSignIn'))}</span><button class="btn small" id="rpLogin">${esc(t('rpSignInBtn'))}</button>`;
  } else {
    acts += `<button class="btn gold small" id="rpDl">${esc(t('rpDownload'))}</button>`;
  }
  const rep = RP.det && RP.det.pid === pid ? (lang === 'ru' ? RP.det.report : RP.det.report_en) || '' : '';
  const cap = RP.det && RP.det.pid === pid ? (lang === 'ru' ? RP.det.caption : RP.det.caption_en) || '' : (x.caption || '');
  box.innerHTML = `<div class="rp-dtop">${rpMapImg(x.map)}<div class="rp-dh"><b>${esc(rpMapName(x.map))}</b>`
    + `<div class="rp-tags"><span class="tag">${esc(x.mode || '?')}</span><span class="tag rp-v">${esc(rpVer(x.version))}</span></div>`
    + `<div class="rp-kvs">${kv('rpLen', rpDur(x.duration))}${kv('rpRecorded', x.recorded || '')}${mine ? kv('rpCmds', x.actions ? String(x.actions) : '') + kv('rpSize', x.size ? (x.size / 1048576).toFixed(1) + ' MB' : '') : ''}</div>`
    + `<div class="rp-acts">${acts}</div></div></div>`
    + `<div class="rp-teams">${teams}</div>${obs}${pool}`
    + (cap ? `<div class="rp-cap">${esc(cap)}</div>` : '')
    + (pid ? (rep ? `<div class="rp-sec"><button class="btn-line small" id="rpRepT">${esc(t('rpReportShow'))}</button><div class="rp-rep hidden" id="rpRep">${rpMd(rep)}</div></div>`
                  : (RP.det && RP.det.pid === pid && !RP.det.error ? `<div class="note">${esc(t('rpReportWait'))}</div>` : '')) : '');
  const on = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
  on('rpUp', () => rpUpload(x));
  on('rpLogin', () => { if (typeof chLogin === 'function') chLogin(); });
  on('rpToPool', () => { RP.pool.sel = pid; rpShowView('pool', pid); });
  on('rpDl', () => rpDownload(x));
  on('rpSrc', () => invoke('open_url', { url: meta.src_link }).catch(() => {}));
  on('rpEdit', () => rpEditDescr(meta, pid));
  on('rpRepT', () => { const r = $('rpRep'), b = $('rpRepT'); r.classList.toggle('hidden'); b.textContent = t(r.classList.contains('hidden') ? 'rpReportShow' : 'rpReportHide'); });
}
function rpEditDescr(meta, pid) {
  const box = $('rpDescrBox'); if (!box) return;
  box.innerHTML = `<textarea id="rpDescrIn" maxlength="1000" rows="4" placeholder="${esc(t('rpDescrPh'))}">${esc(meta.descr || '')}</textarea>`
    + `<div class="rp-acts"><button class="btn gold small" id="rpDescrOk">${esc(t('rpSave'))}</button><button class="btn small" id="rpDescrNo">${esc(t('rpCancel'))}</button></div>`;
  $('rpDescrIn').focus();
  $('rpDescrNo').onclick = () => rpDetail();
  $('rpDescrOk').onclick = async () => {
    const b = $('rpDescrOk'); b.disabled = true;
    try {
      const r = await invoke('replay_describe', { id: pid, text: $('rpDescrIn').value });
      if (!r || !r.ok) { toast(rpErr(r), true); b.disabled = false; return; }
      if (RP.det && RP.det.pid === pid) RP.det.meta = r.meta;
      const it = RP.pool.items.find(i => i.id === pid); if (it) it.descr = r.meta.descr;
      toast(t('rpSaved'));
      rpRender();
    } catch (e) { toast(String(e), true); b.disabled = false; }
  };
}
async function rpUpload(x) {
  const b = $('rpUp'); if (b) { b.disabled = true; b.classList.add('busy'); b.textContent = t('rpUploading'); }
  try {
    const r = await invoke('replay_upload', { file: x.file });
    if (!r || !r.ok) { toast(rpErr(r), true); rpDetail(); return; }
    RP.mine.have[x.id] = r.id;
    RP.pool.items = [];                     // the pool's list is read again when shown
    if (r.mine) { toast(t('rpUploaded2')); }
    else {
      const info = await invoke('replay_info', { id: r.id }).catch(() => null);
      toast(t('rpUploadedOther', { name: (info && info.meta && info.meta.author) || 'ladder' }));
    }
    rpSelect(x.file);
  } catch (e) { toast(String(e), true); rpDetail(); }
}
async function rpDownload(x) {
  const b = $('rpDl'); if (b) { b.disabled = true; b.classList.add('busy'); b.textContent = t('rpDownloading'); }
  try {
    const r = await invoke('replay_download', { id: x.id, name: x.name || `${x.map}_${x.id}` });
    if (!r || !r.ok) toast(rpErr(r), true);
    else { toast(t(r.had ? 'rpHad' : 'rpDownloaded', { file: r.file }) + ' ' + t('rpWatchHint')); RP.mine.items = []; }
  } catch (e) { toast(String(e), true); }
  rpDetail();
}

function rpShowView(v, sel) {
  RP.view = v;
  document.querySelectorAll('#rpNav .rnb').forEach(b => b.classList.toggle('on', b.dataset.rp === v));
  if (sel) RP.pool.sel = sel;
  rpFilters();
  if (v === 'mine' && !RP.mine.items.length) rpLoadMine();
  else if (v === 'pool' && !RP.pool.items.length) rpLoadPool(true).then(() => { if (sel) rpSelect(sel); });
  else { rpRender(); if (sel) rpSelect(sel); }
}
document.querySelectorAll('#rpNav .rnb').forEach(b => b.onclick = () => rpShowView(b.dataset.rp));
const rpTab = document.querySelector('.tab[data-view="replays"]');
if (rpTab) rpTab.addEventListener('click', () => { if (!RP.loaded) { RP.loaded = true; rpFilters(); rpLoad(); } else if (RP.view === 'mine') rpLoadMine(); });
