import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Layout, X, Loader2, AlertCircle, Trash2, User } from 'lucide-react';
import UniversalModal from '../../components/UniversalModal';

interface Division {
  _id: string;
  name: string;
  description?: string;
  teacherId?: {
    _id: string;
    name: string;
    email: string;
  };
  status: string;
}

export default function DivisionManagementPage() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [mcqStats, setMcqStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const [newDivision, setNewDivision] = useState({
    name: '',
    description: '',
    teacherId: '',
    workshopId: '',
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiBase = user.role === 'INSTRUCTOR' ? `${import.meta.env.VITE_API_URL}/instructor` : import.meta.env.VITE_API_URL;
      
      const requests = [
        axios.get(`${import.meta.env.VITE_API_URL}/divisions`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${import.meta.env.VITE_API_URL}/teachers`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiBase}/workshops`, { headers: { Authorization: `Bearer ${token}` } })
      ];

      const [divRes, teachRes, workRes] = await Promise.all(requests);
      setDivisions(divRes.data);
      setTeachers(teachRes.data);
      setWorkshops(workRes.data);

      // Fetch MCQ stats for each workshop
      const stats: Record<string, any> = {};
      for (const workshop of workRes.data) {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/workshop/${workshop._id}/mcq-analytics`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const uniqueStudents = new Set(res.data.map((a: any) => a.userId?._id)).size;
          const passedQuizzes = res.data.filter((a: any) => a.isPassed).length;
          stats[workshop._id] = { uniqueStudents, passedQuizzes };
        } catch (e) {
          console.error(`Failed to fetch stats for ${workshop._id}:`, e);
        }
      }
      setMcqStats(stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = user.role === 'INSTRUCTOR' ? `${import.meta.env.VITE_API_URL}/instructor/divisions` : `${import.meta.env.VITE_API_URL}/divisions`;
      
      await axios.post(endpoint, newDivision, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      fetchData();
      setNewDivision({ name: '', description: '', teacherId: '', workshopId: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create division");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 font-outfit">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black tracking-tighter mb-2">Division Control</h1>
          <p className="opacity-40 font-medium">Manage institutional batches and student clusters.</p>
        </motion.div>
        {(user.role === 'COLLEGE_ADMIN' || user.role === 'INSTRUCTOR' || user.role === 'SUPER_ADMIN') && (
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowModal(true)} className="flex items-center gap-3 bg-primary-light text-white px-8 py-4 rounded-[32px] font-bold shadow-2xl shadow-primary-light/40 transition-all cursor-pointer">
            <Plus className="w-6 h-6" /> Initialize Division
          </motion.button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary-light" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {divisions.map((div: any) => (
            <motion.div key={div._id} className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[56px] p-10 shadow-2xl">
              <div className="flex justify-between items-start mb-8">
                <div className="w-16 h-16 bg-primary-light/10 rounded-[22px] flex items-center justify-center text-primary-light border border-primary-light/10">
                  <Users className="w-8 h-8" />
                </div>
              </div>
              <h3 className="text-3xl font-black tracking-tight mb-2">{div.name}</h3>
              <p className="text-sm font-bold text-primary-light uppercase tracking-tighter opacity-70 mb-4">
                {div.workshopId?.title || "Curriculum Session"}
              </p>
              <p className="text-sm opacity-30 leading-relaxed font-medium mb-8">{div.description || "Institutional batch cluster."}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                  <span className="text-[8px] font-black uppercase opacity-30 tracking-[0.2em] block mb-1">Enrolled</span>
                  <span className="text-lg font-black">{div.workshopId?.registeredStudentIds?.length || 0}</span>
                </div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                  <span className="text-[8px] font-black uppercase opacity-30 tracking-[0.2em] block mb-1">Pending</span>
                  <span className={`text-lg font-black ${div.workshopId?.pendingStudentIds?.length > 0 ? 'text-orange-500' : ''}`}>
                    {div.workshopId?.pendingStudentIds?.length || 0}
                  </span>
                </div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 col-span-2">
                  <span className="text-[8px] font-black uppercase opacity-30 tracking-[0.2em] block mb-1">MCQ Completion Rate</span>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-light" 
                        style={{ width: `${Math.min(100, ((mcqStats[div.workshopId?._id]?.passedQuizzes || 0) / Math.max(1, div.workshopId?.registeredStudentIds?.length || 0)) * 20)}%` }}
                      />
                    </div>
                    <span className="text-xs font-black">{mcqStats[div.workshopId?._id]?.uniqueStudents || 0} Students Active</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 dark:border-white/5 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-[10px] font-black">{div.teacherId?.name?.[0] || <User />}</div>
                  <p className="text-sm font-bold">{div.teacherId?.name || "Unassigned"}</p>
                </div>

                <button 
                  onClick={() => div.workshopId?._id && navigate(`/instructor/workshop/${div.workshopId._id}/manage?tab=PENDING`)}
                  className={`w-full py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-3 ${div.workshopId?.pendingStudentIds?.length > 0 ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'bg-slate-100 dark:bg-white/5 opacity-40 hover:opacity-100'}`}
                >
                  <Users className="w-4 h-4" />
                  Student Registration {div.workshopId?.pendingStudentIds?.length > 0 ? `(${div.workshopId.pendingStudentIds.length})` : ''}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <UniversalModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Initialize Division"
        description="Deploy a new institutional batch and student cluster"
        maxWidth="max-w-xl"
        icon={<Layout className="text-white w-8 h-8" />}
      >
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3 text-sm font-bold">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-6 pt-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Batch Identity</label>
            <input 
              required 
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-3xl p-6 outline-none font-bold text-slate-800 dark:text-white transition-all focus:ring-2 focus:ring-primary-light" 
              placeholder="e.g. 10th-A" 
              value={newDivision.name} 
              onChange={e => setNewDivision({...newDivision, name: e.target.value})} 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Curriculum Enrollment</label>
            <select 
              required 
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-3xl p-6 outline-none cursor-pointer font-bold text-slate-800 dark:text-white appearance-none transition-all focus:ring-2 focus:ring-primary-light" 
              value={newDivision.workshopId} 
              onChange={e => setNewDivision({...newDivision, workshopId: e.target.value})}
            >
              <option value="" className="bg-white dark:bg-card-dark">Select Target Workshop...</option>
              {workshops.map(w => <option key={w._id} value={w._id} className="bg-white dark:bg-card-dark">{w.title}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Operational Lead</label>
            <select 
              required 
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-3xl p-6 outline-none cursor-pointer font-bold text-slate-800 dark:text-white appearance-none transition-all focus:ring-2 focus:ring-primary-light" 
              value={newDivision.teacherId} 
              onChange={e => setNewDivision({...newDivision, teacherId: e.target.value})}
            >
              <option value="" className="bg-white dark:bg-card-dark">Select Faculty Lead...</option>
              {teachers.map(t => (
                <option key={t._id} value={t._id} className="bg-white dark:bg-card-dark">{t.name} ({t.role})</option>
              ))}
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={() => setShowModal(false)} 
              className="flex-1 py-5 border border-slate-200 dark:border-white/10 rounded-[32px] font-black uppercase tracking-widest text-[10px] text-slate-500 dark:text-white/30 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              Discard
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="flex-2 py-5 bg-primary-light hover:bg-primary-dark text-white rounded-[32px] font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary-light/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : "Deploy Batch"}
            </button>
          </div>
        </form>
      </UniversalModal>
    </div>
  );
}
