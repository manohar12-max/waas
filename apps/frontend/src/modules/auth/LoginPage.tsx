import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

import { LogIn, Mail, Lock, Loader2, AlertCircle, UserPlus, School, BookOpen, ShieldCheck, Phone } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "STUDENT"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const payload = isLogin 
      ? { email: formData.email, password: formData.password } 
      : { ...formData };

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${endpoint}`, payload);
      const { access_token, user } = response.data;
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || `${isLogin ? 'Login' : 'Registration'} failed.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-outfit cursor-pointer">
      {/* Background Dynamics */}
      <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] bg-primary-light/20 blur-[130px] rounded-full animate-pulse cursor-pointer" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-indigo-600/20 blur-[130px] rounded-full animate-pulse cursor-pointer" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl p-12 bg-white/40 dark:bg-white/[0.03] backdrop-blur-3xl rounded-[64px] z-10 mx-4 shadow-2xl border border-slate-200 dark:border-white/10 cursor-pointer"
      >
        <div className="text-center mb-10 cursor-pointer">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-primary-light rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary-light/40 cursor-pointer"
          >
            {isLogin ? <LogIn className="text-white w-10 h-10 cursor-pointer" /> : <UserPlus className="text-white w-10 h-10 cursor-pointer" />}
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter cursor-pointer uppercase">
             {isLogin ? (
               <div className="flex flex-col items-center">
                 <span className="text-primary-light text-xl tracking-[0.3em] mb-2">Pixaflip</span>
                 <span className="text-slate-900 dark:text-white">WaaS Portal</span>
               </div>
             ) : "Join Network"}
          </h1>
          <p className="opacity-40 mt-4 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed cursor-pointer">
            {isLogin ? "Secure Entry for Authorized Personnel" : "Create your administrative identity"}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-4 text-sm font-bold cursor-pointer"
          >
            <AlertCircle className="w-6 h-6 shrink-0 cursor-pointer" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-slate-900 dark:text-white cursor-pointer">
          {!isLogin && (
            <div className="space-y-2 cursor-pointer">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4 cursor-pointer">Full Name</label>
              <div className="relative group cursor-pointer">
                <UserPlus className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary-light transition-all cursor-pointer" />
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[24px] py-5 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold group-hover:bg-slate-200 dark:group-hover:bg-white/10 text-slate-900 dark:text-white cursor-pointer placeholder:opacity-40" placeholder="Enter full name" />
              </div>
            </div>
          )}

          <div className="space-y-2 cursor-pointer">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4 cursor-pointer">Email Address</label>
            <div className="relative group cursor-pointer">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary-light transition-all cursor-pointer" />
              <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[24px] py-5 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold group-hover:bg-slate-200 dark:group-hover:bg-white/10 text-slate-900 dark:text-white cursor-pointer placeholder:opacity-40" placeholder="Your institutional email" />
            </div>
          </div>

          <div className="space-y-2 cursor-pointer">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4 cursor-pointer">Secure Password</label>
            <div className="relative group cursor-pointer">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary-light transition-all cursor-pointer" />
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
              <Loader2 className="w-6 h-6 animate-spin cursor-pointer" />
            ) : (
              <>
                {isLogin ? "Authenticate" : "Create Account"}
              </>
            )}
          </motion.button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-center text-[10px] font-black uppercase tracking-widest opacity-40 mt-10 hover:opacity-100 transition-opacity cursor-pointer cursor-pointer"
        >
          {isLogin ? "Need access? Join Network" : "Already member? Sign In"}
        </button>
      </motion.div>
    </div>
  );
}
