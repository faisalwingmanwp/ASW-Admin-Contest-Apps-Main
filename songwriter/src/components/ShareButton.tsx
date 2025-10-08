'use client';

import { useState } from 'react';

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
}

export default function ShareButton({ url, title, text }: ShareButtonProps) {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: title,
        text: text || `Check out my profile on American Songwriter Contest!`,
        url: url,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(url)
        .then(() => {
          alert('Link copied to clipboard');
        })
        .catch(err => {
          console.error('Error copying to clipboard:', err);
        });
    }
  };

  return (
    <button 
      className="bg-white/20 hover:bg-white/30 transition-colors rounded-full p-2.5"
      onClick={handleShare}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        className="w-6 h-6 text-white"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" 
        />
      </svg>
    </button>
  );
} 