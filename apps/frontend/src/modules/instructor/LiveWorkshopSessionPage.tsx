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
  ShieldAlert,
  Trash2
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

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

export default function LiveWorkshopSessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState<any>(null);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [viewMode, setViewMode] = useState<'QR' | 'LIST' | 'REGISTRATION'>('QR');
  const [searchQuery, setSearchQuery] = useState("");
  const [markingId, setMarkingId] = useState<string | null>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchWorkshop();
  }, [id]);

  useEffect(() => {
    // Only poll for attendance updates if the user is looking at the Hall or Log
    if (viewMode === 'REGISTRATION' || viewMode === 'LIST') {
      const interval = setInterval(fetchAttendance, 5000);
      fetchAttendance(); // Immediate fetch on view change
      return () => clearInterval(interval);
    }
  }, [id, viewMode]);

  useEffect(() => {
    if (activeToken && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      generateToken();
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
    if (user.role === 'TEACHER') return;
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

  const handleMarkPresent = async (studentId: string) => {
    setMarkingId(studentId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/workshops/${id}/attendance`,
        { studentId, method: 'MANUAL' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAttendance();
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingId(null);
    }
  };

  const handleUnmarkPresent = async (studentId: string) => {
    setMarkingId(studentId);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/workshops/${id}/attendance/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAttendance();
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingId(null);
    }
  };

  const filteredRegistrations = (workshop?.registeredStudentIds || []).filter((s: any) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="min-h-screen bg-background-dark flex items-center justify-center"><RefreshCw className="animate-spin text-primary-light" /></div>;

  return (
    <div className="space-y-10 pb-20 font-outfit">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/workshops')} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all cursor-pointer group"><ArrowLeft className="group-hover:-translate-x-1 transition-transform" /></button>
          <div>
            <div className="flex items-center gap-3 mb-1"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500">Live Session Active</span></div>
            <h1 className="text-4xl font-black tracking-tighter">{workshop?.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 p-2 rounded-[24px] border border-white/5">
          <button onClick={() => setViewMode('QR')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'QR' ? 'bg-primary-light text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>Verification Hub</button>
          <button onClick={() => setViewMode('REGISTRATION')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'REGISTRATION' ? 'bg-primary-light text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>Registration Hall</button>
          <button onClick={() => setViewMode('LIST')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'LIST' ? 'bg-primary-light text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>Presence Log</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {viewMode === 'QR' ? (
              <motion.div key="qr" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[64px] p-12 flex flex-col items-center text-center shadow-2xl relative overflow-hidden h-full min-h-[600px] justify-center">
                <div className="absolute top-0 left-0 w-full h-2 bg-white/5"><motion.div className="h-full bg-primary-light" initial={{ width: '100%' }} animate={{ width: `${(timeLeft / 60) * 100}%` }} transition={{ duration: 1, ease: "linear" }} /></div>
                <div className="space-y-10">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-primary-light/20 blur-[80px] rounded-full group-hover:bg-primary-light/40 transition-all" />
                    <div className="relative bg-white p-8 rounded-[48px] shadow-2xl">
                      <QRCodeCanvas
                        value={`${window.location.origin}/check-in/${id}`}
                        size={256}
                        level="H"
                        includeMargin={true}
                        className="rounded-2xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl font-black tracking-tight">Institutional Scan Key</h3>
                    <p className="opacity-40 max-w-sm mx-auto font-medium">Students can scan this code to automatically verify their presence in the session.</p>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
                      <Clock className="w-4 h-4 text-primary-light" />
                      <span className="text-sm font-black">Live Session ID: {id?.substring(0, 8)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : viewMode === 'REGISTRATION' ? (
              <motion.div key="registration" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[64px] overflow-hidden shadow-2xl min-h-[600px] flex flex-col">
                <div className="p-10 border-b border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">Registration Hall</h3>
                      <p className="text-xs font-medium opacity-40 mt-1">Manage institutional pre-registrations and manual arrivals.</p>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-primary-light/10 border border-primary-light/20 text-[10px] font-black uppercase text-primary-light">{filteredRegistrations.length} Students On-List</div>
                  </div>
                  <div className="relative">
                    <MoreHorizontal className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                    <input
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold text-sm cursor-pointer"
                      placeholder="Search Guest List (Name or Email)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="relative flex-grow overflow-x-auto">
                  <table className="w-full text-left font-outfit">
                    <thead className="text-[10px] font-black uppercase tracking-widest opacity-30 border-b border-white/5">
                      <tr><th className="px-10 py-6">Student Information</th><th className="px-10 py-6">Verification</th><th className="px-10 py-6 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredRegistrations.map((student: any) => {
                        const isPresent = attendance.some(a => a.studentId?._id === student._id && a.status === 'PRESENT');
                        return (
                          <tr key={student._id} className="group hover:bg-white/5 transition-colors">
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-xs">{student.name?.[0]}</div>
                                <div>
                                  <p className="font-bold">{student.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-30">{student.email}</span>
                                    {student.phone && (
                                      <>
                                        <div className="w-1 h-1 rounded-full bg-white/10" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-primary-light">{student.phone}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-6">
                              {isPresent ? (
                                <span className="flex items-center gap-2 text-green-500 font-black text-[10px] uppercase tracking-widest bg-green-500/10 px-3 py-1 rounded-lg border border-green-500/20"><CheckCircle2 className="w-3 h-3" /> Presence Verified</span>
                              ) : (
                                <span className="flex items-center gap-2 opacity-20 font-black text-[10px] uppercase tracking-widest"><Clock className="w-3 h-3" /> Awaiting Arrival</span>
                              )}
                            </td>
                            <td className="px-10 py-6 text-right">
                              {isPresent ? (
                                <button
                                  disabled={markingId === student._id}
                                  onClick={() => handleUnmarkPresent(student._id)}
                                  className="px-6 py-3 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer border border-white/10 group-hover:border-red-500/20"
                                >
                                  {markingId === student._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Unmark"}
                                </button>
                              ) : (
                                <button
                                  disabled={markingId === student._id}
                                  onClick={() => handleMarkPresent(student._id)}
                                  className="px-6 py-3 bg-primary-light hover:bg-primary-dark text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-primary-light/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {markingId === student._id ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : "Mark Present"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[64px] overflow-hidden shadow-2xl min-h-[600px]">
                <div className="p-10 border-b border-white/5 flex items-center justify-between"><h3 className="text-2xl font-black tracking-tight">Presence Log</h3><div className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-[10px] font-black uppercase text-green-500">{attendance.filter(a => a.status === 'PRESENT').length} Present</div></div>
                <div className="relative overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-[10px] font-black uppercase tracking-widest opacity-30 border-b border-white/5"><tr><th className="px-10 py-6">Student Information</th><th className="px-10 py-6">Status</th><th className="px-10 py-6">Method</th><th className="px-10 py-6">Actions</th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {attendance.map((record) => (
                        <tr key={record._id} className="group hover:bg-white/5 transition-colors">
                          <td className="px-10 py-6"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-primary-light/10 flex items-center justify-center font-black text-primary-light">{record.studentId?.name?.[0]}</div><div><p className="font-bold">{record.studentId?.name}</p><p className="text-[10px] opacity-30">{record.studentId?.email}</p></div></div></td>
                          <td className="px-10 py-6"><span className={`px-3 py-1 rounded-lg text-[8px] font-black border uppercase tracking-widest ${record.status === 'PRESENT' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{record.status}</span></td>
                          <td className="px-10 py-6"><div className="flex items-center gap-2 opacity-40 text-[10px] font-bold">{record.verificationMethod === 'QR' ? <QrCode className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}{record.verificationMethod} Verified</div></td>
                          <td className="px-10 py-6">{(user.role === 'TEACHER' || user.role === 'COLLEGE_ADMIN' || user.role === 'INSTRUCTOR') && (<button onClick={() => handleOverride(record._id, record.status === 'PRESENT' ? 'ABSENT' : 'PRESENT')} className="p-2 hover:bg-primary-light/10 text-primary-light rounded-lg transition-all cursor-pointer" title="Override Status"><Activity className="w-4 h-4" /></button>)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="lg:col-span-4 space-y-10">
          <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[56px] p-10 shadow-2xl space-y-8">
            <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><Activity className="w-6 h-6" /></div><h3 className="text-xl font-black tracking-tight">Active Pulse</h3></div>
            <div className="space-y-6"><div><div className="flex justify-between items-end mb-2"><span className="text-[10px] font-black uppercase tracking-widest opacity-40">Participation Rate</span><span className="text-sm font-black text-primary-light">{workshop?.studentCount ? Math.round((attendance.length / 60) * 100) : 0}%</span></div><div className="h-2 bg-white/5 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${workshop?.studentCount ? (attendance.length / 60) * 100 : 0}%` }} className="h-full bg-primary-light" /></div></div></div>
          </div>
          <div className="p-10 rounded-[56px] border border-primary-light/20 bg-primary-light/5 relative overflow-hidden group hover:bg-primary-light/10 transition-all cursor-pointer"><div className="absolute top-0 right-0 p-8 text-primary-light opacity-20 group-hover:scale-125 transition-transform"><ShieldCheck className="w-12 h-12" /></div><h4 className="text-lg font-black tracking-tight mb-2">Dual-Authority Protection</h4><p className="text-xs font-medium opacity-50 leading-relaxed pr-8">All digital records subject to final faculty validation.</p></div>
        </div>
      </div>
    </div>
  );
}
