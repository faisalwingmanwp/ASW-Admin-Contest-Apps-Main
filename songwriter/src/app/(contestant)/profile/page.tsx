
import ProfileHeader from '@/components/profile/ProfileHeader';
import { Button } from '@/components/ui/button';
import { getCompleteContestant } from '@/lib/contestant-actions';
import ProfileContestCard from '@/components/profile/ProfileContestCard';
import ExpandableText from '@/components/ExpandableText';
import { Category } from '@prisma/client';
import { getSubmissionTickets } from '@/lib/support-actions';
import Link from 'next/link';
import EntrySubmissionCard from '@/components/profile/EntrySubmissionCard';
import { getContestantVotes } from '@/lib/public-contestant-actions';
import { checkContestantHasMembership } from '@/lib/membership-actions';
import { getFanContestMembershipMap } from '@/lib/membership-actions';

interface Entry {
  id: string;
  song: {
    id: string;
    title: string;
    link: string;
  };
  category: Category;
  competition: {
    id: string;
    name: string;
    open: boolean;
  };
  paid: boolean;
}

interface SongData {
  song: {
    id: string;
    title: string;
    link: string;
  };
  entries: Entry[];
  totalVotes: number;
  categories: Category[];
  isPaid: boolean;
  competition: {
    id: string;
    name: string;
    open: boolean;
    fanVotingEnabled?: boolean;
    price?: number;
  };
}

export default async function ProfilePage() {
  const contestant = await getCompleteContestant();
  const hasMembership = await checkContestantHasMembership();
  const { hasGlobal: hasGlobalFanContest, byCompetition } = await getFanContestMembershipMap();
  const { totalVotes, entryVotesMap, songVotesMap } = await getContestantVotes(contestant!.id);
  const entries = contestant!.entries || [];
  const tickets = await getSubmissionTickets();
  const songMap = new Map<string, SongData>();

  entries.forEach(entry => {
    if (!songMap.has(entry.song.id)) {
      const competition = {
        id: entry.competition.id,
        name: entry.competition.name,
        open: entry.competition.open,
        fanVotingEnabled: (entry.competition as any).fanVotingEnabled as boolean,
        price: (entry.competition as any).price as number
      };

      songMap.set(entry.song.id, {
        song: entry.song,
        entries: [entry],
        // Use the song-level vote count from songVotesMap
        totalVotes: songVotesMap?.[entry.song.id] || 0,
        categories: [entry.category],
        isPaid: entry.paid,
        competition
      });
    } else {
      const songData = songMap.get(entry.song.id)!;
      songData.entries.push(entry);
      // Don't increment totalVotes here - it's already set correctly from songVotesMap
      songData.categories.push(entry.category);
      songData.isPaid = songData.isPaid || entry.paid;
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
    if (a.isPaid && !b.isPaid) return -1;
    if (!a.isPaid && b.isPaid) return 1;
    
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
  const profileImageUrl = contestant!.profilePhoto
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-photos/${contestant!.profilePhoto}`
    : '/default.png';

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">

        {/* Unlock Profile Banner for non-members */}
        {!hasMembership && (
          <div className="mx-4 my-6 p-4 bg-gradient-to-r from-[#D33F49] to-[#C03541] rounded-lg text-white">
            <h3 className="text-lg font-semibold mb-2">Unlock Your Artist Profile</h3>
            <p className="text-sm mb-3 opacity-90">Join the Fan Favorite Contest to enable fan voting and showcase your music publicly.</p>
            <Link href="/membership">
              <Button className="bg-white text-[#D33F49] hover:bg-gray-100 font-medium">
                Join Competition
              </Button>
            </Link>
          </div>
        )}

      <div className="w-full md:max-w-xl">
        <ProfileHeader
          contestant={contestant!}
          totalVotes={totalVotes}
          hasMembership={hasMembership}
        />

        <div className="px-4 py-4 md:py-6 pb-24 md:pb-6">
          {/* About Section */}
          {contestant!.bio && (
            <div className="mb-6 md:mb-8 pb-6 border-b-2 border-[#F2F2F2]">
              <h2 className="text-lg md:text-xl font-semibold mb-2">About</h2>
              <ExpandableText text={contestant!.bio} />
            </div>
          )}


          {/* Music Section */}
          <div id="music-section" className="mb-6 md:mb-8">
            <h2 className="text-xl md:text-xl font-semibold mb-2">Your Submissions</h2>
            <p className="text-gray-600 text-sm md:text-base mb-3 md:mb-4">Manage your submissions and track your progress.</p>

            {/* Music tracks with background */}
            <div className="bg-[#F6F7F8] rounded-lg overflow-hidden">
              {/* Vote count subheader */}
              <div className="p-4 flex items-center justify-between">
                <div className="w-24 h-24 rounded-lg overflow-hidden relative">
                  <img  
                    src={profileImageUrl}
                    alt={contestant!.username}
                    className="object-cover"
                  />
                </div>

                <div className="flex items-center">
                  <div className="flex items-center mr-3">
                    <div className="text-green-600 mr-1">
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
                    const isOpen = songs[0]?.competition.open;
                    const fanVotingEnabled = (songs[0]?.competition as any)?.fanVotingEnabled as boolean | undefined;
                    const hasFanContestForThis = Boolean(byCompetition[competitionId]);
                    return (
                      <div key={competitionId} className="mb-6">
                        {/* Competition header */}
                        <div className="bg-[#EFF2F6] p-4 font-semibold">
                          {competitionName}
                        </div>
                        {/* Fan voting availability per contest */}
                        {isOpen && fanVotingEnabled === false && (
                          <div className="px-4 pt-3 text-sm text-gray-600">
                            Fan voting is not available for this contest.
                          </div>
                        )}
                        {isOpen && fanVotingEnabled === true && !hasFanContestForThis && (
                          <div className="px-4 pt-3">
                            <Link href={`/membership?competitionId=${competitionId}`}>
                              <span className="inline-block bg-[#D33F49] text-white text-xs md:text-sm px-3 py-1.5 rounded-full">
                                Fan voting locked — Join Fan Favorite
                              </span>
                            </Link>
                          </div>
                        )}
                        
                        {/* Songs in this competition */}
                        <div className="p-4">
                          {songs.map((songData: SongData) => (
                            <EntrySubmissionCard
                              key={songData.song.id}
                              songData={songData}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center p-4">
                    <p className="text-gray-600 mb-4">You haven't submitted any songs yet.</p>
                    <Button
                      className="bg-[#F8BE00] hover:bg-[#C03541] text-white submission-button"
                    >
                      Submit a Song
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Add New Submission Button */}
            {sortedCompetitions.length > 0 && (
              <div className="mt-4">
                <Link href='/checkout'>
                  <Button
                    className="w-full text-xl border-1 p-8 border-[#D33F49] bg-white hover:bg-gray-50 text-[#D33F49] font-medium py-8 px-6 rounded-xl submission-button"
                  >
                    + Start New Submission
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Contest Section */}
          <div className="mb-6 md:mb-8 mt-6">
            <ProfileContestCard />
          </div>
        </div>
      </div>
    </div>
  );
}
