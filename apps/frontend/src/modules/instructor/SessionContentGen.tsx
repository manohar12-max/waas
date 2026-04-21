import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Calendar as CalendarIcon, FileUp, BrainCircuit, CheckCircle2, Check,
  AlertCircle, Loader2, ChevronDown, ChevronUp, X, PlusCircle, Trash2, Edit3,
  BookOpen, Layout, ExternalLink, ChevronRight, Maximize2, FileText, Play, Download
} from 'lucide-react';
import { SlideViewer, UnitAssetsItem } from './components/SlideViewer';
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import UniversalModal from '../../components/UniversalModal';
import 'react-slideshow-image/dist/styles.css';

interface SessionMaterial {
  _id?: string;
  title: string;
  url: string;
  type: string;
  isSourceForAI: boolean;
  isPublished?: boolean;
}

interface Session {
  _id: string;
  title: string;
  materials: SessionMaterial[];
  status: 'pending' | 'extracting' | 'generating' | 'generated' | 'approved' | 'failed';
  jobId?: string;
  aiWorkflowStage?: 'Draft' | 'Stage1' | 'Stage2' | 'Finalized';
}

interface Day {
  _id: string;
  dayNumber: number;
  date: string;
  sessions: Session[];
}

export default function SessionContentGen({ workshopId }: { workshopId: string }) {
  const navigate = useNavigate();
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [showAddDayModal, setShowAddDayModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState<{ dayId: string } | null>(null);
  const [showEditSessionModal, setShowEditSessionModal] = useState<{ session: Session; workshopId: string } | null>(null);
  const [activeSlideshow, setActiveSlideshow] = useState<UnitAssetsItem[] | null>(null);
  const [activeDoc, setActiveDoc] = useState<{ title: string, url: string, type: string } | null>(null);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [newDay, setNewDay] = useState({ date: new Date().toISOString().split('T')[0], dayNumber: 1 });
  const [newSession, setNewSession] = useState({ title: '' });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSourceForAI, setIsSourceForAI] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState<{ session: Session; content: any } | null>(null);

  useEffect(() => {
    fetchStructure();
    const interval = setInterval(fetchStructure, 10000);
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
      await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content/days`, { workshopId, ...newDay }, { headers: { Authorization: `Bearer ${token}` } });
      setShowAddDayModal(false);
      fetchStructure();
    } catch (err) { alert("Failed to add day"); } finally { setSaving(false); }
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
      formData.append('isSourceForAI', isSourceForAI.toString());
      selectedFiles.forEach(file => formData.append('files', file));
      await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content`, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      setShowAddSessionModal(null);
      setNewSession({ title: '' });
      setSelectedFiles([]);
      setIsSourceForAI(false);
      fetchStructure();
    } catch (err) { alert("Failed to add session"); } finally { setSaving(false); }
  };

  const handleGenerate = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/generate`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchStructure();
    } catch (err) { alert("Generation failed"); }
  };

  const handleOpenReview = async (session: Session) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/${session._id}/content`, { headers: { Authorization: `Bearer ${token}` } });
      setShowReviewModal({ session, content: res.data });
    } catch (err) { alert("Failed to load review content"); }
  };

  const handleFinalizeReview = async (action: 'continue' | 'edit') => {
    if (!showReviewModal) return;
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const stage = showReviewModal.session.aiWorkflowStage === 'Stage1' ? '1' : '2';
      await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content/${showReviewModal.session._id}/review-stage-${stage}`, {
        action,
        edited_data: showReviewModal.content // Send current state (even if edited)
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setShowReviewModal(null);
      fetchStructure();
    } catch (err) { alert("Review submission failed"); } finally { setSaving(false); }
  };

  const handleApprove = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchStructure();
    } catch (err) { alert("Approval failed"); }
  };

  const handleTogglePublish = async (sessionId: string, url: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/materials/toggle-publish`, { url }, { headers: { Authorization: `Bearer ${token}` } });
      fetchStructure();
    } catch (err) { alert("Failed to toggle publish status"); }
  };

  const handleEditSession = async () => {
    if (!showEditSessionModal) return;
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', newSession.title);
      formData.append('isSourceForAI', isSourceForAI.toString());
      selectedFiles.forEach(file => formData.append('files', file));
      await axios.patch(`${import.meta.env.VITE_API_URL}/sessions-content/session/${showEditSessionModal.session._id}`, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      setShowEditSessionModal(null);
      setIsSourceForAI(false);
      fetchStructure();
    } catch (err) { alert("Update failed"); } finally { setSaving(false); }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm("Delete session?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content/session/${sessionId}/delete`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchStructure();
    } catch (err) { alert("Delete failed"); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'extracting': return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30';
      case 'generating': return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30';
      case 'generated': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
      case 'approved': return 'text-teal-500 bg-teal-500/10 border-teal-500/30';
      case 'failed': return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
      default: return 'text-slate-400 bg-slate-400/5 border-slate-400/10';
    }
  };

  const getWorkflowBadge = (session: Session) => {
    if (session.status !== 'generated') return null;
    if (session.aiWorkflowStage === 'Stage1') return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 px-3 py-1 rounded-full text-[8px] font-black uppercase">Review Stage 1</span>;
    if (session.aiWorkflowStage === 'Stage2') return <span className="bg-orange-500/10 text-orange-500 border border-orange-500/30 px-3 py-1 rounded-full text-[8px] font-black uppercase">Final Review</span>;
    if (session.aiWorkflowStage === 'Finalized') return <span className="bg-teal-500/10 text-teal-500 border border-teal-500/30 px-3 py-1 rounded-full text-[8px] font-black uppercase">Ready to Publish</span>;
    return null;
  };

  return (
    <div className="space-y-8 font-outfit text-slate-900 dark:text-white">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black tracking-tight">Learning Journey</h2>
        <button onClick={() => setShowAddDayModal(true)} className="bg-primary-light text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-lg flex items-center gap-2 tracking-widest hover:brightness-110"><PlusCircle className="w-4 h-4" /> Add Day</button>
      </div>

      <div className="grid gap-8">
        {days.map(day => (
          <div key={day._id} className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-[40px] overflow-hidden">
            <div onClick={() => setExpandedDays(prev => prev.includes(day._id) ? prev.filter(id => id !== day._id) : [...prev, day._id])} className="p-8 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-primary-light/10 text-primary-light rounded-2xl flex items-center justify-center"><CalendarIcon className="w-6 h-6" /></div>
                <div><h3 className="text-xl font-black">Day {day.dayNumber}</h3><p className="text-xs font-black opacity-40 uppercase">{new Date(day.date).toDateString()}</p></div>
              </div>
              {expandedDays.includes(day._id) ? <ChevronUp className="opacity-30" /> : <ChevronDown className="opacity-30" />}
            </div>
            <AnimatePresence>
              {expandedDays.includes(day._id) && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-8 pb-10 space-y-6">
                  {day.sessions.map((session, idx) => (
                    <motion.div 
                      key={session._id} 
                      whileHover={{ scale: 1.01, x: 4 }} 
                      className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 p-8 rounded-[32px] flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-primary-light/50 transition-all shadow-sm dark:shadow-none"
                    >
                      <div className="flex items-center gap-6">
                        <div className="text-3xl font-black opacity-20">{idx + 1}</div>
                        <div>
                          <h4 className="font-black text-xl group-hover:text-primary-light transition-colors">{session.title}</h4>
                          <div className="flex flex-wrap items-center gap-4 mt-2">
                             <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border flex items-center gap-2 ${getStatusColor(session.status)}`}>
                                {session.status === 'generating' && <Loader2 className="w-3 h-3 animate-spin" />}
                                {session.status === 'generating' ? 'Still Processing...' : session.status}
                             </span>
                             {getWorkflowBadge(session)}
                             {session.materials?.length > 0 && (
                                <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">
                                  {session.materials.length} Materials Attached
                                </span>
                             )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => navigate(`/instructor/workshop/${workshopId}/session/${session._id}/materials`)}
                          className="px-6 py-4 bg-primary-light text-white rounded-2xl hover:bg-primary-dark hover:scale-105 transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-primary-light/20"
                        >
                          <BookOpen className="w-4 h-4" /> Manage Content
                        </button>

                        <button onClick={() => { setNewSession({ title: session.title }); setShowEditSessionModal({ session, workshopId }); }} className="p-4 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30 rounded-2xl hover:text-primary-light dark:hover:text-white transition-colors" title="Edit Title"><Edit3 className="w-5 h-5" /></button>
                        <button onClick={() => handleDeleteSession(session._id)} className="p-4 bg-red-500/5 text-red-500/30 rounded-2xl hover:bg-red-500 hover:text-white transition-all" title="Delete Session"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </motion.div>
                  ))}
                  <button onClick={() => setShowAddSessionModal({ dayId: day._id })} className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl text-[10px] font-black uppercase opacity-40 hover:opacity-100 hover:border-primary-light transition-all tracking-widest text-slate-500 dark:text-white">+ Add Session</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Add/Edit Modals */}
      <UniversalModal
        isOpen={showAddDayModal}
        onClose={() => setShowAddDayModal(false)}
        title="Add New Day"
        description="Schedule a new learning milestone"
        maxWidth="max-w-md"
        icon={<CalendarIcon />}
      >
        <div className="space-y-6">
          <input type="number" value={newDay.dayNumber} onChange={e => setNewDay({ ...newDay, dayNumber: parseInt(e.target.value) })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl font-bold text-slate-900 dark:text-white" />
          <input type="date" value={newDay.date} onChange={e => setNewDay({ ...newDay, date: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl font-bold text-slate-900 dark:text-white" />
          <button onClick={handleAddDay} className="w-full py-5 bg-primary-light text-white rounded-3xl font-black uppercase shadow-xl hover:brightness-110 active:scale-95 transition-all">Create Day</button>
        </div>
      </UniversalModal>

      <UniversalModal
        isOpen={!!showAddSessionModal}
        onClose={() => setShowAddSessionModal(null)}
        title="New Session"
        description="Attach study materials and AI sources"
        maxWidth="max-w-md"
        icon={<PlusCircle />}
      >
        <div className="space-y-6">
          <input placeholder="Session Title" value={newSession.title} onChange={e => setNewSession({ ...newSession, title: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl font-bold text-slate-900 dark:text-white" />
          <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[32px] p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary-light transition-all" onClick={() => document.getElementById('f-up')?.click()}>
            <input id="f-up" type="file" multiple className="hidden" onChange={e => setSelectedFiles(Array.from(e.target.files || []))} />
            <FileUp className={`w-8 h-8 transition-all ${selectedFiles.length > 0 ? 'text-primary-light opacity-100' : 'opacity-20 text-slate-900 dark:text-white'}`} />
            <p className="font-bold text-sm text-slate-500 dark:text-white text-center px-4">
               {selectedFiles.length > 0 ? (
                 <span className="text-primary-light block">
                   {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} files selected`}
                 </span>
               ) : "Drop Source Materials"}
            </p>
            {selectedFiles.length > 0 && <p className="text-[10px] font-black uppercase opacity-20 tracking-widest">Multi-File Supported</p>}
          </div>

          <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
             <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${isSourceForAI ? 'bg-primary-light/10 text-primary-light' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}>
                   <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                   <p className="text-xs font-black uppercase text-slate-900 dark:text-white">Generate Content</p>
                   <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Use as AI Source</p>
                </div>
             </div>
             <button 
               onClick={() => setIsSourceForAI(!isSourceForAI)}
               className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isSourceForAI ? 'bg-primary-light shadow-lg shadow-primary-light/30' : 'bg-slate-300 dark:bg-white/10'}`}
             >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${isSourceForAI ? 'left-7' : 'left-1'}`} />
             </button>
          </div>

          <button onClick={handleAddSession} className="w-full py-5 bg-primary-light text-white rounded-3xl font-black uppercase shadow-lg hover:brightness-110 transition-all">Create Session</button>
        </div>
      </UniversalModal>

      <UniversalModal
        isOpen={!!showEditSessionModal}
        onClose={() => setShowEditSessionModal(null)}
        title="Edit Session"
        description="Refine content and manage assets"
        maxWidth="max-w-md"
        icon={<Edit3 />}
      >
        <div className="space-y-6">
          <input value={newSession.title} onChange={e => setNewSession({ ...newSession, title: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl font-bold text-slate-900 dark:text-white" />
          <div className="space-y-2">
            {showEditSessionModal?.session.materials.map((mat, mi) => (
              <div key={mi} className="flex items-center justify-between p-4 bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/5">
                <span className="text-xs font-bold truncate max-w-[150px] text-slate-900 dark:text-white">{mat.title}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleTogglePublish(showEditSessionModal.session._id, mat.url)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${mat.isPublished ? 'bg-green-500 text-white shadow-md' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'}`}>{mat.isPublished ? 'Published' : 'Draft'}</button>
                  <button onClick={async () => {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${import.meta.env.VITE_API_URL}/sessions-content/${showEditSessionModal.session._id}/materials`, { data: { url: mat.url }, headers: { Authorization: `Bearer ${token}` } });
                    fetchStructure();
                    setShowEditSessionModal(prev => prev ? { ...prev, session: { ...prev.session, materials: prev.session.materials.filter(m => m.url !== mat.url) } } : null);
                  }} className="p-2 text-red-500/40 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
             <p className="text-[10px] font-black uppercase opacity-40 tracking-widest px-2 text-slate-900 dark:text-white">Add More Materials</p>
             <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[32px] p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary-light transition-all" onClick={() => document.getElementById('f-up-edit')?.click()}>
                <input id="f-up-edit" type="file" multiple className="hidden" onChange={e => setSelectedFiles(Array.from(e.target.files || []))} />
                <FileUp className={`w-8 h-8 transition-all ${selectedFiles.length > 0 ? 'text-primary-light opacity-100' : 'opacity-20 text-slate-900 dark:text-white'}`} />
                <p className="font-bold text-sm text-slate-500 dark:text-white text-center px-4">
                   {selectedFiles.length > 0 ? (
                     <span className="text-primary-light truncate max-w-[200px] block">{selectedFiles[0].name}</span>
                   ) : "Upload New Asset"}
                </p>
             </div>

             <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${isSourceForAI ? 'bg-primary-light/10 text-primary-light' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}>
                      <BrainCircuit className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-slate-900 dark:text-white">Generate Content</p>
                      <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Use as AI Source</p>
                    </div>
                </div>
                <button 
                  onClick={() => setIsSourceForAI(!isSourceForAI)}
                  className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isSourceForAI ? 'bg-primary-light shadow-lg shadow-primary-light/30' : 'bg-slate-300 dark:bg-white/10'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${isSourceForAI ? 'left-7' : 'left-1'}`} />
                </button>
             </div>
          </div>
          
          <button 
            onClick={() => {
              handleEditSession();
              setSelectedFiles([]); // Clear after save
              setIsSourceForAI(false);
            }} 
            className="w-full py-5 bg-primary-light text-white rounded-3xl font-black uppercase shadow-lg"
          >
            Save Changes
          </button>
        </div>
      </UniversalModal>

      {/* Review Wizard Modal */}
      <UniversalModal
        isOpen={!!showReviewModal}
        onClose={() => setShowReviewModal(null)}
        title={showReviewModal?.session.aiWorkflowStage === 'Stage1' ? "First Review Stage" : "Final Content Review"}
        description="Verify and edit generated curriculum assets"
        maxWidth="max-w-4xl"
        icon={<BrainCircuit />}
      >
        <div className="space-y-8 max-h-[70vh] overflow-y-auto px-2 custom-scrollbar">
           {showReviewModal?.content && (
             <div className="space-y-12">
               {/* MCQs Section */}
               <section className="space-y-6">
                 <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                    <h5 className="font-black text-lg uppercase tracking-tight text-slate-900 dark:text-white">Generated MCQs</h5>
                    <span className="text-[10px] font-black bg-primary-light/10 text-primary-light px-3 py-1 rounded-full uppercase">{showReviewModal.content.mcqs?.length || 0} Questions</span>
                 </div>
                 <div className="grid gap-6">
                   {showReviewModal.content.mcqs?.map((q: any, qi: number) => (
                     <div key={qi} className="p-8 bg-slate-50 dark:bg-white/5 rounded-[40px] border border-slate-200 dark:border-white/10 group hover:border-primary-light/30 transition-all">
                        <div className="flex items-start gap-4">
                           <div className="w-10 h-10 bg-white dark:bg-card-dark rounded-2xl flex items-center justify-center font-black text-xs shadow-md border border-slate-100 dark:border-white/5 shrink-0 transition-transform group-hover:scale-110">{qi + 1}</div>
                           <div className="flex-1 space-y-6">
                              <textarea 
                                value={q.question} 
                                onChange={(e) => {
                                  const newMcqs = [...showReviewModal.content.mcqs];
                                  newMcqs[qi].question = e.target.value;
                                  setShowReviewModal({ ...showReviewModal, content: { ...showReviewModal.content, mcqs: newMcqs } });
                                }}
                                className="w-full bg-transparent border-none p-0 font-bold text-slate-900 dark:text-white leading-relaxed resize-none focus:ring-0"
                                rows={2}
                              />
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {q.options?.map((opt: string, oi: number) => (
                                   <div key={oi} className={`relative p-5 rounded-[24px] border transition-all ${oi === q.correctAnswer ? 'bg-green-500/10 border-green-500/30 text-green-500 ring-2 ring-green-500/20' : 'bg-white dark:bg-card-dark border-slate-100 dark:border-white/5'}`}>
                                      <input 
                                        value={opt} 
                                        onChange={(e) => {
                                          const newMcqs = [...showReviewModal.content.mcqs];
                                          newMcqs[qi].options[oi] = e.target.value;
                                          setShowReviewModal({ ...showReviewModal, content: { ...showReviewModal.content, mcqs: newMcqs } });
                                        }}
                                        className={`w-full bg-transparent border-none p-0 text-[10px] font-black uppercase tracking-wider focus:ring-0 ${oi === q.correctAnswer ? 'text-green-500' : 'text-slate-500 dark:text-white/40'}`}
                                      />
                                      {oi === q.correctAnswer && <CheckCircle2 className="w-4 h-4 absolute top-4 right-4 text-green-500" />}
                                   </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                     </div>
                   ))}
                 </div>
               </section>

               {/* Application Problem */}
               {showReviewModal.content.applicationProblem && (
                 <section className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                        <h5 className="font-black text-lg uppercase tracking-tight text-slate-900 dark:text-white">Application Problem</h5>
                        <span className="text-[10px] font-black bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full uppercase">Edit Strategy</span>
                    </div>
                    <div className="p-8 bg-indigo-500/5 rounded-[40px] border border-indigo-500/20 space-y-4">
                       <h6 className="font-black text-indigo-500 uppercase text-[10px] tracking-widest">Deep Learning Challenge</h6>
                       <textarea 
                          value={showReviewModal.content.applicationProblem.description || showReviewModal.content.applicationProblem.content} 
                          onChange={(e) => {
                            const newProb = { ...showReviewModal.content.applicationProblem };
                            if (newProb.description) newProb.description = e.target.value;
                            else newProb.content = e.target.value;
                            setShowReviewModal({ ...showReviewModal, content: { ...showReviewModal.content, applicationProblem: newProb } });
                          }}
                          className="w-full bg-transparent border-none p-0 font-bold text-slate-900 dark:text-white leading-relaxed resize-none focus:ring-0"
                          rows={4}
                       />
                    </div>
                 </section>
               )}
             </div>
           )}

           <div className="sticky bottom-0 pt-8 pb-2 bg-white dark:bg-card-dark border-t border-slate-100 dark:border-white/10 flex items-center gap-4">
              <button 
                onClick={() => handleFinalizeReview('edit')}
                disabled={saving}
                className="flex-1 py-6 bg-primary-light text-white rounded-[32px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary-light/30 hover:brightness-110 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Save & Continue to Next Stage</>}
              </button>
           </div>
        </div>
      </UniversalModal>
    </div>
  );
}
