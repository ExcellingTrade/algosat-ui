"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Strategy, StrategySymbol, StrategyConfig } from "./StrategiesPage";
import { apiClient, SymbolStats } from "../../lib/api";
import { 
  Plus, 
  Eye, 
  Settings, 
  TrendingUp, 
  TrendingDown,
  Target,
  Activity,
  BarChart3,
  Zap,
  Filter,
  ChevronDown,
  Edit3,
  Trash2
} from "lucide-react";

interface SymbolsPageProps {
  strategy: Strategy;
  symbols: StrategySymbol[];
  onViewTrades: (symbol: StrategySymbol) => void;
  onAddSymbol: () => void;
  onToggleSymbol?: (symbolId: number) => Promise<void>;
  onRefreshSymbols?: () => Promise<void>; // Add refresh callback
  preSelectedConfigId?: number; // Config to pre-select when coming from configs page
  onClearPreSelection?: () => void; // Function to clear the pre-selection
}

// Toggle Switch Component
function ToggleSwitch({ 
  enabled, 
  loading, 
  onChange, 
  disabled = false 
}: {
  enabled: boolean;
  loading: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled || loading}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)] ${
        enabled 
          ? 'bg-green-500 hover:bg-green-600' 
          : 'bg-gray-600 hover:bg-gray-500'
      } ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="sr-only">Toggle symbol status</span>
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </span>
    </button>
  );
}

