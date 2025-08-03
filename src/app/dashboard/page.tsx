"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Strategy, 
  StrategyConfig, 
  Broker, 
  Position, 
  Trade,
  SystemStatus,
  HealthStatus,
  VmDetails,
  BrokerBalanceSummary,
  DashboardSummary,
  OrdersPnlStats,
  StrategyStats,
  PerStrategyStatsResponse,
  DailyPnlHistory,
  apiClient 
} from "@/lib/api";
import { MarketTicker } from "@/components/MarketTicker";
// import { StockTicker } from "@/components/StockTicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogsManagement } from "@/components/LogsManagement";
import { StrategiesPage } from "@/components/strategies/StrategiesPage";
import { ActivityTracker } from "@/components/ActivityTracker";
import { BrokerConfigModal } from "@/components/BrokerConfigModal";
import { ToastProvider, useToast } from "@/components/Toast";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Home,
  Zap,
  Link,
  BarChart3,
  TrendingUp,
  LogOut,
  Cpu,
  HardDrive,
  Wifi,
  Clock,
  DollarSign,
  IndianRupee,
  Activity,
  Users,
  Settings,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingDown,
  Plus,
  Download,
  RotateCcw,
  RefreshCw,
  Lightbulb,
  Shield,
  Rocket,
  Bot,
  Eye,
  Target,
  Database,
  Server,
  Watch,
  Monitor,
  Info,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Loader2
} from "lucide-react";

interface DashboardStats {
  totalStrategies: number;
  activeStrategies: number;
  totalBrokers: number;
  activeBrokers: number;
  totalPositions: number;
  totalPnL: number;
}

interface SystemMetrics {
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  uptime: number;
  incomingTraffic: number;
  outgoingTraffic: number;
}

// Risk Limits Modal Component
interface RiskLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  broker: Broker;
  onSave: (maxLoss: number, maxProfit: number) => Promise<void>;
}

