"use server";

import prisma from "../db";
import { ReviewStatus } from "@prisma/client";

export type EntryReviewDetails = {
  id: string;
  screenerId: string;
  status: ReviewStatus;
  notes: string | null;
  overallScore: number | null;
  reviewedAt: Date | null;
  assignedAt: Date;
  reviewRound: number;
  screener: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
};

export type EntryWithDetailedReviews = {
  id: string;
  competitionId: string;
  contestantId: string;
  categoryId: string;
  songId: string;
  createdAt: Date;
  updatedAt: Date;
  paid: boolean;
  hidden: boolean;
  totalVotes: number;
  averageScore: number | null;
  contestant: {
    id: string;
    email: string | null;
    username: string;
  };
  category: {
    id: string;
    title: string;
    icon: string | null;
  };
  song: {
    id: string;
    title: string;
    audioUrl: string;
    artistName: string | null;
    coWriters: string | null;
  };
  reviews: EntryReviewDetails[];
};

export async function getEntryWithDetailedReviews(entryId: string) {
  try {
    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      include: {
        contestant: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        category: true,
        song: {
          select: {
            id: true,
            title: true,
            link: true,
            artistName: true,
            coWriters: true,
          },
        },
        EntryReview: {
          include: {
            Screener: {
              include: {
                users: {
                  select: {
                    id: true,
                    email: true,
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            reviewRound: 'desc',
          },
        },
        votes: {
          select: {
            quantity: true,
          },
        },
      },
    });

    if (!entry) {
      return { error: "Entry not found" };
    }

    // Calculate total votes
    const totalVotes = entry.votes.reduce(
      (sum: number, vote: { quantity: number }) => sum + vote.quantity,
      0
    );

    // Calculate average score from completed reviews
    const completedReviews = entry.EntryReview.filter(
      (review) => review.status === ReviewStatus.COMPLETED && review.overallScore !== null
    );
    
    const averageScore = completedReviews.length > 0
      ? completedReviews.reduce((sum, review) => sum + (review.overallScore || 0), 0) / completedReviews.length
      : null;

    // Transform the data
    const transformedEntry: EntryWithDetailedReviews = {
      id: entry.id,
      competitionId: entry.competitionId,
      contestantId: entry.contestantId,
      categoryId: entry.categoryId,
      songId: entry.songId,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      paid: entry.paid,
      hidden: entry.hidden,
      totalVotes,
      averageScore,
      contestant: {
        id: entry.contestant.id,
        email: entry.contestant.email,
        username: entry.contestant.username,
      },
      category: {
        id: entry.category.id,
        title: entry.category.title,
        icon: entry.category.icon,
      },
      song: {
        id: entry.song.id,
        title: entry.song.title,
        audioUrl: entry.song.link || '',
        artistName: entry.song.artistName || null,
        coWriters: entry.song.coWriters || null,
      },
      reviews: entry.EntryReview.map((review) => ({
        id: review.id,
        screenerId: review.screenerId,
        status: review.status,
        notes: review.notes,
        overallScore: review.overallScore,
        reviewedAt: review.reviewedAt,
        assignedAt: review.assignedAt,
        reviewRound: review.reviewRound,
        screener: {
          id: review.Screener.id,
          email: review.Screener.users?.email || '',
          firstName: review.Screener.users?.first_name || null,
          lastName: review.Screener.users?.last_name || null,
        },
      })),
    };

    return { entry: transformedEntry };
  } catch (error: any) {
    console.error("Error fetching entry details:", error);
    return { error: error.message || "Failed to fetch entry details" };
  }
}

export async function getEntriesWithScores(
  competitionId: string,
  page: number = 1,
  pageSize: number = 20,
  filters: {
    categoryId?: string;
    searchTerm?: string;
    minScore?: number;
    maxScore?: number;
    dateFrom?: string;
    dateTo?: string;
  } = {},
  sortParams: {
    field?: 'averageScore' | 'songTitle' | 'totalVotes' | 'createdAt';
    direction?: 'asc' | 'desc';
  } = { field: 'averageScore', direction: 'desc' }
) {
  try {
    const skip = (page - 1) * pageSize;
    
    // Build where conditions
    const whereConditions: any = {
      competitionId,
      hidden: false,
      EntryReview: {
        some: {
          status: ReviewStatus.COMPLETED,
        },
      },
    };

    if (filters.categoryId) {
      whereConditions.categoryId = filters.categoryId;
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.trim();
      whereConditions.OR = [
        // Song title
        { song: { title: { contains: term, mode: 'insensitive' } } },
        // Contestant username or email
        { contestant: { username: { contains: term, mode: 'insensitive' } } },
        { contestant: { email: { contains: term, mode: 'insensitive' } } },
        // Entry ID
        { id: { contains: term, mode: 'insensitive' } },
        // Stripe transaction IDs associated to fan votes on this entry
        { votes: { some: { transactionId: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    // Apply submission date range if provided
    if (filters.dateFrom || filters.dateTo) {
      const createdAt: any = {};
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        from.setHours(0, 0, 0, 0);
        createdAt.gte = from;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        createdAt.lte = to;
      }
      whereConditions.createdAt = createdAt;
    }

    // First, find all eligible entry IDs based on filters
    const eligibleEntries = await prisma.entry.findMany({
      where: whereConditions,
      select: { id: true },
    });

    const eligibleEntryIds = eligibleEntries.map((e) => e.id);

    if (eligibleEntryIds.length === 0) {
      return {
        data: {
          entries: [],
          totalCount: 0,
          pageCount: 0,
        },
        error: null,
      };
    }

    // Build having clause for average score range if provided
    const havingAvg: any = {};
    if (typeof filters.minScore === 'number') {
      havingAvg.gte = filters.minScore;
    }
    if (typeof filters.maxScore === 'number') {
      havingAvg.lte = filters.maxScore;
    }

    const having = Object.keys(havingAvg).length
      ? { overallScore: { _avg: havingAvg } }
      : undefined;

    // Determine total count of entries that have at least one completed review with a score,
    // and match the average score range (if provided)
    const allGroupsForCount = await prisma.entryReview.groupBy({
      by: ['entryId'],
      where: {
        entryId: { in: eligibleEntryIds },
        status: ReviewStatus.COMPLETED,
        overallScore: { not: null },
      },
      _avg: { overallScore: true },
      having,
    });

    const totalCount = allGroupsForCount.length;
    const pageCount = Math.ceil(totalCount / pageSize);

    // Use groupBy to compute averages and sort by average score (for averageScore field)
    let grouped;
    if (sortParams.field === 'averageScore' || !sortParams.field) {
      // For averageScore sorting, use database-level sorting and pagination
      grouped = await prisma.entryReview.groupBy({
        by: ['entryId'],
        where: {
          entryId: { in: eligibleEntryIds },
          status: ReviewStatus.COMPLETED,
          overallScore: { not: null },
        },
        _avg: { overallScore: true },
        _count: { _all: true },
        having,
        orderBy: {
          _avg: { overallScore: sortParams.direction || 'desc' },
        },
        skip,
        take: pageSize,
      });
    } else {
      // For other sorting fields, get all entries (no pagination here, we'll sort and paginate client-side)
      grouped = await prisma.entryReview.groupBy({
        by: ['entryId'],
        where: {
          entryId: { in: eligibleEntryIds },
          status: ReviewStatus.COMPLETED,
          overallScore: { not: null },
        },
        _avg: { overallScore: true },
        _count: { _all: true },
        having,
      });
    }
    

    const pageEntryIds = grouped.map((g) => g.entryId);

    if (pageEntryIds.length === 0) {
      return {
        data: {
          entries: [],
          totalCount,
          pageCount,
        },
        error: null,
      };
    }

    // Fetch entry details
    const pageEntries = await prisma.entry.findMany({
      where: { id: { in: pageEntryIds } },
      include: {
        contestant: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        category: true,
        song: {
          select: {
            id: true,
            title: true,
            link: true,
          },
        },
        votes: {
          select: {
            quantity: true,
          },
        },
      },
    });

    const entryMap = new Map(pageEntries.map((e) => [e.id, e]));

    // Compose results in the same order as the grouped results
    let results = grouped
      .map((g) => {
        const entry = entryMap.get(g.entryId);
        if (!entry) return null;
        const totalVotes = entry.votes.reduce(
          (sum: number, vote: { quantity: number }) => sum + vote.quantity,
          0
        );
        return {
          id: entry.id,
          competitionId: entry.competitionId,
          contestantId: entry.contestantId,
          categoryId: entry.categoryId,
          songId: entry.songId,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          paid: entry.paid,
          hidden: entry.hidden,
          totalVotes,
          averageScore: g._avg.overallScore ?? null,
          reviewCount: g._count._all,
          contestant: {
            id: entry.contestant.id,
            email: entry.contestant.email || '',
            username: entry.contestant.username,
          },
          category: {
            id: entry.category.id,
            title: entry.category.title,
            icon: entry.category.icon,
          },
          song: {
            id: entry.song.id,
            title: entry.song.title,
            audioUrl: entry.song.link || '',
          },
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    // Apply client-side sorting for non-averageScore fields
    if (sortParams.field && sortParams.field !== 'averageScore') {
      results.sort((a, b) => {
        let comparison = 0;
        
        switch (sortParams.field) {
          case 'songTitle':
            comparison = a.song.title.localeCompare(b.song.title);
            break;
          case 'totalVotes':
            comparison = a.totalVotes - b.totalVotes;
            break;
          case 'createdAt':
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
        }
        
        return sortParams.direction === 'desc' ? -comparison : comparison;
      });
      
      // Apply pagination after sorting for non-averageScore fields
      results = results.slice(skip, skip + pageSize);
    }

    return {
      data: {
        entries: results,
        totalCount,
        pageCount,
      },
      error: null,
    };
  } catch (error: any) {
    console.error("Error fetching entries with scores:", error);
    return {
      data: {
        entries: [],
        totalCount: 0,
        pageCount: 0,
      },
      error: error.message || "Failed to fetch entries with scores",
    };
  }
}
