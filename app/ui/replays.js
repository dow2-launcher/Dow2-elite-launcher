// The Replays tab (1.6.0, owner 13.11.2026): the player's own replays (the game's Playback folder, read by the launcher:
// the map, who played with which race, hero and army level, the length, the game version) and the shared pool on our
// server (search by mode, number of players, races, version; download into Playback so the game's Replays menu has it).
// An own replay goes into the pool with one button - the Steam sign-in of the chat says who put it there - and its
// author can write a description afterwards; the server analyses every replay that comes in (the report shown here).
// replays.rs: the calls (the session token added there). Loaded after app.js and lroom.js (t, esc, invoke, CH, raceImg,
// mmapHtml, lrAssets, lrCatalog, lrHeroName, segf, ico, toast).
'use strict';
Object.assign(T.en, {
  replaysTab: 'Replays', rpMine: 'My replays', rpPool: 'All replays',
  rpMineNote: 'The replays of the game on this computer (the Playback folder) and your replays on the server. Upload one to the server with one button - it shows in All replays, you are its author and can add a description.',
  rpPoolNote: 'Replays of all players: the ladder matches, the ones put in from the launcher and from the community Discord. Download puts the file into the game\'s replays.',
  rpSearch: 'Player, map, author, description', rpMode: 'Mode', rpAll: 'All', rpPlayers: 'Players', rpVersion: 'Version', rpRaces: 'Races',
  rpRacesTip: 'Only matches with every race picked here', rpMore: 'Show more', rpShown: '{from}–{to} of {total}', rpPrev: 'Previous page', rpNext: 'Next page', rpPageN: 'Page {n}', rpReload: 'Refresh', rpOpenDir: 'Open the folder',
  rpNone: 'No replays here yet.', rpNoneFilter: 'No replay fits the filters.', rpNoDir: 'The game\'s replay folder was not found.',
  rpPoolErr: 'The pool did not answer. Check the connection and press Refresh.', rpLoading: 'Loading…',
  rpPick: 'Pick a replay on the left to see it in detail.', rpVanilla: 'Vanilla', rpVerUnknown: 'unknown version', rpBroken: 'not a readable replay',
  rpLen: 'Length', rpRecorded: 'Recorded', rpUploaded: 'On the server since', rpVer: 'Game version', rpCmds: 'Commands', rpSize: 'Size',
  rpTeam: 'Team {n}', rpLevel: 'level {n}', rpObservers: 'Observers', rpAuthor: 'Author', rpNoAuthor: 'not named', rpFrom: 'From',
  src_ladder: 'ladder', src_site: 'replay page', src_launcher: 'launcher', src_discord: 'Discord',
  rpDescr: 'Description', rpNoDescr: 'No description.', rpDescrEdit: 'Edit the description', rpDescrPh: 'What is worth watching: the build, the turn of the match, the players…',
  rpSave: 'Save', rpCancel: 'Cancel', rpSaved: 'Description saved', rpUpload: 'Upload to the server', rpUploading: 'Sending…',
  rpUploaded2: 'The replay is on the server', rpUploadedOther: 'This match is on the server already, uploaded by {name}', rpInPool: 'on the server',
  rpInPoolTip: 'This replay is on the server, in All replays', rpShowPool: 'Show it in the pool', rpDownload: 'Download', rpDownloading: 'Downloading…',
  rpDownloaded: 'Saved to the game\'s replays: {file}', rpHad: 'Already in the game\'s replays: {file}', rpWatchHint: 'In the game: Replays in the main menu.',
  rpSignIn: 'Sign in with Steam to upload replays to the server - they show you as their author.', rpSignInBtn: 'Sign in',
  rpDeep: 'Detailed analysis on the map', rpDeepTip: 'The game itself replays the match on our server (about a minute, then a few minutes in the queue) - the site then shows every squad of the match on the map', rpWatch: 'Watch the match on the map', rpWatchTip: 'Opens the site: every squad of the match second by second, as the game itself simulated it', rpSimTag: 'on the map', rpSimTip: 'Detailed analysis: the match can be watched online on the map', rpReport: 'Analysis of the match', rpReportShow: 'Show the analysis', rpReportHide: 'Hide the analysis', rpReportWait: 'The server is still analysing this replay.',
  rpe_auth: 'Sign in with Steam first.', rpe_no_file: 'The file is gone from the replay folder.', rpe_not_replay: 'This is not a Dawn of War II replay.',
  rpe_too_big: 'The file is too big for the server (30 MB at most).', rpe_too_many: 'Too many replays sent from here in the last hour - try again later.',
  rpe_full: 'The pool is full right now - try later.', rpe_rejected: 'The pool did not take the file.', rpe_not_yours: 'Only the one who uploaded the replay can change its description.',
  rpe_not_found: 'The replay is gone from the server.', rpe_no_dir: 'The game\'s replay folder was not found.', rpe_bad_id: 'Not a replay of the server.', rpe_sign_in: 'Sign in with Steam first.',
});
Object.assign(T.ru, {
  replaysTab: 'Реплеи', rpMine: 'Мои реплеи', rpPool: 'Все реплеи',
  rpMineNote: 'Реплеи игры на этом компьютере (папка Playback) и ваши реплеи на сервере. Любой можно одной кнопкой загрузить на сервер — он появится во «Всех реплеях», вы будете его автором и сможете добавить описание.',
  rpPoolNote: 'Реплеи всех игроков: матчи ладдера, присланные из лаунчера и из Discord-сообществ. «Скачать» кладёт файл в реплеи игры.',
  rpSearch: 'Игрок, карта, автор, описание', rpMode: 'Режим', rpAll: 'Все', rpPlayers: 'Игроков', rpVersion: 'Версия', rpRaces: 'Расы',
  rpRacesTip: 'Только матчи, где есть все выбранные расы', rpMore: 'Показать ещё', rpShown: '{from}–{to} из {total}', rpPrev: 'Предыдущая страница', rpNext: 'Следующая страница', rpPageN: 'Страница {n}', rpReload: 'Обновить', rpOpenDir: 'Открыть папку',
  rpNone: 'Реплеев пока нет.', rpNoneFilter: 'Под фильтры ничего не подходит.', rpNoDir: 'Папка реплеев игры не найдена.',
  rpPoolErr: 'Пул не ответил. Проверьте соединение и нажмите «Обновить».', rpLoading: 'Загрузка…',
  rpPick: 'Выберите реплей слева, чтобы посмотреть подробно.', rpVanilla: 'Ваниль', rpVerUnknown: 'версия неизвестна', rpBroken: 'файл не читается как реплей',
  rpLen: 'Длительность', rpRecorded: 'Записан', rpUploaded: 'На сервере с', rpVer: 'Версия игры', rpCmds: 'Команд', rpSize: 'Размер',
  rpTeam: 'Команда {n}', rpLevel: 'уровень {n}', rpObservers: 'Зрители', rpAuthor: 'Автор', rpNoAuthor: 'не указан', rpFrom: 'Откуда',
  src_ladder: 'ладдер', src_site: 'страница реплеев', src_launcher: 'лаунчер', src_discord: 'Discord',
  rpDescr: 'Описание', rpNoDescr: 'Описания нет.', rpDescrEdit: 'Изменить описание', rpDescrPh: 'Что стоит посмотреть: билд, перелом матча, игроки…',
  rpSave: 'Сохранить', rpCancel: 'Отмена', rpSaved: 'Описание сохранено', rpUpload: 'Загрузить на сервер', rpUploading: 'Отправляю…',
  rpUploaded2: 'Реплей на сервере', rpUploadedOther: 'Этот матч уже есть на сервере, его загрузил {name}', rpInPool: 'на сервере',
  rpInPoolTip: 'Этот реплей есть на сервере, во «Всех реплеях»', rpShowPool: 'Открыть в пуле', rpDownload: 'Скачать', rpDownloading: 'Скачиваю…',
  rpDownloaded: 'Сохранён в реплеи игры: {file}', rpHad: 'Уже есть в реплеях игры: {file}', rpWatchHint: 'В игре: «Реплеи» в главном меню.',
  rpSignIn: 'Войдите через Steam, чтобы загружать реплеи на сервер — там вы будете указаны их автором.', rpSignInBtn: 'Войти',
  rpDeep: 'Подробный разбор на карте', rpDeepTip: 'Игра сама заново прокрутит матч на нашем сервере (около минуты плюс пара минут очереди) — потом на сайте весь матч на карте, каждый отряд', rpWatch: 'Смотреть матч на карте', rpWatchTip: 'Откроется сайт: все отряды матча посекундно, как их просчитала сама игра', rpSimTag: 'на карте', rpSimTip: 'Есть подробный разбор: матч можно смотреть онлайн на карте', rpReport: 'Разбор матча', rpReportShow: 'Показать разбор', rpReportHide: 'Скрыть разбор', rpReportWait: 'Сервер ещё разбирает этот реплей.',
  rpe_auth: 'Сначала войдите через Steam.', rpe_no_file: 'Файла больше нет в папке реплеев.', rpe_not_replay: 'Это не реплей Dawn of War II.',
  rpe_too_big: 'Файл слишком большой для сервера (не больше 30 МБ).', rpe_too_many: 'Отсюда за последний час прислано слишком много реплеев — попробуйте позже.',
  rpe_full: 'Пул сейчас заполнен — попробуйте позже.', rpe_rejected: 'Пул не принял файл.', rpe_not_yours: 'Описание может менять только тот, кто загрузил реплей на сервер.',
  rpe_not_found: 'Этого реплея больше нет на сервере.', rpe_no_dir: 'Папка реплеев игры не найдена.', rpe_bad_id: 'Это не реплей с сервера.', rpe_sign_in: 'Сначала войдите через Steam.',
});
Object.assign(T.es, {
  replaysTab: 'Repeticiones', rpMine: 'Mis repeticiones', rpPool: 'Todas las repeticiones',
  rpMineNote: 'Las repeticiones del juego en este equipo (la carpeta Playback) y tus repeticiones en el servidor. Cualquiera se sube al servidor con un botón: aparece en Todas las repeticiones, eres su autor y puedes añadir una descripción.',
  rpPoolNote: 'Repeticiones de todos los jugadores: partidas del ladder, las enviadas desde el launcher y desde el Discord de la comunidad. «Descargar» pone el archivo en las repeticiones del juego.',
  rpSearch: 'Jugador, mapa, autor, descripción', rpMode: 'Modo', rpAll: 'Todos', rpPlayers: 'Jugadores', rpVersion: 'Versión', rpRaces: 'Razas',
  rpRacesTip: 'Solo partidas con todas las razas elegidas', rpMore: 'Mostrar más', rpShown: '{from}–{to} de {total}', rpPrev: 'Página anterior', rpNext: 'Página siguiente', rpPageN: 'Página {n}', rpReload: 'Actualizar', rpOpenDir: 'Abrir la carpeta',
  rpNone: 'Aún no hay repeticiones.', rpNoneFilter: 'Ninguna repetición cumple los filtros.', rpNoDir: 'No se encontró la carpeta de repeticiones del juego.',
  rpPoolErr: 'La colección no respondió. Revisa la conexión y pulsa Actualizar.', rpLoading: 'Cargando…',
  rpPick: 'Elige una repetición a la izquierda para verla en detalle.', rpVanilla: 'Vanilla', rpVerUnknown: 'versión desconocida', rpBroken: 'no se puede leer como repetición',
  rpLen: 'Duración', rpRecorded: 'Grabada', rpUploaded: 'En el servidor desde', rpVer: 'Versión del juego', rpCmds: 'Órdenes', rpSize: 'Tamaño',
  rpTeam: 'Equipo {n}', rpLevel: 'nivel {n}', rpObservers: 'Espectadores', rpAuthor: 'Autor', rpNoAuthor: 'sin indicar', rpFrom: 'Origen',
  src_ladder: 'ladder', src_site: 'página de repeticiones', src_launcher: 'launcher', src_discord: 'Discord',
  rpDescr: 'Descripción', rpNoDescr: 'Sin descripción.', rpDescrEdit: 'Editar la descripción', rpDescrPh: 'Qué merece la pena ver: la build, el giro de la partida, los jugadores…',
  rpSave: 'Guardar', rpCancel: 'Cancelar', rpSaved: 'Descripción guardada', rpUpload: 'Subir al servidor', rpUploading: 'Enviando…',
  rpUploaded2: 'La repetición está en el servidor', rpUploadedOther: 'Esta partida ya está en el servidor, la subió {name}', rpInPool: 'en el servidor',
  rpInPoolTip: 'Esta repetición está en el servidor, en Todas las repeticiones', rpShowPool: 'Verla en la colección', rpDownload: 'Descargar', rpDownloading: 'Descargando…',
  rpDownloaded: 'Guardada en las repeticiones del juego: {file}', rpHad: 'Ya está en las repeticiones del juego: {file}', rpWatchHint: 'En el juego: Repeticiones en el menú principal.',
  rpSignIn: 'Inicia sesión con Steam para subir repeticiones al servidor: allí apareces como su autor.', rpSignInBtn: 'Iniciar sesión',
  rpDeep: 'Análisis detallado en el mapa', rpDeepTip: 'El propio juego vuelve a reproducir la partida en nuestro servidor (un minuto más unos minutos de cola); luego la web muestra cada escuadra en el mapa', rpWatch: 'Ver la partida en el mapa', rpWatchTip: 'Se abre la web: cada escuadra de la partida segundo a segundo, tal como la simuló el propio juego', rpSimTag: 'en el mapa', rpSimTip: 'Análisis detallado: la partida se puede ver en línea en el mapa', rpReport: 'Análisis de la partida', rpReportShow: 'Mostrar el análisis', rpReportHide: 'Ocultar el análisis', rpReportWait: 'El servidor aún está analizando esta repetición.',
  rpe_auth: 'Primero inicia sesión con Steam.', rpe_no_file: 'El archivo ya no está en la carpeta de repeticiones.', rpe_not_replay: 'No es una repetición de Dawn of War II.',
  rpe_too_big: 'El archivo es demasiado grande para el servidor (30 MB como máximo).', rpe_too_many: 'Se han enviado demasiadas repeticiones desde aquí en la última hora; inténtalo más tarde.',
  rpe_full: 'La colección está llena ahora mismo; inténtalo más tarde.', rpe_rejected: 'La colección no aceptó el archivo.', rpe_not_yours: 'Solo quien subió la repetición puede cambiar su descripción.',
  rpe_not_found: 'La repetición ya no está en el servidor.', rpe_no_dir: 'No se encontró la carpeta de repeticiones del juego.', rpe_bad_id: 'No es una repetición del servidor.', rpe_sign_in: 'Primero inicia sesión con Steam.',
});
Object.assign(T.fr, {
  replaysTab: 'Rediffusions', rpMine: 'Mes rediffusions', rpPool: 'Toutes les rediffusions',
  rpMineNote: 'Les rediffusions du jeu sur cet ordinateur (le dossier Playback) et tes rediffusions sur le serveur. Un bouton en envoie une sur le serveur : elle apparaît dans Toutes les rediffusions, tu en es l\'auteur et tu peux ajouter une description.',
  rpPoolNote: 'Les rediffusions de tous les joueurs : parties du ladder, envois du launcher et du Discord de la communauté. « Télécharger » place le fichier dans les rediffusions du jeu.',
  rpSearch: 'Joueur, carte, auteur, description', rpMode: 'Mode', rpAll: 'Tous', rpPlayers: 'Joueurs', rpVersion: 'Version', rpRaces: 'Races',
  rpRacesTip: 'Seulement les parties avec toutes les races choisies', rpMore: 'Afficher plus', rpShown: '{from}–{to} sur {total}', rpPrev: 'Page précédente', rpNext: 'Page suivante', rpPageN: 'Page {n}', rpReload: 'Actualiser', rpOpenDir: 'Ouvrir le dossier',
  rpNone: 'Pas encore de rediffusion.', rpNoneFilter: 'Aucune rediffusion ne correspond aux filtres.', rpNoDir: 'Le dossier des rediffusions du jeu est introuvable.',
  rpPoolErr: 'La collection n\'a pas répondu. Vérifiez la connexion et cliquez sur Actualiser.', rpLoading: 'Chargement…',
  rpPick: 'Choisissez une rediffusion à gauche pour la voir en détail.', rpVanilla: 'Vanilla', rpVerUnknown: 'version inconnue', rpBroken: 'illisible comme rediffusion',
  rpLen: 'Durée', rpRecorded: 'Enregistrée', rpUploaded: 'Sur le serveur depuis', rpVer: 'Version du jeu', rpCmds: 'Ordres', rpSize: 'Taille',
  rpTeam: 'Équipe {n}', rpLevel: 'niveau {n}', rpObservers: 'Spectateurs', rpAuthor: 'Auteur', rpNoAuthor: 'non indiqué', rpFrom: 'Origine',
  src_ladder: 'ladder', src_site: 'page des rediffusions', src_launcher: 'launcher', src_discord: 'Discord',
  rpDescr: 'Description', rpNoDescr: 'Pas de description.', rpDescrEdit: 'Modifier la description', rpDescrPh: 'Ce qui vaut le coup d\'œil : le build, le tournant de la partie, les joueurs…',
  rpSave: 'Enregistrer', rpCancel: 'Annuler', rpSaved: 'Description enregistrée', rpUpload: 'Envoyer sur le serveur', rpUploading: 'Envoi…',
  rpUploaded2: 'La rediffusion est sur le serveur', rpUploadedOther: 'Cette partie est déjà sur le serveur, envoyée par {name}', rpInPool: 'sur le serveur',
  rpInPoolTip: 'Cette rediffusion est sur le serveur, dans Toutes les rediffusions', rpShowPool: 'La voir dans la collection', rpDownload: 'Télécharger', rpDownloading: 'Téléchargement…',
  rpDownloaded: 'Enregistrée dans les rediffusions du jeu : {file}', rpHad: 'Déjà dans les rediffusions du jeu : {file}', rpWatchHint: 'Dans le jeu : Rediffusions dans le menu principal.',
  rpSignIn: 'Connectez-vous avec Steam pour envoyer des rediffusions sur le serveur : elles vous indiquent comme leur auteur.', rpSignInBtn: 'Se connecter',
  rpDeep: 'Analyse détaillée sur la carte', rpDeepTip: 'Le jeu lui-même rejoue la partie sur notre serveur (une minute plus quelques minutes de file) ; ensuite le site montre chaque escouade sur la carte', rpWatch: 'Voir la partie sur la carte', rpWatchTip: 'Ouvre le site : chaque escouade de la partie seconde par seconde, telle que le jeu l\'a simulée', rpSimTag: 'sur la carte', rpSimTip: 'Analyse détaillée : la partie se regarde en ligne sur la carte', rpReport: 'Analyse de la partie', rpReportShow: 'Afficher l\'analyse', rpReportHide: 'Masquer l\'analyse', rpReportWait: 'Le serveur analyse encore cette rediffusion.',
  rpe_auth: 'Connectez-vous d\'abord avec Steam.', rpe_no_file: 'Le fichier n\'est plus dans le dossier des rediffusions.', rpe_not_replay: 'Ce n\'est pas une rediffusion de Dawn of War II.',
  rpe_too_big: 'Le fichier est trop gros pour le serveur (30 Mo au plus).', rpe_too_many: 'Trop de rediffusions envoyées d\'ici depuis une heure ; réessayez plus tard.',
  rpe_full: 'La collection est pleine pour le moment ; réessayez plus tard.', rpe_rejected: 'La collection n\'a pas accepté le fichier.', rpe_not_yours: 'Seul celui qui a envoyé la rediffusion sur le serveur peut changer sa description.',
  rpe_not_found: 'La rediffusion n\'est plus sur le serveur.', rpe_no_dir: 'Le dossier des rediffusions du jeu est introuvable.', rpe_bad_id: 'Ce n\'est pas une rediffusion du serveur.', rpe_sign_in: 'Connectez-vous d\'abord avec Steam.',
});
Object.assign(T.de, {
  replaysTab: 'Wiederholungen', rpMine: 'Meine Wiederholungen', rpPool: 'Alle Wiederholungen',
  rpMineNote: 'Die Wiederholungen des Spiels auf diesem Rechner (Ordner Playback) und deine Wiederholungen auf dem Server. Jede lädt ein Klick auf den Server – sie erscheint unter Alle Wiederholungen, du stehst als Autor und kannst eine Beschreibung ergänzen.',
  rpPoolNote: 'Wiederholungen aller Spieler: Ladder-Spiele, Einsendungen aus dem Launcher und aus dem Discord der Community. „Herunterladen“ legt die Datei zu den Wiederholungen des Spiels.',
  rpSearch: 'Spieler, Karte, Autor, Beschreibung', rpMode: 'Modus', rpAll: 'Alle', rpPlayers: 'Spieler', rpVersion: 'Version', rpRaces: 'Völker',
  rpRacesTip: 'Nur Spiele mit allen gewählten Völkern', rpMore: 'Mehr zeigen', rpShown: '{from}–{to} von {total}', rpPrev: 'Vorherige Seite', rpNext: 'Nächste Seite', rpPageN: 'Seite {n}', rpReload: 'Aktualisieren', rpOpenDir: 'Ordner öffnen',
  rpNone: 'Noch keine Wiederholungen.', rpNoneFilter: 'Keine Wiederholung passt zu den Filtern.', rpNoDir: 'Der Wiederholungsordner des Spiels wurde nicht gefunden.',
  rpPoolErr: 'Die Sammlung hat nicht geantwortet. Prüfe die Verbindung und klicke auf Aktualisieren.', rpLoading: 'Lädt…',
  rpPick: 'Wähle links eine Wiederholung, um sie genau anzusehen.', rpVanilla: 'Vanilla', rpVerUnknown: 'unbekannte Version', rpBroken: 'als Wiederholung nicht lesbar',
  rpLen: 'Dauer', rpRecorded: 'Aufgenommen', rpUploaded: 'Auf dem Server seit', rpVer: 'Spielversion', rpCmds: 'Befehle', rpSize: 'Größe',
  rpTeam: 'Team {n}', rpLevel: 'Stufe {n}', rpObservers: 'Zuschauer', rpAuthor: 'Autor', rpNoAuthor: 'nicht angegeben', rpFrom: 'Herkunft',
  src_ladder: 'Ladder', src_site: 'Wiederholungsseite', src_launcher: 'Launcher', src_discord: 'Discord',
  rpDescr: 'Beschreibung', rpNoDescr: 'Keine Beschreibung.', rpDescrEdit: 'Beschreibung bearbeiten', rpDescrPh: 'Was sehenswert ist: der Build, die Wende des Spiels, die Spieler…',
  rpSave: 'Speichern', rpCancel: 'Abbrechen', rpSaved: 'Beschreibung gespeichert', rpUpload: 'Auf den Server hochladen', rpUploading: 'Sende…',
  rpUploaded2: 'Die Wiederholung ist auf dem Server', rpUploadedOther: 'Dieses Spiel ist schon auf dem Server, hochgeladen von {name}', rpInPool: 'auf dem Server',
  rpInPoolTip: 'Diese Wiederholung ist auf dem Server, unter Alle Wiederholungen', rpShowPool: 'In der Sammlung zeigen', rpDownload: 'Herunterladen', rpDownloading: 'Lade herunter…',
  rpDownloaded: 'In den Wiederholungen des Spiels gespeichert: {file}', rpHad: 'Schon in den Wiederholungen des Spiels: {file}', rpWatchHint: 'Im Spiel: Wiederholungen im Hauptmenü.',
  rpSignIn: 'Melde dich mit Steam an, um Wiederholungen auf den Server zu laden – dort stehst du als Autor.', rpSignInBtn: 'Anmelden',
  rpDeep: 'Detaillierte Analyse auf der Karte', rpDeepTip: 'Das Spiel selbst spielt die Partie auf unserem Server erneut ab (etwa eine Minute plus ein paar Minuten Warteschlange); danach zeigt die Website jeden Trupp auf der Karte', rpWatch: 'Spiel auf der Karte ansehen', rpWatchTip: 'Öffnet die Website: jeder Trupp des Spiels Sekunde für Sekunde, so wie das Spiel selbst ihn simuliert hat', rpSimTag: 'auf der Karte', rpSimTip: 'Detaillierte Analyse: das Spiel lässt sich online auf der Karte ansehen', rpReport: 'Analyse des Spiels', rpReportShow: 'Analyse zeigen', rpReportHide: 'Analyse ausblenden', rpReportWait: 'Der Server analysiert diese Wiederholung noch.',
  rpe_auth: 'Melde dich zuerst mit Steam an.', rpe_no_file: 'Die Datei ist nicht mehr im Wiederholungsordner.', rpe_not_replay: 'Das ist keine Wiederholung von Dawn of War II.',
  rpe_too_big: 'Die Datei ist zu groß für den Server (höchstens 30 MB).', rpe_too_many: 'In der letzten Stunde wurden von hier zu viele Wiederholungen gesendet – versuch es später.',
  rpe_full: 'Die Sammlung ist gerade voll – versuch es später.', rpe_rejected: 'Die Sammlung hat die Datei nicht angenommen.', rpe_not_yours: 'Nur wer die Wiederholung hochgeladen hat, kann ihre Beschreibung ändern.',
  rpe_not_found: 'Die Wiederholung ist nicht mehr auf dem Server.', rpe_no_dir: 'Der Wiederholungsordner des Spiels wurde nicht gefunden.', rpe_bad_id: 'Keine Wiederholung des Servers.', rpe_sign_in: 'Melde dich zuerst mit Steam an.',
});

