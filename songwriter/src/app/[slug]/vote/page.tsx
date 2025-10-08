import { notFound } from 'next/navigation';
import { getContestantByUsername, getVotePacks } from '@/lib/public-contestant-actions';
import VoteContainer from '../../../components/vote/VoteContainer';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ 
    entry?: string;
    songId?: string;
    entries?: string;
  }>;
};

export default async function VotePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { entry, songId, entries } = await searchParams;
  
  // We need either an entry ID or a song ID with entries
  if (!entry && !(songId && entries)) {
    notFound();
  }

  const contestant = await getContestantByUsername(decodeURIComponent(slug));
  
  if (!contestant) {
    notFound();
  }

  const votePacks = await getVotePacks();
  
  if (songId && entries) {
    const entryIds = entries.split(',');
    
    // Find the first valid entry to get the song title
    const firstEntry = contestant.entries.find(e => entryIds.includes(e.id));
    if (!firstEntry) {
      notFound();
    }
    
    const songTitle = firstEntry.song.title;
    const profileImageUrl = contestant.profilePhoto 
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-photos/${contestant.profilePhoto}`
      : '/default.png';

    return (
      <VoteContainer 
        votePacks={votePacks}
        contestantId={contestant.id}
        contestantUsername={contestant.username}
        contestantProfilePhoto={profileImageUrl}
        songId={songId}
        entryIds={entryIds}
        songTitle={songTitle}
      />
    );
  }
} 