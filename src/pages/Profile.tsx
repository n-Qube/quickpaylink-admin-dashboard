/**
 * My Profile Page
 *
 * Display and edit current admin user's profile information.
 */

import { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  Building,
  Shield,
  Clock,
  Activity,
  Edit2,
  Save,
  X,
  Key,
  LogOut,
  Camera,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ProfileForm {
  firstName: string;
  lastName: string;
  displayName: string;
  department: string;
  phoneNumber: string;
}

export default function Profile() {
  const { admin, logout, refreshAdminData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    displayName: '',
    department: '',
    phoneNumber: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (admin) {
      setProfileForm({
        firstName: admin.profile?.firstName || '',
        lastName: admin.profile?.lastName || '',
        displayName: admin.profile?.displayName || '',
        department: admin.profile?.department || '',
        phoneNumber: admin.phoneNumber || '',
      });
    }
  }, [admin]);

  /**
   * Save profile changes
   */
  const saveProfile = async () => {
    if (!admin) return;

    try {
      setSaving(true);
      console.log('💾 Saving profile...');

      const adminRef = doc(db, 'admins', admin.adminId);
      await updateDoc(adminRef, {
        'profile.firstName': profileForm.firstName,
        'profile.lastName': profileForm.lastName,
        'profile.displayName': profileForm.displayName,
        'profile.department': profileForm.department,
        phoneNumber: profileForm.phoneNumber,
        updatedAt: serverTimestamp(),
        updatedBy: admin.adminId,
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setEditing(false);
      console.log('✅ Profile saved');

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      setMessage({ type: 'error', text: 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Cancel editing
   */
  const cancelEdit = () => {
    if (admin) {
      setProfileForm({
        firstName: admin.profile?.firstName || '',
        lastName: admin.profile?.lastName || '',
        displayName: admin.profile?.displayName || '',
        department: admin.profile?.department || '',
        phoneNumber: admin.phoneNumber || '',
      });
    }
    setEditing(false);
  };

  /**
   * Handle profile image upload
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !admin) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please upload a valid image file (JPEG, PNG, or WebP)' });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    try {
      setUploadingImage(true);
      console.log('📸 Uploading profile image...');

      // Create storage reference
      const storageRef = ref(storage, `admin-avatars/${admin.adminId}/profile.jpg`);

      // Upload file
      await uploadBytes(storageRef, file);
      console.log('✅ Image uploaded to storage');

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('✅ Got download URL:', downloadURL);

      // Update Firestore document
      const adminRef = doc(db, 'admins', admin.adminId);
      await updateDoc(adminRef, {
        'profile.avatar': downloadURL,
        updatedAt: serverTimestamp(),
        updatedBy: admin.adminId,
      });

      console.log('✅ Profile image updated in Firestore');

      // Refresh admin data to show new avatar
      await refreshAdminData();

      setMessage({ type: 'success', text: 'Profile image updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('❌ Error uploading image:', error);
      const errorMessage = error?.message || 'Failed to upload profile image';
      setMessage({ type: 'error', text: `Upload failed: ${errorMessage}` });
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Trigger file input click
   */
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  if (!admin) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="w-8 h-8" />
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage your account information
          </p>
        </div>

        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span className="text-sm font-medium">Edit Profile</span>
          </button>
        )}

        {editing && (
          <div className="flex gap-2">
            <button
              onClick={cancelEdit}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-foreground rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
              <span className="text-sm font-medium">Cancel</span>
            </button>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span className="text-sm font-medium">
                {saving ? 'Saving...' : 'Save Changes'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Success/Error Message */}
      {message && (
        <div
          className={cn(
            'p-4 rounded-lg',
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          )}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />

            {/* Avatar with upload button */}
            <div className="relative w-24 h-24 mx-auto mb-4">
              {admin.profile?.avatar ? (
                <img
                  src={admin.profile.avatar}
                  alt={admin.profile.displayName}
                  className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary">
                  <User className="w-12 h-12 text-primary" />
                </div>
              )}

              {/* Upload button overlay */}
              <button
                onClick={handleAvatarClick}
                disabled={uploadingImage}
                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-lg"
                title="Upload profile image"
              >
                {uploadingImage ? (
                  <Upload className="w-4 h-4 animate-pulse" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </div>

            <h2 className="text-xl font-semibold">{admin.profile?.displayName}</h2>
            <p className="text-sm text-muted-foreground mt-1">{admin.email}</p>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-primary" />
                <span className="font-medium capitalize">
                  {admin.accessLevel?.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Access Level</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mt-6">
            <h3 className="font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="w-4 h-4" />
                  <span>Total Logins</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {admin.stats?.totalLogins || 0}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Last Login</span>
                </div>
                <p className="text-sm font-medium mt-1">
                  {admin.auth?.lastLogin
                    ? new Date(admin.auth.lastLogin.toDate()).toLocaleString()
                    : 'Never'}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="w-4 h-4" />
                  <span>Total Actions</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {admin.stats?.totalActions || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-6">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  First Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={profileForm.firstName}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                  />
                ) : (
                  <p className="px-3 py-2">{admin.profile?.firstName || 'N/A'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Last Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={profileForm.lastName}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                  />
                ) : (
                  <p className="px-3 py-2">{admin.profile?.lastName || 'N/A'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Display Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={profileForm.displayName}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, displayName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                  />
                ) : (
                  <p className="px-3 py-2">{admin.profile?.displayName || 'N/A'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Building className="w-4 h-4 inline mr-2" />
                  Department
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={profileForm.department}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, department: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                  />
                ) : (
                  <p className="px-3 py-2">{admin.profile?.department || 'N/A'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-6">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <p className="px-3 py-2 text-muted-foreground">{admin.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number
                </label>
                {editing ? (
                  <input
                    type="tel"
                    value={profileForm.phoneNumber}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phoneNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                  />
                ) : (
                  <p className="px-3 py-2">{admin.phoneNumber || 'N/A'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-6">Account Information</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-medium">User ID</p>
                  <p className="text-sm text-muted-foreground">{admin.adminId}</p>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-medium">Role</p>
                  <p className="text-sm text-muted-foreground">{admin.roleId}</p>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-medium">Account Status</p>
                  <p className="text-sm">
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-xs font-semibold',
                        admin.status === 'active' &&
                          'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      )}
                    >
                      {admin.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    {admin.auth?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <button className="text-sm text-primary hover:underline">
                  {admin.auth?.twoFactorEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </div>

          {/* Security Actions */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-6">Security</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Key className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Change Password</span>
              </button>

              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-600 dark:text-red-400"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
