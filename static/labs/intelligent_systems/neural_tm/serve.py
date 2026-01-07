#!/usr/bin/env python3
import http.server, socketserver, os, argparse

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def pick_server(host: str, start_port: int, tries: int = 20):
    for port in range(start_port, start_port + tries):
        try:
            httpd = ReusableTCPServer((host, port), NoCacheHandler)
            return httpd, port
        except OSError as e:
            if getattr(e, "errno", None) == 48:  # macOS: Address already in use
                continue
            raise
    raise OSError(f"No free port in {start_port}-{start_port+tries-1}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    parser.add_argument("--port", "-p", type=int, default=int(os.environ.get("PORT", 8000)))
    args = parser.parse_args()

    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    httpd, port = pick_server(args.host, args.port)
    print(f"Serving at http://{args.host}:{port}  (Ctrl+C to stop)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

if __name__ == "__main__":
    main()