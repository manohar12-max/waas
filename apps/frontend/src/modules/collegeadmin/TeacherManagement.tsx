import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Mail, Phone, Shield, Search, X, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import UniversalModal from '../../components/UniversalModal';

interface Teacher {
  _id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/teachers`, newTeacher, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      fetchTeachers();
      setNewTeacher({ name: '', email: '', password: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to onboard teacher");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this teacher?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/teachers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTeachers();
    } catch (err) {
      alert("Failed to delete teacher");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-outfit font-black tracking-tight mb-2">Teacher Hub</h1>
          <p className="opacity-40 font-medium">Manage and onboard teachers for your divisions.</p>
        </motion.div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-3 bg-primary-light hover:bg-primary-dark text-white px-8 py-4 rounded-[24px] font-bold shadow-2xl shadow-primary-light/30 transition-all cursor-pointer"
        >
          <Plus className="w-6 h-6" />
          Onboard Teacher
        </motion.button>
      </div>

      <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[40px] overflow-hidden shadow-2xl shadow-black/10">
        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-light/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-light" />
            </div>
            <h3 className="font-outfit font-bold text-xl">Teaching Staff</h3>
          </div>
          <span className="text-xs font-bold px-4 py-2 bg-primary-light/10 text-primary-light rounded-full uppercase tracking-widest">
            {teachers.length} Active
          </span>
        </div>
        
        <div className="overflow-x-auto px-4">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-widest opacity-30">
                <th className="px-6 py-6">Teacher Name</th>
                <th className="px-6 py-6">Contact Info</th>
                <th className="px-6 py-6 border-r border-white/5">Status</th>
                <th className="px-6 py-6 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {teachers.map((teacher) => (
                <tr key={teacher._id} className="transition-colors group hover:bg-white/[0.01]">
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-light/20 to-indigo-500/20 flex items-center justify-center text-primary-light font-black text-lg border border-primary-light/10">
                        {teacher.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-lg leading-tight">{teacher.name}</p>
                        <span className="text-xs font-bold text-primary-light/60 uppercase tracking-tighter">Certified Teacher</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm opacity-60">
                        <Mail className="w-3.5 h-3.5" />
                        {teacher.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-xs font-bold opacity-60">ACTIVE</span>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <motion.button 
                      whileHover={{ scale: 1.1, color: '#ef4444' }}
                      onClick={() => handleDelete(teacher._id)}
                      className="p-3 bg-red-500/5 hover:bg-red-500/10 text-red-500/40 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </motion.button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UniversalModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Onboard Teacher"
        description="Register new teaching staff"
        maxWidth="max-w-lg"
        icon={<Plus className="text-white w-8 h-8" />}
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3 text-sm font-medium"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleAddTeacher} className="space-y-4">
          <input 
            required 
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-light transition-all text-slate-900 dark:text-white text-sm font-bold placeholder:opacity-40" 
            placeholder="Full Name" 
            value={newTeacher.name} 
            onChange={e => setNewTeacher({...newTeacher, name: e.target.value})} 
          />
          <input 
            required 
            type="email" 
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-light transition-all text-slate-900 dark:text-white text-sm font-bold placeholder:opacity-40" 
            placeholder="Email Address" 
            value={newTeacher.email} 
            onChange={e => setNewTeacher({...newTeacher, email: e.target.value})} 
          />
          <input 
            required 
            type="password" 
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-light transition-all text-slate-900 dark:text-white text-sm font-bold placeholder:opacity-40" 
            placeholder="Password" 
            value={newTeacher.password} 
            onChange={e => setNewTeacher({...newTeacher, password: e.target.value})} 
          />
          <button 
            type="submit" 
            className="w-full py-4 bg-primary-light text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-xl shadow-primary-light/20 hover:scale-[1.02] active:scale-95"
          >
            {submitting ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : "Initialize Teacher"}
          </button>
        </form>
      </UniversalModal>
    </div>
  );
}