function RiskLimitsModal({ isOpen, onClose, broker, onSave }: RiskLimitsModalProps) {
  const [maxLoss, setMaxLoss] = useState(broker.max_loss?.toString() || '0');
  const [maxProfit, setMaxProfit] = useState(broker.max_profit?.toString() || '0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMaxLoss(broker.max_loss?.toString() || '0');
      setMaxProfit(broker.max_profit?.toString() || '0');
      setError(null);
    }
  }, [isOpen, broker]);

  const handleSave = async () => {
    const maxLossNum = parseFloat(maxLoss) || 0;
    const maxProfitNum = parseFloat(maxProfit) || 0;
    
    if (maxLossNum < 0 || maxProfitNum < 0) {
      setError('Values cannot be negative');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      await onSave(maxLossNum, maxProfitNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update risk limits');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-[var(--foreground)]">
            Risk Limits - {broker.broker_name}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--accent)]/10 text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Maximum Loss (₹)
            </label>
            <input
              type="text"
              value={maxLoss}
              onChange={(e) => {
                const value = e.target.value;
                // Allow only numbers and decimal point
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setMaxLoss(value);
                  setError(null);
                }
              }}
              className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              placeholder="Enter maximum loss amount"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Trading will be paused if losses exceed this amount (0 = no limit)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Maximum Profit (₹)
            </label>
            <input
              type="text"
              value={maxProfit}
              onChange={(e) => {
                const value = e.target.value;
                // Allow only numbers and decimal point
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setMaxProfit(value);
                  setError(null);
                }
              }}
              className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              placeholder="Enter maximum profit amount"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Trading will be paused if profits exceed this amount (0 = no limit)
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [showBrokerConfigModal, setShowBrokerConfigModal] = useState(false);
  const [selectedBrokerForConfig, setSelectedBrokerForConfig] = useState<string | null>(null);
  const [showRiskLimitsModal, setShowRiskLimitsModal] = useState(false);
  const [selectedBrokerForRiskLimits, setSelectedBrokerForRiskLimits] = useState<Broker | null>(null);
  const [balanceSummaries, setBalanceSummaries] = useState<BrokerBalanceSummary[]>([]);
  const [buttonLoading, setButtonLoading] = useState<Record<string, boolean>>({});
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [strategiesLoading, setStrategiesLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [vmDetails, setVmDetails] = useState<VmDetails | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpuUsage: 0,
    ramUsage: 0,
    diskUsage: 0,
    uptime: 0,
    incomingTraffic: 0,
    outgoingTraffic: 0
  });
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [apiHealthy, setApiHealthy] = useState<boolean>(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalStrategies: 0,
    activeStrategies: 0,
    totalBrokers: 0,
    activeBrokers: 0,
    totalPositions: 0,
    totalPnL: 0
  });

  // Dashboard summary from API
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  
  // PNL and Strategy Statistics
  const [overallPnlStats, setOverallPnlStats] = useState<OrdersPnlStats | null>(null);
  const [strategyStats, setStrategyStats] = useState<StrategyStats | null>(null);
  const [perStrategyStats, setPerStrategyStats] = useState<PerStrategyStatsResponse | null>(null);
  const [dailyPnlHistory, setDailyPnlHistory] = useState<DailyPnlHistory | null>(null);
  
  // Market status state
  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(true); // Default to true during market hours
  const [holidays, setHolidays] = useState<string[]>([]);
  const [lastDataUpdate, setLastDataUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [holidaysLoaded, setHolidaysLoaded] = useState<boolean>(false);
  
  // Rate limiting state
  const [lastApiCall, setLastApiCall] = useState<Date>(new Date());
  const MIN_API_INTERVAL = 60000; // Minimum 60 seconds between API calls

  // Ref to prevent duplicate API calls during React development mode double-rendering
  const isInitializingRef = useRef(false);
  const holidaysInitializingRef = useRef(false);

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Order filters state
  const [symbolFilter, setSymbolFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [pnlFilter, setPnlFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sideFilter, setSideFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [brokerFilter, setBrokerFilter] = useState("");
  
  // Sorting state
  const [sortField, setSortField] = useState<string>("signal_time");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Orders tab splitting state - similar to TradesPage
  const [showCompletedOrders, setShowCompletedOrders] = useState(false);
  
  // Row expansion for detailed broker executions (Already declared above)
  // const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Exit orders state - track which orders are being exited
  const [exitingOrders, setExitingOrders] = useState<Set<number>>(new Set());

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
    
    return {
      exchange,
      underlying: underlying || 'N/A',
      strike: strike || 'N/A',
      type,
      expiry: expiry || 'N/A'
    };
  };

  // Helper function to check if an order is from today - similar to TradesPage
  const isToday = (dateString: string) => {
    if (!dateString) return false;
    try {
      const orderDate = new Date(dateString).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      return orderDate === today;
    } catch (error) {
      return false;
    }
  };

  // Computed values for filters
  const availableSymbols = useMemo(() => {
    if (!orders || !Array.isArray(orders)) {
      return [];
    }
    const symbols = orders
      .map((order: any) => {
        const parsed = parseStrikeSymbol(order.strike_symbol || '');
        return parsed.underlying;
      })
      .filter(symbol => symbol && symbol !== 'N/A');
    return Array.from(new Set(symbols)).sort();
  }, [orders]);

  const availableDates = useMemo(() => {
    if (!orders || !Array.isArray(orders)) {
      return [];
    }
    const dates = orders
      .map((order: any) => {
        if (!order?.entry_time) return null;
        try {
          return new Date(order.entry_time).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
        } catch {
          return null;
        }
      })
      .filter((date): date is string => date !== null);
    return Array.from(new Set(dates)).sort().reverse();
  }, [orders]);

  // Toggle row expansion for broker executions
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

  // Group broker executions by broker and order ID - same logic as TradesPage
  const groupBrokerExecutions = (executions: any[]) => {
    console.log('groupBrokerExecutions called with:', executions);
    
    const groups = new Map();
    
    executions.forEach(execution => {
      console.log('Processing execution:', execution);
      const key = `${execution.broker_name}_${execution.broker_order_id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          broker_name: execution.broker_name,
          broker_order_id: execution.broker_order_id,
          status: execution.status,
          order_type: execution.order_type,
          executions: []
        });
      }
      groups.get(key).executions.push(execution);
    });
    
    console.log('Groups created:', Array.from(groups.values()));
    
    // Process each group to create summary
    return Array.from(groups.values()).map(group => {
      // Try different possible field names for 'side'
      const buyExecutions = group.executions.filter((e: any) => {
        const side = e.side || e.transaction_type || e.order_side || e.buy_sell;
        return side && (side.toUpperCase() === 'BUY' || side.toUpperCase() === 'B' || side.toUpperCase() === 'ENTRY');
      });
      const sellExecutions = group.executions.filter((e: any) => {
        const side = e.side || e.transaction_type || e.order_side || e.buy_sell;
        return side && (side.toUpperCase() === 'SELL' || side.toUpperCase() === 'S' || side.toUpperCase() === 'EXIT');
      });
      
      console.log(`Processing group ${group.broker_name}_${group.broker_order_id}:`, {
        buyExecutions,
        sellExecutions,
        firstBuyExecution: buyExecutions[0],
        firstSellExecution: sellExecutions[0]
      });
      
      // Try different possible field names for quantity and price
      const getQuantity = (e: any) => e.executed_quantity || e.qty || e.quantity || e.filled_qty || 0;
      const getPrice = (e: any) => e.execution_price || e.price || e.avg_price || e.fill_price || 0;
      const getTime = (e: any) => e.execution_time || e.timestamp || e.time || e.created_at || e.updated_at;
      
      const buyQuantity = buyExecutions.reduce((sum: number, e: any) => sum + getQuantity(e), 0);
      const sellQuantity = sellExecutions.reduce((sum: number, e: any) => sum + getQuantity(e), 0);
      
      const avgBuyPrice = buyQuantity > 0 ? 
        buyExecutions.reduce((sum: number, e: any) => sum + getPrice(e) * getQuantity(e), 0) / buyQuantity : 0;
      const avgSellPrice = sellQuantity > 0 ?
        sellExecutions.reduce((sum: number, e: any) => sum + getPrice(e) * getQuantity(e), 0) / sellQuantity : 0;
      
      const netQuantity = buyQuantity - sellQuantity;
      const totalPnl = sellQuantity > 0 && avgSellPrice > 0 && avgBuyPrice > 0 ? 
        ((avgSellPrice - avgBuyPrice) * Math.min(buyQuantity, sellQuantity)) : undefined;
      
      const result = {
        ...group,
        net_quantity: netQuantity,
        total_pnl: totalPnl,
        has_entry: buyQuantity > 0,
        has_exit: sellQuantity > 0,
        entry_price: avgBuyPrice || undefined,
        exit_price: avgSellPrice || undefined,
        entry_quantity: buyQuantity,
        exit_quantity: sellQuantity,
        entry_time: buyExecutions.length > 0 ? getTime(buyExecutions[0]) : undefined,
        exit_time: sellExecutions.length > 0 ? getTime(sellExecutions[0]) : undefined,
      };
      
      console.log('Group result:', result);
      return result;
    });
  };

  // Helper functions for broker execution colors
  const getBrokerNameColor = (brokerName: string) => {
    switch (brokerName.toLowerCase()) {
      case 'zerodha':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/50';
      case 'fyers':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/50';
      case 'upstox':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/50';
    }
  };

  const getExecutionStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETE':
        return 'bg-green-500/20 text-green-400 border border-green-500/50';
      case 'OPEN':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/50';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-400 border border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/50';
    }
  };

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

  // Export functionality for Orders
  const handleExportOrders = () => {
    if (sortedOrders.length === 0) {
      alert('No orders to export');
      return;
    }

    const headers = [
      'Symbol',
      'Strike',
      'Type',
      'P&L',
      'Status',
      'Side',
      'Quantity',
      'Exec Qty',
      'Entry Price',
      'Exit Price',
      'Entry Time',
      'Exit Time'
    ];

    const csvData = sortedOrders.map(order => {
      const parsed = parseStrikeSymbol(order.strike_symbol || '');
      return [
        parsed.underlying || 'N/A',
        parsed.strike || 'N/A',
        parsed.type || 'N/A',
        order.pnl || 0,
        order.status || 'N/A',
        order.side || 'N/A',
        order.qty || order.quantity || 0,
        order.executed_quantity || order.exec_qty || 0,
        order.entry_price || 'N/A',
        order.exit_price || 'N/A',
        order.entry_time ? new Date(order.entry_time).toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) : 'N/A',
        order.exit_time ? new Date(order.exit_time).toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) : 'N/A'
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `orders-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Date helper functions
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

  const formatCompactDateTime = (dateString: string) => {
    if (!dateString) return { date: 'N/A', time: 'N/A' };
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return { date: 'N/A', time: 'N/A' };
      
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      return {
        date: isToday ? 'Today' : date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short'
        }),
        time: date.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      };
    } catch (error) {
      return { date: 'N/A', time: 'N/A' };
    }
  };

  const getPriceUpdateFreshness = (dateString: string) => {
    if (!dateString) return { isFresh: false, color: 'text-gray-500' };
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
      
      if (diffMinutes <= 1) return { isFresh: true, color: 'text-green-500' };
      if (diffMinutes <= 5) return { isFresh: true, color: 'text-yellow-500' };
      if (diffMinutes <= 30) return { isFresh: false, color: 'text-orange-500' };
      return { isFresh: false, color: 'text-red-500' };
    } catch {
      return { isFresh: false, color: 'text-gray-500' };
    }
  };

  // Get available dates for filter (already computed above as availableDates)
  // const availableDates = useMemo(() => {
  //   const dates = orders
  //     .map(order => order.signal_time ? new Date(order.signal_time).toISOString().split('T')[0] : '')
  //     .filter(date => date !== '')
  //     .filter((date, index, arr) => arr.indexOf(date) === index)
  //     .sort()
  //     .reverse();
  //   return dates;
  // }, [orders]);

  // Filter orders based on selected filters
  const filteredOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) {
      return [];
    }
    return orders.filter((order: any) => {
      const parsed = parseStrikeSymbol(order.strike_symbol || '');
      
      // Symbol filter
      if (symbolFilter && parsed.underlying !== symbolFilter) return false;
      
      // Type filter  
      if (typeFilter && parsed.type !== typeFilter) return false;
      
      // P&L filter
      if (pnlFilter) {
        const pnl = Number(order.pnl || 0);
        if (pnlFilter === 'profit' && pnl <= 0) return false;
        if (pnlFilter === 'loss' && pnl >= 0) return false;
        if (pnlFilter === 'breakeven' && pnl !== 0) return false;
      }
      
      // Status filter
      if (statusFilter && order.status !== statusFilter) return false;
      
      // Side filter
      if (sideFilter && order.side !== sideFilter) return false;
      
      // Date filter
      if (dateFilter) {
        const orderDate = order.signal_time ? new Date(order.signal_time).toISOString().split('T')[0] : '';
        if (orderDate !== dateFilter) return false;
      }
      
      // Broker filter - check if any broker execution matches the selected broker
      if (brokerFilter) {
        const hasBrokerExecution = order.broker_executions && 
          order.broker_executions.some((exec: any) => 
            exec.broker_name && exec.broker_name.toLowerCase() === brokerFilter.toLowerCase()
          );
        if (!hasBrokerExecution) return false;
      }
      
      return true;
    });
  }, [orders, symbolFilter, typeFilter, pnlFilter, statusFilter, sideFilter, dateFilter, brokerFilter]);

  // Sort the filtered orders
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle special cases for parsing
      if (sortField === 'underlying') {
        aValue = parseStrikeSymbol(a.strike_symbol || '').underlying;
        bValue = parseStrikeSymbol(b.strike_symbol || '').underlying;
      } else if (sortField === 'type') {
        aValue = parseStrikeSymbol(a.strike_symbol || '').type;
        bValue = parseStrikeSymbol(b.strike_symbol || '').type;
      } else if (sortField === 'strike') {
        aValue = Number(parseStrikeSymbol(a.strike_symbol || '').strike) || 0;
        bValue = Number(parseStrikeSymbol(b.strike_symbol || '').strike) || 0;
      } else if (sortField === 'pnl') {
        aValue = Number(a.pnl || 0);
        bValue = Number(b.pnl || 0);
      } else if (sortField === 'entry_price' || sortField === 'exit_price') {
        aValue = Number(a[sortField] || 0);
        bValue = Number(b[sortField] || 0);
      } else if (sortField === 'signal_time' || sortField === 'entry_time') {
        aValue = new Date(a[sortField] || 0).getTime();
        bValue = new Date(b[sortField] || 0).getTime();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [filteredOrders, sortField, sortDirection]);

  // Split filtered orders into live/open orders and completed/old orders - similar to TradesPage
  const { liveOrders, completedOrders } = useMemo(() => {
    const liveOrders = [];
    const completedOrders = [];
    
    for (const order of sortedOrders) {
      // Open orders go to "Live Orders" regardless of date
      if (order.status === 'OPEN' || order.status === 'AWAITING_ENTRY') {
        liveOrders.push(order);
      } else {
        // Completed orders go to "Completed Orders"
        completedOrders.push(order);
      }
    }
    
    return { liveOrders: liveOrders, completedOrders: completedOrders };
  }, [sortedOrders]);

  // P&L Graph Data Processing
  const getPnlGraphData = () => {
    if (!sortedOrders || sortedOrders.length === 0) {
      return [];
    }
    
    const dailyPnl = new Map();
    
    sortedOrders.forEach(order => {
      if (order.entry_time) {
        const date = new Date(order.entry_time).toISOString().split('T')[0];
        const currentPnl = dailyPnl.get(date) || 0;
        dailyPnl.set(date, currentPnl + (order.pnl || 0));
      }
    });
    
    // Convert to array and sort by date
    const sortedData = Array.from(dailyPnl.entries())
      .map(([date, pnl]) => ({
        date,
        pnl: Number(pnl.toFixed(2)),
        formattedDate: new Date(date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short'
        }),
        cumulativePnl: 0 // Will be calculated below
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate cumulative P&L
    let cumulative = 0;
    sortedData.forEach(item => {
      cumulative += item.pnl;
      item.cumulativePnl = Number(cumulative.toFixed(2));
    });
    
    return sortedData;
  };

  const pnlGraphData = getPnlGraphData();

  // Calculate risk metrics
  const calculateRiskMetrics = () => {
    if (!dailyPnlHistory || dailyPnlHistory.history.length === 0) {
      return {
        sharpeRatio: 0,
        maxDrawdown: 0,
        avgDailyReturn: 0,
        volatility: 0,
        bestDay: 0,
        worstDay: 0
      };
    }

    const dailyReturns = dailyPnlHistory.history.map(day => day.daily_pnl);
    const n = dailyReturns.length;
    
    // Average daily return
    const avgDailyReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / n;
    
    // For single day, volatility is 0, so Sharpe ratio is not meaningful
    if (n === 1) {
      return {
        sharpeRatio: 0, // Could also show 'N/A' for insufficient data
        maxDrawdown: 0,
        avgDailyReturn: Math.round(avgDailyReturn * 100) / 100,
        volatility: 0,
        bestDay: Math.round(dailyReturns[0] * 100) / 100,
        worstDay: Math.round(dailyReturns[0] * 100) / 100
      };
    }
    
    // Volatility (standard deviation)
    const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgDailyReturn, 2), 0) / n;
    const volatility = Math.sqrt(variance);
    
    // Sharpe ratio (assuming risk-free rate of 0 for simplicity)
    const sharpeRatio = volatility > 0 ? (avgDailyReturn / volatility) : 0;
    
    // Max drawdown calculation - return actual loss amount instead of percentage
    let maxDrawdownAmount = 0;
    let maxDrawdownPercent = 0;
    let peak = dailyPnlHistory.history[0]?.cumulative_pnl || 0;
    
    for (const day of dailyPnlHistory.history) {
      if (day.cumulative_pnl > peak) {
        peak = day.cumulative_pnl;
      }
      const drawdownAmount = peak - day.cumulative_pnl;
      const drawdownPercent = peak > 0 ? (drawdownAmount / Math.abs(peak)) * 100 : 0;
      
      if (drawdownAmount > maxDrawdownAmount) {
        maxDrawdownAmount = drawdownAmount;
      }
      if (drawdownPercent > maxDrawdownPercent) {
        maxDrawdownPercent = drawdownPercent;
      }
    }
    
    // Best and worst days
    const bestDay = Math.max(...dailyReturns);
    const worstDay = Math.min(...dailyReturns);
    
    return {
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      maxDrawdown: Math.round(maxDrawdownPercent * 100) / 100,
      maxDrawdownAmount: Math.round(maxDrawdownAmount * 100) / 100,
      avgDailyReturn: Math.round(avgDailyReturn * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      bestDay: Math.round(bestDay * 100) / 100,
      worstDay: Math.round(worstDay * 100) / 100
    };
  };

  const riskMetrics = calculateRiskMetrics();

  // Emergency actions
  const handleEmergencyStopAll = async () => {
    if (!confirm('⚠️ EMERGENCY STOP: This will first exit ALL open orders, then disable ALL active strategies. Are you sure?')) {
      return;
    }
    
    // Second confirmation for this critical action
    if (!confirm('⚠️ FINAL CONFIRMATION: This action will:\n1. Exit ALL open orders across ALL strategies and brokers\n2. Disable ALL active strategies\n\nThis action cannot be undone. Continue?')) {
      return;
    }
    
    try {
      console.log('Emergency stop: Starting comprehensive shutdown...');
      const activeStrategiesList = strategies.filter(s => s.enabled);
      
      // Step 1: Exit all open orders first
      const activeOrders = orders.filter(order => order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED');
      
      if (activeOrders.length > 0) {
        showToast({
          type: "info",
          title: "Emergency Stop - Step 1/2",
          message: `Exiting ${activeOrders.length} open orders first...`
        });
        
        try {
          const exitResponse = await apiClient.exitAllOrders('emergency_stop');
          console.log('Exit all orders response during emergency stop:', exitResponse);
          
          if (exitResponse.success) {
            showToast({
              type: "success",
              title: "Emergency Stop - Orders Exited",
              message: `Successfully initiated exit for ${activeOrders.length} open orders. Now disabling strategies...`
            });
          } else {
            showToast({
              type: "error",
              title: "Emergency Stop - Partial Success",
              message: "Some orders may not have been exited properly. Proceeding with strategy shutdown..."
            });
          }
          
          // Wait a moment for orders to start exiting
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (exitErr) {
          console.error('Exit all orders failed during emergency stop:', exitErr);
          showToast({
            type: "error",
            title: "Emergency Stop - Exit Orders Failed",
            message: "Failed to exit some orders. Proceeding with strategy shutdown anyway..."
          });
        }
      } else {
        showToast({
          type: "info",
          title: "Emergency Stop - No Open Orders",
          message: "No open orders found. Proceeding to disable strategies..."
        });
      }
      
      // Step 2: Disable all active strategies
      showToast({
        type: "info",
        title: "Emergency Stop - Step 2/2",
        message: `Disabling ${activeStrategiesList.length} active strategies...`
      });
      
      const disablePromises = activeStrategiesList.map(strategy => 
        apiClient.disableStrategy(strategy.id)
      );
      
      await Promise.all(disablePromises);
      
      // Refresh data
      await loadDashboardData(true);
      
      showToast({
        type: "success",
        title: "Emergency Stop Completed",
        message: `✅ Emergency stop completed successfully!\n• ${activeOrders.length} orders exited\n• ${activeStrategiesList.length} strategies disabled`
      });
      
    } catch (err) {
      console.error('Emergency stop failed:', err);
      showToast({
        type: "error",
        title: "Emergency Stop Failed",
        message: "❌ Emergency stop failed. Please check all orders and strategies manually."
      });
    }
  };

  const handleExitAllPositions = async () => {
    if (!confirm('⚠️ EXIT ALL POSITIONS: This will attempt to exit all open orders/positions. Are you sure?')) {
      return;
    }
    
    // Second confirmation for this critical action
    if (!confirm('⚠️ FINAL CONFIRMATION: This action will exit ALL open orders across ALL strategies and brokers. This action cannot be undone. Continue?')) {
      return;
    }
    
    try {
      console.log('Attempting to exit all positions...');
      
      // Check if there are any enabled brokers
      const enabledBrokers = brokers.filter(broker => broker.is_enabled);
      if (enabledBrokers.length === 0) {
        showToast({
          type: "info",
          title: "No Active Brokers",
          message: "No brokers are currently enabled. Please enable at least one broker to exit positions."
        });
        return;
      }
      
      // Check if there are any active orders to exit
      const activeOrders = orders.filter(order => order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED');
      if (activeOrders.length === 0) {
        showToast({
          type: "info",
          title: "No Active Orders",
          message: "There are no open orders to exit."
        });
        return;
      }
      
      showToast({
        type: "info",
        title: "Exiting All Positions",
        message: `Initiating exit for ${activeOrders.length} open orders across ${enabledBrokers.length} active brokers. Please wait...`
      });
      
      // Call the exit_all_orders API endpoint with manual exit reason
      const response = await apiClient.exitAllOrders('manual');
      
      console.log('Exit all positions response:', response);
      
      if (response.success) {
        showToast({
          type: "success",
          title: "Exit All Positions Initiated",
          message: response.message || "All open orders have been scheduled for exit successfully"
        });
        
        // Refresh the dashboard data to show updated order statuses
        await loadDashboardData(true);
      } else {
        showToast({
          type: "error",
          title: "Exit All Positions Failed",
          message: response.message || "Failed to exit all positions"
        });
      }
    } catch (err) {
      console.error('Exit all positions failed:', err);
      const errorMessage = err instanceof Error ? err.message : "Failed to exit all positions";
      
      showToast({
        type: "error",
        title: "Exit All Positions Failed",
        message: errorMessage
      });
    }
  };

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

        // Refresh the dashboard data to show updated status
        await loadDashboardData(true);
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

  const handleResetDatabase = async () => {
    // First confirmation with detailed warning
    if (!confirm('⚠️ CRITICAL WARNING: DATABASE RESET\n\n' +
                 'This action will PERMANENTLY DELETE:\n' +
                 '• ALL orders and their execution history\n' +
                 '• ALL trading data from broker_executions table\n' +
                 '• This action is IRREVERSIBLE\n\n' +
                 'IMPORTANT: Please ensure all open orders are closed in all brokers before proceeding.\n\n' +
                 'Your strategies, brokers, and configurations will remain intact.\n\n' +
                 'Are you absolutely sure you want to continue?')) {
      return;
    }
    
    // Second confirmation with typing requirement
    const confirmText = prompt('⚠️ FINAL CONFIRMATION\n\n' +
                              'To proceed with the database reset, please type: RESET DATABASE\n\n' +
                              'This will delete all order and execution data permanently.');
    
    if (confirmText !== 'RESET DATABASE') {
      showToast({
        type: "info",
        title: "Database Reset Cancelled",
        message: "Database reset cancelled - confirmation text did not match."
      });
      return;
    }
    
    try {
      showToast({
        type: "info",
        title: "Database Reset Starting",
        message: "⚠️ Resetting database... This may take a few moments."
      });
      
      console.log('Initiating database reset...');
      const response = await apiClient.resetDatabase();
      
      console.log('Database reset response:', response);
      
      if (response.status === 'success') {
        // Refresh dashboard data to reflect empty state
        await loadDashboardData(true);
        
        showToast({
          type: "success",
          title: "Database Reset Completed",
          message: `✅ Database reset successful!\n• ${response.summary.deleted_orders} orders deleted\n• ${response.summary.deleted_broker_executions} executions deleted\n• Total records removed: ${response.summary.total_deleted}`
        });
      } else {
        showToast({
          type: "error",
          title: "Database Reset Failed",
          message: response.message || "Failed to reset database"
        });
      }
    } catch (err) {
      console.error('Database reset failed:', err);
      const errorMessage = err instanceof Error ? err.message : "Failed to reset database";
      
      showToast({
        type: "error",
        title: "Database Reset Failed",
        message: `❌ ${errorMessage}. Please check the logs and try again.`
      });
    }
  };

  // Helper function to get balance summary for a specific broker
  const getBrokerBalance = (brokerName: string) => {
    const balanceSummary = balanceSummaries.find(
      summary => summary.broker_name.toLowerCase() === brokerName.toLowerCase()
    );
    
    if (balanceSummary) {
      return {
        total_balance: balanceSummary.summary.total_balance,
        available: balanceSummary.summary.available,
        utilized: balanceSummary.summary.utilized,
        fetched_at: balanceSummary.fetched_at
      };
    }
    
    // Return default values if no balance summary found
    return {
      total_balance: 0,
      available: 0,
      utilized: 0,
      fetched_at: null
    };
  };

  // Check if market is open - memoized function to prevent unnecessary re-renders
  const checkMarketStatus = useCallback(() => {
    const now = new Date();
    
    // Get IST time components directly using the reliable method
    const istHours = parseInt(now.toLocaleString('en-US', {timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false}));
    const istMinutes = parseInt(now.toLocaleString('en-US', {timeZone: 'Asia/Kolkata', minute: '2-digit'}));
    const istDay = new Date(now.toLocaleString('en-US', {timeZone: 'Asia/Kolkata'})).getDay(); // 0 = Sunday, 6 = Saturday
    
    // Format date for holiday check
    const istDate = new Date(now.toLocaleString('en-US', {timeZone: 'Asia/Kolkata'}));
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const date = String(istDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${date}`; // YYYY-MM-DD format
    
    // Check if it's weekend
    if (istDay === 0 || istDay === 6) {
      setIsMarketOpen(false);
      return;
    }
    
    // Check if it's a holiday (only if holidays are loaded)
    if (holidaysLoaded && holidays.includes(dateString)) {
      setIsMarketOpen(false);
      return;
    }
    
    // Check market hours (9:15 AM to 3:30 PM IST)
    const currentTimeMinutes = istHours * 60 + istMinutes;
    const marketOpenMinutes = 9 * 60 + 15; // 9:15 AM = 555 minutes
    const marketCloseMinutes = 15 * 60 + 30; // 3:30 PM = 930 minutes
    
    const isWithinMarketHours = currentTimeMinutes >= marketOpenMinutes && currentTimeMinutes <= marketCloseMinutes;
    
    setIsMarketOpen(isWithinMarketHours);
  }, [holidays, holidaysLoaded]); // Dependencies: holidays data

  // Holiday caching constants
  const HOLIDAY_CACHE_KEY = 'nse_holidays_cache';
  const HOLIDAY_CACHE_EXPIRY_KEY = 'nse_holidays_cache_expiry';
  const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

  // Check if holiday cache is valid - simple function without useCallback
  const isHolidayCacheValid = () => {
    try {
      const expiry = localStorage.getItem(HOLIDAY_CACHE_EXPIRY_KEY);
      if (!expiry) return false;
      return new Date().getTime() < parseInt(expiry);
    } catch (error) {
      console.error('Error checking holiday cache:', error);
      return false;
    }
  };

  // Get holidays from cache - simple function without useCallback
  const getHolidaysFromCache = (): string[] | null => {
    try {
      if (!isHolidayCacheValid()) return null;
      const cached = localStorage.getItem(HOLIDAY_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error reading holiday cache:', error);
      return null;
    }
  };

  // Save holidays to cache - simple function without useCallback
  const saveHolidaysToCache = (holidayList: string[]) => {
    try {
      const expiry = new Date().getTime() + CACHE_DURATION;
      localStorage.setItem(HOLIDAY_CACHE_KEY, JSON.stringify(holidayList));
      localStorage.setItem(HOLIDAY_CACHE_EXPIRY_KEY, expiry.toString());
      console.log('Holidays cached successfully');
    } catch (error) {
      console.error('Error caching holidays:', error);
    }
  };

  // Fetch holidays with caching - simple function without useCallback
  const fetchHolidays = async () => {
    try {
      if (!isAuthenticated) return;
      
      // Check cache first
      const cachedHolidays = getHolidaysFromCache();
      if (cachedHolidays) {
        console.log('Using cached holidays:', cachedHolidays.length, 'holidays');
        setHolidays(cachedHolidays);
        setHolidaysLoaded(true);
        return;
      }
      
      // Fetch from API if not cached
      console.log('Fetching holidays from API...');
      const holidayList = await apiClient.getNseHolidayList();
      setHolidays(holidayList);
      setHolidaysLoaded(true);
      
      // Cache the result
      saveHolidaysToCache(holidayList);
      console.log('Holidays fetched and cached:', holidayList.length, 'holidays');
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
      setHolidaysLoaded(true); // Mark as loaded even on error to prevent retries
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Prevent duplicate initialization during React development mode double-rendering
    if (isInitializingRef.current) {
      console.log('Dashboard: Skipping duplicate initialization');
      return;
    }
    
    isInitializingRef.current = true;
    
    // Force immediate market status check (before anything else)
    console.log('🚀 Dashboard mounted - checking market status immediately...');
    checkMarketStatus();
    
    // Initial load
    loadDashboardData(false);
    
    // Set up auto-refresh for system metrics (background refresh to prevent page flipping)
    const refreshInterval = setInterval(() => {
      loadDashboardData(true); // Background refresh
    }, 60000); // Refresh every 60 seconds

    // Set up market status check interval
    const marketStatusInterval = setInterval(() => {
      checkMarketStatus();
    }, 30000); // Check market status every 30 seconds

    return () => {
      clearInterval(refreshInterval);
      clearInterval(marketStatusInterval);
      isInitializingRef.current = false; // Reset on cleanup
    };
  }, [isAuthenticated, router]); // Only include primitive dependencies to avoid circular deps

  // Separate useEffect for holidays - only run once on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Prevent duplicate holiday fetching
    if (holidaysInitializingRef.current) {
      console.log('Dashboard: Skipping duplicate holiday fetch');
      return;
    }
    
    holidaysInitializingRef.current = true;
    
    // Define functions inside useEffect to avoid dependency issues
    const fetchHolidaysOnMount = async () => {
      try {
        // Check cache first
        const cachedHolidays = getHolidaysFromCache();
        if (cachedHolidays) {
          console.log('Using cached holidays:', cachedHolidays.length, 'holidays');
          setHolidays(cachedHolidays);
          setHolidaysLoaded(true);
          // After holidays are loaded, check market status immediately
          setTimeout(() => checkMarketStatus(), 100);
          return;
        }
        
        // Fetch from API if not cached
        console.log('Fetching holidays from API...');
        const holidayList = await apiClient.getNseHolidayList();
        setHolidays(holidayList);
        setHolidaysLoaded(true);
        
        // Cache the result
        saveHolidaysToCache(holidayList);
        console.log('Holidays fetched and cached:', holidayList.length, 'holidays');
        // After holidays are loaded, check market status immediately
        setTimeout(() => checkMarketStatus(), 100);
      } catch (err) {
        console.error('Failed to fetch holidays:', err);
        setHolidaysLoaded(true);
        // Even if holidays fail, check market status
        setTimeout(() => checkMarketStatus(), 100);
      }
    };
    
    // Initial fetch only
    fetchHolidaysOnMount();
    
    // Cleanup function to reset the ref
    return () => {
      holidaysInitializingRef.current = false;
    };
  }, [isAuthenticated]); // Only depend on authentication

  const loadDashboardData = useCallback(async (isBackgroundRefresh = false) => {
    try {
      // Rate limiting check - prevent calls more frequent than 60 seconds
      const now = new Date();
      const timeSinceLastCall = now.getTime() - lastApiCall.getTime();
      
      if (isBackgroundRefresh && timeSinceLastCall < MIN_API_INTERVAL) {
        console.log(`Dashboard: Skipping API call, only ${Math.round(timeSinceLastCall/1000)}s since last call (min: ${MIN_API_INTERVAL/1000}s)`);
        return;
      }
      
      setLastApiCall(now);
      
      // Only show loading state for initial load, not background refreshes
      if (!isBackgroundRefresh) {
        setIsLoading(true);
      }
      setError(null);
      console.log('Dashboard: Starting to load data...');

      // Initialize arrays in case API calls fail
      let strategiesData: Strategy[] = [];
      let brokersData: Broker[] = [];
      let balanceSummariesData: BrokerBalanceSummary[] = [];
      let positionsData: Position[] = [];
      let tradesData: Trade[] = [];
      let ordersData: any[] = [];
      let systemStatusData: SystemStatus | null = null;
      let healthStatusData: HealthStatus | null = null;
      let dashboardSummaryData: DashboardSummary | null = null;

      // Load data concurrently for better performance
      const [strategiesResult, brokersResult, balanceSummariesResult, positionsResult, tradesResult, ordersResult, systemStatusResult, healthResult, dashboardSummaryResult, overallPnlResult, strategyStatsResult, dailyPnlResult, perStrategyStatsResult] = 
        await Promise.allSettled([
          apiClient.getStrategies(),
          apiClient.getBrokers(),
          apiClient.getBalanceSummaries(),
          apiClient.getPositions(),
          apiClient.getTrades(),
          apiClient.getOrders(),
          apiClient.getSystemStatus(),
          apiClient.healthCheck(),
          apiClient.getDashboardSummary(),
          apiClient.getOrdersPnlStats(), // Get overall PNL stats
          apiClient.getStrategyStats(), // Get strategy profit/loss stats
          apiClient.getDailyPnlHistory(365), // Get 1 year of daily P&L history to match overall P&L scope
          apiClient.getPerStrategyStats() // Get per-strategy statistics
        ]);

      // Handle strategies
      if (strategiesResult.status === 'fulfilled') {
        strategiesData = strategiesResult.value;
        
        // If it's initial load (not background refresh), fetch symbol counts
        if (!isBackgroundRefresh) {
          try {
            const strategiesWithCounts = await Promise.all(
              strategiesData.map(async (strategy: any) => {
                try {
                  const symbols = await apiClient.getStrategySymbols(strategy.id);
                  return {
                    ...strategy,
                    symbolCount: symbols ? symbols.length : 0
                  };
                } catch (error) {
                  console.warn(`Failed to fetch symbols for strategy ${strategy.id}:`, error);
                  return {
                    ...strategy,
                    symbolCount: 0
                  };
                }
              })
            );
            strategiesData = strategiesWithCounts;
            console.log('Dashboard: Strategies with symbol counts loaded:', strategiesData);
          } catch (error) {
            console.error('Dashboard: Error fetching symbol counts:', error);
          }
        }
      } else {
        console.error('Dashboard: Failed to load strategies:', strategiesResult.reason);
      }
      setStrategies(strategiesData);

      // Handle brokers
      if (brokersResult.status === 'fulfilled') {
        brokersData = brokersResult.value;
      } else {
        console.error('Dashboard: Failed to load brokers:', brokersResult.reason);
      }
      setBrokers(brokersData);

      // Handle balance summaries
      if (balanceSummariesResult.status === 'fulfilled') {
        balanceSummariesData = balanceSummariesResult.value;
      } else {
        console.error('Dashboard: Failed to load balance summaries:', balanceSummariesResult.reason);
      }
      setBalanceSummaries(balanceSummariesData);

      // Handle positions
      if (positionsResult.status === 'fulfilled') {
        positionsData = positionsResult.value;
      } else {
        console.error('Dashboard: Failed to load positions:', positionsResult.reason);
      }
      setPositions(positionsData);

      // Handle trades
      if (tradesResult.status === 'fulfilled') {
        tradesData = tradesResult.value;
      } else {
        console.error('Dashboard: Failed to load trades:', tradesResult.reason);
      }
      setTrades(tradesData);

      // Handle orders
      if (ordersResult.status === 'fulfilled') {
        ordersData = ordersResult.value;
        console.log('Dashboard: Orders data received in loadDashboardData:', ordersData);
        console.log('Dashboard: First order broker_executions in loadDashboardData:', ordersData[0]?.broker_executions);
      } else {
        console.error('Dashboard: Failed to load orders:', ordersResult.reason);
      }
      setOrders(ordersData);

      // Handle system status
      if (systemStatusResult.status === 'fulfilled') {
        systemStatusData = systemStatusResult.value;
        setSystemStatus(systemStatusData);
        
        // Extract VM details if available
        if (systemStatusData && systemStatusData.vm) {
          setVmDetails(systemStatusData.vm);
        }
        
        // Extract latest metrics from system status
        if (systemStatusData) {
          const extractLatestValue = (metric: any) => {
            try {
              if (!metric || !metric.usage || typeof metric.usage !== 'object') {
                return 0;
              }
              const timestamps = Object.keys(metric.usage).sort((a, b) => parseInt(b) - parseInt(a));
              return timestamps.length > 0 ? (metric.usage[timestamps[0]] || 0) : 0;
            } catch (error) {
              console.warn('Error extracting metric value:', error);
              return 0;
            }
          };

          try {
            const metrics = systemStatusData.metrics || {};
            
            setSystemMetrics({
              cpuUsage: extractLatestValue(metrics.cpu_usage),
              ramUsage: extractLatestValue(metrics.ram_usage),
              diskUsage: extractLatestValue(metrics.disk_space),
              uptime: extractLatestValue(metrics.uptime),
              incomingTraffic: extractLatestValue(metrics.incoming_traffic),
              outgoingTraffic: extractLatestValue(metrics.outgoing_traffic)
            });
          } catch (error) {
            console.warn('Error setting system metrics:', error);
            // Set default values if extraction fails
            setSystemMetrics({
              cpuUsage: 0,
              ramUsage: 0,
              diskUsage: 0,
              uptime: 0,
              incomingTraffic: 0,
              outgoingTraffic: 0
            });
          }
        }
      } else {
        console.error('Dashboard: Failed to load system status:', systemStatusResult.reason);
      }

      // Handle health status
      if (healthResult.status === 'fulfilled') {
        healthStatusData = healthResult.value;
        setHealthStatus(healthStatusData);
        setApiHealthy(healthStatusData.status === 'healthy');
      } else {
        console.error('Dashboard: Failed to load health status:', healthResult.reason);
        setApiHealthy(false);
      }

      // Handle dashboard summary
      if (dashboardSummaryResult.status === 'fulfilled') {
        dashboardSummaryData = dashboardSummaryResult.value;
        setDashboardSummary(dashboardSummaryData);
      } else {
        console.error('Dashboard: Failed to load dashboard summary:', dashboardSummaryResult.reason);
      }

      // Handle overall PNL stats
      if (overallPnlResult.status === 'fulfilled') {
        setOverallPnlStats(overallPnlResult.value);
        console.log('Dashboard: Overall PNL stats loaded:', overallPnlResult.value);
      } else {
        console.error('Dashboard: Failed to load overall PNL stats:', overallPnlResult.reason);
        setOverallPnlStats(null);
      }

      // Handle strategy stats
      if (strategyStatsResult.status === 'fulfilled') {
        setStrategyStats(strategyStatsResult.value);
        console.log('Dashboard: Strategy stats loaded:', strategyStatsResult.value);
      } else {
        console.error('Dashboard: Failed to load strategy stats:', strategyStatsResult.reason);
        setStrategyStats(null);
      }

      // Handle per-strategy stats
      if (perStrategyStatsResult.status === 'fulfilled') {
        setPerStrategyStats(perStrategyStatsResult.value);
        console.log('Dashboard: Per-strategy stats loaded:', perStrategyStatsResult.value);
      } else {
        console.error('Dashboard: Failed to load per-strategy stats:', perStrategyStatsResult.reason);
        setPerStrategyStats(null);
      }

      // Handle daily P&L history
      if (dailyPnlResult.status === 'fulfilled') {
        setDailyPnlHistory(dailyPnlResult.value);
        console.log('Dashboard: Daily P&L history loaded:', dailyPnlResult.value);
      } else {
        console.error('Dashboard: Failed to load daily P&L history:', dailyPnlResult.reason);
        setDailyPnlHistory(null);
      }

      // Calculate stats
      const totalPnL = positionsData.reduce((sum, pos) => sum + (pos.pnl || 0), 0);
      setStats({
        totalStrategies: strategiesData.length,
        activeStrategies: strategiesData.filter(s => s.enabled).length,
        totalBrokers: brokersData.length,
        activeBrokers: brokersData.filter(b => b.is_enabled).length,
        totalPositions: positionsData.length,
        totalPnL
      });
    } catch (err) {
      console.error('Dashboard: Critical error:', err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      if (!isBackgroundRefresh) {
        setIsLoading(false);
      }
      // Update last data refresh time
      setLastDataUpdate(new Date());
    }
  }, []); // Empty dependency array since this function uses only state setters and API calls

  const loadBrokerData = async () => {
    try {
      console.log('Dashboard: Loading broker data...');
      
      // Load both brokers and balance summaries concurrently
      const [brokersResult, balanceSummariesResult] = await Promise.allSettled([
        apiClient.getBrokers(),
        apiClient.getBalanceSummaries()
      ]);
      
      // Handle brokers
      let brokersData: Broker[] = [];
      if (brokersResult.status === 'fulfilled') {
        brokersData = brokersResult.value;
        setBrokers(brokersData);
      } else {
        console.error('Dashboard: Failed to load brokers:', brokersResult.reason);
      }
      
      // Handle balance summaries
      if (balanceSummariesResult.status === 'fulfilled') {
        setBalanceSummaries(balanceSummariesResult.value);
        console.log('Dashboard: Balance summaries loaded:', balanceSummariesResult.value.length);
      } else {
        console.error('Dashboard: Failed to load balance summaries:', balanceSummariesResult.reason);
      }
      
      // Update stats with fresh broker data
      setStats(prevStats => ({
        ...prevStats,
        totalBrokers: brokersData.length,
        activeBrokers: brokersData.filter(b => b.is_enabled).length,
      }));
      
      console.log('Dashboard: Broker data loaded successfully');
    } catch (err) {
      console.error('Dashboard: Failed to load broker data:', err);
      setError(err instanceof Error ? err.message : "Failed to load broker data");
    }
  };

  // Handler to refresh brokers data
  const handleRefreshBrokers = async () => {
    setBrokersLoading(true);
    setError(null);
    try {
      console.log('Dashboard: Refreshing broker data...');
      const data = await apiClient.getBrokers();
      setBrokers(data);
      
      // Also refresh balance summaries
      const balanceData = await apiClient.getBalanceSummaries();
      setBalanceSummaries(balanceData);
      
      console.log('Dashboard: Broker data refreshed successfully');
    } catch (err) {
      console.error('Dashboard: Failed to refresh brokers:', err);
      setError("Failed to refresh brokers");
    } finally {
      setBrokersLoading(false);
    }
  };

  const handleRefreshOverview = async () => {
    setOverviewLoading(true);
    setError(null);
    try {
      console.log('Dashboard: Refreshing overview data...');
      
      // Load overview-specific data concurrently
      const [positionsResult, dashboardSummaryResult, overallPnlResult, dailyPnlResult, balanceSummariesResult] = await Promise.allSettled([
        apiClient.getPositions(),
        apiClient.getDashboardSummary(),
        apiClient.getOrdersPnlStats(),
        apiClient.getDailyPnlHistory(365),
        apiClient.getBalanceSummaries()
      ]);
      
      // Handle positions
      if (positionsResult.status === 'fulfilled') {
        setPositions(positionsResult.value);
      } else {
        console.error('Dashboard: Failed to refresh positions:', positionsResult.reason);
      }
      
      // Handle dashboard summary
      if (dashboardSummaryResult.status === 'fulfilled') {
        setDashboardSummary(dashboardSummaryResult.value);
      } else {
        console.error('Dashboard: Failed to refresh dashboard summary:', dashboardSummaryResult.reason);
      }
      
      // Handle overall PNL stats
      if (overallPnlResult.status === 'fulfilled') {
        setOverallPnlStats(overallPnlResult.value);
      } else {
        console.error('Dashboard: Failed to refresh PNL stats:', overallPnlResult.reason);
      }
      
      // Handle daily PNL history
      if (dailyPnlResult.status === 'fulfilled') {
        setDailyPnlHistory(dailyPnlResult.value);
      } else {
        console.error('Dashboard: Failed to refresh daily PNL history:', dailyPnlResult.reason);
      }
      
      // Handle balance summaries
      if (balanceSummariesResult.status === 'fulfilled') {
        setBalanceSummaries(balanceSummariesResult.value);
      } else {
        console.error('Dashboard: Failed to refresh balance summaries:', balanceSummariesResult.reason);
      }
      
      console.log('Dashboard: Overview data refreshed successfully');
    } catch (err) {
      console.error('Dashboard: Failed to refresh overview:', err);
      setError("Failed to refresh overview data");
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleRefreshStrategies = async () => {
    setStrategiesLoading(true);
    setError(null);
    try {
      console.log('Dashboard: Refreshing strategies data...');
      
      // Load strategies-specific data concurrently
      const [strategiesResult, strategyStatsResult, perStrategyStatsResult] = await Promise.allSettled([
        apiClient.getStrategies(),
        apiClient.getStrategyStats(),
        apiClient.getPerStrategyStats()
      ]);
      
      // Handle strategies
      if (strategiesResult.status === 'fulfilled') {
        const strategiesData = strategiesResult.value;
        
        // Fetch symbols for each strategy and update symbolCount
        const strategiesWithCounts = await Promise.all(
          strategiesData.map(async (strategy: any) => {
            try {
              const symbols = await apiClient.getStrategySymbols(strategy.id);
              return {
                ...strategy,
                symbolCount: symbols ? symbols.length : 0
              };
            } catch (error) {
              console.warn(`Failed to fetch symbols for strategy ${strategy.id}:`, error);
              return {
                ...strategy,
                symbolCount: 0
              };
            }
          })
        );
        
        setStrategies(strategiesWithCounts);
        console.log('Dashboard: Strategies with symbol counts loaded:', strategiesWithCounts);
      } else {
        console.error('Dashboard: Failed to refresh strategies:', strategiesResult.reason);
      }
      
      // Handle strategy stats
      if (strategyStatsResult.status === 'fulfilled') {
        setStrategyStats(strategyStatsResult.value);
      } else {
        console.error('Dashboard: Failed to refresh strategy stats:', strategyStatsResult.reason);
      }
      
      // Handle per-strategy stats
      if (perStrategyStatsResult.status === 'fulfilled') {
        setPerStrategyStats(perStrategyStatsResult.value);
      } else {
        console.error('Dashboard: Failed to refresh per-strategy stats:', perStrategyStatsResult.reason);
      }
      
      console.log('Dashboard: Strategies data refreshed successfully');
    } catch (err) {
      console.error('Dashboard: Failed to refresh strategies:', err);
      setError("Failed to refresh strategies data");
    } finally {
      setStrategiesLoading(false);
    }
  };

  const handleRefreshOrders = async () => {
    setOrdersLoading(true);
    setError(null);
    try {
      console.log('Dashboard: Refreshing orders data...');
      
      // Load orders-specific data concurrently
      const [ordersResult, overallPnlResult] = await Promise.allSettled([
        apiClient.getOrders(),
        apiClient.getOrdersPnlStats()
      ]);
      
      // Handle orders
      if (ordersResult.status === 'fulfilled') {
        console.log('Dashboard: Orders data received:', ordersResult.value);
        console.log('Dashboard: First order broker_executions:', ordersResult.value[0]?.broker_executions);
        if (ordersResult.value[0]?.broker_executions && ordersResult.value[0].broker_executions.length > 0) {
          console.log('Dashboard: First broker execution details:', ordersResult.value[0].broker_executions[0]);
          console.log('Dashboard: Broker execution fields:', Object.keys(ordersResult.value[0].broker_executions[0]));
        }
        setOrders(ordersResult.value);
      } else {
        console.error('Dashboard: Failed to refresh orders:', ordersResult.reason);
      }
      
      // Handle overall PnL stats (related to orders)
      if (overallPnlResult.status === 'fulfilled') {
        setOverallPnlStats(overallPnlResult.value);
      } else {
        console.error('Dashboard: Failed to refresh overall PnL stats:', overallPnlResult.reason);
      }
      
      console.log('Dashboard: Orders data refreshed successfully');
    } catch (err) {
      console.error('Dashboard: Failed to refresh orders:', err);
      setError("Failed to refresh orders data");
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleTabChange = async (tabId: string) => {
    setActiveTab(tabId);
    
    // Reload data for specific tabs to ensure fresh data after auth issues
    if (tabId === "brokers") {
      await loadBrokerData();
    }
  };

  const toggleBroker = async (brokerName: string, enabled: boolean) => {
    const buttonKey = `broker-${brokerName}`;
    setButtonLoading(prev => ({ ...prev, [buttonKey]: true }));
    
    try {
      console.log('toggleBroker called:', { brokerName, enabled });
      if (enabled) {
        await apiClient.enableBroker(brokerName);
        // Immediately update the broker state
        setBrokers(prev => prev.map(broker => 
          broker.broker_name === brokerName 
            ? { ...broker, is_enabled: true }
            : broker
        ));
        showToast({
          type: "success",
          title: "Broker Enabled",
          message: `${brokerName} has been enabled successfully`
        });
      } else {
        await apiClient.disableBroker(brokerName);
        // Immediately update the broker state
        setBrokers(prev => prev.map(broker => 
          broker.broker_name === brokerName 
            ? { ...broker, is_enabled: false }
            : broker
        ));
        showToast({
          type: "success", 
          title: "Broker Disabled",
          message: `${brokerName} has been disabled successfully`
        });
      }
      
      // Background refresh for any other data that might have changed
      loadDashboardData(true);
    } catch (err) {
      console.error('toggleBroker error:', err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update broker";
      setError(errorMessage);
      showToast({
        type: "error",
        title: "Broker Update Failed",
        message: errorMessage
      });
    } finally {
      setButtonLoading(prev => ({ ...prev, [buttonKey]: false }));
    }
  };

  const toggleDataProvider = async (brokerName: string, enabled: boolean) => {
    const buttonKey = `data-provider-${brokerName}`;
    setButtonLoading(prev => ({ ...prev, [buttonKey]: true }));
    
    try {
      console.log('toggleDataProvider called:', { brokerName, enabled });
      if (enabled) {
        await apiClient.enableDataProvider(brokerName);
        // Immediately update the broker state - disable others and enable this one
        setBrokers(prev => prev.map(broker => ({
          ...broker,
          is_data_provider: broker.broker_name === brokerName
        })));
        showToast({
          type: "success",
          title: "Data Provider Enabled",
          message: `${brokerName} is now the active data provider`
        });
        
        // Background refresh for any other data that might have changed
        loadDashboardData(true);
      }
      // Note: We don't handle disabling here as it's automatic when another broker is enabled
    } catch (err) {
      console.error('toggleDataProvider error:', err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update data provider";
      showToast({
        type: "error",
        title: "Data Provider Update Failed",
        message: errorMessage
      });
    } finally {
      setButtonLoading(prev => ({ ...prev, [buttonKey]: false }));
    }
  };

  const toggleTradeExecution = async (brokerName: string, enabled: boolean) => {
    const buttonKey = `trade-execution-${brokerName}`;
    setButtonLoading(prev => ({ ...prev, [buttonKey]: true }));
    
    try {
      if (enabled) {
        await apiClient.enableTradeExecution(brokerName);
        // Immediately update the broker state
        setBrokers(prev => prev.map(broker => 
          broker.broker_name === brokerName 
            ? { ...broker, trade_execution_enabled: true }
            : broker
        ));
        showToast({
          type: "success",
          title: "Trade Execution Enabled",
          message: `${brokerName} trade execution has been enabled`
        });
      } else {
        await apiClient.disableTradeExecution(brokerName);
        // Immediately update the broker state
        setBrokers(prev => prev.map(broker => 
          broker.broker_name === brokerName 
            ? { ...broker, trade_execution_enabled: false }
            : broker
        ));
        showToast({
          type: "success",
          title: "Trade Execution Disabled",
          message: `${brokerName} trade execution has been disabled`
        });
      }
      
      // Background refresh for any other data that might have changed
      loadDashboardData(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update trade execution";
      showToast({
        type: "error",
        title: "Trade Execution Update Failed",
        message: errorMessage
      });
    } finally {
      setButtonLoading(prev => ({ ...prev, [buttonKey]: false }));
    }
  };

  // Handler for editing risk limits
  const handleEditRiskLimits = (broker: Broker) => {
    setSelectedBrokerForRiskLimits(broker);
    setShowRiskLimitsModal(true);
  };

  // Handler for updating risk limits
  const handleUpdateRiskLimits = async (maxLoss: number, maxProfit: number) => {
    if (!selectedBrokerForRiskLimits) return;

    try {
      console.log('Updating risk limits:', { max_loss: maxLoss, max_profit: maxProfit });
      
      const updateData = {
        max_loss: maxLoss,
        max_profit: maxProfit
      };
      
      const response = await apiClient.updateBroker(selectedBrokerForRiskLimits.broker_name, updateData);
      console.log('Update response:', response);

      // Update the local state
      setBrokers(prev => prev.map(broker => 
        broker.id === selectedBrokerForRiskLimits.id 
          ? { ...broker, max_loss: maxLoss, max_profit: maxProfit }
          : broker
      ));

      showToast({
        type: "success",
        title: "Risk Limits Updated",
        message: `Risk limits for ${selectedBrokerForRiskLimits.broker_name} have been updated successfully`
      });

      setShowRiskLimitsModal(false);
      setSelectedBrokerForRiskLimits(null);
    } catch (err) {
      console.error('Risk limits update error:', err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update risk limits";
      showToast({
        type: "error",
        title: "Risk Limits Update Failed", 
        message: errorMessage
      });
    }
  };

  const reauthBroker = async (brokerName: string) => {
    const buttonKey = `reauth-${brokerName}`;
    setButtonLoading(prev => ({ ...prev, [buttonKey]: true }));
    
    try {
      await apiClient.reauthBroker(brokerName);
      showToast({
        type: "info",
        title: "Reauthentication Started",
        message: `${brokerName} reauthentication is in progress. Check status in a few moments.`
      });
      
      // Background refresh to check status after reauthentication
      setTimeout(() => loadDashboardData(true), 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reauth broker";
      showToast({
        type: "error",
        title: "Reauthentication Failed",
        message: errorMessage
      });
    } finally {
      setButtonLoading(prev => ({ ...prev, [buttonKey]: false }));
    }
  };

  const openBrokerConfig = (brokerName: string) => {
    console.log('openBrokerConfig called:', { brokerName });
    setSelectedBrokerForConfig(brokerName);
    setShowBrokerConfigModal(true);
  };

  const handleBrokerConfigSuccess = async () => {
    showToast({
      type: "success",
      title: "Configuration Updated",
      message: `${selectedBrokerForConfig} configuration has been updated successfully`
    });
    await loadDashboardData(true);
  };

  const toggleStrategy = async (strategyId: number, enabled: boolean) => {
    try {
      console.log(`Toggling strategy ${strategyId} to ${enabled ? 'enabled' : 'disabled'}`);
      
      if (enabled) {
        await apiClient.enableStrategy(strategyId);
      } else {
        await apiClient.disableStrategy(strategyId);
      }
      
      // Update local state immediately for better UX
      setStrategies(prev => prev.map(strategy => 
        strategy.id === strategyId 
          ? { ...strategy, enabled } 
          : strategy
      ));
      
      // Background refresh to get the latest data
      await loadDashboardData(true);
      
    } catch (err) {
      console.error('Strategy toggle error:', err);
      setError(err instanceof Error ? err.message : "Failed to update strategy");
      
      // Revert local state on error
      setStrategies(prev => prev.map(strategy => 
        strategy.id === strategyId 
          ? { ...strategy, enabled: !enabled } 
          : strategy
      ));
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to get total memory in bytes from VM details
  const getTotalMemoryBytes = () => {
    if (vmDetails?.memory) {
      const memoryBytes = vmDetails.memory * 1024 * 1024; // Convert MB to bytes
      return memoryBytes;
    }
    return 8 * 1024 * 1024 * 1024; // 8GB fallback
  };

  // Helper function to get total memory in GB for display
  const getTotalMemoryGB = () => {
    if (vmDetails?.memory) {
      const memoryGB = vmDetails.memory / 1024;
      return memoryGB;
    }
    return 8;
  };

  // Helper function to get total disk space in bytes from VM details
  const getTotalDiskBytes = () => {
    if (vmDetails?.disk) {
      const diskBytes = vmDetails.disk * 1024 * 1024; // Convert MB to bytes
      return diskBytes;
    }
    return 50 * 1024 * 1024 * 1024; // 50GB fallback
  };

  // Helper function to get total disk space in GB for display
  const getTotalDiskGB = () => {
    if (vmDetails?.disk) {
      const diskGB = vmDetails.disk / 1024;
      return diskGB;
    }
    return 50;
  };

  const formatUptime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Helper: Responsive MarketTicker wrapper for mobile
  function ResponsiveMarketTicker({ symbols }: { symbols?: string[] }) {
    // Show up to 3 stocks in a row, scroll if more
    if (!symbols || symbols.length <= 3) {
      return (
        <div className="flex flex-row flex-wrap gap-2 w-full">
          <MarketTicker className="flex-1 min-w-0 text-xs rounded-lg shadow bg-[var(--card-background)]/80 border border-[var(--border)]" />
        </div>
      );
    } else {
      return (
        <div className="flex flex-nowrap gap-2 overflow-x-auto w-full pb-1">
          <MarketTicker className="flex-shrink-0 min-w-[90vw] max-w-[400px] text-xs rounded-lg shadow bg-[var(--card-background)]/80 border border-[var(--border)]" />
        </div>
      );
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--accent)] text-xl animate-pulse font-medium">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden relative">
      {/* Activity Tracker for idle logout */}
      <ActivityTracker onActivity={() => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('last_activity_time', Date.now().toString());
        }
      }} />
      
      {/* Enhanced Multi-layer Background that respects theme */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-blue-100/15 dark:from-blue-950/20 dark:via-transparent dark:to-slate-900/15"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_80%,rgba(59,130,246,0.06),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_80%,rgba(59,130,246,0.04),transparent_50%)]"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(99,102,241,0.04),transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_20%,rgba(99,102,241,0.03),transparent_50%)]"></div>
      
      <div className="relative z-10">
        {/* Header with ultra-clean professional styling */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[var(--card-background)]/90 border-b border-[var(--border)] px-3 lg:px-6 py-3 shadow-lg">
          <div className="flex justify-between items-center gap-2 lg:gap-4 min-w-0">
            <div className="flex items-center space-x-2 lg:space-x-4 min-w-0 flex-1">
              {/* Logo section */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-r from-[var(--accent)] to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-[var(--accent)]/50">
                  <TrendingUp className="w-3 h-3 lg:w-5 lg:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-[var(--accent)] to-blue-400 bg-clip-text text-transparent">
                    AlgoSat
                  </h1>
                  <p className="text-xs text-[var(--muted-foreground)] hidden sm:block">Trading Bot v1.0.0</p>
                </div>
                
                {/* Mobile Market Status - visible on small screens */}
                <div className="flex lg:hidden items-center space-x-1 ml-2 px-2 py-1 bg-[var(--card-background)]/90 backdrop-blur-sm rounded border border-[var(--border)]/30">
                  {isMarketOpen ? (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  ) : (
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  )}
                  <span className={`text-xs font-semibold ${isMarketOpen ? 'text-green-400' : 'text-red-400'}`}>
                    {isMarketOpen ? 'OPEN' : 'CLOSED'}
                  </span>
                </div>
                
                {/* Desktop Market Status Indicator with Time - hidden on mobile */}
                <div className="hidden lg:flex flex-col items-start space-y-1 ml-4 px-3 py-1.5 bg-[var(--card-background)]/90 backdrop-blur-sm rounded-lg border border-[var(--border)]/30">
                  <div className="flex items-center space-x-1.5">
                    {isMarketOpen ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-xs font-semibold ${isMarketOpen ? 'text-green-400' : 'text-red-400'}`}>
                      {isMarketOpen ? 'OPEN' : 'CLOSED'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Watch className="w-3 h-3 text-[var(--muted-foreground)]" />
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {lastDataUpdate.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

                        
              {/* Desktop/XL view */}
              <div className="hidden xl:flex flex-1 max-w-4xl mx-2">
                <MarketTicker className="w-full" />
              </div>
      
            

              
              {/* Right section - responsive spacing and proper flex shrink */}
              <div className="flex items-center space-x-2 lg:space-x-4 xl:space-x-6 flex-shrink-0 ml-auto">
                {/* User info - hidden on small screens */}
                <div className="text-right hidden sm:block">
                  <p className="text-xs lg:text-sm text-[var(--muted-foreground)]">Welcome back</p>
                  <p className="text-sm lg:text-base text-[var(--accent)] font-medium">
                    {user?.username && user.username.charAt(0).toUpperCase() + user.username.slice(1)}
                  </p>
                </div>
                
                {/* Theme Toggle */}
                <div className="flex-shrink-0">
                  <ThemeToggle />
                </div>
                
                {/* Professional Logout Icon with Tooltip - always visible */}
                <div className="relative group flex-shrink-0">
                  <button
                    onClick={handleLogout}
                    className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 hover:border-red-400/50 transition-all duration-200 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-red-500/20"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4 lg:w-5 lg:h-5 text-red-500 group-hover:text-red-400 transition-colors duration-200" />
                  </button>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] rounded text-xs text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-lg z-50">
                    Logout
                    <div className="absolute top-full right-2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-[var(--border)]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Market Data Ticker - Mobile/Tablet only, full width below header */}
        <div className="block xl:hidden w-full px-2 py-1">
          <div className="flex flex-nowrap gap-2 overflow-x-auto max-w-full">
            <MarketTicker className="flex-shrink-0 min-w-[90vw] max-w-[400px] text-xs rounded-lg shadow bg-[var(--card-background)]/80 border border-[var(--border)]" />
          </div>
        </div>

        {/* Professional Stock Ticker - Full Width with proper spacing */}
        {/* <div className="w-full">
          <StockTicker />
        </div> */}

        {/* Main Layout with Perfect Alignment */}
        <div className="flex flex-col lg:flex-row">
          {/* Mobile Menu Button */}
          <div className="lg:hidden flex justify-between items-center p-4 bg-[var(--card-background)]/90 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">AlgoSat Dashboard</h2>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-[var(--card-background)] border border-[var(--border)] hover:bg-[var(--accent)]/10 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Ultra-Clean Professional Sidebar */}
          <aside className={`
            ${isMobileMenuOpen ? 'block' : 'hidden'} lg:block
            ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
            w-full backdrop-blur-xl bg-[var(--card-background)]/90 border-r border-[var(--border)] 
            lg:h-screen lg:sticky lg:top-0 relative shadow-xl shadow-[var(--accent)]/10 
            transition-all duration-300 ease-in-out
          `}>
            {/* Desktop Collapse Button */}
            <div className="hidden lg:flex justify-end p-2 border-b border-[var(--border)]/50">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg bg-[var(--card-background)] border border-[var(--border)] hover:bg-[var(--accent)]/10 transition-colors"
                title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* Navigation with enhanced spacing */}
            <nav className={`${sidebarCollapsed ? 'p-2' : 'p-6'} space-y-3 transition-all duration-300`}>
              {[
                { id: "overview", label: "Dashboard", icon: Home },
                { id: "strategies", label: "Strategies", icon: Zap },
                { id: "brokers", label: "Brokers", icon: Link },
                { id: "orders", label: "Orders", icon: TrendingUp },
                { id: "logs", label: "Logs", icon: Database },
                { id: "health", label: "System Health", icon: Activity },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    handleTabChange(tab.id);
                    setIsMobileMenuOpen(false); // Close mobile menu on selection
                  }}
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'} py-3 rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-[var(--accent)]/20 to-blue-500/20 border border-[var(--accent)]/50 text-[var(--accent)] shadow-lg shadow-[var(--accent)]/20"
                      : "text-[var(--muted-foreground)] hover:text-[var(--accent)] hover:bg-[var(--card-background)]/50 border border-transparent"
                  }`}
                  title={sidebarCollapsed ? tab.label : undefined}
                >
                  <tab.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="font-medium">{tab.label}</span>}
                </button>
              ))}
            </nav>

            {/* Sidebar content removed - System Health moved to dedicated tab */}
          </aside>

          {/* Enhanced Main Content with Perfect Glass-morphism */}
          <main className="flex-1 p-6 overflow-x-hidden bg-gradient-to-br from-[var(--background)]/60 to-[var(--card-background)]/40 backdrop-blur-sm">
            {error && (
              <div className="mb-6 p-4 bg-gradient-to-r from-red-500/20 to-red-600/20 border-2 border-red-500/50 rounded-xl text-red-300 backdrop-blur-md shadow-lg shadow-red-500/20">
                {error}
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent)] to-blue-400 bg-clip-text text-transparent mb-2">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
                        <span>Dashboard Overview</span>
                        <button
                          onClick={handleRefreshOverview}
                          disabled={overviewLoading}
                          className={`ml-2 p-2 rounded-full border border-[var(--border)] bg-[var(--card-background)] hover:bg-[var(--accent)]/10 transition-colors text-[var(--muted-foreground)] hover:text-[var(--accent)] ${overviewLoading ? 'opacity-50' : ''}`}
                          title="Refresh overview data"
                        >
                          <RefreshCw className={`w-4 h-4 ${overviewLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </h2>
                    <p className="text-[var(--muted-foreground)]">Real-time trading performance and portfolio overview</p>
                  </div>
                </div>

                {/* Enhanced Professional Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                  {/* Current Positions Card */}
                  <div className="backdrop-blur-xl bg-[var(--card-background)]/95 border-2 border-[var(--accent)]/50 rounded-2xl p-6 shadow-2xl shadow-[var(--accent)]/25 ring-1 ring-[var(--accent)]/20 hover:shadow-3xl hover:shadow-[var(--accent)]/35 transition-all duration-300 hover:scale-[1.02]">
                    <div>
                      <p className="text-[var(--muted-foreground)] text-sm">Open Positions</p>
                      <p className="text-xl lg:text-2xl font-bold text-[var(--foreground)] break-words">
                        {positions.length}
                      </p>
                      <p className="text-[var(--muted-foreground)] text-xs lg:text-sm">
                        Active trades running
                      </p>
                    </div>
                  </div>

                  {/* Overall PNL Card */}
                  <div className="backdrop-blur-xl bg-[var(--card-background)]/95 border-2 border-purple-500/50 rounded-2xl p-6 shadow-2xl shadow-purple-500/25 ring-1 ring-purple-500/20 hover:shadow-3xl hover:shadow-purple-500/35 transition-all duration-300 hover:scale-[1.02]">
                    <div>
                      <p className="text-[var(--muted-foreground)] text-sm">Overall P/L</p>
                      <p className={`text-xl lg:text-2xl font-bold break-words ${overallPnlStats && overallPnlStats.overall_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {overallPnlStats ? (
                          `${overallPnlStats.overall_pnl >= 0 ? '+' : '-'}₹${Math.abs(overallPnlStats.overall_pnl).toLocaleString('en-IN')}`
                        ) : (
                          '₹0'
                        )}
                      </p>
                      <p className="text-[var(--muted-foreground)] text-xs lg:text-sm">
                        {overallPnlStats ? `${overallPnlStats.overall_trade_count} total trades` : 'All time'}
                      </p>
                    </div>
                  </div>

                  {/* Today's P/L Card */}
                  <div className="backdrop-blur-xl bg-[var(--card-background)]/95 border-2 border-green-500/50 rounded-2xl p-6 shadow-2xl shadow-green-500/25 ring-1 ring-green-500/20 hover:shadow-3xl hover:shadow-green-500/35 transition-all duration-300 hover:scale-[1.02]">
                    <div>
                      <p className="text-[var(--muted-foreground)] text-sm">Today's P/L</p>
                      <p className={`text-xl lg:text-2xl font-bold break-words ${overallPnlStats && overallPnlStats.today_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {overallPnlStats ? (
                          `${overallPnlStats.today_pnl >= 0 ? '+' : '-'}₹${Math.abs(overallPnlStats.today_pnl).toLocaleString('en-IN')}`
                        ) : (
                          '₹0'
                        )}
                      </p>
                      <p className="text-[var(--muted-foreground)] text-xs lg:text-sm">
                        {overallPnlStats ? `${overallPnlStats.today_trade_count} trades today` : 'Real-time data'}
                      </p>
                    </div>
                  </div>

                  {/* Total Balance Card */}
                  <div className="backdrop-blur-xl bg-[var(--card-background)]/95 border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl shadow-amber-500/25 ring-1 ring-amber-500/20 hover:shadow-3xl hover:shadow-amber-500/35 transition-all duration-300 hover:scale-[1.02]">
                    <div>
                      <p className="text-[var(--muted-foreground)] text-sm">Total Balance</p>
                      <p className="text-xl lg:text-2xl font-bold text-amber-400 break-words">
                        ₹{dashboardSummary ? dashboardSummary.total_balance.amount.toLocaleString('en-IN') : balanceSummaries.reduce((total, summary) => total + (summary.summary?.total_balance || 0), 0).toLocaleString('en-IN')}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-[var(--muted-foreground)] text-xs lg:text-sm">
                          {balanceSummaries.length} {balanceSummaries.length === 1 ? 'broker' : 'brokers'}
                        </p>
                        {dashboardSummary && (
                          <div className={`flex items-center space-x-1 text-xs ${
                            dashboardSummary.total_balance.change > 0 ? 'text-green-400' : 
                            dashboardSummary.total_balance.change < 0 ? 'text-red-400' : 
                            'text-gray-400'
                          }`}>
                            {dashboardSummary.total_balance.change > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : dashboardSummary.total_balance.change < 0 ? (
                              <TrendingDown className="w-3 h-3" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-current opacity-60"></div>
                            )}
                            <span>
                              {dashboardSummary.total_balance.change > 0 ? '+' : dashboardSummary.total_balance.change < 0 ? '' : '±'}₹{Math.abs(dashboardSummary.total_balance.change).toLocaleString('en-IN')}
                            </span>
                            <span className="opacity-70">
                              ({dashboardSummary.total_balance.change > 0 ? '+' : dashboardSummary.total_balance.change < 0 ? '' : '±'}{Math.abs(dashboardSummary.total_balance.change_percentage).toFixed(1)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Strategies Card */}
                  <div className="backdrop-blur-xl bg-[var(--card-background)]/95 border-2 border-blue-500/50 rounded-2xl p-6 shadow-2xl shadow-blue-500/25 ring-1 ring-blue-500/20 hover:shadow-3xl hover:shadow-blue-500/35 transition-all duration-300 hover:scale-[1.02]">
                    <div>
                      <p className="text-[var(--muted-foreground)] text-sm">Strategies</p>
                      <p className="text-xl lg:text-2xl font-bold text-[var(--foreground)] break-words">
                        {stats.activeStrategies}/{stats.totalStrategies}
                      </p>
                      <p className="text-[var(--muted-foreground)] text-xs lg:text-sm">
                        Active strategies running
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance Chart & Activity Log */}
                <div className="grid grid-cols-1 gap-6">
                  {/* Performance Overview - Full Width */}
                  <div className="backdrop-blur-xl bg-[var(--card-background)]/95 border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-[var(--accent)]/15 hover:shadow-2xl hover:shadow-[var(--accent)]/25 transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent)] to-blue-500 rounded-xl flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent)] to-blue-400 bg-clip-text text-transparent">
                            Performance Overview
                          </h2>
                          <p className="text-[var(--muted-foreground)] text-sm">
                            {dailyPnlHistory ? `Last ${dailyPnlHistory.total_days} trading days` : 'Overall trading performance'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {dailyPnlHistory && dailyPnlHistory.history.length > 0 ? (
                      <div className="h-80 relative">
                        {/* Gradient background for chart area */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--accent)]/5 to-transparent rounded-2xl"></div>
                        
                        {(() => {
                          // Determine final P&L and chart colors
                          const finalPnl = dailyPnlHistory.history[dailyPnlHistory.history.length - 1]?.cumulative_pnl || 0;
                          const isPositive = finalPnl >= 0;
                          const chartColor = isPositive ? "#10b981" : "#ef4444"; // Green for positive, red for negative
                          
                          return (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart 
                                data={dailyPnlHistory.history.map(day => ({
                                  date: day.date,
                                  formattedDate: new Date(day.date).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short'
                                  }),
                                  cumulative_pnl: day.cumulative_pnl,
                                  trade_count: day.trade_count
                                }))}
                                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                              >
                                <defs>
                                  <linearGradient id="cumulativePnlGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.8}/>
                                    <stop offset="50%" stopColor={chartColor} stopOpacity={0.3}/>
                                    <stop offset="100%" stopColor={chartColor} stopOpacity={0.1}/>
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
                                  tickFormatter={(value) => {
                                    if (Math.abs(value) >= 1000) {
                                      return `₹${(value/1000).toFixed(1)}K`;
                                    }
                                    return `₹${value}`;
                                  }}
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
                                  formatter={(value, name) => {
                                    const numValue = Number(value);
                                    const formattedValue = numValue >= 1000 ?
                                      `₹${(numValue/1000).toFixed(1)}K (₹${numValue.toLocaleString()})` : 
                                      `₹${numValue.toLocaleString()}`;
                                    return [formattedValue, 'Cumulative P&L'];
                                  }}
                                  labelFormatter={(label) => `Date: ${label}`}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="cumulative_pnl" 
                                  stroke={chartColor} 
                                  strokeWidth={3}
                                  fill="url(#cumulativePnlGradient)"
                                  dot={false}
                                  activeDot={{ 
                                    r: 6, 
                                    stroke: chartColor, 
                                    strokeWidth: 3,
                                    fill: 'var(--card-background)'
                                  }}
                                  name="Cumulative P&L"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="h-80 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gradient-to-br from-[var(--accent)]/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <BarChart3 className="w-10 h-10 text-[var(--accent)]" />
                          </div>
                          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                            {dailyPnlHistory === null ? 'Loading Performance Data' : 'No Trading History'}
                          </h3>
                          <p className="text-[var(--muted-foreground)]">
                            {dailyPnlHistory === null ? 
                              'Fetching your trading performance...' : 
                              'Start trading to see your performance metrics here'
                            }
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Risk & Performance Metrics - Clean Text Display */}
                    <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-[var(--muted-foreground)]">Sharpe Ratio:</span>
                        <span className="font-semibold text-green-400">{riskMetrics.sharpeRatio}</span>
                      </div>
                      
                      <div className="w-px h-4 bg-[var(--border)]"></div>
                      
                      <div className="flex items-center space-x-2">
                        <TrendingDown className="w-4 h-4 text-red-400" />
                        <span className="text-[var(--muted-foreground)]">Max Drawdown:</span>
                        <span className="font-semibold text-red-400">
                          {riskMetrics.maxDrawdownAmount && riskMetrics.maxDrawdownAmount >= 1000 ? 
                            `-₹${(riskMetrics.maxDrawdownAmount/1000).toFixed(1)}K` : 
                            `-₹${(riskMetrics.maxDrawdownAmount || 0).toFixed(0)}`
                          }
                        </span>
                      </div>
                      
                      <div className="w-px h-4 bg-[var(--border)]"></div>
                      
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                        <span className="text-[var(--muted-foreground)]">Avg Daily:</span>
                        <span className={`font-semibold ${riskMetrics.avgDailyReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {riskMetrics.avgDailyReturn >= 0 ? '+' : '-'}₹{Math.abs(riskMetrics.avgDailyReturn).toLocaleString('en-IN')}
                        </span>
                      </div>
                      
                      <div className="w-px h-4 bg-[var(--border)]"></div>
                      
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-purple-400" />
                        <span className="text-[var(--muted-foreground)]">Best Day:</span>
                        <span className={`font-semibold ${riskMetrics.bestDay >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {riskMetrics.bestDay >= 0 ? '+' : '-'}₹{Math.abs(riskMetrics.bestDay).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Actions Panel - Compact Design */}
                <div className="backdrop-blur-xl bg-[var(--card-background)]/95 border border-red-500/20 rounded-xl p-4 shadow-lg shadow-red-500/10 transition-all duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-red-400">Emergency Controls</h3>
                        <p className="text-[var(--muted-foreground)] text-xs">Quick risk management actions</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleEmergencyStopAll}
                        className="flex items-center space-x-2 px-3 py-2 bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 hover:border-red-400/50 rounded-lg transition-all duration-200 hover:scale-[1.02] text-red-400 text-sm font-medium shadow-sm hover:shadow-md"
                        title="Exit all open orders first, then disable all strategies"
                      >
                        <PauseCircle className="w-4 h-4" />
                        <span>Stop All</span>
                      </button>
                      
                      <button
                        onClick={handleExitAllPositions}
                        className="flex items-center space-x-2 px-3 py-2 bg-orange-600/15 hover:bg-orange-600/25 border border-orange-500/30 hover:border-orange-400/50 rounded-lg transition-all duration-200 hover:scale-[1.02] text-orange-400 text-sm font-medium shadow-sm hover:shadow-md"
                        title="Exit all open positions"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Exit All</span>
                      </button>
                      
                      <button
                        onClick={handleResetDatabase}
                        className="flex items-center space-x-2 px-3 py-2 bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 hover:border-purple-400/50 rounded-lg transition-all duration-200 hover:scale-[1.02] text-purple-400 text-sm font-medium shadow-sm hover:shadow-md"
                        title="Reset database - Remove all orders and executions"
                      >
                        <Database className="w-4 h-4" />
                        <span>Reset DB</span>
                      </button>
                      
                      <button
                        onClick={() => loadDashboardData(false)}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 hover:border-blue-400/50 rounded-lg transition-all duration-200 hover:scale-[1.02] text-blue-400 text-sm font-medium shadow-sm hover:shadow-md"
                        title="Refresh all dashboard data"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Refresh</span>
                      </button>
                      
                      <div className="flex items-center text-amber-400 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">Use with caution</span>
                        <span className="sm:hidden">Caution</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Strategies Tab */}
            {activeTab === "strategies" && (
              <div className="space-y-6">
                {/* Header with Refresh Button */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent)] to-blue-400 bg-clip-text text-transparent mb-2">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
                        <span>Trading Strategies</span>
                        <button
                          onClick={handleRefreshStrategies}
                          disabled={strategiesLoading}
                          className={`ml-2 p-2 rounded-full border border-[var(--border)] bg-[var(--card-background)] hover:bg-[var(--accent)]/10 transition-colors text-[var(--muted-foreground)] hover:text-[var(--accent)] ${strategiesLoading ? 'opacity-50' : ''}`}
                          title="Refresh strategies data"
                        >
                          <RefreshCw className={`w-4 h-4 ${strategiesLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </h2>
                    <p className="text-[var(--muted-foreground)]">Monitor your automated trading strategies and performance metrics</p>
                  </div>
                </div>
                
                {/* Strategies Content */}
                <StrategiesPage 
                  perStrategyStats={perStrategyStats} 
                  strategiesData={strategies as any}
                  onRefresh={handleRefreshStrategies}
                />
              </div>
            )}

            {/* Brokers Tab */}
            {activeTab === "brokers" && (
              <div className="space-y-6">
                {/* Header with Stats */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent)] to-blue-400 bg-clip-text text-transparent mb-2">
                      <div className="flex items-center space-x-2">
                        <Link className="w-5 h-5 text-[var(--accent)]" />
                        <span>Trading Brokers</span>
                        <button
                          onClick={handleRefreshBrokers}
                          disabled={brokersLoading}
                          className={`ml-2 p-2 rounded-full border border-[var(--border)] bg-[var(--card-background)] hover:bg-[var(--accent)]/10 transition-colors text-[var(--muted-foreground)] hover:text-[var(--accent)] ${brokersLoading ? 'opacity-50' : ''}`}
                          title="Refresh broker data"
                        >
                          <RefreshCw className={`w-4 h-4 ${brokersLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </h2>
                    <p className="text-[var(--muted-foreground)] text-sm mt-1">Manage your broker connections and monitor account balances</p>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="backdrop-blur-xl bg-green-500/10 border border-green-500/30 rounded-2xl p-4 shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 transition-all duration-300">
                      <p className="text-2xl font-bold text-green-400">{brokers.filter(b => b.is_enabled).length}</p>
                      <p className="text-xs text-green-300">Active</p>
                    </div>
                    <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300">
                      <p className="text-2xl font-bold text-blue-400">{brokers.filter(b => b.is_data_provider).length}</p>
                      <p className="text-xs text-blue-300">Data Feed</p>
                    </div>
                    <div className="backdrop-blur-xl bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300">
                      <p className="text-2xl font-bold text-purple-400">{brokers.filter(b => b.trade_execution_enabled).length}</p>
                      <p className="text-xs text-purple-300">Trading</p>
                    </div>
                  </div>
                </div>

                {/* Broker Cards */}
                {brokers.length === 0 ? (
                  <div className="backdrop-blur-xl bg-[var(--card-background)]/95 border border-[var(--border)] rounded-2xl p-12 text-center shadow-xl shadow-[var(--accent)]/15">
                    <div className="w-16 h-16 bg-[var(--accent)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Link className="w-8 h-8 text-[var(--accent)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No Brokers Connected</h3>
                    <p className="text-[var(--muted-foreground)] mb-6">Connect your first broker to start trading</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {brokers.map((broker, index) => {
                      // Get real balance data from API
                      const balanceData = getBrokerBalance(broker.broker_name);
                      const totalBalance = balanceData.total_balance;
                      const availableBalance = balanceData.available;
                      const utilizedMargin = balanceData.utilized;
                      
                      // Get broker logo - using real PNG logos
                      const getBrokerLogo = (brokerName: string) => {
                        if (!brokerName) return '/brokers/default-logo.svg';
                        const name = brokerName.toLowerCase();
                        if (name.includes('fyers')) return '/brokers/fyers-logo.png';
                        if (name.includes('angel')) return '/brokers/angel-one-logo.png';
                        if (name.includes('zerodha')) return '/brokers/zerodha-logo.png';
                        return '/brokers/default-logo.svg';
                      };

                      // Get broker theme colors - using theme variables
                      const theme = {
                        primary: 'from-[var(--accent)] to-blue-500',
                        border: 'border-[var(--accent)]/30',
                        glow: 'shadow-[var(--accent)]/20',
                        text: 'text-[var(--accent)]'
                      };

                      return (
                        <div
                          key={broker.id}
                          className={`relative backdrop-blur-sm bg-[var(--card-background)] border ${theme.border} rounded-xl p-6 shadow-xl ${theme.glow} hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden`}
                        >
                          {/* Background Gradient */}
                          <div className={`absolute inset-0 bg-gradient-to-br ${theme.primary} opacity-5 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none`}></div>
                          
                          {/* Connection Status Indicator */}
                          <div className="absolute top-4 right-4">
                            <div className={`relative w-3 h-3 rounded-full ${
                              broker.is_enabled ? 'bg-green-400' : 'bg-red-400'
                            }`}>
                              {broker.is_enabled && (
                                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping"></div>
                              )}
                            </div>
                          </div>

                          {/* Header */}
                          <div className="relative flex items-center space-x-4 mb-6">
                            <div className="relative">
                              <img
                                src={getBrokerLogo(broker.broker_name)}
                                alt={`${broker.broker_name} logo`}
                                className="w-16 h-16 rounded-xl shadow-lg object-contain bg-white/10 p-2"
                              />
                              {/* Status indicator with pulse for active brokers */}
                              {broker.is_enabled && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse ring-2 ring-green-400/50"></div>
                              )}
                              {!broker.is_enabled && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full ring-2 ring-red-400/50"></div>
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-[var(--foreground)] mb-1 capitalize">{broker.broker_name}</h3>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                  broker.is_enabled 
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                    : 'bg-red-500/20 text-red-400 border border-red-500/50'
                                }`}>
                                  {broker.is_enabled ? 'Active' : 'Inactive'}
                                </span>
                                
                                {/* Data Provider Badge - Only one can be active */}
                                {broker.is_data_provider && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center space-x-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                    </svg>
                                    <span>Data Provider</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Balance Information */}
                          {broker.is_enabled && (
                            <div className="mb-6 space-y-4">
                              <div className="backdrop-blur-sm bg-[var(--background)]/30 rounded-lg p-4 border border-[var(--border)]">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[var(--muted-foreground)] text-sm">Total Balance</span>
                                  {balanceData.fetched_at && (
                                    <span className="text-blue-400 text-xs">
                                      {new Date(balanceData.fetched_at).toLocaleTimeString()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-2xl font-bold text-[var(--foreground)]">
                                  ₹{totalBalance > 100000 ? (totalBalance / 100000).toFixed(1) + 'L' : totalBalance.toLocaleString()}
                                </p>
                                <div className="mt-3 space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-[var(--muted-foreground)]">Available</span>
                                    <span className="text-[var(--accent)]">
                                      ₹{availableBalance > 100000 ? (availableBalance / 100000).toFixed(1) + 'L' : availableBalance.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-[var(--muted-foreground)]">Used Margin</span>
                                    <span className="text-orange-300">
                                      ₹{utilizedMargin > 100000 ? (utilizedMargin / 100000).toFixed(1) + 'L' : utilizedMargin.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Balance Progress Bar */}
                                <div className="mt-3">
                                  <div className="w-full bg-[var(--border)] rounded-full h-2">
                                    <div 
                                      className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-700" 
                                      style={{ width: `${totalBalance > 0 ? (utilizedMargin / totalBalance) * 100 : 0}%` }}
                                    ></div>
                                  </div>
                                  <div className="flex justify-between text-xs text-[var(--muted-foreground)] mt-1">
                                    <span>Margin Used</span>
                                    <span>{totalBalance > 0 ? ((utilizedMargin / totalBalance) * 100).toFixed(1) : '0'}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Risk Limits Section */}
                          <div className="mb-4">
                            <div className="backdrop-blur-sm bg-[var(--background)]/30 rounded-lg p-4 border border-[var(--border)]">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-[var(--muted-foreground)] text-sm font-medium">Risk Limits</span>
                                <button
                                  onClick={() => handleEditRiskLimits(broker)}
                                  className="p-1 rounded-md hover:bg-[var(--accent)]/10 text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors"
                                  title="Edit risk limits"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--muted-foreground)]">Max Loss</span>
                                  <span className="text-red-400 font-medium">
                                    ₹{(broker.max_loss || 0) > 100000 ? ((broker.max_loss || 0) / 100000).toFixed(1) + 'L' : (broker.max_loss || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--muted-foreground)]">Max Profit</span>
                                  <span className="text-green-400 font-medium">
                                    ₹{(broker.max_profit || 0) > 100000 ? ((broker.max_profit || 0) / 100000).toFixed(1) + 'L' : (broker.max_profit || 0).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Connection Status */}
                          <div className="mb-4">
                            <div className={`backdrop-blur-sm bg-[var(--background)]/30 rounded-lg p-3 border ${
                              broker.status === 'CONNECTED' ? 'border-green-500/30' :
                              broker.status === 'AUTHENTICATING' ? 'border-yellow-500/30' :
                              'border-red-500/30'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    broker.status === 'CONNECTED' ? 'bg-green-400' :
                                    broker.status === 'AUTHENTICATING' ? 'bg-yellow-400 animate-pulse' :
                                    'bg-red-400'
                                  }`}></div>
                                  <span className="text-xs text-[var(--muted-foreground)]">Connection Status</span>
                                </div>
                                <span className={`text-xs font-medium ${
                                  broker.status === 'CONNECTED' ? 'text-green-400' :
                                  broker.status === 'AUTHENTICATING' ? 'text-yellow-400' :
                                  'text-red-400'
                                }`}>
                                  {broker.status || 'DISCONNECTED'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Features Grid */}
                          <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className={`backdrop-blur-sm bg-[var(--background)]/30 rounded-lg p-3 border border-[var(--border)] ${
                              broker.is_data_provider ? 'border-blue-500/30' : ''
                            }`}>
                              <div className="flex items-center space-x-2">
                                <BarChart3 className={`w-4 h-4 ${broker.is_data_provider ? 'text-blue-400' : 'text-[var(--muted-foreground)]'}`} />
                                <span className="text-xs text-[var(--muted-foreground)]">Data Feed</span>
                              </div>
                              <p className={`text-sm font-medium mt-1 ${
                                broker.is_data_provider ? 'text-blue-400' : 'text-[var(--muted-foreground)]'
                              }`}>
                                {broker.is_data_provider ? 'Active' : 'Inactive'}
                              </p>
                            </div>
                            
                            <div className={`backdrop-blur-sm bg-[var(--background)]/30 rounded-lg p-3 border border-[var(--border)] ${
                              broker.trade_execution_enabled ? 'border-purple-500/30' : ''
                            }`}>
                              <div className="flex items-center space-x-2">
                                <Zap className={`w-4 h-4 ${broker.trade_execution_enabled ? 'text-purple-400' : 'text-[var(--muted-foreground)]'}`} />
                                <span className="text-xs text-[var(--muted-foreground)]">Trading</span>
                              </div>
                              <p className={`text-sm font-medium mt-1 ${
                                broker.trade_execution_enabled ? 'text-purple-400' : 'text-[var(--muted-foreground)]'
                              }`}>
                                {broker.trade_execution_enabled ? 'Enabled' : 'Disabled'}
                              </p>
                            </div>
                          </div>

                          {/* Last Auth Check */}
                          <div className="text-xs text-[var(--muted-foreground)] mb-6">
                            <span>Last verified: </span>
                            <span className="text-[var(--muted-foreground)]">
                              {broker.last_auth_check ? 
                                new Date(broker.last_auth_check).toLocaleString('en-IN', {
                                  timeZone: 'Asia/Kolkata',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'Never'
                              }
                            </span>
                          </div>

                          {/* Management Controls */}
                          <div className="relative z-10 space-y-4">
                            {/* Data Provider & Trade Execution Controls */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-[var(--muted-foreground)]">Data Provider</label>
                                <button
                                  onClick={() => toggleDataProvider(broker.broker_name, true)}
                                  disabled={broker.is_data_provider || buttonLoading[`data-provider-${broker.broker_name}`]}
                                  className={`relative z-20 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                                    broker.is_data_provider
                                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50 cursor-not-allowed'
                                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-500/60 hover:from-blue-600 hover:to-blue-700 hover:border-blue-500/80 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
                                  }`}
                                >
                                  <div className="flex items-center justify-center space-x-1">
                                    {buttonLoading[`data-provider-${broker.broker_name}`] && (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    )}
                                    <span>{broker.is_data_provider ? 'Active' : 'Enable'}</span>
                                  </div>
                                </button>
                              </div>
                              
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-[var(--muted-foreground)]">Trade Execution</label>
                                <button
                                  onClick={() => toggleTradeExecution(broker.broker_name, !broker.trade_execution_enabled)}
                                  disabled={buttonLoading[`trade-execution-${broker.broker_name}`]}
                                  className={`relative z-20 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                                    broker.trade_execution_enabled
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 hover:shadow-md hover:shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
                                      : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border border-purple-500/60 hover:from-purple-600 hover:to-purple-700 hover:border-purple-500/80 hover:shadow-lg hover:shadow-purple-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
                                  }`}
                                >
                                  <div className="flex items-center justify-center space-x-1">
                                    {buttonLoading[`trade-execution-${broker.broker_name}`] && (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    )}
                                    <span>{broker.trade_execution_enabled ? 'Disable' : 'Enable'}</span>
                                  </div>
                                </button>
                              </div>
                            </div>

                            {/* Primary Action Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => toggleBroker(broker.broker_name, !broker.is_enabled)}
                                disabled={buttonLoading[`broker-${broker.broker_name}`]}
                                className={`relative z-20 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  broker.is_enabled 
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 hover:shadow-lg hover:shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white border border-green-500/60 hover:from-green-600 hover:to-green-700 hover:border-green-500/80 hover:shadow-lg hover:shadow-green-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
                                }`}
                              >
                                <div className="flex items-center justify-center space-x-2">
                                  {buttonLoading[`broker-${broker.broker_name}`] ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : broker.is_enabled ? (
                                    <PauseCircle className="w-4 h-4" />
                                  ) : (
                                    <PlayCircle className="w-4 h-4" />
                                  )}
                                  <span>
                                    {buttonLoading[`broker-${broker.broker_name}`] 
                                      ? 'Processing...' 
                                      : broker.is_enabled 
                                        ? 'Disconnect' 
                                        : 'Connect'
                                    }
                                  </span>
                                </div>
                              </button>
                              
                              <button
                                onClick={() => reauthBroker(broker.broker_name)}
                                disabled={buttonLoading[`reauth-${broker.broker_name}`] || broker.status === 'AUTHENTICATING'}
                                className="relative z-20 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-500/60 hover:from-blue-600 hover:to-blue-700 hover:border-blue-500/80 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <div className="flex items-center justify-center space-x-2">
                                  {(buttonLoading[`reauth-${broker.broker_name}`] || broker.status === 'AUTHENTICATING') ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-4 h-4" />
                                  )}
                                  <span>{(buttonLoading[`reauth-${broker.broker_name}`] || broker.status === 'AUTHENTICATING') ? 'Authenticating...' : 'Reauth'}</span>
                                </div>
                              </button>
                            </div>

                            {/* Configuration Button */}
                            <button
                              onClick={() => openBrokerConfig(broker.broker_name)}
                              className="relative z-20 w-full px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white border border-amber-500/60 hover:from-amber-600 hover:to-amber-700 hover:border-amber-500/80 hover:shadow-lg hover:shadow-amber-500/30 active:scale-95 rounded-lg text-sm font-medium transition-all duration-200"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <Settings className="w-4 h-4" />
                                <span>Configure</span>
                              </div>
                            </button>
                          </div>

                          {/* Notes Section */}
                          {broker.notes && (
                            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                              <div className="text-xs text-yellow-400">
                                <div className="flex items-center space-x-2">
                                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                                  <span>{broker.notes}</span>
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
            )}

            {/* Orders Tab */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent)] to-blue-400 bg-clip-text text-transparent mb-2">
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
                            <span>Orders</span>
                            <button
                              onClick={handleRefreshOrders}
                              disabled={ordersLoading}
                              className={`ml-2 p-2 rounded-full border border-[var(--border)] bg-[var(--card-background)] hover:bg-[var(--accent)]/10 transition-colors text-[var(--muted-foreground)] hover:text-[var(--accent)] ${ordersLoading ? 'opacity-50' : ''}`}
                              title="Refresh orders data"
                            >
                              <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
                            </button>
                          </div>
                        </h2>
                        <p className="text-[var(--muted-foreground)]">Monitor all your orders with Symbol, strike, P&L and status</p>
                      </div>
                      <button 
                        onClick={handleExportOrders}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all duration-200 border border-blue-500/50 hover:border-blue-500/60 flex-shrink-0 w-full sm:w-auto"
                      >
                        <Download className="w-4 h-4" />
                        <span className="font-medium">Export Orders</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Order Stats */}
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="backdrop-blur-xl bg-green-500/10 border border-green-500/30 rounded-2xl p-3 shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 transition-all duration-300">
                      <p className="text-xl font-bold text-green-400">Live: {liveOrders.length} / Total: {sortedOrders.length}</p>
                      <p className="text-xs text-green-300">Showing</p>
                    </div>
                    <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300">
                      <p className="text-xl font-bold text-blue-400">{sortedOrders.filter(o => o.status === 'OPEN').length}</p>
                      <p className="text-xs text-blue-300">Open</p>
                    </div>
                    <div className="backdrop-blur-xl bg-purple-500/10 border border-purple-500/30 rounded-2xl p-3 shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300">
                      <p className="text-xl font-bold text-purple-400">{sortedOrders.filter(o => o.status === 'CLOSED').length}</p>
                      <p className="text-xs text-purple-300">Closed</p>
                    </div>
                    <div className="backdrop-blur-xl bg-orange-500/10 border border-orange-500/30 rounded-2xl p-3 shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-300">
                      <p className="text-xl font-bold text-orange-400">{sortedOrders.filter(o => o.status === 'AWAITING_ENTRY').length}</p>
                      <p className="text-xs text-orange-300">Pending</p>
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
                            Daily P&L Trend
                          </h3>
                          <p className="text-[var(--muted-foreground)] text-sm">
                            {pnlGraphData.length} trading days • Order performance
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-[var(--muted-foreground)]">Total Orders P&L</p>
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
                            {(() => {
                              // Dynamic colors for daily P&L based on final value
                              const finalDailyPnl = pnlGraphData[pnlGraphData.length - 1]?.pnl || 0;
                              const dailyPnlColor = finalDailyPnl >= 0 ? "#10b981" : "#ef4444";
                              
                              // Dynamic colors for cumulative P&L based on final value
                              const finalCumulativePnl = pnlGraphData[pnlGraphData.length - 1]?.cumulativePnl || 0;
                              const cumulativePnlColor = finalCumulativePnl >= 0 ? "#10b981" : "#ef4444";
                              
                              return (
                                <>
                                  <linearGradient id="ordersDailyPnlGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={dailyPnlColor} stopOpacity={0.8}/>
                                    <stop offset="50%" stopColor={dailyPnlColor} stopOpacity={0.3}/>
                                    <stop offset="100%" stopColor={dailyPnlColor} stopOpacity={0.1}/>
                                  </linearGradient>
                                  <linearGradient id="ordersCumulativePnlGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={cumulativePnlColor} stopOpacity={0.8}/>
                                    <stop offset="50%" stopColor={cumulativePnlColor} stopOpacity={0.3}/>
                                    <stop offset="100%" stopColor={cumulativePnlColor} stopOpacity={0.1}/>
                                  </linearGradient>
                                </>
                              );
                            })()}
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
                            tickFormatter={(value) => {
                              if (Math.abs(value) >= 1000) {
                                return `₹${(value/1000).toFixed(1)}K`;
                              }
                              return `₹${value}`;
                            }}
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
                            stroke={(() => {
                              const finalDailyPnl = pnlGraphData[pnlGraphData.length - 1]?.pnl || 0;
                              return finalDailyPnl >= 0 ? "#10b981" : "#ef4444";
                            })()} 
                            strokeWidth={2}
                            fill="url(#ordersDailyPnlGradient)"
                            dot={false}
                            activeDot={{ 
                              r: 5, 
                              stroke: (() => {
                                const finalDailyPnl = pnlGraphData[pnlGraphData.length - 1]?.pnl || 0;
                                return finalDailyPnl >= 0 ? "#10b981" : "#ef4444";
                              })(), 
                              strokeWidth: 2,
                              fill: 'var(--card-background)'
                            }}
                            name="Daily P&L"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="cumulativePnl" 
                            stroke={(() => {
                              const finalCumulativePnl = pnlGraphData[pnlGraphData.length - 1]?.cumulativePnl || 0;
                              return finalCumulativePnl >= 0 ? "#10b981" : "#ef4444";
                            })()} 
                            strokeWidth={2}
                            strokeDasharray="8 4"
                            fill="url(#ordersCumulativePnlGradient)"
                            fillOpacity={0.3}
                            dot={false}
                            activeDot={{ 
                              r: 4, 
                              stroke: (() => {
                                const finalCumulativePnl = pnlGraphData[pnlGraphData.length - 1]?.cumulativePnl || 0;
                                return finalCumulativePnl >= 0 ? "#10b981" : "#ef4444";
                              })(), 
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
                        <div 
                          className="w-4 h-2 rounded-full" 
                          style={{
                            background: (() => {
                              const finalDailyPnl = pnlGraphData[pnlGraphData.length - 1]?.pnl || 0;
                              const color = finalDailyPnl >= 0 ? "#10b981" : "#ef4444";
                              return `linear-gradient(to right, ${color}, ${color}dd)`;
                            })()
                          }}
                        ></div>
                        <span className="text-sm text-[var(--muted-foreground)]">Daily P&L</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-2 rounded-full opacity-70" 
                          style={{
                            backgroundImage: (() => {
                              const finalCumulativePnl = pnlGraphData[pnlGraphData.length - 1]?.cumulativePnl || 0;
                              const color = finalCumulativePnl >= 0 ? "#10b981" : "#ef4444";
                              return `repeating-linear-gradient(90deg, ${color} 0px, ${color} 4px, transparent 4px, transparent 8px)`;
                            })()
                          }}
                        ></div>
                        <span className="text-sm text-[var(--muted-foreground)]">Cumulative P&L</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div className="backdrop-blur-sm bg-[var(--card-background)] border border-[var(--border)] rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Symbol</label>
                      <select 
                        value={symbolFilter}
                        onChange={(e) => setSymbolFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                      >
                        <option value="">All Symbols</option>
                        {Array.from(new Set(orders.map(o => parseStrikeSymbol(o.strike_symbol || '').underlying))).filter(Boolean).map(symbol => (
                          <option key={symbol} value={symbol}>{symbol}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Type</label>
                      <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                      >
                        <option value="">All Types</option>
                        <option value="CE">Call (CE)</option>
                        <option value="PE">Put (PE)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Side</label>
                      <select 
                        value={sideFilter}
                        onChange={(e) => setSideFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                      >
                        <option value="">All Sides</option>
                        <option value="BUY">Buy</option>
                        <option value="SELL">Sell</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">P&L Filter</label>
                      <select 
                        value={pnlFilter}
                        onChange={(e) => setPnlFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                      >
                        <option value="">All P&L</option>
                        <option value="profit">Profit Only</option>
                        <option value="loss">Loss Only</option>
                        <option value="breakeven">Break Even</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Status</label>
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                      >
                        <option value="">All Status</option>
                        <option value="OPEN">Open</option>
                        <option value="CLOSED">Closed</option>
                        <option value="AWAITING_ENTRY">Pending</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Date</label>
                      <select 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                      >
                        <option value="">All Dates</option>
                        {availableDates.map(date => (
                          <option key={date} value={date}>{formatDate(date)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Broker</label>
                      <select 
                        value={brokerFilter}
                        onChange={(e) => setBrokerFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                      >
                        <option value="">All Brokers</option>
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
                </div>

                {/* Orders Table - Split View */}
                <div className="space-y-6">
                  {/* Header */}
                  <div className="bg-[var(--card-background)]/95 border border-[var(--border)] rounded-xl shadow-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--foreground)]">Orders</h3>
                        <p className="text-sm text-[var(--muted-foreground)] mt-1">
                          All orders from active strategies
                        </p>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="text-center">
                          <div className="text-lg font-bold text-[var(--accent)]">{liveOrders.length}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">Today's</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-[var(--muted-foreground)]">{completedOrders.length}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">Historical</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-[var(--foreground)]">{sortedOrders.length}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">Total</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {sortedOrders.length === 0 ? (
                    <div className="bg-[var(--card-background)]/50 rounded-xl border border-[var(--border)] p-6 md:p-8 text-center">
                      <div className="w-12 h-12 bg-[var(--accent)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="w-6 h-6 text-[var(--accent)]" />
                      </div>
                      {orders.length === 0 ? (
                        <>
                          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No Orders Found</h3>
                          <p className="text-[var(--muted-foreground)]">
                            Start trading with your strategies to see orders here
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No Matches</h3>
                          <p className="text-[var(--muted-foreground)] mb-4">
                            No orders match the current filter criteria
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Live Orders Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-[var(--foreground)]">Live Orders</h3>
                            <span className="px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] rounded-full text-sm font-medium">
                              {liveOrders.length} {liveOrders.length === 1 ? 'order' : 'orders'}
                            </span>
                          </div>
                        </div>

                        {liveOrders.length === 0 ? (
                          <div className="bg-[var(--card-background)]/50 rounded-xl border border-[var(--border)] p-8 text-center">
                            <TrendingUp className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
                            <p className="text-[var(--muted-foreground)] text-lg">No live orders</p>
                          </div>
                        ) : (
                          <div className="bg-[var(--card-background)]/50 rounded-xl border border-[var(--border)] overflow-x-auto shadow-lg">
                            <table className="w-full min-w-[1600px]">
                              <thead className="bg-[var(--background)]/50 border-b border-[var(--border)]">
                                <tr>
                                  <th className="px-3 py-2 text-left text-[var(--accent)] w-12">
                                    <Eye className="w-3 h-3" />
                                  </th>
                                  <th 
                                    className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                    onClick={() => handleSort('id')}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs font-medium">Order ID</span>
                                      {sortField === 'id' && (
                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                    onClick={() => handleSort('strategy_name')}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs font-medium">Strategy</span>
                                      {sortField === 'strategy_name' && (
                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                    onClick={() => handleSort('underlying')}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs font-medium">Symbol</span>
                                      {sortField === 'underlying' && (
                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                    onClick={() => handleSort('strike')}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs font-medium">Strike</span>
                                      {sortField === 'strike' && (
                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-2 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                    onClick={() => handleSort('type')}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs font-medium">Type</span>
                                      {sortField === 'type' && (
                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                    onClick={() => handleSort('pnl')}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs font-medium">P&L</span>
                                      {sortField === 'pnl' && (
                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                    onClick={() => handleSort('status')}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs font-medium">Status</span>
                                      {sortField === 'status' && (
                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-2 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                    onClick={() => handleSort('side')}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs font-medium">Side</span>
                                      {sortField === 'side' && (
                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                    onClick={() => handleSort('signal_time')}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs font-medium">Signal Time</span>
                                      {sortField === 'signal_time' && (
                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                    onClick={() => handleSort('entry_time')}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs font-medium">Entry Time</span>
                                      {sortField === 'entry_time' && (
                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                    onClick={() => handleSort('entry_price')}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs font-medium">Entry Price</span>
                                      {sortField === 'entry_price' && (
                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                    onClick={() => handleSort('exit_time')}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs font-medium">Exit Time</span>
                                      {sortField === 'exit_time' && (
                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                    onClick={() => handleSort('exit_price')}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs font-medium">Exit Price</span>
                                      {sortField === 'exit_price' && (
                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                    onClick={() => handleSort('current_price')}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <IndianRupee className="w-3 h-3" />
                                      <span className="text-xs font-medium">Current</span>
                                      {sortField === 'current_price' && (
                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                  <th className="px-3 py-2 text-left text-[var(--accent)]">
                                    <div className="flex items-center space-x-1">
                                      <RefreshCw className="w-3 h-3" />
                                      <span className="text-xs font-medium">Updated</span>
                                    </div>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {liveOrders.map((order) => {
                                  const parsed = parseStrikeSymbol(order.strike_symbol || '');
                                  const isExpanded = expandedRows.has(order.id);
                                  const hasExecutions = order.broker_executions && order.broker_executions.length > 0;

                                  return (
                                    <React.Fragment key={order.id}>
                                      <tr className="border-t border-[var(--border)]/20 hover:bg-[var(--card-background)]/50 transition duration-200">
                                        <td className="px-3 py-2">
                                          {hasExecutions ? (
                                            <button
                                              onClick={() => toggleRowExpansion(order.id)}
                                              className="p-1 hover:bg-[var(--accent)]/20 rounded transition-colors"
                                              title={isExpanded ? 'Hide executions' : 'Show executions'}
                                            >
                                              {isExpanded ? (
                                                <ChevronDown className="w-3 h-3 text-[var(--accent)]" />
                                              ) : (
                                                <ChevronRight className="w-3 h-3 text-[var(--accent)]" />
                                              )}
                                            </button>
                                          ) : (
                                            <div className="w-6 h-6 flex items-center justify-center">
                                              <div className="w-1 h-1 bg-[var(--muted-foreground)]/30 rounded-full"></div>
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 font-medium text-[var(--foreground)] text-xs">
                                          #{order.order_id || order.id}
                                        </td>
                                        <td className="px-3 py-2 text-[var(--muted-foreground)] text-xs">
                                          <span className="px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-md font-medium">
                                            {order.strategy_name || 'N/A'}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 font-medium text-[var(--foreground)] text-xs">
                                          {parsed.underlying || 'N/A'}
                                        </td>
                                        <td className="px-3 py-2 text-[var(--muted-foreground)] font-mono text-xs">
                                          {parsed.strike ? `₹${parsed.strike}` : 'N/A'}
                                        </td>
                                        <td className="px-2 py-2">
                                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                                            parsed.type === 'CE' 
                                              ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                              : parsed.type === 'PE'
                                                ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                                          }`}>
                                            {parsed.type || 'N/A'}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2">
                                          <span className={`font-bold text-xs ${
                                            order.pnl > 0 
                                              ? 'text-green-400' 
                                              : order.pnl < 0 
                                                ? 'text-red-400' 
                                                : 'text-[var(--muted-foreground)]'
                                          }`}>
                                            {order.pnl !== null && order.pnl !== undefined ? `₹${Number(order.pnl).toFixed(2)}` : '₹0.00'}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2">
                                          <div className="flex items-center space-x-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium uppercase whitespace-nowrap ${
                                              order.status === 'OPEN' 
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
                                                : order.status === 'CLOSED'
                                                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                                                  : order.status === 'AWAITING_ENTRY'
                                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                                                    : order.status === 'CANCELLED'
                                                      ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                                      : order.status === 'EXIT_REVERSAL'
                                                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                                        : order.status === 'EXIT_TARGET'
                                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                                            }`}>
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
                                        <td className="px-2 py-2">
                                          <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                                            order.side === 'BUY' 
                                              ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                              : 'bg-red-500/20 text-red-400 border border-red-500/50'
                                          }`}>
                                            {order.side || 'N/A'}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-[var(--muted-foreground)] text-xs">
                                          <div className="space-y-1">
                                            <div className="text-[var(--foreground)] font-medium">
                                              {order.signal_time ? new Date(order.signal_time).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short'
                                              }) : 'N/A'}
                                            </div>
                                            <div className="text-[var(--muted-foreground)]">
                                              {order.signal_time ? new Date(order.signal_time).toLocaleTimeString('en-IN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                              }) : ''}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-[var(--muted-foreground)] text-xs">
                                          <div className="space-y-1">
                                            <div className="text-[var(--foreground)] font-medium">
                                              {order.entry_time ? new Date(order.entry_time).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short'
                                              }) : 'N/A'}
                                            </div>
                                            <div className="text-[var(--muted-foreground)]">
                                              {order.entry_time ? new Date(order.entry_time).toLocaleTimeString('en-IN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                              }) : ''}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-[var(--muted-foreground)] text-xs">
                                          {order.entry_price ? `₹${Number(order.entry_price).toFixed(2)}` : 'N/A'}
                                        </td>
                                        <td className="px-3 py-2 text-[var(--muted-foreground)] text-xs">
                                          <div className="space-y-1">
                                            <div className="text-[var(--foreground)] font-medium">
                                              {order.exit_time ? new Date(order.exit_time).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short'
                                              }) : 'N/A'}
                                            </div>
                                            <div className="text-[var(--muted-foreground)]">
                                              {order.exit_time ? new Date(order.exit_time).toLocaleTimeString('en-IN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                              }) : ''}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-[var(--muted-foreground)] text-xs">
                                          {order.exit_price ? `₹${Number(order.exit_price).toFixed(2)}` : 'N/A'}
                                        </td>
                                        {/* Current Price */}
                                        <td className="px-3 py-2">
                                          <div className="flex items-center space-x-1">
                                            {order.current_price ? (
                                              <>
                                                <IndianRupee className="w-3 h-3 text-[var(--accent)]" />
                                                <span className="text-xs font-medium text-[var(--foreground)] font-mono">
                                                  {order.current_price.toFixed(2)}
                                                </span>
                                              </>
                                            ) : (
                                              <span className="text-xs text-[var(--muted-foreground)]">N/A</span>
                                            )}
                                          </div>
                                        </td>
                                        {/* Price Last Updated */}
                                        <td className="px-3 py-2">
                                          <div className="flex items-center space-x-1">
                                            {order.price_last_updated ? (
                                              <>
                                                <RefreshCw className={`w-3 h-3 ${getPriceUpdateFreshness(order.price_last_updated).color}`} />
                                                <div className="text-xs space-y-0.5">
                                                  <div className="text-[var(--foreground)] font-medium">
                                                    {formatCompactDateTime(order.price_last_updated).date}
                                                  </div>
                                                  <div className="text-[var(--muted-foreground)]">
                                                    {formatCompactDateTime(order.price_last_updated).time}
                                                  </div>
                                                </div>
                                              </>
                                            ) : (
                                              <span className="text-xs text-[var(--muted-foreground)]">N/A</span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                      
                                      {/* Broker Executions Row - only show if expanded */}
                                      {isExpanded && hasExecutions && (
                                        <tr key={`${order.id}-executions`} className="bg-[var(--muted)]/5">
                                          <td colSpan={16} className="py-4 px-6">
                                            <div className="space-y-4">
                                              {groupBrokerExecutions(order.broker_executions || []).map((summary) => (
                                                <div
                                                  key={`${summary.broker_name}_${summary.broker_order_id}`}
                                                  className="rounded-xl border border-[var(--border)]/40 bg-[var(--background)]/80 shadow-md p-4"
                                                >
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
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                      
                      {/* Completed Orders Section - Collapsible */}
                      {completedOrders.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-semibold text-[var(--foreground)]">Completed Orders</h3>
                              <span className="px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] rounded-full text-sm font-medium">
                                {completedOrders.length} {completedOrders.length === 1 ? 'order' : 'orders'}
                              </span>
                            </div>
                            <button
                              onClick={() => setShowCompletedOrders(!showCompletedOrders)}
                              className="flex items-center space-x-2 px-3 py-1.5 bg-[var(--card-background)] border border-[var(--border)] rounded-lg hover:bg-[var(--accent)]/10 transition-all duration-200"
                            >
                              <span className="text-sm text-[var(--foreground)]">
                                {showCompletedOrders ? 'Hide' : 'Show'} Completed Orders
                              </span>
                              {showCompletedOrders ? (
                                <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
                              )}
                            </button>
                          </div>

                          {showCompletedOrders && (
                            <div className="bg-[var(--card-background)]/50 rounded-xl border border-[var(--border)] overflow-x-auto shadow-lg">
                              <div className="max-h-96 overflow-y-auto">
                                <table className="w-full min-w-[1600px]">
                                  <thead className="bg-[var(--background)]/50 border-b border-[var(--border)] sticky top-0">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-[var(--accent)] w-12">
                                        <Eye className="w-3 h-3" />
                                      </th>
                                      <th 
                                        className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                        onClick={() => handleSort('id')}
                                      >
                                        <span className="text-xs font-medium">Order ID</span>
                                      </th>
                                      <th 
                                        className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                        onClick={() => handleSort('strategy_name')}
                                      >
                                        <span className="text-xs font-medium">Strategy</span>
                                      </th>
                                      <th 
                                        className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                        onClick={() => handleSort('underlying')}
                                      >
                                        <span className="text-xs font-medium">Symbol</span>
                                      </th>
                                      <th 
                                        className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                        onClick={() => handleSort('strike')}
                                      >
                                        <span className="text-xs font-medium">Strike</span>
                                      </th>
                                      <th 
                                        className="px-2 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                        onClick={() => handleSort('type')}
                                      >
                                        <span className="text-xs font-medium">Type</span>
                                      </th>
                                      <th 
                                        className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                        onClick={() => handleSort('pnl')}
                                      >
                                        <span className="text-xs font-medium">P&L</span>
                                      </th>
                                      <th 
                                        className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                        onClick={() => handleSort('status')}
                                      >
                                        <span className="text-xs font-medium">Status</span>
                                      </th>
                                      <th 
                                        className="px-2 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                        onClick={() => handleSort('side')}
                                      >
                                        <span className="text-xs font-medium">Side</span>
                                      </th>
                                      <th 
                                        className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                        onClick={() => handleSort('signal_time')}
                                      >
                                        <span className="text-xs font-medium">Signal Time</span>
                                      </th>
                                      <th 
                                        className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                        onClick={() => handleSort('entry_time')}
                                      >
                                        <span className="text-xs font-medium">Entry Time</span>
                                      </th>
                                      <th 
                                        className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                        onClick={() => handleSort('entry_price')}
                                      >
                                        <span className="text-xs font-medium">Entry Price</span>
                                      </th>
                                      <th 
                                        className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                        onClick={() => handleSort('exit_time')}
                                      >
                                        <span className="text-xs font-medium">Exit Time</span>
                                      </th>
                                      <th 
                                        className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                        onClick={() => handleSort('exit_price')}
                                      >
                                        <span className="text-xs font-medium">Exit Price</span>
                                      </th>
                                      <th 
                                        className="px-3 py-2 text-left text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/10 transition-colors"
                                        onClick={() => handleSort('current_price')}
                                      >
                                        <div className="flex items-center space-x-1">
                                          <IndianRupee className="w-3 h-3" />
                                          <span className="text-xs font-medium">Current</span>
                                        </div>
                                      </th>
                                      <th className="px-3 py-2 text-left text-[var(--accent)]">
                                        <div className="flex items-center space-x-1">
                                          <RefreshCw className="w-3 h-3" />
                                          <span className="text-xs font-medium">Updated</span>
                                        </div>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {completedOrders.map((order) => {
                                      const parsed = parseStrikeSymbol(order.strike_symbol || '');
                                      const isExpanded = expandedRows.has(order.id);
                                      const hasExecutions = order.broker_executions && order.broker_executions.length > 0;

                                      return (
                                        <React.Fragment key={order.id}>
                                          <tr className="border-t border-[var(--border)]/20 hover:bg-[var(--card-background)]/50 transition duration-200">
                                            <td className="px-3 py-2">
                                              {hasExecutions ? (
                                                <button
                                                  onClick={() => toggleRowExpansion(order.id)}
                                                  className="p-1 hover:bg-[var(--accent)]/20 rounded transition-colors"
                                                  title={isExpanded ? 'Hide executions' : 'Show executions'}
                                                >
                                                  {isExpanded ? (
                                                    <ChevronDown className="w-3 h-3 text-[var(--accent)]" />
                                                  ) : (
                                                    <ChevronRight className="w-3 h-3 text-[var(--accent)]" />
                                                  )}
                                                </button>
                                              ) : (
                                                <div className="w-6 h-6 flex items-center justify-center">
                                                  <div className="w-1 h-1 bg-[var(--muted-foreground)]/30 rounded-full"></div>
                                                </div>
                                              )}
                                            </td>
                                            <td className="px-3 py-2 font-medium text-[var(--foreground)] text-xs">
                                              #{order.order_id || order.id}
                                            </td>
                                            <td className="px-3 py-2 text-[var(--muted-foreground)] text-xs">
                                              <span className="px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-md font-medium">
                                                {order.strategy_name || 'N/A'}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 font-medium text-[var(--foreground)] text-xs">
                                              {parsed.underlying || 'N/A'}
                                            </td>
                                            <td className="px-3 py-2 text-[var(--muted-foreground)] font-mono text-xs">
                                              {parsed.strike ? `₹${parsed.strike}` : 'N/A'}
                                            </td>
                                            <td className="px-2 py-2">
                                              <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                                                parsed.type === 'CE' 
                                                  ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                                  : parsed.type === 'PE'
                                                    ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                                              }`}>
                                                {parsed.type || 'N/A'}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2">
                                              <span className={`font-bold text-xs ${
                                                order.pnl > 0 
                                                  ? 'text-green-400' 
                                                  : order.pnl < 0 
                                                    ? 'text-red-400' 
                                                    : 'text-[var(--muted-foreground)]'
                                              }`}>
                                                {order.pnl !== null && order.pnl !== undefined ? `₹${Number(order.pnl).toFixed(2)}` : '₹0.00'}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2">
                                              <div className="flex items-center space-x-2">
                                                <span className={`px-2 py-1 rounded text-xs font-medium uppercase whitespace-nowrap ${
                                                  order.status === 'OPEN' 
                                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
                                                    : order.status === 'CLOSED'
                                                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                                                      : order.status === 'AWAITING_ENTRY'
                                                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                                                        : order.status === 'CANCELLED'
                                                          ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                                          : order.status === 'EXIT_REVERSAL'
                                                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                                            : order.status === 'EXIT_TARGET'
                                                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                                                }`}>
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
                                            <td className="px-2 py-2">
                                              <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                                                order.side === 'BUY' 
                                                  ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                                  : 'bg-red-500/20 text-red-400 border border-red-500/50'
                                              }`}>
                                                {order.side || 'N/A'}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-[var(--muted-foreground)] text-xs">
                                              <div className="space-y-1">
                                                <div className="text-[var(--foreground)] font-medium">
                                                  {order.signal_time ? new Date(order.signal_time).toLocaleDateString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short'
                                                  }) : 'N/A'}
                                                </div>
                                                <div className="text-[var(--muted-foreground)]">
                                                  {order.signal_time ? new Date(order.signal_time).toLocaleTimeString('en-IN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                  }) : ''}
                                                </div>
                                              </div>
                                            </td>
                                            <td className="px-3 py-2 text-[var(--muted-foreground)] text-xs">
                                              <div className="space-y-1">
                                                <div className="text-[var(--foreground)] font-medium">
                                                  {order.entry_time ? new Date(order.entry_time).toLocaleDateString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short'
                                                  }) : 'N/A'}
                                                </div>
                                                <div className="text-[var(--muted-foreground)]">
                                                  {order.entry_time ? new Date(order.entry_time).toLocaleTimeString('en-IN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                  }) : ''}
                                                </div>
                                              </div>
                                            </td>
                                            <td className="px-3 py-2 text-[var(--muted-foreground)] text-xs">
                                              {order.entry_price ? `₹${Number(order.entry_price).toFixed(2)}` : 'N/A'}
                                            </td>
                                            <td className="px-3 py-2 text-[var(--muted-foreground)] text-xs">
                                              <div className="space-y-1">
                                                <div className="text-[var(--foreground)] font-medium">
                                                  {order.exit_time ? new Date(order.exit_time).toLocaleDateString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short'
                                                  }) : 'N/A'}
                                                </div>
                                                <div className="text-[var(--muted-foreground)]">
                                                  {order.exit_time ? new Date(order.exit_time).toLocaleTimeString('en-IN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                  }) : ''}
                                                </div>
                                              </div>
                                            </td>
                                            <td className="px-3 py-2 text-[var(--muted-foreground)] text-xs">
                                              {order.exit_price ? `₹${Number(order.exit_price).toFixed(2)}` : 'N/A'}
                                            </td>
                                            {/* Current Price */}
                                            <td className="px-3 py-2">
                                              <div className="flex items-center space-x-1">
                                                {order.current_price ? (
                                                  <>
                                                    <IndianRupee className="w-3 h-3 text-[var(--accent)]" />
                                                    <span className="text-xs font-medium text-[var(--foreground)] font-mono">
                                                      {order.current_price.toFixed(2)}
                                                    </span>
                                                  </>
                                                ) : (
                                                  <span className="text-xs text-[var(--muted-foreground)]">N/A</span>
                                                )}
                                              </div>
                                            </td>
                                            {/* Price Last Updated */}
                                            <td className="px-3 py-2">
                                              <div className="flex items-center space-x-1">
                                                {order.price_last_updated ? (
                                                  <>
                                                    <RefreshCw className={`w-3 h-3 ${getPriceUpdateFreshness(order.price_last_updated).color}`} />
                                                    <div className="text-xs space-y-0.5">
                                                      <div className="text-[var(--foreground)] font-medium">
                                                        {formatCompactDateTime(order.price_last_updated).date}
                                                      </div>
                                                      <div className="text-[var(--muted-foreground)]">
                                                        {formatCompactDateTime(order.price_last_updated).time}
                                                      </div>
                                                    </div>
                                                  </>
                                                ) : (
                                                  <span className="text-xs text-[var(--muted-foreground)]">N/A</span>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                          
                                          {/* Broker Executions Row - only show if expanded */}
                                          {isExpanded && hasExecutions && (
                                            <tr key={`${order.id}-executions`} className="bg-[var(--muted)]/5">
                                              <td colSpan={16} className="py-4 px-6">
                                                <div className="space-y-4">
                                                  {groupBrokerExecutions(order.broker_executions || []).map((summary) => (
                                                    <div
                                                      key={`${summary.broker_name}_${summary.broker_order_id}`}
                                                      className="rounded-xl border border-[var(--border)]/40 bg-[var(--background)]/80 shadow-md p-4"
                                                    >
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
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* System Health Tab */}
            {activeTab === "health" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-[var(--accent)]" />
                    <h2 className="text-xl font-semibold text-[var(--accent)]">System Health Monitor</h2>
                  </div>
                  <p className="text-[var(--muted-foreground)] text-sm mt-1">Real-time monitoring of system performance and API health</p>
                </div>

                {/* Health Status Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Overall System Status */}
                  <div className="backdrop-blur-md bg-gradient-to-br from-[var(--card-background)]/95 to-[var(--card-background)]/85 border-2 border-green-500/40 rounded-xl p-6 shadow-xl shadow-green-500/20 ring-1 ring-green-500/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                      </div>
                      <div>
                        <p className="text-[var(--muted-foreground)] text-sm">System Status</p>
                        <p className="text-lg font-bold text-green-400">HEALTHY</p>
                        <p className="text-xs text-[var(--muted-foreground)]">All systems operational</p>
                      </div>
                    </div>
                  </div>

                  {/* API Health */}
                  <div className="backdrop-blur-md bg-gradient-to-br from-[var(--card-background)]/95 to-[var(--card-background)]/85 border-2 border-[var(--accent)]/40 rounded-xl p-6 shadow-xl shadow-[var(--accent)]/20 ring-1 ring-[var(--accent)]/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-[var(--accent)]/20 rounded-lg flex items-center justify-center">
                        <Wifi className="w-6 h-6 text-[var(--accent)]" />
                      </div>
                      <div>
                        <p className="text-[var(--muted-foreground)] text-sm">API Status</p>
                        <p className={`text-lg font-bold ${apiHealthy ? 'text-green-400' : 'text-red-400'}`}>
                          {apiHealthy ? 'ONLINE' : 'OFFLINE'}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">Response time: ~45ms</p>
                      </div>
                                       </div>
                  </div>

                  {/* System Uptime */}
                  <div className="backdrop-blur-md bg-gradient-to-br from-[var(--card-background)]/95 to-[var(--card-background)]/85 border-2 border-blue-500/40 rounded-xl p-6 shadow-xl shadow-blue-500/20 ring-1 ring-blue-500/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Clock className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[var(--muted-foreground)] text-sm">System Uptime</p>
                        <p className="text-lg font-bold text-blue-400">{formatUptime(systemMetrics.uptime || 0)}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Since last restart</p>
                      </div>
                    </div>
                  </div>

                  {/* Active Connections */}
                  <div className="backdrop-blur-md bg-gradient-to-br from-[var(--card-background)]/95 to-[var(--card-background)]/85 border-2 border-purple-500/40 rounded-xl p-6 shadow-xl shadow-purple-500/20 ring-1 ring-purple-500/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-[var(--muted-foreground)] text-sm">Active Sessions</p>
                        <p className="text-lg font-bold text-purple-400">1</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Connected user(s)</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Metrics Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Resource Usage */}
                  <div className="backdrop-blur-md bg-gradient-to-br from-[var(--card-background)]/95 to-[var(--card-background)]/85 border-2 border-[var(--accent)]/40 rounded-xl p-6 shadow-xl shadow-[var(--accent)]/20 ring-1 ring-[var(--accent)]/10">
                    <div className="flex items-center space-x-2 mb-6">
                      <Cpu className="w-5 h-5 text-[var(--accent)]" />
                      <h3 className="text-lg font-semibold text-[var(--accent)]">Resource Usage</h3>
                    </div>

                    <div className="space-y-6">
                      {/* CPU Usage */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Cpu className="w-4 h-4 text-[var(--muted-foreground)]" />
                            <span className="text-sm font-medium text-[var(--foreground)]">CPU Usage</span>
                          </div>
                          <span className="text-sm font-mono text-[var(--accent)]">
                            {(systemMetrics.cpuUsage || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-[var(--border)] rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-[var(--accent)] to-blue-400 h-3 rounded-full shadow-sm shadow-[var(--accent)]/60 transition-all duration-700 ease-out relative" 
                            style={{ width: `${Math.min(Math.max(systemMetrics.cpuUsage || 0, 0), 100)}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-[var(--muted-foreground)] mt-1">
                          <span>0%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* Memory Usage */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <HardDrive className="w-4 h-4 text-[var(--muted-foreground)]" />
                            <span className="text-sm font-medium text-[var(--foreground)]">Memory (RAM)</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-mono text-green-400">
                              {(((systemMetrics.ramUsage || 0) / getTotalMemoryBytes()) * 100).toFixed(1)}%
                            </span>
                            <div className="text-xs text-[var(--muted-foreground)]">
                              {formatBytes(systemMetrics.ramUsage || 0)} / {getTotalMemoryGB().toFixed(1)} GB
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-[var(--border)] rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-emerald-400 h-3 rounded-full shadow-sm shadow-green-500/60 transition-all duration-700 ease-out relative" 
                            style={{ width: `${Math.min(Math.max(((systemMetrics.ramUsage || 0) / getTotalMemoryBytes()) * 100, 0), 100)}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-[var(--muted-foreground)] mt-1">
                          <span>0 GB</span>
                          <span>{(getTotalMemoryGB() / 2).toFixed(1)} GB</span>
                          <span>{getTotalMemoryGB().toFixed(1)} GB</span>
                        </div>
                      </div>

                      {/* Disk Usage */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <HardDrive className="w-4 h-4 text-[var(--muted-foreground)]" />
                            <span className="text-sm font-medium text-[var(--foreground)]">Disk Space</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-mono text-orange-400">
                              {(((systemMetrics.diskUsage || 0) / getTotalDiskBytes()) * 100).toFixed(1)}%
                            </span>
                            <div className="text-xs text-[var(--muted-foreground)]">
                              {formatBytes(systemMetrics.diskUsage || 0)} / {getTotalDiskGB().toFixed(1)} GB
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-[var(--border)] rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all duration-700" 
                            style={{ width: `${Math.min(Math.max(((systemMetrics.diskUsage || 0) / getTotalDiskBytes()) * 100, 0), 100)}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-[var(--muted-foreground)] mt-1">
                          <span>0 GB</span>
                          <span>{(getTotalDiskGB() / 2).toFixed(1)} GB</span>
                          <span>{getTotalDiskGB().toFixed(1)} GB</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Network & API Monitoring */}
                  <div className="backdrop-blur-md bg-gradient-to-br from-[var(--card-background)]/95 to-[var(--card-background)]/85 border-2 border-[var(--accent)]/40 rounded-xl p-6 shadow-xl shadow-[var(--accent)]/20 ring-1 ring-[var(--accent)]/10">
                    <div className="flex items-center space-x-2 mb-6">
                      <Wifi className="w-5 h-5 text-[var(--accent)]" />
                      <h3 className="text-lg font-semibold text-[var(--accent)]">Network & API Health</h3>
                    </div>

                    <div className="space-y-6">
                      {/* Network Traffic */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-[var(--foreground)]">Network Traffic</span>
                          <span className="text-sm font-mono text-blue-400">
                            {formatBytes((systemMetrics.incomingTraffic || 0) + (systemMetrics.outgoingTraffic || 0))}/s
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span className="text-xs text-[var(--muted-foreground)]">Download</span>
                              </div>
                              <span className="text-xs font-mono text-blue-400">
                                {formatBytes(systemMetrics.incomingTraffic || 0)}/s
                              </span>
                            </div>
                            <div className="w-full bg-[var(--border)] rounded-full h-2">
                              <div className="bg-gradient-to-r from-blue-500 to-[var(--accent)] h-2 rounded-full animate-pulse shadow-sm shadow-blue-500/60"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                <span className="text-xs text-[var(--muted-foreground)]">Upload</span>
                              </div>
                              <span className="text-xs font-mono text-purple-400">
                                {formatBytes(systemMetrics.outgoingTraffic || 0)}/s
                              </span>
                            </div>
                            <div className="w-full bg-[var(--border)] rounded-full h-2">
                              <div className="bg-gradient-to-r from-purple-500 to-pink-400 h-2 rounded-full animate-pulse shadow-sm shadow-purple-500/60"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* API Health Components */}
                      <div>
                        <span className="text-sm font-medium text-[var(--foreground)] mb-3 block">API Components</span>
                        <div className="space-y-3">
                          {healthStatus && Object.entries(healthStatus.components).map(([component, status]) => (
                            <div key={component} className="flex items-center justify-between p-3 bg-[var(--background)]/40 rounded-lg border border-[var(--border)]">
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${status ? 'bg-green-400' : 'bg-red-400'}`}>
                                  {status && (
                                    <div className="w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75"></div>
                                  )}
                                </div>
                                <span className="text-sm text-[var(--foreground)] capitalize">{component}</span>
                              </div>
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                status 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {status ? 'HEALTHY' : 'FAILED'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Response Times */}
                      <div>
                        <span className="text-sm font-medium text-[var(--foreground)] mb-3 block">Response Times</span>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-[var(--background)]/40 rounded">
                            <span className="text-xs text-[var(--muted-foreground)]">API Avg</span>
                            <span className="text-xs font-mono text-green-400">45ms</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-[var(--background)]/40 rounded">
                            <span className="text-xs text-[var(--muted-foreground)]">Database</span>
                            <span className="text-xs font-mono text-green-400">12ms</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-[var(--background)]/40 rounded">
                            <span className="text-xs text-[var(--muted-foreground)]">Cache Hit</span>
                            <span className="text-xs font-mono text-blue-400">2ms</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Information & Live Status */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* System Information */}
                  <div className="backdrop-blur-md bg-gradient-to-br from-[var(--card-background)]/95 to-[var(--card-background)]/85 border-2 border-[var(--accent)]/40 rounded-xl p-6 shadow-xl shadow-[var(--accent)]/20 ring-1 ring-[var(--accent)]/10">
                    <div className="flex items-center space-x-2 mb-4">
                      <Monitor className="w-5 h-5 text-[var(--accent)]" />
                      <h3 className="text-lg font-semibold text-[var(--accent)]">System Info</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-2 bg-[var(--background)]/40 rounded">
                        <span className="text-sm text-[var(--muted-foreground)]">OS</span>
                        <span className="text-sm font-medium text-[var(--foreground)]">Ubuntu 22.04 LTS</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-[var(--background)]/40 rounded">
                        <span className="text-sm text-[var(--muted-foreground)]">Python</span>
                        <span className="text-sm font-medium text-[var(--foreground)]">3.12.0</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-[var(--background)]/40 rounded">
                        <span className="text-sm text-[var(--muted-foreground)]">Node.js</span>
                        <span className="text-sm font-medium text-[var(--foreground)]">20.11.0</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-[var(--background)]/40 rounded">
                        <span className="text-sm text-[var(--muted-foreground)]">Architecture</span>
                        <span className="text-sm font-medium text-[var(--foreground)]">x86_64</span>
                      </div>
                    </div>
                  </div>

                  {/* Process Monitoring */}
                  <div className="backdrop-blur-md bg-gradient-to-br from-[var(--card-background)]/95 to-[var(--card-background)]/85 border-2 border-[var(--accent)]/40 rounded-xl p-6 shadow-xl shadow-[var(--accent)]/20 ring-1 ring-[var(--accent)]/10">
                    <div className="flex items-center space-x-2 mb-4">
                      <Activity className="w-5 h-5 text-[var(--accent)]" />
                      <h3 className="text-lg font-semibold text-[var(--accent)]">Active Processes</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-2 bg-[var(--background)]/40 rounded">
                        <div>
                          <span className="text-sm font-medium text-[var(--foreground)]">AlgoSat API</span>
                          <div className="text-xs text-green-400">Running</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono text-[var(--accent)]">PID: 1234</div>
                          <div className="text-xs text-[var(--muted-foreground)]">CPU: 2.1%</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-[var(--background)]/40 rounded">
                        <div>
                          <span className="text-sm font-medium text-[var(--foreground)]">UI Server</span>
                          <div className="text-xs text-green-400">Running</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono text-[var(--accent)]">PID: 5678</div>
                          <div className="text-xs text-[var(--muted-foreground)]">CPU: 0.8%</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-[var(--background)]/40 rounded">
                        <div>
                          <span className="text-sm font-medium text-[var(--foreground)]">Strategy Engine</span>
                          <div className="text-xs text-green-400">Running</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono text-[var(--accent)]">PID: 9012</div>
                          <div className="text-xs text-[var(--muted-foreground)]">CPU: 1.5%</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Status & Alerts */}
                  <div className="backdrop-blur-md bg-gradient-to-br from-[var(--card-background)]/95 to-[var(--card-background)]/85 border-2 border-[var(--accent)]/40 rounded-xl p-6 shadow-xl shadow-[var(--accent)]/20 ring-1 ring-[var(--accent)]/10">
                    <div className="flex items-center space-x-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-[var(--accent)]" />
                      <h3 className="text-lg font-semibold text-[var(--accent)]">System Alerts</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                          <span className="text-sm text-green-400 font-medium">All Systems Operational</span>
                        </div>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {new Date().toLocaleTimeString('en-US', { 
                            hour12: false, 
                            hour: '2-digit', 
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium text-green-400">System Healthy</span>
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)]">No critical issues detected. All services running normally.</p>
                      </div>
                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Info className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-blue-400">Auto-refresh Active</span>
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)]">Health metrics updating every 30 seconds.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === "logs" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-[var(--accent)]" />
                    <h2 className="text-xl font-semibold text-[var(--accent)]">Log Management</h2>
                  </div>
                  <p className="text-[var(--muted-foreground)] text-sm mt-1">View and manage system logs with real-time monitoring</p>
                </div>

                {/* Logs Management Component */}
                <LogsManagement />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Broker Configuration Modal */}
      {showBrokerConfigModal && selectedBrokerForConfig && (
        <BrokerConfigModal
          isOpen={showBrokerConfigModal}
          onClose={() => {
            setShowBrokerConfigModal(false);
            setSelectedBrokerForConfig(null);
          }}
          brokerName={selectedBrokerForConfig}
          onSuccess={handleBrokerConfigSuccess}
        />
      )}

      {/* Risk Limits Modal */}
      {showRiskLimitsModal && selectedBrokerForRiskLimits && (
        <RiskLimitsModal
          isOpen={showRiskLimitsModal}
          onClose={() => {
            setShowRiskLimitsModal(false);
            setSelectedBrokerForRiskLimits(null);
          }}
          broker={selectedBrokerForRiskLimits}
          onSave={handleUpdateRiskLimits}
        />
      )}
    </div>
  );
}
