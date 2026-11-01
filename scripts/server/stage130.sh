#!/bin/bash
# stage launcher 1.3.0: everything for players in /var/www/rts-site/elite/stage/1.3.0 (unlinked), updater.json for dl/
set -e; V=1.3.0; T=/mnt/ssd/eliteupd/rel_target; W=$T/x86_64-pc-windows-gnu/release; M=/mnt/ssd/eliteupd/rel_target_mac
ST=/var/www/rts-site/elite/stage/$V; rm -rf $ST; mkdir -p $ST; TMP=$(mktemp -d)
export PATH=/root/.cargo/bin:$PATH TAURI_SIGNING_PRIVATE_KEY="$(cat /root/.tauri-elite/updater.key)" TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$(cat /root/.tauri-elite/updater.key.password)"
cp "$W/bundle/nsis/Elite Launcher_${V}_x64-setup.exe" $ST/EliteLauncher-$V-setup.exe
cp "$W/bundle/nsis/Elite Launcher_${V}_x64-setup.exe.sig" $ST/EliteLauncher-$V-setup.exe.sig
mkdir -p $TMP/pz/EliteLauncher && cp $W/elite-launcher.exe $TMP/pz/EliteLauncher/EliteLauncher.exe && cp $W/WebView2Loader.dll $TMP/pz/EliteLauncher/
(cd $TMP/pz && python3 -c "
import zipfile,os
with zipfile.ZipFile('EliteLauncher-$V-windows-portable.zip','w',zipfile.ZIP_DEFLATED) as z: [z.write('EliteLauncher/'+f) for f in os.listdir('EliteLauncher')]") && cp $TMP/pz/*.zip $ST/
cp "$T/release/bundle/appimage/Elite Launcher_${V}_amd64.AppImage" $ST/EliteLauncher-$V.AppImage
cp "$T/release/bundle/appimage/Elite Launcher_${V}_amd64.AppImage.sig" $ST/EliteLauncher-$V.AppImage.sig
# macOS: universal binary into the .app of the last release, zip for download, tar.gz + signature for the self-update
/mnt/ssd/opt/osx/osxcross/target/bin/lipo -create -output $TMP/universal $M/aarch64-apple-darwin/release/elite-launcher $M/x86_64-apple-darwin/release/elite-launcher
cp -a "/mnt/ssd/eliteupd/target-mac/Elite Launcher.app" "$TMP/Elite Launcher.app"; APP="$TMP/Elite Launcher.app"
rm -rf "$APP/Contents/_CodeSignature"; cp $TMP/universal "$APP/Contents/MacOS/elite-launcher"; sed -i -E 's/1\.[0-9]+\.[0-9]+/'$V'/g' "$APP/Contents/Info.plist"
/mnt/ssd/opt/osx/rcodesign sign "$APP" >/dev/null 2>&1 || true
(cd $TMP && V=$V python3 - <<'PY'
import os,zipfile
root='Elite Launcher.app'; out='EliteLauncher-%s-mac.zip'%os.environ['V']
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
    for d,ds,fs in os.walk(root):
        zi=zipfile.ZipInfo(d+'/'); zi.external_attr=(0o40755<<16)|0x10; z.writestr(zi,'')
        for f in fs:
            p=os.path.join(d,f); zi=zipfile.ZipInfo.from_file(p,p)
            zi.external_attr=(0o100755 if os.access(p,os.X_OK) else 0o100644)<<16; zi.compress_type=zipfile.ZIP_DEFLATED
            z.writestr(zi,open(p,'rb').read())
PY
tar czf "EliteLauncher-$V-mac.app.tar.gz" "Elite Launcher.app")
cp $TMP/EliteLauncher-$V-mac.zip $TMP/EliteLauncher-$V-mac.app.tar.gz $ST/
cargo tauri signer sign "$ST/EliteLauncher-$V-mac.app.tar.gz" >/dev/null
# the update description: where the files will be once released (dl/ on every mirror; the launcher tries them in turn)
V=$V ST=$ST python3 - <<'PY'
import json,os,time
V,ST=os.environ['V'],os.environ['ST']; base='https://dow2.fintebtc.de/elite/dl/'
sig=lambda f: open(os.path.join(ST,f+'.sig')).read().strip()
mac={'signature':sig('EliteLauncher-%s-mac.app.tar.gz'%V),'url':base+'EliteLauncher-%s-mac.app.tar.gz'%V}
d={'version':V,'notes':'Players chat with Steam sign-in, who has the launcher open, a tidier home screen.','pub_date':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
   'platforms':{'windows-x86_64':{'signature':sig('EliteLauncher-%s-setup.exe'%V),'url':base+'EliteLauncher-%s-setup.exe'%V},
                'linux-x86_64':{'signature':sig('EliteLauncher-%s.AppImage'%V),'url':base+'EliteLauncher-%s.AppImage'%V},
                'darwin-aarch64':mac,'darwin-x86_64':mac}}
json.dump(d,open(os.path.join(ST,'updater.json'),'w'),indent=1)
PY
chmod 644 $ST/*; chmod 755 $ST/*.AppImage; rm -rf $TMP; ls -la $ST
