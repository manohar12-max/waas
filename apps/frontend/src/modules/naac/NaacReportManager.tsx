import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, ChevronRight, Search, Upload, FileText, Image as ImageIcon,
  BookOpen, Users, Award, CheckCircle2, Circle, Loader2, Eye,
  ThumbsUp, ThumbsDown, X, Plus, Trash2, Calendar, Download,
  RefreshCw, AlertTriangle, Building2, Sparkles, Play, StopCircle, CornerUpLeft
} from 'lucide-react';
import UniversalModal from '../../components/UniversalModal';

const API = import.meta.env.VITE_API_URL;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

/* ─── Types ─────────────────────────────────────────── */
interface College { _id: string; name: string; status: string; }
interface Workshop { _id: string; title: string; schedule: { start: string; end: string }; status: string; instructorId?: { name: string }; }
interface Report { _id: string; workshopTitle: string; status: string; collegeId: { _id: string; name: string }; startDate: string; endDate: string; officialNoticeUrl: string; activityReport: string; attendanceSheetUrl: string; photoUrls: string[]; feedbackSummary: string; resourcePersons: any[]; localParticipants: number; outstationParticipants: number; outcomes: string; naacCriterion: string; generatedReport: any; declineReason: string; approvedAt: string; department: string; aiStatus?: 'IDLE' | 'QUEUED' | 'ANALYZING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'STOPPED'; aiProgress?: number; workshopId: any; draftNoticeSummary?: string; draftImagesSummary?: string; draftMaterialsSummary?: string; }

const STATUS: Record<string, string> = {
  DRAFT: 'bg-slate-400/20 text-slate-400',
  PENDING_REVIEW: 'bg-yellow-400/20 text-yellow-400',
  APPROVED: 'bg-green-400/20 text-green-400',
  DECLINED: 'bg-red-400/20 text-red-400',
};

/* ─── Checklist row ─────────────────────────────────── */
function CheckRow({ done, label, children }: { done: boolean; label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-white/5 last:border-0">
      <div className={`flex items-center gap-2.5 text-sm font-medium transition-colors ${done ? 'text-green-500' : 'opacity-50'}`}>
        {done ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Circle className="w-4 h-4 shrink-0" />}
        {label}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/* ─── Step badge ─────────────────────────────────────── */
function StepBadge({ n, label, active }: { n: number; label: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}>
      <div className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center ${active ? 'bg-primary-light text-white' : 'bg-slate-200 dark:bg-white/10'}`}>{n}</div>
      <span className="text-sm font-bold">{label}</span>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────── */
export default function NaacReportManager() {
  const navigate = useNavigate();
  // Data
  const [colleges, setColleges] = useState<College[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  // Selection
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [collegeSearch, setCollegeSearch] = useState('');
  const [workshopSearch, setWorkshopSearch] = useState('');
  const [analyzingStep, setAnalyzingStep] = useState<null | 'notice' | 'images' | 'materials'>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1); // 1:Notice, 2:Images, 3:Materials, 4:Gen
  const [draftText, setDraftText] = useState('');

  // Flow step: 1=pick college, 2=pick workshop, 3=upload+generate
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [activeReport, setActiveReport] = useState<Report | null>(null);

  // Preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Report | null>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // Loading states
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [loadingWorkshops, setLoadingWorkshops] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // Form (step 3)
  const [form, setForm] = useState({
    activityReport: '', feedbackSummary: '', outcomes: '',
    naacCriterion: 'Criterion III: Research, Innovations & Extension',
    localParticipants: 0, outstationParticipants: 0, department: '',
    resourcePersons: [{ name: '', designation: '', topic: '' }],
  });

  const [backendStats, setBackendStats] = useState({
    attendanceCount: 0,
    feedbackCount: 0,
    feedbackAverage: 0,
    hasFeedbackComments: false
  });

  const noticeRef = useRef<HTMLInputElement>(null);
  const attendanceRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isCollegeAdmin = user.role === 'COLLEGE_ADMIN';

  useEffect(() => {
    fetchReports();
    if (isCollegeAdmin && user.collegeId) {
      // Auto-select their own college and jump straight to workshop picker
      const myCollege: College = { _id: user.collegeId, name: user.collegeName || 'My Institution', status: 'ACTIVE' };
      setSelectedCollege(myCollege);
      fetchWorkshopsForCollege(myCollege);
      setStep(2);
      setLoadingColleges(false);
    } else {
      fetchColleges();
    }
  }, []);

  // Polling for background generation
  useEffect(() => {
    let interval: any;
    if (activeReport && (activeReport.aiStatus === 'QUEUED' || activeReport.aiStatus === 'ANALYZING' || activeReport.aiStatus === 'GENERATING')) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API}/naac-reports/${activeReport._id}`, { headers: auth() });
          setActiveReport(res.data);
          if (res.data.aiStatus === 'COMPLETED') {
            setPreviewData(res.data);
            setShowPreview(true);
            setShowAnalysisModal(false);
            fetchReports();
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Polling failed:', err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [activeReport?.aiStatus]);

  /* ── Fetch ─────────────────────────────────────────── */
  const fetchColleges = async () => {
    setLoadingColleges(true);
    try {
      const res = await axios.get(`${API}/colleges`, { headers: auth() });
      setColleges(res.data);
    } catch {} finally { setLoadingColleges(false); }
  };

  const fetchWorkshopsForCollege = async (college: College) => {
    setLoadingWorkshops(true);
    setWorkshops([]);
    try {
      const res = await axios.get(`${API}/naac-reports/workshops-by-college/${college._id}`, { headers: auth() });
      setWorkshops(res.data);
    } catch (err) {
      console.error('Failed to fetch workshops:', err);
    } finally { setLoadingWorkshops(false); }
  };

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${API}/naac-reports`, { headers: auth() });
      setReports(res.data);
    } catch {}
  };

  /* ── Step 1: Select college ─────────────────────────── */
  const handleSelectCollege = (c: College) => {
    setSelectedCollege(c);
    setWorkshopSearch('');
    fetchWorkshopsForCollege(c);
    setStep(2);
  };

  /* ── Step 2: Select workshop → create report ─────────── */
  const handleSelectWorkshop = async (ws: Workshop) => {
    if (!selectedCollege) return;
    setCreating(true);
    try {
      const res = await axios.post(`${API}/naac-reports`, {
        workshopId: ws._id,
        collegeId: selectedCollege._id,
        workshopTitle: ws.title,
        department: form.department,
        startDate: ws.schedule?.start,
        endDate: ws.schedule?.end,
      }, { headers: auth() });
      enterStep3(res.data);
    } catch {} finally { setCreating(false); }
  };

  /* ── Resume existing report ─────────────────────────── */
  const resumeReport = (r: Report) => {
    setSelectedCollege({ _id: r.collegeId?._id, name: r.collegeId?.name, status: 'ACTIVE' });
    enterStep3(r);
  };

  const enterStep3 = (r: Report) => {
    setActiveReport(r);
    setForm({
      activityReport: r.activityReport || '',
      feedbackSummary: r.feedbackSummary || '',
      outcomes: r.outcomes || '',
      naacCriterion: r.naacCriterion || 'Criterion III: Research, Innovations & Extension',
      localParticipants: r.localParticipants || 0,
      outstationParticipants: r.outstationParticipants || 0,
      department: r.department || '',
      resourcePersons: r.resourcePersons?.length ? r.resourcePersons : [{ name: '', designation: '', topic: '' }],
    });
    setStep(3);
    fetchReports();
    fetchBackendStats(r);
  };

  const fetchBackendStats = async (r: Report) => {
    try {
      const res = await axios.get(`${API}/naac-reports/${r._id}/backend-stats/${(r as any).workshopId?._id || (r as any).workshopId}`, { headers: auth() });
      setBackendStats(res.data);
      // Auto-update participants if 0
      if (!r.localParticipants) {
        setForm(f => ({ ...f, localParticipants: res.data.attendanceCount }));
      }
    } catch (err) {
      console.error('Failed to fetch backend stats:', err);
    }
  };

  /* ── Save raw data ───────────────────────────────────── */
  const saveData = async () => {
    if (!activeReport) return null;
    setSaving(true);
    try {
      const res = await axios.patch(`${API}/naac-reports/${activeReport._id}/raw-data`, form, { headers: auth() });
      setActiveReport(res.data);
      fetchReports();
      return res.data;
    } catch { return null; } finally { setSaving(false); }
  };

  /* ── File uploads ────────────────────────────────────── */
  const uploadFile = async (type: 'notice' | 'attendance' | 'photos', files: FileList | null) => {
    if (!files || !activeReport) return;
    setUploading(type);
    try {
      const fd = new FormData();
      if (type === 'photos') Array.from(files).forEach(f => fd.append('photos', f));
      else fd.append('file', files[0]);
      const ep = type === 'notice' ? 'notice' : type === 'attendance' ? 'attendance' : 'photos';
      const res = await axios.post(`${API}/naac-reports/${activeReport._id}/upload/${ep}`, fd, {
        headers: { ...auth(), 'Content-Type': 'multipart/form-data' },
      });
      setActiveReport(res.data);
      fetchReports();
    } catch {} finally { setUploading(null); }
  };

  /* ── Resource persons ────────────────────────────────── */
  const addRP = () => setForm(f => ({ ...f, resourcePersons: [...f.resourcePersons, { name: '', designation: '', topic: '' }] }));
  const removeRP = (i: number) => setForm(f => ({ ...f, resourcePersons: f.resourcePersons.filter((_, idx) => idx !== i) }));
  const updateRP = (i: number, k: string, v: string) => setForm(f => {
    const rps = [...f.resourcePersons]; rps[i] = { ...rps[i], [k]: v }; return { ...f, resourcePersons: rps };
  });

  /* ── Checklist ───────────────────────────────────────── */
  const checks = {
    notice: !!activeReport?.officialNoticeUrl,
    photos: (activeReport?.photoUrls?.length || 0) >= 1,
    backend: backendStats.attendanceCount > 0,
    feedback: backendStats.feedbackCount > 0 || form.feedbackSummary.trim().length >= 10,
  };
  const allDone = checks.notice && checks.photos && checks.feedback;

  /* ── Wizard Flow ───────────────────────────────────── */
  const startWizard = async () => {
    setShowAnalysisModal(true);
    setWizardStep(1);
    await analyzeNotice();
  };

  const analyzeNotice = async () => {
    if (!activeReport?.officialNoticeUrl) return nextWizardStep();
    setAnalyzingStep('notice');
    try {
      const res = await axios.post(`${API}/naac-reports/${activeReport._id}/analyze-notice`, {}, { headers: auth() });
      setDraftText(res.data?.text || '');
    } catch (err) {
      console.error('Notice scrutiny failed:', err);
    } finally { setAnalyzingStep(null); }
  };

  const analyzeImages = async () => {
    if (!activeReport || !activeReport.photoUrls?.length) return nextWizardStep();
    setAnalyzingStep('images');
    try {
      const res = await axios.post(`${API}/naac-reports/${activeReport._id}/analyze-images`, {}, { headers: auth() });
      setDraftText(res.data?.text || '');
    } catch (err) {
      console.error('Image scrutiny failed:', err);
    } finally { setAnalyzingStep(null); }
  };

  const analyzeMaterials = async () => {
    if (!activeReport) return;
    setAnalyzingStep('materials');
    try {
      const res = await axios.post(`${API}/naac-reports/${activeReport._id}/analyze-materials`, {}, { headers: auth() });
      setDraftText(res.data?.text || '');
    } catch (err) {
      console.error('Material scrutiny failed:', err);
    } finally { setAnalyzingStep(null); }
  };

  const saveWizardDraft = async () => {
    if (!activeReport) return;
    setSaving(true);
    try {
      const field = wizardStep === 1 ? 'draftNoticeSummary' : wizardStep === 2 ? 'draftImagesSummary' : 'draftMaterialsSummary';
      await axios.patch(`${API}/naac-reports/${activeReport._id}/raw-data`, { [field]: draftText }, { headers: auth() });
      if (wizardStep === 1) setForm(f => ({ ...f, activityReport: draftText.substring(0, 1000) }));
    } catch {} finally { setSaving(false); }
  };

  const nextWizardStep = async () => {
    await saveWizardDraft();
    if (wizardStep === 1) {
      setWizardStep(2);
      setDraftText('');
      await analyzeImages();
    } else if (wizardStep === 2) {
      setWizardStep(3);
      setDraftText('');
      await analyzeMaterials();
    } else if (wizardStep === 3) {
      setWizardStep(4);
      setDraftText('');
      handleGenerate();
    }
  };

  /* ── Generate ────────────────────────────────────────── */
  const handleGenerate = async () => {
    await saveData();
    setGenerating(true);
    setShowAnalysisModal(true);
    setWizardStep(4);
    try {
      const res = await axios.post(`${API}/naac-reports/${activeReport!._id}/generate`, {}, { headers: auth() });
      setActiveReport(res.data);
      fetchReports();
      // Auto-close modal after starting
      setTimeout(() => setShowAnalysisModal(false), 2000);
    } catch {} finally { setGenerating(false); }
  };

  const handleStop = async () => {
    if (!activeReport) return;
    try {
      const res = await axios.post(`${API}/naac-reports/${activeReport._id}/stop`, {}, { headers: auth() });
      setActiveReport(res.data);
      fetchReports();
    } catch (err) {
      console.error('Failed to stop:', err);
    }
  };

  /* ── Approve / Decline ───────────────────────────────── */
  const handleApprove = async () => {
    setSaving(true);
    try {
      const res = await axios.post(`${API}/naac-reports/${previewData!._id}/approve`, {}, { headers: auth() });
      setPreviewData(res.data); setActiveReport(res.data);
      setShowPreview(false); fetchReports();
    } catch {} finally { setSaving(false); }
  };

  const handleDecline = async () => {
    setSaving(true);
    try {
      const res = await axios.post(`${API}/naac-reports/${previewData!._id}/decline`, { reason: declineReason }, { headers: auth() });
      setActiveReport(res.data); setPreviewData(null);
      setShowPreview(false); setShowDecline(false); setDeclineReason(''); fetchReports();
    } catch {} finally { setSaving(false); }
  };

  const handleCancel = async () => {
    if (previewData) await axios.post(`${API}/naac-reports/${previewData._id}/cancel-review`, {}, { headers: auth() });
    setShowPreview(false); setShowDecline(false); fetchReports();
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this report? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/naac-reports/${id}`, { headers: auth() });
      fetchReports();
    } catch {
      alert('Failed to delete report.');
    }
  };

