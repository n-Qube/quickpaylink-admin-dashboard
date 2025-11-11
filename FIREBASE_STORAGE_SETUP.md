# Firebase Storage Setup for Profile Image Upload

## Issue
If you're seeing "Failed to upload profile image" error, it's likely due to Firebase Storage security rules.

## Solution

### Step 1: Enable Firebase Storage
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **Get Started** if Storage is not enabled
5. Choose a location for your storage bucket
6. Click **Done**

### Step 2: Configure Storage Security Rules

Navigate to the **Rules** tab in Firebase Storage and update the rules:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated admins to upload their own profile images
    match /admin-avatars/{adminId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == adminId;
    }

    // Optional: Allow public read access to avatars (if you want)
    // match /admin-avatars/{adminId}/{allPaths=**} {
    //   allow read: if true;
    //   allow write: if request.auth != null && request.auth.uid == adminId;
    // }
  }
}
```

### Step 3: Verify Storage Configuration

Check your `.env.local` file contains the correct storage bucket:

```
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

### Step 4: Test the Upload

1. Log in to the admin dashboard
2. Navigate to **My Profile** page
3. Click the camera icon on the profile avatar
4. Select an image file (JPEG, PNG, or WebP, max 5MB)
5. The image should upload and display immediately

## Troubleshooting

### Error: "Firebase Storage: User does not have permission"
- **Solution**: Update the storage rules as shown in Step 2

### Error: "storage/unauthorized"
- **Solution**: Make sure the user is logged in and the `request.auth.uid` matches the `adminId` in the path

### Error: "storage/bucket-not-found"
- **Solution**: Verify the storage bucket is correctly configured in `.env.local`

### Error: "storage/unknown"
- **Solution**: Check the browser console for more details. This usually means Firebase Storage is not enabled or not properly initialized.

## Storage Structure

After successful upload, files are stored as:

```
gs://your-project-id.appspot.com/
└── admin-avatars/
    └── {adminId}/
        └── profile.jpg
```

## File Constraints

- **Accepted formats**: JPEG, JPG, PNG, WebP
- **Maximum size**: 5MB
- **Path structure**: `admin-avatars/{adminId}/profile.jpg`

## Security Notes

- Only authenticated users can upload images
- Users can only upload to their own admin folder (`adminId` must match `auth.uid`)
- All authenticated users can read avatar images (for displaying in UI)
- You can restrict read access further if needed
