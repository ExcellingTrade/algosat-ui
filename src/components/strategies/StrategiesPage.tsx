"use client";

import { useState, useEffect } from "react";
import { StrategyCard } from "./StrategyCard";
import { SymbolsPage } from "./SymbolsPage";
import { TradesPage } from "./TradesPage";
import { ConfigsModal } from "./ConfigsModal";
import { AddSymbolModal } from "./AddSymbolModal";
import { apiClient } from "../../lib/api";
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
  created_at?: string;
  updated_at?: string;
  order_type: 'MARKET' | 'LIMIT';
  product_type: 'INTRADAY' | 'DELIVERY';
}

export interface StrategySymbol {
  id: number;
  strategyId: number;
  symbol: string;
  configId: number;
  configName: string;
  currentPnL: number;
  tradeCount: number;
  enabled: boolean;
}

export interface StrategyConfig {
  id: number;
  strategyId: number;
  name: string;
  description: string;
  isCustom: boolean;
  parameters: Record<string, any>;
  createdAt: string;
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
  status: 'OPEN' | 'CLOSED';
  quantity: number;
}

type ViewMode = 'strategies' | 'symbols' | 'trades' | 'configs';

interface StrategiesPageProps {
  className?: string;
}

export function StrategiesPage({ className = "" }: StrategiesPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('strategies');
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<StrategySymbol | null>(null);
  const [showConfigsModal, setShowConfigsModal] = useState(false);
  const [showAddSymbolModal, setShowAddSymbolModal] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data for symbols - replace with API calls later
  const [symbols] = useState<StrategySymbol[]>([
    {
      id: 1,
      strategyId: 1,
      symbol: "NIFTY",
      configId: 1,
      configName: "Scalping Config v1.2",
      currentPnL: 8450.25,
      tradeCount: 45,
      enabled: true
    },
    {
      id: 2,
      strategyId: 1,
      symbol: "BANKNIFTY",
      configId: 2,
      configName: "Bank Scalping Config",
      currentPnL: 3250.50,
      tradeCount: 32,
      enabled: true
    },
    {
      id: 3,
      strategyId: 1,
      symbol: "RELIANCE",
      configId: 1,
      configName: "Scalping Config v1.2",
      currentPnL: 800.00,
      tradeCount: 50,
      enabled: false
    }
  ]);

  // Generate mock data for strategies to supplement API data
  const generateMockData = (strategy: Partial<Strategy>): Strategy => {
    return {
      ...strategy,
      description: strategy.name?.includes('Option') ? 
        'High-frequency option trading strategy with advanced risk management' :
        'Algorithmic trading strategy optimized for market conditions',
      livePnL: Math.floor(Math.random() * 20000 - 5000),
      overallPnL: Math.floor(Math.random() * 100000 + 10000),
      symbolCount: Math.floor(Math.random() * 5 + 1),
      tradeCount: Math.floor(Math.random() * 200 + 50),
      created_at: strategy.created_at || new Date().toISOString(),
      updated_at: strategy.updated_at || new Date().toISOString()
    } as Strategy;
  };

  // Fetch strategies from API
  const fetchStrategies = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);
      
      console.log('Fetching strategies from API...');
      const apiStrategies = await apiClient.getStrategies();
      console.log('API strategies received:', apiStrategies);
      
      // Add mock data to API responses
      const enrichedStrategies = apiStrategies.map(generateMockData);
      setStrategies(enrichedStrategies);
      
    } catch (err) {
      console.error('Failed to fetch strategies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load strategies');
      
      // Fallback to mock data if API fails
      const fallbackStrategies: Strategy[] = [
        {
          id: 1,
          key: "OptionBuy",
          name: "Option Buy Strategy",
          description: "High-frequency option buying strategy targeting small, quick profits",
          enabled: true,
          livePnL: 12500.75,
          overallPnL: 78420.25,
          symbolCount: 3,
          tradeCount: 127,
          created_at: "2024-01-15T09:30:00Z",
          order_type: "MARKET",
          product_type: "INTRADAY"
        },
        {
          id: 2,
          key: "OptionSell",
          name: "Option Sell Strategy",
          description: "Advanced option selling strategy with momentum analysis",
          enabled: true,
          livePnL: -2340.50,
          overallPnL: 45680.90,
          symbolCount: 2,
          tradeCount: 89,
          created_at: "2024-02-01T09:30:00Z",
          order_type: "LIMIT",
          product_type: "INTRADAY"
        },
        {
          id: 3,
          key: "SwingHighLowBuy",
          name: "Swing High Low Buy",
          description: "Swing trading strategy based on support and resistance levels",
          enabled: false,
          livePnL: 0,
          overallPnL: 23450.75,
          symbolCount: 4,
          tradeCount: 156,
          created_at: "2024-01-20T09:30:00Z",
          order_type: "MARKET",
          product_type: "DELIVERY"
        }
      ];
      setStrategies(fallbackStrategies);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStrategies();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStrategies(false);
  };

  const handleViewSymbols = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setViewMode('symbols');
  };

  const handleViewConfigs = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setShowConfigsModal(true);
  };

  const handleViewTrades = (symbol: StrategySymbol) => {
    setSelectedSymbol(symbol);
    setViewMode('trades');
  };

  const handleAddSymbol = () => {
    setShowAddSymbolModal(true);
  };

  const handleBack = () => {
    if (viewMode === 'trades') {
      setViewMode('symbols');
      setSelectedSymbol(null);
    } else if (viewMode === 'symbols') {
      setViewMode('strategies');
      setSelectedStrategy(null);
    }
  };

  const renderBreadcrumb = () => {
    const items = [];
    
    if (viewMode === 'strategies') {
      return (
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-4 h-4 text-[var(--accent)]" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-[var(--accent)] to-blue-400 bg-clip-text text-transparent">
            Trading Strategies
          </h1>
        </div>
      );
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

    if (viewMode === 'symbols' || viewMode === 'trades') {
      items.push(<span key="sep1" className="text-[var(--muted-foreground)] text-sm">/</span>);
      items.push(
        <span key="strategy" className="text-[var(--foreground)] font-medium text-sm">
          {selectedStrategy?.name}
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
        <button
          onClick={handleBack}
          className="mr-2 p-1.5 rounded-lg bg-[var(--card-background)] border border-[var(--border)] hover:bg-[var(--accent)]/10 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
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
                    <p className="text-red-400/60 text-sm">
                      Don't worry - we're showing demo data so you can explore the interface
                    </p>
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

                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-xl border border-blue-500/30 rounded-lg p-2 transition-all duration-200 hover:from-blue-500/15 hover:to-blue-600/10">
                    <div className="text-center space-y-0.5">
                      <p className="text-blue-300 text-xs font-medium">P&L</p>
                      <p className="text-lg font-bold text-blue-400">
                        ₹{Math.round(strategies.reduce((sum, s) => sum + (s.overallPnL || 0), 0) / 1000)}K
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-xl border border-purple-500/30 rounded-lg p-2 transition-all duration-200 hover:from-purple-500/15 hover:to-purple-600/10">
                    <div className="text-center space-y-0.5">
                      <p className="text-purple-300 text-xs font-medium">Trades</p>
                      <p className="text-lg font-bold text-purple-400">
                        {strategies.reduce((sum, s) => sum + (s.tradeCount || 0), 0)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Strategies Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-4">
                  {strategies.map((strategy) => (
                    <StrategyCard
                      key={strategy.id}
                      strategy={strategy}
                      onViewSymbols={handleViewSymbols}
                      onViewConfigs={handleViewConfigs}
                    />
                  ))}
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
          symbols={symbols.filter(s => s.strategyId === selectedStrategy.id)}
          onViewTrades={handleViewTrades}
          onAddSymbol={handleAddSymbol}
        />
      )}

      {viewMode === 'trades' && selectedSymbol && (
        <TradesPage
          symbol={selectedSymbol}
          strategy={selectedStrategy!}
        />
      )}

      {/* Modals */}
      {showConfigsModal && selectedStrategy && (
        <ConfigsModal
          strategy={selectedStrategy}
          onClose={() => setShowConfigsModal(false)}
        />
      )}

      {showAddSymbolModal && selectedStrategy && (
        <AddSymbolModal
          strategy={selectedStrategy}
          onClose={() => setShowAddSymbolModal(false)}
          onAdd={(symbolData: { symbol: string; configId: number }) => {
            // Handle adding new symbol
            console.log('Adding symbol:', symbolData);
            setShowAddSymbolModal(false);
          }}
        />
      )}
      </div>
    </div>
  );
}
