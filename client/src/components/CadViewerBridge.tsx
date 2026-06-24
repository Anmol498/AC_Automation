import React, { useEffect, useRef, useState } from 'react';
import { Viewer2d } from '@x-viewer/core';

interface CadViewerBridgeProps {
  url?: string;
  localFile?: File;
  background?: number;
}

const CadViewerBridge: React.FC<CadViewerBridgeProps> = ({ url, localFile, background }) => {
  const containerIdRef = useRef(`x-viewer-container-${Math.random().toString(36).substr(2, 9)}`);
  const viewerRef = useRef<Viewer2d | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Initializing viewer...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setProgress(0);
    setStatusText('Initializing viewer...');
    setErrorMsg(null);

    // Abort any previous fetch
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    // Verify DOM element exists
    const containerEl = document.getElementById(containerIdRef.current);
    if (!containerEl) {
      setErrorMsg("Failed to locate rendering container in DOM.");
      setLoading(false);
      return;
    }

    // Initialize Viewer2d directly on the React-rendered container ID
    let viewer: Viewer2d | null = null;
    try {
      viewer = new Viewer2d({
        containerId: containerIdRef.current,
        enableLayoutBar: true,
        enableSpinner: false, // Use our own React spinner
      });
      viewerRef.current = viewer;

      // Set background color if provided
      if (background !== undefined) {
        const r = ((background >> 16) & 255) / 255;
        const g = ((background >> 8) & 255) / 255;
        const b = (background & 255) / 255;
        viewer.setBackgroundColor(r, g, b);
      }
    } catch (initErr: any) {
      console.error('Failed to initialize Viewer2d:', initErr);
      setErrorMsg(`Viewer Initialization Failed: ${initErr.message || initErr}`);
      setLoading(false);
      return;
    }

    const loadDrawing = async () => {
      try {
        if (!viewer || cancelled) return;

        const onProgressCallback = (event: any) => {
          if (cancelled) return;
          if (event.total) {
            const pct = Math.round((event.loaded * 100) / event.total);
            setProgress(pct);
          }
        };

        let arrayBuffer: ArrayBuffer;
        let fileExtension: string;
        let fileName: string;

        if (localFile) {
          setStatusText('Reading local file...');
          arrayBuffer = await localFile.arrayBuffer();
          fileExtension = localFile.name.split('.').pop()?.toLowerCase() || 'dwg';
          fileName = localFile.name;
        } else if (url) {
          // Pre-fetch the file as ArrayBuffer to avoid CORS issues with
          // x-viewer's internal fetch. This way we control the request.
          setStatusText('Downloading drawing file...');
          fileExtension = url.split('?')[0].split('.').pop()?.toLowerCase() || 'dwg';
          fileName = url.split('/').pop()?.split('?')[0] || `drawing.${fileExtension}`;

          const response = await fetch(url, {
            signal: abortRef.current!.signal,
          });

          if (!response.ok) {
            throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
          }

          // Track download progress via ReadableStream if available
          const contentLength = response.headers.get('content-length');
          if (contentLength && response.body) {
            const total = parseInt(contentLength, 10);
            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];
            let received = 0;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (cancelled) { reader.cancel(); return; }
              chunks.push(value);
              received += value.length;
              const pct = Math.round((received * 100) / total);
              setProgress(pct);
              setStatusText(`Downloading... ${(received / (1024 * 1024)).toFixed(1)} / ${(total / (1024 * 1024)).toFixed(1)} MB`);
            }

            // Merge chunks into single ArrayBuffer
            const merged = new Uint8Array(received);
            let offset = 0;
            for (const chunk of chunks) {
              merged.set(chunk, offset);
              offset += chunk.length;
            }
            arrayBuffer = merged.buffer;
          } else {
            arrayBuffer = await response.arrayBuffer();
          }
        } else {
          setErrorMsg('No file or URL provided.');
          setLoading(false);
          return;
        }

        if (cancelled) return;

        setStatusText('Parsing CAD drawing...');
        setProgress(0);

        // Always pass binary data directly to avoid x-viewer's internal fetch
        await viewer.loadModel({
          modelId: 'master_model',
          name: fileName,
          src: fileName,
          data: arrayBuffer,
          fileFormat: fileExtension,
        }, onProgressCallback);

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err: any) {
        if (cancelled || err.name === 'AbortError') return;
        console.error('Error loading CAD drawing:', err);
        setErrorMsg(err.message || String(err));
        setLoading(false);
      }
    };

    loadDrawing();

    // Cleanup
    return () => {
      cancelled = true;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying X-Viewer instance:', e);
        }
        viewerRef.current = null;
      }
    };
  }, [url, localFile, background]);

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/80 text-white gap-3 rounded-xl">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold tracking-wide">
            {statusText} {progress > 0 ? `${progress}%` : ''}
          </p>
        </div>
      )}

      {/* Error Overlay */}
      {errorMsg && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center gap-4 rounded-xl border border-red-500/25">
          <div className="w-16 h-16 rounded-full bg-red-950/30 text-red-500 flex items-center justify-center shadow-inner">
            <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
          </div>
          <div>
            <h4 className="font-bold text-lg text-red-400 mb-1">Failed to Render Drawing</h4>
            <p className="text-xs text-slate-400 max-w-md font-mono break-all">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Canvas Target Container */}
      <div 
        id={containerIdRef.current}
        style={{ width: '100%', height: '100%', minHeight: '500px' }}
        className="cad-viewer-container"
      />
    </div>
  );
};

export default CadViewerBridge;
