#!/usr/bin/env python3
"""
Đoàn Thượng Badminton - Local Development & Test Server
Chạy lệnh: python server.py
Mở trình duyệt: http://localhost:8000
"""

import http.server
import socketserver
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("=" * 65)
        print("  🏸 ĐOÀN THƯỢNG BADMINTON - HỆ THỐNG XẾP HẠNG BWF TRỰC TUYẾN 🏸")
        print("=" * 65)
        print(f" Server đang chạy tại: http://localhost:{PORT}")
        print(" Nhấn Ctrl + C để dừng server.")
        print("=" * 65)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nĐã dừng server.")
            sys.exit(0)
