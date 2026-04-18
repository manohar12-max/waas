import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Video, Link as LinkIcon, Plus, Search, Bell, FilePlus, Heart, MessageCircle, 
  Bookmark, Eye, CheckCircle2, CloudUpload, Image as ImageIcon,
  Library, Globe, Download, ExternalLink, Filter, Loader2, Trash2, User as UserIcon,
  Pencil, Heart as LikeIcon, ExternalLink as LaunchIcon, X, Share2, Library as LibraryIcon
} from 'lucide-react';
import UniversalModal from '../../components/UniversalModal';

interface ContentItem {
  _id: string;
  teacherId: { name: string; email: string };
  divisionId: { name: string };
  workshopId: { title: string };
  type: 'PDF' | 'VIDEO' | 'LINK' | 'IMAGE';
  title: string;
  url: string;
  description?: string;
  createdAt: string;
}

export default function LearningCenterPage() {
  const [view, setView] = useState<'PERSONAL' | 'AGGREGATED'>('AGGREGATED');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'IMAGE' | 'VIDEO' | 'PDF'>('ALL');
  const [sortOrder, setSortOrder] = useState<'RECENT' | 'OLD'>('RECENT');
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));

  const [newContent, setNewContent] = useState({
    workshopId: '',
    divisionId: '',
    type: 'PDF',
    title: '',
    url: '',
    description: '',
    shareToMediaFeed: false
  });

  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [localFileName, setLocalFileName] = useState<string | null>(null);

  useEffect(() => {
    fetchMetadata();
    if (user.role === 'TEACHER') setView('PERSONAL');
  }, []);

  useEffect(() => {
    const wId = newContent.workshopId || workshops[0]?._id;
    if (wId || view === 'PERSONAL') {
      fetchContent();
    }
  }, [view, newContent.workshopId]);

  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem('token');
      if (user.role === 'TEACHER') {
        const dRes = await axios.get(`${import.meta.env.VITE_API_URL}/teacher/divisions`, { headers: { Authorization: `Bearer ${token}` } });
        setDivisions(dRes.data);
        const uniqueWorkshops = Array.from(new Set(dRes.data.map((d: any) => d.workshopId?._id)))
          .map(id => dRes.data.find((d: any) => d.workshopId?._id === id)?.workshopId).filter(Boolean);
        setWorkshops(uniqueWorkshops);
        
        if (dRes.data.length > 0) {
          const firstDiv = dRes.data[0];
          setNewContent(prev => ({ 
            ...prev, 
            divisionId: firstDiv._id, 
            workshopId: firstDiv.workshopId?._id 
          }));
        }
      } else {
        const workshopUrl = user.role === 'SUPER_ADMIN' 
          ? `${import.meta.env.VITE_API_URL}/workshops` 
          : `${import.meta.env.VITE_API_URL}/instructor/workshops`;
          
        const [wRes, dRes] = await Promise.all([
          axios.get(workshopUrl, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_URL}/divisions`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setWorkshops(wRes.data);
        setDivisions(dRes.data);
        if (dRes.data.length > 0) setNewContent(prev => ({ ...prev, divisionId: dRes.data[0]._id, workshopId: dRes.data[0]._id }));
      }
    } catch (err) { console.error(err); }
  };

  const fetchContent = async () => {
    const wId = newContent.workshopId || workshops[0]?._id;
    if (view === 'AGGREGATED' && !wId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = view === 'PERSONAL' 
        ? `${import.meta.env.VITE_API_URL}/learning-content/personal`
        : `${import.meta.env.VITE_API_URL}/learning-content/aggregated/${wId}`;
      
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setContent(response.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const [uploading, setUploading] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const previewUrl = URL.createObjectURL(file);
      setLocalPreview(previewUrl);
    } else {
      setLocalFileName(file.name);
      setLocalPreview(null);
    }
  };

  const handleEditInit = (item: ContentItem) => {
    setNewContent({
      workshopId: (item.workshopId as any)._id || item.workshopId,
      divisionId: (item.divisionId as any)._id || item.divisionId,
      type: item.type,
      title: item.title,
      url: item.url,
      description: item.description || '',
      shareToMediaFeed: false
    });
    if (item.type === 'IMAGE' || item.type === 'VIDEO') {
       setLocalPreview(item.url);
    } else {
       setLocalFileName('Current File');
    }
    setEditId(item._id);
    setIsEditing(true);
    setShowUpload(true);
  };

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !isEditing) return alert("Select a file first");
    
    setUploading(true);
    let finalUrl = newContent.url;

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
        
        const res = await axios.post(
          `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`,
          formData
        );
        finalUrl = res.data.secure_url;
      }

      const token = localStorage.getItem('token');
      if (isEditing && editId) {
        await axios.post(`${import.meta.env.VITE_API_URL}/learning-content/${editId}`, {
          ...newContent,
          url: finalUrl
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/learning-content`, {
          ...newContent,
          url: finalUrl
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setShowUpload(false);
      setSelectedFile(null);
      setIsEditing(false);
      setEditId(null);
      fetchContent();
      setNewContent(prev => ({ ...prev, title: '', url: '', description: '', shareToMediaFeed: false }));
      setLocalPreview(null);
      setLocalFileName(null);
    } catch (err) { 
      console.error(err);
      alert("Synchronization failed. Please try again."); 
    } finally {
      setUploading(false);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteContent = async (id: string) => {
    if (!window.confirm("Purge this sacred knowledge?")) return;
    setDeletingId(id);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/learning-content/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContent(content.filter(c => c._id !== id));
    } catch (err) { alert("Purge failed"); }
    finally { setDeletingId(null); }
  };

  const filteredAndSortedContent = content
    .filter(c => filterType === 'ALL' || c.type === filterType)
    .sort((a, b) => {
      if (sortOrder === 'RECENT') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 font-outfit">
      
      {/* Minimalist Command Bar */}
      <div className="bg-white/40 dark:bg-card-dark/40 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-[40px] px-8 py-5 shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-light to-indigo-600 rounded-[20px] flex items-center justify-center text-white shadow-lg shadow-primary-light/25">
              <Library className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter">Learning Hub</h1>
              <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em]">Knowledge Repository</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {['TEACHER', 'INSTRUCTOR', 'SUPER_ADMIN'].includes(user.role) && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setShowUpload(true); setNewContent(prev => ({ ...prev, type: 'IMAGE' })); }}
                  className="p-4 bg-slate-100 dark:bg-white/5 text-pink-500 rounded-2xl hover:bg-pink-500 hover:text-white transition-all shadow-sm cursor-pointer group relative"
                  title="Upload Image"
                >
                  <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase opacity-0 group-hover:opacity-40 transition-opacity whitespace-nowrap">Image</span>
                </button>
                <button 
                  onClick={() => { setShowUpload(true); setNewContent(prev => ({ ...prev, type: 'VIDEO' })); }}
                  className="p-4 bg-slate-100 dark:bg-white/5 text-purple-500 rounded-2xl hover:bg-purple-500 hover:text-white transition-all shadow-sm cursor-pointer group relative"
                  title="Upload Video"
                >
                  <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase opacity-0 group-hover:opacity-40 transition-opacity whitespace-nowrap">Video</span>
                </button>
                <button 
                  onClick={() => { setShowUpload(true); setNewContent(prev => ({ ...prev, type: 'PDF' })); }}
                  className="p-4 bg-slate-100 dark:bg-white/5 text-orange-500 rounded-2xl hover:bg-orange-500 hover:text-white transition-all shadow-sm cursor-pointer group relative"
                  title="Upload PDF"
                >
                  <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase opacity-0 group-hover:opacity-40 transition-opacity whitespace-nowrap">PDF</span>
                </button>
              </div>
            )}
          </div>
      </div>

      <div className="space-y-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
              {workshops.map(w => (
                <button 
                  key={w._id} 
                  onClick={() => { setNewContent(prev => ({ ...prev, workshopId: w._id })); fetchContent(); }} 
                  className={`px-6 py-2.5 rounded-xl whitespace-nowrap text-[9px] font-black uppercase tracking-widest transition-all relative z-10 cursor-pointer ${newContent.workshopId === w._id ? 'text-white' : 'text-slate-500 hover:text-primary-light'}`}
                >
                  {w.title}
                  {newContent.workshopId === w._id && (
                    <motion.div 
                      layoutId="learnWorkshopPill"
                      className="absolute inset-0 bg-primary-light rounded-xl -z-10 shadow-lg"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-slate-100/50 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/5 relative">
                {['ALL', 'IMAGE', 'VIDEO', 'PDF'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setFilterType(t as any)}
                    className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all relative z-10 cursor-pointer ${filterType === t ? 'text-white' : 'text-slate-500 hover:text-primary-light'}`}
                  >
                    {t}
                    {filterType === t && (
                      <motion.div 
                        layoutId="learnFilterPill"
                        className="absolute inset-0 bg-indigo-600 rounded-lg -z-10"
                        transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                      />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/5">
                {['RECENT', 'OLD'].map(s => (
                  <button 
                    key={s} 
                    onClick={() => setSortOrder(s as any)} 
                    className={`px-4 py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all relative z-10 cursor-pointer ${sortOrder === s ? 'text-white' : 'text-slate-500'}`}
                  >
                    {s}
                    {sortOrder === s && (
                      <motion.div 
                        layoutId="learnSortPill"
                        className="absolute inset-0 bg-slate-900 dark:bg-white/20 rounded-lg -z-10 shadow-md"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
      </div>

      {/* Feed */}
      <div className="space-y-10">
        <AnimatePresence mode="popLayout">
          {filteredAndSortedContent.map((item, idx) => (
            <motion.div
              key={item._id}
              layout
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group"
            >
              {(item.type === 'VIDEO' || item.type === 'IMAGE') && (
                <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-[40px] overflow-hidden shadow-2xl hover:border-primary-light/30 transition-all active:scale-[0.99] group overflow-hidden">
                  <div className="max-h-[450px] min-h-[250px] relative overflow-hidden group/media flex items-center justify-center bg-slate-900 p-2 pb-12">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      {item.type === 'VIDEO' || item.url.match(/\.(mp4|webm|ogg|mov|mov)$|^.*video\/upload.*$/) ? (
                        <video src={item.url} controls playsInline preload="metadata" className="w-full h-full object-contain relative z-20 rounded-2xl" />
                      ) : (
                        <img src={item.url} className="w-full h-full object-contain" />
                      )}
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5">
                            <h3 className="text-xl font-black tracking-tight">{item.title}</h3>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] font-black text-white">
                                 {item.teacherId?.name?.[0] || 'A'}
                              </div>
                              <div>
                                 <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                                    Shared by <span className="text-slate-900 dark:text-slate-200">{item.teacherId?.name || 'Faculty'}</span>
                                 </p>
                                 <p className="text-[8px] font-bold opacity-30 tracking-[0.2em]">{new Date(item.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {user.role !== 'STUDENT' && (
                              <>
                                <button onClick={() => handleEditInit(item)} className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl hover:bg-indigo-500 hover:text-white transition-all cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                                <button disabled={deletingId === item._id} onClick={() => handleDeleteContent(item._id)} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-30 cursor-pointer">{deletingId === item._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}</button>
                              </>
                            )}
                            <button className="p-2 opacity-30 hover:opacity-100 transition-opacity cursor-pointer"><LaunchIcon className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed opacity-50 font-medium line-clamp-2">{item.description}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-4 opacity-30">
                            <span className="flex items-center gap-1 text-[10px] font-bold"><LikeIcon className="w-3 h-3" /> 1.2k</span>
                            <span className="flex items-center gap-1 text-[10px] font-bold"><MessageCircle className="w-3 h-3" /> 84</span>
                        </div>
                        <a href={item.url} target="_blank" className="bg-[#2A2A4E] hover:bg-primary-light text-white text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-lg transition-all flex items-center gap-2"><Download className="w-3 h-3" /> Get {item.type}</a>
                      </div>
                  </div>
                </div>
              )}

              {item.type === 'PDF' && (
                <div className="bg-white/40 dark:bg-card-dark/40 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-[32px] p-6 flex flex-col md:flex-row items-center gap-6 hover:border-primary-light/40 transition-all group/doc relative shadow-2xl overflow-hidden active:scale-[0.99]">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="shrink-0 w-20 h-20 bg-gradient-to-br from-slate-900 to-black rounded-2xl flex items-center justify-center text-red-500 ring-1 ring-white/10 shadow-2xl relative z-10">
                      <FileText className="w-10 h-10" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <h3 className="text-xl font-black tracking-tight">{item.title}</h3>
                      <p className="text-[10px] font-bold text-primary-light uppercase tracking-widest">Shared by <span className="text-white">{item.teacherId?.name || 'Faculty'}</span></p>
                      <p className="text-[8px] font-bold opacity-30 uppercase tracking-[0.2em]">{new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      {user.role !== 'STUDENT' && (
                        <>
                          <button onClick={() => handleEditInit(item)} className="bg-indigo-500/10 text-indigo-500 p-3 rounded-xl hover:bg-indigo-500 hover:text-white transition-all cursor-pointer flex items-center justify-center"><Pencil className="w-4 h-4" /></button>
                          <button disabled={deletingId === item._id} onClick={() => handleDeleteContent(item._id)} className="bg-red-500/10 text-red-500 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-30 cursor-pointer flex items-center justify-center">{deletingId === item._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</button>
                        </>
                      )}
                      <a href={item.url} target="_blank" className="flex-1 bg-[#2A2A4E] hover:bg-primary-light text-white font-black uppercase text-[10px] tracking-widest p-3 rounded-xl flex justify-center items-center gap-2 transition-all shadow-xl shadow-black/20"><Download className="w-4 h-4" /> Access {item.type}</a>
                    </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 opacity-30">
            <Loader2 className="w-10 h-10 animate-spin text-primary-light" />
            <p className="text-xs font-black uppercase tracking-[0.2em] mt-4">Ascending Knowledge Feed...</p>
        </div>
      )}

      <UniversalModal
        isOpen={showUpload}
        onClose={() => { setShowUpload(false); setIsEditing(false); setEditId(null); }}
        title={isEditing ? 'Refine Material' : 'New Material'}
        description="Knowledge Repository"
        maxWidth="max-w-4xl"
        icon={<LibraryIcon className="w-8 h-8" />}
      >
        <form onSubmit={handleCreateContent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 ml-2">Workshop Target</label>
                <select required className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 outline-none text-xs font-bold text-slate-900 dark:text-white" value={newContent.workshopId} onChange={e => setNewContent({...newContent, workshopId: e.target.value})}>
                  {workshops.map(w => <option key={w._id} value={w._id}>{w.title}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 ml-2">Content Category</label>
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                   {['IMAGE', 'VIDEO', 'PDF'].map(t => (
                     <button key={t} type="button" onClick={() => setNewContent({...newContent, type: t as any})} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all ${newContent.type === t ? 'bg-primary-light text-white shadow-md shadow-primary-light/25' : 'text-slate-400 dark:text-white/20 hover:opacity-100'}`}>{t}</button>
                   ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest opacity-30 ml-2">Material Source</label>
              <div className="relative group">
                <input type="file" accept={newContent.type === 'VIDEO' ? 'video/*' : newContent.type === 'IMAGE' ? 'image/*' : '.pdf'} className="hidden" id="sacred-upload" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }} />
                <label htmlFor="sacred-upload" className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-6 hover:border-primary-light/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer overflow-hidden">
                  {uploading ? (
                    <div className="text-center space-y-4">
                      <Loader2 className="w-6 h-6 animate-spin text-primary-light mx-auto" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/40">Synchronizing...</p>
                    </div>
                  ) : localPreview ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
                       {newContent.type === 'VIDEO' ? <video src={localPreview} controls muted playsInline preload="metadata" className="w-full h-full object-contain bg-slate-900" /> : <img src={localPreview} className="w-full h-full object-cover" />}
                    </div>
                  ) : localFileName ? (
                    <div className="text-center">
                       <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 animate-bounce" />
                       <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{localFileName}</p>
                    </div>
                  ) : (
                    <div className="text-center text-slate-900 dark:text-white"><CloudUpload className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30">Ascend Source</p></div>
                  )}
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 ml-2">Display Title</label>
                 <input required type="text" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 outline-none focus:border-primary-light transition-all font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10" placeholder="Mastering Technical Arts..." value={newContent.title} onChange={e => setNewContent({...newContent, title: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 ml-2">Description</label>
                 <textarea className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 outline-none focus:border-primary-light transition-all font-bold h-32 resize-none text-xs leading-relaxed text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10" placeholder="Context for the scholars..." value={newContent.description} onChange={e => setNewContent({...newContent, description: e.target.value})} />
              </div>

              {(newContent.type === 'IMAGE' || newContent.type === 'VIDEO') && !isEditing && (
                <div 
                  onClick={() => setNewContent({...newContent, shareToMediaFeed: !newContent.shareToMediaFeed})}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${newContent.shareToMediaFeed ? 'bg-primary-light/10 border-primary-light/30' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 opacity-50 hover:opacity-100'}`}
                >
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${newContent.shareToMediaFeed ? 'bg-primary-light text-white shadow-md' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                      <Share2 className="w-4 h-4" />
                   </div>
                   <div className="flex-1">
                      <p className="text-[9px] font-black uppercase tracking-widest">Mirror to Highlights</p>
                      <p className="text-[8px] font-bold opacity-40">Share to community highlights</p>
                   </div>
                   <div className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${newContent.shareToMediaFeed ? 'bg-primary-light border-primary-light' : 'border-white/10'}`}>
                      {newContent.shareToMediaFeed && <div className="w-1 h-1 bg-white rounded-full" />}
                   </div>
                </div>
              )}
            </div>

            <button disabled={uploading || (!selectedFile && !isEditing)} type="submit" className="w-full py-4 bg-primary-light text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary-light/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer mt-4 flex items-center justify-center gap-2">
               {uploading ? (
                 <><Loader2 className="w-4 h-4 animate-spin" /> Synchronizing...</>
               ) : (
                 isEditing ? 'Confirm Refinements' : 'Confirm Material'
               )}
             </button>
          </div>
        </form>
      </UniversalModal>
    </div>
  );
}
