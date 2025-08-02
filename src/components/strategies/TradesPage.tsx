"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Strategy, StrategySymbol } from "./StrategiesPage";
import { apiClient } from "../../lib/api";
import { useToast } from "../Toast";
import { 
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Activity,
  Filter,
  Download,
  BarChart3,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Eye,
  LogOut,
  Loader2
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface BrokerExecution {
  id: number;
  broker_order_id: string;
  side: string;
  execution_price: number;
  executed_quantity: number;
  execution_time: string;
  order_type: string;
  product_type: string;
  status: string;
  broker_name: string;
}

interface BrokerExecutionSummary {
  broker_name: string;
  broker_order_id: string;
  status: string;
  entry_price?: number;
  exit_price?: number;
  entry_quantity?: number;
  exit_quantity?: number;
  entry_time?: string;
  exit_time?: string;
  total_pnl?: number;
  net_quantity: number;
  total_value: number;
  has_entry: boolean;
  has_exit: boolean;
  order_type?: string;
  product_type?: string;
  raw_executions: BrokerExecution[];
}

interface Order {
  qty: number;
  id: number;
  strategy_symbol_id: number;
  strike_symbol: string;
  pnl: number;
  entry_price: number;
  executed_quantity: number;
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
  broker_executions?: BrokerExecution[];
}

interface TradesPageProps {
  symbol: StrategySymbol;
  strategy: Strategy;
}

export function TradesPage({ symbol, strategy }: TradesPageProps) {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTrades, setTotalTrades] = useState(0);
  const [exitingOrders, setExitingOrders] = useState<Set<number>>(new Set());
  
  // Expandable rows state for broker executions
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  
  // Filter states
  const [filters, setFilters] = useState({
    symbol: '',
    type: 'all',
    pnl: 'all',
    status: 'all',
    side: 'all',
    date: 'all',
    broker: 'all'
  });
  
  // Collapsible state for old trades
  const [showOldTrades, setShowOldTrades] = useState(false);
  
  // Sort state
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({
    key: 'signal_time',
    direction: 'desc'
  });

  // Function to toggle row expansion for broker executions
  const toggleRowExpansion = (orderId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Helper function to get broker name color
  const getBrokerNameColor = (brokerName: string) => {
    const colors = {
      'ZERODHA': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      'FYERS': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'ANGEL': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      'UPSTOX': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'ICICI': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
    };
    return colors[brokerName as keyof typeof colors] || 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  };

  // Helper function to get execution status color
  const getExecutionStatusColor = (status: string) => {
    const colors = {
      'COMPLETE': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'CANCELLED': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'REJECTED': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'PENDING': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'PARTIAL': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  };

  // Helper function to format execution time
  const formatExecutionTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'N/A';
    }
  };

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

  // Function to group and summarize broker executions per broker per order
  const groupBrokerExecutions = (executions: BrokerExecution[]): BrokerExecutionSummary[] => {
    if (!executions || executions.length === 0) return [];

    // Group by broker_name and broker_order_id
    const grouped = executions.reduce((acc, execution) => {
      const key = `${execution.broker_name}_${execution.broker_order_id}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(execution);
      return acc;
    }, {} as Record<string, BrokerExecution[]>);

    // Convert groups to summary objects
    const summaries = Object.entries(grouped).map(([key, execList]) => {
      const [broker_name, broker_order_id] = key.split('_');
      
      // Separate ENTRY and EXIT executions
      const entryExecutions = execList.filter(e => e.side === 'ENTRY');
      const exitExecutions = execList.filter(e => e.side === 'EXIT');
      
      // Calculate weighted average prices and total quantities
      const calculateWeightedAverage = (executions: BrokerExecution[]) => {
        const totalQuantity = executions.reduce((sum, e) => sum + e.executed_quantity, 0);
        const totalValue = executions.reduce((sum, e) => sum + (e.execution_price * e.executed_quantity), 0);
        return totalQuantity > 0 ? totalValue / totalQuantity : 0;
      };

      const entryQuantity = entryExecutions.reduce((sum, e) => sum + e.executed_quantity, 0);
      const exitQuantity = exitExecutions.reduce((sum, e) => sum + e.executed_quantity, 0);
      const entryPrice = calculateWeightedAverage(entryExecutions);
      const exitPrice = calculateWeightedAverage(exitExecutions);

      // Calculate P&L (for long positions: (exit_price - entry_price) * quantity)
      // For short positions, it would be opposite, but we'll assume long for now
      const pnl = (entryPrice > 0 && exitPrice > 0) ? (exitPrice - entryPrice) * Math.min(entryQuantity, exitQuantity) : undefined;

      // Get latest status (prefer COMPLETE, then PARTIAL, then others)
      const allStatuses = execList.map(e => e.status);
      const status = allStatuses.includes('COMPLETE') ? 'COMPLETE' :
                    allStatuses.includes('PARTIAL') ? 'PARTIAL' :
                    allStatuses.includes('FILLED') ? 'FILLED' :
                    allStatuses.includes('PENDING') ? 'PENDING' :
                    allStatuses.includes('REJECTED') ? 'REJECTED' :
                    allStatuses.includes('CANCELLED') ? 'CANCELLED' :
                    allStatuses[0];

      // Get earliest entry time and latest exit time
      const entryTime = entryExecutions.length > 0 ? 
        entryExecutions.reduce((earliest, e) => e.execution_time < earliest ? e.execution_time : earliest, entryExecutions[0].execution_time) : 
        undefined;
      const exitTime = exitExecutions.length > 0 ? 
        exitExecutions.reduce((latest, e) => e.execution_time > latest ? e.execution_time : latest, exitExecutions[0].execution_time) : 
        undefined;

      // Calculate total value (sum of all execution values)
      const totalValue = execList.reduce((sum, e) => sum + (e.execution_price * e.executed_quantity), 0);

      // Net quantity (entry - exit)
      const netQuantity = entryQuantity - exitQuantity;

      // Get order type and product type (use first available)
      const orderType = execList.find(e => e.order_type)?.order_type;
      const productType = execList.find(e => e.product_type)?.product_type;

      return {
        broker_name,
        broker_order_id,
        status,
        entry_price: entryPrice > 0 ? entryPrice : undefined,
        exit_price: exitPrice > 0 ? exitPrice : undefined,
        entry_quantity: entryQuantity > 0 ? entryQuantity : undefined,
        exit_quantity: exitQuantity > 0 ? exitQuantity : undefined,
        entry_time: entryTime,
        exit_time: exitTime,
        total_pnl: pnl,
        net_quantity: netQuantity,
        total_value: totalValue,
        has_entry: entryExecutions.length > 0,
        has_exit: exitExecutions.length > 0,
        order_type: orderType,
        product_type: productType,
        raw_executions: execList.sort((a, b) => {
          try {
            const dateA = new Date(a.execution_time).getTime();
            const dateB = new Date(b.execution_time).getTime();
            if (isNaN(dateA) || isNaN(dateB)) return 0;
            return dateA - dateB;
          } catch {
            return 0;
          }
        })
      };
    });

    // Sort by status priority (COMPLETE/FILLED first, then PARTIAL, then others)
    const statusPriority = { 'COMPLETE': 1, 'FILLED': 1, 'PARTIAL': 2, 'PENDING': 3, 'REJECTED': 4, 'CANCELLED': 5 };
    return summaries.sort((a, b) => {
      const priorityA = statusPriority[a.status as keyof typeof statusPriority] || 6;
      const priorityB = statusPriority[b.status as keyof typeof statusPriority] || 6;
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      // If same priority, sort by broker name
      return a.broker_name.localeCompare(b.broker_name);
    });
  };

  // Handle exit order
  const handleExitOrder = async (orderId: number) => {
    if (!confirm('⚠️ EXIT ORDER: This will attempt to exit this order/position. Are you sure?')) {
      return;
    }

    setExitingOrders(prev => new Set(prev).add(orderId));

    try {
      console.log('Attempting to exit order:', orderId);

      showToast({
        type: "info",
        title: "Exiting Order",
        message: "Initiating exit for the order. Please wait..."
      });

      // Call the exit order API endpoint
      const response = await apiClient.exitOrder(orderId, 'manual');

      console.log('Exit order response:', response);

      if (response.success) {
        showToast({
          type: "success",
          title: "Order Exit Initiated",
          message: response.message || "Order has been scheduled for exit successfully"
        });

        // Refresh the orders data to show updated status
        await fetchTrades(1, true, filters.date !== 'all' ? filters.date : null);
      } else {
        showToast({
          type: "error",
          title: "Order Exit Failed",
          message: response.message || "Failed to exit order"
        });
      }
    } catch (err) {
      console.error('Exit order failed:', err);
      const errorMessage = err instanceof Error ? err.message : "Failed to exit order";

      showToast({
        type: "error",
        title: "Order Exit Failed",
        message: errorMessage
      });
    } finally {
      setExitingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
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
        const orderDate = order.signal_time ? new Date(order.signal_time).toISOString().split('T')[0] : '';
        if (orderDate !== filters.date) return false;
      }
      
      // Broker filter - check if any broker execution matches the selected broker
      if (filters.broker !== 'all') {
        const hasBrokerExecution = order.broker_executions && 
          order.broker_executions.some((exec: any) => 
            exec.broker_name && exec.broker_name.toLowerCase() === filters.broker.toLowerCase()
          );
        if (!hasBrokerExecution) return false;
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

  // Helper function to check if a trade is from today
  const isToday = (dateString: string) => {
    if (!dateString) return false;
    try {
      const tradeDate = new Date(dateString).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      return tradeDate === today;
    } catch (error) {
      return false;
    }
  };

  // Split filtered trades into today's and old trades
  const { todaysTrades, oldTrades } = useMemo(() => {
    const today = [];
    const old = [];
    
    for (const trade of filteredAndSortedOrders) {
      if (isToday(trade.signal_time)) {
        today.push(trade);
      } else {
        old.push(trade);
      }
    }
    
    return { todaysTrades: today, oldTrades: old };
  }, [filteredAndSortedOrders]);

  const filteredTrades = filteredAndSortedOrders;

  const formatCurrency = (amount: number) => {
    if (amount === 0) {
      return '₹0';
    }
    const isPositive = amount >= 0;
    return `${isPositive ? '+' : ''}₹${Math.abs(amount).toLocaleString()}`;
  };

  // Color utility functions matching Orders page
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
      case 'EXIT_REVERSAL':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50';
      case 'EXIT_TARGET':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50';
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

  // Fetch trades with pagination and server-side filtering
  const fetchTrades = async (page = 1, resetData = true, dateFilter: string | null = null) => {
    try {
      if (resetData) {
        setIsLoading(true);
        setCurrentPage(1);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);
      
      const limit = 100;
      const offset = (page - 1) * limit;
      
      console.log('Fetching trades for symbol ID:', symbol.id, 'page:', page, 'dateFilter:', dateFilter);
      
      // Build query parameters for server-side filtering
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      if (dateFilter && dateFilter !== 'all') {
        queryParams.append('date', dateFilter);
      }
      
      // Use the existing API but with query parameters
      const response = await apiClient.getSymbolTrades(symbol.id, limit, offset, dateFilter);
      console.log('Symbol trades response:', response);
      
      const newTrades = response.trades || [];
      setTotalTrades(response.total_trades || newTrades.length);
      
      if (resetData || page === 1) {
        setOrders(newTrades);
      } else {
        setOrders(prev => [...prev, ...newTrades]);
      }
      
      setHasMore(newTrades.length === limit && (resetData ? newTrades.length : orders.length + newTrades.length) < (response.total_trades || newTrades.length));
      setCurrentPage(page);
      
    } catch (err) {
      console.error('Failed to fetch trades:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trades');
      if (resetData) setOrders([]);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Load more trades (pagination)
  const loadMoreTrades = () => {
    if (!isLoadingMore && hasMore) {
      const dateFilter = filters.date !== 'all' ? filters.date : null;
      fetchTrades(currentPage + 1, false, dateFilter);
    }
  };

  // Fetch trades for this specific symbol using the symbol ID
  useEffect(() => {
    if (symbol.id) {
      fetchTrades(1, true);
    }
  }, [symbol.id]);

  // Refetch when date filter changes (server-side filtering)
  useEffect(() => {
    if (symbol.id) {
      const dateFilter = filters.date !== 'all' ? filters.date : null;
      fetchTrades(1, true, dateFilter);
    }
  }, [filters.date]);

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
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

  // Export functionality
  const handleExportTrades = () => {
    if (filteredAndSortedOrders.length === 0) {
      alert('No trades to export');
      return;
    }

    const headers = [
      'Strike',
      'Type',
      'P&L',
      'Status',
      'Side',
      'Entry Price',
      'Exit Price',
      'Entry Time',
      'Exit Time'
    ];

    const csvData = filteredAndSortedOrders.map(order => {
      const parsed = parseStrikeSymbol(order.strike_symbol || '');
      return [
        parsed.strike || 'N/A',
        parsed.type || 'N/A',
        order.pnl || 0,
        order.status || 'N/A',
        order.side || 'N/A',
        order.entry_price || 'N/A',
        order.exit_price || 'N/A',
        order.entry_time ? formatExecutionTime(order.entry_time) : 'N/A',
        order.exit_time ? formatExecutionTime(order.exit_time) : 'N/A'
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${symbol.symbol}_trades_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // P&L Graph Data Processing
  const getPnlGraphData = () => {
    const dailyPnl = new Map();
    
    filteredAndSortedOrders.forEach(order => {
      if (order.signal_time) {
        const date = new Date(order.signal_time).toISOString().split('T')[0];
        const currentPnl = dailyPnl.get(date) || 0;
        dailyPnl.set(date, currentPnl + (order.pnl || 0));
      }
    });
    
    // Convert to array and sort by date
    const sortedData = Array.from(dailyPnl.entries())
      .map(([date, pnl]) => ({
        date,
        pnl: Number(pnl.toFixed(2)),
        formattedDate: (() => {
          try {
            const d = new Date(date);
            return isNaN(d.getTime()) ? date : d.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short'
            });
          } catch {
            return date;
          }
        })(),
        cumulativePnl: 0 // Will be calculated below
      }))
      .sort((a, b) => {
        try {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (isNaN(dateA) || isNaN(dateB)) return 0;
          return dateA - dateB;
        } catch {
          return 0;
        }
      });
    
    // Calculate cumulative P&L
    let cumulative = 0;
    sortedData.forEach(item => {
      cumulative += item.pnl;
      item.cumulativePnl = Number(cumulative.toFixed(2));
    });
    
    return sortedData;
  };

  const pnlGraphData = getPnlGraphData();

  // Component for rendering trades table
  const TradesTable = ({ trades, title, showCollapse = false, isCollapsed = false, onToggle }: {
    trades: Order[];
    title: string;
    showCollapse?: boolean;
    isCollapsed?: boolean;
    onToggle?: () => void;
  }) => {
    const isEmpty = trades.length === 0;
    
    return (
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">{title}</h3>
            <span className="px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] rounded-full text-sm font-medium">
              {trades.length} {trades.length === 1 ? 'trade' : 'trades'}
            </span>
          </div>
          {showCollapse && (
            <button
              onClick={onToggle}
              className="flex items-center space-x-2 px-3 py-1.5 bg-[var(--card-background)] border border-[var(--border)] rounded-lg hover:bg-[var(--accent)]/10 transition-all duration-200"
            >
              <span className="text-sm text-[var(--foreground)]">
                {isCollapsed ? 'Show' : 'Hide'} Old Trades
              </span>
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)] transform rotate-90" />
              )}
            </button>
          )}
        </div>

        {/* Only show empty state if there are actually no trades AND not collapsed */}
        {isEmpty ? (
          <div className="bg-[var(--card-background)]/50 rounded-xl border border-[var(--border)] p-8 text-center">
            <Activity className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
            <p className="text-[var(--muted-foreground)] text-lg">No trades found for {title.toLowerCase()}</p>
          </div>
        ) : showCollapse && isCollapsed ? (
          /* When collapsed, don't show table content but show collapsed indicator */
          null
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto bg-[var(--card-background)]/50 rounded-xl border border-[var(--border)] shadow-lg">
              <div className={showCollapse && isCollapsed ? 'max-h-96 overflow-y-auto' : ''}>
                <table className="w-full min-w-[1200px]">
                  <thead className="bg-[var(--muted)]/10 border-b border-[var(--border)] sticky top-0">
                    <tr>
                      <th className="text-left py-3 px-3 w-12">
                        <span className="text-xs font-medium text-[var(--muted-foreground)]">
                          <Eye className="w-3 h-3" />
                        </span>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button
                          onClick={() => handleSort('strike_symbol')}
                          className="flex items-center space-x-1 text-xs font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                        >
                          <span>Strike</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-3">
                        <button
                          onClick={() => handleSort('type')}
                          className="flex items-center space-x-1 text-xs font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                        >
                          <span>Type</span>
                          <ArrowUpDown className="w-2 h-2" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button
                          onClick={() => handleSort('pnl')}
                          className="flex items-center space-x-1 text-xs font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                        >
                          <span>P&L</span>
                          <ArrowUpDown className="w-2 h-2" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button
                          onClick={() => handleSort('status')}
                          className="flex items-center space-x-1 text-xs font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                        >
                          <span>Status</span>
                          <ArrowUpDown className="w-2 h-2" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-3">
                        <button
                          onClick={() => handleSort('side')}
                          className="flex items-center space-x-1 text-xs font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                        >
                          <span>Side</span>
                          <ArrowUpDown className="w-2 h-2" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button
                          onClick={() => handleSort('entry_price')}
                          className="flex items-center space-x-1 text-xs font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                        >
                          <span>Entry Price</span>
                          <ArrowUpDown className="w-2 h-2" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button
                          onClick={() => handleSort('exit_price')}
                          className="flex items-center space-x-1 text-xs font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                        >
                          <span>Exit Price</span>
                          <ArrowUpDown className="w-2 h-2" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button
                          onClick={() => handleSort('signal_time')}
                          className="flex items-center space-x-1 text-xs font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                        >
                          <span>Signal Time</span>
                          <ArrowUpDown className="w-2 h-2" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button
                          onClick={() => handleSort('entry_time')}
                          className="flex items-center space-x-1 text-xs font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                        >
                          <span>Entry Time</span>
                          <ArrowUpDown className="w-2 h-2" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button
                          onClick={() => handleSort('exit_time')}
                          className="flex items-center space-x-1 text-xs font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                        >
                          <span>Exit Time</span>
                          <ArrowUpDown className="w-2 h-2" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-3">
                        <span className="text-xs font-medium text-[var(--foreground)]">Qty</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((order, index) => {
                      const parsed = parseStrikeSymbol(order.strike_symbol || '');
                      const isExpanded = expandedRows.has(order.id);
                      const brokerExecutionSummaries = groupBrokerExecutions(order.broker_executions || []);

                      return (
                        <React.Fragment key={order.id}>
                          <tr className={`border-b border-[var(--border)]/30 hover:bg-[var(--accent)]/5 transition-colors ${index % 2 === 0 ? 'bg-[var(--background)]/20' : 'bg-[var(--background)]/5'}`}>
                            {/* Expand Button */}
                            <td className="py-3 px-3">
                              {brokerExecutionSummaries.length > 0 && (
                                <button
                                  onClick={() => toggleRowExpansion(order.id)}
                                  className="p-1 hover:bg-[var(--accent)]/20 rounded transition-colors"
                                  title="View Broker Executions"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3 h-3 text-[var(--muted-foreground)]" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-[var(--muted-foreground)]" />
                                  )}
                                </button>
                              )}
                            </td>
                            
                            {/* Strike */}
                            <td className="py-3 px-4">
                              <div className="font-mono text-xs text-[var(--foreground)]">
                                ₹{parsed.strike}
                              </div>
                            </td>
                            
                            {/* Type */}
                            <td className="py-3 px-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(parsed.type)}`}>
                                {parsed.type}
                              </span>
                            </td>
                            
                            {/* P&L */}
                            <td className="py-3 px-4">
                              <div className={`font-semibold text-xs ${getPnLColor(order.pnl || 0)}`}>
                                {formatCurrency(order.pnl || 0)}
                              </div>
                            </td>
                            
                            {/* Status with Exit Icon */}
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase whitespace-nowrap ${getStatusColor(order.status)}`}>
                                  {order.status?.replace('_', ' ')}
                                </span>
                                {(order.status === 'OPEN' || order.status === 'AWAITING_ENTRY') && (
                                  <button
                                    onClick={() => handleExitOrder(order.id)}
                                    disabled={exitingOrders.has(order.id)}
                                    className="flex items-center justify-center w-6 h-6 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-all duration-200 border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Exit this order"
                                  >
                                    {exitingOrders.has(order.id) ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <LogOut className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                            
                            {/* Side */}
                            <td className="py-3 px-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase whitespace-nowrap ${getSideColor(order.side || '')}`}>
                                {order.side}
                              </span>
                            </td>
                            
                            {/* Entry Price */}
                            <td className="py-3 px-4">
                              <div className="text-xs font-medium text-[var(--foreground)]">
                                ₹{order.entry_price?.toFixed(2) || 'N/A'}
                              </div>
                            </td>
                            
                            {/* Exit Price */}
                            <td className="py-3 px-4">
                              <div className="text-xs font-medium text-[var(--foreground)]">
                                {order.exit_price ? `₹${order.exit_price.toFixed(2)}` : 'N/A'}
                              </div>
                            </td>
                            
                            {/* Signal Time */}
                            <td className="py-3 px-4">
                              <div className="text-xs space-y-1">
                                <div className="text-[var(--foreground)] font-medium">
                                  {formatDate(order.signal_time || "")}
                                </div>
                                <div className="text-[var(--muted-foreground)]">
                                  {formatTime(order.signal_time || "")}
                                </div>
                              </div>
                            </td>
                            
                            {/* Entry Time */}
                            <td className="py-3 px-4">
                              <div className="text-xs space-y-1">
                                <div className="text-[var(--foreground)] font-medium">
                                  {formatDate(order.entry_time || "")}
                                </div>
                                <div className="text-[var(--muted-foreground)]">
                                  {formatTime(order.entry_time || "")}
                                </div>
                              </div>
                            </td>
                            
                            {/* Exit Time */}
                            <td className="py-3 px-4">
                              <div className="text-xs text-[var(--muted-foreground)]">
                                {order.exit_time ? formatDate(order.exit_time) : 'N/A'}<br />
                                {order.exit_time ? formatTime(order.exit_time) : ''}
                              </div>
                            </td>
                            
                            {/* Quantity */}
                            <td className="py-3 px-3">
                              <div className="text-xs font-medium text-[var(--foreground)]">
                                {order.executed_quantity || order.qty || 'N/A'}
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Row for Broker Executions */}
                          {isExpanded && brokerExecutionSummaries.length > 0 && (
                            <tr className="bg-[var(--muted)]/5 border-b border-[var(--border)]/20">
                              <td colSpan={12} className="py-4 px-6">
                                <div className="space-y-4">
                                  <h4 className="text-sm font-semibold text-[var(--foreground)] flex items-center space-x-2">
                                    <Target className="w-4 h-4 text-[var(--accent)]" />
                                    <span>Broker Execution Details</span>
                                  </h4>
                                  
                                  <div className="space-y-4">
                                    {brokerExecutionSummaries.map((summary, summaryIndex) => (
                                      <div key={`${summary.broker_name}_${summary.broker_order_id}`} className="rounded-xl border border-[var(--border)]/40 bg-[var(--background)]/80 shadow-md p-4">
                                        {/* Header with Broker Info */}
                                        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-4">
                                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-sm ${getBrokerNameColor(summary.broker_name)}`}>
                                            {summary.broker_name}
                                          </span>
                                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-sm ${getExecutionStatusColor(summary.status)}`}>
                                            {summary.status}
                                          </span>
                                          <span className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold border-2 border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] shadow-sm select-all">
                                            {summary.broker_order_id}
                                          </span>
                                          {summary.total_pnl !== undefined && (
                                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
                                              summary.total_pnl > 0 
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                                : summary.total_pnl < 0 
                                                  ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                                            }`}>
                                              P&L: ₹{summary.total_pnl.toFixed(2)}
                                            </span>
                                          )}
                                        </div>

                                        {/* Entry and Exit Details Grid */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                          {/* Entry Details */}
                                          {summary.has_entry && (
                                            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                                              <div className="flex items-center gap-2 mb-2">
                                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                                <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Entry</span>
                                              </div>
                                              <div className="space-y-1 text-xs">
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--muted-foreground)]">Price:</span>
                                                  <span className="font-mono text-[var(--foreground)]">₹{summary.entry_price?.toFixed(2) || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--muted-foreground)]">Quantity:</span>
                                                  <span className="font-mono text-[var(--foreground)]">{summary.entry_quantity || 0}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--muted-foreground)]">Time:</span>
                                                  <span className="font-mono text-[var(--foreground)] text-right">
                                                    {summary.entry_time ? formatExecutionTime(summary.entry_time) : 'N/A'}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--muted-foreground)]">Value:</span>
                                                  <span className="font-mono text-[var(--foreground)]">₹{((summary.entry_price || 0) * (summary.entry_quantity || 0)).toFixed(2)}</span>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {/* Exit Details */}
                                          {summary.has_exit && (
                                            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                              <div className="flex items-center gap-2 mb-2">
                                                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                                <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Exit</span>
                                              </div>
                                              <div className="space-y-1 text-xs">
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--muted-foreground)]">Price:</span>
                                                  <span className="font-mono text-[var(--foreground)]">₹{summary.exit_price?.toFixed(2) || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--muted-foreground)]">Quantity:</span>
                                                  <span className="font-mono text-[var(--foreground)]">{summary.exit_quantity || 0}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--muted-foreground)]">Time:</span>
                                                  <span className="font-mono text-[var(--foreground)] text-right">
                                                    {summary.exit_time ? formatExecutionTime(summary.exit_time) : 'N/A'}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--muted-foreground)]">Value:</span>
                                                  <span className="font-mono text-[var(--foreground)]">₹{((summary.exit_price || 0) * (summary.exit_quantity || 0)).toFixed(2)}</span>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {/* Position Summary */}
                                          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 lg:col-span-2">
                                            <div className="flex items-center gap-2 mb-2">
                                              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Position Summary</span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                              <div className="flex flex-col">
                                                <span className="text-[var(--muted-foreground)] mb-1">Net Qty</span>
                                                <span className={`font-mono font-semibold ${
                                                  (summary.net_quantity || 0) > 0 ? 'text-green-400' :
                                                  (summary.net_quantity || 0) < 0 ? 'text-red-400' : 'text-[var(--muted-foreground)]'
                                                }`}>
                                                  {summary.net_quantity || 0}
                                                </span>
                                              </div>
                                              <div className="flex flex-col">
                                                <span className="text-[var(--muted-foreground)] mb-1">Type</span>
                                                <span className="font-mono text-[var(--foreground)]">{summary.order_type || 'N/A'}</span>
                                              </div>
                                              <div className="flex flex-col">
                                                <span className="text-[var(--muted-foreground)] mb-1">Status</span>
                                                <span className={`font-mono font-semibold ${
                                                  summary.net_quantity === 0 ? 'text-purple-400' :
                                                  (summary.net_quantity || 0) > 0 ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                  {summary.net_quantity === 0 ? 'CLOSED' : 'OPEN'}
                                                </span>
                                              </div>
                                              <div className="flex flex-col">
                                                <span className="text-[var(--muted-foreground)] mb-1">P&L</span>
                                                <span className={`font-mono font-bold ${
                                                  (summary.total_pnl || 0) > 0 ? 'text-green-400' :
                                                  (summary.total_pnl || 0) < 0 ? 'text-red-400' : 'text-[var(--muted-foreground)]'
                                                }`}>
                                                  {summary.total_pnl !== undefined ? `₹${summary.total_pnl.toFixed(2)}` : 'N/A'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              <div className={showCollapse && isCollapsed ? 'max-h-96 overflow-y-auto space-y-3' : 'space-y-3'}>
                {trades.map((order, index) => {
                  const parsed = parseStrikeSymbol(order.strike_symbol || '');
                  const isExpanded = expandedRows.has(order.id);
                  const brokerExecutionSummaries = groupBrokerExecutions(order.broker_executions || []);

                  return (
                    <div key={order.id} className="bg-[var(--card-background)]/60 rounded-xl border border-[var(--border)] p-4 space-y-4">
                      {/* Header Row */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStrikeTypeColor(parsed.type)}`}>
                            {parsed.type}
                          </span>
                          <div className="font-mono text-lg font-bold text-[var(--foreground)]">
                            ₹{parsed.strike}
                          </div>
                        </div>
                        <div className={`text-lg font-bold ${getPnLColor(order.pnl || 0)}`}>
                          {formatCurrency(order.pnl || 0)}
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-[var(--muted-foreground)] text-xs mb-1">Status</div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase whitespace-nowrap ${getStatusColor(order.status)}`}>
                              {order.status?.replace('_', ' ')}
                            </span>
                            {(order.status === 'OPEN' || order.status === 'AWAITING_ENTRY') && (
                              <button
                                onClick={() => handleExitOrder(order.id)}
                                disabled={exitingOrders.has(order.id)}
                                className="flex items-center justify-center w-6 h-6 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-all duration-200 border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Exit this order"
                              >
                                {exitingOrders.has(order.id) ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <LogOut className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--muted-foreground)] text-xs mb-1">Side</div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${getSideColor(order.side || '')}`}>
                            {order.side}
                          </span>
                        </div>
                        <div>
                          <div className="text-[var(--muted-foreground)] text-xs mb-1">Entry Price</div>
                          <div className="font-medium text-[var(--foreground)]">₹{order.entry_price?.toFixed(2) || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-[var(--muted-foreground)] text-xs mb-1">Exit Price</div>
                          <div className="font-medium text-[var(--foreground)]">{order.exit_price ? `₹${order.exit_price.toFixed(2)}` : 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-[var(--muted-foreground)] text-xs mb-1">Signal Time</div>
                          <div className="text-xs text-[var(--foreground)]">
                            {formatDate(order.signal_time || "")} • {formatTime(order.signal_time || "")}
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--muted-foreground)] text-xs mb-1">Entry Time</div>
                          <div className="text-xs text-[var(--foreground)]">
                            {formatDate(order.entry_time || "")} • {formatTime(order.entry_time || "")}
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--muted-foreground)] text-xs mb-1">Quantity</div>
                          <div className="font-medium text-[var(--foreground)]">{order.executed_quantity || order.qty || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-[var(--muted-foreground)] text-xs mb-1">Exit Time</div>
                          <div className="text-xs text-[var(--foreground)]">
                            {order.exit_time ? `${formatDate(order.exit_time)} • ${formatTime(order.exit_time)}` : 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/30">
                        <div className="flex items-center space-x-2">
                          {brokerExecutionSummaries.length > 0 && (
                            <button
                              onClick={() => toggleRowExpansion(order.id)}
                              className="flex items-center space-x-1 px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] rounded text-xs font-medium transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  <span>Hide Details</span>
                                </>
                              ) : (
                                <>
                                  <ChevronRight className="w-3 h-3" />
                                  <span>Show Details</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mobile Expanded Broker Details */}
                      {isExpanded && brokerExecutionSummaries.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-[var(--border)]/30 space-y-3">
                          <h4 className="text-sm font-semibold text-[var(--foreground)]">Broker Execution Details</h4>
                          {brokerExecutionSummaries.map((summary) => (
                            <div key={`${summary.broker_name}_${summary.broker_order_id}`} className="bg-[var(--background)]/50 rounded-lg p-3 border border-[var(--border)]/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getBrokerNameColor(summary.broker_name)}`}>
                                  {summary.broker_name}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getExecutionStatusColor(summary.status)}`}>
                                  {summary.status}
                                </span>
                              </div>
                              {summary.has_entry && (
                                <div className="text-xs">
                                  <span className="text-[var(--muted-foreground)]">Entry: </span>
                                  <span className="text-[var(--foreground)] font-medium">₹{summary.entry_price?.toFixed(2)} × {summary.entry_quantity}</span>
                                </div>
                              )}
                              {summary.has_exit && (
                                <div className="text-xs">
                                  <span className="text-[var(--muted-foreground)]">Exit: </span>
                                  <span className="text-[var(--foreground)] font-medium">₹{summary.exit_price?.toFixed(2)} × {summary.exit_quantity}</span>
                                </div>
                              )}
                              {summary.total_pnl !== undefined && (
                                <div className={`text-sm font-semibold ${getPnLColor(summary.total_pnl)}`}>
                                  P&L: {formatCurrency(summary.total_pnl)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

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
          <button 
            onClick={handleExportTrades}
            className="flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all duration-200 border border-blue-500/50 hover:border-blue-500/60 flex-shrink-0 w-full sm:w-auto"
          >
            <Download className="w-4 h-4" />
            <span className="font-medium">Export</span>
          </button>
        </div>
      </div>

      {/* Trades Summary Stats */}
      <div className="grid grid-cols-5 gap-2 md:gap-3">
        <div className="backdrop-blur-xl bg-gray-500/10 border border-gray-500/30 rounded-2xl p-3 shadow-lg shadow-gray-500/20 hover:shadow-xl hover:shadow-gray-500/30 transition-all duration-300">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-gray-300 text-xs font-medium">Total</p>
            <p className="text-sm md:text-xl font-bold text-gray-200">{stats.totalOrders}</p>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center mb-2">
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-blue-300 text-xs font-medium">Open</p>
            <p className="text-sm md:text-xl font-bold text-blue-400">{stats.openOrders}</p>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-purple-500/10 border border-purple-500/30 rounded-2xl p-3 shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-purple-300 text-xs font-medium">Closed</p>
            <p className="text-sm md:text-xl font-bold text-purple-400">{stats.closedOrders}</p>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-orange-500/10 border border-orange-500/30 rounded-2xl p-3 shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-300">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center mb-2">
              <Target className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-orange-300 text-xs font-medium">Win Rate</p>
            <p className="text-sm md:text-xl font-bold text-orange-400">{stats.winRate}%</p>
          </div>
        </div>

        <div className={`backdrop-blur-xl ${stats.totalPnL >= 0 ? 'bg-green-500/10 border-green-500/30 shadow-green-500/20 hover:shadow-green-500/30' : 'bg-red-500/10 border-red-500/30 shadow-red-500/20 hover:shadow-red-500/30'} border rounded-2xl p-3 shadow-lg hover:shadow-xl transition-all duration-300`}>
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center mb-2">
              {stats.totalPnL >= 0 ? 
                <TrendingUp className="w-4 h-4 text-green-400" /> : 
                <TrendingDown className="w-4 h-4 text-red-400" />
              }
            </div>
            <p className={`text-xs font-medium ${stats.totalPnL >= 0 ? 'text-green-300' : 'text-red-300'}`}>P&L</p>
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

      {/* P&L Graph */}
      {pnlGraphData.length > 0 && (
        <div className="backdrop-blur-xl bg-[var(--card-background)]/95 border border-[var(--border)] rounded-2xl p-6 shadow-xl shadow-[var(--accent)]/15">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent)] to-blue-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-[var(--accent)] to-blue-400 bg-clip-text text-transparent">
                  Daily P&L Performance
                </h3>
                <p className="text-[var(--muted-foreground)] text-sm">
                  {pnlGraphData.length} trading days • Trade performance
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--muted-foreground)]">Total P&L</p>
              <p className={`text-lg font-bold ${
                pnlGraphData.reduce((sum, day) => sum + day.cumulativePnl, 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                ₹{Math.abs(pnlGraphData[pnlGraphData.length - 1]?.cumulativePnl || 0).toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="h-80 relative">
            {/* Gradient background for chart area */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--accent)]/5 to-transparent rounded-2xl"></div>
            
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={pnlGraphData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="tradesDailyPnlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="tradesCumulativePnlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="50%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)' }}
                />
                <YAxis 
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)' }}
                  tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(1) + 'K' : value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card-background)', 
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    color: 'var(--foreground)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(10px)'
                  }}
                  formatter={(value, name, props) => {
                    // Check the dataKey to determine the correct label
                    const label = props.dataKey === 'pnl' ? 'Daily P&L' : 'Cumulative P&L';
                    return [`₹${Number(value).toLocaleString()}`, label];
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fill="url(#tradesDailyPnlGradient)"
                  dot={false}
                  activeDot={{ 
                    r: 5, 
                    stroke: '#3b82f6', 
                    strokeWidth: 2,
                    fill: 'var(--card-background)'
                  }}
                  name="Daily P&L"
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulativePnl" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  fill="url(#tradesCumulativePnlGradient)"
                  fillOpacity={0.3}
                  dot={false}
                  activeDot={{ 
                    r: 4, 
                    stroke: '#10b981', 
                    strokeWidth: 2,
                    fill: 'var(--card-background)'
                  }}
                  name="Cumulative P&L"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Simple Legend */}
          <div className="flex justify-center items-center space-x-8 mt-6 pt-4 border-t border-[var(--border)]/30">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-2 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"></div>
              <span className="text-sm text-[var(--muted-foreground)]">Daily P&L</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-2 bg-gradient-to-r from-green-500 to-green-400 rounded-full opacity-70" style={{backgroundImage: 'repeating-linear-gradient(90deg, #10b981 0px, #10b981 4px, transparent 4px, transparent 8px)'}}></div>
              <span className="text-sm text-[var(--muted-foreground)]">Cumulative P&L</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="backdrop-blur-xl bg-[var(--card-background)]/95 border border-[var(--border)] rounded-2xl p-4 shadow-xl shadow-[var(--accent)]/10">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent)] to-blue-500 rounded-lg flex items-center justify-center">
            <Filter className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-bold bg-gradient-to-r from-[var(--accent)] to-blue-400 bg-clip-text text-transparent">Filters</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-3">
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

          {/* Broker Filter */}
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">Broker</label>
            <select
              value={filters.broker}
              onChange={(e) => setFilters(prev => ({ ...prev, broker: e.target.value }))}
              className="w-full px-2 py-1 bg-[var(--background)]/50 border border-[var(--border)] rounded text-xs focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All Brokers</option>
              {Array.from(new Set(
                orders.flatMap(o => 
                  o.broker_executions ? o.broker_executions.map((exec: any) => exec.broker_name) : []
                ).filter(Boolean)
              )).map(broker => (
                <option key={broker} value={broker}>{broker}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        {/* <div className="mt-3 pt-3 border-t border-[var(--border)]/30">
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
        </div> */}

        {/* Active Filters Display */}
        <div className="mt-3 pt-3 border-t border-[var(--border)]/30">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[var(--muted-foreground)]">Active filters:</span>
            
            {filters.type !== 'all' && (
              <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded border border-cyan-500/30">
                Type: {filters.type}
              </span>
            )}
            
            {filters.pnl !== 'all' && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30">
                P&L: {filters.pnl}
              </span>
            )}
            
            {filters.status !== 'all' && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                Status: {filters.status}
              </span>
            )}
            
            {filters.side !== 'all' && (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30">
                Side: {filters.side}
              </span>
            )}
            
            {filters.date !== 'all' && (
              <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded border border-orange-500/30">
                Date: {formatDate(filters.date)}
              </span>
            )}
            
            {filters.broker !== 'all' && (
              <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30">
                Broker: {filters.broker}
              </span>
            )}
            
            {(filters.type !== 'all' || filters.pnl !== 'all' || filters.status !== 'all' || filters.side !== 'all' || filters.date !== 'all' || filters.broker !== 'all') && (
              <button
                onClick={() => {
                  setFilters({
                    symbol: '',
                    type: 'all',
                    pnl: 'all',
                    status: 'all',
                    side: 'all',
                    date: 'all',
                    broker: 'all'
                  });
                }}
                className="px-2 py-1 bg-red-500/20 text-red-400 rounded border border-red-500/30 hover:bg-red-500/30 transition-colors"
              >
                Clear All
              </button>
            )}
            
            {filters.type === 'all' && filters.pnl === 'all' && filters.status === 'all' && filters.side === 'all' && filters.date === 'all' && filters.broker === 'all' && (
              <span className="text-[var(--muted-foreground)] italic">None</span>
            )}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-[var(--card-background)]/95 border border-[var(--border)] rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Symbol Trades</h3>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                All trades/orders for {symbol.symbol} from strategy {strategy.name}
              </p>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-[var(--accent)]">{todaysTrades.length}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Today's</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[var(--muted-foreground)]">{oldTrades.length}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Historical</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[var(--foreground)]">{filteredAndSortedOrders.length}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Total</div>
              </div>
            </div>
          </div>
        </div>

        {filteredAndSortedOrders.length === 0 ? (
          <div className="bg-[var(--card-background)]/50 rounded-xl border border-[var(--border)] p-6 md:p-8 text-center">
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
                    date: 'all',
                    broker: 'all'
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
            {/* Today's Trades Section */}
            <TradesTable 
              trades={todaysTrades} 
              title="Today's Trades" 
            />
            
            {/* Old Trades Section - Collapsible */}
            {oldTrades.length > 0 && (
              <div className={`transition-all duration-300 ${showOldTrades ? 'opacity-100' : 'opacity-100'}`}>
                <TradesTable 
                  trades={oldTrades} 
                  title="Historical Trades" 
                  showCollapse={true}
                  isCollapsed={!showOldTrades}
                  onToggle={() => setShowOldTrades(!showOldTrades)}
                />
              </div>
            )}

            {/* Load More Section - Only for Old Trades when expanded */}
            {showOldTrades && hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMoreTrades}
                  disabled={isLoadingMore}
                  className="flex items-center space-x-2 px-4 py-2 bg-[var(--accent)]/20 hover:bg-[var(--accent)]/30 text-[var(--accent)] rounded-lg transition-all duration-200 border border-[var(--accent)]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <span>Load More Historical Trades</span>
                      <span className="text-xs opacity-70">({totalTrades - orders.length} remaining)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
