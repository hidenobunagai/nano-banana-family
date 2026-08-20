# 改善提案まとめ (2026-08-20)

`docs/improvements-2026-08-19.md` の続編。今回は 3 レンズの並行レビュー
(サーバー側 / クライアント側 / 過剰設計)で全ソースを再調査し、主要指摘は
実コードで裏取り済み。既存ドキュメントで対応済み・保留の項目との重複は除外。

## 調査時のベースライン

- 3 エージェント並行: サーバー(`src/app/api`・`src/utils/server`・`src/auth.ts`) /
  クライアント(`src/components`・`src/hooks`・`src/app`) / 過剰設計(全ツリー+依存確認)
- P0 級の指摘はすべて実コード・node_modules で直接検証(下記「確認済み」欄)

## 新規指摘

### P0 — 本番で発生し得る重大問題

#### P0-1 Vercel 関数タイムアウト(10s)と SDK リトライ(60s×3)の矛盾 — ほぼ毎回 504

- 場所: `src/app/api/freestyle-edit/route.ts` / `icon-generate/route.ts`(`maxDuration` 未設定)+ `src/utils/server/imageGeneration.ts:32-36`
- 内容: 両ルートに `maxDuration` がなく(vercel.json もなし)、hobby プランは関数予算 10s。
  一方 `@google/genai` は既定タイムアウト 60s + maxRetries=2(`node_modules/@google/genai/dist/index.mjs:10511` で確認)。
  画像生成は通常 10〜40s かかるため、ほぼ毎回プラットフォーム側の 504 で死ぬ。
  キャッシュも入らず、Gemini 呼び出しはサーバー側で完了するため課金も発生する。
- 修正: 両ルートに `export const maxDuration = 300;` + `generateContent` に
  AbortController(~90s)を渡し、abort を 504 の JSON レスポンスにマップ。
- 確認済み: `maxDuration` export なし / SDK `DEFAULT_TIMEOUT = 60000` を grep で確認

#### P0-2 キャッシュキーの衝突 — 別画像・別ユーザーの生成結果を返し得る

- 場所: `src/app/api/freestyle-edit/route.ts:44-47`(icon-generate も同型)、`src/utils/server/cache.ts:62-65`
- 内容: キーが `prompt + images.map(f => "${f.name}:${f.size}:${f.type}")`。
  同名・同サイズ・同 MIME の別内容ファイルは衝突する。キャッシュはグローバル
  (ユーザー別でない)ため、A の結果が B に返り得る。
- 失敗シナリオ: photo.jpg(子A, 2.3MB)で生成→削除→同サイズの photo.jpg(子B)を
  同プロンプトでアップロード→A の加工結果が 200 で即返る。
- 修正: 各ファイルのコンテンツハッシュ(例: sha1)をキーに含める。
  画像は最大 8MB×5 なのでハッシュ化コストは無視できる。
- 確認済み: ルートのキー構築コードで `name:size:type` 連結を確認

#### P0-3 fetch にタイムアウトなし + 生エラーメッセージ + isSubmitting の永久ロック

- 場所: `src/hooks/useEditorSubmit.ts:94-127`
- 内容: fetch にタイムアウトがなく、`await res.json()` が `res.ok` チェックより先に
  走るため、非 JSON ボディ(プラットフォーム 413 ページ、HTML 500、空ボディ)では
  `SyntaxError("Unexpected token '<'...")` が生のまま日本語 UI に表示される
  (`requestErrorMessage.ts:25` の 413 分岐は非 JSON のとき常に unreachable)。
  また `TypeError("Failed to fetch")` も生表示。fetch が永遠に未解決の場合、
  進捗バーは ~86% で停止し `isSubmitting` が true のまま全入力が無効化され、
  逃げ道はリロードのみ。
- 修正: `res.text()` → 安全な JSON.parse(失敗時 null)、`TypeError` を日本語にマップ、
  `AbortSignal.timeout(120_000)` を fetch に渡す(再送/アンマウント時の abort と共存可)。

### P1 — 正しさ・セキュリティ

#### P1-1 ファイルピッカーキャンセルでアップロード済み画像が消える

- 場所: `src/hooks/useUploadSlots.ts:76-82`
- 内容: `handleFileChange` は空の `event.target.files` を「削除」として扱い、
  previewUrl を revoke してスロットを空にする。ブラウザはキャンセル時にも
  `change` を空 FileList で発火するため、「画像を変更」を開いて Escape/Cancel を
  押すだけで選択済みの参考写真が消える。
- 修正: `if (!file) return;`(スロットは現状維持)— 標準のガード。
- 確認済み: コードで revoke + クリア分岐を確認

