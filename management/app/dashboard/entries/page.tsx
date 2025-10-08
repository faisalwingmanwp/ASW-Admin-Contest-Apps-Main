"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserIcon, MusicIcon } from "lucide-react";
import { LoadingProgress } from "@/components/ui/loading-progress";
import Link from "next/link";
import { 
  getCompetitionEntries, 
  getCompetitionEntryStatusCounts,
} from "@/lib/actions/competition/competition-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { bulkAssignEntries, getScreeners } from "@/lib/actions/screener-entry-actions";
import { setEntryHiddenStatus } from "@/lib/actions/entry-actions";
import { DataTable } from "@/components/data-table/data-table";
import { columns } from "@/components/data-table/columns/entry-columns";
import { createReviewedColumns } from "@/components/data-table/columns/reviewed-entry-columns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { EntryFilterParams, EntryWithVotingDetails, EntrySortParams } from "@/lib/actions/competition/types";
import { CategorySummary, getCompetitionCategoriesWithCount } from "@/lib/actions/category-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewStatus } from "@prisma/client";
import { getEntriesWithScores } from "@/lib/actions/entry-details-actions";
import { UnifiedEntryDrawer } from "@/components/UnifiedEntryDrawer";

const IN_REVIEW_STATUSES = [
  ReviewStatus.PENDING_REVIEW,
  ReviewStatus.NEEDS_MORE_INFORMATION,
  ReviewStatus.NEEDS_ANOTHER_REVIEW,
];

