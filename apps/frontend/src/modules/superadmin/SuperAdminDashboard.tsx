import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, School, Users, Activity, ExternalLink, Settings, ShieldCheck, X } from 'lucide-react';
import UniversalModal from '../../components/UniversalModal';
import { normalizeEmail } from '../../utils/normalization';

interface College {
  _id: string;
  name: string;
  status: string;
  adminId?: {
    name: string;
    email: string;
  };
}

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <motion.div
    whileHover={{ y: -5, scale: 1.02 }}
    className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 p-6 rounded-3xl relative overflow-hidden group shadow-xl shadow-black/5"
  >
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/10 blur-3xl -mr-10 -mt-10 group-hover:bg-${color}-500/20 transition-all`} />
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl bg-${color}-500/10 flex items-center justify-center text-${color}-500`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium opacity-50 uppercase tracking-wider">{label}</p>
        <h3 className="text-2xl font-bold mt-1 font-outfit">{value}</h3>
      </div>
    </div>
  </motion.div>
);

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCollege, setEditingCollege] = useState<College | null>(null);

  const [stats, setStats] = useState({
    totalColleges: 0,
    totalUsers: 0,
    totalWorkshops: 0,
    activeSessions: 0
  });
  const [error, setError] = useState("");
  const [newCollege, setNewCollege] = useState({
    name: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    adminConfirmPassword: '',
  });

  useEffect(() => {
    fetchColleges();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/stats/platform`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch platform stats:', err);
    }
  };

  const fetchColleges = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/colleges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setColleges(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (newCollege.adminPassword !== newCollege.adminConfirmPassword) {
      setError("Passwords do not match. Please try again.");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...newCollege,
        adminEmail: normalizeEmail(newCollege.adminEmail)
      };
      await axios.post(`${import.meta.env.VITE_API_URL}/colleges`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      fetchColleges();
      setNewCollege({ name: '', adminName: '', adminEmail: '', adminPhone: '', adminPassword: '', adminConfirmPassword: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error occurred during institutional setup');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollege) return;
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL}/colleges/${editingCollege._id}`, {
        name: editingCollege.name,
        status: editingCollege.status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowEditModal(false);
      fetchColleges();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error updating institution');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = (collegeId: string) => {
    localStorage.setItem('impersonate_college_id', collegeId);
    navigate('/dashboard');
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="mb-8">
          <h1 className="text-3xl font-outfit font-bold tracking-tight">Nexus Super Admin</h1>
          <p className="opacity-60 mt-1">Manage and onboard institutions to the Nexus Cloud by Pixaflip.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-primary-light hover:bg-primary-dark text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary-light/30 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Onboard New College
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={School} label="Total Institutions" value={stats.totalColleges} color="indigo" />
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="blue" />
        <StatCard icon={Activity} label="Active Sessions" value={stats.activeSessions} color="green" />
        <StatCard icon={ShieldCheck} label="System Health" value="Optimal" color="purple" />
      </div>

      {/* College List */}
      <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[32px] overflow-hidden shadow-2xl shadow-black/10">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.01]">
          <h3 className="font-outfit font-bold text-lg">Partner Institutions</h3>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live Sync
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm font-medium opacity-50 border-b border-slate-100 dark:border-white/10">
                <th className="px-6 py-4">Institution Name</th>
                <th className="px-6 py-4 text-slate-700 dark:text-white">Administrative Owner</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-6 py-6 h-16 bg-slate-50/50 dark:bg-white/[0.01]" />
                  </tr>
                ))
              ) : (
                colleges.map((college) => (
                  <motion.tr
                    key={college._id}
                    whileHover={{ backgroundColor: 'rgba(129, 140, 248, 0.05)' }}
                    className="transition-colors group hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-light/10 flex items-center justify-center text-primary-light font-bold">
                          {college.name[0]}
                        </div>
                        <div>
                          <p className="font-bold">{college.name}</p>
                          <span className="text-xs opacity-40">Managed SaaS Instance</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div>
                        <p className="text-sm font-medium">{college.adminId?.name || 'Unassigned'}</p>
                        <p className="text-xs opacity-40">{college.adminId?.email || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${college.status === 'ACTIVE'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-yellow-500/10 text-yellow-500'
                        }`}>
                        {college.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleImpersonate(college._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500 hover:text-white text-orange-500 hover:shadow-lg hover:shadow-orange-500/20 rounded-lg transition-all cursor-pointer text-xs font-bold uppercase tracking-widest group"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          GOD MODE
                        </button>
                        <button
                          onClick={() => { setEditingCollege(college); setShowEditModal(true); }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer group"
                          title="Edit Configuration"
                        >
                          <Settings className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UniversalModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Onboard Institution"
        description="Setup a new managed college"
        maxWidth="max-w-lg"
        icon={<School className="text-white w-6 h-6" />}
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3 text-sm font-medium"
          >
            <Activity className="w-5 h-5 shrink-0" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleOnboard} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold ml-1 opacity-40 text-slate-900 dark:text-white uppercase tracking-wider">College Name</label>
            <input
              required
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all cursor-pointer text-slate-900 dark:text-white text-sm"
              placeholder="Institution Name"
              value={newCollege.name}
              onChange={e => setNewCollege({ ...newCollege, name: e.target.value })}
            />
          </div>

          <div className="p-5 bg-primary-light/5 rounded-2xl border border-primary-light/10 space-y-3">
            <div className="flex items-center gap-2 text-primary-light font-bold text-[10px] uppercase tracking-widest mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Administrative Credentials
            </div>
            <div className="space-y-3">
              <input
                required
                className="w-full bg-white/5 border border-white/5 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary-light outline-none cursor-pointer text-slate-900 dark:text-white"
                placeholder="Admin Full Name"
                value={newCollege.adminName}
                onChange={e => setNewCollege({ ...newCollege, adminName: e.target.value })}
              />
              <input
                required
                type="email"
                className="w-full bg-white/5 border border-white/5 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary-light outline-none cursor-pointer text-slate-900 dark:text-white"
                placeholder="admin@college.edu"
                value={newCollege.adminEmail}
                onChange={e => setNewCollege({ ...newCollege, adminEmail: e.target.value })}
              />
              <input
                required
                type="tel"
                className="w-full bg-white/5 border border-white/5 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary-light outline-none cursor-pointer text-slate-900 dark:text-white"
                placeholder="Admin Contact Number"
                value={newCollege.adminPhone}
                onChange={e => setNewCollege({ ...newCollege, adminPhone: e.target.value })}
              />
              <input
                required
                type="password"
                className="w-full bg-white/5 border border-white/5 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary-light outline-none cursor-pointer text-slate-900 dark:text-white"
                placeholder="Initial Secure Password"
                value={newCollege.adminPassword}
                onChange={e => setNewCollege({ ...newCollege, adminPassword: e.target.value })}
              />
              <input
                required
                type="password"
                className="w-full bg-white/5 border border-white/5 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary-light outline-none cursor-pointer text-slate-900 dark:text-white"
                placeholder="Confirm Secure Password"
                value={newCollege.adminConfirmPassword}
                onChange={e => setNewCollege({ ...newCollege, adminConfirmPassword: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 py-3 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs hover:bg-white/5 transition-all cursor-pointer text-slate-500 dark:text-white/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-primary-light hover:bg-primary-dark text-white rounded-xl font-bold text-xs shadow-lg shadow-primary-light/20 transition-all cursor-pointer"
            >
              Initialize
            </button>
          </div>
        </form>
      </UniversalModal>

      <UniversalModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Institution"
        description="Modify configuration settings"
        maxWidth="max-w-md"
        icon={<Settings className="text-white w-6 h-6" />}
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3 text-sm font-medium"
          >
            <Activity className="w-5 h-5 shrink-0" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold ml-1 opacity-40 text-slate-900 dark:text-white uppercase tracking-wider">Institution Name</label>
            <input
              required
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all cursor-pointer text-slate-900 dark:text-white text-sm"
              value={editingCollege?.name || ''}
              onChange={e => {
                if (editingCollege) setEditingCollege({ ...editingCollege, name: e.target.value });
              }}
            />
          </div>

          <div className="space-y-1 border border-slate-200 dark:border-white/5 rounded-xl p-3 bg-white/5">
            <label className="text-[10px] items-center flex justify-between font-bold opacity-40 uppercase mb-2">
              Status
              <span className={`px-2 py-0.5 rounded-full ${editingCollege?.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>{editingCollege?.status}</span>
            </label>
            <select
              className="w-full bg-transparent border-none outline-none font-bold text-sm cursor-pointer"
              value={editingCollege?.status || 'ACTIVE'}
              onChange={e => {
                if (editingCollege) setEditingCollege({ ...editingCollege, status: e.target.value });
              }}
            >
              <option value="ACTIVE" className="bg-slate-800 text-white">ACTIVE (Operation Normal)</option>
              <option value="INACTIVE" className="bg-slate-800 text-white">INACTIVE (Halted)</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="flex-1 py-3 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs hover:bg-white/5 transition-all cursor-pointer text-slate-500 dark:text-white/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-primary-light hover:bg-primary-dark text-white rounded-xl font-bold text-xs shadow-lg shadow-primary-light/20 transition-all cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </UniversalModal>
    </div>
  );
}
