// ---------- Connection test (1.4.16, owner 06.11.2026): a small button in the header, the test in a window of its own ----------
// "Packets go just as in the game": conntest.rs / elite_core::nettest open our UDP tunnel to every game node at once and play a
// 1v1 / 2v2 / 3v3 against virtual players on the server for 60 s; the window shows per node what the game would feel (the
// delay, the pauses, the losses) and a verdict, the node the matchmaker would pick, signs of a VPN, the last runs side by side
// (the player marks each run "with VPN" / "without VPN") and "Send to the developers" (the logs upload with the test's files).
// Loaded after app.js (its T, t, esc, invoke, listen, toast, gnName, CH, $).
'use strict';
Object.assign(T.en, {
  ntStuck: 'stuck up to {s} s', ntW_stall: 'the connection got stuck: turns waited seconds in the queue (not the ping)', ntW_loss_up: 'your packets to this server get lost', ntW_stream_blocked: 'small packets pass, a stream of them is stopped on the way (DPI) - the game takes another server', ntH_tcp_local: '{nodes}: TCP is answered at once (much faster than the ping) - a VPN client or a proxy on this computer or network takes the connections.', ntRelic: 'Relic directly', ntRelicNote: 'Relic’s own servers straight from this computer (games without our servers): its battle servers and the lobby / automatch API. A few short connections, no load on Relic.', ntRelicRelays: 'battle servers: {o} of {n} answer', ntRelicApi: 'lobby API: {g} of {n} requests, {kb} KB in {s} s', ntRelicApiNone: 'lobby API: no answer', ntW_relic_closed: 'some Relic battle servers do not answer', ntW_relic_api_none: 'Relic’s lobby API does not answer', ntW_relic_api_cut: 'the stream from Relic’s API stops on the way',
  ntBtn: 'Connection', ntBtnTip: 'Check the connection to our game servers', ntTitle: 'Connection check',
  ntIntro: 'Packets go exactly as in a match: our UDP tunnel, turns 10 times a second, messages to the other players. All our servers at once, about a minute. Close the game first.',
  ntMode: 'Game', ntVpn: 'Your VPN', ntVpnOff: 'mine is off', ntVpnOn: 'mine is on', ntVpnTip: 'Mark whether YOUR OWN VPN (or a blocking bypass) is on for this run - run once with it, once without, and compare. The check itself never turns any VPN on.', ntVpnRunOn: 'your VPN on', ntVpnRunOff: 'your VPN off',
  ntStart: 'Start the check', ntStop: 'Stop', ntRunning: 'Checking… {s} of {n} s', ntPrep: 'Preparing: ping and stream checks…',
  ntGame: 'The game is running - the check would disturb the match. Close it first.', ntBusy: 'A check is already running.',
  ntPh_wait: 'waiting', ntPh_ping: 'ping', ntPh_burst: 'stream check', ntPh_tcp: 'TCP check', ntPh_connect: 'connecting', ntPh_game: 'playing', ntPh_done: 'done',
  ntV_excellent: 'Excellent', ntV_playable: 'Playable', ntV_laggy: 'Will lag', ntV_down: 'Does not work',
  ntPick: 'matchmaking picks this', ntNoPick: 'Matchmaking would not use any of our servers from here - games would go through Relic.',
  ntPickIs: 'Matchmaking would put your game on: {node}.', ntPing: 'Ping', ntUpTo: 'up to {n}', ntPauses: 'Pauses', ntLoss: 'Loss', ntMs: '{n} ms',
  ntTurn: 'Turn back in: avg {a} · 95% {p} · max {m} ms', ntJitter: 'Jitter {j} ms · reordered {r}%', ntResent: 'Sent again {n} · copies {c} · messages to players {b}/{s}',
  ntUdp: 'UDP · stream {g}/40', ntUdpNo: 'UDP: no answer', ntTcpOk: 'TCP {ms} ms', ntTcpNone: 'TCP: no connection',
  ntViaTcp: 'over TCP (UDP does not pass)', ntCutAt: 'The connection broke at {s} s.', ntChart: 'the chart: the worst turn delay of each second (bright), the ping (dim), red - a pause; the dashed line is 100 ms',
  ntW_no_answer: 'the server does not answer', ntW_cut: 'the connection broke', ntW_no_flow: 'almost nothing came back', ntW_cancelled: 'stopped',
  ntW_tcp_only: 'UDP does not pass, the game would use TCP', ntW_high_ping: 'high ping', ntW_ping: 'ping above 80 ms', ntW_spikes: 'delay spikes',
  ntW_pauses: 'pauses (the game freezes for everyone)', ntW_loss: 'packet loss', ntW_jitter: 'uneven delay', ntW_lost_msgs: 'messages lost',
  ntHints: 'Something on your side answers or reshuffles for our servers', ntH_zero_ping: '{nodes} answers in 0 ms - that is something on this computer or network (VPN, a blocking bypass, an antivirus) answering for the server. Matchmaking counts such a server as not reached.',
  ntH_udp_blocked: '{nodes}: UDP does not pass, TCP does - a VPN, a bypass or a firewall cuts UDP. The game needs UDP.',
  ntH_reorder: '{nodes}: packets come out of order a lot - typical of a VPN.', ntH_stream_cut: '{nodes}: small packets pass, a burst of them stops on the way - the line cuts streams to this server (DPI); the game takes another one.',
  ntH_all_down: 'None of our servers answers. A VPN or a firewall may block them.',
  ntExcl: 'For VPN / zapret / a firewall: let these through without the VPN', ntExclCopy: 'Copy', ntExclCopied: 'Copied',
  ntExclPorts: 'UDP and TCP port {g} (the game), TCP {l} (the automatch lobby)',
  ntHist: 'Last checks', ntHistNone: 'No checks yet.', ntShow: 'show', ntNow: 'shown', ntShare: 'Send to the developers', ntShareNote: 'The results, the test log and your launcher logs go to the developers (as “Send logs”).',
  ntShared: 'Sent, thank you! Reference: {id}', ntCancelled: 'Stopped.',
});
Object.assign(T.ru, {
  ntStuck: 'застревала до {s} с', ntW_stall: 'связь застревала: ходы ждали в очереди по нескольку секунд (это не пинг)', ntW_loss_up: 'ваши пакеты к этому серверу теряются', ntW_stream_blocked: 'маленькие пакеты проходят, а поток из них обрывается по дороге (DPI) — игра возьмёт другой сервер', ntH_tcp_local: '{nodes}: на TCP отвечают мгновенно (намного быстрее пинга) — соединения перехватывает VPN-клиент или прокси на компьютере или в сети.', ntRelic: 'Relic напрямую', ntRelicNote: 'Собственные серверы Relic прямо с этого компьютера (игры без наших серверов): боевые серверы и API лобби и автоматча. Несколько коротких соединений, без нагрузки на Relic.', ntRelicRelays: 'боевые серверы: отвечают {o} из {n}', ntRelicApi: 'API лобби: {g} из {n} запросов, {kb} КБ за {s} с', ntRelicApiNone: 'API лобби: нет ответа', ntW_relic_closed: 'часть боевых серверов Relic не отвечает', ntW_relic_api_none: 'API лобби Relic не отвечает', ntW_relic_api_cut: 'поток с API Relic обрывается по дороге',
  ntBtn: 'Связь', ntBtnTip: 'Проверить связь с нашими игровыми серверами', ntTitle: 'Проверка связи',
  ntIntro: 'Пакеты идут точно как в матче: наш UDP-туннель, ходы 10 раз в секунду, сообщения другим игрокам. Все наши серверы сразу, около минуты. Игру лучше закрыть.',
  ntMode: 'Игра', ntVpn: 'Ваш VPN', ntVpnOff: 'у меня выключен', ntVpnOn: 'у меня включён', ntVpnTip: 'Отметьте, включён ли сейчас ВАШ СОБСТВЕННЫЙ VPN (или обход блокировок), — прогоните раз с ним и раз без него и сравните. Сама проверка никакой VPN не включает.', ntVpnRunOn: 'ваш VPN вкл.', ntVpnRunOff: 'ваш VPN выкл.',
  ntStart: 'Начать проверку', ntStop: 'Остановить', ntRunning: 'Проверяю… {s} из {n} с', ntPrep: 'Подготовка: пинг и проверка потока…',
  ntGame: 'Игра запущена — проверка помешала бы матчу. Сначала закройте игру.', ntBusy: 'Проверка уже идёт.',
  ntPh_wait: 'ждёт', ntPh_ping: 'пинг', ntPh_burst: 'проверка потока', ntPh_tcp: 'проверка TCP', ntPh_connect: 'соединение', ntPh_game: 'игра', ntPh_done: 'готово',
  ntV_excellent: 'Отлично', ntV_playable: 'Играбельно', ntV_laggy: 'Будут лаги', ntV_down: 'Не работает',
  ntPick: 'подбор выберет этот', ntNoPick: 'Подбор отсюда не взял бы ни один наш сервер — игры пошли бы через Relic.',
  ntPickIs: 'Подбор поставил бы вашу игру на: {node}.', ntPing: 'Пинг', ntUpTo: 'до {n}', ntPauses: 'Паузы', ntLoss: 'Потери', ntMs: '{n} мс',
  ntTurn: 'Ход возвращается: среднее {a} · 95% {p} · макс {m} мс', ntJitter: 'Джиттер {j} мс · перестановки {r}%', ntResent: 'Переотправлено {n} · копий {c} · сообщения игрокам {b}/{s}',
  ntUdp: 'UDP · поток {g}/40', ntUdpNo: 'UDP: нет ответа', ntTcpOk: 'TCP {ms} мс', ntTcpNone: 'TCP: нет соединения',
  ntViaTcp: 'по TCP (UDP не проходит)', ntCutAt: 'Связь оборвалась на {s} с.', ntChart: 'график: худшая задержка хода за каждую секунду (яркая линия), пинг (тусклая), красное — пауза; пунктир — 100 мс',
  ntW_no_answer: 'сервер не отвечает', ntW_cut: 'связь оборвалась', ntW_no_flow: 'почти ничего не вернулось', ntW_cancelled: 'остановлено',
  ntW_tcp_only: 'UDP не проходит, игра пойдёт по TCP', ntW_high_ping: 'высокий пинг', ntW_ping: 'пинг выше 80 мс', ntW_spikes: 'скачки задержки',
  ntW_pauses: 'паузы (игра замирает у всех)', ntW_loss: 'потери пакетов', ntW_jitter: 'неровная задержка', ntW_lost_msgs: 'терялись сообщения',
  ntHints: 'Что-то у вас отвечает за наши серверы или перемешивает пакеты', ntH_zero_ping: '{nodes} отвечает за 0 мс — это что-то на компьютере или в сети (VPN, обход блокировок, антивирус) отвечает вместо сервера. Подбор считает такой сервер недоступным.',
  ntH_udp_blocked: '{nodes}: UDP не проходит, а TCP проходит — VPN, обход блокировок или фаервол режет UDP. Игре нужен UDP.',
  ntH_reorder: '{nodes}: пакеты сильно перемешиваются — так бывает через VPN.', ntH_stream_cut: '{nodes}: маленькие пакеты проходят, а пачка из них обрывается по дороге — линия режет потоки к этому серверу (DPI); игра возьмёт другой.',
  ntH_all_down: 'Ни один наш сервер не отвечает. Возможно, их блокирует VPN или фаервол.',
  ntExcl: 'Для VPN / zapret / фаервола: пустите напрямую, мимо VPN', ntExclCopy: 'Скопировать', ntExclCopied: 'Скопировано',
  ntExclPorts: 'UDP и TCP порт {g} (игра), TCP {l} (лобби автоматча)',
  ntHist: 'Прошлые проверки', ntHistNone: 'Проверок ещё не было.', ntShow: 'показать', ntNow: 'сейчас', ntShare: 'Отправить разработчикам', ntShareNote: 'Результаты, лог проверки и логи лаунчера уйдут разработчикам (как «Отправить логи»).',
  ntShared: 'Отправлено, спасибо! Номер: {id}', ntCancelled: 'Остановлено.',
});
Object.assign(T.es, {
  ntStuck: 'atascada hasta {s} s', ntW_stall: 'la conexión se atascó: los turnos esperaron segundos en la cola (no es el ping)', ntW_loss_up: 'tus paquetes a este servidor se pierden', ntW_stream_blocked: 'los paquetes pequeños pasan, un flujo de ellos se corta por el camino (DPI): el juego usará otro servidor', ntH_tcp_local: '{nodes}: TCP responde al instante (mucho más rápido que el ping): un cliente VPN o un proxy en este equipo o red toma las conexiones.', ntRelic: 'Relic directo', ntRelicNote: 'Los servidores propios de Relic desde este equipo (partidas sin nuestros servidores): sus servidores de batalla y la API de salas y automatch. Unas pocas conexiones cortas, sin carga para Relic.', ntRelicRelays: 'servidores de batalla: responden {o} de {n}', ntRelicApi: 'API de salas: {g} de {n} peticiones, {kb} KB en {s} s', ntRelicApiNone: 'API de salas: sin respuesta', ntW_relic_closed: 'algunos servidores de batalla de Relic no responden', ntW_relic_api_none: 'la API de salas de Relic no responde', ntW_relic_api_cut: 'el flujo de la API de Relic se corta por el camino',
  ntBtn: 'Conexión', ntBtnTip: 'Comprobar la conexión con nuestros servidores de juego', ntTitle: 'Comprobación de conexión',
  ntIntro: 'Los paquetes van exactamente como en una partida: nuestro túnel UDP, turnos 10 veces por segundo, mensajes a los demás jugadores. Todos nuestros servidores a la vez, cerca de un minuto. Mejor cierra el juego.',
  ntMode: 'Partida', ntVpn: 'Tu VPN', ntVpnOff: 'el mío está apagado', ntVpnOn: 'el mío está encendido', ntVpnTip: 'Marca si TU PROPIA VPN (o un bypass de bloqueos) está encendida en esta prueba: hazla una vez con ella y otra sin ella, y compara. La prueba en sí no enciende ninguna VPN.', ntVpnRunOn: 'tu VPN encendida', ntVpnRunOff: 'tu VPN apagada',
  ntStart: 'Empezar', ntStop: 'Detener', ntRunning: 'Comprobando… {s} de {n} s', ntPrep: 'Preparando: ping y prueba de flujo…',
  ntGame: 'El juego está abierto: la prueba molestaría la partida. Ciérralo primero.', ntBusy: 'Ya hay una prueba en marcha.',
  ntPh_wait: 'esperando', ntPh_ping: 'ping', ntPh_burst: 'prueba de flujo', ntPh_tcp: 'prueba TCP', ntPh_connect: 'conectando', ntPh_game: 'jugando', ntPh_done: 'hecho',
  ntV_excellent: 'Excelente', ntV_playable: 'Jugable', ntV_laggy: 'Habrá lag', ntV_down: 'No funciona',
  ntPick: 'el emparejamiento elige este', ntNoPick: 'El emparejamiento no usaría ninguno de nuestros servidores desde aquí: las partidas irían por Relic.',
  ntPickIs: 'El emparejamiento pondría tu partida en: {node}.', ntPing: 'Ping', ntUpTo: 'hasta {n}', ntPauses: 'Pausas', ntLoss: 'Pérdidas', ntMs: '{n} ms',
  ntTurn: 'El turno vuelve en: media {a} · 95% {p} · máx {m} ms', ntJitter: 'Jitter {j} ms · desordenados {r}%', ntResent: 'Reenviados {n} · copias {c} · mensajes a jugadores {b}/{s}',
  ntUdp: 'UDP · flujo {g}/40', ntUdpNo: 'UDP: sin respuesta', ntTcpOk: 'TCP {ms} ms', ntTcpNone: 'TCP: sin conexión',
  ntViaTcp: 'por TCP (UDP no pasa)', ntCutAt: 'La conexión se cortó a los {s} s.', ntChart: 'el gráfico: el peor retraso de turno de cada segundo (línea clara), el ping (tenue), rojo: una pausa; la línea discontinua es 100 ms',
  ntW_no_answer: 'el servidor no responde', ntW_cut: 'la conexión se cortó', ntW_no_flow: 'casi nada volvió', ntW_cancelled: 'detenido',
  ntW_tcp_only: 'UDP no pasa, el juego usaría TCP', ntW_high_ping: 'ping alto', ntW_ping: 'ping por encima de 80 ms', ntW_spikes: 'picos de retraso',
  ntW_pauses: 'pausas (el juego se congela para todos)', ntW_loss: 'pérdida de paquetes', ntW_jitter: 'retraso irregular', ntW_lost_msgs: 'mensajes perdidos',
  ntHints: 'Algo en tu lado responde por nuestros servidores o desordena los paquetes', ntH_zero_ping: '{nodes} responde en 0 ms: es algo en este equipo o red (VPN, un bypass de bloqueos, un antivirus) respondiendo por el servidor. El emparejamiento lo cuenta como no alcanzado.',
  ntH_udp_blocked: '{nodes}: UDP no pasa y TCP sí: una VPN, un bypass o un cortafuegos corta UDP. El juego necesita UDP.',
  ntH_reorder: '{nodes}: los paquetes llegan muy desordenados, típico de una VPN.', ntH_stream_cut: '{nodes}: los paquetes pequeños pasan, una ráfaga de ellos se corta por el camino: la línea corta flujos a este servidor (DPI); el juego usará otro.',
  ntH_all_down: 'Ninguno de nuestros servidores responde. Puede que una VPN o un cortafuegos los bloquee.',
  ntExcl: 'Para VPN / zapret / cortafuegos: deja pasar esto sin VPN', ntExclCopy: 'Copiar', ntExclCopied: 'Copiado',
  ntExclPorts: 'puerto UDP y TCP {g} (el juego), TCP {l} (la sala del automatch)',
  ntHist: 'Últimas pruebas', ntHistNone: 'Aún no hay pruebas.', ntShow: 'ver', ntNow: 'visible', ntShare: 'Enviar a los desarrolladores', ntShareNote: 'Los resultados, el registro de la prueba y los registros del launcher van a los desarrolladores (como «Enviar registros»).',
  ntShared: '¡Enviado, gracias! Referencia: {id}', ntCancelled: 'Detenido.',
});
Object.assign(T.fr, {
  ntStuck: 'bloquée jusqu’à {s} s', ntW_stall: 'la connexion s’est bloquée : les tours ont attendu des secondes dans la file (ce n’est pas le ping)', ntW_loss_up: 'vos paquets vers ce serveur se perdent', ntW_stream_blocked: 'les petits paquets passent, un flux est coupé en route (DPI) - le jeu prendra un autre serveur', ntH_tcp_local: '{nodes} : TCP répond aussitôt (bien plus vite que le ping) - un client VPN ou un proxy sur cet ordinateur ou ce réseau prend les connexions.', ntRelic: 'Relic en direct', ntRelicNote: 'Les serveurs de Relic directement depuis cet ordinateur (parties sans nos serveurs) : ses serveurs de combat et l’API des salons et de l’automatch. Quelques connexions courtes, sans charge pour Relic.', ntRelicRelays: 'serveurs de combat : {o} sur {n} répondent', ntRelicApi: 'API des salons : {g} sur {n} requêtes, {kb} Ko en {s} s', ntRelicApiNone: 'API des salons : pas de réponse', ntW_relic_closed: 'certains serveurs de combat de Relic ne répondent pas', ntW_relic_api_none: 'l’API des salons de Relic ne répond pas', ntW_relic_api_cut: 'le flux de l’API de Relic se coupe en route',
  ntBtn: 'Connexion', ntBtnTip: 'Vérifier la connexion à nos serveurs de jeu', ntTitle: 'Vérification de la connexion',
  ntIntro: 'Les paquets passent exactement comme en partie : notre tunnel UDP, des tours 10 fois par seconde, des messages aux autres joueurs. Tous nos serveurs à la fois, environ une minute. Fermez d’abord le jeu.',
  ntMode: 'Partie', ntVpn: 'Votre VPN', ntVpnOff: 'le mien est coupé', ntVpnOn: 'le mien est actif', ntVpnTip: 'Indiquez si VOTRE PROPRE VPN (ou un contournement de blocage) est actif pour cet essai - faites-en un avec, un sans, et comparez. La vérification elle-même n’active aucun VPN.', ntVpnRunOn: 'votre VPN actif', ntVpnRunOff: 'votre VPN coupé',
  ntStart: 'Lancer la vérification', ntStop: 'Arrêter', ntRunning: 'Vérification… {s} sur {n} s', ntPrep: 'Préparation : ping et test de flux…',
  ntGame: 'Le jeu est lancé : la vérification gênerait la partie. Fermez-le d’abord.', ntBusy: 'Une vérification est déjà en cours.',
  ntPh_wait: 'attente', ntPh_ping: 'ping', ntPh_burst: 'test de flux', ntPh_tcp: 'test TCP', ntPh_connect: 'connexion', ntPh_game: 'en jeu', ntPh_done: 'fini',
  ntV_excellent: 'Excellent', ntV_playable: 'Jouable', ntV_laggy: 'Ça va laguer', ntV_down: 'Ne marche pas',
  ntPick: 'choisi par le matchmaking', ntNoPick: 'Le matchmaking n’utiliserait aucun de nos serveurs d’ici : les parties passeraient par Relic.',
  ntPickIs: 'Le matchmaking mettrait votre partie sur : {node}.', ntPing: 'Ping', ntUpTo: 'jusqu’à {n}', ntPauses: 'Pauses', ntLoss: 'Pertes', ntMs: '{n} ms',
  ntTurn: 'Le tour revient en : moy. {a} · 95% {p} · max {m} ms', ntJitter: 'Gigue {j} ms · désordre {r}%', ntResent: 'Renvoyés {n} · copies {c} · messages aux joueurs {b}/{s}',
  ntUdp: 'UDP · flux {g}/40', ntUdpNo: 'UDP : pas de réponse', ntTcpOk: 'TCP {ms} ms', ntTcpNone: 'TCP : pas de connexion',
  ntViaTcp: 'en TCP (UDP ne passe pas)', ntCutAt: 'La connexion a coupé à {s} s.', ntChart: 'le graphique : le pire délai de tour de chaque seconde (clair), le ping (pâle), rouge : une pause ; le pointillé = 100 ms',
  ntW_no_answer: 'le serveur ne répond pas', ntW_cut: 'la connexion a coupé', ntW_no_flow: 'presque rien n’est revenu', ntW_cancelled: 'arrêté',
  ntW_tcp_only: 'UDP ne passe pas, le jeu utiliserait TCP', ntW_high_ping: 'ping élevé', ntW_ping: 'ping au-dessus de 80 ms', ntW_spikes: 'pics de délai',
  ntW_pauses: 'pauses (le jeu se fige pour tous)', ntW_loss: 'perte de paquets', ntW_jitter: 'délai irrégulier', ntW_lost_msgs: 'messages perdus',
  ntHints: 'Quelque chose chez vous répond pour nos serveurs ou mélange les paquets', ntH_zero_ping: '{nodes} répond en 0 ms : c’est quelque chose sur cet ordinateur ou ce réseau (VPN, contournement de blocage, antivirus) qui répond à la place du serveur. Le matchmaking le compte comme injoignable.',
  ntH_udp_blocked: '{nodes} : UDP ne passe pas, TCP oui - un VPN, un contournement ou un pare-feu coupe UDP. Le jeu a besoin d’UDP.',
  ntH_reorder: '{nodes} : les paquets arrivent très en désordre - typique d’un VPN.', ntH_stream_cut: '{nodes} : les petits paquets passent, une rafale s’arrête en route - la ligne coupe les flux vers ce serveur (DPI) ; le jeu en prendra un autre.',
  ntH_all_down: 'Aucun de nos serveurs ne répond. Un VPN ou un pare-feu les bloque peut-être.',
  ntExcl: 'Pour VPN / zapret / pare-feu : laissez passer ceci hors VPN', ntExclCopy: 'Copier', ntExclCopied: 'Copié',
  ntExclPorts: 'port UDP et TCP {g} (le jeu), TCP {l} (le salon de l’automatch)',
  ntHist: 'Dernières vérifications', ntHistNone: 'Aucune vérification pour l’instant.', ntShow: 'voir', ntNow: 'affiché', ntShare: 'Envoyer aux développeurs', ntShareNote: 'Les résultats, le journal du test et les journaux du lanceur partent aux développeurs (comme « Envoyer les journaux »).',
  ntShared: 'Envoyé, merci ! Référence : {id}', ntCancelled: 'Arrêté.',
});
Object.assign(T.de, {
  ntStuck: 'hing bis {s} s', ntW_stall: 'die Verbindung hing: Züge warteten Sekunden in der Warteschlange (das ist nicht der Ping)', ntW_loss_up: 'deine Pakete zu diesem Server gehen verloren', ntW_stream_blocked: 'kleine Pakete kommen durch, ein Strom davon wird unterwegs gestoppt (DPI) - das Spiel nimmt einen anderen Server', ntH_tcp_local: '{nodes}: TCP antwortet sofort (viel schneller als der Ping) - ein VPN-Client oder Proxy auf diesem Computer oder im Netz nimmt die Verbindungen an.', ntRelic: 'Relic direkt', ntRelicNote: 'Relics eigene Server direkt von diesem Computer (Spiele ohne unsere Server): seine Kampfserver und die API für Lobbys und Automatch. Ein paar kurze Verbindungen, keine Last für Relic.', ntRelicRelays: 'Kampfserver: {o} von {n} antworten', ntRelicApi: 'Lobby-API: {g} von {n} Anfragen, {kb} KB in {s} s', ntRelicApiNone: 'Lobby-API: keine Antwort', ntW_relic_closed: 'einige Kampfserver von Relic antworten nicht', ntW_relic_api_none: 'Relics Lobby-API antwortet nicht', ntW_relic_api_cut: 'der Strom von Relics API bricht unterwegs ab',
  ntBtn: 'Verbindung', ntBtnTip: 'Die Verbindung zu unseren Spielservern prüfen', ntTitle: 'Verbindungstest',
  ntIntro: 'Die Pakete laufen genau wie in einem Match: unser UDP-Tunnel, Züge 10-mal pro Sekunde, Nachrichten an die anderen Spieler. Alle unsere Server gleichzeitig, etwa eine Minute. Schließe vorher das Spiel.',
  ntMode: 'Spiel', ntVpn: 'Dein VPN', ntVpnOff: 'meins ist aus', ntVpnOn: 'meins ist an', ntVpnTip: 'Markiere, ob DEIN EIGENES VPN (oder ein Sperren-Umgeher) bei diesem Lauf an ist - einmal mit, einmal ohne, dann vergleichen. Der Test selbst schaltet kein VPN ein.', ntVpnRunOn: 'dein VPN an', ntVpnRunOff: 'dein VPN aus',
  ntStart: 'Test starten', ntStop: 'Stopp', ntRunning: 'Prüfe… {s} von {n} s', ntPrep: 'Vorbereitung: Ping und Stromtest…',
  ntGame: 'Das Spiel läuft - der Test würde das Match stören. Schließe es zuerst.', ntBusy: 'Ein Test läuft bereits.',
  ntPh_wait: 'wartet', ntPh_ping: 'Ping', ntPh_burst: 'Stromtest', ntPh_tcp: 'TCP-Test', ntPh_connect: 'verbinde', ntPh_game: 'spielt', ntPh_done: 'fertig',
  ntV_excellent: 'Ausgezeichnet', ntV_playable: 'Spielbar', ntV_laggy: 'Wird laggen', ntV_down: 'Geht nicht',
  ntPick: 'Matchmaking nimmt diesen', ntNoPick: 'Das Matchmaking würde von hier keinen unserer Server nehmen - Spiele liefen über Relic.',
  ntPickIs: 'Das Matchmaking würde dein Spiel auf {node} legen.', ntPing: 'Ping', ntUpTo: 'bis {n}', ntPauses: 'Pausen', ntLoss: 'Verlust', ntMs: '{n} ms',
  ntTurn: 'Zug zurück in: Mittel {a} · 95% {p} · max {m} ms', ntJitter: 'Jitter {j} ms · vertauscht {r}%', ntResent: 'Erneut gesendet {n} · Kopien {c} · Nachrichten an Spieler {b}/{s}',
  ntUdp: 'UDP · Strom {g}/40', ntUdpNo: 'UDP: keine Antwort', ntTcpOk: 'TCP {ms} ms', ntTcpNone: 'TCP: keine Verbindung',
  ntViaTcp: 'über TCP (UDP kommt nicht durch)', ntCutAt: 'Die Verbindung brach nach {s} s ab.', ntChart: 'die Grafik: die schlimmste Zugverzögerung je Sekunde (hell), der Ping (blass), rot - eine Pause; gestrichelt = 100 ms',
  ntW_no_answer: 'der Server antwortet nicht', ntW_cut: 'die Verbindung brach ab', ntW_no_flow: 'fast nichts kam zurück', ntW_cancelled: 'gestoppt',
  ntW_tcp_only: 'UDP kommt nicht durch, das Spiel nähme TCP', ntW_high_ping: 'hoher Ping', ntW_ping: 'Ping über 80 ms', ntW_spikes: 'Verzögerungsspitzen',
  ntW_pauses: 'Pausen (das Spiel friert für alle ein)', ntW_loss: 'Paketverlust', ntW_jitter: 'ungleichmäßige Verzögerung', ntW_lost_msgs: 'Nachrichten verloren',
  ntHints: 'Etwas bei dir antwortet für unsere Server oder vertauscht Pakete', ntH_zero_ping: '{nodes} antwortet in 0 ms - da antwortet etwas auf diesem Computer oder im Netz (VPN, ein Sperren-Umgeher, ein Virenscanner) statt des Servers. Das Matchmaking zählt ihn als nicht erreicht.',
  ntH_udp_blocked: '{nodes}: UDP kommt nicht durch, TCP schon - ein VPN, ein Umgeher oder eine Firewall blockt UDP. Das Spiel braucht UDP.',
  ntH_reorder: '{nodes}: Pakete kommen stark vertauscht an - typisch für ein VPN.', ntH_stream_cut: '{nodes}: kleine Pakete kommen durch, ein Stoß davon bricht unterwegs ab - die Leitung kappt Ströme zu diesem Server (DPI); das Spiel nimmt einen anderen.',
  ntH_all_down: 'Keiner unserer Server antwortet. Vielleicht blockiert sie ein VPN oder eine Firewall.',
  ntExcl: 'Für VPN / zapret / Firewall: lass das hier am VPN vorbei', ntExclCopy: 'Kopieren', ntExclCopied: 'Kopiert',
  ntExclPorts: 'UDP- und TCP-Port {g} (das Spiel), TCP {l} (die Automatch-Lobby)',
  ntHist: 'Letzte Tests', ntHistNone: 'Noch keine Tests.', ntShow: 'zeigen', ntNow: 'angezeigt', ntShare: 'An die Entwickler senden', ntShareNote: 'Die Ergebnisse, das Testprotokoll und deine Launcher-Logs gehen an die Entwickler (wie „Logs senden“).',
  ntShared: 'Gesendet, danke! Nummer: {id}', ntCancelled: 'Gestoppt.',
});

