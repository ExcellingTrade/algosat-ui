"use client";
import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api";
import { 
  Database, 
  Calendar, 
  Filter, 
  Search, 
  Play, 
  Pause, 
  Download, 
  Eye,
  AlertCircle,
  Info,
  XCircle,
  Activity,
  Clock,
  FileText,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react";

// Use API client types directly to avoid conflicts
import type { LogFile, LogEntry, LogStats, LogStreamResponse } from "@/lib/api";

export const LogsManagement: React.FC = () => {
  // State management
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [logStats, setLogStats] = useState<LogStats | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedLogType, setSelectedLogType] = useState<string>("all");
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [liveLogEntries, setLiveLogEntries] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState<boolean>(false);
  const [logSearchTerm, setLogSearchTerm] = useState<string>("");
  const [liveSearchTerm, setLiveSearchTerm] = useState<string>("");
  const [logLevelFilter, setLogLevelFilter] = useState<string>("all");
  const [liveLogLevelFilter, setLiveLogLevelFilter] = useState<string>("all");
  const [liveLogTypeFilter, setLiveLogTypeFilter] = useState<string>("all");
  const [isLiveLogging, setIsLiveLogging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Collapse states
  const [isLiveLogsCollapsed, setIsLiveLogsCollapsed] = useState<boolean>(false);
  const [isHistoryLogsCollapsed, setIsHistoryLogsCollapsed] = useState<boolean>(false);
  
  const liveLogRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const liveLogStreamRef = useRef<EventSource | null>(null);

  // Utility function to get IST date
  const getISTDate = (date?: Date): string => {
    const targetDate = date || new Date();
    // Convert to IST (UTC + 5:30)
    const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
    const istDate = new Date(targetDate.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
  };

  // Get current IST time
  const getCurrentISTTime = (): string => {
    const now = new Date();
    return now.toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Load initial data
  useEffect(() => {
    loadLogOverview();
  }, []);

  // Set initial date to today IST if not set
  useEffect(() => {
    if (logStats && !selectedDate) {
      const todayIST = getISTDate();
      setSelectedDate(todayIST);
    }
  }, [logStats, selectedDate]);

  // Auto-scroll live logs
  useEffect(() => {
    if (autoScroll && liveLogRef.current && isLiveLogging) {
      liveLogRef.current.scrollTop = 0; // Scroll to top for newest entries
    }
  }, [liveLogEntries, autoScroll, isLiveLogging]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (liveLogStreamRef.current) {
        liveLogStreamRef.current.close();
      }
    };
  }, []);

  const loadLogOverview = async () => {
    try {
      setError(null);
      const response = await apiClient.getLogOverview();
      setLogFiles(response.files);
      setLogStats(response.stats);
      
      // Set default selected date to most recent
      if (response.files.length > 0) {
        const dates = [...new Set(response.files.map(f => f.date))].sort().reverse();
        setSelectedDate(dates[0]);
      }
    } catch (err) {
      setError("Failed to load log overview");
      console.error("Error loading log overview:", err);
    }
  };

  // Effect for live filter changes - clear live logs when filters change
  useEffect(() => {
    if (isLiveLogging && liveLogStreamRef.current) {
      // Clear current live logs when live filters change
      setLiveLogEntries([]);
    }
  }, [liveSearchTerm, liveLogLevelFilter, liveLogTypeFilter, isLiveLogging]);

  const loadLogs = async (date?: string) => {
    const targetDate = date || selectedDate;
    if (!targetDate) return;

    try {
      setLogLoading(true);
      setError(null);
      
      // Determine the log type to send to API
      let logTypeForAPI: string | undefined;
      if (selectedLogType === "all") {
        logTypeForAPI = undefined; // Don't filter by type when "all" is selected
      } else {
        logTypeForAPI = selectedLogType;
      }
      
      const response = await apiClient.getLogContent(
        targetDate,
        logTypeForAPI,
        1000,
        0,
        logLevelFilter === "all" ? undefined : logLevelFilter,
        logSearchTerm || undefined
      );
      
      setLogEntries(response.entries);
    } catch (err) {
      setError("Failed to load logs");
      console.error("Error loading logs:", err);
    } finally {
      setLogLoading(false);
    }
  };

  const toggleLiveLogging = async () => {
    if (isLiveLogging) {
      // Stop live logging
      if (liveLogStreamRef.current) {
        liveLogStreamRef.current.close();
        liveLogStreamRef.current = null;
      }
      setIsLiveLogging(false);
      setLiveLogEntries([]);
    } else {
      // Start live logging
      try {
        setError(null);
        
        // Determine the log type to send to API for live streaming
        let liveLogTypeForAPI: string | undefined;
        if (liveLogTypeFilter === "all") {
          liveLogTypeForAPI = undefined; // Don't filter by type when "all" is selected
        } else {
          liveLogTypeForAPI = liveLogTypeFilter;
        }
        
        const stream = await apiClient.createLogStream(
          liveLogTypeForAPI,
          liveLogLevelFilter === "all" ? undefined : liveLogLevelFilter
        );

        if (!stream) {
          setError("Failed to create log stream");
          return;
        }

        liveLogStreamRef.current = stream;
        setIsLiveLogging(true);
        setLiveLogEntries([]);

        stream.onmessage = (event) => {
          try {
            const response: LogStreamResponse = JSON.parse(event.data);
            // Extract the entry from the LogStreamResponse
            if (response.entry) {
              const entry = response.entry;
              
              // Apply search filter for live logs using liveSearchTerm
              const matchesSearch = !liveSearchTerm || 
                entry.message.toLowerCase().includes(liveSearchTerm.toLowerCase()) ||
                entry.logger.toLowerCase().includes(liveSearchTerm.toLowerCase()) ||
                entry.module.toLowerCase().includes(liveSearchTerm.toLowerCase());
              
              if (matchesSearch) {
                setLiveLogEntries(prev => {
                  // Create a unique key combining timestamp and message to avoid duplicates
                  const entryKey = `${entry.timestamp}-${entry.message.slice(0, 50)}`;
                  const existingIndex = prev.findIndex(e => 
                    `${e.timestamp}-${e.message.slice(0, 50)}` === entryKey
                  );
                  
                  if (existingIndex === -1) {
                    // Add new entry and maintain max 100 entries
                    return [entry, ...prev.slice(0, 99)];
                  }
                  
                  // Entry already exists, don't add it again
                  return prev;
                });
              }
            } else if (response.error) {
              console.error("Stream error:", response.error);
              setError(`Live log stream error: ${response.error}`);
            }
          } catch (err) {
            console.error("Error parsing log entry:", err);
          }
        };

        stream.onerror = (error) => {
          console.error("Live log stream error:", error);
          setError("Live log stream disconnected");
          setIsLiveLogging(false);
          stream.close();
        };

      } catch (err) {
        setError("Failed to start live logging");
        console.error("Error starting live logging:", err);
      }
    }
  };

  const downloadLogs = async () => {
    if (!selectedDate) return;
    
    try {
      const response = await apiClient.downloadLogs(
        selectedDate,
        selectedLogType === "all" ? undefined : selectedLogType
      );
      
      // Create blob and download
      const blob = new Blob([response], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `algosat-logs-${selectedDate}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download logs");
      console.error("Error downloading logs:", err);
    }
  };

  // Load logs when date or filters change
  useEffect(() => {
    if (selectedDate) {
      loadLogs(selectedDate);
    }
  }, [selectedDate, selectedLogType, logLevelFilter, logSearchTerm]);

  // Separate useEffect for search with debounce - removed as it's redundant with above
  // The main useEffect above now handles all dependencies including search term

  const formatTimestamp = (timestamp: string) => {
    // Convert timestamp to IST timezone
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata' // Force IST timezone
    });
  };

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR': return 'text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/30';
      case 'WARNING': case 'WARN': return 'text-[var(--warning)] bg-[var(--warning)]/10 border border-[var(--warning)]/30';
      case 'INFO': return 'text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/30';
      case 'DEBUG': return 'text-[var(--muted-foreground)] bg-[var(--muted)]/10 border border-[var(--border)]';
      case 'CRITICAL': return 'text-[var(--error)] bg-[var(--error)]/20 border border-[var(--error)]/50';
      default: return 'text-[var(--muted-foreground)] bg-[var(--card-background)]/50 border border-[var(--border)]';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR': case 'CRITICAL': return <XCircle className="w-4 h-4" />;
      case 'WARNING': case 'WARN': return <AlertCircle className="w-4 h-4" />;
      case 'INFO': return <Info className="w-4 h-4" />;
      case 'DEBUG': return <Eye className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get unique dates from log files
  const availableDates = [...new Set(logFiles.map(f => f.date))].sort().reverse();
  
  // Get unique log types from log files
  const availableLogTypes = [...new Set(logFiles.map(f => f.type))].sort();

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {logStats && (
        <div className="flex items-center space-x-8 bg-[var(--card-background)]/60 backdrop-blur-sm rounded-lg p-6 border border-[var(--border)]">
          <div className="text-center">
            <div className="text-2xl font-light text-[var(--accent)] mb-1">
              {Object.values(logStats.files_by_type).reduce((sum, type) => sum + type.count, 0)}
            </div>
            <div className="text-[var(--muted-foreground)] text-sm">Files</div>
          </div>
          <div className="w-px h-8 bg-[var(--border)]"></div>
          <div className="text-center">
            <div className="text-2xl font-light text-[var(--accent)] mb-1">{logStats.total_dates}</div>
            <div className="text-[var(--muted-foreground)] text-sm">Days</div>
          </div>
          <div className="w-px h-8 bg-[var(--border)]"></div>
          <div className="text-center">
            <div className="text-2xl font-light text-[var(--accent)] mb-1">{formatFileSize(logStats.total_size)}</div>
            <div className="text-[var(--muted-foreground)] text-sm">Storage</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-[var(--error)] flex-shrink-0" />
            <span className="text-[var(--error)]">{error}</span>
          </div>
        </div>
      )}



      {/* Log Viewers with Collapsible Sections */}
      <div className="space-y-6">
        {/* Live Logs Section */}
        <div className="bg-[var(--card-background)]/60 backdrop-blur-sm border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            onClick={() => setIsLiveLogsCollapsed(!isLiveLogsCollapsed)}
            className="w-full flex items-center justify-between p-6 border-b border-[var(--border)] hover:bg-[var(--background)]/20 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Activity className="w-5 h-5 text-[var(--accent)]" />
                {isLiveLogging && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--accent)] rounded-full animate-ping"></div>
                )}
              </div>
              <div className="text-left">
                <h3 className="text-lg font-medium text-[var(--foreground)]">Live Logs</h3>
                <div className="flex items-center space-x-2 mt-1">
                  {isLiveLogging && (
                    <>
                      <div className="w-2 h-2 bg-[var(--accent)] rounded-full"></div>
                      <span className="text-xs text-[var(--accent)] font-medium">STREAMING</span>
                    </>
                  )}
                  {(liveSearchTerm || liveLogTypeFilter !== "all" || liveLogLevelFilter !== "all") && (
                    <span className="px-2 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] text-xs rounded-full">
                      Filtered
                    </span>
                  )}
                  <span className="text-sm text-[var(--muted-foreground)]">
                    {getISTDate()} • IST: {getCurrentISTTime().split(' ')[1]}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Live Log Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLiveLogging();
                  }}
                  className={`p-2 rounded-lg font-medium transition-all duration-200 ${
                    isLiveLogging 
                      ? 'bg-[var(--error)] hover:bg-[var(--error)]/80 text-white'
                      : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
                  }`}
                  title={isLiveLogging ? 'Stop Live Streaming' : 'Start Live Streaming'}
                >
                  {isLiveLogging ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                
                <label className="flex items-center space-x-2 text-sm text-[var(--muted-foreground)]">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span>Auto-scroll</span>
                </label>
              </div>
              
              {isLiveLogging && liveLogEntries.length > 0 && (
                <span className="text-sm text-[var(--muted-foreground)]">
                  {liveLogEntries.length} entries
                </span>
              )}
              
              {isLiveLogsCollapsed ? (
                <ChevronDown className="w-5 h-5 text-[var(--muted-foreground)]" />
              ) : (
                <ChevronUp className="w-5 h-5 text-[var(--muted-foreground)]" />
              )}
            </div>
          </button>

          {!isLiveLogsCollapsed && (
            <>
              {/* Live Search and Filter Controls */}
              <div className="p-4 border-b border-[var(--border)] bg-[var(--background)]/20 space-y-4">
                {/* Search Row */}
                <div className="flex items-center space-x-3">
                  <Search className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0" />
                  <input
                    type="text"
                    value={liveSearchTerm}
                    onChange={(e) => setLiveSearchTerm(e.target.value)}
                    placeholder="Search live logs..."
                    className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                  />
                  {liveSearchTerm && (
                    <button
                      onClick={() => setLiveSearchTerm("")}
                      className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                      title="Clear search"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[var(--muted-foreground)] flex items-center">
                      <Filter className="w-3 h-3 mr-1" />
                      Type
                    </label>
                    <select
                      value={liveLogTypeFilter}
                      onChange={(e) => setLiveLogTypeFilter(e.target.value)}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-sm focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                    >
                      <option value="all">All types</option>
                      {availableLogTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[var(--muted-foreground)] flex items-center">
                      <Zap className="w-3 h-3 mr-1" />
                      Level
                    </label>
                    <select
                      value={liveLogLevelFilter}
                      onChange={(e) => setLiveLogLevelFilter(e.target.value)}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-sm focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                    >
                      <option value="all">All levels</option>
                      <option value="DEBUG">Debug</option>
                      <option value="INFO">Info</option>
                      <option value="WARNING">Warning</option>
                      <option value="ERROR">Error</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Active Filter Pills */}
                {(liveLogTypeFilter !== "all" || liveLogLevelFilter !== "all" || liveSearchTerm) && (
                  <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
                    {liveLogTypeFilter !== "all" && (
                      <span className="inline-flex items-center px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] text-xs rounded-full">
                        {liveLogTypeFilter}
                        <button
                          onClick={() => setLiveLogTypeFilter("all")}
                          className="ml-1 text-[var(--accent)] hover:text-[var(--accent-hover)]"
                          aria-label="Clear type filter"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {liveLogLevelFilter !== "all" && (
                      <span className="inline-flex items-center px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] text-xs rounded-full">
                        {liveLogLevelFilter}
                        <button
                          onClick={() => setLiveLogLevelFilter("all")}
                          className="ml-1 text-[var(--accent)] hover:text-[var(--accent-hover)]"
                          aria-label="Clear level filter"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {liveSearchTerm && (
                      <span className="inline-flex items-center px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] text-xs rounded-full">
                        "{liveSearchTerm}"
                        <button
                          onClick={() => setLiveSearchTerm("")}
                          className="ml-1 text-[var(--accent)] hover:text-[var(--accent-hover)]"
                          aria-label="Clear search"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setLiveLogTypeFilter("all");
                        setLiveLogLevelFilter("all");
                        setLiveSearchTerm("");
                      }}
                      className="ml-auto text-xs text-[var(--muted-foreground)] hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>
              
              <div 
                ref={liveLogRef}
                className="h-[600px] overflow-y-auto bg-[var(--background)]/30"
              >
                {isLiveLogging ? (
                  liveLogEntries.length > 0 ? (
                    <div className="p-4 space-y-2 font-mono text-xs">
                      {liveLogEntries.map((entry, index) => {
                        const entryKey = `${entry.timestamp}-${entry.message.slice(0, 50)}-${index}`;
                        return (
                          <div key={entryKey} className="group hover:bg-[var(--card-background)]/30 rounded-lg p-3 transition-colors">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="text-[var(--muted-foreground)] text-xs font-medium">
                                {formatTimestamp(entry.timestamp)}
                              </span>
                              <span className={`px-2 py-1 rounded-md text-xs font-medium ${getLevelColor(entry.level)}`}>
                                {entry.level}
                              </span>
                            </div>
                            <div className="text-[var(--foreground)] leading-relaxed pl-2 border-l-2 border-[var(--border)] group-hover:border-[var(--accent)]/50 transition-colors">
                              {entry.message}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-[var(--muted-foreground)]">Waiting for live logs...</p>
                        {liveSearchTerm && (
                          <p className="text-[var(--muted)] text-sm mt-2">Filtering by: "{liveSearchTerm}"</p>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Play className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
                      <p className="text-[var(--muted-foreground)] text-lg font-light">Start live monitoring</p>
                      <p className="text-[var(--muted)] text-sm mt-2">Click the play button above to begin real-time log streaming</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Historical Logs Section */}
        <div className="bg-[var(--card-background)]/60 backdrop-blur-sm border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            onClick={() => setIsHistoryLogsCollapsed(!isHistoryLogsCollapsed)}
            className="w-full flex items-center justify-between p-6 border-b border-[var(--border)] hover:bg-[var(--background)]/20 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-[var(--accent)]" />
              <div className="text-left">
                <h3 className="text-lg font-medium text-[var(--foreground)]">Historical Logs</h3>
                <div className="flex items-center space-x-2 mt-1">
                  {selectedDate && (
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {selectedDate} (IST)
                    </span>
                  )}
                  {logSearchTerm && logEntries.length > 0 && (
                    <span className="px-2 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] text-xs rounded-full">
                      {logEntries.length} matches
                    </span>
                  )}
                  {logSearchTerm && logEntries.length === 0 && !logLoading && selectedDate && (
                    <span className="px-2 py-0.5 bg-[var(--warning)]/20 text-[var(--warning)] text-xs rounded-full">
                      No matches
                    </span>
                  )}
                  {logLevelFilter !== "all" && (
                    <span className="px-2 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] text-xs rounded-full">
                      {logLevelFilter}
                    </span>
                  )}
                  {selectedLogType !== "all" && (
                    <span className="px-2 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] text-xs rounded-full">
                      {selectedLogType}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadLogs();
                }}
                disabled={!selectedDate || logEntries.length === 0}
                className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download Historical Logs"
              >
                <Download className="w-5 h-5" />
              </button>
              {logEntries.length > 0 && (
                <span className="text-sm text-[var(--muted-foreground)]">
                  {logEntries.length} entries
                </span>
              )}
              {isHistoryLogsCollapsed ? (
                <ChevronDown className="w-5 h-5 text-[var(--muted-foreground)]" />
              ) : (
                <ChevronUp className="w-5 h-5 text-[var(--muted-foreground)]" />
              )}
            </div>
          </button>

          {!isHistoryLogsCollapsed && (
            <>
              {/* Historical Search and Filter Controls */}
              <div className="p-4 border-b border-[var(--border)] bg-[var(--background)]/20 space-y-4">
                {/* Date and Search Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--foreground)] flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-[var(--muted-foreground)]" />
                      Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[var(--foreground)] text-sm focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--foreground)] flex items-center">
                      <Search className="w-4 h-4 mr-2 text-[var(--muted-foreground)]" />
                      Search
                      {logSearchTerm && (
                        <span className="ml-2 px-2 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] text-xs rounded-full">
                          Active
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={logSearchTerm}
                        onChange={(e) => setLogSearchTerm(e.target.value)}
                        placeholder="Search historical logs..."
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 pr-10 text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                      />
                      {logSearchTerm && (
                        <button
                          onClick={() => setLogSearchTerm("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                          title="Clear search"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filter Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--foreground)] flex items-center">
                      <Filter className="w-4 h-4 mr-2 text-[var(--muted-foreground)]" />
                      Type
                    </label>
                    <select
                      value={selectedLogType}
                      onChange={(e) => setSelectedLogType(e.target.value)}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[var(--foreground)] text-sm focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                    >
                      <option value="all">All types</option>
                      {availableLogTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--foreground)] flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-[var(--muted-foreground)]" />
                      Level
                    </label>
                    <select
                      value={logLevelFilter}
                      onChange={(e) => setLogLevelFilter(e.target.value)}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[var(--foreground)] text-sm focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                    >
                      <option value="all">All levels</option>
                      <option value="DEBUG">Debug</option>
                      <option value="INFO">Info</option>
                      <option value="WARNING">Warning</option>
                      <option value="ERROR">Error</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--foreground)] flex items-center">
                      <RefreshCw className="w-4 h-4 mr-2 text-[var(--muted-foreground)]" />
                      Actions
                    </label>
                    <button
                      onClick={() => loadLogs()}
                      disabled={!selectedDate || logLoading}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--muted)] disabled:text-[var(--muted-foreground)] rounded-lg text-white font-medium transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${logLoading ? 'animate-spin' : ''}`} />
                      <span>Load Logs</span>
                    </button>
                  </div>
                </div>

                {/* Active Filter Pills */}
                {(selectedLogType !== "all" || logLevelFilter !== "all" || logSearchTerm) && (
                  <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
                    {selectedLogType !== "all" && (
                      <span className="inline-flex items-center px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] text-xs rounded-full">
                        {selectedLogType}
                        <button
                          onClick={() => setSelectedLogType("all")}
                          className="ml-1 text-[var(--accent)] hover:text-[var(--accent-hover)]"
                          aria-label="Clear log type filter"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {logLevelFilter !== "all" && (
                      <span className="inline-flex items-center px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] text-xs rounded-full">
                        {logLevelFilter}
                        <button
                          onClick={() => setLogLevelFilter("all")}
                          className="ml-1 text-[var(--accent)] hover:text-[var(--accent-hover)]"
                          aria-label="Clear level filter"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {logSearchTerm && (
                      <span className="inline-flex items-center px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] text-xs rounded-full">
                        "{logSearchTerm}"
                        <button
                          onClick={() => setLogSearchTerm("")}
                          className="ml-1 text-[var(--accent)] hover:text-[var(--accent-hover)]"
                          aria-label="Clear search"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setSelectedLogType("all");
                        setLogLevelFilter("all");
                        setLogSearchTerm("");
                      }}
                      className="ml-auto text-xs text-[var(--muted-foreground)] hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>
            <div className="h-[600px] overflow-y-auto bg-[var(--background)]/30">
              {logLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-[var(--muted-foreground)]">Loading logs...</p>
                  </div>
                </div>
              ) : logEntries.length > 0 ? (
                <div className="p-4 space-y-2 font-mono text-xs">
                  {logEntries.map((entry, index) => (
                    <div key={index} className="group hover:bg-[var(--card-background)]/30 rounded-lg p-3 transition-colors">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-[var(--muted-foreground)] text-xs font-medium">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${getLevelColor(entry.level)}`}>
                          {entry.level}
                        </span>
                        <span className="text-[var(--muted)] text-xs">
                          {entry.module}:{entry.line}
                        </span>
                      </div>
                      <div className="text-[var(--foreground)] leading-relaxed pl-2 border-l-2 border-[var(--border)] group-hover:border-[var(--accent)]/50 transition-colors">
                        {entry.message}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    {selectedDate ? (
                      logSearchTerm ? (
                        <>
                          <Search className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
                          <p className="text-[var(--muted-foreground)] text-lg font-light">No matching logs found</p>
                          <p className="text-[var(--muted)] text-sm mt-2">Try adjusting your search term or filter criteria</p>
                        </>
                      ) : (
                        <>
                          <FileText className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
                          <p className="text-[var(--muted-foreground)] text-lg font-light">No logs found for this date</p>
                          <p className="text-[var(--muted)] text-sm mt-2">Try selecting a different date or log type</p>
                        </>
                      )
                    ) : (
                      <>
                        <Calendar className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
                        <p className="text-[var(--muted-foreground)] text-lg font-light">Select a date to view logs</p>
                        <p className="text-[var(--muted)] text-sm mt-2">Choose a date from the dropdown in Log Controls</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsManagement;
