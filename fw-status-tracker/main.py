from __future__ import annotations

import argparse
import functools
import http.server
import socketserver
import sys
import threading
import webbrowser
from pathlib import Path

# Locate the root directory containing this script and its companion 'index.html' file
ROOT = Path(__file__).resolve().parent
INDEX_FILE = ROOT / "index.html"


class AppHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP request handler that extends SimpleHTTPRequestHandler

    to disable browser-side caching for all served resources.
    """

    def end_headers(self) -> None:
        """Intercepts the response headers and inserts a 'Cache-Control' header

        to ensure developers and users always see the latest UI updates.
        """
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def parse_args() -> argparse.Namespace:
    """Configures and runs the command-line interface (CLI) parser.

    Returns:
        argparse.Namespace: An object containing all parsed command-line
        arguments.
    """
    parser = argparse.ArgumentParser(description="Run the TW Status Tracker app.")

    # Configure optional arguments for host, port selection, and browser automation
    parser.add_argument(
        "--host", default="127.0.0.1", help="Host to bind. Default: 127.0.0.1"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help="Port to use. Default: 8000, with automatic fallback if it is busy",
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Do not open the browser automatically",
    )

    return parser.parse_args()


def open_browser(url: str) -> None:
    """Spawns a background thread that waits briefly before launching the web

    browser.
 
    A slight delay ensures the server has fully initialised and is ready to
    accept connections.
    """
    threading.Timer(0.5, lambda: webbrowser.open(url)).start()


def main() -> int:
    """Main execution lifecycle of the local server application.

    Validates prerequisite files, scans for open networking ports, starts the
    HTTP server, and gracefully handles manual termination.
    """
    args = parse_args()

    # Pre-flight check: Verify that 'index.html' exists in the expected directory
    if not INDEX_FILE.exists():
        print(
            f"Error: {INDEX_FILE.name} was not found in {ROOT}", file=sys.stderr
        )
        return 1

    # Pin the handler to serve files out of our designated ROOT directory
    handler = functools.partial(AppHandler, directory=str(ROOT))

    # Determine port searching strategy:
    # Use a single static port if specified, otherwise scan a range of 50 local ports
    start_port = args.port or 8000
    ports_to_try = (
        [start_port] if args.port is not None else range(start_port, start_port + 50)
    )

    # Attempt to bind and start the server on an available port
    for port in ports_to_try:
        try:
            with socketserver.TCPServer((args.host, port), handler) as server:
                url = f"http://{args.host}:{port}/"
                print(f"TW Status Tracker is running at {url}")
                print("Press Ctrl+C to stop.")

                # Launch local default web browser unless explicitly told not to
                if not args.no_browser:
                    open_browser(url)

                # Keep the main execution block alive and serving network traffic indefinitely
                server.serve_forever()

        except KeyboardInterrupt:
            # Catch Ctrl+C interruptions cleanly without printing messy stack traces
            print("\nServer stopped.")
            return 0

        except OSError as exc:
            # If the user passed a specific port and it's occupied, fail immediately
            if args.port is not None:
                print(
                    f"Error: could not start server on {args.host}:{port} ({exc})",
                    file=sys.stderr,
                )
                return 1
            # If no port was specified, silently continue scanning through the designated range
            continue

    # Terminal failure state if all 50 scanned sequential ports are busy
    print(
        f"Error: could not find an open port from {start_port} to {start_port + 49}",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    # Ensure system exit statuses map correctly back to terminal environments
    raise SystemExit(main())
