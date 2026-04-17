import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  QrCode,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  School,
  History
} from 'lucide-react';
import { normalizeEmail } from '../../utils/normalization';

export default function AttendanceCheckinPage() {
  const { id: workshopId } = useParams();
  const navigate = useNavigate();

  const [workshop, setWorkshop] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    fetchWorkshopDetails();
  }, [workshopId]);

  const fetchWorkshopDetails = async () => {
    try {
      // We use the existing validate-invite logic to get basic workshop details for the UI
      // even though we aren't registering, we just need the Title/College for context.
      // Actually, we'll just fetch by ID but it might be protected. 
      // Let's assume there's a basic public info endpoint or we'll fetch it from the 3001 enrollment hub if possible.
      // For now, I'll use a placeholder if it fails, or I'll implement a public info route later.
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/workshops/validate-invite/${workshopId}`);
      setWorkshop(response.data);
    } catch (err) {
      // If invite check fails, it might just be the ID. 
      console.error("Context fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const normalizedEmail = normalizeEmail(email);
      await axios.post(`${import.meta.env.VITE_API_URL}/enrollment/check-in`, {
        workshopId,
        email: normalizedEmail
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Check-in failed. Are you registered for this workshop?");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary-light" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark font-outfit p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md p-12 glass-morphism rounded-[64px] text-center space-y-8 shadow-2xl">
          <div className="w-24 h-24 bg-green-500 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-green-500/20">
            <CheckCircle2 className="text-white w-12 h-12" />
          </div>
          <div className="space-y-3">
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">Checked In!</h2>
            <p className="opacity-40 font-bold uppercase tracking-widest text-[10px]">Attendance Verified</p>
          </div>
          <p className="text-sm opacity-60 leading-relaxed font-medium">
            Your presence has been recorded for the session. You can now join the workshop hall.
          </p>
          <div className="p-6 bg-white/5 rounded-3xl border border-white/5 text-left space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-30 text-primary-light">Current Session</p>
            <p className="font-bold text-lg">{workshop?.title || "Live Workshop"}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-outfit p-4">
      {/* Background Dynamics */}
      <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] bg-primary-light/10 blur-[130px] rounded-full animate-pulse" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl p-12 glass-morphism rounded-[64px] z-10 shadow-2xl border border-white/5 space-y-10">

        <div className="space-y-4">
          <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center shadow-lg shadow-primary-light/20">
            <QrCode className="text-white w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight">Self Check-in</h1>
            <p className="opacity-40 font-bold uppercase tracking-widest text-[10px]">Record your presence instantly</p>
          </div>
        </div>

        {workshop && (
          <div className="p-8 bg-white/5 border border-white/5 rounded-[40px] space-y-4 shadow-inner">
            <div className="flex items-center gap-3 text-primary-light">
              <School className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">{workshop.collegeId.name}</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight leading-tight">{workshop.title}</h2>
          </div>
        )}

        {error && (
          <div className="p-6 bg-red-500/10 border border-red-500/10 text-red-500 rounded-3xl flex items-center gap-4 text-sm font-bold">
            <AlertCircle className="w-6 h-6 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleCheckin} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4">Institutional Email</label>
            <div className="relative group">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary-light transition-all" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[24px] py-6 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold group-hover:bg-slate-200 dark:group-hover:bg-white/10 text-slate-900 dark:text-white cursor-pointer placeholder:opacity-40"
                placeholder="Enter your registered email"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-6 bg-primary-light text-white rounded-[32px] font-black uppercase tracking-[0.2em] transition-all hover:bg-primary-dark shadow-2xl shadow-primary-light/20 flex items-center justify-center gap-4 text-xs active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify & Check-in"}
          </button>
        </form>

        <div className="pt-6 border-t border-white/5 text-center flex items-center justify-center gap-3 opacity-20 group hover:opacity-100 transition-opacity">
          <History className="w-4 h-4" />
          <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
            Verification happens in real-time
          </p>
        </div>
      </motion.div>
    </div>
  );
}