#### P1-2 URL メタデータ/OG 画像 fetch のボディ読みが無制限(ハング・OOM)

- 場所: `src/utils/server/urlMetadata.ts:36-49`、`src/utils/server/imageProcessing.ts:62-70`
- 内容: AbortController のタイマーはヘッダー到達で解除され、その後の
  `response.text()` / `arrayBuffer()` はタイムアウトもサイズ上限もなく全量
  バッファする。`imageProcessing.ts` の 4MB チェックも全量メモリ読み後の判定。
  「ヘッダーを送ってから停止するサーバー」で関数予算いっぱいハング、
  「巨大な偽画像」でメモリ枯渇のリスク。
- 修正: `content-length` ヘッダーの事前チェック + 読み込み中も abort タイマーを
  生かす(またはサイズカウンタ超過で abort)、一括 `arrayBuffer()` をやめる。

#### P1-3 toAppError がエラーメッセージの秘匿化を無効化

- 場所: `src/utils/errors.ts:23-25,39-44` + `src/utils/server/api-helpers.ts:116`
- 内容: `getUserMessage` は本番で生 Error のメッセージを秘匿するが、
  `toAppError` が先に `new AppError(error.message, 500)` に変換するため、
  秘匿分岐は実質デッドコード。Gemini SDK の生メッセージ(モデル名・API 詳細・
  ブロックされた URL など)がそのままクライアントに届く。
- 修正: `toAppError` で 500 系は汎用メッセージにする(または
  `getUserMessage` が `statusCode >= 500` なら message を返さない)。
- 確認済み: `errors.ts` の該当行で変換→message 露出の流れを確認

#### P1-4 SSRF チェックのバイパス 2 件

- 場所: `src/utils/server/urlSafety.ts:37-45`(isPrivateIpv6)、`101-112,119-141`(TOCTOU)
- 内容 (a): IPv4 マップ IPv6(`0:0:0:0:0:ffff:7f00:1` 等)は `isIP=6` で `::` 始まり
  でないためプライベート判定をすり抜ける(node の fetch は 127.0.0.1 に接続)。
- 内容 (b): `assertSafeUrl` の DNS 解決結果を接続にピン留めしないため、
  DNS rebinding 型 TOCTOU が成立する(Vercel サンドボックスでは影響限定的だが
  `next start` の自前運用なら完全な内部 SSRF になり得る)。
- 修正: `:ffff:` 形式を検出して埋め込まれた v4 オクテットを再判定。
  (b) は「解決 IP に接続し Host ヘッダーで渡す」が正攻法だが手間がかかるため、
  最小限として (a) の修正 + モジュールコメントに制限を明記。
- 確認済み: node で `0:0:0:0:0:ffff:7f00:1` が isIP=6 になること、コードで
  `::` 始まりのみ判定していることを確認

#### P1-5 キーボードでファイルアップロードが一切できない(WCAG 2.1.1)

- 場所: `src/components/ui/FileInput.tsx:98-105,129`
- 内容: `<input type="file">` は `className="hidden"`(display:none)でタブ順序にも
  入らず、ラベルもフォーカス不可。キーボード専用ユーザーはファイル選択を開けない。
  「画像を変更」オーバーレイは opacity-0 の group-hover 下にあり、タッチでも
  ほぼ到達不能。
- 修正: `sr-only` クラスで input をタブ順序に残す + 置換ボタンを実ボタン化。

#### P1-6 URL メタデータ fetch が生成処理と直列 — 1 行で並列化

- 場所: `src/app/api/icon-generate/route.ts:74,83`
- 内容: `await fetchUrlMetadata(url)`(最大 5s)が `filesToParts` の前に直列実行され、
  毎リクエスト分のレイテンシが生成時間に加算される。両者は独立。
- 修正: `const [urlMeta, partsResult] = await Promise.all([...])`。

### P2 — UX・a11y・堅牢性

- **P2-1 スキップリンクが死んでいる** — `src/app/layout.tsx:85` は `#main-content` を
  指すが、該当 id の要素がどこにもない(WCAG 2.4.1)。Shell のコンテンツラッパーに
  `id="main-content"` + `tabIndex={-1}` を追加(1行)。
- **P2-2 モーダルのフォーカストラップ/復元/スクロールロックなし** —
  `src/components/PromptReferencePicker.tsx:124-133`。Tab で背面ページに脱出、
  閉じるとフォーカスが body へ、背面がスクロール可能。トラップ + 開いた時点の
  activeElement 保存/復元 + overflow ロック(数行の keydown 処理)。
