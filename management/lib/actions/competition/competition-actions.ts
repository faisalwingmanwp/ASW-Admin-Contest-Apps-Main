"use server";

import { revalidatePath } from "next/cache";
import { 
  createStripeProduct, 
  updateStripeProduct, 
  createStripePrice, 
  updateProductPrice 
} from "@/lib/actions/stripe-product-actions";
import { CompetitionData } from "./types";
import { prisma } from "../../prisma";
import { EntryFilterParams, EntrySortParams, PaginatedEntriesResult, EntryWithVotingDetails } from "./types";
import { ReviewStatus } from "@prisma/client";
import { getOrCreateProduct } from "@/lib/actions/product-actions";
import { ProductType } from "@prisma/client";
import { requireAdmin } from "@/lib/actions/auth-guards";

// Define statuses that count as "In Review"
const IN_REVIEW_STATUSES = [
  ReviewStatus.PENDING_REVIEW,
  ReviewStatus.NEEDS_MORE_INFORMATION,
  ReviewStatus.NEEDS_ANOTHER_REVIEW,
];

export async function getCompetitions() {
  try {
    const competitions = await prisma.competition.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: { entries: true },
        },
        entries: {
          where: { paid: true },
          select: { paid: true },
        },
      },
    });

    const today = new Date();
    
    const competitionsWithStats = competitions.map(competition => {
      // Calculate revenue from entry fees
      const paidEntriesCount = competition.entries.length;
      const entryRevenue = paidEntriesCount * (competition.price / 100); // Convert cents to dollars
      
      // Determine competition status
      const startDate = new Date(competition.startDate);
      const endDate = new Date(competition.endDate);
      
      let status;
      if (competition.archived) {
        status = 'Archived';
      } else if (!competition.open) {
        status = 'Inactive';
      } else if (today > endDate) {
        status = 'Closed';
      } else if (today < startDate) {
        status = 'Upcoming';
      } else {
        status = 'Active';
      }
      
      return {
        id: competition.id,
        name: competition.name,
        description: competition.description,
        startDate: competition.startDate,
        endDate: competition.endDate,
        open: competition.open,
        price: competition.price,
        stripePriceId: competition.stripePriceId,
        stripeProductId: competition.stripeProductId,
        createdAt: competition.createdAt,
        archived: competition.archived,
        updatedAt: competition.updatedAt,
        entriesCount: competition._count.entries,
        revenue: entryRevenue,
        status: status
      };
    });
    
    return { competitions: competitionsWithStats };
  } catch (error) {
    console.error("Error fetching competitions:", error);
    return { error: "Failed to fetch competitions" };
  }
}

/**
 * Get competition details with stats
 */
export async function getCompetitionsWithStats() {
    try {
      const competitions = await prisma.competition.findMany({
        orderBy: { startDate: 'desc' },
        include: {
          _count: {
            select: { entries: true },
          },
        },
      });
  
      // Calculate revenue for each competition (simplified for now)
      const competitionsWithStats = await Promise.all(
        competitions.map(async (competition) => {
          // Count entries that are paid
          const paidEntries = await prisma.entry.count({
            where: {
              competitionId: competition.id,
              paid: true,
            },
          });
  
          // Calculate revenue (entry price * paid entries)
          const entryRevenue = paidEntries * (competition.price / 100); // Convert cents to dollars
  
          // Get vote revenue (more complex, would need to sum all votes related to entries in this competition)
          const voteRevenue = 0; // Simplified for now
          
          // Determine competition status
          let status;
          const now = new Date();
          
          if (competition.archived) {
            status = 'Archived';
          } else if (!competition.open) {
            status = 'Inactive';
          } else if (now > competition.endDate) {
            status = 'Closed';
          } else if (now < competition.startDate) {
            status = 'Upcoming';
          } else {
            status = 'Active';
          }
          
          return {
            ...competition,
            entriesCount: competition._count.entries,
            revenue: entryRevenue + voteRevenue,
            status
          };
        })
      );
  
      return { competitions: competitionsWithStats };
    } catch (error) {
      console.error("Error fetching competitions:", error);
      return { error: "Failed to fetch competitions" };
    }
}

