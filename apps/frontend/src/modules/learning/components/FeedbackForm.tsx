import { useState } from 'react';
import { Star, MessageSquare, Send, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import UniversalModal from '../../../components/UniversalModal';

interface FeedbackFormProps {
  isOpen: boolean;
  type: 'SESSION' | 'WORKSHOP';
  workshopId: string;
  sessionId?: string;
  title: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FeedbackForm({ isOpen, type, workshopId, sessionId, title, onClose, onSuccess }: FeedbackFormProps) {
  const [ratings, setRatings] = useState({
    contentQuality: 0,
    clarity: 0,
    engagement: 0,
    usefulness: 0,
    overall: 0,
  });

  const [comments, setComments] = useState({
    liked: '',
    improvement: '',
    suggestions: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRating = (key: keyof typeof ratings, value: number) => {
    setRatings(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Validate Ratings
    if (Object.values(ratings).some(v => v === 0)) {
      setError('Please provide all ratings.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/feedback`, {
        type,
        workshopId,
        sessionId,
        ratings,
        comments,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  const ratingCategories = [
    { key: 'contentQuality', label: 'Content Quality', icon: '💎' },
    { key: 'clarity', label: 'Clarity', icon: '📢' },
    { key: 'engagement', label: 'Engagement', icon: '🔥' },
    { key: 'usefulness', label: 'Usefulness', icon: '🛠️' },
    { key: 'overall', label: 'Overall Rating', icon: '✨' },
  ];

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'SESSION' ? 'Session Feedback' : 'Workshop Evaluation'}
      description={title}
      maxWidth="max-w-3xl"
      icon={<MessageSquare />}
    >
      <div className="space-y-10">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-xs font-bold"
          >
            <X className="w-4 h-4" /> {error}
          </motion.div>
        )}

        {/* Ratings Section */}
        <div className="space-y-8">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/20 italic">Quantitative Ratings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {ratingCategories.map((cat) => (
              <div key={cat.key} className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-black text-slate-600 dark:text-white/60 tracking-wider flex items-center gap-2">
                    <span className="text-sm grayscale group-hover:grayscale-0 transition-all">{cat.icon}</span>
                    {cat.label}
                  </label>
                  <span className="text-[10px] font-black text-primary-light bg-primary-light/10 px-2 py-0.5 rounded-md">
                    {ratings[cat.key as keyof typeof ratings] || 0}/5
                  </span>
                </div>
                <div className="flex gap-2 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRating(cat.key as keyof typeof ratings, star)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        ratings[cat.key as keyof typeof ratings] >= star 
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                          : 'bg-white dark:bg-white/5 text-slate-300 dark:text-white/10 hover:bg-amber-500/5 hover:text-amber-500'
                      }`}
                    >
                      <Star className={`w-5 h-5 ${ratings[cat.key as keyof typeof ratings] >= star ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comments Section */}
        <div className="space-y-8">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/20 italic">Qualitative Insights</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">What did you love?</label>
                  <textarea 
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-xs font-medium focus:border-primary-light/50 transition-all outline-none min-h-[100px] resize-none"
                    placeholder="Specific highlights..."
                    value={comments.liked}
                    onChange={(e) => setComments(prev => ({ ...prev, liked: e.target.value }))}
                  />
               </div>
               <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">What can be improved?</label>
                  <textarea 
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-xs font-medium focus:border-primary-light/50 transition-all outline-none min-h-[100px] resize-none"
                    placeholder="Constructive feedback..."
                    value={comments.improvement}
                    onChange={(e) => setComments(prev => ({ ...prev, improvement: e.target.value }))}
                  />
               </div>
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">General Suggestions?</label>
              <textarea 
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[24px] p-4 text-xs font-medium focus:border-primary-light/50 transition-all outline-none min-h-[100px] resize-none"
                placeholder="Any other thoughts?"
                value={comments.suggestions}
                onChange={(e) => setComments(prev => ({ ...prev, suggestions: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-bold text-slate-400 italic">Your insights build a better platform.</p>
          <button
            onClick={() => handleSubmit()}
            disabled={loading}
            className="w-full md:w-auto px-10 py-4 bg-primary-light text-white rounded-[20px] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl shadow-primary-light/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Feedback
          </button>
        </div>
      </div>
    </UniversalModal>
  );
}
