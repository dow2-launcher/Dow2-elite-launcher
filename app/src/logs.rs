//! Send logs: our DLLs' and the game's fresh logs to the developers.
//! Split out of main.rs (1.6.17): the items as they were; main.rs keeps the app's state, settings, config and main().
use super::*;

/// «Отправить логи»: логи наших DLL (Elite_DLLs) и свежие логи игры из «Документов» уходят на сервер,
/// оттуда — разработчику. Каждый файл обрезается до последних 3 МБ.
#[tauri::command]
pub async fn send_logs(app: AppHandle, who: String, what: Option<String>) -> Result<String, String> {
    let nettest = what.as_deref() == Some("nettest");   // 1.4.16: "Send to the developers" of the connection test
    let st = app.state::<App>();
    let dir = game_dir(&st);
    let installed = dir.as_ref().map(|d| update::Game::new(d).load_state()).unwrap_or_default();
    let uid = fb_uid(&st);
    let running = st.game_running.load(Ordering::Relaxed);
    let fb_name = st.settings.lock().unwrap().fb_name.clone();
    let elite_v = installed.version.clone();
    let comps: Vec<String> = {
        let cfg = st.config.lock().unwrap().clone().unwrap_or_default();
        let s = st.settings.lock().unwrap().clone();
        cfg.components.iter().map(|c| match dir.as_ref() {
            Some(d) => {
                let on = s.components.get(&c.id).copied().unwrap_or(c.on_by_default());
                let have = update::Game::component(d, &c.id).load_state().version;
                let conf = found_conflicts(d, c);
                let dll = !c.inject.is_empty() && d.join("Elite_DLLs").join(&c.inject).is_file();
                let injected = !c.inject.is_empty() && std::fs::read_to_string(d.join(elite::LAUNCHCONFIG)).map(|t| t.lines()
                    .any(|l| l.strip_prefix("InjectedFiles=").map_or(false, |r| r.split(',').any(|x| x.trim().eq_ignore_ascii_case(&c.inject))))).unwrap_or(false);
                let van = update::Game::vanilla_component(d, &c.id).load_state().version;
                format!("{}: {} (latest {}, installed {}{}{}{}{})", c.id, if on { "ON" } else { "off" }, c.version,
                    if have.is_empty() { "-" } else { &have }, if dll { ", dll" } else { "" }, if injected { ", injected" } else { "" },
                    if van.is_empty() { String::new() } else { format!(", vanilla copy {van}") },
                    if conf.is_empty() { String::new() } else { format!(", hand-installed copy: {}", conf.join(" ")) })
            }
            None => format!("{}: {}", c.id, c.version),
        }).chain(std::iter::once(format!("game: {}{}", dir.as_ref().and_then(|d| copies_game(d, &cfg, &s)).unwrap_or_else(|| "elite".into()),
            dir.as_ref().map(|d| { let l = update::Game::vanilla_loader(d); let v = l.load_state().version;
                if v.is_empty() { String::new() } else { format!(" (vanilla loader {v}{})", if l.file_is_installed("winmm.dll") { ", in place" } else { ", not in place" }) } }).unwrap_or_default())))
        .collect()
    };
    let mac_cfg = st.config.lock().unwrap().clone().unwrap_or_default();
    tauri::async_runtime::spawn_blocking(move || {
        let patches = dir.as_ref().and_then(|d| std::fs::read_dir(d.join("dow2-patches")).ok()).map(|rd| {
            let mut v: Vec<String> = rd.flatten().map(|e| e.file_name().to_string_lossy().to_string()).collect(); v.sort(); v.join(" ") }).unwrap_or_default();
        // 1.4.2: every DLL-like file in Elite_DLLs with its size - what the game can load (players' logs: X.dll.off files
        // among the modules were only seen in a Windows error report)
        let elite_dlls = dir.as_ref().and_then(|d| std::fs::read_dir(d.join("Elite_DLLs")).ok()).map(|rd| {
            let mut v: Vec<String> = rd.flatten().filter(|e| e.path().is_file()).filter_map(|e| {
                let n = e.file_name().to_string_lossy().to_string();
                let l = n.to_ascii_lowercase();
                (l.ends_with(".dll") || l.contains(".dll.") || l.ends_with(".off") || l.ends_with(".asi"))
                    .then(|| format!("{n} ({})", e.metadata().map(|m| m.len()).unwrap_or(0)))
            }).collect();
            v.sort_by_key(|x| x.to_ascii_lowercase()); v.join(", ") }).unwrap_or_default();
        let mut out = format!("Elite Launcher {} · {} · Elite {} ({})\nadd-ons:\n  {}\ngame: {}\ndow2-patches: {}\nElite_DLLs: {}\n\n",
            LAUNCHER_VERSION, os_name(), installed.version, installed.channel, comps.join("\n  "),
            dir.as_ref().map(|d| d.display().to_string()).unwrap_or_default(), if patches.is_empty() { "-" } else { &patches },
            if elite_dlls.is_empty() { "-" } else { &elite_dlls });
        // всё, что может помочь понять краш: логи дополнений, логи игры, дампы, отчёты Windows об ошибках
        let mut files: Vec<PathBuf> = Vec::new();
        let recent = |p: &std::path::Path, days: u64| std::fs::metadata(p).and_then(|m| m.modified()).ok()
            .and_then(|m| m.elapsed().ok()).map(|e| e.as_secs() < days * 86400).unwrap_or(false);
        let ext_of = |p: &std::path::Path| p.extension().and_then(|x| x.to_str()).unwrap_or("").to_ascii_lowercase();
        // файлы каталога (с подкаталогами до depth), новые сначала
        fn walk(root: &std::path::Path, depth: u32, out: &mut Vec<(std::time::SystemTime, PathBuf)>) {
            let Ok(rd) = std::fs::read_dir(root) else { return };
            for e in rd.flatten() {
                let p = e.path(); let Ok(md) = e.metadata() else { continue };
                if md.is_dir() { if depth > 0 { walk(&p, depth - 1, out); } continue; }
                out.push((md.modified().unwrap_or(std::time::UNIX_EPOCH), p));
            }
        }
        let mut take = |root: PathBuf, depth: u32, exts: &[&str], days: u64, max: usize, files: &mut Vec<PathBuf>| {
            let mut v = Vec::new(); walk(&root, depth, &mut v);
            v.retain(|(_, p)| exts.contains(&ext_of(p).as_str()) && recent(p, days));
            v.sort_by(|a, b| b.0.cmp(&a.0));
            files.extend(v.into_iter().take(max).map(|x| x.1));
        };
        if let Some(d) = &dir {
            take(d.join("Elite_DLLs"), 0, &["log", "ini", "txt", "dmp"], 30, 40, &mut files);
            take(d.join(update::VANILLA_DIR), 0, &["log", "ini", "txt", "dmp"], 30, 40, &mut files);   // 1.4.11: the vanilla game's add-ons
            take(d.clone(), 0, &["log", "txt", "dmp", "mdmp", "launchconfig"], 7, 20, &mut files);
        }
        if os_name() == "macos" {
            // 10.11.2026, the Mac game: crossplay_fix's logs in /tmp, the add-ons' ini/logs, Feral's syncerror/warnings files
            for f in elite_core::macos::TMP_LOGS { let p = PathBuf::from(f); if p.is_file() && recent(&p, 7) { files.push(p); } }
            take(mac_addons_root(), 1, &["log", "ini", "txt"], 30, 40, &mut files);
            if let Some(h) = dirs::home_dir() { files.extend(elite_core::macos::game_logs(&h, 3, 20)); }
            // 16.11.2026: the game's own output (the launcher starts it) and what was found of Steam and the game
            let gl = data_dir().join("mac_game.log");
            if gl.is_file() && recent(&gl, 7) { files.push(gl); }
            out += &format!("mac: {}\n\n", mac_status(dir.as_deref(), &mac_cfg));
        }
        take(data_dir(), 0, &["log", "old"], 30, 4, &mut files);   // the launcher's own: community.log (Steam sign-in, chat)
        for f in conntest::share_files() { if !files.contains(&f) { files.push(f); } }   // 1.4.16: the connection test's runs and log
        // Linux under Proton: the game's Documents are inside its prefix (compatdata/56400/pfx/.../steamuser/Documents)
        let doc = dir.as_ref().and_then(|d| elite_core::proton::prefix_documents(d, 56400)).or_else(elite_core::game::documents_dir);
        if let Some(doc) = doc {
            take(doc.join("My Games").join("Dawn of War II - Retribution"), 3, &["txt", "log", "dmp", "mdmp", "xml", "ini"], 3, 40, &mut files);
            // 1.5.7: the game's own settings (resolution, uiscale) - to see why "UI scale" does nothing for a player
            let cfg = doc.join("My Games").join("Dawn of War II - Retribution").join("Settings").join("configuration.lua");
            if cfg.is_file() && !files.contains(&cfg) { files.push(cfg); }
        }
        { let mut seen = std::collections::HashSet::new(); files.retain(|p| seen.insert(p.clone())); }   // the Mac's Feral logs are found twice
        // дампы и отчёты Windows (WER) о падениях игры
        let is_game = |p: &std::path::Path| { let s = p.to_string_lossy().to_ascii_lowercase(); s.contains("dow2") || s.contains("elite") };
        let mut wer_roots: Vec<PathBuf> = Vec::new();
        if let Some(la) = dirs::data_local_dir() {
            let mut v = Vec::new(); walk(&la.join("CrashDumps"), 0, &mut v);
            let starter = |p: &std::path::Path| p.file_name().map(|x| x.to_string_lossy().to_ascii_lowercase()).map_or(false, |n| n.starts_with("elite.exe") || n.starts_with("elite_test.exe"));
            v.retain(|(_, p)| is_game(p) && !starter(p) && recent(p, 7)); v.sort_by(|a, b| b.0.cmp(&a.0));
            files.extend(v.into_iter().take(2).map(|x| x.1));
            wer_roots.push(la.join("Microsoft").join("Windows").join("WER"));
        }
        wer_roots.push(PathBuf::from(std::env::var("ProgramData").unwrap_or_else(|_| "C:\\ProgramData".into())).join("Microsoft").join("Windows").join("WER"));
        for w in wer_roots {
            for q in ["ReportArchive", "ReportQueue"] {
                let mut v = Vec::new(); walk(&w.join(q), 1, &mut v);
                v.retain(|(_, p)| is_game(p.parent().unwrap_or(p)) && recent(p, 7) && ["wer", "txt", "xml", "csv"].contains(&ext_of(p).as_str()));
                v.sort_by(|a, b| b.0.cmp(&a.0));
                files.extend(v.into_iter().take(12).map(|x| x.1));
            }
        }
        // инкремент: метки «сколько уже отправлено» по каждому растущему .log (data_dir/log_sent.json)
        let marks: serde_json::Map<String, Value> = std::fs::read(data_dir().join("log_sent.json")).ok()
            .and_then(|b| serde_json::from_slice::<Value>(&b).ok())
            .and_then(|v| v.as_object().cloned())
            .unwrap_or_default();
        let mut newmarks: serde_json::Map<String, Value> = serde_json::Map::new();
        let mut n = 0; let mut total = 0usize;
        let mut sent_dumps: Vec<PathBuf> = Vec::new(); let mut sent_addon_logs: Vec<PathBuf> = Vec::new();
        for f in files {
            let Ok(b) = std::fs::read(&f) else { continue };
            if total > 30 << 20 { out += &format!("=== {} ({} bytes) — skipped, upload is full ===\n", f.display(), b.len()); continue; }
            let ext = ext_of(&f);
            if ext == "dmp" || ext == "mdmp" {
                use base64::Engine;
                let fname = f.file_name().map(|x| x.to_string_lossy().to_ascii_lowercase()).unwrap_or_default();
                if fname.starts_with("elite.exe") || fname.starts_with("elite_test.exe") { continue; }
                let key = f.display().to_string();
                if marks.get(&key).and_then(|v| v.as_array()).and_then(|a| a.first()).and_then(|x| x.as_u64()) == Some(b.len() as u64) { continue; }
                newmarks.insert(key, serde_json::json!([b.len() as u64, "dump"]));
                sent_dumps.push(f.clone());
                if b.len() > 12 << 20 { out += &format!("=== {} ({} bytes) — dump too big, skipped ===\n", f.display(), b.len()); continue; }
                out += &format!("=== {} ({} bytes, base64) ===\n", f.display(), b.len());
                out += &base64::engine::general_purpose::STANDARD.encode(&b);
                total += b.len() * 4 / 3;
            } else {
                let is_u16 = b.len() >= 2 && b[0] == 0xFF && b[1] == 0xFE;
                let key = f.display().to_string();
                // растущие .log (и крупные .txt) шлём инкрементно: только добавленное с прошлой удачной отправки.
                // ротацию/обрезание ловим по отпечатку начала файла; UTF-16-отчёты WER шлём целиком.
                let incr = !is_u16 && (ext == "log" || (ext == "txt" && b.len() > (256 << 10)));
                let prefix: String = b.iter().take(32).map(|x| format!("{:02x}", x)).collect();
                let mut start = 0usize;
                if incr {
                    if let Some(a) = marks.get(&key).and_then(|v| v.as_array()) {
                        let plen = a.first().and_then(|x| x.as_u64()).unwrap_or(0) as usize;
                        if a.get(1).and_then(|x| x.as_str()) == Some(prefix.as_str()) && plen <= b.len() { start = plen; }
                    }
                    newmarks.insert(key.clone(), serde_json::json!([b.len() as u64, prefix]));
                }
                let text = if is_u16 {
                    let u: Vec<u16> = b[2..].chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
                    String::from_utf16_lossy(&u)
                } else { String::from_utf8_lossy(&b[start..]).into_owned() };
                let cap = 256usize << 10;
                let tail = if text.len() > cap { let mut k = text.len() - cap; while !text.is_char_boundary(k) { k += 1; } &text[k..] } else { &text[..] };
                if ext == "log" && f.parent().and_then(|p| p.file_name()).map_or(false, |n| n.eq_ignore_ascii_case("Elite_DLLs")) { sent_addon_logs.push(f.clone()); }
                if incr && start > 0 && tail.is_empty() { continue; }   // с прошлой отправки ничего нового — файл не шлём
                let tag = if start > 0 { format!(", +{} new", b.len() - start) } else { String::new() };
                out += &format!("=== {} ({} bytes{}) ===\n", f.display(), b.len(), tag);
                out += tail; total += tail.len();
            }
            out += "\n\n"; n += 1;
        }
        // журнал Windows: падения игры (Application Error / WER)
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            let q = "*[System[(EventID=1000 or EventID=1001 or EventID=1002 or EventID=1026) and TimeCreated[timediff(@SystemTime) <= 604800000]]]";
            if let Ok(o) = std::process::Command::new("wevtutil").args(["qe", "Application", "/c:60", "/rd:true", "/f:text", &format!("/q:{q}")])
                .creation_flags(0x0800_0000).output() {
                // wevtutil writes text in the console's OEM code page (players' logs: Russian Windows came out as ������)
                let t = procs::oem_text(&o.stdout);
                let ev: Vec<&str> = t.split("Event[").filter(|e| { let l = e.to_ascii_lowercase(); l.contains("dow2") || l.contains("elite") }).collect();
                // Elite's own starter giving up waiting for the game's window (the game goes on) - not a game crash
                let starter = ev.iter().filter(|e| { let l = e.to_ascii_lowercase(); l.contains("elite.exe") && l.contains("78da5") }).count();
                out += &format!("=== Windows event log: game crashes, last 7 days ({} events{}) ===\n", ev.len(),
                    if starter > 0 { format!(", {starter} of them Elite.exe+0x78da5: Elite's starter did not see the game window in time, the game itself goes on") } else { String::new() });
                for e in ev { out += "Event["; out += e; }
                out += "\n\n"; n += 1;
            }
        }
        // 1.5.9: can the game write its folder in Documents? (Malum 12.11.2026: volume reset after every start, no replays
        // since 30.08.) The usual folder and the one of the add-on "Documents fix" (DocsFix.redirect) when it moved it; a write
        // test from the launcher (the game process checks itself in DocsFix.log); Controlled folder access and its blocks.
        {
            use elite_core::docscheck;
            let real_docs = dir.as_ref().and_then(|d| elite_core::proton::prefix_documents(d, 56400)).or_else(dirs::document_dir);
            let redirect = dir.as_deref().and_then(docscheck::docsfix_redirect);
            let mut lines: Vec<String> = Vec::new(); let mut sum: Vec<String> = Vec::new();
            if let Some(d) = &real_docs {
                let c = docscheck::check_folder(&d.join("My Games").join(docscheck::GAME_FOLDER));
                let w = |r: &Option<(i32, String)>| match r { None => "ok".to_string(), Some((c, _)) => format!("FAILED {c}") };
                sum.push(format!("launcher write test Settings {}, Playback {}; configuration.lua {}, temp.rec {}; game log started {}",
                    w(&c.settings_write), w(&c.playback_write), c.cfg.map(docscheck::utc).unwrap_or_else(|| "missing".into()),
                    c.rec.map(docscheck::utc).unwrap_or_else(|| "missing".into()), c.log_start));
                lines.push(format!("Documents: {}", d.display())); lines.extend(c.lines);
            } else { lines.push("Documents: not found".into()); sum.push("no Documents folder".into()); }
            match &redirect {
                Some(r) => { let c = docscheck::check_folder(&r.join("My Games").join(docscheck::GAME_FOLDER));
                    sum.push(format!("Documents fix ON: the game uses {}", r.display()));
                    lines.push(format!("Documents fix (DocsFix.redirect): the game's Documents is {}", r.display())); lines.extend(c.lines); }
                None => lines.push("Documents fix: not redirecting (no DocsFix.redirect next to DocsFix.dll)".into()),
            }
            let (cfa, allowed) = docscheck::controlled_folder_access();
            lines.push(format!("Controlled folder access (Windows Security > Ransomware protection): {cfa}; {allowed}"));
            let mut blocks = 0usize; let mut game_blocks: Vec<String> = Vec::new();
            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                // 1123 = blocked, 1124 = audited (would have been blocked); last 30 days, newest first; XML: field names are not translated
                let q = "*[System[(EventID=1123 or EventID=1124) and TimeCreated[timediff(@SystemTime) <= 2592000000]]]";
                match std::process::Command::new("wevtutil").args(["qe", "Microsoft-Windows-Windows Defender/Operational", "/c:200", "/rd:true", "/f:xml", &format!("/q:{q}")])
                    .creation_flags(0x0800_0000).output() {
                    Ok(o) if o.status.success() => {
                        let t = procs::oem_text(&o.stdout);
                        let field = |ev: &str, name: &str| ev.split(&format!("<Data Name='{name}'>")).nth(1).and_then(|x| x.split("</Data>").next()).unwrap_or("").to_string();
                        for ev in t.split("<Event ").skip(1) {
                            blocks += 1;
                            let id = ev.split("<EventID>").nth(1).and_then(|x| x.split('<').next()).unwrap_or("?");
                            let when = ev.split("SystemTime='").nth(1).and_then(|x| x.get(..16)).unwrap_or("?").replace('T', " ");
                            let (pr, path) = (field(ev, "Process Name"), field(ev, "Path"));
                            let l = format!("{pr} {path}").to_ascii_lowercase();
                            if l.contains("dow2") || l.contains("elite") || l.contains("dawn of war") {
                                game_blocks.push(format!("{when} UTC {} {pr} -> {path}", if id == "1124" { "audit" } else { "BLOCKED" }));
                            }
                        }
                        lines.push(format!("Controlled folder access events (1123 blocked / 1124 audit), last 30 days: {blocks}, of them the game / Elite: {}", game_blocks.len()));
                        for g in game_blocks.iter().take(12) { lines.push(format!("  {g}")); }
                    }
                    Ok(o) => lines.push(format!("Controlled folder access events: wevtutil failed: {}", procs::oem_text(&o.stderr).trim())),
                    Err(e) => lines.push(format!("Controlled folder access events: wevtutil did not start: {e}")),
                }
            }
            sum.push(format!("Controlled folder access {cfa}, {} blocks of the game in 30 days{}", game_blocks.len(),
                game_blocks.first().map(|g| format!(" (last {g})")).unwrap_or_default()));
            let _ = blocks;
            out += &format!("=== Documents check (launcher {LAUNCHER_VERSION}) ===\nDOCSCHECK_L {}\n{}\n\n", sum.join(" | "), lines.join("\n"));
            n += 1;
        }
        if n == 0 { return Err("no log files found yet — play once with the add-ons on, then send".into()); }
        let who: String = who.chars().filter(|c| c.is_alphanumeric() || "._-".contains(*c)).take(32).collect();
        let who = if who.is_empty() { "anon".to_string() } else { who };
        // куда слать логи — задаётся при сборке: ELITE_LOG_HOSTS="https://a;https://b" (в репозитории адресов нет)
        if reach::api_hosts().is_empty() { return Err("log upload is not configured in this build".into()); }
        // the active host first (reach.rs); the note to the developers' chat goes to the host that took the logs
        let (host, r) = reach::call_kind(reach::Kind::HeavyPost, "logs", |host| HTTP.post(&format!("{host}/stats/api/logs?who={who}&uid={uid}")).set("Content-Type", "text/plain; charset=utf-8")
            .send_bytes(out.as_bytes()).map(|r| (host.to_string(), r))).map_err(|last| format!("could not send logs: {last}"))?;
        let v: Value = serde_json::from_str(&r.into_string().unwrap_or_default()).unwrap_or_default();
        let note = json!({"uid": uid, "name": if fb_name.is_empty() { who.clone() } else { fb_name.clone() },
            "text": if nettest { format!("📶 Отправил проверку связи и логи · sent the connection test and logs: {} ({} files). Ответ придёт сюда · the answer comes here.", v["id"].as_str().unwrap_or("?"), n) }   // i18n-ok: both languages for the developers; the window shows it in the player's (app.js fbMsgText)
                    else { format!("📋 Отправил логи · sent logs: {} ({} files). Ответ придёт сюда · the answer comes here.", v["id"].as_str().unwrap_or("?"), n) },   // i18n-ok
            "launcher": LAUNCHER_VERSION, "os": os_name(), "elite": elite_v}).to_string();
        let _ = HTTP.post(&format!("{host}/ladder/api/fb/send")).timeout(Duration::from_secs(20))
            .set("Content-Type", "application/json").send_string(&note);
        // запомним, докуда дошли по каждому растущему логу — в следующий раз только новый хвост
        let _ = std::fs::write(data_dir().join("log_sent.json"), serde_json::to_vec(&Value::Object(newmarks.clone())).unwrap_or_default());
        if !running {
            for f in &sent_addon_logs { let _ = std::fs::OpenOptions::new().write(true).truncate(true).open(f); }
            for f in &sent_dumps { let _ = std::fs::remove_file(f); }
        }
        Ok(format!("{} ({} files)", v["id"].as_str().unwrap_or("ok"), n))
    })
    .await
    .map_err(|e| e.to_string())?
}
