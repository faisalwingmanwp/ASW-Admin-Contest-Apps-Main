'use server';

import { prisma } from './db';
import { revalidatePath } from 'next/cache';

/**
 * Get a contestant by username with related entries and vote data
 * This function is optimized to fetch only what's needed for the profile page
 */
export async function getContestantByUsername(username: string) {
  // First fetch the contestant
  const contestant = await prisma.contestant.findFirst({
    where: { username },
    include: {
      entries: {
        where: {
          paid: true
        },
        include: {
          song: true,
          category: true,
          competition: true,
          // Don't include votes here - we'll get them separately in getContestantVotes
        },
      },
    },
  });
  
  return contestant;
}

/**
 * Get vote packs ordered by quantity
 */
export async function getVotePacks() {
  const packs = await prisma.votePack.findMany({
    include: {
      product: true,
    },
    orderBy: {
      quantity: 'asc',
    },
  });
  
  return packs
} 



export async function getContestantVotes(contestantId: string) {
  // Get all vote records where this contestant is the beneficiary
  const entries = await prisma.entry.findMany({
    where: {
      contestantId: contestantId,
      paid: true,
    },
    include: {
      votes: true,
      song: true,
      category: true,
    },
  });

  // Create a map to store votes per entry
  const entryVotesMap = new Map();
  const songTransactionMap = new Map(); 
  const songEntryMap = new Map();
  
  // Step 1: Build a mapping of songs to their entries
  for (const entry of entries) {
    if (!songEntryMap.has(entry.songId)) {
      songEntryMap.set(entry.songId, []);
    }
    songEntryMap.get(entry.songId).push(entry);
    
    // Initialize entry vote counts
    entryVotesMap.set(entry.id, 0);
  }
  
  // Step 2: Calculate votes per entry while tracking transactions
  for (const entry of entries) {
    let entryVotes = 0;
    
    console.log('entry', entry.votes);
    for (const vote of entry.votes) {
      // Add votes to this specific entry's count
      entryVotes += vote.quantity;
      
      // Track transactions per song to avoid double counting in total
      if (vote.transactionId) {
        const key = `${entry.songId}-${vote.transactionId}`;
        if (!songTransactionMap.has(key)) {
          songTransactionMap.set(key, vote.quantity);
        }
      }
    }
    
    // Set the total votes for this specific entry
    entryVotesMap.set(entry.id, entryVotes);
  }
  
  // Step 3: Calculate unique votes by counting each transaction only once per song
  let totalVotes = 0;
  for (const voteCount of songTransactionMap.values()) {
    totalVotes += voteCount;
  }

  // Create a map of songs to their deduplicated vote counts
  const songVotesMap = new Map();
  
  // Fill the song votes map based on the song-transaction data
  songEntryMap.forEach((entries, songId) => {
    // Get all transactions for this song
    const voteCount = Array.from(songTransactionMap.entries())
      .filter(([key]) => key.startsWith(`${songId}-`))
      .reduce((sum, [_, count]) => sum + count, 0);
    
    songVotesMap.set(songId, voteCount);
  });
  
  return {
    entries,
    totalVotes,
    entryVotesMap: Object.fromEntries(entryVotesMap),
    songVotesMap: Object.fromEntries(songVotesMap),
  };
}