const NT = { runs: [], cur: null, busy: false, live: null, mode: '1v1', vpn: false, exclNodes: [], lobbyPorts: [47443, 47445], port: 47100 };
try { NT.mode = localStorage.getItem('ntMode') || '1v1'; NT.vpn = localStorage.getItem('ntVpn') === '1'; } catch (e) {}
const ntModeName = m => ({ '1v1': '1×1', '2v2': '2×2', '3v3': '3×3' }[m] || m);
const ntNum = x => (x == null || !isFinite(x)) ? '—' : String(Math.round(x));
const ntVerdictRank = { excellent: 0, playable: 1, laggy: 2, down: 3 };
// the best verdict of a run: the node the matchmaker picks, else the best one
function ntRunVerdict(r) {
  const ns = (r && r.nodes) || [];
  const p = ns.find(n => n.pick); if (p) return p.verdict;
  return ns.map(n => n.verdict).sort((a, b) => (ntVerdictRank[a] ?? 9) - (ntVerdictRank[b] ?? 9))[0] || 'down';
}

// ---- the header button (1.4.23, siritos 06.11): only the signal icon, right of the settings gear - away from the tabs, so it is
// not hit instead of Home; the icon's colour is the verdict of the last check (grey - none yet), it pulses while a check runs;
// a click opens the window as before. Not a .tab: app.js wires every .tab as a view switch.
(function ntButton() {
  const nav = document.querySelector('header nav'); if (!nav || $('ntOpen')) return;
  const b = document.createElement('button');
  b.className = 'hdr-net'; b.id = 'ntOpen';
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20v-3M9 20v-7M14 20v-11M19 20V5"/></svg>';
  nav.appendChild(b);
  b.onclick = ntOpen;
})();
function ntHeader() {
  const b = $('ntOpen'); if (!b) return;
  const last = NT.runs[0], v = last ? ntRunVerdict(last) : '';
  const tip = NT.busy ? t('ntTitle') + '…' : v ? t('ntBtn') + ': ' + t('ntV_' + v) + ' · ' + t('ntBtnTip') : t('ntBtnTip');
  b.title = tip; b.setAttribute('aria-label', tip);
  b.className = 'hdr-net' + (NT.busy ? ' run' : v ? ' v-' + v : '');
}

