'use server';

import { prisma } from '@/lib/db';
import { getCurrentContestant } from '@/lib/auth-actions';

export async function getContestantOrders() {
  const contestant = await getCurrentContestant();
  
  if (!contestant) {
    throw new Error('Contestant not found');
  }

  try {
    // Fetch purchases (membership, fan contest, etc.)
    const purchases = await prisma.purchase.findMany({
      where: {
        contestantId: contestant.id
      },
      include: {
        product: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fetch all entries (both paid and unpaid) with song categories
    const entries = await prisma.entry.findMany({
      where: {
        contestantId: contestant.id
      },
      include: {
        song: {
          include: {
            songCategories: {
              include: {
                category: true
              }
            }
          }
        },
        category: true,
        competition: true,
        product: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform entries to include all categories from songCategories
    const transformedEntries = entries.map(entry => ({
      ...entry,
      allCategories: entry.song.songCategories.map(sc => sc.category)
    }));

    // Separate paid and unpaid entries
    const paidEntries = transformedEntries.filter(entry => entry.paid);
    const unpaidEntries = transformedEntries.filter(entry => !entry.paid);

    // Calculate totals
    const totalOrders = purchases.length + transformedEntries.length;
    const completedOrders = purchases.length + paidEntries.length;
    const incompleteOrders = unpaidEntries.length;

    return {
      purchases,
      entries: transformedEntries,
      paidEntries,
      unpaidEntries,
      stats: {
        totalOrders,
        completedOrders,
        incompleteOrders
      }
    };
  } catch (error) {
    console.error('Error fetching contestant orders:', error);
    throw new Error('Failed to fetch order history');
  }
}

export async function getOrderStats() {
  const contestant = await getCurrentContestant();
  
  if (!contestant) {
    throw new Error('Contestant not found');
  }

  try {
    const totalSpent = await prisma.purchase.aggregate({
      where: {
        contestantId: contestant.id
      },
      _sum: {
        priceAtPurchase: true
      }
    });

    const totalEntries = await prisma.entry.count({
      where: {
        contestantId: contestant.id,
        paid: true
      }
    });

    const activeMembership = await prisma.purchase.findFirst({
      where: {
        contestantId: contestant.id,
        product: {
          type: 'MEMBERSHIP'
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      totalSpent: totalSpent._sum.priceAtPurchase || 0,
      totalEntries,
      hasMembership: !!activeMembership
    };
  } catch (error) {
    console.error('Error fetching order stats:', error);
    throw new Error('Failed to fetch order statistics');
  }
} 