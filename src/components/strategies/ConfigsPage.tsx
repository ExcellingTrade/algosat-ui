"use client";

import { useState, useEffect } from "react";
import { 
  Settings, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  TrendingUp,
  AlertCircle,
  Plus
} from "lucide-react";
import { Strategy, StrategyConfig, StrategySymbol } from "./StrategiesPage";
import { apiClient } from "../../lib/api";

interface ConfigsPageProps {
  strategy: Strategy;
  configs: StrategyConfig[];
  symbols: StrategySymbol[];
  onBack: () => void;
  onRefresh: () => void;
  onViewSymbols?: (strategy: Strategy, preSelectedConfigId?: number) => void; // Add navigation to symbols
}

export function ConfigsPage({ strategy, configs, symbols, onBack, onRefresh, onViewSymbols }: ConfigsPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<StrategyConfig | null>(null);
  const [viewingConfig, setViewingConfig] = useState<StrategyConfig | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingConfigId, setDeletingConfigId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12); // 12 configs per page for good grid layout
  const [configStats, setConfigStats] = useState<Record<number, any>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [newConfig, setNewConfig] = useState({
    name: '',
    description: '',
    exchange: 'NSE',
    instrument: '',
    order_type: 'MARKET' as 'MARKET' | 'LIMIT',
    product_type: 'INTRADAY' as 'INTRADAY' | 'DELIVERY',
    trade: '{}',
    indicators: '{}'
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    exchange: 'NSE',
    instrument: '',
    order_type: 'MARKET' as 'MARKET' | 'LIMIT',
    product_type: 'INTRADAY' as 'INTRADAY' | 'DELIVERY',
    trade: '{}',
    indicators: '{}'
  });

  // Pagination calculations
  const totalPages = Math.ceil(configs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedConfigs = configs.slice(startIndex, endIndex);

  // Get symbols using each config
  const getConfigSymbols = (configId: number) => {
    return symbols.filter(symbol => symbol.config_id === configId);
  };

  // Get config usage stats (now uses real API data with fallback)
  const getConfigStats = (configId: number) => {
    // Return real stats if available, otherwise fallback to calculated stats
    if (configStats[configId]) {
      return configStats[configId];
    }
    
    // Fallback calculation
    const configSymbols = getConfigSymbols(configId);
    const activeSymbols = configSymbols.filter(s => s.status === 'active').length;
    const totalTrades = configSymbols.reduce((sum, s) => sum + (s.tradeCount || 0), 0);
    const totalPnL = configSymbols.reduce((sum, s) => sum + (s.currentPnL || 0), 0);
    
    return {
      symbolCount: configSymbols.length,
      activeSymbols,
      totalTrades,
      totalPnL,
      liveTrades: 0
    };
  };

  // Fetch real P&L data for all configs
  useEffect(() => {
    const fetchConfigStats = async () => {
      setLoadingStats(true);
      const statsMap: Record<number, any> = {};
      
      for (const config of configs) {
        try {
          // Get symbols for this config
          const configSymbols = symbols.filter(symbol => symbol.config_id === config.id);
          let totalPnL = 0;
          let totalTrades = 0;
          let liveTrades = 0;
          
          // Fetch stats for each symbol in this config
          for (const symbol of configSymbols) {
            try {
              const symbolStats = await apiClient.getSymbolStats(symbol.id);
              totalPnL += symbolStats.total_pnl + symbolStats.live_pnl;
              totalTrades += symbolStats.total_trades;
              liveTrades += symbolStats.live_trades;
            } catch (error) {
              console.error(`Failed to fetch stats for symbol ${symbol.id}:`, error);
            }
          }
          
          statsMap[config.id] = {
            symbolCount: configSymbols.length,
            activeSymbols: configSymbols.filter(s => s.status === 'active').length,
            totalPnL,
            totalTrades,
            liveTrades
          };
        } catch (error) {
          console.error(`Failed to process config ${config.id}:`, error);
          // Fallback to old calculation
          const configSymbols = getConfigSymbols(config.id);
          statsMap[config.id] = {
            symbolCount: configSymbols.length,
            activeSymbols: configSymbols.filter(s => s.status === 'active').length,
            totalPnL: configSymbols.reduce((sum, s) => sum + (s.currentPnL || 0), 0),
            totalTrades: configSymbols.reduce((sum, s) => sum + (s.tradeCount || 0), 0),
            liveTrades: 0
          };
        }
      }
      
      setConfigStats(statsMap);
      setLoadingStats(false);
    };

    if (configs.length > 0 && symbols.length > 0) {
      fetchConfigStats();
    }
  }, [configs, symbols]);

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConfig.name.trim()) {
      setError('Config name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Parse JSON fields
      let tradeData = {};
      let indicatorsData = {};
      
      try {
        tradeData = JSON.parse(newConfig.trade || '{}');
      } catch {
        setError('Invalid JSON format in Trade configuration');
        return;
      }
      
      try {
        indicatorsData = JSON.parse(newConfig.indicators || '{}');
      } catch {
        setError('Invalid JSON format in Indicators configuration');
        return;
      }

      await apiClient.createStrategyConfig(strategy.id, {
        name: newConfig.name.trim(),
        description: newConfig.description.trim() || undefined,
        exchange: newConfig.exchange,
        instrument: newConfig.instrument.trim() || undefined,
        order_type: newConfig.order_type,
        product_type: newConfig.product_type,
        trade: tradeData,
        indicators: indicatorsData
      });

      // Reset form and refresh
      setNewConfig({
        name: '',
        description: '',
        exchange: 'NSE',
        instrument: '',
        order_type: 'MARKET',
        product_type: 'INTRADAY',
        trade: '{}',
        indicators: '{}'
      });
      setShowAddForm(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to create config:', err);
      setError(err instanceof Error ? err.message : 'Failed to create config');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditConfig = (config: StrategyConfig) => {
    setEditFormData({
      name: config.name,
      description: config.description || '',
      exchange: config.exchange,
      instrument: config.instrument || '',
      order_type: config.order_type,
      product_type: config.product_type,
      trade: JSON.stringify(config.trade, null, 2),
      indicators: JSON.stringify(config.indicators, null, 2)
    });
    setEditingConfig(config);
    setError(null);
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Parse JSON fields
      let tradeData = {};
      let indicatorsData = {};
      
      try {
        tradeData = JSON.parse(editFormData.trade || '{}');
      } catch {
        setError('Invalid JSON format in Trade configuration');
        setIsLoading(false);
        return;
      }
      
      try {
        indicatorsData = JSON.parse(editFormData.indicators || '{}');
      } catch {
        setError('Invalid JSON format in Indicators configuration');
        setIsLoading(false);
        return;
      }

      const updates = {
        name: editFormData.name.trim(),
        description: editFormData.description.trim() || undefined,
        exchange: editFormData.exchange,
        instrument: editFormData.instrument.trim() || undefined,
        order_type: editFormData.order_type,
        product_type: editFormData.product_type,
        trade: tradeData,
        indicators: indicatorsData
      };

      console.log('Updating config with data:', updates);
      await apiClient.updateStrategyConfig(strategy.id, editingConfig.id, updates);
      setEditingConfig(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to update config:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError(String(err.message));
      } else {
        setError('Failed to update config - please check console for details');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewConfig = async (config: StrategyConfig) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch the latest config data from the API to ensure we have up-to-date information
      const latestConfig = await apiClient.getStrategyConfig(strategy.id, config.id);
      setViewingConfig(latestConfig);
    } catch (err) {
      console.error('Failed to fetch config details:', err);
      // Fall back to using the passed config if API call fails
      setViewingConfig(config);
      setError('Could not fetch latest config data, showing cached data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfig = async (configId: number) => {
    if (!confirm('Are you sure you want to delete this configuration? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setDeletingConfigId(configId);

    try {
      await apiClient.deleteStrategyConfig(strategy.id, configId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete config:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete config');
    } finally {
      setIsLoading(false);
      setDeletingConfigId(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Strategy Configurations</h1>
          <p className="text-[var(--muted-foreground)]">{strategy.name}</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Config</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-red-400/80 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Add Config Form */}
      {showAddForm && (
        <div className="bg-[var(--card-background)]/50 border border-[var(--border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Add New Configuration</h3>
          <form onSubmit={handleCreateConfig} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={newConfig.name}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                  placeholder="e.g., NIFTY Buy Strategy"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newConfig.description}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                  placeholder="Brief description of the configuration"
                />
              </div>

              {/* Exchange */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Exchange
                </label>
                <select
                  value={newConfig.exchange}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, exchange: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                >
                  <option value="NSE">NSE</option>
                  <option value="BSE">BSE</option>
                  <option value="MCX">MCX</option>
                </select>
              </div>

              {/* Order Type */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Order Type
                </label>
                <select
                  value={newConfig.order_type}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, order_type: e.target.value as 'MARKET' | 'LIMIT' }))}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                >
                  <option value="MARKET">MARKET</option>
                  <option value="LIMIT">LIMIT</option>
                </select>
              </div>

              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Product Type
                </label>
                <select
                  value={newConfig.product_type}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, product_type: e.target.value as 'INTRADAY' | 'DELIVERY' }))}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                >
                  <option value="INTRADAY">INTRADAY</option>
                  <option value="DELIVERY">DELIVERY</option>
                </select>
              </div>

              {/* Instrument */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Instrument
                </label>
                <input
                  type="text"
                  value={newConfig.instrument}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, instrument: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                  placeholder="e.g., INDEX, EQUITY"
                />
              </div>
            </div>

            {/* Trade Configuration */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Trade Configuration (JSON)
              </label>
              <textarea
                value={newConfig.trade}
                onChange={(e) => setNewConfig(prev => ({ ...prev, trade: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] font-mono text-sm"
                placeholder='{"exchange": "NSE", "trade_symbol": "NIFTY50", "instrument": "INDEX"}'
              />
            </div>

            {/* Indicators Configuration */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Indicators Configuration (JSON)
              </label>
              <textarea
                value={newConfig.indicators}
                onChange={(e) => setNewConfig(prev => ({ ...prev, indicators: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] font-mono text-sm"
                placeholder='{"supertrend_period": 7, "supertrend_multiplier": 3, "sma_period": 14, "atr_multiplier": 14}'
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Config'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Configs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
        {paginatedConfigs.map((config) => {
          const stats = getConfigStats(config.id);
          const configSymbols = getConfigSymbols(config.id);
          
          return (
            <div key={config.id} className="config-card bg-gradient-to-br from-[var(--card-background)] to-[var(--card-background)]/80 border border-[var(--border)] rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:border-[var(--accent)]/30 flex flex-col h-full">
              {/* Header */}
              <div className="flex-1 mb-4">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2 line-clamp-2">{config.name}</h3>
                {config.description && (
                  <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">{config.description}</p>
                )}
              </div>

              {/* Key Parameters - Improved alignment */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-3 min-h-[64px] flex flex-col justify-between">
                  <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Exchange</p>
                  <p className="text-sm font-semibold text-[var(--foreground)] mt-1">{config.exchange}</p>
                </div>
                
                <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-lg p-3 min-h-[64px] flex flex-col justify-between">
                  <p className="text-xs text-purple-500 font-medium uppercase tracking-wide">Order Type</p>
                  <p className="text-sm font-semibold text-[var(--foreground)] mt-1">{config.order_type}</p>
                </div>
                
                <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-lg p-3 min-h-[64px] flex flex-col justify-between">
                  <p className="text-xs text-emerald-500 font-medium uppercase tracking-wide">Product</p>
                  <p className="text-sm font-semibold text-[var(--foreground)] mt-1">{config.product_type}</p>
                </div>

                {/* Enhanced Clickable Symbol Count */}
                <button 
                  onClick={() => onViewSymbols?.(strategy, config.id)}
                  className="symbol-count-button group bg-gradient-to-r from-orange-500/10 to-orange-600/5 border-2 border-orange-500/20 rounded-lg p-3 hover:from-orange-500/20 hover:to-orange-600/10 hover:border-orange-500/40 hover:shadow-md transition-all duration-200 text-left w-full min-h-[64px] flex flex-col justify-between relative overflow-hidden"
                  title={`View ${stats.symbolCount} symbols using this configuration`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-1">
                      <Users className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform duration-200" />
                      <div className="w-2 h-2 bg-orange-500 rounded-full group-hover:scale-125 transition-transform duration-200"></div>
                    </div>
                    <p className="text-xs text-orange-500 font-medium uppercase tracking-wide">Symbols</p>
                    <div className="flex items-center justify-between mt-1">
                      {loadingStats ? (
                        <div className="shimmer loading-text w-8 h-5"></div>
                      ) : (
                        <p className="text-lg font-bold text-[var(--foreground)] group-hover:text-orange-600 transition-colors duration-200">{stats.symbolCount}</p>
                      )}
                      <div className="text-xs text-orange-500 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                        →
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Statistics Summary */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* P&L Display */}
                <div className="bg-gradient-to-r from-[var(--accent)]/5 to-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg p-3 text-center min-h-[72px] flex flex-col justify-center">
                  <TrendingUp className="w-4 h-4 text-[var(--accent)] mx-auto mb-1" />
                  <p className="text-xs text-[var(--accent)] font-medium uppercase tracking-wide mb-1">Total P&L</p>
                  {loadingStats ? (
                    <div className="skeleton skeleton-text w-16 h-4 mx-auto"></div>
                  ) : (
                    <p className={`text-sm font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ₹{Math.round(stats.totalPnL).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Active Symbols */}
                <div className="bg-gradient-to-r from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg p-3 text-center min-h-[72px] flex flex-col justify-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-1"></div>
                  <p className="text-xs text-green-500 font-medium uppercase tracking-wide mb-1">Active</p>
                  {loadingStats ? (
                    <div className="skeleton skeleton-text w-8 h-4 mx-auto"></div>
                  ) : (
                    <p className="text-sm font-bold text-[var(--foreground)]">{stats.activeSymbols}</p>
                  )}
                </div>
              </div>

              {/* Trade Statistics */}
              {(stats.totalTrades > 0 || stats.liveTrades > 0 || loadingStats) && (
                <div className="bg-gradient-to-r from-indigo-500/5 to-indigo-600/5 border border-indigo-500/20 rounded-lg p-3 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide">Total Trades</p>
                      {loadingStats ? (
                        <div className="skeleton skeleton-text w-8 h-4 mx-auto mt-1"></div>
                      ) : (
                        <p className="text-sm font-semibold text-[var(--foreground)] mt-1">{stats.totalTrades}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide">Live Trades</p>
                      {loadingStats ? (
                        <div className="skeleton skeleton-text w-8 h-4 mx-auto mt-1"></div>
                      ) : (
                        <p className="text-sm font-semibold text-[var(--foreground)] mt-1">{stats.liveTrades}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions - Fixed at bottom */}
              <div className="flex justify-between items-center pt-3 border-t border-[var(--border)] mt-auto">
                <button
                  onClick={() => handleViewConfig(config)}
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-[var(--accent)] hover:text-[var(--accent)]/80 hover:bg-[var(--accent)]/10 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>View</span>
                </button>
                
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEditConfig(config)}
                    className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/10 rounded-lg transition-colors"
                    title="Edit Configuration"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteConfig(config.id)}
                    className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete Configuration"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {configs.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Settings className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">No configurations found</h3>
          <p className="text-[var(--muted-foreground)] text-base mb-6 max-w-md mx-auto">
            Create your first configuration to start managing trading parameters for {strategy.name}
          </p>
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white rounded-lg transition-all duration-200 shadow-md font-medium text-base"
          >
            Create First Configuration
          </button>
        </div>
      )}

      {/* Pagination */}
      {configs.length > pageSize && (
        <div className="flex justify-center items-center space-x-4 py-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm bg-[var(--card-background)] border border-[var(--border)] rounded-lg hover:bg-[var(--muted)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <div className="flex items-center space-x-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--card-background)] border border-[var(--border)] hover:bg-[var(--muted)]/20'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm bg-[var(--card-background)] border border-[var(--border)] rounded-lg hover:bg-[var(--muted)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* View Config Modal */}
      {viewingConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Configuration Details</h3>
              <button
                onClick={() => setViewingConfig(null)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-2xl"
              >
                ×
              </button>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-[var(--muted-foreground)]">Loading configuration details...</div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="bg-[var(--background)]/50 border border-[var(--border)] rounded-lg p-4">
                  <h4 className="text-lg font-medium text-[var(--foreground)] mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[var(--foreground)]">Name:</label>
                      <p className="text-[var(--muted-foreground)] mt-1">{viewingConfig.name}</p>
                    </div>
                    
                    {viewingConfig.description && (
                      <div>
                        <label className="text-sm font-medium text-[var(--foreground)]">Description:</label>
                        <p className="text-[var(--muted-foreground)] mt-1">{viewingConfig.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Trading Parameters */}
                <div className="bg-[var(--background)]/50 border border-[var(--border)] rounded-lg p-4">
                  <h4 className="text-lg font-medium text-[var(--foreground)] mb-3">Trading Parameters</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[var(--foreground)]">Exchange:</label>
                      <p className="text-[var(--muted-foreground)] mt-1 font-mono">{viewingConfig.exchange}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--foreground)]">Order Type:</label>
                      <p className="text-[var(--muted-foreground)] mt-1 font-mono">{viewingConfig.order_type}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--foreground)]">Product Type:</label>
                      <p className="text-[var(--muted-foreground)] mt-1 font-mono">{viewingConfig.product_type}</p>
                    </div>
                    {viewingConfig.instrument && (
                      <div>
                        <label className="text-sm font-medium text-[var(--foreground)]">Instrument:</label>
                        <p className="text-[var(--muted-foreground)] mt-1 font-mono">{viewingConfig.instrument}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Configuration Data */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Trade Configuration */}
                  <div className="bg-[var(--background)]/50 border border-[var(--border)] rounded-lg p-4">
                    <h4 className="text-lg font-medium text-[var(--foreground)] mb-3">Trade Configuration</h4>
                    <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 max-h-64 overflow-y-auto">
                      {viewingConfig.trade && Object.keys(viewingConfig.trade).length > 0 ? (
                        <pre className="text-sm font-mono whitespace-pre-wrap text-[var(--foreground)]">
                          {JSON.stringify(viewingConfig.trade, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-[var(--muted-foreground)] text-sm italic">No trade configuration data</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Indicators Configuration */}
                  <div className="bg-[var(--background)]/50 border border-[var(--border)] rounded-lg p-4">
                    <h4 className="text-lg font-medium text-[var(--foreground)] mb-3">Indicators Configuration</h4>
                    <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 max-h-64 overflow-y-auto">
                      {viewingConfig.indicators && Object.keys(viewingConfig.indicators).length > 0 ? (
                        <pre className="text-sm font-mono whitespace-pre-wrap text-[var(--foreground)]">
                          {JSON.stringify(viewingConfig.indicators, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-[var(--muted-foreground)] text-sm italic">No indicators configuration data</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="bg-[var(--background)]/50 border border-[var(--border)] rounded-lg p-4">
                  <h4 className="text-lg font-medium text-[var(--foreground)] mb-3">Metadata</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <label className="text-sm font-medium text-[var(--foreground)]">Config ID:</label>
                      <p className="text-[var(--muted-foreground)] mt-1 font-mono">{viewingConfig.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--foreground)]">Created:</label>
                      <p className="text-[var(--muted-foreground)] mt-1">
                        {new Date(viewingConfig.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--foreground)]">Last Updated:</label>
                      <p className="text-[var(--muted-foreground)] mt-1">
                        {new Date(viewingConfig.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end mt-6 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setViewingConfig(null)}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Config Modal */}
      {editingConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Edit Configuration</h3>
              <button
                onClick={() => setEditingConfig(null)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleUpdateConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                  />
                </div>

                {/* Exchange */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Exchange
                  </label>
                  <select
                    value={editFormData.exchange}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, exchange: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                  >
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                    <option value="MCX">MCX</option>
                  </select>
                </div>

                {/* Order Type */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Order Type
                  </label>
                  <select
                    value={editFormData.order_type}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, order_type: e.target.value as 'MARKET' | 'LIMIT' }))}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                  >
                    <option value="MARKET">MARKET</option>
                    <option value="LIMIT">LIMIT</option>
                  </select>
                </div>

                {/* Product Type */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Product Type
                  </label>
                  <select
                    value={editFormData.product_type}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, product_type: e.target.value as 'INTRADAY' | 'DELIVERY' }))}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                  >
                    <option value="INTRADAY">INTRADAY</option>
                    <option value="DELIVERY">DELIVERY</option>
                  </select>
                </div>

                {/* Instrument */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Instrument
                  </label>
                  <input
                    type="text"
                    value={editFormData.instrument}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, instrument: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                    placeholder="e.g., INDEX, EQUITY"
                  />
                </div>
              </div>

              {/* Trade Configuration */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Trade Configuration (JSON)
                </label>
                <textarea
                  value={editFormData.trade}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, trade: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] font-mono text-sm"
                  placeholder='{"exchange": "NSE", "trade_symbol": "NIFTY50", "instrument": "INDEX"}'
                />
              </div>

              {/* Indicators Configuration */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Indicators Configuration (JSON)
                </label>
                <textarea
                  value={editFormData.indicators}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, indicators: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] font-mono text-sm"
                  placeholder='{"supertrend_period": 7, "supertrend_multiplier": 3, "sma_period": 14, "atr_multiplier": 14}'
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setEditingConfig(null)}
                  className="px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Updating...' : 'Update Config'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}