/**
 * Get competition details without entries
 */
export async function getCompetition(id: string) {
  try {
    // First get the competition basic details
    const competition = await prisma.competition.findUnique({
      where: { id }
    });

    if (!competition) {
      return { error: "Contest not found" };
    }

    // Calculate competition stats with efficient queries
    // Get entry count
    const entriesCount = await prisma.entry.count({
      where: { competitionId: id }
    });

    // Get paid entry count
    const paidEntriesCount = await prisma.entry.count({
      where: { 
        competitionId: id,
        paid: true 
      }
    });

    // Get distinct contestant count (efficient query using distinct)
    const contestantsCount = await prisma.entry.groupBy({
      by: ['contestantId'],
      where: { competitionId: id },
      _count: true
    }).then(result => result.length);

    // Get total votes using aggregation
    const voteAggregation = await prisma.vote.aggregate({
      where: {
        entry: {
          competitionId: id
        }
      },
      _sum: {
        quantity: true
      }
    });
    const totalVotes = voteAggregation._sum.quantity || 0;

    // Calculate revenue (simplified for now)
    const revenue = paidEntriesCount * (competition.price / 100);
    
    const competitionData = {
      ...competition,
      stats: {
        entriesCount,
        paidEntriesCount,
        contestantsCount,
        totalVotes,
        revenue
      }
    };

    return { competition: competitionData };
  } catch (error) {
    console.error("Error fetching competition:", error);
    return { error: "Failed to fetch competition details" };
  }
}

/**
 * Create a new competition
 */
export async function createCompetition(data: CompetitionData) {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    // Create a Stripe product for the competition
    let stripeProductId: string | undefined = data.stripeProductId;
    let stripePriceId: string | undefined = data.stripePriceId;
    
    // Only create Stripe product if one isn't provided
    if (!stripeProductId) {
      try {
        // Create a Stripe product
        const productResult = await createStripeProduct(
          data.name,
          data.description
        );
        stripeProductId = productResult.productId;
        
        // Create a price for the product
        const priceResult = await createStripePrice(stripeProductId, data.price);
        stripePriceId = priceResult.priceId;
      } catch (stripeError) {
        console.error("Error creating Stripe product/price:", stripeError);
        // Continue with competition creation even if Stripe fails
      }
    }
    
    // Create the competition with Stripe IDs (if available)
    const competition = await prisma.competition.create({
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        price: data.price,
        open: data.open !== undefined ? data.open : true,
        fanVotingEnabled: Boolean(data.fanVotingEnabled),
        stripeProductId,
        stripePriceId,
      },
    });

    // If fan voting is enabled, ensure the FAN_CONTEST product exists (global)
    try {
      if (data.fanVotingEnabled) {
        await getOrCreateProduct({ name: "Fan Contest Entry", price: 5.0, type: ProductType.FAN_CONTEST });
      }
    } catch (err) {
      console.warn("Fan voting enablement: could not ensure FAN_CONTEST product", err);
      // Non-fatal; contest is still created.
    }

    revalidatePath("/dashboard/fan-voting");
    return { competition };
  } catch (error) {
    console.error("Error creating competition:", error);
    return { error: "Failed to create competition" };
  }
}

/**
 * Update an existing competition
 */
