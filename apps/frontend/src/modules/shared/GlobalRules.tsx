import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Settings, Shield, Bell, Clock, Users, BookOpen, Globe,
  Save, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Loader2, RefreshCw, Lock,
  Zap, Eye, FileText
} from 'lucide-react';
import { useGlobalRules } from '../../context/GlobalRulesContext';

const API = import.meta.env.VITE_API_URL;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

/* ─── Types ─────────────────────────────────────────────── */
interface Rule {
  id: string;
  label: string;
  description: string;
  value: boolean | number | string;
  type: 'toggle' | 'number' | 'select';
  options?: string[];
  unit?: string;
}

interface RuleGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  rules: Rule[];
}

/* ─── Default config loaded from localStorage ────────────── */
const DEFAULT_RULES: RuleGroup[] = [
  {
    id: 'access',
    title: 'Access & Security',
    icon: Shield,
    color: 'text-red-500 bg-red-500/10',
    rules: [
      { id: 'require_otp', label: 'Require OTP for Session Attendance', description: 'Students must verify their presence with a session OTP provided by the instructor.', value: true, type: 'toggle' },
      { id: 'jwt_expiry_hours', label: 'Session Token Expiry', description: 'How long a login session stays active before the user must re-authenticate.', value: 24, type: 'number', unit: 'hours' },
      { id: 'block_expired_colleges', label: 'Block Expired College Portals', description: 'Prevent all users from an expired college from accessing the platform.', value: true, type: 'toggle' },
      { id: 'max_login_attempts', label: 'Max Failed Login Attempts', description: 'Lock account after this many consecutive failed login attempts.', value: 5, type: 'number', unit: 'attempts' },
    ],
  },
  {
    id: 'submissions',
    title: 'Assignments & Submissions',
    icon: FileText,
    color: 'text-indigo-500 bg-indigo-500/10',
    rules: [
      { id: 'allow_late_submissions', label: 'Allow Late Submissions', description: 'Students can submit assignments after the due date. Submissions will be marked as "Late".', value: true, type: 'toggle' },
      { id: 'late_penalty_pct', label: 'Late Submission Penalty', description: 'Percentage deducted from the grade for late submissions.', value: 10, type: 'number', unit: '%' },
      { id: 'max_submission_size_mb', label: 'Max Submission File Size', description: 'Maximum file size allowed for assignment submissions.', value: 50, type: 'number', unit: 'MB' },
      { id: 'auto_grade', label: 'Auto-Grade Submissions', description: 'Automatically grade submissions when a grading rubric is available.', value: false, type: 'toggle' },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications & Alerts',
    icon: Bell,
    color: 'text-yellow-500 bg-yellow-500/10',
    rules: [
      { id: 'notify_new_announcement', label: 'Notify on New Announcement', description: 'Send an in-app notification when a new announcement is posted.', value: true, type: 'toggle' },
      { id: 'notify_assignment_due', label: 'Assignment Due Reminders', description: 'Send reminders to students before assignments are due.', value: true, type: 'toggle' },
      { id: 'reminder_hours_before', label: 'Reminder Lead Time', description: 'How many hours before the deadline to send a reminder.', value: 24, type: 'number', unit: 'hours' },
      { id: 'notify_new_student', label: 'Notify on New Enrollment', description: 'Alert college admins when a new student joins their institution.', value: true, type: 'toggle' },
    ],
  },
  {
    id: 'workshops',
    title: 'Workshop Settings',
    icon: BookOpen,
    color: 'text-green-500 bg-green-500/10',
    rules: [
      { id: 'default_workshop_visibility', label: 'Default Workshop Visibility', description: 'Who can see a newly created workshop before it is published.', value: 'College Only', type: 'select', options: ['College Only', 'All Enrolled', 'Public'] },
      { id: 'require_instructor_approval', label: 'Require Instructor Approval for Enrollment', description: 'Students must be approved by the instructor before joining a workshop.', value: false, type: 'toggle' },
      { id: 'max_students_per_workshop', label: 'Max Students Per Workshop', description: 'Default cap on the number of students in a single workshop. Set to 0 for unlimited.', value: 200, type: 'number', unit: 'students' },
      { id: 'allow_self_enrollment', label: 'Allow Self-Enrollment', description: 'Students can join workshops using an invite link without admin approval.', value: true, type: 'toggle' },
    ],
  },
  {
    id: 'platform',
    title: 'Platform Behaviour',
    icon: Globe,
    color: 'text-purple-500 bg-purple-500/10',
    rules: [
      { id: 'maintenance_mode', label: 'Maintenance Mode', description: 'Take the platform offline for all users except Super Admins. Show a maintenance notice.', value: false, type: 'toggle' },
      { id: 'default_theme', label: 'Default Theme', description: 'The default theme shown to new users before they set their own preference.', value: 'Dark', type: 'select', options: ['Dark', 'Light'] },
      { id: 'forum_enabled', label: 'Platform Forum', description: 'Enable the Community Forum feature across all colleges.', value: true, type: 'toggle' },
      { id: 'sandbox_enabled', label: 'Coding Sandbox', description: 'Enable the coding sandbox environment for students and instructors.', value: true, type: 'toggle' },
    ],
  },
];

function mergeWithBackend(backendData: Record<string, any>): RuleGroup[] {
  return DEFAULT_RULES.map(group => ({
    ...group,
    rules: group.rules.map(rule => ({
      ...rule,
      value: rule.id in backendData ? backendData[rule.id] : rule.value,
    })),
  }));
}

function flattenRules(groups: RuleGroup[]): Record<string, any> {
  const flat: Record<string, any> = {};
  groups.forEach(g => g.rules.forEach(r => { flat[r.id] = r.value; }));
  return flat;
}

/* ─── Toggle component ───────────────────────────────────── */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${on ? 'bg-primary-light' : 'bg-slate-300 dark:bg-white/20'}`}
    >
      <motion.div
        animate={{ x: on ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
      />
    </button>
  );
}

export default function GlobalRules() {
  const [groups, setGroups] = useState<RuleGroup[]>(DEFAULT_RULES);
  const [expanded, setExpanded] = useState<string>('access');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [changed, setChanged] = useState(false);
  const { refresh } = useGlobalRules();

  // Load rules from backend on mount
  useEffect(() => {
    axios.get(`${API}/global-rules`)
      .then(res => setGroups(mergeWithBackend(res.data)))
      .catch(() => {}); // Keep defaults if offline
  }, []);

  const updateRule = (groupId: string, ruleId: string, value: any) => {
    setGroups(prev => prev.map(g =>
      g.id === groupId
        ? { ...g, rules: g.rules.map(r => r.id === ruleId ? { ...r, value } : r) }
        : g
    ));
    setChanged(true);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API}/global-rules`, flattenRules(groups), { headers: auth() });
      refresh(); // Update global context immediately
      setSaved(true);
      setChanged(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save rules');
    } finally { setSaving(false); }
  };

  const handleReset = async () => {
    try {
      const defaults = flattenRules(DEFAULT_RULES);
      await axios.patch(`${API}/global-rules`, defaults, { headers: auth() });
      setGroups(DEFAULT_RULES);
      refresh();
      setChanged(false);
      setSaved(false);
    } catch {}
  };

  const flat = flattenRules(groups);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary-light" />
            Global Rules
          </h1>
          <p className="text-sm opacity-50 mt-1">Configure platform-wide policies, access controls, and behaviour defaults</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {changed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 text-yellow-500 text-xs font-black px-3 py-1.5 bg-yellow-500/10 rounded-xl">
              <AlertTriangle className="w-3.5 h-3.5" /> Unsaved changes
            </motion.div>
          )}
          {saved && !changed && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 text-green-500 text-xs font-black px-3 py-1.5 bg-green-500/10 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </motion.div>
          )}
          <button onClick={handleReset}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer" title="Reset to defaults">
            <RefreshCw className="w-4 h-4 opacity-40" />
          </button>
          <button onClick={handleSave} disabled={saving || !changed}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-light hover:bg-primary-light/90 text-white rounded-xl font-black text-sm cursor-pointer shadow-lg shadow-primary-light/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Rules'}
          </button>
        </div>
      </div>

      {/* Maintenance mode banner */}
      {flat.maintenance_mode && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-black text-sm">Maintenance Mode is ON</p>
            <p className="text-xs opacity-70">All users except Super Admins are currently blocked from accessing the platform.</p>
          </div>
        </motion.div>
      )}

      {/* Rule groups */}
      <div className="space-y-4">
        {groups.map(group => {
          const Icon = group.icon;
          const isOpen = expanded === group.id;
          const enabledCount = group.rules.filter(r => r.type === 'toggle' && r.value === true).length;
          const toggleCount = group.rules.filter(r => r.type === 'toggle').length;

          return (
            <div key={group.id}
              className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-lg">
              {/* Group header */}
              <button
                onClick={() => setExpanded(isOpen ? '' : group.id)}
                className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${group.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-base">{group.title}</p>
                    <p className="text-xs opacity-40">{group.rules.length} rules {toggleCount > 0 ? `· ${enabledCount}/${toggleCount} enabled` : ''}</p>
                  </div>
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5 opacity-40" /> : <ChevronDown className="w-5 h-5 opacity-40" />}
              </button>

              {/* Rules list */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-slate-200 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5">
                      {group.rules.map(rule => (
                        <div key={rule.id} className="flex items-start justify-between gap-6 px-6 py-5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm">{rule.label}</p>
                              {rule.id === 'maintenance_mode' && rule.value && (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 uppercase tracking-widest">Active</span>
                              )}
                            </div>
                            <p className="text-xs opacity-50 mt-0.5 leading-relaxed">{rule.description}</p>
                          </div>

                          {/* Control */}
                          <div className="shrink-0 flex items-center">
                            {rule.type === 'toggle' && (
                              <Toggle
                                on={rule.value as boolean}
                                onChange={v => updateRule(group.id, rule.id, v)}
                              />
                            )}
                            {rule.type === 'number' && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  value={rule.value as number}
                                  onChange={e => updateRule(group.id, rule.id, Number(e.target.value))}
                                  className="w-20 text-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-sm font-black focus:ring-2 focus:ring-primary-light outline-none"
                                />
                                {rule.unit && <span className="text-xs opacity-40 font-bold">{rule.unit}</span>}
                              </div>
                            )}
                            {rule.type === 'select' && (
                              <select
                                value={rule.value as string}
                                onChange={e => updateRule(group.id, rule.id, e.target.value)}
                                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary-light outline-none cursor-pointer"
                              >
                                {rule.options?.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Rule summary */}
      <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl p-6">
        <h3 className="font-black text-sm uppercase tracking-widest opacity-40 mb-4 flex items-center gap-2"><Eye className="w-4 h-4" /> Active Rule Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'OTP Required', on: flat.require_otp },
            { label: 'Expired College Block', on: flat.block_expired_colleges },
            { label: 'Late Submissions', on: flat.allow_late_submissions },
            { label: 'Forum Enabled', on: flat.forum_enabled },
            { label: 'Coding Sandbox', on: flat.sandbox_enabled },
            { label: 'Maintenance Mode', on: flat.maintenance_mode, warning: true },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-bold ${s.on ? (s.warning ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500') : 'bg-slate-200/50 dark:bg-white/5 opacity-50'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${s.on ? (s.warning ? 'bg-red-500' : 'bg-green-500') : 'bg-slate-400'}`} />
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
