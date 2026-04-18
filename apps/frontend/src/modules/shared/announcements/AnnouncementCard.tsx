import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  User, 
  Calendar, 
  Paperclip, 
  ChevronDown, 
  ChevronUp, 
  Pin, 
  Pencil, 
  Trash2, 
  MoreVertical,
  Download,
  ExternalLink
} from 'lucide-react';

const timeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes";
  return Math.floor(seconds) + " seconds";
};

interface AnnouncementCardProps {
  announcement: any;
  currentUser: any;
  onEdit?: (announcement: any) => void;
  onDelete?: (id: string) => void;
}

export default function AnnouncementCard({ announcement, currentUser, onEdit, onDelete }: AnnouncementCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Check if current user is the author or an instructor
  const canModify = currentUser?.id === announcement.authorId?._id || currentUser?.role === 'INSTRUCTOR';

  // Check if "NEW" (within last 24 hours)
  const isNew = new Date().getTime() - new Date(announcement.createdAt).getTime() < 24 * 60 * 60 * 1000;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative bg-card-light dark:bg-card-dark border ${announcement.isPinned ? 'border-primary-light/50 ring-1 ring-primary-light/20' : 'border-slate-200 dark:border-white/5'} rounded-[32px] overflow-hidden shadow-2xl transition-all hover:border-primary-light/30 active:scale-[0.99]`}
    >
      {/* Pin Badge */}
      {announcement.isPinned && (
        <div className="absolute top-6 left-6 text-primary-light z-10 bg-primary-light/10 p-2 rounded-xl border border-primary-light/20">
          <Pin className="w-4 h-4 fill-primary-light" />
        </div>
      )}

      {/* New Badge */}
      {isNew && !announcement.isPinned && (
        <div className="absolute top-6 left-6 z-10 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-emerald-500/20">
          New
        </div>
      )}

      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start pl-12 sm:pl-0">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-light to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-light/20 font-black">
              {announcement.authorId?.name?.[0] || 'U'}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight group-hover:text-primary-light transition-colors">{announcement.title}</h3>
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest opacity-40">
                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {announcement.authorId?.name || 'Unknown'}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {timeAgo(new Date(announcement.createdAt))} ago</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canModify && (
              <div className="relative">
                <button 
                  onClick={() => setShowMenu(!showMenu)} 
                  className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-primary-light hover:text-white transition-all cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-50 overflow-hidden"
                    >
                      <button onClick={() => { onEdit?.(announcement); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary-light hover:text-white text-xs font-bold transition-all cursor-pointer">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => { onDelete?.(announcement._id); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500 hover:text-white text-xs font-bold transition-all text-red-500 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <button 
              onClick={() => setIsExpanded(!isExpanded)} 
              className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-indigo-500 hover:text-white transition-all cursor-pointer"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`transition-all duration-300 ${isExpanded ? '' : 'line-clamp-3'}`}>
          <p className="text-sm leading-relaxed opacity-70 font-medium whitespace-pre-wrap">
            {announcement.description}
          </p>
        </div>

        {/* Attachments */}
        {announcement.attachments?.length > 0 && (
          <div className="pt-4 flex flex-wrap gap-3">
            {announcement.attachments.map((url: string, idx: number) => (
              <a 
                key={idx} 
                href={url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-3 rounded-xl hover:border-primary-light/50 transition-all group/file"
              >
                <Paperclip className="w-3.5 h-3.5 text-primary-light" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60 group-hover/file:opacity-100">Attachment {idx + 1}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover/file:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        )}

        {/* Metadata Footer */}
        <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
           <div className="flex gap-2">
             {announcement.divisionId && (
               <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest">
                 {announcement.divisionId.name || 'Division Targeted'}
               </span>
             )}
             <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest opacity-40">
               {announcement.authorRole}
             </span>
           </div>
           {!isExpanded && (announcement.description.length > 200) && (
             <button onClick={() => setIsExpanded(true)} className="text-[9px] font-black uppercase tracking-widest text-primary-light hover:underline">Read Full Update</button>
           )}
        </div>
      </div>
    </motion.div>
  );
}
