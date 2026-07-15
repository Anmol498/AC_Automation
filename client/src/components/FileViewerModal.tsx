import React, { useState, useEffect, useRef, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import CadViewerBridge from './CadViewerBridge';

// Error Boundary for catching CAD viewer crashes
interface CadErrorBoundaryProps { children: ReactNode; url: string; filename: string }
interface CadErrorBoundaryState { hasError: boolean }

class CadErrorBoundary extends Component<CadErrorBoundaryProps, CadErrorBoundaryState> {
  state: CadErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CAD Viewer Error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', color: '#334155' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 16 }}>
            <i className="fa-solid fa-drafting-compass"></i>
          </div>
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: '#1e293b' }}>CAD Drawing (.DWG)</p>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20, maxWidth: 300 }}>This drawing could not be rendered in the browser. Please download and open with AutoCAD or a DWG viewer.</p>
          <a href={this.props.url} download={this.props.filename} style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: '#ffffff', fontWeight: 700, fontSize: 14, borderRadius: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-download"></i> Download Drawing
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}


interface FileViewerModalProps {
  url: string;
  filename: string;
  onClose: () => void;
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({ url, filename, onClose }) => {
  const [xlsxData, setXlsxData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDwgViewer, setShowDwgViewer] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!viewerContainerRef.current) return;
    if (!document.fullscreenElement) {
      viewerContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const fileExtension = filename.split('.').pop()?.toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExtension || '');
  const isPdf = fileExtension === 'pdf';
  const isExcel = ['xlsx', 'xls', 'csv'].includes(fileExtension || '');
  const isDwg = ['dwg', 'dxf', 'dxg'].includes(fileExtension || '');

  // Ensure the CAD viewer is unmounted before closing the modal
  const handleClose = () => {
    if (showDwgViewer) {
      setShowDwgViewer(false);
      // Give React a tick to unmount the CadViewerBridge before removing the modal
      setTimeout(() => onClose(), 50);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (isDwg) {
      fetch(url, { method: 'HEAD' })
        .then(res => {
          const size = res.headers.get('content-length');
          if (size) {
            const parsedSize = parseInt(size, 10);
            setFileSize(parsedSize);
            if (parsedSize > 10 * 1024 * 1024) {
              setShowDwgViewer(false);
            }
          }
        })
        .catch(err => {
          console.error('Error fetching file size:', err);
        });
    }
  }, [url, isDwg]);

