/**
 * API Client for AlgoSat Trading System
 * Handles all API communication with the FastAPI backend
 */

// Dynamic API URL configuration based on current host
function getDynamicApiUrl(): string {
  // Check for environment variable first (production builds)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // For development and runtime, detect based on current location
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If running on localhost, use localhost:8001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//localhost:8001`;
    }
    
    // If running on an IP address, use that IP with port 8001
    return `${protocol}//${hostname}:8001`;
  }
  
  // Fallback for SSR
  return 'http://localhost:8001';
}

const API_BASE_URL = getDynamicApiUrl();

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user_info: {
    user_id: number;
    username: string;
    email: string;
    full_name?: string;
  };
}

export interface Strategy {
  id: number;
  name: string;
  description?: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StrategyConfig {
  id: number;
  strategy_id: number;
  name: string;
  description?: string;
  exchange: string;
  instrument?: string;
  trade: Record<string, any>;
  indicators: Record<string, any>;
  order_type: 'MARKET' | 'LIMIT';
  product_type: 'INTRADAY' | 'DELIVERY';
  is_default?: boolean;  // Made optional to handle API inconsistencies
  created_at: string;
  updated_at: string;
}

export interface StrategySymbol {
  id: number;
  strategy_id: number;
  symbol: string;
  config_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  config_name?: string;
  config_description?: string;
}

export interface StrategySymbolCreate {
  strategy_id: number;
  symbol: string;
  config_id: number;
  status?: string;
}

export interface Broker {
  id: number;
  broker_name: string;
  is_enabled: boolean;
  is_data_provider: boolean;
  trade_execution_enabled: boolean;
  notes?: string;
  credentials_status?: string;
  last_auth_check?: string;
  balance?: number;
  available_balance?: number;
  utilized_margin?: number;
}

export interface Position {
  id: number;
  broker_name: string;
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number;
  pnl: number;
  product_type: string;
  created_at: string;
}

export interface Trade {
  id: number;
  broker_name: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  order_type: string;
  status: string;
  executed_at: string;
}

export interface VmDetails {
  id: number;
  firewall_group_id: number | null;
  subscription_id: string;
  plan: string; // Plan name like "KVM 4"
  hostname: string;
  state: string; // "running", "stopped", etc.
  actions_lock: string;
  cpus: number;
  memory: number; // Memory in MB
  disk: number; // Disk in MB
  bandwidth: number;
  ns1: string;
  ns2: string;
  ipv4: Array<{
    id: number;
    address: string;
    ptr: string;
  }>;
  ipv6: Array<{
    id: number;
    address: string;
    ptr: string;
  }>;
  template: {
    id: number;
    name: string;
    description: string;
    documentation: string | null;
  };
  created_at: string;
}

export interface SystemStatusMetric {
  unit: string;
  usage: Record<string, number>;
}

export interface SystemStatus {
  vm?: VmDetails; // VM details from Hostinger API
  metrics?: any; // Hostinger metrics data
  cpu_usage: SystemStatusMetric;
  ram_usage: SystemStatusMetric;
  disk_space: SystemStatusMetric;
  outgoing_traffic: SystemStatusMetric;
  incoming_traffic: SystemStatusMetric;
  uptime: SystemStatusMetric;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  components: {
    database: boolean;
    security: boolean;
  };
  details: {
    status: string;
    checks: Record<string, any>;
    timestamp: string;
  };
}

export interface LogFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  type: string; // 'api', 'algosat', 'rollover'
  date: string;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  logger: string;
  module: string;
  line: number;
  message: string;
  raw: string;
}

export interface LogResponse {
  files: LogFile[];
  stats: LogStats;
  total_size: number;
  date_range: {
    start: string;
    end: string;
  };
}

export interface LogContentResponse {
  entries: LogEntry[];
  total_count: number;
  has_more: boolean;
  date: string;
  log_type: string;
}

export interface LogStreamResponse {
  entry?: LogEntry;
  file?: string;
  position?: number;
  error?: string;
}

