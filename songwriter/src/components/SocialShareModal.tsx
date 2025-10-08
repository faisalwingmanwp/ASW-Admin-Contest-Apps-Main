'use client';

import { useState } from 'react';
import { X, Share2, Facebook, Instagram, Music } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  text: string;
  artistName?: string;
}

export default function SocialShareModal({
  isOpen,
  onClose,
  url,
  title,
  text,
  artistName = 'this artist'
}: SocialShareModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const shareOptions = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-[#1877F2] hover:bg-[#166FE5]',
      action: () => {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
        window.open(facebookUrl, '_blank', 'width=600,height=400');
      }
    },
    {
      name: 'Instagram',
      icon: Instagram,
      color: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] hover:opacity-90',
      action: () => {
        // Instagram doesn't have direct URL sharing, so we copy to clipboard with instructions
        navigator.clipboard.writeText(`${text} ${url}`)
          .then(() => {
            alert('Link copied! Open Instagram and paste this in your story or post.');
            // Optionally open Instagram web
            window.open('https://www.instagram.com/', '_blank');
          })
          .catch(() => alert('Please copy this link manually and share on Instagram: ' + url));
      }
    },
    {
      name: 'TikTok',
      icon: Music, // Using Music icon as TikTok icon substitute
      color: 'bg-[#000000] hover:bg-[#333333]',
      action: () => {
        // TikTok doesn't have direct URL sharing, so we copy to clipboard with instructions
        navigator.clipboard.writeText(`${text} ${url}`)
          .then(() => {
            alert('Link copied! Open TikTok and paste this in your video description or bio.');
            // Optionally open TikTok web
            window.open('https://www.tiktok.com/', '_blank');
          })
          .catch(() => alert('Please copy this link manually and share on TikTok: ' + url));
      }
    }
  ];

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title,
        text,
        url,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(url)
        .then(() => {
          alert('Link copied to clipboard!');
          onClose();
        })
        .catch(err => {
          console.error('Error copying to clipboard:', err);
        });
    }
  };

  const ShareContent = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Share Profile</h2>
        <button 
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="mb-6">
        <p className="text-gray-600 text-sm">
          Help {artistName} get more votes by sharing their profile with your friends and followers!
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {shareOptions.map((option) => (
          <Button
            key={option.name}
            onClick={option.action}
            className={`w-full ${option.color} text-white py-4 h-auto flex items-center justify-center gap-3 text-base font-medium`}
          >
            <option.icon className="h-5 w-5" />
            Share on {option.name}
          </Button>
        ))}
      </div>

      <div className="border-t pt-4">
        <Button
          onClick={handleNativeShare}
          variant="outline"
          className="w-full py-3 h-auto flex items-center justify-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          More sharing options
        </Button>
      </div>
    </div>
  );

  // Use Drawer for mobile, Dialog for desktop
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-w-md mx-auto rounded-t-xl">
          <ShareContent />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle className="sr-only">Share Profile</DialogTitle>
      <DialogContent className="max-w-md p-0 gap-0 rounded-xl">
        <ShareContent />
      </DialogContent>
    </Dialog>
  );
} 