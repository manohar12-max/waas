import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface UniversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  maxWidth?: string;
  icon?: ReactNode;
  showCloseButton?: boolean;
}

const UniversalModal: React.FC<UniversalModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-xl',
  icon,
  showCloseButton = true,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 dark:bg-[#0F0F1E]/80 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className={`w-full ${maxWidth} bg-white dark:bg-[#1A1A2E] border border-slate-200 dark:border-white/10 rounded-[28px] z-10 shadow-[0_20px_60px_rgba(0,0,0,0.3)] relative flex flex-col max-h-[90vh]`}
          >
            {/* Header */}
            {(title || description || showCloseButton) && (
              <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-4">
                  {icon && (
                    <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-light/20 shrink-0">
                      {React.isValidElement(icon) ? React.cloneElement(icon as any, { size: 20 }) : icon}
                    </div>
                  )}
                  <div>
                    {title && (
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-outfit leading-tight">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em] mt-0.5">
                        {description}
                      </p>
                    )}
                  </div>
                </div>

                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer text-slate-400 hover:text-slate-900 dark:hover:text-white group"
                  >
                    <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                )}
              </div>
            )}

            {/* Content Section */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UniversalModal;
