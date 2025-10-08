'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import type { VotePackWithProduct } from './VotePackSelect';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitFreeVote } from '@/lib/vote-actions';

// Declare grecaptcha for TypeScript
declare global {
  interface Window {
    grecaptcha: any;
  }
}

interface VoteContainerProps {
  votePacks: VotePackWithProduct[];
  contestantId: string;
  contestantUsername: string;
  contestantProfilePhoto: string;
  entryId?: string;
  songId?: string;
  entryIds?: string[];
  songTitle: string;
}

export default function VoteContainer({ 
  votePacks, 
  contestantId,
  contestantUsername,
  contestantProfilePhoto,
  entryId,
  songId,
  entryIds = [],
  songTitle
}: VoteContainerProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingVotePack, setProcessingVotePack] = useState<VotePackWithProduct | null>(null);
  const [supporterName, setSupporterName] = useState('');
  const [supporterEmail, setSupporterEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [honeypot, setHoneypot] = useState(''); // Bot detection field
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);

  const isSongBasedVoting = !!songId && entryIds.length > 0;
  const voteFor = isSongBasedVoting ? 'song' : 'entry';
  const effectiveEntryId = entryId || (entryIds.length > 0 ? entryIds[0] : '');

  // Load reCAPTCHA v3 script
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) return;

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.onload = () => setRecaptchaLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector(`script[src*="recaptcha"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  const handleVoteSelect = async (selectedVotePack: VotePackWithProduct) => {
    if (!supporterEmail) {
      setEmailError(true);
      toast.error("Email is required");
      return;
    }
    
    setEmailError(false);
    setProcessingVotePack(selectedVotePack);
    setIsSubmitting(true);
    
    try {
      let captchaToken = null;

      // For free votes, execute reCAPTCHA v3
      if (selectedVotePack.product.price === 0) {
        if (!recaptchaLoaded || !window.grecaptcha) {
          toast.error("Security verification is loading. Please try again in a moment.");
          return;
        }

        try {
          captchaToken = await window.grecaptcha.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
            { action: 'free_vote' }
          );
        } catch (error) {
          toast.error("Security verification failed. Please try again.");
          return;
        }
      }

      if (selectedVotePack.product.price === 0) {
        // Handle free vote using server action instead of API endpoint
        const result = await submitFreeVote({
          name: supporterName || undefined,
          email: supporterEmail,
          contestantId,
          entryId: effectiveEntryId,
          songId,
          entryIds: isSongBasedVoting ? entryIds : undefined,
          voteType: voteFor as 'song' | 'entry',
          honeypot,
          captchaToken
        });
        
        if (!result.success) {
          if (result.error === 'rate_limit') {
            // Display rate limit error with a suggestion to use paid voting instead
            toast.error(result.message, {
              description: "Consider purchasing votes to help this artist win!",
              duration: 6000,
              action: {
                label: "See paid options",
                onClick: () => {
                  // Scroll to paid options section
                  const paidOptionsSection = document.querySelector('.border-t.border-gray-200');
                  if (paidOptionsSection) {
                    paidOptionsSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }
            });
          } else if (result.error === 'bot_detected') {
            toast.error("Bot activity detected", {
              description: "Please try again later or contact support if this continues.",
              duration: 5000
            });
          } else if (result.error === 'integrity_violation') {
            toast.error("Vote failed", {
              description: result.message || "Please try again or contact support.",
              duration: 5000
            });
          } else if (result.error === 'captcha_required' || result.error === 'captcha_failed') {
            toast.error("Security check failed", {
              description: result.message || "Please try again.",
              duration: 5000
            });
          } else {
            throw new Error(result.message || 'Failed to submit vote');
          }
        } else {
          // Show success toast with message about 24-hour limit
          toast.success("Your vote has been cast!", {
            description: result.message,
            duration: 5000
          });
          
          // Redirect to artist profile with vote confirmation parameter
          router.push(`/${contestantUsername}?voteConfirmed=true`);
        }
      } else {
        // Get Stripe Checkout session for paid vote
        const response = await fetch('/api/create-payment-intent/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            votePackId: selectedVotePack.id,
            entryId: effectiveEntryId,
            songId,
            entryIds: isSongBasedVoting ? entryIds : undefined,
            voteType: voteFor,
            fanName: supporterName || undefined,
            fanEmail: supporterEmail,
            quantity: selectedVotePack.quantity
          }),
        });
        
        const result = await response.json();
        if (result.error) {
          setEmailError(true);
          throw new Error(result.error);
        }
        
        // Redirect to Stripe Checkout
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="bg-white min-h-screen pb-8 p-2">
      {/* Header */}
      <div className="bg-white flex flex-col items-center relative">
        <div className="w-full flex items-center py-6 px-4">
          <Link href={`/${contestantUsername}`} className="absolute left-4">
            <ChevronLeft className="h-6 w-6 text-black" />
          </Link>
        </div>
        
        {/* Artist Profile Photo */}
        <div className="relative h-[130px] w-[130px] rounded-md overflow-hidden mb-6">
          <img
            src={contestantProfilePhoto}
            alt={contestantUsername}
            className="object-cover"
          />
        </div>
        
        {/* Title */}
        <h1 className="text-3xl font-bold mb-4">
          {'Cast Your Votes'}
        </h1>
        
        {/* Song info - moved from artist info section */}
        {songTitle && (
          <div className="w-full max-w-lg">
            <div className="bg-gray-100 p-4 rounded-none w-full flex items-center">
              <div className="relative h-[80px] w-[80px] bg-gray-700 rounded-md mr-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full border-2 border-white h-12 w-12 flex items-center justify-center">
                    <svg width="16" height="18" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 2.5V11.5L10 7L1 2.5Z" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{songTitle}</p>
                <p className="text-base text-gray-700">{processingVotePack ? `${processingVotePack.quantity} votes` : '1 vote'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="max-w-lg mx-auto">
          {/* Contact information FIRST - before vote options */}
          <div className="mb-8 space-y-4 pt-5">
            {/* Honeypot field for bot detection - hidden from users */}
            <div className="hidden">
              <Input
                type="text"
                placeholder="Leave this field empty"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-lg font-bold text-gray-800 block">
                Your Name (optional)
              </Label>
              <p className="text-sm text-gray-500 font-normal mb-1">
                Add your name to let {contestantUsername} see your support
              </p>
              <Input
                type="text"
                placeholder="Enter your name"
                className={`w-full border-gray-300 rounded-md py-6 px-3 text-base text-gray-600 placeholder:text-gray-400 ${supporterName ? 'border-gray-400' : ''}`}
                value={supporterName}
                onChange={(e) => setSupporterName(e.target.value)}
              />
            </div>
            
            <div className="space-y-1 mt-4">
              <Label className="text-lg font-bold text-gray-800 block">
                Your Email (required)
              </Label>
              <Input
                type="email"
                placeholder="Enter your email"
                className={`w-full py-6 px-3 text-base rounded-md ${
                  emailError 
                    ? 'border-2 border-red-500 focus-visible:ring-red-500' 
                    : 'border-gray-300'
                } ${supporterEmail ? 'border-gray-400' : ''}`}
                value={supporterEmail}
                onChange={(e) => {
                  setSupporterEmail(e.target.value);
                  if (emailError) setEmailError(false);
                }}
                required
              />
              {emailError && (
                <p className="text-red-500 text-sm mt-1">Email is required to vote</p>
              )}
            </div>
          </div>
          
          {/* Vote options */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2 ml-1">Choose Your Votes</h3>
            <p className="text-gray-600 ml-1 mb-6">Select how many votes you'd like to cast</p>
            
            {/* Free vote option */}
            {votePacks.filter(pack => pack.product.price === 0).map((pack) => (
              <div 
                key={pack.id} 
                className={`flex items-center justify-between py-4 px-1 cursor-pointer ${
                  isSubmitting && processingVotePack?.id === pack.id 
                    ? 'opacity-70 pointer-events-none' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => !isSubmitting && handleVoteSelect(pack)}
              >
                <div className="flex items-center">
                  <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="#D33F49">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                  <span className="text-3xl font-bold">{pack.quantity}</span>
                </div>
                <div className="py-3 px-8 rounded-lg text-white font-medium text-xl bg-[#D33F49]">
                  {isSubmitting && processingVotePack?.id === pack.id ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    </span>
                  ) : 'Free'}
                </div>
              </div>
            ))}
              
            <div className="border-t border-gray-200 my-5"></div>
            
            <h4 className="text-xl font-bold mb-5 ml-1">Boost their chances with more votes!</h4>
            
            {/* Paid vote options */}
            {votePacks.filter(pack => pack.product.price > 0).map((pack) => (
              <div 
                key={pack.id} 
                className={`flex items-center justify-between py-4 px-1 cursor-pointer ${
                  isSubmitting && processingVotePack?.id === pack.id 
                    ? 'opacity-70 pointer-events-none' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => !isSubmitting && handleVoteSelect(pack)}
              >
                <div className="flex items-center">
                  <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="#D33F49">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                  <span className="text-3xl font-bold">{pack.quantity}</span>
                </div>
                <div className="py-3 px-6 rounded-lg text-white font-medium text-xl bg-[#D33F49]">
                  {isSubmitting && processingVotePack?.id === pack.id ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    </span>
                  ) : `$${(pack.product.price / 100).toFixed(2)}`}
                </div>
              </div>
            ))}
          </div>



            {/* Footer */}
            <div className="text-center text-gray-500 text-xs mt-4 mb-12">
              By clicking any vote option, you agree to <Link href="/privacy-policy" className="underline">Privacy Policy</Link>, <Link href="/terms" className="underline">Terms & Conditions</Link> and <Link href="/rules" className="underline">Official Rules</Link>.
            </div>
      </div>
    </div>
  );
} 