import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell, Users, Loader2 } from 'lucide-react';
import AnnouncementsCenter from '../shared/announcements/AnnouncementsCenter';

export default function TeacherAnnouncements() {
  const { divisionId } = useParams();
  const navigate = useNavigate();
  const [division, setDivision] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDivision();
  }, [divisionId]);

  const fetchDivision = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/divisions/${divisionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDivision(response.data);
    } catch (err) {
      console.error(err);
      navigate('/teacher/portal');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center opacity-30"><Loader2 className="w-10 h-10 animate-spin text-primary-light" /></div>;

  return (
    <div className="space-y-10 pb-20 font-outfit">
      {/* Header */}
      <div className="flex items-center gap-6">
        <button 
          onClick={() => navigate('/teacher/portal')} 
          className="p-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl transition-all cursor-pointer group border border-slate-200 dark:border-white/5"
        >
          <ArrowLeft className="text-slate-600 dark:text-white" />
        </button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-light">Communication Suite</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter">News & Announcements</h1>
          <div className="flex items-center gap-4 mt-2 text-[10px] font-black uppercase opacity-40">
            <Users className="w-3.5 h-3.5" /> Scoped: {division?.name}
            <span>|</span>
            <Bell className="w-3.5 h-3.5" /> Global: {division?.workshopId?.title}
          </div>
        </div>
      </div>

      <AnnouncementsCenter 
        workshopId={division?.workshopId?._id || division?.workshopId} 
        divisionId={divisionId} 
      />
    </div>
  );
}
