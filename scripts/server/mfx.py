# mfx.py <manifest> [path-substring] - list a launcher manifest (ELUPD001) or print the blob path of matching files
import struct, sys
d = open(sys.argv[1], "rb").read(); o = 8
vl, = struct.unpack_from("<I", d, o); o += 4; ver = d[o:o+vl].decode(); o += vl
n, = struct.unpack_from("<I", d, o); o += 4
for _ in range(n):
    pl, = struct.unpack_from("<H", d, o); o += 2; path = d[o:o+pl].decode(); o += pl
    size, = struct.unpack_from("<Q", d, o); o += 8; sha = d[o:o+32].hex(); o += 32
    nc, = struct.unpack_from("<I", d, o); o += 4 + nc * 12
    if len(sys.argv) < 3 or sys.argv[2].lower() in path.lower(): print(path, size, sha)
