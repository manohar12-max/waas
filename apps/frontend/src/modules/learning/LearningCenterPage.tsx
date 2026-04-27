import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
   FileText, ExternalLink, Download, Search, Layout, X, Maximize2,
   AlertCircle, BookOpen, Clock, ChevronRight, Filter, Loader2, Library, Play,
   Calendar, Layers, BrainCircuit, CheckCircle2, ChevronLeft
} from 'lucide-react';
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import { SlideViewer, UnitAssetsItem } from '../instructor/components/SlideViewer';
import FeedbackForm from './components/FeedbackForm';
import { MessageSquarePlus } from 'lucide-react';


interface Material {
   title: string;
   url: string;
   type: string;
   isSourceForAI: boolean;
   isPublished: boolean;
}

interface AICurriculum {
   _id: string;
   sessionId: string;
   materialId: string;
   sourceMaterialTitle: string;
   mcqs: any[];
   applicationProblem?: any;
   materials: any[];
   mcqStatus?: {
      attempts: number;
      attemptsRemaining: number;
      isPassed: boolean;
      bestScore: number;
      totalQuestions: number;
      status: 'SOLVED' | 'FAILED' | 'PENDING';
      lastScore: number | null;
   };
}

interface Session {
   _id: string;
   title: string;
   description: string;
   materials: Material[];
   dayNumber: number;
   status: string;
   aiContent?: AICurriculum[];
}

interface DayGroup {
   dayNumber: number;
   sessions: Session[];
}

interface Workshop {
   _id: string;
   title: string;
   description: string;
   instructorId: { name: string; email: string };
   days: DayGroup[];
   content?: {
      sectionTitle: string;
      materials: {
         title: string;
         type: 'PDF' | 'VIDEO' | 'LINK';
         url: string;
         isPublished?: boolean;
      }[];
   }[];
}

