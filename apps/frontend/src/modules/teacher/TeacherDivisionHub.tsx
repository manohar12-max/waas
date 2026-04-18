import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, FileText, Activity, 
  ChevronRight, ArrowUpRight, GraduationCap,
  Loader2, UserPlus, Bell
} from 'lucide-react';

export default function TeacherDivisionHub() {
  const [divisions, setDivisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchDivisions();
  }, []);

  const fetchDivisions = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = user.role === 'SUPER_ADMIN' 
        ? `${import.meta.env.VITE_API_URL}/divisions` 
        : `${import.meta.env.VITE_API_URL}/teacher/divisions`;
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDivisions(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-primary-light" /></div>;

  return (
    <div className="space-y-12 pb-24 font-outfit">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-5xl font-black tracking-tighter mb-3">Teaching Command</h1>
          <p className="opacity-40 font-medium max-w-lg text-lg leading-relaxed">Execute workshop delivery, manage students, and track performance across your assigned divisions.</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {divisions.map((div) => (
          <motion.div 
            key={div._id} 
            whileHover={{ y: -5 }}
            className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[48px] p-8 shadow-2xl relative group overflow-hidden"
          >
            {/* Decorative Background Icon */}
            <GraduationCap className="absolute -right-8 -bottom-8 w-40 h-40 opacity-[0.02] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-500" />
            
            <div className="relative z-10 space-y-8">
              <div className="flex justify-between items-start">
                <div className="w-16 h-16 rounded-[24px] bg-primary-light/10 flex items-center justify-center text-primary-light border border-white/5">
                  <Users className="w-8 h-8" />
                </div>
                <div className="px-4 py-2 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                  Live Session
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tight">{div.name}</h3>
                <p className="text-sm font-bold text-primary-light uppercase tracking-tighter opacity-70">
                  {div.workshopId?.title || "Curriculum Session"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase opacity-30 tracking-widest">Students</span>
                  <p className="font-black text-xl">42 Active</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase opacity-30 tracking-widest">Attendance</span>
                  <p className="font-black text-xl">94% Avg</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => navigate(`/teacher/divisions/${div._id}/registry`)} 
                  className="w-full flex items-center justify-between bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 p-5 rounded-3xl transition-all group/btn cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <UserPlus className="w-5 h-5 opacity-40 group-hover/btn:text-primary-light" />
                    <span className="font-bold text-sm tracking-tight text-slate-700 dark:text-white">Student Registry</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 opacity-20 group-hover/btn:opacity-100 transition-all text-slate-400 dark:text-white" />
                </button>

                <button 
                  onClick={() => navigate(`/teacher/assignments/${div._id}`)} 
                  className="w-full flex items-center justify-between bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-primary-light/40 p-5 rounded-3xl transition-all group/btn cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <FileText className="w-5 h-5 opacity-40 group-hover/btn:text-primary-light transition-colors" />
                    <span className="font-bold text-sm tracking-tight text-slate-700 dark:text-white">Assignments Hub</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-20 group-hover/btn:opacity-100 transition-all text-slate-400 dark:text-white" />
                </button>

                <button 
                  onClick={() => navigate(`/teacher/divisions/${div._id}/announcements`)} 
                  className="w-full flex items-center justify-between bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-primary-light/40 p-5 rounded-3xl transition-all group/btn cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <Bell className="w-5 h-5 opacity-40 group-hover/btn:text-primary-light transition-colors" />
                    <span className="font-bold text-sm tracking-tight text-slate-700 dark:text-white">News & Announcements</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-20 group-hover/btn:opacity-100 transition-all text-slate-400 dark:text-white" />
                </button>

                <button 
                  onClick={() => navigate(`/teacher/divisions/${div._id}/classroom`)} 
                  className="w-full flex items-center justify-between bg-primary-light text-white p-5 rounded-3xl transition-all hover:bg-primary-dark shadow-xl shadow-primary-light/20 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <Activity className="w-5 h-5" />
                    <span className="font-bold text-sm tracking-tight">Enter Classroom</span>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        
        {divisions.length === 0 && (
          <div className="col-span-full py-40 text-center space-y-4 opacity-20">
            <Activity className="w-16 h-16 mx-auto mb-6" />
            <p className="font-black text-2xl uppercase tracking-[0.3em]">No Assigned Divisions</p>
            <p className="font-medium text-lg">Contact your institutional admin for access.</p>
          </div>
        )}
      </div>
    </div>
  );
}
