import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Save, Plus, Trash2, FileText, Video, Link as LinkIcon, 
  Settings, BookOpen, AlertCircle, Loader2, BrainCircuit, Layout
} from 'lucide-react';
import SessionContentGen from './SessionContentGen';

export default function InstructorWorkshopConfig() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<'CLASSIC' | 'DYNAMIC'>('DYNAMIC');

  const [modules, setModules] = useState<any[]>([]);
  const [gradingConfig, setGradingConfig] = useState({
    testWeight: 40,
    assignmentWeight: 40,
    engagementWeight: 20
  });
  const [summary, setSummary] = useState("");

  useEffect(() => {
    fetchWorkshop();
  }, [id]);

  const fetchWorkshop = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/workshops/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      setWorkshop(data);
      setModules(data.content || []);
      setGradingConfig(data.gradingConfig || { testWeight: 40, assignmentWeight: 40, engagementWeight: 20 });
      setSummary(data.summary || "");
    } catch (err) {
      setError("Failed to load workshop configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddModule = () => {
    setModules([...modules, { sectionTitle: 'New Module', materials: [] }]);
  };

  const handleAddMaterial = (moduleIndex: number, type: 'PDF' | 'VIDEO' | 'LINK') => {
    const updatedModules = [...modules];
    updatedModules[moduleIndex].materials.push({ title: '', type, url: '' });
    setModules(updatedModules);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/instructor/workshops/${id}/configure`, {
        content: modules,
        gradingConfig,
        summary
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Curriculum design saved successfully!");
    } catch (err) {
      alert("Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-primary-light" /></div>;

  return (
    <div className="space-y-10 pb-20 font-outfit max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-all font-bold group cursor-pointer">
          <ChevronLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </button>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center gap-3 bg-primary-light hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-light/30 disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Configuration
        </button>
      </div>

      <div className="flex gap-4 p-2 bg-slate-100 dark:bg-white/5 rounded-[24px] border border-slate-200 dark:border-white/5 max-w-md">
         <button onClick={() => setActiveTab('DYNAMIC')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'DYNAMIC' ? 'bg-primary-light text-white shadow-xl' : 'opacity-40 hover:opacity-100'}`}>
           <BrainCircuit className="w-4 h-4 inline-block mr-2" /> AI Learning Path
         </button>
         <button onClick={() => setActiveTab('CLASSIC')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'CLASSIC' ? 'bg-primary-light text-white shadow-xl' : 'opacity-40 hover:opacity-100'}`}>
           <Layout className="w-4 h-4 inline-block mr-2" /> Classic Modules
         </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'DYNAMIC' ? (
          <motion.div key="dynamic" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <SessionContentGen workshopId={id!} onUpdate={fetchWorkshop} />
          </motion.div>
        ) : (
          <motion.div key="classic" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Content Areas */}
        <div className="lg:col-span-2 space-y-10">
          {/* Modules Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black tracking-tight">Workshop Modules</h3>
              <button onClick={handleAddModule} className="flex items-center gap-2 text-primary-light font-black uppercase tracking-widest text-xs hover:bg-primary-light/5 px-4 py-2 rounded-xl transition-all cursor-pointer">
                <Plus className="w-4 h-4" /> Add Module
              </button>
            </div>

            <div className="space-y-6">
              {modules.map((module, mIdx) => (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={mIdx} className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[40px] p-8 space-y-6 shadow-xl">
                  <input 
                    className="text-2xl font-black bg-transparent border-none outline-none w-full focus:text-primary-light transition-colors"
                    value={module.sectionTitle}
                    onChange={(e) => {
                      const updated = [...modules];
                      updated[mIdx].sectionTitle = e.target.value;
                      setModules(updated);
                    }}
                  />
                  
                  <div className="space-y-4">
                    {module.materials.map((mat: any, matIdx: number) => (
                      <div key={matIdx} className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-primary-light/10 flex items-center justify-center text-primary-light">
                          {mat.type === 'PDF' && <FileText className="w-5 h-5" />}
                          {mat.type === 'VIDEO' && <Video className="w-5 h-5" />}
                          {mat.type === 'LINK' && <LinkIcon className="w-5 h-5" />}
                        </div>
                        <input 
                          className="bg-transparent border-none outline-none flex-1 font-bold text-sm"
                          placeholder="Material Title"
                          value={mat.title}
                          onChange={(e) => {
                            const updated = [...modules];
                            updated[mIdx].materials[matIdx].title = e.target.value;
                            setModules(updated);
                          }}
                        />
                        <input 
                          className="bg-transparent border-none outline-none flex-1 font-medium text-xs opacity-40"
                          placeholder="URL/Path"
                          value={mat.url}
                          onChange={(e) => {
                            const updated = [...modules];
                            updated[mIdx].materials[matIdx].url = e.target.value;
                            setModules(updated);
                          }}
                        />
                        <button 
                          onClick={() => {
                            const updated = [...modules];
                            updated[mIdx].materials.splice(matIdx, 1);
                            setModules(updated);
                          }}
                          className="p-2 text-red-500/30 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => handleAddMaterial(mIdx, 'PDF')} className="text-[10px] font-black uppercase tracking-tighter bg-slate-100 dark:bg-white/5 px-3 py-2 rounded-lg hover:bg-primary-light/10 hover:text-primary-light transition-all cursor-pointer">Add PDF</button>
                    <button onClick={() => handleAddMaterial(mIdx, 'VIDEO')} className="text-[10px] font-black uppercase tracking-tighter bg-slate-100 dark:bg-white/5 px-3 py-2 rounded-lg hover:bg-primary-light/10 hover:text-primary-light transition-all cursor-pointer">Add Video</button>
                    <button onClick={() => handleAddMaterial(mIdx, 'LINK')} className="text-[10px] font-black uppercase tracking-tighter bg-slate-100 dark:bg-white/5 px-3 py-2 rounded-lg hover:bg-primary-light/10 hover:text-primary-light transition-all cursor-pointer">Add Link</button>
                    <div className="flex-1" />
                    <button 
                      onClick={() => {
                        const updated = [...modules];
                        updated.splice(mIdx, 1);
                        setModules(updated);
                      }}
                      className="text-[10px] font-black uppercase tracking-tighter text-red-500/50 hover:text-red-500 px-3 py-2 rounded-lg transition-all cursor-pointer"
                    >
                      Delete Module
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Stats / Config */}
        <div className="space-y-10">
          {/* Grading Config */}
          <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[40px] p-8 space-y-8 shadow-xl">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-primary-light" />
              <h4 className="text-xl font-black tracking-tight">Grading Schema</h4>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                  <span>Tests Weight</span>
                  <span>{gradingConfig.testWeight}%</span>
                </div>
                <input type="range" className="w-full accent-primary-light cursor-pointer" value={gradingConfig.testWeight} onChange={e => setGradingConfig({...gradingConfig, testWeight: parseInt(e.target.value)})} />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                  <span>Assignments</span>
                  <span>{gradingConfig.assignmentWeight}%</span>
                </div>
                <input type="range" className="w-full accent-primary-light cursor-pointer" value={gradingConfig.assignmentWeight} onChange={e => setGradingConfig({...gradingConfig, assignmentWeight: parseInt(e.target.value)})} />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                  <span>Engagement</span>
                  <span>{gradingConfig.engagementWeight}%</span>
                </div>
                <input type="range" className="w-full accent-primary-light cursor-pointer" value={gradingConfig.engagementWeight} onChange={e => setGradingConfig({...gradingConfig, engagementWeight: parseInt(e.target.value)})} />
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-[40px] p-8 space-y-6 shadow-xl">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-primary-light" />
              <h4 className="text-xl font-black tracking-tight">Workshop Summary</h4>
            </div>
            <textarea 
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl p-4 font-medium text-sm min-h-[150px] outline-none focus:border-primary-light transition-all"
              placeholder="High-level description of workshop outcomes..."
              value={summary}
              onChange={e => setSummary(e.target.value)}
            />
          </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