export interface LogStreamSessionResponse {
  session_id: string;
  stream_url: string;
  expires_in: number;
  log_type: string;
  level: string | null;
}

export interface LogStats {
  total_dates: number;
  date_range: {
    start: string | null;
    end: string | null;
  };
  retention_days: number;
  log_types: string[];
  files_by_type: Record<string, { count: number; size: number }>;
  total_size: number;
}

export interface SymbolStats {
  symbol_id: number;
  live_trades: number;
  live_pnl: number;
  total_trades: number;
  total_pnl: number;
  all_trades: number;
  enabled: boolean;
}

export interface SymbolTradesResponse {
  symbol_id: number;
  trades: any[];
  total_trades: number;
}

export interface BalanceSummary {
  total_balance: number;
  available: number;
  utilized: number;
}

export interface DashboardSummary {
  total_balance: {
    amount: number;
    change: number;
    change_percentage: number;
    is_positive: boolean;
  };
  todays_pnl: {
    amount: number;
    change_percentage: number;
    is_positive: boolean;
  };
  active_strategies: {
    count: number;
    profit_count: number;
    loss_count: number;
  };
  last_updated: string;
}

export interface BrokerBalanceDetail {
  broker_name: string;
  total_balance: number;
  available: number;
  utilized: number;
  last_updated: string;
}

export interface BrokerBalancesSummary {
  brokers: BrokerBalanceDetail[];
  summary: {
    total_balance: number;
    total_available: number;
    total_utilized: number;
    broker_count: number;
  };
  last_updated: string;
}

export interface BrokerBalanceSummary {
  broker_id: number;
  broker_name: string;
  summary: BalanceSummary;
  fetched_at: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.loadTokens();
    this.startTokenRefreshTimer();
    