// 1.6.3 (owner 13.11.2026): the tab tidied - the filters over the list only, icons for the folder and Reload, the list as rows
// with the map or as the Rooms tab's cards, Download / Downloaded instead of "Open in the pool", an empty pane while nothing is
// chosen. The minutes are the Online list's onMin, today / yesterday the chat's chToday / chYesterday.
Object.assign(T.en, { rpRemoteTip: 'Your replay on the server - it is not on this computer. Download it into the game\'s replays.', rpNothing: 'Nothing selected', rpNothingHint: 'Pick a replay in the list on the left.', rpHave: 'Downloaded',
  rpHaveTip: 'Already in the game\'s replays: open it in the game, Replays menu.', rpReset: 'Reset', rpMy: 'mine', rpAllVer: 'All versions',
  rpLookList: 'List', rpLookCards: 'Cards', rpActions: 'Actions', rpInfo: 'About this list' });
Object.assign(T.ru, { rpRemoteTip: 'Ваш реплей на сервере — на этом компьютере его нет. Скачайте его в реплеи игры.', rpNothing: 'Ничего не выбрано', rpNothingHint: 'Выберите реплей в списке слева.', rpHave: 'Скачан',
  rpHaveTip: 'Уже в реплеях игры: откройте его в игре, меню «Повторы».', rpReset: 'Сбросить', rpMy: 'моё', rpAllVer: 'Все версии',
  rpLookList: 'Списком', rpLookCards: 'Карточками', rpActions: 'Действий', rpInfo: 'Об этом списке' });
