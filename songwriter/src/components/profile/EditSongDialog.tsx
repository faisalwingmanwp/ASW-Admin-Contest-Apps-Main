'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

import { Loader2, Edit, Plus } from "lucide-react";
import { Category } from "@prisma/client";
import { updateSongDetails } from "@/lib/song-actions";
import { toast } from "sonner";
import { addCategoryToSong } from "@/lib/category-actions";

interface EditSongDialogProps {
  songId: string;
  songTitle: string;
  songLink: string;
  currentCategories: {
    id: string;
    title: string;
  }[];
  availableCategories: {
    id: string;
    title: string;
  }[];
  competitionId: string;
  competitionName: string;
  onUpdate?: (updatedTitle: string, updatedLink: string) => void;
}

export default function EditSongDialog({ 
  songId, 
  songTitle,
  songLink,
  currentCategories,
  availableCategories,
  competitionId,
  competitionName,
  onUpdate
}: EditSongDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(songTitle);
  const [link, setLink] = useState(songLink);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  
  // Filter out categories that are already selected
  const remainingCategories = availableCategories.filter(
    category => !currentCategories.some(c => c.id === category.id)
  );
  
  const handleSave = async () => {
    try {
      setIsUpdating(true);
      await updateSongDetails(songId, title, link);
      toast('Song details updated');
      
      // Call the onUpdate callback if provided
      if (onUpdate) {
        onUpdate(title, link);
      }
      
      setOpen(false);
    } catch (error) {
      console.error('Failed to update song:', error);
      toast.error('Failed to update song details');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleAddCategory = async () => {
    try {
      if (!selectedCategoryId) {
        toast.error('Please select a category to add.');
        return;
      }
      
      setIsAddingCategory(true);
      
      // Redirect to payment flow for adding a new category
      const response = await addCategoryToSong({
        songId,
        categoryId: selectedCategoryId,
        competitionId
      });
      
      if (response.success && response.url) {
        // Redirect to Stripe checkout
        window.location.href = response.url;
      } else {
        throw new Error(response.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error('Failed to add category:', error);
      toast.error('Failed to add category');
      setIsAddingCategory(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-2 h-8">
          <Edit className="h-3.5 w-3.5 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Song Details</DialogTitle>
          <DialogDescription>
            Make changes to your song information here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="link" className="text-right">
              Link
            </Label>
            <Input
              id="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          {/* Current Categories */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Current Categories</h3>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {currentCategories.map((category) => (
                <span key={category.id} className="rounded-md bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 text-xs font-medium">
                  {category.title}
                </span>
              ))}
            </div>
            
            {/* Add New Category Section */}
            {remainingCategories.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Add New Category</h3>
                <div className="flex items-center gap-2">
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                  >
                    <option value="">Select category...</option>
                    {remainingCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.title}
                      </option>
                    ))}
                  </select>
                  <Button 
                    onClick={handleAddCategory}
                    disabled={isAddingCategory || !selectedCategoryId}
                    className="bg-[#D33F49] hover:bg-[#C03541]"
                  >
                    {isAddingCategory ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Adding a new category requires payment. You'll be redirected to checkout.
                </p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isUpdating || !title || !link}
            className="bg-[#D33F49] hover:bg-[#C03541]"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
