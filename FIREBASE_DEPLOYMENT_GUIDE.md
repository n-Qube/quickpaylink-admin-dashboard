# Firebase Deployment Guide

Complete guide for deploying Firebase security rules and configurations for the QuickLink Pay Admin Dashboard.

## Prerequisites

Before you begin, ensure you have:

1. **Firebase CLI installed**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project created**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use an existing one

3. **Firebase login**
   ```bash
   firebase login
   ```

4. **Service account key** (for Node.js scripts)
   - Download from Firebase Console → Project Settings → Service Accounts
   - Save as `firebase-service-account.json` in the project root

## Quick Start

### 1. Deploy Firestore Rules

The simplest way to deploy:

```bash
./deploy-firebase.sh
```

Or manually:

```bash
firebase deploy --only firestore:rules
```

### 2. Initialize Firebase (First Time Only)

If you haven't initialized Firebase in this project:

```bash
firebase init
```

Select:
- Firestore
- Functions (if you plan to use Cloud Functions)

When asked about existing files, choose to keep your current `firestore.rules`.

### 3. Set Firebase Project

```bash
firebase use --add
```

Select your project from the list and give it an alias (e.g., `default` or `production`).

## What Gets Deployed

### Firestore Security Rules (`firestore.rules`)

The security rules enforce:

- **Authentication**: Only authenticated admins can access data
- **Role-Based Access Control (RBAC)**:
  - Super Admin: Full access to everything
  - System Admin: System configuration and API management
  - Other roles: Specific permissions based on role configuration
  
**Collections Protected**:
- `admins` - Admin user accounts
- `roles` - Role definitions and permissions
- `systemConfig` - System configuration
- `countries`, `currencies`, `businessTypes`, `taxRules` - System data
- `subscriptionPlans`, `pricingRules` - Pricing configuration
- `merchants` - Merchant accounts
- `supportTickets` - Support ticket management (NEW)
- `payouts` - Payout transactions (NEW)
- `apiIntegrations`, `webhooks` - API management
- `auditLogs` - Immutable audit trail
- `alerts` - System alerts
- `complianceReports` - Compliance documentation
- `systemMetrics` - Performance metrics
- `maintenanceWindows` - Scheduled maintenance
- `emailTemplates`, `whatsappTemplates` - Communication templates

## Deployment Steps

### Step 1: Verify Your Configuration

```bash
# Check current project
firebase use

# List all projects
firebase projects:list
```

### Step 2: Test Rules Locally (Optional)

```bash
# Install Firebase emulator
firebase emulators:start
```

This will start local emulators for testing your rules before deploying.

### Step 3: Deploy to Production

```bash
# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Or use the deployment script
./deploy-firebase.sh
```

### Step 4: Verify Deployment

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Firestore Database → Rules
4. Verify the rules were deployed correctly
5. Check the "Published" timestamp

## Environment-Specific Deployments

### Deploy to Staging

```bash
firebase use staging
firebase deploy --only firestore:rules
```

### Deploy to Production

```bash
firebase use production
firebase deploy --only firestore:rules
```

## Testing Security Rules

After deployment, test your rules:

### 1. Test Admin Access

```bash
node test-admin-access.js
```

### 2. Test Permissions

Try accessing collections with different admin roles to ensure RBAC works correctly.

### 3. Test Unauthorized Access

Attempt to access data without authentication to verify deny rules work.

## Troubleshooting

### Error: "Not logged in"

```bash
firebase login
firebase login:list  # Check current user
```

### Error: "No project selected"

```bash
firebase use --add
```

### Error: "Permission denied"

Check that your Firebase service account has the necessary permissions:
- Firestore Admin
- Cloud Functions Admin (if deploying functions)

### Error: "Rules syntax error"

Validate your rules:
```bash
firebase deploy --only firestore:rules --debug
```

## Security Best Practices

1. **Never deploy without testing**: Use emulators first
2. **Review changes**: Always review rule changes before deploying to production
3. **Use version control**: Keep `firestore.rules` in Git
4. **Monitor rule usage**: Check Firebase Console for rule evaluation metrics
5. **Regular audits**: Periodically review and update rules
6. **Least privilege**: Grant minimum necessary permissions

## Additional Resources

- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Testing Security Rules](https://firebase.google.com/docs/firestore/security/test-rules)

## Next Steps

After deploying security rules:

1. **Deploy Cloud Functions** (if needed):
   ```bash
   # See PAYOUT_IMPLEMENTATION_GUIDE.md for payout functions
   # See TICKET_MANAGEMENT_GUIDE.md for ticket functions
   cd functions
   npm install
   firebase deploy --only functions
   ```

2. **Update Environment Variables**:
   - Update `.env.local` with your Firebase configuration
   - Ensure all API keys and secrets are properly configured

3. **Test the Application**:
   - Run the admin dashboard locally
   - Test all features with different admin roles
   - Verify security rules are working as expected

## Support

If you encounter issues:
1. Check the Firebase Console for error logs
2. Review the Firebase CLI debug output
3. Consult the Firebase documentation
4. Check your IAM permissions in Google Cloud Console