  useEffect(() => {
    if (isExcel) {
      setLoading(true);
      fetch(url)
        .then(res => res.arrayBuffer())
        .then(buffer => {
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          setXlsxData(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error reading Excel file:', err);
          setError('Could not preview this spreadsheet.');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [url, isExcel]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 text-slate-400 dark:text-zinc-500">
          <i className="fa-solid fa-spinner fa-spin text-3xl mb-4 text-blue-500"></i>
          <p className="font-medium">Loading preview...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mb-4">
            <i className="fa-solid fa-circle-exclamation text-2xl"></i>
          </div>
          <p className="text-slate-800 dark:text-zinc-100 font-bold mb-2">Preview Unavailable</p>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mb-6">{error}</p>
          <a href={url} download={filename} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2">
            <i className="fa-solid fa-download"></i>
            Download File
          </a>
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="flex-1 flex items-center justify-center p-4 bg-slate-50 dark:bg-background-dark/40 rounded-xl overflow-hidden min-h-[300px]">
          <img src={url} alt={filename} className="max-w-full max-h-full object-contain shadow-sm rounded-lg" />
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="w-full flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-border-dark">
          <iframe src={`${url}#toolbar=0`} className="w-full h-full" title={filename}></iframe>
        </div>
      );
    }

    if (isExcel) {
      return (
        <div className="flex-1 overflow-auto border border-slate-200 dark:border-border-dark rounded-xl bg-white dark:bg-card-dark">
          <table className="w-full text-xs text-left border-collapse text-slate-800 dark:text-zinc-200">
            <tbody>
              {xlsxData.map((row, i) => (
                <tr
                  key={i}
                  className={i === 0 ? 'bg-slate-900 dark:bg-background-dark text-white sticky top-0 z-10' : (i % 2 === 0 ? 'bg-slate-50 dark:bg-background-dark/20 text-slate-800 dark:text-zinc-200' : 'bg-white dark:bg-card-dark text-slate-800 dark:text-zinc-200')}
                >
                  <td
                    style={{
                      padding: '8px 12px',
                      borderRight: '1px solid #e2e8f0',
                      fontWeight: 700,
                      fontSize: 11,
                      textAlign: 'center',
                      minWidth: 40,
                      position: 'sticky',
                      left: 0,
                      zIndex: 5
                    }}
                    className={i === 0 ? 'text-slate-400 bg-slate-800 dark:bg-background-dark border-r border-slate-700 dark:border-border-dark' : 'text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-[#2b2e33] border-r border-slate-200 dark:border-border-dark/50'}
                  >
                    {i === 0 ? '#' : i}
                  </td>
                  {Array.isArray(row) ? row.map((cell, j) => (
                    <td
                      key={j}
                      style={{
                        padding: '10px 16px',
                        borderRight: '1px solid #e2e8f0',
                        borderBottom: '1px solid #e2e8f0',
                        minWidth: 140,
                        whiteSpace: 'nowrap',
                        fontWeight: i === 0 ? 700 : 400,
                        fontSize: i === 0 ? 12 : 13,
                        letterSpacing: i === 0 ? '0.02em' : 'normal'
                      }}
                      className="text-slate-800 dark:text-zinc-200 border-r border-b border-slate-100 dark:border-border-dark/80"
                    >
                      {cell != null ? cell.toString() : ''}
                    </td>
                  )) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {xlsxData.length === 0 && (
            <div className="p-10 text-center text-slate-400 dark:text-zinc-500 italic">This spreadsheet is empty.</div>
          )}
        </div>
      );
    }

    if (isDwg) {
      const isTooLarge = fileSize !== null && fileSize > 10 * 1024 * 1024; // 10MB threshold
      const fileSizeMB = fileSize ? (fileSize / (1024 * 1024)).toFixed(1) : '';

      if (!showDwgViewer) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center bg-slate-50/55 dark:bg-background-dark/20 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-border-dark">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-sm ring-8 ${
              isTooLarge ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 ring-amber-50/50 dark:ring-amber-950/20' : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 ring-blue-50/50 dark:ring-blue-950/20'
            }`}>
              <i className={`fa-solid ${isTooLarge ? 'fa-triangle-exclamation' : 'fa-drafting-compass'} text-3xl`}></i>
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-2xl mb-2 tracking-tight">CAD Drawing (.DWG)</h3>
            
            {isTooLarge ? (
              <div className="max-w-md mb-8">
                <p className="text-slate-500 dark:text-zinc-400 mb-4">
                  This drawing file is very large <strong className="text-slate-800 dark:text-zinc-200 font-bold">({fileSizeMB} MB)</strong>. 
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4 text-left text-xs text-amber-800 dark:text-amber-300 flex gap-3">
                  <i className="fa-solid fa-circle-info text-base mt-0.5 shrink-0 text-amber-600 dark:text-amber-500"></i>
                  <div>
                    <strong className="block font-bold mb-0.5">High Memory Usage Warning</strong>
                    Attempting to render this file in the browser will likely cause the page to crash (Out of Memory). Please download and open it on your device.
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 dark:text-zinc-400 mb-8 max-w-sm text-balance font-medium">
                Would you like to view this drawing in the browser{fileSize ? ` (${fileSizeMB} MB)` : ''} or download it to your device?
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <button 
                onClick={() => setShowDwgViewer(true)}
                className="flex-1 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3"
              >
                <i className="fa-solid fa-eye"></i>
                View Drawing
              </button>
              <a 
                href={url} 
                download={filename}
                className="flex-1 px-8 py-4 bg-white dark:bg-border-dark hover:bg-slate-50 dark:hover:bg-card-dark text-slate-700 dark:text-zinc-200 font-bold rounded-2xl border-2 border-slate-100 dark:border-border-dark transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 shadow-sm"
              >
                <i className="fa-solid fa-download"></i>
                Download
              </a>
            </div>
          </div>
        );
      }
      return (
        <div ref={viewerContainerRef} className="w-full flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-border-dark bg-black relative">
          <button
            onClick={toggleFullscreen}
            className="absolute top-3 right-3 z-50 w-9 h-9 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg flex items-center justify-center transition-all border border-white/10"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
          </button>
          <CadErrorBoundary url={url} filename={filename}>
            <CadViewerBridge url={url} background={0x000000} />
          </CadErrorBoundary>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-background-dark text-slate-400 dark:text-zinc-500 rounded-full flex items-center justify-center mb-4">
          <i className="fa-solid fa-file-lines text-2xl"></i>
        </div>
        <p className="text-slate-800 dark:text-zinc-100 font-bold mb-2">Download Required</p>
        <p className="text-slate-500 dark:text-zinc-400 text-sm mb-8">This file type cannot be previewed in the browser.</p>
        <a href={url} download={filename} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg">
          Download File
        </a>
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 bg-[#151619]/60 backdrop-blur-md z-[1000] flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-[32px] w-full max-w-7xl h-[95vh] max-h-[95vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 origin-center relative z-10">
        <div className="px-8 py-5 border-b border-slate-100 dark:border-border-dark flex items-center justify-between shrink-0 bg-white dark:bg-card-dark relative z-20">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
              isExcel ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' : 
              isPdf ? 'bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400' : 
              isDwg ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' : 
              'bg-slate-50 dark:bg-background-dark text-slate-505 dark:text-zinc-400'
            }`}>
              <i className={`fa-solid ${
                isExcel ? 'fa-file-excel' : 
                isPdf ? 'fa-file-pdf' : 
                isDwg ? 'fa-drafting-compass' : 
                isImage ? 'fa-image' : 
                'fa-file'
              } text-xl`}></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{filename}</h3>
              <p className="text-slate-400 dark:text-zinc-500 text-xs font-medium uppercase tracking-wider mt-0.5">{fileExtension} File</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleClose} 
              className="w-10 h-10 bg-slate-50 dark:bg-[#2b2e33] text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1f2125] rounded-full flex items-center justify-center transition-all"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden p-6 bg-slate-50/30 dark:bg-background-dark/30 flex flex-col">
          {renderContent()}
        </div>
        
        <div className="px-8 py-5 bg-white dark:bg-card-dark border-t border-slate-100 dark:border-border-dark flex justify-end gap-3 shrink-0">
          <button 
            onClick={handleClose} 
            className="px-6 py-2.5 text-slate-505 dark:text-zinc-400 font-bold text-sm hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            Close Preview
          </button>
          <a 
            href={url} 
            download={filename} 
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-download text-xs"></i>
            Download
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FileViewerModal;
