"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Clock, ArrowLeft, Edit, Users, BarChart2, DollarSign, Mic2, ExternalLink, 
         Download, Tag, FileDown, PieChart, Calendar, Timer, AlertCircle, UserIcon, MusicIcon, CheckIcon } from "lucide-react";
import { LoadingProgress } from "@/components/ui/loading-progress";
import { UnifiedEntryDrawer } from "@/components/UnifiedEntryDrawer";
import Link from "next/link";
import { getCompetition } from "@/lib/actions/competition/competition-actions";
import { 
  getCompetitionEntries, 
  getTopCompetitionEntries, 
  getCompetitionEntryStatusCounts,
} from "@/lib/actions/competition/competition-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { assignEntry, getScreeners } from "@/lib/actions/screener-entry-actions";
import { EntryFilterParams, EntryWithVotingDetails, EntrySortParams } from "@/lib/actions/competition/types";
import { CategorySummary, getCompetitionCategoriesWithCount } from "@/lib/actions/category-actions";

export default function CompetitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.competitionId as string;
  
  const [competition, setCompetition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<EntryWithVotingDetails[]>([]);
  const [topEntries, setTopEntries] = useState<EntryWithVotingDetails[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filters, setFilters] = useState<EntryFilterParams>({
    categoryId: undefined,
    paid: undefined,
    searchTerm: undefined,
    reviewStatus: undefined
  });
  
  // Sort params
  const [sortParams, setSortParams] = useState<EntrySortParams>({
    field: 'reviewStatus',
    direction: 'asc'
  });
  
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [entryToAssign, setEntryToAssign] = useState<EntryWithVotingDetails | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<EntryWithVotingDetails[]>([]);
  const [screeners, setScreeners] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EntryWithVotingDetails | null>(null);
  const [statusCounts, setStatusCounts] = useState({
    unassigned: 0,
    inReview: 0,
    reviewed: 0,
    hidden: 0,
  });

  // Load competition data
  useEffect(() => {
    async function loadCompetition() {
      setLoading(true);
      try {
        // Load categories, top entries, and first page of entries in parallel
        const [competitionResult, categoriesResult, topEntriesResult, statusCountsResult] = await Promise.all([
          // Get Competition
          getCompetition(competitionId),
          // Get categories
          getCompetitionCategoriesWithCount(competitionId),
          // Get top entries for carousel display
          getTopCompetitionEntries(competitionId, 3),
          // Get status counts
          getCompetitionEntryStatusCounts(competitionId)
        ]);
        
        // Process competition
        if (competitionResult.error || categoriesResult.error || topEntriesResult.error) {
          console.error("Error loading competition:", competitionResult.error);
        } else if (competitionResult.competition) {
          setCompetition(competitionResult.competition);
        }
    
        setCategories(categoriesResult.categories || []);
        setTopEntries(topEntriesResult.entries || []);
        setCompetition(competitionResult.competition);
        
        if (statusCountsResult.data) {
          setStatusCounts(statusCountsResult.data);
        }
        
        // we do this after setting the competition and category state since loadEntries depends on them
        await loadEntries(1);
        
      } catch (err) {
        console.error("Error loading competition:", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadCompetition();
  }, [competitionId]);
  
  // Function to load paginated entries
  async function loadEntries(page: number) {
    try {
      // Prepare filter object
      const filterParams: EntryFilterParams = {};
      
      if (selectedCategory !== 'all') {
        filterParams.categoryId = selectedCategory;
      }

      if (filters.paid !== undefined) {
        filterParams.paid = filters.paid;
      }

      if (filters.searchTerm) {
        filterParams.searchTerm = filters.searchTerm;
      }

      if (filters.reviewStatus) {
        filterParams.reviewStatus = filters.reviewStatus;
      }
      
      const { data, error } = await getCompetitionEntries(
        competitionId,
        page,
        pageSize,
        filterParams,
        sortParams
      );

      console.log('getCompetitionEntries data:', data);
      
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
    } catch (err) {
      console.error("Error loading entries:", err);
      toast.error("An error occurred while loading entries");
    }
  }
  
  // Load new entries when page, filters, or sort params change
  useEffect(() => {
    if (!loading) {
      loadEntries(1); // Reset to page 1 when filters change
      setCurrentPage(1);
    }
  }, [selectedCategory, filters, sortParams]);
  
  // Handle pagination change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadEntries(page);
  };

  const entriesCount = competition?.stats.entriesCount || 0;
  const paidEntriesCount = competition?.stats.paidEntriesCount || 0;
  const contestantsCount = competition?.stats.contestantsCount || 0;
  const totalVotes = competition?.stats.totalVotes || 0;
  const entryFee = competition?.price ? competition.price / 100 : 0;
  const totalRevenue = competition?.stats.revenue || 0;
  
  const calculateTimeRemaining = () => {
    if (!competition) return { days: 0, status: 'Unknown' };
    
    const now = new Date();
    const endDate = new Date(competition.endDate);
    const startDate = new Date(competition.startDate);
    
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let status = 'Upcoming';
    if (now >= startDate && now <= endDate) {
      status = 'Active';
    } else if (now > endDate) {
      status = 'Completed';
    }
    
    return { days: diffDays, status };
  };
  
  const timeRemaining = calculateTimeRemaining();

  const formatDateRange = () => {
    if (!competition) return "";
    const startDate = new Date(competition.startDate);
    const endDate = new Date(competition.endDate);
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  const handleAssignEntry = (entry: EntryWithVotingDetails) => {
    setEntryToAssign(entry);
    setIsAssignDialogOpen(true);
    loadScreeners();
  };

  const handleBulkAssign = (entries: EntryWithVotingDetails[]) => {
    setSelectedEntries(entries);
    setIsAssignDialogOpen(true);
    loadScreeners();
  };

  const loadScreeners = () => {
    getScreeners().then(data => {
      if (data.error) {
        toast.error("Failed to load screeners");
        return;
      }
      setScreeners(data.screeners || []);
    });
  };

  const handleAssignToScreener = async (screenerId: string) => {
    // Check if it's a bulk assignment or single assignment
    const entriesToAssign = selectedEntries.length > 0 ? selectedEntries : (entryToAssign ? [entryToAssign] : []);
    
    if (entriesToAssign.length === 0) return;
    
    setAssigning(true);
    try {
      let successCount = 0;
      
      for (const entry of entriesToAssign) {
        const result = await assignEntry({
          entryId: entry.id,
          screenerId
        });
        
        if (result.error) {
          console.error(`Failed to assign entry ${entry.id}:`, result.error);
        } else {
          successCount++;
        }
      }
      
      if (successCount === entriesToAssign.length) {
        toast.success(`${successCount} ${successCount === 1 ? 'entry' : 'entries'} assigned successfully`);
      } else if (successCount > 0) {
        toast.success(`${successCount} of ${entriesToAssign.length} entries assigned successfully`);
      } else {
        toast.error("Failed to assign any entries");
      }
      
      setIsAssignDialogOpen(false);
      
      // Reload entries to reflect changes
      await loadEntries(currentPage);
      
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
      'Loading competition details...',
      'Gathering entry statistics...',
      'Calculating revenue data...',
      'Organizing categories...',
      'Preparing leaderboard...',
      'Loading contestant information...',
      'Almost ready...'
    ]} />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
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
      <div className="max-w-7xl mx-auto px-4 py-6">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-4 min-w-0 flex-1">
              <Button variant="ghost" size="sm" asChild className="text-gray-600 hover:text-gray-900 -ml-2">
                <Link href="/dashboard/competitions">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to All Competitions
                </Link>
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">{competition.name}</h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
                  <Badge 
                    className={
                      competition.open 
                        ? "bg-green-100 text-green-800 border-green-200" 
                        : "bg-red-100 text-red-800 border-red-200"
                    }
                  >
                    {competition.open ? "Open" : "Closed"}
                  </Badge>
                  <span className="truncate">{formatDateRange()}</span>
                  <span className="whitespace-nowrap">Entry Fee: ${entryFee.toFixed(2)}</span>
                  {timeRemaining.status === 'Active' && (
                    <span className="whitespace-nowrap">{timeRemaining.days > 0 ? `${timeRemaining.days} days remaining` : "Ends today"}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
              {competition.stripeProductId && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`https://dashboard.stripe.com/products/${competition.stripeProductId}`, '_blank')}
                  className="text-gray-600 border-gray-200 text-xs sm:text-sm"
                >
                  <ExternalLink className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> 
                  <span className="hidden sm:inline">View in </span>Stripe
                </Button>
              )}
              <Button variant="outline" size="sm" asChild className="text-gray-600 border-gray-200 text-xs sm:text-sm">
                <Link href={`/dashboard/competitions/${competitionId}/edit`}>
                  <Edit className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> 
                  Edit<span className="hidden sm:inline"> Contest</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <Card className="border border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-start">
              <div className="text-2xl font-bold">{entriesCount}</div>
              <div className="p-2 bg-blue-50 rounded-md">
                <Mic2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{paidEntriesCount} paid / {entriesCount - paidEntriesCount} unpaid</p>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Contestants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-start">
              <div className="text-2xl font-bold">{contestantsCount}</div>
              <div className="p-2 bg-purple-50 rounded-md">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-start">
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <div className="p-2 bg-yellow-50 rounded-md">
                <DollarSign className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">From entry fees only</p>
          </CardContent>
        </Card>
      </div>


          {/* Song Management Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Song Management</h3>
              <Button asChild className="bg-[#D33F49] hover:bg-[#B73E47] text-white">
                <Link href={`/dashboard/entries?competitionId=${competitionId}`}>
                  <Mic2 className="mr-2 h-4 w-4" />
                  Manage Songs
                </Link>
              </Button>
            </div>
            
            {/* Song Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="border border-gray-100">
                <CardHeader className="pb-4">
                  <CardTitle className="text-gray-900">Unassigned</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{statusCounts.unassigned}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div className="bg-gray-600 h-2 rounded-full" style={{width: `${(statusCounts.unassigned / totalEntries) * 100}%`}}></div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border border-gray-100">
                <CardHeader className="pb-4">
                  <CardTitle className="text-gray-900">In Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{statusCounts.inReview}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div className="bg-orange-500 h-2 rounded-full" style={{width: `${(statusCounts.inReview / totalEntries) * 100}%`}}></div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border border-gray-100">
                <CardHeader className="pb-4">
                  <CardTitle className="text-gray-900">Reviewed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{statusCounts.reviewed}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: `${(statusCounts.reviewed / totalEntries) * 100}%`}}></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

      {/* Tabs for content sections */}
      <div className="">
        <div className="bg-white">
          {/* Top contestants section */}
          <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Fan Voting Leaderboard</h3>
              <Button asChild className="bg-[#D33F49] hover:bg-[#B73E47] text-white">
                <Link href={`/dashboard/fan-voting/${competitionId}`}>
                  <Mic2 className="mr-2 h-4 w-4" />
                  See All
                </Link>
              </Button>
            </div>
            {topEntries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {topEntries.map((entry, index) => (
                  <div key={entry.id}>
                    <div 
                      className={`h-full rounded-lg overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl ${index < 3 ? 'border-2 border-yellow-500' : 'border border-gray-200'}`}
                    >
                      <div className={`h-2 ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-purple-500'}`}></div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center min-w-0">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-purple-500'}`}>
                              {index + 1}
                            </span>
                            <span className="ml-2 font-semibold truncate">{entry.contestant.username}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-2 truncate" title={entry.song.title}>Song: {entry.song.title}</p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded truncate flex-1 min-w-0">
                            {entry.category.title}
                          </div>
                          <div className="font-bold text-lg shrink-0">{entry.totalVotes} <span className="text-xs text-gray-500">votes</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-gray-500">No entries yet to display top contestants</p>
              </div>
            )}
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
                {/* Suggested Screeners section */}
                <div className="space-y-2">
                  <h3 className="font-medium text-green-700">Suggested Screeners</h3>
                  <p className="text-xs text-gray-500">Screeners with preferences matching this entry's category</p>
                  <div className="grid gap-2">
                    {entryToAssign && screeners.filter(screener => 
                      screener.preferredCategories?.some((cat: { id: string }) => cat.id === entryToAssign.categoryId)
                    ).length === 0 && (
                      <p className="text-sm text-gray-500">No screeners with matching preferences found</p>
                    )}
                    
                    {entryToAssign && screeners
                      .filter(screener => 
                        screener.preferredCategories?.some((cat: { id: string }) => cat.id === entryToAssign.categoryId)
                      )
                      .map((screener) => (
                        <Button
                          key={screener.id}
                          variant="outline"
                          className="justify-between w-full border-green-200 bg-green-50 hover:bg-green-100"
                          disabled={assigning}
                          onClick={() => handleAssignToScreener(screener.id)}
                        >
                          <span className="flex items-center">
                            <UserIcon className="h-4 w-4 mr-2 text-green-600" />
                            {screener.name || screener.email}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                              Preferred
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {screener.assignedEntries?.length || 0} assigned
                            </span>
                          </div>
                        </Button>
                    ))}
                  </div>
                </div>
                
                {/* All Available Screeners section */}
                <div className="space-y-2">
                  <h3 className="font-medium">All Available Screeners</h3>
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
