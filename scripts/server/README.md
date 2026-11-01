# Release tooling on the server (rts) - copies kept in git

Players get the launcher and the add-ons only from the server: GitHub builds are manual and never released to players.
Secrets (signing keys, the store token, the mirror credentials) are read from files on the server and are not here.

| File | On the server | What it does |
|---|---|---|
| `build_par.sh <commit>` | /mnt/ssd/eliteupd | builds a LOCAL commit for Windows, Linux and both Macs at once (~3-4 min) |
| `stage130.sh`, `release130.sh` | /mnt/ssd/eliteupd | stage / release a launcher version: `sed "s/V=1\.3\.0/V=X.Y.Z/"` into /tmp, run, then `verify_updater_sigs.py` |
| `verify_updater_sigs.py` | /mnt/ssd/eliteupd | checks the self-update signatures of a staged version |
| `comps.py`, `mfix.py`, `mfx.py` | /mnt/ssd/eliteupd | one-off edits of the store's launcher.json (components, manifest versions) |
| `elite-release` | /usr/local/bin | add-ons: staging -> players (`elite-release apply <id>`), mirror check |
| `elite-updater-mirrors` | /usr/local/bin | updater.json for every mirror |
| `dow2-patches-deploy` | /usr/local/bin | add-ons from the Dow2-patches repo into staging (its timer is off: releases are by hand) |
| `elite-dev`, `elite-devstatus` | /usr/local/bin | the /elite/dev/ status page |
| `elite-usage` | /usr/local/bin | anonymous launcher usage counts |

Every release: a changelog in `changelog/<version>/en.md` and a news item in the store's launcher.json ("news", {en, ru}) -
players read what changed in the launcher itself.
