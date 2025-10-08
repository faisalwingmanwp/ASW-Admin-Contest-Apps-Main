"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MusicIcon, UserIcon, ArrowUpDown, BarChart2 } from "lucide-react"

export type EntryWithVotingDetails = {
  id: string
  competitionId: string
  categoryId: string
  songId: string
  contestantId: string
  createdAt: string
  updatedAt: string
  paid: boolean
  totalVotes: number
  rank?: number
  contestant: {
    id: string
    email: string
    username: string
  }
  category: {
    id: string
    title: string
    icon: string | null
  }
  song: {
    id: string
    title: string
    audioUrl: string
  }
}

export const columns: ColumnDef<EntryWithVotingDetails>[] = [
  {
    accessorKey: "rank",
    header: () => <div className="w-12 text-center font-medium text-gray-500 uppercase text-xs">RANK</div>,
    cell: ({ row }) => {
      const rank = row.original.rank || row.index + 1
      return (
        <div className="flex justify-center">
          <div 
            className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${rank === 1 ? 'bg-yellow-500 text-white' : 
                rank === 2 ? 'bg-gray-400 text-white' : 
                rank === 3 ? 'bg-amber-700 text-white' : 
                'bg-gray-100 text-gray-700'}
            `}
          >
            {rank}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "totalVotes",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "desc")}
          className="min-w-[120px] text-gray-500 uppercase text-xs font-medium"
        >
          VOTES
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const votes = parseFloat(row.getValue("totalVotes")) || 0
      return (
        <div className="text-left font-medium">
          {votes.toLocaleString()}
        </div>
      )
    },
  },
  {
    accessorKey: "song.title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="pl-2 text-gray-500 uppercase text-xs font-medium"
        >
          TITLE
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="max-w-md truncate font-medium">
        {row.original.song.title}
      </div>
    ),
  },
  {
    accessorKey: "contestant.username",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-gray-500 uppercase text-xs font-medium"
        >
          ARTIST
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="text-gray-600">{row.original.contestant.username}</div>,
  },
  {
    accessorKey: "category.title",
    header: () => <div className="text-gray-500 uppercase text-xs font-medium">GENRE</div>,
    cell: ({ row }) => (
      <div className="text-gray-600">
        {row.original.category.title}
      </div>
    ),
  },
  
]
