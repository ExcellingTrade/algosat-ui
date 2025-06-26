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
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  X
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
  const [pageSize] = useState(12); // 12 configs per page for good table layout
  const [configStats, setConfigStats] = useState<Record<number, any>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExchange, setSelectedExchange] = useState('');
  const [sortField, setSortField] = useState<'name' | 'updated_at' | 'pnl' | 'symbols'>('updated_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Cache for detailed config data
  const [configCache, setConfigCache] = useState<Record<number, StrategyConfig>>({});
  
  const [newConfig, setNewConfig] = useState({
    name: '',
    description: '',
    exchange: 'NSE',
    instrument: '',
    trade: '{}',
    indicators: '{}'
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    exchange: 'NSE',
    instrument: '',
    trade: '{}',
    indicators: '{}'
  });

  // Filter and search logic
  const filteredConfigs = configs.filter(config => {
    const matchesSearch = searchTerm === '' || 
      config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (config.description && config.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesExchange = selectedExchange === '' || config.exchange === selectedExchange;
    
    return matchesSearch && matchesExchange;
  });

  // Sort configs
  const sortedConfigs = [...filteredConfigs].sort((a, b) => {
    try {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
          break;
        case 'pnl':
          // Safe access to stats with fallback
          const aStats = getConfigStats(a.id);
          const bStats = getConfigStats(b.id);
          aValue = aStats?.totalPnL || 0;
          bValue = bStats?.totalPnL || 0;
          break;
        case 'symbols':
          // Safe access to stats with fallback
          const aSymbolStats = getConfigStats(a.id);
          const bSymbolStats = getConfigStats(b.id);
          aValue = aSymbolStats?.symbolCount || 0;
          bValue = bSymbolStats?.symbolCount || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    } catch (error) {
      console.warn('Error in sort function:', error);
      return 0; // Keep original order if sort fails
    }
  });

  // Pagination calculations for sorted and filtered results
  const totalPages = Math.ceil(sortedConfigs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedConfigs = sortedConfigs.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedExchange, sortField, sortDirection]);

  // Clear cache when configs change (external refresh)
  useEffect(() => {
    console.log('Configs prop changed, clearing cache');
    setConfigCache({});
  }, [configs]);

  // Get symbols using each config
  const getConfigSymbols = (configId: number) => {
    return symbols.filter(symbol => symbol.config_id === configId);
  };

  // Get config usage stats (now uses real API data with fallback)
  const getConfigStats = (configId: number) => {
    try {
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
    } catch (error) {
      console.warn(`Error getting stats for config ${configId}:`, error);
      return {
        symbolCount: 0,
        activeSymbols: 0,
        totalTrades: 0,
        totalPnL: 0,
        liveTrades: 0
      };
    }
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

  const handleSort = (field: 'name' | 'updated_at' | 'pnl' | 'symbols') => {
    console.log(`Sorting by: ${field}`);
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

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
        trade: tradeData,
        indicators: indicatorsData
      });

      // Reset form and refresh
      setNewConfig({
        name: '',
        description: '',
        exchange: 'NSE',
        instrument: '',
        trade: '{}',
        indicators: '{}'
      });
      setShowAddForm(false);
      
      // Clear the entire cache since we have new configs
      setConfigCache({});
      console.log('Cache cleared after creating new config');
      
      onRefresh();
    } catch (err) {
      console.error('Failed to create config:', err);
      setError(err instanceof Error ? err.message : 'Failed to create config');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditConfig = async (config: StrategyConfig) => {
    console.log('Edit config - fetching latest data for config:', config.id);
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch the latest config data from the API to ensure we have up-to-date information
      const latestConfig = await apiClient.getStrategyConfig(strategy.id, config.id);
      console.log('Fetched latest config data:', latestConfig);
      console.log('Trade data type:', typeof latestConfig.trade, 'Value:', latestConfig.trade);
      console.log('Indicators data type:', typeof latestConfig.indicators, 'Value:', latestConfig.indicators);
      
      // Safely handle JSON fields - handle both object and string types
      let safeTradeJSON = '{}';
      if (latestConfig.trade) {
        if (typeof latestConfig.trade === 'string') {
          // If it's already a string, use it as is (but validate it's proper JSON)
          try {
            const parsed = JSON.parse(latestConfig.trade);
            safeTradeJSON = JSON.stringify(parsed, null, 2);
          } catch {
            safeTradeJSON = latestConfig.trade; // Use as-is if it's not valid JSON
          }
        } else if (typeof latestConfig.trade === 'object' && latestConfig.trade !== null) {
          // If it's an object, stringify it with proper formatting
          try {
            safeTradeJSON = JSON.stringify(latestConfig.trade, null, 2);
          } catch {
            safeTradeJSON = '{}';
          }
        }
      }
      
      let safeIndicatorsJSON = '{}';
      if (latestConfig.indicators) {
        if (typeof latestConfig.indicators === 'string') {
          // If it's already a string, use it as is (but validate it's proper JSON)
          try {
            const parsed = JSON.parse(latestConfig.indicators);
            safeIndicatorsJSON = JSON.stringify(parsed, null, 2);
          } catch {
            safeIndicatorsJSON = latestConfig.indicators; // Use as-is if it's not valid JSON
          }
        } else if (typeof latestConfig.indicators === 'object' && latestConfig.indicators !== null) {
          // If it's an object, stringify it with proper formatting
          try {
            safeIndicatorsJSON = JSON.stringify(latestConfig.indicators, null, 2);
          } catch {
            safeIndicatorsJSON = '{}';
          }
        }
      }
      
      console.log('Processed JSON strings:');
      console.log('Trade JSON:', safeTradeJSON);
      console.log('Indicators JSON:', safeIndicatorsJSON);
      
      const formData = {
        name: latestConfig.name,
        description: latestConfig.description || '',
        exchange: latestConfig.exchange,
        instrument: latestConfig.instrument || '',
        trade: safeTradeJSON,
        indicators: safeIndicatorsJSON
      };
      
      console.log('Setting edit form data:', formData);
      
      setEditFormData(formData);
      setEditingConfig(latestConfig);
      setError(null);
      
    } catch (err) {
      console.error('Failed to fetch config details for editing:', err);
      // Fall back to using the passed config if API call fails
      setError('Could not fetch latest config data, showing cached data');
      
      // Fallback to cached data processing
      let safeTradeJSON = '{}';
      if (config.trade) {
        if (typeof config.trade === 'string') {
          try {
            const parsed = JSON.parse(config.trade);
            safeTradeJSON = JSON.stringify(parsed, null, 2);
          } catch {
            safeTradeJSON = config.trade;
          }
        } else if (typeof config.trade === 'object' && config.trade !== null) {
          try {
            safeTradeJSON = JSON.stringify(config.trade, null, 2);
          } catch {
            safeTradeJSON = '{}';
          }
        }
      }
      
      let safeIndicatorsJSON = '{}';
      if (config.indicators) {
        if (typeof config.indicators === 'string') {
          try {
            const parsed = JSON.parse(config.indicators);
            safeIndicatorsJSON = JSON.stringify(parsed, null, 2);
          } catch {
            safeIndicatorsJSON = config.indicators;
          }
        } else if (typeof config.indicators === 'object' && config.indicators !== null) {
          try {
            safeIndicatorsJSON = JSON.stringify(config.indicators, null, 2);
          } catch {
            safeIndicatorsJSON = '{}';
          }
        }
      }
      
      setEditFormData({
        name: config.name,
        description: config.description || '',
        exchange: config.exchange,
        instrument: config.instrument || '',
        trade: safeTradeJSON,
        indicators: safeIndicatorsJSON
      });
      setEditingConfig(config);
    } finally {
      setIsLoading(false);
    }
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
        trade: tradeData,
        indicators: indicatorsData
      };

      console.log('Updating config with data:', updates);
      await apiClient.updateStrategyConfig(strategy.id, editingConfig.id, updates);
      
      // Clear the cache for this config to ensure fresh data on next view/edit
      setConfigCache(prev => {
        const newCache = { ...prev };
        delete newCache[editingConfig.id];
        console.log('Cache cleared for config:', editingConfig.id);
        return newCache;
      });
      
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
    console.log('View config - checking cache for config:', config.id);
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if we have cached data first
      let latestConfig = configCache[config.id];
      
      if (!latestConfig) {
        // Fetch the latest config data from the API if not cached
        console.log('No cache found, fetching from API...');
        latestConfig = await apiClient.getStrategyConfig(strategy.id, config.id);
        
        // Cache the fetched data
        setConfigCache(prev => ({
          ...prev,
          [config.id]: latestConfig
        }));
        console.log('Config cached for future use');
      } else {
        console.log('Using cached config data');
      }
      
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
      
      // Clear the cache for this config
      setConfigCache(prev => {
        const newCache = { ...prev };
        delete newCache[configId];
        console.log('Cache cleared for deleted config:', configId);
        return newCache;
      });
      
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
                  placeholder="e.g., EQUITY, INDEX, FUTURES"
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

      {/* Search and Filter Bar */}
      {configs.length > 0 && (
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search configurations..."
                className="w-full pl-10 pr-4 py-2 bg-[var(--card-background)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors text-[var(--foreground)] placeholder-[var(--muted-foreground)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-[var(--muted-foreground)]" />
              <select
                value={selectedExchange}
                onChange={(e) => setSelectedExchange(e.target.value)}
                className="px-3 py-2 bg-[var(--card-background)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors text-[var(--foreground)]"
              >
                <option value="">All Exchanges</option>
                <option value="NSE">NSE</option>
                <option value="BSE">BSE</option>
                <option value="MCX">MCX</option>
              </select>
            </div>
          </div>
          {/* Results count */}
          <div className="flex justify-between items-center text-sm text-[var(--muted-foreground)]">
            <span>
              Showing {Math.min(sortedConfigs.length, pageSize)} of {sortedConfigs.length} configuration{sortedConfigs.length === 1 ? '' : 's'}
              {(searchTerm || selectedExchange) && ` (filtered from ${configs.length} total)`}
            </span>
            {(searchTerm || selectedExchange) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedExchange('');
                }}
                className="text-[var(--accent)] hover:text-[var(--accent)]/80 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Responsive Table */}
      <div className="overflow-hidden bg-[var(--card-background)] border border-[var(--border)] rounded-xl">
        {/* Desktop Table */}
        <div className="hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-[var(--muted)]/5 to-[var(--muted)]/10 border-b border-[var(--border)]">
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-2 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                  >
                    <span>Configuration</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-center p-4">
                  <button
                    onClick={() => handleSort('symbols')}
                    className="flex items-center justify-center space-x-2 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors w-full"
                  >
                    <span>Symbols</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-center p-4">
                  <button
                    onClick={() => handleSort('pnl')}
                    className="flex items-center justify-center space-x-2 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors w-full"
                  >
                    <span>P&L</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-center p-4 text-sm font-semibold text-[var(--foreground)]">Trades</th>
                <th className="text-center p-4">
                  <button
                    onClick={() => handleSort('updated_at')}
                    className="flex items-center justify-center space-x-2 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors w-full"
                  >
                    <span>Last Modified</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-center p-4 text-sm font-semibold text-[var(--foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedConfigs.map((config, index) => {
                const stats = getConfigStats(config.id);
                return (
                  <tr 
                    key={config.id} 
                    className={`border-b border-[var(--border)] hover:bg-[var(--muted)]/5 transition-colors ${
                      index % 2 === 0 ? 'bg-[var(--background)]' : 'bg-[var(--card-background)]'
                    }`}
                  >
                    {/* Configuration Info */}
                    <td className="p-4">
                      <button
                        onClick={() => handleViewConfig(config)}
                        className="w-full text-left space-y-1 hover:bg-[var(--muted)]/10 p-2 rounded-lg transition-colors"
                        title="Click to view configuration details"
                      >
                        <h3 className="font-semibold text-[var(--foreground)] line-clamp-1">{config.name}</h3>
                        {config.description && (
                          <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">{config.description}</p>
                        )}
                        <div className="flex items-center space-x-2 text-xs text-[var(--muted-foreground)]">
                          <span className="bg-[var(--muted)]/20 px-2 py-0.5 rounded">{config.exchange}</span>
                          {config.instrument && (
                            <span className="bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded">{config.instrument}</span>
                          )}
                        </div>
                      </button>
                    </td>
                    
                    {/* Symbols Count */}
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => onViewSymbols?.(strategy, config.id)}
                        className="group inline-flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-lg hover:from-orange-500/20 hover:to-orange-600/10 hover:border-orange-500/40 transition-all duration-200"
                        title={`View ${stats.symbolCount} symbols using this configuration`}
                      >
                        <Users className="w-4 h-4 text-orange-500" />
                        {loadingStats ? (
                          <div className="w-6 h-4 bg-[var(--muted)]/20 rounded animate-pulse"></div>
                        ) : (
                          <span className="font-semibold text-[var(--foreground)] group-hover:text-orange-600 transition-colors">{stats.symbolCount}</span>
                        )}
                      </button>
                    </td>
                    
                    {/* P&L */}
                    <td className="p-4 text-center">
                      {loadingStats ? (
                        <div className="w-16 h-4 bg-[var(--muted)]/20 rounded animate-pulse mx-auto"></div>
                      ) : (
                        <div className="inline-flex items-center space-x-1">
                          <TrendingUp className={`w-4 h-4 ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                          <span className={`font-semibold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ₹{Math.round(stats.totalPnL).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </td>
                    
                    {/* Trades */}
                    <td className="p-4 text-center">
                      {loadingStats ? (
                        <div className="w-12 h-4 bg-[var(--muted)]/20 rounded animate-pulse mx-auto"></div>
                      ) : (
                        <div className="text-center">
                          <div className="font-semibold text-[var(--foreground)]">{stats.totalTrades}</div>
                          {stats.liveTrades > 0 && (
                            <div className="text-xs text-green-500">+{stats.liveTrades} live</div>
                          )}
                        </div>
                      )}
                    </td>
                    
                    {/* Last Modified */}
                    <td className="p-4 text-center">
                      <div className="text-center">
                        <div className="text-sm text-[var(--foreground)]">
                          {new Date(config.updated_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {new Date(config.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex justify-center items-center space-x-1">
                        <button
                          onClick={() => handleViewConfig(config)}
                          className="p-2 text-[var(--accent)] hover:text-[var(--accent)]/80 hover:bg-[var(--accent)]/10 rounded-lg transition-colors"
                          title="View Configuration"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4 p-4">
          {paginatedConfigs.map((config) => {
            const stats = getConfigStats(config.id);
            return (
              <div key={config.id} className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-4 space-y-3">
                {/* Header */}
                <div className="space-y-1">
                  <h3 className="font-semibold text-[var(--foreground)]">{config.name}</h3>
                  {config.description && (
                    <p className="text-sm text-[var(--muted-foreground)]">{config.description}</p>
                  )}
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="bg-[var(--muted)]/20 px-2 py-0.5 rounded text-[var(--muted-foreground)]">{config.exchange}</span>
                    {config.instrument && (
                      <span className="bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded">{config.instrument}</span>
                    )}
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => onViewSymbols?.(strategy, config.id)}
                    className="flex flex-col items-center space-y-1 p-2 bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-lg"
                  >
                    <Users className="w-4 h-4 text-orange-500" />
                    <span className="text-xs text-orange-500">Symbols</span>
                    {loadingStats ? (
                      <div className="w-6 h-3 bg-[var(--muted)]/20 rounded animate-pulse"></div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--foreground)]">{stats.symbolCount}</span>
                    )}
                  </button>
                  
                  <div className="flex flex-col items-center space-y-1 p-2 bg-gradient-to-r from-[var(--accent)]/5 to-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg">
                    <TrendingUp className={`w-4 h-4 ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                    <span className="text-xs text-[var(--muted-foreground)]">P&L</span>
                    {loadingStats ? (
                      <div className="w-8 h-3 bg-[var(--muted)]/20 rounded animate-pulse"></div>
                    ) : (
                      <span className={`text-sm font-semibold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ₹{Math.round(stats.totalPnL / 1000)}K
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-center space-y-1 p-2 bg-gradient-to-r from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-purple-500" />
                    <span className="text-xs text-purple-500">Trades</span>
                    {loadingStats ? (
                      <div className="w-6 h-3 bg-[var(--muted)]/20 rounded animate-pulse"></div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--foreground)]">{stats.totalTrades}</span>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
                  <button
                    onClick={() => handleViewConfig(config)}
                    className="flex items-center space-x-1 px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditConfig(config)}
                      className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/10 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(config.id)}
                      className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {sortedConfigs.length === 0 && configs.length > 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gradient-to-r from-[var(--muted)] to-[var(--muted)]/80 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-[var(--muted-foreground)]" />
          </div>
          <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">No configurations match your search</h3>
          <p className="text-[var(--muted-foreground)] text-base mb-6 max-w-md mx-auto">
            Try adjusting your search terms or filters to find what you're looking for
          </p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setSelectedExchange('');
            }}
            className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white rounded-lg transition-all duration-200 shadow-md font-medium text-base"
          >
            Clear Filters
          </button>
        </div>
      )}

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
      {sortedConfigs.length > pageSize && (
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
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingConfig(null)}
        >
          <div 
            className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Configuration Details</h3>
              <button
                onClick={() => setViewingConfig(null)}
                className="flex items-center justify-center w-8 h-8 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/20 rounded-lg transition-all duration-200 cursor-pointer"
                title="Close modal"
                type="button"
              >
                <X className="w-5 h-5" />
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
                  <h4 className="text-lg font-medium text-[var(--foreground)] mb-3">Configuration Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[var(--foreground)]">Exchange:</label>
                      <p className="text-[var(--muted-foreground)] mt-1 font-mono">{viewingConfig.exchange}</p>
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
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setEditingConfig(null)}
        >
          <div 
            className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Edit Configuration</h3>
              <button
                onClick={() => setEditingConfig(null)}
                className="flex items-center justify-center w-8 h-8 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/20 rounded-lg transition-all duration-200 cursor-pointer"
                title="Close modal"
                type="button"
              >
                <X className="w-5 h-5" />
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