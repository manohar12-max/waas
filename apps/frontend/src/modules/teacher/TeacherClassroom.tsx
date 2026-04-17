import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Layout, Book, CheckSquare, 
  BarChart3, Plus, Upload, Loader2, PlayCircle 
} from 'lucide-react';

export default function TeacherClassroom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [division, setDivision] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/divisions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDivision(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-primary-light" /></div>;

  return (
    <div className="space-y-12 pb-24 font-outfit max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-all font-bold group cursor-pointer">
            <ChevronLeft className="group-hover:-translate-x-1 transition-transform" /> Back
          </button>
          <h1 className="text-5xl font-black tracking-tighter mb-2">{division?.name} Classroom</h1>
          <div className="flex items-center gap-4">
            <span className="px-4 py-1.5 bg-primary-light/10 text-primary-light rounded-xl font-black text-[10px] uppercase tracking-widest border border-primary-light/20">
              {division?.workshopId?.title}
            </span>
            <span className="flex items-center gap-2 text-xs font-bold opacity-40">
              <BarChart3 className="w-4 h-4" /> 88% Compliance
            </span>
          </div>
        </div>
        
        <button onClick={() => navigate(`/workshops/${division?.workshopId?._id}/live`)} className="bg-primary-light hover:bg-primary-dark text-white px-8 py-5 rounded-[28px] font-black uppercase tracking-widest text-xs flex items-center gap-4 shadow-2xl shadow-primary-light/30 transition-all cursor-pointer">
          <PlayCircle className="w-5 h-5" /> Start Live Session
        </button>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Controls */}
        <div className="lg:col-span-2 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assignments Tile */}
            <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[40px] p-8 space-y-6 hover:border-primary-light/30 transition-all shadow-xl group">
              <div className="flex justify-between items-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><CheckSquare className="w-6 h-6" /></div>
                <button className="p-2 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Plus className="w-5 h-5" /></button>
              </div>
              <h4 className="text-2xl font-black tracking-tight">Gradebook</h4>
              <p className="text-sm opacity-40 font-medium">Manage assignments and review student submissions.</p>
              <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-4 text-[10px] font-black uppercase opacity-60">
                  <span>4 Pending</span>
                  <span>12 Submissions</span>
              </div>
            </div>

            {/* Content Tile */}
            <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[40px] p-8 space-y-6 hover:border-primary-light/30 transition-all shadow-xl group">
              <div className="flex justify-between items-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Upload className="w-6 h-6" /></div>
                <button className="p-2 bg-white/5 rounded-xl cursor-pointer"><Plus className="w-5 h-5" /></button>
              </div>
              <h4 className="text-2xl font-black tracking-tight">Supplements</h4>
              <p className="text-sm opacity-40 font-medium">Upload extra notes and division-specific resources.</p>
              <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-4 text-[10px] font-black uppercase opacity-60">
                  <span>3 Files</span>
                  <span>Visible to {division?.name}</span>
              </div>
            </div>
          </div>

          {/* Attendance Snapshot */}
          <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[40px] p-10 space-y-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black tracking-tight">Attendance Log</h3>
              <button className="text-[10px] font-black uppercase tracking-widest text-primary-light cursor-pointer">Full History</button>
            </div>
            <div className="space-y-4">
              {/* Mock Attendance Entry */}
              <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-white/5 rounded-[28px] border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-black">JS</div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">John Smith</p>
                    <p className="text-[10px] font-black opacity-30 uppercase tracking-tighter">Self Check-in @ 09:12 AM</p>
                  </div>
                </div>
                <div className="bg-green-500/10 text-green-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-green-500/10">PRESENT</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column Stats */}
        <div className="space-y-10">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-black rounded-[48px] p-10 text-slate-900 dark:text-white shadow-2xl space-y-6 border border-slate-200 dark:border-white/5">
            <BarChart3 className="w-12 h-12 text-primary-light" />
            <h4 className="text-2xl font-black tracking-tighter uppercase">Performance Monitor</h4>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-40">
                  <span>Attendance Rate</span>
                  <span>88%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-light w-[88%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-40">
                  <span>Assignment Stats</span>
                  <span>65%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[65%]" />
                </div>
              </div>
            </div>
            <button className="w-full py-4 bg-slate-200/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer">Generate Division Report</button>
          </div>
        </div>
      </div>
    </div>
  );
}