Object.assign(T.es, { rpRemoteTip: 'Tu repetición en el servidor: no está en este equipo. Descárgala en las repeticiones del juego.', rpNothing: 'Nada seleccionado', rpNothingHint: 'Elige una repetición en la lista de la izquierda.', rpHave: 'Descargada',
  rpHaveTip: 'Ya está en las repeticiones del juego: ábrela en el juego, menú Repeticiones.', rpReset: 'Restablecer', rpMy: 'mía', rpAllVer: 'Todas las versiones',
  rpLookList: 'Lista', rpLookCards: 'Tarjetas', rpActions: 'Acciones', rpInfo: 'Sobre esta lista' });
Object.assign(T.fr, { rpRemoteTip: 'Ta rediffusion sur le serveur : elle n\'est pas sur cet ordinateur. Télécharge-la dans les rediffusions du jeu.', rpNothing: 'Rien de sélectionné', rpNothingHint: 'Choisis une rediffusion dans la liste à gauche.', rpHave: 'Téléchargée',
  rpHaveTip: 'Déjà dans les rediffusions du jeu : ouvre-la dans le jeu, menu Rediffusions.', rpReset: 'Réinitialiser', rpMy: 'à moi', rpAllVer: 'Toutes les versions',
  rpLookList: 'Liste', rpLookCards: 'Cartes', rpActions: 'Actions', rpInfo: 'À propos de cette liste' });
