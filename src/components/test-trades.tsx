"use client";

import React, { useState } from "react";

interface TestProps {
  title: string;
}

export function TestTrades({ title }: TestProps) {
  const [showOldTrades, setShowOldTrades] = useState(false);

  // Helper function to check if a date is today
  const isToday = (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Component for rendering trades table
  const TradesTable = ({ trades, title, showCollapse = false, isCollapsed = false, onToggle }: {
    trades: any[];
    title: string;
    showCollapse?: boolean;
    isCollapsed?: boolean;
    onToggle?: () => void;
  }) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          {showCollapse && (
            <button onClick={onToggle}>
              Toggle
            </button>
          )}
        </div>
        <div>Content here</div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h1>{title}</h1>
      <TradesTable 
        trades={[]}
        title="Today's Trades"
      />
    </div>
  );
}
