"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { 
  Strategy, 
  StrategyConfig, 
  Broker, 
  Position, 
  Trade,
  SystemStatus,
  HealthStatus,
  apiClient 
} from "@/lib/api";

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
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
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
  const [isLoading, setIsLoading] = useState(true);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Temporarily set the JWT token for testing
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6InVzZXIiLCJlbWFpbCI6ImFkbWluQGFkbWluLmNvbSIsImV4cCI6MTc0ODkyOTY1NX0.BeMg9hIFsIJIWaknH5Y4hOdQ8uR8UhGw0pHLR265GW0');
    }
    
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    
    // Initial load
    loadDashboardData(false);
    
    // Set up auto-refresh for system metrics (background refresh to prevent page flipping)
    const refreshInterval = setInterval(() => {
      loadDashboardData(true); // Background refresh
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, router]);

  const loadDashboardData = async (isBackgroundRefresh = false) => {
    try {
      // Only show loading state for initial load, not background refreshes
      if (!isBackgroundRefresh) {
        setIsLoading(true);
      } else {
        setIsBackgroundRefreshing(true);
      }
      setError(null);
      console.log('Dashboard: Starting to load data...');

      // Initialize arrays in case API calls fail
      let strategiesData: Strategy[] = [];
      let brokersData: Broker[] = [];
      let positionsData: Position[] = [];
      let tradesData: Trade[] = [];
      let systemStatusData: SystemStatus | null = null;
      let healthStatusData: HealthStatus | null = null;

      // Load data concurrently for better performance
      const [strategiesResult, brokersResult, positionsResult, tradesResult, systemStatusResult, healthResult] = 
        await Promise.allSettled([
          apiClient.getStrategies(),
          apiClient.getBrokers(),
          apiClient.getPositions(),
          apiClient.getTrades(),
          apiClient.getSystemStatus(),
          apiClient.healthCheck()
        ]);

      // Handle strategies
      if (strategiesResult.status === 'fulfilled') {
        strategiesData = strategiesResult.value;
        console.log('Dashboard: Strategies loaded:', strategiesData.length);
      } else {
        console.error('Dashboard: Failed to load strategies:', strategiesResult.reason);
      }
      setStrategies(strategiesData);

      // Handle brokers
      if (brokersResult.status === 'fulfilled') {
        brokersData = brokersResult.value;
        console.log('Dashboard: Brokers loaded:', brokersData.length);
      } else {
        console.error('Dashboard: Failed to load brokers:', brokersResult.reason);
      }
      setBrokers(brokersData);

      // Handle positions
      if (positionsResult.status === 'fulfilled') {
        positionsData = positionsResult.value;
        console.log('Dashboard: Positions loaded:', positionsData.length);
      } else {
        console.error('Dashboard: Failed to load positions:', positionsResult.reason);
      }
      setPositions(positionsData);

      // Handle trades
      if (tradesResult.status === 'fulfilled') {
        tradesData = tradesResult.value;
        console.log('Dashboard: Trades loaded:', tradesData.length);
      } else {
        console.error('Dashboard: Failed to load trades:', tradesResult.reason);
      }
      setTrades(tradesData);

      // Handle system status
      if (systemStatusResult.status === 'fulfilled') {
        systemStatusData = systemStatusResult.value;
        console.log('Dashboard: System status loaded');
        setSystemStatus(systemStatusData);
        
        // Extract latest metrics from system status
        if (systemStatusData) {
          const extractLatestValue = (metric: any) => {
            const timestamps = Object.keys(metric.usage).sort((a, b) => parseInt(b) - parseInt(a));
            return timestamps.length > 0 ? metric.usage[timestamps[0]] : 0;
          };

          setSystemMetrics({
            cpuUsage: extractLatestValue(systemStatusData.cpu_usage),
            ramUsage: extractLatestValue(systemStatusData.ram_usage),
            diskUsage: extractLatestValue(systemStatusData.disk_space),
            uptime: extractLatestValue(systemStatusData.uptime),
            incomingTraffic: extractLatestValue(systemStatusData.incoming_traffic),
            outgoingTraffic: extractLatestValue(systemStatusData.outgoing_traffic)
          });
        }
      } else {
        console.error('Dashboard: Failed to load system status:', systemStatusResult.reason);
      }

      // Handle health status
      if (healthResult.status === 'fulfilled') {
        healthStatusData = healthResult.value;
        console.log('Dashboard: Health status loaded:', healthStatusData.status);
        setHealthStatus(healthStatusData);
        setApiHealthy(healthStatusData.status === 'healthy');
      } else {
        console.error('Dashboard: Failed to load health status:', healthResult.reason);
        setApiHealthy(false);
      }

      // Calculate stats
      const totalPnL = positionsData.reduce((sum, pos) => sum + (pos.pnl || 0), 0);
      setStats({
        totalStrategies: strategiesData.length,
        activeStrategies: strategiesData.filter(s => s.enabled).length,
        totalBrokers: brokersData.length,
        activeBrokers: brokersData.filter(b => b.enabled).length,
        totalPositions: positionsData.length,
        totalPnL
      });
      
      console.log('Dashboard: Data loading completed');
    } catch (err) {
      console.error('Dashboard: Critical error:', err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      if (!isBackgroundRefresh) {
        setIsLoading(false);
      } else {
        setIsBackgroundRefreshing(false);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
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

  const formatUptime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 text-xl animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background glow effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-cyan-900/20 via-black to-blue-900/20"></div>
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-transparent to-transparent"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <header className="backdrop-blur-sm bg-black/50 border-b border-cyan-500/30 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/50">
                  <span className="text-black font-bold text-sm">AS</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    Algo Sat
                  </h1>
                  <p className="text-xs text-gray-400">Trading Bot v1.0.0</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Background refresh indicator */}
              {isBackgroundRefreshing && (
                <div className="flex items-center space-x-2 text-cyan-400">
                  <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Updating...</span>
                </div>
              )}
              
              <button
                onClick={() => loadDashboardData(false)}
                disabled={isLoading}
                className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 px-3 py-2 rounded-lg transition duration-200 border border-cyan-500/50 hover:border-cyan-400 shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Refreshing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>🔄</span>
                    <span>Refresh</span>
                  </div>
                )}
              </button>
              <div className="text-right">
                <p className="text-sm text-gray-400">Welcome back</p>
                <p className="text-cyan-400 font-medium">{user?.username}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600/80 hover:bg-red-600 px-4 py-2 rounded-lg transition duration-200 border border-red-500/50 hover:border-red-400 shadow-lg hover:shadow-red-500/20"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 backdrop-blur-sm bg-black/30 border-r border-cyan-500/30 lg:h-screen lg:sticky lg:top-0 relative">
            {/* Navigation */}
            <nav className="p-4 space-y-2">
              {[
                { id: "overview", label: "Dashboard", icon: "🏠" },
                { id: "strategies", label: "Strategies", icon: "⚡" },
                { id: "brokers", label: "Brokers", icon: "🔗" },
                { id: "positions", label: "Positions", icon: "📊" },
                { id: "trades", label: "Trades", icon: "💹" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition duration-200 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 text-cyan-400 shadow-lg shadow-cyan-500/20"
                      : "text-gray-400 hover:text-cyan-300 hover:bg-gray-800/50 border border-transparent"
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Status Widgets Container - Fixed positioning for large screens */}
            <div className="lg:absolute lg:bottom-2 lg:left-2 lg:right-2 p-4 lg:p-0 space-y-3">
              {/* API Health Status */}
              <div className="backdrop-blur-sm bg-gradient-to-br from-black/70 to-gray-900/50 border border-cyan-500/40 rounded-lg p-2 shadow-xl shadow-cyan-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <div className={`relative w-2.5 h-2.5 rounded-full ${apiHealthy ? 'bg-green-400' : 'bg-red-400'}`}>
                      {apiHealthy && (
                        <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
                      )}
                      <div className={`absolute inset-0 rounded-full ${apiHealthy ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                    </div>
                    <span className="text-xs font-semibold text-cyan-400">API</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className={`font-mono text-xs ${apiHealthy ? 'text-green-400' : 'text-red-400'}`}>
                      {apiHealthy ? 'OK' : 'ERR'}
                    </span>
                    {healthStatus && (
                      <div className="flex items-center space-x-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${healthStatus.components.database ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className="text-xs text-gray-400">DB</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${healthStatus.components.security ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className="text-xs text-gray-400">SEC</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced System Status */}
              <div className="backdrop-blur-sm bg-gradient-to-br from-black/70 to-gray-900/50 border border-cyan-500/40 rounded-lg p-2.5 shadow-xl shadow-cyan-500/20">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <h3 className="text-xs font-semibold text-cyan-400">System</h3>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {new Date().toLocaleTimeString('en-US', { 
                      hour12: false, 
                      hour: '2-digit', 
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                
                <div className="space-y-2.5">
                  {/* CPU Usage */}
                  <div className="bg-black/30 rounded p-2 border border-gray-700/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">🖥️ CPU</span>
                      <span className="text-xs font-mono text-cyan-300">
                        {systemMetrics.cpuUsage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-800/80 rounded-full h-1 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-blue-400 h-1 rounded-full shadow-sm shadow-cyan-500/60 transition-all duration-700 ease-out" 
                        style={{ width: `${Math.min(systemMetrics.cpuUsage, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Memory Usage */}
                  <div className="bg-black/30 rounded p-2 border border-gray-700/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">💾 RAM</span>
                      <span className="text-xs font-mono text-green-300">
                        {((systemMetrics.ramUsage / (8 * 1024 * 1024 * 1024)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-800/80 rounded-full h-1 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-400 h-1 rounded-full shadow-sm shadow-green-500/60 transition-all duration-700 ease-out" 
                        style={{ width: `${Math.min((systemMetrics.ramUsage / (8 * 1024 * 1024 * 1024)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Network Traffic */}
                  <div className="bg-black/30 rounded p-2 border border-gray-700/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">🌐 I/O</span>
                      <span className="text-xs font-mono text-blue-300">
                        {formatBytes(systemMetrics.incomingTraffic + systemMetrics.outgoingTraffic)}/s
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="text-xs text-gray-500">↓</div>
                          <div className="text-xs font-mono text-blue-300">
                            {formatBytes(systemMetrics.incomingTraffic)}
                          </div>
                        </div>
                        <div className="w-full bg-gray-800/80 rounded-full h-0.5">
                          <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-0.5 rounded-full animate-pulse shadow-sm shadow-blue-500/60"></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="text-xs text-gray-500">↑</div>
                          <div className="text-xs font-mono text-purple-300">
                            {formatBytes(systemMetrics.outgoingTraffic)}
                          </div>
                        </div>
                        <div className="w-full bg-gray-800/80 rounded-full h-0.5">
                          <div className="bg-gradient-to-r from-purple-500 to-pink-400 h-0.5 rounded-full animate-pulse shadow-sm shadow-purple-500/60"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System Info */}
                  <div className="flex justify-between items-center pt-1.5 border-t border-gray-700/50">
                    <div className="text-xs text-gray-400">
                      <span>⏱️ </span>
                      <span className="text-purple-300 font-mono">{formatUptime(systemMetrics.uptime)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-ping"></div>
                      <span className="text-xs text-green-400">Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 backdrop-blur-sm">
                {error}
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Top Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
                  <div className="backdrop-blur-sm bg-black/30 border border-cyan-500/30 rounded-lg p-4 lg:p-6 shadow-lg shadow-cyan-500/10">
                    <div>
                      <p className="text-gray-400 text-sm">Total Balance</p>
                      <p className="text-xl lg:text-2xl font-bold text-white break-words">₹2,57,84,225</p>
                      <p className="text-green-400 text-xs lg:text-sm">↗ +12.5% vs prev. month</p>
                    </div>
                  </div>

                  <div className="backdrop-blur-sm bg-black/30 border border-green-500/30 rounded-lg p-4 lg:p-6 shadow-lg shadow-green-500/10">
                    <div>
                      <p className="text-gray-400 text-sm">Today's P/L</p>
                      <p className="text-xl lg:text-2xl font-bold text-green-400 break-words">+₹1,84,225</p>
                      <p className="text-green-400 text-xs lg:text-sm">↗ +3.2% daily growth</p>
                    </div>
                  </div>

                  <div className="backdrop-blur-sm bg-black/30 border border-blue-500/30 rounded-lg p-4 lg:p-6 shadow-lg shadow-blue-500/10">
                    <div>
                      <p className="text-gray-400 text-sm">Active Strategies</p>
                      <p className="text-xl lg:text-2xl font-bold text-white">{stats.activeStrategies}</p>
                      <p className="text-blue-400 text-xs lg:text-sm">{stats.activeStrategies} profit • {stats.totalStrategies - stats.activeStrategies} loss</p>
                    </div>
                  </div>

                  <div className="backdrop-blur-sm bg-black/30 border border-purple-500/30 rounded-lg p-4 lg:p-6 shadow-lg shadow-purple-500/10">
                    <div>
                      <p className="text-gray-400 text-sm">Trading Volume</p>
                      <p className="text-xl lg:text-2xl font-bold text-white break-words">₹89,42,700</p>
                      <p className="text-red-400 text-xs lg:text-sm">↘ -8.2% vs prev. month</p>
                    </div>
                  </div>
                </div>

                {/* Performance Chart & Activity Log */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Performance Overview */}
                  <div className="lg:col-span-2 backdrop-blur-sm bg-black/30 border border-cyan-500/30 rounded-lg p-6 shadow-lg shadow-cyan-500/10">
                    <h2 className="text-xl font-semibold text-cyan-400 mb-4">📈 Performance Overview</h2>
                    <div className="h-64 flex items-end justify-center space-x-2">
                      {/* Simple bar chart representation */}
                      {[30, 45, 25, 60, 80, 45, 90, 75, 65, 85, 95, 70].map((height, index) => (
                        <div key={index} className="relative group">
                          <div 
                            className={`w-6 bg-gradient-to-t from-cyan-500 to-blue-400 rounded-t transition-all duration-300 group-hover:from-cyan-400 group-hover:to-blue-300 shadow-lg ${
                              index === 11 ? 'shadow-cyan-500/50' : 'shadow-cyan-500/20'
                            }`}
                            style={{ height: `${height}%` }}
                          ></div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-6">
                      <div className="text-center">
                        <p className="text-green-400 text-lg font-bold">$38,450.75</p>
                        <p className="text-gray-400 text-sm">Total P&L</p>
                      </div>
                      <div className="text-center">
                        <p className="text-cyan-400 text-lg font-bold">68.5%</p>
                        <p className="text-gray-400 text-sm">Win Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-blue-400 text-lg font-bold">$1,240.25</p>
                        <p className="text-gray-400 text-sm">Avg. Trade</p>
                      </div>
                      <div className="text-center">
                        <p className="text-purple-400 text-lg font-bold">{stats.activeStrategies}</p>
                        <p className="text-gray-400 text-sm">Active Strategies</p>
                      </div>
                    </div>
                  </div>

                  {/* Activity Log */}
                  <div className="backdrop-blur-sm bg-black/30 border border-cyan-500/30 rounded-lg p-6 shadow-lg shadow-cyan-500/10">
                    <h2 className="text-xl font-semibold text-cyan-400 mb-4">🕒 Activity Log</h2>
                    <div className="space-y-3 text-sm">
                      <div className="border-l-2 border-green-500 pl-3">
                        <p className="text-white">BTC/USDT Long position opened</p>
                        <p className="text-gray-400">2 mins ago • 0.25 BTC at $38,22,150</p>
                      </div>
                      <div className="border-l-2 border-red-500 pl-3">
                        <p className="text-white">ETH/USDT Short position closed</p>
                        <p className="text-gray-400">15 mins ago • 7 ETH at $2,60,980</p>
                      </div>
                      <div className="border-l-2 border-blue-500 pl-3">
                        <p className="text-white">DOT Strategy activated</p>
                        <p className="text-gray-400">42 mins ago • Algorithm #127</p>
                      </div>
                      <div className="border-l-2 border-cyan-500 pl-3">
                        <p className="text-white">System maintenance completed</p>
                        <p className="text-gray-400">1 hour ago • Duration: 5 minutes</p>
                      </div>
                      <div className="border-l-2 border-green-500 pl-3">
                        <p className="text-white">ADA/USDT Long position opened</p>
                        <p className="text-gray-400">2 hours ago • 1000 ADA at $0.45</p>
                      </div>
                    </div>
                    <button className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm transition duration-200">
                      View all activity →
                    </button>
                  </div>
                </div>

                {/* Strategy Templates */}
                <div className="backdrop-blur-sm bg-black/30 border border-cyan-500/30 rounded-lg p-6 shadow-lg shadow-cyan-500/10">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-cyan-400">⚡ Strategy Templates</h2>
                    <button className="text-cyan-400 hover:text-cyan-300 text-sm transition duration-200">
                      View All →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="backdrop-blur-sm bg-black/50 border border-cyan-500/20 rounded-lg p-4 hover:border-cyan-500/40 transition duration-200">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-white font-medium">Gap & Go Strategy</h3>
                        <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-1 rounded">Popular</span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">Momentum-based strategy targeting gap movements in price action</p>
                      <div className="h-16 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded mb-3 flex items-center justify-center">
                        <div className="w-full h-8 bg-gradient-to-r from-cyan-500 to-blue-400 rounded opacity-60"></div>
                      </div>
                    </div>
                    <div className="backdrop-blur-sm bg-black/50 border border-cyan-500/20 rounded-lg p-4 hover:border-cyan-500/40 transition duration-200">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-white font-medium">Momentum Breakout</h3>
                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded">New</span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">Advanced breakout detection with volume confirmation</p>
                      <div className="h-16 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded mb-3 flex items-center justify-center">
                        <div className="w-full h-8 bg-gradient-to-r from-green-500 to-cyan-400 rounded opacity-60"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Strategies Tab */}
            {activeTab === "strategies" && (
              <div className="space-y-6">
                {/* Header with Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-cyan-400">⚡ Trading Strategies</h2>
                    <p className="text-gray-400 text-sm mt-1">Manage and monitor your automated trading strategies</p>
                  </div>
                  <div className="flex space-x-3">
                    <button className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 px-4 py-2 rounded-lg transition duration-200 border border-cyan-500/50 hover:border-cyan-400 shadow-lg hover:shadow-cyan-500/20 text-sm">
                      + Add Strategy
                    </button>
                    <button className="bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 px-4 py-2 rounded-lg transition duration-200 border border-gray-500/50 hover:border-gray-400 text-sm">
                      Import
                    </button>
                  </div>
                </div>

                {/* Strategy Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="backdrop-blur-sm bg-black/30 border border-cyan-500/30 rounded-lg p-4 shadow-lg shadow-cyan-500/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-cyan-400">📊</span>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Total Strategies</p>
                        <p className="text-xl font-bold text-white">{strategies.length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="backdrop-blur-sm bg-black/30 border border-green-500/30 rounded-lg p-4 shadow-lg shadow-green-500/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-green-400">✅</span>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Active</p>
                        <p className="text-xl font-bold text-green-400">{strategies.filter(s => s.enabled).length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="backdrop-blur-sm bg-black/30 border border-red-500/30 rounded-lg p-4 shadow-lg shadow-red-500/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-red-400">⏸️</span>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Inactive</p>
                        <p className="text-xl font-bold text-red-400">{strategies.filter(s => !s.enabled).length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strategies Grid */}
                {strategies.length === 0 ? (
                  <div className="backdrop-blur-sm bg-black/30 border border-cyan-500/30 rounded-lg p-12 text-center shadow-lg shadow-cyan-500/10">
                    <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">⚡</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Strategies Found</h3>
                    <p className="text-gray-400 mb-6">Get started by creating your first trading strategy</p>
                    <button className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 px-6 py-3 rounded-lg transition duration-200 border border-cyan-500/50 hover:border-cyan-400 shadow-lg hover:shadow-cyan-500/20">
                      Create Strategy
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                    {strategies.map((strategy, index) => {
                      // Generate realistic mock data based on strategy ID
                      const mockPerformance = ((strategy.id * 7 + 13) % 25) - 5; // -5% to +20%
                      const mockTrades = (strategy.id * 23 + 47) % 150 + 50; // 50-200 trades
                      const mockWinRate = ((strategy.id * 11 + 29) % 30) + 55; // 55-85%
                      const mockDrawdown = -((strategy.id * 3 + 7) % 8 + 2); // -2% to -10%
                      const avgTrade = mockTrades * 25;
                      
                      return (
                        <div key={strategy.id} className="backdrop-blur-sm bg-black/30 border border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all duration-300 hover:border-cyan-400 group overflow-hidden">
                          {/* Ultra-Compact Header */}
                          <div className="p-2 border-b border-cyan-500/20 bg-gradient-to-r from-black/50 to-cyan-900/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${strategy.enabled ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 'bg-red-400'}`}></div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition duration-200 truncate">{strategy.name}</h3>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <span className="text-xs font-mono text-gray-500">#{strategy.id}</span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  strategy.enabled 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {strategy.enabled ? 'ON' : 'OFF'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Super Compact Body */}
                          <div className="p-2.5">
                            {/* Performance & Status Row */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <div className="text-center">
                                  <p className={`text-lg font-bold leading-none ${mockPerformance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {mockPerformance >= 0 ? '+' : ''}{mockPerformance.toFixed(1)}%
                                  </p>
                                  <p className="text-xs text-gray-500">P&L</p>
                                </div>
                                <div className="w-px h-8 bg-gray-700"></div>
                                <div className="text-center">
                                  <p className="text-sm font-bold text-cyan-400 leading-none">{mockTrades}</p>
                                  <p className="text-xs text-gray-500">Trades</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-blue-400 leading-none">{mockWinRate}%</p>
                                <p className="text-xs text-gray-500">Win Rate</p>
                              </div>
                            </div>

                            {/* Compact Performance Bar */}
                            <div className="mb-2">
                              <div className="w-full bg-gray-800 rounded-full h-1">
                                <div 
                                  className={`h-1 rounded-full transition-all duration-500 ${
                                    mockPerformance >= 0 
                                      ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                                      : 'bg-gradient-to-r from-red-500 to-orange-400'
                                  }`}
                                  style={{ width: `${Math.min(Math.abs(mockPerformance) * 4, 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Compact Details Grid */}
                            <div className="grid grid-cols-2 gap-1.5 mb-2 text-xs">
                              <div className="flex justify-between bg-black/40 rounded px-1.5 py-1">
                                <span className="text-gray-500">Type</span>
                                <span className="text-blue-400 font-medium">
                                  {['Scalping', 'Swing', 'Momentum', 'Mean Rev'][strategy.id % 4]}
                                </span>
                              </div>
                              <div className="flex justify-between bg-black/40 rounded px-1.5 py-1">
                                <span className="text-gray-500">Risk</span>
                                <span className={`font-medium ${['Low', 'Med', 'High'][strategy.id % 3] === 'Low' ? 'text-green-400' : ['Low', 'Med', 'High'][strategy.id % 3] === 'Med' ? 'text-yellow-400' : 'text-red-400'}`}>
                                  {['Low', 'Med', 'High'][strategy.id % 3]}
                                </span>
                              </div>
                              <div className="flex justify-between bg-black/40 rounded px-1.5 py-1">
                                <span className="text-gray-500">DD</span>
                                <span className="text-red-400 font-medium">{mockDrawdown.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between bg-black/40 rounded px-1.5 py-1">
                                <span className="text-gray-500">Avg</span>
                                <span className="text-cyan-400 font-medium">₹{avgTrade > 1000 ? `${(avgTrade/1000).toFixed(1)}k` : avgTrade}</span>
                              </div>
                            </div>

                            {/* Compact Status & Time */}
                            <div className="flex items-center justify-between text-xs mb-2">
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1">
                                  <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping"></div>
                                  <span className="text-gray-400">Live</span>
                                </div>
                                {strategy.enabled && (
                                  <>
                                    <span className="text-gray-600">•</span>
                                    <div className="flex items-center space-x-1">
                                      <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                                      <span className="text-gray-400">Active</span>
                                    </div>
                                  </>
                                )}
                              </div>
                              <span className="text-gray-500 font-mono text-xs">
                                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {/* Ultra-Compact Footer */}
                          <div className="p-1.5 border-t border-cyan-500/20 bg-black/20">
                            <div className="flex space-x-1">
                              <button 
                                onClick={() => toggleStrategy(strategy.id, !strategy.enabled)}
                                className={`flex-1 px-2 py-1 rounded text-xs font-medium transition duration-200 ${
                                  strategy.enabled 
                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                }`}
                              >
                                {strategy.enabled ? '⏹' : '▶'}
                              </button>
                              <button className="flex-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-2 py-1 rounded text-xs font-medium transition duration-200">
                                ⚙
                              </button>
                              <button className="bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 px-2 py-1 rounded text-xs transition duration-200">
                                📊
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Brokers Tab */}
            {activeTab === "brokers" && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-cyan-400">🔗 Brokers</h2>
                <div className="backdrop-blur-sm bg-black/30 border border-cyan-500/30 rounded-lg overflow-hidden shadow-lg shadow-cyan-500/10">
                  <table className="w-full">
                    <thead className="bg-black/50 border-b border-cyan-500/30">
                      <tr>
                        <th className="px-4 py-3 text-left text-cyan-400">Name</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Status</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Data Provider</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Trade Execution</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Credentials</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brokers.map((broker) => (
                        <tr key={broker.name} className="border-t border-cyan-500/20 hover:bg-cyan-500/5 transition duration-200">
                          <td className="px-4 py-3 font-medium text-white">{broker.name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              broker.enabled 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                : 'bg-red-500/20 text-red-400 border border-red-500/50'
                            }`}>
                              {broker.enabled ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              broker.is_data_provider 
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                            }`}>
                              {broker.is_data_provider ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              broker.trade_execution_enabled 
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                            }`}>
                              {broker.trade_execution_enabled ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400">{broker.credentials_status}</td>
                          <td className="px-4 py-3 space-x-2">
                            <button
                              onClick={() => toggleBroker(broker.name, !broker.enabled)}
                              className={`px-2 py-1 rounded text-xs transition duration-200 ${
                                broker.enabled 
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
                                  : 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
                              }`}
                            >
                              {broker.enabled ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => reauthBroker(broker.name)}
                              className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30 rounded text-xs transition duration-200"
                            >
                              Reauth
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Positions Tab */}
            {activeTab === "positions" && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-cyan-400">📊 Open Positions</h2>
                <div className="backdrop-blur-sm bg-black/30 border border-cyan-500/30 rounded-lg overflow-hidden shadow-lg shadow-cyan-500/10">
                  <table className="w-full">
                    <thead className="bg-black/50 border-b border-cyan-500/30">
                      <tr>
                        <th className="px-4 py-3 text-left text-cyan-400">Broker</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Symbol</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Quantity</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Avg Price</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Current Price</th>
                        <th className="px-4 py-3 text-left text-cyan-400">P&L</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Product Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position) => (
                        <tr key={position.id} className="border-t border-cyan-500/20 hover:bg-cyan-500/5 transition duration-200">
                          <td className="px-4 py-3 text-gray-300">{position.broker_name}</td>
                          <td className="px-4 py-3 font-medium text-white">{position.symbol}</td>
                          <td className="px-4 py-3 text-gray-300">{position.quantity}</td>
                          <td className="px-4 py-3 text-gray-300">₹{position.average_price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-300">₹{position.current_price.toFixed(2)}</td>
                          <td className={`px-4 py-3 font-medium ${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ₹{position.pnl.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-gray-300">{position.product_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Trades Tab */}
            {activeTab === "trades" && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-cyan-400">💹 Recent Trades</h2>
                <div className="backdrop-blur-sm bg-black/30 border border-cyan-500/30 rounded-lg overflow-hidden shadow-lg shadow-cyan-500/10">
                  <table className="w-full">
                    <thead className="bg-black/50 border-b border-cyan-500/30">
                      <tr>
                        <th className="px-4 py-3 text-left text-cyan-400">Broker</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Symbol</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Side</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Quantity</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Price</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Order Type</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Status</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Executed At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.slice(0, 50).map((trade) => (
                        <tr key={trade.id} className="border-t border-cyan-500/20 hover:bg-cyan-500/5 transition duration-200">
                          <td className="px-4 py-3 text-gray-300">{trade.broker_name}</td>
                          <td className="px-4 py-3 font-medium text-white">{trade.symbol}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              trade.side === 'BUY' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                : 'bg-red-500/20 text-red-400 border border-red-500/50'
                            }`}>
                              {trade.side}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{trade.quantity}</td>
                          <td className="px-4 py-3 text-gray-300">₹{trade.price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-300">{trade.order_type}</td>
                          <td className="px-4 py-3 text-gray-300">{trade.status}</td>
                          <td className="px-4 py-3 text-gray-400">
                            {new Date(trade.executed_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
