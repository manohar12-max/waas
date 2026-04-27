// Per-material AI state management enabled
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, BrainCircuit, CheckCircle2, ChevronLeft, X, FileText, Play, Download, Layout, AlertCircle, Loader2,
  BookOpen, Check, Edit3, Trash2, CheckCircle, Presentation
} from 'lucide-react';
import { SlideViewer, UnitAssetsItem } from './components/SlideViewer';
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import UniversalModal from '../../components/UniversalModal';

interface SessionMaterial {
  _id?: string;
  title: string;
  url: string;
  type: string;
  isSourceForAI: boolean;
  isPublished?: boolean;
  status: 'pending' | 'extracting' | 'generating' | 'generated' | 'approved' | 'failed';
  aiWorkflowStage?: 'Draft' | 'Stage1' | 'Stage2' | 'Finalized';
  aiSessionId?: string;
}

interface Session {
  _id: string;
  title: string;
  materials: SessionMaterial[];
}

export default function InstructorSessionMaterials() {
  const { workshopId, sessionId } = useParams<{ workshopId: string; sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'INSTRUCTOR' | 'AI'>('INSTRUCTOR');
  const [activeSlideshow, setActiveSlideshow] = useState<UnitAssetsItem[] | null>(null);
  const [activeDoc, setActiveDoc] = useState<{ title: string, url: string, type: string } | null>(null);
  const [generatedContent, setGeneratedContent] = useState<any[]>([]);
  const [showReviewModal, setShowReviewModal] = useState<{ session: Session; content: any; materialId?: string } | null>(null);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSourceForAI, setIsSourceForAI] = useState(false);
  const [showGenPreviewModal, setShowGenPreviewModal] = useState<{
    material: SessionMaterial;
    topic: string;
    audience: string;
    syllabus: string;
  } | null>(null);
  const [extractingPreview, setExtractingPreview] = useState(false);

  useEffect(() => {
    fetchSession();
    
    // Only poll if any material is in a transition state (extracting/generating)
    const needsPolling = session?.materials.some(m => m.status === 'extracting' || m.status === 'generating');
    
    if (needsPolling) {
      const interval = setInterval(fetchSession, 5000);
      return () => clearInterval(interval);
    }
  }, [sessionId, session?.materials.map(m => m.status).join(',')]);

  const fetchSession = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/workshop/${workshopId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const days = res.data;
      let foundSession: Session | null = null;
      days.forEach((day: any) => {
        const s = day.sessions.find((sess: any) => sess._id === sessionId);
        if (s) foundSession = s;
      });
      setSession(foundSession);

      if (foundSession) {
        try {
          const contentRes = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/content`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          // Ensure it's an array for mapping
          const content = Array.isArray(contentRes.data) ? contentRes.data : contentRes.data ? [contentRes.data] : [];
          setGeneratedContent(content);
        } catch (err) { setGeneratedContent([]); }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (url: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/materials/toggle-publish`, { url }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSession();
    } catch (err) { alert("Failed to toggle publish status"); }
  };

  const handleGenerate = async (material: SessionMaterial, editedData?: { topic: string, audience: string, syllabus: string }) => {
    try {
      const token = localStorage.getItem('token');
      const targetId = material._id;
      const targetUrl = material.url;

      if (!targetUrl) {
         alert("ERROR: This file has no URL in the database!");
         return;
      }

      if (!editedData) {
        // Step 1: Just extract and show preview
        setExtractingPreview(true);
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/extract-preview?materialUrl=${targetUrl}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setShowGenPreviewModal({
            material,
            topic: res.data.topic,
            audience: res.data.audience,
            syllabus: res.data.syllabus
          });
        } catch (err) {
          alert("Failed to extract content from file");
        } finally {
          setExtractingPreview(false);
        }
        return;
      }
      
      // Step 2: Start actual generation with edited data
      setShowGenPreviewModal(null);
      await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/generate`, {
        materialId: targetId,
        materialUrl: targetUrl,
        topic: editedData.topic,
        audience: editedData.audience,
        syllabus: editedData.syllabus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSession();
    } catch (err) {
      alert("Generation failed");
      console.error(err);
    }
  };

  const handleOpenReview = async (targetContent: any) => {
    if (!session) return;
    setShowReviewModal({ 
      session, 
      content: targetContent, 
      materialId: targetContent.materialId 
    });
  };

  const handleFinalizeReview = async (action: 'continue' | 'edit') => {
    if (!showReviewModal) return;
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      const material = showReviewModal.session.materials.find(m => 
        (m._id === showReviewModal.materialId) || 
        (m.aiWorkflowStage === 'Stage1' || m.aiWorkflowStage === 'Stage2')
      );
      if (!material) throw new Error("Could not identify the material in review");

      const stage = material.aiWorkflowStage === 'Stage1' ? '1' : '2';
      
      await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/review-stage-${stage}`, {
        action,
        edited_data: showReviewModal.content,
        materialId: showReviewModal.materialId
      }, { headers: { Authorization: `Bearer ${token}` } });

      setShowReviewModal(null);
      fetchSession();
    } catch (err) { alert("Review submission failed"); } finally { setSaving(false); }
  };

  const handleDeleteMaterial = async (url: string) => {
    if (!window.confirm("Are you sure you want to delete this material?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/materials`, {
        data: { url },
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSession();
    } catch (err) { alert("Failed to delete material"); }
  };

  const handleApprove = async (materialId?: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/approve`, { materialId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSession();
    } catch (err) { alert("Approval failed"); }
  };

  const handleTogglePublishContent = async (materialId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/toggle-publish-content`, { materialId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSession();
    } catch (err) { alert("Failed to toggle publish status"); }
  };

  const handleAddMaterials = async () => {
    if (selectedFiles.length === 0) return;
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('isSourceForAI', isSourceForAI.toString());
      selectedFiles.forEach(file => formData.append('files', file));

      await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/materials`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setShowAddMaterialModal(false);
      setSelectedFiles([]);
      setIsSourceForAI(false);
      fetchSession();
    } catch (err) {
      alert("Failed to upload materials");
      console.error(err);
    } finally {
      setSaving(false);
    }
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

  const getWorkflowBadge = (mat: SessionMaterial) => {
    if (mat.status !== 'generated') return null;
    if (mat.aiWorkflowStage === 'Stage1') return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 px-3 py-1 rounded-full text-[8px] font-black uppercase">Review Stage 1</span>;
    if (mat.aiWorkflowStage === 'Stage2') return <span className="bg-orange-500/10 text-orange-500 border border-orange-500/30 px-3 py-1 rounded-full text-[8px] font-black uppercase">Final Review</span>;
    if (mat.aiWorkflowStage === 'Finalized') return <span className="bg-teal-500/10 text-teal-500 border border-teal-500/30 px-3 py-1 rounded-full text-[8px] font-black uppercase">Ready to Publish</span>;
    return null;
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-primary-light" /></div>;
  if (!session) return <div className="p-20 text-center">Session not found</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-background-dark text-slate-900 dark:text-white font-outfit p-8 md:p-12 transition-colors duration-500">
      {/* Header */}
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-400 dark:text-white/40 hover:text-primary-light dark:hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Workshop
            </button>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
              {session.title}
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-slate-400 dark:text-white/40 text-xs font-bold uppercase tracking-widest">{session.materials.length} Total Materials</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setDashboardTab('INSTRUCTOR')}
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${dashboardTab === 'INSTRUCTOR' ? 'bg-primary-light text-white shadow-xl shadow-primary-light/20' : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Instructor Assets
            </button>
            <button
              onClick={() => setDashboardTab('AI')}
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${dashboardTab === 'AI' ? 'bg-primary-light text-white shadow-xl shadow-primary-light/20' : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'}`}
            >
              AI Curriculum
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-[48px] p-6 md:p-10 min-h-[60vh] shadow-inner">
          {dashboardTab === 'INSTRUCTOR' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {session.materials.map((mat, mi) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -5 }}
                  transition={{ delay: mi * 0.05 }}
                  key={mi}
                  className="group relative bg-slate-50 dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-[32px] p-6 flex flex-col gap-6 shadow-xl dark:shadow-none hover:border-primary-light/40 transition-all overflow-hidden cursor-pointer"
                  onClick={() => setActiveDoc({ title: mat.title, url: mat.url.startsWith('http') ? mat.url : `${import.meta.env.VITE_API_URL}${mat.url}`, type: mat.type })}
                >
                  {/* Glassy Accent Decor */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary-light/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary-light/10 transition-all" />

                  {/* Card Header: Icon + Status */}
                  <div className="flex justify-between items-start relative z-10">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${mat.isSourceForAI ? 'bg-primary-light text-white shadow-lg shadow-primary-light/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40'}`}>
                      <FileText className="w-7 h-7" />
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={mat.url.startsWith('http') ? mat.url : `${import.meta.env.VITE_API_URL}${mat.url}`}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all border border-slate-200 dark:border-white/5 text-slate-400 dark:text-white/30 hover:text-slate-900 dark:hover:text-white relative z-20"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(mat.url); }}
                        className="p-3 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/10 relative z-20"
                        title="Delete Material"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${mat.isPublished ? 'bg-green-500/10 border-green-500/20 text-green-500 shadow-sm' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 dark:text-white/40'}`}>
                        {mat.isPublished ? 'Published' : 'Draft'}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleGenerate(mat); }}
                        className={`p-3 rounded-xl border transition-all ${mat.status === 'generating' || extractingPreview ? 'bg-primary-light text-white border-primary-light shadow-xl shadow-primary-light/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30 hover:border-primary-light hover:text-primary-light'}`}
                        title="Generate AI Curriculum from this file"
                        disabled={mat.status === 'generating' || extractingPreview}
                      >
                        {mat.status === 'generating' || extractingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Card Body: Title + Meta */}
                  <div className="space-y-3 relative z-10 flex-1">
                    <h4 className="font-black text-xl leading-tight text-slate-900 dark:text-white group-hover:text-primary-light transition-colors line-clamp-2 min-h-[3rem]">
                      {mat.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase opacity-40 tracking-[0.2em]">{mat.type || 'Document'}</p>
                      <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/10" />
                      <span className="text-[10px] font-bold text-slate-400 dark:text-white/20">{mat.isPublished ? 'Live Asset' : 'Internal Draft'}</span>
                    </div>
                  </div>

                  {/* Card Actions: View / Publish / Slides */}
                  <div className="grid grid-cols-2 gap-3 relative z-10 pt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveDoc({ title: mat.title, url: mat.url.startsWith('http') ? mat.url : `${import.meta.env.VITE_API_URL}${mat.url}`, type: mat.type }); }}
                      className="py-3.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-[18px] text-[10px] font-black uppercase tracking-[0.1em] transition-all border border-slate-200 dark:border-white/5 text-slate-600 dark:text-white/60 flex items-center justify-center gap-2"
                    >
                      <BookOpen className="w-3 h-3" /> View
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTogglePublish(mat.url); }}
                      className={`py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-[0.1em] transition-all border flex items-center justify-center gap-2 ${mat.isPublished ? 'bg-green-500/10 border-green-500/40 text-green-500' : 'bg-primary-light text-white shadow-lg shadow-primary-light/20 border-primary-light'}`}
                    >
                      {mat.isPublished ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      {mat.isPublished ? 'Published' : 'Draft'}
                    </button>

                    {(mat.type === 'SLIDES' || mat.url.toLowerCase().endsWith('.pptx')) && (
                      <button
                        onClick={() => {
                          if (mat.isSourceForAI && generatedContent.length > 0) {
                            const content = generatedContent[0];
                            setActiveSlideshow([{
                              subTopicTitle: "AI Review",
                              assets: content.materials.map((m: any) => ({
                                title: m.title,
                                content: m.content ? [m.content] : (m.links || [])
                              }))
                            }]);
                          } else {
                            setActiveDoc({ title: mat.title, url: mat.url.startsWith('http') ? mat.url : `${import.meta.env.VITE_API_URL}${mat.url}`, type: 'SLIDES' });
                          }
                        }}
                        className="col-span-2 py-3.5 bg-primary-light/10 text-primary-light hover:bg-primary-light hover:text-white rounded-[18px] text-[10px] font-black uppercase tracking-[0.1em] transition-all border border-primary-light/20 flex items-center justify-center gap-2"
                      >
                        <Layout className="w-3 h-3" /> Interactive Slides
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Add Material Card */}
              <motion.div
                whileHover={{ y: -5 }}
                className="group relative bg-slate-100/50 dark:bg-white/[0.02] border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[32px] p-6 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer hover:border-primary-light hover:bg-primary-light/5"
                onClick={() => setShowAddMaterialModal(true)}
              >
                <div className="w-16 h-16 rounded-full bg-white dark:bg-white/5 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <Plus className="w-8 h-8 text-primary-light" />
                </div>
                <div className="text-center">
                  <h4 className="font-black text-lg text-slate-900 dark:text-white group-hover:text-primary-light transition-colors">Add New Asset</h4>
                  <p className="text-[10px] font-bold uppercase opacity-40 tracking-widest mt-1">Upload PDF or Slides</p>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-16">
              {generatedContent.length > 0 ? (
                <div className="space-y-16">
                  {generatedContent.map((content, ci) => (
                    <motion.div
                      key={ci}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: ci * 0.1 }}
                      className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-[64px] p-10 md:p-16 space-y-12 shadow-2xl relative overflow-hidden"
                    >
                      {/* Source Indicator */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-100 dark:border-white/5 pb-12">
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 bg-primary-light/10 text-primary-light rounded-[32px] flex items-center justify-center shadow-inner">
                            <BrainCircuit className="w-10 h-10" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <p className="text-[10px] font-black uppercase text-primary-light tracking-[0.4em]">Generated Curriculum</p>
                              {(() => {
                                 const mat = session.materials.find(m => m.url === content.sourceMaterialUrl || m._id === content.materialId);
                                 if (!mat) return null;
                                 return (
                                   <>
                                     <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border flex items-center gap-2 ${getStatusColor(mat.status)}`}>
                                       {mat.status === 'generating' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                       {mat.status === 'generating' ? 'Processing...' : mat.status}
                                     </span>
                                     {getWorkflowBadge(mat)}
                                   </>
                                 );
                              })()}
                            </div>
                            <h3 className="text-3xl font-black tracking-tight">{content.sourceMaterialTitle || "Primary Asset"}</h3>
                          </div>
                        </div>

                        {/* Integrated Actions */}
                        <div className="flex items-center gap-4">
                          {(() => {
                             const mat = session.materials.find(m => m.url === content.sourceMaterialUrl || m._id === content.materialId);
                             if (!mat) return null;
                             return (
                               <>
                                 {mat.status === 'generated' && mat.aiWorkflowStage && mat.aiWorkflowStage !== 'Finalized' && (
                                   <button
                                     onClick={() => handleOpenReview(content)}
                                     className="bg-amber-500 text-white px-8 py-5 rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-amber-500/30 hover:scale-105 transition-all"
                                   >
                                     <Edit3 className="w-5 h-5" /> Review AI Assets
                                   </button>
                                 )}
                                                                   {mat.aiWorkflowStage === 'Finalized' && mat.status !== 'approved' && (
                                    <button
                                      onClick={() => handleApprove(mat._id)}
                                      className="bg-green-500 text-white px-8 py-5 rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-green-500/30 hover:scale-105 transition-all"
                                    >
                                      <CheckCircle className="w-5 h-5" /> Finalize Content
                                    </button>
                                  )}

                                  {(mat.status === 'approved' || mat.aiWorkflowStage === 'Finalized') && (
                                    <button
                                      onClick={() => handleTogglePublishContent(mat._id!)}
                                      className={`px-8 py-5 rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl ${content?.isPublished ? 'bg-teal-500 text-white shadow-teal-500/30' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'}`}
                                    >
                                      {content?.isPublished ? <CheckCircle2 className="w-5 h-5" /> : <Loader2 className="w-5 h-5" />}
                                      {content?.isPublished ? "Published" : "Draft"}
                                    </button>
                                  )}


                                 <button
                                   onClick={async () => {
                                     if (!window.confirm(`Are you sure you want to delete AI generated curriculum for "${mat.title}"? This cannot be undone.`)) return;
                                     try {
                                       const token = localStorage.getItem('token');
                                       await axios.delete(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/content`, {
                                         data: { materialId: mat._id },
                                         headers: { Authorization: `Bearer ${token}` }
                                       });
                                       fetchSession();
                                     } catch (err: any) {
                                       alert(`Failed to delete curriculum: ${err.response?.data?.message || err.message}`);
                                     }
                                   }}
                                   className="p-5 bg-red-500/10 text-red-500 rounded-[24px] border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                                   title="Delete AI Curriculum"
                                 >
                                   <Trash2 className="w-5 h-5" />
                                 </button>
                               </>
                             );
                          })()}
                          <button
                            onClick={() => {
                              const slideshowData: any[] = [];
                              
                              // 1. Add Slides
                              if (content.slides?.length > 0) {
                                slideshowData.push({
                                  subTopicTitle: "Lecture Slides",
                                  assets: content.slides.map((s: any) => ({
                                    title: typeof s === 'string' ? s : s.title,
                                    content: typeof s === 'string' ? [s] : [s.content || ""]
                                  }))
                                });
                              }

                              // 2. Add MCQs
                              if (content.mcqs?.length > 0) {
                                slideshowData.push({
                                  subTopicTitle: "Knowledge Check",
                                  assets: content.mcqs.map((q: any) => ({
                                    title: q.question,
                                    content: [...q.options, `Correct: ${q.correct}`]
                                  }))
                                });
                              }

                              // 3. Add Application Problem
                              if (content.applicationProblem) {
                                slideshowData.push({
                                  subTopicTitle: "Application Challenge",
                                  assets: [{
                                    title: content.applicationProblem.title,
                                    content: [content.applicationProblem.problem_statement || content.applicationProblem.description]
                                  }]
                                });
                              }

                              setActiveSlideshow(slideshowData);
                            }}
                            className="px-8 py-5 bg-primary-light text-white rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-light/30 flex items-center gap-3 hover:scale-105 transition-all"
                          >
                            <Play className="w-5 h-5 fill-current" /> Play Session
                          </button>
                        </div>
                      </div>

                      <div className="grid lg:grid-cols-3 gap-16">
                        {/* MCQs Material Card */}
                        <div className="space-y-10">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                              <BookOpen className="w-6 h-6" />
                            </div>
                            <h4 className="text-2xl font-black tracking-tight">Assessments</h4>
                          </div>
                          <div className="grid gap-6">
                            {content.mcqs?.slice(0, 3).map((mcq: any, i: number) => (
                              <div key={i} className="p-8 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[32px] space-y-4">
                                <p className="font-bold text-sm leading-relaxed text-slate-700 dark:text-white/80 line-clamp-2">{mcq.question}</p>
                                <div className="flex items-center gap-4">
                                  <span className="text-[10px] font-black uppercase opacity-30">{mcq.options?.length} Options</span>
                                  <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/10" />
                                  <span className="text-[10px] font-black text-emerald-500 uppercase">Answer: {String.fromCharCode(65 + mcq.correctAnswer)}</span>
                                </div>
                              </div>
                            ))}
                            {content.mcqs?.length > 3 && (
                              <p className="text-center text-[10px] font-black uppercase opacity-30 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => handleOpenReview(content)}>+ {content.mcqs.length - 3} more questions</p>
                            )}
                          </div>
                        </div>

                        {/* Application Problem Material Card */}
                        <div className="space-y-10">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center">
                              <BrainCircuit className="w-6 h-6" />
                            </div>
                            <h4 className="text-2xl font-black tracking-tight">Practice</h4>
                          </div>
                          {content.applicationProblem && (
                            <div className="p-10 bg-indigo-500/5 border border-indigo-500/10 rounded-[48px] space-y-6">
                              <h5 className="font-black text-indigo-500 uppercase tracking-widest text-[10px]">{session?.title || "Critical challenge"}</h5>
                              <p className="text-lg text-slate-800 dark:text-white/90 leading-relaxed font-medium line-clamp-6">
                                {content.applicationProblem.problem_statement || content.applicationProblem.title}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {content.applicationProblem.concepts_used?.map((c: string, idx: number) => (
                                  <span key={idx} className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full text-[10px] font-black uppercase">{c}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Slides & Materials Card */}
                        <div className="space-y-10">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center">
                              <Presentation className="w-6 h-6" />
                            </div>
                            <h4 className="text-2xl font-black tracking-tight">Lecture</h4>
                          </div>
                          <div className="grid gap-6">
                            {(content.slides || []).length > 0 ? (
                                <div className="p-8 bg-orange-500/5 border border-orange-500/10 rounded-[32px] space-y-4">
                                  <h6 className="text-[10px] font-black uppercase text-orange-500 tracking-widest">Generated Visuals</h6>
                                  <div className="space-y-2">
                                    {content.slides.slice(0, 4).map((slide: any, idx: number) => (
                                      <div key={idx} className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-white/70">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500/40" />
                                        {typeof slide === 'string' ? slide : slide.title}
                                      </div>
                                    ))}
                                    {content.slides.length > 4 && (
                                      <p className="text-[10px] font-black opacity-30 pt-2 uppercase">+ {content.slides.length - 4} more slides</p>
                                    )}
                                  </div>
                                </div>
                            ) : (
                              <div className="p-8 bg-slate-50 dark:bg-white/[0.03] border border-dashed border-slate-300 dark:border-white/10 rounded-[32px] flex flex-col items-center justify-center text-center">
                                <Presentation className="w-8 h-8 opacity-20 mb-2" />
                                <p className="text-[10px] font-black uppercase opacity-30">No slides generated</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-40 text-center opacity-20">
                  <BrainCircuit className="w-24 h-24 mx-auto mb-10 animate-pulse text-slate-900 dark:text-white" />
                  <h3 className="text-3xl font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">No Curriculums Yet</h3>
                  <p className="max-w-sm mx-auto mt-6 text-lg font-medium text-slate-500 dark:text-white">Click the brain icon on your materials to generate intelligent curriculum.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Viewers */}
      <AnimatePresence>
        {activeDoc && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 dark:bg-black/98 backdrop-blur-3xl p-4 md:p-8">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-[#050510] border border-slate-200 dark:border-white/10 w-full h-full rounded-[40px] md:rounded-[64px] overflow-hidden flex flex-col shadow-3xl">
              <div className="p-6 md:p-10 border-b border-slate-100 dark:border-white/5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-primary-light/10 text-primary-light rounded-[20px] md:rounded-[24px] flex items-center justify-center"><FileText className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div><h3 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white line-clamp-1">{activeDoc.title}</h3><p className="text-[10px] font-black uppercase opacity-30 mt-1 tracking-[0.3em] text-slate-900 dark:text-white">Institutional Asset Viewer</p></div>
                </div>
                <button onClick={() => setActiveDoc(null)} className="p-4 md:p-6 bg-slate-100 dark:bg-white/5 rounded-2xl md:rounded-3xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-all"><X className="w-6 h-6 md:w-8 md:h-8" /></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <DocViewer
                  documents={[{ uri: activeDoc.url, fileName: activeDoc.title }]}
                  pluginRenderers={DocViewerRenderers}
                  style={{ height: '100%' }}
                  config={{
                    header: { disableHeader: true },
                    pdfVerticalScroll: true,
                    pdfZoom: { defaultZoom: 1, zoomJump: 0.1 }
                  } as any}
                />
              </div>
            </motion.div>
          </div>
        )}
        {activeSlideshow && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-white dark:bg-[#020208] flex flex-col p-6 md:p-12 overflow-hidden">
            <div className="flex justify-between items-center mb-8 md:mb-12 shrink-0">
              <div className="flex items-center gap-4 md:gap-8">
                <button onClick={() => setActiveSlideshow(null)} className="p-4 md:p-6 bg-slate-100 dark:bg-white/5 rounded-[24px] md:rounded-[32px] hover:bg-slate-200 dark:hover:bg-white/10 text-primary-light transition-all shadow-sm"><ChevronLeft className="w-6 h-6 md:w-8 md:h-8" /></button>
                <h3 className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{session.title} <span className="text-slate-400 dark:text-white/20 font-medium ml-4 tracking-normal hidden sm:inline">Instructor Review</span></h3>
              </div>
              <div className="px-6 py-2 md:px-8 md:py-3 bg-slate-100 dark:bg-white/5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/5 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-white/40">AI-Generated Curriculum</div>
            </div>
            <div className="flex-1 relative rounded-[40px] md:rounded-[64px] overflow-hidden border border-slate-200 dark:border-white/10 shadow-3xl bg-white dark:bg-[#020208]">
              <SlideViewer groups={activeSlideshow} unitTitle={session.title} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Wizard Modal */}
      <UniversalModal
        isOpen={!!showReviewModal}
        onClose={() => setShowReviewModal(null)}
        title={(() => {
          const mat = showReviewModal?.session.materials.find(m => m._id === showReviewModal.materialId || m.aiWorkflowStage === 'Stage1' || m.aiWorkflowStage === 'Stage2');
          return mat?.aiWorkflowStage === 'Stage1' ? "First Review Stage" : "Final Content Review";
        })()}
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
                <div className="grid gap-8">
                  {showReviewModal.content.mcqs?.map((q: any, qi: number) => (
                    <div key={qi} className="p-8 bg-slate-50 dark:bg-white/5 rounded-[40px] border border-slate-200 dark:border-white/10 group hover:border-primary-light/30 transition-all">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-white dark:bg-card-dark rounded-2xl flex items-center justify-center font-black text-xs shadow-md border border-slate-100 dark:border-white/5 shrink-0 transition-transform group-hover:scale-110">{qi + 1}</div>
                        <div className="flex-1 space-y-6">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase opacity-30 tracking-widest">Question</label>
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
                          </div>

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

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-white/5">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase opacity-30 tracking-widest">Explanation</label>
                              <textarea
                                value={q.explanation || ""}
                                onChange={(e) => {
                                  const newMcqs = [...showReviewModal.content.mcqs];
                                  newMcqs[qi].explanation = e.target.value;
                                  setShowReviewModal({ ...showReviewModal, content: { ...showReviewModal.content, mcqs: newMcqs } });
                                }}
                                className="w-full bg-white dark:bg-white/5 rounded-2xl p-4 text-xs text-slate-600 dark:text-white/60 focus:ring-1 focus:ring-primary-light border-none"
                                rows={3}
                              />
                            </div>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase opacity-30 tracking-widest">Concept</label>
                                <input
                                  value={q.concept || ""}
                                  onChange={(e) => {
                                    const newMcqs = [...showReviewModal.content.mcqs];
                                    newMcqs[qi].concept = e.target.value;
                                    setShowReviewModal({ ...showReviewModal, content: { ...showReviewModal.content, mcqs: newMcqs } });
                                  }}
                                  className="w-full bg-white dark:bg-white/5 rounded-2xl p-4 text-xs font-bold text-primary-light border-none"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase opacity-30 tracking-widest">Learning Objective</label>
                                <input
                                  value={q.learning_objective || ""}
                                  onChange={(e) => {
                                    const newMcqs = [...showReviewModal.content.mcqs];
                                    newMcqs[qi].learning_objective = e.target.value;
                                    setShowReviewModal({ ...showReviewModal, content: { ...showReviewModal.content, mcqs: newMcqs } });
                                  }}
                                  className="w-full bg-white dark:bg-white/5 rounded-2xl p-4 text-xs font-bold text-slate-500 dark:text-white/40 border-none"
                                />
                              </div>
                            </div>
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
                  <div className="p-10 bg-indigo-500/5 rounded-[40px] border border-indigo-500/20 space-y-8">
                    <div className="space-y-4">
                      <label className="text-[9px] font-black uppercase opacity-30 tracking-widest text-indigo-500">Problem Title</label>
                      <input
                        value={showReviewModal.content.applicationProblem.title || ""}
                        onChange={(e) => {
                          const newProb = { ...showReviewModal.content.applicationProblem, title: e.target.value };
                          setShowReviewModal({ ...showReviewModal, content: { ...showReviewModal.content, applicationProblem: newProb } });
                        }}
                        className="w-full bg-transparent border-none p-0 text-2xl font-black text-slate-900 dark:text-white focus:ring-0"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-[9px] font-black uppercase opacity-30 tracking-widest text-indigo-500">Problem Statement</label>
                      <textarea
                        value={showReviewModal.content.applicationProblem.problem_statement || showReviewModal.content.applicationProblem.description || showReviewModal.content.applicationProblem.content}
                        onChange={(e) => {
                          const newProb = { ...showReviewModal.content.applicationProblem };
                          if (newProb.problem_statement !== undefined) newProb.problem_statement = e.target.value;
                          else if (newProb.description) newProb.description = e.target.value;
                          else newProb.content = e.target.value;
                          setShowReviewModal({ ...showReviewModal, content: { ...showReviewModal.content, applicationProblem: newProb } });
                        }}
                        className="w-full bg-white dark:bg-white/5 rounded-3xl p-6 font-bold text-slate-900 dark:text-white leading-relaxed resize-none focus:ring-1 focus:ring-indigo-500 border-none"
                        rows={6}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[9px] font-black uppercase opacity-30 tracking-widest text-indigo-500">Grading Rubric</label>
                        <div className="space-y-3">
                          {(showReviewModal.content.applicationProblem.grading_rubric || []).map((item: any, ri: number) => (
                            <div key={ri} className="flex items-center gap-3 bg-white dark:bg-white/5 p-4 rounded-2xl border border-indigo-500/10">
                              <input
                                value={item.step}
                                onChange={(e) => {
                                  const newRubric = [...showReviewModal.content.applicationProblem.grading_rubric];
                                  newRubric[ri].step = e.target.value;
                                  setShowReviewModal({ ...showReviewModal, content: { ...showReviewModal.content, applicationProblem: { ...showReviewModal.content.applicationProblem, grading_rubric: newRubric } } });
                                }}
                                className="flex-1 bg-transparent border-none text-[10px] font-bold focus:ring-0"
                              />
                              <input
                                type="number"
                                value={item.marks}
                                onChange={(e) => {
                                  const newRubric = [...showReviewModal.content.applicationProblem.grading_rubric];
                                  newRubric[ri].marks = parseInt(e.target.value);
                                  setShowReviewModal({ ...showReviewModal, content: { ...showReviewModal.content, applicationProblem: { ...showReviewModal.content.applicationProblem, grading_rubric: newRubric } } });
                                }}
                                className="w-12 bg-indigo-500/10 text-indigo-500 border-none text-center font-black text-xs rounded-lg focus:ring-0"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[9px] font-black uppercase opacity-30 tracking-widest text-indigo-500">Expected Time (Min)</label>
                        <input
                          type="number"
                          value={showReviewModal.content.applicationProblem.expected_time_minutes || 10}
                          onChange={(e) => {
                            const newProb = { ...showReviewModal.content.applicationProblem, expected_time_minutes: parseInt(e.target.value) };
                            setShowReviewModal({ ...showReviewModal, content: { ...showReviewModal.content, applicationProblem: newProb } });
                          }}
                          className="w-full bg-white dark:bg-white/5 rounded-2xl p-4 text-lg font-black text-indigo-500 border-none"
                        />
                      </div>
                    </div>
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

      {/* Add Material Modal */}
      <UniversalModal
        isOpen={showAddMaterialModal}
        onClose={() => setShowAddMaterialModal(false)}
        title="Upload New Asset"
        description="Add PDFs, Slides or Other study materials to this session"
        maxWidth="max-w-md"
        icon={<Plus />}
      >
        <div className="space-y-6">
          <div
            className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[32px] p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary-light transition-all bg-slate-50 dark:bg-white/[0.02]"
            onClick={() => document.getElementById('asset-upload')?.click()}
          >
            <input
              id="asset-upload"
              type="file"
              multiple
              className="hidden"
              onChange={e => setSelectedFiles(Array.from(e.target.files || []))}
            />
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${selectedFiles.length > 0 ? 'bg-primary-light text-white shadow-lg shadow-primary-light/20' : 'bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-white/20'}`}>
              <Plus className="w-8 h-8" />
            </div>
            <p className="font-bold text-sm text-slate-500 dark:text-white text-center px-4">
              {selectedFiles.length > 0 ? (
                <span className="text-primary-light block">
                  {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} files selected`}
                </span>
              ) : "Click to browse or drop files here"}
            </p>
            <p className="text-[10px] font-black uppercase opacity-20 tracking-widest">PDF, PPTX, DOCX Supported</p>
          </div>

          <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${isSourceForAI ? 'bg-primary-light/10 text-primary-light' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}>
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase text-slate-900 dark:text-white">AI Source</p>
                <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Use for AI generation</p>
              </div>
            </div>
            <button
              onClick={() => setIsSourceForAI(!isSourceForAI)}
              className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isSourceForAI ? 'bg-primary-light shadow-lg shadow-primary-light/30' : 'bg-slate-300 dark:bg-white/10'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${isSourceForAI ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <button
            onClick={handleAddMaterials}
            disabled={selectedFiles.length === 0 || saving}
            className="w-full py-5 bg-primary-light text-white rounded-3xl font-black uppercase shadow-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-4 h-4" /> Upload Assets</>}
          </button>
        </div>
      </UniversalModal>
      {/* Generation Preview Modal */}
      <AnimatePresence>
        {showGenPreviewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGenPreviewModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-card-dark rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10"
            >
              <div className="p-8 md:p-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Review Generation Plan</h3>
                    <p className="text-slate-500 dark:text-white/40 text-sm font-medium italic">Edit the parameters before AI starts generating curriculum.</p>
                  </div>
                  <button
                    onClick={() => setShowGenPreviewModal(null)}
                    className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-colors text-slate-400"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary-light">Topic</label>
                      <input
                        type="text"
                        value={showGenPreviewModal.topic}
                        onChange={(e) => setShowGenPreviewModal({ ...showGenPreviewModal, topic: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary-light transition-all text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary-light">Audience</label>
                      <input
                        type="text"
                        value={showGenPreviewModal.audience}
                        onChange={(e) => setShowGenPreviewModal({ ...showGenPreviewModal, audience: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary-light transition-all text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary-light">Syllabus / Content Extract</label>
                    <textarea
                      value={showGenPreviewModal.syllabus}
                      onChange={(e) => setShowGenPreviewModal({ ...showGenPreviewModal, syllabus: e.target.value })}
                      className="w-full h-48 px-5 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary-light transition-all text-sm font-medium resize-none"
                      placeholder="Paste or edit the syllabus content here..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowGenPreviewModal(null)}
                    className="flex-1 py-5 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleGenerate(showGenPreviewModal.material, {
                      topic: showGenPreviewModal.topic,
                      audience: showGenPreviewModal.audience,
                      syllabus: showGenPreviewModal.syllabus
                    })}
                    className="flex-[2] py-5 bg-primary-light text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-light/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                  >
                    <Play className="w-5 h-5 fill-current" /> Start Generation
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
