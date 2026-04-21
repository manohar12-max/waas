import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  School, Users, BookOpen, Clock, ArrowUpRight, TrendingUp,
  Building2, CheckCircle2, FileText, Loader2, BarChart3, PieChartIcon
} from 'lucide-react';
import AnnouncementsWidget from '../../components/AnnouncementsWidget';
import { StatsChart } from '../../components/StatsCharts';

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

const SuperAdminDashboard = ({ stats, loading }: any) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <QuickStat label="Total Colleges" value={loading ? '...' : stats?.totalColleges} icon={Building2} trend="+4%" />
      <QuickStat label="Global Students" value={loading ? '...' : stats?.totalUsers} icon={Users} trend="+12%" />
      <QuickStat label="Active Workshops" value={loading ? '...' : stats?.totalWorkshops} icon={BookOpen} trend="+8%" />
      <QuickStat label="Live Sessions" value={loading ? '...' : stats?.activeSessions} icon={Clock} trend="+15%" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-8 rounded-[40px] shadow-2xl">
        <StatsChart title="Institutional Role Distribution" type="pie" data={stats?.roleDistribution} />
      </div>
      <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-8 rounded-[40px] shadow-2xl">
        <StatsChart title="Platform Onboarding Scale" type="area" data={stats?.collegeGrowth} />
      </div>
    </div>
  </div>
);

const CollegeAdminDashboard = ({ stats, loading }: any) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <QuickStat label="Campus Students" value={loading ? '...' : stats?.totalStudents} icon={Users} trend="+5%" />
      <QuickStat label="Active Curricula" value={loading ? '...' : stats?.totalWorkshops} icon={BookOpen} />
      <QuickStat label="Ongoing Sessions" value={loading ? '...' : stats?.liveWorkshops} icon={Clock} />
      <QuickStat label="Avg. Studio Time" value={loading ? '...' : stats?.avgSessionTime} icon={Clock} />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-8 rounded-[40px] shadow-2xl">
        <StatsChart title="Workshop Lifecycle Distribution" type="pie" data={stats?.workshopStatusDistribution} />
      </div>
      <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-8 rounded-[40px] shadow-2xl">
        <StatsChart title="Institutional Attendance Delta" type="area" data={stats?.attendanceTrend} />
      </div>
    </div>
  </div>
);

const InstructorDashboard = ({ stats, loading }: any) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <QuickStat label="My Workshops" value={loading ? '...' : stats?.totalWorkshops} icon={BookOpen} />
      <QuickStat label="Ongoing Labs" value={loading ? '...' : stats?.liveWorkshops} icon={Clock} />
      <QuickStat label="Participation Rate" value={loading ? '...' : stats?.averageParticipation} icon={TrendingUp} trend="+2%" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-8 rounded-[40px] shadow-2xl">
        <StatsChart title="Assignment Submission Velocity" type="pie" data={stats?.assignmentStats} />
      </div>
      <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-8 rounded-[40px] shadow-2xl">
        <StatsChart title="Student Distribution by Lab" type="bar" data={stats?.studentDistribution} />
      </div>
    </div>
  </div>
);

