import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Heart, MessageCircle, MoreHorizontal, Image as ImageIcon, Video, Send, Loader2, X, Pencil, Trash2, Camera
} from 'lucide-react';
import UniversalModal from '../../components/UniversalModal';

interface Post {
  _id: string;
  author: { _id: string; name: string; email: string };
  content: string;
  mediaUrl?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'NONE';
  likes: string[];
  commentCount: number;
  createdAt: string;
  isEdited: boolean;
}

interface Comment {
  _id: string;
  author: { _id: string; name: string; email: string };
  content: string;
  createdAt: string;
}

export default function ForumHubPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));
  
  const [newPostContent, setNewPostContent] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | 'NONE'>('NONE');

  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');

  const [isEditing, setIsEditing] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/forum`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/forum/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCommentsMap(prev => ({ ...prev, [postId]: res.data }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    setMediaType(file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE');
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !selectedFile) return;

    setUploading(true);
    let finalMediaUrl = '';

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const token = localStorage.getItem('token');
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/workshops/upload`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        finalMediaUrl = res.data.url;
      }

      const token = localStorage.getItem('token');
      
      if (isEditing) {
        await axios.put(`${import.meta.env.VITE_API_URL}/forum/${isEditing}`, {
          content: newPostContent,
          ...(finalMediaUrl && { mediaUrl: finalMediaUrl, mediaType }),
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/forum`, {
          content: newPostContent,
          mediaUrl: finalMediaUrl || undefined,
          mediaType: finalMediaUrl ? mediaType : 'NONE',
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      fetchPosts();
      setNewPostContent('');
      setSelectedFile(null);
      setLocalPreview(null);
      setMediaType('NONE');
      setShowUpload(false);
      setIsEditing(null);
    } catch (err) {
      alert("Failed to post. Check your connection.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/forum/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPosts();
    } catch (err) {
      alert("Could not delete post");
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/forum/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(posts.map(p => p._id === postId ? { ...p, likes: res.data } : p));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/forum/${postId}/comments`, {
        content: commentInput
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), res.data]
      }));
      setPosts(posts.map(p => p._id === postId ? { ...p, commentCount: p.commentCount + 1 } : p));
      setCommentInput('');
    } catch (err) {
      alert("Failed to comment");
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!window.confirm('Delete comment?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/forum/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCommentsMap(prev => ({
        ...prev,
        [postId]: prev[postId].filter(c => c._id !== commentId)
      }));
      setPosts(posts.map(p => p._id === postId ? { ...p, commentCount: p.commentCount - 1 } : p));
    } catch (err) {
      alert("Could not delete comment");
    }
  };

  const toggleComments = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      if (!commentsMap[postId]) fetchComments(postId);
    }
  };

  const openEditor = (post: Post) => {
    setIsEditing(post._id);
    setNewPostContent(post.content);
    if (post.mediaUrl) {
      setLocalPreview(post.mediaUrl);
      setMediaType(post.mediaType);
    }
    setShowUpload(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-32 font-outfit">
      
      {/* Header */}
      <div className="bg-white/40 dark:bg-card-dark/40 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-[40px] px-8 py-6 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-light to-indigo-600 rounded-[20px] flex items-center justify-center text-white shadow-lg shadow-primary-light/25">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter">Community Forum</h1>
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em] mt-1">Ask, Learn, Discuss</p>
          </div>
        </div>
        <button onClick={() => { setShowUpload(true); setIsEditing(null); setNewPostContent(''); setLocalPreview(null); setSelectedFile(null); }} className="px-6 py-3 bg-primary-light text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary-light/30 hover:scale-105 active:scale-95 transition-all cursor-pointer">
          Create Post
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 animate-spin text-primary-light" /></div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {posts.map((post, idx) => (
              <motion.div key={post._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-[32px] overflow-hidden shadow-xl">
                
                {/* Author Bar */}
                <div className="p-6 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                      {post.author?.name?.[0] || '?'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-tight">{post.author?.name || 'Unknown'}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary-light opacity-80">{post.author?.email || 'No Email'}</span>
                        <span className="text-[8px] font-bold opacity-30 tracking-widest">• {new Date(post.createdAt).toLocaleDateString()} {post.isEdited && '(edited)'}</span>
                      </div>
                    </div>
                  </div>

                  {(user?.id === post.author?._id || ['COLLEGE_ADMIN', 'SUPER_ADMIN'].includes(user?.role)) && (
                    <div className="flex items-center gap-2">
                       <button onClick={() => openEditor(post)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer opacity-40 hover:opacity-100 hover:text-indigo-500"><Pencil className="w-4 h-4" /></button>
                       <button onClick={() => handleDeletePost(post._id)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer opacity-40 hover:opacity-100 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="px-6 pb-4">
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                    {post.content}
                  </p>
                </div>

                {/* Media */}
                {post.mediaUrl && (
                  <div className="bg-slate-900 border-y border-slate-200 dark:border-white/5 flex items-center justify-center relative overflow-hidden group">
                    {post.mediaType === 'VIDEO' ? (
                      <video src={post.mediaUrl} controls playsInline className="w-full max-h-[500px] object-contain" />
                    ) : (
                      <img src={post.mediaUrl} className="w-full max-h-[500px] object-cover" />
                    )}
                  </div>
                )}

                {/* Interactions */}
                <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center gap-6">
                  <button onClick={() => handleLike(post._id)} className={`flex items-center gap-2 group cursor-pointer transition-colors ${post.likes?.includes(user?.id) ? 'text-pink-500' : 'text-slate-500 hover:text-pink-500'}`}>
                    <div className={`p-2 rounded-xl transition-colors ${post.likes?.includes(user?.id) ? 'bg-pink-500/10' : 'bg-slate-100 dark:bg-white/5 group-hover:bg-pink-500/10'}`}>
                      <Heart className={`w-4 h-4 ${post.likes?.includes(user?.id) ? 'fill-current' : ''}`} />
                    </div>
                    <span className="text-[10px] font-black">{post.likes?.length || 0}</span>
                  </button>

                  <button onClick={() => toggleComments(post._id)} className="flex items-center gap-2 group cursor-pointer text-slate-500 hover:text-primary-light transition-colors">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 group-hover:bg-primary-light/10 transition-colors">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black">{post.commentCount}</span>
                  </button>
                  
                  <button className="p-2 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-xl ml-auto hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
                </div>

                {/* Comments Section */}
                <AnimatePresence>
                  {expandedPost === post._id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-slate-50 dark:bg-white/[0.02]">
                      <div className="p-6 space-y-6">
                        
                        {/* Feed */}
                        <div className="space-y-4">
                          {!commentsMap[post._id] ? (
                            <Loader2 className="w-5 h-5 mx-auto animate-spin opacity-30" />
                          ) : (commentsMap[post._id] || []).length === 0 ? (
                            <p className="text-xs text-center font-bold opacity-30 py-4 uppercase tracking-widest">No replies yet</p>
                          ) : (
                            (commentsMap[post._id] || []).map(comment => (
                              <div key={comment._id} className="flex gap-4">
                                <div className="w-8 h-8 rounded-xl bg-primary-light/20 flex shrink-0 items-center justify-center text-xs font-black text-primary-light">{comment.author?.name?.[0] || '?'}</div>
                                <div className="flex-1 bg-white dark:bg-[#1A1A2E] border border-slate-200 dark:border-white/5 p-4 rounded-3xl rounded-tl-sm relative group">
                                  <div className="flex justify-between items-start mb-1">
                                    <h5 className="font-bold text-xs">{comment.author?.name || 'Unknown'}</h5>
                                    {(user?.id === comment.author?._id || ['COLLEGE_ADMIN', 'SUPER_ADMIN'].includes(user?.role)) && (
                                      <button onClick={() => handleDeleteComment(comment._id, post._id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 cursor-pointer transition-opacity"><Trash2 className="w-3 h-3" /></button>
                                    )}
                                  </div>
                                  <p className="text-xs font-medium leading-relaxed opacity-80">{comment.content}</p>
                                  <span className="text-[8px] font-bold opacity-30 uppercase tracking-widest mt-3 block">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Input */}
                        <form onSubmit={(e) => handleAddComment(e, post._id)} className="flex items-center gap-3 mt-4">
                           <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex shrink-0 items-center justify-center text-xs font-black text-orange-500">{user.name?.[0] || 'U'}</div>
                           <div className="flex-1 relative">
                             <input value={commentInput} onChange={e => setCommentInput(e.target.value)} type="text" placeholder="Write a reply..." className="w-full bg-white dark:bg-[#1A1A2E] border border-slate-200 dark:border-white/10 rounded-full px-5 py-3 pr-12 text-sm outline-none focus:border-primary-light transition-all" />
                             <button type="submit" disabled={!commentInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-primary-light text-white rounded-full disabled:opacity-30 transition-opacity cursor-pointer">
                                <Send className="w-3 h-3 translate-x-[-1px] translate-y-[1px]" />
                             </button>
                           </div>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
              </motion.div>
            ))}
          </AnimatePresence>
          {posts.length === 0 && (
             <div className="py-32 text-center opacity-30">
               <MessageSquare className="w-16 h-16 mx-auto mb-6 opacity-30" />
               <p className="font-black text-xl tracking-[0.2em] uppercase">No discussions yet</p>
             </div>
          )}
        </div>
      )}

      {/* Upload/Edit Modal */}
      <UniversalModal
        isOpen={showUpload}
        onClose={() => { setShowUpload(false); setIsEditing(null); setNewPostContent(''); setSelectedFile(null); setLocalPreview(null); }}
        title={isEditing ? 'Edit Post' : 'Create Post'}
        description="Share knowledge with the community"
        maxWidth="max-w-2xl"
        icon={<MessageSquare className="w-6 h-6" />}
      >
        <form onSubmit={handleSubmitPost} className="space-y-6">
          <textarea 
            required
            autoFocus
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 outline-none focus:border-primary-light transition-all font-medium text-sm leading-relaxed text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10 min-h-[160px] resize-none" 
            placeholder="What's on your mind? Ask a question or share an update..." 
            value={newPostContent} 
            onChange={e => setNewPostContent(e.target.value)} 
          />

          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-3xl group relative transition-all hover:border-primary-light/50">
            {uploading ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-40">
                 <Loader2 className="w-8 h-8 animate-spin mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-widest">Uploading Media...</p>
              </div>
            ) : localPreview ? (
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-900 group/preview flex items-center justify-center">
                 {mediaType === 'VIDEO' ? <video src={localPreview} controls className="w-full h-full object-contain" /> : <img src={localPreview} className="w-full h-full object-contain" />}
                 <button type="button" onClick={() => { setSelectedFile(null); setLocalPreview(null); setMediaType('NONE'); }} className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500 text-white rounded-xl backdrop-blur-md transition-all cursor-pointer opacity-0 group-hover/preview:opacity-100">
                    <X className="w-4 h-4" />
                 </button>
              </div>
            ) : (
              <div className="relative">
                <input type="file" accept="image/*,video/*" className="hidden" id="forum-upload" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                <label htmlFor="forum-upload" className="flex items-center justify-between cursor-pointer py-2 px-2">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-light/10 text-primary-light flex items-center justify-center">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Attach Media</p>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Image or Video up to 50MB</p>
                      </div>
                   </div>
                   <div className="px-4 py-2 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest hover:border-primary-light transition-colors">
                     Browse
                   </div>
                </label>
              </div>
            )}
          </div>

          <button disabled={uploading || (!newPostContent.trim() && !selectedFile)} type="submit" className="w-full py-5 bg-gradient-to-r from-primary-light to-indigo-500 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-primary-light/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-2">
             {uploading ? 'Processing...' : isEditing ? 'Save Changes' : 'Post to Forum'}
          </button>
        </form>
      </UniversalModal>
    </div>
  );
}
