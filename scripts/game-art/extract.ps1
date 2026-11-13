<#
extract.ps1 - the game's own pictures for the launcher, on a Windows PC with Dawn of War II: Retribution (owner 13.11.2026).

  powershell -ExecutionPolicy Bypass -File scripts\game-art\extract.ps1
  powershell -ExecutionPolicy Bypass -File scripts\game-art\extract.ps1 -Game "D:\Games\Dawn of War II - Retribution"

What it does (nothing in the game's folder is changed - it is only read):
  1. finds the game in the Steam libraries (or takes -Game);
  2. puts Python's tools into <Out>\_tools (a venv: relic-game-tool - the SGA unpacker of Relic's games, v5 = DoW II - and Pillow);
  3. unpacks the game's archives (GameAssets\Archives\*.sga) and Elite's (Elite\Archives\*.sga) into <Out>\<archive>, all but the
     sound, speech and video ones (-Skip);
  4. makes <Out>\find.html (find.py): every picture with its size and path, a filter on top - open it and look;
  5. counts the menus' Scaleform files (.gfx) - their pictures are exported by JPEXS Free Flash Decompiler when it is installed;
  6. packs for the launcher's developer, on the Desktop: dow2-art-find.zip (find.html + thumbnails, small) and dow2-art-ui.zip
     (every unpacked "ui" folder - the menus' textures).
Needs Python 3.9 or newer (winget install -e --id Python.Python.3.11). Default <Out>: %USERPROFILE%\dow2-art.
#>
param(
  [string]$Game = '',
  [string]$Out = (Join-Path $env:USERPROFILE 'dow2-art'),
  [string]$Skip = 'Sound|Speech|Movie|Music|Voice'
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
function Say($m) { Write-Host ''; Write-Host "== $m" -ForegroundColor Cyan }

# ---- 1. the game ----
Say 'The game'
if (-not $Game) {
  $roots = @()
  foreach ($k in 'HKCU:\Software\Valve\Steam', 'HKLM:\SOFTWARE\WOW6432Node\Valve\Steam', 'HKLM:\SOFTWARE\Valve\Steam') {
    $p = Get-ItemProperty $k -ErrorAction SilentlyContinue
    if ($p -and $p.SteamPath) { $roots += ($p.SteamPath -replace '/', '\') }
    if ($p -and $p.InstallPath) { $roots += $p.InstallPath }
  }
  $libs = @()
  foreach ($r in $roots) {
    $libs += $r
    $vdf = Join-Path $r 'steamapps\libraryfolders.vdf'
    if (Test-Path $vdf) {
      foreach ($m in (Select-String -Path $vdf -Pattern '"path"\s+"([^"]+)"' -AllMatches).Matches) { $libs += ($m.Groups[1].Value -replace '\\\\', '\') }
    }
  }
  foreach ($l in ($libs | Select-Object -Unique)) {
    $g = Join-Path $l 'steamapps\common\Dawn of War II - Retribution'
    if (Test-Path (Join-Path $g 'DOW2.exe')) { $Game = $g; break }
  }
}
if (-not $Game -or -not (Test-Path (Join-Path $Game 'DOW2.exe'))) {
  throw "Dawn of War II: Retribution is not found. Run again with -Game ""<the folder with DOW2.exe>"" (Steam: Manage - Browse local files)."
}
Write-Host "Game: $Game"
New-Item -ItemType Directory -Force -Path $Out | Out-Null

# ---- 2. the tools ----
Say 'Python tools'
$tools = Join-Path $Out '_tools'
$py = Join-Path $tools 'Scripts\python.exe'
if (-not (Test-Path $py)) {
  # relic-game-tool is of 2022: a Python of those years first (3.11 / 3.10 / 3.9), a newer one when there is no other
  $base = $null
  if (Get-Command py -ErrorAction SilentlyContinue) {
    foreach ($v in '-3.11', '-3.10', '-3.9', '-3.12', '-3') {
      try { & py $v -c 'import sys' 2>$null; if ($LASTEXITCODE -eq 0) { $base = @('py', $v); break } } catch { }
    }
  }
  if (-not $base -and (Get-Command python -ErrorAction SilentlyContinue)) { $base = @('python') }
  if (-not $base) { throw 'No Python. Install it: winget install -e --id Python.Python.3.11 - then open a new PowerShell and run this again.' }
  $exe = $base[0]; $rest = @($base | Select-Object -Skip 1)
  & $exe @rest -m venv $tools
  if (-not (Test-Path $py)) { throw "The venv was not made in $tools" }
}
& $py -m pip install --disable-pip-version-check -q relic-game-tool==2022.0rc0 pillow
$relic = Join-Path $tools 'Scripts\relic.exe'
if (-not (Test-Path $relic)) { throw "relic-game-tool did not install (no $relic)" }

# ---- 3. unpack ----
Say 'Unpacking the archives'
$sga = @()
foreach ($d in (Join-Path $Game 'GameAssets\Archives'), (Join-Path $Game 'Elite\Archives')) {
  if (Test-Path $d) { $sga += Get-ChildItem -Path $d -Filter *.sga -File }
}
$todo = @($sga | Where-Object { $_.Name -notmatch $Skip } | Sort-Object Length)
$skipped = @($sga | Where-Object { $_.Name -match $Skip })
Write-Host ("{0} archives, {1} skipped ({2})" -f $todo.Count, $skipped.Count, $Skip)
$failed = @()
foreach ($f in $todo) {
  $mb = [math]::Round($f.Length / 1MB)
  if (Test-Path (Join-Path $Out $f.BaseName)) { Write-Host "  already there: $($f.Name)"; continue }
  Write-Host "  $($f.Name) ($mb MB)"
  & $relic sga unpack $f.FullName -o $Out -u -x
  if ($LASTEXITCODE -ne 0) { $failed += $f.Name; Write-Host "    failed (exit $LASTEXITCODE)" -ForegroundColor Yellow }
}

# ---- 4. the contact sheet ----
Say 'find.html'
& $py (Join-Path $here 'find.py') $Out (Join-Path $Out 'find.html')
$rgt = @(Get-ChildItem -Path $Out -Recurse -Filter *.rgt -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike "$tools*" })
if ($rgt.Count) { Write-Host ("{0} .rgt textures (Relic's own format, not in find.html yet - tell the developer)" -f $rgt.Count) -ForegroundColor Yellow }

# ---- 5. the menus (.gfx) ----
Say 'Menus (Scaleform .gfx)'
$gfx = @(Get-ChildItem -Path $Out -Recurse -Filter *.gfx -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike "$tools*" })
Write-Host ("{0} .gfx files" -f $gfx.Count)
$ffdec = @("${env:ProgramFiles}\FFDec\ffdec.bat", "${env:ProgramFiles(x86)}\FFDec\ffdec.bat") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($gfx.Count -and $ffdec) {
  foreach ($g in $gfx) { & $ffdec -export image (Join-Path $Out ('_gfx\' + $g.BaseName)) $g.FullName | Out-Null }
  Get-ChildItem -Path (Join-Path $Out '_gfx') -Directory | ForEach-Object { Copy-Item $_.FullName (Join-Path $Out ('gfx-' + $_.Name)) -Recurse -Force }
  & $py (Join-Path $here 'find.py') $Out (Join-Path $Out 'find.html')
} elseif ($gfx.Count) {
  Write-Host 'JPEXS Free Flash Decompiler is not installed: the pictures inside the menus are not exported (optional).'
  Write-Host '  https://github.com/jindrapetrik/jpexs-decompiler/releases - install, then run this script again.'
}

# ---- 6. pack ----
Say 'Packing for the developer'
$desk = [Environment]::GetFolderPath('Desktop')
$z1 = Join-Path $desk 'dow2-art-find.zip'
Compress-Archive -Path (Join-Path $Out 'find.html'), (Join-Path $Out 'find-thumbs') -DestinationPath $z1 -Force
$ui = @(Get-ChildItem -Path $Out -Recurse -Directory -Filter ui -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike "$tools*" -and $_.FullName -notlike "*\find-thumbs*" })
$ui += @(Get-ChildItem -Path $Out -Directory -Filter 'gfx-*' -ErrorAction SilentlyContinue)
if ($ui.Count) {
  $z2 = Join-Path $desk 'dow2-art-ui.zip'
  Compress-Archive -Path ($ui | ForEach-Object { $_.FullName }) -DestinationPath $z2 -Force
  Write-Host ("{0}  {1} MB" -f $z2, [math]::Round((Get-Item $z2).Length / 1MB))
} else { Write-Host 'No "ui" folder among the unpacked files - send dow2-art-find.zip, the developer will say which pictures to take.' }
Write-Host ("{0}  {1} MB" -f $z1, [math]::Round((Get-Item $z1).Length / 1MB))
if ($failed.Count) { Write-Host ("Not unpacked: {0}" -f ($failed -join ', ')) -ForegroundColor Yellow }
Start-Process (Join-Path $Out 'find.html')
Say 'Done'
