/**
 * Admin Utility Page
 *
 * Temporary page for running one-time setup tasks:
 * - Seeding default system roles
 * - Migrating existing admin documents
 * - Verifying setup
 */

import { useState } from 'react';
import { PlayCircle, CheckCircle, XCircle, AlertCircle, RefreshCw, Zap } from 'lucide-react';

// Lazy load the scripts to avoid import issues
const loadScripts = async () => {
  const seedModule = await import('@/scripts/seedRoles');
  const migrateModule = await import('@/scripts/migrateAdmins');
  const autoFixModule = await import('@/scripts/autoFixPermissions');
  const forceSeedModule = await import('@/scripts/forceSeed');
  const cleanupModule = await import('@/scripts/cleanupDuplicateRoles');
  return { seedModule, migrateModule, autoFixModule, forceSeedModule, cleanupModule };
};

export default function AdminUtility() {
  const [seedResult, setSeedResult] = useState<any>(null);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const [autoFixResult, setAutoFixResult] = useState<any>(null);
  const [forceSeedResult, setForceSeedResult] = useState<any>(null);
  const [cleanupResult, setCleanupResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSeedRoles = async () => {
    setIsLoading(true);
    setSeedResult(null);
    try {
      const { seedModule } = await loadScripts();
      const result = await seedModule.seedRoles();
      setSeedResult(result);

      // Auto-verify after seeding
      setTimeout(async () => {
        const verifyResult = await seedModule.verifyRoles();
        setVerification(verifyResult);
      }, 1000);
    } catch (error: any) {
      setSeedResult({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMigrateAdmins = async () => {
    setIsLoading(true);
    setMigrationResult(null);
    try {
      const { migrateModule } = await loadScripts();
      const result = await migrateModule.migrateAdmins();
      setMigrationResult(result);

      // Auto-verify after migration
      setTimeout(async () => {
        const verifyResult = await migrateModule.verifyMigration();
        console.log('Migration verification:', verifyResult);
      }, 1000);
    } catch (error: any) {
      setMigrationResult({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyRoles = async () => {
    setIsLoading(true);
    setVerification(null);
    try {
      const { seedModule } = await loadScripts();
      const result = await seedModule.verifyRoles();
      setVerification(result);
    } catch (error: any) {
      setVerification({ count: 0, roles: [], error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoFix = async () => {
    setIsLoading(true);
    setAutoFixResult(null);
    try {
      const { autoFixModule } = await loadScripts();
      const result = await autoFixModule.autoFixPermissions();
      setAutoFixResult(result);

      // Auto-verify after fix
      setTimeout(async () => {
        const { seedModule } = await loadScripts();
        const verifyResult = await seedModule.verifyRoles();
        setVerification(verifyResult);
      }, 1000);
    } catch (error: any) {
      setAutoFixResult({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceSeed = async () => {
    setIsLoading(true);
    setForceSeedResult(null);
    try {
      const { forceSeedModule } = await loadScripts();
      const result = await forceSeedModule.forceSeedRoles();
      setForceSeedResult(result);

      // Auto-verify after seeding AND update admin roleId
      setTimeout(async () => {
        const { seedModule } = await loadScripts();
        const verifyResult = await seedModule.verifyRoles();
        setVerification(verifyResult);

        // Auto-update admin roleId
        if (result.success) {
          const updateModule = await import('@/scripts/updateAdminRole');
          await updateModule.updateAdminRoleId();
        }
      }, 1000);
    } catch (error: any) {
      setForceSeedResult({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    setIsLoading(true);
    setCleanupResult(null);
    try {
      const { cleanupModule } = await loadScripts();
      const result = await cleanupModule.cleanupDuplicateRoles();
      setCleanupResult(result);

      // Auto-verify after cleanup
      setTimeout(async () => {
        const { seedModule } = await loadScripts();
        const verifyResult = await seedModule.verifyRoles();
        setVerification(verifyResult);
      }, 1000);
    } catch (error: any) {
      setCleanupResult({ success: false, error: error.message, kept: 0, deleted: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Utility</h1>
          <p className="text-gray-600 mb-8">One-time setup tasks for RBAC system</p>

          <div className="space-y-6">
            {/* Auto Fix Section */}
            <div className="border-2 border-amber-300 bg-amber-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <Zap className="h-6 w-6 text-amber-600" />
                🚀 Automated Fix (Recommended)
              </h2>
              <p className="text-amber-800 mb-4">
                <strong>Getting "Access Denied"?</strong> This will automatically:
                <br />• Grant you super admin access
                <br />• Delete blocking non-system roles
                <br />• Seed all 9 system roles
                <br />• Configure your admin account properly
              </p>
              <button
                onClick={handleAutoFix}
                disabled={isLoading}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Running Auto-Fix...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Run Automated Fix
                  </>
                )}
              </button>

              {autoFixResult && (
                <div className={`mt-4 p-4 rounded-lg ${Object.values(autoFixResult).every((r: any) => r.success !== false) ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-2">
                    {Object.values(autoFixResult).every((r: any) => r.success !== false) ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className={`font-semibold ${Object.values(autoFixResult).every((r: any) => r.success !== false) ? 'text-green-900' : 'text-red-900'}`}>
                        {Object.values(autoFixResult).every((r: any) => r.success !== false) ? '✅ Auto-Fix Completed!' : '⚠️ Auto-Fix Encountered Issues'}
                      </h3>
                      <div className="mt-2 space-y-1 text-sm">
                        {autoFixResult.step1 && (
                          <div className={autoFixResult.step1.success ? 'text-green-800' : 'text-red-800'}>
                            {autoFixResult.step1.success ? '✅' : '❌'} Step 1: {autoFixResult.step1.message}
                          </div>
                        )}
                        {autoFixResult.step2 && (
                          <div className={autoFixResult.step2.success ? 'text-green-800' : 'text-red-800'}>
                            {autoFixResult.step2.success ? '✅' : '❌'} Step 2: {autoFixResult.step2.message}
                          </div>
                        )}
                        {autoFixResult.step3 && (
                          <div className={autoFixResult.step3.success ? 'text-green-800' : 'text-red-800'}>
                            {autoFixResult.step3.success ? '✅' : '❌'} Step 3: {autoFixResult.step3.message}
                          </div>
                        )}
                        {autoFixResult.step4 && (
                          <div className={autoFixResult.step4.success ? 'text-green-800' : 'text-red-800'}>
                            {autoFixResult.step4.success ? '✅' : '❌'} Step 4: {autoFixResult.step4.message}
                          </div>
                        )}
                      </div>
                      {Object.values(autoFixResult).every((r: any) => r.success !== false) && (
                        <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded text-blue-900 text-sm font-semibold">
                          🔄 Please refresh the page to apply changes!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Force Seed Section */}
            <div className="border-2 border-red-300 bg-red-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-900 mb-2 flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-red-600" />
                🔥 Force Seed Roles (Use This if Seeding Fails)
              </h2>
              <p className="text-red-800 mb-4">
                <strong>Warning:</strong> This will DELETE all existing roles and create fresh system roles.
                <br />Use this if the normal seed fails due to existing legacy roles.
              </p>
              <button
                onClick={handleForceSeed}
                disabled={isLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Force Seeding...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5" />
                    Force Seed Roles
                  </>
                )}
              </button>

              {forceSeedResult && (
                <div className={`mt-4 p-4 rounded-lg ${forceSeedResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-2">
                    {forceSeedResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={forceSeedResult.success ? 'text-green-800 font-semibold' : 'text-red-800 font-semibold'}>
                        {forceSeedResult.message}
                      </p>
                      {forceSeedResult.count > 0 && (
                        <p className="text-green-700 mt-2">
                          ✅ Created {forceSeedResult.count} system roles
                        </p>
                      )}
                      {forceSeedResult.success && (
                        <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded text-blue-900 text-sm font-semibold">
                          🔄 Please refresh the page to apply changes!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cleanup Duplicates Section */}
            <div className="border-2 border-orange-300 bg-orange-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-orange-900 mb-2 flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-orange-600" />
                🧹 Cleanup Duplicate Roles
              </h2>
              <p className="text-orange-800 mb-4">
                <strong>Have duplicate system roles?</strong> This will:
                <br />• Find all roles with the same name
                <br />• Keep the oldest role (first created)
                <br />• Delete all duplicates
              </p>
              <button
                onClick={handleCleanupDuplicates}
                disabled={isLoading}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Cleaning Up...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5" />
                    Cleanup Duplicates
                  </>
                )}
              </button>

              {cleanupResult && (
                <div className={`mt-4 p-4 rounded-lg ${cleanupResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-2">
                    {cleanupResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className={`font-semibold ${cleanupResult.success ? 'text-green-900' : 'text-red-900'}`}>
                        {cleanupResult.success ? '✅ Cleanup Completed!' : '⚠️ Cleanup Failed'}
                      </h3>
                      <p className={cleanupResult.success ? 'text-green-800 mt-2' : 'text-red-800 mt-2'}>
                        {cleanupResult.message}
                      </p>
                      {cleanupResult.success && (
                        <div className="mt-2 space-y-1 text-sm">
                          <div className="text-green-800">
                            ✅ Kept: {cleanupResult.kept} unique role{cleanupResult.kept !== 1 ? 's' : ''}
                          </div>
                          <div className="text-green-800">
                            🗑️ Deleted: {cleanupResult.deleted} duplicate{cleanupResult.deleted !== 1 ? 's' : ''}
                          </div>
                        </div>
                      )}
                      {cleanupResult.success && cleanupResult.deleted > 0 && (
                        <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded text-blue-900 text-sm font-semibold">
                          🔄 Please refresh the page to see the updated roles!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Seed Roles Section */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <PlayCircle className="h-6 w-6 text-blue-600" />
                1. Seed Default System Roles
              </h2>
              <p className="text-gray-600 mb-4">
                Creates 9 default system roles (Super Admin, System Admin, Operations Admin, etc.)
              </p>
              <button
                onClick={handleSeedRoles}
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-5 w-5" />
                    Seed Roles
                  </>
                )}
              </button>

              {seedResult && (
                <div className={`mt-4 p-4 rounded-lg ${seedResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-2">
                    {seedResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className={`font-semibold ${seedResult.success ? 'text-green-900' : 'text-red-900'}`}>
                        {seedResult.success ? 'Roles Seeded Successfully' : 'Seeding Failed'}
                      </h3>
                      <pre className="mt-2 text-sm text-gray-700 bg-white p-3 rounded overflow-auto">
                        {JSON.stringify(seedResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Migrate Admins Section */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <PlayCircle className="h-6 w-6 text-purple-600" />
                2. Migrate Existing Admins
              </h2>
              <p className="text-gray-600 mb-4">
                Updates existing admin documents with new hierarchical fields (canCreateSubUsers, createdSubUsersCount)
              </p>
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={handleMigrateAdmins}
                  disabled={isLoading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Migrating...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-5 w-5" />
                      Migrate Admins
                    </>
                  )}
                </button>
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded">
                  <AlertCircle className="h-4 w-4" />
                  <span>Only run if you have existing admin documents</span>
                </div>
              </div>

              {migrationResult && (
                <div className={`mt-4 p-4 rounded-lg ${migrationResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-2">
                    {migrationResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className={`font-semibold ${migrationResult.success ? 'text-green-900' : 'text-red-900'}`}>
                        {migrationResult.success ? 'Migration Completed' : 'Migration Failed'}
                      </h3>
                      <pre className="mt-2 text-sm text-gray-700 bg-white p-3 rounded overflow-auto">
                        {JSON.stringify(migrationResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Verification Section */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                3. Verify Setup
              </h2>
              <p className="text-gray-600 mb-4">
                Verify that all system roles have been created correctly
              </p>
              <button
                onClick={handleVerifyRoles}
                disabled={isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Verify Roles
                  </>
                )}
              </button>

              {verification && (
                <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900">
                        Found {verification.count} System Role{verification.count !== 1 ? 's' : ''}
                      </h3>
                      {verification.roles && verification.roles.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {verification.roles.map((role: any, idx: number) => (
                            <li key={idx} className="text-sm text-gray-700">
                              • Level {role.level}: {role.displayName}
                            </li>
                          ))}
                        </ul>
                      )}
                      {verification.error && (
                        <p className="mt-2 text-sm text-red-700">{verification.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Next Steps After Setup</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Run "Seed Default System Roles" to create the 9 system roles</li>
              <li>Run "Migrate Existing Admins" only if you have existing admin users</li>
              <li>Run "Verify Setup" to confirm roles were created correctly</li>
              <li>Create your first Super Admin user via Firebase Console</li>
              <li>Navigate to /admin/roles and /admin/users to test the RBAC system</li>
              <li>Delete this utility page after setup is complete</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