export async function updateCompetition(id: string, data: Partial<CompetitionData>) {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    // First, get the current competition to check if we need to create/update Stripe products
    const existingCompetition = await prisma.competition.findUnique({
      where: { id }
    });
    
    if (!existingCompetition) {
      return { error: "Contest not found" };
    }
    
    // Handle Stripe integration
    let stripeProductId = data.stripeProductId;
    let stripePriceId = data.stripePriceId;
    
    // Check if price has changed or if Stripe product doesn't exist yet
    const priceChanged = data.price !== undefined && data.price !== existingCompetition.price;
    const needsStripeProduct = !existingCompetition.stripeProductId;
    
    try {
      // Create a new Stripe product if it doesn't exist
      if (needsStripeProduct) {
        const productName = data.name || existingCompetition.name;
        const productResult = await createStripeProduct(
          productName,
          data.description || existingCompetition.description || undefined
        );
        stripeProductId = productResult.productId;
        
        // Create initial price
        const priceAmount = data.price || existingCompetition.price;
        const priceResult = await createStripePrice(stripeProductId, priceAmount);
        stripePriceId = priceResult.priceId;
      }
      // If product exists but price changed, create a new price
      else if (priceChanged && existingCompetition.stripeProductId) {
        // Update product details if needed
        if (data.name || data.description) {
          await updateStripeProduct(
            existingCompetition.stripeProductId,
            data.name || existingCompetition.name,
            data.description || existingCompetition.description || undefined
          );
        }
        
        // Create new price
        const priceResult = await updateProductPrice(existingCompetition.stripeProductId, data.price!);
        stripePriceId = priceResult.priceId;
      }
    } catch (stripeError) {
      console.error("Stripe integration error:", stripeError);
      // Continue with DB update even if Stripe fails
    }
    
    // If fan voting is being enabled now, ensure the FAN_CONTEST product exists
    try {
      if (data.fanVotingEnabled && !existingCompetition.fanVotingEnabled) {
        await getOrCreateProduct({ name: "Fan Contest Entry", price: 5.0, type: ProductType.FAN_CONTEST });
      }
    } catch (err) {
      console.warn("Fan voting enablement (update): could not ensure FAN_CONTEST product", err);
      // Non-fatal; continue with update
    }

    // Prepare the data object with Stripe IDs if available
    const updateData = {
      ...data,
      stripeProductId: stripeProductId || data.stripeProductId,
      stripePriceId: stripePriceId || data.stripePriceId
    };
    
    // Update the competition in the database
    const competition = await prisma.competition.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/dashboard/fan-voting");
    return { competition };
  } catch (error) {
    console.error("Error updating competition:", error);
    return { error: "Failed to update competition" };
  }
}


//  =========== Competition Entry Actions ===========

/**
 * Get paginated entries for a competition with filtering and sorting
 */
