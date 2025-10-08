"use client";

import Link from 'next/link';
import { Button } from './ui/button';

interface ScrollToMusicButtonProps {
  slug: string;
}

export default function ScrollToMusicButton({ slug }: ScrollToMusicButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('music-section')?.scrollIntoView({behavior: 'smooth'});
  };

  return (
    <Link 
      href={`#music-section`} 
      className="mb-4 md:mb-5 w-full"
      onClick={handleClick}
    >
      <div className="relative w-full rounded-lg border-1 border-white p-1">
        <Button 
          className="w-full py-4 md:py-7 text-2xl font-bold rounded-lg bg-white text-black hover:bg-white hover:bg-opacity-90 transition-colors shadow-md border-none"
        >
          Vote Now
        </Button>
      </div>
    </Link>
  );
} 