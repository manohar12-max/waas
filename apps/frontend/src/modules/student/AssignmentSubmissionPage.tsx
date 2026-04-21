import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Link as LinkIcon, Upload, Loader2, 
  CheckCircle2, Clock, Globe, Github, ShieldCheck,
  ChevronRight, ArrowLeft, Lock, UserCheck, 
  AlertCircle, Sparkles
} from 'lucide-react';
import { normalizeEmail, normalizePhone } from '../../utils/normalization';

export default function AssignmentSubmissionPage() {
  const { id: assignmentId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [currentStep, setCurrentStep] = useState(1);
  const [assignment, setAssignment] = useState<any>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [submissionType, setSubmissionType] = useState<'link' | 'file'>('link');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchAssignment();
    if (token) {
      validateToken();
    } else {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          if (userObj.role === 'STUDENT') {
            // Auto bypass verification if logged in
            setEmailOrPhone(userObj.email);
            autoVerify(userObj.email);
          }
        } catch(e) {}
      }
    }
  }, [token, assignmentId]);

  const autoVerify = async (email: string) => {
    setIsVerifying(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/submissions/validate-student`, {
        emailOrPhone: email,
        assignmentId
      });
      setStudentId(res.data.studentId);
      setStudentName(res.data.studentName || 'Authenticated Scholar');
      setCurrentStep(2);
    } catch (err) {
      console.error("Auto verify failed", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const fetchAssignment = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/assignments/${assignmentId}`);
      setAssignment(res.data);
    } catch (err) { console.error(err); }
    finally { if (!token) setLoading(false); }
  };

  const validateToken = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/submissions/validate-link?token=${token}`);
      setStudentId(res.data.studentId);
      setStudentName(res.data.studentName || 'Authenticated Scholar');
      setCurrentStep(2);
    } catch (err) { console.error("Token verification failed"); }
    finally { setLoading(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      const normalizedIdentity = normalizeEmail(emailOrPhone) || normalizePhone(emailOrPhone);
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/submissions/validate-student`, {
        emailOrPhone: normalizedIdentity,
        assignmentId
      });
      setStudentId(res.data.studentId);
      setStudentName(res.data.studentName);
      setCurrentStep(2);
    } catch (err: any) {
      alert(err.response?.data?.message || "Verification failed. Check your credentials.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let fileUrl = '';
      if (submissionType === 'file' && file) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Use backend upload proxy
        const uploadRes = await axios.post(`${import.meta.env.VITE_API_URL}/workshops/upload`, formData);
        fileUrl = uploadRes.data.url;
      }

      await axios.post(`${import.meta.env.VITE_API_URL}/submissions/${assignmentId}`, {
        studentId,
        submissionType,
        link: submissionType === 'link' ? link : '',
        fileUrl,
        token: token
      });
      setSubmitted(true);
    } catch (err: any) {
      alert(err.response?.data?.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white"><Loader2 className="w-8 h-8 animate-spin text-primary-light" /></div>;
  
  if (!assignment) return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm font-outfit">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-white tracking-tighter">Mission Not Found</h1>
        <p className="opacity-40 text-sm font-medium">Deployment link is invalid or mission coordinates have expired.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-outfit selection:bg-primary-light selection:text-white flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      
      {/* Premium Background Background */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-primary-light/5 blur-[120px] rounded-full" />
         <div className="absolute bottom-[20%] right-[20%] w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full" />
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] contrast-150" />
      </div>

      {!submitted ? (
        <div className="w-full max-w-xl relative z-10 space-y-10">
          
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
             <div className="mb-6 font-outfit font-black text-2xl tracking-tighter text-primary-light">
                NEXUS<div className="text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-60 mt-1 block">by Pixaflip</div>
             </div>
             <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-primary-light" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Submission Uplink</span>
             </div>
             <h1 className="text-4xl sm:text-5xl font-black tracking-tighter leading-none">{assignment.title}</h1>
             <div className="flex items-center justify-center gap-4 text-xs font-bold opacity-40">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                <span className="w-1 h-1 bg-slate-500/20 rounded-full" />
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> {assignment.maxMarks} Merit Points</span>
             </div>
          </motion.div>

          {/* Core Interface Card */}
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[40px] p-8 sm:p-10 shadow-2xl backdrop-blur-3xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-light/40 to-transparent" />
             
             <AnimatePresence mode="wait">
                {currentStep === 1 ? (
                  <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
                     <div className="space-y-2">
                        <h3 className="text-lg font-black tracking-tight">Step 1: Identity Clearance</h3>
                        <p className="text-xs font-medium opacity-40">Please enter your registered credentials to unlock your mission reports.</p>
                     </div>

                     <form onSubmit={handleVerify} className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest opacity-20 ml-2">Email or Phone</label>
                           <input 
                              required 
                              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-5 outline-none font-bold text-lg focus:border-primary-light/40 transition-all placeholder:opacity-10 cursor-pointer"
                              placeholder="scholar@institute.com"
                              value={emailOrPhone}
                              onChange={e => setEmailOrPhone(e.target.value)}
                           />
                        </div>
                        <button 
                           disabled={isVerifying}
                           type="submit" 
                           className="w-full py-5 bg-primary-light text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary-light/10 hover:translate-y-[-1px] transition-all flex items-center justify-center gap-3 cursor-pointer"
                        >
                           {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Access Console <ChevronRight className="w-4 h-4" /></>}
                        </button>
                     </form>
                  </motion.div>
                ) : (
                  <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-10">
                     <div className="flex items-center justify-between bg-slate-500/5 border border-slate-200 dark:border-white/5 p-4 rounded-2xl">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-white font-black text-xs">{studentName[0]}</div>
                           <p className="font-black text-sm text-slate-900 dark:text-white">{studentName}</p>
                        </div>
                        <button onClick={() => setCurrentStep(1)} className="text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-all cursor-pointer">Not You? Switch</button>
                     </div>

                     <form onSubmit={handleSubmit} className="space-y-10">
                        {/* Selector */}
                        <div className="flex gap-2 p-1.5 bg-slate-500/5 border border-slate-200 dark:border-white/5 rounded-2xl">
                           <button type="button" onClick={() => setSubmissionType('link')} className={`flex-1 py-3.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer ${submissionType === 'link' ? 'bg-primary-light text-white shadow-lg' : 'opacity-30'}`}>
                              <Github className="w-4 h-4" /> Link
                           </button>
                           <button type="button" onClick={() => setSubmissionType('file')} className={`flex-1 py-3.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer ${submissionType === 'file' ? 'bg-primary-light text-white shadow-lg' : 'opacity-30'}`}>
                              <Upload className="w-4 h-4" /> File
                           </button>
                        </div>

                        {/* Input */}
                        <div className="min-h-[120px]">
                           {submissionType === 'link' ? (
                              <div className="space-y-4">
                                 <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-20 ml-2">GitHub / Project Repository</label>
                                 <div className="relative group">
                                    <div className="absolute inset-y-0 left-5 flex items-center opacity-30 group-focus-within:opacity-100 transition-opacity"><Github className="w-5 h-5" /></div>
                                    <input required className="w-full bg-slate-500/5 border border-slate-200 dark:border-white/5 rounded-[22px] p-5 pl-14 outline-none font-bold text-lg focus:border-primary-light transition-all cursor-pointer text-slate-900 dark:text-white" placeholder="https://github.com/..." value={link} onChange={e => setLink(e.target.value)} />
                                 </div>
                              </div>
                           ) : (
                              <div className="space-y-4">
                                 <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-20 ml-2">Binary Upload (ZIP/PDF)</label>
                                 <label className="block cursor-pointer">
                                    <input type="file" className="hidden" onChange={e => { if(e.target.files) setFile(e.target.files[0]) }} />
                                    <div className="w-full h-32 bg-slate-500/5 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 hover:bg-primary-light/5 hover:border-primary-light transition-all">
                                       <Upload className="w-6 h-6 opacity-30" />
                                       <p className="font-black text-sm uppercase tracking-widest">{file ? file.name : "Select Operational Files"}</p>
                                    </div>
                                 </label>
                              </div>
                           )}
                        </div>

                        <button disabled={submitting} type="submit" className="w-full py-5 bg-primary-light text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary-light/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer">
                           {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Deploy Report</>}
                        </button>
                     </form>
                  </motion.div>
                )}
             </AnimatePresence>
          </motion.div>

          <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] opacity-20">Secure Node Uplink v4.2.1</p>
        </div>
      ) : (
        /* Success Centered */
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8 max-w-sm relative z-10 font-outfit">
           <div className="w-24 h-24 bg-green-500/10 rounded-[32px] mx-auto flex items-center justify-center text-green-500 border border-green-500/20">
              <CheckCircle2 className="w-12 h-12 stroke-[3]" />
           </div>
           <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tighter">REPORT SECURED</h2>
              <p className="text-white/40 text-sm font-medium leading-relaxed">Your submission has been cataloged and transmitted to the institutional command center.</p>
           </div>
           <button onClick={() => window.location.reload()} className="px-8 py-3.5 bg-primary-light text-white rounded-full font-black uppercase text-[10px] tracking-widest hover:scale-110 transition-all ring-8 ring-primary-light/5 cursor-pointer">Update Submission</button>
        </motion.div>
      )}

      {/* Decorative Branding */}
      <div className="fixed bottom-8 left-8 hidden lg:block opacity-20">
         <div className="flex items-center gap-3">
            <div className="w-8 h-[1px] bg-white" />
            <span className="text-[10px] font-black uppercase tracking-widest">NEXUS Command Registry</span>
         </div>
      </div>

    </div>
  );
}

// Operational Module Sync Refresh