  /* ─── Filtered lists ─────────────────────────────────── */
  const filteredColleges = colleges.filter(c =>
    c.name.toLowerCase().includes(collegeSearch.toLowerCase())
  );
  const filteredWorkshops = workshops.filter(w =>
    w.title.toLowerCase().includes(workshopSearch.toLowerCase())
  );

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-primary-light" />
            NAAC Report Generator
          </h1>
          <p className="text-sm opacity-50 mt-1">
            {isCollegeAdmin
              ? 'Select a workshop from your institution and upload raw evidence'
              : 'Select a college, then its workshop, then upload your raw evidence'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/naac-reports/view')} className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer border border-green-500/20 shadow-lg shadow-green-500/5">
            <Award className="w-3.5 h-3.5" /> View Approved Repository
          </button>
          <button onClick={() => { fetchColleges(); fetchReports(); }} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors">
            <RefreshCw className="w-4 h-4 opacity-40" />
          </button>
        </div>
      </div>

      {/* Progress trail — hide College step for COLLEGE_ADMIN */}
      <div className="flex items-center gap-3">
        {!isCollegeAdmin && (
          <>
            <StepBadge n={1} label="College" active={step >= 1} />
            <ChevronRight className="w-4 h-4 opacity-20" />
          </>
        )}
        <StepBadge n={isCollegeAdmin ? 1 : 2} label="Workshop" active={step >= 2} />
        <ChevronRight className="w-4 h-4 opacity-20" />
        <StepBadge n={isCollegeAdmin ? 2 : 3} label="Raw Materials" active={step >= 3} />
      </div>

      {/* ══ STEP 1: Select college ══════════════════════════ */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4">
            <h2 className="font-black text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-light" /> Select College / Institution
            </h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input value={collegeSearch} onChange={e => setCollegeSearch(e.target.value)}
                placeholder="Search college name…"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-primary-light outline-none"
              />
            </div>

            {loadingColleges ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin opacity-30" /></div>
            ) : filteredColleges.length === 0 ? (
              <div className="py-10 text-center text-sm opacity-30 font-bold">No colleges found. Onboard colleges first from Partners.</div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredColleges.map(c => (
                  <motion.button key={c._id} whileHover={{ x: 3 }}
                    onClick={() => handleSelectCollege(c)}
                    className="w-full text-left flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.03] hover:bg-primary-light/5 border border-slate-200 dark:border-white/10 hover:border-primary-light/40 rounded-2xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-light/10 flex items-center justify-center font-black text-primary-light">
                        {c.name[0]}
                      </div>
                      <div>
                        <p className="font-black text-sm">{c.name}</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${c.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500' : c.status === 'EXPIRED' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-60 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Existing reports quick-resume */}

            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase opacity-40 tracking-widest px-1">Recent Reports</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {reports.map(r => {
                   const isAIBusy = r.aiStatus === 'GENERATING' || r.aiStatus === 'QUEUED' || r.aiStatus === 'ANALYZING';
                   const progress = r.aiProgress || 0;
                   const eta = Math.max(0, Math.ceil(((100 - progress) / 10) * 3));
                   const hasReport = !!r.generatedReport;
                   const isApproved = r.status === 'APPROVED';
                   
                   return (
                     <div key={r._id} className="relative bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 hover:border-primary-light/30 rounded-3xl transition-all overflow-hidden group p-5 space-y-4 shadow-sm">
                       <div className="flex justify-between items-start">
                         <div className="cursor-pointer flex-1" onClick={() => {
                           if (isApproved) { setPreviewData(r); setShowPreview(true); }
                           else {
                             resumeReport(r);
                             if (isAIBusy) { setWizardStep(4); setShowAnalysisModal(true); }
                           }
                         }}>
                            <p className="font-black text-sm line-clamp-1">{r.workshopTitle}</p>
                            <p className="text-[10px] opacity-40 mt-0.5">{r.collegeId?.name}</p>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${STATUS[r.status]}`}>
                              {r.status.replace('_', ' ')}
                            </span>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteReport(r._id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer" title="Delete Report">
                              <Trash2 className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                            </button>
                         </div>
                       </div>

                       {isAIBusy ? (
                         <div className="space-y-3">
                           <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
                             <span className="text-primary-light animate-pulse flex items-center gap-1">
                               <Loader2 className="w-3 h-3 animate-spin" /> 
                               {r.aiStatus === 'QUEUED' ? 'Waiting in Queue...' : r.aiStatus === 'ANALYZING' ? 'Reading Materials...' : 'Synthesizing Report...'}
                             </span>
                             <span className="opacity-40">ETA: ~{eta}s</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }} 
                               animate={{ width: `${progress}%` }} 
                               className="h-full bg-primary-light"
                             />
                           </div>
                           <div className="flex gap-2">
                             <button 
                               onClick={(e) => { e.stopPropagation(); setActiveReport(r); handleStop(); }}
                               className="flex-1 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer"
                             >
                               Stop
                             </button>
                             <button 
                               onClick={(e) => { e.stopPropagation(); resumeReport(r); setWizardStep(4); setShowAnalysisModal(true); }}
                               className="flex-1 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer"
                             >
                               Details
                             </button>
                           </div>
                         </div>
                       ) : (
                         <div className="flex gap-2">
                            {isApproved || hasReport ? (
                              <button onClick={() => { setPreviewData(r); setShowPreview(true); }} className="flex-1 py-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5">
                                <Eye className="w-3 h-3" /> View Report
                              </button>
                            ) : null}
                            
                            {!isApproved && (
                              <button onClick={() => resumeReport(r)} className="flex-1 py-2 bg-primary-light/10 text-primary-light hover:bg-primary-light hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer">
                                {hasReport ? 'Edit Draft' : 'Complete Setup'}
                              </button>
                            )}

                            {r.status === 'DRAFT' && r.draftMaterialsSummary && (
                              <button onClick={() => { setActiveReport(r); handleGenerate(); }} className="px-3 py-2 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer" title="Generate Report">
                                <Play className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                              </button>
                            )}
                         </div>
                       )}
                     </div>
                   );
                 })}
              </div>
            </div>
        </motion.div>
      )}

      {/* ══ STEP 2: Select workshop ═════════════════════════ */}
      {step === 2 && selectedCollege && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Back breadcrumb */}
          <div className="flex items-center gap-2">
            <button onClick={() => { setStep(1); setWorkshops([]); }}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer transition-colors">
              <ChevronRight className="w-4 h-4 rotate-180 opacity-50" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary-light/10 flex items-center justify-center font-black text-primary-light text-sm">
                {selectedCollege.name[0]}
              </div>
              <div>
                <p className="text-xs opacity-40 font-bold">College</p>
                <p className="font-black text-base leading-tight">{selectedCollege.name}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4">
            <h2 className="font-black text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-light" /> Select a Workshop
              {workshops.length > 0 && <span className="text-xs font-bold opacity-40">({workshops.length} found)</span>}
            </h2>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input value={workshopSearch} onChange={e => setWorkshopSearch(e.target.value)}
                placeholder="Search workshop title…"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-primary-light outline-none"
              />
            </div>

            {loadingWorkshops ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin opacity-30" /></div>
            ) : filteredWorkshops.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <BookOpen className="w-10 h-10 mx-auto opacity-10" />
                <p className="text-sm font-bold opacity-30">No workshops found for this college.</p>
                <p className="text-xs opacity-20">Workshops must be created by the college's Instructor first.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {filteredWorkshops.map(ws => (
                  <motion.button key={ws._id} whileHover={{ x: 3 }}
                    onClick={() => handleSelectWorkshop(ws)}
                    disabled={creating}
                    className="w-full text-left flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.03] hover:bg-primary-light/5 border border-slate-200 dark:border-white/10 hover:border-primary-light/40 rounded-2xl transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <div className="space-y-0.5">
                      <p className="font-black text-sm">{ws.title}</p>
                      {ws.instructorId && <p className="text-xs opacity-40">Instructor: {ws.instructorId.name}</p>}
                      {ws.schedule?.start && (
                        <p className="text-[10px] opacity-40 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(ws.schedule.start).toLocaleDateString('en-IN')} – {new Date(ws.schedule.end).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${ws.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : ws.status === 'INACTIVE' ? 'bg-red-500/20 text-red-400' : 'bg-slate-400/20 text-slate-400'}`}>
                        {ws.status}
                      </span>
                      {creating ? <Loader2 className="w-4 h-4 animate-spin opacity-40" /> : <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-60 transition-opacity" />}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ══ STEP 3: Upload raw materials ═══════════════════ */}
      {step === 3 && activeReport && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Back breadcrumb */}
          <div className="flex items-center gap-2">
            <button onClick={() => { setStep(selectedCollege ? 2 : 1); fetchWorkshopsForCollege(selectedCollege!); }}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer transition-colors">
              <ChevronRight className="w-4 h-4 rotate-180 opacity-50" />
            </button>
            <div>
              <p className="text-xs opacity-40 font-bold">{activeReport.collegeId?.name}</p>
              <h2 className="font-black text-xl leading-tight">{activeReport.workshopTitle}</h2>
            </div>
            <span className={`ml-auto text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${STATUS[activeReport.status]}`}>
              {activeReport.status.replace('_', ' ')}
            </span>
          </div>

          {activeReport.declineReason && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-500">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span><strong>Declined:</strong> {activeReport.declineReason}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              {/* Floating Progress Tracker if generating */}
              {(activeReport.aiStatus === 'GENERATING' || activeReport.aiStatus === 'QUEUED' || activeReport.aiStatus === 'ANALYZING') && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} 
                  className="mb-6 bg-primary-light/5 border border-primary-light/10 rounded-3xl p-5 overflow-hidden relative"
                >
                  <div className="flex justify-between items-center mb-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-light/10 flex items-center justify-center">
                         <Loader2 className="w-5 h-5 text-primary-light animate-spin" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">AI Brain Processing</p>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white">
                          {activeReport.aiStatus === 'QUEUED' ? 'Waiting for slot...' : activeReport.aiStatus === 'ANALYZING' ? 'Reading evidence...' : 'Writing report...'}
                        </h4>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="text-2xl font-black text-primary-light">{activeReport.aiProgress || 0}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden relative z-10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${activeReport.aiProgress || 0}%` }}
                      className="h-full bg-primary-light shadow-[0_0_10px_rgba(var(--color-primary-light),0.5)]"
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* LEFT col: Evidence checklist + Resource persons */}
            <div className="space-y-6">
              {/* Evidence Checklist */}
              <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4">
                <h3 className="font-black text-xs uppercase tracking-widest opacity-50">NAAC Evidence Checklist</h3>
                
                <CheckRow done={checks.notice} label="Official Notice / Circular">
                  <div className="flex gap-2">
                    {activeReport.officialNoticeUrl && (
                      <button onClick={() => window.open(activeReport.officialNoticeUrl, '_blank')} className="text-[9px] font-bold text-primary-light hover:underline underline-offset-4 flex items-center gap-1 cursor-pointer">
                        View PDF
                      </button>
                    )}
                    <button onClick={() => noticeRef.current?.click()} disabled={uploading === 'notice'}
                      className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 bg-primary-light/10 text-primary-light rounded-xl cursor-pointer hover:bg-primary-light/20 transition-colors uppercase tracking-widest">
                      {uploading === 'notice' ? <Loader2 className="w-3 h-3 animate-spin" /> : activeReport.officialNoticeUrl ? <RefreshCw className="w-3 h-3" /> : <Upload className="w-3 h-3" />} {activeReport.officialNoticeUrl ? 'Replace' : 'Upload'}
                    </button>
                  </div>
                  <input ref={noticeRef} type="file" accept=".pdf,image/*" className="hidden" onChange={e => uploadFile('notice', e.target.files)} />
                </CheckRow>

                <CheckRow done={checks.backend} label="Backend Data (Attendance & Feedback)">
                  <div className="flex gap-2">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-green-500">{backendStats.attendanceCount} Students</span>
                      <span className="text-[10px] opacity-40">{backendStats.feedbackCount} Feedbacks</span>
                    </div>
                  </div>
                </CheckRow>

                <CheckRow done={checks.photos} label={`Event Photos (${activeReport.photoUrls?.length || 0} uploaded)`}>
                  <button onClick={() => photosRef.current?.click()} disabled={uploading === 'photos'}
                    className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 bg-slate-100 dark:bg-white/10 rounded-xl cursor-pointer hover:bg-primary-light/10 transition-colors uppercase tracking-widest">
                    {uploading === 'photos' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />} Upload
                  </button>
                  <input ref={photosRef} type="file" accept="image/*" multiple className="hidden" onChange={e => uploadFile('photos', e.target.files)} />
                </CheckRow>

                <CheckRow done={checks.feedback} label={`Feedback Analysis (${backendStats.feedbackCount} responses)`} />
              </div>

              {/* Participant counts */}
              <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-3">
                <h3 className="font-black text-xs uppercase tracking-widest opacity-50">Participant Count</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Local', key: 'localParticipants' },
                    { label: 'Outstation', key: 'outstationParticipants' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="text-[10px] font-black uppercase opacity-40 block mb-1">{label}</label>
                      <input type="number" min={0} value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-light outline-none"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 block mb-1">Organising Department</label>
                  <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    placeholder="e.g. Dept. of Computer Science"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-light outline-none"
                  />
                </div>
              </div>

              {/* Resource persons */}
              <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-xs uppercase tracking-widest opacity-50">Resource Persons</h3>
                  <button onClick={addRP} className="flex items-center gap-1 text-[10px] font-black px-2 py-1 bg-primary-light/10 text-primary-light rounded-lg cursor-pointer hover:bg-primary-light/20 transition-colors uppercase tracking-widest">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                {form.resourcePersons.map((rp, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <input value={rp.name} onChange={e => updateRP(i, 'name', e.target.value)} placeholder="Name"
                      className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-primary-light outline-none" />
                    <input value={rp.designation} onChange={e => updateRP(i, 'designation', e.target.value)} placeholder="Designation"
                      className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-primary-light outline-none" />
                    <div className="flex gap-1">
                      <input value={rp.topic} onChange={e => updateRP(i, 'topic', e.target.value)} placeholder="Topic"
                        className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-primary-light outline-none" />
                      <button onClick={() => removeRP(i)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT col: text inputs + actions */}
            <div className="space-y-5">
              <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4">
                <h3 className="font-black text-xs uppercase tracking-widest opacity-50">AI Report Inputs</h3>

                <div className="p-4 bg-primary-light/5 border border-primary-light/10 rounded-2xl space-y-2">
                   <p className="text-xs font-bold text-primary-light flex items-center gap-2">
                     <RefreshCw className="w-3 h-3" /> AI will automatically use:
                   </p>
                   <ul className="text-[10px] space-y-1 opacity-70 list-disc ml-4">
                     <li>Student Attendance (${backendStats.attendanceCount} records)</li>
                     <li>Student Feedback Analysis (${backendStats.feedbackCount} responses)</li>
                     <li>Extracted text from Official Notice/Circular</li>
                     <li>Workshop Title & Institutional Metadata</li>
                   </ul>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 block mb-1">Activity Highlights <span className="normal-case">(optional - help AI with specific details)</span></label>
                  <textarea value={form.activityReport} onChange={e => setForm(f => ({ ...f, activityReport: e.target.value }))} rows={4}
                    placeholder="E.g. Guest speaker shared insights on cloud security. Team building activity was a hit..."
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-light outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 block mb-1">
                    Feedback Summary {backendStats.feedbackCount === 0 && <span className="text-red-500 font-black">(REQUIRED)</span>}
                  </label>
                  <textarea value={form.feedbackSummary} onChange={e => setForm(f => ({ ...f, feedbackSummary: e.target.value }))} rows={3}
                    placeholder={backendStats.feedbackCount > 0 ? "Add specific observations to supplement student feedback..." : "Summary of participant feedback and follow-up actions..."}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-light outline-none resize-none"
                  />
                  {backendStats.feedbackCount > 0 && <p className="text-[9px] opacity-40 mt-1 italic">Backend found {backendStats.feedbackCount} student responses. AI will combine them with your notes.</p>}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 block mb-1">Outcomes <span className="normal-case opacity-60">(optional)</span></label>
                  <textarea value={form.outcomes} onChange={e => setForm(f => ({ ...f, outcomes: e.target.value }))} rows={2}
                    placeholder="How the workshop achieved its objectives…"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-light outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 block mb-1">NAAC Criterion</label>
                  <input value={form.naacCriterion} onChange={e => setForm(f => ({ ...f, naacCriterion: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-light outline-none"
                  />
                </div>
              </div>

               {/* AI Action Area */}
               <div className="space-y-3">
                <button onClick={saveData} disabled={saving}
                  className="w-full py-3 border border-primary-light/40 text-primary-light hover:bg-primary-light/10 rounded-2xl font-black text-sm uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Progress
                </button>

                {activeReport.aiStatus === 'GENERATING' || activeReport.aiStatus === 'QUEUED' || activeReport.aiStatus === 'ANALYZING' ? (
                  <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 text-red-500 uppercase tracking-widest font-black text-[10px]">
                         <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2 h-2 rounded-full bg-red-500" />
                         Processing Task...
                       </div>
                       <span className="font-black text-red-500 text-sm">{activeReport.aiProgress || 0}%</span>
                    </div>
                    <button onClick={handleStop}
                      className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2">
                      <StopCircle className="w-4 h-4" /> Stop Generation
                    </button>
                  </div>
                ) : (
                  <button onClick={startWizard}
                    disabled={!allDone || generating}
                    className="w-full py-4 bg-primary-light hover:bg-primary-light/90 text-white rounded-2xl font-black text-sm uppercase tracking-widest cursor-pointer transition-all shadow-xl shadow-primary-light/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                    {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
                    {generating ? 'AI Processing…' : 'Start Multi-Step Generation'}
                  </button>
                )}

                {!allDone && <p className="text-center text-[10px] font-bold uppercase opacity-30 tracking-widest">Upload Circular & Photos to generate</p>}

                {(activeReport.status === 'PENDING_REVIEW' || activeReport.status === 'APPROVED') && (
                  <button onClick={() => { setPreviewData(activeReport); setShowPreview(true); }}
                    className={`w-full py-3 border rounded-2xl font-black text-sm uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2 ${activeReport.status === 'APPROVED' ? 'border-green-500/30 text-green-500 hover:bg-green-500/10' : 'border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10'}`}>
                    <Eye className="w-4 h-4" /> {activeReport.status === 'APPROVED' ? 'View Approved Report' : 'Review Generated Report'}
                  </button>
                )}
              </div>
            </div>
          </div>

      <UniversalModal
        isOpen={showAnalysisModal}
        onClose={() => { handleStop(); setShowAnalysisModal(false); }}
        title="AI Scrutiny Wizard"
        description={wizardStep === 4 ? `Generating Final Report` : `Stage ${wizardStep} of 3: AI Extraction`}
        icon={<Sparkles />}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${wizardStep > s ? 'bg-green-500' : wizardStep === s ? 'bg-primary-light animate-pulse' : 'bg-slate-200 dark:bg-white/5'}`} />
              </div>
            ))}
          </div>

          <div className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl p-6 min-h-[400px] flex flex-col justify-between">
            {wizardStep < 4 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-primary-light uppercase tracking-widest">
                    {analyzingStep ? 'AI is processing evidence...' : 'Review AI Extraction'}
                  </span>
                  {analyzingStep && <Loader2 className="w-4 h-4 text-primary-light animate-spin" />}
                </div>

                <div className="flex-1 relative mb-6">
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder="Mining data from your workshop uploads..."
                    className="w-full h-full min-h-[300px] bg-transparent border-none text-slate-700 dark:text-slate-300 text-sm leading-relaxed resize-none focus:ring-0 font-mono scrollbar-hide"
                  />
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold max-w-[60%] italic">
                    Review and edit the summaries above to guide the AI report generation.
                  </p>
                  <div className="flex items-center gap-3">
                    {wizardStep > 1 && (
                      <button onClick={() => setWizardStep(prev => (prev - 1) as any)} className="px-4 py-2 text-xs font-black uppercase opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
                        Back
                      </button>
                    )}
                    <button 
                      onClick={nextWizardStep}
                      disabled={!!analyzingStep || saving}
                      className="px-6 py-3 bg-primary-light text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-light/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
                    >
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve & Continue'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-2 space-y-8 flex flex-col justify-center h-full">
                {/* Overall Progress Bar */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end mb-2">
                    <div className="space-y-1">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${STATUS[activeReport?.aiStatus || 'QUEUED']}`}>
                        {activeReport?.aiStatus?.replace('_', ' ') || 'QUEUED'}
                      </span>
                      <h3 className="font-black text-xl text-slate-900 dark:text-white">
                        {activeReport?.aiStatus === 'QUEUED' ? 'Waiting in Queue...' : activeReport?.aiStatus === 'ANALYZING' ? 'Analyzing Materials...' : 'Generating Report...'}
                      </h3>
                    </div>
                    <div className="text-right">
                       <span className="text-3xl font-black text-primary-light">{(activeReport?.aiProgress || 0)}%</span>
                       <p className="text-[10px] font-bold opacity-40 uppercase">Completion Rate</p>
                    </div>
                  </div>

                  <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-slate-200/50 dark:border-white/10 p-0.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${activeReport?.aiProgress || 0}%` }}
                      className="h-full bg-gradient-to-r from-primary-light to-blue-500 rounded-full shadow-[0_0_15px_rgba(var(--color-primary-light),0.4)]"
                    />
                  </div>

                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-40">
                    <span>Aggregating Data</span>
                    <span>Synthesis</span>
                    <span>Final Standards</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {[
                    { label: 'Synthesizing Approved Context', progress: 10 },
                    { label: 'Generating Professional Narrative', progress: 50 },
                    { label: 'Finalizing NAAC Standard Format', progress: 90 }
                  ].map((step, i) => {
                    const currentProgress = activeReport?.aiProgress || 0;
                    const isDone = currentProgress > step.progress || activeReport?.aiStatus === 'COMPLETED' || activeReport?.status === 'PENDING_REVIEW';
                    const isCurrent = currentProgress >= step.progress && activeReport?.aiStatus === 'GENERATING' && !isDone;
                    
                    return (
                      <div key={i} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isDone ? 'bg-green-500/5 border-green-500/10' : isCurrent ? 'bg-primary-light/5 border-primary-light/10 shadow-[0_0_20px_rgba(var(--color-primary-light),0.05)]' : 'border-slate-200 dark:border-white/5 opacity-30'}`}>
                        <div className="flex items-center gap-3">
                          {isDone ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : isCurrent ? <Loader2 className="w-5 h-5 text-primary-light animate-spin" /> : <Circle className="w-5 h-5 opacity-20" />}
                          <span className={`text-xs font-black uppercase tracking-wider ${isDone ? 'text-green-500' : isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{step.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col items-center gap-3">
                  {activeReport?.aiStatus === 'GENERATING' || activeReport?.aiStatus === 'QUEUED' || activeReport?.aiStatus === 'ANALYZING' ? (
                    <div className="flex flex-col items-center gap-4 w-full">
                      <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl w-full text-center space-y-1">
                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">
                          Estimated Time Remaining
                        </p>
                        <p className="text-2xl font-black text-primary-light animate-pulse">
                          ~{Math.max(1, Math.ceil(((100 - (activeReport?.aiProgress || 0)) / 10) * 3))} Seconds
                        </p>
                      </div>
                      
                      <button onClick={handleStop} className="flex items-center gap-2 px-8 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 rounded-xl hover:text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer">
                        <StopCircle className="w-4 h-4" /> Stop Generation
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {activeReport?.status === 'PENDING_REVIEW' || activeReport?.aiStatus === 'COMPLETED' ? (
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex items-center gap-3 px-6 py-3 bg-green-500/10 text-green-500 rounded-full border border-green-500/20 animate-bounce">
                             <CheckCircle2 className="w-5 h-5" />
                             <span className="font-black text-xs uppercase tracking-widest">Report Ready for Review!</span>
                          </div>
                          <button 
                            onClick={() => { setPreviewData(activeReport); setShowPreview(true); }} 
                            className="flex items-center gap-2 px-10 py-5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-green-500/20 transform hover:scale-105 active:scale-95 transition-all cursor-pointer"
                          >
                            <Eye className="w-5 h-5" /> Review & Approve Report
                          </button>
                        </div>
                      ) : (
                        <button onClick={handleGenerate} className="flex items-center gap-2 px-10 py-5 bg-primary-light text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary-light/20 hover:scale-105 active:scale-95 transition-all cursor-pointer">
                          <Play className="w-5 h-5" /> {activeReport?.aiStatus === 'FAILED' ? 'Retry Generation' : 'Start Multi-Step Generation'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center pt-4 border-t border-slate-100 dark:border-white/5">
            <button 
              onClick={() => setShowAnalysisModal(false)} 
              className="text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity flex items-center gap-2 cursor-pointer"
            >
              {wizardStep === 4 && (activeReport?.aiStatus === 'GENERATING' || activeReport?.aiStatus === 'QUEUED') 
                ? '✕ Close & Continue in Background' 
                : '✕ Save & Close'}
            </button>
          </div>
        </div>
      </UniversalModal>
        </motion.div>
      )}

      {/* ══ PREVIEW MODAL ═══════════════════════════════════ */}
      <AnimatePresence>
        {showPreview && previewData?.generatedReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
            <div className="min-h-screen flex items-start justify-center p-4 py-8">
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="w-full max-w-3xl bg-white dark:bg-[#0a0b0f] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl">

                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0b0f]">
                  <span className="font-black text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-light" /> NAAC Report Preview
                  </span>
                  <button onClick={() => setShowPreview(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>

                <div className="p-8 space-y-8 text-slate-900 dark:text-slate-100">
                  {(() => {
                    const g = previewData.generatedReport;
                    return <>
                      <div className="text-center space-y-2 pb-6 border-b border-slate-200 dark:border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{g.titlePage.naacCriterion}</p>
                        <h1 className="text-2xl font-black">{g.titlePage.workshopName}</h1>
                        <p className="font-bold opacity-60">{g.titlePage.department}</p>
                        <p className="opacity-50">{g.titlePage.college}</p>
                        <p className="text-sm opacity-40 flex items-center justify-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> 
                          {(() => {
                            const raw = g.titlePage.dateRange;
                            if (!raw || !raw.includes(' to ')) return raw;
                            const parts = raw.split(' to ');
                            const clean = parts.map((p: string) => {
                              try {
                                const d = new Date(p);
                                return isNaN(d.getTime()) ? p : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                              } catch { return p; }
                            });
                            return clean.join(' - ');
                          })()}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h2 className="font-black text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary-light" /> Introduction</h2>
                        <p className="text-sm leading-relaxed opacity-75">{g.introduction}</p>
                      </div>

                      <div className="space-y-3">
                        <h2 className="font-black text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary-light" /> Session Details</h2>
                        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-white/5">
                              <tr>{['S.No', 'Name', 'Designation', 'Topic'].map(h => <th key={h} className="text-left px-3 py-2.5 text-[10px] font-black uppercase opacity-40 tracking-widest">{h}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                              {g.sessionDetails.resourcePersons.map((rp: any, i: number) => (
                                <tr key={i}>
                                  <td className="px-3 py-2.5 text-xs opacity-40">{i + 1}</td>
                                  <td className="px-3 py-2.5 text-xs font-bold">{rp.name}</td>
                                  <td className="px-3 py-2.5 text-xs opacity-60">{rp.designation}</td>
                                  <td className="px-3 py-2.5 text-xs opacity-60">{rp.topic}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex flex-wrap gap-4 pt-1">
                          {[
                            { v: g.sessionDetails.supportingDocs.officialNotice, l: 'Official notice' },
                            { v: g.sessionDetails.supportingDocs.attendanceSheet, l: 'Attendance sheet' },
                            { v: g.sessionDetails.supportingDocs.photos > 0, l: `${g.sessionDetails.supportingDocs.photos} photo(s)` },
                          ].map(d => <div key={d.l} className={`flex items-center gap-1.5 text-xs ${d.v ? 'text-green-500' : 'opacity-30'}`}><CheckCircle2 className="w-3.5 h-3.5" />{d.l}</div>)}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h2 className="font-black text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary-light" /> Participant Profile</h2>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { l: 'Local', v: g.participantProfile.local, c: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
                            { l: 'Outstation', v: g.participantProfile.outstation, c: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
                            { l: 'Total', v: g.participantProfile.total, c: 'bg-primary-light/10 text-primary-light border-primary-light/20' },
                          ].map(s => <div key={s.l} className={`rounded-2xl border p-4 text-center ${s.c}`}><div className="text-3xl font-black">{s.v}</div><div className="text-[10px] uppercase tracking-widest opacity-60 mt-1">{s.l}</div></div>)}
                        </div>
                        <p className="text-sm opacity-70">{g.participantProfile.summary}</p>
                      </div>

                      <div className="space-y-2">
                        <h2 className="font-black text-base flex items-center gap-2"><Award className="w-4 h-4 text-primary-light" /> Feedback Analysis</h2>
                        <p className="text-sm leading-relaxed opacity-75">{g.feedbackSummary}</p>
                      </div>

                      <div className="space-y-2">
                        <h2 className="font-black text-base flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary-light" /> Outcome & Conclusion</h2>
                        <p className="text-sm leading-relaxed opacity-75">{g.outcome}</p>
                      </div>
                    </>;
                  })()}
                </div>

                {/* Action bar */}
                <div className="sticky bottom-0 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0b0f] p-5">
                  {previewData.status === 'APPROVED' ? (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-green-500 font-black text-sm"><CheckCircle2 className="w-5 h-5" /> Approved — visible to College Admin</span>
                      <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-green-500/20">
                        <Download className="w-4 h-4" /> Print
                      </button>
                    </div>
                  ) : !showDecline ? (
                    <div className="flex gap-3">
                      <button onClick={handleCancel} className="px-5 py-3 border border-slate-200 dark:border-white/10 rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">✕ Cancel — Edit More</button>
                      <button onClick={() => setShowDecline(true)} className="flex-1 py-3 bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2">
                        <ThumbsDown className="w-4 h-4" /> Decline
                      </button>
                      <button onClick={handleApprove} disabled={saving} className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 disabled:opacity-60">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />} Approve & Publish
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} rows={2} placeholder="Reason for declining…"
                        className="w-full bg-slate-50 dark:bg-white/5 border border-red-500/30 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none" />
                      <div className="flex gap-3">
                        <button onClick={() => setShowDecline(false)} className="flex-1 py-3 border border-slate-200 dark:border-white/10 rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Back</button>
                        <button onClick={handleDecline} disabled={saving} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-60">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />} Confirm Decline
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
