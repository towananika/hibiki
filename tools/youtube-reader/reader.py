import json
import os
from pathlib import Path
import re
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit
from urllib.request import Request

PORT = 9032
ORIGIN = f'http://127.0.0.1:{PORT}'
ROOT = Path(__file__).resolve().parent


def normalize(value):
    url = urlsplit(value.strip())
    if url.scheme != 'https' or url.username or url.password or url.port not in (None, 443):
        raise ValueError('YouTube動画のHTTPSリンクを指定してください。')
    host = (url.hostname or '').lower()
    if host == 'youtu.be':
        video = url.path.strip('/')
    elif host in ('youtube.com', 'www.youtube.com', 'm.youtube.com'):
        parts = url.path.strip('/').split('/')
        video = parse_qs(url.query).get('v', [''])[0] if url.path == '/watch' else (parts[1] if len(parts) == 2 and parts[0] in ('shorts', 'embed', 'live') else '')
    else:
        video = ''
    if not re.fullmatch(r'[A-Za-z0-9_-]{11}', video):
        raise ValueError('動画1本のリンクが必要です。チャンネルや再生リストは対象外です。')
    return 'https://www.youtube.com/watch?v=' + video


def caption_lines(data):
    lines = []
    for event in data.get('events', []):
        text = ''.join(segment.get('utf8', '') for segment in event.get('segs', []))
        text = re.sub(r'\s+', ' ', text).strip()
        if not text:
            continue
        start = max(0, event.get('tStartMs', 0) / 1000)
        # Keep nonidentical rolling captions: removing overlaps can erase speech.
        if lines and lines[-1]['text'] == text:
            continue
        lines.append({'start': start, 'text': text})
    return lines


def choose_track(info):
    for source, auto in [('subtitles', False), ('automatic_captions', True)]:
        tracks = info.get(source) or {}
        languages = sorted(tracks, key=lambda x: (not x.endswith('-orig'), not x.startswith('ja'), not x.startswith('ko'), not x.startswith('en'), x))
        for language in languages:
            for track in tracks[language]:
                if track.get('ext') == 'json3' and not parse_qs(urlsplit(track.get('url', '')).query).get('tlang'):
                    return language, auto, track['url']
    return None


def read_video(url):
    import yt_dlp
    from urllib.request import HTTPRedirectHandler, build_opener

    class DenyRedirect(HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None

    options = {'quiet': True, 'no_warnings': True, 'skip_download': True, 'noplaylist': True,
               'socket_timeout': 12, 'retries': 0, 'extractor_retries': 0, 'ignoreconfig': True,
               'cachedir': False}
    with yt_dlp.YoutubeDL(options) as reader:
        info = reader.extract_info(normalize(url), download=False)
    result = {'url': normalize(url), 'title': info.get('title', ''), 'author': info.get('uploader', ''),
              'status': 'no_subtitles', 'message': '取得可能な字幕がありません。映像・音声の内容は未確認です。', 'segments': []}
    chosen = choose_track(info)
    if not chosen:
        return result
    language, auto, target = chosen
    parsed = urlsplit(target)
    if parsed.scheme != 'https' or parsed.hostname not in ('www.youtube.com', 'youtube.com', 'video.google.com') or parsed.path != '/api/timedtext' or parsed.port not in (None, 443):
        raise ValueError('字幕の取得先を確認できませんでした。')
    with build_opener(DenyRedirect()).open(Request(target, headers={'User-Agent': 'Mozilla/5.0'}), timeout=15) as response:
        raw = response.read(4_000_001)
    if len(raw) > 4_000_000:
        raise ValueError('字幕が大きすぎます。短い動画で試してください。')
    segments = caption_lines(json.loads(raw))
    if not segments:
        return result
    result.update(status='read', language=language, automatic=auto, segments=segments,
                  message='自動字幕。誤認識が含まれる場合があります。' if auto else '投稿者が提供する字幕。内容の正確性を保証するものではありません。')
    return result


def read_isolated(url):
    try:
        completed = subprocess.run([sys.executable, str(ROOT / 'reader.py'), '--worker', normalize(url)],
                                   capture_output=True, timeout=80, encoding='utf-8', errors='replace',
                                   env={**os.environ, 'PYTHONIOENCODING': 'utf-8'},
                                   creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
    except subprocess.TimeoutExpired:
        raise ValueError('取得が時間切れになりました。連続して再試行せず、時間をおいてください。')
    if completed.returncode:
        if 'No module named' in completed.stderr:
            raise ValueError('実行環境にyt-dlpがありません。接続方法を確認してください。')
        raise ValueError('YouTubeから取得できませんでした。ログイン要求・公開制限・通信制限などが考えられます。制限の回避は行いません。')
    return json.loads(completed.stdout)


def serve():
    busy = threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def send(self, status, body, content_type='application/json; charset=utf-8'):
            raw = json.dumps(body, ensure_ascii=False).encode('utf-8') if not isinstance(body, bytes) else body
            self.send_response(status)
            for name, value in {'Content-Type': content_type, 'Cache-Control': 'no-store',
                                'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
                                'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'"}.items():
                self.send_header(name, value)
            self.end_headers()
            self.wfile.write(raw)

        def valid_host(self):
            return self.headers.get('Host') == f'127.0.0.1:{PORT}'

        def do_GET(self):
            if not self.valid_host():
                return self.send(403, {'error': 'このPCのローカルURLから開いてください。'})
            files = {'/': ('index.html', 'text/html; charset=utf-8'), '/app.js': ('app.js', 'text/javascript; charset=utf-8'), '/style.css': ('style.css', 'text/css; charset=utf-8')}
            if self.path == '/api/status':
                return self.send(200, {'app': 'hibiki-youtube-reader', 'ready': True})
            file = files.get(self.path)
            return self.send(200, (ROOT / file[0]).read_bytes(), file[1]) if file else self.send(404, {'error': 'Not found'})

        def do_POST(self):
            if not self.valid_host() or self.headers.get('Origin') != ORIGIN or self.headers.get('X-YouTube-Reader') != '1':
                return self.send(403, {'error': 'この画面から操作してください。'})
            if self.path != '/api/read':
                return self.send(404, {'error': 'Not found'})
            if not busy.acquire(blocking=False):
                return self.send(409, {'error': '読み取り中です。'})
            try:
                size = int(self.headers.get('Content-Length', '0'))
                if not 0 < size <= 4096:
                    raise ValueError('入力が長すぎるか、空です。')
                data = json.loads(self.rfile.read(size))
                self.send(200, read_isolated(data.get('url', '')))
            except (ValueError, TypeError, AttributeError):
                self.send(400, {'error': str(sys.exception())})
            except Exception:
                self.send(502, {'error': '字幕の取得に失敗しました。映像・音声の内容は未確認です。'})
            finally:
                busy.release()

    server = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'YouTube Reader: {ORIGIN}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) > 2 and sys.argv[1] == '--worker':
        print(json.dumps(read_video(sys.argv[2]), ensure_ascii=False))
    elif len(sys.argv) > 1:
        print(json.dumps(read_isolated(sys.argv[1]), ensure_ascii=False, indent=2))
    else:
        serve()
