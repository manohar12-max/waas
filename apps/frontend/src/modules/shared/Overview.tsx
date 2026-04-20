import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  School, Users, BookOpen, Clock, ArrowUpRight, TrendingUp,
  Building2, CheckCircle2, FileText, Loader2
} from 'lucide-react';
import AnnouncementsWidget from '../../components/AnnouncementsWidget';

const API = import.meta.env.VITE_API_URL;

const ICON_MAP: Record<string, React.ElementType> = {
  building: Building2,
  user: Users,
  book: BookOpen,
  check: CheckCircle2,
  default: FileText,
};

const TYPE_COLOR: Record<string, string> = {
  college: 'bg-purple-500/10 text-purple-500',
  user: 'bg-blue-500/10 text-blue-500',
  workshop: 'bg-indigo-500/10 text-indigo-500',
  submission: 'bg-green-500/10 text-green-500',
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const QuickStat = ({ label, value, icon: Icon, trend }: any) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-6 rounded-3xl shadow-xl shadow-black/5"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 bg-primary-light/10 rounded-2xl flex items-center justify-center text-primary-light">
        <Icon className="w-6 h-6" />
      </div>
      {trend && (
        <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />{trend}
        </span>
      )}
    </div>
    <p className="text-sm opacity-50 font-medium uppercase tracking-wider">{label}</p>
    <h3 className="text-3xl font-outfit font-bold mt-1">{value ?? '—'}</h3>
  </motion.div>
);

export default function Overview() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let endpoint = '/stats/college';
      if (user.role === 'SUPER_ADMIN') endpoint = '/stats/platform';
      if (user.role === 'INSTRUCTOR' || user.role === 'TEACHER') endpoint = '/stats/instructor';

      const res = await axios.get(`${API}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally { setLoading(false); }
  };

  const activities: any[] = stats?.recentActivity || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-outfit font-bold tracking-tight">
          Welcome back, {user.name?.split(' ')[0]} 👋
        </h1>
        <p className="opacity-60 mt-1">Here is what is happening across your platform today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickStat
          label={user.role === 'SUPER_ADMIN' ? 'Total Colleges' : 'Active Classrooms'}
          value={loading ? '...' : (user.role === 'SUPER_ADMIN' ? stats?.totalColleges : stats?.activeClassrooms)}
          icon={School} trend="+2.5%"
        />
        <QuickStat
          label="Total Students"
          value={loading ? '...' : (user.role === 'SUPER_ADMIN' ? stats?.totalUsers : stats?.totalStudents)}
          icon={Users} trend="+12%"
        />
        <QuickStat
          label="Live Workshops"
          value={loading ? '...' : (user.role === 'SUPER_ADMIN' ? stats?.activeSessions : stats?.liveWorkshops)}
          icon={BookOpen}
        />
        <QuickStat
          label="Avg. Session Time"
          value={loading ? '...' : (stats?.avgSessionTime || '—')}
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity chart placeholder - left col */}
        <div className="lg:col-span-2 bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-8 rounded-[40px] min-h-[360px] flex flex-col justify-center items-center text-center shadow-2xl shadow-black/5">
          <div className="w-20 h-20 bg-primary-light/10 rounded-full flex items-center justify-center mb-6">
            <TrendingUp className="w-10 h-10 text-primary-light" />
          </div>
          <h3 className="text-2xl font-outfit font-bold mb-2">Activity Insights Coming Soon</h3>
          <p className="max-w-md opacity-50 px-4">
            We are calibrating your AI-driven analytics. Soon you will see detailed engagement metrics and growth trends here.
          </p>
        </div>

        {/* Recent Activity — right col */}
        <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-6 rounded-[40px] shadow-2xl shadow-black/5 flex flex-col">
          <h3 className="text-xl font-outfit font-bold flex items-center justify-between mb-5">
            Recent Activity
            <ArrowUpRight className="w-5 h-5 opacity-30" />
          </h3>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin opacity-30" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 space-y-2">
              <FileText className="w-8 h-8" />
              <p className="text-sm font-bold uppercase tracking-widest">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[420px] pr-1">
              <AnimatePresence>
                {activities.map((a, i) => {
                  const Icon = ICON_MAP[a.icon] || ICON_MAP.default;
                  const colorClass = TYPE_COLOR[a.type] || 'bg-slate-500/10 text-slate-400';
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex gap-3 items-start"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug line-clamp-2">{a.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] opacity-40 font-bold">{timeAgo(a.time)}</span>
                          {a.sub && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-current opacity-20" />
                              <span className="text-[10px] opacity-40 font-bold truncate">{a.sub}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={fetchStats}
            className="mt-4 w-full py-3 text-center text-xs font-bold opacity-40 hover:opacity-100 transition-opacity cursor-pointer border border-slate-200 dark:border-white/5 rounded-2xl"
          >
            Refresh Activity
          </button>
        </div>
      </div>

      {/* Announcements */}
      <AnnouncementsWidget />
    </div>
  );
}
