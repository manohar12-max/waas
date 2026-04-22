import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { 
  Users, Star, MessageSquare, TrendingUp, Filter, Calendar, 
  ChevronRight, ArrowUpRight, Search, Loader2, MessageCircle, ThumbsUp, ThumbsDown
} from 'lucide-react';

import { motion } from 'framer-motion';

interface FeedbackAnalyticsProps {
  workshopId?: string;
  role: 'INSTRUCTOR' | 'COLLEGE_ADMIN' | 'SUPER_ADMIN';
}

export default function FeedbackAnalytics({ workshopId, role }: FeedbackAnalyticsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorkshop, setSelectedWorkshop] = useState(workshopId || 'ALL');
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [commentFilter, setCommentFilter] = useState<'ALL' | 'POSITIVE' | 'NEGATIVE'>('ALL');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('ALL');


  useEffect(() => {
    fetchWorkshops();
    if (selectedWorkshop !== 'ALL') {
      fetchAnalytics(selectedWorkshop);
    } else {
        setLoading(false);
    }
  }, [selectedWorkshop]);

  const fetchWorkshops = async () => {
      try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/workshops`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          setWorkshops(res.data);
          if (selectedWorkshop === 'ALL' && res.data.length > 0) {
              setSelectedWorkshop(res.data[0]._id);
          }
      } catch (err) {}
  };

  const fetchAnalytics = async (id: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/feedback/analytics/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
      
      // Fetch raw feedback for comments
      const feedbackRes = await axios.get(`${import.meta.env.VITE_API_URL}/feedback/workshop/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(feedbackRes.data);
    } catch (err) {

      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'];

  if (loading && !data) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary-light" />
      <p className="text-xs font-black uppercase tracking-widest opacity-40">Compiling Feedback Intelligence...</p>
    </div>
  );

  return (
    <div className="space-y-12">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-8 rounded-[32px] shadow-sm">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">Feedback <span className="text-primary-light">Analytics</span></h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Decision Support Dashboard</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-2 rounded-2xl border border-slate-200 dark:border-white/10">
          <Filter className="w-4 h-4 text-slate-400 ml-3" />
          <select 
            className="bg-transparent text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-white/60 outline-none pr-6 cursor-pointer"
            value={selectedWorkshop}
            onChange={(e) => setSelectedWorkshop(e.target.value)}
          >
            <option value="ALL">Select Workshop</option>
            {workshops.map(w => (
              <option key={w._id} value={w._id}>{w.title}</option>
            ))}
          </select>
        </div>
      </div>

      {data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Responses', value: data.summary.totalResponses, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
              { label: 'Overall Average', value: data.summary.avgOverall.toFixed(1), icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { label: 'Content Quality', value: data.summary.avgContentQuality.toFixed(1), icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Engagement', value: data.summary.avgEngagement.toFixed(1), icon: TrendingUp, color: 'text-rose-500', bg: 'bg-rose-500/10' },
            ].map((stat, i) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-8 rounded-[32px] space-y-4 shadow-sm"
              >
                <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Rating Distribution */}
            <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-8 rounded-[40px] space-y-8 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white/60 flex items-center gap-3 italic">
                <div className="w-2 h-8 bg-indigo-500 rounded-full" /> Rating Distribution
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.ratingDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#8884d815" />
                    <XAxis dataKey="_id" label={{ value: 'Stars', position: 'insideBottomRight', offset: -5 }} />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff' }}
                      itemStyle={{ color: '#818cf8' }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Session Trends */}
            <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-8 rounded-[40px] space-y-8 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white/60 flex items-center gap-3 italic">
                <div className="w-2 h-8 bg-emerald-500 rounded-full" /> Session-wise Trends
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.sessionStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#8884d815" />
                    <XAxis dataKey="sessionInfo.title" hide />
                    <YAxis domain={[0, 5]} />
                    <Tooltip 
                      labelClassName="text-slate-900"
                      formatter={(value: any) => [value.toFixed(1), 'Avg Rating']}
                    />
                    <Line type="monotone" dataKey="avgOverall" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981' }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-8 rounded-[40px] space-y-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white/60 flex items-center gap-3 italic">
                <div className="w-2 h-8 bg-primary-light rounded-full" /> Feedback Registry
              </h3>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                  <button 
                    onClick={() => setCommentFilter('ALL')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${commentFilter === 'ALL' ? 'bg-white dark:bg-white/10 text-primary-light shadow-sm' : 'text-slate-400'}`}
                  >All</button>
                  <button 
                    onClick={() => setCommentFilter('POSITIVE')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${commentFilter === 'POSITIVE' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}
                  >Positive</button>
                  <button 
                    onClick={() => setCommentFilter('NEGATIVE')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${commentFilter === 'NEGATIVE' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
                  >Negative</button>
                </div>

                <select 
                  className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/60 outline-none"
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                >
                  <option value="ALL">All Sessions</option>
                  {data.sessionStats.map((s: any) => (
                    <option key={s._id} value={s._id}>{s.sessionInfo?.title || 'Session'}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {comments
                 .filter(c => {
                    if (selectedSessionId !== 'ALL' && c.sessionId?.toString() !== selectedSessionId) return false;
                    if (commentFilter === 'POSITIVE' && c.ratings.overall < 4) return false;
                    if (commentFilter === 'NEGATIVE' && c.ratings.overall >= 3) return false;
                    return true;
                 })
                .map((comm, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-[28px] space-y-4 hover:border-primary-light/30 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center font-black text-xs">
                          {comm.submittedBy.userId?.name?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-white">{comm.submittedBy.userId?.name || 'Anonymous'}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{comm.submittedBy.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-2.5 h-2.5 ${s <= comm.ratings.overall ? 'text-amber-500 fill-current' : 'text-slate-200 dark:text-white/10'}`} />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                       {comm.comments.liked && (
                          <div className="space-y-1">
                             <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1"><ThumbsUp className="w-2.5 h-2.5" /> High Point</p>
                             <p className="text-sm text-slate-600 dark:text-white/60 leading-relaxed italic">"{comm.comments.liked}"</p>
                          </div>
                       )}
                       {comm.comments.improvement && (
                          <div className="space-y-1">
                             <p className="text-[8px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-1"><ThumbsDown className="w-2.5 h-2.5" /> Improvement</p>
                             <p className="text-sm text-slate-600 dark:text-white/60 leading-relaxed italic">"{comm.comments.improvement}"</p>
                          </div>
                       )}
                    </div>
                  </motion.div>
                ))}
              {comments.length === 0 && (
                 <div className="col-span-full py-20 bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-[32px] text-center opacity-30">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No detailed comments shared yet</p>
                 </div>
              )}
            </div>
          </div>

          {/* Session Breakdown List */}
          <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-[40px] overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white/60 italic">Session Specific Aggregates</h3>
              <span className="px-4 py-1.5 bg-slate-100 dark:bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400">{data.sessionStats.length} Sessions Captured</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left bg-slate-50 dark:bg-white/[0.01]">
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Session Title</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Day</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Responses</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Avg Rating</th>
                    <th className="px-8 py-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {data.sessionStats.map((session: any) => (
                    <tr key={session._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-800 dark:text-white">{session.sessionInfo?.title || 'Unknown Session'}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-black text-slate-400 italic">Day {session.sessionInfo?.dayNumber || '-'}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="font-mono text-xs font-bold text-slate-600 dark:text-white/60">{session.count}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`w-3 h-3 ${s <= Math.round(session.avgOverall) ? 'text-amber-500 fill-current' : 'text-slate-200 dark:text-white/10'}`} />
                            ))}
                          </div>
                          <span className="text-sm font-black text-slate-900 dark:text-white">{session.avgOverall.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="p-2 hover:bg-primary-light/10 text-primary-light rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[40px] opacity-30">
          <Search className="w-12 h-12 mb-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Select a workshop to view analytical data</p>
        </div>
      )}
    </div>
  );
}
