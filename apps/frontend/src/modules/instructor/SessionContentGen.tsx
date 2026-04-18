import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  FileUp, 
  BrainCircuit, 
  CheckCircle2, 
  Check,
  AlertCircle, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  X,
  PlusCircle,
  Trash2,
  Edit3
} from 'lucide-react';

interface Session {
  _id: string;
  title: string;
  rawContentUrl?: string;
  status: 'pending' | 'extracting' | 'generating' | 'generated' | 'approved' | 'failed';
  jobId?: string;
}

interface Day {
  _id: string;
  dayNumber: number;
  date: string;
  sessions: Session[];
}

export default function SessionContentGen({ workshopId }: { workshopId: string }) {
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [showAddDayModal, setShowAddDayModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState<{ dayId: string } | null>(null);
  const [showEditSessionModal, setShowEditSessionModal] = useState<{ session: Session } | null>(null);
  const [showContentModal, setShowContentModal] = useState<{ sessionId: string, title: string } | null>(null);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [newDay, setNewDay] = useState({ date: new Date().toISOString().split('T')[0], dayNumber: 1 });
  const [newSession, setNewSession] = useState({ title: '', rawContentUrl: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchStructure();
    const interval = setInterval(fetchStructure, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [workshopId]);

  const fetchStructure = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/workshop/${workshopId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDays(res.data);
      if (expandedDays.length === 0 && res.data.length > 0) {
        setExpandedDays([res.data[0]._id]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDay = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content/days`, {
        workshopId,
        ...newDay
      }, { headers: { Authorization: `Bearer ${token}` } });
      setShowAddDayModal(false);
      fetchStructure();
    } catch (err) {
      alert("Failed to add day");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSession = async () => {
    if (!showAddSessionModal) return;
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('workshopId', workshopId);
      formData.append('dayId', showAddSessionModal.dayId);
      formData.append('title', newSession.title);
      if (selectedFile) {
        formData.append('file', selectedFile);
      } else if (newSession.rawContentUrl) {
        formData.append('rawContentUrl', newSession.rawContentUrl);
      }

      await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setShowAddSessionModal(null);
      setNewSession({ title: '', rawContentUrl: '' });
      setSelectedFile(null);
      fetchStructure();
    } catch (err) {
      alert("Failed to add session");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/generate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStructure();
    } catch (err) {
      alert("Generation failed to start");
    }
  };

  const handleApprove = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStructure();
    } catch (err) {
      alert("Approval failed");
    }
  };

  const viewContent = async (sessionId: string, title: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/content`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGeneratedContent(res.data);
      setShowContentModal({ sessionId, title });
    } catch (err) {
      alert("Failed to fetch content");
    }
  };

  const handleEditSession = async () => {
    if (!showEditSessionModal) return;
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', newSession.title);
      if (selectedFile) {
        formData.append('file', selectedFile);
      } else if (newSession.rawContentUrl) {
        formData.append('rawContentUrl', newSession.rawContentUrl);
      }

      await axios.patch(`${import.meta.env.VITE_API_URL}/sessions-content/session/${showEditSessionModal.session._id}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setShowEditSessionModal(null);
      setNewSession({ title: '', rawContentUrl: '' });
      setSelectedFile(null);
      fetchStructure();
    } catch (err) {
      alert("Failed to update session");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to delete this session?")) return;
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content/session/${sessionId}/delete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStructure();
    } catch (err) {
      alert("Failed to delete session");
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => 
      prev.includes(dayId) ? prev.filter(id => id !== dayId) : [...prev, dayId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'extracting': return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_15px_-3px_rgba(6,182,212,0.2)]';
      case 'generating': return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]';
      case 'generated': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]';
      case 'approved': return 'text-teal-500 bg-teal-500/10 border-teal-500/30';
      case 'failed': return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
      default: return 'text-slate-400 bg-slate-400/5 border-slate-400/10';
    }
  };

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-primary-light" /></div>;

  return (
    <div className="space-y-8 font-outfit">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Learning Journey</h2>
          <p className="opacity-40 text-sm font-medium">Structure your workshop into days and sessions with AI-powered content.</p>
        </div>
        <button 
          onClick={() => setShowAddDayModal(true)}
          className="bg-primary-light hover:bg-primary-light/90 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all"
        >
          <PlusCircle className="w-4 h-4" /> Add Day
        </button>
      </div>

      <div className="grid gap-8">
        {days.map(day => (
          <div key={day._id} className="bg-white/[0.02] border border-white/5 rounded-[40px] transition-all">
            <div 
              onClick={() => toggleDay(day._id)}
              className="p-8 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-primary-light/10 text-primary-light rounded-2xl flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Day {day.dayNumber}</h3>
                  <p className="text-xs font-black opacity-30 uppercase tracking-widest">{new Date(day.date).toDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase opacity-20">{day.sessions.length} Sessions</span>
                {expandedDays.includes(day._id) ? <ChevronUp className="opacity-30" /> : <ChevronDown className="opacity-30" />}
              </div>
            </div>

            <AnimatePresence>
              {expandedDays.includes(day._id) && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }}
                  className="px-8 pb-10 space-y-6 overflow-visible"
                >
                  {day.sessions.map((session, idx) => (
                    <motion.div 
                      whileHover={{ scale: 1.02, x: 8, zIndex: 10 }}
                      key={session._id} 
                      onClick={() => (session.status === 'generated' || session.status === 'approved') && viewContent(session._id, session.title)}
                      className={`bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/10 p-8 rounded-[32px] flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-primary-light/50 transition-all shadow-xl relative ${['generated', 'approved'].includes(session.status) ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border ${['generated', 'approved'].includes(session.status) ? 'bg-primary-light text-white border-primary-light font-bold' : 'bg-primary-light/10 text-primary-light border-primary-light/20 font-black'}`}>
                            {['generated', 'approved'].includes(session.status) ? 'Topic Ready' : 'Session'}
                          </div>
                          <div className="text-3xl font-black opacity-20">{idx + 1}</div>
                        </div>
                        
                        <div className="h-10 w-[2px] bg-white/5 mx-2 hidden md:block" />

                        <div>
                          <h4 className="font-black text-xl tracking-tight group-hover:text-primary-light transition-colors">{session.title}</h4>
                          <div className="flex items-center gap-4 mt-2">
                            <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${getStatusColor(session.status)}`}>
                              {session.status === 'generated' ? 'AI Content Ready' : session.status}
                            </span>
                            {session.rawContentUrl && (
                               <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 max-w-[200px]">
                                 <FileUp className="w-3 h-3 opacity-30" />
                                 <span className="truncate text-[10px] opacity-30 font-bold uppercase tracking-tighter">{session.rawContentUrl.split('/').pop()}</span>
                               </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {['extracting', 'generating'].includes(session.status) && (
                          <div className={`p-3 rounded-xl animate-pulse flex items-center gap-2 ${getStatusColor(session.status)}`}>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">
                              {session.status === 'extracting' ? 'Reading material...' : 'AI Brainstorming...'}
                            </span>
                          </div>
                        )}

                        {(session.status === 'generated' || session.status === 'approved') && (
                          <div className="p-3 bg-primary-light/10 text-primary-light rounded-xl group-hover:bg-primary-light group-hover:text-white transition-all shadow-inner">
                            <BrainCircuit className="w-5 h-5 animate-pulse" />
                          </div>
                        )}

                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          {(session.status === 'pending' || session.status === 'failed') && (
                            <button 
                              onClick={() => handleGenerate(session._id)}
                              className="p-3 bg-primary-light/10 text-primary-light rounded-xl hover:bg-primary-light hover:text-white transition-all"
                              title="Generate Content"
                            >
                              <BrainCircuit className="w-5 h-5" />
                            </button>
                          )}

                          {session.status === 'generated' && (
                            <button 
                              onClick={() => handleApprove(session._id)}
                              className="p-3 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all"
                              title="Approve Content"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                          )}

                          {session.status === 'approved' && (
                             <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
                               <CheckCircle2 className="w-5 h-5" />
                             </div>
                          )}

                          <button 
                            onClick={() => {
                              setSelectedFile(null);
                              setNewSession({ title: session.title, rawContentUrl: session.rawContentUrl || '' });
                              setShowEditSessionModal({ session });
                            }}
                            disabled={saving}
                            className="p-4 bg-white/5 text-white/30 rounded-2xl hover:bg-white/10 hover:text-white transition-all"
                            title="Edit Session"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteSession(session._id)}
                            disabled={saving}
                            className="p-4 bg-red-500/5 text-red-500/30 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                            title="Delete Session"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  <button 
                    onClick={() => setShowAddSessionModal({ dayId: day._id })}
                    className="w-full py-4 border-2 border-dashed border-white/5 rounded-3xl text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 hover:border-primary-light/50 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Session to Day {day.dayNumber}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {days.length === 0 && (
          <div className="p-20 text-center bg-white/5 border border-dashed border-white/10 rounded-[48px]">
            <CalendarIcon className="w-12 h-12 opacity-10 mx-auto mb-4" />
            <h3 className="text-xl font-black opacity-30">No structure defined yet</h3>
            <p className="text-sm font-medium opacity-20 max-w-xs mx-auto mt-2">Start by adding your first day and defining the learning modules.</p>
          </div>
        )}
      </div>

      {/* Add Day Modal */}
      {showAddDayModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card-dark border border-white/10 p-10 rounded-[48px] max-w-md w-full shadow-2xl space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black">Add New Day</h3>
              <button onClick={() => setShowAddDayModal(false)} className="p-2 opacity-40 hover:opacity-100"><X /></button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">Day Number</label>
                <input 
                  type="number" 
                  value={newDay.dayNumber}
                  onChange={e => setNewDay({ ...newDay, dayNumber: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold focus:ring-2 focus:ring-primary-light/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">Date</label>
                <input 
                  type="date"
                  value={newDay.date}
                  onChange={e => setNewDay({ ...newDay, date: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold focus:ring-2 focus:ring-primary-light/50 transition-all"
                />
              </div>
              <button 
                onClick={handleAddDay}
                disabled={saving}
                className={`w-full py-5 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl transition-all ${saving ? 'bg-slate-500 cursor-not-allowed' : 'bg-primary-light hover:bg-primary-dark'}`}
              >
                {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Create Day Structure"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Session Modal */}
      {showAddSessionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card-dark border border-white/10 p-10 rounded-[48px] max-w-md w-full shadow-2xl space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black">Add New Session</h3>
              <button onClick={() => setShowAddSessionModal(null)} className="p-2 opacity-40 hover:opacity-100"><X /></button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">Session Title</label>
                <input 
                  placeholder="e.g. Introduction to Microservices"
                  value={newSession.title}
                  onChange={e => setNewSession({ ...newSession, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold focus:ring-2 focus:ring-primary-light/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase opacity-40 mb-3 block tracking-widest">Training Material (PDF/Slides)</label>
                <div 
                  className={`border-2 border-dashed rounded-[32px] p-8 transition-all flex flex-col items-center justify-center gap-4 group cursor-pointer ${selectedFile ? 'border-primary-light bg-primary-light/5' : 'border-white/10 hover:border-primary-light/40 hover:bg-white/5'}`}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input 
                    id="file-upload"
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.ppt,.pptx"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  {selectedFile ? (
                    <>
                      <div className="w-16 h-16 bg-primary-light/20 text-primary-light rounded-2xl flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-sm text-primary-light">{selectedFile.name}</p>
                        <p className="text-[10px] opacity-40 uppercase font-black mt-1">Ready for Deep Extraction</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-white/5 text-white/20 rounded-2xl flex items-center justify-center group-hover:text-primary-light group-hover:bg-primary-light/10 transition-all">
                        <FileUp className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-sm">Drop your material here</p>
                        <p className="text-[10px] opacity-40 uppercase font-black mt-1">Supports PDF, PPTX (Max 10MB)</p>
                      </div>
                    </>
                  )}
                </div>
                
                {!selectedFile && (
                  <div className="mt-4">
                    <p className="text-center text-[10px] font-black uppercase opacity-20 mb-3">Or use a remote URL</p>
                    <input 
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary-light/40"
                      placeholder="https://..."
                      value={newSession.rawContentUrl}
                      onChange={e => setNewSession({ ...newSession, rawContentUrl: e.target.value })}
                    />
                  </div>
                )}
              </div>
              <button 
                onClick={handleAddSession}
                disabled={saving}
                className={`w-full py-5 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl transition-all ${saving ? 'bg-slate-500 cursor-not-allowed' : 'bg-primary-light hover:bg-primary-dark'}`}
              >
                {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Add Session"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

        {/* Edit Session Modal */}
        <AnimatePresence>
          {showEditSessionModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-card-dark border border-white/10 w-full max-w-xl rounded-[40px] p-10 shadow-2xl overflow-hidden relative"
              >
                <button 
                  onClick={() => setShowEditSessionModal(null)}
                  className="absolute top-8 right-8 p-3 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 opacity-30" />
                </button>

                <div className="mb-10">
                  <h3 className="text-3xl font-black tracking-tight">Edit Session</h3>
                  <p className="text-[10px] font-black uppercase opacity-20 tracking-widest mt-2">Update title or training material</p>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase opacity-40 mb-3 block tracking-widest">Session Title</label>
                    <input 
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg font-bold focus:outline-none focus:border-primary-light"
                      placeholder="Session title"
                      value={newSession.title}
                      onChange={e => setNewSession({ ...newSession, title: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-black uppercase opacity-40 mb-3 block tracking-widest">Update Material (Optional)</label>
                    <div 
                      className={`border-2 border-dashed rounded-[32px] p-8 transition-all flex flex-col items-center justify-center gap-4 group cursor-pointer ${selectedFile ? 'border-primary-light bg-primary-light/5' : 'border-white/10 hover:border-primary-light/40 hover:bg-white/5'}`}
                      onClick={() => document.getElementById('file-edit-upload')?.click()}
                    >
                      <input 
                        id="file-edit-upload"
                        type="file" 
                        className="hidden" 
                        accept=".pdf,.ppt,.pptx"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      {selectedFile ? (
                        <>
                          <div className="w-16 h-16 bg-primary-light/20 text-primary-light rounded-2xl flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8" />
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-sm text-primary-light">{selectedFile.name}</p>
                            <p className="text-[10px] opacity-40 uppercase font-black mt-1">Material will be replaced</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-white/5 text-white/20 rounded-2xl flex items-center justify-center group-hover:text-primary-light group-hover:bg-primary-light/10 transition-all">
                            <FileUp className="w-8 h-8" />
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-sm">Upload new version</p>
                            <p className="text-[10px] opacity-40 uppercase font-black mt-1">or leave empty to keep current</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-relaxed text-amber-200/60 font-medium">
                      Note: If you update the material, the session status will reset to <span className="text-amber-500 font-bold">Pending</span>. You will need to manually click Generate to re-process the AI content.
                    </p>
                  </div>

                  <button 
                    onClick={handleEditSession}
                    disabled={saving}
                    className={`w-full py-6 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl transition-all ${saving ? 'bg-slate-500 cursor-not-allowed' : 'bg-primary-light hover:bg-primary-dark'}`}
                  >
                    {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Save Changes"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Content View Modal */}
      {showContentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card-dark border border-white/10 p-12 rounded-[56px] max-w-4xl w-full max-h-[80vh] overflow-y-auto shadow-2xl space-y-10 custom-scrollbar">
            <div className="flex justify-between items-center sticky top-0 bg-card-dark py-4 z-10 border-b border-white/5">
              <div>
                <h3 className="text-3xl font-black tracking-tight">{showContentModal.title}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary-light mt-1">Generated AI Insights</p>
              </div>
              <button onClick={() => setShowContentModal(null)} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"><X /></button>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="text-primary-light w-5 h-5" />
                  <h4 className="text-xl font-black">Interactive MCQs</h4>
                </div>
                <div className="space-y-4">
                  {generatedContent?.mcqs?.map((mcq: any, i: number) => (
                    <div key={i} className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl space-y-4">
                      <p className="font-bold leading-relaxed">{i+1}. {mcq.question}</p>
                      <div className="grid grid-cols-1 gap-2">
                        {mcq.options.map((opt: string, oi: number) => (
                          <div key={oi} className={`px-4 py-3 rounded-xl text-sm font-medium border ${oi === mcq.correctAnswer ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-white/5 border-white/5 opacity-60'}`}>
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <FileUp className="text-indigo-400 w-5 h-5" />
                  <h4 className="text-xl font-black">Structured Materials</h4>
                </div>
                <div className="space-y-4">
                   {generatedContent?.materials?.map((mat: any, i: number) => (
                      <div key={i} className="p-8 bg-white/[0.03] border border-white/5 rounded-[32px] space-y-4">
                         <h5 className="font-black text-indigo-400 uppercase tracking-widest text-[10px]">{mat.title}</h5>
                         {mat.content && <p className="text-sm opacity-60 leading-relaxed font-medium">{mat.content}</p>}
                         {mat.links && (
                           <ul className="space-y-2">
                             {mat.links.map((link: string, li: number) => (
                               <li key={li} className="text-xs text-primary-light font-bold hover:underline cursor-pointer flex items-center gap-2">
                                 <Plus className="w-3 h-3" /> {link}
                               </li>
                             ))}
                           </ul>
                         )}
                      </div>
                   ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-8 border-t border-white/5">
               <button 
                onClick={() => setShowContentModal(null)}
                className="px-10 py-5 bg-white text-black rounded-[24px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-200 transition-all"
               >
                 Close Insights
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