export async function getCompetitionEntries(
  competitionId: string,
  page: number = 1,
  pageSize: number = 20,
  filters: EntryFilterParams = {},
  sort: EntrySortParams = { field: 'votes', direction: 'desc' }
): Promise<{ data: PaginatedEntriesResult | null; error: string | null }> {
  try {
    const skip = (page - 1) * pageSize;
    
    // Build where conditions for filtering
    const whereConditions: any = { competitionId };
    
    if (filters.categoryId) {
      whereConditions.categoryId = filters.categoryId;
    }
    
    if (filters.paid !== undefined) {
      whereConditions.paid = filters.paid;
    }
    
    if (filters.hidden !== undefined) {
      whereConditions.hidden = filters.hidden;
    }
    
    const andConditions: any[] = [];
    
    if (filters.searchTerm) {
      const term = filters.searchTerm.trim();
      andConditions.push({
        OR: [
          // Song title
          { song: { title: { contains: term, mode: 'insensitive' } } },
          // Contestant username or email
          { contestant: { username: { contains: term, mode: 'insensitive' } } },
          { contestant: { email: { contains: term, mode: 'insensitive' } } },
          // Entry ID
          { id: { contains: term, mode: 'insensitive' } },
          // Stripe transaction IDs associated to fan votes on this entry
          { votes: { some: { transactionId: { contains: term, mode: 'insensitive' } } } },
        ]
      });
    }

    if (filters.reviewStatus) {
      if (filters.reviewStatus === 'UNASSIGNED') {
        andConditions.push({ EntryReview: { none: {} } });
      } else if (Array.isArray(filters.reviewStatus)) {
        andConditions.push({ EntryReview: { some: { status: { in: filters.reviewStatus } } } });
      } else {
        andConditions.push({ EntryReview: { some: { status: filters.reviewStatus } } });
      }
    }

    // Date range filter by submission date (createdAt)
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

    if (andConditions.length > 0) {
      whereConditions.AND = andConditions;
    }
    
    // Get total count for pagination
    const totalCount = await prisma.entry.count({ where: whereConditions });
    const pageCount = Math.ceil(totalCount / pageSize);
    
    // Build order by condition based on sort parameters
    let orderBy: any;
    
    if (sort.field === 'songTitle') {
      orderBy = { song: { title: sort.direction } };
    } else if (sort.field === 'createdAt') {
      orderBy = { createdAt: sort.direction };
    } else if (sort.field === 'reviewStatus') {
      orderBy = { createdAt: 'desc' };
    } else {
      orderBy = { createdAt: 'desc' };
    }
    
    const entriesData = await prisma.entry.findMany({
      where: whereConditions,
      include: {
        competition: {
          select: {
            startDate: true,
            endDate: true,
          }
        },
        contestant: {
          select: {
            id: true,
            email: true,
            username: true
          }
        },
        category: true,
        song: {
          select: {
            id: true,
            title: true,
            link: true,
          }
        },
        EntryReview: {
          include: {
            Screener: {
              include: {
                users: {
                  select: {
                    email: true,
                    first_name: true,
                    last_name: true
                  }
                }
              }
            }
          }
        },
        // Pre-aggregate vote counts to avoid loading all individual votes
        _count: {
          select: {
            votes: true
          }
        },
        // For vote calculation, get the sum directly
        votes: {
          select: {
            quantity: true
          },
          take: 100 // Limit to avoid fetching too many votes if an entry has thousands
        }
      },
      orderBy,
      skip,
      take: pageSize
    });
    
    // Transform entries for client-side consumption with calculated vote totals
    const transformedEntries: EntryWithVotingDetails[] = entriesData.map(entry => {
      // Calculate total votes efficiently
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
        totalVotes,
        paid: Boolean(entry.paid),
        hidden: entry.hidden,
        competition: entry.competition ? {
          startDate: entry.competition.startDate,
          endDate: entry.competition.endDate,
        } : undefined,
        contestant: {
          id: entry.contestant.id,
          email: entry.contestant.email || '',
          username: entry.contestant.username
        },
        category: {
          id: entry.category.id,
          title: entry.category.title,
          icon: entry.category.icon
        },
        song: {
          id: entry.song.id,
          title: entry.song.title,
          audioUrl: entry.song.link || '',
        },
        EntryReview: entry.EntryReview.map(review => ({
          id: review.id,
          status: review.status,
          hidden: entry.hidden,
          Screener: review.Screener ? {
            id: review.Screener.id,
            userId: review.Screener.userId,
            users: {
              email: review.Screener.users?.email || '',
              first_name: review.Screener.users?.first_name || null,
              last_name: review.Screener.users?.last_name || null
            }
          } : undefined
        }))
      };
    });
    
    // If sorting by votes, sort in memory after calculating vote totals
    if (sort.field === 'votes') {
      transformedEntries.sort((a, b) => {
        return sort.direction === 'desc' 
          ? b.totalVotes - a.totalVotes 
          : a.totalVotes - b.totalVotes;
      });
    }
    
    // If sorting by review status, prioritize entries not completed
    if (sort.field === 'reviewStatus') {
      transformedEntries.sort((a, b) => {
        // Check if entry has any reviews
        const aHasReviews = a.EntryReview.length > 0;
        const bHasReviews = b.EntryReview.length > 0;
        
        // Check if any review is completed
        const aHasCompletedReview = aHasReviews && a.EntryReview.some(r => r.status === 'COMPLETED');
        const bHasCompletedReview = bHasReviews && b.EntryReview.some(r => r.status === 'COMPLETED');
        
        if (sort.direction === 'asc') {
          // Sort by: No reviews > Has reviews but none completed > Has completed reviews
          if (!aHasReviews && bHasReviews) return -1;
          if (aHasReviews && !bHasReviews) return 1;
          if (!aHasCompletedReview && bHasCompletedReview) return -1;
          if (aHasCompletedReview && !bHasCompletedReview) return 1;
          return 0;
        } else {
          // For desc direction, reverse the order
          if (!aHasReviews && bHasReviews) return 1;
          if (aHasReviews && !bHasReviews) return -1;
          if (!aHasCompletedReview && bHasCompletedReview) return 1;
          if (aHasCompletedReview && !bHasCompletedReview) return -1;
          return 0;
        }
      });
    }
    
    return { 
      data: {
        entries: transformedEntries,
        totalCount,
        pageCount
      }, 
      error: null 
    };
  } catch (error) {
    console.error("Error fetching competition entries:", error);
    return { data: null, error: "Failed to fetch competition entries" };
  }
}

