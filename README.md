# とわなにか

ひびきが幸せに成長し、よい人生を送るための場所。健康・自由（お金）・愛の3つを、こさきたちAIのみんなと育てる。公開: https://towananika.github.io/hibiki/

- `index.html` 入口。グループ分けのメニュー。ページを足すときは `GROUPS` に1行（`new:` で7日間NEW）
- `money/` お金（金利メーター、配分、週間レポート `money/report.html`）
- `health/` 健康、`sleep/` 睡眠メモ（`hibiki-sleep-v1`）、`relations/` 愛と関係、`home/` 住まい（入居チェック）
- `study/` 勉強（7章は `study/ch7.html` にくわしく。放送大学「デジタル経済の理解」全15章、進み具合は `hibiki-study-digital-v1`。貨幣金融論8講は `study/view.html?n=money8`、上級マクロ経済論8〜15講は `study/view.html?n=macro8`〜`macro15`）
- 勉強ノートは説明の直後に4択の確認問題を表示。選ぶと正誤と理由が分かり、やり直せる。
- `study/` の週別プラン：形成評価期間8/17〜12/13を基準に、各15講・週1講の目安を表示（公式講割りではない）。講座カード内のグラフで、完了は緑、今週の目安は青に表示。総講数や完了数の分数は一覧に表示しない。「予定と記録」を開くと、科目・週ごとの予定と完了状況を調整できる（`hibiki-study-plan-v1`）。
- 世界の宗教8講「仏教」：`study/view.html?n=religion8`（四聖諦・五蘊・八正道を、身近な例と図で学ぶ）
- `timeline/` これまでの道（人生タイムライン）。できごとは `private/timeline.json`（暗号）、本人が足した分は `hibiki-timeline-v1`
- `about/` 私について（ほかのAIに貼る説明書）。中身は `private/about.json`（暗号、平文は共有フォルダの `hibiki/about-me.md`）。全文コピーと🔒を除いたコピー。公開版 `about/ai.txt`（お金・人間関係・本名・地域を抜いた文。URLを渡せばほかのAIが読める）

## 端末どうしの同期
- `sync.js` を各記録ページの `<head>` で読む。`hibiki-` で始まる localStorage を鍵ごとに新しいほうでそろえる。
- 合言葉は `sync/` で入れる。端末に残るのは SHA-256 にした id だけ。
- サーバーは `worker/`（Cloudflare Worker + Durable Object）。公開は ひびき が `worker/deploy.ps1` を実行。

## ログインと個人ページ（2026-10-09）
- ログインは7日。開くたびに7日へ延びる（`sync.js`）。
- 個人的な数字は `private/<name>.json` に、ひびきの公開鍵（`private/owner.pub.json`）で暗号にして置く。読めるのはログインした端末だけ。
- 暗号にする: `node tools/seal.mjs <平文.json> <name>`。平文はリポジトリに置かない（共有フォルダ economy/private/）。
- 秘密鍵は合言葉から作った鍵で包んで同期（`hibiki-keywrap`）。公開鍵は Worker の `/owner` に置かれる。

- デジタル経済8〜15講：`study/view.html?n=ch8`〜`ch15`（ブロックチェーン、ゲーム、メディア、共有、移動、利益、仕事、格差）。講座一覧と週別の記録から開ける、図と4択つきの教材。

- 開かれた社会と21世紀8講「まちづくり」：`study/view.html?n=open8`（住民参加、各国と韓国の展開、地域の回復力を図と4択で学ぶ）。
