import React, { useEffect, useState } from 'react';
import { ExternalLink, Star, User, Calendar, FileText, Music, Mail, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { getEntryWithDetailedReviews, EntryWithDetailedReviews } from '@/lib/actions/entry-details-actions';
import { setEntryHiddenStatus, updateEntryDetails } from '@/lib/actions/entry-actions';
import { getCategories } from '@/lib/actions/category-actions';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ReviewStatus } from '@prisma/client';

interface UnifiedEntryDrawerProps {
  entryId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  showReviews?: boolean;
  showActions?: boolean;
}

const reviewStatusColors: Record<ReviewStatus, string> = {
  [ReviewStatus.PENDING_REVIEW]: 'bg-orange-100 text-orange-800 border-orange-200',
  [ReviewStatus.UNASSIGNED]: 'bg-gray-100 text-gray-800 border-gray-200',
  [ReviewStatus.COMPLETED]: 'bg-green-100 text-green-800 border-green-200',
  [ReviewStatus.REJECTED]: 'bg-red-100 text-red-800 border-red-200',
  [ReviewStatus.NEEDS_MORE_INFORMATION]: 'bg-orange-100 text-orange-800 border-orange-200',
  [ReviewStatus.NEEDS_ANOTHER_REVIEW]: 'bg-orange-100 text-orange-800 border-orange-200',
  [ReviewStatus.HIDDEN]: 'bg-gray-100 text-gray-800 border-gray-200',
};

const getDisplayStatus = (status: ReviewStatus): string => {
  switch (status) {
    case ReviewStatus.PENDING_REVIEW:
    case ReviewStatus.NEEDS_MORE_INFORMATION:
    case ReviewStatus.NEEDS_ANOTHER_REVIEW:
      return 'Needs Review';
    case ReviewStatus.COMPLETED:
      return 'Completed';
    case ReviewStatus.UNASSIGNED:
      return 'Unassigned';
    default:
      return status.replace(/_/g, ' ');
  }
};

