'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Music, 
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  ArrowLeft,
  Play,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ReviewStatus, UserRole, SubmissionErrorType } from '@prisma/client';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { getAssignedEntries, updateEntryReview, EntryScores } from '@/lib/actions/review-actions';
import { createSubmissionError } from '@/lib/actions/support-actions';
import Link from 'next/link';

interface Entry {
  id: string;
  songId: string;
  song: {
    id: string;
    title: string;
    link: string;
  };
  categoryId: string;
  category: {
    id: string;
    title: string;
    icon: string | null;
  };
  contestantId: string;
  contestant: {
    id: string;
    username: string;
    email: string | null;
  };
  competitionId: string;
  votes: any[];
  createdAt: Date;
  totalVotes?: number;
}

interface EntryReview {
  id: string;
  entryId: string;
  status: ReviewStatus;
  assignedAt: Date;
  reviewedAt?: Date | null;
  notes?: string | null;
  screenerId: string;
  overallScore?: number | null;
  entry: Entry;
}

export default function ScreeningPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [entries, setEntries] = useState<EntryReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comments, setComments] = useState('');
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [scoreAdjusted, setScoreAdjusted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState('');
  const [errorType, setErrorType] = useState<SubmissionErrorType>('BROKEN_LINK');
  const [scores, setScores] = useState<EntryScores>({
    overallScore: 0,
  });
  
  // Fetch real data from the server
  useEffect(() => {
    async function loadEntries() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get assigned entries
        const { entries, error } = await getAssignedEntries();
        
        if (error) {
          setError(error);
          setEntries([]);
        } else {
          // Cast the entries to match our EntryReview type
          setEntries(entries as EntryReview[]);
          
          // Set initial comments and scores if there is a review
          if (entries.length > 0) {
            const firstEntry = entries[0];
            setComments(firstEntry.notes || '');
            
            // Load initial scores
            setScores({
              overallScore: firstEntry.overallScore || 0,
            });
          }
        }
      } catch (err) {
        console.error('Error loading entries:', err);
        setError('Failed to load entries');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadEntries();
  }, []);
  
  const currentEntry = entries[currentIndex] || null;
  
  // Helper function to navigate to previous entry
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      const prevEntry = entries[currentIndex - 1];
      setComments(prevEntry?.notes || '');
      
      // Load previous scores if available
      setScores({
        overallScore: prevEntry?.overallScore || 0,
      });
      
      // Reset validation flags for the new entry
      setAudioPlayed(false);
      setScoreAdjusted(false);
    }
  };
  
  // Helper function to navigate to next entry
  const goToNext = () => {
    if (currentIndex < entries.length - 1) {
      setCurrentIndex(currentIndex + 1);
      const nextEntry = entries[currentIndex + 1];
      setComments(nextEntry?.notes || '');
      
      // Load next score if available
      setScores({
        overallScore: nextEntry?.overallScore || 0
      });
      
      // Reset validation flags for the new entry
      setAudioPlayed(false);
      setScoreAdjusted(false);
    }
  };
  
  // Handle overall score change
  const handleScoreChange = (value: number) => {
    setScores({ overallScore: value });
    setScoreAdjusted(true);
  };
  
  // Opens the submission error dialog
  const openErrorDialog = () => {
    setErrorDetails(comments);
    setErrorDialogOpen(true);
  };
  
  // Create a submission error and update the entry review status
  const createError = async (details: string, type: SubmissionErrorType) => {
    if (!currentEntry) return;
    
    setIsSaving(true);
    
    try {
      // First update the entry review status
      const { success: reviewSuccess, error: reviewError } = await updateEntryReview(
        currentEntry.id, 
        ReviewStatus.NEEDS_MORE_INFORMATION, 
        details, 
        scores
      );
      
      if (reviewError) {
        toast.error(reviewError);
        return false;
      }
      
      // Then create the submission error
      const { success: errorSuccess, error: errorError } = await createSubmissionError(
        currentEntry.entryId,
        currentEntry.entry.contestantId,
        type,
        details,
        {
          originalFile: currentEntry.entry.song.link,
        }
      );
      
      if (errorError) {
        toast.error(errorError);
        return false;
      }
      
      // Update the local state
      const updatedEntries = [...entries];
      updatedEntries[currentIndex] = {
        ...updatedEntries[currentIndex],
        status: ReviewStatus.NEEDS_MORE_INFORMATION,
        notes: details,
        reviewedAt: new Date()
      };
      
      setEntries(updatedEntries);
      toast.success('Submission error reported successfully');
      
      // Auto-advance to next entry
      if (currentIndex < entries.length - 1) {
        goToNext();
      }
      
      return true;
    } catch (error) {
      console.error('Error creating submission error:', error);
      toast.error('Failed to report submission error');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle submission of a review
  const submitReview = async (status: ReviewStatus, errorDetails?: string) => {
    if (!currentEntry) return;
    
    // Validate all requirements if approving
    if (status === ReviewStatus.COMPLETED) {
      if (scores.overallScore === 0) {
        toast.error('Please provide an overall score before approving');
        return;
      }
      
      if (!audioPlayed) {
        toast.error('Please listen to the audio before approving');
        return;
      }
      
      if (!comments.trim()) {
        toast.error('Please add comments before approving');
        return;
      }
    }
    
    setIsSaving(true);
    
    try {
      // Make a real API call
      const notesContent = status === ReviewStatus.NEEDS_MORE_INFORMATION && errorDetails 
        ? errorDetails 
        : comments;
      
      const { success, error } = await updateEntryReview(currentEntry.id, status, notesContent, scores);
      
      if (error) {
        toast.error(error);
        return;
      }
      
      // Update the local state
      const updatedEntries = [...entries];
      updatedEntries[currentIndex] = {
        ...updatedEntries[currentIndex],
        status,
        notes: comments,
        reviewedAt: new Date(),
        overallScore: scores.overallScore
      };
      
      setEntries(updatedEntries);
      
      const statusText = status.toLowerCase().replace('_', ' ');
      toast.success(`Entry has been ${statusText}`);
      
      // Auto-advance to next entry
      if (currentIndex < entries.length - 1) {
        goToNext();
      }
    } catch (error) {
      console.error('Error updating entry review:', error);
      toast.error('Failed to update review status');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Helper functions for UI
  const getStatusBadge = (status: ReviewStatus) => {
    const statusConfig = {
      [ReviewStatus.PENDING_REVIEW]: { color: "bg-gray-100 text-gray-800", text: "Pending Review" },
      [ReviewStatus.UNASSIGNED]: { color: "bg-gray-100 text-gray-800", text: "Unassigned" },
      [ReviewStatus.COMPLETED]: { color: "bg-green-100 text-green-800", text: "Completed" },
      [ReviewStatus.REJECTED]: { color: "bg-red-100 text-red-800", text: "Rejected" },
      [ReviewStatus.NEEDS_MORE_INFORMATION]: { color: "bg-amber-100 text-amber-800", text: "Needs Info" },
      [ReviewStatus.NEEDS_ANOTHER_REVIEW]: { color: "bg-amber-100 text-amber-800", text: "Needs Another Review" },
      [ReviewStatus.HIDDEN]: { color: "bg-gray-100 text-gray-800", text: "Hidden" }
    };
    
    const config = statusConfig[status] || statusConfig[ReviewStatus.PENDING_REVIEW];
    
    return (
      <Badge variant="outline" className={config.color}>
        {config.text}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h2 className="text-2xl font-bold mb-2">Error Loading Entries</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }
  
  if (!currentEntry) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h2 className="text-2xl font-bold mb-2">No Entries To Review</h2>
        <p className="text-gray-500 mb-4">You don't have any entries assigned for review.</p>
        <Button onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return to Dashboard
        </Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Review Entries</h1>
          <p className="text-gray-500 mt-1">Review and evaluate assigned competition entries</p>
        </div>
        <div className="flex items-center">
          <span className="text-sm font-medium mr-4">
            Entry {currentIndex + 1} of {entries.length}
          </span>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToPrevious} 
              disabled={currentIndex === 0 || isSaving}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToNext} 
              disabled={currentIndex === entries.length - 1 || isSaving}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <Card className="mb-6 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            {getStatusBadge(currentEntry.status)}
            <Badge variant="outline">{currentEntry.entry.category.title}</Badge>
          </div>
          <CardTitle className="text-2xl mt-2">{currentEntry.entry.song.title}</CardTitle>
          <CardDescription>
            <div className="flex flex-wrap gap-4 mt-1">
              <div className="flex items-center text-sm">
                <User className="mr-2 h-4 w-4 text-gray-500" />
                {currentEntry.entry.contestant.username}
              </div>
              <div className="flex items-center text-sm">
                <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                {format(new Date(currentEntry.entry.createdAt), 'MMM d, yyyy')}
              </div>
              {currentEntry.entry.totalVotes !== undefined && (
                <div className="text-sm">
                  {currentEntry.entry.totalVotes} votes
                </div>
              )}
            </div>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="bg-gray-50 rounded-md p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <Music className="h-5 w-5 text-gray-500 mr-2" />
              <span className="text-sm font-medium">Song Audio</span>
            </div>
            {currentEntry.entry.song.link ? (
              <Link href={currentEntry.entry.song.link} target="_blank" onClick={() => setAudioPlayed(true)}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`flex items-center ${audioPlayed ? 'bg-green-50 border-green-200' : ''}`}
                >
                  <Play className={`h-4 w-4 mr-2 ${audioPlayed ? 'text-green-600' : ''}`} />
                  {audioPlayed ? 'Audio Played' : 'Play Audio'}
                </Button>
              </Link>
            ) : (
              <span className="text-sm text-gray-500">No audio available</span>
            )}
          </div>
          
          {/* Scoring Section */}
          <div className="mb-6">
            <div className="text-sm font-medium mb-3">Song Score</div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Overall Score <span className="text-red-500">*</span></label>
                <span className="text-sm text-gray-500">{scores.overallScore}/10</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={scores.overallScore}
                onChange={(e) => handleScoreChange(parseInt(e.target.value))}
                className={`w-full ${scoreAdjusted ? 'accent-green-600' : ''}`}
                disabled={isSaving}
              />
              
              {/* Help text */}
              <p className="text-xs text-gray-500 mt-2">
                <span className="text-red-500">*</span> Overall score is required for approval. Slide to rate from 0-10.
              </p>
            </div>
          </div>
          
          {/* Comments Section */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Your Comments:</label>
            <Textarea 
              placeholder="Add your review comments here..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              disabled={isSaving}
              className={comments.trim() ? 'border-green-200 focus:ring-green-500' : ''}
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t bg-gray-50 p-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard')}
            disabled={isSaving}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={openErrorDialog}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HelpCircle className="mr-2 h-4 w-4" />}
              Report Submission Error
            </Button>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isSaving || !audioPlayed || !scoreAdjusted || !comments.trim()}
                      onClick={() => submitReview(ReviewStatus.COMPLETED)}
                    >
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Submit
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="p-3 max-w-xs">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Requirements to submit:</h4>
                    <ul className="text-xs space-y-1 list-disc pl-4">
                      <li className={audioPlayed ? "text-green-600" : "text-gray-500"}>Listen to the audio</li>
                      <li className={scoreAdjusted ? "text-green-600" : "text-gray-500"}>Set an overall score</li>
                      <li className={comments.trim() ? "text-green-600" : "text-gray-500"}>Add review comments</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardFooter>
      </Card>

      {/* Submission Error Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ShieldAlert className="h-5 w-5 text-amber-500 mr-2" />
              Report Submission Error
            </DialogTitle>
            <DialogDescription>
              Report a technical issue with this submission. Selecting certain types (like Broken Link) will notify the entrant; others are internal only.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Error Type</label>
              <Select value={errorType} onValueChange={(value: SubmissionErrorType) => setErrorType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select error type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BROKEN_LINK">Broken Link</SelectItem>
                  <SelectItem value="AI_DETECTED">AI Detected (Internal)</SelectItem>
                  <SelectItem value="COVER_SONG">Cover Song (Internal)</SelectItem>
                  <SelectItem value="OTHER">Other (Internal)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Error Description</label>
              <Textarea
                placeholder="Describe the specific issue with this submission..."
                value={errorDetails}
                onChange={(e) => setErrorDetails(e.target.value)}
                rows={5}
                className="w-full"
              />
            </div>

            <div className="mt-3 text-sm text-gray-500">
              <p>
                Note: Entrants are only notified for <span className="font-medium">Broken Link</span>.
                All other types are internal and may require admin review.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setErrorDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const success = await createError(errorDetails, errorType);
                if (success) {
                  setErrorDialogOpen(false);
                }
              }}
              disabled={!errorDetails.trim() || isSaving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
              Report Error
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
