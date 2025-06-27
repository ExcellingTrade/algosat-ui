"use client";
import { useState, useEffect } from "react";
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
  apiClient 
} from "@/lib/api";
import { MarketTicker } from "@/components/MarketTicker";
// import { StockTicker } from "@/components/StockTicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogsManagement } from "@/components/LogsManagement";
import { StrategiesPage } from "@/components/strategies/StrategiesPage";
import { ActivityTracker } from "@/components/ActivityTracker";
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
  ChevronLeft,
  ChevronRight
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

export default function Dashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [balanceSummaries, setBalanceSummaries] = useState<BrokerBalanceSummary[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
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

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Check if market is open - simple function without useCallback to prevent dependency issues
  const checkMarketStatus = () => {
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
  };

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
    };
  }, [isAuthenticated, router]); // Stable dependencies only

  // Separate useEffect for holidays - only run once on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    
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
  }, [isAuthenticated]); // Only depend on authentication

  const loadDashboardData = async (isBackgroundRefresh = false) => {
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
      let systemStatusData: SystemStatus | null = null;
      let healthStatusData: HealthStatus | null = null;
      let dashboardSummaryData: DashboardSummary | null = null;

      // Load data concurrently for better performance
      const [strategiesResult, brokersResult, balanceSummariesResult, positionsResult, tradesResult, systemStatusResult, healthResult, dashboardSummaryResult] = 
        await Promise.allSettled([
          apiClient.getStrategies(),
          apiClient.getBrokers(),
          apiClient.getBalanceSummaries(),
          apiClient.getPositions(),
          apiClient.getTrades(),
          apiClient.getSystemStatus(),
          apiClient.healthCheck(),
          apiClient.getDashboardSummary()
        ]);

      // Handle strategies
      if (strategiesResult.status === 'fulfilled') {
        strategiesData = strategiesResult.value;
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
  };

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
    try {
      if (enabled) {
        await apiClient.enableBroker(brokerName);
      } else {
        await apiClient.disableBroker(brokerName);
      }
      await loadDashboardData(true); // Background refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update broker");
    }
  };

  const reauthBroker = async (brokerName: string) => {
    try {
      await apiClient.reauthBroker(brokerName);
      alert(`Reauthentication started for ${brokerName}. Check logs for status.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reauth broker");
    }
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
                { id: "positions", label: "Positions", icon: BarChart3 },
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
                {/* Enhanced Professional Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {/* Total Balance Card */}
                  <div className="backdrop-blur-xl bg-[var(--card-background)]/95 border-2 border-[var(--accent)]/50 rounded-2xl p-6 shadow-2xl shadow-[var(--accent)]/25 ring-1 ring-[var(--accent)]/20 hover:shadow-3xl hover:shadow-[var(--accent)]/35 transition-all duration-300 hover:scale-[1.02]">
                    <div>
                      <p className="text-[var(--muted-foreground)] text-sm">Total Balance</p>
                      <p className="text-xl lg:text-2xl font-bold text-[var(--foreground)] break-words">
                        {dashboardSummary ? `₹${dashboardSummary.total_balance.amount.toLocaleString('en-IN')}` : '₹0'}
                      </p>
                      <p className={`text-xs lg:text-sm ${dashboardSummary?.total_balance.is_positive ? 'text-green-400' : 'text-red-400'}`}>
                        {dashboardSummary ? (
                          `${dashboardSummary.total_balance.is_positive ? '↗' : '↘'} ${dashboardSummary.total_balance.change_percentage > 0 ? '+' : ''}${dashboardSummary.total_balance.change_percentage}% vs yesterday`
                        ) : (
                          '-- vs yesterday'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Today's P/L Card */}
                  <div className="backdrop-blur-xl bg-[var(--card-background)]/95 border-2 border-green-500/50 rounded-2xl p-6 shadow-2xl shadow-green-500/25 ring-1 ring-green-500/20 hover:shadow-3xl hover:shadow-green-500/35 transition-all duration-300 hover:scale-[1.02]">
                    <div>
                      <p className="text-[var(--muted-foreground)] text-sm">Today's P/L</p>
                      <p className={`text-xl lg:text-2xl font-bold break-words ${dashboardSummary?.todays_pnl.is_positive ? 'text-green-400' : 'text-red-400'}`}>
                        {dashboardSummary ? (
                          `${dashboardSummary.todays_pnl.amount >= 0 ? '+' : ''}₹${Math.abs(dashboardSummary.todays_pnl.amount).toLocaleString('en-IN')}`
                        ) : (
                          '₹0'
                        )}
                      </p>
                      <p className="text-[var(--muted-foreground)] text-xs lg:text-sm">Placeholder for now</p>
                    </div>
                  </div>

                  {/* Active Strategies Card */}
                  <div className="backdrop-blur-xl bg-[var(--card-background)]/95 border-2 border-blue-500/50 rounded-2xl p-6 shadow-2xl shadow-blue-500/25 ring-1 ring-blue-500/20 hover:shadow-3xl hover:shadow-blue-500/35 transition-all duration-300 hover:scale-[1.02]">
                    <div>
                      <p className="text-[var(--muted-foreground)] text-sm">Active Strategies</p>
                      <p className="text-xl lg:text-2xl font-bold text-[var(--foreground)]">
                        {dashboardSummary ? dashboardSummary.active_strategies.count : stats.activeStrategies}
                      </p>
                      <p className="text-blue-400 text-xs lg:text-sm">
                        {dashboardSummary ? (
                          `${dashboardSummary.active_strategies.profit_count} profit • ${dashboardSummary.active_strategies.loss_count} loss`
                        ) : (
                          `${stats.activeStrategies} profit • ${stats.totalStrategies - stats.activeStrategies} loss`
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance Chart & Activity Log */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Performance Overview */}
                  <div className="lg:col-span-2 backdrop-blur-xl bg-[var(--card-background)]/95 border border-[var(--border)] rounded-2xl p-6 shadow-xl shadow-[var(--accent)]/15 hover:shadow-2xl hover:shadow-[var(--accent)]/25 transition-all duration-300">
                    <div className="flex items-center space-x-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
                      <h2 className="text-xl font-semibold text-[var(--accent)]">Performance Overview</h2>
                    </div>
                    <div className="h-64 flex items-end justify-center space-x-2">
                      {/* Simple bar chart representation */}
                      {[30, 45, 25, 60, 80, 45, 90, 75, 65, 85, 95, 70].map((height, index) => (
                        <div key={index} className="relative group">
                          <div 
                            className={`w-6 bg-gradient-to-t from-[var(--accent)] to-blue-400 rounded-t transition-all duration-300 group-hover:from-[var(--accent)]/80 group-hover:to-blue-300 shadow-lg ${
                              index === 11 ? 'shadow-[var(--accent)]/50' : 'shadow-[var(--accent)]/20'
                            }`}
                            style={{ height: `${height}%` }}
                          ></div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-6">
                      <div className="text-center">
                        <p className="text-green-400 text-lg font-bold">₹38,450.75</p>
                        <p className="text-[var(--muted-foreground)] text-sm">Total P&L</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[var(--accent)] text-lg font-bold">68.5%</p>
                        <p className="text-[var(--muted-foreground)] text-sm">Win Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-blue-400 text-lg font-bold">₹1,240.25</p>
                        <p className="text-[var(--muted-foreground)] text-sm">Avg. Trade</p>
                      </div>
                      <div className="text-center">
                        <p className="text-purple-400 text-lg font-bold">{stats.activeStrategies}</p>
                        <p className="text-[var(--muted-foreground)] text-sm">Active Strategies</p>
                      </div>
                    </div>
                  </div>

                  {/* Activity Log */}
                  <div className="backdrop-blur-xl bg-[var(--card-background)]/95 border border-[var(--border)] rounded-2xl p-6 shadow-xl shadow-[var(--accent)]/10">
                    <div className="flex items-center space-x-2 mb-4">
                      <Activity className="w-5 h-5 text-[var(--accent)]" />
                      <h2 className="text-xl font-semibold text-[var(--accent)]">Activity Log</h2>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="border-l-2 border-green-500 pl-3">
                        <p className="text-[var(--foreground)]">SBIN Long position opened</p>
                        <p className="text-[var(--muted-foreground)]">2 mins ago • 100 shares at ₹580.50</p>
                      </div>
                      <div className="border-l-2 border-red-500 pl-3">
                        <p className="text-[var(--foreground)]">NIFTY Short position closed</p>
                        <p className="text-[var(--muted-foreground)]">15 mins ago • 25 lots at ₹21,450.75</p>
                      </div>
                      <div className="border-l-2 border-blue-500 pl-3">
                        <p className="text-[var(--foreground)]">BANKNIFTY Strategy activated</p>
                        <p className="text-[var(--muted-foreground)]">42 mins ago • Algorithm #127</p>
                      </div>
                      <div className="border-l-2 border-[var(--accent)] pl-3">
                        <p className="text-[var(--foreground)]">System maintenance completed</p>
                        <p className="text-[var(--muted-foreground)]">1 hour ago • Duration: 5 minutes</p>
                      </div>
                      <div className="border-l-2 border-green-500 pl-3">
                        <p className="text-[var(--foreground)]">SBIN Long position opened</p>
                        <p className="text-[var(--muted-foreground)]">2 hours ago • 200 shares at ₹575.25</p>
                      </div>
                    </div>
                    <button className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm transition duration-200">
                      View all activity →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Strategies Tab */}
            {activeTab === "strategies" && (
              <StrategiesPage />
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
                      </div>
                    </h2>
                    <p className="text-[var(--muted-foreground)]">Manage your broker connections and monitor account balances</p>
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
                          <div className={`absolute inset-0 bg-gradient-to-br ${theme.primary} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
                          
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
                              {broker.last_auth_check ? new Date(broker.last_auth_check).toLocaleDateString() : 'Never'}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex space-x-2">
                            <button
                              onClick={() => toggleBroker(broker.broker_name, !broker.is_enabled)}
                              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                broker.is_enabled 
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 hover:shadow-lg hover:shadow-red-500/20' 
                                  : 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 hover:shadow-lg hover:shadow-green-500/20'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                {broker.is_enabled ? (
                                  <>
                                    <PauseCircle className="w-4 h-4" />
                                    <span>Disconnect</span>
                                  </>
                                ) : (
                                  <>
                                    <PlayCircle className="w-4 h-4" />
                                    <span>Connect</span>
                                  </>
                                )}
                              </div>
                            </button>
                            
                            <button
                              onClick={() => reauthBroker(broker.broker_name)}
                              className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30 hover:shadow-lg hover:shadow-blue-500/20 rounded-lg text-sm font-medium transition-all duration-200"
                            >
                              <div className="flex items-center space-x-2">
                                <RotateCcw className="w-4 h-4" />
                                <span>Reauth</span>
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

            {/* Positions Tab */}
            {activeTab === "positions" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent)] to-blue-400 bg-clip-text text-transparent mb-2">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
                        <span>Open Positions</span>
                      </div>
                    </h2>
                    <p className="text-[var(--muted-foreground)]">Monitor your active trading positions and P&L in real-time</p>
                  </div>
                  
                  {/* Position Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="backdrop-blur-xl bg-green-500/10 border border-green-500/30 rounded-2xl p-3 shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 transition-all duration-300">
                      <p className="text-xl font-bold text-green-400">{positions.length}</p>
                      <p className="text-xs text-green-300">Total</p>
                    </div>
                    <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300">
                      <p className="text-xl font-bold text-blue-400">{positions.filter(p => p.pnl > 0).length}</p>
                      <p className="text-xs text-blue-300">Profit</p>
                    </div>
                    <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-2xl p-3 shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300">
                      <p className="text-xl font-bold text-red-400">{positions.filter(p => p.pnl < 0).length}</p>
                      <p className="text-xs text-red-300">Loss</p>
                    </div>
                  </div>
                </div>

                {positions.length === 0 ? (
                  /* Cyber-themed Empty State for Positions */
                  <div className="relative backdrop-blur-xl bg-[var(--card-background)]/95 border border-[var(--border)] rounded-2xl p-12 text-center shadow-2xl shadow-[var(--accent)]/20 overflow-hidden">
                    {/* Animated Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 via-[var(--background)] to-blue-900/10"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--accent)]/5 to-transparent"></div>
                    
                    {/* Floating Orbs */}
                    <div className="absolute top-8 left-8 w-4 h-4 bg-[var(--accent)]/30 rounded-full animate-pulse"></div>
                    <div className="absolute top-16 right-12 w-3 h-3 bg-blue-400/20 rounded-full animate-ping"></div>
                    <div className="absolute bottom-12 left-16 w-2 h-2 bg-purple-400/40 rounded-full animate-bounce"></div>
                    
                    <div className="relative z-10">
                      {/* Main Image */}
                      <div className="mb-8 relative">
                        <div className="w-48 h-48 mx-auto relative">
                          <img 
                            src="/brokers/no-positions.png" 
                            alt="No Positions" 
                            className="w-full h-full object-contain filter drop-shadow-2xl"
                          />
                          {/* Glow Effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                        </div>
                      </div>

                      {/* Title with Gradient */}
                      <h3 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-blue-400 bg-clip-text text-transparent mb-4">
                        No Active Positions
                      </h3>
                      
                      {/* Description */}
                      <p className="text-[var(--muted-foreground)] text-lg mb-8 max-w-md mx-auto leading-relaxed">
                        Your portfolio is clean and ready for action. Deploy your strategies to start building positions.
                      </p>

                      {/* Professional Action Buttons */}
                      {/* <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button className="bg-gradient-to-r from-[var(--accent)] to-blue-500 hover:from-[var(--accent)]/80 hover:to-blue-400 text-black font-bold px-8 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-[var(--accent)]/25 hover:shadow-[var(--accent)]/40">
                          <span className="flex items-center space-x-2">
                            <span>⚡</span>
                            <span>View Strategies</span>
                          </span>
                        </button>
                        <button className="bg-[var(--background)]/50 hover:bg-[var(--background)]/70 text-[var(--accent)] border border-[var(--accent)]/50 hover:border-[var(--accent)] font-medium px-8 py-3 rounded-lg transition-all duration-300 backdrop-blur-sm">
                          <span className="flex items-center space-x-2">
                            <span>📊</span>
                            <span>Market Overview</span>
                          </span>
                        </button>
                      </div> */}

                      {/* Professional Stats Dashboard */}
                      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        <div className="backdrop-blur-sm bg-gradient-to-br from-purple-500/10 to-[var(--background)]/40 border border-purple-500/30 rounded-xl p-6 relative overflow-hidden group">
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="relative">
                            <div className="flex items-center space-x-4 mb-3">
                              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">⚡</span>
                              </div>
                              <div>
                                <p className="text-purple-400 font-bold text-lg">Lightning Fast</p>
                                <p className="text-[var(--muted-foreground)] text-sm">Ultra-low latency execution</p>
                              </div>
                            </div>
                            <div className="bg-[var(--background)]/40 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <span className="text-[var(--muted-foreground)]">Response Time</span>
                                <span className="text-purple-400 font-mono">&lt; 50ms</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="backdrop-blur-sm bg-gradient-to-br from-[var(--accent)]/10 to-[var(--background)]/40 border border-[var(--accent)]/30 rounded-xl p-6 relative overflow-hidden group">
                          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="relative">
                            <div className="flex items-center space-x-4 mb-3">
                              <div className="w-12 h-12 bg-[var(--accent)]/20 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">🔒</span>
                              </div>
                              <div>
                                <p className="text-[var(--accent)] font-bold text-lg">Secure Trading</p>
                                <p className="text-[var(--muted-foreground)] text-sm">Bank-grade encryption</p>
                              </div>
                            </div>
                            <div className="bg-[var(--background)]/40 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <span className="text-[var(--muted-foreground)]">Security Level</span>
                                <span className="text-[var(--accent)] font-mono">256-bit</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="backdrop-blur-sm bg-gradient-to-br from-blue-500/10 to-[var(--background)]/40 border border-blue-500/30 rounded-xl p-6 relative overflow-hidden group">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="relative">
                            <div className="flex items-center space-x-4 mb-3">
                              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">🌐</span>
                              </div>
                              <div>
                                <p className="text-blue-400 font-bold text-lg">Multi-Broker</p>
                                <p className="text-[var(--muted-foreground)] text-sm">Unified execution</p>
                              </div>
                            </div>
                            <div className="bg-[var(--background)]/40 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <span className="text-[var(--muted-foreground)]">Brokers Ready</span>
                                <span className="text-blue-400 font-mono">All Active</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div> */}
                    </div>
                  </div>
                ) : (
                  <div className="backdrop-blur-sm bg-[var(--card-background)] border border-purple-500/30 rounded-lg overflow-hidden shadow-lg shadow-purple-500/10">
                    <table className="w-full">
                      <thead className="bg-[var(--background)]/50 border-b border-purple-500/30">
                        <tr>
                          <th className="px-4 py-3 text-left text-purple-400">Broker</th>
                          <th className="px-4 py-3 text-left text-purple-400">Symbol</th>
                          <th className="px-4 py-3 text-left text-purple-400">Side</th>
                          <th className="px-4 py-3 text-left text-purple-400">Quantity</th>
                          <th className="px-4 py-3 text-left text-purple-400">Price</th>
                          <th className="px-4 py-3 text-left text-purple-400">Order Type</th>
                          <th className="px-4 py-3 text-left text-purple-400">Status</th>
                          <th className="px-4 py-3 text-left text-purple-400">Executed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.slice(0, 50).map((trade) => (
                          <tr key={trade.id} className="border-t border-purple-500/20 hover:bg-purple-500/5 transition duration-200">
                            <td className="px-4 py-3 text-[var(--muted-foreground)]">{trade.broker_name}</td>
                            <td className="px-4 py-3 font-medium text-[var(--foreground)]">{trade.symbol}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs ${
                                trade.side === 'BUY' 
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                  : 'bg-red-500/20 text-red-400 border border-red-500/50'
                              }`}>
                                {trade.side}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[var(--muted-foreground)]">{trade.quantity}</td>
                            <td className="px-4 py-3 text-[var(--muted-foreground)]">₹{trade.price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[var(--muted-foreground)]">{trade.order_type}</td>
                            <td className="px-4 py-3 text-[var(--muted-foreground)]">{trade.status}</td>
                            <td className="px-4 py-3 text-[var(--muted-foreground)]">
                              {new Date(trade.executed_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
                            className="bg-gradient-to-r from-orange-500 to-amber-400 h-3 rounded-full shadow-sm shadow-orange-500/60 transition-all duration-700 ease-out relative" 
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
    </div>
  );
}
