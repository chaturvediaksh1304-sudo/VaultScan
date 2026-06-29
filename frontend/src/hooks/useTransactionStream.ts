import { useCallback, useEffect, useRef, useState } from "react";
import type { ScoredTransaction, Stats } from "../types/transaction";

const MAX_TXNS = 500;

/** Demo mode: replay a bundle of transactions pre-scored by the real Isolation
 *  Forest, client-side, with no backend. Enabled on the always-on Vercel deploy
 *  (VITE_DEMO_MODE=true) so the live demo never waits on a backend cold-start. */
const DEMO = import.meta.env.VITE_DEMO_MODE === "true";
const DEMO_TPS = 10;

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
    if (DEMO) return;
    closedRef.current = false;
    connect();
    return () => {
      closedRef.current = true;
      wsRef.current?.close();
    };
  }, [connect]);

  // Authoritative lifetime stats from the backend (polled).
  useEffect(() => {
    if (DEMO) return;
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

  // Demo replay — client-side, real model scores, computed stats. No backend.
  useEffect(() => {
    if (!DEMO) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let idx = 0;
    let total = 0;
    let fraud = 0;
    const latencies: number[] = [];
    const flaggedTimes: number[] = [];

    fetch("/demo-stream.json")
      .then((r) => r.json())
      .then((payload: { transactions: ScoredTransaction[] }) => {
        if (cancelled) return;
        const data = payload.transactions;
        if (!data.length) return;
        setIsConnected(true);

        const tick = () => {
          if (cancelled) return;
          const base = data[idx % data.length];
          idx += 1;
          const txn: ScoredTransaction = {
            ...base,
            transaction_id: `txn_${String(idx).padStart(8, "0")}`,
            timestamp: new Date().toISOString(),
          };

          total += 1;
          latencies.push(txn.latency_ms);
          if (latencies.length > 200) latencies.shift();
          const now = Date.now();
          if (txn.flagged) {
            fraud += 1;
            flaggedTimes.push(now);
          }
          while (flaggedTimes.length && now - flaggedTimes[0] > 60_000) flaggedTimes.shift();

          setTransactions((prev) => {
            const next = [txn, ...prev];
            return next.length > MAX_TXNS ? next.slice(0, MAX_TXNS) : next;
          });
          setLatest(txn);
          if (txn.flagged) setLatestFlagged(txn);
          setStats({
            total_processed: total,
            fraud_rate_pct: Math.round((fraud / total) * 10000) / 100,
            avg_latency_ms:
              Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 100) / 100,
            flagged_last_minute: flaggedTimes.length,
          });

          // Organic cadence around the target rate.
          const delay = (1000 / DEMO_TPS) * (0.7 + Math.random() * 0.6);
          timer = setTimeout(tick, delay);
        };
        tick();
      })
      .catch(() => {
        /* demo bundle missing — leave dashboard idle */
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return { transactions, stats, isConnected, latest, latestFlagged };
}