// ---- the window
function ntOpen() {
  if ($('ntBox')) return;
  const m = document.createElement('div'); m.className = 'modal nt-modal'; m.id = 'ntBox';
  m.innerHTML = '<div class="box nt-box" role="dialog" aria-modal="true" aria-labelledby="ntH"><div class="nt-head"><h3 id="ntH"></h3><button class="nt-x" id="ntClose" aria-label="×">×</button></div><div id="ntBody"></div></div>';
  document.body.appendChild(m);
  m.addEventListener('click', e => { if (e.target === m && !NT.busy) ntClose(); });
  $('ntClose').onclick = ntClose;
  ntRender();
  invoke('nettest_history').then(h => { ntTakeHistory(h); ntRender(); }).catch(() => {});
}
function ntClose() { const m = $('ntBox'); if (m) m.remove(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('ntBox')) ntClose(); });
function ntTakeHistory(h) {
  if (!h) return;
  NT.runs = h.runs || []; NT.busy = !!h.busy || NT.busy;
  if (h.nodes) NT.exclNodes = h.nodes; if (h.lobby_ports) NT.lobbyPorts = h.lobby_ports;
  if (!NT.cur && NT.runs[0]) NT.cur = NT.runs[0];
  ntHeader();
}

function ntSeg(name, items, cur) {
  return `<div class="nt-seg" role="radiogroup">${items.map(([v, label]) => `<button role="radio" aria-checked="${v === cur}" class="${v === cur ? 'on' : ''}" data-${name}="${esc(v)}"${NT.busy ? ' disabled' : ''}>${esc(label)}</button>`).join('')}</div>`;
}

