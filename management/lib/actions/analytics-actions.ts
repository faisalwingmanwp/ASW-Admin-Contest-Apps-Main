"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth-guards";


// Analytics Actions
export async function getVotingAnalytics() {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    // Get overall stats
    const totalCompetitions = await prisma.competition.count();
    const totalEntries = await prisma.entry.count();
    const totalVotes = await prisma.vote.aggregate({
      _sum: {
        quantity: true,
      },
    });
    
    // Calculate total revenue
    // Get all paid entries to calculate revenue manually
    const paidEntries = await prisma.entry.findMany({
      where: { paid: true },
      include: {
        product: true,
      },
    });
    
    // Calculate revenue by summing up product prices
    const entryRevenue = paidEntries.reduce(
      (sum, entry) => sum + (entry.product?.price || 0),
      0
    );
    
    // Get total vote revenue
    const voteRevenueResult = await prisma.vote.aggregate({
      _sum: {
        priceAtPurchase: true,
      },
    });

    // Get recent votes (last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const recentVotes = await prisma.vote.findMany({
      where: {
        createdAt: {
          gte: lastWeek,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      include: {
        fan: true,
        entry: {
          include: {
            song: true,
            contestant: true,
          },
        },
      },
    });

    return {
      stats: {
        totalCompetitions,
        totalEntries,
        totalVotes: totalVotes._sum.quantity || 0,
        totalRevenue: (entryRevenue + (voteRevenueResult._sum?.priceAtPurchase || 0)) / 100,
      },
      recentActivity: recentVotes,
    };
  } catch (error) {
    console.error("Error fetching voting analytics:", error);
    return { error: "Failed to fetch analytics data" };
  }
}
