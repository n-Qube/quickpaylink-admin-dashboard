# Firebase Hosting Deployment Guide

This guide explains how to deploy your Admin Dashboard to Firebase Hosting.

## Prerequisites

1. **Firebase CLI installed**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Authentication**
   ```bash
   firebase login
   ```

## Deployment Methods

### Method 1: Using NPM Scripts (Recommended)

```bash
# Build and deploy in one command
npm run deploy
```

Or build and deploy separately:
```bash
# Build the app
npm run build

# Deploy only hosting
npm run deploy:hosting
```

### Method 2: Using the Shell Script

```bash
# Make script executable (first time only)
chmod +x deploy-hosting.sh

# Run the deployment script
./deploy-hosting.sh
```

### Method 3: Manual Firebase CLI Commands

```bash
# Build the app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## Deployment Process

When you deploy, the following happens:

1. **Build Process**
   - TypeScript is compiled (`tsc -b`)
   - Vite builds the production bundle
   - Assets are optimized and minified
   - Output is generated in the `dist/` folder

2. **Firebase Hosting Upload**
   - Files from `dist/` are uploaded to Firebase Hosting
   - Cache headers are applied (configured in `firebase.json`)
   - URL rewrites are set up for SPA routing

## Your App URLs

After deployment, your app will be available at:

- **Primary URL**: https://quicklink-pay-admin.web.app
- **Alternative URL**: https://quicklink-pay-admin.firebaseapp.com

## Configuration Files

### firebase.json
```json
{
  "hosting": {
    "public": "dist",           // Build output directory
    "rewrites": [...],          // SPA routing support
    "headers": [...]            // Cache control for assets
  }
}
```

### .firebaserc
```json
{
  "projects": {
    "default": "quicklink-pay-admin"
  }
}
```

## Deploy Specific Components

```bash
# Deploy only hosting
firebase deploy --only hosting

# Deploy hosting and Firestore rules
firebase deploy --only hosting,firestore:rules

# Deploy everything
firebase deploy
```

## Preview Before Deploying

You can test the production build locally before deploying:

```bash
# Build the app
npm run build

# Preview locally
npm run preview
```

This will serve the production build at `http://localhost:4173`

## Rollback a Deployment

If something goes wrong, you can rollback to a previous version:

1. Go to Firebase Console → Hosting
2. Select your site
3. Click on "Release history"
4. Find the previous version
5. Click the three dots menu → "Rollback to this release"

Or use CLI:
```bash
firebase hosting:rollback
```

## Environment Variables

For production deployment, make sure your Firebase config in `src/lib/firebase.ts` uses the correct production Firebase project credentials.

## Continuous Deployment (Optional)

To set up automatic deployments when you push to GitHub:

1. Install GitHub Action:
   ```bash
   firebase init hosting:github
   ```

2. This creates `.github/workflows/firebase-hosting-merge.yml`
3. Every push to main branch will trigger a deployment

## Troubleshooting

### Build Fails
- Check for TypeScript errors: `npm run lint`
- Ensure all dependencies are installed: `npm install`

### Deployment Fails
- Verify you're logged in: `firebase login`
- Check your Firebase project: `firebase projects:list`
- Verify project ID in `.firebaserc`

### App Not Loading After Deploy
- Check browser console for errors
- Verify Firebase config in `src/lib/firebase.ts`
- Check Firestore security rules

## Performance Optimization

The current `firebase.json` includes:

- **Cache Headers**: Static assets cached for 1 year
- **SPA Rewrites**: All routes serve `index.html`
- **Asset Optimization**: Vite handles code splitting and minification

## Security Considerations

1. **Firestore Rules**: Ensure your `firestore.rules` are properly configured
2. **Authentication**: The app requires Firebase Authentication
3. **CORS**: Configure if accessing from custom domains
4. **Environment Variables**: Never commit sensitive keys to Git

## Monitoring

After deployment, monitor your app:

1. **Firebase Console**: Check hosting metrics
2. **Browser DevTools**: Monitor network requests
3. **Firebase Performance Monitoring**: (Optional) Add for detailed metrics

## Cost Considerations

Firebase Hosting free tier includes:
- 10 GB storage
- 360 MB/day bandwidth
- Custom domain support

For higher traffic, check Firebase pricing: https://firebase.google.com/pricing

---

**Need Help?**
- Firebase Hosting Docs: https://firebase.google.com/docs/hosting
- Firebase CLI Reference: https://firebase.google.com/docs/cli
