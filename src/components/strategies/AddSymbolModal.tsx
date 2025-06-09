"use client";

import { useState } from "react";
import { X, Plus, Search, TrendingUp } from "lucide-react";
import { Strategy, StrategyConfig } from "./StrategiesPage";

interface AddSymbolModalProps {
  strategy: Strategy;
  onClose: () => void;
  onAdd: (symbolData: { symbol: string; configId: number }) => void;
}

interface SymbolOption {
  symbol: string;
  name: string;
  exchange: string;
  type: 'INDEX' | 'STOCK' | 'COMMODITY';
  currentPrice?: number;
  change?: number;
  changePercent?: number;
}

export function AddSymbolModal({ strategy, onClose, onAdd }: AddSymbolModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolOption | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);

  // Sample symbol data - replace with API call
  const [availableSymbols] = useState<SymbolOption[]>([
    {
      symbol: "NIFTY",
      name: "Nifty 50",
      exchange: "NSE",
      type: "INDEX",
      currentPrice: 22450.75,
      change: 125.50,
      changePercent: 0.56
    },
    {
      symbol: "BANKNIFTY",
      name: "Bank Nifty",
      exchange: "NSE",
      type: "INDEX",
      currentPrice: 48320.25,
      change: -45.75,
      changePercent: -0.09
    },
    {
      symbol: "RELIANCE",
      name: "Reliance Industries Ltd",
      exchange: "NSE",
      type: "STOCK",
      currentPrice: 2456.80,
      change: 12.30,
      changePercent: 0.50
    },
    {
      symbol: "TCS",
      name: "Tata Consultancy Services",
      exchange: "NSE",
      type: "STOCK",
      currentPrice: 3890.45,
      change: -23.15,
      changePercent: -0.59
    },
    {
      symbol: "HDFC",
      name: "HDFC Bank Limited",
      exchange: "NSE",
      type: "STOCK",
      currentPrice: 1678.90,
      change: 8.75,
      changePercent: 0.52
    },
    {
      symbol: "ICICIBANK",
      name: "ICICI Bank Limited",
      exchange: "NSE",
      type: "STOCK",
      currentPrice: 1234.55,
      change: -5.20,
      changePercent: -0.42
    },
    {
      symbol: "INFY",
      name: "Infosys Limited",
      exchange: "NSE",
      type: "STOCK",
      currentPrice: 1567.30,
      change: 15.80,
      changePercent: 1.02
    },
    {
      symbol: "CRUDEOIL",
      name: "Crude Oil",
      exchange: "MCX",
      type: "COMMODITY",
      currentPrice: 6789.50,
      change: 45.25,
      changePercent: 0.67
    }
  ]);

  // Sample configs for the strategy
  const [availableConfigs] = useState<StrategyConfig[]>([
    {
      id: 1,
      strategyId: strategy.id,
      name: "Scalping Config v1.2",
      description: "Optimized for high-frequency scalping",
      isCustom: false,
      parameters: { stopLoss: 50, target: 25 },
      createdAt: "2024-01-15T10:00:00Z"
    },
    {
      id: 2,
      strategyId: strategy.id,
      name: "Bank Scalping Config",
      description: "Specialized for Bank Nifty",
      isCustom: true,
      parameters: { stopLoss: 75, target: 40 },
      createdAt: "2024-02-01T14:30:00Z"
    },
    {
      id: 3,
      strategyId: strategy.id,
      name: "Conservative Config",
      description: "Lower risk with wider stops",
      isCustom: false,
      parameters: { stopLoss: 100, target: 60 },
      createdAt: "2024-01-20T16:15:00Z"
    }
  ]);

  const filteredSymbols = availableSymbols.filter(symbol =>
    symbol.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    symbol.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSymbol && selectedConfigId) {
      onAdd({
        symbol: selectedSymbol.symbol,
        configId: selectedConfigId
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INDEX':
        return 'text-blue-400 bg-blue-500/20';
      case 'STOCK':
        return 'text-green-400 bg-green-500/20';
      case 'COMMODITY':
        return 'text-orange-400 bg-orange-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="w-full max-w-3xl max-h-[95vh] md:max-h-[90vh] bg-[var(--card-background)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 md:p-6 border-b border-[var(--border)] space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[var(--accent)]/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-[var(--foreground)] truncate">Add Symbol to Strategy</h2>
              <p className="text-sm text-[var(--muted-foreground)] truncate">{strategy.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[var(--background)] hover:bg-[var(--accent)]/10 transition-colors self-end sm:self-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto max-h-[calc(95vh-140px)] md:max-h-[calc(90vh-140px)]">
          {/* Symbol Search */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Search & Select Symbol
            </label>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
                placeholder="Search by symbol or name..."
              />
            </div>

            <div className="max-h-48 md:max-h-64 overflow-y-auto space-y-2 border border-[var(--border)] rounded-lg p-2">
              {filteredSymbols.map((symbol) => (
                <div
                  key={symbol.symbol}
                  onClick={() => setSelectedSymbol(symbol)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedSymbol?.symbol === symbol.symbol
                      ? 'bg-[var(--accent)]/20 border-[var(--accent)]/50'
                      : 'bg-[var(--background)]/50 hover:bg-[var(--background)] border-transparent'
                  } border`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-[var(--foreground)] text-sm md:text-base">{symbol.symbol}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(symbol.type)}`}>
                          {symbol.type}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)] truncate">{symbol.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{symbol.exchange}</p>
                    </div>
                    {symbol.currentPrice && (
                      <div className="text-left md:text-right flex-shrink-0">
                        <p className="font-medium text-[var(--foreground)] text-sm">₹{symbol.currentPrice.toLocaleString()}</p>
                        <div className="flex items-center space-x-1">
                          <TrendingUp className={`w-3 h-3 ${symbol.change && symbol.change > 0 ? 'text-green-400' : 'text-red-400'}`} />
                          <p className={`text-xs ${symbol.change && symbol.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {symbol.change && symbol.changePercent 
                              ? `${symbol.change > 0 ? '+' : ''}${symbol.change.toFixed(2)} (${symbol.changePercent.toFixed(2)}%)`
                              : '--'
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filteredSymbols.length === 0 && (
                <div className="text-center py-8 text-[var(--muted-foreground)]">
                  No symbols found matching your search
                </div>
              )}
            </div>
          </div>

          {/* Configuration Selection */}
          {selectedSymbol && (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Select Configuration
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableConfigs.map((config) => (
                  <div
                    key={config.id}
                    onClick={() => setSelectedConfigId(config.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedConfigId === config.id
                        ? 'bg-[var(--accent)]/20 border-[var(--accent)]/50'
                        : 'bg-[var(--background)]/50 hover:bg-[var(--background)] border-transparent'
                    } border`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium text-[var(--foreground)] text-sm">{config.name}</span>
                          {config.isCustom && (
                            <span className="px-2 py-1 text-xs bg-[var(--accent)]/20 text-[var(--accent)] rounded-full">
                              Custom
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--muted-foreground)] line-clamp-1">{config.description}</p>
                      </div>
                      <div className="text-left md:text-right text-sm flex-shrink-0">
                        <p className="text-[var(--muted-foreground)]">
                          SL: {config.parameters.stopLoss} | Target: {config.parameters.target}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Summary */}
          {selectedSymbol && selectedConfigId && (
            <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-4">
              <h3 className="font-medium text-[var(--foreground)] mb-2">Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--muted-foreground)]">Symbol</p>
                  <p className="font-medium text-[var(--foreground)]">{selectedSymbol.symbol}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Configuration</p>
                  <p className="font-medium text-[var(--foreground)] truncate">
                    {availableConfigs.find(c => c.id === selectedConfigId)?.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedSymbol || !selectedConfigId}
              className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Symbol
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