function ntRender() {
  ntHeader();
  const body = $('ntBody'); if (!body) return;
  $('ntH').textContent = t('ntTitle');
  let h = `<div class="note nt-intro">${esc(t('ntIntro'))}</div>`;
  h += `<div class="nt-ctl"><span class="nt-lbl">${esc(t('ntMode'))}</span>${ntSeg('mode', [['1v1', '1×1'], ['2v2', '2×2'], ['3v3', '3×3']], NT.mode)}`
    + `<span class="nt-lbl">${esc(t('ntVpn'))}</span>${ntSeg('vpn', [['0', t('ntVpnOff')], ['1', t('ntVpnOn')]], NT.vpn ? '1' : '0')}`
    + (NT.busy ? `<button class="btn small nt-go" id="ntStop">${esc(t('ntStop'))}</button>` : `<button class="btn gold small nt-go" id="ntGo"${S && S.game_running ? ' disabled' : ''}>${esc(t('ntStart'))}</button>`)
    + `</div><div class="note nt-vpntip">${esc(S && S.game_running ? t('ntGame') : t('ntVpnTip'))}</div>`;
  if (NT.busy) h += ntLiveHtml();
  const r = NT.busy ? null : NT.cur;
  if (r) h += ntResultHtml(r);
  h += ntHistHtml();
  body.innerHTML = h;
  body.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { NT.mode = b.dataset.mode; try { localStorage.setItem('ntMode', NT.mode); } catch (e) {} ntRender(); });
  body.querySelectorAll('[data-vpn]').forEach(b => b.onclick = () => { NT.vpn = b.dataset.vpn === '1'; try { localStorage.setItem('ntVpn', NT.vpn ? '1' : '0'); } catch (e) {} ntRender(); });
  body.querySelectorAll('[data-run]').forEach(b => b.onclick = () => { NT.cur = NT.runs[+b.dataset.run]; ntRender(); });
  if ($('ntGo')) $('ntGo').onclick = ntRun;
  if ($('ntStop')) $('ntStop').onclick = () => invoke('nettest_cancel').catch(() => {});
  if ($('ntShare')) $('ntShare').onclick = ntShare;
  if ($('ntCopy')) $('ntCopy').onclick = () => {
    const txt = $('ntExclList').textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { $('ntCopy').textContent = t('ntExclCopied'); }).catch(() => {
      const r2 = document.createRange(); r2.selectNodeContents($('ntExclList')); const s = getSelection(); s.removeAllRanges(); s.addRange(r2);
    });
  };
}

