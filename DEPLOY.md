# Deployment Guide for Hide NB Studio

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) if you don't have one.
2. **Google Cloud Project**:
   - Create a project at [Google Cloud Console](https://console.cloud.google.com)
   - Enable the Gemini API
   - Create OAuth 2.0 credentials (Web application type)
   - Add authorized JavaScript origins: `https://your-domain.vercel.app`
   - Add authorized redirect URIs: `https://your-domain.vercel.app/api/auth/callback/google`

3. **Environment Variables**:
   - `GOOGLE_CLIENT_ID` - from Google Cloud Console
   - `GOOGLE_CLIENT_SECRET` - from Google Cloud Console
   - `NEXTAUTH_SECRET` - random string (generate with `openssl rand -base64 32`)
   - `NEXTAUTH_URL` - your deployment URL (e.g., `https://hide-nb-studio.vercel.app`)

## Deployment Steps

### 1. Connect Repository to Vercel

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link
```

### 2. Configure Environment Variables

In Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add all required variables for Production, Preview, and Development environments

### 3. Deploy

```bash
# Deploy to production
vercel --prod

# Or push to main branch for automatic deployment
git push origin main
```

### 4. Custom Domain (Optional)

In Vercel dashboard:

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS as instructed

## Testing Deployment

After deployment:

1. Visit your deployment URL
2. Test Google login with whitelisted emails
3. Verify image editing functionality
4. Check Vercel Analytics dashboard

## Family Access

To allow family members:

1. Add their Google email addresses to the whitelist in `src/lib/auth.ts`
2. Redeploy or wait for next deployment

## Troubleshooting

- **Login issues**: Check Google Cloud Console OAuth settings
- **API errors**: Verify Gemini API is enabled and API key is correct
- **Build failures**: Check build logs in Vercel dashboard

## Monitoring

- **Vercel Analytics**: Built-in, automatically tracks page views
- **Function Logs**: Available in Vercel dashboard → Logs
- **Error Tracking**: Consider adding Sentry for production error monitoring

## Known Issues

- The middleware uses `withAuth` from `next-auth/middleware` for Next.js 16 compatibility
- Environment variables are required at build time for NextAuth
