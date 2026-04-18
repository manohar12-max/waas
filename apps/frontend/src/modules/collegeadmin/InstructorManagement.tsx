import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Mail, Phone, Shield, Search, X, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import UniversalModal from '../../components/UniversalModal';
import { normalizeEmail } from '../../utils/normalization';

interface Instructor {
  _id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export default function InstructorManagement() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const [newInstructor, setNewInstructor] = useState({
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/instructors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstructors(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...newInstructor,
        email: normalizeEmail(newInstructor.email)
      };
      await axios.post(`${import.meta.env.VITE_API_URL}/instructors`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      fetchInstructors();
      setNewInstructor({ name: '', email: '', password: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to onboard instructor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this instructor?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/instructors/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchInstructors();
    } catch (err) {
      alert("Failed to delete instructor");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-outfit font-black tracking-tight mb-2">Instructor Control</h1>
          <p className="opacity-40 font-medium">Manage and onboard instructors for your institution.</p>
        </motion.div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-3 bg-primary-light hover:bg-primary-dark text-white px-8 py-4 rounded-[24px] font-bold shadow-2xl shadow-primary-light/30 transition-all cursor-pointer"
        >
          <Plus className="w-6 h-6" />
          Onboard Instructor
        </motion.button>
      </div>

      {/* Search & Filter */}
      <div className="relative group max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30 group-focus-within:text-primary-light transition-all" />
        <input 
          type="text" 
          placeholder="Search faculty by name or email..."
          className="w-full bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[20px] py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary-light outline-none transition-all shadow-xl shadow-black/5"
        />
      </div>

      {/* Instructors List */}
      <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[40px] overflow-hidden shadow-2xl shadow-black/10">
        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-light/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-light" />
            </div>
            <h3 className="font-outfit font-bold text-xl">Faculty Members</h3>
          </div>
          <span className="text-xs font-bold px-4 py-2 bg-primary-light/10 text-primary-light rounded-full uppercase tracking-widest">
            {instructors.length} Active
          </span>
        </div>
        
        <div className="overflow-x-auto px-4">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-widest opacity-30">
                <th className="px-6 py-6">Faculty Name</th>
                <th className="px-6 py-6">Contact & Auth</th>
                <th className="px-6 py-6">Status</th>
                <th className="px-6 py-6 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                   <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-6 py-8 h-24 bg-slate-50/50 dark:bg-white/[0.01]" />
                  </tr>
                ))
              ) : (
                instructors.map((instructor) => (
                  <tr key={instructor._id} className="transition-colors group hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-light/20 to-indigo-500/20 flex items-center justify-center text-primary-light font-black text-lg border border-primary-light/10">
                          {instructor.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-lg leading-tight">{instructor.name}</p>
                          <span className="text-xs font-bold text-primary-light/60 uppercase tracking-tighter">Certified Lead</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm opacity-60">
                          <Mail className="w-3.5 h-3.5" />
                          {instructor.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs opacity-30">
                          <Shield className="w-3.5 h-3.5 text-green-500" />
                          Multi-Factor Enabled
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        <span className="text-xs font-bold opacity-60">ONLINE</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <motion.button 
                        whileHover={{ scale: 1.1, color: '#ef4444' }}
                        onClick={() => handleDelete(instructor._id)}
                        className="p-3 bg-red-500/5 hover:bg-red-500/10 text-red-500/40 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </motion.button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UniversalModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Onboard Faculty"
        description="Register new institutional staff"
        maxWidth="max-w-lg"
        icon={<Plus className="text-white w-8 h-8" />}
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-3xl flex items-center gap-4 text-sm font-bold"
          >
            <AlertCircle className="w-6 h-6 shrink-0" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleAddInstructor} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 opacity-30">Full Name</label>
              <input
                required
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl p-4 focus:ring-2 focus:ring-primary-light outline-none transition-all placeholder:opacity-20 text-slate-900 dark:text-white text-sm font-bold"
                placeholder="Dr. John Doe"
                value={newInstructor.name}
                onChange={e => setNewInstructor({...newInstructor, name: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 opacity-30">Email Address</label>
              <input
                required
                type="email"
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl p-4 focus:ring-2 focus:ring-primary-light outline-none transition-all placeholder:opacity-20 text-slate-900 dark:text-white text-sm font-bold"
                placeholder="john.doe@college.edu"
                value={newInstructor.email}
                onChange={e => setNewInstructor({...newInstructor, email: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 opacity-30">Initial Password</label>
              <input
                required
                type="password"
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl p-4 focus:ring-2 focus:ring-primary-light outline-none transition-all placeholder:opacity-20 text-slate-900 dark:text-white text-sm font-bold"
                placeholder="Create secure password"
                value={newInstructor.password}
                onChange={e => setNewInstructor({...newInstructor, password: e.target.value})}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 py-3.5 border border-slate-200 dark:border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer text-slate-500 dark:text-white/40"
            >
              Dismiss
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3.5 bg-primary-light hover:bg-primary-dark text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary-light/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Initialize"}
            </button>
          </div>
        </form>
      </UniversalModal>
    </div>
  );
}