export function UnifiedEntryDrawer({ 
  entryId, 
  isOpen, 
  onClose,
  onUpdate,
  showReviews = true,
  showActions = true
}: UnifiedEntryDrawerProps) {
  const [entry, setEntry] = useState<EntryWithDetailedReviews | null>(null);
  const [loading, setLoading] = useState(false);
  const [hidingEntry, setHidingEntry] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [songTitle, setSongTitle] = useState('');
  const [songLink, setSongLink] = useState('');
  const [artistName, setArtistName] = useState<string>('');
  const [coWriters, setCoWriters] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [paid, setPaid] = useState<boolean>(false);
  const [categories, setCategories] = useState<{ id: string; title: string; icon: string | null }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  useEffect(() => {
    if (entryId && isOpen) {
      loadEntryDetails();
    }
  }, [entryId, isOpen]);

  const loadEntryDetails = async () => {
    if (!entryId) return;
    
    setLoading(true);
    try {
      const { entry: entryData, error } = await getEntryWithDetailedReviews(entryId);
      if (error) {
        toast.error(error);
      } else if (entryData) {
        setEntry(entryData);
        // Keep edit form in sync when not actively editing
        if (!editMode) {
          setSongTitle(entryData.song.title || '');
          setSongLink(entryData.song.audioUrl || '');
          setArtistName(entryData.song.artistName || '');
          setCoWriters(entryData.song.coWriters || '');
          setCategoryId(entryData.category.id);
          setPaid(entryData.paid);
        }
      }
    } catch (error) {
      console.error('Error loading entry details:', error);
      toast.error('Failed to load entry details');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterEditMode = async () => {
    if (!entry) return;
    // Initialize form with current values
    setSongTitle(entry.song.title || '');
    setSongLink(entry.song.audioUrl || '');
    setArtistName(entry.song.artistName || '');
    setCoWriters(entry.song.coWriters || '');
    setCategoryId(entry.category.id);
    setPaid(entry.paid);

    // Load categories for select
    try {
      setCategoriesLoading(true);
      const { categories: cats, error } = await getCategories();
      if (error) {
        toast.error('Failed to load categories');
      } else if (cats) {
        const mapped = cats.map((c: any) => ({ id: c.id, title: c.title, icon: c.icon }));
        setCategories(mapped);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load categories');
    } finally {
      setCategoriesLoading(false);
      setEditMode(true);
    }
  };

  const resetEditState = () => {
    if (!entry) return;
    setSongTitle(entry.song.title || '');
    setSongLink(entry.song.audioUrl || '');
    setArtistName(entry.song.artistName || '');
    setCoWriters(entry.song.coWriters || '');
    setCategoryId(entry.category.id);
    setPaid(entry.paid);
  };

  const handleSave = async () => {
    if (!entry) return;

    // Basic client validation
    if (!songTitle.trim()) {
      toast.error('Song title is required');
      return;
    }
    if (!songLink.trim() || !/^https?:\/\//i.test(songLink.trim())) {
      toast.error('Please provide a valid http(s) URL for the audio link');
      return;
    }
    if (!categoryId) {
      toast.error('Please select a category');
      return;
    }

    setSaving(true);
    try {
      const result = await updateEntryDetails({
        entryId: entry.id,
        categoryId,
        paid,
        song: {
          title: songTitle.trim(),
          link: songLink.trim(),
          artistName: artistName.trim() || null,
          coWriters: coWriters.trim() || null,
        },
      });

      if (result.success) {
        toast.success('Entry updated');
        setEditMode(false);
        await loadEntryDetails();
        if (onUpdate) onUpdate();
      } else {
        toast.error(result.error || 'Failed to update entry');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to update entry');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleHidden = async () => {
    if (!entry) return;
    
    setHidingEntry(true);
    const isHidden = entry.hidden;
    
    try {
      const result = await setEntryHiddenStatus(entry.id, !isHidden);
      if (result.success) {
        toast.success(`Song successfully ${isHidden ? 'unhidden' : 'hidden'}`);
        loadEntryDetails();
        if (onUpdate) onUpdate();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to update song status');
    } finally {
      setHidingEntry(false);
    }
  };

  const getScreenerName = (review: EntryWithDetailedReviews['reviews'][0]) => {
    if (review.screener.firstName && review.screener.lastName) {
      return `${review.screener.firstName} ${review.screener.lastName}`;
    }
    return review.screener.email;
  };

  const handleOpenSongLink = () => {
    if (entry?.song.audioUrl) {
      window.open(entry.song.audioUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerClose />
      <DrawerHeader className="border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <DrawerTitle className="text-lg font-semibold text-gray-900">
              {entry?.song?.title || 'Entry Details'}
            </DrawerTitle>
            <DrawerDescription className="text-sm text-gray-500">
              by {entry?.contestant?.username || 'Unknown contestant'}
            </DrawerDescription>
          </div>
          <div className="flex items-center gap-2">
            {entry?.averageScore !== null && showReviews && (
              <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-lg">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <span className="text-xl font-bold">{entry?.averageScore.toFixed(1)}</span>
              </div>
            )}
            {!editMode ? (
              <Button size="sm" variant="outline" onClick={handleEnterEditMode} disabled={!entry}>
                Edit
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => { resetEditState(); setEditMode(false); }} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DrawerHeader>
      <DrawerContent className="max-h-[80vh] overflow-y-auto">
        {loading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : entry ? (
          <div className="space-y-6">
            {/* Edit form */}
            {editMode && (
              <div className="space-y-6 p-4 border rounded-lg bg-gray-50">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Song Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Title</label>
                      <Input value={songTitle} onChange={(e) => setSongTitle(e.target.value)} placeholder="Song title" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Audio Link</label>
                      <Input value={songLink} onChange={(e) => setSongLink(e.target.value)} placeholder="https://..." inputMode="url" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Artist Name</label>
                      <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Artist name" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-600">Co-writers</label>
                      <Textarea value={coWriters} onChange={(e) => setCoWriters(e.target.value)} placeholder="Co-writers" rows={3} />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Entry Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Category</label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder={categoriesLoading ? 'Loading…' : 'Select category'} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.icon ? `${c.icon} ` : ''}{c.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="paid" checked={paid} onCheckedChange={(v) => setPaid(!!v)} />
                        <label htmlFor="paid" className="text-sm text-gray-700">Paid</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Song Link */}
            {entry?.song.audioUrl && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Music className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{entry.song.title}</p>
                      <p className="text-sm text-gray-500">Click to open song link</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleOpenSongLink}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Song
                  </Button>
                </div>
              </div>
            )}

            {/* Entry Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Category</p>
                <Badge variant="outline" className="inline-flex items-center gap-1">
                  {entry.category.icon && <span>{entry.category.icon}</span>}
                  {entry.category.title}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Fan Votes</p>
                <p className="font-semibold">{entry.totalVotes.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Status</p>
                <Badge variant="outline" className={entry.hidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                  {entry.hidden ? 'Hidden' : 'Visible'}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Payment</p>
                <Badge variant="outline" className={entry.paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {entry.paid ? 'Paid' : 'Unpaid'}
                </Badge>
              </div>
            </div>

            {/* Contestant Info */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Contestant Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Username:</span>
                  <span className="font-medium">{entry.contestant.username}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Email:</span>
                  <span className="font-medium">{entry.contestant.email}</span>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            {showReviews && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Reviews ({entry.reviews.length})
                  </span>
                  {entry.averageScore !== null && (
                    <span className="text-sm text-gray-500">
                      Average Score: {entry.averageScore.toFixed(1)}
                    </span>
                  )}
                </h3>
                {entry.reviews.length > 0 ? (
                  <div className="space-y-3">
                    {entry.reviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-sm">{getScreenerName(review)}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Assigned {formatDistanceToNow(new Date(review.assignedAt), { addSuffix: true })}
                              </span>
                              {review.reviewedAt && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Reviewed {formatDistanceToNow(new Date(review.reviewedAt), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={reviewStatusColors[review.status]}>
                              {getDisplayStatus(review.status)}
                            </Badge>
                            {review.overallScore !== null && (
                              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-semibold text-sm">{review.overallScore}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {review.notes && (
                          <div className="bg-white rounded-md p-3">
                            <p className="text-xs font-medium text-gray-500 mb-1">Notes:</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.notes}</p>
                          </div>
                        )}
                        
                        {review.reviewRound > 1 && (
                          <p className="text-xs text-gray-500">Review Round: {review.reviewRound}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No reviews yet</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No entry selected
          </div>
        )}
      </DrawerContent>
      <DrawerFooter className="border-t border-gray-100">
        <div className="flex gap-2 w-full">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1"
          >
            Close
          </Button>
          {showActions && entry && (
            <Button 
              onClick={handleToggleHidden}
              disabled={hidingEntry}
              variant={entry.hidden ? "default" : "destructive"}
              className="flex-1 bg-[#D33F49] hover:bg-[#B73E47] text-white disabled:opacity-50"
            >
              {hidingEntry ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                  {entry.hidden ? 'Unhiding...' : 'Hiding...'}
                </div>
              ) : (
                entry.hidden ? 'Unhide Song' : 'Hide Song'
              )}
            </Button>
          )}
        </div>
      </DrawerFooter>
    </Drawer>
  );
} 
