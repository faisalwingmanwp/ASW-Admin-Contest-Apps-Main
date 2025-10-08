"use client";

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface LoadingProgressProps {
  messages?: string[];
  className?: string;
}

const defaultMessages = [
  'Crunching the numbers...',
  'Calculating votes...',
  'Gathering entries...',
  'Analyzing submissions...',
  'Preparing your review queue...',
  'Loading song details...',
  'Organizing categories...',
  'Almost ready...'
];

export function LoadingProgress({ 
  messages = defaultMessages, 
  className = "h-64" 
}: LoadingProgressProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    let messageInterval: NodeJS.Timeout;
    let messageIndex = 0;
    
    // Set initial message
    setLoadingMessage(messages[0]);
    
    // Progress bar animation
    progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 95) return 95; // Don't complete until actually done
        return prev + Math.random() * 15; // Random increments for realistic feel
      });
    }, 200);
    
    // Message cycling
    messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingMessage(messages[messageIndex]);
    }, 1500);
    
    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [messages]);

  return (
    <div className={`flex flex-col justify-center items-center space-y-6 ${className}`}>
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-700">{loadingMessage}</p>
          <div className="w-80 space-y-2">
            <Progress value={loadingProgress} className="h-2" />
            <p className="text-sm text-gray-500">{Math.round(loadingProgress)}% complete</p>
          </div>
        </div>
      </div>
    </div>
  );
} 