"use client";

import { useState } from "react";
import { Strategy, StrategySymbol, Trade } from "./StrategiesPage";
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Activity,
  Filter,
  Download,
  BarChart3,
  Zap
} from "lucide-react";

interface TradesPageProps {
  symbol: StrategySymbol;
  strategy: Strategy;
}

export function TradesPage({ symbol, strategy }: TradesPageProps) {
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');

  // Sample trades data - replace with API call
  const [trades] = useState<Trade[]>([
    {
      id: 1,
      symbolId: symbol.id,
      symbol: symbol.symbol,
      strike: "21000CE",
      type: 'CE',
      entryTime: "2024-06-09T09:25:00Z",
      entryPrice: 125.50,
      exitTime: "2024-06-09T10:15:00Z",
      exitPrice: 142.25,
      pnl: 1675.00,
      status: 'CLOSED',
      quantity: 100
    },
    {
      id: 2,
      symbolId: symbol.id,
      symbol: symbol.symbol,
      strike: "20800PE",
      type: 'PE',
      entryTime: "2024-06-09T10:30:00Z",
      entryPrice: 98.75,
      exitTime: "2024-06-09T11:45:00Z",
      exitPrice: 87.20,
      pnl: -1155.00,
      status: 'CLOSED',
      quantity: 100
    },
    {
      id: 3,
      symbolId: symbol.id,
      symbol: symbol.symbol,
      strike: "21200CE",
      type: 'CE',
      entryTime: "2024-06-09T14:15:00Z",
      entryPrice: 178.30,
      pnl: -890.00,
      status: 'OPEN',
      quantity: 50
    },
    {
      id: 4,
      symbolId: symbol.id,
      symbol: symbol.symbol,
      strike: "20900PE",
      type: 'PE',
      entryTime: "2024-06-09T14:45:00Z",
      entryPrice: 156.85,
      pnl: 425.00,
      status: 'OPEN',
      quantity: 25
    }
  ]);

  const filteredTrades = trades.filter(trade => {
    if (filterStatus !== 'all' && trade.status.toLowerCase() !== filterStatus) {
      return false;
    }
    if (selectedDate !== 'all') {
      const tradeDate = new Date(trade.entryTime).toISOString().split('T')[0];
      return tradeDate === selectedDate;
    }
    return true;
  });

  const formatCurrency = (amount: number) => {
    const isPositive = amount >= 0;
    return `${isPositive ? '+' : ''}₹${Math.abs(amount).toLocaleString()}`;
  };

  const getPnLColor = (amount: number) => {
    return amount >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStrikeTypeColor = (type: 'PE' | 'CE') => {
    return type === 'CE' ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20';
  };

  // Calculate summary stats
  const totalPnL = filteredTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  const openTrades = filteredTrades.filter(t => t.status === 'OPEN').length;
  const closedTrades = filteredTrades.filter(t => t.status === 'CLOSED').length;
  const winningTrades = filteredTrades.filter(t => t.status === 'CLOSED' && t.pnl > 0).length;
  const winRate = closedTrades > 0 ? Math.round((winningTrades / closedTrades) * 100) : 0;

  const availableDates = Array.from(new Set(
    trades.map(trade => new Date(trade.entryTime).toISOString().split('T')[0])
  )).sort().reverse();

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Symbol & Strategy Info */}
      <div className="bg-[var(--card-background)]/95 border border-[var(--border)] rounded-xl p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                symbol.enabled 
                  ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' 
                  : 'bg-red-400'
              }`}></div>
              <h2 className="text-lg md:text-xl font-bold text-[var(--foreground)] truncate">{symbol.symbol} Trades</h2>
              <span className="text-sm text-[var(--muted-foreground)] truncate">from {strategy.name}</span>
            </div>
            <p className="text-[var(--muted-foreground)] text-sm">
              Config: <span className="text-[var(--accent)]">{symbol.configName}</span>
            </p>
          </div>
          <button className="flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all duration-200 border border-blue-500/30 hover:border-blue-500/50 flex-shrink-0 w-full sm:w-auto">
            <Download className="w-4 h-4" />
            <span className="font-medium">Export</span>
          </button>
        </div>
      </div>

      {/* Trades Summary Stats */}
      <div className="grid grid-cols-5 gap-2 md:gap-3">
        <div className="bg-[var(--card-background)]/95 border border-[var(--border)] rounded-lg p-2 md:p-3">
          <div className="text-center space-y-1">
            <p className="text-[var(--muted-foreground)] text-xs">Total</p>
            <p className="text-sm md:text-xl font-bold text-[var(--foreground)]">{filteredTrades.length}</p>
          </div>
        </div>

        <div className="bg-[var(--card-background)]/95 border border-green-500/30 rounded-lg p-2 md:p-3">
          <div className="text-center space-y-1">
            <p className="text-green-300 text-xs">Open</p>
            <p className="text-sm md:text-xl font-bold text-green-400">{openTrades}</p>
          </div>
        </div>

        <div className="bg-[var(--card-background)]/95 border border-blue-500/30 rounded-lg p-2 md:p-3">
          <div className="text-center space-y-1">
            <p className="text-blue-300 text-xs">Closed</p>
            <p className="text-sm md:text-xl font-bold text-blue-400">{closedTrades}</p>
          </div>
        </div>

        <div className="bg-[var(--card-background)]/95 border border-purple-500/30 rounded-lg p-2 md:p-3">
          <div className="text-center space-y-1">
            <p className="text-purple-300 text-xs">Win Rate</p>
            <p className="text-sm md:text-xl font-bold text-purple-400">{winRate}%</p>
          </div>
        </div>

        <div className="bg-[var(--card-background)]/95 border border-yellow-500/30 rounded-lg p-2 md:p-3">
          <div className="text-center space-y-1">
            <p className="text-yellow-300 text-xs">P&L</p>
            <p className={`text-sm md:text-xl font-bold ${getPnLColor(totalPnL)}`}>
              <span className="md:hidden">
                {totalPnL >= 0 ? '+' : ''}₹{(Math.abs(totalPnL) / 1000).toFixed(0)}K
              </span>
              <span className="hidden md:inline">
                {formatCurrency(totalPnL)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--card-background)]/95 border border-[var(--border)] rounded-xl p-3 md:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Filter className="w-4 h-4 text-[var(--muted-foreground)]" />
            <span className="text-sm font-medium text-[var(--foreground)]">Filters:</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 bg-[var(--background)]/50 border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            >
              <option value="all">All Dates</option>
              {availableDates.map(date => (
                <option key={date} value={date}>
                  {formatDate(date + 'T00:00:00Z')}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'open' | 'closed')}
              className="flex-1 sm:flex-none px-3 py-2 bg-[var(--background)]/50 border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            >
              <option value="all">All Status</option>
              <option value="open">Open Trades</option>
              <option value="closed">Closed Trades</option>
            </select>

            {(selectedDate !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSelectedDate('all');
                  setFilterStatus('all');
                }}
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all duration-200 text-sm border border-red-500/30 hover:border-red-500/50 flex-shrink-0"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-[var(--card-background)]/95 border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="p-3 md:p-4 border-b border-[var(--border)]/50">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Trade History</h3>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {filteredTrades.length} trades shown
          </p>
        </div>

        {filteredTrades.length === 0 ? (
          <div className="p-6 md:p-12 text-center">
            <div className="w-12 md:w-16 h-12 md:h-16 bg-[var(--accent)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-6 md:w-8 h-6 md:h-8 text-[var(--accent)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No Trades Found</h3>
            <p className="text-[var(--muted-foreground)] text-sm md:text-base">
              {selectedDate !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters to see more trades'
                : 'No trades have been executed yet for this symbol'
              }
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--background)]/50">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Strike</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Entry Time</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Entry Price</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Exit Time</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Exit Price</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Quantity</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">P&L</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted-foreground)]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/30">
                  {filteredTrades.map((trade) => (
                    <tr 
                      key={trade.id} 
                      className="hover:bg-[var(--background)]/30 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-[var(--foreground)]">
                            {trade.strike.replace(/[CE|PE]/g, '')}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStrikeTypeColor(trade.type)}`}>
                            {trade.type}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-[var(--foreground)]">
                          <div className="font-medium">{formatDate(trade.entryTime)}</div>
                          <div className="text-sm text-[var(--muted-foreground)]">{formatTime(trade.entryTime)}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-medium text-[var(--foreground)]">₹{trade.entryPrice}</span>
                      </td>
                      <td className="py-4 px-6">
                        {trade.exitTime ? (
                          <div className="text-[var(--foreground)]">
                            <div className="font-medium">{formatDate(trade.exitTime)}</div>
                            <div className="text-sm text-[var(--muted-foreground)]">{formatTime(trade.exitTime)}</div>
                          </div>
                        ) : (
                          <span className="text-[var(--muted-foreground)] text-sm">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {trade.exitPrice ? (
                          <span className="font-medium text-[var(--foreground)]">₹{trade.exitPrice}</span>
                        ) : (
                          <span className="text-[var(--muted-foreground)] text-sm">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[var(--foreground)] font-medium">{trade.quantity}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`font-bold ${getPnLColor(trade.pnl)}`}>
                          {formatCurrency(trade.pnl)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          trade.status === 'OPEN' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {trade.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-2 p-3">
              {filteredTrades.map((trade) => (
                <div 
                  key={trade.id}
                  className="bg-[var(--background)]/50 border border-[var(--border)] rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-[var(--foreground)] text-sm">
                        {trade.strike.replace(/[CE|PE]/g, '')}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStrikeTypeColor(trade.type)}`}>
                        {trade.type}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      trade.status === 'OPEN' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {trade.status}
                    </span>
                  </div>

                  <div className="text-center py-1">
                    <span className={`text-lg font-bold ${getPnLColor(trade.pnl)}`}>
                      {trade.pnl >= 0 ? '+' : ''}₹{(Math.abs(trade.pnl) / 1000).toFixed(1)}K
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[var(--muted-foreground)]">Entry</p>
                      <p className="font-medium text-[var(--foreground)]">₹{trade.entryPrice}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {formatTime(trade.entryTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--muted-foreground)]">Exit</p>
                      <p className="font-medium text-[var(--foreground)]">
                        {trade.exitPrice ? `₹${trade.exitPrice}` : '-'}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {trade.exitTime ? formatTime(trade.exitTime) : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="text-center pt-1 border-t border-[var(--border)]">
                    <span className="text-xs text-[var(--muted-foreground)]">Qty: </span>
                    <span className="font-medium text-[var(--foreground)] text-xs">{trade.quantity}</span>
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
