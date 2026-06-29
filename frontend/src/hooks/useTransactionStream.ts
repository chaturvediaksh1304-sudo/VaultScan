import { useCallback, useEffect, useRef, useState } from "react";
import type { ScoredTransaction, Stats } from "../types/transaction";

const MAX_TXNS = 500;

/** Resolve the WebSocket URL. In dev, Vite proxies /ws → backend. In prod,
 *  set VITE_WS_URL to the backend's wss:// endpoint. */
function wsUrl(): string {
  const env = import.meta.env.VITE_WS_URL as string | undefined;
  if (env) return env;
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws/stream`;
}

/** Resolve the REST base. Dev: /api proxied → backend. Prod: VITE_API_URL. */
function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";
}

const EMPTY_STATS: Stats = {
  total_processed: 0,
  fraud_rate_pct: 0,
  avg_latency_ms: 0,
  flagged_last_minute: 0,
};

interface StreamState {
  transactions: ScoredTransaction[];
  stats: Stats;
  isConnected: boolean;
  latest: ScoredTransaction | null;
  latestFlagged: ScoredTransaction | null;
}

export function useTransactionStream(): StreamState {
  const [transactions, setTransactions] = useState<ScoredTransaction[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [isConnected, setIsConnected] = useState(false);
  const [latest, setLatest] = useState<ScoredTransaction | null>(null);
  const [latestFlagged, setLatestFlagged] = useState<ScoredTransaction | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const closedRef = useRef(false);

  const connect = useCallback(() => {
    if (closedRef.current) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl());
    } catch {
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
      setIsConnected(true);
    };
    ws.onmessage = (ev) => {
      let txn: ScoredTransaction;
      try {
        txn = JSON.parse(ev.data);
      } catch {
        return;
      }
      setTransactions((prev) => {
        // Dedupe by id — the warm-start replay (and StrictMode's double mount)
        // can resend transactions already in the list.
        if (prev.length && prev[0].transaction_id === txn.transaction_id) return prev;
        const next = [txn, ...prev.filter((t) => t.transaction_id !== txn.transaction_id)];
        return next.length > MAX_TXNS ? next.slice(0, MAX_TXNS) : next;
      });
      setLatest(txn);
      if (txn.flagged) setLatestFlagged(txn);
    };
    ws.onclose = () => {
      setIsConnected(false);
      scheduleReconnect();
    };
    ws.onerror = () => ws.close();

    function scheduleReconnect() {
      if (closedRef.current) return;
      const delay = Math.min(1000 * 2 ** retryRef.current, 30000);
      retryRef.current += 1;
      setTimeout(connect, delay);
    }
  }, []);

  useEffect(() => {
    closedRef.current = false;
    connect();
    return () => {
      closedRef.current = true;
      wsRef.current?.close();
    };
  }, [connect]);

  // Authoritative lifetime stats from the backend (polled).
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`${apiBase()}/stats`);
        if (res.ok && active) setStats(await res.json());
      } catch {
        /* backend not up yet — ignore */
      }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return { transactions, stats, isConnected, latest, latestFlagged };
}
