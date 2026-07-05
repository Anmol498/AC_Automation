import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

interface FolderUploadProps {
  label: string;
  fileType: 'dwg' | 'quot';
  selectedFile: File | null;
  onChange: (file: File | null) => void;
  isDark?: boolean;
}

export const FolderUpload: React.FC<FolderUploadProps> = ({
  label,
  fileType,
  selectedFile,
  onChange,
  isDark = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showGenie, setShowGenie] = useState(false);
  const controls = useAnimation();

  // Trigger genie animation when a new file is uploaded
  useEffect(() => {
    if (selectedFile) {
      setShowGenie(true);
      const timer = setTimeout(() => {
        setShowGenie(false);
      }, 1200); // match animation duration
      return () => clearTimeout(timer);
    }
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onChange(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onChange(e.dataTransfer.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Color theme definitions
  const docColor = fileType === 'dwg' 
    ? { bg: 'bg-[#0f241b]', border: 'border-[#10b981]/30', text: 'text-[#10b981]', lines: 'bg-[#10b981]' }
    : { bg: 'bg-[#151f32]', border: 'border-[#3b82f6]/30', text: 'text-[#3b82f6]', lines: 'bg-[#3b82f6]' };

  return (
    <div className="flex flex-col items-center select-none w-full">
      <span className={`text-xs font-bold mb-3 tracking-wide ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
        {label}
      </span>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={fileType === 'dwg' ? '.dwg,.dxf,.png,.jpg,.jpeg' : '.pdf,.doc,.docx,.txt'}
        onChange={handleFileChange}
      />

      {/* Upload Box Container */}
      <div
        onClick={onButtonClick}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative w-40 h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
          isDragActive 
            ? 'border-blue-500 bg-blue-500/10 scale-102' 
            : isDark 
              ? 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/40' 
              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/50'
        }`}
      >
        {/* Animated Folder Representation */}
        <motion.div 
          className="relative w-24 h-20 mb-2 flex items-center justify-center"
          whileHover="hover"
          animate="rest"
        >
          {/* Back Folder Flap */}
          <svg className="absolute w-24 h-20 drop-shadow-md" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 15C5 9.47715 9.47715 5 15 5H40L48 15H85C90.5228 15 95 19.4772 95 25V65C95 70.5228 90.5228 75 85 75H15C9.47715 75 5 70.5228 5 65V15Z" fill="#EAB308" />
            <path d="M5 25C5 19.4772 9.47715 15 15 15H85C90.5228 15 95 19.4772 95 25V65C95 70.5228 90.5228 75 85 75H15C9.47715 75 5 70.5228 5 65V25Z" fill="#CA8A04" />
          </svg>

          {/* Peeking Document sheet on hover or when file exists */}
          <AnimatePresence>
            {(selectedFile || isDragActive) && !showGenie && (
              <motion.div
                initial={{ y: 15, scale: 0.8, opacity: 0 }}
                animate={{ y: -12, scale: 0.9, opacity: 1 }}
                exit={{ y: 25, scale: 0.7, opacity: 0 }}
                variants={{
                  hover: { y: -20, scale: 0.95 },
                  rest: { y: -12, scale: 0.9 }
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`absolute w-16 h-20 rounded-xl border ${docColor.bg} ${docColor.border} p-2.5 flex flex-col justify-between shadow-lg z-10`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[9px] font-black tracking-tighter ${docColor.text}`}>
                    {fileType === 'dwg' ? 'DWG' : 'QUOT'}
                  </span>
                  <i className={`fa-solid ${fileType === 'dwg' ? 'fa-file-image' : 'fa-file-pdf'} text-xs ${docColor.text}`}></i>
                </div>
                <div className="space-y-1 mt-auto">
                  <div className={`h-1 w-full rounded-full ${docColor.lines} opacity-60`} />
                  <div className={`h-1 w-4/5 rounded-full ${docColor.lines} opacity-40`} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Genie Animation Sequence */}
          <AnimatePresence>
            {showGenie && (
              <motion.div
                initial={{ 
                  y: -100, 
                  x: 0, 
                  scale: 0.4, 
                  rotate: -15, 
                  opacity: 0,
                  skewX: -10
                }}
                animate={{ 
                  y: [ -80, -40, -10 ], 
                  x: [ 20, -10, 0 ],
                  scale: [ 0.5, 0.9, 0.75 ], 
                  rotate: [ -10, 15, 0 ], 
                  opacity: [ 0.3, 1, 0.9 ],
                  skewX: [ -15, 10, 0 ]
                }}
                exit={{ 
                  y: 15,
                  scale: 0.6,
                  opacity: 0
                }}
                transition={{ 
                  duration: 0.9, 
                  ease: [0.25, 0.1, 0.25, 1] 
                }}
                className={`absolute w-16 h-20 rounded-xl border ${docColor.bg} ${docColor.border} p-2.5 flex flex-col justify-between shadow-lg z-10`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[9px] font-black tracking-tighter ${docColor.text}`}>
                    {fileType === 'dwg' ? 'DWG' : 'QUOT'}
                  </span>
                  <i className={`fa-solid ${fileType === 'dwg' ? 'fa-file-image' : 'fa-file-pdf'} text-xs ${docColor.text}`}></i>
                </div>
                <div className="space-y-1 mt-auto">
                  <div className={`h-1 w-full rounded-full ${docColor.lines} opacity-60`} />
                  <div className={`h-1 w-4/5 rounded-full ${docColor.lines} opacity-40`} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Front Folder cover (rendered above the peeking document) */}
          <svg className="absolute w-24 h-20 z-20" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 32C5 26.4772 9.47715 22 15 22H85C90.5228 22 95 26.4772 95 32V65C95 70.5228 90.5228 75 85 75H15C9.47715 75 5 70.5228 5 65V32Z" fill="#FACC15" />
          </svg>
        </motion.div>

        {/* Action Button / Delete trigger */}
        {selectedFile && (
          <button
            onClick={handleRemove}
            className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow ${
              isDark ? 'bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-700' : 'bg-white text-slate-400 hover:text-red-500 hover:bg-slate-100'
            } z-30`}
            title="Remove File"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        )}
      </div>

      {/* Selected File Label or Empty Status */}
      <div className="mt-3 text-center max-w-[150px]">
        {selectedFile ? (
          <p className={`text-xs font-bold truncate px-2 py-1 rounded-md ${
            isDark ? 'bg-zinc-800/60 text-zinc-300' : 'bg-slate-100 text-slate-600'
          }`} title={selectedFile.name}>
            {selectedFile.name}
          </p>
        ) : (
          <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 italic uppercase tracking-wider">
            Empty
          </span>
        )}
      </div>
    </div>
  );
};
