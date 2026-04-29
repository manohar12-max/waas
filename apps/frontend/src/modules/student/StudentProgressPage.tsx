import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Award, 
  Search, 
  Download, 
  ExternalLink, 
  ChevronRight, 
  Calendar, 
  Star,
  ShieldCheck,
  Trophy,
  History,
  Zap
} from 'lucide-react';

interface Achievement {
  _id: string;
  title: string;
  collegeId: { name: string };
  instructorId: { name: string };
  issueDate: string;
  status: 'COMPLETED' | 'PENDING';
}

export default function StudentProgressPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [mcqSummary, setMcqSummary] = useState<{ totalQuizzes: number, passedQuizzes: number, avgScore: number } | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Placeholder for actual certificate fetching
    const timer = setTimeout(() => {
      setAchievements([
        {
          _id: "1",
          title: "Full-Stack System Architecture",
          collegeId: { name: "Engineering College" },
          instructorId: { name: "Dr. Sarah Miller" },
          issueDate: "2026-04-10",
          status: 'COMPLETED'
        },
        {
          _id: "2",
          title: "Advanced React & Framer Motion",
          collegeId: { name: "Engineering College" },
          instructorId: { name: "Prof. James Wilson" },
          issueDate: "2026-04-15",
          status: 'PENDING'
        }
      ]);
      setLoading(false);
    }, 1000);
    fetchMcqSummary();
    return () => clearTimeout(timer);
  }, []);

  const fetchMcqSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/student/mcq-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMcqSummary(response.data);
    } catch (err) {
      console.error('Failed to fetch MCQ summary:', err);
    }
  };

  return (
    <div className="space-y-12 pb-24 font-outfit">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-8 h-8 text-primary-light" />
            <div className="px-3 py-1 bg-primary-light/10 text-primary-light rounded-full text-[10px] font-black uppercase tracking-widest border border-primary-light/20">Verified Credentials</div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter mb-4">Achievement Vault</h1>
          <p className="opacity-40 font-medium max-w-xl text-lg leading-relaxed">Your digital gallery of verified technical milestones and institutional certifications.</p>
        </motion.div>

        <div className="flex gap-4">
          <div className="p-8 bg-card-dark border border-white/5 rounded-[40px] shadow-2xl space-y-2 min-w-[200px]">
             <div className="flex items-center gap-3 text-primary-light mb-1">
               <Star className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total XP</span>
             </div>
             <div className="text-4xl font-black tracking-tighter">2,450</div>
          </div>
          <div className="p-8 bg-primary-light rounded-[40px] text-white shadow-2xl shadow-primary-light/30 space-y-2 min-w-[200px]">
             <div className="flex items-center gap-3 mb-1">
               <Trophy className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Certificates</span>
             </div>
             <div className="text-4xl font-black tracking-tighter">{achievements.filter(a => a.status === 'COMPLETED').length}</div>
          </div>
          <div className="p-8 bg-emerald-500 rounded-[40px] text-white shadow-2xl shadow-emerald-500/30 space-y-2 min-w-[200px]">
             <div className="flex items-center gap-3 mb-1">
               <Zap className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Avg. Score</span>
             </div>
             <div className="text-4xl font-black tracking-tighter">{mcqSummary?.avgScore || 0}%</div>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20" />
        <input 
          className="w-full bg-card-dark border border-white/5 rounded-[40px] py-8 pl-18 pr-8 outline-none focus:ring-4 focus:ring-primary-light/10 transition-all font-bold text-lg cursor-pointer"
          placeholder="Search your achievement gallery..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {achievements.map((item) => (
          <motion.div 
            key={item._id}
            whileHover={{ y: -10 }}
            className="group bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[56px] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between h-[500px]"
          >
             <div className="absolute top-0 right-0 p-8">
               <div className={`p-3 rounded-full ${item.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                 <ShieldCheck className="w-6 h-6" />
               </div>
             </div>

             <div className="space-y-6">
               <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-40">
                 <Calendar className="w-4 h-4" />
                 {new Date(item.issueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
               </div>
               <h3 className="text-3xl font-black tracking-tight leading-tight group-hover:text-primary-light transition-colors">{item.title}</h3>
               <div className="space-y-4">
                 <div className="flex items-center gap-3 opacity-60">
                   <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-black">{item.instructorId.name[0]}</div>
                   <span className="text-xs font-bold">{item.instructorId.name}</span>
                 </div>
               </div>
             </div>

             <div className="space-y-6">
               <div className="h-0.5 bg-slate-200 dark:bg-white/5 w-full" />
               <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-20 text-slate-900 dark:text-white">Validation Grade</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">Professional-A</p>
                 </div>
                 <button 
                   disabled={item.status !== 'COMPLETED'}
                   className={`flex items-center gap-3 px-8 py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl cursor-pointer ${item.status === 'COMPLETED' ? 'bg-primary-light text-white hover:bg-primary-dark active:scale-95' : 'bg-white/5 opacity-20 cursor-not-allowed'}`}
                 >
                   {item.status === 'COMPLETED' ? (
                     <>Download <Download className="w-4 h-4" /></>
                   ) : (
                     <>Processing <History className="w-4 h-4 animate-spin" /></>
                   )}
                 </button>
               </div>
             </div>
          </motion.div>
        ))}

        <div className="border-4 border-dashed border-white/5 rounded-[56px] p-12 flex flex-col items-center justify-center text-center gap-6 opacity-20">
           <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center"><Zap className="w-10 h-10" /></div>
           <div>
             <p className="font-black text-xl tracking-tight mb-1">Ongoing Growth</p>
             <p className="text-xs font-bold uppercase tracking-widest">More milestones pending...</p>
           </div>
        </div>
      </div>
    </div>
  );
}
