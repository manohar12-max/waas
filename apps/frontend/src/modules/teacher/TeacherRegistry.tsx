import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Users, UserPlus, Mail, Phone, 
  Search, ShieldCheck, Loader2, Link as LinkIcon,
  Lock, X, CheckCircle2, Clock
} from 'lucide-react';
import UniversalModal from '../../components/UniversalModal';

export default function TeacherRegistry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [division, setDivision] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'ENROLLED' | 'PENDING'>('ENROLLED');
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'Nexus@123',
    confirmPassword: 'Nexus@123'
  });

  useEffect(() => {
    fetchData();
    setSelectedIds([]);
  }, [id, tab]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/divisions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDivision(response.data);
      const reg = response.data.workshopId?.registeredStudentIds || [];
      const pend = response.data.workshopId?.pendingStudentIds || [];
      setStudents(reg);
      setPendingStudents(pend);
      
      // Auto-focus pending tab if enrolled is empty but pending is not
      if (reg.length === 0 && pend.length > 0) {
        setTab('PENDING');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!division?.workshopId?._id) return;

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    
    setFormLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/workshops/${division.workshopId._id}/students`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowAddModal(false);
      setFormData({ name: '', email: '', phone: '', password: 'Nexus@123', confirmPassword: 'Nexus@123' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add student");
    } finally {
      setFormLoading(false);
    }
  };

  const handleApprove = async (studentId: string) => {
    try {
      setProcessing(studentId);
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/workshops/${division.workshopId._id}/approve-student/${studentId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to approve student.");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (studentId: string) => {
    if (!confirm("Reject this registration?")) return;
    try {
      setProcessing(studentId);
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/workshops/${division.workshopId._id}/reject-student/${studentId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
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
      await axios.post(`${import.meta.env.VITE_API_URL}/workshops/${division.workshopId._id}/bulk-approve`, { studentIds: selectedIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to bulk approve students.");
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Reject ${selectedIds.length} registrations?`)) return;
    try {
      setProcessing('bulk');
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/workshops/${division.workshopId._id}/bulk-reject`, { studentIds: selectedIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to bulk reject students.");
    } finally {
      setProcessing(null);
    }
  };

  const toggleSelectAll = () => {
    const currentStudents = tab === 'ENROLLED' ? students : pendingStudents;
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

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-primary-light" /></div>;

  return (
    <div className="space-y-10 pb-20 font-outfit max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-all font-bold group cursor-pointer">
          <ChevronLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </button>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-3 bg-primary-light hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-light/30 cursor-pointer"
        >
          <UserPlus className="w-5 h-5" />
          Add Student
        </button>
      </div>

      <div className="space-y-2">
        <h1 className="text-5xl font-black tracking-tighter">Student Registry</h1>
        <p className="opacity-40 font-medium text-lg">Managing {division?.name} Cluster</p>
      </div>

      <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.01]">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary-light" />
              <h3 className="font-outfit font-bold text-xl">Division Registry</h3>
            </div>
            <div className="flex gap-2 p-1 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                <button 
                  onClick={() => setTab('ENROLLED')}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${tab === 'ENROLLED' ? 'bg-primary-light text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                >
                  Enrolled ({students.length})
                </button>
                <button 
                  onClick={() => setTab('PENDING')}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer relative ${tab === 'PENDING' ? 'bg-orange-500 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                >
                  Pending ({pendingStudents.length})
                  {pendingStudents.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-card-dark" />
                  )}
                </button>
            </div>
            {selectedIds.length > 0 && tab === 'PENDING' && (
              <div className="flex items-center gap-3 ml-4 animate-in fade-in slide-in-from-left-2">
                <span className="text-[10px] font-black uppercase opacity-40 pr-4 border-r border-slate-200 dark:border-white/10">{selectedIds.length} Selected</span>
                <button 
                  onClick={handleBulkReject}
                  disabled={processing !== null}
                  className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
                >
                  Reject All
                </button>
                <button 
                  onClick={handleBulkApprove}
                  disabled={processing !== null}
                  className="px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
                >
                  Approve All
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest opacity-30 border-b border-slate-100 dark:border-white/5">
                <th className="px-8 py-6 w-10">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 accent-primary-light cursor-pointer"
                    checked={selectedIds.length > 0 && selectedIds.length === (tab === 'ENROLLED' ? students.length : pendingStudents.length)}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-8 py-6">Student Name</th>
                <th className="px-8 py-6">Contact Info</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {tab === 'ENROLLED' ? (
                students.map((student) => (
                  <tr key={student._id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="px-8 py-6">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-primary-light cursor-pointer"
                        checked={selectedIds.includes(student._id)}
                        onChange={() => toggleSelect(student._id)}
                      />
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-light/20 to-indigo-500/20 flex items-center justify-center font-black text-primary-light">
                          {student.name ? student.name[0] : '?'}
                        </div>
                        <p className="font-bold">{student.name}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-sm opacity-60"><Mail className="w-3 h-3" />{student.email}</div>
                        {student.phone && <div className="flex items-center gap-2 text-[10px] opacity-40 font-bold"><Phone className="w-2.5 h-2.5" />{student.phone}</div>}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-bold opacity-60">Verified Enrollment</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right text-xs font-bold opacity-20 hover:opacity-100 transition-opacity">
                      Manage Student
                    </td>
                  </tr>
                ))
              ) : (
                pendingStudents.map((student) => (
                  <tr key={student._id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="px-8 py-6">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-primary-light cursor-pointer"
                        checked={selectedIds.includes(student._id)}
                        onChange={() => toggleSelect(student._id)}
                      />
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center font-black text-orange-500">
                          {student.name ? student.name[0] : '?'}
                        </div>
                        <p className="font-bold">{student.name}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-sm opacity-60"><Mail className="w-3 h-3" />{student.email}</div>
                        {student.phone && <div className="flex items-center gap-2 text-[10px] opacity-40 font-bold"><Phone className="w-2.5 h-2.5" />{student.phone}</div>}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-bold opacity-60">Pending Approval</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleReject(student._id)}
                          disabled={processing === student._id}
                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleApprove(student._id)}
                          disabled={processing === student._id}
                          className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {((tab === 'ENROLLED' && students.length === 0) || (tab === 'PENDING' && pendingStudents.length === 0)) && (
                <tr>
                  <td colSpan={4} className="py-20 text-center opacity-20 font-black uppercase tracking-widest text-xs">No records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      <UniversalModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create Student Identity"
        description="Add a new student to this division manually. They will be able to login with their institutional email."
        maxWidth="max-w-md"
        icon={<UserPlus />}
      >
        <form onSubmit={handleAddStudent} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4">Full Name</label>
            <div className="relative group">
              <Users className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary-light transition-all" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl py-5 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold"
                placeholder="Student Official Name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary-light transition-all" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl py-5 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold"
                placeholder="student@institution.edu"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4">Contact Number</label>
            <div className="relative group">
              <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary-light transition-all" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl py-5 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold"
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4">Portal Password</label>
            <div className="relative group">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary-light transition-all" />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl py-5 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold"
                placeholder="Temporary Password"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4">Confirm Password</label>
            <div className="relative group">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary-light transition-all" />
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl py-5 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold"
                placeholder="Repeat password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="w-full py-5 bg-primary-light text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-light/30 hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Deploy Identity</>}
          </button>
        </form>
      </UniversalModal>
    </div>
  );
}
