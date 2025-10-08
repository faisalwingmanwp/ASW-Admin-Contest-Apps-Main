import { ReviewStatus } from "@prisma/client";

export type EntryWithVotingDetails = {
    id: string;
    competitionId: string;
    contestantId: string;
    categoryId: string;
    songId: string;
    createdAt: Date;
    updatedAt: Date;
    totalVotes: number;
    paid: boolean;
    hidden: boolean;
    // Competition timing (optional to avoid breaking other callers)
    competition?: {
      startDate: Date;
      endDate: Date;
    };
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
    };
    EntryReview: {
      id: string;
      status: ReviewStatus;
      Screener?: {
        id: string;
        userId: string;
        users: {
          email: string;
          first_name: string | null;
          last_name: string | null;
        };
      };
    }[];
};

export type EntryFilterParams = {
categoryId?: string;
paid?: boolean;
searchTerm?: string;
reviewStatus?: string | string[];
hidden?: boolean;
dateFrom?: string; // ISO date (yyyy-mm-dd)
dateTo?: string;   // ISO date (yyyy-mm-dd)
};
  
export type EntrySortParams = {
    field: 'votes' | 'createdAt' | 'songTitle' | 'reviewStatus' | 'averageScore';
    direction: 'asc' | 'desc';
};

export type PaginatedEntriesResult = {
    entries: EntryWithVotingDetails[];
    totalCount: number;
    pageCount: number;
};


export type CompetitionData = {
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    price: number;
    open?: boolean;
    fanVotingEnabled?: boolean;
    stripeProductId?: string;
    stripePriceId?: string;
};
