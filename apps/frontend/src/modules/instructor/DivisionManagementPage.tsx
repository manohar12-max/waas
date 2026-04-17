import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Layout, ExternalLink, X, Loader2, AlertCircle, Trash2, User, MoreVertical } from 'lucide-react';

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
        {(user.role === 'COLLEGE_ADMIN' || user.role === 'INSTRUCTOR') && (
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
          {divisions.map((div) => (
            <motion.div key={div._id} className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[56px] p-10 shadow-2xl">
              <div className="flex justify-between items-start mb-8">
                <div className="w-16 h-16 bg-primary-light/10 rounded-[22px] flex items-center justify-center text-primary-light border border-primary-light/10">
                  <Users className="w-8 h-8" />
                </div>
              </div>
              <h3 className="text-3xl font-black tracking-tight mb-2">{div.name}</h3>
              <p className="text-sm opacity-30 leading-relaxed font-medium mb-10">{div.description || "Institutional batch cluster."}</p>
              <div className="pt-8 border-t border-slate-100 dark:border-white/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-[10px] font-black">{div.teacherId?.name?.[0] || <User />}</div>
                <p className="text-sm font-bold">{div.teacherId?.name || "Unassigned"}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-background-dark/95 backdrop-blur-3xl cursor-pointer" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-xl bg-card-dark border border-white/10 p-12 rounded-[64px] z-10 shadow-2xl relative">
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-10 right-10 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-3xl font-black tracking-tight mb-10">Init Division</h2>
              <form onSubmit={handleCreate} className="space-y-6">
                <input required className="w-full bg-white/5 border border-white/5 rounded-3xl p-6 outline-none" placeholder="Division Name (e.g. 10th-A)" value={newDivision.name} onChange={e => setNewDivision({...newDivision, name: e.target.value})} />
                
                <select required className="w-full bg-white/5 border border-white/5 rounded-3xl p-6 outline-none cursor-pointer" value={newDivision.workshopId} onChange={e => setNewDivision({...newDivision, workshopId: e.target.value})}>
                  <option value="">Select Target Workshop</option>
                  {workshops.map(w => <option key={w._id} value={w._id}>{w.title}</option>)}
                </select>

                <select required className="w-full bg-white/5 border border-white/5 rounded-3xl p-6 outline-none cursor-pointer" value={newDivision.teacherId} onChange={e => setNewDivision({...newDivision, teacherId: e.target.value})}>
                  <option value="">Select Faculty Lead</option>
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.role})</option>
                  ))}
                </select>
                <button type="submit" className="w-full py-6 bg-primary-light text-white rounded-[32px] font-black uppercase tracking-widest cursor-pointer shadow-2xl shadow-primary-light/30 transition-all hover:bg-primary-dark active:scale-95">{submitting ? <Loader2 className="animate-spin mx-auto" /> : "Deploy Batch"}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
