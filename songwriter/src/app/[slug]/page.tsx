
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getContestantByUsername, getContestantVotes } from '@/lib/public-contestant-actions';
import MusicTrackCard from '@/components/MusicTrackCard';
import ContestPrizeCard from '@/components/ContestPrizeCard';
import HeaderShareButton from '@/components/HeaderShareButton';
import ExpandableText from '@/components/ExpandableText';
import MenuButton from '@/components/MenuButton';
import VoteConfirmationDialog from '@/components/vote/VoteConfirmationDialog';
import { Competition } from '@prisma/client';

// Type definitions
type PageParams = Promise<{ slug: string }>;

interface Category {
  id: string;
  title: string;
}

interface Entry {
  id: string;
  song: {
    id: string;
    title: string;
    link: string;
  };
  category: {
    id: string;
    title: string;
  };
  paid: boolean;
}

export interface SongData {
  song: {
    id: string;
    title: string;
    link: string;
  };
  entries: Entry[];
  totalVotes: number;
  categories: Category[];
  competition: Competition;
  entryIds: string[];
}

export default async function ContestantProfilePage({ params, searchParams }: { params: PageParams;
  searchParams: Promise<{ voteConfirmed?: string }>}) {
  const { slug } = await params;
  const { voteConfirmed } = await searchParams;
  const contestant = await getContestantByUsername(decodeURIComponent(slug));

  if (!contestant) {
    notFound();
  }

  const profileImageUrl = contestant.profilePhoto
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-photos/${contestant.profilePhoto}`
    : '/default.png';

  // Get full name if available, or just username
  const fullName = contestant.firstName && contestant.lastName
    ? `${contestant.firstName} ${contestant.lastName}`
    : contestant.firstName || contestant.lastName || contestant.username;

  const { totalVotes, entryVotesMap, songVotesMap } = await getContestantVotes(contestant.id);
  const entries = contestant.entries;

  // Group entries by song ID to prevent duplication
  const songMap = new Map<string, SongData>();

  entries.forEach(entry => {
    if (!songMap.has(entry.song.id)) {
      // Initialize with first entry data
      songMap.set(entry.song.id, {
        song: entry.song,
        entries: [entry],
        totalVotes: songVotesMap?.[entry.song.id] || 0,
        categories: [{ id: entry.category.id, title: entry.category.title }],
        competition: entry.competition,
        entryIds: [entry.id]
      });
    } else {
      const songData = songMap.get(entry.song.id)!;
      songData.entries.push(entry);
      // Don't increment totalVotes here - it's already set correctly from songVotesMap
      songData.categories.push({ id: entry.category.id, title: entry.category.title });
      songData.entryIds.push(entry.id);
    }
  });

  // Group songs by competition
  const songsByCompetition = new Map<string, SongData[]>();
  
  // Sort function for songs within each competition
  const sortSongs = (a: SongData, b: SongData) => {
    // First, sort by vote count (highest first)
    if (b.totalVotes !== a.totalVotes) {
      return b.totalVotes - a.totalVotes;
    }
    
    // If vote counts are equal, sort by paid status (paid first)
    // Check if any entries are paid
    const aHasPaidEntry = a.entries.some(entry => entry.paid);
    const bHasPaidEntry = b.entries.some(entry => entry.paid);
    
    if (aHasPaidEntry && !bHasPaidEntry) return -1;
    if (!aHasPaidEntry && bHasPaidEntry) return 1;
    
    // If both are paid or both are unpaid, sort alphabetically by title
    return a.song.title.localeCompare(b.song.title);
  };
  
  // Group songs by competition ID
  Array.from(songMap.values()).forEach(songData => {
    const competitionId = songData.competition.id;
    if (!songsByCompetition.has(competitionId)) {
      songsByCompetition.set(competitionId, []);
    }
    songsByCompetition.get(competitionId)!.push(songData);
  });
  
  // Sort songs within each competition
  for (const songs of songsByCompetition.values()) {
    songs.sort(sortSongs);
  }
  
  // Sort competitions by name for consistent display
  const sortedCompetitions = Array.from(songsByCompetition.entries()).sort((a, b) => {
    // Ensure consistent order of competitions
    const competitionNameA = entries.find(e => e.competition.id === a[0])?.competition.name || '';
    const competitionNameB = entries.find(e => e.competition.id === b[0])?.competition.name || '';
    return competitionNameA.localeCompare(competitionNameB);
  });
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/${slug}`;
  const shareTitle = `Check out ${fullName} on American Songwriter Contests`;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      {/* Container to limit width on desktop */}
      <div className="w-full md:max-w-xl">

        {/* Vote Confirmation Dialog - Only shows when voteConfirmed=true in URL */}
        <VoteConfirmationDialog
          artistName={fullName}
          artistImage={profileImageUrl}
          prizeAmount="$5,000"
        />

        {/* Artist Cover Section */}
        <div className="relative w-full h-[450px] md:h-[550px]">
          <img    
            src={profileImageUrl}
            alt={fullName}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />

          {/* Overlay with artist name */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 flex flex-col justify-end items-center p-8">
          <p className="text-white text-xl md:text-2xl text-center">@{contestant.username.toLowerCase()}</p> 
            <h1 className="text-white text-5xl md:text-7xl font-bold mb-2 text-center">{fullName}</h1>
            <p className="text-white text-xl md:text-2xl mb-8 text-center">Help them win by casting votes!</p>

            {/* Vote Now Button - Redesigned with star icon */}
            <Link href={`#music-section`} className="block w-full max-w-md">
              <button className="bg-[#D33F49] hover:bg-[#C03541] text-white font-medium py-4 px-6 rounded-lg w-full flex items-center justify-center text-xl">
                <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" strokeWidth={0} stroke="currentColor" className="w-6 h-6 mr-3">
                  <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                Vote Now
              </button>
            </Link>
          </div>

          {/* Share button */}
          <div className="absolute top-4 right-4">
            <HeaderShareButton url={shareUrl} title={shareTitle} artistName={fullName} />
          </div>
        </div>

        <main className="">
          {/* About Section */}
          <div className="p-2 py-10 px-4">
            <h2 className="text-xl font-semibold mb-2">About</h2>
            <ExpandableText text={contestant.bio || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt...'} />
          </div>


          {/* Music Section */}
          <div id="music-section" className="bg-[#F6F7F8] p-6">
            <h2 className="text-xl md:text-xl font-semibold mb-2">Support Their Journey</h2>
            <p className="text-gray-600 text-sm md:text-base mb-3 md:mb-4">Your votes boost {fullName}'s ranking.</p>

            {/* New Subheader + Music tracks with background */}
            <div className="overflow-hidden">
              {/* Vote count subheader */}
              <div className="py-4 flex items-center justify-between">
                <div className="w-24 h-24 rounded-lg overflow-hidden relative">
                  <img    
                    src={profileImageUrl}
                    alt={fullName}
                    className="object-cover"
                  />
                </div>

                <div className="flex items-center">
                  <div className="flex items-center mr-3">
                    <div className="text-green-600 mr-2">
                      <svg width="13" height="12" viewBox="0 0 13 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.5 0L12.9952 11.25H0.00480938L6.5 0Z" fill="#3AB107" />
                      </svg>

                    </div>
                    <span className="text-3xl font-bold">{totalVotes >= 1000 ? `${(totalVotes / 1000).toFixed(1)}k` : totalVotes}</span>
                    <span className="ml-2 text-gray-600">votes</span>
                  </div>

        
                </div>
              </div>

              {/* Music tracks grouped by competition */}
              <div className="pb-4 border-t-1 border-grey">
                {sortedCompetitions.length > 0 ? (
                  sortedCompetitions.map(([competitionId, songs]) => {
                    // Find competition name from any song in the group
                    const competitionName = songs[0]?.competition.name || 'Unknown Contest';
                    return (
                      <div key={competitionId} className="mb-6">
                        {/* Competition header */}
                        <div className="bg-[#EFF2F6] p-4 font-semibold">
                          {competitionName}
                        </div>
                        
                        {/* Songs in this competition */}
                        <div className="py-4 px-4">
                          {songs.map((songData: SongData) => (
                            <MusicTrackCard
                              key={songData.song.id}
                              songData={songData}
                              artist={fullName}
                              artistSlug={slug}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-4 px-4">
                    <div>No songs</div>
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* Contest Section */}
          <div>
            <ContestPrizeCard />
          </div>
        </main>
      </div>

    </div>
  );
}