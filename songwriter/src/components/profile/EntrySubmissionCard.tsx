'use client';

import { Button } from '../ui/button';
import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, PlayCircle, Check, Clock, ExternalLink, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import FixSubmissionErrorDialog from './FixSubmissionErrorDialog';
import { getAllCategories } from '@/lib/category-actions';
import { getSubmissionTickets } from '@/lib/support-actions';
import { ErrorStatus } from '@prisma/client';
import { Badge } from "../ui/badge";

interface Category {
  id: string;
  title: string;
}

interface Entry {
  id: string;
  category: {
    id: string;
    title: string;
  };
  paid: boolean;
}

interface SongData {
  song: {
    id: string;
    title: string;
    link: string;
  };
  entries: Entry[];
  totalVotes: number;
  categories: Category[];
  isPaid: boolean;
  competition: {
    id: string;
    name: string;
    open: boolean;
    price?: number;
  };
}

interface SubmissionError {
  id: string;
  entryId: string;
  status: ErrorStatus;
  errorMessage: string;
  errorType: string;
  createdAt: Date;
  Entry: {
    song: {
      title: string;
    };
  };
}

interface EntrySubmissionCardProps {
  songData: SongData;
}

export default function EntrySubmissionCard({ songData }: EntrySubmissionCardProps) {
  const { song, totalVotes, isPaid, categories, entries, competition } = songData;
  const [isLoading, setIsLoading] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [submissionErrors, setSubmissionErrors] = useState<SubmissionError[]>([]);
  const [hasActiveErrors, setHasActiveErrors] = useState(false);
  const [activeError, setActiveError] = useState<SubmissionError | null>(null);
  
  // Local state for song details that can be updated
  const [songTitle, setSongTitle] = useState(song.title);
  const [songLink, setSongLink] = useState(song.link);
  
  const firstEntry = entries[0];
  const entryId = firstEntry?.id || '';
  
  // Fetch all available categories and submission errors when component mounts
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch categories
        const categories = await getAllCategories();
        setAvailableCategories(categories);
        
        // Fetch submission errors
        const allErrors = await getSubmissionTickets();
        
        // Filter errors for this entry
        const entryErrors = allErrors.filter((error: SubmissionError) => 
          entries.some((entry: Entry) => entry.id === error.entryId)
        );
        
        setSubmissionErrors(entryErrors);
        
        // Check if there are any active errors and get the first one
        const activeErrors = entryErrors.filter((error: SubmissionError) => 
          error.status === 'DETECTED' || error.status === 'IN_PROGRESS'
        );
        
        setHasActiveErrors(activeErrors.length > 0);
        setActiveError(activeErrors[0] || null);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    }
    
    fetchData();
  }, [entries]);
    
  const handlePlaySong = () => {
    // Open song in a new tab or play it
    if (songLink) {
      window.open(songLink, '_blank');
    }
  };
  
  const handleFinishEntry = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/create-payment-intent/existing-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        console.error(data.error);
        alert('Error creating checkout session: ' + data.error);
        setIsLoading(false);
        return;
      }
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
      
    } catch (error) {
      console.error('Checkout error:', error);
      setIsLoading(false);
      alert('Something went wrong. Please try again.');
    }
  };

  const handleErrorResolved = (newLink: string) => {
    setSongLink(newLink);
    setHasActiveErrors(false);
    setActiveError(null);
  };
  
  // Function to render the status badge
  const renderStatusBadge = () => {
    if (hasActiveErrors) {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <AlertTriangle className="h-3 w-3 mr-1" /> Needs Fix
        </Badge>
      );
    }
    
    console.log('competition', competition);
    console.log('isPaid', isPaid);
    if (!isPaid && (competition.price ?? 0) > 0) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Clock className="h-3 w-3 mr-1" /> Unpaid
        </Badge>
      );
    }
    
    if (competition.open) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Check className="h-3 w-3 mr-1" /> Judging in Progress
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        <Clock className="h-3 w-3 mr-1" /> Completed
      </Badge>
    );
  };
  
  return (
    <div className={`mb-4 bg-white overflow-hidden rounded-2xl ${hasActiveErrors ? 'border-2 border-red-200 shadow-lg' : ''}`}>
      {/* Header with status and votes */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {renderStatusBadge()}
          
          {/* Competition pill */}
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
            {competition.name}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {isPaid && !hasActiveErrors && (
            <div className="text-gray-700 font-medium flex items-center gap-1">
              <span className="font-semibold">{totalVotes}</span>
              <span className="text-sm">{totalVotes === 1 ? 'vote' : 'votes'}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Main content */}
      <div className="px-4 pb-4">
        <div className="flex gap-4 items-center">
          {/* Play button */}
          <button 
            onClick={handlePlaySong}
            className={`flex-shrink-0 h-12 w-12 ${hasActiveErrors ? 'bg-red-100 hover:bg-red-200' : 'bg-gray-100 hover:bg-gray-200'} rounded-full flex items-center justify-center transition-colors`}
            aria-label="Play track"
            title={songLink}
          >
            <PlayCircle className={`h-7 w-7 ${hasActiveErrors ? 'text-red-600' : 'text-[#D33F49]'}`} />
          </button>
          
          <div className="flex-grow">
            {/* Song title */}
            <h3 className={`text-lg font-medium ${hasActiveErrors ? 'text-red-800' : ''}`}>{songTitle}</h3>
            
            {/* Categories */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {categories.map((cat) => (
                <Badge 
                  key={cat.id} 
                  variant="outline" 
                  className="bg-red-50 text-red-700 border-red-100 hover:bg-red-100"
                >
                  {cat.title}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {!isPaid && (competition.price ?? 0) > 0 ? (
              <Button 
                onClick={handleFinishEntry}
                className="bg-[#D33F49] hover:bg-[#C03541] text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : (
                  'Complete Payment'
                )}
              </Button>
            ) : hasActiveErrors && activeError ? (
              <FixSubmissionErrorDialog
                errorId={activeError.id}
                songId={song.id}
                songTitle={songTitle}
                currentLink={songLink}
                errorMessage={activeError.errorMessage}
                onResolved={handleErrorResolved}
              />
            ) : null}
          </div>
        </div>
        
        {/* Submission error alerts */}
        {hasActiveErrors && activeError && (
          <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-600" />
              <div className="flex-grow">
                <h4 className="font-semibold text-red-900 mb-2">Submission Error - Action Required</h4>
                <p className="text-sm text-red-700 mb-3">{activeError.errorMessage}</p>
                <p className="text-xs text-red-600">
                  Your submission cannot be reviewed until this issue is resolved. Please fix the broken link above.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
