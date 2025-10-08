'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  getSubmissionErrors, 
  resolveSubmissionError, 
  ignoreSubmissionError,
  sendAutoMessage,
  getSubmissionErrorStats
} from '@/lib/actions/support-actions';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  AlertTriangle,
  Bot,
  CheckCircle2, 
  Clock, 
  FileX, 
  Search, 
  User, 
  X, 
  XCircle,
  MailIcon,
  TrendingUp,
  Activity,
  FileWarning,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SubmissionErrorType, ErrorStatus } from '@prisma/client';

type SubmissionError = {
  id: string;
  errorType: SubmissionErrorType;
  errorMessage: string;
  originalFile?: string | null;
  fileSize?: number | null;
  fileFormat?: string | null;
  status: ErrorStatus;
  autoResolved: boolean;
  resolutionNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date | null;
  Contestant: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  Entry: {
    id: string;
    song: {
      title: string;
    };
    competition: {
      name: string;
    };
  };
};

type ErrorStats = {
  totalErrors: number;
  openErrors: number;
  resolvedErrors: number;
  autoResolutionRate: number;
  errorsByType: { type: SubmissionErrorType; count: number }[];
  error: string | null;
};

export default function SubmissionErrorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State
  const [activeTab, setActiveTab] = useState(searchParams.get('status') || 'all');
  const [errorTypeFilter, setErrorTypeFilter] = useState(searchParams.get('type') || 'all');
  const [errors, setErrors] = useState<SubmissionError[]>([]);
  const [stats, setStats] = useState<ErrorStats>({
    totalErrors: 0,
    openErrors: 0,
    resolvedErrors: 0,
    autoResolutionRate: 0,
    errorsByType: [],
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<SubmissionError | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Fetch errors and stats
  const fetchData = async () => {
    setIsLoading(true);
    
    try {
      const [errorsResult, statsResult] = await Promise.all([
        getSubmissionErrors(
          activeTab !== 'all' ? activeTab as ErrorStatus : undefined,
          errorTypeFilter !== 'all' ? errorTypeFilter as SubmissionErrorType : undefined
        ),
        getSubmissionErrorStats()
      ]);
      
      if (errorsResult.error) {
        toast.error(errorsResult.error);
      } else {
        setErrors(errorsResult.errors);
      }
      
      if (statsResult.error) {
        toast.error(statsResult.error);
      } else {
        setStats(statsResult);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load submission errors');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load data on mount and when filters change
  useEffect(() => {
    fetchData();
    
    // Update URL when filters change
    const params = new URLSearchParams();
    if (activeTab !== 'all') params.set('status', activeTab);
    if (errorTypeFilter !== 'all') params.set('type', errorTypeFilter);
    
    const queryString = params.toString();
    const newUrl = queryString ? `/dashboard/support?${queryString}` : '/dashboard/support';
    router.push(newUrl, { scroll: false });
  }, [activeTab, errorTypeFilter]);
  
  // Handle error selection
  const handleSelectError = (error: SubmissionError) => {
    setSelectedError(error);
    setResolutionNote(error.resolutionNote || '');
  };
  
  // Handle auto-message
  const handleAutoMessage = async (errorId: string) => {
    setIsUpdating(true);
    
    try {
      const { success, error } = await sendAutoMessage(errorId);
      
      if (error) {
        toast.error(error);
      } else if (success) {
        toast.success('Auto message sent to contestant successfully');
        fetchData();
        setSelectedError(null);
      }
    } catch (error) {
      console.error('Error sending auto message:', error);
      toast.error('Failed to send auto message');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle manual resolution
  const handleResolve = async () => {
    if (!selectedError) return;
    
    setIsUpdating(true);
    
    try {
      const { success, error } = await resolveSubmissionError(
        selectedError.id, 
        resolutionNote,
        false
      );
      
      if (error) {
        toast.error(error);
      } else if (success) {
        toast.success(
          <div className="flex flex-col gap-1">
            <div>Error resolved successfully</div>
            <div className="text-xs flex items-center text-muted-foreground">
              <MailIcon className="mr-1 h-3 w-3" />
              Email notification sent to contestant
            </div>
          </div>
        );
        fetchData();
        setSelectedError(null);
      }
    } catch (error) {
      console.error('Error resolving submission error:', error);
      toast.error('Failed to resolve error');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle ignore
  const handleIgnore = async () => {
    if (!selectedError) return;
    
    setIsUpdating(true);
    
    try {
      const { success, error } = await ignoreSubmissionError(
        selectedError.id,
        resolutionNote || 'Marked as non-critical'
      );
      
      if (error) {
        toast.error(error);
      } else if (success) {
        toast.success('Error marked as ignored');
        fetchData();
        setSelectedError(null);
      }
    } catch (error) {
      console.error('Error ignoring submission error:', error);
      toast.error('Failed to ignore error');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Filter errors based on search query
  const filteredErrors = errors.filter(error => {
    const matchesSearch = searchQuery === '' || 
      error.errorMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      error.Entry.song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${error.Contestant.firstName} ${error.Contestant.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });
  
  // Get status badge
  const getStatusBadge = (status: ErrorStatus, autoResolved: boolean) => {
    switch (status) {
      case 'DETECTED':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Detected</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'RESOLVED':
        return autoResolved ? (
          <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center gap-1">
            <Bot className="h-3 w-3" />
            Auto-Resolved
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-green-100 text-green-800">Resolved</Badge>
        );
      case 'IGNORED':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Ignored</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Get error type badge
  const getErrorTypeBadge = (errorType: SubmissionErrorType) => {
    const typeConfig = {
      BROKEN_LINK: { label: 'Broken Link', className: 'bg-red-100 text-red-800' },
      AI_DETECTED: { label: 'AI Detected', className: 'bg-purple-100 text-purple-800' },
      COVER_SONG: { label: 'Cover Song', className: 'bg-amber-100 text-amber-800' },
      OTHER: { label: 'Other', className: 'bg-gray-100 text-gray-800' },
    };
    
    const config = typeConfig[errorType] || { label: 'Error', className: 'bg-gray-100 text-gray-800' };
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };
  
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <FileWarning className="mr-2 h-6 w-6" />
            Submission Errors
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and resolve song submission errors automatically
          </p>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalErrors}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.openErrors}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolvedErrors}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Resolution Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.autoResolutionRate}%</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left column: Error list */}
        <div className="w-full md:w-2/3">
          <div className="mb-4 flex flex-col gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList>
                <TabsTrigger value="all">All Errors</TabsTrigger>
                <TabsTrigger value="DETECTED">Detected</TabsTrigger>
                <TabsTrigger value="IN_PROGRESS">In Progress</TabsTrigger>
                <TabsTrigger value="RESOLVED">Resolved</TabsTrigger>
                <TabsTrigger value="IGNORED">Ignored</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search errors..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="BROKEN_LINK">Broken Link</SelectItem>
                  <SelectItem value="AI_DETECTED">AI Detected</SelectItem>
                  <SelectItem value="COVER_SONG">Cover Song</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
            </div>
          ) : filteredErrors.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
              <CheckCircle2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">No errors found</h3>
              <p className="mt-1 text-gray-500">
                {searchQuery ? 'Try adjusting your search terms' : 'All submission errors have been resolved'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-md shadow overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Song</TableHead>
                    <TableHead>Contestant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredErrors.map((error) => (
                    <TableRow 
                      key={error.id}
                      className={selectedError?.id === error.id ? 'bg-muted/50' : ''}
                    >
                      <TableCell>{getStatusBadge(error.status, error.autoResolved)}</TableCell>
                      <TableCell>{getErrorTypeBadge(error.errorType)}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {error.Entry.song.title}
                        <div className="text-xs text-muted-foreground">
                          {error.Entry.competition.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {error.Contestant.firstName} {error.Contestant.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(error.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSelectError(error)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        
        {/* Right column: Error details */}
        <div className="w-full md:w-1/3">
          {selectedError ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center gap-2">
                    {getErrorTypeBadge(selectedError.errorType)}
                    Error Details
                  </CardTitle>
                  {getStatusBadge(selectedError.status, selectedError.autoResolved)}
                </div>
                <CardDescription>
                  Detected {formatDistanceToNow(new Date(selectedError.createdAt), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center mb-1 text-sm font-medium text-muted-foreground">
                    <User className="mr-1 h-4 w-4" />
                    Contestant
                  </div>
                  <p>
                    {selectedError.Contestant.firstName} {selectedError.Contestant.lastName}<br />
                    <span className="text-sm text-muted-foreground">{selectedError.Contestant.email}</span>
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center mb-1 text-sm font-medium text-muted-foreground">
                    <FileX className="mr-1 h-4 w-4" />
                    Error Details
                  </div>
                  <div className="bg-muted p-3 rounded-md text-sm">
                    <div className="font-medium mb-1">
                      {selectedError.Entry.song.title}
                    </div>
                    <div className="text-muted-foreground text-xs mb-2">
                      {selectedError.Entry.competition.name}
                    </div>
                    <div>{selectedError.errorMessage}</div>
                    {selectedError.originalFile && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        File: {selectedError.originalFile}
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedError.status === 'DETECTED' && selectedError.errorType === 'BROKEN_LINK' && (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm font-medium text-muted-foreground">
                      <Zap className="mr-1 h-4 w-4" />
                      Quick Actions
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAutoMessage(selectedError.id)}
                      disabled={isUpdating}
                      className="w-full"
                    >
                      <Bot className="mr-2 h-4 w-4" />
                      Send Auto Message
                    </Button>
                  </div>
                )}
                
                {selectedError.status !== 'RESOLVED' && selectedError.status !== 'IGNORED' && selectedError.errorType === 'BROKEN_LINK' && (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm font-medium text-muted-foreground">
                      <MailIcon className="mr-1 h-4 w-4" />
                      Resolution Note (Will be sent to contestant)
                    </div>
                    <Textarea
                      placeholder="Explain how this issue was resolved..."
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                )}
                
                {selectedError.resolutionNote && (
                  <div>
                    <div className="flex items-center mb-1 text-sm font-medium text-muted-foreground">
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Resolution
                    </div>
                    <div className="bg-green-50 p-3 rounded-md text-sm border border-green-200">
                      {selectedError.resolutionNote}
                      {selectedError.resolvedAt && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Resolved {formatDistanceToNow(new Date(selectedError.resolvedAt), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedError(null)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Close
                </Button>
                {selectedError.status === 'DETECTED' && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={handleIgnore}
                      disabled={isUpdating}
                      size="sm"
                    >
                      <EyeOff className="mr-2 h-4 w-4" />
                      Ignore
                    </Button>
                    <Button 
                      onClick={handleResolve}
                      disabled={isUpdating || !resolutionNote.trim()}
                    >
                      {isUpdating ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                          Resolving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Resolve
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Error Details</CardTitle>
                <CardDescription>
                  Select an error from the list to view and manage it
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileWarning className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  No error selected
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