Object.assign(T.de, { rpRemoteTip: 'Deine Wiederholung auf dem Server – nicht auf diesem Rechner. Lade sie in die Wiederholungen des Spiels.', rpNothing: 'Nichts ausgewählt', rpNothingHint: 'Wähle links in der Liste eine Wiederholung.', rpHave: 'Heruntergeladen',
  rpHaveTip: 'Schon in den Wiederholungen des Spiels: im Spiel unter Wiederholungen öffnen.', rpReset: 'Zurücksetzen', rpMy: 'meine', rpAllVer: 'Alle Versionen',
  rpLookList: 'Liste', rpLookCards: 'Karten', rpActions: 'Aktionen', rpInfo: 'Über diese Liste' });
Object.assign(ICO, {
  folder: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  reload: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"/></svg>',
  rows: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="5" height="5"/><rect x="3" y="14.5" width="5" height="5"/><path d="M11 7h10M11 17h10"/></svg>',
  cards: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3.5" width="18" height="7.5"/><rect x="3" y="13" width="18" height="7.5"/><path d="M8 3.5v7.5M8 13v7.5"/></svg>',
  down: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>',
  done: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
});

// ---- state ----
const RP = {
  view: 'mine', loaded: false,
  mine: { items: [], dir: '', err: '', have: {}, sel: '', page: 0, pool: [] },   // pool: my replays on the server (1.6.3)
  pool: { items: [], total: 0, page: 0, err: '', sel: '', loading: false },
  det: null, versions: [], cat: null,
  got: new Set(),   // 1.6.3: pool replays downloaded here in this session (the own files are read again only on Mine)
  look: 'rows',     // 1.6.3: the list as rows with the map's picture, or as the Rooms tab's cards
  f: { q: '', mode: 'all', players: 'all', version: 'all', races: [] },
};
try { Object.assign(RP.f, JSON.parse(localStorage.getItem('replaysFilter') || '{}')); } catch (e) {}
try { if (localStorage.getItem('replaysLook') === 'cards') RP.look = 'cards'; } catch (e) {}
if (!Array.isArray(RP.f.races)) RP.f.races = [];
// 1.6.3 (owner 13.11.2026): DoW II has no 4v4, and "Players" went (the mode says it) - an old saved filter of them is dropped
if (!['all', '1v1', '2v2', '3v3'].includes(RP.f.mode)) RP.f.mode = 'all';
RP.f.players = 'all';
// 1.6.7 (owner 14.11.2026): no "Only mine" in All replays (my replays are in Mine) - a saved one is dropped, the list is not left filtered
delete RP.f.onlyMine;
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
  if (!RP.mine.items.length || force) rpLoadMine(true);   // 1.6.3: the own files say which pool replays are here already
  return rpLoadPool(true);
}
async function rpLoadMine(quiet) {
  if (!quiet) $('rpList').innerHTML = `<div class="note">${esc(t('rpLoading'))}</div>`;
  try {
    const r = await invoke('replays_local');
    RP.mine.err = r.ok ? '' : r.error; RP.mine.items = r.items || []; RP.mine.dir = r.dir || '';
  } catch (e) { RP.mine.err = String(e); RP.mine.items = []; }
  $('rpMineN').textContent = rpMineAll().length ? String(rpMineAll().length) : '';
  if (!quiet || RP.view === 'mine') rpRender();
  const ids = RP.mine.items.map(x => x.id).filter(Boolean);
  const have = ids.length ? invoke('replays_have', { ids }).then(h => { if (h && typeof h === 'object') { RP.mine.have = h; rpRender(); } }).catch(() => {}) : Promise.resolve();
  have.then(rpLoadMyPool);
}
// 1.6.3 (owner 13.11.2026): my replays on the server that are not on this computer (uploaded from another one, or deleted here)
// are in Mine too, with Download - not to be searched for in the pool. Pages of 100 (the server's most), up to 500.
async function rpLoadMyPool() {
  if (!rpSigned()) { RP.mine.pool = []; return; }
  const all = [];
  for (let page = 0; page < 5; page++) {
    let r; try { r = await invoke('replays_pool', { q: { mine: true, page, n: 100 } }); } catch (e) { break; }
    const it = (r && r.items) || []; all.push(...it);
    if (it.length < 100 || all.length >= (r.total || 0)) break;
  }
  RP.mine.pool = all;
  $('rpMineN').textContent = rpMineAll().length ? String(rpMineAll().length) : '';
  rpRender();
}
// Mine = the own files + my server replays not here (file "srv:<id>", remote), the newest first
const rpRemote = () => (RP.mine.pool || []).filter(x => !rpGot(x.id)).map(x => Object.assign({}, x, { remote: true, file: 'srv:' + x.id, mtime: x.uploaded }));
function rpMineAll() {
  const r = rpRemote(); if (!r.length) return RP.mine.items;
  return RP.mine.items.concat(r).sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
}
async function rpLoadPool(reset) {
  if (RP.pool.loading) return;
  RP.pool.loading = true;
  if (reset) RP.pool.page = 0;
  $('rpList').innerHTML = `<div class="note">${esc(t('rpLoading'))}</div>`;
  const f = RP.f;
  const q = { q: f.q, mode: f.mode === 'all' ? '' : f.mode, players: '', version: f.version === 'all' ? '' : f.version,
              race: f.races.join(','), page: RP.pool.page, n: RP_PAGE };
  try {
    const r = await invoke('replays_pool', { q });
    RP.pool.err = '';
    RP.pool.items = r.items || [];
    RP.pool.total = r.total || 0;
  } catch (e) { RP.pool.err = String(e); if (reset) RP.pool.items = []; }
  RP.pool.loading = false;
  $('rpPoolN').textContent = RP.pool.total ? String(RP.pool.total) : '';
  rpRender();
}

