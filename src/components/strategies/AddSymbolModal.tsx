"use client";

import { useState } from "react";
import { X, Plus, AlertCircle, CheckCircle } from "lucide-react";
import { Strategy, StrategyConfig, StrategySymbol } from "./StrategiesPage";

interface AddSymbolModalProps {
  strategy: Strategy;
  configs: StrategyConfig[];
  existingSymbols: StrategySymbol[];
  onClose: () => void;
  onAdd: (symbolData: { symbol: string; configId: number }) => void;
}

export function AddSymbolModal({ strategy, configs, existingSymbols, onClose, onAdd }: AddSymbolModalProps) {
  const [symbolName, setSymbolName] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if symbol already exists in this strategy
  const isDuplicate = symbolName.trim() && existingSymbols.some(
    existing => existing.symbol.toLowerCase() === symbolName.trim().toLowerCase()
  );

  const canSubmit = symbolName.trim() && selectedConfigId && !isDuplicate && !isSubmitting && configs.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onAdd({
        symbol: symbolName.trim().toUpperCase(),
        configId: selectedConfigId!
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add symbol');
      setIsSubmitting(false);
    }
  };

  const formatSymbolName = (name: string) => {
    // Auto-format symbol name as user types (uppercase, remove special chars except allowed ones)
    return name.toUpperCase().replace(/[^A-Z0-9\-_]/g, '');
  };

  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSymbolName(e.target.value);
    setSymbolName(formatted);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card-background)]/95 backdrop-blur-xl border border-[var(--border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[var(--accent)]/20 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">Add Symbol to Strategy</h2>
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
              Symbol Name *
            </label>
            <div className="relative">
              <input
                type="text"
                value={symbolName}
                onChange={handleSymbolChange}
                className={`w-full px-4 py-3 bg-[var(--background)] border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  isDuplicate 
                    ? 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500' 
                    : symbolName.trim() 
                      ? 'border-green-500/50 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]'
                      : 'border-[var(--border)] focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]'
                }`}
                placeholder="Enter symbol name (e.g., NIFTY, BANKNIFTY, RELIANCE)"
                maxLength={20}
              />
              {symbolName.trim() && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {isDuplicate ? (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                </div>
              )}
            </div>
            
            {/* Validation Messages */}
            {symbolName.trim() && (
              <div className="mt-2">
                {isDuplicate ? (
                  <p className="text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>Symbol "{symbolName}" already exists in this strategy</span>
                  </p>
                ) : (
                  <p className="text-green-400 text-sm flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Symbol "{symbolName}" is available</span>
                  </p>
                )}
              </div>
            )}
            
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Symbol names are automatically formatted (uppercase, alphanumeric only)
            </p>
          </div>

          {/* Configuration Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
              Select Configuration *
            </label>
            
            {configs.length === 0 ? (
              <div className="p-4 bg-[var(--muted)]/10 border border-[var(--border)] rounded-lg text-center">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-[var(--muted-foreground)] font-medium">No configurations available</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  You must create at least one configuration before adding symbols to this strategy.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    // This would trigger opening the configs modal
                    // You might want to pass a callback to open configs modal
                  }}
                  className="mt-3 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/80 transition-colors text-sm"
                >
                  Create Configuration
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {configs.map((config) => (
                  <div
                    key={config.id}
                    onClick={() => setSelectedConfigId(config.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                      selectedConfigId === config.id
                        ? 'bg-[var(--accent)]/20 border-[var(--accent)]/50'
                        : 'bg-[var(--background)]/50 hover:bg-[var(--background)] border-[var(--border)]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-[var(--foreground)]">
                            {config.name}
                          </span>
                        </div>
                        <div className="text-sm text-[var(--muted-foreground)]">
                          <span>{config.exchange}</span>
                          {config.instrument && (
                            <>
                              <span> • </span>
                              <span>{config.instrument}</span>
                            </>
                          )}
                        </div>
                        {config.description && (
                          <p className="text-sm text-[var(--muted-foreground)] mt-1">{config.description}</p>
                        )}
                      </div>
                      {selectedConfigId === config.id && (
                        <CheckCircle className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {symbolName.trim() && selectedConfigId && !isDuplicate && (
            <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-4">
              <h3 className="font-medium text-[var(--foreground)] mb-3">Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--muted-foreground)]">Strategy</p>
                  <p className="font-medium text-[var(--foreground)]">{strategy.name}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Symbol</p>
                  <p className="font-medium text-[var(--foreground)]">{symbolName}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[var(--muted-foreground)]">Configuration</p>
                  <p className="font-medium text-[var(--foreground)]">
                    {configs.find(c => c.id === selectedConfigId)?.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Existing Symbols Info */}
          {existingSymbols.length > 0 && (
            <div className="bg-[var(--background)]/50 border border-[var(--border)] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[var(--foreground)] mb-2">
                Existing Symbols in {strategy.name}
              </h4>
              <div className="flex flex-wrap gap-2">
                {existingSymbols.map((symbol) => (
                  <span 
                    key={symbol.id}
                    className="px-2 py-1 bg-[var(--muted)]/20 text-[var(--muted-foreground)] rounded text-xs"
                  >
                    {symbol.symbol}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