export function SymbolsPage({ strategy, symbols, onViewTrades, onAddSymbol, onToggleSymbol, onRefreshSymbols, preSelectedConfigId, onClearPreSelection }: SymbolsPageProps) {
  const [toggleStates, setToggleStates] = useState<Record<number, boolean>>({});
  const [configs, setConfigs] = useState<StrategyConfig[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);
  const [selectedConfigIds, setSelectedConfigIds] = useState<number[]>([]);
  const [showConfigDropdown, setShowConfigDropdown] = useState(false);
  const [symbolStats, setSymbolStats] = useState<Record<number, SymbolStats>>({});
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState<StrategySymbol | null>(null);
  const [originalConfigId, setOriginalConfigId] = useState<number | null>(null);
  const [isUpdatingSymbol, setIsUpdatingSymbol] = useState(false);
  const [deletingSymbol, setDeletingSymbol] = useState<StrategySymbol | null>(null);
  const [isDeletingSymbol, setIsDeletingSymbol] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowConfigDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch configs for the strategy (only once per strategy)
  useEffect(() => {
    const fetchConfigs = async () => {
      if (isLoadingConfigs) return; // Prevent duplicate calls
      
      setIsLoadingConfigs(true);
      try {
        console.log('SymbolsPage: Fetching configs for strategy', strategy.id);
        const strategyConfigs = await apiClient.getStrategyConfigs(strategy.id);
        console.log('SymbolsPage: Configs fetched:', strategyConfigs);
        setConfigs(strategyConfigs);
      } catch (error) {
        console.error('SymbolsPage: Failed to fetch configs:', error);
        setConfigs([]);
      } finally {
        setIsLoadingConfigs(false);
      }
    };

    if (strategy?.id && configs.length === 0 && !isLoadingConfigs) {
      fetchConfigs();
    }
  }, [strategy.id]);

  // Fetch trade statistics for all symbols
  useEffect(() => {
    const fetchSymbolStats = async () => {
      if (symbols.length === 0) return;
      
      setIsLoadingStats(true);
      try {
        // Get real P&L and trade statistics from orders table for each symbol using symbol ID
        const statsPromises = symbols.map(async symbol => {
          try {
            // Use the new API that filters by strategy_symbol_id for accurate results
            const pnlStats = await apiClient.getOrdersPnlStatsBySymbolId(symbol.id);
            
            // Also get the existing orders summary for additional stats
            const ordersSummary = await apiClient.getOrdersSummaryBySymbol(symbol.symbol);
            
            return {
              symbol_id: symbol.id,
              live_trades: ordersSummary.open_trades || 0,
              live_pnl: ordersSummary.live_pnl || 0.0,
              total_trades: pnlStats.overall_trade_count || 0,
              total_pnl: pnlStats.overall_pnl || 0.0,
              today_pnl: pnlStats.today_pnl || 0.0,
              today_trade_count: pnlStats.today_trade_count || 0,
              all_trades: pnlStats.overall_trade_count || 0,
              enabled: symbol.enabled || false
            };
          } catch (error) {
            console.error(`Failed to fetch PNL stats for symbol ${symbol.symbol} (ID: ${symbol.id}):`, error);
            // Fallback to old method if new one fails
            try {
              const ordersSummary = await apiClient.getOrdersSummaryBySymbol(symbol.symbol);
              return {
                symbol_id: symbol.id,
                live_trades: ordersSummary.open_trades || 0,
                live_pnl: ordersSummary.live_pnl || 0.0,
                total_trades: ordersSummary.total_trades || 0,
                total_pnl: ordersSummary.total_pnl || 0.0,
                today_pnl: 0.0,
                today_trade_count: 0,
                all_trades: ordersSummary.total_trades || 0,
                enabled: symbol.enabled || false
              };
            } catch (fallbackError) {
              console.error(`Fallback also failed for symbol ${symbol.symbol}:`, fallbackError);
              return {
                symbol_id: symbol.id,
                live_trades: 0,
                live_pnl: 0.0,
                total_trades: 0,
                total_pnl: 0.0,
                today_pnl: 0.0,
                today_trade_count: 0,
                all_trades: 0,
                enabled: symbol.enabled || false
              };
            }
          }
        });
        
        const allStats = await Promise.all(statsPromises);
        const statsMap = allStats.reduce((acc, stat) => {
          acc[stat.symbol_id] = stat;
          return acc;
        }, {} as Record<number, any>);
        
        setSymbolStats(statsMap);
        console.log('SymbolsPage: Trade statistics fetched with P&L stats:', statsMap);
      } catch (error) {
        console.error('SymbolsPage: Failed to fetch symbol statistics:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchSymbolStats();
  }, [symbols]);

  // Enhance symbols with config information and trade statistics
  const enhancedSymbols = useMemo(() => {
    return symbols.map(symbol => {
      const config = configs.find(c => c.id === symbol.config_id);
      const stats = symbolStats[symbol.id] || { 
        symbol_id: symbol.id,
        live_trades: 0, 
        live_pnl: 0.0,
        total_trades: 0, 
        total_pnl: 0.0,
        today_pnl: 0.0,
        today_trade_count: 0,
        all_trades: 0,
        enabled: symbol.status === 'active' 
      };
      
      return {
        ...symbol,
        config_name: config?.name || `Config ${symbol.config_id}`,
        config_description: config?.description || undefined,
        // New detailed statistics
        live_trades: stats.live_trades || 0,
        live_pnl: stats.live_pnl || 0.0,
        total_trades: stats.total_trades || 0,
        total_pnl: stats.total_pnl || 0.0,
        today_pnl: stats.today_pnl || 0.0,
        today_trade_count: stats.today_trade_count || 0,
        all_trades: stats.all_trades || 0,
        // Backward compatibility
        tradeCount: stats.all_trades || 0,
        currentPnL: stats.total_pnl || 0.0,
        enabled: stats.enabled || false
      };
    });
  }, [symbols, configs, symbolStats]);

  // Filter symbols based on selected configs
  const filteredSymbols = useMemo(() => {
    if (selectedConfigIds.length === 0) {
      return enhancedSymbols;
    }
    return enhancedSymbols.filter(symbol => selectedConfigIds.includes(symbol.config_id));
  }, [enhancedSymbols, selectedConfigIds]);

  const handleConfigFilter = (configId: number) => {
    setSelectedConfigIds(prev => {
      if (prev.includes(configId)) {
        return prev.filter(id => id !== configId);
      } else {
        return [...prev, configId];
      }
    });
  };

  const clearFilters = () => {
    setSelectedConfigIds([]);
  };

  const handleToggleSymbol = async (symbolId: number) => {
    setToggleStates(prev => ({ ...prev, [symbolId]: true }));
    
    if (onToggleSymbol) {
      try {
        await onToggleSymbol(symbolId);
      } catch (error) {
        console.error('Failed to toggle symbol:', error);
      }
    }
    
    setTimeout(() => {
      setToggleStates(prev => ({ ...prev, [symbolId]: false }));
    }, 1000);
  };

  const handleEditSymbol = (symbol: StrategySymbol) => {
    setEditingSymbol(symbol);
    setOriginalConfigId(symbol.config_id);
  };

  const handleUpdateSymbol = async (newConfigId: number) => {
    if (!editingSymbol) return;
    
    setIsUpdatingSymbol(true);
    try {
      await apiClient.updateStrategySymbol(editingSymbol.id, { config_id: newConfigId });
      console.log(`Symbol ${editingSymbol.id} updated to use config ${newConfigId}`);
      setEditingSymbol(null);
      setOriginalConfigId(null);
      
      // Refresh the symbols data using the callback if available
      if (onRefreshSymbols) {
        await onRefreshSymbols();
      } else {
        // Fallback to page reload if no refresh callback is provided
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to update symbol:', error);
      alert('Failed to update symbol configuration. Please try again.');
    } finally {
      setIsUpdatingSymbol(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingSymbol(null);
    setOriginalConfigId(null);
  };

  const handleDeleteSymbol = (symbol: StrategySymbol) => {
    setDeletingSymbol(symbol);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSymbol) return;
    
    setIsDeletingSymbol(true);
    try {
      await apiClient.deleteStrategySymbol(deletingSymbol.id);
      console.log(`Symbol ${deletingSymbol.id} deleted successfully`);
      setDeletingSymbol(null);
      
      // Refresh the symbols data using the callback if available
      if (onRefreshSymbols) {
        await onRefreshSymbols();
      } else {
        // Fallback to page reload if no refresh callback is provided
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to delete symbol:', error);
      alert('Failed to delete symbol. Please try again.');
    } finally {
      setIsDeletingSymbol(false);
    }
  };

  const handleCancelDelete = () => {
    setDeletingSymbol(null);
  };

  const formatCurrency = (amount: number) => {
    const isPositive = amount >= 0;
    return `${isPositive ? '+' : ''}₹${Math.abs(amount).toLocaleString()}`;
  };

  const getPnLColor = (amount: number) => {
    return amount >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const totalPnL = enhancedSymbols.reduce((sum, symbol) => sum + (symbol.currentPnL || 0), 0);
  const totalTrades = enhancedSymbols.reduce((sum, symbol) => sum + (symbol.tradeCount || 0), 0);
  const activeSymbols = enhancedSymbols.filter(s => s.enabled).length;

  // Apply pre-selected config filter when coming from configs page
  useEffect(() => {
    if (preSelectedConfigId && configs.length > 0) {
      // Check if the pre-selected config exists in the loaded configs
      const configExists = configs.some(config => config.id === preSelectedConfigId);
      if (configExists) {
        setSelectedConfigIds([preSelectedConfigId]);
        setShowConfigDropdown(false);
        console.log('SymbolsPage: Applied pre-selected config filter:', preSelectedConfigId);
      }
    }
  }, [preSelectedConfigId, configs]);

  return (
    <div className="space-y-6">
      {/* Strategy Overview */}
      <div className="bg-[var(--card-background)]/95 border border-[var(--border)] rounded-xl p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                strategy.enabled 
                  ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' 
                  : 'bg-red-400'
              }`}></div>
              <h2 className="text-lg md:text-xl font-bold text-[var(--foreground)] truncate">{strategy.name}</h2>
              <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                strategy.enabled 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {strategy.enabled ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <p className="text-[var(--muted-foreground)] text-sm line-clamp-2">{strategy.description}</p>
          </div>
          <button
            onClick={onAddSymbol}
            className="flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-[var(--accent)]/20 hover:bg-[var(--accent)]/30 text-[var(--accent)] rounded-lg transition-all duration-200 border border-[var(--accent)]/30 hover:border-[var(--accent)]/50 flex-shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium">Add Symbol</span>
          </button>
        </div>
      </div>

      {/* Symbols Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[var(--card-background)]/95 border border-[var(--border)] rounded-lg p-3 shadow-lg">
          <div className="text-center space-y-1">
            <p className="text-[var(--muted-foreground)] text-xs">Symbols</p>
            <p className="text-lg md:text-xl font-bold text-[var(--foreground)]">{symbols.length}</p>
          </div>
        </div>

        <div className="bg-[var(--card-background)]/95 border border-green-500/30 rounded-lg p-3 shadow-lg">
          <div className="text-center space-y-1">
            <p className="text-green-300 text-xs">Active</p>
            <p className="text-lg md:text-xl font-bold text-green-400">{activeSymbols}</p>
          </div>
        </div>

        <div className="bg-[var(--card-background)]/95 border border-blue-500/30 rounded-lg p-3 shadow-lg">
          <div className="text-center space-y-1">
            <p className="text-blue-300 text-xs">P&L</p>
            <p className={`text-lg md:text-xl font-bold ${getPnLColor(totalPnL)}`}>
              ₹{Math.round(Math.abs(totalPnL) / 1000)}K
            </p>
          </div>
        </div>

        <div className="bg-[var(--card-background)]/95 border border-purple-500/30 rounded-lg p-3 shadow-lg">
          <div className="text-center space-y-1">
            <p className="text-purple-300 text-xs">Trades</p>
            <p className="text-lg md:text-xl font-bold text-purple-400">{totalTrades}</p>
          </div>
        </div>
      </div>

      {/* Pre-filter notification */}
      {preSelectedConfigId && selectedConfigIds.includes(preSelectedConfigId) && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-blue-400 font-medium">
                Showing symbols for selected configuration: {configs.find(c => c.id === preSelectedConfigId)?.name}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedConfigIds([]);
                onClearPreSelection?.();
              }}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded border border-blue-500/30 hover:border-blue-500/50"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* Config Filter Dropdown */}
      {configs.length > 0 && (
        <div className="bg-[var(--card-background)]/95 border border-[var(--border)] rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Filter by Configuration</h3>
            </div>
            {selectedConfigIds.length > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors"
              >
                Clear Filters ({selectedConfigIds.length})
              </button>
            )}
          </div>
          
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowConfigDropdown(!showConfigDropdown)}
              className="w-full flex items-center justify-between px-4 py-2 bg-[var(--background)]/50 border border-[var(--border)] rounded-lg text-sm transition-all duration-200 hover:border-[var(--accent)]/30"
            >
              <span className="text-[var(--foreground)]">
                {selectedConfigIds.length === 0 
                  ? 'Select configurations...' 
                  : `${selectedConfigIds.length} configuration${selectedConfigIds.length === 1 ? '' : 's'} selected`
                }
              </span>
              <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${showConfigDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showConfigDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {configs.map((config) => {
                  const isSelected = selectedConfigIds.includes(config.id);
                  const symbolCount = symbols.filter(s => s.config_id === config.id).length;
                  
                  return (
                    <button
                      key={config.id}
                      onClick={() => handleConfigFilter(config.id)}
                      className={`w-full text-left px-4 py-3 border-b border-[var(--border)]/30 last:border-b-0 hover:bg-[var(--background)]/30 transition-colors ${
                        isSelected ? 'bg-[var(--accent)]/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            isSelected 
                              ? 'bg-[var(--accent)] border-[var(--accent)]' 
                              : 'border-[var(--border)] bg-[var(--background)]'
                          }`}>
                            {isSelected && (
                              <div className="w-2 h-2 bg-white rounded-sm"></div>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-[var(--foreground)]">{config.name}</span>
                            {config.description && (
                              <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-1">
                                {config.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-[var(--muted-foreground)] bg-[var(--background)]/50 px-2 py-1 rounded">
                          {symbolCount}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {selectedConfigIds.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-[var(--muted-foreground)]">
                Showing {filteredSymbols.length} of {symbols.length} symbols
              </span>
              <div className="flex flex-wrap gap-1">
                {selectedConfigIds.map(configId => {
                  const config = configs.find(c => c.id === configId);
                  return config ? (
                    <span 
                      key={configId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] rounded text-xs"
                    >
                      {config.name}
                      <button
                        onClick={() => handleConfigFilter(configId)}
                        className="hover:bg-[var(--accent)]/30 rounded px-1"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Symbols Table */}
      <div className="bg-[var(--card-background)]/95 border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-[var(--border)]/50 bg-gradient-to-r from-[var(--card-background)]/50 to-[var(--accent)]/5">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Strategy Symbols</h3>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Manage symbols and their configurations for this strategy
          </p>
        </div>

        {filteredSymbols.length === 0 ? (
          <div className="p-6 md:p-8 text-center">
            <div className="w-12 h-12 bg-[var(--accent)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6 text-[var(--accent)]" />
            </div>
            {selectedConfigIds.length > 0 ? (
              <>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No Symbols Match Filter</h3>
                <p className="text-[var(--muted-foreground)] mb-4">
                  No symbols found for the selected configuration(s)
                </p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-[var(--accent)]/20 hover:bg-[var(--accent)]/30 text-[var(--accent)] rounded-lg transition-all duration-200 border border-[var(--accent)]/30"
                >
                  Clear Filters
                </button>
              </>
            ) : symbols.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No Symbols Added</h3>
                <p className="text-[var(--muted-foreground)] mb-4">
                  Start by adding trading symbols to this strategy
                </p>
                <button
                  onClick={onAddSymbol}
                  className="px-4 py-2 bg-[var(--accent)]/20 hover:bg-[var(--accent)]/30 text-[var(--accent)] rounded-lg transition-all duration-200 border border-[var(--accent)]/30"
                >
                  Add Your First Symbol
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">All Symbols Filtered</h3>
                <p className="text-[var(--muted-foreground)] mb-4">
                  All symbols have been filtered out by the current selection
                </p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-[var(--accent)]/20 hover:bg-[var(--accent)]/30 text-[var(--accent)] rounded-lg transition-all duration-200 border border-[var(--accent)]/30"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--background)]/50">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Symbol</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Config</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Overall P&L</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Today</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Trades</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/30">
                  {filteredSymbols.map((symbol) => (
                    <tr 
                      key={symbol.id} 
                      className="hover:bg-[var(--background)]/30 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            symbol.enabled 
                              ? 'bg-green-400 animate-pulse' 
                              : 'bg-red-400'
                          }`}></div>
                          <span className="font-semibold text-[var(--foreground)]">{symbol.symbol}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1">
                            <span className="text-[var(--foreground)] font-medium">
                              {symbol.config_name || `Config ${symbol.config_id}`}
                            </span>
                            {symbol.config_description && (
                              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                                {symbol.config_description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEditSymbol(symbol)}
                              className="px-2 py-1 rounded hover:bg-[var(--accent)]/10"
                              title="Edit symbol configuration"
                            >
                              <Edit3 className="w-4 h-4 text-[var(--muted-foreground)] hover:text-[var(--accent)]" />
                            </button>
                            <button 
                              onClick={() => handleDeleteSymbol(symbol)}
                              className="px-2 py-1 rounded hover:bg-red-500/10"
                              title="Delete symbol"
                            >
                              <Trash2 className="w-4 h-4 text-[var(--muted-foreground)] hover:text-red-500" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`font-bold ${getPnLColor(symbol.total_pnl || symbol.currentPnL || 0)}`}>
                          {formatCurrency(symbol.total_pnl || symbol.currentPnL || 0)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <span className={`font-medium ${getPnLColor(symbol.today_pnl || 0)}`}>
                            {formatCurrency(symbol.today_pnl || 0)}
                          </span>
                          {/* <div className="text-xs text-[var(--muted-foreground)] mt-1">
                            {symbol.today_trade_count || 0} trade{(symbol.today_trade_count || 0) !== 1 ? 's' : ''}
                          </div> */}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => onViewTrades(symbol)}
                          className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all duration-200 text-sm border border-blue-500/30 hover:border-blue-500/50"
                        >
                          <Eye className="w-3 h-3" />
                          <span className="font-medium">{symbol.total_trades || symbol.tradeCount || 0}</span>
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-[var(--muted-foreground)]">
                            {symbol.enabled ? 'Active' : 'Inactive'}
                          </span>
                          <ToggleSwitch
                            enabled={symbol.enabled ?? false}
                            loading={toggleStates[symbol.id]}
                            onChange={() => handleToggleSymbol(symbol.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-3 space-y-3">
              {filteredSymbols.map((symbol) => (
                <div
                  key={symbol.id}
                  className="bg-[var(--background)]/50 border border-[var(--border)] rounded-lg p-3 hover:border-[var(--accent)]/50 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        symbol.enabled 
                          ? 'bg-green-400 animate-pulse' 
                          : 'bg-red-400'
                      }`}></div>
                      <span className="font-semibold text-[var(--foreground)]">{symbol.symbol}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      symbol.enabled 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {symbol.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                      <p className="text-xs text-[var(--muted-foreground)]">Overall P&L</p>
                      <p className={`font-bold text-sm ${getPnLColor(symbol.total_pnl || symbol.currentPnL || 0)}`}>
                        ₹{Math.round(Math.abs(symbol.total_pnl || symbol.currentPnL || 0) / 1000)}K
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[var(--muted-foreground)]">Today</p>
                      <p className={`font-medium text-sm ${getPnLColor(symbol.today_pnl || 0)}`}>
                        ₹{Math.round(Math.abs(symbol.today_pnl || 0) / 1000)}K
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {symbol.today_trade_count || 0} trade{(symbol.today_trade_count || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[var(--muted-foreground)]">Trades</p>
                      <button
                        onClick={() => onViewTrades(symbol)}
                        className="font-medium text-sm text-blue-400 hover:text-blue-300 transition-colors underline-offset-2 hover:underline"
                      >
                        {symbol.total_trades || symbol.tradeCount || 0}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-[var(--muted-foreground)]">Status:</span>
                        <span className={`text-sm font-medium ${symbol.enabled ? 'text-green-400' : 'text-red-400'}`}>
                          {symbol.enabled ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEditSymbol(symbol)}
                          className="p-1.5 rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] transition-all duration-200 border border-[var(--accent)]/30"
                          title="Edit configuration"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteSymbol(symbol)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all duration-200 border border-red-500/30"
                          title="Delete symbol"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <ToggleSwitch
                      enabled={symbol.enabled ?? false}
                      loading={toggleStates[symbol.id]}
                      onChange={() => handleToggleSymbol(symbol.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit Symbol Modal */}
      {editingSymbol && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                Edit Symbol Configuration
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Symbol
                </label>
                <div className="px-3 py-2 bg-[var(--background)]/50 border border-[var(--border)] rounded-lg text-sm text-[var(--muted-foreground)]">
                  {editingSymbol.symbol} (Read-only)
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Configuration
                </label>
                <select
                  value={editingSymbol.config_id}
                  onChange={(e) => setEditingSymbol({ ...editingSymbol, config_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-[var(--background)]/50 border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  disabled={isUpdatingSymbol}
                >
                  {configs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name}
                      {config.description && ` - ${config.description.substring(0, 50)}${config.description.length > 50 ? '...' : ''}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {editingSymbol.config_id === originalConfigId 
                    ? "Current configuration - select a different one to update"
                    : "Select the configuration you want to use for this symbol"
                  }
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleCancelEdit}
                  disabled={isUpdatingSymbol}
                  className="flex-1 px-4 py-2 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--background)]/80 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateSymbol(editingSymbol.config_id)}
                  disabled={isUpdatingSymbol || editingSymbol.config_id === originalConfigId}
                  className="flex-1 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isUpdatingSymbol ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Configuration</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Symbol Confirmation Modal */}
      {deletingSymbol && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Delete Symbol
                </h3>
              </div>
              
              <div className="mb-6">
                <p className="text-[var(--foreground)] mb-2">
                  Are you sure you want to delete this symbol?
                </p>
                
                <div className="bg-[var(--background)]/50 border border-[var(--border)] rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[var(--foreground)]">{deletingSymbol.symbol}</span>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Config: {deletingSymbol.config_name || `Config ${deletingSymbol.config_id}`}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      deletingSymbol.enabled 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {deletingSymbol.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-red-400 mt-3">
                  <strong>Warning:</strong> This action cannot be undone. All trade history and statistics for this symbol will be permanently deleted.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeletingSymbol}
                  className="flex-1 px-4 py-2 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--background)]/80 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeletingSymbol}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isDeletingSymbol ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Symbol</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
