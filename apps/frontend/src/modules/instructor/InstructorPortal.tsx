import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  ChevronRight, 
  Activity,
  Layers,
  Calendar,
  Users
} from 'lucide-react';

export default function InstructorPortal() {
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchAssignedWorkshops();
  }, []);

  const fetchAssignedWorkshops = async () => {
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
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-5xl font-black tracking-tighter mb-3 underline decoration-primary-light/30">Your Workspaces</h1>
          <p className="opacity-40 font-medium max-w-lg text-lg leading-relaxed">Dedicated instructor command portal for assigned curriculums.</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-6">
          <h3 className="font-black text-2xl tracking-tight px-2 flex items-center gap-4">
            <Activity className="text-primary-light" /> My Active Workshops
          </h3>
          
          <div className="space-y-6">
            {workshops.map((workshop) => (
              <motion.div key={workshop._id} className="group bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[48px] p-8 hover:border-primary-light/30 transition-all shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex gap-6 items-start">
                    <div className="w-16 h-16 rounded-[24px] bg-primary-light/10 flex items-center justify-center text-primary-light border border-white/5 cursor-pointer"><BookOpen className="w-8 h-8" /></div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-2xl font-black tracking-tight">{workshop.title}</h4>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black border uppercase tracking-widest ${getStatusColor(workshop.status)}`}>{workshop.status}</span>
                      </div>
                      <div className="flex items-center gap-4 pt-2 text-[10px] font-black uppercase opacity-40">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(workshop.schedule.start).toLocaleDateString()}
                        <span className="mx-2 shrink-0 opacity-20">|</span>
                        <Users className="w-3.5 h-3.5" />
                        {workshop.registeredStudentIds?.length || 0} Registered
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                       onClick={() => navigate(`/instructor/workshop/${workshop._id}/manage`)}
                       className="flex items-center gap-3 bg-primary-light text-white px-8 py-5 rounded-[32px] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all cursor-pointer hover:bg-primary-dark"
                    >
                       Manage Workshop
                    </button>
                    <button onClick={() => navigate(`/workshops/${workshop._id}/live`)} className="p-5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white rounded-[32px] border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer"><ChevronRight className="w-6 h-6" /></button>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {!loading && workshops.length === 0 && (
              <div className="py-20 text-center opacity-20 font-black uppercase tracking-[0.2em] border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[48px]">Currently no assigned curriculums</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
           <div className="bg-gradient-to-br from-primary-light to-indigo-600 rounded-[56px] p-10 text-white shadow-2xl space-y-4">
              <Layers className="w-12 h-12 opacity-40" />
              <h3 className="text-3xl font-black tracking-tighter leading-tight">Assigned<br/>Curriculum</h3>
              <div className="text-6xl font-black">{workshops.length}</div>
           </div>
           
           <div className="p-10 bg-card-dark border border-white/5 rounded-[56px] space-y-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500"><Activity className="w-6 h-6" /></div>
              <h3 className="text-xl font-black tracking-tight">Status Insight</h3>
              <p className="text-sm opacity-40 font-medium">Platform verified your identity. You have full operational control over assigned events.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
