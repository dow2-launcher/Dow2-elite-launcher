# The game's own pictures in the launcher

The D look draws its frames, plates and icons from art slots (`slots.json`, the table in `app/ui/img/ui/SLOTS.md`). Today
crops of the menus' screenshots and line icons stand in. These scripts put the game's own files in their place.

On a computer with Dawn of War II: Retribution installed:

**All of it in one go (1.6.3):** `powershell -ExecutionPolicy Bypass -File scripts\game-art\extract.ps1` from the repository's folder -
it finds the game, unpacks the archives with relic-game-tool into `%USERPROFILE%\dow2-art`, makes `find.html` and leaves
`dow2-art-find.zip` / `dow2-art-ui.zip` on the Desktop to send. The steps by hand:


1. **Unpack the archives.** The game's files are in `<game folder>/GameAssets/Archives/*.sga` (the menus' textures are in the
   archives with UI in their names). Unpack them with any unpacker of Dawn of War II (Essence 2) `.sga` archives into one folder.
   The menus themselves are Scaleform `.gfx` files: open them in JPEXS Free Flash Decompiler and export their images into the same
   folder - the frames and buttons of Find a Game, Game Setup and the main menu are there.
2. **Look at everything.** `pip install pillow`, then `python3 find.py <unpacked folder> find.html` and open `find.html`:
   every picture with its size and path, a filter on top (`ui`, `fe`, `button`, `frame`, `check`, `ready` ...).
3. **Map the slots.** Copy `art-map.example.json` to `art-map.json`; for each slot of `slots.json` you found, its path (as
   `find.html` shows it), a `crop` `[x, y, w, h]` when the picture is part of a sheet, a `slice` (the frame's border, px) for
   the frames. Slots left out keep their stand-ins.
4. **Put them in.** `python3 apply.py <unpacked folder>`: the pictures go to `app/ui/img/ui` (icons to `img/ui/icons`) as PNG,
   `img/ui/art.css` points the slots at them, `img/ui/art.js` lists the icons for the code. Run it again after any change.
   The plate's mirrored copy (the plate buttons on the left of the window) and its copy with square corners (the cards) are
   made from it by `derive.py`; `apply.py` runs it when the map has the plate.
5. Commit `art-map.json` and what `apply.py` wrote. Not sure which picture is which - send `find.html` (with `find-thumbs/`),
   the map can be filled from it.

The pictures belong to Relic / SEGA, as the minimaps and portraits the ladder already shows; the launcher only displays them.
