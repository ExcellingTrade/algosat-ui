'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import apiClient from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface StockTickerData {
  symbol: string;
  lastTradedPrice: number;
  change: number;
  perChange: number;
}

interface StockTickerProps {
  className?: string;
}

export function StockTicker({ className = "" }: StockTickerProps) {
  const { isAuthenticated } = useAuth();
  const [stockData, setStockData] = useState<StockTickerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchStockData = async () => {
    try {
      if (!isAuthenticated) {
        setError('Not authenticated');
        return;
      }

      const response = await apiClient.getMarqueueData();
      
      if (response.data && Array.isArray(response.data)) {
        // Data is already in the correct format
        const transformedData: StockTickerData[] = response.data
          .filter(item => item && typeof item === 'object' && item.symbol)
          .slice(0, 50) // Show 50 stocks as requested
          .map(item => ({
            symbol: item.symbol,
            lastTradedPrice: parseFloat(item.lastTradedPrice || 0),
            change: parseFloat(item.change || 0),
            perChange: parseFloat(item.perChange || 0)
          }));

        console.log('StockTicker: Loaded stocks count:', transformedData.length);
        setStockData(transformedData);
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError('Invalid data format');
      }
    } catch (err) {
      console.error('Failed to fetch stock data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStockData();

    // Refresh data every 60 seconds (changed from 30 for rate limiting)
    const dataRefreshInterval = setInterval(fetchStockData, 60000);

    return () => {
      clearInterval(dataRefreshInterval);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`w-full bg-[var(--card-background)]/80 border-b border-[var(--border)]/50 ${className}`}>
        <div className="flex items-center justify-center py-3 px-6">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-[var(--muted-foreground)] font-medium">Loading market data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || stockData.length === 0) {
    return (
      <div className={`w-full bg-[var(--card-background)]/80 border-b border-[var(--border)]/50 ${className}`}>
        <div className="flex items-center justify-center py-3 px-6">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-[var(--error)] rounded-full"></div>
            <span className="text-sm text-[var(--error)] font-medium">
              {error || 'Market data unavailable'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };

  return (
    <div className={`w-full bg-gradient-to-r from-[var(--card-background)]/95 to-[var(--card-background)]/85 backdrop-blur-md border-y-2 border-[var(--border)]/60 shadow-lg shadow-[var(--accent)]/20 ${className}`}>
      {/* Enhanced Professional Scrolling Ticker */}
      <div className="relative overflow-hidden py-4 px-6">
        <div className="flex items-center gap-6 animate-ticker-scroll-fast" style={{ width: 'max-content' }}>
          {/* First set of data */}
          {stockData.map((stock, index) => {
            const isPositive = stock.change >= 0;
            const changeColor = isPositive ? 'text-green-400' : 'text-red-400';
            const bgColor = isPositive ? 'bg-green-500/10' : 'bg-red-500/10';
            const borderColor = isPositive ? 'border-green-500/30' : 'border-red-500/30';
            
            return (
              <div
                key={`${stock.symbol}-1-${index}`}
                className={`
                  flex items-center gap-3 flex-shrink-0 whitespace-nowrap
                  px-4 py-3 rounded-xl border-2 ${borderColor} ${bgColor}
                  backdrop-blur-sm shadow-md shadow-black/10
                  transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-black/20
                  hover:border-opacity-80 hover:bg-opacity-80
                  min-w-[220px]
                  ring-1 ring-white/10
                `}
              >
                {/* Trend icon */}
                <div className="flex items-center">
                  {isPositive ? (
                    <TrendingUp className={`w-4 h-4 ${changeColor} flex-shrink-0`} />
                  ) : (
                    <TrendingDown className={`w-4 h-4 ${changeColor} flex-shrink-0`} />
                  )}
                </div>

                {/* Stock info */}
                <div className="flex items-center gap-3">
                  {/* Symbol */}
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[var(--foreground)] tracking-wide">
                      {stock.symbol}
                    </span>
                  </div>

                  {/* Price and change */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-[var(--foreground)]">
                      {formatPrice(stock.lastTradedPrice)}
                    </span>
                    
                    <div className="flex flex-col items-end">
                      <span className={`text-xs font-bold ${changeColor}`}>
                        {isPositive ? '+' : ''}{formatPrice(Math.abs(stock.change))}
                      </span>
                      <span className={`text-xs font-bold ${changeColor}`}>
                        ({isPositive ? '+' : ''}{stock.perChange.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <div className="w-px h-8 bg-[var(--border)]/50 flex-shrink-0"></div>
              </div>
            );
          })}

          {/* Duplicate set for seamless scrolling */}
          {stockData.map((stock, index) => {
            const isPositive = stock.change >= 0;
            const changeColor = isPositive ? 'text-green-400' : 'text-red-400';
            const bgColor = isPositive ? 'bg-green-500/10' : 'bg-red-500/10';
            const borderColor = isPositive ? 'border-green-500/30' : 'border-red-500/30';
            
            return (
              <div
                key={`${stock.symbol}-2-${index}`}
                className={`
                  flex items-center gap-3 flex-shrink-0 whitespace-nowrap
                  px-4 py-3 rounded-xl border-2 ${borderColor} ${bgColor}
                  backdrop-blur-sm shadow-md shadow-black/10
                  transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-black/20
                  hover:border-opacity-80 hover:bg-opacity-80
                  min-w-[220px]
                  ring-1 ring-white/10
                `}
              >
                {/* Trend icon */}
                <div className="flex items-center">
                  {isPositive ? (
                    <TrendingUp className={`w-4 h-4 ${changeColor} flex-shrink-0`} />
                  ) : (
                    <TrendingDown className={`w-4 h-4 ${changeColor} flex-shrink-0`} />
                  )}
                </div>

                {/* Stock info */}
                <div className="flex items-center gap-3">
                  {/* Symbol */}
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[var(--foreground)] tracking-wide">
                      {stock.symbol}
                    </span>
                  </div>

                  {/* Price and change */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-[var(--foreground)]">
                      {formatPrice(stock.lastTradedPrice)}
                    </span>
                    
                    <div className="flex flex-col items-end">
                      <span className={`text-xs font-bold ${changeColor}`}>
                        {isPositive ? '+' : ''}{formatPrice(Math.abs(stock.change))}
                      </span>
                      <span className={`text-xs font-bold ${changeColor}`}>
                        ({isPositive ? '+' : ''}{stock.perChange.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <div className="w-px h-8 bg-[var(--border)]/50 flex-shrink-0"></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default StockTicker;
