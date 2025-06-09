"use client";

import { useState } from "react";
import { X, Plus, Settings, Edit, Trash2, Copy } from "lucide-react";
import { Strategy, StrategyConfig } from "./StrategiesPage";

interface ConfigsModalProps {
  strategy: Strategy;
  onClose: () => void;
}

export function ConfigsModal({ strategy, onClose }: ConfigsModalProps) {
  const [configs, setConfigs] = useState<StrategyConfig[]>([
    {
      id: 1,
      strategyId: strategy.id,
      name: "Scalping Config v1.2",
      description: "Optimized for high-frequency scalping with tight stop losses",
      isCustom: false,
      parameters: {
        stopLoss: 50,
        target: 25,
        maxTrades: 10,
        timeframe: "1m"
      },
      createdAt: "2024-01-15T10:00:00Z"
    },
    {
      id: 2,
      strategyId: strategy.id,
      name: "Bank Scalping Config",
      description: "Specialized configuration for Bank Nifty scalping",
      isCustom: true,
      parameters: {
        stopLoss: 75,
        target: 40,
        maxTrades: 8,
        timeframe: "1m"
      },
      createdAt: "2024-02-01T14:30:00Z"
    },
    {
      id: 3,
      strategyId: strategy.id,
      name: "Conservative Config",
      description: "Lower risk configuration with wider stops",
      isCustom: false,
      parameters: {
        stopLoss: 100,
        target: 60,
        maxTrades: 5,
        timeframe: "3m"
      },
      createdAt: "2024-01-20T16:15:00Z"
    }
  ]);

  const [editingConfig, setEditingConfig] = useState<StrategyConfig | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleDuplicate = (config: StrategyConfig) => {
    const newConfig: StrategyConfig = {
      ...config,
      id: Math.max(...configs.map(c => c.id)) + 1,
      name: `${config.name} (Copy)`,
      isCustom: true,
      createdAt: new Date().toISOString()
    };
    setConfigs([...configs, newConfig]);
  };

  const handleDelete = (configId: number) => {
    setConfigs(configs.filter(c => c.id !== configId));
  };

  const renderConfigCard = (config: StrategyConfig) => (
    <div
      key={config.id}
      className="backdrop-blur-xl bg-[var(--card-background)]/95 border border-[var(--border)] rounded-xl p-4 hover:border-[var(--accent)]/50 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold text-[var(--foreground)]">{config.name}</h3>
            {config.isCustom && (
              <span className="px-2 py-1 text-xs bg-[var(--accent)]/20 text-[var(--accent)] rounded-full">
                Custom
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--muted-foreground)] mb-3">{config.description}</p>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setEditingConfig(config)}
            className="p-1.5 rounded-lg bg-[var(--background)]/50 hover:bg-[var(--accent)]/10 transition-colors"
          >
            <Edit className="w-4 h-4 text-[var(--muted-foreground)]" />
          </button>
          <button
            onClick={() => handleDuplicate(config)}
            className="p-1.5 rounded-lg bg-[var(--background)]/50 hover:bg-blue-500/10 transition-colors"
          >
            <Copy className="w-4 h-4 text-[var(--muted-foreground)]" />
          </button>
          {config.isCustom && (
            <button
              onClick={() => handleDelete(config.id)}
              className="p-1.5 rounded-lg bg-[var(--background)]/50 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(config.parameters).map(([key, value]) => (
          <div key={key} className="bg-[var(--background)]/30 rounded-lg p-2">
            <p className="text-xs text-[var(--muted-foreground)] capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </p>
            <p className="font-medium text-[var(--foreground)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-[var(--muted-foreground)]">
        Created: {new Date(config.createdAt).toLocaleDateString()}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] bg-[var(--card-background)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 md:p-6 border-b border-[var(--border)] space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[var(--accent)]/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Settings className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-[var(--foreground)] truncate">Strategy Configurations</h2>
              <p className="text-sm text-[var(--muted-foreground)] truncate">{strategy.name}</p>
            </div>
          </div>
          <div className="flex items-center justify-end space-x-2 flex-shrink-0">
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 md:px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/80 transition-colors flex items-center space-x-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Config</span>
              <span className="sm:hidden">Add</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[var(--background)] hover:bg-[var(--accent)]/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(95vh-140px)] md:max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            {configs.map(renderConfigCard)}
          </div>

          {configs.length === 0 && (
            <div className="text-center py-8 md:py-12">
              <Settings className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
              <p className="text-[var(--muted-foreground)]">No configurations found</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/80 transition-colors"
              >
                Create First Config
              </button>
            </div>
          )}
        </div>

        {/* Add/Edit Form Modal */}
        {(showAddForm || editingConfig) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-2 md:p-4">
            <div className="w-full max-w-md bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-4 md:p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                {editingConfig ? 'Edit Configuration' : 'Add New Configuration'}
              </h3>
              
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Configuration Name
                  </label>
                  <input
                    type="text"
                    defaultValue={editingConfig?.name || ''}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
                    placeholder="Enter config name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Description
                  </label>
                  <textarea
                    defaultValue={editingConfig?.description || ''}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
                    placeholder="Enter description"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Stop Loss
                    </label>
                    <input
                      type="number"
                      defaultValue={editingConfig?.parameters.stopLoss || 50}
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Target
                    </label>
                    <input
                      type="number"
                      defaultValue={editingConfig?.parameters.target || 25}
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingConfig(null);
                    }}
                    className="px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/80 transition-colors"
                  >
                    {editingConfig ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
