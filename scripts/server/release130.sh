#!/bin/bash
# release launcher 1.3.0 to the players: files from the staging into dl/ (site + store3 -> R2 mirrors), latest.json,
# updater.json (self-update of 1.3+), launcher_update in launcher.json (the update button of 1.2.x)
set -e; V=1.3.0; ST=/var/www/rts-site/elite/stage/$V; E=/var/www/rts-site/elite/dl; D=/mnt/ssd/eliteupd/store3/dl; U=/mnt/ssd/eliteupd
# .deb: the package layout of 1.2.12 with the new binary
X=$(mktemp -d); dpkg-deb -R $D/elite-launcher_1.2.12_amd64.deb $X/p
cp /mnt/ssd/eliteupd/rel_target/release/elite-launcher $X/p/usr/bin/elite-launcher
sed -i -E "s/^Version: .*/Version: $V/; s/^Depends: .*/Depends: libwebkit2gtk-4.1-0, libgtk-3-0, libayatana-appindicator3-1/; s/^Installed-Size: .*/Installed-Size: $(du -sk $X/p --exclude=DEBIAN | cut -f1)/" $X/p/DEBIAN/control
(cd $X/p && find usr -type f -exec md5sum {} + > DEBIAN/md5sums); dpkg-deb --root-owner-group -b $X/p $ST/elite-launcher_${V}_amd64.deb >/dev/null
# the source of this build
(cd /mnt/ssd/eliteupd/rel && git ls-files | grep -v private | python3 -c "
import sys,zipfile
fs=[f.strip() for f in sys.stdin if f.strip()]
z=zipfile.ZipFile('$ST/elite-launcher-src-$V.zip','w',zipfile.ZIP_DEFLATED); [z.write(f,'elite-launcher-$V/'+f) for f in fs]; z.close()")
python3 - <<PY
import json; json.dump({"version":"$V","files":{"win":"EliteLauncher-$V-setup.exe","win_portable":"EliteLauncher-$V-windows-portable.zip","linux":"EliteLauncher-$V.AppImage","deb":"elite-launcher_${V}_amd64.deb","mac":"EliteLauncher-$V-mac.zip","src":"elite-launcher-src-$V.zip"}},open("$ST/latest.json","w"),indent=2)
PY
chmod 644 $ST/*; chmod 755 $ST/*.AppImage
for d in $E $D; do cp -a $ST/* $d/; done
exec 9>/run/elite-store.lock; flock -w 600 9
cp $U/store3/launcher.json $U/store3/launcher.json.bak.$(date +%Y%m%d-%H%M%S)
python3 - <<PY
import json,os; p="$U/store3/launcher.json"; d=json.load(open(p)); base="https://dow2.fintebtc.de/elite/dl/"
d["launcher_update"]={"version":"$V","urls":{"windows":base+"EliteLauncher-$V-setup.exe","linux":base+"EliteLauncher-$V.AppImage","macos":base+"EliteLauncher-$V-mac.zip"}}
json.dump(d,open(p+".new","w"),ensure_ascii=False,indent=2); os.replace(p+".new",p)
PY
/usr/local/lib/elite/elite-publish sign $U/store3/launcher.json $U/keys/private.key >/dev/null
/usr/local/lib/elite/elite-publish verify $U/store3 | grep -v "^OK" || true
rclone sync $U/store3 r3:elite/eu/$(cat $U/.token)/ >/dev/null 2>&1 && echo "launcher.json synced"
rm -rf $X; ls $E | grep -c "$V"
