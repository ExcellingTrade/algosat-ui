/**
 * API Client for AlgoSat Trading System
 * Handles all API communication with the FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
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
  enabled: boolean;
  params: Record<string, any>;
  order_type: 'MARKET' | 'LIMIT';
  product_type: 'INTRADAY' | 'DELIVERY';
  created_at: string;
  updated_at: string;
}

export interface Broker {
  name: string;
  enabled: boolean;
  is_data_provider: boolean;
  trade_execution_enabled: boolean;
  credentials_status: string;
  last_auth_check: string;
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

export interface SystemStatusMetric {
  unit: string;
  usage: Record<string, number>;
}

export interface SystemStatus {
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

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.loadToken();
  }

  private loadToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private saveToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  private clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
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
          this.clearToken();
          throw new Error('Authentication failed');
        }
        const error = await response.text();
        console.error('API error response:', error);
        throw new Error(`API Error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      console.log('Response data received successfully:', result);
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
      
      this.saveToken(response.access_token);
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
      this.clearToken();
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

  async getStrategyConfigs(strategyId: number): Promise<StrategyConfig[]> {
    return this.request(`/strategies/${strategyId}/configs/`);
  }

  async updateStrategyConfig(
    configId: number,
    update: Partial<StrategyConfig>
  ): Promise<StrategyConfig> {
    return this.request(`/strategies/configs/${configId}/`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  async enableStrategy(strategyId: number): Promise<any> {
    // Enable strategy by enabling its default config
    const configs = await this.getStrategyConfigs(strategyId);
    const defaultConfig = configs.find(config => config.name.includes('default') || configs.length === 1 ? config : configs[0]);
    
    if (defaultConfig) {
      return this.updateStrategyConfig(defaultConfig.id, { enabled: true });
    }
    throw new Error('No strategy config found to enable');
  }

  async disableStrategy(strategyId: number): Promise<any> {
    // Disable strategy by disabling all its configs
    const configs = await this.getStrategyConfigs(strategyId);
    const enabledConfigs = configs.filter(config => config.enabled);
    
    // Disable all enabled configs for this strategy
    const disablePromises = enabledConfigs.map(config => 
      this.updateStrategyConfig(config.id, { enabled: false })
    );
    
    return Promise.all(disablePromises);
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

  // System Status
  async getSystemStatus(): Promise<any> {
    return this.request('/system/status');
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
}

export const apiClient = new ApiClient();
export default apiClient;
