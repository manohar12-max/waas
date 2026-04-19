import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, User, Phone, Lock, LogOut, X,
  Check, Edit3, ChevronDown, Shield, Eye, EyeOff, Loader2
} from 'lucide-react';

type Tab = 'profile' | 'password';

export default function ProfilePanel({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('profile');
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Profile fields
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const token = localStorage.getItem('token');
  const avatarUrl = user.profileImage
    ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}${user.profileImage}`
    : null;

  const getInitials = () => {
    return (user.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadge = () => {
    const badges: Record<string, { label: string; color: string }> = {
      SUPER_ADMIN: { label: 'Super Admin', color: 'bg-purple-500/20 text-purple-400' },
      COLLEGE_ADMIN: { label: 'College Admin', color: 'bg-blue-500/20 text-blue-400' },
      TEACHER: { label: 'Teacher', color: 'bg-green-500/20 text-green-400' },
      INSTRUCTOR: { label: 'Instructor', color: 'bg-orange-500/20 text-orange-400' },
      STUDENT: { label: 'Student', color: 'bg-indigo-500/20 text-indigo-400' },
    };
    return badges[user.role] || { label: user.role, color: 'bg-slate-500/20 text-slate-400' };
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/profile/avatar`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      const updated = { ...user, profileImage: res.data.profileImage };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      setSuccess('Profile picture updated!');
    } catch {
      setError('Failed to upload image. Max 5MB.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.patch(`${import.meta.env.VITE_API_URL}/auth/profile`, { name, phone }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updated = { ...user, name: res.data.name, phone: res.data.phone };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      setSuccess('Profile updated successfully!');
    } catch {
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/auth/profile`, { currentPassword, newPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('Current password is incorrect.');
    } finally {
      setSaving(false);
    }
  };

  const badge = getRoleBadge();

  return (
    <div className="relative" ref={panelRef}>
      {/* Avatar Trigger Button */}
      <button
        onClick={() => { setOpen(!open); setSuccess(''); setError(''); }}
        className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-primary-light/50 transition-all cursor-pointer group"
      >
        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-primary-light to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span>{getInitials()}</span>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-full" />
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-12 w-80 bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60 z-[200] overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-primary-light/10 to-indigo-500/10 p-5 border-b border-slate-200 dark:border-white/10">
              <button onClick={() => setOpen(false)} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer">
                <X className="w-4 h-4 opacity-50" />
              </button>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-primary-light to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                    {avatarUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span>{getInitials()}</span>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div>
                  <div className="font-black text-base">{user.name}</div>
                  <div className="text-xs opacity-50 mb-1">{user.email}</div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-white/10">
              {(['profile', 'password'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(''); setSuccess(''); }}
                  className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${tab === t
                    ? 'text-primary-light border-b-2 border-primary-light'
                    : 'opacity-40 hover:opacity-70'
                  }`}
                >
                  {t === 'profile' ? '👤 Profile' : '🔒 Password'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {success && (
                <div className="flex items-center gap-2 mb-3 p-2.5 bg-green-500/10 text-green-500 rounded-lg text-xs font-bold">
                  <Check className="w-4 h-4" /> {success}
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 mb-3 p-2.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold">
                  <X className="w-4 h-4" /> {error}
                </div>
              )}

              {tab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase opacity-40 flex items-center gap-1"><User className="w-3 h-3" /> Full Name</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-light outline-none transition-all"
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase opacity-40 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone Number</label>
                    <input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-light outline-none transition-all"
                      placeholder="+91 9999999999"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase opacity-40 flex items-center gap-1"><Shield className="w-3 h-3" /> Email (Read Only)</label>
                    <input
                      value={user.email}
                      disabled
                      className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-xl p-2.5 text-sm opacity-50 cursor-not-allowed"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2.5 bg-primary-light hover:bg-primary-light/90 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-primary-light/20 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                    Save Changes
                  </button>
                </form>
              )}

              {tab === 'password' && (
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase opacity-40 flex items-center gap-1"><Lock className="w-3 h-3" /> Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPw ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-light outline-none transition-all pr-10"
                        placeholder="Current password"
                        required
                      />
                      <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 cursor-pointer">
                        {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase opacity-40 flex items-center gap-1"><Lock className="w-3 h-3" /> New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-light outline-none transition-all pr-10"
                        placeholder="Min. 8 characters"
                        required
                      />
                      <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 cursor-pointer">
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase opacity-40 flex items-center gap-1"><Lock className="w-3 h-3" /> Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-light outline-none transition-all"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                    Change Password
                  </button>
                </form>
              )}
            </div>

            {/* Logout */}
            <div className="p-3 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-black text-xs uppercase tracking-widest cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
