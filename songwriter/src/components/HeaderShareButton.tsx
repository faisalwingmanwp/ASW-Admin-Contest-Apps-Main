"use client";

import { useState } from "react";
import { Share } from "lucide-react";
import SocialShareModal from "./SocialShareModal";

type HeaderShareButtonProps = {
  url?: string;
  title?: string;
  artistName?: string;
}

export default function HeaderShareButton({ 
  url, 
  title = "Check out this artist on American Songwriter Contests",
  artistName
}: HeaderShareButtonProps) {
  const [showShareModal, setShowShareModal] = useState(false);

  const handleShare = () => {
    setShowShareModal(true);
  };

  const shareUrl = url || window.location.href;
  const shareText = `Check out ${artistName || 'this artist'} on American Songwriter Contest!`;

  return (
    <>
      <button 
        onClick={handleShare}
        className="bg-white rounded-full p-2 hover:bg-gray-100 transition-colors"
        aria-label="Share this page"
      >
        <Share></Share>
      </button>

      <SocialShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={shareUrl}
        title={title}
        text={shareText}
        artistName={artistName}
      />
    </>
  );
} 