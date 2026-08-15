# 改善提案まとめ (2026-08-16)

プロジェクト全体を調査した結果の改善提案と対応状況。

## 調査時のベースライン

- `bun run lint` / `bun run typecheck` / `bun run test`(177件) / `bun run test:coverage`(Lines 92.02%, Branch 83.26%) はすべてパス
- 最近のコミット履歴から、エディタ/フックの重複排除・デッドコード除去・セキュリティ強化が継続的に行われており、コードベースは健全

## 実装済みの改善

### 1. カバレッジ閾値の誤りを修正
`vitest.config.ts` の `lines: 8` / `statements: 8` は明らかなタイプミス(実測 92.02%)。
`lines/statements 90, functions 65, branches 80` に引き上げ、回帰を CI で検知できるようにした。

### 2. `@vitest/coverage-v8` のバージョン不整合を解消
`vitest@3.2.6` に対して `@vitest/coverage-v8@2.1.9`(peer は vitest 2.x)が解決されていた。`^3.2.6` に揃えた。

### 3. テスト不足の解消
- `Shell.tsx` / `Dock.tsx`(layout): 0% → ナビゲーション切替・サインアウトをテスト
- `useUndoRedoShortcuts.ts`: キーボードショートカット(⌘Z / ⌘⇧Z / ⌘Y、textarea 限定、クリーンアップ)をテスト
- `imageOptimization.ts`: 0% → 非画像・非対応形式の拒否、リサイズ不要時のオリジナル返却、リサイズ時の Canvas パスをモックでテスト

### 4. API ルートの重複排除
`/api/freestyle-edit` と `/api/icon-generate` で重複していた
「Gemini クライアント生成 → generateContent → 画像抽出 → レスポンス検証」を
`src/utils/server/imageGeneration.ts` の `generateImage()` に集約。各ルートは
フォーム検証・キャッシュ・プロンプト構築のみを担う形になった。

### 5. キャッシュキーの衝突リスクを修正
`generateCacheKey` が `key:value` を `|` 連結していたため、プロンプト内に
`|` や `:` が含まれると異なるパラメータの組み合わせが同一キーになり得た。
ソート済みエントリの `JSON.stringify` に変更し、衝突を原理的に排除。

### 6. プロンプト最大長のクライアント/サーバー不整合を修正
- クライアント: `MAX_PROMPT_LENGTH = 1000`(textarea `maxLength`)
- サーバー: `z.string().max(2000)`(freestyle) / `max(2000)`(customPrompt)

サーバー側を `MAX_PROMPT_LENGTH`(1000)に統一。UI では届かない範囲だが、
API 直接呼び出し時の整合性が取れる。

### 7. エディタの undo 履歴の一貫性を修正
`FreestyleEditor` でスタイル提案・プロンプトリファレンスのクリックが
`setPrompt` 直接更新だったため、Ctrl+Z で戻せなかった。`handleChange` 経由に
変更し、履歴対象に統一(最近のプロンプト選択と同挙動)。

### 8. フォーマットと CI
- `prettier` 未適用ファイル 59 件に `bun run format` を適用(機械的変更のみ)
- 自動生成ファイル `src/promptReferences.ts` は `.prettierignore` に追加
- CI に `format:check` ステップを追加し、フォーマット逸脱を検知

## 保留中の提案(要判断)

### A. CSP と GTM の整合
`layout.tsx` で GTM を読み込んでいるが、CSP の `script-src` に
`https://www.googletagmanager.com` しかなく、`connect-src` にも
`*.google-analytics.com` 等がないため、GTM 経由の GA4 トラッキングは
現在の CSP でブロックされる可能性が高い(アプリは `@vercel/analytics` を
使っているため GTM 自体が不要なら削除も選択肢)。
→ GTM を実際に使うか確認し、使うなら `script-src` / `connect-src` に
`https://*.google-analytics.com` 等を追加、使わないなら GTM コード削除。

### B. Service Worker のクロスオリジン全般キャッシュ
`sw.ts` の最後のルールが「同一オリジン以外の GET すべて」を NetworkFirst で
キャッシュする。Google フォント等は専用ルールがあるため、実質的に対象外。
クロスオリジン応答のキャッシュはプライバシー上の懸念があるため、
削除してフォントのみのキャッシュに絞る案。

### C. next-auth v4 → v5 移行
現在 v4.24.11。App Router と組み合わせても動作しているが、v5 は
`Auth()` ベースの新 API になり、セキュリティ修正も v5 に集中しつつある。
移行は `src/auth.ts` と API ルートの改修が必要なため、時期を見て実施。

### D. 作業ツリー上の未コミット削除ファイル
`AGENTS.md` / `CLAUDE.md` / `.cursor/mcp.json` / `.qoder/mcp.json` /
`.vscode/mcp.json` / `.github/code-review-graph.instruction.md` が
作業ツリーで削除されたまま。エージェント設定の整理と思われるが、
意図した削除か確認の上、コミットするか判断が必要。

### E. モデル名の確認
`GEMINI_IMAGE_MODEL` のデフォルト `gemini-3.1-flash-lite-image` は
将来モデル名のため、API 提供開始後に実機確認が必要。

### F. 細かい UI 改善
- `FreestyleEditor` の「画像を追加」ボタン位置合わせ用の不可視
  "Placeholder" テキストは脆弱。FileInput のラベル高さを固定化して置き換え可能。
- `useProgressSimulation` は `PROGRESS_STEPS` のデフォルトを持ちつつ
  各エディタが独自ステップを渡しており、デフォルトはテスト専用に近い。
  整理の余地あり(優先度低)。
