"use client";

import { useState, useEffect } from "react";
import { StrategyCard } from "./StrategyCard";
import { SymbolsPage } from "./SymbolsPage";
import { TradesPage } from "./TradesPage";
import { ConfigsPage } from "./ConfigsPage";
import { AddSymbolModal } from "./AddSymbolModal";
import { apiClient, PerStrategyStatsResponse, PerStrategyStatsData } from "../../lib/api";
import { 
  ArrowLeft, 
  Zap, 
  TrendingUp, 
  Target,
  Settings,
  Activity,
  RefreshCw,
  AlertCircle
} from "lucide-react";

// Updated data types to match API responses
export interface Strategy {
  id: number;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  livePnL?: number;  // Mock data for now
  overallPnL?: number;  // Mock data for now
  symbolCount?: number;  // Mock data for now
  tradeCount?: number;  // Mock data for now
  winRate?: number;  // Win rate percentage (0-100)
  created_at?: string;
  updated_at?: string;
  order_type: 'MARKET' | 'LIMIT';
  product_type: 'INTRADAY' | 'DELIVERY';
}

export interface StrategySymbol {
  id: number;
  strategy_id: number;
  symbol: string;
  config_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  // Enhanced fields from API joins
  config_name?: string;
  config_description?: string;
  // Real trade data from backend
  current_pnl?: number;
  trade_count?: number;
  enabled?: boolean;
  // Legacy field names for backward compatibility
  currentPnL?: number;
  tradeCount?: number;
}

export interface StrategyConfig {
  id: number;
  strategy_id: number;
  name: string;
  description?: string;
  exchange: string;
  instrument?: string;
  trade: Record<string, any>;
  indicators: Record<string, any>;
  is_default?: boolean;  // Made optional to handle API inconsistencies
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: number;
  symbolId: number;
  symbol: string;
  strike: string;
  type: 'PE' | 'CE';
  entryTime: string;
  entryPrice: number;
  exitTime?: string;
  exitPrice?: number;
  pnl: number;
  status: 'AWAITING_ENTRY' | 'OPEN' | 'CLOSED' | 'CANCELLED' | 'FAILED';
  quantity: number;
  traded_price?: number;  // New field for traded price
}

type ViewMode = 'strategies' | 'symbols' | 'trades' | 'configs';

interface StrategiesPageProps {
  className?: string;
  perStrategyStats?: PerStrategyStatsResponse | null;
}

