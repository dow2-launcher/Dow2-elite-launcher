// The start: the status, the launcher's own update, Relic's servers - after every part of the page is read (the first
// render() needs them all).
// Split out of app.js (1.6.17), its section as it was; app.js keeps the core (the status, render, the add-ons, the update).
'use strict';
reload().then(() => { roomLink(); return refresh(); });
launcherCheck();
setTimeout(relicProbe, 8000);                 // after start-up traffic settles; once per launcher start
// every 15 minutes: new Elite versions, announcements and a newer launcher
setInterval(() => { if (S && !S.busy) refresh(); launcherCheck(); }, 15 * 60 * 1000);
