import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Activity, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Award,
  Zap
} from 'lucide-react';

interface LiveWorkshop {
  _id: string;
  title: string;
  instructorId: {
    name: string;
  };
  status: string;
  schedule: {
    start: string;
    end: string;
  };
}

export default function StudentDashboard() {
  const [liveWorkshops, setLiveWorkshops] = useState<LiveWorkshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState("");
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchLiveWorkshops();
  }, []);

  const fetchLiveWorkshops = async () => {
    try {
      const token = localStorage.getItem('token');
      // Students see all workshops in their college
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/workshops`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter for ONGOING workshops
      setLiveWorkshops(response.data.filter((w: any) => w.status === 'ONGOING'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkshop || otp.length < 4) return;
    
    setVerifying(true);
    setMessage({ text: "", type: "" });

    try {
      const token = localStorage.getItem('token');
      // We hit the Record Attendance endpoint
      // For now, we simulate the OTP check (in production, backend validates the active session token)
      await axios.post(`${import.meta.env.VITE_API_URL}/workshops/${selectedWorkshop}/attendance`, 
        { 
          studentId: user.id,
          method: 'OTP',
          otp: otp // Backend will validate this in the next iteration
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ text: "Attendance Verified! Presence recorded in the institutional hub.", type: "success" });
      setOtp("");
      setSelectedWorkshop(null);
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || "Verification failed. Check your OTP.", type: "error" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-12 pb-24 font-outfit">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 bg-primary-light/10 text-primary-light rounded-full text-[10px] font-black uppercase tracking-widest border border-primary-light/20">Student Mode</span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter mb-3">Student Command</h1>
          <p className="opacity-40 font-medium max-w-lg text-lg leading-relaxed">Access your active curricula and verify your presence in the digital theatre.</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          <h3 className="font-black text-2xl tracking-tight px-2 flex items-center gap-4">
             <Activity className="w-6 h-6 text-primary-light" />
             Current Operations
          </h3>
          
          <div className="space-y-6">
            {liveWorkshops.length > 0 ? (
              liveWorkshops.map((workshop) => (
                <motion.div 
                  key={workshop._id} 
                  className={`group bg-card-light dark:bg-card-dark border rounded-[48px] p-8 transition-all shadow-2xl relative overflow-hidden ${selectedWorkshop === workshop._id ? 'border-primary-light ring-4 ring-primary-light/10' : 'border-slate-200 dark:border-white/5'}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex gap-6 items-start">
                      <div className="w-16 h-16 rounded-[24px] bg-primary-light/10 flex items-center justify-center text-primary-light border border-white/5">
                        <Zap className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-2xl font-black tracking-tight">{workshop.title}</h4>
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase opacity-40">
                           <Clock className="w-3.5 h-3.5" />
                           Started: {new Date(workshop.schedule.start).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedWorkshop(workshop._id)}
                      className={`px-8 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${selectedWorkshop === workshop._id ? 'bg-primary-light text-white' : 'bg-slate-100 dark:bg-transparent border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/5 opacity-60 dark:opacity-40 hover:opacity-100 text-slate-700 dark:text-white'}`}
                    >
                       Joint Workshop
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-[48px] p-20 text-center">
                <BookOpen className="w-12 h-12 mx-auto opacity-10 mb-4" />
                <p className="font-black uppercase tracking-widest opacity-20 text-sm">No Active Institutional Sessions</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <h3 className="font-black text-2xl tracking-tight px-2">Verification Hub</h3>
          <div className="bg-gradient-to-br from-primary-light to-indigo-600 rounded-[56px] p-10 text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-20"><ShieldCheck className="w-20 h-20" /></div>
             <div className="relative z-10 space-y-8">
               <div className="space-y-2">
                 <h4 className="text-2xl font-black tracking-tight">Enter Session OTP</h4>
                 <p className="text-xs opacity-60 font-medium">Verify your presence using the 8-digit terminal code shown in the theater.</p>
               </div>

               <form onSubmit={handleVerify} className="space-y-4">
                 <input 
                   required
                   className="w-full bg-white/10 border border-white/20 rounded-3xl p-6 outline-none font-black text-center text-2xl tracking-[0.4em] placeholder:opacity-20 uppercase"
                   placeholder="••••••••"
                   maxLength={8}
                   value={otp}
                   disabled={!selectedWorkshop}
                   onChange={e => setOtp(e.target.value.toUpperCase())}
                 />
                 <button 
                   disabled={!selectedWorkshop || verifying}
                   type="submit"
                   className="w-full py-6 bg-white text-primary-light rounded-[32px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] shadow-xl disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-3 cursor-pointer"
                 >
                   {verifying ? <Loader2 className="animate-spin" /> : "Verify Attendance"}
                 </button>
               </form>

               <AnimatePresence>
                 {message.text && (
                   <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${message.type === 'success' ? 'bg-green-400/20 text-green-300' : 'bg-red-400/20 text-red-300'}`}
                   >
                     <AlertCircle className="w-4 h-4" /> {message.text}
                   </motion.div>
                 )}
               </AnimatePresence>

               {!selectedWorkshop && liveWorkshops.length > 0 && (
                 <p className="text-[10px] font-black uppercase tracking-widest text-center opacity-60 animate-bounce">Select a workshop to begin</p>
               )}
             </div>
          </div>

          <div className="p-10 rounded-[56px] bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 shadow-2xl space-y-6">
             <div className="flex items-center gap-4 text-primary-light">
               <Award className="w-8 h-8" />
               <h4 className="text-xl font-black tracking-tight">Achievements</h4>
             </div>
             <div className="space-y-4">
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                 <div className="flex justify-between text-[10px] font-black uppercase opacity-40 mb-2">
                   <span>Program Completion</span>
                   <span>0%</span>
                 </div>
                 <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-primary-light w-0" />
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
