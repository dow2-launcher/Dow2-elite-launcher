import json
p = "store3-staging/launcher.json"; d = json.load(open(p))
comps = d["components"]
ls = next(c for c in comps if c["id"] == "lobbystats")
ls["version"] = "lobbystats-0.10.0"
ls["options"] = [o for o in ls.get("options", []) if o["id"] == "joinsound"]
new = [
 {"id": "loadingratings", "version": "loadingratings-1", "default": True, "inject": "LoadingRatings.dll",
  "name": {"en": "Ratings on the loading screen", "ru": "Рейтинги на экране загрузки", "es": "Ratings en la pantalla de carga",
           "fr": "Classements à l'écran de chargement", "de": "Ratings im Ladebildschirm"},
  "description": {"en": "The Relic rating after each player's name on the loading screen of an online match.",
                  "ru": "Рейтинг Relic после имени каждого игрока на экране загрузки онлайн-матча.",
                  "es": "El rating de Relic tras el nombre de cada jugador en la pantalla de carga.",
                  "fr": "Le classement Relic après le nom de chaque joueur à l'écran de chargement.",
                  "de": "Das Relic-Rating nach jedem Spielernamen im Ladebildschirm."}},
 {"id": "matchtimer", "version": "matchtimer-4", "default": False, "inject": "MatchTimer.dll",
  "name": {"en": "Match timer", "ru": "Таймер матча", "es": "Cronómetro", "fr": "Chrono de partie", "de": "Spieluhr"},
  "description": {"en": "Match time (minutes:seconds of game time) next to the Menu button.",
                  "ru": "Время матча (минуты:секунды игрового времени) рядом с кнопкой Menu.",
                  "es": "Tiempo de partida junto al botón Menú.", "fr": "Durée de la partie à côté du bouton Menu.",
                  "de": "Spielzeit neben der Menü-Taste."}},
 {"id": "cooldowns", "version": "cooldowns-1", "default": False, "inject": "Cooldowns.dll",
  "name": {"en": "Cooldown seconds on ability buttons", "ru": "Секунды перезарядки на кнопках способностей",
           "es": "Segundos de recarga en los botones", "fr": "Secondes de recharge sur les boutons", "de": "Abklingzeit auf den Fähigkeitstasten"},
  "description": {"en": "Seconds left on recharging abilities and global abilities, in the middle of the button.",
                  "ru": "Сколько секунд осталось до готовности способности и глобальной способности — в центре кнопки.",
                  "es": "Segundos restantes de recarga en el centro del botón.", "fr": "Secondes restantes au centre du bouton.",
                  "de": "Verbleibende Sekunden in der Mitte der Taste."}},
]
i = comps.index(ls)
comps[:] = [c for c in comps if c["id"] not in ("loadingratings", "matchtimer", "cooldowns")]
i = comps.index(ls)
for k, c in enumerate(new): comps.insert(i + 1 + k, c)
json.dump(d, open(p, "w"), ensure_ascii=False, indent=2)
print([c["id"] for c in comps], [o["id"] for o in ls["options"]])
