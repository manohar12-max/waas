import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  UserCheck,
  Check,
  X,
  Clock as ClockIcon
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import SessionContentGen from './SessionContentGen';

export default function InstructorWorkshopManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') === 'PENDING' ? 'PENDING' : 'APPROVED';

  const [workshop, setWorkshop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'REGISTRY' | 'INVITE' | 'PATH'>('REGISTRY');
  const [registryTab, setRegistryTab] = useState<'APPROVED' | 'PENDING'>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchWorkshop();
    setSelectedIds([]); // Clear selection on tab change or ID change
  }, [id, registryTab]);

  const fetchWorkshop = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/workshops/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkshop(response.data);
      if ((response.data.registeredStudentIds?.length || 0) === 0 && (response.data.pendingStudentIds?.length || 0) > 0) {
        setRegistryTab('PENDING');
      }
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

  const pendingStudents = (workshop?.pendingStudentIds || []).filter((s: any) => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApprove = async (studentId: string) => {
    try {
      setProcessing(studentId);
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/workshops/${id}/approve-student/${studentId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchWorkshop();
    } catch (err) {
      console.error(err);
      alert("Failed to approve student.");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (studentId: string) => {
    if (!confirm("Are you sure you want to reject this registration?")) return;
    try {
      setProcessing(studentId);
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/workshops/${id}/reject-student/${studentId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchWorkshop();
    } catch (err) {
      console.error(err);
      alert("Failed to reject student.");
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      setProcessing('bulk');
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/workshops/${id}/bulk-approve`, { studentIds: selectedIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedIds([]);
      fetchWorkshop();
    } catch (err) {
      console.error(err);
      alert("Failed to bulk approve students.");
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to reject ${selectedIds.length} registrations?`)) return;
    try {
      setProcessing('bulk');
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/workshops/${id}/bulk-reject`, { studentIds: selectedIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedIds([]);
      fetchWorkshop();
    } catch (err) {
      console.error(err);
      alert("Failed to bulk reject students.");
    } finally {
      setProcessing(null);
    }
  };

  const toggleSelectAll = () => {
    const currentStudents = registryTab === 'APPROVED' ? filteredStudents : pendingStudents;
    if (selectedIds.length === currentStudents.length && currentStudents.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentStudents.map((s: any) => s._id));
    }
  };

  const toggleSelect = (studentId: string) => {
    setSelectedIds(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  if (loading) return <div className="min-h-screen bg-white dark:bg-background-dark flex items-center justify-center"><Activity className="animate-spin text-primary-light" /></div>;

  const checkinLink = `${window.location.origin}/check-in/${id}`;
  const regLink = `${window.location.origin}/register?invite=${workshop?.inviteToken}`;

  return (
    <div className="space-y-10 pb-20 font-outfit">
      {/* Header Management */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/dashboard')} className="p-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl transition-all cursor-pointer group border border-slate-200 dark:border-white/5"><ArrowLeft className="text-slate-600 dark:text-white" /></button>
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
      <div className="flex gap-4 p-2 bg-slate-100 dark:bg-white/5 rounded-[32px] border border-slate-200 dark:border-white/5 max-w-md">
         <button onClick={() => setViewMode('REGISTRY')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'REGISTRY' ? 'bg-primary-light text-white shadow-xl' : 'opacity-60 dark:opacity-40 hover:opacity-100 text-slate-500 dark:text-white'}`}>Detailed Registry</button>
         <button onClick={() => setViewMode('INVITE')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'INVITE' ? 'bg-primary-light text-white shadow-xl' : 'opacity-60 dark:opacity-40 hover:opacity-100 text-slate-500 dark:text-white'}`}>Invitation Center</button>
         <button onClick={() => setViewMode('PATH')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'PATH' ? 'bg-primary-light text-white shadow-xl' : 'opacity-60 dark:opacity-40 hover:opacity-100 text-slate-500 dark:text-white'}`}>Learning Path</button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'REGISTRY' ? (
          <motion.div key="registry" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
             <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[48px] overflow-hidden shadow-2xl">
                 <div className="p-10 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50 dark:bg-white/[0.01]">
                    <div className="flex items-center gap-8">
                       <div>
                          <h3 className="text-2xl font-black tracking-tight">Student Registry</h3>
                          <p className="text-xs font-medium opacity-40 mt-1">Full registration details of onboarded students.</p>
                       </div>
                       <div className="flex gap-2 p-1 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                          <button 
                            onClick={() => setRegistryTab('APPROVED')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${registryTab === 'APPROVED' ? 'bg-primary-light text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                          >
                            Approved ({workshop?.registeredStudentIds?.length || 0})
                          </button>
                          <button 
                            onClick={() => setRegistryTab('PENDING')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer relative ${registryTab === 'PENDING' ? 'bg-orange-500 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                          >
                            Pending ({workshop?.pendingStudentIds?.length || 0})
                            {workshop?.pendingStudentIds?.length > 0 && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-card-dark" />
                            )}
                          </button>
                       </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                       <div className="relative max-w-sm w-full">
                          <Users className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                          <input className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold cursor-pointer" placeholder="Search registry..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                       </div>

                       {selectedIds.length > 0 && (
                         <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 px-4 border-r border-white/10">{selectedIds.length} Selected</span>
                            {registryTab === 'PENDING' && (
                              <>
                                <button 
                                  onClick={handleBulkReject}
                                  disabled={processing !== null}
                                  className="px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border border-red-500/10 disabled:opacity-50"
                                >
                                  Reject All
                                </button>
                                <button 
                                  onClick={handleBulkApprove}
                                  disabled={processing !== null}
                                  className="px-6 py-3 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border border-green-500/10 disabled:opacity-50"
                                >
                                  Approve All
                                </button>
                              </>
                            )}
                         </div>
                       )}
                    </div>
                 </div>
                 
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead className="text-[10px] font-black uppercase tracking-widest opacity-30 border-b border-white/5">
                         <tr>
                            <th className="px-10 py-6 w-10">
                               <input 
                                 type="checkbox" 
                                 className="w-5 h-5 rounded-lg border-2 border-white/10 bg-white/5 checked:bg-primary-light transition-all cursor-pointer accent-primary-light"
                                 checked={selectedIds.length > 0 && selectedIds.length === (registryTab === 'APPROVED' ? filteredStudents.length : pendingStudents.length)}
                                 onChange={toggleSelectAll}
                               />
                            </th>
                            <th className="px-10 py-6">Student</th>
                            <th className="px-10 py-6">Contact Details</th>
                            <th className="px-10 py-6">Date</th>
                            <th className="px-10 py-6 text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         {registryTab === 'APPROVED' ? (
                           filteredStudents.map((student: any) => (
                              <tr key={student._id} className="hover:bg-white/5 transition-colors group">
                                 <td className="px-10 py-6">
                                    <input 
                                      type="checkbox" 
                                      className="w-5 h-5 rounded-lg border-2 border-white/10 bg-white/5 checked:bg-primary-light transition-all cursor-pointer accent-primary-light"
                                      checked={selectedIds.includes(student._id)}
                                      onChange={() => toggleSelect(student._id)}
                                    />
                                 </td>
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
                                    <div className="text-[10px] opacity-20 font-black uppercase tracking-widest">{new Date(student.createdAt).toLocaleTimeString()}</div>
                                 </td>
                                 <td className="px-10 py-6 text-right">
                                    <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[8px] font-black uppercase tracking-widest">Enrolled</span>
                                 </td>
                              </tr>
                           ))
                         ) : (
                           pendingStudents.map((student: any) => (
                              <tr key={student._id} className="hover:bg-white/5 transition-colors group">
                                 <td className="px-10 py-6">
                                    <input 
                                      type="checkbox" 
                                      className="w-5 h-5 rounded-lg border-2 border-white/10 bg-white/5 checked:bg-primary-light transition-all cursor-pointer accent-primary-light"
                                      checked={selectedIds.includes(student._id)}
                                      onChange={() => toggleSelect(student._id)}
                                    />
                                 </td>
                                 <td className="px-10 py-6">
                                    <div className="flex items-center gap-4">
                                       <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center font-black">{student.name?.[0] || 'S'}</div>
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
                                    <div className="text-[10px] opacity-20 font-black uppercase tracking-widest">{new Date(student.createdAt).toLocaleTimeString()}</div>
                                 </td>
                                 <td className="px-10 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                       <button 
                                          onClick={() => handleReject(student._id)}
                                          disabled={processing === student._id}
                                          className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all cursor-pointer border border-red-500/10 disabled:opacity-50"
                                       >
                                          <X className="w-4 h-4" />
                                       </button>
                                       <button 
                                          onClick={() => handleApprove(student._id)}
                                          disabled={processing === student._id}
                                          className="p-3 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all cursor-pointer border border-green-500/10 disabled:opacity-50"
                                       >
                                          <Check className="w-4 h-4" />
                                       </button>
                                    </div>
                                 </td>
                              </tr>
                           ))
                         )}
                         {((registryTab === 'APPROVED' && filteredStudents.length === 0) || (registryTab === 'PENDING' && pendingStudents.length === 0)) && (
                           <tr><td colSpan={4} className="p-20 text-center opacity-20 font-black uppercase tracking-widest">No records found</td></tr>
                         )}
                      </tbody>
                   </table>
                 </div>
             </div>
          </motion.div>
        ) : viewMode === 'INVITE' ? (
           <motion.div key="invite" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* ... invitation content ... */}
              <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-12 rounded-[56px] space-y-10 shadow-2xl">
                 <div className="space-y-4 text-center">
                    <div className="w-20 h-20 bg-primary-light/10 text-primary-light rounded-[32px] flex items-center justify-center mx-auto"><QrCode className="w-10 h-10" /></div>
                    <h3 className="text-3xl font-black tracking-tight">Onboarding Gateway</h3>
                    <p className="opacity-40 text-sm font-medium">Students can scan this QR code or use the link to register for your event instantly.</p>
                 </div>
                 
                 <div className="bg-white p-10 rounded-[48px] shadow-2xl w-fit mx-auto">
                    <QRCodeCanvas value={regLink} size={300} level="H" includeMargin={true} />
                 </div>
              </div>

              <div className="flex flex-col gap-8">
                 <div className="bg-primary-light text-white p-12 rounded-[56px] space-y-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><Copy className="w-32 h-32" /></div>
                    <h4 className="text-3xl font-black tracking-tight">Invitation Link</h4>
                    <p className="opacity-80 text-sm leading-relaxed">Broadcast this link to your students to start the registration lifecycle.</p>
                    
                    <div className="bg-white/10 p-6 rounded-3xl border border-white/10 font-bold break-all text-sm mb-4">{regLink}</div>
                    
                    <button onClick={() => { navigator.clipboard.writeText(regLink); alert("Invite Link Copied!"); }} className="w-full py-6 bg-white text-primary-light rounded-3xl font-black uppercase tracking-widest shadow-xl transition-all cursor-pointer hover:bg-slate-100 flex items-center justify-center gap-3">Copy Invite Link <Copy className="w-4 h-4" /></button>
                 </div>

                 <div className="bg-card-dark border border-white/5 p-10 rounded-[56px] space-y-4">
                    <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center"><QrCode className="w-6 h-6" /></div>
                    <h4 className="text-xl font-black tracking-tight text-white">Direct Check-in URL</h4>
                    <p className="opacity-40 text-sm font-medium leading-relaxed">For students already registered, use this direct link for attendance:</p>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 font-mono text-[10px] break-all mb-2 text-white/60">{checkinLink}</div>
                    <button onClick={() => { navigator.clipboard.writeText(checkinLink); alert("Check-in Link Copied!"); }} className="text-[10px] font-black uppercase tracking-widest text-primary-light hover:text-white transition-colors cursor-pointer flex items-center gap-2">Copy Check-in Link <Copy className="w-3 h-3" /></button>
                 </div>
              </div>
           </motion.div>
        ) : (
          <motion.div key="path" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <SessionContentGen workshopId={id!} onUpdate={fetchWorkshop} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
