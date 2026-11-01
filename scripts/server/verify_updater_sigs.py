# check Tauri updater signatures (minisign, Ed25519) of the staged files against keys/updater.pub
import base64, hashlib, sys, json, os
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
pub_txt = base64.b64decode(open('/mnt/ssd/eliteupd/wip_gamerunning/keys/updater.pub').read().strip()).decode().splitlines()
pk = base64.b64decode(pub_txt[1]); key = Ed25519PublicKey.from_public_key_bytes if False else None
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey as K
pkey = K.from_public_bytes(pk[10:42]); keyid = pk[2:10]
d = sys.argv[1]; bad = 0
u = json.load(open(os.path.join(d, 'updater.json')))
for plat, v in u['platforms'].items():
    fn = os.path.join(d, v['url'].rsplit('/', 1)[1])
    sig_txt = base64.b64decode(v['signature']).decode().splitlines()
    sig = base64.b64decode(sig_txt[1]); alg = sig[:2]
    data = open(fn, 'rb').read(); msg = hashlib.blake2b(data, digest_size=64).digest() if alg == b'ED' else data
    try:
        assert sig[2:10] == keyid, 'key id'
        pkey.verify(sig[10:74], msg)
        tc = sig_txt[2][len('trusted comment: '):].encode(); pkey.verify(base64.b64decode(sig_txt[3]), sig[10:74] + tc)
        print('OK ', plat, os.path.basename(fn))
    except Exception as e: bad += 1; print('BAD', plat, os.path.basename(fn), e)
print('version', u['version']); sys.exit(bad)
