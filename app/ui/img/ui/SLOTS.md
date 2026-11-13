# The art slots of the launcher

Every picture of the D look, from `scripts/game-art/slots.json`. The stand-ins are crops of the menus' screenshots; `scripts/game-art` puts the game's own files in their place (README there).

| Slot | Kind | File | Size | Slice | Stands in now | Used for | In the game |
|---|---|---|---|---|---|---|---|
| `bg` | fill | `bg.jpg` | 1920x1080 |  | crop 704x333 of the menu's slate | the window's background, under a dark veil | the front end's background (main menu, Multiplayer) |
| `frame` | frame | `frame-panel.jpg` | ~390x430 | 34 | crop of "Looking for Ideal Match" | every panel, menu, window | Find a Game: the riveted panel around the search |
| `panel` | fill | `panel-fill.jpg` | ~360x180 |  | crop of the same panel's inside | inside the panels | the same panel's grimy teal inside |
| `plate` | frame | `plate.png` | ~278x64 | 14 | crop of "Start Searching" / "Back" | Play, the main buttons (teal), refusals (repainted red), cards, strips | Find a Game: Start Searching / Back; states normal, hover, pressed, disabled |
| `plate-fill` | fill | `plate-fill.jpg` | ~64x52 |  | crop of the plate's inside | inside the plates | the same button's inside |
| `card` | fill | `card-fill.jpg` | ~280x60 |  | crop of a list row | inside cards, strips, the event, lobby slots | a row of the Find a Game / Custom Games lists |
| `slot` | frame | `slot.png` | ~360x78 | 10 | crop of a Game Setup slot | a player's row in a lobby | Game Setup: a player slot (normal / mine) |
| `name` | frame | `plate-name.png` | ~345x46 | 6 26 6 6 | crop of the main menu's name plate | the profile plate in the header | the main menu: the player's name plate with the online dot |
| `name-fill` | fill | `plate-name-fill.jpg` | ~300x52 |  | crop of its inside | inside the profile plate | the same plate's slate |
| `field` | fill | `field-fill.jpg` | ~260x46 |  | crop of a drop-down's inside | the version button in the footer | a drop-down field (e.g. "Two on Two") |
| `portrait` | frame | `frame-portrait.png` | ~83x78 |  | crop of an empty portrait frame | the connection icon in the header | Hero select: an empty portrait frame |
| `tick` | icon | `icons/tick.png` | 32x32 |  | a green tick drawn in CSS | ready in a lobby row | Game Setup: the ready mark; any check / tick of the menus |
| `check` | icon | `icons/check.png` | 32x32 |  | a tick drawn in CSS | the checkboxes (add-ons, settings) | Options: a checkbox's tick |
| `chevron` | icon | `icons/chevron.png` | 16x16 |  | a chevron drawn in CSS | drop-downs, the version button | a drop-down's arrow |
| `eye` | icon | `icons/eye.png` | 32x32 |  | line icon | Watch a match | the observer / spectate icon |
| `enter` | icon | `icons/enter.png` | 32x32 |  | line icon | Join a lobby | Custom Games: join |
| `crown` | icon | `icons/crown.png` | 32x32 |  | line icon | the lobby's host | Game Setup: the host's mark |
| `lock` | icon | `icons/lock.png` | 32x32 |  | line icon | a lobby with a password | Custom Games: the password lock |
| `plus` | icon | `icons/plus.png` | 32x32 |  | line icon | Create a lobby | any "add" / "create" |
| `x` | icon | `icons/x.png` | 32x32 |  | line icon | close, remove from a lobby | a window's close / kick |
| `info` | icon | `icons/info.png` | 32x32 |  | line icon | the lobby's event line | a tooltip / info mark |
| `steam` | icon | `icons/steam.png` | 32x32 |  | line icon | Sign in with Steam, my Steam profile | the Steam logo of the menus |
| `bars` | icon | `icons/bars.png` | 32x32 |  | line icon | my stats | the stats / ladder icon |
| `out` | icon | `icons/out.png` | 32x32 |  | line icon | sign out | quit / sign-out |
| `upload` | icon | `icons/upload.png` | 32x32 |  | line icon | Send logs | any "send" / "upload" |
| `door` | icon | `icons/door.png` | 32x32 |  | line icon | Open lobbies (the Rooms panel) | Custom Games |
| `signal` | icon | `icons/signal.png` | 32x32 |  | signal bars drawn in SVG | the connection check button | the connection quality bars |
| `avatar` | icon | `icons/avatar.png` | 64x64 |  | a winged skull drawn in SVG | a player without a Steam avatar (chat, Online, lobbies) | a winged skull of the menus / loading screens |
| `band` | fill | `band.png` | 556x17 |  | crop of the gold line under the title of the game's "Are you sure?" window (one turn of it, it wraps) | under the title of every window (askBox, Clean up, another version) | the dialogs' header: "THE IMMORTAL EMPEROR · VENERATE THE IMMORTAL EMPEROR" |
| `stripes` | fill | `(drawn in CSS)` |  |  | the stripes measured on the screenshots (~5 px step), drawn with a gradient | the windows' body, the Replays pane while nothing is chosen | the striped inside of "Are you sure?" / "Performance Results" |
| `mech` | icon | `icons/(SVG in CSS)` | vector |  | the Adeptus Mechanicus cog of github.com/Certseeds/wh40k-icon | the Replays pane while nothing is chosen | "Performance Results": the half cog with the skull |
