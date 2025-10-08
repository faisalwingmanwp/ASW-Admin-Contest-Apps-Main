"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { CalendarIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

// This type represents a competition with stats
export type CompetitionWithStats = {
  id: string
  name: string
  description: string | null
  startDate: Date
  endDate: Date
  open: boolean
  price: number
  stripeProductId: string | null
  stripePriceId: string | null
  archived: boolean
  entriesCount: number
  revenue: number
  status: string
}

export const columns: ColumnDef<CompetitionWithStats>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <span className="font-medium">{row.getValue("name")}</span>
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge 
          className={
            status === 'Active' 
              ? 'bg-green-100 text-green-800' 
              : status === 'Closed' 
              ? 'bg-red-100 text-red-800' 
              : status === 'Archived'
              ? 'bg-purple-100 text-purple-800'
              : status === 'Upcoming'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "dates",
    header: "Dates",
    cell: ({ row }) => {
      const startDate = new Date(row.original.startDate)
      const endDate = new Date(row.original.endDate)
      return (
        <div className="flex items-center">
          <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
          {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
        </div>
      )
    },
  },
  {
    accessorKey: "entriesCount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Entries
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const entriesCount = row.getValue("entriesCount") as number
      return <span>{entriesCount}</span>
    },
  },
  {
    accessorKey: "revenue",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Revenue
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const revenue = row.getValue("revenue") as number
      return <span>${revenue.toLocaleString()}</span>
    },
  },
]
