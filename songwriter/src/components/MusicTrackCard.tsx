"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from './ui/button';
import { SongData } from '@/app/[slug]/page';

interface MusicTrackCardProps {
  songData: SongData;
  artist: string;
  artistSlug: string;
  coverImage?: string;
}

export default function MusicTrackCard({
  songData,
  artist,
  artistSlug,
  coverImage = '/album-cover.jpg'
}: MusicTrackCardProps) {

  const handlePlay = () => {
    // Implementation of play functionality
    console.log(`Playing ${songData.song.title}`);
    
    // Open Spotify URL if available
    if (songData.song.link) {
      window.open(songData.song.link, '_blank');
    }
  };

  const handleShare = () => {
    // Implementation of share functionality
    console.log(`Sharing ${songData.song.title}`);
    
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: `${songData.song.title} by ${artist}`,
        text: `Check out this song: ${songData.song.title} by ${artist}`,
        url: window.location.href,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Error copying to clipboard:', err));
    }
  };

  // Use either individual entryId or the first entry from entryIds array
  const effectiveEntryId = songData.entryIds && songData.entryIds.length > 0 ? songData.entryIds[0] : undefined;
  
  // Construct vote URL with songId and all entryIds if available
  let voteUrl = artistSlug && effectiveEntryId ? `/${artistSlug}/vote?entry=${effectiveEntryId}` : undefined;
  if (artistSlug && songData.song.id && songData.entryIds && songData.entryIds.length > 0) {
    voteUrl = `/${artistSlug}/vote?songId=${songData.song.id}&entries=${songData.entryIds.join(',')}`;
  }

  return (
    <div className="border-b py-4 last:border-b-0">
      {/* Song Name and Contest Information */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {/* Play button circle */}
          <div 
            className="h-14 w-14 relative mr-3 flex-shrink-0 rounded-full overflow-hidden bg-gray-200"
          >
            <button 
              className="absolute inset-0 flex items-center justify-center"
              onClick={handlePlay}
              aria-label="Play track"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="black" viewBox="0 0 24 24" className="w-7 h-7">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">{songData.song.title}</h3>
            <div className="flex flex-col gap-2">
              {/* Competition info */}
              {songData.competition && (
                <div className="flex items-center gap-2">
                  {!songData.competition.open && (
                    <div className="rounded-full px-3 py-0.5 text-xs flex items-center bg-gray-500 text-white">
                      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-white"></span>
                      Closed
                    </div>
                  )}
                  <div className="rounded-full border border-gray-300 px-3 py-0.5 text-xs">
                    {songData.competition.name}
                  </div>
                </div>
              )}
              
              {/* Categories display */}
              {songData.categories && songData.categories.length > 0 && (
                <div className="flex items-center">
                  <div className="flex flex-wrap gap-1.5">
                    {songData.categories.length <= 3 ? (
                      songData.categories.map((cat, index) => (
                        <span key={cat.id} className="rounded-md bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 text-xs font-medium">
                          {cat.title}
                          {index < songData.categories.length - 1 && songData.categories.length > 1 && songData.categories.length <= 3 && 
                            <span className="text-gray-400 ml-1 mr-0.5">•</span>
                          }
                        </span>
                      ))
                    ) : (
                      <>
                        {songData.categories.slice(0, 2).map((cat, index) => (
                          <span key={cat.id} className="rounded-md bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 text-xs font-medium">
                            {cat.title}
                            <span className="text-gray-400 ml-1 mr-0.5">•</span>
                          </span>
                        ))}
                        <span className="rounded-md bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 text-xs font-medium">
                          +{songData.categories.length - 2} more
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Vote Button */}
        {voteUrl ? (
          <Link href={voteUrl} className="block text-center">
            <Button 
              className="bg-[#D33F49] hover:bg-[#C03541] text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              Free Vote
            </Button>
            <div className="text-gray-600 text-sm text-center mt-2">{songData.totalVotes.toLocaleString()} votes</div>
          </Link>
        ) : (
          <div className="text-center">
            <Button 
              className="bg-[#D33F49] hover:bg-[#C03541] text-white"
              disabled
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              Free Vote
            </Button>
            <div className="text-gray-600 text-sm text-center mt-2">{songData.totalVotes.toLocaleString()} votes</div>
          </div>
        )}
      </div>
    </div>
  );
} 