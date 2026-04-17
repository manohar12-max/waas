import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Users, UserPlus, Mail, Phone, 
  Search, ShieldCheck, Loader2, Link as LinkIcon 
} from 'lucide-react';

export default function TeacherRegistry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [division, setDivision] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/divisions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDivision(response.data);
      // For MVP, we fetch registered students from the workshop linked to this division
      setStudents(response.data.workshopId?.registeredStudentIds || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyInvite = () => {
    const link = `${window.location.origin}/register?invite=${division?.workshopId?.inviteToken}`;
    navigator.clipboard.writeText(link);
    alert("Invitation Link Copied!");
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-primary-light" /></div>;

  return (
    <div className="space-y-10 pb-20 font-outfit max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-all font-bold group cursor-pointer">
          <ChevronLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </button>
        <button 
          onClick={copyInvite}
          className="flex items-center gap-3 bg-primary-light hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-light/30 cursor-pointer"
        >
          <LinkIcon className="w-5 h-5" />
          Copy Invite Link
        </button>
      </div>

      <div className="space-y-2">
        <h1 className="text-5xl font-black tracking-tighter">Student Registry</h1>
        <p className="opacity-40 font-medium text-lg">Managing {division?.name} Cluster</p>
      </div>

      {/* Registry Table */}
      <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-primary-light" />
            <h3 className="font-outfit font-bold text-xl">Enrolled Students</h3>
          </div>
          <span className="text-xs font-bold px-4 py-2 bg-primary-light/10 text-primary-light rounded-full">{students.length} Total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest opacity-30 border-b border-slate-100 dark:border-white/5">
                <th className="px-8 py-6">Student Name</th>
                <th className="px-8 py-6">Contact Info</th>
                <th className="px-8 py-6">Identity Status</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {students.map((student) => (
                <tr key={student._id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-light/20 to-indigo-500/20 flex items-center justify-center font-black text-primary-light">
                        {student.name[0]}
                      </div>
                      <p className="font-bold">{student.name}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-sm opacity-60"><Mail className="w-3 h-3" />{student.email}</div>
                      <div className="text-[10px] opacity-30 font-bold uppercase tracking-tighter">Reg: {new Date(student.createdAt).toLocaleDateString()}</div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                      <span className="text-xs font-bold opacity-60">Verified Enrollment</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right text-xs font-bold opacity-20 hover:opacity-100 transition-opacity">
                    Manage Student
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center opacity-20 font-black uppercase tracking-widest text-xs">No students enrolled yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
