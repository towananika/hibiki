# とわなにか

ひびきが幸せに成長し、よい人生を送るための場所。健康・自由（お金）・愛の3つを、こさきたちAIのみんなと育てる。公開: https://towananika.github.io/hibiki/

- `index.html` 入口。グループ分けのメニュー。ページを足すときは `GROUPS` に1行（`new:` で7日間NEW）
- `productivity/` 今日の一歩。時間・気分から小さな行動を提案し、1日3つまで選んで集中・成果を記録。既存の優先順位と学習教材を活用。日別データは `hibiki-productivity-v1:YYYY-MM-DD`。
- `money/` お金（金利メーター、配分、週間レポート `money/report.html`）／円とウォン `money/yen.html`（`hibiki-yen-v1`）／使える制度 `money/support.html`（韓国の制度おすすめ、`hibiki-support-v1`）
- `health/` 健康、`sleep/` 睡眠メモ（`hibiki-sleep-v1`）、`relations/` 愛と関係、`home/` 住まい（入居チェック）
- `study/` 勉強（7章は `study/ch7.html` にくわしく。放送大学「デジタル経済の理解」全15章、進み具合は `hibiki-study-digital-v1`。貨幣金融論8講は `study/view.html?n=money8`、上級マクロ経済論8〜15講は `study/view.html?n=macro8`〜`macro15`）
- 勉強ノートは説明の直後に4択の確認問題を表示。選ぶと正誤と理由が分かり、やり直せる。
- `study/` の週別プラン：形成評価期間8/17〜12/13を基準に、各15講・週1講の目安を表示（公式講割りではない）。講座カード内のグラフで、完了は緑、今週の目安は青に表示。総講数や完了数の分数は一覧に表示しない。週別プラン・学習週の設定画面は設けず、講座のグラフを押すと、その科目の各講の完了状況を記録できる（`hibiki-study-plan-v1`）。
- 世界の宗教8講「仏教」：`study/view.html?n=religion8`（四聖諦・五蘊・八正道を、身近な例と図で学ぶ）
- `timeline/` これまでの道（人生タイムライン）。できごとは `private/timeline.json`（暗号）、本人が足した分は `hibiki-timeline-v1`
- `plan/` 3年計画（ビジョン・柱ごとの優先順・3年→季節→4週）。中身は `private/plan.json`（暗号）、4週の✓は `hibiki-plan-v1`。`priority/` の「先にやる3つ」は計画の1週目から
- `about/` 私について（ほかのAIに貼る説明書）。中身は `private/about.json`（暗号、平文は共有フォルダの `hibiki/about-me.md`）。全文コピーと🔒を除いたコピー。公開版 `about/ai.txt`（お金・人間関係・本名・地域を抜いた文。URLを渡せばほかのAIが読める）

## ほしいものと夢の区分

`wishes/` に購入品とサービスの一覧を追加。希望・参考情報・仮案を区別し、詳細は折りたたむ。個人の希望と資料は `private/wishlist-20261027.json` に既存所有者鍵で暗号化し、元の夢データは上書きしない。暮らしの夢への追加は復号後に一度だけ取り込む。

参考価格・仕様・料金は本人が提供した資料の値で、今回再確認していない。未確定の割引価格を本人の予算へ自動入力しない。予算・用意済み額・時期・優先度・購入／契約状態は編集できる。編集は `mio-wishlist-settings-v1` に端末内のみ非暗号化保存し、既存同期へ自動送信しない。通貨換算や購入・契約はしない。

テスト：`node --test wishes/model.test.mjs`。公開コードに本人の希望や価格一覧の平文を含めない。

## メモ帳

`notes/` は入力原文を保持し、350ms後に端末内の語句ルールで簡易分類する。AI要約は未接続。選択した保存メモと入力中のメモから相談文を確認・コピーし、ChatGPTへ手動で渡せる。外部AIへの自動送信や有料API呼び出しは行わない。

保存キー `mio-local-notes-v1` は意図的に従来の `hibiki-*` 同期対象外とし、ブラウザ内のみ・非暗号化。共有端末での利用には注意。公開リポジトリにユーザーのメモを保存しない。ログイン画面の表示制御は、個人データのサーバー側認可を保証しない。`node --test notes/organize.test.mjs` で分類と相談文生成を確認。

## 端末どうしの同期
- 家計 `money/budget.html`：実額を明細で直接編集。消費の目安はスライダー・金額入力で試算し、月の残額と実額との差を表示する。試算は `hibiki-budget-plan-v1` に別保存し、既存の家計記録を変更しない。参考額と住居費上限は折りたたみ表示。

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

- ホームのサイト内検索：ページ・教材を関連語と本文から検索。ページの説明・キーワードは `search/pages.json`、教材は `study/notes/` から `node tools/build-search.mjs` で `search/index.json` を更新する。個人の記録や暗号化データは索引化しない。

- 貨幣金融論9講：`study/view.html?n=money9`（通貨乗数・現金・準備金・貯蓄性預金・通貨供給関数を、やさしい説明と計算例で学ぶ）。

- 教材の準備状況は講座カードと学習記録に表示（教材あり・準備中、デジタル経済の概要のみは要点のみ）。`study/materials.js` は `node tools/build-study-materials.mjs` または検索索引の更新で、実際のノートから生成する。学習完了とは別に管理。

- 世界の宗教9講：`study/view.html?n=religion9`（ジャイナ教・シク教・バハイ信仰。比較図と説明直後の4択、8講への移動付き）。
