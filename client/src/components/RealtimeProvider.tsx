import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AppContext';
import { API_BASE_URL } from '../constants';

type RealtimeStatus = 'connected' | 'connecting' | 'disconnected' | 'polling';

interface RealtimeContextType {
  status: RealtimeStatus;
  subscribe: (type: string, callback: () => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used within RealtimeProvider');
  return context;
};

/**
 * Custom hook to register a callback listener for real-time events.
 * It uses a ref to always execute the latest callback reference without
 * triggering resubscriptions.
 */
export const useRealtimeListener = (type: string, callback: () => void) => {
  const { subscribe } = useRealtime();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handler = () => {
      callbackRef.current();
    };
    return subscribe(type, handler);
  }, [type, subscribe]);
};

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const subscribers = useRef<Map<string, Set<() => void>>>(new Map());
  const sseRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  const subscribe = (type: string, callback: () => void) => {
    if (!subscribers.current.has(type)) {
      subscribers.current.set(type, new Set());
    }
    subscribers.current.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      const typeSubs = subscribers.current.get(type);
      if (typeSubs) {
        typeSubs.delete(callback);
        if (typeSubs.size === 0) {
          subscribers.current.delete(type);
        }
      }
    };
  };

  const triggerUpdate = (type: string) => {
    const typeSubs = subscribers.current.get(type);
    if (typeSubs) {
      typeSubs.forEach(cb => {
        try {
          cb();
        } catch (e) {
          console.error(`[Realtime] Subscriber callback failed for type ${type}:`, e);
        }
      });
    }
  };

  const triggerAll = () => {
    subscribers.current.forEach((typeSubs) => {
      typeSubs.forEach(cb => {
        try {
          cb();
        } catch (e) {
          console.error('[Realtime] Subscriber callback failed during global tick:', e);
        }
      });
    });
  };

  // Fallback to standard 60-second polling
  const startPolling = () => {
    if (pollIntervalRef.current) return;
    setStatus('polling');
    console.log('[Realtime] SSE failed permanently. Falling back to 60-second polling...');
    pollIntervalRef.current = setInterval(() => {
      console.log('[Realtime] Polling update tick...');
      triggerAll();
    }, 60000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Connect via SSE
  const connectSSE = () => {
    if (!isAuthenticated) return;
    
    stopPolling();
    if (sseRef.current) {
      sseRef.current.close();
    }

    setStatus('connecting');
    const sseUrl = `${API_BASE_URL}/realtime`;

    console.log(`[Realtime] Connecting EventSource to: ${sseUrl}`);
    const es = new EventSource(sseUrl, { withCredentials: true });
    sseRef.current = es;

    es.onopen = () => {
      console.log('[Realtime] EventSource stream established.');
      setStatus('connected');
      reconnectAttemptsRef.current = 0;
    };

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('[Realtime] Event payload received:', payload);
        if (payload && payload.type) {
          if (payload.type !== 'CONNECTED') {
            triggerUpdate(payload.type);
          }
        }
      } catch (err) {
        console.error('[Realtime] Failed to parse EventSource message:', err);
      }
    };

    es.onerror = (err) => {
      console.error('[Realtime] EventSource encountered connection error:', err);
      es.close();
      sseRef.current = null;

      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current += 1;
        const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000;
        console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
        setStatus('connecting');
        setTimeout(connectSSE, delay);
      } else {
        startPolling();
      }
    };
  };

  useEffect(() => {
    if (isAuthenticated) {
      connectSSE();
    } else {
      setStatus('disconnected');
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      stopPolling();
    }

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      stopPolling();
    };
  }, [isAuthenticated, token]);

  return (
    <RealtimeContext.Provider value={{ status, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
};
