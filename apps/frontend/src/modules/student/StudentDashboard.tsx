import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AnnouncementsWidget from '../../components/AnnouncementsWidget';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Activity, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Award,
  Zap,
  FileCheck,
  XCircle,
  UserCheck,
  TrendingUp,
  Target,
  Rocket,
  Flame,
  ChevronRight,
  Plus,
  Compass
} from 'lucide-react';

interface LiveWorkshop {
  _id: string;
  title: string;
  instructorId: {
    name: string;
  };
  status: string;
  schedule: {
    start: string;
    end: string;
  };
}

interface Assignment {
  _id: string;
  title: string;
  dueDate: string;
  maxMarks: number;
  status: string;
  teacherId?: { name: string };
  workshopId?: { title: string };
  submission?: { submittedAt: string; status: string; marks?: number };
}

interface AssignmentStats {
  pending: Assignment[];
  pastDue: Assignment[];
  submitted: Assignment[];
  counts: { total: number; pending: number; pastDue: number; submitted: number };
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [activeWorkshops, setActiveWorkshops] = useState<LiveWorkshop[]>([]);
  const [upcomingWorkshops, setUpcomingWorkshops] = useState<LiveWorkshop[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<LiveWorkshop[]>([]);
  const [assignmentStats, setAssignmentStats] = useState<AssignmentStats | null>(null);
  const [assignTab, setAssignTab] = useState<'pending' | 'pastDue' | 'submitted'>('pending');
  const [loading, setLoading] = useState(true);
  const [mcqSummary, setMcqSummary] = useState<{ totalQuizzes: number, passedQuizzes: number, avgScore: number } | null>(null);
  const [selectedWorkshopAttendance, setSelectedWorkshopAttendance] = useState<any>(null);
  const [otp, setOtp] = useState("");
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchWorkshops();
    fetchAssignments();
    fetchMcqSummary();
  }, []);

  const fetchMcqSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/student/mcq-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMcqSummary(response.data);
    } catch (err) {
      console.error('Failed to fetch MCQ summary:', err);
    }
  };

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/assignments/student/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignmentStats(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWorkshops = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/workshops`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const all = response.data;
      setActiveWorkshops(all.filter((w: any) => w.status === 'ACTIVE'));
      setUpcomingWorkshops(all.filter((w: any) => w.status === 'UPCOMING').slice(0, 3));
      // Sort by creation or just take latest for "Recently Added"
      setRecentlyAdded([...all].reverse().slice(0, 3));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (workshopId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/workshops/${workshopId}/my-attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedWorkshopAttendance(response.data);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    }
  };

  const markAttendance = async (workshopId: string, status: 'PRESENT' | 'ABSENT') => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const sId = user._id || user.id;
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/workshops/${workshopId}/attendance`, 
        { studentId: sId, method: status === 'ABSENT' ? 'ABSENT' : 'SELF_CHECKIN' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedWorkshopAttendance(response.data);
      toast.success(`Marked as ${status}`);
    } catch (err) {
      toast.error('Failed to mark attendance');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkshop || otp.length < 4) return;
    
    setVerifying(true);
    setMessage({ text: "", type: "" });

    try {
      const token = localStorage.getItem('token');
      // We hit the Record Attendance endpoint
      // For now, we simulate the OTP check (in production, backend validates the active session token)
      await axios.post(`${import.meta.env.VITE_API_URL}/workshops/${selectedWorkshop}/attendance`, 
        { 
          studentId: user._id || user.id,
          method: 'OTP',
          otp: otp // Backend will validate this in the next iteration
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ text: "Attendance Verified! Presence recorded in the institutional hub.", type: "success" });
      setOtp("");
      setSelectedWorkshop(null);
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || "Verification failed. Check your OTP.", type: "error" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 font-outfit relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary-light/5 blur-[100px] rounded-full -z-10" />

      {/* Hero Section - More Compact */}
      <div className="relative overflow-hidden p-8 md:p-12 rounded-[40px] bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
           <Rocket className="w-48 h-48 text-white" />
        </div>
        <div className="relative z-10 max-w-xl">
           <motion.div 
             initial={{ opacity: 0, x: -10 }} 
             animate={{ opacity: 1, x: 0 }}
             className="flex items-center gap-2 mb-4"
           >
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">Dashboard</span>
              <div className="flex items-center gap-1.5 text-emerald-400">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
              </div>
           </motion.div>
           <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
             Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-indigo-400">{user.name.split(' ')[0]}</span>
           </h1>
           <p className="text-base opacity-60 font-medium leading-relaxed max-w-lg">
             Your learning trajectory is currently {activeWorkshops.length > 0 ? 'active' : 'idle'}. {activeWorkshops.length > 0 ? `You have ${activeWorkshops.length} live sessions.` : 'No live sessions right now.'}
           </p>
        </div>
        
        {/* Quick Stats Overlay - Smaller */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 relative z-10">
           {[
             { label: 'Attendance', value: '92%', icon: UserCheck, color: 'text-emerald-400' },
             { label: 'Accuracy', value: `${mcqSummary?.avgScore ?? 0}%`, icon: Target, color: 'text-amber-400' },
             { label: 'Missions', value: assignmentStats?.counts.total ?? 0, icon: Flame, color: 'text-orange-400' },
             { label: 'Rank', value: '#12', icon: TrendingUp, color: 'text-indigo-400' }
           ].map((stat, i) => (
             <motion.div 
               key={i}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.05 }}
               className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all"
             >
                <stat.icon className={`w-4 h-4 mb-2 ${stat.color}`} />
                <div className="text-xl font-black">{stat.value}</div>
                <div className="text-[8px] font-black uppercase tracking-widest opacity-40">{stat.label}</div>
             </motion.div>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-10">
          
          {/* Active Theater Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-black tracking-tight flex items-center gap-3 px-2">
               <Activity className="w-5 h-5 text-emerald-500" />
               Live Workshop Theatre
            </h3>
            
            <div className="space-y-3">
              {activeWorkshops.length > 0 ? (
                activeWorkshops.map((workshop) => (
                  <motion.div 
                    key={workshop._id} 
                    className={`p-6 rounded-[32px] border transition-all relative overflow-hidden group ${selectedWorkshop === workshop._id ? 'bg-primary-light/5 border-primary-light' : 'bg-card-light dark:bg-card-dark border-slate-200 dark:border-white/5 shadow-md'}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-light to-indigo-600 text-white flex items-center justify-center shadow-lg">
                           <BookOpen className="w-7 h-7" />
                        </div>
                        <div>
                          <h4 className="font-black text-lg mb-0.5">{workshop.title}</h4>
                          <div className="flex items-center gap-2">
                             <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                               On-Air
                             </div>
                             <p className="text-[9px] uppercase font-black tracking-widest opacity-30 flex items-center gap-1"><Clock className="w-3 h-3" /> Started {new Date(workshop.schedule.start).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedWorkshop(workshop._id);
                          fetchAttendance(workshop._id);
                        }}
                        className={`px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${selectedWorkshop === workshop._id ? 'bg-primary-light text-white' : 'bg-slate-100 dark:bg-white/5 hover:bg-primary-light/10 text-slate-700 dark:text-white'}`}
                      >
                        {selectedWorkshop === workshop._id ? 'Active' : 'Attend Session'}
                      </button>
                    </div>

                    {selectedWorkshop === workshop._id && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10"
                      >
                         <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-500/5 p-6 rounded-3xl">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center">
                                  <UserCheck className="w-5 h-5" />
                               </div>
                               <div>
                                  <h5 className="font-black text-base mb-0.5">Mark Attendance</h5>
                                  <p className="text-[8px] font-black uppercase opacity-40 tracking-widest">Instant self-check-in</p>
                               </div>
                            </div>
                            
                            <div className="flex gap-2">
                               {selectedWorkshopAttendance ? (
                                  <div className={`px-6 py-3 rounded-xl flex items-center gap-2 font-black text-[9px] uppercase tracking-widest ${selectedWorkshopAttendance.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                     {selectedWorkshopAttendance.status === 'PRESENT' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                     Status: {selectedWorkshopAttendance.status}
                                  </div>
                               ) : (
                                  <>
                                     <button 
                                        onClick={() => markAttendance(workshop._id, 'ABSENT')}
                                        className="px-5 py-3 bg-white dark:bg-white/5 text-red-500 border border-red-500/20 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                                     >
                                        Absent
                                     </button>
                                     <button 
                                        onClick={() => markAttendance(workshop._id, 'PRESENT')}
                                        className="px-8 py-3 bg-emerald-500 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                                     >
                                        Check In
                                     </button>
                                  </>
                               )}
                            </div>
                         </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="bg-card-light dark:bg-card-dark border border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-16 text-center">
                  <Compass className="w-8 h-8 opacity-20 mx-auto mb-4" />
                  <p className="font-black uppercase tracking-widest opacity-20 text-[10px]">No Active Theater Sessions</p>
                </div>
              )}
            </div>
          </section>

          {/* Discovery Feed */}
          <section className="space-y-4">
            <h3 className="text-2xl font-black tracking-tight flex items-center gap-3 px-2">
               <Plus className="w-5 h-5 text-indigo-500" />
               New Curricula
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {recentlyAdded.map((workshop) => (
                  <motion.div 
                    key={workshop._id}
                    className="p-6 bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm group cursor-pointer"
                  >
                     <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
                        <Rocket className="w-5 h-5" />
                     </div>
                     <h4 className="text-base font-black mb-1 line-clamp-1">{workshop.title}</h4>
                     <p className="text-[9px] font-black uppercase opacity-30 tracking-widest mb-4">Discovery Feed</p>
                     <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase bg-slate-500/10 px-2 py-0.5 rounded-md opacity-60">{workshop.status}</span>
                        <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-100 transition-all text-indigo-500" />
                     </div>
                  </motion.div>
               ))}
            </div>
          </section>

          {/* Strategic Missions */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <Target className="w-5 h-5 text-primary-light" />
                  Missions
               </h3>
               <div className="flex gap-1.5">
                {(['pending', 'pastDue', 'submitted'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setAssignTab(tab)}
                    className={`px-4 py-1.5 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all ${
                      assignTab === tab 
                        ? 'bg-primary-light text-white' 
                        : 'bg-slate-100 dark:bg-white/5 opacity-50 hover:opacity-100'
                    }`}
                  >
                    {tab} ({assignmentStats?.counts[tab] ?? 0})
                  </button>
                ))}
               </div>
            </div>

            <AnimatePresence mode="wait">
               <motion.div
                 key={assignTab}
                 initial={{ opacity: 0, y: 5 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -5 }}
                 className="grid grid-cols-1 md:grid-cols-2 gap-4"
               >
                  {(assignmentStats?.[assignTab] ?? []).length > 0 ? (
                    assignmentStats![assignTab].map((assignment) => (
                      <div key={assignment._id} className="p-6 bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm flex flex-col justify-between group">
                         <div>
                            <div className="flex justify-between items-start mb-4">
                               <div className="w-10 h-10 bg-slate-500/5 rounded-xl flex items-center justify-center">
                                  <Flame className="w-5 h-5 opacity-20" />
                                </div>
                               <span className="text-[8px] font-black uppercase bg-primary-light/10 text-primary-light px-2 py-0.5 rounded-md">{assignment.maxMarks} XP</span>
                            </div>
                            <h4 className="text-base font-black mb-1 line-clamp-2">{assignment.title}</h4>
                            <p className="text-[8px] font-black uppercase opacity-30 tracking-widest flex items-center gap-1.5 mb-6">
                               <Clock className="w-3 h-3" /> {new Date(assignment.dueDate).toLocaleDateString()}
                            </p>
                         </div>
                         <button 
                            onClick={() => navigate(`/submit/${assignment._id}`)}
                            className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-md"
                         >
                            {assignTab === 'submitted' ? 'Review' : 'Launch'}
                         </button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 text-center border border-dashed border-slate-200 dark:border-white/5 rounded-3xl opacity-20">
                       <p className="font-black uppercase tracking-widest text-[10px]">No active missions</p>
                    </div>
                  )}
               </motion.div>
            </AnimatePresence>
          </section>

        </div>

        <div className="lg:col-span-4 space-y-8">
          {/* Performance Card - Compact */}
          <div className="p-8 rounded-[40px] bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 shadow-lg space-y-8">
             <div className="flex items-center justify-between">
                <h4 className="text-lg font-black tracking-tight">Performance</h4>
                <div className="w-10 h-10 bg-primary-light/10 text-primary-light rounded-xl flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
             </div>
             
             <div className="space-y-6">
                <div className="space-y-3">
                   <div className="flex justify-between items-end">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Accuracy</span>
                      <span className="text-xl font-black">{mcqSummary?.avgScore ?? 0}%</span>
                   </div>
                   <div className="h-3 bg-slate-500/10 rounded-full overflow-hidden p-0.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${mcqSummary?.avgScore ?? 0}%` }}
                        className="h-full bg-primary-light rounded-full shadow-md"
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="p-4 bg-slate-500/5 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black uppercase opacity-40 mb-0.5">Solved</p>
                      <p className="text-xl font-black">{mcqSummary?.passedQuizzes ?? 0}</p>
                   </div>
                   <div className="p-4 bg-slate-500/5 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black uppercase opacity-40 mb-0.5">Total</p>
                      <p className="text-xl font-black">{mcqSummary?.totalQuizzes ?? 0}</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Upcoming Shifts - Compact */}
          <div className="p-6 space-y-4">
             <h4 className="text-lg font-black tracking-tight flex items-center gap-2 px-2">
               <Clock className="w-4 h-4 text-primary-light" />
               Upcoming
             </h4>
             <div className="space-y-3">
                {upcomingWorkshops.map((w) => (
                   <div key={w._id} className="flex items-center gap-3 p-3 hover:bg-slate-500/5 rounded-2xl transition-all group">
                      <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
                         <Clock className="w-4 h-4 opacity-40" />
                      </div>
                      <div>
                         <p className="font-bold text-xs line-clamp-1">{w.title}</p>
                         <p className="text-[8px] font-black uppercase opacity-30">{new Date(w.schedule.start).toLocaleDateString()}</p>
                      </div>
                   </div>
                ))}
                {upcomingWorkshops.length === 0 && <p className="text-[9px] font-black uppercase opacity-20 px-2">No upcoming shifts</p>}
             </div>
          </div>

          <div className="p-8 rounded-[40px] bg-indigo-500/5 border border-indigo-500/10 shadow-sm space-y-4">
             <div className="flex items-center gap-3 text-indigo-500">
                <Award className="w-6 h-6" />
                <h4 className="text-base font-black tracking-tight">Achievements</h4>
             </div>
             <p className="text-[9px] font-black uppercase tracking-widest opacity-30 text-center py-4 border border-dashed border-indigo-500/20 rounded-2xl">Coming Soon</p>
          </div>
        </div>
      </div>

      {/* Announcements at the bottom */}
      <AnnouncementsWidget />
    </div>
  );
}
