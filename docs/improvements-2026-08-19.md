# 改善提案まとめ (2026-08-19)

`docs/improvements-2026-08-16.md` の続編。ベースライン再検証 + 新規の最小差分修正。

## 調査時ベースライン (2026-08-19 検証)

- `bun run lint` PASS (`eslint.config.mjs:1` nextConfig ルール、coverage除外済み)
- `bun run typecheck` PASS (`tsc --noEmit` ハイブリッド: `typescript@6` + `@typescript/native@7`)
- `bun run test:coverage` PASS — 207 tests / 33 files, 全体 `Stmts 95.93% / Lines 95.93% / Branch 86.25% / Funcs 83.18%` (`vitest.config.ts:13` 閾値 `lines 90 / branches 80 / funcs 65 / statements 90` を上回る)
- `bun run build` PASS だが警告あり: `turbopack.root` 未設定で `multiple lockfiles` (`bun.lock` と親 `package-lock.json` 競合)。本次で解消
- `src/auth.ts:57` カバレッジ 57%、`src/utils/server/rateLimit.ts:20-25` 79% など一部未達は依然残るが全体は健全
- 前回 10件 + ponytail-audit 14件はすべて `main` に反映済み (直近 `ee0048b` 以降)

## 今回実装した改善 (P0/P1)

### P0-1 turbopack.root 警告解消 — `next.config.ts:4`

```ts
turbopack: {
  root: __dirname;
}
```

`bun.lock` を持つ本リポジトリを明示的に root 指定。親ディレクトリの `package-lock.json` 誤検知を止める。
→ skipped: 親の lock 削除 / add when: monorepo 化で root を上げる時

### P0-2 CSP と GTM の整合 — `next.config.ts:29`

`src/app/layout.tsx:10,58` で `GTM-NP6VPKT6` を注入しているのに `connect-src` が `https://*.vercel.live` のみで `*.google-analytics.com` がブロックされていた。
`connect-src` に `https://www.googletagmanager.com https://*.google-analytics.com https://*.googletagmanager.com` を追加。
`@vercel/analytics` (`layout.tsx:97`) と併用前提で GTM 維持を選択。不要なら GTM 18行削除がより lazy。
→ skipped: GTM 全削除 / add when: GTM 不要が確定したら

### P0-3 削除済み6ファイルの確定 — `git status`

`AGENTS.md / CLAUDE.md / .cursor/mcp.json / .qoder/mcp.json / .vscode/mcp.json / .github/code-review-graph.instruction.md` が `D` のまま未コミット (219 deletions)。意図的な整理としてコミット。
→ `fix(config): set turbopack.root, allow GTM/GA in CSP, remove deprecated agent configs`

### P1-1 ALLOWED_EMAILS 空=全員許可の警告 — `src/auth.ts:5`

`allowedEmails.size === 0 → return true` で `.env` 未設定時に全認証ユーザーが入れる仕様は family-only の意図と逆になり得る。prod で警告を出す 6行追加で気づけるようにした。
→ skipped: `ALLOW_ALL=true` 明示フラグ化 / add when: 本番で誤開放インシデントが出たら

### P1-2 MemoryCache の無制限肥大 — `src/utils/server/cache.ts:11`

`Map` は TTL 10分 (`imageGenerationCache:48`) で lazy delete のみ、件数上限なし。悪意あるプロンプト連打でメモリ肥大し得る。`maxEntries=100` で最古1件を LRU 風に削除する 4行追加。
→ skipped: Redis / add when: 100件でも足りない実害が出たら

### P1-3 MIME 判定の重複 — `src/utils/imageOptimization.ts:22` + `src/utils/server/imageValidation.ts:18`

`resizeImage` が独自 `supportedTypes` を持ち `resolveMimeType` と二重管理。`resolveMimeType` に寄せて 10行→5行に。`image/jpg` 正規化や拡張子フォールバックも統一。
→ skipped: 別モジュール継続 / add when: 対応形式が増えたら

### P1-4 useUploadSlots の stale closure — `src/hooks/useUploadSlots.ts:34`

`uploads` を依存に持つ `handleFileChange / addUploadSlot / removeUploadSlot / resetUploads` が stale な `uploads` を掴み、連打やクイック操作で `previewUrl` の revoke 漏れ・誤削除が起き得た。全て `uploadsRef.current` と functional `setUploads` に置換。`src/utils/server/imageGeneration.ts:11` 同様、1箇所の修正で全 caller を救う root-cause fix。
→ skipped: 各 caller 側でガード / add when: なし (root fix が最短)

### P1-5 GEMINI_IMAGE_MODEL の評価タイミング — `src/utils/server/imageGeneration.ts:11`

`const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL ?? ...` がモジュール評価時に固定され、テストで差し替え不可。`getDefaultModel()` に遅延評価化。
→ skipped: 現状維持 / add when: テストでモデル差し替えが必要になったら (今回対応)

## 未対応・要判断 (P2/P3 — YAGNI で見送り)

### P2 軽微 (各1h以内、必要になったら)

- **auth.ts カバレッジ 57%** — `src/auth.ts:40-55` `signIn` コールバックの allow/deny 分岐と `hasGoogleAuthConfig` false パスのテスト2件追加で 90% 到達可。今回は警告追加のみで保留。
- **prefers-reduced-motion** — `src/app/page.tsx:33,88` `framer-motion` の浮遊アニメが `prefers-reduced-motion` を無視。`useReducedMotion()` で無効化する 1行ガードが WCAG 2.2 的には望ましい。
- **next/image `unoptimized`** — `FreestyleEditor.tsx:264` / `IconCreator.tsx:226` / `FileInput.tsx:115` で `data:` URL に `next/image` を使っている。`data:` は最適化対象外なので `<img>` で十分だが動作上問題なし。
- **manifest theme_color** — `src/app/manifest.ts:13` `#0f172a` と `src/app/globals.css:64` `#f5f6f8` / `layout.tsx:47` `#f5f6f8` の不整合。PWA テーマカラーを `#f5f6f8` に合わせる 1行修正で可。

### P3 戦略的 (今は見送り)

- **next-auth v4 → v5** — 現行 `v4.24.11` は App Router でも動作するが v5 は `Auth()` ベース。破壊的移行なので `src/auth.ts` / `src/app/api/auth/[...nextauth]/route.ts` の大幅改修が必要。セキュリティパッチが v4 に来ている間は保留。
- **モデル名 `gemini-3.1-flash-lite-image`** — 将来モデル名のため実機確認待ち。P1-5 で差し替えは容易にした。
- **Graph 警告 `freestyle-edit-json ↔ server-fetch` 26 edges** — `code-review-graph` の `high coupling` 警告だが、`useEditorSubmit` で疎結合になっており誤検知気味。対応不要。
- **docs/plans/2026-03-22-future-directions.md の4案 (絵本/知育プリント/家族新聞/対話アシスタント)** — 単なる画像加工は Google Photos に代替されるため family-context への pivot 自体は妥当。まず1案に絞って PoC を。

## 検証

```
bun run lint        # pass
bun run typecheck   # pass
bun run test:coverage # 207 passed, Stmts 95.93% / Branch 86.25%
bun run build       # pass, turbopack.root 警告解消を確認
```

## 次のステップ

- [ ] P2 の `prefers-reduced-motion` と `auth.ts` テスト追加をやるか判断
- [ ] GTM が本当に必要か再確認 — 不要なら `layout.tsx` の GTM 18行削除で CSP を元に戻せる
- [ ] `docs/plans/2026-03-22-future-directions.md` から1案選んで PoC
