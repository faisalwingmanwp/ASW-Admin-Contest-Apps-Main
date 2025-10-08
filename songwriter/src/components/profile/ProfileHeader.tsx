'use client';

import { useState, useEffect } from 'react';
import { updateContestantProfile } from '@/lib/contestant-actions';
import { Button } from '../ui/button';
import { PencilIcon, Share2Icon } from 'lucide-react';
import ProfilePhotoUpload from './ProfilePhotoUpload';
import ProfileEditDialog from './ProfileEditDialog';
import { useRouter } from 'next/navigation';
import MenuButton from '@/components/MenuButton';
import Link from 'next/link';
import SocialShareModal from '@/components/SocialShareModal';

interface ProfileHeaderProps {
  contestant: {
    id: string;
    username: string;
    firstName?: string | null;
    lastName?: string | null;
    bio: string | null;
    profilePhoto: string | null;
  };
  totalVotes: number;
  hasMembership: boolean;
}

// Client component for share button with share functionality
function ShareProfileButton({ shareUrl, shareTitle }: { shareUrl: string, shareTitle: string }) {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: `Check out my profile on American Songwriter Contest!`,
        url: shareUrl,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(shareUrl)
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
      onClick={handleShare}
      className="bg-white/20 hover:bg-white/30 transition-colors rounded-full p-2.5"
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

export default function ProfileHeader({ contestant, totalVotes, hasMembership }: ProfileHeaderProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const router = useRouter();
  
  // Construct the proper image URL
  const profileImageUrl = contestant.profilePhoto 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-photos/${contestant.profilePhoto}`
    : '/default.png';
  
  // Get full name if available, or just username
  const fullName = contestant.firstName && contestant.lastName 
    ? `${contestant.firstName} ${contestant.lastName}`
    : contestant.firstName || contestant.lastName || contestant.username;
  
  // Handle profile photo update
  const handlePhotoChange = async (photoPath: string) => {
    try {
      await updateContestantProfile({
        username: contestant.username,
        firstName: contestant.firstName || undefined,
        lastName: contestant.lastName || undefined,
        bio: contestant.bio || undefined,
        profilePhoto: photoPath,
      });
      
      // Refresh the page to show updated photo
      router.refresh();
    } catch (error) {
      console.error('Error updating profile photo:', error);
    }
  };
  
  // Create share URL and title
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/${contestant.username}`;
  const shareTitle = `Check out ${fullName} on American Songwriter Contest`;
  
  return (
    <>

      {/* Artist Cover Section */}
      <div className="relative w-full h-[500px] md:h-[600px]">
        <img 
          src={profileImageUrl}
          alt={contestant.username}
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 768px"
        />
        
        {/* Overlay with artist name and buttons */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 flex flex-col justify-end p-8">
          {/* Eye icon for preview in top right */}
          {hasMembership ? (
            <a 
              href={`/${contestant.username}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="absolute top-4 right-4 bg-white flex flex-row items-center gap-3 rounded-lg py-2 px-4 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Preview public profile"
            >
              <svg width="19" height="16" viewBox="0 0 19 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M6.1232 6.57954C7.81972 6.57954 9.2005 5.1987 9.2005 3.50224C9.2005 1.80577 7.81966 0.423401 6.1232 0.423401C4.42674 0.423401 3.0459 1.80424 3.0459 3.50224C3.0459 5.20099 4.42674 6.57954 6.1232 6.57954ZM6.1232 1.18938C7.39859 1.18938 8.43453 2.22763 8.43453 3.50224C8.43453 4.77762 7.39627 5.81356 6.1232 5.81356C4.85013 5.81356 3.81187 4.7753 3.81187 3.50224C3.81187 2.22911 4.85013 1.18938 6.1232 1.18938Z" fill="black"/> <path d="M13.3597 6.74769C14.9163 6.74769 16.1842 5.4798 16.1842 3.92316C16.1842 2.36653 14.9163 1.09863 13.3597 1.09863C11.8031 1.09863 10.5352 2.36653 10.5352 3.92316C10.5352 5.4798 11.8031 6.74769 13.3597 6.74769ZM13.3597 1.86461C14.4952 1.86461 15.4182 2.78766 15.4182 3.92316C15.4182 5.05866 14.4952 5.98172 13.3597 5.98172C12.2242 5.98172 11.3011 5.05866 11.3011 3.92316C11.3011 2.78766 12.2242 1.86461 13.3597 1.86461Z" fill="black"/> <path d="M18.4861 12.4873C18.4748 9.67022 16.1807 7.38206 13.3613 7.38206C12.0553 7.38206 10.797 7.88548 9.85161 8.77637C8.85974 7.89519 7.55369 7.35962 6.12726 7.35962C3.03636 7.35962 0.520131 9.86857 0.511131 12.957C0.493927 13.141 0.422864 14.1845 1.06242 14.9064C1.45514 15.3507 2.01989 15.5766 2.74023 15.5766H9.51872C10.2391 15.5766 10.8038 15.3507 11.1965 14.9064C11.1988 14.9041 11.2003 14.9026 11.2025 14.8989H16.4357C17.0984 14.8989 17.619 14.6902 17.9826 14.2803C18.5668 13.6198 18.5069 12.6638 18.4897 12.4895L18.4861 12.4873ZM9.51286 14.8076H2.73571C2.24576 14.8076 1.87623 14.67 1.63462 14.3999C1.17684 13.8846 1.27109 13.0311 1.27109 13.0228C1.27109 13.0079 1.27334 12.9922 1.27334 12.9772C1.27334 10.3022 3.45081 8.12705 6.12349 8.12705C8.79693 8.12705 10.9736 10.3022 10.9736 12.9772C10.9736 12.9922 10.9736 13.0079 10.9759 13.0228C10.9759 13.0303 11.0694 13.8868 10.6124 14.4014C10.3707 14.6737 9.99972 14.8091 9.51126 14.8091L9.51286 14.8076ZM17.4022 13.7739C17.1875 14.0155 16.8696 14.1322 16.4313 14.1322H11.6169C11.789 13.5906 11.7546 13.0789 11.7411 12.9563C11.7351 11.5702 11.2257 10.3024 10.3857 9.32383C11.1898 8.57505 12.255 8.15018 13.3598 8.15018C15.7632 8.15018 17.7186 10.1055 17.7186 12.509C17.7186 12.5239 17.7186 12.5396 17.7208 12.5546C17.7208 12.5621 17.8053 13.3206 17.4007 13.7746L17.4022 13.7739Z" fill="black"/> <circle cx="6.24439" cy="3.48725" r="2.68091" fill="black"/> <path d="M1.3615 10.9555L0.978516 12.8705L1.26576 14.7854L2.60621 15.2641H9.11699L10.9362 14.7854L11.4149 12.9662L10.7447 10.764L9.49998 8.84909L7.2978 7.98737H4.90413L2.31897 9.23207L1.3615 10.9555Z" fill="black"/> </svg>
              Public Profile
            </a>
          ) : (
            <a 
              href="/membership" 
              className="absolute top-4 right-4 bg-[#D33F49] text-white flex flex-row items-center gap-3 rounded-lg py-2 px-4 hover:bg-[#C03541] transition-colors cursor-pointer"
              aria-label="Join competition"
            >
              <svg width="19" height="16" viewBox="0 0 19 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M6.1232 6.57954C7.81972 6.57954 9.2005 5.1987 9.2005 3.50224C9.2005 1.80577 7.81966 0.423401 6.1232 0.423401C4.42674 0.423401 3.0459 1.80424 3.0459 3.50224C3.0459 5.20099 4.42674 6.57954 6.1232 6.57954ZM6.1232 1.18938C7.39859 1.18938 8.43453 2.22763 8.43453 3.50224C8.43453 4.77762 7.39627 5.81356 6.1232 5.81356C4.85013 5.81356 3.81187 4.7753 3.81187 3.50224C3.81187 2.22911 4.85013 1.18938 6.1232 1.18938Z" fill="white"/> <path d="M13.3597 6.74769C14.9163 6.74769 16.1842 5.4798 16.1842 3.92316C16.1842 2.36653 14.9163 1.09863 13.3597 1.09863C11.8031 1.09863 10.5352 2.36653 10.5352 3.92316C10.5352 5.4798 11.8031 6.74769 13.3597 6.74769ZM13.3597 1.86461C14.4952 1.86461 15.4182 2.78766 15.4182 3.92316C15.4182 5.05866 14.4952 5.98172 13.3597 5.98172C12.2242 5.98172 11.3011 5.05866 11.3011 3.92316C11.3011 2.78766 12.2242 1.86461 13.3597 1.86461Z" fill="white"/> <path d="M18.4861 12.4873C18.4748 9.67022 16.1807 7.38206 13.3613 7.38206C12.0553 7.38206 10.797 7.88548 9.85161 8.77637C8.85974 7.89519 7.55369 7.35962 6.12726 7.35962C3.03636 7.35962 0.520131 9.86857 0.511131 12.957C0.493927 13.141 0.422864 14.1845 1.06242 14.9064C1.45514 15.3507 2.01989 15.5766 2.74023 15.5766H9.51872C10.2391 15.5766 10.8038 15.3507 11.1965 14.9064C11.1988 14.9041 11.2003 14.9026 11.2025 14.8989H16.4357C17.0984 14.8989 17.619 14.6902 17.9826 14.2803C18.5668 13.6198 18.5069 12.6638 18.4897 12.4895L18.4861 12.4873ZM9.51286 14.8076H2.73571C2.24576 14.8076 1.87623 14.67 1.63462 14.3999C1.17684 13.8846 1.27109 13.0311 1.27109 13.0228C1.27109 13.0079 1.27334 12.9922 1.27334 12.9772C1.27334 10.3022 3.45081 8.12705 6.12349 8.12705C8.79693 8.12705 10.9736 10.3022 10.9736 12.9772C10.9736 12.9922 10.9736 13.0079 10.9759 13.0228C10.9759 13.0303 11.0694 13.8868 10.6124 14.4014C10.3707 14.6737 9.99972 14.8091 9.51126 14.8091L9.51286 14.8076ZM17.4022 13.7739C17.1875 14.0155 16.8696 14.1322 16.4313 14.1322H11.6169C11.789 13.5906 11.7546 13.0789 11.7411 12.9563C11.7351 11.5702 11.2257 10.3024 10.3857 9.32383C11.1898 8.57505 12.255 8.15018 13.3598 8.15018C15.7632 8.15018 17.7186 10.1055 17.7186 12.509C17.7186 12.5239 17.7186 12.5396 17.7208 12.5546C17.7208 12.5621 17.8053 13.3206 17.4007 13.7746L17.4022 13.7739Z" fill="white"/> <circle cx="6.24439" cy="3.48725" r="2.68091" fill="white"/> <path d="M1.3615 10.9555L0.978516 12.8705L1.26576 14.7854L2.60621 15.2641H9.11699L10.9362 14.7854L11.4149 12.9662L10.7447 10.764L9.49998 8.84909L7.2978 7.98737H4.90413L2.31897 9.23207L1.3615 10.9555Z" fill="white"/> </svg>
              Join Competition
            </a>
          )}
          
          {/* Profile Photo Upload above text */}
          <div className="flex flex-col items-center mb-2">
            <div className="relative w-24 h-24 mb-4">
              <ProfilePhotoUpload 
                currentPhoto={profileImageUrl} 
                userId={contestant.id}
                onPhotoChange={handlePhotoChange} 
              />
            </div>
          </div>
          
          {/* Artist name and share message */}
          <div className="text-center">
            <h1 className="text-white text-5xl font-bold mb-3">{fullName}</h1>
            <p className="text-white text-xl mb-8">Share your profile with fans to boost your votes!</p>
          </div>
          
          {/* Bottom buttons */}
          <div className="flex flex-col md:flex-row w-full gap-4">
            <Button 
              onClick={() => setIsEditDialogOpen(true)}
              className={`${hasMembership ? 'flex-1' : 'w-full'} bg-white hover:bg-gray-100 text-black py-4 px-6 h-auto flex items-center justify-center text-xl font-semibold rounded-lg`}
            >
              <PencilIcon className="h-6 w-6 mr-3" />
              Edit Profile Info
            </Button>
            
            {hasMembership && (
              <Button 
                onClick={() => setShowShareModal(true)}
                className="flex-1 bg-[#D33F49] hover:bg-[#C03541] text-white py-4 px-6 h-auto flex items-center justify-center text-xl font-semibold rounded-lg"
              >
                <Share2Icon className="h-6 w-6 mr-3" />
                Share Profile
              </Button>
            )}
          </div>
        </div>
        
        {/* Edit Profile Dialog/Drawer */}
        <ProfileEditDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          contestantId={contestant.id}
          username={contestant.username}
          firstName={contestant.firstName}
          lastName={contestant.lastName}
          bio={contestant.bio}
          onSuccess={() => router.refresh()}
        />

        {/* Social Share Modal */}
        <SocialShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          url={shareUrl}
          title={shareTitle}
          text={`Check out my profile on American Songwriter Contest!`}
          artistName={fullName}
        />
      </div>
    </>
  );
}