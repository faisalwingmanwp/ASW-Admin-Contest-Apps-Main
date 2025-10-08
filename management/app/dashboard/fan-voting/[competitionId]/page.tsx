"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  CalendarIcon, 
  ArrowLeft, 
  Trophy, 
  FilterIcon, 
  BarChart2, 
  DollarSign, 
  Mic2, 
  PieChart 
} from "lucide-react";
import Link from "next/link";
import { 
  getCompetition, 
  getCompetitionEntries, 
  getTopCompetitionEntries 
} from "@/lib/actions/competition/competition-actions";
import { EntryFilterParams } from "@/lib/actions/competition/types";
import { CategorySummary, getCompetitionCategoriesWithCount } from "@/lib/actions/category-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import { columns, EntryWithVotingDetails } from "@/components/data-table/columns/fan-voting-columns";
import { UnifiedEntryDrawer } from "@/components/UnifiedEntryDrawer";

export default function FanVotingPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.competitionId as string;
  
  const [competition, setCompetition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Entries with pagination support
  const [entries, setEntries] = useState<EntryWithVotingDetails[]>([]);
  const [topEntries, setTopEntries] = useState<EntryWithVotingDetails[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30); // Larger size for fan voting 
  
  // Category filtering
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [entriesLoading, setEntriesLoading] = useState(false);
  
  // Entry details
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EntryWithVotingDetails | null>(null);

  // Load initial data
  useEffect(() => {
    async function initializeData() {
      setLoading(true);
      try {
        // Get competition details (without entries)
        const { competition, error } = await getCompetition(competitionId);
        
        if (error) {
          throw new Error(error);
        }
        
        if (!competition) {
          throw new Error("Contest not found");
        }
        
        setCompetition(competition);
        
        // Get categories for filtering
        const { categories, error: categoriesError } = await getCompetitionCategoriesWithCount(competitionId);
        
        if (categoriesError) {
          console.error("Error loading categories:", categoriesError);
        } else if (categories) {
          setCategories(categories);
        }
        
        // Get top entries for featured section
        const { entries: topEntriesData, error: topEntriesError } = 
          await getTopCompetitionEntries(competitionId, 3);
        
        if (topEntriesError) {
          console.error("Error loading top entries:", topEntriesError);
        } else if (topEntriesData) {
          // Convert top entries to table format
          const formattedTopEntries = topEntriesData.map(entry => ({
            ...entry,
            createdAt: entry.createdAt.toString(),
            updatedAt: entry.updatedAt.toString()
          })) as EntryWithVotingDetails[];
          
          setTopEntries(formattedTopEntries);
        }
        
        // Load first page of entries
        await loadEntries(1);
      } catch (err) {
        console.error("Error loading competition:", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    initializeData();
  }, [competitionId]);
  
  // Function to load paginated entries
  async function loadEntries(page: number) {
    setEntriesLoading(true);
    try {
      // Prepare filter object
      const filterParams: EntryFilterParams = {};
      
      if (selectedCategory !== 'all') {
        filterParams.categoryId = selectedCategory;
      }
      
      // Get entries with pagination
      const { data, error } = await getCompetitionEntries(
        competitionId,
        page,
        pageSize,
        filterParams,
        { field: 'votes', direction: 'desc' } // Always sort by votes for fan voting
      );
      
      if (error) {
        toast.error("Failed to load entries: " + error);
        return;
      }
      
      if (data) {
        // Convert entries from server format to table format
        const formattedEntries = data.entries.map(entry => ({
          ...entry,
          createdAt: entry.createdAt.toString(),
          updatedAt: entry.updatedAt.toString()
        })) as EntryWithVotingDetails[];
        
        setEntries(formattedEntries);
        setTotalEntries(data.totalCount);
        setPageCount(data.pageCount);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error("Error loading entries:", err);
      toast.error("An error occurred while loading entries");
    } finally {
      setEntriesLoading(false);
    }
  }
  
  // Load new entries when category filter changes
  useEffect(() => {
    if (!loading) {
      loadEntries(1); // Reset to page 1 when filter changes
    }
  }, [selectedCategory]);
  // Handle pagination change
  const handlePageChange = (page: number) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentPage(page);
    loadEntries(page);
  };

  // Calculate stats from entries
  const totalVotesCount = entries.reduce((sum, entry) => sum + entry.totalVotes, 0);
  const totalContestantsCount = new Set(entries.map(e => e.contestant.id)).size;
  
  const formatDateRange = () => {
    if (!competition) return "";
    const startDate = new Date(competition.startDate);
    const endDate = new Date(competition.endDate);
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
        <div className="text-center p-8">
          Contest not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 -ml-2">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Contest Overview
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{competition.name} - Fan Voting</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>{formatDateRange()}</span>
                  <span>Total Entries: {totalEntries}</span>
                  <span>Contestants: {totalContestantsCount}</span>
                  <span>Total Votes: {totalVotesCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="">

        {/* Categories filter and navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 mb-4">
        <div className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4 text-gray-500" />
          <Select 
            value={selectedCategory} 
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.title} ({category.entryCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Pagination selector */}
          {pageCount > 1 && (
            <div className="flex items-center gap-2 ml-4">
              <Select
                value={currentPage.toString()}
                onValueChange={(value) => handlePageChange(parseInt(value))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Page" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map(page => (
                    <SelectItem key={page} value={page.toString()}>
                      Page {page} of {pageCount}
                    </SelectItem>
                  ))}
                </SelectContent>
                </Select>
            </div>
          )}
        </div>
      </div>

      {/* Data table - flush with sides */}
      <div className="">
        <DataTable 
          columns={columns} 
          data={entries}
          onRowClick={(entry) => {
            setSelectedEntry(entry);
            setIsDrawerOpen(true);
          }}
        />
      </div>
      
      {/* Entry Details Drawer */}
      <UnifiedEntryDrawer
        entryId={selectedEntry?.id || null}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedEntry(null);
        }}
        showReviews={false}
        showActions={false}
      />
    </div>
    </div>
  );
}
