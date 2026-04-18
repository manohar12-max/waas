import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  BookOpen,
  ChevronRight,
  Loader2,
  Calendar,
  Layers,
  ShieldAlert,
  Edit3,
  User
} from 'lucide-react';
import UniversalModal from '../../components/UniversalModal';

interface Workshop {
  _id: string;
  title: string;
  description?: string;
  instructorId: {
    _id: string;
    name: string;
    email: string;
  };
  content: any[];
  schedule: {
    start: string;
    end: string;
  };
  status: 'DRAFT' | 'ONGOING' | 'COMPLETED';
  inviteToken?: string;
}

export default function WorkshopHubPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [newWorkshop, setNewWorkshop] = useState({
    title: '',
    description: '',
    instructorId: '',
    schedule: { start: '', end: '' },
    registrationPeriod: { start: '', end: '' }
  });

  const [instructors, setInstructors] = useState<any[]>([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchData();
    if (user.role === 'COLLEGE_ADMIN') {
      fetchInstructors();
    }
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/workshops`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkshops(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstructors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/instructors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstructors(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const instructorId = user.role === 'INSTRUCTOR' ? user.id : newWorkshop.instructorId;

    if (!instructorId) {
      setError("Please select a Technical Instructor lead.");
      setSubmitting(false);
      return;
    }

    const workshopData = {
      ...newWorkshop,
      instructorId,
    };

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/workshops`, workshopData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      fetchData();
      setNewWorkshop({ 
        title: '', 
        description: '', 
        instructorId: '', 
        schedule: { start: '', end: '' },
        registrationPeriod: { start: '', end: '' }
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to deploy curriculum. Check connectivity.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONGOING': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'DRAFT': return 'text-primary-light bg-primary-light/10 border-primary-light/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  return (
    <div className="space-y-12 pb-24 font-outfit">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <h1 className="text-5xl font-black tracking-tighter mb-3">Workshop Command</h1>
          <p className="opacity-40 font-medium max-w-lg text-lg leading-relaxed">The operational command center for workshop delivery and content management.</p>
        </motion.div>
        {user.role === 'COLLEGE_ADMIN' && (
          <motion.button onClick={() => setShowModal(true)} className="flex items-center justify-center gap-4 bg-primary-light hover:bg-primary-dark text-white px-10 py-5 rounded-[32px] font-black text-sm uppercase tracking-widest shadow-2xl transition-all cursor-pointer">
            <Plus className="w-6 h-6" /> Create Workshop
          </motion.button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-6">
          <h3 className="font-black text-2xl tracking-tight px-2">Active Curriculum</h3>
          <div className="space-y-6">
            {workshops.map((workshop) => (
              <motion.div key={workshop._id} className="group bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[48px] p-8 hover:border-primary-light/30 transition-all shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex gap-6 items-start">
                    <div className="w-16 h-16 rounded-[24px] bg-primary-light/10 flex items-center justify-center text-primary-light border border-white/5"><BookOpen className="w-8 h-8" /></div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-2xl font-black tracking-tight">{workshop.title}</h4>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black border uppercase tracking-widest ${getStatusColor(workshop.status)}`}>{workshop.status}</span>
                      </div>
                      <div className="flex items-center gap-4 pt-2 text-[10px] font-black uppercase opacity-40">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(workshop.schedule.start).toLocaleDateString()}
                        <span className="mx-2 shrink-0 opacity-20">|</span>
                        <User className="w-3.5 h-3.5" />
                        {workshop.instructorId?.name || "Unassigned"}
                      </div>
                    </div>
                  </div>
                  {user.role === 'INSTRUCTOR' && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/workshops/${workshop._id}/configure`)}
                        className="flex items-center gap-3 bg-primary-light/10 hover:bg-primary-light text-primary-light hover:text-white px-6 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest cursor-pointer transition-all border border-primary-light/20"
                      >
                        <Edit3 className="w-4 h-4" />
                        Design Curriculum
                      </button>
                      <button onClick={() => navigate(`/workshops/${workshop._id}/live`)} className="p-4 bg-primary-light text-white rounded-3xl shadow-xl hover:scale-105 transition-all cursor-pointer"><ChevronRight className="w-6 h-6" /></button>
                    </div>
                  )}
                  {user.role === 'TEACHER' && (
                    <div className="flex items-center gap-3">
                      <button onClick={() => navigate(`/workshops/${workshop._id}/live`)} className="p-4 bg-primary-light text-white rounded-3xl shadow-xl hover:scale-105 transition-all cursor-pointer"><ChevronRight className="w-6 h-6" /></button>
                    </div>
                  )}
                  {user.role === 'COLLEGE_ADMIN' && (
                    <div className="flex items-center gap-3 opacity-60">
                      <div className="text-[10px] font-black uppercase tracking-widest text-primary-light px-4 py-2 bg-primary-light/10 rounded-xl">Managed by Instructor</div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {workshops.length === 0 && (
              <div className="py-20 text-center opacity-20 font-black uppercase tracking-[0.2em]">No workshops deployed</div>
            )}
          </div>
        </div>
        <div className="lg:col-span-4">
          <div className="bg-gradient-to-br from-primary-light to-indigo-600 rounded-[56px] p-10 text-white shadow-2xl space-y-4">
            <Layers className="w-12 h-12 opacity-40" />
            <h3 className="text-3xl font-black tracking-tighter">Total Curriculum</h3>
            <div className="text-6xl font-black">{workshops.length}</div>
          </div>
        </div>
      </div>

      <UniversalModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Deploy Workshop"
        description="Initialize a new curriculum delivery instance"
        maxWidth="max-w-2xl"
        icon={<BookOpen className="text-white w-8 h-8" />}
      >
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3 text-sm font-bold">
            <ShieldAlert className="w-5 h-5" /> {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Curriculum Identity</label>
            <input 
              required 
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-3xl p-6 outline-none font-bold text-slate-800 dark:text-white placeholder:opacity-40 focus:ring-2 focus:ring-primary-light transition-all" 
              placeholder="Workshop Title" 
              value={newWorkshop.title} 
              onChange={e => setNewWorkshop({ ...newWorkshop, title: e.target.value })} 
            />
          </div>

          {user.role === 'COLLEGE_ADMIN' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Technical Instructor Lead</label>
              <select 
                required 
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-3xl p-6 outline-none font-bold cursor-pointer text-slate-800 dark:text-white appearance-none focus:ring-2 focus:ring-primary-light transition-all" 
                value={newWorkshop.instructorId} 
                onChange={e => setNewWorkshop({ ...newWorkshop, instructorId: e.target.value })}
              >
                <option value="" className="bg-white dark:bg-[#1A1A2E]">Select Instructor...</option>
                {instructors.map(inst => <option key={inst._id} value={inst._id} className="bg-white dark:bg-[#1A1A2E]">{inst.name} ({inst.email})</option>)}
              </select>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Registration Window (Access Period)</label>
              <div className="grid grid-cols-2 gap-4">
                <input required type="datetime-local" className="bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-3xl p-6 outline-none font-bold cursor-pointer text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-light transition-all" value={newWorkshop.registrationPeriod.start} onChange={e => setNewWorkshop({ ...newWorkshop, registrationPeriod: { ...newWorkshop.registrationPeriod, start: e.target.value } })} />
                <input required type="datetime-local" className="bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-3xl p-6 outline-none font-bold cursor-pointer text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-light transition-all" value={newWorkshop.registrationPeriod.end} onChange={e => setNewWorkshop({ ...newWorkshop, registrationPeriod: { ...newWorkshop.registrationPeriod, end: e.target.value } })} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Workshop Event (Schedule)</label>
              <div className="grid grid-cols-2 gap-4">
                <input required type="datetime-local" className="bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-3xl p-6 outline-none font-bold cursor-pointer text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-light transition-all" value={newWorkshop.schedule.start} onChange={e => setNewWorkshop({ ...newWorkshop, schedule: { ...newWorkshop.schedule, start: e.target.value } })} />
                <input required type="datetime-local" className="bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-3xl p-6 outline-none font-bold cursor-pointer text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-light transition-all" value={newWorkshop.schedule.end} onChange={e => setNewWorkshop({ ...newWorkshop, schedule: { ...newWorkshop.schedule, end: e.target.value } })} />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 border border-slate-200 dark:border-white/10 rounded-[32px] font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-500 dark:text-white/40 cursor-pointer">Discard</button>
            <button type="submit" disabled={submitting} className="flex-2 py-5 bg-primary-light hover:bg-primary-dark text-white rounded-[32px] font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary-light/20 cursor-pointer disabled:opacity-50 transition-all">{submitting ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : "Deploy Curriculum"}</button>
          </div>
        </form>
      </UniversalModal>
    </div>
  );
}
