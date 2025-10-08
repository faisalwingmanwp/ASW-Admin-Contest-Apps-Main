'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { X, Check, Info, AlertCircle } from 'lucide-react';
import { usePostHog } from 'posthog-js/react';
import { createClient } from '@/lib/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";

import EntryPrizeCard from './EntryPrizeCard';
import UserContactCard from './UserContactCard';
import { checkUsernameAvailability, checkEmailExists } from '@/lib/contestant-actions';
import { getOpenCompetitions } from '@/lib/competition-actions';
import { toast } from 'sonner';
import { useCheckoutStore } from '@/stores/checkout-store';
import AnnualSubscriptionOffer from './AnnualSubscriptionOffer';

// Facebook Pixel functions
declare global {
  interface Window {
    fbq: any;
  }
}

const FB_PIXEL_ID = '1891611881076889';

// Initialize Facebook Pixel
const initFacebookPixel = () => {
  if (typeof window !== 'undefined' && !window.fbq) {
    (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    
    window.fbq('init', FB_PIXEL_ID);
    window.fbq('track', 'PageView');
  }
};

// Facebook Pixel event tracking functions
const trackFBEvent = (eventName: string, parameters?: any) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, parameters);
  }
};

const trackFBCustomEvent = (eventName: string, parameters?: any) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', eventName, parameters);
  }
};

type Category = {
  id: string;
  title: string;
  icon?: string | null;
};

type Competition = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  fanVotingEnabled?: boolean;
  startDate: string;
  endDate: string;
};

type UserData = {
  email: string;
  firstName: string;
  lastName: string;
  userName: string;
  hasMembership: boolean;
  hasFanContest: boolean;
  smsConsent: boolean;
} | null;

type MembershipProduct = {
  id: string;
  name: string;
  price: number;
  stripePriceId: string;
} | null;

type FanContestAccess = { hasGlobal: boolean; byCompetition: Record<string, boolean> } | null;