function ntLiveHtml() {
  const L = NT.live; const secs = (L && L.secs) || 60;
  const nodes = (L && L.nodes) || [];
  const game = nodes.filter(n => n.phase === 'game' || n.phase === 'done');
  const s = game.length ? Math.max(...game.map(n => n.secs || 0)) : 0;
  let h = `<div class="nt-live" aria-live="polite"><div class="nt-prog"><i style="width:${Math.min(100, s / secs * 100)}%"></i></div>`
    + `<div class="note">${esc(game.length ? t('ntRunning', { s: Math.round(s), n: secs }) : t('ntPrep'))}</div><div class="nt-lrows">`;
  nodes.forEach(n => {
    h += `<div class="nt-lrow"><span class="nt-ln">${esc(gnName(n))}</span><span class="nt-lp">${esc(t('ntPh_' + n.phase) || n.phase)}${n.transport === 'tcp' ? ' · TCP' : ''}</span>`
      + `<span>${n.rtt != null ? esc(t('ntPing')) + ' ' + esc(t('ntMs', { n: ntNum(n.rtt) })) : ''}</span><span class="${n.pauses ? 'nt-bad' : ''}">${n.phase === 'game' || n.phase === 'done' ? esc(t('ntPauses')) + ' ' + (n.pauses | 0) : ''}</span></div>`;
  });
  return h + '</div></div>';
}

