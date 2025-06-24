"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Settings, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { Strategy, StrategyConfig, StrategySymbol } from "./StrategiesPage";
import { apiClient } from "../../lib/api";

interface ConfigsPageProps {
  strategy: Strategy;
  configs: StrategyConfig[];
  symbols: StrategySymbol[];
  onBack: () => void;
  onRefresh: () => void;
}

export function ConfigsPage({ strategy, configs, symbols, onBack, onRefresh }: ConfigsPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<StrategyConfig | null>(null);
  const [viewingConfig, setViewingConfig] = useState<StrategyConfig | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingConfigId, setDeletingConfigId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12); // 12 configs per page for good grid layout
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

  // Pagination calculations
  const totalPages = Math.ceil(configs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedConfigs = configs.slice(startIndex, endIndex);

  // Get symbols using each config
  const getConfigSymbols = (configId: number) => {
    return symbols.filter(symbol => symbol.config_id === configId);
  };

  // Get config usage stats
  const getConfigStats = (configId: number) => {
    const configSymbols = getConfigSymbols(configId);
    const activeSymbols = configSymbols.filter(s => s.status === 'active').length;
    const totalTrades = configSymbols.reduce((sum, s) => sum + (s.tradeCount || 0), 0);
    const totalPnL = configSymbols.reduce((sum, s) => sum + (s.currentPnL || 0), 0);
    
    return {
      symbolCount: configSymbols.length,
      activeSymbols,
      totalTrades,
      totalPnL
    };
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
        order_type: newConfig.order_type,
        product_type: newConfig.product_type,
        trade: tradeData,
        indicators: indicatorsData,
        enabled: false,
        is_default: false
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
    setEditingConfig(config);
    setError(null);
  };

  const handleUpdateConfig = async (updatedConfig: Partial<StrategyConfig>) => {
    if (!editingConfig) return;
    
    setIsLoading(true);
    setError(null);

    try {
      await apiClient.updateStrategyConfig(strategy.id, editingConfig.id, updatedConfig);
      setEditingConfig(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to update config:', err);
      setError(err instanceof Error ? err.message : 'Failed to update config');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewConfig = (config: StrategyConfig) => {
    setViewingConfig(config);
    setError(null);
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
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var,--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
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
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var,--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
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
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var,--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
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
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var,--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
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
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var,--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
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
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var,--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] font-mono text-sm"
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
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var,--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] font-mono text-sm"
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
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {configs.map((config) => {
          const stats = getConfigStats(config.id);
          const configSymbols = getConfigSymbols(config.id);
          
          return (
            <div key={config.id} className="bg-gradient-to-br from-[var(--card-background)] to-[var(--card-background)]/80 border border-[var(--border)] rounded-xl p-6 space-y-4 hover:shadow-lg transition-all duration-200 hover:border-[var(--accent)]/30">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">{config.name}</h3>
                  {config.description && (
                    <p className="text-sm text-[var(--muted-foreground)]">{config.description}</p>
                  )}
                </div>
              </div>

              {/* Key Parameters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-xs text-blue-500 font-medium mb-1">Exchange</p>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{config.exchange}</p>
                </div>
                
                <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-lg p-3">
                  <p className="text-xs text-purple-500 font-medium mb-1">Order Type</p>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{config.order_type}</p>
                </div>
                
                <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-lg p-3">
                  <p className="text-xs text-emerald-500 font-medium mb-1">Product</p>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{config.product_type}</p>
                </div>

                <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-lg p-3">
                  <Users className="w-4 h-4 text-orange-500 mb-1" />
                  <p className="text-xs text-orange-500 font-medium mb-1">Symbols</p>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{stats.symbolCount}</p>
                </div>
              </div>

              {/* P&L Display */}
              <div className="bg-gradient-to-r from-[var(--accent)]/5 to-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg p-3 text-center">
                <TrendingUp className="w-5 h-5 text-[var(--accent)] mx-auto mb-1" />
                <p className="text-xs text-[var(--accent)] font-medium mb-1">Total P&L</p>
                <p className={`text-lg font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ₹{Math.round(stats.totalPnL).toLocaleString()}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
                <button
                  onClick={() => handleViewConfig(config)}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm text-[var(--accent)] hover:text-[var(--accent)]/80 hover:bg-[var(--accent)]/10 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Config</span>
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
            className="px-3 py-2 text-sm bg-[var(--card-background)] border border-[var,--border)] rounded-lg hover:bg-[var(--muted)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      : 'bg-[var(--card-background)] border border-[var,--border)] hover:bg-[var(--muted)]/20'
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
            className="px-3 py-2 text-sm bg-[var(--card-background)] border border-[var,--border)] rounded-lg hover:bg-[var(--muted)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* View Config Modal */}
      {viewingConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-background)] border border-[var,--border)] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Configuration Details</h3>
              <button
                onClick={() => setViewingConfig(null)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--foreground)]">Name:</label>
                <p className="text-[var(--muted-foreground)]">{viewingConfig.name}</p>
              </div>
              
              {viewingConfig.description && (
                <div>
                  <label className="text-sm font-medium text-[var(--foreground)]">Description:</label>
                  <p className="text-[var(--muted-foreground)]">{viewingConfig.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[var(--foreground)]">Exchange:</label>
                  <p className="text-[var(--muted-foreground)]">{viewingConfig.exchange}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--foreground)]">Order Type:</label>
                  <p className="text-[var(--muted-foreground)]">{viewingConfig.order_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--foreground)]">Product Type:</label>
                  <p className="text-[var(--muted-foreground)]">{viewingConfig.product_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--foreground)]">Enabled:</label>
                  <p className="text-[var(--muted-foreground)]">{viewingConfig.enabled ? 'Yes' : 'No'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-[var(--foreground)]">Trade Configuration:</label>
                <pre className="bg-[var(--background)] border border-[var,--border)] rounded-lg p-3 text-sm font-mono overflow-x-auto">
                  {JSON.stringify(viewingConfig.trade, null, 2)}
                </pre>
              </div>
              
              <div>
                <label className="text-sm font-medium text-[var(--foreground)]">Indicators Configuration:</label>
                <pre className="bg-[var(--background)] border border-[var,--border)] rounded-lg p-3 text-sm font-mono overflow-x-auto">
                  {JSON.stringify(viewingConfig.indicators, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Config Modal */}
      {editingConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-background)] border border-[var,--border)] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Edit Configuration</h3>
              <button
                onClick={() => setEditingConfig(null)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const updates: Partial<StrategyConfig> = {};
              
              const enabled = formData.get('enabled') as string;
              if (enabled !== undefined) {
                updates.enabled = enabled === 'true';
              }
              
              handleUpdateConfig(updates);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Enabled
                </label>
                <select
                  name="enabled"
                  defaultValue={editingConfig.enabled.toString()}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var,--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
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