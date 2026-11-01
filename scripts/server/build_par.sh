#!/bin/bash
# build_par.sh <commit> - launcher release build of a LOCAL commit (nothing from GitHub), the four platforms at once
# (each in its own target dir: cargo locks a target dir, so in one dir they would wait for each other), then the outputs are
# put where stage130.sh/release130.sh read them (rel_target, rel_target_mac/<triple>). ~4 min instead of ~12 one by one.
set -u
C=${1:?commit}
R=/mnt/ssd/eliteupd/rel; L=/mnt/ssd/eliteupd/rel_logs; E=/mnt/ssd/eliteupd; mkdir -p $L
cd $E/wip_gamerunning && rm -rf $R && git worktree prune && git worktree add -q --detach $R $C
cd $R && git log --oneline -1 > $L/commit
export PATH=/root/.cargo/bin:$PATH RUSTUP_HOME=/root/.rustup CARGO_HOME=/root/.cargo
export ELITE_MIRRORS="$(sed -n 4p /root/elite-launcher-ci-secrets.txt)" ELITE_LOG_HOSTS="$(sed -n 6p /root/elite-launcher-ci-secrets.txt)"
export TAURI_SIGNING_PRIVATE_KEY="$(cat /root/.tauri-elite/updater.key)" TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$(cat /root/.tauri-elite/updater.key.password)"
pub="$(tr -d '[:space:]' < keys/updater.pub)"
printf '{"bundle":{"createUpdaterArtifacts":true},"plugins":{"updater":{"pubkey":"%s","endpoints":["https://dow2.fintebtc.de/elite/dl/updater.json","https://dow2ru.fintebtc.de/elite/dl/updater.json","https://rts.fintebtc.de/elite/dl/updater.json"]}}}' "$pub" > $L/overlay.json
win() { cd $R/app && CARGO_TARGET_DIR=$E/rel_target_win cargo tauri build --target x86_64-pc-windows-gnu --bundles nsis --config $L/overlay.json > $L/win.log 2>&1; echo "WIN $?" >> $L/win.log; }
lin() { cd $R/app && CARGO_TARGET_DIR=$E/rel_target cargo tauri build --bundles appimage --config $L/overlay.json > $L/lin.log 2>&1; echo "LIN $?" >> $L/lin.log; }
mac() { a=$1; A=$(echo $a | tr a-z A-Z); cd $R && export PATH=/mnt/ssd/opt/osx/osxcross/target/bin:$PATH MACOSX_DEPLOYMENT_TARGET=10.13
  export CARGO_TARGET_${A}_APPLE_DARWIN_LINKER=$a-apple-darwin23.5-clang CC_${a}_apple_darwin=$a-apple-darwin23.5-clang CXX_${a}_apple_darwin=$a-apple-darwin23.5-clang++ AR_${a}_apple_darwin=$a-apple-darwin23.5-ar
  CARGO_TARGET_DIR=$E/rel_target_mac_$a cargo build --release -p elite-launcher --target $a-apple-darwin > $L/mac_$a.log 2>&1; echo "MAC $a $?" >> $L/mac_$a.log; }
win & lin & mac aarch64 & mac x86_64 & wait
# outputs where the stage/release scripts take them
W=$E/rel_target/x86_64-pc-windows-gnu/release; mkdir -p $W/bundle/nsis
cp $E/rel_target_win/x86_64-pc-windows-gnu/release/bundle/nsis/* $W/bundle/nsis/ && cp $E/rel_target_win/x86_64-pc-windows-gnu/release/elite-launcher.exe $E/rel_target_win/x86_64-pc-windows-gnu/release/WebView2Loader.dll $W/
for a in aarch64 x86_64; do mkdir -p $E/rel_target_mac/$a-apple-darwin/release; cp $E/rel_target_mac_$a/$a-apple-darwin/release/elite-launcher $E/rel_target_mac/$a-apple-darwin/release/; done
tail -qn1 $L/win.log $L/lin.log $L/mac_*.log