export default function LearningCenterPage() {
   const [workshops, setWorkshops] = useState<Workshop[]>([]);
   const [activeWorkshop, setActiveWorkshop] = useState<Workshop | null>(null);
   const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | 'ALL'>('ALL');
   const [userRole, setUserRole] = useState<string>('');
   const [searchQuery, setSearchQuery] = useState('');
   const [loading, setLoading] = useState(true);
   const [activeDoc, setActiveDoc] = useState<{ title: string; url: string; type: string } | null>(null);
   const [activeSlideshow, setActiveSlideshow] = useState<UnitAssetsItem[] | null>(null);
   const [activeQuiz, setActiveQuiz] = useState<{ mcqs: any[], sessionId: string, materialId: string } | null>(null);
   const [contentTab, setContentTab] = useState<'INSTITUTIONAL' | 'AI'>('INSTITUTIONAL');
   const [feedbackModal, setFeedbackModal] = useState<{
      type: 'SESSION' | 'WORKSHOP';
      workshopId: string;
      sessionId?: string;
      title: string;
   } | null>(null);
   const [submittedFeedback, setSubmittedFeedback] = useState<Set<string>>(new Set());


   useEffect(() => {
      const token = localStorage.getItem('token');
      if (token) {
         try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUserRole(payload.role || '');
         } catch (e) { }
      }
      fetchData();
   }, []);

   const fetchData = async () => {
      setLoading(true);
      try {
         const token = localStorage.getItem('token');
         if (!token) return;

         // Extract actual role from token to avoid state race conditions on mount
         let actualRole = "";
         try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            actualRole = payload.role || "";
         } catch (e) { }

         const wRes = await axios.get(`${import.meta.env.VITE_API_URL}/workshops`, {
            headers: { Authorization: `Bearer ${token}` }
         });

         const detailPromises = wRes.data.map(async (w: any) => {
            try {
               const sessionRes = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/workshop/${w._id}`, {
                  headers: { Authorization: `Bearer ${token}` }
               });

               const isStudentUser = actualRole === 'STUDENT';

               // Structure into Days -> Sessions (Already filtered by backend for students)
               const days: DayGroup[] = sessionRes.data;

               // Fetch AI content for each session in this workshop
               for (const day of days) {
                  for (const session of day.sessions) {
                     try {
                        const aiRes = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/${session._id}/content?publishedOnly=true`, {
                           headers: { Authorization: `Bearer ${token}` }
                        });
                         let content = Array.isArray(aiRes.data) ? aiRes.data : aiRes.data ? [aiRes.data] : [];
                        if (isStudentUser) {
                           content = content.filter((c: any) => c.isPublished === true);
                           // Fetch MCQ status for each content
                           for (const c of content) {
                              try {
                                 const statusRes = await axios.get(`${import.meta.env.VITE_API_URL}/sessions-content/${session._id}/mcq-status?materialId=${c.materialId}`, {
                                    headers: { Authorization: `Bearer ${token}` }
                                 });
                                 c.mcqStatus = statusRes.data;
                              } catch (e) { }
                           }
                        }
                        session.aiContent = content;
                     } catch (e) { session.aiContent = []; }
                  }
               }

               return { ...w, days };
            } catch (err) {
               console.error(`Failed to fetch details for workshop ${w._id}:`, err);
               return null; // Skip this workshop if details fail to load
            }
         });

         const fullWorkshopsResult = await Promise.all(detailPromises);
         const fullWorkshops = fullWorkshopsResult.filter(w => w !== null);
         const filteredWorkshops = fullWorkshops.filter(w => (w.days && w.days.length > 0) || (w.content && w.content.length > 0));
         setWorkshops(filteredWorkshops);
         if (filteredWorkshops.length > 0) setActiveWorkshop(filteredWorkshops[0]);

         // Fetch user's feedback status
         const feedbackRes = await axios.get(`${import.meta.env.VITE_API_URL}/feedback/my`, {
            headers: { Authorization: `Bearer ${token}` }
         });
         const feedbackIds = new Set<string>();
         feedbackRes.data.forEach((f: any) => {
            if (f.sessionId) feedbackIds.add(f.sessionId);
            if (f.workshopId && f.type === 'WORKSHOP') feedbackIds.add(f.workshopId);
         });
         setSubmittedFeedback(feedbackIds);
      } catch (err) {
         console.error('Failed to fetch learning materials:', err);
      } finally {
         setLoading(false);
      }
   };

   const handleOpenAIPlay = (aiPass: AICurriculum) => {
      const slides: UnitAssetsItem[] = [{
         subTopicTitle: "AI Generated Review",
         assets: aiPass.materials.map((m: any) => ({
            title: m.title,
            content: m.content ? [m.content] : (m.links || [])
         }))
      }];
      setActiveSlideshow(slides);
   };

   const handleOpenQuiz = (content: AICurriculum) => {
      setActiveQuiz({ mcqs: content.mcqs, sessionId: content.sessionId, materialId: content.materialId });
   };

   const allVisibleWorkshops = (selectedWorkshopId === 'ALL'
      ? workshops
      : workshops.filter(w => w._id === selectedWorkshopId)
   );

   const isStaff = ['INSTRUCTOR', 'TEACHER', 'COLLEGE_ADMIN', 'SUPER_ADMIN'].includes(userRole);
   const isStudent = userRole === 'STUDENT';
   const canSeeDrafts = isStaff;

   if (loading) return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 opacity-30">
         <Loader2 className="w-16 h-16 animate-spin text-primary-light" />
         <p className="text-xs font-black uppercase tracking-[0.4em] animate-pulse">Syncing Learning Ecosystem...</p>
      </div>
   );

   if (workshops.length === 0) return (
      <div className="max-w-7xl mx-auto px-4 py-40 text-center">
         <BookOpen className="w-24 h-24 mx-auto opacity-5 mb-8" />
         <h2 className="text-4xl font-black tracking-tight opacity-20">Archive Empty</h2>
         <p className="text-white/20 font-bold mt-4 uppercase tracking-widest">No workshops with published materials found.</p>
      </div>
   );

   return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-[#020208] text-slate-900 dark:text-white font-outfit transition-colors duration-500">

         {/* Main Content Area */}
         <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto px-8 md:px-12 py-12 space-y-16">

               {/* Unified Top Navigation */}
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-4">
                  <div className="space-y-4">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-light/10 text-primary-light rounded-[16px] flex items-center justify-center">
                           <Calendar className="w-5 h-5" />
                        </div>
                        <span className="px-3 py-1 bg-primary-light/5 border border-primary-light/10 rounded-full text-[9px] font-black uppercase tracking-widest text-primary-light">Learning Hub</span>
                     </div>
                     <h1 className="text-4xl md:text-5xl font-black tracking-tighter dark:text-white text-slate-900">
                        Curriculum <span className="text-primary-light">Archive</span>
                     </h1>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6">
                     {(isStudent || userRole === 'TEACHER') && activeWorkshop && (
                        submittedFeedback.has(activeWorkshop._id) ? (
                           <div className="px-6 py-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-[15px] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 cursor-default">
                              <CheckCircle2 className="w-4 h-4" /> Workshop Feedback Done
                           </div>
                        ) : (
                           <button
                              onClick={() => setFeedbackModal({
                                 type: 'WORKSHOP',
                                 workshopId: activeWorkshop._id,
                                 title: activeWorkshop.title
                              })}
                              className="px-6 py-2.5 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-[15px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-2"
                           >
                              <MessageSquarePlus className="w-4 h-4" /> Workshop Feedback
                           </button>
                        )
                     )}
                     {/* Tabbed Navigation */}
                     <div className="bg-white dark:bg-white/5 p-1.5 rounded-[20px] flex items-center border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
                        <button
                           onClick={() => setContentTab('INSTITUTIONAL')}
                           className={`px-6 py-2.5 rounded-[15px] text-[10px] font-black uppercase tracking-widest transition-all ${contentTab === 'INSTITUTIONAL' ? 'bg-primary-light text-white shadow-lg shadow-primary-light/20' : 'text-slate-400 dark:text-white/20 hover:text-slate-600 dark:hover:text-white'}`}
                        >
                           Institutional Assets
                        </button>
                        <button
                           onClick={() => setContentTab('AI')}
                           className={`px-6 py-2.5 rounded-[15px] text-[10px] font-black uppercase tracking-widest transition-all ${contentTab === 'AI' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 dark:text-white/20 hover:text-slate-600 dark:hover:text-white'}`}
                        >
                           AI Curriculum
                        </button>
                     </div>

                     <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative group">
                           <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/20 group-focus-within:text-primary-light transition-colors" />
                           <input
                              type="text"
                              placeholder="Search..."
                              className="pl-14 pr-6 py-3.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-primary-light/50 transition-all text-xs font-bold w-full sm:w-[200px] shadow-sm dark:shadow-none"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                           />
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl shadow-sm dark:shadow-none shrink-0">
                           <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-white/20 ml-2" />
                           <select
                              className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/60 outline-none pr-4 cursor-pointer"
                              value={selectedWorkshopId}
                              onChange={(e) => {
                                 setSelectedWorkshopId(e.target.value);
                                 if (e.target.value !== 'ALL') {
                                    const found = workshops.find(w => w._id === e.target.value);
                                    if (found) setActiveWorkshop(found);
                                 }
                              }}
                           >
                              <option value="ALL" className="bg-slate-50 dark:bg-slate-900">Show All Programs</option>
                              {workshops.map(w => (
                                 <option key={w._id} value={w._id} className="bg-slate-50 dark:bg-slate-900">{w.title}</option>
                              ))}
                           </select>
                        </div>
                     </div>
                  </div>
               </div>
               <div className="h-px w-full bg-slate-200 dark:bg-white/5 mb-12" />

               {/* Active Workshop Content - Students see ONE active, Admins see FILTERED list */}
               <div className="space-y-32">
                  {allVisibleWorkshops.map((workshop) => {
                     // Filter by Search Query
                     const hasMatch = workshop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        workshop.days.some(d => d.sessions.some(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))) ||
                        (workshop.content && workshop.content.some(c => c.sectionTitle.toLowerCase().includes(searchQuery.toLowerCase()) || c.materials.some(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()))));
                     if (!hasMatch) return null;

                     return (
                        <div key={workshop._id} className="space-y-24">
                           {/* Workshop Sub-Header */}
                           <div className="flex items-center gap-8">
                              <div className="h-px w-12 bg-primary-light/30" />
                              <div className="space-y-1">
                                 <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">{workshop.title}</h2>
                                 <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-white/20">Instructor: {workshop.instructorId?.name}</p>
                              </div>
                              <div className="h-px flex-1 bg-slate-200 dark:bg-white/5" />
                           </div>

                           {/* Classic Institutional Modules Section */}
                           {workshop.content && workshop.content.length > 0 && (
                              <section className="space-y-12 bg-slate-100/50 dark:bg-white/[0.01] p-10 rounded-[48px] border border-slate-200 dark:border-white/5 shadow-inner">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary-light/10 text-primary-light rounded-2xl flex items-center justify-center">
                                       <BookOpen className="w-6 h-6" />
                                    </div>
                                    <div>
                                       <h2 className="text-2xl font-black tracking-tight">Institutional <span className="text-primary-light">Modules</span></h2>
                                       <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mt-1">Core program materials and resources</p>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {workshop.content.map((section, si) => (
                                       <div key={si} className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-[32px] p-8 space-y-6 shadow-sm hover:border-primary-light/30 transition-all group/card cursor-pointer">
                                          <h4 className="text-lg font-black tracking-tight group-hover/card:text-primary-light transition-colors">{section.sectionTitle}</h4>
                                          <div className="space-y-4">
                                             {section.materials.map((mat, mi) => (
                                                <div 
                                                   key={mi} 
                                                   onClick={() => setActiveDoc({ title: mat.title, url: mat.url.startsWith('http') ? mat.url : `${import.meta.env.VITE_API_URL}${mat.url}`, type: mat.type })}
                                                   className="flex items-center gap-4 group/mat cursor-pointer"
                                                >
                                                   <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover/mat:bg-primary-light group-hover/mat:text-white transition-all">
                                                      {mat.type === 'PDF' && <FileText className="w-5 h-5" />}
                                                      {mat.type === 'VIDEO' && <Play className="w-5 h-5" />}
                                                      {mat.type === 'LINK' && <ExternalLink className="w-5 h-5" />}
                                                   </div>
                                                   <div className="flex-1 min-w-0">
                                                      <p className="text-sm font-bold truncate group-hover/mat:text-primary-light transition-colors">{mat.title}</p>
                                                      <p className="text-[9px] font-black uppercase opacity-30">{mat.type}</p>
                                                   </div>
                                                   <Download className="w-4 h-4 opacity-0 group-hover/mat:opacity-100 transition-all text-primary-light" />
                                                </div>
                                             ))}
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              </section>
                           )}

                           {/* Grouped Content (AI Path) */}
                           <div className="space-y-32">
                              {workshop.days.map((day) => (
                                 <div key={day.dayNumber} className="space-y-16">
                                    <div className="flex items-center gap-8 group">
                                       <span className="text-4xl md:text-5xl font-black text-slate-300 dark:text-white/20 group-hover:text-primary-light/40 transition-colors uppercase italic tracking-tighter">Day 0{day.dayNumber}</span>
                                       <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
                                    </div>
                                    <div className="space-y-20">
                                       {day.sessions.map((session, si) => (
                                          <div key={session._id} className="relative pl-10 border-l-2 border-slate-200 dark:border-white/5 space-y-10">
                                             <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-slate-50 dark:bg-[#020208] border-2 border-primary-light shadow-[0_0_10px_rgba(99,102,241,0.3)]" />
                                             <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                   <h3 className="text-2xl font-black tracking-tight flex items-center gap-4 text-slate-800 dark:text-white">
                                                      Session {si + 1}: {session.title}

                                                      <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest opacity-60 italic">Module {si + 1}</span>
                                                   </h3>
                                                   {(isStudent || userRole === 'TEACHER') && (
                                                      submittedFeedback.has(session._id) ? (
                                                         <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-default">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Feedback Done
                                                         </div>
                                                      ) : (
                                                         <button
                                                            onClick={() => setFeedbackModal({
                                                               type: 'SESSION',
                                                               workshopId: workshop._id,
                                                               sessionId: session._id,
                                                               title: session.title
                                                            })}
                                                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary-light hover:border-primary-light/30 transition-all"
                                                         >
                                                            <MessageSquarePlus className="w-3.5 h-3.5" /> Give Feedback
                                                         </button>
                                                      )
                                                   )}
                                                </div>
                                                <p className="text-slate-500 dark:text-white/40 font-medium max-w-2xl leading-relaxed text-sm">{session.description || "Instructional block objectives are listed below."}</p>
                                             </div>

                                             {/* Tab-driven Content Rendering */}
                                             <div className="animate-fade-in">
                                                {contentTab === 'INSTITUTIONAL' ? (
                                                   <div className="space-y-6">
                                                      <div className="flex items-center gap-3"><div className="w-8 h-8 bg-indigo-500/10 text-indigo-500 rounded-lg flex items-center justify-center"><BookOpen className="w-4 h-4" /></div><h4 className="text-sm font-black tracking-widest italic uppercase text-slate-400 dark:text-white/40">Institutional Assets</h4></div>
                                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                         {session.materials.filter(m => m.isPublished).map((mat, mi) => (
                                                            <div key={mi} className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-[24px] p-6 flex flex-col justify-between group hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all shadow-sm dark:shadow-none min-h-[160px]">
                                                               <div className="flex items-start gap-4">
                                                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${mat.type === 'PDF' ? 'bg-rose-500/10 text-rose-500' : 'bg-primary-light/10 text-primary-light'}`}>
                                                                     {mat.type === 'PDF' ? <FileText className="w-6 h-6" /> : <Layout className="w-6 h-6" />}
                                                                  </div>
                                                                  <div className="space-y-1">
                                                                     <div className="flex items-center gap-2">
                                                                        <h5 className="font-bold text-slate-800 dark:text-white line-clamp-2 text-sm leading-tight">{mat.title}</h5>
                                                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded text-[7px] font-black uppercase">Live</span>
                                                                     </div>
                                                                     <p className="text-[9px] font-black uppercase opacity-40 tracking-widest">{mat.type} DOCUMENT</p>
                                                                  </div>
                                                               </div>
                                                               <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-white/5 mt-4">
                                                                  <button onClick={() => setActiveDoc({ title: mat.title, url: mat.url.startsWith('http') ? mat.url : `${import.meta.env.VITE_API_URL}${mat.url}`, type: mat.type })} className="flex-1 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-primary-light hover:text-white rounded-xl transition-all border border-slate-200 dark:border-white/10 text-slate-400 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 group"><Maximize2 className="w-3.5 h-3.5" /> Open Viewer</button>
                                                                  <a href={mat.url.startsWith('http') ? mat.url : `${import.meta.env.VITE_API_URL}${mat.url}`} download className="p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all border border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/20"><Download className="w-3.5 h-3.5" /></a>
                                                               </div>
                                                            </div>
                                                         ))}
                                                         {session.materials.filter(m => m.isPublished).length === 0 && (
                                                            <div className="col-span-full border border-dashed border-slate-200 dark:border-white/5 rounded-[24px] p-10 text-center opacity-30 italic font-medium text-xs">No institutional assets available for this session.</div>
                                                         )}
                                                      </div>
                                                   </div>
                                                ) : (
                                                   <div className="space-y-6">
                                                      <div className="flex items-center gap-3"><div className="w-8 h-8 bg-primary-light/10 text-primary-light rounded-lg flex items-center justify-center"><BrainCircuit className="w-4 h-4" /></div><h4 className="text-sm font-black tracking-widest italic uppercase text-slate-400 dark:text-white/40">AI-Augmented Learning</h4></div>
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                         {session.aiContent && session.aiContent.length > 0 ? (
                                                            session.aiContent.map((content, ci) => (
                                                               <div key={ci} className="bg-white dark:bg-[#0a0a14] border-2 border-indigo-500/10 dark:border-indigo-500/5 rounded-[40px] p-8 space-y-8 relative overflow-hidden group shadow-xl shadow-indigo-500/5 dark:shadow-none">
                                                                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[80px] -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                                                                  <div className="flex items-center justify-between relative z-10">
                                                                     <div className="space-y-1">
                                                                        <h5 className="font-black text-indigo-500 uppercase tracking-widest text-[10px]">AI-Generated Module</h5>
                                                                        <p className="font-bold text-lg text-slate-800 dark:text-white leading-tight">Review: {content.sourceMaterialTitle}</p>
                                                                     </div>
                                                                  </div>

                                                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                                                                     <button
                                                                        onClick={() => handleOpenAIPlay(content)}
                                                                        className="group/slides bg-indigo-500/5 hover:bg-indigo-500 border border-indigo-500/20 hover:border-indigo-500 rounded-[32px] p-6 transition-all text-left space-y-3 shadow-md hover:shadow-xl hover:shadow-indigo-500/10"
                                                                     >
                                                                        <div className="w-10 h-10 bg-indigo-500/10 group-hover/slides:bg-white/20 rounded-xl flex items-center justify-center text-indigo-500 group-hover/slides:text-white transition-colors"><Play className="w-5 h-5 fill-current" /></div>
                                                                        <div>
                                                                           <h4 className="font-black text-slate-900 dark:text-white group-hover/slides:text-white text-sm">Slide Show</h4>
                                                                           <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 group-hover/slides:text-white/60">Module Review</p>
                                                                        </div>
                                                                     </button>

                                                                     <button
                                                                      onClick={() => handleOpenQuiz(content)}
                                                                      disabled={content.mcqStatus?.status === 'SOLVED' || content.mcqStatus?.status === 'FAILED'}
                                                                      className={`group/quiz rounded-[32px] p-6 transition-all text-left space-y-3 shadow-md hover:shadow-xl ${content.mcqStatus?.status === 'SOLVED' ? 'bg-emerald-500/10 border-2 border-emerald-500/50 cursor-default' : content.mcqStatus?.status === 'FAILED' ? 'bg-rose-500/10 border-2 border-rose-500/50 cursor-default' : 'bg-emerald-500/5 hover:bg-emerald-500 border border-emerald-500/20 hover:border-emerald-500 hover:shadow-emerald-500/10'}`}
                                                                   >
                                                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${content.mcqStatus?.status === 'SOLVED' ? 'bg-emerald-500 text-white' : content.mcqStatus?.status === 'FAILED' ? 'bg-rose-500 text-white' : 'bg-emerald-500/10 text-emerald-500 group-hover/quiz:bg-white/20 group-hover/quiz:text-white'}`}>
                                                                         {content.mcqStatus?.status === 'SOLVED' ? <CheckCircle2 className="w-5 h-5" /> : content.mcqStatus?.status === 'FAILED' ? <X className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                                                                      </div>
                                                                      <div>
                                                                         <h4 className={`font-black text-sm ${content.mcqStatus?.status === 'SOLVED' ? 'text-emerald-700 dark:text-emerald-400' : content.mcqStatus?.status === 'FAILED' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white group-hover/quiz:text-white'}`}>
                                                                            {content.mcqStatus?.status === 'SOLVED' ? 'Quiz Solved' : content.mcqStatus?.status === 'FAILED' ? 'Attempts Exhausted' : 'Take Quiz'}
                                                                         </h4>
                                                                         <div className="flex items-center gap-2">
                                                                            <p className={`text-[9px] font-bold uppercase tracking-widest ${content.mcqStatus?.status === 'SOLVED' ? 'text-emerald-600/60' : content.mcqStatus?.status === 'FAILED' ? 'text-rose-600/60' : 'text-emerald-600 dark:text-emerald-400 group-hover/quiz:text-white/60'}`}>
                                                                               {content.mcqs?.length || 0} Problems
                                                                            </p>
                                                                            {content.mcqStatus && content.mcqStatus.status === 'PENDING' && (
                                                                               <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">{content.mcqStatus.attemptsRemaining} Left</span>
                                                                            )}
                                                                         </div>
                                                                      </div>
                                                                   </button>

                                                                     <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[32px] p-6 space-y-3">
                                                                        <div className="w-10 h-10 bg-primary-light/10 rounded-xl flex items-center justify-center text-primary-light"><AlertCircle className="w-5 h-5" /></div>
                                                                        <div>
                                                                           <h4 className="font-black text-slate-900 dark:text-white text-sm">Application Case</h4>
                                                                           <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/20">{content.applicationProblem ? 'Active Scenario' : 'Pending'}</p>
                                                                        </div>
                                                                     </div>
                                                                  </div>
                                                               </div>
                                                            ))
                                                         ) : (
                                                            <div className="col-span-full h-full min-h-[200px] border border-dashed border-slate-200 dark:border-white/5 rounded-[40px] flex flex-col items-center justify-center p-12 text-center opacity-30"><BrainCircuit className="w-12 h-12 mb-4" /><p className="text-[10px] font-black uppercase tracking-[0.3em] italic">AI Curriculum Tracks Are Being Processed</p></div>
                                                         )}
                                                      </div>
                                                   </div>
                                                )}
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
         </div>

         {/* Viewers & Overlays - Theme Aware Backgrounds */}
         <AnimatePresence>
            {activeDoc && (
               <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-8">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveDoc(null)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/98 backdrop-blur-3xl" />
                  <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 10 }} className="relative w-full h-full max-w-7xl bg-white dark:bg-[#080810] rounded-[32px] md:rounded-[48px] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-white/10">
                     <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#0a0a14]"><div className="flex items-center gap-5 min-w-0"><div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 ${activeDoc.type === 'PDF' ? 'bg-rose-500/10 text-rose-500' : 'bg-primary-light/10 text-primary-light'}`}><FileText className="w-6 h-6 md:w-7 md:h-7" /></div><div className="min-w-0"><h4 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white truncate leading-tight">{activeDoc.title}</h4><p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-[0.2em]">Restricted Viewer Mode</p></div></div><div className="flex items-center gap-3 md:gap-4"><a href={activeDoc.url} download className="p-4 md:p-5 bg-white dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl text-slate-400 transition-colors"><Download className="w-5 h-5" /></a><button onClick={() => setActiveDoc(null)} className="p-4 md:p-5 bg-white dark:bg-white/5 hover:bg-rose-500 hover:text-white rounded-2xl transition-all text-slate-400"><X className="w-5 h-5" /></button></div></div>
                     <div className="flex-1 bg-white overflow-y-auto custom-scrollbar">
                        <DocViewer
                           documents={[{ uri: activeDoc.url, fileName: activeDoc.title }]}
                           pluginRenderers={DocViewerRenderers}
                           config={{
                              header: { disableHeader: true },
                              pdfVerticalScroll: true,
                              pdfZoom: { defaultZoom: 1, zoomJump: 0.1 }
                           } as any}
                           style={{ height: '100%' }}
                        />
                     </div>
                  </motion.div>
               </div>
            )}
            {activeSlideshow && (
               <div className="fixed inset-0 z-[600] flex items-center justify-center bg-white dark:bg-black">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full p-4 md:p-12 flex flex-col">
                     <div className="flex justify-between items-center mb-6 md:mb-8 shrink-0 relative z-[610]"><button onClick={() => setActiveSlideshow(null)} className="flex items-center gap-2 text-slate-400 dark:text-white/30 hover:text-slate-900 dark:hover:text-white transition-colors text-[9px] md:text-[10px] font-black uppercase tracking-widest"><ChevronLeft className="w-4 h-4" /> Close Curriculum Review</button></div>
                     <div className="flex-1 rounded-[32px] md:rounded-[48px] overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#020208] shadow-3xl"><SlideViewer groups={activeSlideshow} unitTitle="AI Augmented Session" /></div>
                  </motion.div>
               </div>
            )}
            {activeQuiz && (
               <QuizModal 
                  mcqs={activeQuiz.mcqs} 
                  sessionId={activeQuiz.sessionId}
                  materialId={activeQuiz.materialId}
                  onClose={() => {
                     setActiveQuiz(null);
                     fetchData(); // Refresh status
                  }} 
               />
            )}

            <FeedbackForm
               isOpen={!!feedbackModal}
               type={feedbackModal?.type || 'SESSION'}
               workshopId={feedbackModal?.workshopId || ''}
               sessionId={feedbackModal?.sessionId}
               title={feedbackModal?.title || ''}
               onClose={() => setFeedbackModal(null)}
               onSuccess={() => {
                  const submittedId = feedbackModal?.type === 'SESSION' ? feedbackModal?.sessionId : feedbackModal?.workshopId;
                  if (submittedId) {
                     setSubmittedFeedback(prev => new Set([...prev, submittedId]));
                  }
                  setFeedbackModal(null);
                  alert('Feedback submitted successfully! Thank you.');
               }}
            />
         </AnimatePresence>
      </div>
   );
}

function QuizModal({ mcqs, sessionId, materialId, onClose }: { mcqs: any[], sessionId: string, materialId: string, onClose: () => void }) {
   const [currentIdx, setCurrentIdx] = useState(0);
   const [answers, setAnswers] = useState<Record<number, number>>({});
   const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
   const [isSubmitted, setIsSubmitted] = useState(false);
   const [reviewMode, setReviewMode] = useState(false);
   const [score, setScore] = useState(0);
   const [timeLeft, setTimeLeft] = useState(mcqs.length * 60);
   const [attemptResult, setAttemptResult] = useState<any>(null);
   const [isSubmitting, setIsSubmitting] = useState(false);

   useEffect(() => {
      if (isSubmitted) return;
      const timer = setInterval(() => {
         setTimeLeft(prev => {
            if (prev <= 1) {
               clearInterval(timer);
               handleGlobalSubmit();
               return 0;
            }
            return prev - 1;
         });
      }, 1000);
      return () => clearInterval(timer);
   }, [isSubmitted]);

   const handleGlobalSubmit = async () => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      let s = 0;
      mcqs.forEach((q, i) => {
         const correctIndex = q.correctAnswer !== undefined ? q.correctAnswer : q.answer;
         if (answers[i] === correctIndex) s++;
      });
      setScore(s);

      try {
         const token = localStorage.getItem('token');
         const res = await axios.post(`${import.meta.env.VITE_API_URL}/sessions-content/${sessionId}/mcq-submit`, {
            materialId,
            score: s,
            totalQuestions: mcqs.length
         }, {
            headers: { Authorization: `Bearer ${token}` }
         });
         setAttemptResult(res.data);
         setIsSubmitted(true);
         setReviewMode(false);
      } catch (err) {
         console.error('Failed to submit MCQ attempt:', err);
         alert('Failed to save your progress. Please try again.');
      } finally {
         setIsSubmitting(false);
      }
   };

   const toggleMark = (idx: number) => {
      const newSet = new Set(markedForReview);
      if (newSet.has(idx)) newSet.delete(idx);
      else newSet.add(idx);
      setMarkedForReview(newSet);
   };

   const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
   };

   const q = mcqs[currentIdx];
   const progress = Math.round((Object.keys(answers).length / mcqs.length) * 100);

   return (
      <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         className="fixed inset-0 z-[700] bg-white dark:bg-[#020208] flex flex-col selection:bg-indigo-500/30"
      >
         {/* Background Mesh */}
         <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-20">
            <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary-light/20 blur-[120px] rounded-full" />
         </div>

         {/* Immersive Header */}
         <div className="px-6 md:px-12 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between shrink-0 bg-white/40 dark:bg-[#020208]/40 backdrop-blur-2xl sticky top-0 z-50">
            <div className="flex items-center gap-6">
               <div className="w-11 h-11 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center shadow-xl shadow-slate-900/10 dark:shadow-white/5">
                  <Library className="w-5 h-5" />
               </div>
               <div className="hidden sm:block space-y-0.5">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight flex items-center gap-2 tracking-tight">AI Assessment <span className="px-2 py-0.5 bg-indigo-500 text-white text-[8px] uppercase italic rounded-md">V2.0</span></h2>
                  <div className="flex items-center gap-3">
                     <span className="text-[9px] font-black uppercase text-slate-400 dark:text-white/50 tracking-widest">Active Diagnostic Phase</span>
                     <div className="w-1 h-1 bg-slate-300 dark:bg-white/10 rounded-full" />
                     <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest">{mcqs.length} High-Stakes Matrix Problems</span>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-4">
               {!isSubmitted && (
                  <div className={`px-6 py-3 rounded-2xl border-2 flex items-center gap-4 transition-all ${timeLeft < 60 ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-lg shadow-rose-500/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white shadow-sm'}`}>
                     <Clock className="w-5 h-5 opacity-40 shrink-0" />
                     <span className="font-mono text-2xl font-black tabular-nums">{formatTime(timeLeft)}</span>
                  </div>
               )}
               <button
                  onClick={onClose}
                  className="p-3.5 bg-slate-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-slate-200 dark:border-white/10 text-slate-400"
               >
                  <X className="w-5 h-5" />
               </button>
            </div>
         </div>

         <div className="flex-1 flex overflow-hidden relative z-10">
            {/* Architectural Sidebar */}
            <aside className="w-80 border-r border-slate-200 dark:border-white/5 p-10 overflow-y-auto hidden xl:block bg-slate-50/30 dark:bg-black/10">
               <div className="space-y-12">
                  <div className="space-y-6">
                     <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-[0.2em] italic">Session Progress</h3>
                        <span className="text-xs font-black text-indigo-500">{progress}%</span>
                     </div>
                     <div className="h-1.5 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                     </div>
                  </div>

                  <div className="space-y-6">
                     <h3 className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-[0.2em]">Questions</h3>
                     <div className="grid grid-cols-4 gap-3">
                        {mcqs.map((_, i) => {
                           const isCurrent = currentIdx === i;
                           const isAnswered = !!answers[i];
                           const isMarked = markedForReview.has(i);

                           return (
                              <button
                                 key={i}
                                 onClick={() => {
                                    setCurrentIdx(i);
                                    if (isSubmitted) setReviewMode(true);
                                 }}
                                 className={`w-full aspect-square rounded-2xl text-[11px] font-black transition-all border-2 flex items-center justify-center relative group
                                 ${isCurrent ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-black shadow-xl' :
                                       isMarked ? 'bg-primary-light border-primary-light text-white shadow-lg shadow-primary-light/20' :
                                          isAnswered ? 'bg-emerald-500 border-emerald-500 text-white' :
                                             'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-300 dark:text-white/10 hover:border-slate-400'}`}
                              >
                                 {i + 1}
                                 {isMarked && <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary-light text-white rounded-full border-2 border-white dark:border-[#020208] flex items-center justify-center text-[8px]">!</div>}
                              </button>
                           )
                        })}
                     </div>
                  </div>

                  <div className="space-y-5 pt-10 border-t border-slate-200 dark:border-white/5">
                     <div className="p-5 bg-white dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4 shadow-sm">
                        <p className="text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest italic">Legend</p>
                        <div className="space-y-3">
                           <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white" /><span className="text-[10px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-widest">Current</span></div>
                           <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-widest">Attempted</span></div>
                           <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-primary-light" /><span className="text-[10px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-widest">Mark for Review</span></div>
                           <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-white/10" /><span className="text-[10px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-widest">Not Attempted</span></div>
                        </div>
                     </div>
                  </div>
               </div>
            </aside>

            {/* Main Stage */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-14 bg-white/20 dark:bg-black/5">
               <div className="max-w-4xl mx-auto h-full flex flex-col">
                  <AnimatePresence mode="wait">
                     {isSubmitted && !reviewMode ? (
                        <motion.div key="results" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-16">
                           <div className="relative">
                              <div className={`w-48 h-48 rounded-[60px] flex items-center justify-center transform rotate-12 group ${attemptResult?.attempt?.isPassed ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                 {attemptResult?.attempt?.isPassed ? (
                                    <CheckCircle2 className="w-24 h-24 text-emerald-500 transform -rotate-12 transition-transform group-hover:scale-110" />
                                 ) : (
                                    <X className="w-24 h-24 text-rose-500 transform -rotate-12 transition-transform group-hover:scale-110" />
                                 )}
                              </div>
                              <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className={`absolute inset-0 border-4 border-dashed rounded-[70px] scale-[1.15] ${attemptResult?.attempt?.isPassed ? 'border-emerald-500/10' : 'border-rose-500/10'}`} />
                           </div>

                           <div className="space-y-6">
                              <div className="flex items-center justify-center gap-3 mb-2">
                                 <span className={`w-2 h-2 rounded-full animate-ping ${attemptResult?.attempt?.isPassed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                 <h3 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                                    {attemptResult?.attempt?.isPassed ? 'Success Authenticated' : (attemptResult?.betterLuckNextTime ? 'Assessment Failed' : 'Incomplete Accuracy')}
                                 </h3>
                              </div>
                              <p className="text-xl font-bold text-slate-400 dark:text-white/40 max-w-lg mx-auto leading-relaxed">
                                 {attemptResult?.attempt?.isPassed ? 'Your diagnostic session is captured. AI-curated performance metadata has been synced to your profile.' : (attemptResult?.betterLuckNextTime ? 'You have exhausted all attempts. Better luck next time!' : `You need a full score to pass. ${attemptResult?.attemptsRemaining} attempts remaining.`)}
                              </p>
                           </div>

                           <div className="flex items-stretch gap-6 h-32">
                              <div className="px-10 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[32px] flex flex-col justify-center items-center shadow-2xl relative overflow-hidden group">
                                 <div className="absolute inset-0 bg-primary-light opacity-0 group-hover:opacity-10 transition-opacity" />
                                 <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 opacity-60">Score</p>
                                 <p className="text-4xl font-black tabular-nums tracking-tighter">{score}<span className="text-sm opacity-30 ml-2"> / {mcqs.length}</span></p>
                              </div>
                              <div className={`px-10 text-white rounded-[32px] flex flex-col justify-center items-center shadow-2xl ${attemptResult?.attempt?.isPassed ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-rose-500 shadow-rose-500/30'}`}>
                                 <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 opacity-60">Accuracy</p>
                                 <p className="text-4xl font-black tabular-nums tracking-tighter">{Math.round((score / mcqs.length) * 100)}%</p>
                              </div>
                           </div>

                           <button onClick={onClose} className="px-10 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-indigo-500 transition-all hover:border-indigo-500/30">Close Assessment</button>
                        </motion.div>
                     ) : (
                        <motion.div key={currentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col justify-between space-y-12">
                           <div className="space-y-12">
                              <div className="space-y-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-black text-xs shadow-lg shadow-indigo-500/20">{currentIdx + 1}</div>
                                    <div className="h-px w-16 bg-gradient-to-r from-indigo-500/40 to-transparent" />
                                    <span className="text-[9px] font-black uppercase text-indigo-500/60 tracking-[0.3em] italic">Problem {currentIdx + 1}</span>
                                 </div>
                                 <h4 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.3]">
                                    {q.question}
                                 </h4>
                              </div>

                              <div className="grid gap-3">
                                 {(q.options || q.choices || []).map((opt: string, oi: number) => {
                                    const isSelected = answers[currentIdx] === oi;
                                    const isCorrect = oi === (q.correctAnswer !== undefined ? q.correctAnswer : q.answer);

                                    let borderClass = "border-slate-100 dark:border-white/5 hover:border-indigo-500/30";
                                    let bgClass = "bg-white dark:bg-white/[0.03]";
                                    let textClass = "text-slate-600 dark:text-white";

                                    if (isSelected) {
                                       if (isSubmitted) {
                                          if (isCorrect) {
                                             borderClass = "border-emerald-500 bg-emerald-500/10";
                                             bgClass = "bg-emerald-500/10";
                                             textClass = "text-emerald-600 dark:text-emerald-400";
                                          } else {
                                             borderClass = "border-rose-500 bg-rose-500/10";
                                             bgClass = "bg-rose-500/10";
                                             textClass = "text-rose-600 dark:text-rose-400";
                                          }
                                       } else {
                                          borderClass = "border-slate-900 dark:border-white shadow-2xl scale-[1.01]";
                                          bgClass = "bg-slate-900 dark:bg-white";
                                          textClass = "text-white dark:text-black";
                                       }
                                    } else if (isSubmitted && isCorrect) {
                                       borderClass = "border-emerald-500/50 bg-emerald-500/5";
                                       bgClass = "bg-emerald-500/5";
                                    }

                                    return (
                                       <button
                                          key={oi}
                                          onClick={() => !isSubmitted && setAnswers(prev => ({ ...prev, [currentIdx]: oi }))}
                                          disabled={isSubmitted}
                                          className={`w-full text-left p-5 md:p-6 rounded-[24px] border-2 transition-all group relative overflow-hidden flex items-center justify-between ${borderClass} ${bgClass}`}
                                       >
                                          <div className={`absolute left-0 top-0 w-1.5 h-full bg-indigo-500 transition-transform duration-500 ${isSelected && !isSubmitted ? 'translate-x-0' : '-translate-x-full'}`} />
                                          <div className="flex items-center gap-5 relative z-10">
                                             <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] border-2 transition-all ${isSelected && !isSubmitted ? 'bg-white/10 border-white/20 text-white dark:text-black' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 group-hover:border-indigo-500/30 group-hover:text-indigo-500'}`}>
                                                {String.fromCharCode(65 + oi)}
                                             </span>
                                             <span className={`text-base font-bold leading-snug ${textClass}`}>
                                                {opt}
                                             </span>
                                          </div>
                                          {isSelected && !isSubmitted && (
                                             <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg relative z-10">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                             </motion.div>
                                          )}
                                          {isSubmitted && isCorrect && (
                                             <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg relative z-10">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                             </div>
                                          )}
                                          {isSubmitted && isSelected && !isCorrect && (
                                             <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg relative z-10">
                                                <X className="w-3.5 h-3.5" />
                                             </div>
                                          )}
                                       </button>
                                    );
                                 })}
                              </div>
                           </div>

                           {/* Interactive Controls */}
                           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-center pt-10 border-t border-slate-200 dark:border-white/5 pb-10">
                              <button
                                 onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                                 disabled={currentIdx === 0}
                                 className={`py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] transition-all border-2 ${currentIdx > 0 ? 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-white' : 'opacity-20 cursor-not-allowed'}`}
                              >
                                 <ChevronLeft className="w-4 h-4" /> Previous
                              </button>

                              {!isSubmitted ? (
                                 <button
                                    onClick={() => toggleMark(currentIdx)}
                                    className={`py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] transition-all border-2 ${markedForReview.has(currentIdx) ? 'bg-primary-light border-primary-light text-white shadow-xl shadow-primary-light/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:border-primary-light/30 hover:text-primary-light'}`}
                                 >
                                    <AlertCircle className="w-4 h-4" /> Mark Review
                                 </button>
                              ) : (
                                 <button
                                    onClick={() => setReviewMode(false)}
                                    className="py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] transition-all border-2 bg-indigo-500/10 border-indigo-500/30 text-indigo-500 hover:bg-indigo-500 hover:text-white"
                                 >
                                    <Layout className="w-4 h-4" /> View Results
                                 </button>
                              )}

                              <button
                                 onClick={() => setCurrentIdx(prev => Math.min(mcqs.length - 1, prev + 1))}
                                 disabled={currentIdx === mcqs.length - 1}
                                 className={`py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] transition-all border-2 ${currentIdx < mcqs.length - 1 ? 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-white' : 'opacity-20 cursor-not-allowed text-slate-300'}`}
                              >
                                 Next <ChevronRight className="w-4 h-4" />
                              </button>

                              {!isSubmitted ? (
                                 <button
                                    onClick={handleGlobalSubmit}
                                    disabled={isSubmitting || (Object.keys(answers).length < mcqs.length && timeLeft > 0)}
                                    className={`py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-2xl hover:scale-105 active:scale-[0.98] disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-slate-900/30 dark:shadow-white/10 flex items-center justify-center gap-2`}
                                 >
                                    {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                                    {isSubmitting ? 'Submitting...' : 'Submit'}
                                 </button>
                              ) : (
                                 <button
                                    onClick={onClose}
                                    className="py-4 rounded-2xl bg-rose-500 text-white font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-2xl shadow-rose-500/20 hover:bg-rose-600"
                                 >
                                    Close Assessment
                                 </button>
                              )}
                           </div>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>
            </main>
         </div>
      </motion.div>
   );
}