const StudentDashboardView = ({ stats, loading }: any) => {
  const navigate = useNavigate();
  const [liveWorkshops, setLiveWorkshops] = useState<any[]>([]);
  const [assignmentStats, setAssignmentStats] = useState<any>(null);
  const [assignTab, setAssignTab] = useState<'pending' | 'pastDue' | 'submitted'>('pending');
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null);
  
  useEffect(() => {
    fetchLiveWorkshops();
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const response = await axios.get(`${API}/assignments/student/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAssignmentStats(response.data);
    } catch (err) { console.error(err); }
  };

  const fetchLiveWorkshops = async () => {
    try {
      const response = await axios.get(`${API}/workshops`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setLiveWorkshops(response.data.filter((w: any) => w.status === 'ONGOING'));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickStat label="My Attendance" value={loading ? '...' : stats?.attendanceRate} icon={CheckCircle2} />
        <QuickStat label="Joined Workshops" value={loading ? '...' : stats?.totalWorkshops} icon={BookOpen} />
        <QuickStat label="Active Missions" value={loading ? '...' : stats?.assignments?.find((a: any) => a.name === 'submitted')?.value || 0} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-10">
          <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-8 rounded-[48px] shadow-2xl">
            <h3 className="font-black text-2xl tracking-tight mb-8 flex items-center gap-3">
              <Clock className="w-6 h-6 text-primary-light" />
              Live Workshop Theatre
            </h3>
            <div className="space-y-4">
              {liveWorkshops.length > 0 ? (
                liveWorkshops.map((w) => (
                  <div key={w._id} className={`p-6 rounded-3xl border transition-all ${selectedWorkshop === w._id ? 'bg-primary-light/5 border-primary-light ring-4 ring-primary-light/5' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary-light/10 flex items-center justify-center text-primary-light"><BookOpen className="w-6 h-6" /></div>
                        <div>
                          <h4 className="font-bold text-lg">{w.title}</h4>
                          <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Started: {new Date(w.schedule.start).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedWorkshop(w._id)} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedWorkshop === w._id ? 'bg-primary-light text-white' : 'bg-slate-200 dark:bg-white/10 hover:bg-primary-light/10'}`}>
                        {selectedWorkshop === w._id ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center opacity-20"><p className="text-[10px] font-black uppercase tracking-widest">No ongoing sessions</p></div>
              )}
            </div>
          </div>

          <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-8 rounded-[48px] shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-2xl tracking-tight flex items-center gap-3">
                <FileText className="w-6 h-6 text-indigo-500" />
                Active Assignments
              </h3>
              <div className="flex gap-2">
                {(['pending', 'pastDue', 'submitted'] as const).map(tab => (
                  <button key={tab} onClick={() => setAssignTab(tab)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${assignTab === tab ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-white/5 opacity-50'}`}>
                    {tab} ({assignmentStats?.counts[tab] || 0})
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {(assignmentStats?.[assignTab] || []).map((a: any) => (
                  <div key={a._id} className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/5 flex flex-col justify-between group">
                    <div>
                      <h4 className="font-bold text-sm mb-2 line-clamp-1">{a.title}</h4>
                      <p className="text-[9px] font-black uppercase opacity-40 mb-4">Due: {new Date(a.dueDate).toLocaleDateString()}</p>
                    </div>
                    {assignTab !== 'submitted' ? (
                      <button onClick={() => navigate(`/submit/${a._id}`)} className="w-full py-2.5 bg-primary-light text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Submit Mission</button>
                    ) : (
                      <div className="text-center py-2 text-green-500 text-[9px] font-black uppercase tracking-widest">Submitted ✓</div>
                    )}
                  </div>
               ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/10 p-8 rounded-[48px] shadow-2xl space-y-6">
             <div className="flex items-center gap-3">
               <PieChartIcon className="w-10 h-10 text-primary-light opacity-20" />
               <h3 className="text-lg font-black tracking-tight">Progress Scan</h3>
             </div>
             <StatsChart title="Assignment Status" type="pie" data={stats?.assignments} />
          </div>
        </div>
      </div>
    </div>
  );
};

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
      if (user.role === 'STUDENT') endpoint = '/stats/student';

      const res = await axios.get(`${API}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally { setLoading(false); }
  };

  const activities: any[] = stats?.recentActivity || [];

  const renderDashboard = () => {
    switch (user.role) {
      case 'SUPER_ADMIN': return <SuperAdminDashboard stats={stats} loading={loading} />;
      case 'COLLEGE_ADMIN': return <CollegeAdminDashboard stats={stats} loading={loading} />;
      case 'INSTRUCTOR':
      case 'TEACHER': return <InstructorDashboard stats={stats} loading={loading} />;
      case 'STUDENT': return <StudentDashboardView stats={stats} loading={loading} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-outfit font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-white/40 bg-clip-text text-transparent capitalize">
            {user.role.toLowerCase().replace('_', ' ')} Overview
          </h1>
          <p className="opacity-40 font-medium mt-1">Hello, {user.name}. Here is your command center for today.</p>
        </div>
        <div className="flex items-center gap-3 bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-2 rounded-2xl shadow-xl">
           <div className="w-10 h-10 rounded-xl bg-primary-light/10 flex items-center justify-center text-primary-light border border-primary-light/10">
              <Users className="w-5 h-5" />
           </div>
           <div className="pr-4">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Identity</p>
              <p className="text-sm font-bold">{user.email}</p>
           </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={user.role}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -20 }}
           transition={{ duration: 0.4 }}
        >
          {renderDashboard()}
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-8 rounded-[40px] shadow-2xl flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
             <BarChart3 className="w-40 h-40 text-primary-light" />
          </div>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h3 className="text-2xl font-outfit font-black tracking-tight">Predictive Intelligence</h3>
              <p className="text-sm opacity-50">AI analysis of {user.role === 'STUDENT' ? 'your learning trajectory' : 'platform performance'}.</p>
            </div>
            <div className="p-3 bg-primary-light/10 text-primary-light rounded-2xl shadow-lg shadow-primary-light/5 border border-primary-light/10"><TrendingUp className="w-6 h-6" /></div>
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
             <div className="space-y-6">
                <div className="p-6 bg-slate-500/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black uppercase tracking-widest opacity-40">{user.role === 'STUDENT' ? 'Syllabus Mastery' : 'Resource Utilization'}</span>
                      <span className="text-sm font-black text-primary-light">{user.role === 'STUDENT' ? '76%' : '92%'}</span>
                   </div>
                   <div className="h-2 bg-slate-500/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-light" style={{ width: user.role === 'STUDENT' ? '76%' : '92%' }} />
                   </div>
                </div>
                <div className="p-6 bg-slate-500/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black uppercase tracking-widest opacity-40">System Coherence</span>
                      <span className="text-sm font-black text-emerald-500">98%</span>
                   </div>
                   <div className="h-2 bg-emerald-500/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[98%]" />
                   </div>
                </div>
             </div>
             <div className="flex flex-col justify-center p-8 bg-gradient-to-br from-primary-light to-indigo-600 rounded-[32px] text-white shadow-xl shadow-primary-light/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/10 relative z-10">
                   <PieChartIcon className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-xl font-black tracking-tight mb-2 relative z-10">Nexus Forecast</h4>
                <p className="text-xs opacity-80 leading-relaxed font-medium relative z-10">
                  {user.role === 'STUDENT' 
                    ? 'Your engagement metrics suggest a 12% improvement in retention over the last 30 days. Stay focused on upcoming labs.' 
                    : 'Backend metrics indicate high operational efficiency. Institutional growth is projected at +18% based on current workshop frequency.'}
                </p>
             </div>
          </div>
        </div>

        <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-6 rounded-[40px] shadow-2xl flex flex-col">
          <h3 className="text-xl font-outfit font-black tracking-tight flex items-center justify-between mb-6 px-2">
            Intelligence Feed
            <ArrowUpRight className="w-5 h-5 opacity-20" />
          </h3>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin opacity-20" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-20 space-y-3">
              <FileText className="w-12 h-12 stroke-[1.5]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">No Activity Data Collected</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[440px] pr-2 custom-scrollbar">
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
                      className="flex gap-4 items-start p-3 hover:bg-slate-500/5 rounded-2xl transition-colors cursor-default"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${colorClass} border border-current/10`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold leading-tight group-hover:text-primary-light transition-colors">{a.label}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] opacity-40 font-black uppercase tracking-widest">{timeAgo(a.time)}</span>
                          {a.sub && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-current opacity-10" />
                              <span className="text-[9px] opacity-40 font-black uppercase tracking-widest truncate">{a.sub}</span>
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
            className="mt-6 w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-all cursor-pointer border border-slate-200 dark:border-white/5 rounded-2xl hover:bg-primary-light/5 hover:text-primary-light hover:border-primary-light/20 focus:outline-none"
          >
            Sync Feed
          </button>
        </div>
      </div>

      <AnnouncementsWidget />
    </div>
  );
}
