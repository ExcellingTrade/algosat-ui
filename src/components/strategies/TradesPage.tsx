"use client";

import { useState, useEffect, useMemo } from "react";
import { Strategy, StrategySymbol } from "./StrategiesPage";
import { apiClient } from "../../lib/api";
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
  Zap,
  ArrowUpDown
} from "lucide-react";

interface Order {
  id: number;
  strategy_symbol_id: number;
  strike_symbol: string;
  pnl: number;
  entry_price: number;
  exit_price?: number;
  signal_time: string;
  entry_time?: string;
  exit_time?: string;
  status: string;
  quantity?: number;
  traded_price?: number;
  broker_name?: string;
  order_type?: string;
  side?: string;
}

interface TradesPageProps {
  symbol: StrategySymbol;
  strategy: Strategy;
}

export function TradesPage({ symbol, strategy }: TradesPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    symbol: '',
    type: 'all',
    pnl: 'all',
    status: 'all',
    side: 'all',
    date: 'all'
  });
  
  // Sort state
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({
    key: 'signal_time',
    direction: 'desc'
  });

  // Function to parse strike symbol with intelligent parsing for different formats
  const parseStrikeSymbol = (strikeSymbol: string) => {
    if (!strikeSymbol) {
      return { exchange: 'N/A', underlying: 'N/A', strike: 'N/A', type: 'N/A', expiry: 'N/A' };
    }

    // Remove exchange prefix if present (e.g., "NSE:")
    const symbolPart = strikeSymbol.includes(':') ? strikeSymbol.split(':')[1] : strikeSymbol;
    
    // Extract type (CE or PE) from the end
    const typeMatch = symbolPart.match(/(CE|PE)$/);
    const type = typeMatch ? typeMatch[1] : 'N/A';
    
    if (!typeMatch) {
      return { exchange: 'N/A', underlying: symbolPart, strike: 'N/A', type: 'N/A', expiry: 'N/A' };
    }

    // Remove type from symbol to get the rest
    const withoutType = symbolPart.slice(0, -2);
    const exchange = strikeSymbol.includes(':') ? strikeSymbol.split(':')[0] : 'NSE';
    
    // Intelligent parsing based on different patterns
    let underlying = 'N/A';
    let strike = 'N/A';
    let expiry = 'N/A';

    // Pattern 1: BANKNIFTY25JUL32000CE -> BANKNIFTY, 25JUL, 32000
    if (withoutType.match(/^BANKNIFTY\d{2}[A-Z]{3}\d+$/)) {
      const match = withoutType.match(/^(BANKNIFTY)(\d{2}[A-Z]{3})(\d+)$/);
      if (match) {
        underlying = match[1];
        expiry = match[2];
        strike = match[3];
      }
    }
    // Pattern 2: NIFTY2570325600CE -> NIFTY, complex expiry/strike pattern
    else if (withoutType.match(/^NIFTY\d+$/)) {
      const match = withoutType.match(/^(NIFTY)(\d+)$/);
      if (match) {
        underlying = match[1];
        const numbers = match[2];
        // For NIFTY, assume last 5 digits are strike, rest is expiry
        if (numbers.length >= 5) {
          strike = numbers.slice(-5);
          expiry = numbers.slice(0, -5);
        } else {
          strike = numbers;
          expiry = 'N/A';
        }
      }
    }
    // Pattern 3: SBIN25JUL520CE -> SBIN, 25JUL, 520 (Equity with monthly expiry)
    else if (withoutType.match(/^[A-Z]+\d{2}[A-Z]{3}\d+$/)) {
      const match = withoutType.match(/^([A-Z]+)(\d{2}[A-Z]{3})(\d+)$/);
      if (match) {
        underlying = match[1];
        expiry = match[2];
        strike = match[3];
      }
    }
    // Pattern 4: Generic fallback - try to extract last digits as strike
    else {
      const strikeMatch = withoutType.match(/(\d+)$/);
      if (strikeMatch) {
        strike = strikeMatch[1];
        const remainingPart = withoutType.slice(0, -strikeMatch[1].length);
        
        // Try to extract expiry (digits + letters pattern)
        const expiryMatch = remainingPart.match(/(\d{2}[A-Z]{3})$/);
        if (expiryMatch) {
          expiry = expiryMatch[1];
          underlying = remainingPart.slice(0, -expiryMatch[1].length);
        } else {
          underlying = remainingPart;
        }
      } else {
        underlying = withoutType;
      }
    }

    return { exchange, underlying, strike, type, expiry };
  };


  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Apply filters and sorting using the same logic as Orders tab
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter((order: any) => {
      const parsed = parseStrikeSymbol(order.strike_symbol || '');
      
      // Type filter  
      if (filters.type !== 'all' && parsed.type !== filters.type) {
        return false;
      }
      
      // P&L filter
      if (filters.pnl !== 'all') {
        const pnl = Number(order.pnl || 0);
        if (filters.pnl === 'profit' && pnl <= 0) return false;
        if (filters.pnl === 'loss' && pnl >= 0) return false;
        if (filters.pnl === 'breakeven' && pnl !== 0) return false;
      }
      
      // Status filter
      if (filters.status !== 'all' && order.status !== filters.status) {
        return false;
      }
      
      // Side filter
      if (filters.side !== 'all' && order.side !== filters.side) {
        return false;
      }
      
      // Date filter
      if (filters.date !== 'all') {
        const orderDate = new Date(order.signal_time).toISOString().split('T')[0];
        if (orderDate !== filters.date) return false;
      }
      
      return true;
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal: any = a[sortConfig.key as keyof typeof a];
        let bVal: any = b[sortConfig.key as keyof typeof b];
        
        // Handle special cases for parsing
        if (sortConfig.key === 'underlying') {
          aVal = parseStrikeSymbol(a.strike_symbol || '').underlying;
          bVal = parseStrikeSymbol(b.strike_symbol || '').underlying;
        } else if (sortConfig.key === 'type') {
          aVal = parseStrikeSymbol(a.strike_symbol || '').type;
          bVal = parseStrikeSymbol(b.strike_symbol || '').type;
        } else if (sortConfig.key === 'strike') {
          aVal = Number(parseStrikeSymbol(a.strike_symbol || '').strike) || 0;
          bVal = Number(parseStrikeSymbol(b.strike_symbol || '').strike) || 0;
        } else if (sortConfig.key === 'pnl') {
          aVal = Number(a.pnl || 0);
          bVal = Number(b.pnl || 0);
        }
        
        // Handle undefined values
        if (aVal === undefined && bVal === undefined) return 0;
        if (aVal === undefined) return 1;
        if (bVal === undefined) return -1;
        
        // Handle different data types
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [orders, filters, sortConfig]);

  const filteredTrades = filteredAndSortedOrders;

  const formatCurrency = (amount: number) => {
    const isPositive = amount >= 0;
    return `${isPositive ? '+' : ''}₹${Math.abs(amount).toLocaleString()}`;
  };

  // Color utility functions matching Orders page exactly
  const getPnLColor = (pnl: number) => {
    if (pnl > 0) {
      return 'text-green-400';
    } else if (pnl < 0) {
      return 'text-red-400';
    } else {
      return 'text-[var(--muted-foreground)]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/50';
      case 'CLOSED':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/50';
      case 'AWAITING_ENTRY':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/50';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-400 border border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/50';
    }
  };

  const getSideColor = (side: string) => {
    switch (side?.toUpperCase()) {
      case 'BUY':
        return 'bg-green-500/20 text-green-400 border border-green-500/50';
      case 'SELL':
        return 'bg-red-500/20 text-red-400 border border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/50';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'CE':
        return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50';
      case 'PE':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/50';
    }
  };

  // Fetch trades for this specific symbol using the symbol ID
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Fetching trades for symbol ID:', symbol.id);
        
        // Use the existing getSymbolTrades API that takes symbol_id directly
        const response = await apiClient.getSymbolTrades(symbol.id, 1000);
        console.log('Symbol trades response:', response);
        
        setOrders(response.trades || []);
      } catch (err) {
        console.error('Failed to fetch trades:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trades');
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (symbol.id) {
      fetchTrades();
    }
  }, [symbol.id]);

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStrikeTypeColor = (type: string) => {
    if (type === 'CE') return 'text-cyan-400 bg-cyan-500/20 border border-cyan-500/30 shadow-sm';
    if (type === 'PE') return 'text-purple-400 bg-purple-500/20 border border-purple-500/30 shadow-sm';
    return 'text-gray-400 bg-gray-500/20 border border-gray-500/30 shadow-sm';
  };

  // Calculate summary stats from filtered orders
  const stats = useMemo(() => {
    const totalPnL = filteredAndSortedOrders.reduce((sum, order) => sum + (order.pnl || 0), 0);
    const totalOrders = filteredAndSortedOrders.length;
    const openOrders = filteredAndSortedOrders.filter(o => o.status === 'OPEN').length;
    const closedOrders = filteredAndSortedOrders.filter(o => o.status === 'CLOSED').length;
    const winningOrders = filteredAndSortedOrders.filter(o => o.status === 'CLOSED' && (o.pnl || 0) > 0).length;
    const winRate = closedOrders > 0 ? Math.round((winningOrders / closedOrders) * 100) : 0;

    return { totalPnL, totalOrders, openOrders, closedOrders, winRate };
  }, [filteredAndSortedOrders]);

  // Get available dates for filter
  const availableDates = useMemo(() => {
    const dates = orders
      .map(order => order.signal_time ? new Date(order.signal_time).toISOString().split('T')[0] : '')
      .filter(date => date !== '')
      .filter((date, index, arr) => arr.indexOf(date) === index)
      .sort()
      .reverse();
    return dates;
  }, [orders]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--card-background)]/95 border border-[var(--border)] rounded-xl p-4 shadow-lg">
          <div className="animate-pulse">
            <div className="h-6 bg-[var(--muted)]/20 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-[var(--muted)]/20 rounded w-1/2"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-[var(--card-background)]/95 border border-[var(--border)] rounded-lg p-3">
              <div className="animate-pulse">
                <div className="h-3 bg-[var(--muted)]/20 rounded w-full mb-2"></div>
                <div className="h-6 bg-[var(--muted)]/20 rounded w-2/3 mx-auto"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <div className="text-center">
          <h3 className="text-red-400 font-semibold text-lg mb-2">Error Loading Trades</h3>
          <p className="text-red-400/80">{error}</p>
        </div>
      </div>
    );
  }

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
              Config: <span className="text-[var(--accent)]">{symbol.config_name || 'Default'}</span>
            </p>
          </div>
          <button className="flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all duration-200 border border-blue-500/50 hover:border-blue-500/60 flex-shrink-0 w-full sm:w-auto">
            <Download className="w-4 h-4" />
            <span className="font-medium">Export</span>
          </button>
        </div>
      </div>

      {/* Trades Summary Stats */}
      <div className="grid grid-cols-5 gap-2 md:gap-3">
        <div className="bg-gray-500/20 border border-gray-500/50 rounded-xl p-2 md:p-4 shadow-lg">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-gray-400 text-xs font-medium">Total</p>
            <p className="text-sm md:text-xl font-bold text-[var(--foreground)]">{stats.totalOrders}</p>
          </div>
        </div>

        <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-2 md:p-4 shadow-lg">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center mb-2">
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-blue-400 text-xs font-medium">Open</p>
            <p className="text-sm md:text-xl font-bold text-blue-400">{stats.openOrders}</p>
          </div>
        </div>

        <div className="bg-purple-500/20 border border-purple-500/50 rounded-xl p-2 md:p-4 shadow-lg">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-purple-400 text-xs font-medium">Closed</p>
            <p className="text-sm md:text-xl font-bold text-purple-400">{stats.closedOrders}</p>
          </div>
        </div>

        <div className="bg-orange-500/20 border border-orange-500/50 rounded-xl p-2 md:p-4 shadow-lg">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center mb-2">
              <Target className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-orange-400 text-xs font-medium">Win Rate</p>
            <p className="text-sm md:text-xl font-bold text-orange-400">{stats.winRate}%</p>
          </div>
        </div>

        <div className={`${stats.totalPnL >= 0 ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/20 border-red-500/50'} border rounded-xl p-2 md:p-4 shadow-lg`}>
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center mb-2">
              {stats.totalPnL >= 0 ? 
                <TrendingUp className="w-4 h-4 text-green-400" /> : 
                <TrendingDown className="w-4 h-4 text-red-400" />
              }
            </div>
            <p className={`text-xs font-medium ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>P&L</p>
            <p className={`text-sm md:text-xl font-bold ${getPnLColor(stats.totalPnL)}`}>
              <span className="md:hidden">
                {stats.totalPnL >= 0 ? '+' : ''}₹{(Math.abs(stats.totalPnL) / 1000).toFixed(0)}K
              </span>
              <span className="hidden md:inline">
                {formatCurrency(stats.totalPnL)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--card-background)]/95 border border-[var(--border)] rounded-xl p-3 md:p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Filter className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Filters</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
          {/* Type Filter */}
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-2 py-1 bg-[var(--background)]/50 border border-[var(--border)] rounded text-xs focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All Types</option>
              <option value="CE">Call (CE)</option>
              <option value="PE">Put (PE)</option>
            </select>
          </div>

          {/* P&L Filter */}
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">P&L</label>
            <select
              value={filters.pnl}
              onChange={(e) => setFilters(prev => ({ ...prev, pnl: e.target.value }))}
              className="w-full px-2 py-1 bg-[var(--background)]/50 border border-[var(--border)] rounded text-xs focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All P&L</option>
              <option value="profit">Profit</option>
              <option value="loss">Loss</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-2 py-1 bg-[var(--background)]/50 border border-[var(--border)] rounded text-xs focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All Status</option>
              <option value="AWAITING_ENTRY">Awaiting Entry</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Side Filter */}
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">Side</label>
            <select
              value={filters.side}
              onChange={(e) => setFilters(prev => ({ ...prev, side: e.target.value }))}
              className="w-full px-2 py-1 bg-[var(--background)]/50 border border-[var(--border)] rounded text-xs focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All Sides</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">Date</label>
            <select
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-2 py-1 bg-[var(--background)]/50 border border-[var(--border)] rounded text-xs focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All Dates</option>
              {availableDates.map(date => (
                <option key={date} value={date}>{formatDate(date)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mt-3 pt-3 border-t border-[var(--border)]/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--muted-foreground)]">
              Showing {filteredAndSortedOrders.length} of {orders.length} trades
            </span>
            <button
              onClick={() => setFilters({
                symbol: '',
                type: 'all',
                pnl: 'all',
                status: 'all',
                side: 'all',
                date: 'all'
              })}
              className="text-[var(--accent)] hover:text-blue-300 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[var(--card-background)]/95 border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-[var(--border)]/50 bg-gradient-to-r from-[var(--card-background)]/50 to-[var(--accent)]/5">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Symbol Trades</h3>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            All trades/orders for {symbol.symbol} from strategy {strategy.name}
          </p>
        </div>

        {filteredAndSortedOrders.length === 0 ? (
          <div className="p-6 md:p-8 text-center">
            <div className="w-12 h-12 bg-[var(--accent)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-6 h-6 text-[var(--accent)]" />
            </div>
            {orders.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No Trades Found</h3>
                <p className="text-[var(--muted-foreground)]">
                  No trades have been executed for {symbol.symbol} yet
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No Matches</h3>
                <p className="text-[var(--muted-foreground)] mb-4">
                  No trades match the current filter criteria
                </p>
                <button
                  onClick={() => setFilters({
                    symbol: '',
                    type: 'all',
                    pnl: 'all',
                    status: 'all',
                    side: 'all',
                    date: 'all'
                  })}
                  className="px-4 py-2 bg-[var(--accent)]/20 hover:bg-[var(--accent)]/30 text-[var(--accent)] rounded-lg transition-all duration-200 border border-[var(--accent)]/30"
                >
                  Clear All Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto bg-[var(--card-background)]/50 rounded-xl border border-[var(--border)] shadow-lg">
              <table className="w-full">
                <thead className="bg-[var(--muted)]/10 border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left py-4 px-6">
                      <button
                        onClick={() => handleSort('strike_symbol')}
                        className="flex items-center space-x-1 text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                      >
                        <span>Strike</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left py-4 px-6">
                      <button
                        onClick={() => handleSort('type')}
                        className="flex items-center space-x-1 text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                      >
                        <span>Type</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left py-4 px-6">
                      <button
                        onClick={() => handleSort('pnl')}
                        className="flex items-center space-x-1 text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                      >
                        <span>P&L</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left py-4 px-6">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center space-x-1 text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                      >
                        <span>Status</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left py-4 px-6">
                      <button
                        onClick={() => handleSort('side')}
                        className="flex items-center space-x-1 text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                      >
                        <span>Side</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left py-4 px-6">
                      <button
                        onClick={() => handleSort('entry_price')}
                        className="flex items-center space-x-1 text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                      >
                        <span>Entry Price</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left py-4 px-6">
                      <button
                        onClick={() => handleSort('exit_price')}
                        className="flex items-center space-x-1 text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                      >
                        <span>Exit Price</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left py-4 px-6">
                      <button
                        onClick={() => handleSort('signal_time')}
                        className="flex items-center space-x-1 text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                      >
                        <span>Entry Time</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/30">
                  {filteredAndSortedOrders.map((order, index) => {
                    const parsed = parseStrikeSymbol(order.strike_symbol || '');
                    return (
                    <tr 
                      key={order.id} 
                      className={`${
                        index % 2 === 0 ? 'bg-[var(--background)]/20' : 'bg-[var(--card-background)]/20'
                      } hover:bg-[var(--accent)]/10 transition-all duration-200`}
                    >
                      <td className="py-4 px-6">
                        <span className="font-semibold text-[var(--foreground)]">
                          {parsed.strike ? `₹${parsed.strike}` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {parsed.type && (parsed.type === 'CE' || parsed.type === 'PE') && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStrikeTypeColor(parsed.type)}`}>
                            {parsed.type}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className={`inline-flex items-center px-3 py-2 rounded-lg font-bold text-sm shadow-sm ${
                          order.pnl && order.pnl > 0 
                            ? 'bg-green-500/10' 
                            : order.pnl && order.pnl < 0 
                              ? 'bg-red-500/10' 
                              : 'bg-gray-500/10'
                        }`}>
                          {order.pnl && order.pnl > 0 && <TrendingUp className="w-4 h-4 mr-1" />}
                          {order.pnl && order.pnl < 0 && <TrendingDown className="w-4 h-4 mr-1" />}
                          <span className={getPnLColor(order.pnl || 0)}>
                            {formatCurrency(order.pnl || 0)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-sm ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-sm ${getSideColor(order.side || 'N/A')}`}>
                          {order.side || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[var(--foreground)]">
                          {order.entry_price ? `₹${order.entry_price.toLocaleString()}` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[var(--foreground)]">
                          {order.exit_price ? `₹${order.exit_price.toLocaleString()}` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm">
                          <div className="text-[var(--foreground)]">
                            {formatDate(order.signal_time)}
                          </div>
                          <div className="text-[var(--muted-foreground)]">
                            {formatTime(order.signal_time)}
                          </div>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-3 space-y-3">
              {filteredAndSortedOrders.map((order) => {
                const parsed = parseStrikeSymbol(order.strike_symbol || '');
                return (
                <div
                  key={order.id}
                  className="bg-gradient-to-br from-[var(--card-background)]/70 to-[var(--background)]/50 border border-[var(--border)] rounded-xl p-4 hover:border-[var(--accent)]/50 hover:shadow-lg transition-all duration-300 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-[var(--foreground)]">
                        {parsed.strike ? `₹${parsed.strike}` : 'N/A'}
                      </span>
                      {parsed.type && (parsed.type === 'CE' || parsed.type === 'PE') && (
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-sm ${getStrikeTypeColor(parsed.type)}`}>
                          {parsed.type}
                        </span>
                      )}
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-sm ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">P&L</p>
                      <div className={`inline-flex items-center px-2 py-1 rounded-lg shadow-sm ${
                        order.pnl && order.pnl > 0 
                          ? 'bg-green-500/10' 
                          : order.pnl && order.pnl < 0 
                            ? 'bg-red-500/10' 
                            : 'bg-gray-500/10'
                      }`}>
                        {order.pnl && order.pnl > 0 && <TrendingUp className="w-3 h-3 mr-1" />}
                        {order.pnl && order.pnl < 0 && <TrendingDown className="w-3 h-3 mr-1" />}
                        <span className={`font-bold text-sm ${getPnLColor(order.pnl || 0)}`}>
                          ₹{Math.round(Math.abs(order.pnl || 0) / 1000)}K
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">Side</p>
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-sm ${getSideColor(order.side || 'N/A')}`}>
                        {order.side || 'N/A'}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[var(--muted-foreground)]">Entry</p>
                      <p className="font-medium text-xs text-[var(--foreground)]">
                        {order.entry_price ? `₹${order.entry_price.toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[var(--border)]/30">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--muted-foreground)]">
                        {formatDate(order.signal_time)} • {formatTime(order.signal_time)}
                      </span>
                      {order.exit_price && (
                        <span className="text-[var(--foreground)]">
                          Exit: ₹{order.exit_price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
