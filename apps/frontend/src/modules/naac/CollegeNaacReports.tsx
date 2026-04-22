import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, BookOpen, Users, Award, CheckCircle2, Calendar,
  ChevronDown, ChevronUp, Download, ClipboardList, Loader2, Trash2
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

interface GeneratedReport {
  titlePage: { workshopName: string; college: string; department: string; dateRange: string; naacCriterion: string };
  introduction: string;
  sessionDetails: { resourcePersons: any[]; officialNoticeUploaded: boolean; attendanceSheetUploaded: boolean; photosCount: number };
  participantProfile: { local: number; outstation: number; total: number; summary: string };
  feedbackSummary: string;
  outcome: string;
  generatedAt: string;
}

interface Report {
  _id: string;
  workshopTitle: string;
  department: string;
  startDate: string;
  endDate: string;
  approvedAt: string;
  generatedReport: GeneratedReport;
}

export default function CollegeNaacReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/naac-reports/my-college/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data);
    } catch {} finally { setLoading(false); }
  };

  const printReport = (id: string) => {
    setExpanded(id);
    setTimeout(() => window.print(), 300);
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Permanently delete this NAAC report? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/naac-reports/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReports();
    } catch {
      alert('Failed to delete report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-primary-light" />
          NAAC Accreditation Reports
        </h1>
        <p className="text-sm opacity-50 mt-1">Approved NAAC-compliant workshop reports for your institution</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin opacity-30" /></div>
      ) : reports.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
          <FileText className="w-12 h-12 mx-auto opacity-10 mb-4" />
          <p className="font-black text-sm uppercase opacity-20 tracking-widest">No approved reports yet</p>
          <p className="text-xs opacity-30 mt-2">Reports will appear here after they are approved by the Platform Administrator</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => {
            const r = report.generatedReport;
            const isOpen = expanded === report._id;

            return (
              <motion.div key={report._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-lg"
              >
                {/* Card Header */}
                <div className="p-6 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 uppercase tracking-widest">✓ Approved</span>
                      <span className="text-[9px] opacity-30 font-bold">{new Date(report.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <h2 className="font-black text-lg leading-snug">{report.workshopTitle}</h2>
                    <p className="text-sm opacity-50">{report.department}</p>
                    <p className="text-xs opacity-40 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(report.startDate).toLocaleDateString()} – {new Date(report.endDate).toLocaleDateString()}
                    </p>
                    {r && (
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs opacity-50">{r.participantProfile.total} participants</span>
                        <span className="text-xs opacity-50">{r.sessionDetails.resourcePersons.length} resource person(s)</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleDeleteReport(report._id)} className="p-2.5 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer group/trash" title="Delete Report">
                      <Trash2 className="w-4 h-4 opacity-40 group-hover/trash:opacity-100" />
                    </button>
                    <button onClick={() => printReport(report._id)}
                      className="p-2.5 bg-primary-light/10 text-primary-light rounded-xl hover:bg-primary-light/20 transition-colors cursor-pointer"
                      title="Print / Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => setExpanded(isOpen ? null : report._id)}
                      className="p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Report */}
                <AnimatePresence initial={false}>
                  {isOpen && r && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div id={`print-${report._id}`} className="border-t border-slate-200 dark:border-white/10 p-8 space-y-10">
                        {/* Title Page */}
                        <div className="text-center space-y-3 pb-8 border-b border-slate-200 dark:border-white/10">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{r.titlePage.naacCriterion}</p>
                          <h1 className="text-3xl font-black">{r.titlePage.workshopName}</h1>
                          <p className="text-lg font-bold opacity-70">{r.titlePage.department}</p>
                          <p className="font-bold opacity-50">{r.titlePage.college}</p>
                          <p className="text-sm opacity-40 flex items-center justify-center gap-2">
                            <Calendar className="w-4 h-4" /> {r.titlePage.dateRange}
                          </p>
                        </div>

                        {/* Introduction */}
                        <div className="space-y-3">
                          <h2 className="text-xl font-black flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary-light" /> Introduction</h2>
                          <p className="text-sm leading-relaxed opacity-80">{r.introduction}</p>
                        </div>

                        {/* Session Table */}
                        <div className="space-y-4">
                          <h2 className="text-xl font-black flex items-center gap-2"><Users className="w-5 h-5 text-primary-light" /> Session Details — Resource Persons</h2>
                          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 dark:bg-white/5">
                                <tr>
                                  {['S.No', 'Name', 'Designation', 'Topic(s) Covered'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase opacity-50 tracking-widest">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                {r.sessionDetails.resourcePersons.map((rp: any, i: number) => (
                                  <tr key={i}>
                                    <td className="px-4 py-3 text-xs opacity-50">{i + 1}</td>
                                    <td className="px-4 py-3 font-bold text-xs">{rp.name}</td>
                                    <td className="px-4 py-3 text-xs opacity-70">{rp.designation}</td>
                                    <td className="px-4 py-3 text-xs opacity-70">{rp.topic}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex items-center gap-6 flex-wrap">
                            {[
                              { done: r.sessionDetails.officialNoticeUploaded, label: 'Official notice attached' },
                              { done: r.sessionDetails.attendanceSheetUploaded, label: 'Attendance sheet attached' },
                              { done: r.sessionDetails.photosCount > 0, label: `${r.sessionDetails.photosCount} photo(s) attached` },
                            ].map(s => (
                              <div key={s.label} className={`flex items-center gap-2 text-xs ${s.done ? 'text-green-500' : 'opacity-30'}`}>
                                <CheckCircle2 className="w-4 h-4" /> {s.label}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Participant Profile */}
                        <div className="space-y-4">
                          <h2 className="text-xl font-black flex items-center gap-2"><Users className="w-5 h-5 text-primary-light" /> Participant Profile</h2>
                          <div className="grid grid-cols-3 gap-4">
                            {[
                              { label: 'Local', value: r.participantProfile.local, cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
                              { label: 'Outstation', value: r.participantProfile.outstation, cls: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
                              { label: 'Total', value: r.participantProfile.total, cls: 'bg-primary-light/10 text-primary-light border-primary-light/20' },
                            ].map(s => (
                              <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.cls}`}>
                                <div className="text-3xl font-black">{s.value}</div>
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">{s.label}</div>
                              </div>
                            ))}
                          </div>
                          <p className="text-sm opacity-70">{r.participantProfile.summary}</p>
                        </div>

                        {/* Feedback */}
                        <div className="space-y-3">
                          <h2 className="text-xl font-black flex items-center gap-2"><Award className="w-5 h-5 text-primary-light" /> Feedback Analysis</h2>
                          <p className="text-sm leading-relaxed opacity-80">{r.feedbackSummary}</p>
                        </div>

                        {/* Outcome */}
                        <div className="space-y-3">
                          <h2 className="text-xl font-black flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary-light" /> Outcomes & Conclusion</h2>
                          <p className="text-sm leading-relaxed opacity-80">{r.outcome}</p>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-white/10">
                          <button onClick={() => printReport(report._id)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary-light hover:bg-primary-light/90 text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-primary-light/20 transition-all"
                          >
                            <Download className="w-4 h-4" /> Print / Download PDF
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
