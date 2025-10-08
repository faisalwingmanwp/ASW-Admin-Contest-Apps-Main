"use client";

import { useState } from 'react';

interface ExpandableTextProps {
  text: string;
  maxLines?: number;
  className?: string;
}

export default function ExpandableText({
  text,
  maxLines = 3,
  className = "text-gray-600 text-md md:text-base"
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <div>
      <p 
        className={`${className} ${expanded ? '' : `line-clamp-${maxLines}`}`}
      >
        {text || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt...'}
      </p>
      {text && text.length > 140 && (
        <button 
          className="text-black font-medium mt-1 text-sm md:text-base hover:underline"
          onClick={toggleExpanded}
        >
          {expanded ? 'See less' : 'See more'}
        </button>
      )}
    </div>
  );
} 