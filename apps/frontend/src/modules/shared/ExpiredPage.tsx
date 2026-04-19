import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, Phone, Mail, AlertTriangle } from 'lucide-react';

export default function ExpiredPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-red-500/10 blur-[150px] rounded-full -z-10" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-orange-500/10 blur-[150px] rounded-full -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-lg w-full text-center space-y-8"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-28 h-28 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center"
        >
          <Clock className="w-14 h-14 text-red-500 opacity-80" />
        </motion.div>

        {/* Text */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-red-500 text-xs font-black uppercase tracking-widest mb-2">
            <AlertTriangle className="w-4 h-4" />
            Subscription Expired
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            Access Restricted
          </h1>
          <p className="text-lg opacity-60 leading-relaxed">
            Your institution's Nexus subscription has expired. All platform access has been temporarily paused until the subscription is renewed.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 space-y-4 text-left">
          <p className="text-sm font-black uppercase tracking-widest opacity-40">What to do next</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">1</div>
              <p className="text-sm opacity-70">Ask your institution's administrator to contact <span className="font-bold text-primary-light">Pixaflip Support</span> to renew the subscription.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">2</div>
              <p className="text-sm opacity-70">Once the subscription is activated, your access will be automatically restored.</p>
            </div>
          </div>
        </div>

        {/* Contact Block */}
        <div className="flex items-center justify-center gap-6 opacity-50 text-sm">
          <a href="mailto:support@pixaflip.com" className="flex items-center gap-2 hover:opacity-100 transition-opacity cursor-pointer">
            <Mail className="w-4 h-4" />
            support@pixaflip.com
          </a>
          <span className="w-px h-4 bg-current opacity-30" />
          <a href="tel:+1800PIXAFLIP" className="flex items-center gap-2 hover:opacity-100 transition-opacity cursor-pointer">
            <Phone className="w-4 h-4" />
            1800-PIXAFLIP
          </a>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          className="mx-auto flex items-center gap-2 px-6 py-3 border border-red-500/30 text-red-500 rounded-2xl hover:bg-red-500/10 transition-all font-black text-xs uppercase tracking-widest cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </motion.div>
    </div>
  );
}
