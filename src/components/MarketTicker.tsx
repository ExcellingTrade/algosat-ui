"use client";
import { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// Define IndexData right here
export interface IndexData {
  id: string | number;
  indexName: string;
  last: number;
  change: number;
  percChange: number;
  isIndex: boolean;
}

interface MarketTickerProps {
  className?: string;
}

export function MarketTicker({ className = "" }: MarketTickerProps) {
  const { isAuthenticated } = useAuth();
  const [indexData, setIndexData] = useState<IndexData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Check if this is mobile/centered version
  const isMobile = className.includes('justify-center');

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsHost = window.location.hostname;
      const wsPort = '8001';
      const token = localStorage.getItem('auth_token');

      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const wsUrl = `${wsProtocol}://${wsHost}:${wsPort}/ws/livefeed?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[MarketTicker] WebSocket connected:', wsUrl);
        setError(null);
        setIsLoading(false); // Connection is open, stop loading
      };

      ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);

            const processMessage = (item: any): IndexData | null => {
                const rawSymbol = item.symbol;
                if (!rawSymbol || item.ltp == null || item.chp == null || item.ch == null) {
                    return null;
                }
                const coreSymbol = rawSymbol.split(':')[1]?.split('-')[0] || rawSymbol;
                return {
                  id: coreSymbol,
                  indexName: coreSymbol,
                  last: item.ltp,
                  percChange: item.chp,
                  change: item.ch,
                  isIndex: rawSymbol.includes('-INDEX'),
                };
            };

            const itemsToProcess = Array.isArray(msg) ? msg : [msg];
            const newUpdates = itemsToProcess.map(processMessage).filter((d): d is IndexData => d !== null);

            if (newUpdates.length > 0) {
                setIndexData(prevData => {
                    const dataMap = new Map(prevData.map(d => [d.id, d]));
                    newUpdates.forEach(update => {
                        const existingData = dataMap.get(update.id) || {};
                        dataMap.set(update.id, { ...existingData, ...update });
                    });
                    return Array.from(dataMap.values());
                });
            }
        } catch (e) {
            console.error('[MarketTicker] WebSocket message parse error:', e, event.data);
        }
      };

      ws.onerror = (event) => {
        console.error('[MarketTicker] WebSocket error:', event);
        setError('WebSocket connection failed.');
        setIsLoading(false);
      };

      ws.onclose = (event) => {
        console.warn('[MarketTicker] WebSocket closed:', event);
        if (!event.wasClean) {
          setError('Connection lost. Reconnecting...');
          setIsLoading(true); // Show loading during reconnection attempt
          clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className={isMobile ? `w-full max-w-4xl mx-auto ${className}` : `w-full max-w-4xl ${className}`}>
        <div className="flex items-center justify-center space-x-3 px-4 py-2 bg-[var(--card-background)]/70 rounded-lg border border-[var(--border)]/40">
          <div className="w-2 h-2 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-[var(--muted-foreground)] font-medium">Loading market data...</span>
        </div>
      </div>
    );
  }

  if (error || indexData.length === 0) {
    return (
      <div className={isMobile ? `w-full max-w-4xl mx-auto ${className}` : `w-full max-w-4xl ${className}`}>
        <div className="flex items-center justify-center space-x-3 px-4 py-2 bg-[var(--card-background)]/70 rounded-lg border border-[var(--error)]/40">
          <div className="w-1.5 h-1.5 bg-[var(--error)] rounded-full"></div>
          <span className="text-sm text-[var(--error)] font-medium">Market data unavailable</span>
        </div>
      </div>
    );
  }

  // Format index name for better display - show full names
  const formatIndexName = (name: string) => {
    return name
      .replace(/\s+/g, ' ')
      .trim();
  };

  return (
    <div className={isMobile ? `w-full max-w-4xl mx-auto ${className}` : `w-full max-w-4xl ${className}`}>
      {/* Enhanced Professional Ticker Container */}
      <div className={`
        flex items-center p-2
        bg-gradient-to-r from-[var(--card-background)]/95 to-[var(--card-background)]/85
        backdrop-blur-md
        rounded-xl border-2 border-[var(--border)]/60
        shadow-lg shadow-[var(--accent)]/20
        overflow-hidden relative
        ring-1 ring-[var(--accent)]/10
      `}>
        
        <div className="flex-1 overflow-x-auto">
          <div className="flex items-center gap-3 whitespace-nowrap">
            {indexData.map((data) => {
              const isPositive = data.change >= 0;
              const changeColor = isPositive ? 'text-[var(--trading-green)]' : 'text-[var(--trading-red)]';

              return (
                <div
                  key={data.id}
                  className={`
                    flex-shrink-0 px-3 py-1.5 rounded-md
                    border
                    ${isPositive ? 'border-[var(--trading-green)]/70' : 'border-[var(--trading-red)]/70'}
                    bg-[var(--card-background)]/80
                  `}
                >
                  <div className="flex flex-col">
                    {/* Top row: Index Name & Price */}
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        {formatIndexName(data.indexName)}
                      </span>
                      <span className="text-sm font-mono font-medium text-[var(--foreground)]">
                        {data.last.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Bottom row: Change */}
                    <div className="flex items-baseline justify-between gap-4">
                      <span className={`text-base font-bold ${changeColor}`}>
                        {isPositive ? '+' : ''}{data.change.toFixed(2)}
                      </span>
                      <span className={`text-xs font-medium ${changeColor}`}>
                        ({isPositive ? '+' : ''}{data.percChange.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
