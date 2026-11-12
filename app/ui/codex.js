// The Codex tab (1.5.8, owner 12.11.2026 - the testers asked): the reference of the Elite version - squads, heroes, weapons,
// abilities, buildings, economy. A site per Elite version on our mirrors, downloaded the first time the tab is opened and kept
// on the disk for offline use (codex.rs), shown in a frame (its own RU/EN switch, search, compare, theme). Loaded after
// app.js (its T, t, esc, invoke, S, lang, $).
'use strict';
Object.assign(T.en, {
  codexTab: 'Codex', codexTitle: 'Codex', codexLoading: 'Opening the Codex of Elite {v}…', codexBuilt: 'built {d}',
  codexOtherNote: 'you have Elite {mine}: some numbers may differ', codexOffline: 'saved copy, no connection',
  codexStale: 'a newer build could not be downloaded', codexNone: 'There is no Codex for Elite {v} yet.',
  codexNoGame: 'Elite is not installed yet.', codexOpenOther: 'Open the Codex of {t}',
  codexOfflineNone: 'The Codex is downloaded the first time it is opened, and our servers can not be reached now. Check the connection and try again.',
  codexErr: 'Could not download the Codex: {e}', codexRetry: 'Try again', codexNoApp: 'The Codex opens in the launcher on a computer.',
});
Object.assign(T.ru, {
  codexTab: 'Справочник', codexTitle: 'Справочник', codexLoading: 'Открываю справочник Elite {v}…', codexBuilt: 'собран {d}',
  codexOtherNote: 'у вас Elite {mine}: часть чисел может отличаться', codexOffline: 'сохранённая копия, нет связи',
  codexStale: 'не удалось скачать более новую сборку', codexNone: 'Справочника для Elite {v} пока нет.',
  codexNoGame: 'Elite ещё не установлена.', codexOpenOther: 'Открыть справочник {t}',
  codexOfflineNone: 'Справочник скачивается при первом открытии, а наши серверы сейчас недоступны. Проверьте связь и попробуйте ещё раз.',
  codexErr: 'Не удалось скачать справочник: {e}', codexRetry: 'Попробовать ещё раз', codexNoApp: 'Справочник открывается в лаунчере на компьютере.',
});
Object.assign(T.es, {
  codexTab: 'Códex', codexTitle: 'Códex', codexLoading: 'Abriendo el Códex de Elite {v}…', codexBuilt: 'generado el {d}',
  codexOtherNote: 'tienes Elite {mine}: algunos números pueden variar', codexOffline: 'copia guardada, sin conexión',
  codexStale: 'no se pudo descargar una versión más nueva', codexNone: 'Aún no hay Códex para Elite {v}.',
  codexNoGame: 'Elite aún no está instalado.', codexOpenOther: 'Abrir el Códex de {t}',
  codexOfflineNone: 'El Códex se descarga la primera vez que se abre y ahora no se puede llegar a nuestros servidores. Comprueba la conexión e inténtalo de nuevo.',
  codexErr: 'No se pudo descargar el Códex: {e}', codexRetry: 'Reintentar', codexNoApp: 'El Códex se abre en el launcher del ordenador.',
});
Object.assign(T.fr, {
  codexTab: 'Codex', codexTitle: 'Codex', codexLoading: 'Ouverture du Codex d\'Elite {v}…', codexBuilt: 'généré le {d}',
  codexOtherNote: 'vous avez Elite {mine} : certains chiffres peuvent différer', codexOffline: 'copie enregistrée, pas de connexion',
  codexStale: 'une version plus récente n\'a pas pu être téléchargée', codexNone: 'Pas encore de Codex pour Elite {v}.',
  codexNoGame: 'Elite n\'est pas encore installé.', codexOpenOther: 'Ouvrir le Codex de {t}',
  codexOfflineNone: 'Le Codex est téléchargé à la première ouverture, et nos serveurs sont injoignables pour le moment. Vérifiez la connexion et réessayez.',
  codexErr: 'Impossible de télécharger le Codex : {e}', codexRetry: 'Réessayer', codexNoApp: 'Le Codex s\'ouvre dans le launcher sur un ordinateur.',
});
Object.assign(T.de, {
  codexTab: 'Codex', codexTitle: 'Codex', codexLoading: 'Codex von Elite {v} wird geöffnet…', codexBuilt: 'erstellt am {d}',
  codexOtherNote: 'du hast Elite {mine}: manche Werte können abweichen', codexOffline: 'gespeicherte Kopie, keine Verbindung',
  codexStale: 'eine neuere Fassung konnte nicht geladen werden', codexNone: 'Für Elite {v} gibt es noch keinen Codex.',
  codexNoGame: 'Elite ist noch nicht installiert.', codexOpenOther: 'Codex von {t} öffnen',
  codexOfflineNone: 'Der Codex wird beim ersten Öffnen geladen, und unsere Server sind gerade nicht erreichbar. Prüfe die Verbindung und versuche es erneut.',
  codexErr: 'Codex konnte nicht geladen werden: {e}', codexRetry: 'Erneut versuchen', codexNoApp: 'Der Codex öffnet sich im Launcher auf dem Computer.',
});

