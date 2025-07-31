"use client";

import { useState } from "react";
import { Strategy } from "./StrategiesPage";
import { apiClient, PerStrategyStatsData } from "../../lib/api";
import { 
  Play, 
  Pause, 
  Eye, 
  Settings, 
  TrendingUp, 
  TrendingDown,
  Activity,
  MoreVertical,
  Edit3,
  BarChart3,
  Info,
  Clock,
  AlertTriangle
} from "lucide-react";

interface StrategyCardProps {
  strategy: Strategy;
  strategyStats?: PerStrategyStatsData;
  onViewSymbols: (strategy: Strategy) => void;
  onViewConfigs: (strategy: Strategy) => void;
  onStrategyUpdated?: (updatedStrategy: Strategy) => void; // Callback for strategy updates
}

export function StrategyCard({ strategy, strategyStats, onViewSymbols, onViewConfigs, onStrategyUpdated }: StrategyCardProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    order_type: strategy.order_type,
    product_type: strategy.product_type
  });

  const handleToggle = async () => {
    if (isToggling) return;
    
    setIsToggling(true);
    setError(null);
    
    try {
      console.log(`${strategy.enabled ? 'Disabling' : 'Enabling'} strategy ${strategy.id}...`);
      
      const updatedStrategy = strategy.enabled 
        ? await apiClient.disableStrategy(strategy.id)
        : await apiClient.enableStrategy(strategy.id);
      
      console.log('Strategy updated:', updatedStrategy);
      
      // Update the strategy in the parent component
      if (onStrategyUpdated) {
        onStrategyUpdated(updatedStrategy);
      }
    } catch (err) {
      console.error('Failed to toggle strategy:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle strategy');
    } finally {
      setIsToggling(false);
    }
  };

  const handleEdit = () => {
    setEditFormData({
      order_type: strategy.order_type,
      product_type: strategy.product_type
    });
    setShowEditModal(true);
    setShowDropdown(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) return;
    
    setIsEditing(true);
    setError(null);
    
    try {
      const updatedStrategy = await apiClient.updateStrategy(strategy.id, {
        order_type: editFormData.order_type,
        product_type: editFormData.product_type
      });
      
      console.log('Strategy edited successfully:', updatedStrategy);
      
      // Update the strategy in the parent component
      if (onStrategyUpdated) {
        onStrategyUpdated(updatedStrategy);
      }
      
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to edit strategy:', err);
      setError(err instanceof Error ? err.message : 'Failed to edit strategy');
    } finally {
      setIsEditing(false);
    }
  };

  // Get real data from strategy object (no more mock data)
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
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Unknown';
      
      const now = new Date();
      const timeDiff = now.getTime() - date.getTime();
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor(timeDiff / (1000 * 60));
      
      // Show relative time for recent dates
      if (minutes < 1) {
        return 'just now';
      } else if (minutes < 60) {
        return `${minutes}m ago`;
      } else if (hours < 24) {
        return `${hours}h ago`;
      } else if (days === 1) {
        return 'yesterday';
      } else if (days < 7) {
        return `${days}d ago`;
      } else {
        // Show formatted date for older dates
        return date.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
      }
    } catch (error) {
      return 'Unknown';
    }
  };

  return (
    <div className="h-full group bg-gradient-to-br from-[var(--card-background)]/90 to-[var(--card-background)]/50 backdrop-blur-xl border border-[var(--border)]/50 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:border-[var(--accent)]/50 hover:scale-100 overflow-hidden relative p-0 min-h-[420px] max-w-md mx-auto flex flex-col">
      {/* Subtle animated border on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[var(--accent)]/20 via-transparent to-[var(--accent)]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      
      {/* Error Display */}
      {error && (
        <div className="absolute top-2 left-2 right-2 z-30 bg-red-500/90 backdrop-blur-sm border border-red-500 rounded-lg p-2 text-xs text-white flex items-center space-x-2">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          <span className="flex-1 min-w-0 truncate">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="text-white hover:text-red-200 text-sm"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Enhanced Header */}
      <div className="p-4 md:p-6 border-b border-[var(--border)]/30 bg-gradient-to-r from-[var(--card-background)]/60 to-[var(--accent)]/5 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1 min-w-0">
            <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-2 shadow-lg ${
              strategy.enabled 
                ? 'bg-green-400 animate-pulse shadow-green-400/50' 
                : 'bg-red-400 shadow-red-400/50'
            }`}></div>
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="text-lg font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors duration-200 leading-tight line-clamp-1">
                {strategy.name || `Strategy ${strategy.id}`}
              </h3>
              <div className="relative">
                <p 
                  className={`text-sm text-[var(--muted-foreground)] leading-relaxed cursor-pointer transition-all duration-200 ${
                    showFullDescription ? '' : 'line-clamp-2'
                  }`}
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  title="Click to toggle full description"
                >
                  {strategy.description || `${strategy.name || 'Strategy'} trading strategy optimized for market conditions with advanced risk management and automated execution.`}
                </p>
              </div>
              
              {/* Strategy Type Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] rounded-lg text-xs font-medium">
                  {strategy.order_type}
                </span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium">
                  {strategy.product_type}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 flex-shrink-0">
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
                <MoreVertical className="w-3.5 h-3.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]" />
              </button>
              
              {showDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-32 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-lg z-20">
                    <button 
                      onClick={handleEdit}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-[var(--accent)]/10 transition-colors flex items-center space-x-2"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 md:p-4 flex flex-col flex-1 relative z-10">
        <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4">
          <div className="text-center p-2 md:p-3 bg-[var(--background)]/40 rounded-lg border border-[var(--border)]/30 hover:bg-[var(--background)]/60 transition-colors">
            <div className="flex items-center justify-center space-x-1 mb-1 md:mb-2">
              <Activity className="w-3 md:w-3.5 h-3 md:h-3.5 text-blue-400" />
              <span className="text-xs text-[var(--muted-foreground)] font-medium">Live P&L</span>
              <div className="group/tooltip relative hidden md:block">
                <Info className="w-2.5 h-2.5 text-[var(--muted-foreground)]/60 hover:text-[var(--muted-foreground)] cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] rounded text-xs whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-10 shadow-lg">
                  Current day's P&L
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-1">
              {getTrendIcon(strategyStats?.live_pnl || 0)}
              <p className={`text-xs md:text-sm font-bold ${getPnLColor(strategyStats?.live_pnl || 0)} leading-none`}>
                ₹{Math.abs(strategyStats?.live_pnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="text-center p-2 md:p-3 bg-[var(--background)]/40 rounded-lg border border-[var(--border)]/30 hover:bg-[var(--background)]/60 transition-colors">
            <div className="flex items-center justify-center space-x-1 mb-1 md:mb-2">
              <TrendingUp className="w-3 md:w-3.5 h-3 md:h-3.5 text-purple-400" />
              <span className="text-xs text-[var(--muted-foreground)] font-medium">Overall P&L</span>
              <div className="group/tooltip relative hidden md:block">
                <Info className="w-2.5 h-2.5 text-[var(--muted-foreground)]/60 hover:text-[var(--muted-foreground)] cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] rounded text-xs whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-10 shadow-lg">
                  Total lifetime P&L
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-1">
              {getTrendIcon(strategyStats?.overall_pnl || 0)}
              <p className={`text-xs md:text-sm font-bold ${getPnLColor(strategyStats?.overall_pnl || 0)} leading-none`}>
                ₹{Math.abs(strategyStats?.overall_pnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3 md:mb-4">
          <div className="text-center p-2 md:p-2.5 bg-[var(--background)]/30 rounded hover:bg-[var(--background)]/50 transition-colors">
            <p className="text-xs md:text-sm font-bold text-blue-400 leading-none">
              {strategy.symbolCount !== undefined ? strategy.symbolCount : '...'}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Symbols</p>
          </div>
          <div className="text-center p-2 md:p-2.5 bg-[var(--background)]/30 rounded hover:bg-[var(--background)]/50 transition-colors">
            <p className="text-xs md:text-sm font-bold text-green-400 leading-none">{strategyStats?.trade_count || 0}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Trades</p>
          </div>
          <div className="text-center p-2 md:p-2.5 bg-[var(--background)]/30 rounded hover:bg-[var(--background)]/50 transition-colors">
            <p className="text-xs md:text-sm font-bold text-purple-400 leading-none">{strategyStats?.win_rate || 0}%</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Win Rate</p>
          </div>
        </div>

        {/* Action Buttons - More Prominent Position */}
        <div className="space-y-2 mb-3 md:mb-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onViewSymbols(strategy)}
              className="flex items-center justify-center space-x-1 md:space-x-1.5 px-2 md:px-3 py-2 md:py-2.5 bg-[var(--accent)]/20 hover:bg-[var(--accent)]/30 hover:scale-105 active:scale-95 text-[var(--accent)] rounded-lg transition-all duration-200 border border-[var(--accent)]/30 hover:border-[var(--accent)]/50 text-xs font-medium cursor-pointer shadow-sm hover:shadow-md"
              title="View all symbols for this strategy"
            >
              <Eye className="w-3 md:w-3.5 h-3 md:h-3.5" />
              <span className="hidden sm:inline">View Symbols</span>
              <span className="sm:hidden">Symbols</span>
            </button>
            <button
              onClick={() => onViewConfigs(strategy)}
              className="flex items-center justify-center space-x-1 md:space-x-1.5 px-2 md:px-3 py-2 md:py-2.5 bg-blue-500/20 hover:bg-blue-500/30 hover:scale-105 active:scale-95 text-blue-400 rounded-lg transition-all duration-200 border border-blue-500/30 hover:border-blue-500/50 text-xs font-medium cursor-pointer shadow-sm hover:shadow-md"
              title="View configuration settings for this strategy"
            >
              <Settings className="w-3 md:w-3.5 h-3 md:h-3.5" />
              <span className="hidden sm:inline">View Configs</span>
              <span className="sm:hidden">Configs</span>
            </button>
          </div>

          <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`w-full flex items-center justify-center space-x-1 md:space-x-1.5 px-2 md:px-3 py-2 md:py-2.5 rounded-lg transition-all duration-200 text-xs font-medium hover:scale-105 active:scale-95 ${
              strategy.enabled
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 hover:border-red-500/50'
                : 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 hover:border-green-500/50'
            } ${isToggling ? 'opacity-75 cursor-not-allowed scale-100' : 'hover:shadow-md'} transition-all duration-200`}
            title={`${strategy.enabled ? 'Pause' : 'Start'} this strategy`}
          >
            {isToggling ? (
              <>
                <div className="w-3 md:w-3.5 h-3 md:h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : strategy.enabled ? (
              <>
                <Pause className="w-3 md:w-3.5 h-3 md:h-3.5" />
                <span className="hidden sm:inline">Pause Strategy</span>
                <span className="sm:hidden">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 md:w-3.5 h-3 md:h-3.5" />
                <span className="hidden sm:inline">Start Strategy</span>
                <span className="sm:hidden">Start</span>
              </>
            )}
          </button>
        </div>

        {/* Date Information - Enhanced to show both created and updated */}
        <div className="space-y-1">
          <div className="flex items-center justify-center space-x-1 text-xs text-[var(--muted-foreground)]/70">
            <Clock className="w-3 h-3" />
            <span className="hidden md:inline">Created {formatDate(strategy.created_at)}</span>
            <span className="md:hidden">Created {formatDate(strategy.created_at)}</span>
          </div>
          
          {/* Show updated date if different from created date */}
          {strategy.updated_at && strategy.updated_at !== strategy.created_at && (
            <div className="flex items-center justify-center space-x-1 text-xs text-[var(--accent)]/80">
              <div className="w-3 h-3 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full"></div>
              </div>
              <span className="hidden md:inline">Updated {formatDate(strategy.updated_at)}</span>
              <span className="md:hidden">Upd. {formatDate(strategy.updated_at)}</span>
            </div>
          )}
          
          {/* Show "Just updated" indicator for recent updates (within 5 minutes) */}
          {strategy.updated_at && (() => {
            const updatedTime = new Date(strategy.updated_at).getTime();
            const now = new Date().getTime();
            const timeDiff = now - updatedTime;
            const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
            return timeDiff < fiveMinutes && timeDiff > 0;
          })() && (
            <div className="flex items-center justify-center space-x-1 text-xs animate-pulse">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
              <span className="text-green-400 font-medium">Recently Updated</span>
            </div>
          )}
        </div>
      </div>

      {/* Edit Strategy Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setShowEditModal(false)}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-md bg-[var(--card-background)] border-2 border-[var(--border)] rounded-xl shadow-2xl p-6 transform scale-100 transition-all duration-200">
            <h4 className="text-lg font-bold text-[var(--foreground)] mb-4">
              Edit Strategy #{strategy.id}
            </h4>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Order Type */}
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
                  Order Type
                </label>
                <select
                  value={editFormData.order_type}
                  onChange={(e) => setEditFormData({ ...editFormData, order_type: e.target.value as 'MARKET' | 'LIMIT' })}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--background)]/60 border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)] focus:outline-none transition-all"
                  required
                >
                  <option value="MARKET">MARKET</option>
                  <option value="LIMIT">LIMIT</option>
                </select>
              </div>
              
              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
                  Product Type
                </label>
                <select
                  value={editFormData.product_type}
                  onChange={(e) => setEditFormData({ ...editFormData, product_type: e.target.value as 'INTRADAY' | 'DELIVERY' })}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--background)]/60 border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)] focus:outline-none transition-all"
                  required
                >
                  <option value="INTRADAY">INTRADAY</option>
                  <option value="DELIVERY">DELIVERY</option>
                </select>
              </div>
              
              {/* Submit and Cancel Buttons */}
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-all flex items-center justify-center space-x-2"
                >
                  {isEditing && (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
