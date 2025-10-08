'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { 
  Dialog, 
  DialogContent,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerClose
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { CheckIcon, XIcon } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { DialogTitle } from '@radix-ui/react-dialog';
import SocialShareModal from '@/components/SocialShareModal';

interface VoteConfirmationDialogProps {
  artistName: string;
  artistImage: string;
  prizeAmount?: string;
}

export default function VoteConfirmationDialog({
  artistName,
  artistImage,
  prizeAmount = '$5,000'
}: VoteConfirmationDialogProps) {
  const [open, setOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const searchParams = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // Check for vote confirmation parameter
  useEffect(() => {
    if (searchParams.get('voteConfirmed') === 'true') {
      setOpen(true);
    }
  }, [searchParams]);

  // Handle closing the dialog and removing the query parameter
  const handleClose = () => {
    setOpen(false);
    const url = window.location.pathname;
    window.history.replaceState({}, '', url);
  };

  // Handle Share Profile button - now opens the social share modal
  const handleShare = () => {
    setShowShareModal(true);
  };

  // The content is shared between Dialog and Drawer
  const ConfirmationContent = () => (
    <div className="flex flex-col items-center p-8">
      <div className="relative mb-6">
        <div className="relative h-24 w-24 rounded-lg overflow-hidden border border-gray-100">
          <img
            src={artistImage}
            alt={artistName}
            className="object-cover"
          />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-black rounded-full p-1.5">
          <CheckIcon className="h-5 w-5 text-white" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold mb-3">Vote Submitted!</h2>
      
      <p className="text-center text-gray-600 mb-8">
        You're helping {artistName} win {prizeAmount} and more. 
        Keep the momentum—share their profile and get your friends to vote!
      </p>
      
      <div className="w-full space-y-3">
        <Button 
          onClick={handleShare}
          className="w-full bg-black hover:bg-gray-800 text-white py-5 rounded-md"
        >
          Share Profile
        </Button>
        
        <Button 
          onClick={handleClose}
          variant="outline" 
          className="w-full border-gray-200 text-gray-700 py-5 rounded-md"
        >
          No thanks
        </Button>
      </div>
    </div>
  );

  // Close button for Dialog
  const CloseButton = () => (
    <button 
      onClick={handleClose} 
      className="absolute top-4 right-4 z-10 text-black bg-white rounded-full p-1.5 hover:bg-gray-100"
    >
      <XIcon className="h-4 w-4" />
    </button>
  );
  
  // Use Drawer for mobile, Dialog for desktop
  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={(newOpen) => {
          if (!newOpen) handleClose();
          setOpen(newOpen);
        }}>
          <DrawerContent className="max-w-md mx-auto rounded-t-xl">
            <CloseButton />
            <ConfirmationContent />
          </DrawerContent>
        </Drawer>

        <SocialShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          url={window.location.href.split('?')[0]}
          title={`Vote for ${artistName}`}
          text={`I just voted for ${artistName}. Help them win ${prizeAmount} and more!`}
          artistName={artistName}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen) => {
        if (!newOpen) handleClose();
        setOpen(newOpen);
      }}>
        <DialogTitle></DialogTitle>
        <DialogContent 
          className="max-w-md p-0 gap-0 rounded-xl border-none" 
          onPointerDownOutside={handleClose}
          onEscapeKeyDown={handleClose}
        >
          <CloseButton />
          <ConfirmationContent />
        </DialogContent>
      </Dialog>

      <SocialShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={window.location.href.split('?')[0]}
        title={`Vote for ${artistName}`}
        text={`I just voted for ${artistName}. Help them win ${prizeAmount} and more!`}
        artistName={artistName}
      />
    </>
  );
} 