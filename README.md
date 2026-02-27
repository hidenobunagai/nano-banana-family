# Hide NB Studio

Family-only image editing studio built with Next.js and Google Gemini. It authenticates with Google accounts that you explicitly allow, converts uploaded photos with curated prompt presets, and captures traffic metrics via Vercel Web Analytics.

## Features

- Google OAuth login restricted to whitelisted email addresses
- Guided image editing using Gemini API and preset creative prompts
- One-click preview/reset workflow for uploading and generating results
- Built-in observability with `@vercel/analytics`
- Ready for Vercel deployment with App Router, TypeScript, and NextAuth

## Tech Stack

- Next.js 16 (App Router) & React 19
- TypeScript
- NextAuth (Google provider)
- Google Gemini API (via `@google/genai`)
- Vercel Analytics

## Architecture Overview

- `src/app` contains App Router routes, layouts, and page UI.
- `src/app/api` holds route handlers for image editing, prompt generation, and flipbook creation.
- `src/components/layout` houses layout primitives, `src/components/features` holds feature-level UI, and `src/components/ui` keeps reusable controls.
- `src/utils` includes shared helpers, with `src/utils/server` reserved for server-only logic.
- `src/auth.ts` configures NextAuth, and `src/promptPresets.ts` defines the default prompt library.

## API Routes

- `POST /api/edit-image` edits an uploaded image with a preset prompt (supports an optional second image).
- `POST /api/freestyle-edit` edits up to five uploaded images based on a freeform prompt.
- `POST /api/prompt-generate` generates a single image from a text prompt.
- `POST /api/create-flipbook` creates a four-frame flipbook from a reference image and story idea.
- `GET|POST /api/auth/*` handles NextAuth Google sign-in.

## Getting Started

### 1. Clone and install

```bash
bun install
```

### 2. Configure environment variables

Values can be set in a local `.env.local` or configured in the Vercel dashboard. The app expects:

| Variable                           | Description                                                        |
| ---------------------------------- | ------------------------------------------------------------------ |
| `AUTH_SECRET` or `NEXTAUTH_SECRET` | NextAuth secret (`openssl rand -base64 32`)                        |
| `AUTH_GOOGLE_ID`                   | Google OAuth client ID                                             |
| `AUTH_GOOGLE_SECRET`               | Google OAuth client secret                                         |
| `ALLOWED_EMAILS`                   | Comma-separated list of emails allowed to sign in                  |
| `GEMINI_API_KEY`                   | Google Gemini API key                                              |
| `GEMINI_IMAGE_MODEL`               | Optional model override (default `gemini-3.1-flash-image-preview`) |

> Tip: When deploying on Vercel, add these variables under **Project Settings -> Environment Variables**. Any `.env.local` file is only for local development and should never contain production secrets committed to Git.

### 3. Run locally

```bash
bun run dev
```

Visit <http://localhost:3000> and sign in with an allowed Google account to try the studio.

## Quality Checks

```bash
bun run lint
bun run typecheck
bun run test
bun run test:coverage
bun run format
```

## Prompt Presets

The editor ships with several ready-made prompts, including:

- Pirate wanted poster (aged parchment style)
- Martial arts action scene with arcade HUD
- Passport-style ID photo (blue background)
- Monochrome manga line art conversion
- Superhero comic strip storytelling

You can customize presets in `src/promptPresets.ts` by editing labels, descriptions, or adding new entries.

## Deployment

The repository is configured for Vercel hosting. After setting environment variables, push to GitHub and run:

```bash
vercel --prod
```

or connect the GitHub repo in the Vercel dashboard for automatic deployments. Analytics widgets will start reporting once production traffic arrives.

## Security & Privacy

- No production secrets are stored in this repository; verify environment variables before making the repo public.
- Rotate any keys that may have been exposed previously.
- Google sign-in allows access only to addresses listed in `ALLOWED_EMAILS`.

## Progressive Web App

- Install the app on iOS or Android from the browser share/install menu. The manifest and service worker are generated automatically via `next-pwa`.
- When developing locally, run `bun run dev` and open <http://localhost:3000>; Chrome will expose the "Install app" option once the site is served over HTTPS (use `vercel dev` or `bun run build && bun run start` for a production-like HTTPS setup).
- Generated assets (`public/sw.js`, `public/workbox-*.js`) are ignored by Git and created during `next build`.