- **P2-3 Ctrl+Z が input で吞まれる** — `src/hooks/useUndoRedoShortcuts.ts:15-28`。
  TEXTAREA/contenteditable 以外(IconCreator の名前・URL input、モーダルの検索欄)では
  preventDefault だけして何もしない。`isEditing` 時のみ処理(または INPUT は
  ネイティブ undo に通す)。
- **P2-4 prefers-reduced-motion 未対応**(08-19 の持ち越し) — framer-motion の
  スプリング(Shell:67, page:33,88, Dock:14-17, FileInput:66-133)、
  `window.scrollTo({behavior:"smooth"})`(FreestyleEditor:149,179, useEditorSubmit:82)。
  `MotionConfig reducedMotion="user"` + smooth の条件分岐で対応。
- **P2-5 プロンプトインジェクション(外部メタデータ)** — `src/utils/server/iconPromptBuilder.ts:41-48`。
  任意 URL の title/description を無防備にプロンプトへ展開。ページ側に
  「指示を無視しろ」系の記述があると identity 保持の枠組みを覆せる(出力は画像で
  情報奪取は限定的だが)。データ区切り + 「信頼しないページデータ」明示 +
  title/description の 200 字切り詰め。
- **P2-6 ProgressDisplay の a11y** — `src/components/ProgressDisplay.tsx:36-62`。
  100ms ごとに変わる数値を `aria-live="polite"` で読み上げ続け、`role="progressbar"` +
  `aria-valuenow` がない。バーにロール付与、aria-live は段階変化のみに間引く。
- **P2-7 IconCreator のスタイル選択が支援技術に未公開** — 選択状態を枠色のみで
  表現。`aria-pressed` を追加。
- **P2-8 リセットが生成中も有効** — `FreestyleEditor.tsx:392` / `IconCreator.tsx:427`。
  送信中に「入力をクリア」すると、fetch 完了時に結果がクリア済みエディタに
  着地する。`disabled={isSubmitting}` を追加。
- **P2-9 ダウンロード拡張子が常に .png** — `useEditorSubmit.ts:119`。サーバーの
  mimeType(webp 等)と不整合。実際の mimeType から拡張子を導出。

### P3 — 軽微・要判断

- **P3-1 77KB のプロンプトライブラリが eager ロード** — `src/promptReferences.ts`
  (77KB)を静的 import。`next/dynamic` で PromptReferencePicker を遅延化。
- **P3-2 manifest theme_color 不整合** — `src/app/manifest.ts:13` `#0f172a` vs
  layout.tsx/globals.css の `#f5f6f8`(08-19 から未着手)。1行。
- **P3-3 sw.ts の API ルールが POST も捕捉** — `src/app/sw.ts:144-159` の
  NetworkFirst がメソッド不問。将来 POST ルート追加時に `cache.put` が非 GET で
  怒られる(下記 P3-6 で SW 整理するなら同時対応)。
- **P3-4 useResultHistory の未来分岐** — 戻った状態から生成しても履歴を truncate
  しないため「次の結果」が置き換え済みの古い結果を表示する。設計判断。
- **P3-5 生成結果の自動スクロールで `setTimeout` を使用** — アンマウント後の発火は
  08-16 で修正済み。`requestAnimationFrame` への置換は任意。

## 過剰設計レンズ(ponytail-audit 相当)

順序は削減規模順。いずれも動作には無関係。

1. **`delete` 約560行** — `src/promptReferences.ts:7-14` の `author`/`caseNumber`/
   `isPro` フィールド(全140レコード)はピッカーが一切参照しない(id/title/category/
   prompt/tags のみ)。型+データごと削除。
2. **`delete` 約190行** — `src/app/globals.css` の未使用 DADS CSS: `.dads-btn*`
   (86行, Button は cva 使用)、`.dads-input/.dads-textarea`(30)、
   `.dads-progress-*`(13)、`.dads-banner--info/success/warning`(17, `--error` のみ使用)、
   `.text-dsp` 等のタイポグラフィ(30)、未使用カラートークン/スペーシング。
3. **`shrink` 約140行** — `src/hooks/useProgressSimulation.ts:1-169` の位相計算
   (completionRequestedRef / actualElapsedRef / minimumElapsed)はフェイク進捗バーの
   演出。0→90% の interval + `complete()` で 100% に飛ばす ~30 行版で足りる。
4. **`native` 約110行(要判断)** — `useTextUndoRedo` + `useUndoRedoShortcuts` は
   ブラウザネイティブの textarea undo/redo を再実装。textarea を非制御
   (defaultValue + ref 書込)にすればネイティブ undo が無料で動き、↶↷ ボタン
   (PromptTextarea.tsx:62-82)も消せる。挙動変更を伴うため判断が必要。
