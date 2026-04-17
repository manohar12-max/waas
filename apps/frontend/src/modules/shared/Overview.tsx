import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { School, Users, BookOpen, Clock, ArrowUpRight, TrendingUp } from 'lucide-react';

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
          <TrendingUp className="w-3 h-3" />
          {trend}
        </span>
      )}
    </div>
    <p className="text-sm opacity-50 font-medium uppercase tracking-wider">{label}</p>
    <h3 className="text-3xl font-outfit font-bold mt-1">{value}</h3>
  </motion.div>
);

export default function Overview() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [stats, setStats] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      // Determine endpoint based on deep role hierarchy
      let endpoint = '/stats/college';
      if (user.role === 'SUPER_ADMIN') endpoint = '/stats/platform';
      if (user.role === 'INSTRUCTOR' || user.role === 'TEACHER') endpoint = '/stats/instructor';

      const response = await axios.get(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-outfit font-bold tracking-tight">
          Welcome back, {user.name.split(' ')[0]} 👋
        </h1>
        <p className="opacity-60 mt-1">Here is what is happening across your platform today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickStat 
          label={user.role === 'SUPER_ADMIN' ? 'Total Colleges' : 'Active Classrooms'} 
          value={stats ? (user.role === 'SUPER_ADMIN' ? stats.totalColleges : (stats.activeClassrooms || '8')) : '...'} 
          icon={School} 
          trend="+2.5%" 
        />
        <QuickStat 
          label="Total Students" 
          value={stats ? (user.role === 'SUPER_ADMIN' ? stats.totalUsers : stats.totalStudents) : '...'} 
          icon={Users} 
          trend="+12%" 
        />
        <QuickStat 
          label="Live Workshops" 
          value={stats ? (user.role === 'SUPER_ADMIN' ? stats.activeSessions : stats.liveWorkshops) : '...'} 
          icon={BookOpen} 
        />
        <QuickStat 
          label="Avg. Session Time" 
          value={stats ? stats.avgSessionTime : '...'} 
          icon={Clock} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-8 rounded-[40px] min-h-[400px] flex flex-col justify-center items-center text-center shadow-2xl shadow-black/5">
          <div className="w-20 h-20 bg-primary-light/10 rounded-full flex items-center justify-center mb-6">
            <TrendingUp className="w-10 h-10 text-primary-light" />
          </div>
          <h3 className="text-2xl font-outfit font-bold mb-2">Activity Insights Coming Soon</h3>
          <p className="max-w-md opacity-50 px-4">
            We are calibrating your AI-driven analytics. Soon you will see detailed engagement metrics and growth trends here.
          </p>
        </div>

        <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-8 rounded-[40px] space-y-6 shadow-2xl shadow-black/5">
          <h3 className="text-xl font-outfit font-bold flex items-center justify-between">
            Recent Activity
            <ArrowUpRight className="w-5 h-5 opacity-30" />
          </h3>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 opacity-40" />
                </div>
                <div>
                  <p className="text-sm font-medium">New institution onboarded</p>
                  <p className="text-xs opacity-40">2 hours ago • Platform Logs</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full py-4 text-center text-sm font-bold opacity-30 hover:opacity-100 transition-opacity cursor-pointer">
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
}
