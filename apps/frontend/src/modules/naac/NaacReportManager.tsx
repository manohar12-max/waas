import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, ChevronRight, Search, Upload, FileText, Image as ImageIcon,
  BookOpen, Users, Award, CheckCircle2, Circle, Loader2, Eye,
  ThumbsUp, ThumbsDown, X, Plus, Trash2, Calendar, Download,
  RefreshCw, AlertTriangle, Building2
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

/* ─── Types ─────────────────────────────────────────── */
interface College { _id: string; name: string; status: string; }
interface Workshop { _id: string; title: string; schedule: { start: string; end: string }; status: string; instructorId?: { name: string }; }
interface Report { _id: string; workshopTitle: string; status: string; collegeId: { _id: string; name: string }; startDate: string; endDate: string; officialNoticeUrl: string; activityReport: string; attendanceSheetUrl: string; photoUrls: string[]; feedbackSummary: string; resourcePersons: any[]; localParticipants: number; outstationParticipants: number; outcomes: string; naacCriterion: string; generatedReport: any; declineReason: string; approvedAt: string; department: string; }

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
  // Data
  const [colleges, setColleges] = useState<College[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  // Selection
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [collegeSearch, setCollegeSearch] = useState('');
  const [workshopSearch, setWorkshopSearch] = useState('');

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
    activity: form.activityReport.length >= 50,
    attendance: !!activeReport?.attendanceSheetUrl,
    photos: (activeReport?.photoUrls?.length || 0) >= 1,
    feedback: form.feedbackSummary.length >= 20,
  };
  const allDone = Object.values(checks).every(Boolean);

  /* ── Generate ────────────────────────────────────────── */
  const handleGenerate = async () => {
    await saveData();
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/naac-reports/${activeReport!._id}/generate`, {}, { headers: auth() });
      setPreviewData(res.data);
      setActiveReport(res.data);
      setShowPreview(true);
      fetchReports();
    } catch {} finally { setGenerating(false); }
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
        <button onClick={() => { fetchColleges(); fetchReports(); }} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors">
          <RefreshCw className="w-4 h-4 opacity-40" />
        </button>
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
          {reports.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase opacity-40 tracking-widest px-1">Resume an existing draft</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reports.filter(r => r.status !== 'APPROVED').map(r => (
                  <button key={r._id} onClick={() => resumeReport(r)}
                    className="text-left p-4 bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 hover:border-primary-light/30 rounded-2xl transition-all cursor-pointer"
                  >
                    <p className="font-black text-sm line-clamp-1">{r.workshopTitle}</p>
                    <p className="text-[10px] opacity-40 mt-0.5">{r.collegeId?.name}</p>
                    <span className={`inline-block mt-2 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${STATUS[r.status]}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${ws.status === 'ONGOING' ? 'bg-green-500/20 text-green-400' : ws.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-400/20 text-slate-400'}`}>
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
            {/* LEFT col */}
            <div className="space-y-5">
              {/* Checklist */}
              <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-black text-sm uppercase tracking-widest opacity-60">NAAC Evidence Checklist</h3>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full tracking-widest ${allDone ? 'bg-green-500/20 text-green-500' : 'bg-slate-400/20 text-slate-400'}`}>
                    {Object.values(checks).filter(Boolean).length}/5 done
                  </span>
                </div>

                <CheckRow done={checks.notice} label="Official Notice / Circular">
                  {activeReport.officialNoticeUrl && <a href={activeReport.officialNoticeUrl} target="_blank" className="text-[10px] text-primary-light underline cursor-pointer">View</a>}
                  <button onClick={() => noticeRef.current?.click()} disabled={uploading === 'notice'}
                    className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 bg-slate-100 dark:bg-white/10 rounded-xl cursor-pointer hover:bg-primary-light/10 transition-colors uppercase tracking-widest">
                    {uploading === 'notice' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload
                  </button>
                  <input ref={noticeRef} type="file" accept=".pdf,image/*" className="hidden" onChange={e => uploadFile('notice', e.target.files)} />
                </CheckRow>

                <CheckRow done={checks.activity} label={`Activity Report (${form.activityReport.length} chars)`} />

                <CheckRow done={checks.attendance} label="Attendance Sheet">
                  {activeReport.attendanceSheetUrl && <a href={activeReport.attendanceSheetUrl} target="_blank" className="text-[10px] text-primary-light underline cursor-pointer">View</a>}
                  <button onClick={() => attendanceRef.current?.click()} disabled={uploading === 'attendance'}
                    className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 bg-slate-100 dark:bg-white/10 rounded-xl cursor-pointer hover:bg-primary-light/10 transition-colors uppercase tracking-widest">
                    {uploading === 'attendance' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload
                  </button>
                  <input ref={attendanceRef} type="file" accept=".pdf,image/*" className="hidden" onChange={e => uploadFile('attendance', e.target.files)} />
                </CheckRow>

                <CheckRow done={checks.photos} label={`Geotagged Photos (${activeReport.photoUrls?.length || 0} uploaded)`}>
                  <button onClick={() => photosRef.current?.click()} disabled={uploading === 'photos'}
                    className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 bg-slate-100 dark:bg-white/10 rounded-xl cursor-pointer hover:bg-primary-light/10 transition-colors uppercase tracking-widest">
                    {uploading === 'photos' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />} Upload
                  </button>
                  <input ref={photosRef} type="file" accept="image/*" multiple className="hidden" onChange={e => uploadFile('photos', e.target.files)} />
                </CheckRow>

                <CheckRow done={checks.feedback} label={`Feedback Summary (${form.feedbackSummary.length} chars)`} />
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
                <h3 className="font-black text-xs uppercase tracking-widest opacity-50">Written Evidence</h3>

                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 block mb-1">Activity Report * <span className="normal-case">(min 50 chars)</span></label>
                  <textarea value={form.activityReport} onChange={e => setForm(f => ({ ...f, activityReport: e.target.value }))} rows={6}
                    placeholder="Describe the workshop theme, objectives, and outcomes (250–500 words recommended)…"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-light outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 block mb-1">Feedback Summary * <span className="normal-case">(min 20 chars)</span></label>
                  <textarea value={form.feedbackSummary} onChange={e => setForm(f => ({ ...f, feedbackSummary: e.target.value }))} rows={3}
                    placeholder="Summary of participant feedback and follow-up actions…"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-light outline-none resize-none"
                  />
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

              {/* Action buttons */}
              <div className="space-y-3">
                <button onClick={saveData} disabled={saving}
                  className="w-full py-3 border border-primary-light/40 text-primary-light hover:bg-primary-light/10 rounded-2xl font-black text-sm uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Progress
                </button>

                <button onClick={handleGenerate}
                  disabled={!allDone || generating || activeReport.status === 'PENDING_REVIEW'}
                  className="w-full py-4 bg-primary-light hover:bg-primary-light/90 text-white rounded-2xl font-black text-sm uppercase tracking-widest cursor-pointer transition-all shadow-xl shadow-primary-light/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                  {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
                  {generating ? 'Generating…' : 'Generate NAAC Report'}
                </button>

                {!allDone && <p className="text-center text-[10px] font-bold uppercase opacity-30 tracking-widest">Complete all 5 checklist items to generate</p>}

                {activeReport.status === 'PENDING_REVIEW' && (
                  <button onClick={() => { setPreviewData(activeReport); setShowPreview(true); }}
                    className="w-full py-3 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 rounded-2xl font-black text-sm uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" /> Review Generated Report
                  </button>
                )}
                {activeReport.status === 'APPROVED' && (
                  <button onClick={() => { setPreviewData(activeReport); setShowPreview(true); }}
                    className="w-full py-3 border border-green-500/30 text-green-500 hover:bg-green-500/10 rounded-2xl font-black text-sm uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" /> View Approved Report
                  </button>
                )}
              </div>
            </div>
          </div>
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
                        <p className="text-sm opacity-40 flex items-center justify-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {g.titlePage.dateRange}</p>
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
