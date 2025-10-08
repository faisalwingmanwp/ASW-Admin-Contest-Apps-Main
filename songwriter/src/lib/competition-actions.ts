'use server';

import { prisma } from './db';

/**
 * Fetches all open competitions from the database
 */
export async function getOpenCompetitions() {
  try {
    const competitions = await prisma.competition.findMany({
      where: {
        open: true,
        archived: false,
      }
    });
    
    // Format competitions for the frontend
    const formattedCompetitions = competitions.map(comp => ({
      id: comp.id,
      name: comp.name,
      description: comp.description,
      price: comp.price, 
      stripePriceId: comp.stripePriceId || null,
      stripeProductId: comp.stripeProductId || null,
      fanVotingEnabled: Boolean(comp.fanVotingEnabled),
      startDate: comp.startDate.toISOString(),
      endDate: comp.endDate.toISOString()
    }));

    return { competitions: formattedCompetitions };
  } catch (error) {
    console.error('Error fetching competitions:', error);
    return { error: 'Failed to fetch competitions' };
  }
}
