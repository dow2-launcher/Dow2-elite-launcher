#!/usr/bin/env python3
"""The launcher's translations check (CI, `version` job). Exit 1 on any problem.

The UI texts live in the `T` dictionary (app/ui/app.js: `const T = { en: {...}, ru: {...}, ... }`) and in
`Object.assign(T.<lang>, {...})` blocks of the other UI scripts. The checks:

  1. every key is in all the languages (en, ru, es, fr, de);
  2. the {placeholders} of a key are the same in every language;
  3. no Cyrillic in the en/es/fr/de texts; an es/fr/de text of two or more words is not the English one copied
     (names and terms that stay English: SAME_AS_EN);
  4. no Cyrillic in the UI code outside the dictionaries (a Russian string in the code shows to everybody); allowed:
     the Russian-only maps `const <NAME>_RU = {...}` (used only when lang === 'ru') and a line marked `// i18n-ok`;
  5. every t('literal') key of the code is in the dictionary;
  6. index.html: no Cyrillic outside the language list's own names (Русский), every visible text comes from data-t;
  7. the Rust code (app/src, crates/*/src): no Cyrillic outside comments and #[cfg(test)] modules - a string from the
     backend that reaches the page is English, the page translates it (app.js errText);
  8. every error text of the Rust code (Err("..."), ok_or("..."), format!(...) in an error) has its row in app.js ERR_TXT;
  9. the codes the servers send (lroom.py errors, notes, the game's steps...) have their texts (SERVER_CODES below);
 10. events.json (the Events banner): a title / info is either without Cyrillic or has its "en";
 11. --store <launcher.json>: the add-on cards and their ticks - names English and the same in every language,
     descriptions and the texts of the choices in all five languages, no Cyrillic outside "ru".

  python3 scripts/i18n_check.py            the report, exit 1 on a problem
  python3 scripts/i18n_check.py --keys     also print the number of keys per language
  python3 scripts/i18n_check.py --store launcher.json    also check a store file (not in the repo: the owner's)
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UI = ROOT / "app" / "ui"
LANGS = ["en", "ru", "es", "fr", "de"]
CYR = re.compile(r"[Ѐ-ӿ]")
PH = re.compile(r"\{(\w+)\}")
# the language list shows each language by its own name
NATIVE_NAMES = {"Русский"}
# texts that are the same as the English ones on purpose (names, the players' terms)
SAME_AS_EN = {"win_vpc_hero", "race_ordo_malleus", "race_space_marines", "vanillaName", "netTry", "gnStreamOk", "gnTcpOk",
              "ntTcpOk", "addonChgVer", "gnUdpMs", "uiScale", "playCd"}
# the codes our servers send that the page shows by a key (prefix + code); keep in step with the ladder (lroom.py)
SERVER_CODES = {
    "e_": ["auth", "bad", "bad_map", "busy", "full", "kicked", "no_room", "not_ready", "obs", "obs_full", "owner", "state", "taken",
           "too_many", "too_many_players", "too_soon", "unknown"],
    "n_": ["cd_stop", "played", "gone", "left", "joined", "joined_obs", "unready", "changed", "conf", "kicked", "late", "version",
           "race", "left_search", "game_failed", "match", "cancel"],
    "race_": ["random", "chaos_marines", "eldar", "imperial_guard", "ordo_malleus", "orks", "space_marines", "t_tau", "tyranids"],
    "win_": ["vpc", "annihilate", "annihilate_hero", "vpc_hero"],
    "start_": ["fixed", "random"],
    "res_": ["standard", "high"],
    "opt_": ["win", "vp", "start", "res"],
    "g_": ["starting", "waiting_game", "accepted", "walking", "army", "searching", "matched", "room", "in_room", "loading", "playing", "failed"],
}


# ---------- a small JavaScript tokenizer: strings, templates, regexes, comments ----------
class Tok:
    __slots__ = ("kind", "val", "start", "end")

    def __init__(self, kind, val, start, end):
        self.kind, self.val, self.start, self.end = kind, val, start, end

    def __repr__(self):
        return f"{self.kind}:{self.val!r}"


IDENT = re.compile(r"[A-Za-z_$][\w$]*")
NUM = re.compile(r"\d[\w.]*")
REGEX_AFTER = set("(,=:[!&|?{};+-*%<>~^") | {"return", "typeof", "case", "do", "else", "in", "of", "=>", "void", "delete", "new"}
PUNCT3 = ["===", "!==", "**=", "...", ">>>", "<<=", ">>=", "&&=", "||=", "??="]
PUNCT2 = ["=>", "==", "!=", "<=", ">=", "&&", "||", "??", "?.", "++", "--", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<", ">>", "**"]
ESC = {"n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f", "v": "\v", "0": "\0"}


def _string(src, i, q):
    j, out = i + 1, []
    while j < len(src):
        c = src[j]
        if c == "\\":
            n = src[j + 1]
            if n == "u":
                if src[j + 2] == "{":
                    k = src.index("}", j)
                    out.append(chr(int(src[j + 3:k], 16)))
                    j = k + 1
                else:
                    out.append(chr(int(src[j + 2:j + 6], 16)))
                    j += 6
                continue
            if n == "x":
                out.append(chr(int(src[j + 2:j + 4], 16)))
                j += 4
                continue
            if n == "\n":
                j += 2
                continue
            out.append(ESC.get(n, n))
            j += 2
            continue
        if c == q:
            return "".join(out), j + 1
        out.append(c)
        j += 1
    raise SyntaxError(f"unterminated string at {i}")


def tokenize(src):
    """Tokens of the code; a template literal gives a "tpl" token per text chunk, its ${...} parts are tokenized too."""
    toks = []
    i, n = 0, len(src)
    stack = []          # the brace depth at each open ${ of a template

    def prev_allows_regex():
        if not toks:
            return True
        p = toks[-1]
        return (p.kind == "punct" and p.val in REGEX_AFTER) or (p.kind == "ident" and p.val in REGEX_AFTER) or p.kind == "tplopen"

    depth = 0

    def template(i):
        # from just after ` (or after the } of a ${...}): a text chunk up to ` or ${
        j, out = i, []
        while j < n:
            c = src[j]
            if c == "\\":
                out.append(ESC.get(src[j + 1], src[j + 1]))
                j += 2
                continue
            if c == "`":
                toks.append(Tok("tpl", "".join(out), i, j))
                return j + 1, False
            if c == "$" and src[j + 1:j + 2] == "{":
                toks.append(Tok("tpl", "".join(out), i, j))
                toks.append(Tok("tplopen", "${", j, j + 2))
                return j + 2, True
            out.append(c)
            j += 1
        raise SyntaxError("unterminated template")

    while i < n:
        c = src[i]
        if c in " \t\r\n":
            i += 1
            continue
        if src.startswith("//", i):
            k = src.find("\n", i)
            i = n if k < 0 else k
            continue
        if src.startswith("/*", i):
            i = src.index("*/", i + 2) + 2
            continue
        if c in "'\"":
            v, j = _string(src, i, c)
            toks.append(Tok("str", v, i, j))
            i = j
            continue
        if c == "`":
            i, opened = template(i + 1)
            if opened:
                stack.append(depth)
            continue
        if c == "}" and stack and stack[-1] == depth:
            stack.pop()
            i, opened = template(i + 1)
            if opened:
                stack.append(depth)
            continue
        if c == "/" and prev_allows_regex():
            j, cls = i + 1, False
            while j < n:
                d = src[j]
                if d == "\\":
                    j += 2
                    continue
                if d == "[":
                    cls = True
                elif d == "]":
                    cls = False
                elif d == "/" and not cls:
                    break
                elif d == "\n":
                    raise SyntaxError(f"bad regex at {i}")
                j += 1
            j += 1
            m = IDENT.match(src, j)
            if m:
                j = m.end()
            toks.append(Tok("regex", src[i:j], i, j))
            i = j
            continue
        m = IDENT.match(src, i)
        if m:
            toks.append(Tok("ident", m.group(), i, m.end()))
            i = m.end()
            continue
        m = NUM.match(src, i)
        if m:
            toks.append(Tok("num", m.group(), i, m.end()))
            i = m.end()
            continue
        for p in PUNCT3 + PUNCT2:
            if src.startswith(p, i):
                toks.append(Tok("punct", p, i, i + len(p)))
                i += len(p)
                break
        else:
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            toks.append(Tok("punct", c, i, i + 1))
            i += 1
    return toks


# ---------- the dictionaries ----------
def parse_obj(toks, k):
    """toks[k] is '{' of an object literal of strings / objects. Returns ({key: value}, index after '}', end offset);
    a value that is not a string (or strings joined with +) nor such an object is None."""
    assert toks[k].val == "{"
    out, k = {}, k + 1
    while True:
        t = toks[k]
        if t.val == "}":
            return out, k + 1, t.end
        if t.val == ",":
            k += 1
            continue
        if t.kind in ("ident", "str", "num"):
            key = t.val
        else:
            raise SyntaxError(f"bad key {t} at {t.start}")
        k += 1
        if toks[k].val != ":":
            raise SyntaxError(f"no ':' after key {key!r} at {toks[k].start}")
        k += 1
        if toks[k].val == "{":
            v, k, _ = parse_obj(toks, k)
            out[key] = v
            continue
        parts, ok = [], True
        while True:
            t = toks[k]
            if t.kind == "str":
                parts.append(t.val)
                k += 1
            elif t.kind == "tpl" and toks[k + 1].kind != "tplopen":
                parts.append(t.val)
                k += 1
            else:
                ok = False
                break
            if toks[k].val == "+":
                k += 1
                continue
            break
        if not ok:          # something else: skip to the next ',' / '}' of this level
            d = 0
            while True:
                t = toks[k]
                if t.val in "([{" or t.kind == "tplopen":
                    d += 1
                elif t.val in ")]}":
                    if d == 0:
                        break
                    d -= 1
                elif t.val == "," and d == 0:
                    break
                k += 1
            out[key] = None
            continue
        out[key] = "".join(parts)


def dictionaries(path, src, toks):
    """[(lang, {key: text}, start, end)] and the spans of the Russian-only maps."""
    dicts, ru_only = [], []
    for k, t in enumerate(toks):
        # const T = { en: {...}, ... }
        if t.val == "const" and toks[k + 1].val == "T" and toks[k + 2].val == "=" and toks[k + 3].val == "{":
            j = k + 4
            while toks[j].val != "}":
                if toks[j].val == ",":
                    j += 1
                    continue
                lang = toks[j].val
                if lang not in LANGS or toks[j + 1].val != ":" or toks[j + 2].val != "{":
                    raise SyntaxError(f"{path.name}: T.{lang} is not a language dictionary")
                start = toks[j + 2].start
                d, j, end = parse_obj(toks, j + 2)
                dicts.append((lang, d, start, end))

        # Object.assign(T.xx, { ... })
        if t.val == "Object" and toks[k + 1].val == "." and toks[k + 2].val == "assign" and toks[k + 3].val == "(" \
                and toks[k + 4].val == "T" and toks[k + 5].val == "." and toks[k + 7].val == "," and toks[k + 8].val == "{":
            lang = toks[k + 6].val
            if lang not in LANGS:
                raise SyntaxError(f"{path.name}: Object.assign(T.{lang}, ...): not a language")
            obj, _, end = parse_obj(toks, k + 8)
            dicts.append((lang, obj, toks[k + 8].start, end))
        # const SOMETHING_RU = { ... }: shown only when lang === 'ru'
        if t.val in ("const", "let") and toks[k + 1].kind == "ident" and toks[k + 1].val.endswith("_RU") \
                and toks[k + 2].val == "=" and toks[k + 3].val == "{":
            _, _, end = parse_obj(toks, k + 3)
            ru_only.append((toks[k + 3].start, end))
    return dicts, ru_only


def line_of(src, off):
    return src.count("\n", 0, off) + 1


def check_ui(problems, report_keys=False):
    texts = {l: {} for l in LANGS}
    where = {}
    used = []
    for path in sorted(UI.glob("*.js")):
        src = path.read_text(encoding="utf-8")
        try:
            toks = tokenize(src)
            dicts, ru_only = dictionaries(path, src, toks)
        except (SyntaxError, IndexError, ValueError) as e:
            problems.append(f"{path.name}: cannot read the dictionaries: {e}")
            continue
        spans = [(s, e) for _, _, s, e in dicts] + ru_only
        for lang, d, s, _ in dicts:
            for key, v in d.items():
                if v is None:
                    problems.append(f"{path.name}:{line_of(src, s)}: T.{lang}.{key} is not a plain string")
                    continue
                if key in texts[lang] and texts[lang][key] != v:
                    problems.append(f"{path.name}:{line_of(src, s)}: T.{lang}.{key} is defined twice with different texts")
                texts[lang][key] = v
                where.setdefault(key, f"{path.name}:{line_of(src, s)}")
        lines = src.split("\n")
        for t in toks:
            if t.kind in ("str", "tpl") and CYR.search(t.val):
                if any(s <= t.start < e for s, e in spans):
                    continue
                ln = line_of(src, t.start)
                if "i18n-ok" in lines[ln - 1]:
                    continue
                problems.append(f"{path.name}:{ln}: Russian text in the code (put it into the dictionaries): {t.val[:80]!r}")
        # t('key') / t("key")
        for k, t in enumerate(toks[:-2]):
            if t.kind == "ident" and t.val == "t" and toks[k + 1].val == "(" and toks[k + 2].kind == "str" \
                    and toks[k + 3].val in (")", ",") and (k == 0 or toks[k - 1].val != "."):
                used.append((toks[k + 2].val, f"{path.name}:{line_of(src, t.start)}"))
    allkeys = set().union(*[set(d) for d in texts.values()])
    for key in sorted(allkeys):
        miss = [l for l in LANGS if key not in texts[l]]
        if miss:
            problems.append(f"{where.get(key, '?')}: key {key!r} is missing in: {', '.join(miss)}")
        have = [l for l in LANGS if key in texts[l]]
        ph = {l: set(PH.findall(texts[l][key])) for l in have}
        ref = ph.get("en", ph[have[0]])
        for l in have:
            if ph[l] != ref:
                problems.append(f"{where.get(key, '?')}: key {key!r}: placeholders {sorted(ph[l])} in {l}, {sorted(ref)} in en")
        if "en" in texts and key in texts["en"] and key not in SAME_AS_EN:
            words = re.findall(r"[A-Za-z]{2,}", PH.sub("", texts["en"][key]))
            for l in ("es", "fr", "de"):
                if len(words) >= 2 and texts[l].get(key) == texts["en"][key]:
                    problems.append(f"{where.get(key, '?')}: key {key!r}: T.{l} is the English text copied: {texts['en'][key][:60]!r}")
        for l in have:
            if l != "ru" and CYR.search(texts[l][key]):
                problems.append(f"{where.get(key, '?')}: key {key!r}: Russian text in T.{l}: {texts[l][key][:80]!r}")
    for key, at in used:
        if key not in texts["en"]:
            problems.append(f"{at}: t({key!r}): no such key in the dictionary")
    if report_keys:
        print("keys: " + ", ".join(f"{l} {len(texts[l])}" for l in LANGS))
    return texts


class _Html:
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


def check_html(problems, texts):
    from html.parser import HTMLParser
    path = UI / "index.html"
    src = path.read_text(encoding="utf-8")

    class P(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.stack = []

        def handle_starttag(self, tag, attrs):
            a = dict(attrs)
            for key in ("data-t", "data-tp", "data-ta"):
                if a.get(key) and a[key] not in texts["en"]:
                    problems.append(f"index.html:{self.getpos()[0]}: {key}={a[key]!r}: no such key in the dictionary")
            for an in ("title", "placeholder", "aria-label", "alt"):
                if a.get(an) and CYR.search(a[an]):
                    problems.append(f"index.html:{self.getpos()[0]}: Russian {an}: {a[an]!r}")
            if tag not in _Html.VOID:
                self.stack.append((tag, a))

        def handle_endtag(self, tag):
            while self.stack:
                t, _ = self.stack.pop()
                if t == tag:
                    break

        def handle_data(self, data):
            s = data.strip()
            if not s or any(t in ("script", "style") for t, _ in self.stack):
                return
            if any("data-t" in a for _, a in self.stack[-1:]):
                return
            if s in NATIVE_NAMES:
                return
            if CYR.search(s):
                problems.append(f"index.html:{self.getpos()[0]}: Russian text (use data-t): {s[:80]!r}")

    P().feed(src)


# ---------- Rust ----------
RS_STR = re.compile(r'r(#*)"(.*?)"\1|"((?:\\.|[^"\\])*)"', re.S)


def rust_code_spans(src):
    """The parts of the file that are not comments / test modules, as (start, end) offsets; strings are kept."""
    skip = []
    # #[cfg(test)] mod x { ... }
    for m in re.finditer(r"#\[cfg\(test\)\]\s*mod\s+\w+\s*\{", src):
        i, d = m.end(), 1
        while d and i < len(src):
            if src[i] == "{":
                d += 1
            elif src[i] == "}":
                d -= 1
            i += 1
        skip.append((m.start(), i))
    return skip


def check_rust(problems):
    for path in sorted(list((ROOT / "app" / "src").glob("*.rs")) + list(ROOT.glob("crates/*/src/*.rs"))):
        src = path.read_text(encoding="utf-8")
        skip = rust_code_spans(src)
        i, n = 0, len(src)
        while i < n:
            if any(s <= i < e for s, e in skip):
                i = next(e for s, e in skip if s <= i < e)
                continue
            c = src[i]
            if src.startswith("//", i):
                k = src.find("\n", i)
                i = n if k < 0 else k
                continue
            if src.startswith("/*", i):
                i = src.index("*/", i) + 2
                continue
            if c == "'":            # a char literal ('a', '\n', '"'), not a lifetime
                m = re.match(r"'(\\.|\\u\{[0-9a-fA-F]+\}|[^\\'])'", src[i:])
                if m:
                    i += m.end()
                    continue
                i += 1
                continue
            if c == '"' or (c == "r" and re.match(r'r#*"', src[i:]) and not re.match(r"\w", src[i - 1])):
                m = RS_STR.match(src, i)
                if m:
                    s = m.group(2) if m.group(2) is not None else m.group(3)
                    if CYR.search(s or ""):
                        ln = line_of(src, i)
                        if "i18n-ok" not in src.split("\n")[ln - 1]:
                            problems.append(f"{path.relative_to(ROOT)}:{ln}: Russian text in a Rust string: {s[:80]!r}")
                    i = m.end()
                    continue
            i += 1


RS_ERR = re.compile(r'(?:\bErr\(|ok_or\(|ok_or_else\(\|\|\s*|map_err\(\|[^|]*\|\s*(?:\{[^}]*?)?|Error::(?:Bad|Net|Io)\(|NetError::Failed\()'
                    r'\s*(?:format!\(\s*)?"((?:\\.|[^"\\])*)"')
# not shown to a player: checks of the launcher's own data between its parts, the CLI / publisher, a test stand
RS_ERR_SKIP = re.compile(r"^(short answer|reset|read: |the connection's thread ended|no \{v\}$|launcher room|\{\w*\}$)")


def js_regex_to_py(src):
    return src.replace("[^]", "[\\s\\S]")


def err_rows():
    src = (UI / "app.js").read_text(encoding="utf-8")
    i = src.find("const ERR_TXT = [")
    if i < 0:
        return None
    end = src.index("\n];", i)
    rows = []
    for m in re.finditer(r"^\s*\[/(.+?)/,\s*'(\w+)'", src[i:end], re.M):
        rows.append((re.compile(js_regex_to_py(m.group(1))), m.group(2)))
    return rows


def check_rust_errors(problems, texts):
    rows = err_rows()
    if rows is None:
        problems.append("app.js: no ERR_TXT (the table of the Rust side's errors)")
        return
    for key in {k for _, k in rows}:
        if key not in texts["en"]:
            problems.append(f"app.js ERR_TXT: no key {key!r}")
    for path in sorted(list((ROOT / "app" / "src").glob("*.rs")) + list((ROOT / "crates" / "elite-core" / "src").glob("*.rs"))):
        src = path.read_text(encoding="utf-8")
        skip = rust_code_spans(src)
        for m in RS_ERR.finditer(src):
            if any(a <= m.start() < b for a, b in skip):
                continue
            lit = m.group(1)
            if not lit or RS_ERR_SKIP.search(lit) or not re.search(r"[A-Za-z]{3}", lit):
                continue
            sample = re.sub(r"\{[^}]*\}", "1", lit).replace("\\\"", '"')
            if not any(r.search(sample) for r, _ in rows):
                problems.append(f"{path.relative_to(ROOT)}:{line_of(src, m.start())}: the error {lit[:70]!r} has no row in app.js ERR_TXT")


def check_codes(problems, texts):
    for pre, codes in SERVER_CODES.items():
        for c in codes:
            if pre + c not in texts["en"]:
                problems.append(f"SERVER_CODES: no text for {pre + c!r} (a code the server sends)")


def _texts_ok(where, v, problems, need_all):
    if isinstance(v, str):
        if CYR.search(v):
            problems.append(f"{where}: a plain Russian text - give it as {{\"en\": ..., \"ru\": ...}}")
        return
    if isinstance(v, list):
        if any(isinstance(x, str) and CYR.search(x) for x in v):
            problems.append(f"{where}: a plain Russian list - give it as {{\"en\": [...], \"ru\": [...]}}")
        return
    if not isinstance(v, dict):
        return
    if "en" not in v:
        problems.append(f"{where}: no \"en\"")
    if need_all:
        miss = [l for l in LANGS if l not in v]
        if miss:
            problems.append(f"{where}: missing {', '.join(miss)}")
    for l, x in v.items():
        if l != "ru" and CYR.search(str(x)):
            problems.append(f"{where}: Russian text in {l!r}")


def check_events(problems):
    import json
    p = ROOT / "events.json"
    if not p.is_file():
        return
    d = json.loads(p.read_text(encoding="utf-8"))
    for e in d.get("events") or []:
        for k in ("title", "info"):
            if k in e:
                _texts_ok(f"events.json {e.get('id')}.{k}", e[k], problems, False)


def check_store(problems, path):
    import json
    d = json.loads(Path(path).read_text(encoding="utf-8"))
    for c in d.get("components") or []:
        cid = c.get("id")
        nm = c.get("name")
        if isinstance(nm, dict):
            vals = set(nm.values())
            if len(vals) > 1:
                problems.append(f"store {cid}: the card's name differs between languages (names stay English): {nm}")
            if any(CYR.search(v) for v in vals):
                problems.append(f"store {cid}: a Russian card name: {nm}")
        elif isinstance(nm, str) and CYR.search(nm):
            problems.append(f"store {cid}: a Russian card name: {nm}")
        _texts_ok(f"store {cid}.description", c.get("description"), problems, True)
        for o in c.get("options") or []:
            on = o.get("name")
            if not o.get("choices") and isinstance(on, dict) and len(set(on.values())) > 1:
                # a tick of an add-on is named like the add-on itself: one short English name in every language
                problems.append(f"store {cid}.{o.get('id')}: the tick's name differs between languages (names stay English): {on.get('en')!r}")
            _texts_ok(f"store {cid}.{o.get('id')}.name", on, problems, True)
            for ch in o.get("choices") or []:
                _texts_ok(f"store {cid}.{o.get('id')}={ch.get('value')}", ch.get("name"), problems, True)


def main():
    problems = []
    texts = check_ui(problems, "--keys" in sys.argv)
    check_html(problems, texts)
    check_rust(problems)
    check_rust_errors(problems, texts)
    check_codes(problems, texts)
    check_events(problems)
    if "--store" in sys.argv:
        check_store(problems, sys.argv[sys.argv.index("--store") + 1])
    for p in problems:
        print(p)
    print(f"i18n: {len(problems)} problem(s)" if problems else "i18n: ok")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