export default function EntriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const competitionId = searchParams.get('competitionId') || '';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<EntryWithVotingDetails[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('unassigned');
  const [statusCounts, setStatusCounts] = useState({
    unassigned: 0,
    needsReview: 0,
    reviewed: 0,
    hidden: 0,
  });
  
  const [filters, setFilters] = useState<EntryFilterParams>({
    categoryId: undefined,
    paid: undefined,
    searchTerm: undefined,
    reviewStatus: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  });
  
  // Sort params
  const [sortParams, setSortParams] = useState<EntrySortParams>({
    field: 'reviewStatus',
    direction: 'asc'
  });
  
  // Separate sort params for reviewed tab (default to sorting by score)
  const [reviewedSortParams, setReviewedSortParams] = useState<EntrySortParams>({
    field: 'averageScore',
    direction: 'desc'
  });
  
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [entryToAssign, setEntryToAssign] = useState<EntryWithVotingDetails | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<EntryWithVotingDetails[]>([]);
  const [screeners, setScreeners] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EntryWithVotingDetails | null>(null);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [reviewedEntries, setReviewedEntries] = useState<any[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  // Reviewed tab: average score filter (min/max)
  const [minAvgScore, setMinAvgScore] = useState<string>('');
  const [maxAvgScore, setMaxAvgScore] = useState<string>('');

  // Create reviewed columns with sort callback
  const reviewedColumns = createReviewedColumns((field: string, direction: 'asc' | 'desc') => {
    setReviewedSortParams({ field: field as any, direction });
  });

  // Function to load status counts
  async function loadStatusCounts() {
    if (!competitionId) return;
    
    try {
      const { data, error } = await getCompetitionEntryStatusCounts(competitionId);
      if (error || !data) {
        throw new Error(error || "Failed to load status counts");
      }
      
      setStatusCounts({
        unassigned: data.unassigned,
        needsReview: data.inReview,
        reviewed: data.reviewed,
        hidden: data.hidden,
      });
    } catch (error) {
      console.error("Error loading status counts:", error);
    }
  }

  // Load initial data
  useEffect(() => {
    async function initializeData() {
      if (!competitionId) {
        setError("No competition ID provided");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Get categories for filtering
        const { categories, error: categoriesError } = await getCompetitionCategoriesWithCount(competitionId);
        
        if (categoriesError) {
          console.error("Error loading categories:", categoriesError);
        } else if (categories) {
          setCategories(categories);
        }
        
        // Load status counts
        await loadStatusCounts();
        
        // Load first page of entries
        await loadEntries(1);
        
        // Load screeners for the sidebar
        await loadScreeners();
      } catch (err) {
        console.error("Error loading entries:", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    initializeData();
  }, [competitionId]);

  // Sync date range to filter params (yyyy-mm-dd)
  useEffect(() => {
    if (!dateRange || !dateRange.from) {
      setFilters((f) => ({ ...f, dateFrom: undefined, dateTo: undefined }));
      return;
    }
    const from = dateRange.from;
    const to = dateRange.to ?? dateRange.from;
    const toISO = (d: Date | undefined) => d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10) : undefined;
    setFilters((f) => ({
      ...f,
      dateFrom: toISO(from),
      dateTo: toISO(to),
    }));
  }, [dateRange]);
  
  // Function to load paginated entries
  async function loadEntries(page: number) {
    if (!competitionId) return;
    
    setEntriesLoading(true);
    try {
      // If we're on the reviewed tab, use the new server action
      if (activeTab === 'reviewed') {
        // Parse score filters
        const parsedMin = minAvgScore.trim() === '' ? undefined : Number(minAvgScore);
        const parsedMax = maxAvgScore.trim() === '' ? undefined : Number(maxAvgScore);
        const minScore = Number.isFinite(parsedMin) ? parsedMin : undefined;
        const maxScore = Number.isFinite(parsedMax) ? parsedMax : undefined;

        const { data, error } = await getEntriesWithScores(
          competitionId,
          page,
          pageSize,
          {
            categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
            searchTerm: searchTerm || undefined,
            minScore,
            maxScore,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
          },
          {
            field: reviewedSortParams.field === 'averageScore' ? 'averageScore' : (reviewedSortParams.field === 'songTitle' ? 'songTitle' : (reviewedSortParams.field === 'votes' ? 'totalVotes' : 'averageScore')),
            direction: reviewedSortParams.direction,
          }
        );
        
        if (error) {
          toast.error("Failed to load entries: " + error);
          return;
        }
        
        if (data) {
          setReviewedEntries(data.entries);
          setTotalEntries(data.totalCount);
          setPageCount(data.pageCount);
          setCurrentPage(page);
        }
      } else {
        // Use the existing logic for other tabs
        const filterParams: EntryFilterParams = {};
        
        if (selectedCategory !== 'all') {
          filterParams.categoryId = selectedCategory;
        }

        if (filters.paid !== undefined) {
          filterParams.paid = filters.paid;
        }

        if (searchTerm) {
          filterParams.searchTerm = searchTerm;
        }

        if (activeTab === 'hidden') {
          filterParams.hidden = true;
        } else {
          filterParams.hidden = false;
        }

        if (activeTab === 'unassigned') {
          filterParams.reviewStatus = 'UNASSIGNED';
        } else if (activeTab === 'needsReview') {
          filterParams.reviewStatus = IN_REVIEW_STATUSES;
        }

        if (filters.dateFrom) {
          filterParams.dateFrom = filters.dateFrom;
        }
        if (filters.dateTo) {
          filterParams.dateTo = filters.dateTo;
        }
        
        const { data, error } = await getCompetitionEntries(
          competitionId,
          page,
          pageSize,
          filterParams,
          sortParams
        );
        
        if (error) {
          toast.error("Failed to load entries: " + error);
          return;
        }
        
        if (data) {
          setEntries(data.entries);
          setTotalEntries(data.totalCount);
          setPageCount(data.pageCount);
          setCurrentPage(page);
        }
      }
    } catch (err) {
      console.error("Error loading entries:", err);
      toast.error("An error occurred while loading entries");
    } finally {
      setEntriesLoading(false);
    }
  }
  
  // Load new entries when filters change
  useEffect(() => {
    if (!loading) {
      loadEntries(1);
      setCurrentPage(1);
    }
  }, [selectedCategory, searchTerm, activeTab, sortParams, reviewedSortParams, filters.dateFrom, filters.dateTo, pageSize]);
  
  // Reload when score filters change (reviewed tab)
  useEffect(() => {
    if (!loading && activeTab === 'reviewed') {
      loadEntries(1);
      setCurrentPage(1);
    }
  }, [minAvgScore, maxAvgScore]);
  
  // Handle pagination change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadEntries(page);
  };

  const loadScreeners = async () => {
    try {
      const data = await getScreeners();
      if (data.error) {
        console.error("Failed to load screeners:", data.error);
        return;
      }
      setScreeners(data.screeners || []);
    } catch (error) {
      console.error("Error loading screeners:", error);
    }
  };

  const handleAssignToScreener = async (screenerId: string) => {
    const entriesToAssign = selectedEntries.length > 0 ? selectedEntries : (entryToAssign ? [entryToAssign] : []);
    
    if (entriesToAssign.length === 0) return;
    
    setAssigning(true);
    try {
      const entryIds = entriesToAssign.map((e) => e.id);
      const result = await bulkAssignEntries({ entryIds, screenerId });

      if (result && !result.success) {
        toast.error(result.error || "Failed to assign entries");
      } else {
        const created = result?.created ?? 0;
        const skipped = result?.skipped ?? 0;
        if (created > 0 && skipped === 0) {
          toast.success(`${created} ${created === 1 ? 'entry' : 'entries'} assigned successfully`);
        } else if (created > 0 && skipped > 0) {
          toast.success(`${created} assigned, ${skipped} already assigned`);
        } else {
          toast.error("No new assignments (all selected entries were already assigned)");
        }
      }
      
      setIsAssignDialogOpen(false);
      
      // Reload entries to reflect changes
      loadEntries(currentPage);
      
      // Reload status counts
      loadStatusCounts();
      
      // Reload screener data
      loadScreeners();
      
    } catch (error) {
      toast.error("Failed to assign entries: " + (error as Error).message);
    } finally {
      setAssigning(false);
      setSelectedEntries([]);
      setEntryToAssign(null);
    }
  };

  if (loading) {
    return <LoadingProgress messages={[
      'Loading song entries...',
      'Gathering entry details...',
      'Organizing by status...',
      'Loading screener assignments...',
      'Calculating review progress...',
      'Preparing entry management...',
      'Almost ready...'
    ]} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" asChild className="text-gray-600 hover:text-gray-900 -ml-2">
                <Link href="/dashboard/competitions">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to All Competitions
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-md">
            {error}
          </div>
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
              <Button variant="ghost" size="sm" asChild className="text-gray-600 hover:text-gray-900 -ml-2" onClick={() => router.back()}>
                <div>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Contest
                </div>
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Song Management</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex">
        {/* Main Content */}
        <div className="flex-1">
            {/* Song Assignment Section */}
            <div className="">
              {/* Status Cards */}
              <div className="flex gap-8 p-2 py-3">
                <button
                  onClick={() => setActiveTab('unassigned')}
                  className={`flex flex-row items-start pb-3 border-b-2 transition-colors gap-2 ${
                    activeTab === 'unassigned' 
                      ? 'border-gray-900 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="text-lg font-medium">Unassigned</span>
                  <span className={`text-2xl font-bold mt-1 px-3 py-1 rounded-full text-sm ${
                    activeTab === 'unassigned' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {statusCounts.unassigned}
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveTab('needsReview')}
                  className={`flex flex-row  items-start pb-3 border-b-2 transition-colors gap-2 ${
                    activeTab === 'needsReview' 
                      ? 'border-gray-900 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="text-lg font-medium">In Review</span>
                  <span className={`text-2xl font-bold mt-1 px-3 py-1 rounded-full text-sm ${
                    activeTab === 'needsReview' 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {statusCounts.needsReview}
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveTab('reviewed')}
                  className={`flex flex-row items-start pb-3 border-b-2 transition-colors gap-2 ${
                    activeTab === 'reviewed' 
                      ? 'border-gray-900 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="text-lg font-medium">Reviewed</span>
                  <span className={`text-2xl font-bold mt-1 px-3 py-1 rounded-full text-sm ${
                    activeTab === 'reviewed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {statusCounts.reviewed}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('hidden')}
                  className={`flex flex-row items-start pb-3 border-b-2 transition-colors gap-2 ${
                    activeTab === 'hidden' 
                      ? 'border-gray-900 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="text-lg font-medium">Hidden</span>
                  <span className={`text-2xl font-bold mt-1 px-3 py-1 rounded-full text-sm ${
                    activeTab === 'hidden' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {statusCounts.hidden}
                  </span>
                </button>
              </div>
              
              {/* Filters */}
              <div className="flex items-center gap-4 p-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Genre</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Genres" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genres</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Input 
                        placeholder="Search by song, artist, or Stripe order #"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-[250px]"
                    />
                </div>

                {/* Average score filter (reviewed tab) */}
                {activeTab === 'reviewed' && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Avg Score</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={10}
                      step={0.1}
                      placeholder="Min"
                      value={minAvgScore}
                      onChange={(e) => setMinAvgScore(e.target.value)}
                      className="w-[80px]"
                    />
                    <span className="text-gray-400">–</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={10}
                      step={0.1}
                      placeholder="Max"
                      value={maxAvgScore}
                      onChange={(e) => setMaxAvgScore(e.target.value)}
                      className="w-[80px]"
                    />
                  </div>
                )}

                {/* Date range filter (toggleable calendar) */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      className="h-9"
                      onClick={() => setIsCalendarOpen((v) => !v)}
                    >
                      {dateRange?.from
                        ? `${dateRange.from.toLocaleDateString()}${dateRange.to ? ` - ${dateRange.to.toLocaleDateString()}` : ''}`
                        : 'Dates'}
                    </Button>
                    {dateRange?.from && (
                      <Button size="sm" variant="ghost" onClick={() => setDateRange(undefined)}>Clear</Button>
                    )}
                  </div>
                  {isCalendarOpen && (
                    <div className="z-10">
                      <Calendar
                        mode="range"
                        numberOfMonths={2}
                        selected={dateRange}
                        onSelect={setDateRange}
                        defaultMonth={dateRange?.from}
                        className="rounded-lg border shadow-sm"
                      />
                      <div className="flex items-center justify-end pt-2">
                        <Button size="sm" onClick={() => setIsCalendarOpen(false)}>Done</Button>
                      </div>
                    </div>
                  )}
                </div>

                
                <div className="ml-auto">
                  <Button 
                    onClick={() => {
                      setIsAssignDialogOpen(true);
                      loadScreeners();
                    }}
                    disabled={selectedEntries.length === 0}
                    className="bg-[#D33F49] hover:bg-[#B73E47] text-white"
                  >
                    <UserIcon className="mr-2 h-4 w-4" />
                    Assign Selected ({selectedEntries.length})
                  </Button>
                </div>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsContent value={activeTab} className="mt-0">
                {entriesLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
                  </div>
                ) : (
                  <>
                    {activeTab === 'reviewed' ? (
                      <>
                        <DataTable 
                          columns={reviewedColumns} 
                          data={reviewedEntries}
                          showPagination={false}
                          onRowClick={(entry) => {
                            setSelectedEntryId(entry.id);
                            setIsDrawerOpen(true);
                          }}
                        />
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Rows per page</span>
                            <Select value={`${pageSize}`} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                              <SelectTrigger className="h-8 w-[90px]">
                                <SelectValue placeholder={pageSize} />
                              </SelectTrigger>
                              <SelectContent side="top">
                                {[20, 50, 100, 200].map((size) => (
                                  <SelectItem key={size} value={`${size}`}>{size}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {pageCount > 1 && (
                            <div className="flex justify-center">
                              <Pagination
                                pageCount={pageCount}
                                currentPage={currentPage}
                                onPageChange={handlePageChange}
                              />
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <DataTable 
                          columns={columns} 
                          data={entries}
                          showPagination={false}
                          onSelectionChange={setSelectedEntries}
                          onRowClick={(entry) => {
                            setSelectedEntry(entry);
                            setIsDrawerOpen(true);
                          }}
                        />
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Rows per page</span>
                            <Select value={`${pageSize}`} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                              <SelectTrigger className="h-8 w-[90px]">
                                <SelectValue placeholder={pageSize} />
                              </SelectTrigger>
                              <SelectContent side="top">
                                {[20, 50, 100, 200].map((size) => (
                                  <SelectItem key={size} value={`${size}`}>{size}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {pageCount > 1 && (
                            <div className="flex justify-center">
                              <Pagination
                                pageCount={pageCount}
                                currentPage={currentPage}
                                onPageChange={handlePageChange}
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>

        </div>
        
        {/* Sidebar with Screener Assignments */}
        <div className="w-80 border-l border-gray-200 bg-gray-50">
          <div className="p-6">
            <h3 className="font-semibold mb-4">Screener Assignments</h3>
            
            {/* Search Screeners */}
            <div className="mb-4">
              <Input placeholder="daryl" className="text-sm" />
            </div>
            
            {/* Screener List */}
            <div className="space-y-4">
              {screeners.map((screener) => (
                <Card key={screener.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{screener.name || screener.email}</h4>
                    <span className="text-sm text-gray-500">
                      {screener.assignedEntries?.length || 0} / 500
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{width: `${((screener.assignedEntries?.length || 0) / 500) * 100}%`}}
                    ></div>
                  </div>
                  
                  {/* Preferred Categories */}
                  <div className="flex flex-wrap gap-1">
                    {screener.preferredCategories?.map((cat: any) => (
                      <Badge key={cat.id} variant="outline" className="text-xs">
                        {cat.title}
                      </Badge>
                    )) || <span className="text-xs text-gray-500">No preferences set</span>}
                  </div>
                </Card>
              ))}
              
              {screeners.length === 0 && (
                <p className="text-sm text-gray-500">No screeners available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedEntries.length > 0 
                ? `Assign ${selectedEntries.length} Entries to Screener` 
                : "Assign Entry to Screener"}
            </DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          
          {(entryToAssign || selectedEntries.length > 0) && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h3 className="font-medium">Entry Details</h3>
                {selectedEntries.length > 0 ? (
                  <p className="text-sm font-medium flex items-center gap-2">
                    <MusicIcon className="h-4 w-4" />
                    Multiple entries selected ({selectedEntries.length})
                  </p>
                ) : entryToAssign && (
                  <>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <MusicIcon className="h-4 w-4" />
                      {entryToAssign.song.title}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      {entryToAssign.contestant.username}
                    </p>
                  </>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Available Screeners</h3>
                  <div className="grid gap-2">
                    {screeners.length === 0 && (
                      <p className="text-sm text-gray-500">No screeners available</p>
                    )}
                    
                    {screeners.map((screener) => (
                      <Button
                        key={screener.id}
                        variant="outline"
                        className="justify-between w-full"
                        disabled={assigning}
                        onClick={() => handleAssignToScreener(screener.id)}
                      >
                        <span className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-2" />
                          {screener.name || screener.email}
                        </span>
                        <span className="text-xs text-gray-500">
                          {screener.assignedEntries?.length || 0} assigned
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unified Entry Details Drawer */}
      <UnifiedEntryDrawer
        entryId={activeTab === 'reviewed' ? selectedEntryId : selectedEntry?.id || null}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedEntryId(null);
          setSelectedEntry(null);
        }}
        onUpdate={() => {
          loadEntries(currentPage);
          loadStatusCounts();
        }}
        showReviews={activeTab === 'reviewed'}
        showActions={true}
      />
    </div>
  );
} 
