# Deployment Guide for Nano Banana Family

The app runs on Vercel as the project `nano-banana-family`, served at
<https://nb-studio.misato-labs.com>.

## Prerequisites

1. **Vercel account**: Sign up at [vercel.com](https://vercel.com) and invite the
   owner of the project if you are not the owner.
2. **Google Cloud project**:
   - Create a project in the [Google Cloud Console](https://console.cloud.google.com)
   - Enable the Gemini API for that project
   - Create OAuth 2.0 credentials of the **Web application** type
   - Add the authorized JavaScript origin `https://nb-studio.misato-labs.com`
   - Add the authorized redirect URI `https://nb-studio.misato-labs.com/api/auth/callback/google`
   - Preview deployments use their own `*.vercel.app` origin; add it as well when you
     need to sign in on a preview build
3. **Environment variables** (see the table in [README.md](./README.md) for the full
   list; the values below are the ones the deployment needs):
   - `AUTH_SECRET` — NextAuth secret (`openssl rand -base64 32`). `NEXTAUTH_SECRET` is
     accepted as a fallback.
   - `AUTH_GOOGLE_ID` — Google OAuth client ID.
   - `AUTH_GOOGLE_SECRET` — Google OAuth client secret.
   - `ALLOWED_EMAILS` — comma-separated list of the Google accounts allowed to sign in.
     **Required**: the allowlist is enforced at sign-in, so an empty or missing value
     rejects every sign-in and nobody gets in.
   - `GEMINI_API_KEY` — Google Gemini API key used by the three generation routes.
   - `GEMINI_IMAGE_MODEL` — optional model override (default
     `gemini-3.1-flash-lite-image`).

The legal pages (`/about`, `/privacy`, `/terms`) are rendered by the shared legal site
and proxied onto this domain, because Google expects the privacy policy on the app's
own domain. No extra configuration is needed for them, but they must stay reachable
without signing in.

## Deployment Steps

### 1. Connect the repository to Vercel

The repository is already connected to the Vercel project through the Git integration,
so every push to `main` deploys automatically. To (re)connect it:

1. Import the GitHub repository `hidenobunagai/nano-banana-family` in the Vercel
   dashboard and select the `nano-banana-family` project.
2. Keep the framework preset **Next.js** and the build command `bun run build`.

Alternatively, drive the same project from the command line:

```bash
# Install the Vercel CLI (if not installed)
bun add -g vercel

# Login to Vercel
vercel login

# Link this directory to the existing project
vercel link
```

### 2. Configure Environment Variables

In the Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add every variable from the list above for the Production, Preview and Development
   environments (the values are per-environment, so Preview builds need their own
   `ALLOWED_EMAILS` and OAuth credentials)

Local secrets use `dotenvx` (see [README.md](./README.md)); Vercel keeps using the
dashboard-managed variables, and the bundled scripts tolerate a missing local env file.

### 3. Deploy

Push to `main` and let the Git integration deploy:

```bash
# The repository is versioned with Jujutsu
jj commit -m "feat: describe the change"
jj bookmark set main -r @-
jj git push -b main
```

Or deploy straight from the CLI:

```bash
vercel --prod
```

### 4. Custom Domain

In the Vercel dashboard:

1. Go to Project Settings → Domains
2. Add `nb-studio.misato-labs.com`
3. Configure DNS as instructed

## Testing Deployment

After deployment:

1. Visit <https://nb-studio.misato-labs.com>
2. Test Google login with an address listed in `ALLOWED_EMAILS`
3. Verify image editing functionality
4. Check the Vercel Analytics dashboard

## Family Access

To allow family members:

1. Add their Google email addresses to the `ALLOWED_EMAILS` environment variable in
   the Vercel dashboard (comma-separated, e.g.
   `alice@example.com,bob@example.com`)
2. Redeploy, or wait for the next deployment to pick the new value up

The allowlist is read from the environment at runtime; there is no whitelist file in
the repository.

## Route Protection

`src/proxy.ts` holds the Next.js 16 proxy (the successor of the old `middleware.ts`
convention) and guards every route with a NextAuth session except:

- `/` — the login page
- `/about`, `/privacy`, `/terms` — the public legal pages
- `/api/auth/*` — the NextAuth handlers
- `/manifest.webmanifest`, `/serwist/*`, `/icon*`, `/apple-icon*`, `/_next/*`,
  `/favicon.ico` — static assets

The generation routes additionally require an authenticated session of their own, and
`GET /api/health` sits behind the proxy like every other non-static route.

## Troubleshooting

- **Login issues**: Check the Google Cloud Console OAuth settings and make sure the
  signed-in address is listed in `ALLOWED_EMAILS`
- **Access denied for everyone**: `ALLOWED_EMAILS` is empty or missing — an empty
  allowlist rejects every sign-in
- **API errors**: Verify the Gemini API is enabled and `GEMINI_API_KEY` is correct
- **Build failures**: Check the build logs in the Vercel dashboard

## Monitoring

- **Vercel Analytics**: Built-in, automatically tracks page views
- **Function Logs**: Available in the Vercel dashboard → Logs
- **Error Tracking**: Consider adding Sentry for production error monitoring
