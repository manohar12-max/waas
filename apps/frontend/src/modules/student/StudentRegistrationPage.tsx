import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Mail,
  Phone,
  School,
  BookOpen,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export default function StudentRegistrationPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const navigate = useNavigate();

  const [workshop, setWorkshop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });

  useEffect(() => {
    if (inviteToken) {
      validateInvite();
    } else {
      setError("No invitation link provided. Please use the link shared by your instructor.");
      setLoading(false);
    }
  }, [inviteToken]);

  const validateInvite = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/workshops/validate-invite/${inviteToken}`);
      setWorkshop(response.data);
    } catch (err) {
      setError("This invitation link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/workshops/enroll`, {
        ...formData,
        inviteToken
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Please verify your details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center cursor-pointer">
        <Loader2 className="w-12 h-12 animate-spin text-primary-light cursor-pointer" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark font-outfit p-4 cursor-pointer">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md p-12 glass-morphism rounded-[64px] text-center space-y-8 shadow-2xl cursor-pointer">
          <div className="w-24 h-24 bg-green-500 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-green-500/20 cursor-pointer">
            <CheckCircle2 className="text-white w-12 h-12 cursor-pointer" />
          </div>
          <div className="space-y-3 cursor-pointer">
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white cursor-pointer">Confirmed!</h2>
            <p className="opacity-40 font-bold uppercase tracking-widest text-[10px] cursor-pointer">Enrollment Successful</p>
          </div>
          <p className="text-sm opacity-60 leading-relaxed font-medium cursor-pointer">
            You are now registered for <b>{workshop?.title}</b>. Your instructor will mark your attendance on the event day.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-5 bg-primary-light text-white rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-primary-dark transition-all shadow-xl cursor-pointer flex items-center justify-center gap-3 cursor-pointer"
          >
            Go to Portal <ArrowRight className="w-4 h-4 cursor-pointer" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-outfit p-4 cursor-pointer">
      {/* Dynamic Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] bg-primary-light/10 blur-[130px] rounded-full animate-pulse cursor-pointer" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl p-12 glass-morphism rounded-[64px] z-10 shadow-2xl border border-white/5 space-y-10 cursor-pointer">
        
        {/* Branding */}
        <div className="text-center -mb-4">
          <div className="font-outfit font-black text-2xl tracking-tighter text-primary-light">
             Pixaflip<span className="text-slate-900 dark:text-white opacity-60">WaaS</span>
          </div>
        </div>

        {/* Institutional Context */}
        {workshop && (
          <div className="p-8 bg-white/5 border border-white/5 rounded-[40px] space-y-4 shadow-inner cursor-pointer">
            <div className="flex items-center gap-3 text-primary-light cursor-pointer">
              <School className="w-5 h-5 cursor-pointer" />
              <span className="text-[10px] font-black uppercase tracking-widest cursor-pointer">{workshop.collegeId.name}</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight cursor-pointer">{workshop.title}</h1>
            <div className="flex items-center gap-2 opacity-40 text-xs font-bold uppercase tracking-widest cursor-pointer">
              <BookOpen className="w-4 h-4 cursor-pointer" /> Curriculum Enrollment
            </div>
          </div>
        )}

        {error && (
          <div className="p-6 bg-red-500/10 border border-red-500/10 text-red-500 rounded-3xl flex items-center gap-4 text-sm font-bold cursor-pointer">
            <AlertCircle className="w-6 h-6 shrink-0 cursor-pointer" />
            {error}
          </div>
        )}

        {!error && (
          <form onSubmit={handleSubmit} className="space-y-6 cursor-pointer">
            <div className="space-y-2 cursor-pointer">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4 cursor-pointer">Full Name</label>
              <div className="relative group cursor-pointer">
                <UserPlus className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary-light transition-all cursor-pointer" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/5 rounded-[24px] py-6 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold group-hover:bg-white/10 cursor-pointer"
                  placeholder="Official Name"
                />
              </div>
            </div>

            <div className="space-y-2 cursor-pointer">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4 cursor-pointer">Email Address</label>
              <div className="relative group cursor-pointer">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary-light transition-all cursor-pointer" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/5 rounded-[24px] py-6 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold group-hover:bg-white/10 cursor-pointer"
                  placeholder="Institutional ID"
                />
              </div>
            </div>

            <div className="space-y-2 cursor-pointer">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4 cursor-pointer">Contact Number</label>
              <div className="relative group cursor-pointer">
                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary-light transition-all cursor-pointer" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-white/5 border border-white/5 rounded-[24px] py-6 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold group-hover:bg-white/10 cursor-pointer"
                  placeholder="WhatsApp/Phone"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-6 bg-primary-light text-white rounded-[32px] font-black uppercase tracking-[0.2em] transition-all hover:bg-primary-dark shadow-2xl shadow-primary-light/20 flex items-center justify-center gap-4 text-xs mt-10 active:scale-95 disabled:opacity-50 cursor-pointer cursor-pointer"
            >
              {submitting ? <Loader2 className="w-6 h-6 animate-spin cursor-pointer" /> : "Complete Enrollment"}
            </button>
          </form>
        )}

        <p className="text-center text-[10px] font-black uppercase tracking-widest opacity-20 px-8 leading-relaxed cursor-pointer">
          This invitation is strictly for students from the listed institution.
          By registering, you agree to follow the code of conduct during the session.
        </p>
      </motion.div>
    </div>
  );
}
