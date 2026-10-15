# とわなにか（ひびきのライフサイト）作業メモ

ひびき（韓国在住・日本語でやりとり）が幸せに成長し、よい人生を送るための場所。公開: https://towananika.github.io/hibiki/
ひびきは日本語だけで読む（サイトの表示はすべて日本語）。**ハングルは使わない**（原本が韓国語でも）。韓国ならではの言葉は日本語に言いかえ、必要なら「補足」（`> 補足：…`）で説明する（2026-10-11）。新しい内容はトークン節約のため、まず `/mnt/project-files/hibiki/` に md で書き、Webページにするのは頼まれたときだけ（2026-10-11）。ページは文字を少なく、図・メーター・カードで見せる。
勉強の章は HTML を作らず `study/notes/chN.md`（絵の出る md）を書き、`study/view.html?n=chN` で見せる。科目は `study/index.html`（科目えらび）に1枚足す（デジタル経済は `study/digital.html`、食の暮らしは `view.html?n=tradition7`）。難しい言葉は `study/glossary.json` に足す（選んで「あとで聞く」に入れた言葉の答え）。書き方は `study/notes/README.md`、理由は `/mnt/project-files/hibiki/study/token-research.md`。

## 新しいページを足す手順
1. `<name>/index.html` を作る。既存ページ（`timeline/` `study/` `home/`）の head と `:root` の色をそのまま写す（木 `--wood`・セージ `--sage`・青 `--blue`・赤 `--red`、ダークモード対応、`max-width:480px`）。
2. head に `<meta name="robots" content="noindex, nofollow">` と `<script src="../sync.js"></script>` を入れる。（`sync.js` は日本語固定（翻訳オフ）と、PCでの拡大（700px以上で1.3倍、1200px以上で1.5倍）も全ページにかける）ログインしていない端末ではページが隠れる（`window.HB_PUBLIC = true` で公開）。
3. 入口 `index.html` の `GROUPS` に1行足す。`new: "YYYY-MM-DD"` を付けると7日間「NEW」が出る。
4. ページで保存する値は localStorage の `hibiki-` で始まる鍵に入れる（`sync.js` が端末どうしでそろえる）。
5. スマホ幅（390px）で Playwright のスクリーンショットを撮って確かめる。`sync.js` は route で空にするか、`HibikiSync.open` を平文で差し替える。
6. ブランチ → PR → squash マージ（自分でマージしてよい）。README の一覧にも1行。

## 個人情報
- リポジトリは公開。住所・お金の額・人生のできごとなど個人のことは平文で置かない。
- `private/<name>.json` に暗号で置く: `node tools/seal.mjs <平文.json> <name>`。平文は共有フォルダ（`/mnt/project-files/hibiki/private/`、`economy/private/`）に置き、リポジトリには入れない。
- ページでは `HibikiSync.open("<name>").then(...)` で読む。null ならロック表示。

## いまあるページ
入口 `index.html`（グループ分けメニュー）／ `health/` ／ `relations/` ／ `money/`（週間レポートは自動ルーチンが更新）／ `money/budget.html`（家計：所得と費用、`hibiki-budget-v1`）／ `money/assets.html`（預金と投資、`hibiki-assets-v1`）／ `money/vehicle.html`（乗り物の費用：実費と購入費の月割り、`hibiki-vehicle-v1`）／ `dreams/`（夢日記、`hibiki-dreams-v1`）／ `priority/`（いま、これを：優先の順番。判断は `priority/pri.js`）／ `home/` ／ `timeline/`（`private/timeline.json`）／ `study/`（放送大学「デジタル経済の理解」）。
年齢は `hibiki-life-age` を各ページで共有する。

## 本人について
`/mnt/project-files/hibiki/profile.md` を最初に読む。分かったことは日付つきで追記する。
