import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Plus, X, Edit3, Trash2, Bell, CheckCircle2,
  AlertTriangle, Info, Zap, Loader2, Save, ChevronDown, ChevronUp
} from 'lucide-react';

interface Announcement {
  _id: string;
  title: string;
  body: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'URGENT';
  authorName: string;
  collegeId: string | null;
  createdAt: string;
  expiresAt?: string;
}

const TYPE_STYLES = {
  INFO:    { icon: Info,          bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-500',   badge: 'bg-blue-500/20 text-blue-400',   label: 'Info' },
  SUCCESS: { icon: CheckCircle2,  bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-500',  badge: 'bg-green-500/20 text-green-400',  label: 'Update' },
  WARNING: { icon: AlertTriangle, bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-500', badge: 'bg-yellow-500/20 text-yellow-400', label: 'Warning' },
  URGENT:  { icon: Zap,           bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-500',    badge: 'bg-red-500/20 text-red-400',     label: 'Urgent' },
};

const EMPTY_FORM = { title: '', body: '', type: 'INFO' as Announcement['type'], expiresAt: '' };

export default function AnnouncementsWidget() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const canManage = user.role === 'SUPER_ADMIN' || user.role === 'INSTRUCTOR';

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, expiresAt: form.expiresAt || undefined };
      if (editingId) {
        await axios.patch(`${import.meta.env.VITE_API_URL}/announcements/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/announcements`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      fetchAnnouncements();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleEdit = (ann: Announcement) => {
    setForm({ title: ann.title, body: ann.body, type: ann.type, expiresAt: ann.expiresAt || '' });
    setEditingId(ann._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    setDeletingId(id);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/announcements/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAnnouncements();
    } catch (err) { console.error(err); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-[32px] overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-light/10 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-primary-light" />
          </div>
          <div>
            <h3 className="font-black text-base tracking-tight">News & Announcements</h3>
            <p className="text-[10px] font-bold uppercase opacity-30 tracking-widest">{announcements.length} active</p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ ...EMPTY_FORM }); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-light hover:bg-primary-light/90 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-primary-light/20"
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? 'Close' : 'Post'}
          </button>
        )}
      </div>

      {/* Composer Form */}
      <AnimatePresence>
        {showForm && canManage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="p-5 border-b border-slate-200 dark:border-white/10 space-y-3 bg-slate-50 dark:bg-white/[0.03]">
              <div className="text-xs font-black uppercase tracking-widest opacity-50 mb-1">
                {editingId ? '✏️ Edit Announcement' : '📢 New Announcement'}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['INFO', 'SUCCESS', 'WARNING', 'URGENT'] as const).map(t => {
                  const s = TYPE_STYLES[t];
                  const Icon = s.icon;
                  return (
                    <button
                      key={t} type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${form.type === t ? `${s.bg} ${s.border} ${s.text}` : 'border-slate-200 dark:border-white/10 opacity-50 hover:opacity-80'}`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {s.label}
                    </button>
                  );
                })}
              </div>

              <input
                required
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Announcement title..."
                className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary-light outline-none transition-all"
              />
              <textarea
                required
                value={form.body}
                onChange={e => setForm({ ...form, body: e.target.value })}
                placeholder="Full announcement details..."
                rows={3}
                className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-primary-light outline-none transition-all"
              />
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase opacity-40 block mb-1">Expires (optional)</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-light outline-none transition-all cursor-pointer"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="self-end flex items-center gap-2 px-5 py-2.5 bg-primary-light hover:bg-primary-light/90 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-primary-light/20 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingId ? 'Update' : 'Publish'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcements List */}
      <div className="divide-y divide-slate-200 dark:divide-white/5 max-h-[480px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin opacity-30" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="w-10 h-10 mx-auto opacity-10 mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-20">No announcements yet</p>
          </div>
        ) : (
          announcements.map((ann) => {
            const s = TYPE_STYLES[ann.type] || TYPE_STYLES.INFO;
            const Icon = s.icon;
            const isOpen = expanded === ann._id;

            return (
              <motion.div
                key={ann._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`p-5 ${s.bg} border-l-4 ${s.border} relative group`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`mt-0.5 shrink-0 ${s.text}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${s.badge}`}>
                          {s.label}
                        </span>
                        {!ann.collegeId && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 uppercase tracking-widest">
                            Global
                          </span>
                        )}
                      </div>
                      <h4 className="font-black text-sm leading-snug mb-1">{ann.title}</h4>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="text-sm opacity-60 mb-2 leading-relaxed overflow-hidden"
                          >
                            {ann.body}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center gap-3 text-[10px] opacity-40 font-bold">
                        <span>By {ann.authorName}</span>
                        <span>·</span>
                        <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                        {ann.expiresAt && <><span>·</span><span>Expires {new Date(ann.expiresAt).toLocaleDateString()}</span></>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpanded(isOpen ? null : ann._id)}
                      className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer opacity-50 hover:opacity-100"
                    >
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => handleEdit(ann)}
                          className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer opacity-0 group-hover:opacity-60 hover:!opacity-100"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(ann._id)}
                          disabled={deletingId === ann._id}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-60 hover:!opacity-100"
                        >
                          {deletingId === ann._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
