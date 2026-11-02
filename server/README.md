# Launcher API (`server/`)

The launcher's own server part. Whatever is in `server/` on `main` runs at

    https://rts.fintebtc.de/launcher-api/…   (also https://dow2.fintebtc.de/… and https://dow2ru.fintebtc.de/… - Moscow)

## Deploy

Push to `main` (directly or by merging a PR). The server checks GitHub every 20 s; when `server/` changed it

1. unpacks `server/` into a new release folder, makes a fresh venv (Python 3.13) and runs `pip install -r requirements.txt`;
2. switches to it and restarts the app;
3. waits up to 45 s for `GET /healthz` → 200. Not healthy → the previous build is switched back and keeps running.

Status of the last deploy (public): https://rts.fintebtc.de/launcher-api/_deploy/ (`deploy.json`),
`deploy.log`, `build.log` (pip output).
App journal and state (password from the owner, user `siritos`): https://rts.fintebtc.de/launcher-api/_ops/ (`status.txt`, `log.txt`).

## The contract

- Start: `server/run.sh` if it exists and is executable, else `python main.py` (in the venv), working dir = the release.
- Listen on `$HOST:$PORT` (127.0.0.1:8930). Nginx forwards `/launcher-api/…` with the path unchanged (`$PUBLIC_PREFIX`).
- `GET /healthz` must answer 200 within 45 s of the start.
- Persistent data: `$DATA_DIR` (kept across deploys). Everything else is replaced on every deploy.
- Visitor's address: `X-Real-IP`.
- Other env: `PUBLIC_URL`, `LADDER_URL` (https://rts.fintebtc.de - the ladder's public API, e.g. `/ladder/api/mm/live`).

## The sandbox (why something "does not work")

The app runs as its own user in a systemd sandbox on a separate 10 GB disk. Inside it may do anything; it can't touch
anything else on the server:

- files: only its own disk is writable; other projects' folders aren't even visible; `/tmp` is 256 MB in memory;
- network: out to the internet over TCP/UDP-DNS; to this server only its public web (80/443 - nginx, e.g. the ladder's
  public API); no localhost/LAN/docker addresses, no mail ports, no unix sockets; ≤ 20 new connections/s;
- limits: 1 GB RAM, 2 CPUs, 128 tasks; one listening port (8930);
- responses: nginx strips cookies both ways and adds `Content-Security-Policy: sandbox`, so pages served from here can't
  run scripts against the site - it's an API (JSON), the launcher talks to it from Rust.

Needs more (a database of the ladder, a secret, another port, a domain)? Ask the owner - it's set up on the server side.

## Client releases (the launcher itself)

Every push to `main` with a new version (`Cargo.toml` + `app/tauri.conf.json` + `changelog/<version>/en.md`) becomes a
GitHub Release `vX.Y.Z` (CI: `.github/workflows/build.yml`). Within ~2 min the server copies it to the mirrors after
checking the self-update signatures (key `keys/updater.pub`, pinned on the server: a changed key is rejected) and the
launchers offer the update. The same version again publishes nothing - raise the version.

The game add-ons (DLLs, `Dow2-patches`) and the store (`launcher.json`) are released by the owner only.
