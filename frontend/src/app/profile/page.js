'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { ArrowLeft, User, Lock, Save, Loader2, Eye, EyeOff, Check, X, Camera, Trash2, AlertTriangle, Laptop, Smartphone, Monitor, LogOut } from 'lucide-react';
import Link from 'next/link';

const passwordRequirements = [
  { regex: /.{8,}/, label: 'At least 8 characters' },
  { regex: /[A-Z]/, label: 'One uppercase letter' },
  { regex: /[a-z]/, label: 'One lowercase letter' },
  { regex: /[0-9]/, label: 'One number' },
  { regex: /[!@#$%^&*(),.?":{}|<>]/, label: 'One special character' },
];

const getDeviceIcon = (device) => {
  if (device?.toLowerCase().includes('mobile') || device?.toLowerCase().includes('android') || device?.toLowerCase().includes('ios')) {
    return Smartphone;
  }
  if (device?.toLowerCase().includes('tablet')) {
    return Laptop;
  }
  return Monitor;
};

export default function ProfilePage() {
  const { user, loading, logout, updateUser, fetchUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loggingOutSession, setLoggingOutSession] = useState(null);

  const passwordStrength = useMemo(() => {
    const passed = passwordRequirements.filter(req => req.regex.test(newPassword)).length;
    if (passed === 0) return { score: 0, color: 'bg-slate-200 dark:bg-slate-700', label: '' };
    if (passed <= 1) return { score: 1, color: 'bg-red-500', label: 'Weak' };
    if (passed <= 3) return { score: 2, color: 'bg-yellow-500', label: 'Medium' };
    return { score: 3, color: 'bg-emerald-500', label: 'Strong' };
  }, [newPassword]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await authAPI.getSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAvatar(user.avatar || '');
      fetchSessions();
    }
  }, [user, loading, router]);

  const handleLogoutSession = async (sessionId) => {
    setLoggingOutSession(sessionId);
    try {
      await authAPI.logoutSession(sessionId);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
      setMessage({ type: 'success', text: 'Session logged out' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to logout session' });
    } finally {
      setLoggingOutSession(null);
    }
  };

  const handleLogoutAllSessions = async () => {
    try {
      await authAPI.logoutAllSessions();
      fetchSessions();
      setMessage({ type: 'success', text: 'All other sessions logged out' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to logout sessions' });
    }
  };

  const formatLastActive = (date) => {
    const now = new Date();
    const lastActive = new Date(date);
    const diff = now - lastActive;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 5MB' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setAvatar(data.avatarUrl);
        updateUser({ avatar: data.avatarUrl });
        setMessage({ type: 'success', text: 'Avatar updated successfully' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload avatar' });
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await authAPI.updateProfile({ name, email });
      updateUser({ name, email });
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (passwordStrength.score < 3) {
      setMessage({ type: 'error', text: 'Please meet all password requirements' });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setMessage({ type: 'error', text: 'Please enter your password' });
      return;
    }
    setDeleteLoading(true);
    try {
      await authAPI.deleteAccount(deletePassword);
      logout();
      router.push('/');
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete account' });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-2xl mx-auto p-6 md:p-8">
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-8">Profile Settings</h1>

        {message.text && (
          <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-emerald-500 mr-2" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Profile Picture</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover ring-4 ring-slate-100 dark:ring-slate-700" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-emerald-500/30">
                  {name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-emerald-500 text-white p-2 rounded-full hover:bg-emerald-600 shadow-lg transition-all hover:scale-110"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Click the camera icon to upload a new photo</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Max file size: 5MB</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-emerald-500 mr-2" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Personal Information</h2>
          </div>
          <form onSubmit={handleProfileUpdate}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all text-slate-800 dark:text-slate-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all text-slate-800 dark:text-slate-100"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 transition-all font-medium"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center mb-4">
            <Lock className="w-5 h-5 text-emerald-500 mr-2" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Change Password</h2>
          </div>
          <form onSubmit={handlePasswordChange}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all text-slate-800 dark:text-slate-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-emerald-500 transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all text-slate-800 dark:text-slate-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-emerald-500 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {newPassword && (
                  <>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            passwordStrength.score >= level ? passwordStrength.color : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="mt-2 space-y-1">
                      {passwordRequirements.map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          {req.regex.test(newPassword) ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <X className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          )}
                          <span className={req.regex.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all text-slate-800 dark:text-slate-100"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 transition-all font-medium"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                Change Password
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Monitor className="w-5 h-5 text-emerald-500 mr-2" />
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Active Sessions</h2>
            </div>
            {sessions.length > 1 && (
              <button
                type="button"
                onClick={handleLogoutAllSessions}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline"
              >
                Logout all others
              </button>
            )}
          </div>
          
          {loadingSessions ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const DeviceIcon = getDeviceIcon(session.device);
                return (
                  <div key={session._id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-600 flex items-center justify-center">
                        <DeviceIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {session.device || 'Unknown Device'}
                          {session.isCurrent && (
                            <span className="ml-2 text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">Current</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {session.browser} &bull; {session.os} &bull; {session.ip}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Last active: {formatLastActive(session.lastActive)}
                        </p>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleLogoutSession(session._id)}
                        disabled={loggingOutSession === session._id}
                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Logout this session"
                      >
                        {loggingOutSession === session._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
              {sessions.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No active sessions found</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-red-200 dark:border-red-900/50 p-6 mt-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Once you delete your account, there is no going back. All your data will be permanently removed.</p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all font-medium"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Account
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Delete Account</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Enter your password to confirm</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500 focus:border-red-400 dark:focus:border-red-500 transition-all text-slate-800 dark:text-slate-100"
                placeholder="Your password"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                }}
                className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors font-medium"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
