'use client';

import { useState, useEffect } from 'react';
import { 
  VotePackWithProduct, 
  VotePackFormData,
  getVotePacks, 
  createVotePack, 
  updateVotePack, 
  deleteVotePack 
} from '@/lib/actions/vote-pack-actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Zap, 
  DollarSign, 
  Tag, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function VotePacksManagement() {
  const router = useRouter();
  const [votePacks, setVotePacks] = useState<VotePackWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVotePack, setEditingVotePack] = useState<VotePackWithProduct | null>(null);
  const [formData, setFormData] = useState<VotePackFormData>({
    name: '',
    price: 0,
    quantity: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchVotePacks();
  }, []);

  const fetchVotePacks = async () => {
    setLoading(true);
    try {
      const { votePacks: fetchedVotePacks, error } = await getVotePacks();
      if (error) {
        toast.error(error);
      } else if (fetchedVotePacks) {
        setVotePacks(fetchedVotePacks);
      }
    } catch (error) {
      console.error('Error fetching vote packs:', error);
      toast.error('Failed to load vote packs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (votePack?: VotePackWithProduct) => {
    if (votePack) {
      // Edit mode
      setEditingVotePack(votePack);
      setFormData({
        name: votePack.product.name,
        price: votePack.product.price / 100, // Convert cents to dollars for display
        quantity: votePack.quantity
      });
    } else {
      // Create mode
      setEditingVotePack(null);
      setFormData({
        name: '',
        price: 0,
        quantity: 0
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingVotePack(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric inputs
    if (name === 'price' || name === 'quantity') {
      const numValue = name === 'price' 
        ? parseFloat(value) || 0 
        : parseInt(value) || 0;
      
      setFormData({
        ...formData,
        [name]: numValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name.trim()) {
      toast.error('Please enter a name for the vote pack');
      return;
    }
    
    if (formData.price <= 0) {
      toast.error('Price must be greater than zero');
      return;
    }
    
    if (formData.quantity <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (editingVotePack) {
        // Update existing vote pack
        const { votePack, error } = await updateVotePack(editingVotePack.id, formData);
        
        if (error) {
          toast.error(error);
        } else {
          toast.success('Vote pack updated successfully');
          fetchVotePacks();
          handleCloseDialog();
        }
      } else {
        // Create new vote pack
        const { votePack, error } = await createVotePack(formData);
        
        if (error) {
          toast.error(error);
        } else {
          toast.success('Vote pack created successfully');
          fetchVotePacks();
          handleCloseDialog();
        }
      }
    } catch (error) {
      console.error('Error saving vote pack:', error);
      toast.error('Failed to save vote pack');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const { success, error } = await deleteVotePack(id);
      
      if (error) {
        toast.error(error);
      } else {
        toast.success('Vote pack deleted successfully');
        fetchVotePacks();
      }
    } catch (error) {
      console.error('Error deleting vote pack:', error);
      toast.error('Failed to delete vote pack');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Vote Packs</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Vote Pack
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center my-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : votePacks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-gray-100 mb-4">
              <Package className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Vote Packs Found</h3>
            <p className="text-sm text-gray-500 mb-4 text-center max-w-md">
              Create your first vote pack to start selling votes to fans.
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Vote Pack
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {votePacks.map((votePack) => (
            <Card key={votePack.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Package className="mr-2 h-5 w-5 text-gray-500" />
                    {votePack.product.name}
                  </span>
                  <Badge variant="secondary" className="ml-2">
                    ${(votePack.product.price / 100).toFixed(2)}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Created {formatDistanceToNow(new Date(votePack.createdAt), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500 flex items-center">
                      <Zap className="mr-2 h-4 w-4" /> Votes
                    </span>
                    <span className="font-semibold">{votePack.quantity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500 flex items-center">
                      <DollarSign className="mr-2 h-4 w-4" /> Price
                    </span>
                    <span className="font-semibold">${(votePack.product.price / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500 flex items-center">
                      <Tag className="mr-2 h-4 w-4" /> Price ID
                    </span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {votePack.product.stripePriceId.slice(0, 12)}...
                    </code>
                  </div>
                  {votePack.product.stripeProductId && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500 flex items-center">
                        <Tag className="mr-2 h-4 w-4" /> Product ID
                      </span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {votePack.product.stripeProductId.slice(0, 12)}...
                      </code>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-3">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleOpenDialog(votePack)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  {votePack.product.stripeProductId && (
                    <a 
                      href={`https://dashboard.stripe.com/products/${votePack.product.stripeProductId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="secondary" size="sm">
                        Open in Stripe
                      </Button>
                    </a>
                  )}
                </div>
                {deleteConfirmId === votePack.id ? (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={isDeleting}
                    onClick={() => handleDelete(votePack.id)}
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <AlertCircle className="mr-2 h-4 w-4" />
                    )}
                    Confirm
                  </Button>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setDeleteConfirmId(votePack.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVotePack ? 'Edit Vote Pack' : 'Create Vote Pack'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., 10 Votes Package"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Price (USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="9.99"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quantity">Number of Votes</Label>
                <div className="relative">
                  <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    placeholder="10"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCloseDialog}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingVotePack ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {editingVotePack ? 'Update' : 'Create'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
