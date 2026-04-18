import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Plus, Users, Clock, CheckCircle2, 
  ExternalLink, Loader2, Send, GraduationCap,
  MessageSquare, Award, ArrowLeft, MoreHorizontal,
  ChevronRight, Trash2, Calendar, Globe, FileArchive
} from 'lucide-react';
import UniversalModal from '../../components/UniversalModal';

export default function AssignmentManagement() {
  const { id: divisionId } = useParams();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [viewSubmissions, setViewSubmissions] = useState(false);
  const [grading, setGrading] = useState<any>(null);

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    dueDate: '',
    maxMarks: 100
  });

  useEffect(() => {
    fetchData();
  }, [divisionId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [aRes, dRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/assignments/division/${divisionId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${import.meta.env.VITE_API_URL}/divisions/${divisionId}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      console.log('Fetched assignments:', aRes.data);
      console.log('Fetched division details:', dRes.data);
      setAssignments(aRes.data);
      setStudents(dRes.data.workshopId?.registeredStudentIds || []);
    } catch (err) { console.error('Fetch error:', err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const divRes = await axios.get(`${import.meta.env.VITE_API_URL}/divisions/${divisionId}`, { headers: { Authorization: `Bearer ${token}` } });
      const workshopId = divRes.data.workshopId?._id || divRes.data.workshopId;

      if (!workshopId) {
        console.error('Workshop ID missing for division:', divRes.data);
        return alert("Critical Error: This division has no linked workshop.");
      }

      console.log('Creating assignment for:', { divisionId, workshopId });
      await axios.post(`${import.meta.env.VITE_API_URL}/assignments`, {
        ...newAssignment,
        divisionId,
        workshopId
      }, { headers: { Authorization: `Bearer ${token}` } });

      setShowCreate(false);
      setNewAssignment({ title: '', description: '', dueDate: '', maxMarks: 100 });
      fetchData();
    } catch (err) { alert("Failed to create mission."); }
  };

  const fetchSubmissions = async (assignmentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/submissions/assignment/${assignmentId}`, { headers: { Authorization: `Bearer ${token}` } });
      setSubmissions(res.data);
      setViewSubmissions(true);
    } catch (err) { alert("Failed to fetch field reports."); }
  };

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/submissions/${grading._id}/grade`, {
        marks: grading.marks,
        feedback: grading.feedback
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setGrading(null);
      fetchSubmissions(selectedAssignment._id);
    } catch (err) { alert("Synchronization failed."); }
  };



  if (loading) return <div className="flex items-center justify-center py-40"><Loader2 className="w-12 h-12 animate-spin text-primary-light" /></div>;

  return (
    <div className="space-y-12 pb-32 font-outfit">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Management Terminal</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter mb-3">Assignments Overview</h1>
          <p className="opacity-40 font-medium max-w-lg text-lg leading-relaxed">Deploy new missions, monitor submissions, and provide critical feedback to your scholars.</p>
        </motion.div>

        <button 
          onClick={() => setShowCreate(true)}
          className="px-8 py-4 bg-primary-light text-white rounded-[32px] font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-light/20 flex items-center gap-3 hover:scale-105 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" /> Deploy Mission
        </button>
      </div>

      {!viewSubmissions ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {assignments.map((assignment, idx) => (
            <motion.div 
               key={assignment._id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: idx * 0.1 }}
               className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[44px] p-10 space-y-8 relative overflow-hidden group shadow-2xl"
            >
               <div className="relative z-10 space-y-6">
                 <div className="flex justify-between items-start">
                    <div className="w-14 h-14 bg-indigo-500/10 text-indigo-500 rounded-[22px] flex items-center justify-center border border-indigo-500/10"><FileText className="w-7 h-7" /></div>
                    <div className="px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest opacity-40">Active</div>
                 </div>

                 <div className="space-y-2">
                    <h3 className="text-3xl font-black tracking-tight leading-none group-hover:text-primary-light transition-colors">{assignment.title}</h3>
                    <p className="text-sm font-medium opacity-40 line-clamp-2 leading-relaxed">{assignment.description}</p>
                 </div>

                 <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Due Date</p>
                       <p className="text-xs font-black">{new Date(assignment.dueDate).toLocaleDateString()}</p>
                    </div>
                    
                    <button 
                      onClick={() => { setSelectedAssignment(assignment); fetchSubmissions(assignment._id); }}
                      className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-3xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:translate-y-[-2px] hover:shadow-xl cursor-pointer"
                    >
                      <GraduationCap className="w-4 h-4" /> View Field Reports <ChevronRight className="w-4 h-4" />
                    </button>
                 </div>
               </div>
            </motion.div>
          ))}

          {assignments.length === 0 && (
            <div className="col-span-full py-32 text-center opacity-20 space-y-4">
               <FileText className="w-16 h-16 mx-auto" />
               <p className="font-black text-2xl uppercase tracking-[0.3em]">No Missions Deployed</p>
            </div>
          )}
        </div>
      ) : (
        /* Submissions View */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                 <button onClick={() => setViewSubmissions(false)} className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
                 <div>
                    <h2 className="text-3xl font-black tracking-tighter">Reports: {selectedAssignment.title}</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Deployment Artifacts Registry</p>
                 </div>
              </div>
              <button 
                onClick={() => {
                  const link = `${window.location.origin}/submit/${selectedAssignment._id}`;
                  navigator.clipboard.writeText(link);
                  alert("General Mission Link copied! Students will identify via Email/Phone.");
                }}
                className="px-6 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer"
              >
                <Globe className="w-4 h-4 text-primary-light" /> Copy Submission Link
              </button>
           </div>

           <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[48px] overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                 <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5">
                       <th className="p-8 text-[10px] font-black uppercase tracking-widest opacity-30">Scholar</th>
                       <th className="p-8 text-[10px] font-black uppercase tracking-widest opacity-30">Status</th>
                       <th className="p-8 text-[10px] font-black uppercase tracking-widest opacity-30">Artifact</th>
                       <th className="p-8 text-[10px] font-black uppercase tracking-widest opacity-30">Marks</th>
                       <th className="p-8 text-[10px] font-black uppercase tracking-widest opacity-30">Operations</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {students.map(student => {
                      const sub = submissions.find(s => s.studentId?._id === student._id);
                      return (
                        <tr key={student._id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                           <td className="p-8">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-full bg-primary-light/10 flex items-center justify-center text-primary-light font-black text-xs">{student.name[0]}</div>
                                 <div>
                                    <p className="font-black text-sm">{student.name}</p>
                                    <p className="text-[9px] font-bold opacity-30 tracking-widest uppercase">{student.email}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="p-8">
                             {sub ? (
                               <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${sub.status === 'late' ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                 {sub.status}
                               </span>
                             ) : (
                               <span className="px-4 py-1.5 bg-slate-100 dark:bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest opacity-30">No Submission</span>
                             )}
                           </td>
                           <td className="p-8">
                              {sub ? (
                                <a href={sub.submissionType === 'link' ? sub.link : sub.fileUrl} target="_blank" className="flex items-center gap-2 text-xs font-bold text-primary-light hover:underline truncate max-w-[150px]">
                                   {sub.submissionType === 'link' ? <ExternalLink className="w-3.5 h-3.5" /> : <FileArchive className="w-3.5 h-3.5" />}
                                   View Artifact
                                </a>
                              ) : '-'}
                           </td>
                           <td className="p-8">
                              <p className="font-black text-sm">{sub?.gradedAt ? `${sub.marks}/${selectedAssignment.maxMarks}` : 'Not Graded'}</p>
                           </td>
                           <td className="p-8 flex items-center gap-3">
                               {sub ? (
                                 <button onClick={() => setGrading({...sub, marks: sub.marks || 0, feedback: sub.feedback || ''})} className="p-4 bg-primary-light/10 text-primary-light rounded-2xl hover:bg-primary-light hover:text-white transition-all cursor-pointer"><MessageSquare className="w-4 h-4" /></button>
                               ) : (
                                 <div className="p-4 bg-slate-100 dark:bg-white/5 text-slate-500/20 rounded-2xl">
                                   <Clock className="w-4 h-4" />
                                 </div>
                               )}
                           </td>
                        </tr>
                      )
                    })}
                 </tbody>
              </table>
           </div>
        </motion.div>
      )}

      {/* Create Modal */}
      <UniversalModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Operational Mission" description="Mission Deployment Console" icon={<FileText className="w-8 h-8" />}>
        <form onSubmit={handleCreate} className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">Mission Title</label>
                 <input required className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 outline-none font-bold text-sm" placeholder="Advanced System Design..." value={newAssignment.title} onChange={e => setNewAssignment({...newAssignment, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">Total Points</label>
                 <input type="number" required className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 outline-none font-bold text-sm" value={newAssignment.maxMarks} onChange={e => setNewAssignment({...newAssignment, maxMarks: parseInt(e.target.value)})} />
              </div>
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">Objective Intel (Instructions)</label>
              <textarea className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 outline-none font-bold text-sm h-32 resize-none" placeholder="Provide strategic details for the scholars..." value={newAssignment.description} onChange={e => setNewAssignment({...newAssignment, description: e.target.value})} />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">Mission Deadline</label>
              <input type="datetime-local" required className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 outline-none font-bold text-sm" value={newAssignment.dueDate} onChange={e => setNewAssignment({...newAssignment, dueDate: e.target.value})} />
           </div>
           <button type="submit" className="w-full py-5 bg-primary-light text-white rounded-[32px] font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-light/25 hover:scale-[1.02] active:scale-95 transition-all">Confirm Deployment</button>
        </form>
      </UniversalModal>

      {/* Grade Modal */}
      <UniversalModal isOpen={!!grading} onClose={() => setGrading(null)} title="Field Report Assessment" description="Intelligence Feedback Console" icon={<Award className="w-8 h-8" />}>
         <form onSubmit={handleGrade} className="space-y-8">
            <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Scholar Information</p>
                  <p className="font-black text-lg">{grading?.studentId?.name}</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Submission Mode</p>
                  <p className="font-black text-sm uppercase text-primary-light">{grading?.submissionType}</p>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">Awarded Marks</label>
               <input type="number" required className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 outline-none font-black text-2xl text-center" value={grading?.marks} onChange={e => setGrading({...grading, marks: parseInt(e.target.value)})} max={selectedAssignment?.maxMarks} />
               <p className="text-center text-[10px] font-black uppercase opacity-20 tracking-widest">Out of {selectedAssignment?.maxMarks}</p>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">Professional Feedback</label>
               <textarea className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 outline-none font-bold text-sm h-32 resize-none" placeholder="Provide technical guidance..." value={grading?.feedback} onChange={e => setGrading({...grading, feedback: e.target.value})} />
            </div>

            <button type="submit" className="w-full py-5 bg-primary-light text-white rounded-[32px] font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-light/25 hover:scale-[1.02] active:scale-95 transition-all">Archive Evaluation</button>
         </form>
      </UniversalModal>

    </div>
  );
}

// Operational Module Refresh
