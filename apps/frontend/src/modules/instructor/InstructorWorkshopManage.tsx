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
  Upload,
  Edit,
  Trash2,
  Save,
  CheckSquare,
  Clock as ClockIcon,
  FileCheck,
  Award,
  ArrowRight,
  Zap
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { useRef } from 'react';
import SessionContentGen from './SessionContentGen';
import UniversalModal from '../../components/UniversalModal';

export default function InstructorWorkshopManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') === 'PENDING' ? 'PENDING' : 'APPROVED';

  const [workshop, setWorkshop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'REGISTRY' | 'INVITE' | 'PATH' | 'ANALYTICS'>('REGISTRY');
  const [registryTab, setRegistryTab] = useState<'APPROVED' | 'PENDING'>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importData, setImportData] = useState<any[]>([]);
  const [mcqAnalytics, setMcqAnalytics] = useState<any[]>([]);
  const [selectedStudentForAnalytics, setSelectedStudentForAnalytics] = useState<any | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchWorkshop();
    fetchMcqAnalytics();
    setSelectedIds([]); // Clear selection on tab change or ID change
  }, [id, registryTab]);

  const fetchMcqAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/workshop/${id}/mcq-analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMcqAnalytics(response.data);
    } catch (err) {
      console.error('Failed to fetch MCQ analytics:', err);
    }
  };

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

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("CAUTION: This will entirely delete the student's account and all their data (attendance, etc.). This action is irreversible. Proceed?")) return;
    try {
      setProcessing(studentId);
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/workshops/${id}/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Student deleted successfully.");
      fetchWorkshop();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete student.");
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setProcessing('parsing');
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error("The sheet is empty.");
          return;
        }

        // Normalize data
        const normalized = data.map(item => {
          const newItem: any = {};
          Object.keys(item).forEach(key => {
            newItem[key.toLowerCase().trim()] = item[key];
          });
          return {
            name: newItem.name || newItem.studentname || "",
            email: newItem.email || "",
            phone: newItem.phone || newItem.contact || ""
          };
        });

        setImportData(normalized);
        setShowPreviewModal(true);
      } catch (err) {
        console.error(err);
        toast.error("Failed to process Excel file.");
      } finally {
        setProcessing(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFinalImport = async () => {
    if (importData.length === 0) return;
    
    try {
      setProcessing('importing');
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/workshops/${id}/bulk-students`,
        { students: importData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const successes = response.data.filter((r: any) => r.success).length;
      const failures = response.data.filter((r: any) => !r.success).length;

      if (failures > 0) {
        toast.success(`Import complete: ${successes} success, ${failures} failed.`);
      } else {
        toast.success(`Successfully imported ${successes} students.`);
      }
      
      setShowPreviewModal(false);
      setImportData([]);
      fetchWorkshop();
    } catch (err) {
      console.error(err);
      toast.error("Failed to register students.");
    } finally {
      setProcessing(null);
    }
  };

  const updateImportItem = (index: number, field: string, value: string) => {
    const updated = [...importData];
    updated[index] = { ...updated[index], [field]: value };
    setImportData(updated);
  };

  const removeImportItem = (index: number) => {
    setImportData(importData.filter((_, i) => i !== index));
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
    <div className="space-y-6 pb-20 font-outfit">
      {/* Header Management */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all cursor-pointer group border border-slate-200 dark:border-white/5"><ArrowLeft className="text-slate-600 dark:text-white w-5 h-5" /></button>
          <div>
            <div className="flex items-center gap-2 mb-0.5"><span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary-light">Workshop Hub</span></div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter">{workshop?.title}</h1>
            <div className="flex items-center gap-3 mt-1 text-[8px] font-black uppercase opacity-40">
              <Calendar className="w-3 h-3" /> {new Date(workshop?.schedule?.start).toLocaleDateString()}
              <span>|</span>
              <Clock className="w-3 h-3" /> ID: {id?.substring(0, 8)}
            </div>
          </div>
        </div>
        <button onClick={() => navigate(`/workshops/${id}/live`)} className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all cursor-pointer"><UserCheck className="w-4 h-4" /> Start Hall</button>
      </div>

      {/* Tab Switcher - Premium */}
      <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 max-w-md">
         <button onClick={() => setViewMode('REGISTRY')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'REGISTRY' ? 'bg-primary-light text-white shadow-lg' : 'opacity-60 dark:opacity-40 hover:opacity-100 text-slate-500 dark:text-white'}`}>Registry</button>
         <button onClick={() => setViewMode('ANALYTICS')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'ANALYTICS' ? 'bg-primary-light text-white shadow-lg' : 'opacity-60 dark:opacity-40 hover:opacity-100 text-slate-500 dark:text-white'}`}>Analytics</button>
         <button onClick={() => setViewMode('INVITE')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'INVITE' ? 'bg-primary-light text-white shadow-lg' : 'opacity-60 dark:opacity-40 hover:opacity-100 text-slate-500 dark:text-white'}`}>Invite</button>
         <button onClick={() => setViewMode('PATH')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${viewMode === 'PATH' ? 'bg-primary-light text-white shadow-lg' : 'opacity-60 dark:opacity-40 hover:opacity-100 text-slate-500 dark:text-white'}`}>Path</button>
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
                       <input 
                         type="file" 
                         ref={fileInputRef} 
                         className="hidden" 
                         accept=".xlsx, .xls, .csv" 
                         onChange={handleFileUpload} 
                       />
                       <button 
                         onClick={() => fileInputRef.current?.click()}
                         disabled={processing !== null}
                         className="flex items-center gap-3 px-8 py-4 bg-primary-light/10 text-primary-light hover:bg-primary-light hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer border border-primary-light/10 disabled:opacity-50"
                       >
                         {processing === 'import' ? <Activity className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                         Import Students (Excel)
                       </button>

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
                                     <div className="flex items-center justify-end gap-3">
                                        <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[8px] font-black uppercase tracking-widest">Enrolled</span>
                                        <button 
                                           onClick={() => handleDeleteStudent(student._id)}
                                           disabled={processing === student._id}
                                           className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all cursor-pointer border border-red-500/10 disabled:opacity-50"
                                           title="Delete student entirely"
                                        >
                                           <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                     </div>
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
                                       <button 
                                          onClick={() => handleDeleteStudent(student._id)}
                                          disabled={processing === student._id}
                                          className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all cursor-pointer border border-red-500/10 disabled:opacity-50"
                                          title="Delete student entirely"
                                       >
                                          <Trash2 className="w-4 h-4" />
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
        ) : viewMode === 'ANALYTICS' ? (
           <motion.div key="analytics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              {/* High Level Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 {[
                    { label: "Class Average", value: `${Math.round(mcqAnalytics.reduce((acc, a) => acc + (a.score/a.totalQuestions)*100, 0) / Math.max(1, mcqAnalytics.length))}%`, icon: <Activity className="w-5 h-5" />, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                    { label: "Quizzes Taken", value: mcqAnalytics.length, icon: <FileCheck className="w-5 h-5" />, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "Active Students", value: new Set(mcqAnalytics.map(a => a.userId?._id)).size, icon: <Users className="w-5 h-5" />, color: "text-amber-500", bg: "bg-amber-500/10" },
                    { label: "Completion rate", value: `${Math.round((new Set(mcqAnalytics.filter(a => a.isPassed).map(a => `${a.userId?._id}-${a.sessionId}`)).size / Math.max(1, workshop?.registeredStudentIds?.length * 5)) * 100)}%`, icon: <Award className="w-5 h-5" />, color: "text-purple-500", bg: "bg-purple-500/10" }
                 ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 p-6 rounded-[32px] flex items-center gap-4 shadow-xl">
                       <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>{stat.icon}</div>
                       <div>
                          <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">{stat.label}</p>
                          <p className="text-2xl font-black">{stat.value}</p>
                       </div>
                    </div>
                 ))}
              </div>

              {/* Student Performance Table */}
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[48px] overflow-hidden shadow-2xl">
                 <table className="w-full text-left border-collapse">
                    <thead className="text-[10px] font-black uppercase tracking-widest opacity-30 border-b border-slate-200 dark:border-white/5">
                       <tr>
                          <th className="px-10 py-6">Student</th>
                          <th className="px-10 py-6 text-center">Attempts</th>
                          <th className="px-10 py-6">Progress</th>
                          <th className="px-10 py-6">Avg Accuracy</th>
                          <th className="px-10 py-6 text-right">Details</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                       {workshop?.registeredStudentIds?.map((student: any) => {
                          const studentAttempts = mcqAnalytics.filter(a => a.userId?._id === student._id);
                          const passedCount = new Set(studentAttempts.filter(a => a.isPassed).map(a => `${a.sessionId}-${a.materialId}`)).size;
                          const avgScore = studentAttempts.length > 0 ? Math.round(studentAttempts.reduce((acc, a) => acc + (a.score/a.totalQuestions)*100, 0) / studentAttempts.length) : 0;
                          
                          // Row color based on performance
                          const performanceColor = avgScore > 80 ? 'bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06]' : 
                                                 avgScore > 50 ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.06]' : 
                                                 studentAttempts.length > 0 ? 'bg-red-500/[0.03] hover:bg-red-500/[0.06]' : 'hover:bg-white/[0.02]';
                          
                          return (
                             <tr key={student._id} className={`transition-colors group ${performanceColor}`}>
                                <td className="px-10 py-6">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-primary-light text-white rounded-xl flex items-center justify-center font-black shadow-md">{student.name?.[0]}</div>
                                      <div>
                                         <p className="font-bold text-sm">{student.name}</p>
                                         <p className="text-[9px] font-black opacity-30 uppercase tracking-widest">{student.email.split('@')[0]}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-10 py-6 text-center">
                                   <span className="text-sm font-black opacity-60">{studentAttempts.length}</span>
                                </td>
                                <td className="px-10 py-6">
                                   <div className="flex items-center gap-4">
                                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden min-w-[100px]">
                                         <div className="h-full bg-primary-light transition-all" style={{ width: `${(passedCount / 5) * 100}%` }} />
                                      </div>
                                      <span className="text-[10px] font-black opacity-40">{passedCount}/5</span>
                                   </div>
                                </td>
                                <td className="px-10 py-6">
                                   <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${avgScore > 80 ? 'bg-emerald-500' : avgScore > 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
                                      <span className={`text-sm font-black ${avgScore > 80 ? 'text-emerald-500' : avgScore > 50 ? 'text-amber-500' : 'text-red-500'}`}>{avgScore}%</span>
                                   </div>
                                </td>
                                <td className="px-10 py-6 text-right">
                                   <button 
                                     onClick={() => setSelectedStudentForAnalytics(student)}
                                     className="p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-primary-light hover:text-white rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-white/5 group-hover:shadow-lg"
                                   >
                                      <ArrowRight className="w-3.5 h-3.5" />
                                   </button>
                                </td>
                             </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>

              {/* Student Detail Modal */}
              <UniversalModal
                isOpen={!!selectedStudentForAnalytics}
                onClose={() => setSelectedStudentForAnalytics(null)}
                title="Student Performance Detail"
                description={`Tracking progress for ${selectedStudentForAnalytics?.name}`}
                maxWidth="max-w-3xl"
                icon={<Activity className="text-white" />}
              >
                 <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                          <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Last Attempt</p>
                          <p className="text-2xl font-black">
                             {mcqAnalytics.filter(a => a.userId?._id === selectedStudentForAnalytics?._id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.score || 0}
                             <span className="text-sm opacity-40 ml-1">Score</span>
                          </p>
                       </div>
                       <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                          <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Engagement</p>
                          <p className="text-2xl font-black">
                             {mcqAnalytics.filter(a => a.userId?._id === selectedStudentForAnalytics?._id).length}
                             <span className="text-sm opacity-40 ml-1">Total Tries</span>
                          </p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h5 className="text-[10px] font-black uppercase tracking-widest opacity-40">Recent Activity Log</h5>
                       <div className="space-y-3">
                          {mcqAnalytics.filter(a => a.userId?._id === selectedStudentForAnalytics?._id).map((a, i) => (
                             <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-4">
                                   <div className={`w-10 h-10 ${a.isPassed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'} rounded-xl flex items-center justify-center`}><Zap className="w-4 h-4" /></div>
                                   <div>
                                      <p className="text-xs font-bold">Session Content Quiz</p>
                                      <p className="text-[9px] opacity-40 font-black uppercase tracking-widest">{new Date(a.createdAt).toLocaleString()}</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-sm font-black">{a.score} / {a.totalQuestions}</p>
                                   <p className={`text-[8px] font-black uppercase tracking-widest ${a.isPassed ? 'text-emerald-500' : 'text-red-500'}`}>{a.isPassed ? 'PASSED' : 'FAILED'}</p>
                                </div>
                             </div>
                          ))}
                          {mcqAnalytics.filter(a => a.userId?._id === selectedStudentForAnalytics?._id).length === 0 && (
                             <div className="p-10 text-center opacity-30 font-black uppercase text-[10px] tracking-widest">No quiz activity recorded.</div>
                          )}
                       </div>
                    </div>
                 </div>
              </UniversalModal>
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

      {/* Review & Edit Import Modal */}
      <UniversalModal
        isOpen={showPreviewModal}
        onClose={() => !processing && setShowPreviewModal(false)}
        title="Review Student List"
        description={`Parsed ${importData.length} students from sheet`}
        maxWidth="max-w-4xl"
        icon={<CheckSquare className="text-white" />}
      >
        <div className="space-y-6">
          <div className="max-h-[50vh] overflow-y-auto border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest opacity-40">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {importData.map((item, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-3">
                      {editingIndex === idx ? (
                        <input 
                          className="w-full bg-white dark:bg-white/5 border border-primary-light rounded-lg px-3 py-1.5 text-sm outline-none"
                          value={item.name}
                          onChange={(e) => updateImportItem(idx, 'name', e.target.value)}
                        />
                      ) : (
                        <span className="text-sm font-bold">{item.name || <span className="text-red-500 opacity-50 italic text-xs">Missing</span>}</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {editingIndex === idx ? (
                        <input 
                          className="w-full bg-white dark:bg-white/5 border border-primary-light rounded-lg px-3 py-1.5 text-sm outline-none"
                          value={item.email}
                          onChange={(e) => updateImportItem(idx, 'email', e.target.value)}
                        />
                      ) : (
                        <span className="text-sm opacity-60 font-medium">{item.email || <span className="text-red-500 opacity-50 italic text-xs">Missing</span>}</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {editingIndex === idx ? (
                        <input 
                          className="w-full bg-white dark:bg-white/5 border border-primary-light rounded-lg px-3 py-1.5 text-sm outline-none"
                          value={item.phone}
                          onChange={(e) => updateImportItem(idx, 'phone', e.target.value)}
                        />
                      ) : (
                        <span className="text-xs opacity-40 font-black">{item.phone || '-'}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingIndex === idx ? (
                          <button onClick={() => setEditingIndex(null)} className="p-2 bg-green-500 text-white rounded-lg hover:scale-105 transition-all"><Save className="w-3.5 h-3.5" /></button>
                        ) : (
                          <button onClick={() => setEditingIndex(idx)} className="p-2 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-primary-light rounded-lg transition-all"><Edit className="w-3.5 h-3.5" /></button>
                        )}
                        <button onClick={() => removeImportItem(idx)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
            <button 
              onClick={() => setShowPreviewModal(false)}
              disabled={processing !== null}
              className="flex-1 py-4 border border-slate-200 dark:border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] opacity-40 hover:opacity-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleFinalImport}
              disabled={processing !== null || importData.some(s => !s.name || !s.email)}
              className="flex-2 py-4 bg-primary-light hover:bg-primary-dark text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary-light/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {processing === 'importing' ? <Activity className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              All Looks Good, Add Students
            </button>
          </div>
          {importData.some(s => !s.name || !s.email) && (
            <p className="text-[10px] font-black uppercase text-red-500 text-center animate-pulse">Some records are missing required info (Name/Email)</p>
          )}
        </div>
      </UniversalModal>
    </div>
  );
}