/**
 * Get competition entry status counts
 */
export async function getCompetitionEntryStatusCounts(competitionId: string) {
  try {
    const unassignedCount = await prisma.entry.count({
      where: {
        competitionId,
        hidden: false,
        EntryReview: {
          none: {},
        },
      },
    });

    const inReviewCount = await prisma.entry.count({
      where: {
        competitionId,
        hidden: false,
        EntryReview: {
          some: {
            status: {
              in: IN_REVIEW_STATUSES,
            },
          },
        },
      },
    });

    const reviewedCount = await prisma.entry.count({
      where: {
        competitionId,
        hidden: false,
        EntryReview: {
          some: {
            status: 'COMPLETED',
          },
        },
      },
    });

    const hiddenCount = await prisma.entry.count({
      where: {
        competitionId,
        hidden: true,
      },
    });

    return {
      data: {
        unassigned: unassignedCount,
        inReview: inReviewCount,
        reviewed: reviewedCount,
        hidden: hiddenCount,
      },
      error: null,
    };
  } catch (error: any) {
    console.error("Error fetching entry status counts:", error);
    return { data: null, error: "Failed to fetch counts" };
  }
}

/**
 * Archive or unarchive a competition
 */
export async function toggleCompetitionArchiveStatus(id: string, archive: boolean) {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    const competition = await prisma.competition.update({
      where: { id },
      data: { archived: archive }
    });

    revalidatePath('/dashboard/competitions');
    return { success: true, competition };
  } catch (error) {
    console.error("Error updating competition archive status:", error);
    return { error: "Failed to update competition status" };
  }
}

/**
 * Get top entries for a competition (for dashboard/leaderboard)
 */
export async function getTopCompetitionEntries(
  competitionId: string, 
  limit: number = 10
): Promise<{ entries: EntryWithVotingDetails[] | null; error: string | null }> {
  try {
    // Get entries with aggregate vote counts
    const entries = await prisma.entry.findMany({
      where: { competitionId },
      include: {
        contestant: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        category: true,
        song: {
          select: {
            id: true,
            title: true,
            link: true,
          }
        },
        votes: {
          select: {
            quantity: true
          }
        }
      },
      take: limit * 3 // Fetch more than needed to filter by votes
    });

    // Calculate vote counts and transform
    const entriesWithVotes = entries.map(entry => {
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
        totalVotes,
        paid: Boolean(entry.paid),
        hidden: entry.hidden,
        contestant: {
          id: entry.contestant.id,
          email: entry.contestant.email || '',
          username: entry.contestant.username
        },
        category: {
          id: entry.category.id,
          title: entry.category.title,
          icon: entry.category.icon
        },
        song: {
          id: entry.song.id,
          title: entry.song.title,
          audioUrl: entry.song.link || '',
        },
        EntryReview: [] // Not needed for leaderboard display
      };
    });

    // Sort by vote count and limit results
    const topEntries = entriesWithVotes
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .slice(0, limit);

    return { entries: topEntries, error: null };
  } catch (error) {
    console.error("Error fetching top entries:", error);
    return { entries: null, error: "Failed to fetch top entries" };
  }
}
