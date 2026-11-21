"""PCなしで YouTube 動画1本を要約する（Google 公式 Gemini API に動画URLを渡す）。

YouTube へは Google 側が自分で読みに行くので、クラウドのボット確認に当たらない。
Cookie・ログイン・プロキシは使わない。公開動画のみ。
使い方: GEMINI_API_KEY=... python gemini_summary.py "動画URL" > summary.md
"""
import json
import os
import sys
from urllib.request import Request, urlopen

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from reader import normalize  # noqa: E402

PROMPT = """この動画の内容を、日本語だけで（ハングルは使わない）要約してください。
読む人は韓国在住の日本語話者です。韓国ならではの言葉は日本語に言いかえ、必要なら「> 補足：…」で説明してください。
形式（Markdown）:
# 動画タイトル（分かれば）
ひとこと要約（1行）
## 大事なポイント（3〜7個の箇条書き、だいたいの時刻 [mm:ss] つき）
## くわしく（話の流れにそって短く）
## 自分の生活に使えること（1〜3個）
動画で確かめられないことは推測で書かず「動画では不明」と書いてください。"""


def summarize(url, key, model):
    body = {'contents': [{'parts': [{'file_data': {'file_uri': normalize(url)}}, {'text': PROMPT}]}]}
    request = Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
                      data=json.dumps(body).encode(), method='POST',
                      headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
    with urlopen(request, timeout=280) as response:
        data = json.load(response)
    parts = data.get('candidates', [{}])[0].get('content', {}).get('parts', [])
    text = ''.join(p.get('text', '') for p in parts).strip()
    if not text:
        raise RuntimeError('要約が空でした: ' + json.dumps(data, ensure_ascii=False)[:500])
    return text + f'\n\n---\n元動画: {normalize(url)}\n'


if __name__ == '__main__':
    key = os.environ.get('GEMINI_API_KEY')
    if not key:
        sys.exit('GEMINI_API_KEY がありません（GitHub の Secrets に入れてください）。')
    print(summarize(sys.argv[1], key, os.environ.get('GEMINI_MODEL') or 'gemini-flash-latest'))
