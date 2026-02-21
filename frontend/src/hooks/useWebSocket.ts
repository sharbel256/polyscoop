import { useCallback, useEffect, useRef, useState } from "react";

type MessageHandler = (data: unknown) => void;

const WS_URL =
  (import.meta.env.VITE_API_URL || window.location.origin).replace(
    /^http/,
    "ws",
  ) + "/api/v1/ws/feed";

const RECONNECT_BASE = 1000;
const RECONNECT_MAX = 30000;

export function useWebSocket(channels: string[] = ["trades:mentions"]) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const [connected, setConnected] = useState(false);
  const reconnectDelay = useRef(RECONNECT_BASE);
  const channelsRef = useRef(channels);
  channelsRef.current = channels;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectDelay.current = RECONNECT_BASE;
      ws.send(
        JSON.stringify({ type: "subscribe", channels: channelsRef.current }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handlersRef.current.forEach((handler) => handler(msg));
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setTimeout(() => {
        reconnectDelay.current = Math.min(
          reconnectDelay.current * 2,
          RECONNECT_MAX,
        );
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  // Re-subscribe when channels change
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "subscribe", channels }));
    }
  }, [channels]);

  const subscribe = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return { connected, subscribe };
}