export function StrategiesPage({ className = "", perStrategyStats }: StrategiesPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('strategies');
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<StrategySymbol | null>(null);
  const [showAddSymbolModal, setShowAddSymbolModal] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [symbols, setSymbols] = useState<StrategySymbol[]>([]);
  const [configs, setConfigs] = useState<StrategyConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [preSelectedConfigId, setPreSelectedConfigId] = useState<number | undefined>(undefined);

  // Background stats fetching (non-blocking)
  const fetchStrategiesStats = async (strategies: Strategy[]) => {
    console.log('Starting background stats fetching...');
    
    for (const strategy of strategies) {
      try {
        // Get strategy symbols to calculate symbol count
        const strategySymbols = await apiClient.getStrategySymbols(strategy.id);
        
        // Calculate basic stats quickly - limit to prevent overload
        let totalPnL = 0;
        let livePnL = 0;
        let totalTrades = 0;
        
        // Limit concurrent API calls to prevent overload (max 5 symbols per strategy)
        const symbolsToProcess = strategySymbols.slice(0, 5);
        const symbolStatsPromises = symbolsToProcess.map(async (symbol) => {
          try {
            const symbolStats = await apiClient.getSymbolStats(symbol.id);
            return {
              totalPnL: symbolStats.total_pnl || 0,
              livePnL: symbolStats.live_pnl || 0,
              totalTrades: symbolStats.total_trades || 0
            };
          } catch (error) {
            console.warn(`Failed to fetch stats for symbol ${symbol.id}:`, error);
            return { totalPnL: 0, livePnL: 0, totalTrades: 0 };
          }
        });
        
        const symbolsStats = await Promise.all(symbolStatsPromises);
        
        // Aggregate stats
        symbolsStats.forEach(stats => {
          totalPnL += stats.totalPnL;
          livePnL += stats.livePnL;
          totalTrades += stats.totalTrades;
        });
        
        // Update the specific strategy with real stats
        setStrategies(prev => prev.map(s => 
          s.id === strategy.id ? {
            ...s,
            livePnL,
            overallPnL: totalPnL,
            symbolCount: strategySymbols.length,
            tradeCount: totalTrades,
            winRate: totalTrades > 0 ? Math.round((totalTrades * 0.7)) : 0 // Placeholder calculation
          } : s
        ));
        
        // Small delay to prevent API rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.warn(`Failed to fetch stats for strategy ${strategy.id}:`, error);
      }
    }
    
    console.log('Background stats fetching completed');
  };

  // Fetch strategies from API with real statistics
  const fetchStrategies = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);

      console.log('Fetching strategies from API...');
      const apiStrategies = await apiClient.getStrategies();
      console.log('API strategies received:', apiStrategies);

      // Use API data directly, do not inject fallback/mocked fields
      setStrategies(apiStrategies as Strategy[]);
      setIsLoading(false);

      // Load stats in background (non-blocking)
      fetchStrategiesStats(apiStrategies as Strategy[]);

    } catch (err) {
      console.error('Failed to fetch strategies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load strategies');
      setStrategies([]); // Set empty array instead of fallback mock data
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch strategy symbols from API
  const fetchStrategySymbols = async (strategyId: number) => {
    try {
      setIsLoading(true);
      console.log('Fetching symbols for strategy:', strategyId);
      const apiSymbols = await apiClient.getStrategySymbols(strategyId);
      console.log('API symbols received:', apiSymbols);
      
      // Set symbols with basic API data, stats will be fetched in background
      const enhancedSymbols = apiSymbols.map(symbol => ({
        ...symbol,
        currentPnL: 0, // Will be updated when stats are fetched
        tradeCount: 0, // Will be updated when stats are fetched
        enabled: symbol.status === 'active'
      }));
      
      setSymbols(enhancedSymbols);
      
      // Fetch stats for symbols in background (non-blocking)
      fetchSymbolsStats(enhancedSymbols);
      
    } catch (err) {
      console.error('Failed to fetch strategy symbols:', err);
      setError(err instanceof Error ? err.message : 'Failed to load symbols');
      setSymbols([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch strategy configs from API
  const fetchStrategyConfigs = async (strategyId: number) => {
    try {
      console.log('Fetching configs for strategy:', strategyId);
      const apiConfigs = await apiClient.getStrategyConfigs(strategyId);
      console.log('API configs received:', apiConfigs);
      
      // Set configs directly from API (now includes name and description)
      setConfigs(apiConfigs);
      return apiConfigs;
    } catch (err) {
      console.error('Failed to fetch strategy configs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configs');
      setConfigs([]);
      return [];
    }
  };

  // Background stats fetching for symbols (non-blocking)
  const fetchSymbolsStats = async (symbols: StrategySymbol[]) => {
    console.log('Starting background symbol stats fetching...');
    
    for (const symbol of symbols) {
      try {
        const symbolStats = await apiClient.getSymbolStats(symbol.id);
        
        // Update the specific symbol with real stats
        setSymbols(prev => prev.map(s => 
          s.id === symbol.id ? {
            ...s,
            currentPnL: symbolStats.live_pnl || 0,
            tradeCount: symbolStats.total_trades || 0
          } : s
        ));
        
        // Small delay to prevent API rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.warn(`Failed to fetch stats for symbol ${symbol.id}:`, error);
      }
    }
    
    console.log('Background symbol stats fetching completed');
  };

  // Initial load
  useEffect(() => {
    fetchStrategies();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStrategies(false);
  };

  const handleStrategyUpdated = (updatedStrategy: Strategy) => {
    setStrategies(prevStrategies => 
      prevStrategies.map(strategy => 
        strategy.id === updatedStrategy.id ? updatedStrategy : strategy
      )
    );
  };

  const handleViewSymbols = async (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    await fetchStrategySymbols(strategy.id);
    setPreSelectedConfigId(undefined); // Clear any previous pre-selection
    setViewMode('symbols');
  };

  const handleViewConfigs = async (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    // Fetch both configs and symbols for ConfigsPage to show accurate symbol counts
    await Promise.all([
      fetchStrategyConfigs(strategy.id),
      fetchStrategySymbols(strategy.id)
    ]);
    setViewMode('configs');
  };

  const handleViewTrades = (symbol: StrategySymbol) => {
    setSelectedSymbol(symbol);
    setViewMode('trades');
  };

  const handleAddSymbol = async () => {
    if (selectedStrategy) {
      await fetchStrategyConfigs(selectedStrategy.id);
    }
    setShowAddSymbolModal(true);
  };

  const handleSymbolAdded = async (symbolData: { symbol: string; configId: number }) => {
    if (!selectedStrategy) return;
    
    try {
      console.log('Adding symbol:', symbolData);
      await apiClient.addStrategySymbol(selectedStrategy.id, {
        strategy_id: selectedStrategy.id,
        symbol: symbolData.symbol,
        config_id: symbolData.configId,
        status: 'active'
      });
      
      // Refresh symbols list
      await fetchStrategySymbols(selectedStrategy.id);
      setShowAddSymbolModal(false);
    } catch (err) {
      console.error('Failed to add symbol:', err);
      setError(err instanceof Error ? err.message : 'Failed to add symbol');
    }
  };

  const handleToggleSymbol = async (symbolId: number) => {
    try {
      await apiClient.toggleSymbolStatus(symbolId);
      // Refresh symbols list
      if (selectedStrategy) {
        await fetchStrategySymbols(selectedStrategy.id);
      }
    } catch (err) {
      console.error('Failed to toggle symbol:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle symbol');
    }
  };

  const handleBack = () => {
    if (viewMode === 'trades') {
      setViewMode('symbols');
      setSelectedSymbol(null);
    } else if (viewMode === 'symbols' || viewMode === 'configs') {
      setViewMode('strategies');
      setSelectedStrategy(null);
      setPreSelectedConfigId(undefined); // Clear pre-selection when going back to strategies
    }
  };

  const renderBreadcrumb = () => {
    const items = [];
    
    if (viewMode === 'strategies') {
      return null; // No breadcrumb needed for main strategies view
    }

    items.push(
      <button
        key="strategies"
        onClick={() => setViewMode('strategies')}
        className="text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors text-sm"
      >
        Strategies
      </button>
    );

    if (viewMode === 'symbols' || viewMode === 'trades' || viewMode === 'configs') {
      items.push(<span key="sep1" className="text-[var(--muted-foreground)] text-sm">/</span>);
      items.push(
        <span key="strategy" className="text-[var(--foreground)] font-medium text-sm">
          {selectedStrategy?.name}
        </span>
      );
    }

    if (viewMode === 'configs') {
      items.push(<span key="sep2" className="text-[var(--muted-foreground)] text-sm">/</span>);
      items.push(
        <span key="configs" className="text-[var(--accent)] font-medium text-sm">
          Configurations
        </span>
      );
    }

    if (viewMode === 'trades') {
      items.push(<span key="sep2" className="text-[var(--muted-foreground)] text-sm">/</span>);
      items.push(
        <span key="symbol" className="text-[var(--accent)] font-medium text-sm">
          {selectedSymbol?.symbol} Trades
        </span>
      );
    }

    return (
      <div className="flex items-center space-x-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {(viewMode === 'symbols' || viewMode === 'trades' || viewMode === 'configs') && (
          <button
            onClick={handleBack}
            className="mr-2 p-1.5 rounded-lg bg-[var(--card-background)] border border-[var(--border)] hover:bg-[var(--accent)]/10 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center space-x-2 whitespace-nowrap">
          {items}
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--card-background)] to-[var(--background)] ${className}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {renderBreadcrumb()}

        {/* Main Content */}
        {viewMode === 'strategies' && (
          <div className="space-y-4 md:space-y-6">

            {/* Error State */}
            {error && (
              <div className="bg-gradient-to-r from-red-500/10 to-red-600/5 border border-red-500/30 rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-red-400 font-semibold text-lg">Connection Issue</h3>
                    <p className="text-red-400/80">{error}</p>
                    {/* <p className="text-red-400/60 text-sm">
                      Don't worry - we're showing demo data so you can explore the interface
                    </p> */}
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading ? (
              <div className="space-y-6">
                {/* Loading Summary Stats */}
                <div className="grid grid-cols-4 gap-2 md:gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-[var(--card-background)]/60 backdrop-blur-xl border border-[var(--border)]/50 rounded-lg p-2 h-12">
                        <div className="text-center space-y-1">
                          <div className="h-3 bg-[var(--muted)]/20 rounded w-3/4 mx-auto"></div>
                          <div className="h-4 bg-[var(--muted)]/20 rounded w-1/2 mx-auto"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Loading Strategy Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-[var(--card-background)]/60 backdrop-blur-xl border border-[var(--border)]/50 rounded-2xl h-96 p-6">
                        <div className="space-y-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-4 h-4 bg-[var(--muted)]/20 rounded-full"></div>
                            <div className="space-y-2 flex-1">
                              <div className="h-5 bg-[var(--muted)]/20 rounded-lg"></div>
                              <div className="h-4 bg-[var(--muted)]/20 rounded-lg w-2/3"></div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="h-20 bg-[var(--muted)]/20 rounded-xl"></div>
                            <div className="h-20 bg-[var(--muted)]/20 rounded-xl"></div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="h-16 bg-[var(--muted)]/20 rounded-lg"></div>
                            <div className="h-16 bg-[var(--muted)]/20 rounded-lg"></div>
                            <div className="h-16 bg-[var(--muted)]/20 rounded-lg"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Compact Summary Stats */}
                <div className="grid grid-cols-4 gap-2 md:gap-3">
                  <div className="bg-[var(--card-background)]/80 backdrop-blur-xl border border-[var(--border)]/50 rounded-lg p-2 transition-all duration-200 hover:bg-[var(--card-background)]/90">
                    <div className="text-center space-y-0.5">
                      <p className="text-[var(--muted-foreground)] text-xs font-medium">Strategies</p>
                      <p className="text-lg font-bold text-[var(--foreground)]">{strategies.length}</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-xl border border-green-500/30 rounded-lg p-2 transition-all duration-200 hover:from-green-500/15 hover:to-green-600/10">
                    <div className="text-center space-y-0.5">
                      <p className="text-green-300 text-xs font-medium">Active</p>
                      <p className="text-lg font-bold text-green-400">{strategies.filter(s => s.enabled).length}</p>
                    </div>
                  </div>

                  {(() => {
                    const totalPnL = perStrategyStats?.strategies.reduce((sum, stats) => sum + (stats.overall_pnl || 0), 0) || 0;
                    const isPositive = totalPnL >= 0;
                    
                    return (
                      <div className={`bg-gradient-to-br ${isPositive ? 'from-green-500/10 to-green-600/5 border-green-500/30' : 'from-red-500/10 to-red-600/5 border-red-500/30'} backdrop-blur-xl border rounded-lg p-2 transition-all duration-200 ${isPositive ? 'hover:from-green-500/15 hover:to-green-600/10' : 'hover:from-red-500/15 hover:to-red-600/10'}`}>
                        <div className="text-center space-y-0.5">
                          <p className={`${isPositive ? 'text-green-300' : 'text-red-300'} text-xs font-medium`}>P&L</p>
                          <p className={`text-lg font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {(() => {
                              const absValue = Math.abs(totalPnL);
                              const sign = totalPnL >= 0 ? '+' : '-';
                              if (absValue >= 1000) {
                                return `${sign}₹${(absValue / 1000).toFixed(1)}K`;
                              } else {
                                return `${sign}₹${Math.round(absValue)}`;
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-xl border border-purple-500/30 rounded-lg p-2 transition-all duration-200 hover:from-purple-500/15 hover:to-purple-600/10">
                    <div className="text-center space-y-0.5">
                      <p className="text-purple-300 text-xs font-medium">Trades</p>
                      <p className="text-lg font-bold text-purple-400">
                        {perStrategyStats?.strategies.reduce((sum, stats) => sum + (stats.trade_count || 0), 0) || 0}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Strategies Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-4">
                  {strategies.map((strategy) => {
                    // Find the stats for this strategy from the per-strategy stats
                    const strategyStats = perStrategyStats?.strategies.find(
                      stats => stats.strategy_id === strategy.id
                    );
                    
                    return (
                      <StrategyCard
                        key={strategy.id}
                        strategy={strategy}
                        strategyStats={strategyStats}
                        onViewSymbols={handleViewSymbols}
                        onViewConfigs={handleViewConfigs}
                        onStrategyUpdated={handleStrategyUpdated}
                      />
                    );
                  })}
                </div>

                {/* Empty State */}
                {strategies.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 bg-gradient-to-r from-[var(--accent)] to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <Zap className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">No strategies configured</h3>
                    <p className="text-[var(--muted-foreground)] text-base mb-6 max-w-md mx-auto">
                      Start your algorithmic trading journey by creating your first trading strategy
                    </p>
                    <button className="px-6 py-3 bg-[var(--accent)] hover:bg-blue-600 text-white rounded-lg transition-all duration-200 shadow-md font-medium text-base">
                      Create Your First Strategy
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      {viewMode === 'symbols' && selectedStrategy && (
        <SymbolsPage
          strategy={selectedStrategy}
          symbols={symbols.filter(s => s.strategy_id === selectedStrategy.id)}
          onViewTrades={handleViewTrades}
          onAddSymbol={handleAddSymbol}
          onToggleSymbol={handleToggleSymbol}
          onRefreshSymbols={() => fetchStrategySymbols(selectedStrategy.id)}
          preSelectedConfigId={preSelectedConfigId}
          onClearPreSelection={() => setPreSelectedConfigId(undefined)}
        />
      )}

      {viewMode === 'trades' && selectedSymbol && (
        <TradesPage
          symbol={selectedSymbol}
          strategy={selectedStrategy!}
        />
      )}

      {viewMode === 'configs' && selectedStrategy && (
        <ConfigsPage
          strategy={selectedStrategy}
          configs={configs}
          symbols={symbols}
          onBack={handleBack}
          onRefresh={() => fetchStrategyConfigs(selectedStrategy.id)}
          onViewSymbols={async (strategy, preSelectedConfigId) => {
            setSelectedStrategy(strategy);
            // Ensure symbols are fetched before switching to symbols view
            await fetchStrategySymbols(strategy.id);
            setViewMode('symbols');
            setPreSelectedConfigId(preSelectedConfigId);
          }}
        />
      )}

      {/* Modals */}
      {showAddSymbolModal && selectedStrategy && (
        <AddSymbolModal
          strategy={selectedStrategy}
          configs={configs}
          existingSymbols={symbols}
          onClose={() => setShowAddSymbolModal(false)}
          onAdd={handleSymbolAdded}
        />
      )}
      </div>
    </div>
  );
}
