"use client";

import { useEffect } from 'react';

interface ActivityTrackerProps {
  onActivity: () => void;
}

export function ActivityTracker({ onActivity }: ActivityTrackerProps) {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleActivity = () => {
      // Debounce activity updates to avoid too frequent calls
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        onActivity();
      }, 1000); // Update activity every 1 second at most
    };

    // Track various user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [onActivity]);

  return null; // This component doesn't render anything
}
