"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MusicIcon, UserIcon, Star, ArrowUpDown } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export type ReviewedEntry = {
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
  reviewCount: number;
  contestant: {
    id: string;
    email: string;
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
};

export const createReviewedColumns = (onSort?: (field: string, direction: 'asc' | 'desc') => void): ColumnDef<ReviewedEntry>[] => [
  {
    id: "songTitle",
    accessorFn: (row) => row.song.title,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Song
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const entry = row.original
      return (
        <div className="font-medium flex items-center gap-2">
          <MusicIcon className="h-4 w-4 text-gray-500" />
          <div>
            <div>{entry.song.title}</div>
            <div className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "averageScore",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => {
            const isAsc = column.getIsSorted() === "asc";
            const newDirection = isAsc ? "desc" : "asc";
            column.toggleSorting(isAsc);
            onSort && onSort('averageScore', newDirection);
          }}
        >
          Average Score
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const score = row.original.averageScore;
      const reviewCount = row.original.reviewCount;
      
      if (score === null) {
        return <span className="text-gray-400">No score</span>;
      }
      
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="ml-1 font-semibold">{score.toFixed(1)}</span>
          </div>
          <span className="text-xs text-gray-500">({reviewCount} reviews)</span>
        </div>
      );
    },
  },
  {
    accessorKey: "category.title",
    header: "Category",
    cell: ({ row }) => {
      const entry = row.original
      return (
        <Badge variant="outline">
          {entry.category.icon && <span className="mr-1">{entry.category.icon}</span>}
          {entry.category.title}
        </Badge>
      )
    }
  },
  {
    accessorKey: "contestant.username",
    header: "Contestant",
    cell: ({ row }) => {
      const entry = row.original
      return (
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-gray-500" />
          <div>
            <div>{entry.contestant.username}</div>
            <div className="text-xs text-gray-500">
              {entry.contestant.email}
            </div>
          </div>
        </div>
      )
    }
  },
  {
    accessorKey: "totalVotes",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Fan Votes
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.totalVotes || 0}</Badge>
    )
  },
];

// Export default columns for backward compatibility
export const reviewedColumns = createReviewedColumns();