// ---- filters ----
// 1.6.3 (owner 13.11.2026): the filters take less room and stand over the list only - the search and the version on one line,
// the modes next to the races on the other; "Reset" while one is on
const rpActive = () => { const f = RP.f; return !!(f.q.trim() || f.mode !== 'all' || f.version !== 'all' || f.races.length); };
function rpFilters() {
  const f = RP.f, box = $('rpFlt'); if (!box) return;
  const vers = RP.view === 'mine' ? [...new Set(rpMineAll().map(x => x.version || 'unknown'))] : RP.versions.map(v => v.version);
  if (f.version !== 'all' && !vers.includes(f.version)) vers.unshift(f.version);
  box.innerHTML = `<div class="rp-f1"><span class="rp-q"><input type="search" id="rpQ" value="${esc(f.q)}" placeholder="${esc(t('rpSearch'))}" aria-label="${esc(t('rpSearch'))}"></span>`
    + `<select id="rpVer" aria-label="${esc(t('rpVersion'))}"><option value="all">${esc(t('rpAllVer'))}</option>${vers.map(v => `<option value="${esc(v)}"${f.version === v ? ' selected' : ''}>${esc(rpVer(v))}</option>`).join('')}</select>`
    + '</div>'
    + `<div class="rp-f2">${segf('mode', [['all', t('rpAll')], ['1v1', '1v1'], ['2v2', '2v2'], ['3v3', '3v3']], f.mode)}`
    + `<span class="rp-races" role="group" aria-label="${esc(t('rpRaces'))}">${RP_RACES.map(r => `<button class="rp-race${f.races.includes(r) ? ' on' : ''}" data-race="${r}" aria-pressed="${f.races.includes(r)}" data-tip="${esc(t('race_' + r))}" aria-label="${esc(t('race_' + r))}">${raceImg(r).replace(/ title="[^"]*"/, '')}</button>`).join('')}</span>`
    + '</div>';
  $('rpReset').classList.toggle('hidden', !rpActive());   // 1.6.3: Reset in the header, by the (i) - the two lines of the filters stay as wide
  const changed = () => { rpSaveF(); rpFilters(); if (RP.view === 'pool') rpLoadPool(true); else { RP.mine.page = 0; rpRender(); } };
  box.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { f[b.dataset.f] = b.dataset.v; changed(); });
  box.querySelectorAll('.rp-race').forEach(b => b.onclick = () => {
    const r = b.dataset.race; f.races = f.races.includes(r) ? f.races.filter(x => x !== r) : f.races.concat(r); changed();
  });
  $('rpVer').onchange = e => { f.version = e.target.value; changed(); };
  $('rpReset').onclick = () => { Object.assign(f, { q: '', mode: 'all', players: 'all', version: 'all', races: [] }); changed(); };
  let qt = 0;
  $('rpQ').oninput = e => {          // typing: the list follows, the box itself is not redrawn (the cursor stays)
    f.q = e.target.value; $('rpReset').classList.toggle('hidden', !rpActive()); clearTimeout(qt);
    qt = setTimeout(() => { rpSaveF(); if (RP.view === 'pool') rpLoadPool(true); else { RP.mine.page = 0; rpRender(); } }, 350);
  };
}
// the own files are filtered here (the pool filters on the server)
function rpMineFiltered() {
  const f = RP.f, q = f.q.trim().toLowerCase();
  return rpMineAll().filter(x => {
    if (x.broken) return !q && f.mode === 'all' && f.version === 'all' && !f.races.length;
    const races = new Set((x.players || []).map(p => rpRace(p.race)));
    if (f.mode !== 'all' && x.mode !== f.mode) return false;
    if (f.version !== 'all' && (x.version || 'unknown') !== f.version) return false;
    if (f.races.some(r => !races.has(r))) return false;
    if (q && !`${x.file} ${x.map} ${rpMapName(x.map)} ${(x.players || []).map(p => p.name).join(' ')}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

// ---- the list ----
// 1.6.3: the length in minutes ("10:00" next to a date read as a time of day), the date as today / yesterday / 11 Nov (the year
// only when it is not this one); a pool replay that is in the game's folder already: the server knows the own files (have), and
// the downloads of this session
const rpMin = s => t('onMin', { n: Math.max(1, Math.round((Number(s) || 0) / 60)) });
const rpWhen = sec => {
  if (!sec) return '';
  const d = new Date(sec * 1000), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return t('chToday').toLocaleLowerCase(lang);
  if (d.toDateString() === y.toDateString()) return t('chYesterday').toLocaleLowerCase(lang);
  return d.toLocaleDateString(lang, d.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
};
const rpDay = v => { const d = typeof v === 'number' ? new Date(v * 1000) : new Date(String(v || '')); return v && !isNaN(d) ? d.toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' }) : String(v || ''); };
const rpGot = id => RP.got.has(id) || Object.values(RP.mine.have || {}).includes(id);
// the action of a row / a card, on its right: Download or Downloaded (the pool); Send to the pool or "in the pool" (mine)
function rpAct(x, kind) {
  if (kind === 'pool' || x.remote) return rpGot(x.id)
    ? `<span class="rp-got" data-tip="${esc(t('rpHaveTip'))}" role="img" aria-label="${esc(t('rpHave'))}">${ico('done')}</span>`
    : `<button class="rjoin go" data-dl="${esc(x.id)}" data-tip="${esc(t('rpDownload'))}" aria-label="${esc(t('rpDownload'))}">${ico('down')}</button>`;
  if (RP.mine.have[x.id]) return `<span class="tag rp-in" data-tip="${esc(t('rpInPoolTip'))}">${esc(t('rpInPool'))}</span>`;
  return rpSigned() ? `<button class="rjoin go" data-up="${esc(x.file)}" data-tip="${esc(t('rpUpload'))}" aria-label="${esc(t('rpUpload'))}">${ico('upload')}</button>` : '';
}
// 1.6.8 (owner 14.11.2026): the mark of a replay with the detailed analysis - the match can be watched online on the map
const RP_SIM_ICO = '<svg viewBox="0 0 24 16" aria-hidden="true"><path d="M1 3l6-2 6 2 6-2v12l-6 2-6-2-6 2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'
  + '<path d="M7 1v12M13 3v12" stroke="currentColor" stroke-width="1" opacity=".55"/><circle cx="18" cy="11" r="5" fill="#0c1718" stroke="currentColor" stroke-width="1.4"/><path d="M16.6 8.6v4.8l3.8-2.4z" fill="currentColor"/></svg>';
function rpRow(x, kind) {
  const id = kind === 'mine' ? x.file : x.id, sel = (kind === 'mine' ? RP.mine.sel : RP.pool.sel) === id;
  const a = `data-id="${esc(id)}" role="button" tabindex="0"${sel ? ' aria-current="true"' : ''}`;
  if (x.broken) return `<div class="rp-row broken${sel ? ' on' : ''}" ${a}><span class="mmap"><i class="mm"></i></span><div class="rp-mid"><div class="rp-r1"><b>${esc(x.file)}</b></div><div class="rp-r2 note">${esc(t('rpBroken'))}</div></div></div>`;
  const when = rpWhen(kind === 'mine' ? x.mtime : x.uploaded) + (kind === 'pool' && x.author ? ' · ' + x.author : '');
  const tags = `<span class="tag">${esc(x.mode || '?')}</span><span class="tag rp-v">${esc(rpVer(x.version))}</span>`
    + (kind === 'pool' && x.mine ? `<span class="tag rp-my">${esc(t('rpMy'))}</span>` : '')
    + (x.remote ? `<span class="tag rp-in" data-tip="${esc(t('rpRemoteTip'))}">${esc(t('rpInPool'))}</span>` : '')
    + (x.sim ? `<span class="tag rp-sim" data-tip="${esc(t('rpSimTip'))}">${RP_SIM_ICO}</span>` : '');
  if (RP.look === 'cards') {   // the Rooms tab's card: the map on the left, the teams, the foot with the action
    const teams = rpTeams(x.players).map((tm, i) => `<div class="team"><div class="th"><span>${esc(t('rTeamShort', { n: i + 1 }))}</span></div>`
      + tm.map(p => { const hero = rpHero(p.race, p.hero); return `<div class="rp">${raceImg(rpRace(p.race))}<span class="nm">${esc(p.name || '?')}</span>${hero ? `<span class="rt">${esc(hero)}</span>` : ''}</div>`; }).join('') + '</div>').join('');
    return `<div class="room rp-card${sel ? ' on' : ''}" ${a}>${rpMapImg(x.map)}<div class="rb">`
      + `<div class="rh"><span class="rn">${esc(rpMin(x.duration))} · ${esc(rpWhen(kind === 'mine' ? x.mtime : x.uploaded))}</span>${tags}</div>`
      + `<div class="teams">${teams}</div>`
      + `<div class="rfoot2"><span class="rhost">${esc(kind === 'pool' || x.remote ? [x.author, x.descr].filter(Boolean).join(' · ') : x.file)}</span>${rpAct(x, kind)}</div></div></div>`;
  }
  const teams = rpTeams(x.players).map(tm => `<span class="rp-tm">${tm.map(p => `<span class="rp-p">${raceImg(rpRace(p.race))}<span class="nm">${esc(p.name || '?')}</span></span>`).join('')}</span>`).join('<i class="rp-vs">vs</i>');
  return `<div class="rp-row${sel ? ' on' : ''}" ${a}>${rpMapImg(x.map)}<div class="rp-mid">`
    + `<div class="rp-r1"><b>${esc(rpMapName(x.map))}</b>${tags}</div><div class="rp-r2">${teams}</div>`
    + (kind === 'pool' && x.descr ? `<div class="rp-r3">${esc(x.descr)}</div>` : '') + '</div>'
    + `<div class="rp-end"><em>${esc(rpMin(x.duration))}</em><em>${esc(when)}</em>${rpAct(x, kind)}</div></div>`;
}
function rpRender() {
  const list = $('rpList'); if (!list) return;
  const mine = RP.view === 'mine';
  $('rpNote').textContent = t(mine ? 'rpMineNote' : 'rpPoolNote');
  const inf = $('rpInfo'); if (inf) { inf.dataset.tip = $('rpNote').textContent; inf.setAttribute('aria-label', t('rpInfo') + ': ' + inf.dataset.tip); }
  $('rpTitle').textContent = t(mine ? 'rpMine' : 'rpPool');
  // 1.6.3: the header's actions are icons with their names in the tips - the list's look, the folder (mine), Reload
  const ib = (id, icon, tip, on) => `<button class="rp-ib${on ? ' on' : ''}" id="${id}" data-tip="${esc(tip)}" aria-label="${esc(tip)}"${on == null ? '' : ` aria-pressed="${!!on}"`}>${ico(icon)}</button>`;
  $('rpAct').innerHTML = `<span class="rp-looks" role="group">${ib('rpLkRows', 'rows', t('rpLookList'), RP.look === 'rows')}${ib('rpLkCards', 'cards', t('rpLookCards'), RP.look === 'cards')}</span>`
    + (mine ? ib('rpDir', 'folder', t('rpOpenDir')) : '') + ib('rpRe', 'reload', t('rpReload'));
  const look = l => { RP.look = l; try { localStorage.setItem('replaysLook', l); } catch (e) {} rpRender(); };
  $('rpLkRows').onclick = () => look('rows'); $('rpLkCards').onclick = () => look('cards');
  $('rpRe').onclick = () => rpLoad(true);
  if ($('rpDir')) $('rpDir').onclick = () => invoke('replays_open_dir').then(r => { if (r && r.ok === false) toast(rpErr(r), true); }).catch(e => toast(String(e), true));
  let items, html;
  if (mine) {
    items = rpMineFiltered();
    const all = rpMineAll().length;
    $('rpCount').textContent = all ? (items.length === all ? String(items.length) : `${items.length} / ${all}`) : '';
    html = RP.mine.err === 'no_dir' ? `<div class="note">${esc(t('rpNoDir'))}</div>`
      : RP.mine.err ? `<div class="note">${esc(rpErr(RP.mine.err))}</div>`
      : items.length ? items.slice(RP.mine.page * RP_PAGE, (RP.mine.page + 1) * RP_PAGE).map(x => rpRow(x, 'mine')).join('')
      : `<div class="note">${esc(t(rpMineAll().length ? 'rpNoneFilter' : 'rpNone'))}</div>`;
    if (RP.mine.page * RP_PAGE >= items.length && RP.mine.page) { RP.mine.page = 0; return rpRender(); }
  } else {
    items = RP.pool.items;
    $('rpCount').textContent = RP.pool.total ? String(RP.pool.total) : '';
    html = RP.pool.err && !items.length ? `<div class="note">${esc(t('rpPoolErr'))}</div>`
      : items.length ? items.map(x => rpRow(x, 'pool')).join('')
      : `<div class="note">${esc(t(rpActive() ? 'rpNoneFilter' : 'rpNone'))}</div>`;
  }
  const top = list.scrollTop;
  list.classList.toggle('cards', RP.look === 'cards');
  list.innerHTML = html;
  list.scrollTop = top;
  list.querySelectorAll('[data-id]').forEach(b => {
    b.onclick = e => { if (!e.target.closest('[data-dl],[data-up]')) rpSelect(b.dataset.id); };
    b.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === b) { e.preventDefault(); rpSelect(b.dataset.id); } };
  });
  list.querySelectorAll('[data-dl]').forEach(b => b.onclick = () => { const x = RP.pool.items.find(i => i.id === b.dataset.dl); if (x) rpDownload(x, b); });
  list.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const x = RP.mine.items.find(i => i.file === b.dataset.up); if (x) rpUpload(x, b); });
  rpPager(mine ? items.length : RP.pool.total, mine ? RP.mine.page : RP.pool.page);
  rpDetail();
}
// pages of RP_PAGE: the arrows, the first and the last page, two around the current one; "51–100 of 2138"
const RP_PAGE = 50;
function rpPager(total, page) {
  const box = $('rpPager'); if (!box) return;
  const pages = Math.ceil(total / RP_PAGE);
  if (!total) { box.innerHTML = ''; return; }
  const from = page * RP_PAGE + 1, to = Math.min(total, (page + 1) * RP_PAGE);
  const nums = [];
  for (let i = 0; i < pages; i++) if (i === 0 || i === pages - 1 || Math.abs(i - page) <= 2) nums.push(i);
  let html = '', last = -1;
  for (const i of nums) {
    if (i - last > 1) html += '<span class="rp-gap">…</span>';
    html += `<button class="rp-pg${i === page ? ' on' : ''}" data-pg="${i}" aria-label="${esc(t('rpPageN', { n: i + 1 }))}"${i === page ? ' aria-current="page"' : ''}>${i + 1}</button>`;
    last = i;
  }
  box.innerHTML = `<span class="rp-shown">${esc(t('rpShown', { from, to, total }))}</span>`
    + (pages > 1 ? `<span class="rp-pgs"><button class="rp-pg" data-pg="${page - 1}"${page ? '' : ' disabled'} aria-label="${esc(t('rpPrev'))}">‹</button>${html}`
      + `<button class="rp-pg" data-pg="${page + 1}"${page < pages - 1 ? '' : ' disabled'} aria-label="${esc(t('rpNext'))}">›</button></span>` : '');
  box.querySelectorAll('.rp-pg[data-pg]').forEach(b => b.onclick = () => rpGoPage(Number(b.dataset.pg)));
}
function rpGoPage(p) {
  if (p < 0) return;
  $('rpList').scrollTop = 0;
  if (RP.view === 'mine') { RP.mine.page = p; rpRender(); }
  else { RP.pool.page = p; rpLoadPool(false); }
}
function rpSelect(id) {
  if (RP.view === 'mine') RP.mine.sel = id; else RP.pool.sel = id;
  RP.det = null;
  rpRender();
  const it = RP.view === 'mine' ? rpMineAll().find(x => x.file === id) || {} : null;
  const pid = it ? (it.remote ? it.id : RP.mine.have[it.id]) : id;
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
  const x = mine ? rpMineAll().find(i => i.file === RP.mine.sel) : RP.pool.items.find(i => i.id === RP.pool.sel);
  box.parentElement.classList.toggle('has-sel', !!x);   // a narrow window: the pane under the list only for a chosen replay
  // 1.6.3 (owner 13.11.2026): nothing chosen - the game's striped plate with the Mechanicus' cog in the middle
  box.classList.toggle('empty', !x);
  if (!x) { box.innerHTML = `<div class="rp-none"><i class="rp-mech" aria-hidden="true"></i><b>${esc(t('rpNothing'))}</b><span>${esc(t('rpNothingHint'))}</span></div>`; return; }
  if (x.broken) { box.innerHTML = `<div class="rp-dh"><b>${esc(x.file)}</b></div><div class="note">${esc(t('rpBroken'))}</div>`; return; }
  const pid = mine && !x.remote ? RP.mine.have[x.id] : x.id;
  const meta = RP.det && RP.det.pid === pid ? RP.det.meta : (mine && !x.remote ? null : x);
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
    pool = `<div class="rp-sec"><div class="rp-kvs">${kv('rpAuthor', meta.author || t('rpNoAuthor'))}${kv('rpFrom', srcTxt)}${kv('rpUploaded', rpDay(meta.uploaded))}</div>`
      + (meta.src_link ? `<button class="btn-line small rp-link" id="rpSrc">${esc(srcTxt || meta.src_link)}</button>` : '')
      + `<div class="rp-descr"><h4>${esc(t('rpDescr'))}${canEdit ? ` <button class="btn ghost" id="rpEdit">${esc(t('rpDescrEdit'))}</button>` : ''}</h4>`
      + `<div id="rpDescrBox">${meta.descr ? `<p>${esc(meta.descr)}</p>` : `<p class="note">${esc(t('rpNoDescr'))}</p>`}</div></div></div>`;
  }
  // 1.6.3 (owner 13.11.2026): no "Open in the pool" - mine: Send to the pool, or the "in the pool" mark; the pool: Download, or
  // Downloaded once it is in the game's folder (until the launcher can start a replay itself)
  let acts = '';
  if (x.remote) acts += `<span class="tag rp-in" data-tip="${esc(t('rpRemoteTip'))}">${esc(t('rpInPool'))}</span>`
    + (rpGot(x.id) ? `<span class="rp-gotl">${ico('done')}${esc(t('rpHave'))}</span>` : `<button class="btn gold small" id="rpDl">${ico('down')}${esc(t('rpDownload'))}</button>`);
  else if (mine) {
    if (pid) acts += `<span class="tag rp-in" data-tip="${esc(t('rpInPoolTip'))}">${esc(t('rpInPool'))}</span>`;
    else if (rpSigned()) acts += `<button class="btn gold small" id="rpUp">${ico('upload')}${esc(t('rpUpload'))}</button>`;
    else acts += `<span class="note">${esc(t('rpSignIn'))}</span><button class="btn small" id="rpLogin">${esc(t('rpSignInBtn'))}</button>`;
  } else if (rpGot(x.id)) acts += `<span class="rp-gotl" data-tip="${esc(t('rpHaveTip'))}">${ico('done')}${esc(t('rpHave'))}</span>`;
  else acts += `<button class="btn gold small" id="rpDl">${ico('down')}${esc(t('rpDownload'))}</button>`;
  // 1.6.4 (owner 13.11.2026): the site's match player - every squad second by second from the game's own simulation
  const sim = !!pid && !!((RP.det && RP.det.pid === pid && RP.det.meta && RP.det.meta.sim) || ((!mine || x.remote) && x.sim));
  if (sim) acts += `<button class="btn gold small" id="rpSim" data-tip="${esc(t('rpWatchTip'))}">▶ ${esc(t('rpWatch'))}</button>`;
  // 1.6.6: not run yet - the site puts it in the runner's queue (#sim) and shows the match when it is ready
  else if (pid && ((RP.det && RP.det.pid === pid && RP.det.meta && RP.det.meta.sim_ok) || ((!mine || x.remote) && x.sim_ok)))
    acts += `<button class="btn small" id="rpSim" data-tip="${esc(t('rpDeepTip'))}">▶ ${esc(t('rpDeep'))}</button>`;
  const rep = RP.det && RP.det.pid === pid ? (lang === 'ru' ? RP.det.report : RP.det.report_en) || '' : '';
  const cap = RP.det && RP.det.pid === pid ? (lang === 'ru' ? RP.det.caption : RP.det.caption_en) || '' : (x.caption || '');
  // the summary right under the map's name (it hung under the author's description with no heading)
  box.innerHTML = `<div class="rp-dtop">${rpMapImg(x.map)}<div class="rp-dh"><b>${esc(rpMapName(x.map))}</b>${cap ? `<div class="rp-sub">${esc(cap)}</div>` : ''}`
    + `<div class="rp-tags"><span class="tag">${esc(x.mode || '?')}</span><span class="tag rp-v">${esc(rpVer(x.version))}</span></div>`
    + `<div class="rp-kvs">${kv('rpLen', rpMin(x.duration))}${kv('rpRecorded', rpDay(x.recorded))}${mine && !x.remote ? kv('rpActions', x.actions ? String(x.actions) : '') : ''}</div>`
    + `<div class="rp-acts">${acts}</div></div></div>`
    + `<div class="rp-teams">${teams}</div>${obs}${pool}`
    + (pid ? (rep ? `<div class="rp-sec"><button class="btn-line small" id="rpRepT">${esc(t('rpReportShow'))}</button><div class="rp-rep hidden" id="rpRep">${rpMd(rep)}</div></div>`
                  : (RP.det && RP.det.pid === pid && !RP.det.error ? `<div class="note">${esc(t('rpReportWait'))}</div>` : '')) : '');
  const on = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
  on('rpUp', () => rpUpload(x));
  on('rpLogin', () => { if (typeof chLogin === 'function') chLogin(); });
  on('rpDl', () => rpDownload(x));
  on('rpSrc', () => invoke('open_url', { url: meta.src_link }).catch(() => {}));
  on('rpSim', () => invoke('open_url', { url: `https://rts.fintebtc.de/replay/r/${pid}?lang=${lang === 'ru' ? 'ru' : 'en'}#sim` }).catch(() => {}));
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
async function rpUpload(x, btn) {
  const b = btn || $('rpUp'); if (b) { b.disabled = true; b.classList.add('busy'); if (!btn) b.textContent = t('rpUploading'); }
  try {
    const r = await invoke('replay_upload', { file: x.file });
    if (!r || !r.ok) { toast(rpErr(r), true); rpRender(); return; }
    RP.mine.have[x.id] = r.id;
    RP.pool.items = [];                     // the pool's list is read again when shown
    if (r.mine) { toast(t('rpUploaded2')); }
    else {
      const info = await invoke('replay_info', { id: r.id }).catch(() => null);
      toast(t('rpUploadedOther', { name: (info && info.meta && info.meta.author) || 'ladder' }));
    }
    rpSelect(x.file);
  } catch (e) { toast(String(e), true); rpRender(); }
}
async function rpDownload(x, btn) {
  const b = btn || $('rpDl'); if (b) { b.disabled = true; b.classList.add('busy'); if (!btn) b.textContent = t('rpDownloading'); }
  try {
    const r = await invoke('replay_download', { id: x.id, name: x.name || `${x.map}_${x.id}` });
    if (!r || !r.ok) toast(rpErr(r), true);
    else { toast(t(r.had ? 'rpHad' : 'rpDownloaded', { file: r.file }) + ' ' + t('rpWatchHint')); RP.got.add(x.id); RP.mine.items = []; if (RP.view === 'mine') return rpLoadMine(true); }
  } catch (e) { toast(String(e), true); }
  rpRender();
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
