import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-page-light dark:bg-page-dark flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <motion.div
          animate={{ rotate: [0, -5, 5, -5, 0] }}
          transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.5 }}
          className="w-24 h-24 mx-auto rounded-3xl bg-yellow-500/10 border-2 border-yellow-500/30 flex items-center justify-center"
        >
          <AlertTriangle className="w-12 h-12 text-yellow-500" />
        </motion.div>

        <div>
          <h1 className="text-3xl font-black tracking-tight">Under Maintenance</h1>
          <p className="text-base opacity-50 mt-3 leading-relaxed">
            The Nexus platform is currently undergoing scheduled maintenance.
            We'll be back shortly. Thank you for your patience.
          </p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 text-sm text-yellow-600 dark:text-yellow-400 font-bold">
          If you are an administrator, please log in using the admin account to continue.
        </div>

        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 mx-auto px-6 py-3 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-black cursor-pointer hover:opacity-80 transition-opacity"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Page
        </button>
      </motion.div>
    </div>
  );
}
