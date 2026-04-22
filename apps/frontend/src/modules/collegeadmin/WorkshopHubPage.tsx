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
  User,
  Trash2,
  Settings,
  Pencil,
  Activity,
  Wand2,
  Cpu,
  Airplay
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
  registrationPeriod?: {
    start: string;
    end: string;
  };
  status: 'UPCOMING' | 'ACTIVE' | 'INACTIVE';
  inviteToken?: string;
  isActive: boolean;
}

export default function WorkshopHubPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [workshopToDelete, setWorkshopToDelete] = useState<Workshop | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING' | 'INACTIVE'>('ALL');
  const navigate = useNavigate();

  const [newWorkshop, setNewWorkshop] = useState({
    title: '',
    description: '',
    instructorId: '',
    schedule: { start: '', end: '' },
    registrationPeriod: { start: '', end: '' }
  });

  const [instructors, setInstructors] = useState<any[]>([]);
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : {};

  useEffect(() => {
    fetchData();
    if (user.role === 'COLLEGE_ADMIN' || user.role === 'SUPER_ADMIN') {
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

  const handleSubmit = async (e: React.FormEvent) => {
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
      if (editingWorkshop) {
        await axios.patch(`${import.meta.env.VITE_API_URL}/workshops/${editingWorkshop._id}`, workshopData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/workshops`, workshopData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setShowModal(false);
      setEditingWorkshop(null);
      fetchData();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || "Operation failed. Check connectivity.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!workshopToDelete) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/workshops/${workshopToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowDeleteModal(false);
      setWorkshopToDelete(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete workshop. Check your permissions.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/workshops/${id}/active`, { isActive: !current }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to toggle status.");
    }
  };

  const resetForm = () => {
    setNewWorkshop({
      title: '',
      description: '',
      instructorId: '',
      schedule: { start: '', end: '' },
      registrationPeriod: { start: '', end: '' }
    });
  };

  const openEditModal = (workshop: Workshop) => {
    setEditingWorkshop(workshop);
    setNewWorkshop({
      title: workshop.title,
      description: workshop.description || '',
      instructorId: workshop.instructorId?._id || '',
      schedule: { 
        start: workshop.schedule.start ? new Date(workshop.schedule.start).toISOString().slice(0, 16) : '', 
        end: workshop.schedule.end ? new Date(workshop.schedule.end).toISOString().slice(0, 16) : '' 
      },
      registrationPeriod: { 
        start: workshop.registrationPeriod?.start ? new Date(workshop.registrationPeriod.start).toISOString().slice(0, 16) : '', 
        end: workshop.registrationPeriod?.end ? new Date(workshop.registrationPeriod.end).toISOString().slice(0, 16) : '' 
      }
    });
    setShowModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'UPCOMING': return 'text-primary-light bg-primary-light/10 border-primary-light/20';
      case 'INACTIVE': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const filteredWorkshops = workshops.filter(w => {
    if (filter === 'ALL') return true;
    return w.status === filter;
  });

  return (
    <div className="space-y-10 pb-24 font-outfit p-6 lg:p-10">
      {/* Header Section */}
      <div className="space-y-8 bg-slate-500/5 p-8 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-inner">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-5xl font-black tracking-tighter mb-2">Workshop Hub</h1>
            <p className="opacity-40 font-medium max-w-lg text-sm leading-relaxed">Central command for curriculum delivery and operational management.</p>
          </motion.div>
          {(user.role === 'COLLEGE_ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'INSTRUCTOR') && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                  setEditingWorkshop(null);
                  resetForm();
                  setShowModal(true);
              }} 
              className="flex items-center justify-center gap-4 bg-primary-light hover:bg-primary-dark text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" /> Deploy Workshop
            </motion.button>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-slate-200 dark:border-white/5">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-30 text-primary-light">Total Curriculum</p>
            <div className="flex items-center gap-3">
               <Layers className="w-5 h-5 opacity-40" />
               <p className="text-2xl font-black">{workshops.length}</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-30 text-green-500">Live Sessions</p>
            <div className="flex items-center gap-3">
               <Activity className="w-5 h-5 opacity-40 text-green-500" />
               <p className="text-2xl font-black">{workshops.filter(w => w.status === 'ACTIVE').length}</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-30 text-primary-light">Instructors</p>
            <div className="flex items-center gap-3">
               <User className="w-5 h-5 opacity-40" />
               <p className="text-2xl font-black">{new Set(workshops.map(w => w.instructorId?._id)).size}</p>
            </div>
          </div>
          <div className="space-y-1">
             <p className="text-[10px] font-black uppercase tracking-widest opacity-30 text-red-500">Inactive Nodes</p>
             <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 opacity-40 text-red-500" />
                <p className="text-2xl font-black">{workshops.filter(w => !w.isActive).length}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
           <h3 className="font-black text-2xl tracking-tight">Transmission Flow</h3>
           <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
              {(['ALL', 'ACTIVE', 'UPCOMING', 'INACTIVE'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    filter === t 
                      ? 'bg-primary-light text-white shadow-lg' 
                      : 'opacity-40 hover:opacity-100'
                  }`}
                >
                  {t}
                </button>
              ))}
           </div>
        </div>
          <div className="space-y-6">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-slate-100 dark:bg-white/5 h-32 rounded-[48px]" />
              ))
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredWorkshops.map((workshop) => (
                  <motion.div 
                    key={workshop._id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group bg-card-light dark:bg-card-dark border ${workshop.isActive ? 'border-slate-200 dark:border-white/5' : 'border-red-500/20 opacity-60'} rounded-[48px] p-8 hover:border-primary-light/30 transition-all shadow-2xl relative overflow-hidden`}
                  >
                    {!workshop.isActive && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white px-6 py-2 text-[8px] font-black uppercase tracking-widest rounded-bl-3xl">
                        Inactive
                      </div>
                    )}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                      <div className="flex gap-6 items-start">
                        <div className="w-20 h-20 rounded-[32px] bg-primary-light/10 flex items-center justify-center text-primary-light border border-white/5 shadow-inner"><BookOpen className="w-10 h-10" /></div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h4 className="text-2xl font-black tracking-tight">{workshop.title}</h4>
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black border uppercase tracking-widest ${getStatusColor(workshop.status)}`}>{workshop.status}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1 text-[10px] font-black uppercase opacity-40">
                            <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(workshop.schedule.start).toLocaleDateString()}</div>
                            <span className="opacity-20 hidden md:block">|</span>
                            <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {workshop.instructorId?.name || "Unassigned"}</div>
                            <span className="opacity-20 hidden md:block">|</span>
                            <div className="flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-primary-light" /> Invite: {workshop.inviteToken || "N/A"}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4">
                        {(user.role === 'INSTRUCTOR' || user.role === 'SUPER_ADMIN') && (
                          <button
                            onClick={() => toggleActive(workshop._id, workshop.isActive)}
                            className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border ${workshop.isActive ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}
                          >
                            {workshop.isActive ? 'Active' : 'Inactive'}
                          </button>
                        )}
                        {(user.role === 'INSTRUCTOR' || user.role === 'TEACHER') && (
                          <div className="flex items-center gap-3">
                            {user.role === 'INSTRUCTOR' && (
                              <button
                                onClick={() => navigate(`/workshops/${workshop._id}/configure`)}
                                className="flex items-center gap-3 bg-slate-500/5 hover:bg-primary-light text-slate-500 dark:text-white hover:text-white px-6 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest cursor-pointer transition-all border border-slate-200 dark:border-white/10"
                              >
                                <Wand2 className="w-4 h-4" />
                                Design Curriculum
                              </button>
                            )}
                            <button 
                              onClick={() => navigate(`/workshops/${workshop._id}/live`)} 
                              className="flex items-center gap-3 bg-primary-light text-white px-8 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary-light/20 hover:translate-y-[-2px] transition-all cursor-pointer"
                            >
                               <Airplay className="w-4 h-4" />
                               Manage Class
                            </button>
                          </div>
                        )}
                        {(user.role === 'INSTRUCTOR' || user.role === 'SUPER_ADMIN') && (
                          <div className="flex items-center gap-3 border-l border-slate-200 dark:border-white/5 pl-4 ml-1">
                             <button
                              onClick={() => openEditModal(workshop)}
                              className="p-4 bg-slate-500/5 hover:bg-primary-light/10 text-slate-400 hover:text-primary-light rounded-2xl transition-all cursor-pointer border border-transparent hover:border-primary-light/20"
                              title="Edit Settings"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                  setWorkshopToDelete(workshop);
                                  setShowDeleteModal(true);
                              }}
                              className="p-4 bg-slate-500/5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-red-500/20"
                              title="Remove Workshop"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {!loading && workshops.length === 0 && (
              <div className="py-24 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[64px] flex flex-col items-center justify-center gap-6">
                 <BookOpen className="w-16 h-16 opacity-10" />
                 <p className="opacity-20 font-black uppercase tracking-[0.4em] text-sm">Deployment Ready: No Active Nodes Found</p>
                 <button onClick={() => setShowModal(true)} className="px-8 py-4 bg-primary-light/10 text-primary-light rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-primary-light hover:text-white transition-all cursor-pointer">Deploy Initial Node</button>
              </div>
            )}
          </div>
        </div>

      <UniversalModal
        isOpen={showModal}
        onClose={() => {
            setShowModal(false);
            setEditingWorkshop(null);
        }}
        title={editingWorkshop ? "Workshop Settings" : "Deploy Workshop"}
        description={editingWorkshop ? `Update details for ${editingWorkshop.title}` : "Initialize a new workshop delivery instance"}
        maxWidth="max-w-2xl"
        icon={editingWorkshop ? <Settings className="text-white w-8 h-8" /> : <BookOpen className="text-white w-8 h-8" />}
      >
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3 text-sm font-bold">
            <ShieldAlert className="w-5 h-5" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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

          {(user.role === 'COLLEGE_ADMIN' || user.role === 'SUPER_ADMIN') && (
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
            <button type="submit" disabled={submitting} className="flex-2 py-5 bg-primary-light hover:bg-primary-dark text-white rounded-[32px] font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary-light/20 cursor-pointer disabled:opacity-50 transition-all">{submitting ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : (editingWorkshop ? "Update Settings" : "Deploy Workshop")}</button>
          </div>
        </form>
      </UniversalModal>

      <UniversalModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Workshop"
        description="Irreversible operation"
        maxWidth="max-w-md"
        icon={<Trash2 className="text-white w-6 h-6" />}
      >
        <div className="space-y-6">
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl">
            <p className="text-sm font-medium text-center leading-relaxed">
              Are you sure you want to permanently delete <span className="font-black text-red-500 uppercase">{workshopToDelete?.title}</span>? 
              This will remove all associated student records and attendance data.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 py-4 border border-slate-200 dark:border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 transition-all cursor-pointer text-slate-500"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      </UniversalModal>
    </div>
  );
}
