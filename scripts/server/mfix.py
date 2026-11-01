# mfix.py <store> <old version> <new version> <donor version> <path>... - a copy of a version manifest (ELUPD001) under a new
# version name with these files taken from the donor version (added, or replacing the old entry). Blobs are shared, nothing uploads.
import struct, sys
def read(p):
    d = open(p, "rb").read(); o = 8
    vl, = struct.unpack_from("<I", d, o); o += 4 + vl
    n, = struct.unpack_from("<I", d, o); o += 4; out = []
    for _ in range(n):
        s = o; pl, = struct.unpack_from("<H", d, o); o += 2; path = d[o:o+pl].decode(); o += pl + 8 + 32
        nc, = struct.unpack_from("<I", d, o); o += 4 + nc * 12
        out.append((path, d[s:o]))
    assert o == len(d), "trailing bytes"
    return out
store, old, new, donor, paths = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5:]
files = read(f"{store}/{old}.manifest"); don = dict(read(f"{store}/{donor}.manifest"))
for p in paths:
    assert p in don, p
    files = [f for f in files if f[0] != p] + [(p, don[p])]
v = new.encode()
blob = b"ELUPD001" + struct.pack("<I", len(v)) + v + struct.pack("<I", len(files)) + b"".join(e for _, e in files)
open(f"{store}/{new}.manifest", "wb").write(blob)
print(f"{new}: {len(files)} files ({old} + {', '.join(paths)} from {donor})")
