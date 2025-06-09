"use client";

import { useState } from "react";
import { Strategy } from "  return (
    <div className="group bg-gradient-to-br from-[var(--card-background)]/90 to-[var(--card-background)]/50 backdrop-blur-xl border border-[var(--border)]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:border-[var(--accent)]/50 hover:scale-[1.02] overflow-hidden relative">
      {/* Subtle animated border on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[var(--accent)]/20 via-transparent to-[var(--accent)]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>rategiesPage";
import { 
  Play, 
  Pause, 
  Eye, 
  Settings, 
  TrendingUp, 
  TrendingDown,
  Target,
  Activity,
  Clock,
  BarChart3,
  MoreVertical,
  Info,
  Edit3,
  Trash2
} from "lucide-react";

interface StrategyCardProps {
  strategy: Strategy;
  onViewSymbols: (strategy: Strategy) => void;
  onViewConfigs: (strategy: Strategy) => void;
}

export function StrategyCard({ strategy, onViewSymbols, onViewConfigs }: StrategyCardProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    setTimeout(() => setIsToggling(false), 1000);
  };

  // Mock last trade time - in real app this would come from strategy data
  const getLastTradeTime = () => {
    const now = new Date();
    const lastTrade = new Date(now.getTime() - Math.floor(Math.random() * 3600000)); // Random time within last hour
    return lastTrade.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatCurrency = (amount: number = 0) => {
    const isPositive = amount >= 0;
    return `${isPositive ? '+' : ''}₹${Math.abs(amount).toLocaleString()}`;
  };

  const getPnLColor = (amount: number = 0) => {
    return amount >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getTrendIcon = (amount: number = 0) => {
    if (amount > 0) {
      return <TrendingUp className="w-3 h-3 text-green-400 animate-pulse" />;
    } else if (amount < 0) {
      return <TrendingDown className="w-3 h-3 text-red-400 animate-pulse" />;
    }
    return <BarChart3 className="w-3 h-3 text-gray-400" />;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="h-full group bg-gradient-to-br from-[var(--card-background)]/90 to-[var(--card-background)]/50 backdrop-blur-xl border border-[var(--border)]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:border-[var(--accent)]/50 hover:scale-[1.02] overflow-hidden relative">
      {/* Subtle animated border on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[var(--accent)]/20 via-transparent to-[var(--accent)]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      {/* Enhanced Header */}
      <div className="p-4 border-b border-[var(--border)]/30 bg-gradient-to-r from-[var(--card-background)]/60 to-[var(--accent)]/5 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 shadow-lg ${
              strategy.enabled 
                ? 'bg-green-400 animate-pulse shadow-green-400/50' 
                : 'bg-red-400 shadow-red-400/50'
            }`}></div>
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-base font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors duration-200 leading-tight truncate">
                {strategy.name}
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed line-clamp-2">
                {strategy.description}
              </p>
              
              {/* Strategy Type Badges */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="px-2 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] rounded-md text-xs font-medium">
                  {strategy.order_type}
                </span>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-md text-xs font-medium">
                  {strategy.product_type}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
            <span className="text-xs font-mono text-[var(--muted-foreground)]/80">#{strategy.id}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              strategy.enabled 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {strategy.enabled ? 'ACTIVE' : 'INACTIVE'}
            </span>
            
            {/* Three-dot menu */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-1 rounded hover:bg-[var(--accent)]/10 transition-colors"
                title="More actions"
              >
                <MoreVertical className="w-3 h-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)]" />
              </button>
              
              {showDropdown && (
                <div className="absolute right-0 top-full mt-1 w-28 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-lg z-10">
                  <button className="w-full px-3 py-2 text-xs text-left hover:bg-[var(--accent)]/10 transition-colors flex items-center space-x-2">
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button className="w-full px-3 py-2 text-xs text-left hover:bg-red-500/10 text-red-400 transition-colors flex items-center space-x-2">
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col h-full relative z-10">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-[var(--background)]/40 rounded-lg border border-[var(--border)]/30 hover:bg-[var(--background)]/60 transition-colors">
            <div className="flex items-center justify-center space-x-1 mb-2">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-[var(--muted-foreground)] font-medium">Live P&L</span>
              <div className="group/tooltip relative">
                <Info className="w-2.5 h-2.5 text-[var(--muted-foreground)]/60 hover:text-[var(--muted-foreground)] cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] rounded text-xs whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-10 shadow-lg">
                  Current day's P&L
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-1">
              {getTrendIcon(strategy.livePnL || 0)}
              <p className={`text-sm font-bold ${getPnLColor(strategy.livePnL || 0)} leading-none`}>
                {formatCurrency(strategy.livePnL || 0)}
              </p>
            </div>
          </div>
          <div className="text-center p-3 bg-[var(--background)]/40 rounded-lg border border-[var(--border)]/30 hover:bg-[var(--background)]/60 transition-colors">
            <div className="flex items-center justify-center space-x-1 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs text-[var(--muted-foreground)] font-medium">Overall P&L</span>
              <div className="group/tooltip relative">
                <Info className="w-2.5 h-2.5 text-[var(--muted-foreground)]/60 hover:text-[var(--muted-foreground)] cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] rounded text-xs whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-10 shadow-lg">
                  Total lifetime P&L
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-1">
              {getTrendIcon(strategy.overallPnL || 0)}
              <p className={`text-sm font-bold ${getPnLColor(strategy.overallPnL || 0)} leading-none`}>
                {formatCurrency(strategy.overallPnL || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2.5 bg-[var(--background)]/30 rounded hover:bg-[var(--background)]/50 transition-colors">
            <p className="text-sm font-bold text-blue-400 leading-none">{strategy.symbolCount || 0}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Symbols</p>
          </div>
          <div className="text-center p-2.5 bg-[var(--background)]/30 rounded hover:bg-[var(--background)]/50 transition-colors">
            <p className="text-sm font-bold text-green-400 leading-none">{strategy.tradeCount || 0}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Trades</p>
          </div>
          <div className="text-center p-2.5 bg-[var(--background)]/30 rounded hover:bg-[var(--background)]/50 transition-colors">
            <p className="text-sm font-bold text-purple-400 leading-none">70%</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Win Rate</p>
          </div>
        </div>

        <div className="space-y-3 flex-1 flex flex-col justify-end">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onViewSymbols(strategy)}
              className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-[var(--accent)]/20 hover:bg-[var(--accent)]/30 hover:scale-105 text-[var(--accent)] rounded-lg transition-all duration-200 border border-[var(--accent)]/30 hover:border-[var(--accent)]/50 text-xs font-medium"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Symbols</span>
            </button>
            <button
              onClick={() => onViewConfigs(strategy)}
              className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 hover:scale-105 text-blue-400 rounded-lg transition-all duration-200 border border-blue-500/30 hover:border-blue-500/50 text-xs font-medium"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>View Configs</span>
            </button>
          </div>

          <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`w-full flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-lg transition-all duration-200 text-xs font-medium hover:scale-105 ${
              strategy.enabled
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 hover:border-red-500/50'
                : 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 hover:border-green-500/50'
            } ${isToggling ? 'opacity-50 cursor-not-allowed scale-100' : ''}`}
          >
            {isToggling ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : strategy.enabled ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>{isToggling ? 'Processing...' : strategy.enabled ? 'Pause Strategy' : 'Start Strategy'}</span>
          </button>
        </div>

        <div className="flex items-center justify-center space-x-1 mt-3 text-xs text-[var(--muted-foreground)]/70">
          <Clock className="w-3 h-3" />
          <span>Created {formatDate(strategy.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