    // Log the API URL being used
    console.log('API Client initialized with base URL:', this.baseURL);
  }

  private loadTokens() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      this.refreshToken = localStorage.getItem('refresh_token');
      const expiry = localStorage.getItem('token_expiry');
      this.tokenExpiry = expiry ? parseInt(expiry) : null;
    }
  }

  private saveTokens(accessToken: string, refreshToken?: string, expiresIn?: number) {
    this.token = accessToken;
    
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
    
    // Calculate expiry time (current time + expires_in seconds)
    const expiryTime = Date.now() + (expiresIn || 3600) * 1000;
    this.tokenExpiry = expiryTime;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
      localStorage.setItem('token_expiry', expiryTime.toString());
      localStorage.setItem('last_activity_time', Date.now().toString());
    }
    
    // Restart the refresh timer
    this.startTokenRefreshTimer();
  }

  private clearTokens() {
    this.token = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expiry');
      localStorage.removeItem('last_activity_time');
      localStorage.removeItem('initial_login_time');
    }
  }

  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    // Consider token expired 30 seconds before actual expiry for safety
    return Date.now() > (this.tokenExpiry - 30000);
  }

  private updateLastActivity() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_activity_time', Date.now().toString());
    }
  }

  private startTokenRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    if (!this.tokenExpiry || !this.refreshToken) return;
    
    // Refresh token 5 minutes before expiry
    const refreshTime = this.tokenExpiry - Date.now() - 5 * 60 * 1000;
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshAccessToken();
      }, refreshTime);
      console.log(`Token refresh scheduled in ${Math.round(refreshTime / 1000)} seconds`);
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<void> {
    if (!this.refreshToken) {
      console.log('No refresh token available, clearing session');
      this.clearTokens();
      // Emit auth failure event for the AuthContext to handle
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth-failure'));
      }
      return;
    }

    // Check for 1 hour of inactivity instead of 2-hour total session limit
    const lastActivityTime = localStorage.getItem('last_activity_time');
    const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds
    
    if (lastActivityTime && Date.now() - parseInt(lastActivityTime) > oneHourInMs) {
      console.log('Session expired due to 1 hour of inactivity, logging out');
      this.clearTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth-failure'));
      }
      return;
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        this.saveTokens(result.access_token, this.refreshToken, result.expires_in);
        // Update last activity time on successful refresh
        if (typeof window !== 'undefined') {
          localStorage.setItem('last_activity_time', Date.now().toString());
        }
        console.log('Token refreshed successfully');
      } else {
        console.log('Token refresh failed, clearing session');
        this.clearTokens();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth-failure'));
        }
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth-failure'));
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check if token needs refresh before making request
    if (this.isTokenExpired() && this.refreshToken) {
      await this.refreshAccessToken();
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add existing headers
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    console.log('Making request to:', url);
    console.log('Base URL:', this.baseURL);
    console.log('Endpoint:', endpoint);
    console.log('Request headers:', headers);
    console.log('Request options:', { ...options, body: options.body ? 'JSON body present' : 'No body' });

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        mode: 'cors', // Explicitly set CORS mode
        credentials: 'omit', // Don't send cookies
      });

      console.log('Response received');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token once more
          if (this.refreshToken && !this.refreshPromise) {
            console.log('401 received, attempting token refresh...');
            await this.refreshAccessToken();
            // Retry the request with new token
            return this.request(endpoint, options);
          } else {
            console.log('401 received, no refresh token or refresh in progress, clearing session');
            this.clearTokens();
            // Emit auth failure event for the AuthContext to handle
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth-failure'));
            }
            throw new Error('Authentication failed - session expired');
          }
        }
        const error = await response.text();
        console.error('API error response:', error);
        throw new Error(`API Error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      console.log('Response data received successfully:', result);
      
      // Update last activity time on successful API requests (not auth endpoints)
      if (!endpoint.startsWith('/auth/')) {
        this.updateLastActivity();
      }
      
      return result;
    } catch (error) {
      console.error('Request failed with error:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('This is likely a network/CORS issue');
        console.error('URL being requested:', url);
        console.error('Check if the API server is running and CORS is configured properly');
        throw new Error('Network error: Unable to connect to the API server. Please check if the server is running.');
      }
      throw error;
    }
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    console.log('API client login called with:', { username: credentials.username, password: '***' });
    console.log('API URL:', `${this.baseURL}/auth/login`);
    
    try {
      const response = await this.request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      console.log('Login response received:', { 
        hasToken: !!response.access_token, 
        tokenType: response.token_type,
        expiresIn: response.expires_in,
        hasUserInfo: !!response.user_info,
        userInfo: response.user_info 
      });
      
      if (!response.access_token) {
        throw new Error('No access token received from server');
      }
      
      this.saveTokens(response.access_token, response.refresh_token, response.expires_in);
      
      // Store initial login time for session tracking and set activity time
      if (typeof window !== 'undefined') {
        localStorage.setItem('initial_login_time', Date.now().toString());
        localStorage.setItem('last_activity_time', Date.now().toString());
      }
      console.log('Token saved successfully');
      return response;
    } catch (error) {
      console.error('Login method error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }

  // Health Check
  async healthCheck(): Promise<HealthStatus> {
    return this.request('/health');
  }

  // Strategies
  async getStrategies(): Promise<Strategy[]> {
    return this.request('/strategies/');
  }

  async getStrategy(id: number): Promise<Strategy> {
    return this.request(`/strategies/${id}/`);
  }

  // Strategy Configs (hierarchical)
  async getStrategyConfigs(strategyId: number): Promise<StrategyConfig[]> {
    return this.request(`/strategies/${strategyId}/configs/`);
  }

  async getStrategyConfig(strategyId: number, configId: number): Promise<StrategyConfig> {
    return this.request(`/strategies/${strategyId}/configs/${configId}/`);
  }

  async updateStrategyConfig(
    strategyId: number,
    configId: number,
    update: Partial<StrategyConfig>
  ): Promise<StrategyConfig> {
    return this.request(`/strategies/${strategyId}/configs/${configId}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  async createStrategyConfig(strategyId: number, config: Omit<StrategyConfig, 'id' | 'strategy_id' | 'created_at' | 'updated_at'>): Promise<StrategyConfig> {
    return this.request(`/strategies/${strategyId}/configs`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async deleteStrategyConfig(strategyId: number, configId: number): Promise<void> {
    return this.request(`/strategies/${strategyId}/configs/${configId}`, {
      method: 'DELETE',
    });
  }

  // Strategy Symbols (hierarchical)
  async getStrategySymbols(strategyId: number): Promise<StrategySymbol[]> {
    return this.request(`/strategies/${strategyId}/symbols/`);
  }

  async addStrategySymbol(strategyId: number, symbolData: StrategySymbolCreate): Promise<StrategySymbol> {
    return this.request(`/strategies/${strategyId}/symbols/`, {
      method: 'POST',
      body: JSON.stringify(symbolData),
    });
  }

  async toggleSymbolStatus(symbolId: number): Promise<StrategySymbol> {
    return this.request(`/strategies/symbols/${symbolId}/status`, {
      method: 'PUT',
    });
  }

  async enableSymbol(symbolId: number): Promise<StrategySymbol> {
    return this.request(`/strategies/symbols/${symbolId}/enable`, {
      method: 'PUT',
    });
  }

  async disableSymbol(symbolId: number): Promise<StrategySymbol> {
    return this.request(`/strategies/symbols/${symbolId}/disable`, {
      method: 'PUT',
    });
  }

  async updateStrategySymbol(symbolId: number, updateData: { config_id: number }): Promise<StrategySymbol> {
    return this.request(`/strategies/symbols/${symbolId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteStrategySymbol(symbolId: number): Promise<{ message: string; symbol_id: number }> {
    return this.request(`/strategies/symbols/${symbolId}`, {
      method: 'DELETE',
    });
  }

  // Strategy Symbol Trades
  async getStrategySymbolTrades(strategySymbolId: number): Promise<Trade[]> {
    return this.request(`/strategy_symbol/${strategySymbolId}/trades/`);
  }

  async enableStrategy(strategyId: number): Promise<any> {
    return this.request(`/strategies/${strategyId}/enable`, {
      method: 'PUT'
    });
  }

  async disableStrategy(strategyId: number): Promise<any> {
    return this.request(`/strategies/${strategyId}/disable`, {
      method: 'PUT'
    });
  }

  async updateStrategy(strategyId: number, updates: {
    name?: string;
    order_type?: 'MARKET' | 'LIMIT';
    product_type?: 'INTRADAY' | 'DELIVERY';
  }): Promise<any> {
    return this.request(`/strategies/${strategyId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // Brokers
  async getBrokers(): Promise<Broker[]> {
    return this.request('/brokers/');
  }

  async getBroker(name: string): Promise<Broker> {
    return this.request(`/brokers/${name}/`);
  }

  async enableBroker(name: string): Promise<any> {
    return this.request(`/brokers/${name}/enable/`, { method: 'PUT' });
  }

  async disableBroker(name: string): Promise<any> {
    return this.request(`/brokers/${name}/disable/`, { method: 'PUT' });
  }

  async reauthBroker(name: string): Promise<any> {
    return this.request(`/brokers/${name}/auth/`, { method: 'POST' });
  }

  async getBalanceSummaries(): Promise<BrokerBalanceSummary[]> {
    return this.request('/api/v1/balance_summary/');
  }

  // Positions
  async getPositions(): Promise<Position[]> {
    return this.request('/positions/');
  }

  // Trades
  async getTrades(): Promise<Trade[]> {
    return this.request('/trades/');
  }

  // Orders
  async getOrders(): Promise<any[]> {
    return this.request('/orders/');
  }

  async getOrdersBySymbol(symbol: string): Promise<any[]> {
    return this.request(`/orders/by-symbol/${encodeURIComponent(symbol)}`);
  }

  async getOrdersSummaryBySymbol(symbol: string): Promise<any> {
    return this.request(`/orders/summary/${encodeURIComponent(symbol)}`);
  }

  // System Status
  async getSystemStatus(): Promise<any> {
    return this.request('/system/status');
  }

  // Log Management
  async getLogOverview(): Promise<LogResponse> {
    return this.request('/logs/');
  }

  async getLogDates(): Promise<{ dates: string[] }> {
    return this.request('/logs/dates');
  }

  async getLogFiles(date: string): Promise<{ files: LogFile[] }> {
    return this.request(`/logs/files/${date}`);
  }

  async getLogContent(
    date: string,
    logType?: string,
    limit: number = 1000,
    offset: number = 0,
    level?: string,
    search?: string
  ): Promise<LogContentResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    if (logType) params.append('log_type', logType);
    if (level) params.append('level', level);
    if (search) params.append('search', search);
    
    return this.request(`/logs/content/${date}?${params}`);
  }

  async cleanupLogs(): Promise<{ message: string; deleted_count: number }> {
    return this.request('/logs/cleanup', { method: 'POST' });
  }

  async getLogStats(): Promise<LogStats> {
    return this.request('/logs/stats');
  }

  async downloadLogs(date: string, logType?: string): Promise<string> {
    const params = new URLSearchParams({ date });
    if (logType) params.append('log_type', logType);
    
    const response = await fetch(`${this.baseURL}/logs/download?${params}`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download logs: ${response.statusText}`);
    }
    
    return response.text();
  }

  // Create EventSource for real-time log streaming
  async createLogStream(logType?: string, level?: string): Promise<EventSource | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      // Step 1: Create a streaming session using proper Bearer authentication
      const params = new URLSearchParams();
      if (logType) params.append('log_type', logType);
      if (level) params.append('level', level);
      
      const sessionResponse: LogStreamSessionResponse = await this.request(`/logs/stream/session?${params}`, {
        method: 'POST'
      });
      
      // Step 2: Use the session ID to create EventSource connection
      const streamUrl = `${this.baseURL}/logs/stream/live?session_id=${sessionResponse.session_id}`;
      const eventSource = new EventSource(streamUrl);
      
      return eventSource;
    } catch (error) {
      console.error('Failed to create log stream session:', error);
      return null;
    }
  }

  // Debug method to test connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing connection to API...');
      await this.healthCheck();
      console.log('Connection test successful');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  isAuthenticated(): boolean {
    const authenticated = !!this.token;
    console.log('API client isAuthenticated check:', { 
      hasToken: authenticated, 
      tokenLength: this.token ? this.token.length : 0 
    });
    return authenticated;
  }

  // Get current API configuration info
  getConfig(): { baseURL: string; detectionMethod: string } {
    let detectionMethod = 'environment variable';
    
    if (!process.env.NEXT_PUBLIC_API_URL) {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          detectionMethod = 'localhost detection';
        } else {
          detectionMethod = 'IP-based detection';
        }
      } else {
        detectionMethod = 'SSR fallback';
      }
    }
    
    return {
      baseURL: this.baseURL,
      detectionMethod
    };
  }

  // NSE Market Data
  async getIndexData(): Promise<{ data: any[] }> {
    return this.request<{ data: any[] }>('/nse/getIndexData');
  }

  async getMarqueueData(): Promise<{ data: any[] }> {
    return this.request<{ data: any[] }>('/nse/getMarqueData');
  }

  async getNseHolidayList(): Promise<string[]> {
    return this.request<string[]>('/nse/getNseHolidayList');
  }

  // Strategy Symbol Statistics
  async getSymbolStats(symbolId: number): Promise<SymbolStats> {
    return this.request(`/strategies/symbols/${symbolId}/stats`);
  }

  async getSymbolTrades(symbolId: number, limit: number = 100): Promise<SymbolTradesResponse> {
    return this.request(`/strategies/symbols/${symbolId}/trades?limit=${limit}`);
  }

  // Dashboard APIs
  async getDashboardSummary(): Promise<DashboardSummary> {
    return this.request('/dashboard/summary');
  }

  async getBrokerBalancesSummary(): Promise<BrokerBalancesSummary> {
    return this.request('/dashboard/broker-balances');
  }
}

export const apiClient = new ApiClient();
export default apiClient;
