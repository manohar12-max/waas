import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Bell, Search, Loader2, Sparkles, Layout } from 'lucide-react';
import AnnouncementsCenter from '../shared/announcements/AnnouncementsCenter';

export default function AnnouncementsPage() {
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));

  const fetchWorkshops = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      let endpoint = `${import.meta.env.VITE_API_URL}/workshops`;
      
      if (user.role === 'STUDENT') {
        endpoint = `${import.meta.env.VITE_API_URL}/workshops/student`;
      } else if (user.role === 'TEACHER') {
        const dRes = await axios.get(`${import.meta.env.VITE_API_URL}/teacher/divisions`, {
           headers: { Authorization: `Bearer ${token}` }
        });
        const uniqueWorkshops = Array.from(new Set(dRes.data.map((d: any) => d.workshopId?._id)))
          .map(id => dRes.data.find((d: any) => d.workshopId?._id === id)?.workshopId).filter(Boolean);
        setWorkshops(uniqueWorkshops);
        if (uniqueWorkshops.length > 0) setSelectedWorkshopId(uniqueWorkshops[0]._id);
        setLoading(false);
        return;
      }

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkshops(response.data);
      if (response.data.length > 0) {
        setSelectedWorkshopId(response.data[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    fetchWorkshops();
  }, [fetchWorkshops]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 opacity-30">
      <Loader2 className="w-12 h-12 animate-spin text-primary-light" />
      <p className="text-[10px] font-black uppercase tracking-widest mt-6">Decoding Wisdom Streams...</p>
    </div>
  );

  return (
    <div className="space-y-12 pb-24 font-outfit">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-light/10 rounded-2xl flex items-center justify-center text-primary-light border border-primary-light/20 shadow-lg shadow-primary-light/10">
              <Bell className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-light">Central Intelligence</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter leading-tight">News &<br />Announcements</h1>
          <p className="opacity-40 font-medium max-w-md mt-4 text-lg">Stay synchronized with real-time updates from your workshops and institutional leads.</p>
        </motion.div>

        {/* Workshop Multi-Selector if applicable */}
        {workshops.length > 1 && (
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-4 flex items-center gap-2">
              <Layout className="w-3 h-3" /> Select Curriculum Focus
            </label>
            <div className="flex flex-wrap gap-3 bg-white/5 dark:bg-white/[0.02] p-2 rounded-[28px] border border-slate-200 dark:border-white/5 shadow-2xl">
              {workshops.map((w) => (
                <button
                  key={w._id}
                  onClick={() => setSelectedWorkshopId(w._id)}
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedWorkshopId === w._id ? 'bg-primary-light text-white shadow-xl shadow-primary-light/25' : 'hover:bg-slate-100 dark:hover:bg-white/5 opacity-50 hover:opacity-100'}`}
                >
                  {w.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Feed Container */}
      <div className="bg-white/40 dark:bg-card-dark/40 backdrop-blur-3xl border border-slate-200 dark:border-white/5 rounded-[56px] p-10 md:p-14 shadow-2xl relative overflow-hidden">
        {/* Decorative Sparkle */}
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Sparkles className="w-64 h-64" />
        </div>

        {selectedWorkshopId ? (
          <AnnouncementsCenter 
            workshopId={selectedWorkshopId} 
             // Logic for divisionId if student: filter by their enrolled division later
          />
        ) : (
          <div className="py-20 text-center space-y-4 opacity-30">
            <Bell className="w-16 h-16 mx-auto mb-6" />
            <p className="font-black text-2xl uppercase tracking-[0.3em]">No Active Intelligence</p>
            <p className="font-medium">You are not currently enrolled in any active knowledge paths.</p>
          </div>
        )}
      </div>
    </div>
  );
}
