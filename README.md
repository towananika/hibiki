# とわなにか

ひびきが幸せに成長し、よい人生を送るための場所。健康・自由（お金）・愛の3つを、こさきたちAIのみんなと育てる。公開: https://towananika.github.io/hibiki/

- `index.html` 入口。3つの資産の図とページの一覧。ページを足すときは `PAGES` に1行、状態は `STATE`
- `money/` お金（金利メーター、配分、週間レポート `money/report.html`）
- `health/` 健康、`relations/` 愛と関係、`home/` 住まい（入居チェック）

## 端末どうしの同期
- `sync.js` を各記録ページの `<head>` で読む。`hibiki-` で始まる localStorage を鍵ごとに新しいほうでそろえる。
- 合言葉は `sync/` で入れる。端末に残るのは SHA-256 にした id だけ。
- サーバーは `worker/`（Cloudflare Worker + Durable Object）。公開は ひびき が `worker/deploy.ps1` を実行。

## ログインと個人ページ（2026-10-09）
- ログインは7日。開くたびに7日へ延びる（`sync.js`）。
- 個人的な数字は `private/<name>.json` に、ひびきの公開鍵（`private/owner.pub.json`）で暗号にして置く。読めるのはログインした端末だけ。
- 暗号にする: `node tools/seal.mjs <平文.json> <name>`。平文はリポジトリに置かない（共有フォルダ economy/private/）。
- 秘密鍵は合言葉から作った鍵で包んで同期（`hibiki-keywrap`）。公開鍵は Worker の `/owner` に置かれる。
