"use client";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { BarChart3, Eye, EyeOff, Shield, TrendingUp, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'failed'>('testing');
  
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Test API connection on component mount
    const testConnection = async () => {
      try {
        const isConnected = await apiClient.testConnection();
        setConnectionStatus(isConnected ? 'connected' : 'failed');
        if (!isConnected) {
          setError('Unable to connect to API server. Please check if the server is running.');
        }
      } catch (error) {
        console.error('Connection test error:', error);
        setConnectionStatus('failed');
        setError('Unable to connect to API server. Please check if the server is running.');
      }
    };

    testConnection();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ username, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(59,130,246,0.02)_50%,transparent_75%)]"></div>
      
      <div className="relative w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding & Features */}
        <div className="hidden lg:block space-y-8 text-white">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  AlgoSat
                </h1>
                <p className="text-slate-400">Professional Trading Platform</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-bold leading-tight">
                Algorithmic Trading
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Made Simple
                </span>
              </h2>
              <p className="text-xl text-slate-300 leading-relaxed">
                Advanced trading strategies, real-time market data, and comprehensive portfolio management in one professional platform.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Real-time Analytics</h3>
                <p className="text-sm text-slate-400">Live market data and performance metrics</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Secure & Reliable</h3>
                <p className="text-sm text-slate-400">Bank-grade security and 99.9% uptime</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Lightning Fast</h3>
                <p className="text-sm text-slate-400">Microsecond execution and low latency</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="lg:hidden flex items-center justify-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  AlgoSat
                </h1>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-slate-300">Sign in to your trading account</p>
            </div>

            {/* Connection Status */}
            {connectionStatus === 'testing' && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-yellow-300 text-sm">Testing API connection...</span>
                </div>
              </div>
            )}
            
            {connectionStatus === 'failed' && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-red-300 text-sm">API connection failed</span>
                </div>
                <p className="text-red-200 text-xs mt-1">Please check if the backend server is running</p>
              </div>
            )}
            
            {connectionStatus === 'connected' && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-300 text-sm">Connected successfully</span>
                </div>
              </div>
            )}

            {/* Test Credentials */}
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <p className="text-blue-300 text-sm font-medium mb-2">Demo Credentials</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Username:</span>
                  <span className="text-blue-300 font-mono">satish</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Password:</span>
                  <span className="text-blue-300 font-mono">Sat@5858</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full p-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 disabled:opacity-50"
                  placeholder="Enter your username"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full p-4 pr-12 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 disabled:opacity-50"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading || connectionStatus === 'failed'}
                className="w-full p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing In...</span>
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-slate-400 text-sm">
                Need help? <span className="text-blue-400 hover:text-blue-300 cursor-pointer">Contact Support</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
