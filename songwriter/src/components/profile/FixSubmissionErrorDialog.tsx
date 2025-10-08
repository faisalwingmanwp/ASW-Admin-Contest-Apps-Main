'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { resolveSubmissionError } from "@/lib/support-actions";
import { toast } from "sonner";

interface FixSubmissionErrorDialogProps {
  errorId: string;
  songId: string;
  songTitle: string;
  currentLink: string;
  errorMessage: string;
  onResolved?: (newLink: string) => void;
}

export default function FixSubmissionErrorDialog({ 
  errorId,
  songId,
  songTitle,
  currentLink,
  errorMessage,
  onResolved
}: FixSubmissionErrorDialogProps) {
  const [open, setOpen] = useState(false);
  const [newLink, setNewLink] = useState(currentLink);
  const [isResolving, setIsResolving] = useState(false);
  
  const handleResolve = async () => {
    try {
      setIsResolving(true);
      
      if (!newLink || newLink.trim() === '') {
        toast.error('Please enter a valid link');
        return;
      }
      
      const result = await resolveSubmissionError(errorId, songId, newLink);
      
      if (result.success) {
        toast.success('Submission error resolved successfully!');
        
        // Call the onResolved callback if provided
        if (onResolved) {
          onResolved(newLink);
        }
        
        setOpen(false);
      } else {
        throw new Error(result.error || 'Failed to resolve error');
      }
    } catch (error) {
      console.error('Failed to resolve submission error:', error);
      toast.error('Failed to resolve submission error');
    } finally {
      setIsResolving(false);
    }
  };

  const testLink = () => {
    if (newLink) {
      window.open(newLink, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Fix Broken Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Fix Submission Error
          </DialogTitle>
          <DialogDescription>
            There's an issue with your song submission that needs to be resolved.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Song Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm text-gray-900 mb-1">Song:</h4>
            <p className="text-sm text-gray-700">{songTitle}</p>
          </div>
          
          {/* Error Message */}
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
            <h4 className="font-medium text-sm text-red-900 mb-1">Issue:</h4>
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
          
          {/* Current Link */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current-link" className="text-right text-sm">
              Current Link
            </Label>
            <div className="col-span-3">
              <Input
                id="current-link"
                value={currentLink}
                disabled
                className="bg-gray-100 text-gray-500"
              />
            </div>
          </div>
          
          {/* New Link */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-link" className="text-right text-sm">
              New Link *
            </Label>
            <div className="col-span-3 space-y-2">
              <Input
                id="new-link"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="Enter the corrected link..."
                className="w-full"
              />
              {newLink && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testLink}
                  className="w-fit"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Test Link
                </Button>
              )}
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <p className="text-sm text-blue-700">
              Please make sure your new link is working correctly before submitting. 
              Once resolved, your submission will be reviewed again.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleResolve} 
            disabled={isResolving || !newLink || newLink.trim() === ''}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isResolving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resolving...
              </>
            ) : (
              'Resolve Issue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 