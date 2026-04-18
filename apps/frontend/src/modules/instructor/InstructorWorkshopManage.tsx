import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Users, 
  QrCode, 
  Copy, 
  LayoutDashboard,
  Calendar,
  Clock,
  Mail,
  Phone,
  CheckCircle2,
  ChevronRight,
  Activity,
  UserCheck
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import SessionContentGen from './SessionContentGen';
import AnnouncementsCenter from '../shared/announcements/AnnouncementsCenter';

export default function InstructorWorkshopManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'REGISTRY' | 'INVITE' | 'PATH' | 'ANNOUNCEMENTS'>('REGISTRY');
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchWorkshop();
  }, [id]);

  const fetchWorkshop = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/workshops/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkshop(response.data);
    } catch (err) {
      console.error(err);
      navigate('/instructor/portal');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = (workshop?.registeredStudentIds || []).filter((s: any) => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="min-h-screen bg-white dark:bg-background-dark flex items-center justify-center"><Activity className="animate-spin text-primary-light" /></div>;

  const joinLink = `${window.location.origin}/check-in/${id}`;

  return (
    <div className="space-y-10 pb-20 font-outfit">
      {/* Header Management */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/instructor/portal')} className="p-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl transition-all cursor-pointer group border border-slate-200 dark:border-white/5"><ArrowLeft className="text-slate-600 dark:text-white" /></button>
          <div>
            <div className="flex items-center gap-3 mb-1"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-light">Workshop Management Hub</span></div>
            <h1 className="text-4xl font-black tracking-tighter">{workshop?.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-[10px] font-black uppercase opacity-40">
              <Calendar className="w-3.5 h-3.5" /> {new Date(workshop?.schedule?.start).toLocaleDateString()}
              <span>|</span>
              <Clock className="w-3.5 h-3.5" /> Live ID: {id?.substring(0, 8)}
            </div>
          </div>
        </div>
        <button onClick={() => navigate(`/workshops/${id}/live`)} className="bg-green-500 hover:bg-green-600 text-white px-10 py-5 rounded-[32px] font-black text-sm uppercase tracking-widest shadow-2xl flex items-center gap-3 transition-all cursor-pointer"><UserCheck className="w-5 h-5" /> Start Live Hall</button>
      </div>

      {/* Tab Switcher - Premium */}
      <div className="flex flex-wrap gap-4 p-2 bg-slate-100 dark:bg-white/5 rounded-[32px] border border-slate-200 dark:border-white/5 max-w-2xl">
         <button onClick={() => setViewMode('REGISTRY')} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'REGISTRY' ? 'bg-primary-light text-white shadow-xl' : 'opacity-60 dark:opacity-40 hover:opacity-100 text-slate-500 dark:text-white'}`}>Detailed Registry</button>
         <button onClick={() => setViewMode('INVITE')} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'INVITE' ? 'bg-primary-light text-white shadow-xl' : 'opacity-60 dark:opacity-40 hover:opacity-100 text-slate-500 dark:text-white'}`}>Invitation Center</button>
         <button onClick={() => setViewMode('PATH')} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'PATH' ? 'bg-primary-light text-white shadow-xl' : 'opacity-60 dark:opacity-40 hover:opacity-100 text-slate-500 dark:text-white'}`}>Learning Path</button>
         <button onClick={() => setViewMode('ANNOUNCEMENTS')} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'ANNOUNCEMENTS' ? 'bg-primary-light text-white shadow-xl' : 'opacity-60 dark:opacity-40 hover:opacity-100 text-slate-500 dark:text-white'}`}>Announcements</button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'REGISTRY' ? (
          <motion.div key="registry" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
             <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[48px] overflow-hidden shadow-2xl">
                <div className="p-10 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50 dark:bg-white/[0.01]">
                   <div>
                      <h3 className="text-2xl font-black tracking-tight">Student Registry</h3>
                      <p className="text-xs font-medium opacity-40 mt-1">Full registration details of onboarded students.</p>
                   </div>
                   <div className="relative max-w-sm w-full">
                      <Users className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                      <input className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold cursor-pointer" placeholder="Search registry..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                   </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead className="text-[10px] font-black uppercase tracking-widest opacity-30 border-b border-white/5">
                        <tr>
                           <th className="px-10 py-6">Student</th>
                           <th className="px-10 py-6">Contact Details</th>
                           <th className="px-10 py-6">Registered On</th>
                           <th className="px-10 py-6 text-right">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {filteredStudents.map((student: any) => (
                           <tr key={student._id} className="hover:bg-white/5 transition-colors group">
                              <td className="px-10 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary-light text-white rounded-2xl flex items-center justify-center font-black">{student.name?.[0] || 'S'}</div>
                                    <span className="font-bold text-lg">{student.name}</span>
                                 </div>
                              </td>
                              <td className="px-10 py-6">
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-medium opacity-60"><Mail className="w-3.5 h-3.5" /> {student.email}</div>
                                    {student.phone && <div className="flex items-center gap-2 text-[10px] font-black opacity-30 tracking-widest uppercase"><Phone className="w-3.5 h-3.5" /> {student.phone}</div>}
                                 </div>
                              </td>
                              <td className="px-10 py-6">
                                 <div className="text-sm font-medium opacity-60">{new Date(student.createdAt).toLocaleDateString()}</div>
                                 <div className="text-[10px] opacity-20 font-black">{new Date(student.createdAt).toLocaleTimeString()}</div>
                              </td>
                              <td className="px-10 py-6 text-right">
                                 <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[8px] font-black uppercase tracking-widest">Signed Up</span>
                              </td>
                           </tr>
                        ))}
                        {filteredStudents.length === 0 && (
                          <tr><td colSpan={4} className="p-20 text-center opacity-20 font-black uppercase tracking-widest">Registry is currently empty</td></tr>
                        )}
                     </tbody>
                  </table>
                </div>
             </div>
          </motion.div>
        ) : viewMode === 'INVITE' ? (
          <motion.div key="invite" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-12 rounded-[56px] space-y-10 shadow-2xl">
                 <div className="space-y-4 text-center">
                    <div className="w-20 h-20 bg-primary-light/10 text-primary-light rounded-[32px] flex items-center justify-center mx-auto"><QrCode className="w-10 h-10" /></div>
                    <h3 className="text-3xl font-black tracking-tight">Onboarding Gateway</h3>
                    <p className="opacity-40 text-sm font-medium">Students can scan this QR code or use the link to register for your event instantly.</p>
                 </div>
                 
                 <div className="bg-white p-10 rounded-[48px] shadow-2xl w-fit mx-auto">
                    <QRCodeCanvas value={joinLink} size={300} level="H" includeMargin={true} />
                 </div>
              </div>

              <div className="flex flex-col gap-8">
                 <div className="bg-primary-light text-white p-12 rounded-[56px] space-y-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><Copy className="w-32 h-32" /></div>
                    <h4 className="text-3xl font-black tracking-tight">Invitation Link</h4>
                    <p className="opacity-80 text-sm leading-relaxed">Broadcast this link to your students to start the registration lifecycle.</p>
                    
                    <div className="bg-white/10 p-6 rounded-3xl border border-white/10 font-bold break-all text-sm mb-4">{joinLink}</div>
                    
                    <button onClick={() => { navigator.clipboard.writeText(joinLink); alert("Join Path Copied!"); }} className="w-full py-6 bg-white text-primary-light rounded-3xl font-black uppercase tracking-widest shadow-xl transition-all cursor-pointer hover:bg-slate-100 flex items-center justify-center gap-3">Copy Invite Link <Copy className="w-4 h-4" /></button>
                 </div>

                 <div className="bg-card-dark border border-white/5 p-10 rounded-[56px] space-y-4">
                    <div className="w-12 h-12 bg-primary-light/10 text-primary-light rounded-2xl flex items-center justify-center"><CheckCircle2 /></div>
                    <h4 className="text-xl font-black tracking-tight">Ready to start?</h4>
                    <p className="opacity-40 text-sm font-medium leading-relaxed">Once registrations start coming in, you can activate the Live Session Hall to track attendance in real-time.</p>
                 </div>
              </div>
          </motion.div>
        ) : viewMode === 'PATH' ? (
          <motion.div key="path" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <SessionContentGen workshopId={id!} />
          </motion.div>
        ) : (
          <motion.div key="announcements" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <AnnouncementsCenter workshopId={id!} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