export default function CheckoutForm({ 
  categories,
  userData,
  membershipProduct,
  fanContestAccess
}: { 
  categories: Category[];
  userData: UserData;
  membershipProduct: MembershipProduct;
  fanContestAccess?: FanContestAccess;
}) {
  const searchParams = useSearchParams();
  const urlCompetitionId = searchParams.get('competitionId');
  const [isLoading, setIsLoading] = useState(false);
  const {
    email,
    firstName,
    lastName,
    phone,
    userName,
    smsConsent,
    fanContestOptIn,
    songs,
    membershipSelected,
    selectedCompetitionId,
    setField,
    addSong,
    removeSong,
    updateSong,
    handleCategoryChange,
    reset,
    initializeFromUserData
  } = useCheckoutStore();

  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'unavailable' | 'initial'>('initial');
  const [emailStatus, setEmailStatus] = useState<'checking' | 'exists' | 'available' | 'initial'>('initial');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [fetchingCompetitions, setFetchingCompetitions] = useState(false);
  const [categorySelectValues, setCategorySelectValues] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const selectedCompetition = useMemo(
    () => competitions.find(c => c.id === selectedCompetitionId),
    [competitions, selectedCompetitionId]
  );

  const hasFanContestForSelected = useMemo(() => {
    if (!selectedCompetition) return false;
    if (!fanContestAccess) return false;
    return Boolean(fanContestAccess.byCompetition?.[selectedCompetition.id]);
  }, [selectedCompetition, fanContestAccess]);

  // Initialize Facebook Pixel on component mount
  useEffect(() => {
    initFacebookPixel();
  }, []);

  useEffect(() => {
    initializeFromUserData(userData);
  }, [userData, initializeFromUserData]);

  // Initialize category select values to match song count
  useEffect(() => {
    setCategorySelectValues(prev => {
      const newValues = [...prev];
      while (newValues.length < songs.length) {
        newValues.push('');
      }
      return newValues.slice(0, songs.length);
    });
  }, [songs.length]);

  useEffect(() => {
    if (userData?.hasMembership) {
      setField('membershipSelected', false);
    }
    
    // If user is logged in, try to get their data from Supabase
    const fetchUserData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        setIsLoggedIn(!!user);
        
        if (user) {
          if (!firstName && userData?.firstName) {
            setField('firstName', userData.firstName);
          }
          if (!lastName && userData?.lastName) {
            setField('lastName', userData.lastName);
          }
          if (!userName && userData?.userName) {
            setField('userName', userData.userName);
          }
          if (!email && userData?.email) {
            setField('email', userData.email);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, [userData, firstName, lastName, userName, email, setField]);
  
  useEffect(() => {
    if (!email || !email.includes('@')) {
      setEmailStatus('initial');
      return;
    }

    if (userData?.email === email) {
      setEmailStatus('available');
      return;
    }

    setEmailStatus('checking');
    
    const timer = setTimeout(async () => {
      try {
        const result = await checkEmailExists(email);
        if (result.exists) {
          setEmailStatus('exists');
        } else {
          setEmailStatus('available');
        }
      } catch (error) {
        console.error('Failed to check email:', error);
        setEmailStatus('available'); // Default to available on error
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [email, userData?.email]);
  
  useEffect(() => {
    const fetchCompetitions = async () => {
      setFetchingCompetitions(true);
      try {
        const result = await getOpenCompetitions();
        
        if (result.competitions && result.competitions.length > 0) {
          if (urlCompetitionId) {
            // Filter for the specified competition if competitionId is provided in URL
            const specificCompetition = result.competitions.find(comp => comp.id === urlCompetitionId);
            if (specificCompetition) {
              setCompetitions([specificCompetition]);
              setField('selectedCompetitionId', specificCompetition.id);
            } else {
              // If the specified competition wasn't found, show all competitions
              setCompetitions(result.competitions);
              setField('selectedCompetitionId', result.competitions[0].id);
              console.warn(`Contest with ID ${urlCompetitionId} not found or not open`);
            }
          } else {
            // No specific competition requested, show all competitions
            setCompetitions(result.competitions);
            setField('selectedCompetitionId', result.competitions[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching competitions:', error);
      } finally {
        setFetchingCompetitions(false);
      }
    };
    
    fetchCompetitions();
  }, [urlCompetitionId, setField]);

  useEffect(() => {
    if (!userName || userName.length < 3) {
      setUsernameStatus('initial');
      return;
    }

    if (userData?.userName === userName) {
      setUsernameStatus('available');
      return;
    }

    setUsernameStatus('checking');
    
    const timer = setTimeout(async () => {
      try {
        const isAvailable = await checkUsernameAvailability(userName);
        setUsernameStatus(isAvailable ? 'available' : 'unavailable');
      } catch (error) {
        console.error('Failed to check username:', error);
        setUsernameStatus('unavailable');
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [userName, userData?.userName, setField]);

  const handleCompetitionChange = (competitionId: string) => {
    const competition = competitions.find(c => c.id === competitionId);
    
    setField('selectedCompetitionId', competitionId);
  };

  const handleAddSong = () => {
    addSong();
    
    // Initialize select value for new song
    setCategorySelectValues(prev => [...prev, '']);
    
    // Track Facebook Pixel - Add to Cart event
    trackFBEvent('AddToCart', {
      content_name: 'Song Entry',
      content_category: 'Contest Entry',
      value: selectedCompetitionId ? (competitions.find(c => c.id === selectedCompetitionId)?.price || 0) / 100 : 0,
      currency: 'USD'
    });
  };

  const handleRemoveSong = (index: number) => {
    removeSong(index);
    
    // Remove corresponding select value
    setCategorySelectValues(prev => prev.filter((_, i) => i !== index));
  };

  const handleCategoryChangeWrapper = (songIndex: number, value: string) => {
    const song = songs[songIndex];
    const isAdding = !song.categories.includes(value);
    const category = categories.find(c => c.id === value);
    
    
    handleCategoryChange(songIndex, value);
    
    // Reset the select value after adding a category
    const newSelectValues = [...categorySelectValues];
    newSelectValues[songIndex] = '';
    setCategorySelectValues(newSelectValues);
  };

  const handleFanContestToggle = (checked: boolean) => {
    setField('fanContestOptIn', checked);
    
    // Track Facebook Pixel - Custom Fan Voting Upsell Added event
    if (checked) {
      trackFBCustomEvent('Fan Voting Upsell Added', {
        content_name: 'Fan Favorite Contest',
        content_category: 'Upsell',
        value: 5.00, // $5 for fan contest
        currency: 'USD'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Require Terms & Conditions consent before proceeding
    if (!termsAccepted) {
      toast.error("Please agree to the Terms & Conditions to continue.");
      return;
    }

    setIsLoading(true);
    
    // Track Facebook Pixel - Initiate Checkout event
    const selectedCompetition = competitions.find(c => c.id === selectedCompetitionId);
    const competitionPrice = selectedCompetition ? selectedCompetition.price / 100 : 0;
    const totalSongs = songs.length;
    const totalCategoriesCount = songs.reduce((sum, song) => sum + song.categories.length, 0);
    const fanContestPrice = fanContestOptIn ? 5.00 : 0;
    const membershipPrice = membershipSelected && membershipProduct ? membershipProduct.price / 100 : 0;
    
    const totalValue = (competitionPrice * totalCategoriesCount) + fanContestPrice + membershipPrice;
    
    trackFBEvent('InitiateCheckout', {
      content_name: 'Contest Entry Checkout',
      content_category: 'Contest',
      value: totalValue,
      currency: 'USD',
      num_items: totalSongs
    });
    

    // --- START ENHANCED CLIENT-SIDE VALIDATION ---
    if (!email.trim() || !firstName.trim() || !lastName.trim() || !userName.trim()) {
      toast.error("Please fill in all required artist information fields (Email, First Name, Last Name, Username).");
      setIsLoading(false);
      return;
    }
    
    if (emailStatus === 'exists' && !isLoggedIn && !userData) { // Ensure user is logged in if email exists and it's not their own
        toast.error("This email is already registered. Please log in to continue.");
        setIsLoading(false);
        return;
    }
    
    if (usernameStatus === 'unavailable') {
        toast.error("This username is unavailable. Please choose another one.");
        setIsLoading(false);
        return;
    }
    
    if (!selectedCompetitionId) {
      toast.error("Please select a competition to enter.");
      setIsLoading(false);
      return;
    }

    if (songs.length === 0) {
      toast.error("Please add at least one song entry.");
      setIsLoading(false);
      return;
    }

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      if (!song.title.trim()) {
        toast.error(`Please provide a title for song #${i + 1}.`);
        setIsLoading(false);
        return;
      }
      if (!song.artistName.trim()) {
        toast.error(`Please provide an artist/band name for song: ${song.title || 'Song #' + (i + 1)}.`);
        setIsLoading(false);
        return;
      }
      if (!song.link.trim() || song.link === 'https://' || song.link === 'http://') {
        toast.error(`Please provide a valid public link for song: ${song.title || 'Song #' + (i + 1)}.`);
        setIsLoading(false);
        return;
      }
      // More robust link validation
      try {
        const url = new URL(song.link);
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Invalid protocol');
        }
      } catch (_) {
        toast.error(`Invalid link format for song: ${song.title || 'Song #' + (i + 1)}. It must be a valid URL (e.g., https://example.com).`);
        setIsLoading(false);
        return;
      }
      if (song.categories.length === 0) {
        toast.error(`Please select at least one category for song: ${song.title || 'Song #' + (i + 1)}.`);
        setIsLoading(false);
        return;
      }
    }
    // --- END ENHANCED CLIENT-SIDE VALIDATION ---

    try {
      const response = await fetch('/api/create-payment-intent/new-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          phone,
          userName,
          smsConsent,
          songs,
          competitionId: selectedCompetitionId,
          addOns: {
            membership: membershipSelected,
            fanContest: fanContestOptIn
          }
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || "Something went wrong with checkout");
        
        setIsLoading(false);
        return;
      }
      
      if (result.url) {
        window.location.href = result.url;
        return;
      } else {
        toast.error("Could not initiate checkout. Please try again.");
        
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(errorMessage);
      
      setIsLoading(false);
    }
  };


  const SelectedCategories = ({ 
    categories, 
    selectedIds, 
    onRemove 
  }: { 
    categories: Category[], 
    selectedIds: string[],
    onRemove: (id: string) => void 
  }) => {
    
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {selectedIds.map(id => {
          const category = categories.find(c => c.id === id);
          return (
            <Badge 
              key={id} 
              variant="secondary"
              className="flex items-center gap-1 pl-2"
            >
              {category?.title}
              <button 
                type="button" 
                onClick={() => onRemove(id)}
                className="ml-1 rounded-full hover:bg-gray-200 p-1"
              >
                <X size={12} />
              </button>
            </Badge>
          );
        })}
      </div>
    );
  };

  // Clean, modern checkout layout based on the image
  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto">
      <div className="flex flex-col">
        
        <h1 className="text-center text-3xl font-bold my-4">Which Contest Are You Entering?</h1>
        <p className="text-center text-gray-600 mb-8">Select one contest per submission. To enter multiple contests, please submit separately.</p>
        
        {/* Contest Selection */}
        {fetchingCompetitions ? (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 rounded-full border-2 border-t-transparent border-[#D33F49] animate-spin"></div>
          </div>
        ) : competitions.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full mb-12">
            {competitions.map((competition) => (
              <div 
                key={competition.id} 
                className={`border rounded-xl overflow-hidden flex flex-col ${
                  selectedCompetitionId === competition.id 
                    ? 'border-2 border-[#D33F49] bg-[#F7F7F7] shadow-sm' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <label 
                  htmlFor={`contest-${competition.id}`}
                  className="block p-4 cursor-pointer flex-grow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="text-xl font-medium block mb-1">
                        {competition.name}
                      </span>
                      
                      {competition.description && (
                        <p className="text-gray-500 text-sm mb-3">{competition.description}</p>
                      )}
                      
                      <p className="text-base font-medium">
                        {competition.price === 0 ? 'FREE' : `$${(competition.price / 100).toFixed(2)}`} / entry
                      </p>
                      {competition.fanVotingEnabled && (
                        <div className="mt-2">
                          <Badge className="bg-[#2B6CA3] text-white">Fan Voting Enabled (+$5)</Badge>
                        </div>
                      )}
                    </div>
                    
                    <input
                      type="radio"
                      id={`contest-${competition.id}`}
                      name="competitionSelection"
                      value={competition.id}
                      checked={selectedCompetitionId === competition.id}
                      onChange={() => handleCompetitionChange(competition.id)}
                      className="h-5 w-5 text-[#D33F49] border-gray-300 focus:ring-[#D33F49]"
                    />
                  </div>
                </label>

                {/* Visual indicator for selected competition */}
                <div className={`h-1 w-full ${
                  selectedCompetitionId === competition.id 
                    ? 'bg-[#D33F49]' 
                    : 'bg-transparent'
                }`}></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 border rounded-lg bg-yellow-50 text-yellow-800 flex items-center mb-8">
            <Info size={18} className="mr-2" />
            <p>No open contests available at this time. Please check back later.</p>
          </div>
        )}
        
        {/* Artist Information */}
        <h2 className="text-center text-xl font-bold mb-6">Artist Information</h2>
        
        {isLoggedIn && userData ? (
          <div className="max-w-xl mx-auto w-full">
            <UserContactCard
              email={email}
              firstName={firstName}
              lastName={lastName}
              userName={userName}
              phone={phone}
            />
            
            {/* SMS consent checkbox for logged-in users */}
            {!userData.smsConsent && (
              <div className="flex items-center mb-8">
                <input
                  type="checkbox"
                  id="smsConsent"
                  className="h-4 w-4 text-[#D33F49] border-gray-300 rounded"
                  checked={smsConsent}
                  onChange={(e) => setField('smsConsent', e.target.checked)}
                />
                <label htmlFor="smsConsent" className="ml-2 block text-sm text-gray-700">
                  I agree to receive SMS updates from American Songwriter
                </label>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-xl mx-auto w-full space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium mb-1">
                Email address<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="email"
                  required
                  className="w-full p-3"
                  value={email}
                  onChange={(e) => setField('email', e.target.value)}
                />
                {emailStatus === 'checking' && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-[#D33F49] animate-spin"></div>
                  </div>
                )}
                {emailStatus === 'available' && email.includes('@') && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-green-500">
                    <Check size={18} />
                  </div>
                )}
                {emailStatus === 'exists' && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-amber-500">
                    <AlertCircle size={18} />
                  </div>
                )}
              </div>
              {emailStatus === 'exists' && !userData && (
                <div className="mt-2 p-3 bg-amber-50 text-amber-800 rounded-md flex items-start gap-2">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">This email is already registered</p>
                    <p className="text-xs">Please <Link href="/auth/login" className="text-[#D33F49] underline">log in</Link> to continue with this email.</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  First Name<span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  className="w-full p-3"
                  value={firstName}
                  onChange={(e) => setField('firstName', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Last Name<span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  className="w-full p-3"
                  value={lastName}
                  onChange={(e) => setField('lastName', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Username<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="text"
                  required
                  pattern="^[a-z0-9_]+$"
                  className="w-full p-3 pr-10"
                  value={userName}
                  onChange={(e) => {
                    // Only allow lowercase letters, numbers and underscores
                    const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    setField('userName', sanitized);
                  }}
                  placeholder="username"
                />
                {usernameStatus === 'checking' && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-[#D33F49] animate-spin"></div>
                  </div>
                )}
                {usernameStatus === 'available' && userName.length >= 3 && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-green-500">
                    <Check size={18} />
                  </div>
                )}
                {usernameStatus === 'unavailable' && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-red-500">
                    <X size={18} />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Lowercase letters, numbers and underscores only
              </p>
              {usernameStatus === 'unavailable' && (
                <p className="text-xs text-red-500 mt-1">
                  This username is already taken
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number<span className="text-red-500">*</span>
              </label>
              <PhoneInput
                required
                value={phone}
                onChange={(value) => setField('phone', value || '')}
                placeholder="(555) 123-4567"
                defaultCountry="US"
                className="w-full"
              />
            </div>
            
            <div className="flex items-center pt-2">
              <input
                type="checkbox"
                id="smsConsent"
                className="h-4 w-4 text-[#D33F49] border-gray-300 rounded"
                checked={smsConsent}
                onChange={(e) => setField('smsConsent', e.target.checked)}
              />
              <label htmlFor="smsConsent" className="ml-2 block text-sm text-gray-700">
                I agree to receive SMS updates from American Songwriter
              </label>
            </div>
          </div>
        )}
        
        {/* Song Entries Section */}
        <h2 className="text-center text-2xl font-bold mb-2">Song Entries</h2>
        <p className="text-center text-sm text-gray-600 mb-6">Enter your song details below. You can enter as many songs into as many categories as you like</p>
        
        <div className="max-w-xl mx-auto w-full mb-8">
          {songs.map((song, songIndex) => (
            <div key={songIndex} className="mb-6 p-6 bg-[#F7F7F7] rounded-lg">
              <div className="flex justify-between items-start mb-2">
                {songs.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => handleRemoveSong(songIndex)}
                    className="text-gray-500 hover:text-[#D33F49] p-1 rounded-full hover:bg-gray-200 transition-colors"
                    aria-label="Remove song"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Song Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    className="w-full p-3 bg-white"
                    value={song.title}
                    onChange={(e) => updateSong(songIndex, 'title', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Artist/Band Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    className="w-full p-3 bg-white"
                    value={song.artistName}
                    onChange={(e) => updateSong(songIndex, 'artistName', e.target.value)}
                    placeholder="Enter artist or band name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Public Link to Song (Spotify, YouTube, SoundCloud, etc.) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none bg-gray-100 px-3 rounded-l-md border-r border-gray-200">
                      <span className="text-gray-500">https://</span>
                    </div>
                    <Input
                      type="text"
                      required
                      className="w-full p-3 pl-[85px] bg-white"
                      value={song.link.replace(/^https?:\/\//i, '')}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        // Remove any existing protocol prefix before storing
                        const sanitizedValue = inputValue.replace(/^https?:\/\//i, '');
                        // Store with https:// prefix but don't show it in the input
                        updateSong(songIndex, 'link', `https://${sanitizedValue}`);
                      }}
                      placeholder="spotify.com/track/..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Co-Writer(s) (optional)
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-md bg-white"
                    placeholder="John Doe, Mary Smith, Jack Ryan"
                    value={song.coWriters}
                    onChange={(e) => updateSong(songIndex, 'coWriters', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Select a Category <span className="text-red-500">*</span>
                  </label>
                  <Select 
                    value={categorySelectValues[songIndex] || ''}
                    onValueChange={(value) => handleCategoryChangeWrapper(songIndex, value)}
                  >
                    <SelectTrigger className="w-full p-3 h-auto bg-white">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{category.title}</span>
                            {song.categories.includes(category.id) && (
                              <Check size={16} className="text-green-500" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Select one or more categories. Each additional selection matches your contest entry fee.
                  </p>
                  
                  <SelectedCategories 
                    categories={categories} 
                    selectedIds={song.categories} 
                    onRemove={(categoryId) => {
                      const updatedSongs = [...songs];
                      updatedSongs[songIndex].categories = updatedSongs[songIndex].categories
                        .filter(id => id !== categoryId);
                      updateSong(songIndex, 'categories', updatedSongs[songIndex].categories);
                    }} 
                  />
                </div>
              </div>
            </div>
          ))}
          
          <button
            type="button"
            onClick={handleAddSong}
            className="flex items-center justify-center w-full py-3 px-4 border border-gray-300 rounded-md text-sm font-medium bg-white hover:bg-gray-50 mb-6"
          >
            <span className="mr-1">+</span> Add Another Song
          </button>
        </div>
        
        {/* Fan Favorite Contest Section - show only if selected contest has fan voting enabled and user doesn't already have it for this contest */}
        {selectedCompetition?.fanVotingEnabled && !hasFanContestForSelected && (
          <div className="max-w-xl mx-auto w-full mb-8 border border-gray-200 rounded-lg overflow-hidden">
            <h2 className="text-xl font-bold p-4 border-b border-gray-200">Add Fan Favorite Contest ($5)</h2>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">Activate fan voting and let your audience help you win! Fans can vote for free and you'll get more exposure. The entry with the most fan votes wins additional prizes.</p>
              <EntryPrizeCard 
              checked={fanContestOptIn} 
              onChange={handleFanContestToggle} 
            />
            <p className="text-sm text-gray-600 mt-4">Fan Favorite Contest is an additional way to win prizes, garner recognition, and be heard by the official judges.</p>
          </div>
        </div>
        )}

        {/* Annual Subscription Offer Section */}
        {(!userData || (userData && !userData.hasMembership)) && membershipProduct && (
          <AnnualSubscriptionOffer 
            isSelected={membershipSelected}
            onToggle={(selected) => setField('membershipSelected', selected)}
            disabled={isLoading}
            originalPrice={membershipProduct.price}
            discountPercent={40}
          />
        )}
        
        <div className="max-w-xl mx-auto w-full">
          {emailStatus === 'exists' && !userData && !isLoggedIn ? (
            <div className="space-y-4 mb-8">
              <div className="p-4 border border-amber-200 bg-amber-50 rounded-md text-center">
                <p className="text-amber-800 mb-2">This email is already registered with American Songwriter</p>
                <p className="text-sm text-amber-700 mb-4">Please log in to continue with your submission</p>
                <Button 
                  type="button"
                  className="bg-[#D33F49] text-white hover:bg-[#C03540] py-3"
                >
                  <Link 
                    href="/auth/login"
                  >
                    Log in to continue
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Terms & Conditions opt-in */}
              <div className="flex items-start mb-4">
                <input
                  type="checkbox"
                  id="termsConsent"
                  className="mt-1 h-4 w-4 text-[#D33F49] border-gray-300 rounded"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <label htmlFor="termsConsent" className="ml-2 text-sm text-gray-700">
                  I agree to the{' '}
                  <a
                    href="https://americansongwriter.com/song-contest-terms-and-conditions/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Terms & Conditions
                  </a>
                </label>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading || !termsAccepted}
                className="w-full bg-[#D33F49] text-white hover:bg-[#D33F49]/80 py-3 mb-8"
              >
                {isLoading ? 'Processing...' : 'Continue to checkout'}
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
} 