5. **`yagni` 約140行(または -3 deps)** — `src/app/sw.ts:1131-1279` の手調整
   ランタイムキャッシュ 10 ルール。アセットは serwist 既定の precache で済む。
   フォント 2 ルールまで削るか、SW 自体を全削除(sw.ts + serwist route +
   provider + serwist/@serwist/turbopack/esbuild 依存)も選択肢。
6. **`yagni` 約65行** — `src/utils/server/rateLimit.ts` のインメモリ制限。
   自コメントの通り serverless では cold start でリセットされ家族向けアプリでは
   厳格な適用は不要。両ルートの `checkUserRateLimit` 呼び出しごと削除。
7. **`shrink` 約50行** — 2 エディタの履歴ナビゲーション重複
   (navigateHistory/goBack/goForward、canGoBack/canGoForward 再計算)を
   `useResultHistory`(index を所有済み)へ集約 + 3 つの類似プロンプト追記
   ハンドラを 1 つに。
8. **`shrink` 約20行** — アップロードスロット grid + 削除ボタンのマークアップが
   2 エディタで重複。FileInput へ畳み込む。
9. **`delete` 2行** — `Shell.tsx:67` / `ResultPane.tsx:65` の
   `animate-in fade-in slide-in-from-bottom-*` クラスは tailwindcss-animate
   未インストールのためコンパイルされない(死にコード)。
10. **`delete` 3行** — `useResultHistory.ts:66-67` の `canGoBack/canGoForward`
    戻り値は誰も消費しない(両エディタが独自計算)。
11. **`delete` 6行** — `ProgressDisplay.tsx:16-17,30-32` の `isVisible` prop(常に
    `true` で渡される)と `title` prop(未使用)。
12. **`native` 12行** — `urlMetadata.ts:20-38` と `imageProcessing.ts:55-73` に
    手書きの AbortController+setTimeout fetch ラッパーが二重存在。
    `AbortSignal.timeout()`(Node 18+/ブラウザ標準)で置換。
13. **`shrink` 4行** — `src/utils/server/validation.ts:24-25,33` のハードコード
    `.max(5)`/`.max(3)` を共有定数(MAX_FREESTYLE_UPLOADS/MAX_ICON_UPLOADS)参照に
    してドリフトを防ぐ。
14. **`delete` 1行** — `Button.tsx:56` の `buttonVariants` export(外部未使用)。
15. **`yagni` 約45行** — `src/utils/server/logger.ts` の構造化ログ抽象。
    実呼び出しは api-helpers.ts の 1 箇所のみ。`console.error` に置換。
16. **`delete` 2行** — `Section.tsx` / `EditorLayout.tsx` の `"use client"` は
    純粋表示コンポーネントに不要(既にクライアントツリー内で構成)。

`net: -1360 行、-0 deps 可能(要判断の SW 全削除を含めると -3 deps)`

## 08-19 からの持ち越し確認

- **auth.ts カバレッジ 57%** — 今回の指摘で触れる箇所はないため、P2 のまま保留。
- **prefers-reduced-motion** — 未対応を確認 → 新規 P2-4 として統合。
- **next/image `unoptimized`** — data: URL に `<img>` が望ましいのは変わらず。
  幅高さ固定 + unoptimized でレイアウトシフトは防がれており、動作上の問題なし(継続)。
- **manifest theme_color** — 不整合のまま → 新規 P3-2。
- **next-auth v4→v5 / モデル名 / Graph 警告 / future-directions** — 変更なし、P3 保留。

## 検証

```
bun run typecheck  # PASS (tsc --noEmit)
bun run test       # PASS — 207 passed / 33 files (08-19 から同数、回帰なし)
```

コード変更なしの調査ドキュメントのため、実装時は lint/typecheck/test/coverage を
再実行すること。P0 の修正は cache.test / useEditorSubmit.test への追記が必要。

## 次のステップ

- [ ] P0-1〜P0-3 を最小差分で実装(推奨順: P0-2 → P0-1 → P0-3)
- [ ] P1 の 1 行系(P1-6、P1-1、P1-3)は P0 と同時に
- [ ] 過剰設計 #1(promptReferences 削減)と #2(DADS CSS 削除)は機械的で低リスク — 先にやる
- [ ] useTextUndoRedo の非制御化(#4)は挙動変更のためユーザー確認してから
- [ ] rateLimit(#6)は削除すると DoS 耐性がなくなる — 家族専用が前提なら削除で妥当
