"use client";

import { useState, useEffect } from "react";
import { apiClient, SmartLevelsSymbol, SmartLevelConfig, SmartLevelCreate } from "../../lib/api";
import { X, Plus, Settings, TrendingUp, TrendingDown, Target, CheckCircle, XCircle, Edit3, Save, RotateCcw, Clock } from "lucide-react";

interface SmartLevelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  // Symbol-specific mode props
  targetSymbolId?: number;
  targetStrategySymbolId?: number;
  symbolName?: string;
  mode?: 'list' | 'manage' | 'create';
}

interface SymbolWithStrategyId extends SmartLevelsSymbol {
  strategy_symbol_id?: number;
}

export function SmartLevelsModal({ 
  isOpen, 
  onClose, 
  onRefresh,
  targetSymbolId,
  targetStrategySymbolId,
  symbolName,
  mode = 'list'
}: SmartLevelsModalProps) {
  const [symbols, setSymbols] = useState<SymbolWithStrategyId[]>([]);
  const [smartLevels, setSmartLevels] = useState<SmartLevelConfig[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLevelId, setEditingLevelId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Symbol-specific mode state
  const [filteredLevels, setFilteredLevels] = useState<SmartLevelConfig[]>([]);
  const [symbolInfo, setSymbolInfo] = useState<SymbolWithStrategyId | null>(null);
  const isSymbolSpecificMode = mode === 'manage' || mode === 'create';

  // Helper function to format timestamps
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "N/A";
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      // If less than 1 minute ago
      if (diffInSeconds < 60) {
        return "Just now";
      }
      
      // If less than 1 hour ago
      if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes}m ago`;
      }
      
      // If less than 1 day ago
      if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours}h ago`;
      }
      
      // If less than 7 days ago
      if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days}d ago`;
      }
      
      // Otherwise show formatted date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return "Invalid date";
    }
  };

  // Form data
  const [formData, setFormData] = useState<Partial<SmartLevelCreate>>({
    name: "",
    is_active: true,
    entry_level: 0,
    bullish_target: undefined,
    bearish_target: undefined,
    initial_lot_ce: 0,
    initial_lot_pe: 0,
    remaining_lot_ce: 0,
    remaining_lot_pe: 0,
    ce_buy_enabled: false,
    ce_sell_enabled: false,
    pe_buy_enabled: false,
    pe_sell_enabled: false,
    max_trades: undefined,
    max_loss_trades: undefined,
    pullback_percentage: undefined,
    strict_entry_vs_swing_check: false,
    notes: "",
    // Pre-fill symbol data for symbol-specific mode
    ...(targetStrategySymbolId && { strategy_symbol_id: targetStrategySymbolId })
  });

  // Load symbols and smart levels
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Initialize symbol-specific mode when props change
  useEffect(() => {
    if (isSymbolSpecificMode && targetStrategySymbolId && symbols.length > 0) {
      const targetSymbol = symbols.find(s => s.strategy_symbol_id === targetStrategySymbolId);
      if (targetSymbol) {
        setSymbolInfo(targetSymbol);
        setSelectedSymbol(targetSymbol.strategy_symbol_id?.toString() || "");
        
        // Filter levels for this symbol
        const symbolSpecificLevels = smartLevels.filter(
          level => level.strategy_symbol_id === targetStrategySymbolId
        );
        setFilteredLevels(symbolSpecificLevels);
      }
    }
  }, [isSymbolSpecificMode, targetStrategySymbolId, symbols, smartLevels]);

  // Helper function to get available symbols (exclude symbols that already have configurations)
  const getAvailableSymbols = () => {
    if (editingLevelId) {
      // When editing, show all symbols including the current one
      return symbols;
    }
    
    // When adding new, exclude symbols that already have configurations
    const configuredStrategySymbolIds = smartLevels.map(level => level.strategy_symbol_id);
    const availableSymbols = symbols.filter(symbol => 
      symbol.strategy_symbol_id && !configuredStrategySymbolIds.includes(symbol.strategy_symbol_id)
    );
    
    return availableSymbols;
  };

  // Helper function to reset form
  const resetForm = () => {
    setFormData({
      name: "",
      is_active: true,
      entry_level: 0,
      bullish_target: undefined,
      bearish_target: undefined,
      initial_lot_ce: 0,
      initial_lot_pe: 0,
      remaining_lot_ce: 0,
      remaining_lot_pe: 0,
      ce_buy_enabled: false,
      ce_sell_enabled: false,
      pe_buy_enabled: false,
      pe_sell_enabled: false,
      max_trades: undefined,
      max_loss_trades: undefined,
      pullback_percentage: undefined,
      strict_entry_vs_swing_check: false,
      notes: ""
    });
    setSelectedSymbol("");
    setEditingLevelId(null);
    setShowForm(false);
    setError(null);
  };

  // Helper function to start editing
  const startEdit = (level: SmartLevelConfig) => {
    const symbol = symbols.find(s => s.strategy_symbol_id === level.strategy_symbol_id);
    
    setFormData({
      name: level.name,
      is_active: level.is_active,
      entry_level: level.entry_level,
      bullish_target: level.bullish_target,
      bearish_target: level.bearish_target,
      initial_lot_ce: level.initial_lot_ce || 0,
      initial_lot_pe: level.initial_lot_pe || 0,
      remaining_lot_ce: level.remaining_lot_ce || 0,
      remaining_lot_pe: level.remaining_lot_pe || 0,
      ce_buy_enabled: level.ce_buy_enabled,
      ce_sell_enabled: level.ce_sell_enabled,
      pe_buy_enabled: level.pe_buy_enabled,
      pe_sell_enabled: level.pe_sell_enabled,
      max_trades: level.max_trades,
      max_loss_trades: level.max_loss_trades,
      pullback_percentage: level.pullback_percentage,
      strict_entry_vs_swing_check: level.strict_entry_vs_swing_check || false,
      notes: level.notes || ""
    });
    
    setSelectedSymbol(symbol?.symbol || "");
    setEditingLevelId(level.id!);
    setShowForm(true);
    setError(null);
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load symbols with smart levels enabled
      const symbolsResponse = await apiClient.getSmartLevelsSymbols();
      
      // We need to get strategy_symbol_id for each symbol
      // For now, we'll need to make additional API calls to get strategy symbols
      const symbolsWithIds: SymbolWithStrategyId[] = [];
      
      for (const symbol of symbolsResponse.symbols) {
        // This is a simplified approach - in a real scenario, you might want to 
        // modify the backend API to include strategy_symbol_id directly
        try {
          // Get strategies and find the swing strategy IDs
          const strategies = await apiClient.getStrategies();
          const swingStrategy = strategies.find(s => 
            s.key === 'SwingHighLowBuy' || s.key === 'SwingHighLowSell'
          );
          
          if (swingStrategy) {
            // Get symbols for this strategy to find the strategy_symbol_id
            const strategySymbols = await apiClient.getStrategySymbols(swingStrategy.id);
            const matchingSymbol = strategySymbols.find(ss => ss.symbol === symbol.symbol);
            
            if (matchingSymbol) {
              symbolsWithIds.push({
                ...symbol,
                strategy_symbol_id: matchingSymbol.id
              });
            }
          }
        } catch (err) {
          console.warn(`Failed to get strategy_symbol_id for ${symbol.symbol}:`, err);
        }
      }
      
      setSymbols(symbolsWithIds);
      
      // For symbol-specific mode, find and set the target symbol info
      if (isSymbolSpecificMode && targetStrategySymbolId) {
        const targetSymbol = symbolsWithIds.find(s => s.strategy_symbol_id === targetStrategySymbolId);
        setSymbolInfo(targetSymbol || null);
        setSelectedSymbol(targetSymbol?.strategy_symbol_id?.toString() || "");
      }
      
      // Load all smart levels
      const smartLevelsResponse = await apiClient.getAllSmartLevels();
      setSmartLevels(smartLevelsResponse);
      
      // Filter levels for symbol-specific mode
      if (isSymbolSpecificMode && targetStrategySymbolId) {
        const symbolSpecificLevels = smartLevelsResponse.filter(
          level => level.strategy_symbol_id === targetStrategySymbolId
        );
        setFilteredLevels(symbolSpecificLevels);
      } else {
        setFilteredLevels(smartLevelsResponse);
      }
      
    } catch (err) {
      console.error('Failed to load Smart Levels data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSymbol || !formData.name || !formData.entry_level) return;

    let selectedSymbolData: SymbolWithStrategyId | undefined;
    
    if (editingLevelId) {
      // For editing, find the symbol from the existing configuration
      const existingLevel = smartLevels.find(level => level.id === editingLevelId);
      selectedSymbolData = symbols.find(s => s.strategy_symbol_id === existingLevel?.strategy_symbol_id);
    } else {
      // For creating, find symbol from available symbols
      selectedSymbolData = symbols.find(s => s.symbol === selectedSymbol);
    }

    if (!selectedSymbolData || !selectedSymbolData.strategy_symbol_id) {
      setError("Invalid symbol selection");
      return;
    }

    // Validate targets
    if (formData.bullish_target && formData.bullish_target <= formData.entry_level) {
      setError("Bullish target must be above entry level");
      return;
    }
    
    if (formData.bearish_target && formData.bearish_target >= formData.entry_level) {
      setError("Bearish target must be below entry level");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingLevelId) {
        // Update existing Smart Level
        const updateData = {
          name: formData.name!,
          is_active: formData.is_active ?? true,
          entry_level: formData.entry_level!,
          bullish_target: formData.bullish_target || undefined,
          bearish_target: formData.bearish_target || undefined,
          initial_lot_ce: formData.initial_lot_ce || 0,
          initial_lot_pe: formData.initial_lot_pe || 0,
          remaining_lot_ce: formData.remaining_lot_ce || 0,
          remaining_lot_pe: formData.remaining_lot_pe || 0,
          ce_buy_enabled: formData.ce_buy_enabled ?? false,
          ce_sell_enabled: formData.ce_sell_enabled ?? false,
          pe_buy_enabled: formData.pe_buy_enabled ?? false,
          pe_sell_enabled: formData.pe_sell_enabled ?? false,
          max_trades: formData.max_trades || undefined,
          max_loss_trades: formData.max_loss_trades || undefined,
          pullback_percentage: formData.pullback_percentage || undefined,
          strict_entry_vs_swing_check: formData.strict_entry_vs_swing_check ?? false,
          notes: formData.notes || undefined
        };

        await apiClient.updateSmartLevel(editingLevelId, updateData);
      } else {
        // Create new Smart Level
        const smartLevelData: SmartLevelCreate = {
          strategy_symbol_id: selectedSymbolData.strategy_symbol_id,
          name: formData.name!,
          is_active: formData.is_active ?? true,
          entry_level: formData.entry_level!,
          bullish_target: formData.bullish_target || undefined,
          bearish_target: formData.bearish_target || undefined,
          initial_lot_ce: formData.initial_lot_ce || 0,
          initial_lot_pe: formData.initial_lot_pe || 0,
          remaining_lot_ce: formData.remaining_lot_ce || 0,
          remaining_lot_pe: formData.remaining_lot_pe || 0,
          ce_buy_enabled: formData.ce_buy_enabled ?? false,
          ce_sell_enabled: formData.ce_sell_enabled ?? false,
          pe_buy_enabled: formData.pe_buy_enabled ?? false,
          pe_sell_enabled: formData.pe_sell_enabled ?? false,
          max_trades: formData.max_trades || undefined,
          max_loss_trades: formData.max_loss_trades || undefined,
          pullback_percentage: formData.pullback_percentage || undefined,
          strict_entry_vs_swing_check: formData.strict_entry_vs_swing_check ?? false,
          notes: formData.notes || undefined
        };

        await apiClient.createSmartLevel(smartLevelData);
      }
      
      // Reset form and reload data
      resetForm();
      
      // Reload data to show the new/updated configuration
      await loadData();
      
      // Refresh parent component if callback provided
      if (onRefresh) {
        onRefresh();
      }
      
    } catch (err) {
      console.error('Failed to save Smart Level:', err);
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (smartLevelId: number) => {
    if (!confirm("Are you sure you want to delete this Smart Level configuration?")) return;

    try {
      await apiClient.deleteSmartLevel(smartLevelId);
      await loadData();
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to delete Smart Level:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete configuration');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--card-background)] rounded-xl border border-[var(--border)] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                {isSymbolSpecificMode && symbolName 
                  ? `Smart Levels - ${symbolName}` 
                  : 'Smart Levels Configuration'
                }
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                {isSymbolSpecificMode && symbolName
                  ? `Manage levels for ${symbolName}`
                  : 'Manage intelligent support and resistance levels'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--accent)]/10 transition-colors"
          >
            <X className="w-5 h-5 text-[var(--muted-foreground)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-[var(--muted-foreground)]">Loading Smart Levels data...</p>
            </div>
          ) : (
            <>
              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Add New Configuration Button */}
              {!showForm && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-[var(--accent)] hover:bg-blue-600 text-white rounded-lg transition-all duration-200 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {isSymbolSpecificMode 
                        ? `Add Level for ${symbolName}` 
                        : 'Add New Smart Level'
                      }
                    </span>
                  </button>
                </div>
              )}

              {/* Add/Edit Form */}
              {showForm && (
                <div className="bg-[var(--background)]/50 border border-[var(--border)]/50 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                      {editingLevelId 
                        ? 'Edit Smart Level' 
                        : isSymbolSpecificMode 
                          ? `Add Level for ${symbolName}` 
                          : 'Add New Smart Level'
                      }
                    </h3>
                    <button
                      onClick={() => setShowForm(false)}
                      className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Symbol Selection - Hidden in symbol-specific mode */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {!isSymbolSpecificMode && (
                        <div>
                          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Symbol</label>
                          <select
                            value={selectedSymbol}
                            onChange={(e) => setSelectedSymbol(e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
                            required
                            disabled={getAvailableSymbols().length === 0}
                          >
                            <option value="">
                              {getAvailableSymbols().length === 0 ? "No symbols available" : "Select Symbol"}
                            </option>
                            {getAvailableSymbols().map((symbol) => (
                              <option key={symbol.symbol} value={symbol.symbol}>
                                {symbol.symbol}
                              </option>
                            ))}
                          </select>
                          {getAvailableSymbols().length === 0 && (
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                              All symbols already have Smart Levels configured. Edit existing configurations or add more symbols to swing strategies.
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Show symbol info in symbol-specific mode */}
                      {isSymbolSpecificMode && symbolInfo && (
                        <div>
                          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Symbol</label>
                          <div className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-[var(--foreground)]">
                            {symbolInfo.symbol}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
                          placeholder="e.g., NIFTY Support Level 1"
                          required
                        />
                      </div>
                    </div>

                    {/* Entry Level and Targets */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                          <Target className="w-4 h-4 inline mr-1" />
                          Entry Level
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.entry_level}
                          onChange={(e) => setFormData({ ...formData, entry_level: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
                          placeholder="25000.00"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-green-400 mb-2">
                          <TrendingUp className="w-4 h-4 inline mr-1" />
                          Bullish Target (Above Entry)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.bullish_target || ""}
                          onChange={(e) => setFormData({ ...formData, bullish_target: parseFloat(e.target.value) || undefined })}
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
                          placeholder="25500.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-red-400 mb-2">
                          <TrendingDown className="w-4 h-4 inline mr-1" />
                          Bearish Target (Below Entry)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.bearish_target || ""}
                          onChange={(e) => setFormData({ ...formData, bearish_target: parseFloat(e.target.value) || undefined })}
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
                          placeholder="24500.00"
                        />
                      </div>
                    </div>

                    {/* Lot Sizes */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Initial CE Lots</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.initial_lot_ce}
                          onChange={(e) => setFormData({ ...formData, initial_lot_ce: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Initial PE Lots</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.initial_lot_pe}
                          onChange={(e) => setFormData({ ...formData, initial_lot_pe: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Remaining CE Lots</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.remaining_lot_ce}
                          onChange={(e) => setFormData({ ...formData, remaining_lot_ce: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Remaining PE Lots</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.remaining_lot_pe}
                          onChange={(e) => setFormData({ ...formData, remaining_lot_pe: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
                        />
                      </div>
                    </div>

                    {/* Trade Control Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Max Trades</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.max_trades || ""}
                          onChange={(e) => setFormData({ ...formData, max_trades: parseInt(e.target.value) || undefined })}
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
                          placeholder="Unlimited"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Max Loss Trades</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.max_loss_trades || ""}
                          onChange={(e) => setFormData({ ...formData, max_loss_trades: parseInt(e.target.value) || undefined })}
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
                          placeholder="Unlimited"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Pullback %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.pullback_percentage || ""}
                          onChange={(e) => setFormData({ ...formData, pullback_percentage: parseFloat(e.target.value) || undefined })}
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Buy/Sell Options */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.ce_buy_enabled}
                          onChange={(e) => setFormData({ ...formData, ce_buy_enabled: e.target.checked })}
                          className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                        />
                        <span className="text-sm text-[var(--foreground)]">CE Buy Enabled</span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.ce_sell_enabled}
                          onChange={(e) => setFormData({ ...formData, ce_sell_enabled: e.target.checked })}
                          className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                        />
                        <span className="text-sm text-[var(--foreground)]">CE Sell Enabled</span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.pe_buy_enabled}
                          onChange={(e) => setFormData({ ...formData, pe_buy_enabled: e.target.checked })}
                          className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                        />
                        <span className="text-sm text-[var(--foreground)]">PE Buy Enabled</span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.pe_sell_enabled}
                          onChange={(e) => setFormData({ ...formData, pe_sell_enabled: e.target.checked })}
                          className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                        />
                        <span className="text-sm text-[var(--foreground)]">PE Sell Enabled</span>
                      </label>
                    </div>

                    {/* Strict Entry vs Swing Check */}
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.strict_entry_vs_swing_check || false}
                          onChange={(e) => setFormData({ ...formData, strict_entry_vs_swing_check: e.target.checked })}
                          className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                        />
                        <span className="text-sm text-[var(--foreground)]">Strict Entry vs Swing Check</span>
                      </label>
                      <div className="relative group">
                        <div className="w-4 h-4 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] flex items-center justify-center text-xs cursor-help">
                          ?
                        </div>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--popover)] border border-[var(--border)] rounded-lg shadow-lg text-xs text-[var(--popover-foreground)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                          If enabled, only take trades when the entry level<br/>
                          is below the swing high (for uptrend) or above<br/>
                          the swing low (for downtrend). Uncheck to<br/>
                          ignore this condition.
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Notes (Optional)</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)] resize-none"
                        rows={3}
                        placeholder="Additional notes about this Smart Level configuration..."
                      />
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          resetForm();
                          setShowForm(false);
                        }}
                        className="px-4 py-2 border border-[var(--border)] text-[var(--muted-foreground)] rounded-lg hover:bg-[var(--accent)]/10 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      {editingLevelId && (
                        <button
                          type="button"
                          onClick={resetForm}
                          className="px-4 py-2 border border-[var(--accent)] text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/10 transition-all duration-200 flex items-center space-x-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Reset</span>
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-[var(--accent)] hover:bg-blue-600 text-white rounded-lg transition-all duration-200 font-medium disabled:opacity-50 flex items-center space-x-2"
                      >
                        {editingLevelId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        <span>
                          {isSubmitting 
                            ? (editingLevelId ? "Updating..." : "Creating...") 
                            : (editingLevelId ? "Update Smart Level" : "Create Smart Level")
                          }
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Configured Smart Levels List */}
              {filteredLevels.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                    {isSymbolSpecificMode ? `Smart Levels for ${symbolName}` : 'Configured Smart Levels'}
                  </h3>
                  <div className="space-y-4">
                    {filteredLevels.map((level) => {
                      const symbol = symbols.find(s => s.strategy_symbol_id === level.strategy_symbol_id);
                      return (
                        <div key={level.id} className="bg-[var(--background)]/50 border border-[var(--border)]/50 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="font-semibold text-[var(--foreground)]">{level.name}</h4>
                                <span className="text-sm px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] rounded-full">
                                  {symbol?.symbol || "Unknown Symbol"}
                                </span>
                                {level.is_active ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-[var(--muted-foreground)]">Entry Level:</span>
                                  <span className="ml-2 font-medium text-[var(--foreground)]">{level.entry_level}</span>
                                </div>
                                {level.bullish_target && (
                                  <div>
                                    <span className="text-green-400">Bullish Target:</span>
                                    <span className="ml-2 font-medium text-green-400">{level.bullish_target}</span>
                                  </div>
                                )}
                                {level.bearish_target && (
                                  <div>
                                    <span className="text-red-400">Bearish Target:</span>
                                    <span className="ml-2 font-medium text-red-400">{level.bearish_target}</span>
                                  </div>
                                )}
                              </div>

                              {/* Trade Control Information */}
                              {(level.max_trades || level.max_loss_trades || level.pullback_percentage) && (
                                <div className="grid grid-cols-3 gap-4 text-sm mt-3 pt-3 border-t border-[var(--border)]/30">
                                  {level.max_trades && (
                                    <div>
                                      <span className="text-[var(--muted-foreground)]">Max Trades:</span>
                                      <span className="ml-2 font-medium text-[var(--foreground)]">{level.max_trades}</span>
                                    </div>
                                  )}
                                  {level.max_loss_trades && (
                                    <div>
                                      <span className="text-[var(--muted-foreground)]">Max Loss Trades:</span>
                                      <span className="ml-2 font-medium text-[var(--foreground)]">{level.max_loss_trades}</span>
                                    </div>
                                  )}
                                  {level.pullback_percentage && (
                                    <div>
                                      <span className="text-[var(--muted-foreground)]">Pullback %:</span>
                                      <span className="ml-2 font-medium text-[var(--foreground)]">{level.pullback_percentage}%</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center justify-between mt-4">
                                {/* CE Options */}
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">CE:</span>
                                  <div className="flex space-x-1">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                                      level.ce_buy_enabled 
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                        : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                    }`}>
                                      Buy {level.ce_buy_enabled ? '✓' : '✗'}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                                      level.ce_sell_enabled 
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                                        : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                    }`}>
                                      Sell {level.ce_sell_enabled ? '✓' : '✗'}
                                    </span>
                                  </div>
                                </div>

                                {/* PE Options */}
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">PE:</span>
                                  <div className="flex space-x-1">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                                      level.pe_buy_enabled 
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                        : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                    }`}>
                                      Buy {level.pe_buy_enabled ? '✓' : '✗'}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                                      level.pe_sell_enabled 
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                                        : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                    }`}>
                                      Sell {level.pe_sell_enabled ? '✓' : '✗'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {level.notes && (
                                <p className="text-sm text-[var(--muted-foreground)] mt-2">{level.notes}</p>
                              )}

                              {/* Timestamp Information */}
                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]/30">
                                <div className="flex items-center space-x-6 text-xs">
                                  <div className="flex items-center space-x-2">
                                    <Clock className="w-3 h-3 text-[var(--muted-foreground)]" />
                                    <span className="text-[var(--muted-foreground)]">Created:</span>
                                    <span className="text-[var(--foreground)] font-medium" title={level.created_at ? new Date(level.created_at).toLocaleString() : 'N/A'}>
                                      {formatTimestamp(level.created_at)}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Clock className="w-3 h-3 text-[var(--muted-foreground)]" />
                                    <span className="text-[var(--muted-foreground)]">Updated:</span>
                                    <span className="text-[var(--foreground)] font-medium" title={level.updated_at ? new Date(level.updated_at).toLocaleString() : 'N/A'}>
                                      {formatTimestamp(level.updated_at)}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Status indicator for recently updated items */}
                                {level.updated_at && level.created_at && level.updated_at !== level.created_at && (
                                  <div className="text-xs">
                                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                                      Recently Updated
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEdit(level)}
                                className="text-indigo-400 hover:text-indigo-300 transition-colors p-1"
                                title="Edit Smart Level"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(level.id!)}
                                className="text-red-400 hover:text-red-300 transition-colors p-1"
                                title="Delete Smart Level"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                !showForm && (
                  <div className="text-center py-8">
                    <Settings className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                      {isSymbolSpecificMode 
                        ? `No Smart Levels for ${symbolName}` 
                        : 'No Smart Levels Configured'
                      }
                    </h3>
                    <p className="text-[var(--muted-foreground)] mb-4">
                      {isSymbolSpecificMode
                        ? `Create your first Smart Level for ${symbolName} to get started.`
                        : 'Create your first Smart Level configuration to get started.'
                      }
                    </p>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
