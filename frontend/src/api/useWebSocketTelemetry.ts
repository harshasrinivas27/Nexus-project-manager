import { useState, useEffect, useRef } from 'react';
import { SystemMetrics, SchedulerStatus, ProcessLive, GanttEvent } from '../types';

export interface TelemetryData {
  system: SystemMetrics | null;
  scheduler: SchedulerStatus | null;
  processes: ProcessLive[];
  gantt: GanttEvent[];
  connected: boolean;
}

export function useWebSocketTelemetry() {
  const [data, setData] = useState<TelemetryData>({
    system: null,
    scheduler: null,
    processes: [],
    gantt: [],
    connected: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const wsProto = isHttps ? 'wss:' : 'ws:';
      const wsHost = (import.meta as any).env?.VITE_WS_HOST ||
        (typeof window !== 'undefined' && window.location.port === '5173'
          ? `${window.location.hostname}:8000`
          : (typeof window !== 'undefined' ? window.location.host : 'localhost:8000'));
      const wsUrl = `${wsProto}//${wsHost}/ws/live`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!isMounted) return;
        setData(prev => ({ ...prev, connected: true }));
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'telemetry') {
            setData({
              system: payload.system,
              scheduler: payload.scheduler,
              processes: payload.processes,
              gantt: payload.gantt,
              connected: true,
            });
          }
        } catch (err) {
          console.error("Telemetry parse error", err);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setData(prev => ({ ...prev, connected: false }));
        reconnectTimeoutRef.current = window.setTimeout(connect, 1500);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return data;
}
