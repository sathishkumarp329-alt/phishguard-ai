import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PasswordStrength from '@/components/PasswordStrength';
import { authApi } from '@/services/api';
import { formatDate } from '@/utils/helpers';
import {
  User,
  Mail,
  Lock,
  Key,
  Trash2,
  CheckCircle,
  AlertCircle,
  Shield,
  Save,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  // Profile Edit State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Delete Account State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    if (!fullName.trim()) {
      setProfileError('Full name cannot be empty');
      return;
    }

    setProfileSaving(true);
    try {
      await authApi.updateProfile({ full_name: fullName.trim() });
      await refreshUser();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
      setProfileError(
        errorObj?.response?.data?.detail ||
        errorObj?.response?.data?.message ||
        'Failed to update profile.'
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordSaving(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
      setPasswordError(
        errorObj?.response?.data?.detail ||
        errorObj?.response?.data?.message ||
        'Failed to change password. Please verify current password.'
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm deletion');
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await authApi.deleteAccount(deletePassword);
      await logout();
      navigate('/');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
      setDeleteError(
        errorObj?.response?.data?.detail ||
        errorObj?.response?.data?.message ||
        'Failed to delete account. Incorrect password.'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161b40] border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-1">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>Identity & Security Credentials</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Account Profile</h1>
          <p className="text-sm text-gray-400">
            Manage your personal security profile and authentication credentials.
          </p>
        </div>

        {/* User Info Overview & Edit Form */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-[#1e2456]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center font-extrabold text-white text-2xl shadow-lg shadow-cyan-950">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user?.full_name || 'Cybersecurity Analyst'}</h2>
              <p className="text-xs text-cyan-400 font-mono mt-0.5">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#0d1137] text-cyan-300 border border-[#1e2456]">
                  Role: {user?.role || 'User'}
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Active
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  Member since {formatDate(user?.created_at)}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Update Profile Information
            </h3>

            {profileSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Profile details updated successfully.</span>
              </div>
            )}

            {profileError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Vance"
                icon={<User className="w-4 h-4" />}
                required
              />

              <Input
                label="Email Address (Verified)"
                type="email"
                value={user?.email || ''}
                disabled
                icon={<Mail className="w-4 h-4" />}
                helperText="Email cannot be changed directly for security integrity"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={profileSaving}
                icon={<Save className="w-4 h-4" />}
              >
                Save Profile Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Change Password Form */}
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Change Account Password</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Ensure you use a strong, unique passphrase with at least 8 characters.
            </p>
          </div>

          {passwordSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Password updated successfully. Session tokens re-keyed.</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              icon={<Lock className="w-4 h-4" />}
              showPasswordToggle
              required
            />

            <div>
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                icon={<Lock className="w-4 h-4" />}
                showPasswordToggle
                required
              />
              <PasswordStrength password={newPassword} showCriteria={false} />
            </div>

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              icon={<Lock className="w-4 h-4" />}
              showPasswordToggle
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="secondary"
                size="md"
                loading={passwordSaving}
              >
                Update Password
              </Button>
            </div>
          </form>
        </Card>

        {/* Danger Zone: Account Deletion */}
        <Card className="p-6 border-red-900/40 bg-red-950/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>Delete Account & Data</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1 max-w-md">
                Permanently delete your profile, scan telemetry, and all associated session tokens. This action cannot be reversed.
              </p>
            </div>

            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setDeleteError(null);
                setDeletePassword('');
                setDeleteModalOpen(true);
              }}
            >
              Delete Account
            </Button>
          </div>
        </Card>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Confirm Account Deletion"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <span>
                WARNING: Deleting your account will immediately purge all your scan logs and security reports permanently.
              </span>
            </div>

            {deleteError && (
              <p className="text-xs text-red-400 animate-fadeIn">{deleteError}</p>
            )}

            <Input
              label="Enter Account Password to Confirm"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your password"
              icon={<Lock className="w-4 h-4" />}
              showPasswordToggle
              required
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={deleteLoading}
                onClick={handleDeleteAccount}
              >
                Permanently Delete Account
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
