"use client";

import { useState, useEffect } from "react";
import { X, Plus, Settings, Edit, Trash2, Copy, Check, AlertCircle } from "lucide-react";
import { Strategy, StrategyConfig } from "./StrategiesPage";
import { apiClient } from "../../lib/api";

interface ConfigsModalProps {
  strategy: Strategy;
  configs: StrategyConfig[];
  onClose: () => void;
  onRefresh: () => void;
}

export function ConfigsModal({ strategy, configs, onClose, onRefresh }: ConfigsModalProps) {
  const [selectedConfig, setSelectedConfig] = useState<StrategyConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingConfigs, setUpdatingConfigs] = useState<Set<number>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newConfig, setNewConfig] = useState({
    name: '',
    description: '',
    exchange: 'NSE',
    instrument: '',
    trade: '{}',
    indicators: '{}'
  });

  const handleToggleConfig = async (config: StrategyConfig) => {
    // TODO: Enable/disable functionality not implemented for strategy configs
    // This is handled at the strategy level now
    console.log('Toggle config functionality not available for individual configs');
    setError('Config enable/disable is handled at the strategy level');
  };

  const handleUpdateConfig = async (config: StrategyConfig, updates: Partial<StrategyConfig>) => {
    setUpdatingConfigs(prev => new Set(prev).add(config.id));
    setError(null);
    
    try {
      await apiClient.updateStrategyConfig(strategy.id, config.id, updates);
      onRefresh(); // Refresh the configs list
    } catch (err) {
      console.error('Failed to update config:', err);
      setError(err instanceof Error ? err.message : 'Failed to update config');
    } finally {
      setUpdatingConfigs(prev => {
        const newSet = new Set(prev);
        newSet.delete(config.id);
        return newSet;
      });
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
      onRefresh();
    } catch (err) {
      console.error('Failed to create config:', err);
      setError(err instanceof Error ? err.message : 'Failed to create config');
    } finally {
      setIsLoading(false);
    }
  };

  const formatJson = (obj: Record<string, any>) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return JSON.stringify(obj);
    }
  };

  const getConfigStatus = (config: StrategyConfig) => {
    // For now, all configs are considered active since we don't have enabled/disabled at config level
    return { text: 'ACTIVE', className: 'bg-green-500/20 text-green-400 border border-green-500/30' };
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card-background)]/95 backdrop-blur-xl border border-[var(--border)] rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">Strategy Configurations</h2>
            <p className="text-[var(--muted-foreground)] text-sm">{strategy.name}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Config</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--muted)]/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[var(--muted-foreground)]" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Error</p>
              <p className="text-red-400/80 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Add Config Form */}
        {showAddForm && (
          <div className="mx-6 mt-4 bg-[var(--background)]/50 border border-[var(--border)] rounded-lg p-6">
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

                {/* Exchange */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Exchange *
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
                    placeholder="e.g., INDEX, EQUITY"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Description
                </label>
                <textarea
                  value={newConfig.description}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                  rows={2}
                  placeholder="Brief description of this configuration"
                />
              </div>

              {/* Trade Configuration */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Trade Configuration (JSON)
                </label>
                <textarea
                  value={newConfig.trade}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, trade: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] font-mono text-sm"
                  rows={4}
                  placeholder='{"max_trades": 3, "lot_size": 25, "stop_loss": 50}'
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
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] font-mono text-sm"
                  rows={4}
                  placeholder='{"rsi_period": 14, "sma_period": 20}'
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !newConfig.name.trim()}
                  className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create Config</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {configs.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No Configurations Found</h3>
              <p className="text-[var(--muted-foreground)]">
                This strategy doesn't have any configurations yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {configs.map((config) => {
                const status = getConfigStatus(config);
                const isUpdating = updatingConfigs.has(config.id);
                
                return (
                  <div
                    key={config.id}
                    className="bg-[var(--background)]/50 border border-[var(--border)] rounded-xl p-6 hover:border-[var(--border)]/80 transition-all"
                  >
                    {/* Config Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-[var(--foreground)]">
                            {config.name || "Config"}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                            {status.text}
                          </span>
                          {config.is_default && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-medium">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-[var(--muted-foreground)]">
                          <span>Exchange: {config.exchange}</span>
                          {config.instrument && <span>Instrument: {config.instrument}</span>}
                        </div>
                        <p className="text-[var(--muted-foreground)] text-sm mt-1">
                          {config.description || `Configuration for ${config.exchange}`}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggleConfig(config)}
                          disabled={true}
                          className="p-2 rounded-lg transition-all duration-200 bg-gray-500/20 text-gray-400 opacity-50 cursor-not-allowed"
                          title="Config enable/disable is handled at strategy level"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => setSelectedConfig(selectedConfig?.id === config.id ? null : config)}
                          className="p-2 bg-[var(--accent)]/20 hover:bg-[var(--accent)]/30 text-[var(--accent)] rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Config Details (Expandable) */}
                    {selectedConfig?.id === config.id && (
                      <div className="border-t border-[var(--border)] pt-4 mt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Trade Configuration */}
                          <div>
                            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center">
                              <Settings className="w-4 h-4 mr-2" />
                              Trade Configuration
                            </h4>
                            <div className="bg-[var(--background)]/30 border border-[var(--border)] rounded-lg p-4">
                              <pre className="text-xs text-[var(--muted-foreground)] whitespace-pre-wrap font-mono">
                                {formatJson(config.trade)}
                              </pre>
                            </div>
                          </div>

                          {/* Indicators Configuration */}
                          <div>
                            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center">
                              <Settings className="w-4 h-4 mr-2" />
                              Indicators Configuration
                            </h4>
                            <div className="bg-[var(--background)]/30 border border-[var(--border)] rounded-lg p-4">
                              <pre className="text-xs text-[var(--muted-foreground)] whitespace-pre-wrap font-mono">
                                {formatJson(config.indicators)}
                              </pre>
                            </div>
                          </div>
                        </div>

                        {/* Meta Information */}
                        <div className="mt-6 pt-4 border-t border-[var(--border)]">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-[var(--muted-foreground)]">Created:</span>
                              <span className="text-[var(--foreground)] ml-2">
                                {new Date(config.created_at).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--muted-foreground)]">Updated:</span>
                              <span className="text-[var(--foreground)] ml-2">
                                {new Date(config.updated_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
