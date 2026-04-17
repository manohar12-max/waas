import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Image as ImageIcon, Camera, Send, Loader2, User, Clock, Trash2, Plus,
  Bell, Search, Heart, MessageSquare, Bookmark, Share2, MoreHorizontal, Download, Video,
  CheckCircle2, CloudUpload, Pencil, X, Video as VideoIcon
} from 'lucide-react';
import UniversalModal from '../../components/UniversalModal';

interface MediaPost {
  _id: string;
  workshopId: string;
  teacherId: {
    name: string;
    email: string;
  };
  mediaType: 'IMAGE' | 'VIDEO';
  mediaUrl: string;
  caption: string;
  description?: string;
  createdAt: string;
}

export default function MediaFeedPage() {
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'IMAGE' | 'VIDEO'>('ALL');
  const [sortOrder, setSortOrder] = useState<'RECENT' | 'OLD'>('RECENT');
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));

  const [newPost, setNewPost] = useState({
    workshopId: '',
    mediaType: 'IMAGE',
    mediaUrl: '',
    caption: '',
    description: ''
  });

  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkshops();
  }, []);

  useEffect(() => {
    if (newPost.workshopId) {
      fetchFeed(newPost.workshopId);
    }
  }, [newPost.workshopId]);

  const fetchWorkshops = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = user.role === 'INSTRUCTOR' 
        ? `${import.meta.env.VITE_API_URL}/instructor/workshops`
        : `${import.meta.env.VITE_API_URL}/teacher/divisions`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const workshopData = user.role === 'INSTRUCTOR' 
        ? response.data 
        : response.data.map((d: any) => d.workshopId).filter(Boolean);

      const uniqueWorkshops = Array.from(new Set(workshopData.map((w: any) => w._id)))
        .map(id => workshopData.find((w: any) => w._id === id));

      setWorkshops(uniqueWorkshops);
      if (uniqueWorkshops.length > 0) {
        setNewPost(prev => ({ ...prev, workshopId: uniqueWorkshops[0]._id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFeed = async (workshopId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/media-feed/${workshopId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [uploading, setUploading] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
  };

  const handleEditInit = (post: MediaPost) => {
    setNewPost({
      workshopId: post.workshopId,
      mediaType: post.mediaType,
      mediaUrl: post.mediaUrl,
      caption: post.caption,
      description: post.description || ''
    });
    setLocalPreview(post.mediaUrl);
    setEditId(post._id);
    setIsEditing(true);
    setShowUpload(true);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !isEditing) return alert("Select a moment first");
    
    setUploading(true);
    let finalMediaUrl = newPost.mediaUrl;

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
        
        const res = await axios.post(
          `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`,
          formData
        );
        finalMediaUrl = res.data.secure_url;
      }

      const token = localStorage.getItem('token');
      if (isEditing && editId) {
        await axios.post(`${import.meta.env.VITE_API_URL}/media-feed/${editId}`, {
          ...newPost,
          mediaUrl: finalMediaUrl
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/media-feed`, {
          ...newPost,
          mediaUrl: finalMediaUrl
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setShowUpload(false);
      setSelectedFile(null);
      setLocalPreview(null);
      fetchFeed(newPost.workshopId);
      setIsEditing(false);
      setEditId(null);
      setNewPost(prev => ({ ...prev, mediaUrl: '', caption: '', description: '' }));
    } catch (err) {
      console.error(err);
      alert("Failed to sync media. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeletePost = async (id: string) => {
    if (!window.confirm("Purge this sacred moment?")) return;
    setDeletingId(id);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/media-feed/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(posts.filter(p => p._id !== id));
    } catch (err) { alert("Purge failed"); }
    finally { setDeletingId(null); }
  };

  const filteredAndSortedPosts = posts
    .filter(p => filterType === 'ALL' || p.mediaType === filterType)
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
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter">Media Feed</h1>
              <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em]">Studio Sanctuary</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {user.role === 'TEACHER' && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setShowUpload(true); setNewPost(prev => ({ ...prev, mediaType: 'IMAGE' })); }}
                  className="p-4 bg-slate-100 dark:bg-white/5 text-pink-500 rounded-2xl hover:bg-pink-500 hover:text-white transition-all shadow-sm cursor-pointer group relative"
                  title="Upload Image"
                >
                  <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase opacity-0 group-hover:opacity-40 transition-opacity whitespace-nowrap">Image</span>
                </button>
                <button 
                  onClick={() => { setShowUpload(true); setNewPost(prev => ({ ...prev, mediaType: 'VIDEO' })); }}
                  className="p-4 bg-slate-100 dark:bg-white/5 text-purple-500 rounded-2xl hover:bg-purple-500 hover:text-white transition-all shadow-sm cursor-pointer group relative"
                  title="Upload Video"
                >
                  <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase opacity-0 group-hover:opacity-40 transition-opacity whitespace-nowrap">Video</span>
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
                  onClick={() => { setNewPost(prev => ({ ...prev, workshopId: w._id })); fetchFeed(w._id); }} 
                  className={`px-6 py-2.5 rounded-xl whitespace-nowrap text-[9px] font-black uppercase tracking-widest transition-all relative z-10 cursor-pointer ${newPost.workshopId === w._id ? 'text-white' : 'text-slate-500 hover:text-primary-light'}`}
                >
                  {w.title}
                  {newPost.workshopId === w._id && (
                    <motion.div 
                      layoutId="workshopPill"
                      className="absolute inset-0 bg-primary-light rounded-xl -z-10 shadow-lg"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-slate-100/50 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/5 relative">
                {['ALL', 'IMAGE', 'VIDEO'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setFilterType(t as any)}
                    className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all relative z-10 cursor-pointer ${filterType === t ? 'text-white' : 'text-slate-500 hover:text-primary-light'}`}
                  >
                    {t}
                    {filterType === t && (
                      <motion.div 
                        layoutId="filterPill"
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
                        layoutId="sortPill"
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

        <AnimatePresence mode="popLayout">
          {filteredAndSortedPosts.map((post, idx) => (
            <motion.div key={post._id} layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="group bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-[48px] overflow-hidden shadow-2xl hover:border-primary-light/30 transition-all active:scale-[0.99]">
              <div className="max-h-[600px] min-h-[300px] relative overflow-hidden bg-slate-900 flex items-center justify-center p-2 pb-12">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  {post.mediaType === 'VIDEO' || post.mediaUrl.match(/\.(mp4|webm|ogg|mov|mov)$|^.*video\/upload.*$/) ? (
                    <video src={post.mediaUrl} controls playsInline preload="metadata" className="w-full h-full object-contain bg-black relative z-20 rounded-2xl" />
                  ) : (
                    <img src={post.mediaUrl} className="w-full h-full object-contain bg-black transition-transform duration-700 group-hover:scale-105" />
                  )}
                  <div className="absolute bottom-6 left-6 z-20 flex items-center gap-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                      <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl">
                        {post.mediaType} CONTENT
                      </div>
                  </div>
              </div>
              <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                        <h3 className="text-xl font-black tracking-tight">{post.caption}</h3>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] text-white font-black">{post.teacherId?.name?.[0] || 'F'}</div>
                          <div>
                              <p className="text-[11px] font-bold text-primary-light uppercase tracking-widest">Shared by <span className="text-white">{post.teacherId?.name || 'Faculty'}</span></p>
                              <p className="text-[9px] font-bold opacity-30 tracking-[0.2em]">{new Date(post.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.role !== 'STUDENT' && (
                        <>
                          <button onClick={() => handleEditInit(post)} className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl hover:bg-indigo-500 hover:text-white transition-all cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                          <button disabled={deletingId === post._id} onClick={() => handleDeletePost(post._id)} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-30 cursor-pointer">{deletingId === post._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}</button>
                        </>
                      )}
                      <button className="p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl opacity-30 hover:opacity-100 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed opacity-50 font-medium line-clamp-2">{post.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-6 opacity-30">
                        <span className="flex items-center gap-2 text-[10px] font-black"><Heart className="w-4 h-4" /> 1.2k</span>
                        <span className="flex items-center gap-2 text-[10px] font-black"><MessageSquare className="w-4 h-4" /> 84</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <a href={post.mediaUrl} target="_blank" className="bg-slate-100 dark:bg-[#2A2A4E] hover:bg-primary-light dark:hover:bg-white hover:text-white dark:hover:text-black py-2.5 px-6 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"><Download className="w-3.5 h-3.5" /> Download</a>
                        <button className="p-2.5 bg-primary-light text-white rounded-xl shadow-lg"><Bookmark className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 opacity-30">
          <Loader2 className="w-10 h-10 animate-spin text-primary-light" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-4">Synching with Sanctuary...</p>
        </div>
      )}

      <UniversalModal
        isOpen={showUpload}
        onClose={() => { setShowUpload(false); setIsEditing(false); setEditId(null); }}
        title={isEditing ? 'Refine Moment' : 'Share Moment'}
        description="Studio Sanctuary"
        maxWidth="max-w-4xl"
        icon={<ImageIcon className="w-8 h-8" />}
      >
        <form onSubmit={handleCreatePost} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 ml-2">Visual Content</label>
            <div className="relative group">
              <input type="file" accept={newPost.mediaType === 'IMAGE' ? 'image/*' : 'video/*'} className="hidden" id="feed-upload" onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }} />
              <label htmlFor="feed-upload" className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-6 hover:border-primary-light/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer">
                {uploading ? (
                  <div className="text-center space-y-4"><Loader2 className="w-6 h-6 animate-spin text-primary-light mx-auto" /><p className="text-[10px] font-black uppercase tracking-widest opacity-20">Ascending...</p></div>
                ) : localPreview ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-xl">
                      {newPost.mediaType === 'VIDEO' ? <video src={localPreview} controls muted playsInline preload="metadata" className="w-full h-full object-contain bg-slate-900" /> : <img src={localPreview} className="w-full h-full object-cover" />}
                  </div>
                ) : (
                  <div className="text-center opacity-30 group-hover:scale-110 transition-transform text-slate-900 dark:text-white"><Camera className="w-10 h-10 mx-auto mb-3" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Select sacred moment</p></div>
                )}
              </label>
            </div>
          </div>
          
          <div className="space-y-4 flex flex-col">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 ml-2">Caption</label>
              <input required className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-light transition-all font-medium text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10" placeholder="Title of your post" value={newPost.caption} onChange={e => setNewPost({...newPost, caption: e.target.value})} />
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 ml-2">Description</label>
              <textarea className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 outline-none h-32 resize-none focus:border-primary-light transition-all font-medium text-xs leading-relaxed text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10" placeholder="Share story..." value={newPost.description} onChange={e => setNewPost({...newPost, description: e.target.value})} />
            </div>
            <button disabled={uploading || (!selectedFile && !isEditing)} type="submit" className="w-full py-4 bg-primary-light text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer mt-4 flex items-center justify-center gap-2">
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Synchronizing...</>
              ) : (
                isEditing ? 'Apply Refinements' : 'Post to Feed'
              )}
            </button>
          </div>
        </form>
      </UniversalModal>
    </div>
  );
}
