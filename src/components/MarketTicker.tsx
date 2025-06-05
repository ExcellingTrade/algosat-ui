"use client";
import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";

interface IndexData {
  indexName: string;
  open: number;
  high: number;
  low: number;
  last: number;
  previousClose: number;
  percChange: number;
  yearHigh: number;
  yearLow: number;
  timeVal: string;
}

interface MarketTickerProps {
  className?: string;
}

export function MarketTicker({ className = "" }: MarketTickerProps) {
  const { isAuthenticated } = useAuth();
  const [indexData, setIndexData] = useState<IndexData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if this is mobile/centered version
  const isMobile = className.includes('justify-center');

  const fetchIndexData = async () => {
    try {
      if (!isAuthenticated) {
        setError('Not authenticated');
        return;
      }

      const response = await apiClient.getIndexData();
      
      if (response.data && Array.isArray(response.data)) {
        setIndexData(response.data);
        setError(null);
      } else {
        setError('Invalid data format');
      }
    } catch (err) {
      console.error('Failed to fetch index data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Initial fetch
    fetchIndexData();

    // Refresh data every 60 seconds (changed from 30 for rate limiting)
    const dataRefreshInterval = setInterval(fetchIndexData, 60000);

    return () => clearInterval(dataRefreshInterval);
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
      {/* Horizontal ticker tape container */}
      <div className={`
        flex items-center px-3 py-2
        bg-[var(--card-background)]/70 
        rounded-lg border border-[var(--border)]/40
        transition-all duration-300 ease-in-out
        hover:border-[var(--accent)]/50 hover:bg-[var(--card-background)]/90
        overflow-hidden relative
      `}>
        
        {/* Auto-scrolling ticker content */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-8 animate-ticker-scroll-market whitespace-nowrap">
            {/* First set of data */}
            {indexData.map((data, index) => {
              const isPositive = data.percChange >= 0;
              const changeColor = isPositive ? 'text-[var(--trading-green)]' : 'text-[var(--trading-red)]';
              
              return (
                <div
                  key={`${data.indexName}-1`}
                  className="flex items-center gap-3 flex-shrink-0 whitespace-nowrap"
                >
                  {/* Trend icon */}
                  {isPositive ? (
                    <TrendingUp className={`w-3.5 h-3.5 ${changeColor} flex-shrink-0`} />
                  ) : (
                    <TrendingDown className={`w-3.5 h-3.5 ${changeColor} flex-shrink-0`} />
                  )}
                  
                  {/* Index info */}
                  <div className="flex items-center gap-2">
                    {/* Index name - full name without truncation */}
                    <span className="text-sm font-bold text-[var(--foreground)] tracking-wide">
                      {formatIndexName(data.indexName)}
                    </span>
                    
                    {/* Price */}
                    <span className="text-sm font-mono font-semibold text-[var(--foreground)]">
                      ₹{data.last.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    
                    {/* Change percentage */}
                    <span className={`text-sm font-bold ${changeColor}`}>
                      {isPositive ? '+' : ''}{data.percChange.toFixed(2)}%
                    </span>
                  </div>
                  
                  {/* Separator */}
                  <div className="w-px h-4 bg-[var(--border)]/50 flex-shrink-0"></div>
                </div>
              );
            })}
            
            {/* Duplicate set for seamless scrolling */}
            {indexData.map((data, index) => {
              const isPositive = data.percChange >= 0;
              const changeColor = isPositive ? 'text-[var(--trading-green)]' : 'text-[var(--trading-red)]';
              
              return (
                <div
                  key={`${data.indexName}-2`}
                  className="flex items-center gap-3 flex-shrink-0 whitespace-nowrap"
                >
                  {/* Trend icon */}
                  {isPositive ? (
                    <TrendingUp className={`w-3.5 h-3.5 ${changeColor} flex-shrink-0`} />
                  ) : (
                    <TrendingDown className={`w-3.5 h-3.5 ${changeColor} flex-shrink-0`} />
                  )}
                  
                  {/* Index info */}
                  <div className="flex items-center gap-2">
                    {/* Index name - full name without truncation */}
                    <span className="text-sm font-bold text-[var(--foreground)] tracking-wide">
                      {formatIndexName(data.indexName)}
                    </span>
                    
                    {/* Price */}
                    <span className="text-sm font-mono font-semibold text-[var(--foreground)]">
                      ₹{data.last.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    
                    {/* Change percentage */}
                    <span className={`text-sm font-bold ${changeColor}`}>
                      {isPositive ? '+' : ''}{data.percChange.toFixed(2)}%
                    </span>
                  </div>
                  
                  {/* Separator */}
                  <div className="w-px h-4 bg-[var(--border)]/50 flex-shrink-0"></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
