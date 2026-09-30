from __future__ import annotations

import argparse
import functools
import http.server
import socketserver
import sys
import threading
import webbrowser
from pathlib import Path


ROOT = Path(__file__).resolve().parent
INDEX_FILE = ROOT / "index.html"


class AppHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the TW Status Tracker app.")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind. Default: 127.0.0.1")
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help="Port to use. Default: 8000, with automatic fallback if it is busy",
    )
    parser.add_argument("--no-browser", action="store_true", help="Do not open the browser automatically")
    return parser.parse_args()


def open_browser(url: str) -> None:
    threading.Timer(0.5, lambda: webbrowser.open(url)).start()


def main() -> int:
    args = parse_args()

    if not INDEX_FILE.exists():
        print(f"Error: {INDEX_FILE.name} was not found in {ROOT}", file=sys.stderr)
        return 1

    handler = functools.partial(AppHandler, directory=str(ROOT))
    start_port = args.port or 8000
    ports_to_try = [start_port] if args.port is not None else range(start_port, start_port + 50)

    for port in ports_to_try:
        try:
            with socketserver.TCPServer((args.host, port), handler) as server:
                url = f"http://{args.host}:{port}/"
                print(f"TW Status Tracker is running at {url}")
                print("Press Ctrl+C to stop.")

                if not args.no_browser:
                    open_browser(url)

                server.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            return 0
        except OSError as exc:
            if args.port is not None:
                print(f"Error: could not start server on {args.host}:{port} ({exc})", file=sys.stderr)
                return 1
            continue

    print(f"Error: could not find an open port from {start_port} to {start_port + 49}", file=sys.stderr)
    return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
