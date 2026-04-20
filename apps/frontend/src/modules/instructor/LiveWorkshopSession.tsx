import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, 
  ShieldCheck, 
  Users, 
  Clock, 
  ArrowLeft, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  MoreHorizontal,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import DashboardLayout from '../../components/layouts/DashboardLayout';

interface StudentAttendance {
  _id: string;
  studentId: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  verificationMethod: 'QR' | 'OTP' | 'MANUAL';
  timestamp: string;
}

export default function LiveWorkshopSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState<any>(null);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [viewMode, setViewMode] = useState<'QR' | 'LIST'>('QR');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchWorkshop();
    // Simulate real-time attendance polling
    const interval = setInterval(fetchAttendance, 3000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (activeToken && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      generateToken(); // Auto-refresh token
    }
  }, [timeLeft, activeToken]);

  const fetchWorkshop = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/workshops/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkshop(response.data);
    } catch (err) {
      console.error(err);
      navigate('/workshops');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/workshops/${id}/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendance(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const generateToken = () => {
    if (user.role === 'TEACHER') return; // Teachers can't generate tokens, only instructors
    const newToken = Math.random().toString(36).substring(2, 10).toUpperCase();
    setActiveToken(newToken);
    setTimeLeft(60);
  };

  const handleOverride = async (attendanceId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/workshops/${id}/attendance/${attendanceId}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAttendance();
    } catch (err) {
      alert("Unauthorized override attempt.");
    }
  };

  if (loading) return <div className="min-h-screen bg-background-dark flex items-center justify-center cursor-pointer"><RefreshCw className="animate-spin text-primary-light cursor-pointer" /></div>;

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-20 font-outfit cursor-pointer">
        {/* Header Control */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer">
          <div className="flex items-center gap-6 cursor-pointer">
            <button 
              onClick={() => navigate('/workshops')}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all cursor-pointer group cursor-pointer"
            >
              <ArrowLeft className="group-hover:-translate-x-1 transition-transform cursor-pointer" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1 cursor-pointer">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse cursor-pointer" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500 cursor-pointer">Live Session Active</span>
              </div>
              <h1 className="text-4xl font-black tracking-tighter cursor-pointer">{workshop?.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 p-2 rounded-[24px] border border-white/5 cursor-pointer">
            <button 
              onClick={() => setViewMode('QR')}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'QR' ? 'bg-primary-light text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
            >
              Verification Hub
            </button>
            <button 
              onClick={() => setViewMode('LIST')}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'LIST' ? 'bg-primary-light text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
            >
              Presence Log
            </button>
          </div>
        </div>

        {/* Workspace Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 cursor-pointer">
          
          {/* Main Verification View */}
          <div className="lg:col-span-8 cursor-pointer">
            <AnimatePresence mode="wait">
              {viewMode === 'QR' ? (
                <motion.div 
                  key="qr"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[64px] p-12 flex flex-col items-center text-center shadow-2xl relative overflow-hidden h-full min-h-[600px] justify-center cursor-pointer"
                >
                  <div className="absolute top-0 left-0 w-full h-2 bg-white/5 cursor-pointer">
                    <motion.div 
                      className="h-full bg-primary-light cursor-pointer"
                      initial={{ width: '100%' }}
                      animate={{ width: `${(timeLeft / 60) * 100}%` }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                  </div>

                  {activeToken ? (
                    <div className="space-y-10 cursor-pointer">
                      <div className="relative group cursor-pointer">
                        <div className="absolute inset-0 bg-primary-light/20 blur-[80px] rounded-full group-hover:bg-primary-light/40 transition-all cursor-pointer" />
                        <div className="relative bg-white p-8 rounded-[48px] shadow-2xl cursor-pointer">
                          <QrCode className="w-64 h-64 text-slate-900 cursor-pointer" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-[48px] cursor-pointer">
                            <span className="text-4xl font-black text-primary-light tracking-widest cursor-pointer">{activeToken}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4 cursor-pointer">
                        <h3 className="text-3xl font-black tracking-tight cursor-pointer">Dynamic Verification Token</h3>
                        <p className="opacity-40 max-w-sm mx-auto font-medium cursor-pointer">Students must scan this code or enter the OTP: <span className="text-primary-light font-bold cursor-pointer">{activeToken}</span></p>
                      </div>

                      <div className="flex items-center justify-center gap-4 cursor-pointer">
                         <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer">
                           <Clock className="w-4 h-4 text-primary-light cursor-pointer" />
                           <span className="text-sm font-black cursor-pointer">{timeLeft}s Until Refresh</span>
                         </div>
                         {(user.role === 'INSTRUCTOR' || user.role === 'COLLEGE_ADMIN') && (
                           <button 
                             onClick={generateToken}
                             className="p-4 bg-primary-light hover:bg-primary-dark text-white rounded-2xl transition-all cursor-pointer shadow-lg shadow-primary-light/20 cursor-pointer"
                           >
                            <RefreshCw className="w-5 h-5 cursor-pointer" />
                           </button>
                         )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-10 cursor-pointer">
                      <div className="w-32 h-32 bg-primary-light/10 rounded-[40px] flex items-center justify-center mx-auto cursor-pointer">
                        <ShieldCheck className="w-16 h-16 text-primary-light cursor-pointer" />
                      </div>
                      <div className="space-y-4 cursor-pointer">
                        <h2 className="text-4xl font-black tracking-tight cursor-pointer">Initialize Attendance</h2>
                        <p className="opacity-40 max-w-sm mx-auto font-medium leading-relaxed cursor-pointer">
                          Generation of terminal verification tokens requires operational authority. 
                        </p>
                      </div>
                      {(user.role === 'INSTRUCTOR' || user.role === 'COLLEGE_ADMIN') ? (
                        <button 
                          onClick={generateToken}
                          className="bg-primary-light hover:bg-primary-dark text-white px-12 py-5 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary-light/40 transition-all cursor-pointer cursor-pointer"
                        >
                          Unlock Digital Session
                        </button>
                      ) : (
                        <div className="p-6 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-3xl flex items-center gap-4 text-sm font-bold cursor-pointer">
                          <ShieldAlert className="w-6 h-6 cursor-pointer" />
                          Faculty Override Authority Only
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                   key="list"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -20 }}
                   className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[64px] overflow-hidden shadow-2xl min-h-[600px] cursor-pointer"
                >
                  <div className="p-10 border-b border-white/5 flex items-center justify-between cursor-pointer">
                    <h3 className="text-2xl font-black tracking-tight cursor-pointer">Presence Log</h3>
                    <div className="flex items-center gap-3 cursor-pointer">
                      <div className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-[10px] font-black uppercase text-green-500 cursor-pointer">
                        {attendance.filter(a => a.status === 'PRESENT').length} Present
                      </div>
                    </div>
                  </div>
                  <div className="relative overflow-x-auto cursor-pointer">
                     <table className="w-full text-left cursor-pointer">
                        <thead className="text-[10px] font-black uppercase tracking-widest opacity-30 border-b border-white/5 cursor-pointer">
                           <tr>
                              <th className="px-10 py-6 cursor-pointer">Student Information</th>
                              <th className="px-10 py-6 cursor-pointer">Status</th>
                              <th className="px-10 py-6 cursor-pointer">Method</th>
                              <th className="px-10 py-6 cursor-pointer">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 cursor-pointer">
                           {attendance.map((record) => (
                             <tr key={record._id} className="group hover:bg-white/5 transition-colors cursor-pointer">
                               <td className="px-10 py-6 cursor-pointer">
                                  <div className="flex items-center gap-4 cursor-pointer">
                                     <div className="w-10 h-10 rounded-xl bg-primary-light/10 flex items-center justify-center font-black text-primary-light cursor-pointer">
                                       {record.studentId?.name?.[0]}
                                     </div>
                                     <div>
                                        <p className="font-bold cursor-pointer">{record.studentId?.name}</p>
                                        <p className="text-[10px] opacity-30 cursor-pointer">{record.studentId?.email}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-10 py-6 cursor-pointer">
                                  <span className={`px-3 py-1 rounded-lg text-[8px] font-black border uppercase tracking-widest ${
                                    record.status === 'PRESENT' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                  }`}>
                                    {record.status}
                                  </span>
                               </td>
                               <td className="px-10 py-6 cursor-pointer">
                                  <div className="flex items-center gap-2 opacity-40 text-[10px] font-bold cursor-pointer">
                                     {record.verificationMethod === 'QR' ? <QrCode className="w-3 h-3 cursor-pointer" /> : <ShieldCheck className="w-3 h-3 cursor-pointer" />}
                                     {record.verificationMethod} Verified
                                  </div>
                               </td>
                               <td className="px-10 py-6 cursor-pointer">
                                  {(user.role === 'TEACHER' || user.role === 'COLLEGE_ADMIN' || user.role === 'INSTRUCTOR') && (
                                    <div className="flex items-center gap-2 cursor-pointer">
                                       <button 
                                         onClick={() => handleOverride(record._id, record.status === 'PRESENT' ? 'ABSENT' : 'PRESENT')}
                                         className="p-2 hover:bg-primary-light/10 text-primary-light rounded-lg transition-all cursor-pointer cursor-pointer"
                                         title="Override Status"
                                       >
                                         <Activity className="w-4 h-4 cursor-pointer" />
                                       </button>
                                    </div>
                                  )}
                               </td>
                             </tr>
                           ))}
                           {attendance.length === 0 && (
                             <tr>
                                <td colSpan={4} className="px-10 py-32 text-center opacity-20 font-black uppercase tracking-widest cursor-pointer">
                                   No Check-ins Detected
                                </td>
                             </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Statistics / Engagement View */}
          <div className="lg:col-span-4 space-y-10 cursor-pointer">
            <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[56px] p-10 shadow-2xl space-y-8 cursor-pointer">
              <div className="flex items-center gap-4 cursor-pointer">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 cursor-pointer">
                  <Activity className="w-6 h-6 cursor-pointer" />
                </div>
                <h3 className="text-xl font-black tracking-tight cursor-pointer">Active Pulse</h3>
              </div>
              
              <div className="space-y-6 cursor-pointer">
                 <div>
                    <div className="flex justify-between items-end mb-2 cursor-pointer">
                       <span className="text-[10px] font-black uppercase tracking-widest opacity-40 cursor-pointer">Participation Rate</span>
                       <span className="text-sm font-black text-primary-light cursor-pointer">
                         {workshop?.studentCount ? Math.round((attendance.length / 60) * 100) : 0}%
                       </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden cursor-pointer">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${workshop?.studentCount ? (attendance.length / 60) * 100 : 0}%` }}
                         className="h-full bg-primary-light cursor-pointer"
                       />
                    </div>
                 </div>

                 <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-6 cursor-pointer">
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1 cursor-pointer">Documents Opened</p>
                       <p className="text-2xl font-black cursor-pointer">24</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1 cursor-pointer">Video Engagement</p>
                       <p className="text-2xl font-black text-indigo-500 cursor-pointer">82%</p>
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-10 rounded-[56px] border border-primary-light/20 bg-primary-light/5 relative overflow-hidden group hover:bg-primary-light/10 transition-all cursor-pointer cursor-pointer">
               <div className="absolute top-0 right-0 p-8 text-primary-light opacity-20 group-hover:scale-125 transition-transform cursor-pointer">
                 <ShieldCheck className="w-12 h-12 cursor-pointer" />
               </div>
               <h4 className="text-lg font-black tracking-tight mb-2 cursor-pointer">Dual-Authority Protection</h4>
               <p className="text-xs font-medium opacity-50 leading-relaxed pr-8 cursor-pointer">
                 All digital records are subject to final validation by institutional faculty (Teachers). Your role grants you <span className="text-primary-light font-bold cursor-pointer">Verification Authority</span>.
               </p>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
