import { useState, useEffect } from 'react';
import { 
  Bell, 
  MessageSquare, 
  Paperclip, 
  X, 
  Plus, 
  Pin,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import UniversalModal from '../../../components/UniversalModal';

interface AnnouncementFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  workshopId: string;
  divisions: any[];
}

export default function AnnouncementForm({ isOpen, onClose, onSubmit, initialData, workshopId, divisions }: AnnouncementFormProps) {
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    divisionId: '',
    isPinned: false,
    attachments: [] as string[],
    isGlobal: false
  });

  const [attachmentInput, setAttachmentInput] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        divisionId: initialData.divisionId?._id || initialData.divisionId || '',
        isPinned: initialData.isPinned || false,
        attachments: initialData.attachments || [],
        isGlobal: !initialData.workshopId
      });
    } else {
      setFormData({
        title: '',
        description: '',
        divisionId: '',
        isPinned: false,
        attachments: [],
        isGlobal: isSuperAdmin && !workshopId
      });
    }
  }, [initialData, isOpen, isSuperAdmin, workshopId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        workshopId: formData.isGlobal ? undefined : workshopId,
        divisionId: (formData.isGlobal || !formData.divisionId) ? undefined : formData.divisionId
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  const addAttachment = () => {
    if (attachmentInput && !formData.attachments.includes(attachmentInput)) {
      setFormData(prev => ({ ...prev, attachments: [...prev.attachments, attachmentInput] }));
      setAttachmentInput('');
    }
  };

  const removeAttachment = (url: string) => {
    setFormData(prev => ({ ...prev, attachments: prev.attachments.filter(a => a !== url) }));
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Refine Announcement' : 'New Announcement'}
      description={isSuperAdmin ? "Broadcast global updates to every portal on Nexus." : "Communicate with your workshop participants in real-time."}
      maxWidth="max-w-2xl"
      icon={<Bell className="w-8 h-8 text-primary-light" />}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {isSuperAdmin && !initialData && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 ml-2">Broadcast Scope</label>
              <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                <button 
                  type="button" 
                  onClick={() => setFormData({ ...formData, isGlobal: true, divisionId: '' })} 
                  className={`flex-1 py-3 rounded-lg text-[10px] font-black transition-all ${formData.isGlobal ? 'bg-primary-light text-white shadow-lg' : 'text-slate-400 dark:text-white/20'}`}
                >
                  GLOBAL (ALL PORTALS)
                </button>
                <button 
                  type="button" 
                  disabled={!workshopId}
                  onClick={() => setFormData({ ...formData, isGlobal: false })} 
                  className={`flex-1 py-3 rounded-lg text-[10px] font-black transition-all ${!formData.isGlobal ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 dark:text-white/20'} disabled:opacity-20`}
                >
                  SPECIFIC WORKSHOP
                </button>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 ml-2">Announcement Title</label>
            <input 
              required 
              type="text" 
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 outline-none focus:border-primary-light transition-all font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10" 
              placeholder="Crucial Update Regarding Final Deadline..." 
              value={formData.title} 
              onChange={e => setFormData({ ...formData, title: e.target.value })} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 ml-2">Detailed Description</label>
            <textarea 
              required
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 outline-none focus:border-primary-light transition-all font-bold h-40 resize-none text-xs leading-relaxed text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10" 
              placeholder="Provide more context for the scholars..." 
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!formData.isGlobal && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 ml-2">Visibility Target</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 outline-none text-xs font-bold text-slate-900 dark:text-white"
                  value={formData.divisionId}
                  onChange={e => setFormData({ ...formData, divisionId: e.target.value })}
                >
                  <option value="">Entire Workshop (Public)</option>
                  {divisions.map(d => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 ml-2">Priority Status</label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })}
                className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${formData.isPinned ? 'bg-primary-light/10 border-primary-light/30 text-primary-light' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 opacity-50 hover:opacity-100'}`}
              >
                <Pin className={`w-4 h-4 ${formData.isPinned ? 'fill-primary-light' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">{formData.isPinned ? 'Pinned to Top' : 'Pin to Top'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 ml-2">Attachments (URLs)</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 outline-none focus:border-primary-light transition-all font-bold text-sm text-slate-900 dark:text-white" 
                placeholder="https://example.com/file.pdf" 
                value={attachmentInput}
                onChange={e => setAttachmentInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addAttachment())}
              />
              <button 
                type="button"
                onClick={addAttachment}
                className="p-4 bg-primary-light text-white rounded-xl hover:bg-primary-dark transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.attachments.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-[10px] font-bold">
                  <span className="truncate max-w-[150px] opacity-60 font-mono">{url}</span>
                  <button type="button" onClick={() => removeAttachment(url)} className="text-red-500 hover:text-red-600 transition-all"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button 
          disabled={loading} 
          type="submit" 
          className="w-full py-5 bg-primary-light text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-primary-light/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer mt-4 flex items-center justify-center gap-3"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Synchronizing...</>
          ) : (
            <><Bell className="w-4 h-4" /> {initialData ? 'Update Announcement' : 'Broadcast Announcement'}</>
          )}
        </button>
      </form>
    </UniversalModal>
  );
}
