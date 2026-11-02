"""The launcher's own server API - https://rts.fintebtc.de/launcher-api/ (also dow2. and dow2ru.fintebtc.de).

Deployed by itself: a push to main that changes server/ is live in ~30 s (see server/README.md). Standard library
only for now; add packages to requirements.txt when needed.
"""
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8930"))
PREFIX = os.environ.get("PUBLIC_PREFIX", "/launcher-api")
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(os.path.dirname(__file__), "data"))
STARTED = time.time()


class Api(BaseHTTPRequestHandler):
    server_version = "launcher-api"

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path.startswith(PREFIX):
            path = path[len(PREFIX):] or "/"
        if path == "/healthz":
            return self.send_json(200, {"ok": True})
        if path == "/":
            return self.send_json(200, {"service": "launcher-api", "uptime": int(time.time() - STARTED)})
        self.send_json(404, {"error": "not found"})

    def log_message(self, fmt, *args):
        # the journal already has the time; the visitor's address is X-Real-IP (nginx in front)
        print("%s %s" % (self.headers.get("X-Real-IP", "-"), fmt % args), flush=True)


if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    print("launcher-api on %s:%d, data in %s" % (HOST, PORT, DATA_DIR), flush=True)
    ThreadingHTTPServer((HOST, PORT), Api).serve_forever()
