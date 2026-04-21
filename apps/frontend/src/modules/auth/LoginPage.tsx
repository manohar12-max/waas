import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { LogIn, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { normalizeEmail } from "../../utils/normalization";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const email = normalizeEmail(formData.email);
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, {
        email,
        password: formData.password
      });
      const { access_token, user } = response.data;
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      if (user.collegeId && user.role !== 'SUPER_ADMIN') {
        try {
          const collegeRes = await axios.get(`${import.meta.env.VITE_API_URL}/colleges/${user.collegeId}`, {
            headers: { Authorization: `Bearer ${access_token}` }
          });
          localStorage.setItem('college_status', collegeRes.data.status || 'ACTIVE');
          const updatedUser = { ...user, collegeName: collegeRes.data.name };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          if (collegeRes.data.status === 'EXPIRED') {
            navigate('/expired');
            return;
          }
        } catch {
          localStorage.setItem('college_status', 'ACTIVE');
        }
      } else {
        localStorage.removeItem('college_status');
      }

      if (user.role === 'STUDENT') navigate("/dashboard");
      else if (user.role === 'SUPER_ADMIN') navigate("/colleges");
      else if (user.role === 'INSTRUCTOR') navigate("/instructor/portal");
      else if (user.role === 'TEACHER') navigate("/teacher/divisions");
      else navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-outfit">
      {/* Background Dynamics */}
      <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] bg-primary-light/20 blur-[130px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-indigo-600/20 blur-[130px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl p-12 bg-white/40 dark:bg-white/[0.03] backdrop-blur-3xl rounded-[64px] z-10 mx-4 shadow-2xl border border-slate-200 dark:border-white/10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-primary-light rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary-light/40"
          >
            <LogIn className="text-white w-10 h-10" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">
             <div className="flex flex-col items-center">
               <span className="text-primary-light text-xl tracking-[0.3em] mb-2">NEXUS</span>
               <span className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-normal block mb-4">by Pixaflip</span>
               <span className="text-slate-900 dark:text-white">Portal</span>
             </div>
          </h1>
          <p className="opacity-40 mt-4 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed">
            Secure Entry for Authorized Personnel
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-4 text-sm font-bold"
          >
            <AlertCircle className="w-6 h-6 shrink-0" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-slate-900 dark:text-white">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary-light transition-all" />
              <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[24px] py-5 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold group-hover:bg-slate-200 dark:group-hover:bg-white/10 text-slate-900 dark:text-white cursor-pointer placeholder:opacity-40" placeholder="Your institutional email" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4">Secure Password</label>
            <div className="relative group">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary-light transition-all" />
              <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[24px] py-5 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold group-hover:bg-slate-200 dark:group-hover:bg-white/10 text-slate-900 dark:text-white cursor-pointer placeholder:opacity-40" placeholder="••••••••" />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 1 }}
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-primary-light text-white rounded-[32px] font-black uppercase tracking-[0.2em] transition-all hover:bg-primary-dark shadow-2xl shadow-primary-light/20 flex items-center justify-center gap-4 text-xs mt-6 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Authenticate
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
