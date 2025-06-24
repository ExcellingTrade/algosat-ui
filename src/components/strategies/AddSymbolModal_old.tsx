"use client";

import { useState } from "react";
import { X, Plus, AlertCircle } from "lucide-react";
import { Strategy, StrategyConfig } from "./StrategiesPage";

interface AddSymbolModalProps {
  strategy: Strategy;
  configs: StrategyConfig[];
  existingSymbols?: string[]; // Add this to prevent duplicates
  onClose: () => void;
  onAdd: (symbolData: { symbol: string; configId: number }) => void;
}

export function AddSymbolModal({ strategy, configs, existingSymbols = [], onClose, onAdd }: AddSymbolModalProps) {
  const [symbolInput, setSymbolInput] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableConfigs = configs;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const trimmedSymbol = symbolInput.trim().toUpperCase();
    
    if (!trimmedSymbol) {
      setError("Please enter a symbol");
      return;
    }
    
    if (!selectedConfigId) {
      setError("Please select a configuration");
      return;
    }

    // Check for duplicates
    if (existingSymbols.includes(trimmedSymbol)) {
      setError(`Symbol "${trimmedSymbol}" is already added to this strategy`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd({
        symbol: trimmedSymbol,
        configId: selectedConfigId
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add symbol");
      setIsSubmitting(false);
    }
  };

  const handleSymbolInputChange = (value: string) => {
    setSymbolInput(value);
    setError(null); // Clear error when user types
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-[var(--card-background)]/95 backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[var(--accent)]/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">Add Symbol</h2>
              <p className="text-sm text-[var(--muted-foreground)]">{strategy.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--muted)]/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--muted-foreground)]" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

          {/* Symbol Input */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Symbol *
            </label>
            <input
              type="text"
              value={symbolInput}
              onChange={(e) => handleSymbolInputChange(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)] placeholder-[var(--muted-foreground)]"
              placeholder="Enter symbol (e.g., NIFTY, BANKNIFTY, RELIANCE)"
              disabled={isSubmitting}
              autoFocus
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Symbol will be automatically converted to uppercase
            </p>
          </div>

          {/* Configuration Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Configuration *
            </label>
            {availableConfigs.length === 0 ? (
              <div className="p-4 bg-[var(--muted)]/10 border border-[var(--border)] rounded-lg text-center">
                <p className="text-[var(--muted-foreground)] text-sm">
                  No configurations available for this strategy
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableConfigs.map((config) => (
                  <div
                    key={config.id}
                    onClick={() => setSelectedConfigId(config.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                      selectedConfigId === config.id
                        ? 'bg-[var(--accent)]/20 border-[var(--accent)]/50'
                        : 'bg-[var(--background)]/50 hover:bg-[var(--background)] border-[var(--border)] hover:border-[var(--border)]/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-[var(--foreground)] text-sm">
                            {config.name || `${config.symbol} Config`}
                          </span>
                          {config.is_default && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-medium">
                              DEFAULT
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            config.enabled 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {config.enabled ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-[var(--muted-foreground)]">
                          <span>Symbol: {config.symbol}</span>
                          <span>Exchange: {config.exchange}</span>
                          <span>{config.order_type}</span>
                          <span>{config.product_type}</span>
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-1">
                          {config.description || `Configuration for ${config.symbol} on ${config.exchange}`}
                        </p>
                      </div>
                      {selectedConfigId === config.id && (
                        <div className="w-5 h-5 bg-[var(--accent)] rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Summary */}
          {symbolInput.trim() && selectedConfigId && (
            <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-4">
              <h3 className="font-medium text-[var(--foreground)] mb-2">Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--muted-foreground)]">Symbol</p>
                  <p className="font-medium text-[var(--foreground)]">{symbolInput.trim().toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Configuration</p>
                  <p className="font-medium text-[var(--foreground)] truncate">
                    {availableConfigs.find(c => c.id === selectedConfigId)?.name || 
                     `${availableConfigs.find(c => c.id === selectedConfigId)?.symbol} Config`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!symbolInput.trim() || !selectedConfigId || isSubmitting || availableConfigs.length === 0}
              className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Symbol</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
