"use client";

import { useState } from "react";
import { Strategy, StrategySymbol } from "./StrategiesPage";
import { 
  Plus, 
  Eye, 
  Settings, 
  TrendingUp, 
  TrendingDown,
  Target,
  Activity,
  Play,
  Pause,
  BarChart3,
  Zap
} from "lucide-react";

interface SymbolsPageProps {
  strategy: Strategy;
  symbols: StrategySymbol[];
  onViewTrades: (symbol: StrategySymbol) => void;
  onAddSymbol: () => void;
}

export function SymbolsPage({ strategy, symbols, onViewTrades, onAddSymbol }: SymbolsPageProps) {
  const [toggleStates, setToggleStates] = useState<Record<number, boolean>>({});

  const handleToggleSymbol = async (symbolId: number, enabled: boolean) => {
    setToggleStates(prev => ({ ...prev, [symbolId]: true }));
    // TODO: Add API call to toggle symbol
    setTimeout(() => {
      setToggleStates(prev => ({ ...prev, [symbolId]: false }));
    }, 1000);
  };

  const formatCurrency = (amount: number) => {
    const isPositive = amount >= 0;
    return `${isPositive ? '+' : ''}₹${Math.abs(amount).toLocaleString()}`;
  };

  const getPnLColor = (amount: number) => {
    return amount >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const totalPnL = symbols.reduce((sum, symbol) => sum + symbol.currentPnL, 0);
  const totalTrades = symbols.reduce((sum, symbol) => sum + symbol.tradeCount, 0);
  const activeSymbols = symbols.filter(s => s.enabled).length;

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

      {/* Symbols Table */}
      <div className="bg-[var(--card-background)]/95 border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-[var(--border)]/50 bg-gradient-to-r from-[var(--card-background)]/50 to-[var(--accent)]/5">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Strategy Symbols</h3>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Manage symbols and their configurations for this strategy
          </p>
        </div>

        {symbols.length === 0 ? (
          <div className="p-6 md:p-8 text-center">
            <div className="w-12 h-12 bg-[var(--accent)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6 text-[var(--accent)]" />
            </div>
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
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Current P&L</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Trades</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Status</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/30">
                  {symbols.map((symbol) => (
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
                          <span className="text-[var(--foreground)]">{symbol.configName}</span>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Settings className="w-4 h-4 text-[var(--muted-foreground)] hover:text-[var(--accent)]" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`font-bold ${getPnLColor(symbol.currentPnL)}`}>
                          {formatCurrency(symbol.currentPnL)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[var(--foreground)] font-medium">{symbol.tradeCount}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          symbol.enabled 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {symbol.enabled ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onViewTrades(symbol)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all duration-200 text-sm border border-blue-500/30 hover:border-blue-500/50"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Trades</span>
                          </button>
                          <button
                            onClick={() => handleToggleSymbol(symbol.id, !symbol.enabled)}
                            disabled={toggleStates[symbol.id]}
                            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm ${
                              symbol.enabled
                                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 hover:border-red-500/50'
                                : 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 hover:border-green-500/50'
                            } ${toggleStates[symbol.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {toggleStates[symbol.id] ? (
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : symbol.enabled ? (
                              <Pause className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                            <span>{symbol.enabled ? 'Pause' : 'Start'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-3 space-y-3">
              {symbols.map((symbol) => (
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
                      <p className="text-xs text-[var(--muted-foreground)]">P&L</p>
                      <p className={`font-bold text-sm ${getPnLColor(symbol.currentPnL)}`}>
                        ₹{Math.round(Math.abs(symbol.currentPnL) / 1000)}K
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[var(--muted-foreground)]">Trades</p>
                      <p className="font-medium text-sm text-[var(--foreground)]">{symbol.tradeCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[var(--muted-foreground)]">Config</p>
                      <p className="font-medium text-xs text-[var(--foreground)] truncate">{symbol.configName.split(' ')[0]}</p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => onViewTrades(symbol)}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all duration-200 text-sm border border-blue-500/30"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Trades</span>
                    </button>
                    <button
                      onClick={() => handleToggleSymbol(symbol.id, !symbol.enabled)}
                      disabled={toggleStates[symbol.id]}
                      className={`flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                        symbol.enabled
                          ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                          : 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30'
                      } ${toggleStates[symbol.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {toggleStates[symbol.id] ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : symbol.enabled ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
