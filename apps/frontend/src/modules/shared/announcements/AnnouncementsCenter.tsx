import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Search, 
  Filter, 
  Plus, 
  Loader2, 
  AlertCircle,
  RefreshCcw,
  Calendar,
  User as UserIcon,
  Layers
} from 'lucide-react';
import AnnouncementCard from './AnnouncementCard';
import AnnouncementForm from './AnnouncementForm';

interface AnnouncementsCenterProps {
  workshopId: string;
  divisionId?: string;
}

export default function AnnouncementsCenter({ workshopId, divisionId }: AnnouncementsCenterProps) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'INSTRUCTOR' | 'TEACHER' | 'SUPER_ADMIN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [user] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));

  const fetchAnnouncements = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/announcements`, {
        params: { workshopId, divisionId },
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [workshopId, divisionId]);

  const fetchDivisions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/divisions/workshop/${workshopId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDivisions(response.data);
    } catch (err) {
      console.error(err);
    }
  }, [workshopId]);

  useEffect(() => {
    fetchAnnouncements();
    fetchDivisions();

    // Polling for real-time updates (every 10 seconds)
    const interval = setInterval(() => {
      fetchAnnouncements(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchAnnouncements, fetchDivisions]);

  const handleSubmit = async (data: any) => {
    const token = localStorage.getItem('token');
    if (editingAnnouncement) {
      await axios.put(`${import.meta.env.VITE_API_URL}/announcements/${editingAnnouncement._id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } else {
      await axios.post(`${import.meta.env.VITE_API_URL}/announcements`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/announcements/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleEdit = (announcement: any) => {
    setEditingAnnouncement(announcement);
    setShowForm(true);
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesFilter = filter === 'ALL' || a.authorRole === filter;
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         a.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const canCreate = ['INSTRUCTOR', 'TEACHER'].includes(user.role);

  return (
    <div className="space-y-8 font-outfit">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 relative max-w-md">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
           <input 
             className="w-full bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[24px] py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-primary-light/20 transition-all font-bold shadow-xl" 
             placeholder="Search announcements..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
           />
        </div>

        <div className="flex items-center gap-4">
           <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/5 overflow-x-auto no-scrollbar">
             {[
               { id: 'ALL', label: 'ALL' },
               { id: 'SUPER_ADMIN', label: 'PIXAFLIP' },
               { id: 'INSTRUCTOR', label: 'INSTRUCTOR' },
               { id: 'TEACHER', label: 'TEACHER' }
             ].map(f => (
               <button
                 key={f.id}
                 onClick={() => setFilter(f.id as any)}
                 className={`px-5 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all relative z-10 cursor-pointer whitespace-nowrap ${filter === f.id ? 'text-white' : 'text-slate-500 hover:text-primary-light'}`}
               >
                 {f.label}
                 {filter === f.id && (
                   <motion.div
                     layoutId="annFilterPill"
                     className="absolute inset-0 bg-primary-light rounded-xl -z-10 shadow-lg shadow-primary-light/25"
                   />
                 )}
               </button>
             ))}
           </div>

           {['INSTRUCTOR', 'TEACHER', 'SUPER_ADMIN'].includes(user.role) && (
             <button 
               onClick={() => { setEditingAnnouncement(null); setShowForm(true); }}
               className="bg-primary-light text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-primary-light/30 flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
             >
               <Plus className="w-4 h-4" /> Create New
             </button>
           )}
        </div>
      </div>

      {/* Feed Area */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center opacity-30">
          <Loader2 className="w-10 h-10 animate-spin text-primary-light" />
          <p className="text-[10px] font-black uppercase tracking-widest mt-4">Synchronizing Wisdom Feed...</p>
        </div>
      ) : filteredAnnouncements.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredAnnouncements.map((announcement) => (
              <AnnouncementCard 
                key={announcement._id} 
                announcement={announcement} 
                currentUser={user}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-24 text-center space-y-4 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[48px] opacity-30">
          <Bell className="w-12 h-12 mx-auto" />
          <h3 className="text-xl font-black uppercase tracking-widest">Quiet in the Hall</h3>
          <p className="text-xs font-medium">No announcements have been broadcasted yet.</p>
          <button onClick={() => fetchAnnouncements()} className="flex items-center gap-2 mx-auto text-[9px] font-black uppercase tracking-[0.2em] hover:text-primary-light transition-all">
            <RefreshCcw className="w-3.5 h-3.5" /> Force Sync
          </button>
        </div>
      )}

      {/* Form Modal */}
      <AnnouncementForm 
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingAnnouncement(null); }}
        onSubmit={handleSubmit}
        initialData={editingAnnouncement}
        workshopId={workshopId}
        divisions={divisions}
      />
    </div>
  );
}