// a small chart of one node: the worst turn delay of each second (line), the mean ping (thin), seconds with a pause (red marks)
function ntChart(tl) {
  if (!tl || !tl.length) return '';
  const W = 300, H = 56, n = Math.max(tl.length, 10);
  const top = Math.max(150, ...tl.map(p => p[1] || 0), ...tl.map(p => p[2] || 0));
  const x = i => (i + 0.5) / n * W, y = v => H - 2 - Math.min(v, top) / top * (H - 16);   // the top 14 px: the scale label
  const line = k => tl.map((p, i) => p[k] == null ? null : `${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).filter(Boolean).join(' ');
  const marks = tl.map((p, i) => p[3] ? `<rect x="${(x(i) - 1.5).toFixed(1)}" y="0" width="3" height="${H}" class="nt-cp"/>` : '').join('');
  const g100 = y(100).toFixed(1);
  return `<div class="nt-cw"><svg class="nt-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(t('ntChart'))}">${marks}`
    + `<line x1="0" x2="${W}" y1="${g100}" y2="${g100}" class="nt-cg"/><polyline points="${line(2)}" class="nt-cr"/><polyline points="${line(1)}" class="nt-ct"/></svg>`
    + `<span class="nt-cmax">${esc(t('ntMs', { n: Math.round(top) }))}</span></div>`;
}

function ntNodeHtml(n, pk) {
  const v = n.verdict || 'down', rt = n.rtt || {}, tk = n.ticks || {}, du = n.du || {}, px = n.proxy || {}, tu = n.turn || {};
  const pauses = (tk.pauses | 0) + ((n.server && n.server.gaps) | 0);
  const loss = Math.max(du.up_loss_pct || 0, du.down_loss_pct || 0);
  let h = `<div class="nt-node v-${esc(v)}"><div class="nt-nh"><span class="nt-nn">${esc(gnName(n))}</span><span class="nt-ip">${esc(n.ip)}</span>`
    + `${(pk === undefined ? n.pick : n === pk) ? `<span class="chip hot">${esc(t('ntPick'))}</span>` : ''}<span class="nt-v">${esc(t('ntV_' + v))}</span></div>`;
  if (n.transport && n.transport !== 'none' && rt.n) {
    const ping = rt.p50 != null ? rt.p50 : rt.avg;   // 1.4.22: the median - a stuck stream is shown as such, not as a ping of seconds
    const up = n.stall_ms ? `<em class="nt-bad">${esc(t('ntStuck', { s: Math.round(n.stall_ms / 1000) }))}</em>` : esc(t('ntUpTo', { n: ntNum(rt.p95) }));
    h += `<div class="nt-big"><div><b>${ntNum(ping)}</b><small>${esc(t('ntMs', { n: '' }).trim())}</small><span>${esc(t('ntPing'))} · ${up}</span></div>`
      + `<div class="${pauses ? 'nt-bad' : ''}"><b>${pauses}</b><span>${esc(t('ntPauses'))}${tk.max_gap_ms > 250 ? ' · ' + esc(t('ntUpTo', { n: ntNum(tk.max_gap_ms) })) : ''}</span></div>`
      + `<div class="${loss > 1 ? 'nt-bad' : ''}"><b>${loss < 10 ? loss.toFixed(1).replace(/\.0$/, '') : Math.round(loss)}%</b><span>${esc(t('ntLoss'))}</span></div></div>`;
    h += ntChart(n.tl);
    h += `<div class="nt-d">${esc(t('ntTurn', { a: ntNum(tu.avg), p: ntNum(tu.p95), m: ntNum(tu.max) }))}</div>`;
    h += `<div class="nt-d">${esc(t('ntJitter', { j: tk.jitter_ms ?? '—', r: du.reorder_pct ?? 0 }))}</div>`;
    h += `<div class="nt-d">${esc(t('ntResent', { n: du.resent ?? 0, c: du.copies ?? 0, b: px.back ?? 0, s: px.parts ?? 0 }))}</div>`;
  }
  const b = n.burst || {}, tms = n.tcp && n.tcp.connect_ms;
  const parts = [n.ping && n.ping.n ? t('ntUdp', { g: b.got | 0 }) : t('ntUdpNo'), tms != null ? t('ntTcpOk', { ms: ntNum(tms) }) : t('ntTcpNone')];
  if (n.transport === 'tcp') parts.unshift(t('ntViaTcp'));
  h += `<div class="nt-d nt-dim">${esc(parts.join(' · '))}</div>`;
  if (n.cut) h += `<div class="nt-d nt-bad">${esc(t('ntCutAt', { s: Math.round(n.cut.at) }))}</div>`;
  const why = (n.why || []).map(w => t('ntW_' + w)).filter(Boolean);
  if (why.length && v !== 'excellent') h += `<div class="nt-why">${esc(why.join('; '))}</div>`;
  if (window.nqMark) h += nqMark(n.ip);                       // 1.4.24: the matchmaker does not use this node for this player (nodeq.js)
  return h + '</div>';
}

// 1.4.22 (noofancy 06.11): Relic's own servers straight from here - its battle servers (TCP handshakes) and the lobby API
function ntRelicHtml(R) {
  const v = R.verdict || 'down', rl = R.relays || [], api = R.api || {};
  const why = (R.why || []).map(w => t('ntW_' + w)).filter(Boolean);
  return `<div class="nt-node nt-relic v-${esc(v)}"><div class="nt-nh"><span class="nt-nn">${esc(t('ntRelic'))}</span><span class="nt-ip">${esc(R.ms != null ? t('ntPing') + ' ' + t('ntMs', { n: ntNum(R.ms) }) : '')}</span><span class="nt-v">${esc(t('ntV_' + v))}</span></div>`
    + `<div class="nt-d">${esc(t('ntRelicRelays', { o: R.open | 0, n: rl.length }))}: ${esc(rl.map(x => x.addr + ' ' + (x.best != null ? t('ntMs', { n: ntNum(x.best) }) : '—')).join(' · '))}</div>`
    + `<div class="nt-d">${esc(api.got ? t('ntRelicApi', { g: api.got, n: api.n || 5, kb: api.kb | 0, s: api.secs }) : t('ntRelicApiNone'))}</div>`
    + (why.length && v !== 'excellent' ? `<div class="nt-why">${esc(why.join('; '))}</div>` : '')
    + `<div class="nt-d nt-dim">${esc(t('ntRelicNote'))}</div></div>`;
}

function ntResultHtml(r) {
  const ns = r.nodes || [];
  const pick0 = ns.find(n => n.pick);   // 1.4.24: not a node the matchmaker does not use for this player (nodeq.js)
  const pick = pick0 && window.nqAvoided && nqAvoided(pick0.ip) ? (nqPickTest(ns) || pick0) : pick0;
  let h = `<div class="gn-sum ${pick ? (pick.verdict === 'excellent' || pick.verdict === 'playable' ? 'ok' : 'warn') : 'bad'}"><span>${esc(pick ? t('ntPickIs', { node: gnName(pick) }) : t('ntNoPick'))}`
    + ` <em class="nt-when">${esc(ntModeName(r.mode))} · ${esc(r.vpn ? t('ntVpnRunOn') : t('ntVpnRunOff'))} · ${esc(ntTime(r.ts))}</em></span></div>`;
  h += `<div class="nt-grid">${ns.map(n => ntNodeHtml(n, pick || null)).join('')}</div><div class="nt-legend"><i class="l1"></i>${esc(t('ntChart'))}</div>`;
  if (r.relic) h += ntRelicHtml(r.relic);
  const hints = r.hints || [];
  if (hints.length) {
    h += `<div class="nt-hints"><div class="net-gh">${esc(t('ntHints'))}</div>`;
    hints.forEach(x => { h += `<div class="nt-hint">${esc(t('ntH_' + x.code, { nodes: (x.nodes || []).map(ip => gnName({ ip })).join(', ') }))}</div>`; });
    h += '</div>';
  }
  const ips = ns.length ? ns.map(n => n.ip) : NT.exclNodes;
  h += `<details class="nt-excl"${hints.length ? ' open' : ''}><summary>${esc(t('ntExcl'))}</summary><div class="nt-exl"><code id="ntExclList">${esc(ips.join(', '))}</code>`
    + `<button class="btn-line" id="ntCopy">${esc(t('ntExclCopy'))}</button></div><div class="note">${esc(t('ntExclPorts', { g: r.port || NT.port, l: NT.lobbyPorts.join(', ') }))}</div></details>`;
  h += `<div class="nt-share"><button class="btn gold small" id="ntShare">${esc(t('ntShare'))}</button><span class="note">${esc(t('ntShareNote'))}</span></div>`;
  return h;
}

// the history is read again when the window opens: the run shown is told by its time, not by the object
const ntSame = (a, b) => !!(a && b && a.ts === b.ts && a.mode === b.mode);
function ntTime(ts) { if (!ts) return ''; const d = new Date(ts * 1000); return d.toLocaleString(lang, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }

// the last runs side by side: a row per run, a column per node (the dot of the verdict and the ping)
function ntHistHtml() {
  const runs = NT.runs;
  let h = `<div class="nt-hist"><div class="net-gh">${esc(t('ntHist'))}</div>`;
  if (!runs.length) return h + `<div class="note">${esc(t('ntHistNone'))}</div></div>`;
  const ips = []; runs.forEach(r => (r.nodes || []).forEach(n => { if (!ips.includes(n.ip)) ips.push(n.ip); }));
  const relic = runs.some(r => r.relic);
  h += `<table class="nt-ht"><thead><tr><th></th><th></th>${ips.map(ip => `<th>${esc(gnName({ ip }))}</th>`).join('')}${relic ? `<th>${esc(t('ntRelic'))}</th>` : ''}<th></th></tr></thead><tbody>`;
  runs.forEach((r, i) => {
    h += `<tr class="${ntSame(r, NT.cur) && !NT.busy ? 'cur' : ''}"><td>${esc(ntTime(r.ts))}</td><td>${esc(ntModeName(r.mode))} · <b class="${r.vpn ? 'nt-vpn' : ''}">${esc(r.vpn ? t('ntVpnRunOn') : t('ntVpnRunOff'))}</b></td>`;
    ips.forEach(ip => {
      const n = (r.nodes || []).find(x => x.ip === ip);
      h += n ? `<td title="${esc(t('ntV_' + n.verdict))}"><i class="nt-dot v-${esc(n.verdict)}"></i>${n.rtt && n.rtt.n ? esc(t('ntMs', { n: ntNum(n.rtt.p50 != null ? n.rtt.p50 : n.rtt.avg) })) : '—'}${n.pick ? ' ★' : ''}</td>` : '<td>—</td>';
    });
    if (relic) h += r.relic ? `<td title="${esc(t('ntV_' + r.relic.verdict))}"><i class="nt-dot v-${esc(r.relic.verdict)}"></i>${r.relic.ms != null ? esc(t('ntMs', { n: ntNum(r.relic.ms) })) : '—'}</td>` : '<td>—</td>';
    h += `<td>${ntSame(r, NT.cur) && !NT.busy ? `<span class="nt-dim">${esc(t('ntNow'))}</span>` : `<button class="link-btn" data-run="${i}">${esc(t('ntShow'))}</button>`}</td></tr>`;
  });
  return h + '</tbody></table></div>';
}

async function ntRun() {
  if (NT.busy) return;
  NT.busy = true; NT.live = null; ntRender();
  try {
    const r = await invoke('nettest_run', { mode: NT.mode, vpn: NT.vpn });
    if (r && r.skipped) toast(t(r.skipped === 'game' ? 'ntGame' : 'ntBusy'), true);
    else if (r && r.cancelled) toast(t('ntCancelled'));
    else if (r) { NT.runs.unshift(r); NT.runs = NT.runs.slice(0, 4); NT.cur = r; if (r.nq_marks && window.nqTake) nqTake(r.nq_marks); }
  } catch (e) { toast(e, true); }
  NT.busy = false; NT.live = null; ntRender();
}

async function ntShare() {
  const b = $('ntShare'); b.disabled = true; b.textContent = t('sending');
  const me = CH.me && CH.me.signed_in ? CH.me.name : '';
  try { const id = await invoke('send_logs', { who: ($('diagName') && $('diagName').value.trim()) || me || '', what: 'nettest' }); toast(t('ntShared', { id })); }
  catch (e) { toast(e, true); }
  b.disabled = false; b.textContent = t('ntShare');
}

listen('nettest', e => { NT.live = e.payload; NT.busy = true; if ($('ntBox')) ntRender(); else ntHeader(); }).catch(() => {});
invoke('nettest_history').then(ntTakeHistory).catch(() => ntHeader());
// every redraw of app.js (the language, the game started or closed) redraws the button and the open window too
if (typeof window.render === 'function') {
  const base = window.render;
  window.render = function () { const r = base.apply(this, arguments); try { if ($('ntBox') && !NT.busy) ntRender(); else ntHeader(); } catch (e) {} return r; };
}
