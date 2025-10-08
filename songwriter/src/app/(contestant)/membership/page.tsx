'use client';

import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Trophy, Vote, Users, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getOpenCompetitions } from "@/lib/competition-actions";
import { useSearchParams } from "next/navigation";

type Competition = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  fanVotingEnabled: boolean;
  startDate: string;
  endDate: string;
};

export default function MembershipPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | undefined>();
  const [isFetchingCompetitions, setIsFetchingCompetitions] = useState(false);
  const searchParams = useSearchParams();

  const selectableCompetitions = useMemo(
    () => competitions.filter(c => c.fanVotingEnabled),
    [competitions]
  );

  useEffect(() => {
    const fetchCompetitions = async () => {
      setIsFetchingCompetitions(true);
      try {
        const result = await getOpenCompetitions();
        if ((result as any).competitions) {
          setCompetitions((result as any).competitions as Competition[]);
          const qp = searchParams?.get('competitionId');
          const preferred = (result as any).competitions.find((c: Competition) => c.id === qp && c.fanVotingEnabled);
          if (preferred) {
            setSelectedCompetitionId(preferred.id);
          } else {
            const first = (result as any).competitions.find((c: Competition) => c.fanVotingEnabled);
            setSelectedCompetitionId(first?.id);
          }
        }
      } catch (e) {
        console.error('Failed to load competitions', e);
      } finally {
        setIsFetchingCompetitions(false);
      }
    };
    fetchCompetitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJoinContest = async () => {
    try {
      if (!selectedCompetitionId) {
        toast.error('Please select a contest to join.');
        return;
      }
      setIsLoading(true);
      
      const response = await fetch('/api/create-payment-intent/fan-contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitionId: selectedCompetitionId })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }
      
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Payment initialization error:', err);
      toast.error(err.message || 'Failed to initialize payment');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="rounded-3xl p-8 max-w-md w-full text-center outline outline-1 outline-gray-300">
        <div className="mb-6 flex justify-center">
          <div className="w-24 h-24 flex items-center justify-center">
            <img
              src="/songwriter-logo-black.png"
              alt="American Songwriter"
              width={120}
              height={120}
              className="object-contain"
              draggable={false}
            />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Unlock Your Artist Profile</h1>
        
        <p className="text-gray-600 mb-6">
          Join the Fan Favorite Contest to showcase your music and enable fan voting.
        </p>
        
        {/* Contest selector */}
        <div className="mb-6 text-left">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Contest</label>
          {isFetchingCompetitions ? (
            <div className="text-sm text-gray-500">Loading contests…</div>
          ) : selectableCompetitions.length > 0 ? (
            <select
              className="w-full border rounded-md p-2"
              value={selectedCompetitionId || ''}
              onChange={(e) => setSelectedCompetitionId(e.target.value)}
            >
              {selectableCompetitions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
              No open contests currently have fan voting enabled.
            </div>
          )}
        </div>
        
        {/* Feature list */}
        <div className="space-y-4 mb-8 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-1 bg-red-50 p-1.5 rounded-full text-[#D33F49]">
              <Trophy size={18} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Fan Favorite Contest</h3>
              <p className="text-gray-600 text-sm">Compete for additional prizes based on fan votes</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="mt-1 bg-red-50 p-1.5 rounded-full text-[#D33F49]">
              <Users size={18} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Public Artist Profile</h3>
              <p className="text-gray-600 text-sm">Share your music with fans worldwide</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="mt-1 bg-red-50 p-1.5 rounded-full text-[#D33F49]">
              <Vote size={18} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Fan Voting System</h3>
              <p className="text-gray-600 text-sm">Let fans vote to increase your ranking</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="mt-1 bg-red-50 p-1.5 rounded-full text-[#D33F49]">
              <Star size={18} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Increased Visibility</h3>
              <p className="text-gray-600 text-sm">Stand out in the competition</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <Button 
            className="w-full bg-[#D33F49] hover:bg-[#D33F49]/80 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            onClick={handleJoinContest}
            disabled={isLoading || !selectedCompetitionId || selectableCompetitions.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Join the Fan Favorite Contest - $5'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
