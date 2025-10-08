"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { MusicIcon, UserIcon, UserPlusIcon, CalendarIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ReviewStatus } from "@prisma/client"
import { EntryWithVotingDetails } from "@/lib/actions/competition/types"

const reviewStatusColors: Record<ReviewStatus, string> = {
  [ReviewStatus.PENDING_REVIEW]: 'bg-orange-200 text-orange-800',
  [ReviewStatus.UNASSIGNED]: 'bg-gray-200 text-gray-800',
  [ReviewStatus.COMPLETED]: 'bg-green-200 text-green-800',
  [ReviewStatus.REJECTED]: 'bg-red-200 text-red-800',
  [ReviewStatus.NEEDS_MORE_INFORMATION]: 'bg-orange-200 text-orange-800',
  [ReviewStatus.NEEDS_ANOTHER_REVIEW]: 'bg-orange-200 text-orange-800',
  [ReviewStatus.HIDDEN]: 'bg-gray-200 text-gray-800',
}

// Helper function to get screener name
const getScreenerName = (screener: any) => {
  if (screener?.users?.firstName && screener?.users?.lastName) {
    return `${screener.users.firstName} ${screener.users.lastName}`
  }
  return screener?.users?.email || 'Unknown'
}

// Helper function to get display status
const getDisplayStatus = (status: ReviewStatus): string => {
  switch (status) {
    case ReviewStatus.PENDING_REVIEW:
    case ReviewStatus.NEEDS_MORE_INFORMATION:
    case ReviewStatus.NEEDS_ANOTHER_REVIEW:
      return 'NEEDS REVIEW';
    case ReviewStatus.COMPLETED:
      return 'COMPLETED';
    case ReviewStatus.UNASSIGNED:
      return 'UNASSIGNED';
    default:
      return status.replace('_', ' ');
  }
}

export const columns: ColumnDef<EntryWithVotingDetails>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "songTitle",
    accessorFn: (row) => row.song.title,
    header: "Song",
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
    enableSorting: true
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
    id: "submittedAt",
    header: "Submitted",
    cell: ({ row }) => {
      const submitted = new Date(row.original.createdAt)
      return (
        <div className="flex items-center text-sm text-gray-700">
          <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
          {submitted.toLocaleDateString()}
        </div>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: "totalVotes",
    header: "Votes",
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.totalVotes || 0}</Badge>
    )
  },
  {
    accessorKey: "EntryReview",
    header: "Assigned To",
    cell: ({ row }) => {
      const entry = row.original
      
      if (entry.EntryReview && entry.EntryReview.length > 0) {
        return (
          <div className="space-y-1">
            {entry.EntryReview.map((review) => (
              <div key={review.id} className="flex items-center gap-2">
                <span className="text-sm">
                  {review.Screener ? getScreenerName(review.Screener) : 'Unknown'}
                </span>
              </div>
            ))}
          </div>
        )
      }
      
      return <span className="text-gray-500 text-sm">Not assigned</span>
    }
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const entry = row.original
      
      if (entry.EntryReview && entry.EntryReview.length > 0) {
        return (
          <div className="space-y-1">
            {entry.EntryReview.map((review) => (
              <Badge
                key={review.id}
                className={reviewStatusColors[review.status as ReviewStatus]}
              >
                {getDisplayStatus(review.status as ReviewStatus)}
              </Badge>
            ))}
          </div>
        )
      }
      
      return <Badge variant="outline">Unassigned</Badge>
    }
  }
]
