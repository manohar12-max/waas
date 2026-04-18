import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Calendar as CalendarIcon,
  FileUp,
  Sparkles,
  CheckCircle2,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  X,
  PlusCircle,
  Trash2,
  Edit3,
  Video,
  Layout,

  Link as LinkIcon,
  BrainCircuit,
  ShieldCheck
} from 'lucide-react';
import UniversalModal from '../../components/UniversalModal';

interface Material {
  _id: string;
  title: string;
  filePath: string;
  status: 'pending' | 'extracting' | 'generating' | 'generated' | 'approved' | 'failed';
  isPublished: boolean;
  jobId?: string;
  updatedAt: string;
}

interface Session {
  _id: string;
  title: string;
  rawContentUrl?: string;
  filePath?: string;
  status: 'pending' | 'extracting' | 'generating' | 'generated' | 'approved' | 'failed';
  jobId?: string;
  isMaterialPublished: boolean;
  isContentPublished: boolean;
  materials: Material[];
  aiSessionId?: string;
  aiStage: 'none' | 'stage1' | 'stage2' | 'final' | 'completed';
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
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [activeModalTab, setActiveModalTab] = useState<'UPLOADED' | 'AI'>('UPLOADED');
  const [saving, setSaving] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);

  const [newDay, setNewDay] = useState({ date: new Date().toISOString().split('T')[0], dayNumber: 1 });
  const [newSession, setNewSession] = useState({ title: '', rawContentUrl: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState<any>(null);
  const [modalStage, setModalStage] = useState<'FORM' | 'AI_REVIEW'>('FORM');
  const [currentEditingSession, setCurrentEditingSession] = useState<Session | null>(null);

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

  const handleGenerate = async (sessionId: string, materialId?: string) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/generate`, { materialId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStructure();
      // If we are in the edit modal, transition to review
      if (showEditSessionModal) {
        setModalStage('AI_REVIEW');
      }
    } catch (err) {
      alert("Generation failed to start");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (sessionId: string, materialId?: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/approve`, { materialId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStructure();
    } catch (err) {
      alert("Approval failed");
    }
  };

  const handleReview = async (sessionId: string, stage: 1 | 2, action: 'continue' | 'edit', editedData?: any) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/review`, {
        stage,
        action,
        editedData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data && res.data.data) {
        setGeneratedContent(res.data.data);
        setEditedContent(res.data.data);
      }
      fetchStructure();
      // Fetch latest session status to see if aiStage updated
      const sessionRes = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentEditingSession(sessionRes.data);
    } catch (err) {
      alert(`Review stage ${stage} failed`);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async (sessionId: string) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/final-output`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGeneratedContent(res.data);
      setEditedContent(res.data);
      fetchStructure();
      // On finalize, close modal
      setShowEditSessionModal(null);
      setModalStage('FORM');
    } catch (err) {
      alert("Finalization failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAddExtraMaterial = async () => {
    if (!activeSession || !selectedFile) return;
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', selectedFile.name);

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content/session/${activeSession._id}/add-material`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setActiveSession(res.data);
      setShowAddMaterialModal(false);
      setSelectedFile(null);
      fetchStructure();
    } catch (err) {
      alert("Failed to add material");
    } finally {
      setSaving(false);
    }
  };

  const viewContent = async (session: Session, material?: Material) => {
    try {
      const sessionId = typeof (session._id as any) === 'object' ? (session._id as any)._id?.toString() || (session._id as any).toString() : session._id;
      const materialId = material?._id;

      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/content`, {
        params: { materialId },
        headers: { Authorization: `Bearer ${token}` }
      });
      setGeneratedContent(res.data);
      setEditedContent(res.data);
      setActiveSession(session);
      setActiveMaterial(material || null);
      setActiveModalTab(res.data ? 'AI' : 'UPLOADED');
    } catch (err) {
      alert("Failed to fetch content");
    }
  };

  const closeDetailView = () => {
    setActiveSession(null);
    setGeneratedContent(null);
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

      const res = await axios.patch(`${import.meta.env.VITE_API_URL}/sessions-content/session/${showEditSessionModal.session._id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      fetchStructure();
      if (selectedFile) {
        // Start AI Generation immediately if a file was uploaded
        setCurrentEditingSession(res.data);
        handleGenerate(showEditSessionModal.session._id);
      } else {
        setShowEditSessionModal(null);
        setNewSession({ title: '', rawContentUrl: '' });
        setSelectedFile(null);
      }
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

  const handlePublishMaterial = async (sessionId: string, materialId?: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.patch(`${import.meta.env.VITE_API_URL}/sessions-content/session/${sessionId}/publish-material`, { materialId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStructure();
      if (activeSession?._id === sessionId) {
        setActiveSession(res.data);
      }
    } catch (err) {
      alert("Material publishing failed");
    }
  };

  const handlePublishContent = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.patch(`${import.meta.env.VITE_API_URL}/sessions-content/session/${sessionId}/publish-content`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStructure();
      if (activeSession?._id === sessionId) {
        setActiveSession(res.data);
      }
    } catch (err) {
      alert("Content publishing failed");
    }
  };

  const getMaterialUrl = (mat: { filePath?: string, rawContentUrl?: string }) => {
    if (mat.filePath) {
      const path = mat.filePath.replace(/\\/g, '/');
      return `${import.meta.env.VITE_API_URL.replace('/api', '')}/${path}`;
    }
    return mat.rawContentUrl || '#';
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
    <div className="space-y-12 font-outfit">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">Learning Journey</h2>
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
          <div key={day._id} className="bg-slate-50 dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-[40px] transition-all">
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
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">{new Date(day.date).toDateString()}</p>
                    {day.sessions && day.sessions.length > 0 && (
                      <p className="text-[10px] font-black text-primary-light/60 truncate max-w-[300px]">
                        {day.sessions.map(s => s.title).join(' • ')}
                      </p>
                    )}
                  </div>
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
                      whileHover={{ scale: 1.01, x: 4 }}
                      key={session._id}
                      onClick={() => viewContent(session)}
                      className={`bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/10 p-8 rounded-[32px] flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-primary-light/50 transition-all shadow-xl relative cursor-pointer`}
                    >
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border ${['generated', 'approved'].includes(session.status) ? 'bg-primary-light text-white border-primary-light font-bold' : 'bg-primary-light/10 text-primary-light border-primary-light/20 font-black'}`}>
                            Session {idx + 1}
                          </div>
                        </div>

                        <div className="h-10 w-[2px] bg-white/5 mx-2 hidden md:block" />

                        <div>
                          <h4 className="font-black text-xl tracking-tight group-hover:text-primary-light transition-colors">{session.title}</h4>
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${session.isMaterialPublished ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-slate-500/10 border-slate-500/20 text-slate-400 opacity-40'}`}>
                              <span className="text-[8px] font-black uppercase tracking-widest">Material: {session.isMaterialPublished ? 'Published' : 'Hidden'}</span>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${session.isContentPublished ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500' : 'bg-slate-500/10 border-slate-500/20 text-slate-400 opacity-40'}`}>
                              <span className="text-[8px] font-black uppercase tracking-widest">AI Content: {session.isContentPublished ? 'Published' : 'Hidden'}</span>
                            </div>
                            {session.aiStage && session.aiStage !== 'none' && session.aiStage !== 'completed' && (
                              <div className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse border border-indigo-400 shadow-[0_0_10px_rgba(79,70,229,0.4)]">
                                {session.aiStage.toUpperCase()} IN PROGRESS
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
                            <Sparkles className="w-5 h-5 animate-pulse" />
                          </div>
                        )}

                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          {(session.status === 'pending' || session.status === 'failed') && (
                            <button
                              onClick={() => handleGenerate(session._id)}
                              className="p-3 bg-primary-light/10 text-primary-light rounded-xl hover:bg-primary-light hover:text-white transition-all"
                              title="Generate Content"
                            >
                              <Sparkles className="w-5 h-5" />
                            </button>
                          )}

                          {session.aiStage !== 'none' && session.aiStage !== 'completed' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); viewContent(session); }}
                              className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl hover:bg-indigo-500 hover:text-white transition-all animate-pulse"
                              title="Review AI Stages"
                            >
                              <BrainCircuit className="w-5 h-5" />
                            </button>
                          )}

                          {session.aiStage === 'completed' && (
                            <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                          )}

                          <button
                            onClick={(e) => { e.stopPropagation(); viewContent(session); }}
                            className="px-6 py-3 bg-primary-light text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary-light/20 cursor-pointer flex items-center gap-2 group/btn"
                          >
                            Manage Content
                            <ChevronLeft className="w-3 h-3 rotate-180 group-hover:translate-x-1 transition-transform" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                              setNewSession({ title: session.title, rawContentUrl: session.rawContentUrl || '' });
                              setShowEditSessionModal({ session });
                            }}
                            disabled={saving}
                            className="p-3 bg-white/5 text-white/30 rounded-xl hover:bg-white/10 hover:text-white transition-all underline-none border-none cursor-pointer"
                            title="Edit Title"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSession(session._id); }}
                            disabled={saving}
                            className="p-3 bg-red-500/5 text-red-500/30 rounded-xl hover:bg-red-500 hover:text-white transition-all border-none cursor-pointer"
                            title="Delete Session"
                          >
                            <Trash2 className="w-4 h-4" />
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
      <UniversalModal
        isOpen={showAddDayModal}
        onClose={() => setShowAddDayModal(false)}
        title="Add New Day"
        description="Configure workshop day structure"
        icon={<CalendarIcon />}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">Day Number</label>
            <input
              type="number"
              value={newDay.dayNumber}
              onChange={e => setNewDay({ ...newDay, dayNumber: parseInt(e.target.value) })}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl font-bold focus:ring-2 focus:ring-primary-light/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">Date</label>
            <input
              type="date"
              value={newDay.date}
              onChange={e => setNewDay({ ...newDay, date: e.target.value })}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl font-bold focus:ring-2 focus:ring-primary-light/50 transition-all"
            />
          </div>
          <button
            onClick={handleAddDay}
            disabled={saving}
            className={`w-full py-5 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all ${saving ? 'bg-slate-500 cursor-not-allowed' : 'bg-primary-light hover:bg-primary-dark shadow-primary-light/20'}`}
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Create Day Structure"}
          </button>
        </div>
      </UniversalModal>

      {/* Add Session Modal */}
      <UniversalModal
        isOpen={!!showAddSessionModal}
        onClose={() => setShowAddSessionModal(null)}
        title="Add New Session"
        description="Upload core training material"
        icon={<Plus />}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">Session Title</label>
            <input
              placeholder="e.g. Introduction to Microservices"
              value={newSession.title}
              onChange={e => setNewSession({ ...newSession, title: e.target.value })}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl font-bold focus:ring-2 focus:ring-primary-light/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase opacity-40 mb-3 block tracking-widest">Training Material (PDF/Slides)</label>
            <div
              className={`border-2 border-dashed rounded-[32px] p-8 transition-all flex flex-col items-center justify-center gap-4 group cursor-pointer ${selectedFile ? 'border-primary-light bg-primary-light/5' : 'border-slate-200 dark:border-white/10 hover:border-primary-light/40 hover:bg-slate-50 dark:hover:bg-white/5'}`}
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
                  <div className="w-14 h-14 bg-primary-light/20 text-primary-light rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm text-primary-light truncate max-w-[200px]">{selectedFile.name}</p>
                    <p className="text-[10px] opacity-40 uppercase font-black mt-1">Ready for Deep Extraction</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-xl flex items-center justify-center group-hover:text-primary-light group-hover:bg-primary-light/10 transition-all">
                    <FileUp className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm text-slate-600 dark:text-white/60">Drop your material here</p>
                    <p className="text-[10px] opacity-30 uppercase font-black mt-1">PDF, PPTX (Max 10MB)</p>
                  </div>
                </>
              )}
            </div>

            {!selectedFile && (
              <div className="mt-4">
                <p className="text-center text-[10px] font-black uppercase opacity-20 mb-3">Or use a remote URL</p>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary-light/40"
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
            className={`w-full py-5 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all ${saving ? 'bg-slate-500 cursor-not-allowed' : 'bg-primary-light hover:bg-primary-dark shadow-primary-light/20'}`}
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Add Session"}
          </button>
        </div>
      </UniversalModal>

      <UniversalModal
        isOpen={!!showEditSessionModal}
        onClose={() => {
          setShowEditSessionModal(null);
          setModalStage('FORM');
          setCurrentEditingSession(null);
        }}
        title={modalStage === 'FORM' ? "Edit Session" : "AI Review Pipeline"}
        description={modalStage === 'FORM' ? "Update title or training material" : "Neural validation of curriculum"}
        icon={modalStage === 'FORM' ? <Edit3 /> : <Sparkles />}
      >
        <div className="max-h-[70vh] overflow-y-auto px-2">
          {modalStage === 'FORM' ? (
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase opacity-40 mb-3 block tracking-widest">Session Title</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 text-lg font-bold focus:outline-none focus:border-primary-light"
                  placeholder="Session title"
                  value={newSession.title}
                  onChange={e => setNewSession({ ...newSession, title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase opacity-40 mb-3 block tracking-widest">Update Material (Optional)</label>
                <div
                  className={`border-2 border-dashed rounded-[32px] p-8 transition-all flex flex-col items-center justify-center gap-4 group cursor-pointer ${selectedFile ? 'border-primary-light bg-primary-light/5' : 'border-slate-200 dark:border-white/10 hover:border-primary-light/40 hover:bg-slate-50 dark:hover:bg-white/5'}`}
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
                      <div className="w-14 h-14 bg-primary-light/20 text-primary-light rounded-xl flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-sm text-primary-light truncate max-w-[200px]">{selectedFile.name}</p>
                        <p className="text-[10px] opacity-40 uppercase font-black mt-1">AI Flow will start after save</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-xl flex items-center justify-center group-hover:text-primary-light group-hover:bg-primary-light/10 transition-all">
                        <FileUp className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-sm text-slate-600 dark:text-white/60">Upload new version</p>
                        <p className="text-[10px] opacity-40 uppercase font-black mt-1">AI features will re-activate</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={handleEditSession}
                disabled={saving}
                className={`w-full py-6 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all ${saving ? 'bg-slate-500 cursor-not-allowed' : 'bg-primary-light hover:bg-primary-dark shadow-primary-light/20'}`}
              >
                {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Review AI Content"}
              </button>
            </div>
          ) : (
            <div className="space-y-12 pb-10">
              {/* AI REVIEW CONTENT (Condensed for Modal) */}
              {currentEditingSession && (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between p-6 bg-indigo-600 rounded-3xl text-white shadow-xl">
                    <div className="flex items-center gap-4">
                      <Sparkles className="w-6 h-6" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{(currentEditingSession.aiStage || 'AI')?.toUpperCase()} REQUIRED</p>
                        <h5 className="font-bold text-sm">Synchronized Review</h5>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(currentEditingSession.aiStage === 'stage1' || currentEditingSession.aiStage === 'stage2') && (
                        <>
                          <button
                            onClick={() => {
                              if (editMode) {
                                handleReview(currentEditingSession._id, currentEditingSession.aiStage === 'stage1' ? 1 : 2, 'edit', editedContent);
                                setEditMode(false);
                              } else {
                                handleReview(currentEditingSession._id, currentEditingSession.aiStage === 'stage1' ? 1 : 2, 'continue');
                              }
                            }}
                            disabled={saving}
                            className="px-4 py-2 bg-white text-indigo-600 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center gap-2"
                          >
                            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                            {editMode ? 'Save Edits' : 'Next Step'}
                          </button>
                          <button
                            onClick={() => setEditMode(!editMode)}
                            className={`p-2 rounded-xl transition-all border ${editMode ? 'bg-amber-500 text-white border-amber-400' : 'bg-white/10 text-white border-white/20'}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {currentEditingSession.aiStage === 'final' && (
                        <button
                          onClick={() => handleFinalize(currentEditingSession._id)}
                          disabled={saving}
                          className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2"
                        >
                          Retrieve Package
                        </button>
                      )}
                    </div>
                  </div>

                  {/* EDITABLE SECTIONS */}
                  <div className="space-y-8">
                    {editedContent?.mcqs && (
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">Skill Checkpoints</p>
                        {editedContent.mcqs.map((mcq: any, mi: number) => (
                          <div key={mi} className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                            {editMode ? (
                              <textarea
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none"
                                value={mcq.question}
                                onChange={(e) => {
                                  const n = [...editedContent.mcqs];
                                  n[mi].question = e.target.value;
                                  setEditedContent({ ...editedContent, mcqs: n });
                                }}
                              />
                            ) : (
                              <p className="text-sm font-bold">{mcq.question}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {editedContent?.materials && (
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">Core Insights</p>
                        {editedContent.materials.map((mat: any, mi: number) => (
                          <div key={mi} className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                            {editMode ? (
                              <textarea
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none h-32"
                                value={mat.content}
                                onChange={(e) => {
                                  const n = [...editedContent.materials];
                                  n[mi].content = e.target.value;
                                  setEditedContent({ ...editedContent, materials: n });
                                }}
                              />
                            ) : (
                              <p className="text-sm opacity-60 leading-relaxed line-clamp-3">{mat.content}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </UniversalModal>

      {/* Add Material Modal */}
      <UniversalModal
        isOpen={showAddMaterialModal}
        onClose={() => setShowAddMaterialModal(false)}
        title="Add Material"
        description="Upload additional asset to session"
        icon={<PlusCircle />}
      >
        <div className="space-y-8">
          <div
            className={`group relative border-2 border-dashed rounded-[40px] p-12 transition-all flex flex-col items-center text-center space-y-4 cursor-pointer ${selectedFile ? 'border-primary-light bg-primary-light/5' : 'border-slate-200 dark:border-white/10 hover:border-primary-light/50 hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}
            onClick={() => document.getElementById('extra-file-upload')?.click()}
          >
            <input
              id="extra-file-upload"
              type="file"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all ${selectedFile ? 'bg-primary-light/20 text-primary-light' : 'bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:scale-110'}`}>
              <FileUp className="w-10 h-10" />
            </div>
            <div>
              <p className="font-black text-lg text-slate-800 dark:text-white">{selectedFile ? selectedFile.name : 'Select PDF or Presentation'}</p>
              <p className="text-[10px] uppercase font-black tracking-widest opacity-30 mt-1">{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Up to 50MB supported'}</p>
            </div>
          </div>

          <button
            onClick={handleAddExtraMaterial}
            disabled={saving || !selectedFile}
            className="w-full h-20 rounded-[24px] bg-primary-light shadow-2xl shadow-primary-light/30 text-white font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-4"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            {saving ? 'Uploading...' : 'Confirm Upload'}
          </button>
        </div>
      </UniversalModal>

    </div>
  );
}