// what the frame shows now: the Elite version it was asked for and the site's language (the site knows RU and EN)
const CX = { busy: false, ok: false, ver: null, lang: '' };
const codexVer = () => (S && (S.installed_version || S.target_version)) || '';
const codexLang = () => lang === 'ru' ? 'ru' : 'en';
// for the eye: 3.2.1.0.0 -> 3.2.1 (the zero parts after the third say nothing to a player; the version is the same, see verSame)
const codexShow = v => { const p = String(v || '').split('.'); while (p.length > 3 && /^0+$/.test(p[p.length - 1])) p.pop(); return p.join('.'); };
function codexMsg(html) {
  const m = $('codexMsg');
  m.innerHTML = html;
  m.classList.remove('hidden');
  $('codexFrame').classList.add('hidden');
  m.querySelectorAll('[data-cx]').forEach(b => b.onclick = () => { CX.ok = false; codexOpen(b.dataset.cx === 'any'); });
}
async function codexOpen(any) {
  if (CX.busy) return;
  const ver = codexVer(), wl = codexLang();
  if (CX.ok && CX.ver === ver && CX.lang === wl) return;   // it shows this one already: the player stays on his page
  CX.busy = true;
  $('codexNote').textContent = '';
  codexMsg(`<div class="codex-spin" aria-hidden="true"></div><div>${esc(t('codexLoading', { v: codexShow(ver) || '…' }))}</div>`);
  let r;
  try { r = await invoke('codex_open', { ver, any: !!any || !ver }); } catch (e) { r = { ok: false, why: 'app' }; }
  CX.busy = false;
  CX.ver = ver; CX.lang = wl; CX.ok = !!(r && r.ok);
  if (CX.ok) {
    const f = $('codexFrame');
    f.src = r.url + '?lang=' + wl + '&theme=dark';
    f.classList.remove('hidden');
    $('codexMsg').classList.add('hidden');
    const bits = [r.title || ('Elite ' + r.id)];
    if (r.built) bits.push(t('codexBuilt', { d: r.built }));
    if (!r.exact && ver) bits.push(t('codexOtherNote', { mine: codexShow(ver) }));
    if (r.offline) bits.push(t('codexOffline')); else if (r.stale) bits.push(t('codexStale'));
    $('codexNote').textContent = bits.join(' · ');
    return;
  }
  const retry = `<button class="btn small" data-cx="again">${esc(t('codexRetry'))}</button>`;
  const why = (r && r.why) || 'error';
  if (why === 'app') codexMsg(`<div>${esc(t('codexNoApp'))}</div>`);
  else if (why === 'none') {
    const o = (r.others || [])[0];
    codexMsg(`<div>${esc(ver ? t('codexNone', { v: codexShow(ver) }) : t('codexNoGame'))}</div>`
      + (o ? `<button class="btn gold small" data-cx="any">${esc(t('codexOpenOther', { t: o.title || ('Elite ' + o.id) }))}</button>` : ''));
  } else if (why === 'offline') codexMsg(`<div>${esc(t('codexOfflineNone'))}</div>${retry}`);
  else codexMsg(`<div>${esc(t('codexErr', { e: r.error || '' }))}</div>${retry}`);
}
document.querySelector('.tab[data-view="codex"]').addEventListener('click', () => codexOpen(false));
