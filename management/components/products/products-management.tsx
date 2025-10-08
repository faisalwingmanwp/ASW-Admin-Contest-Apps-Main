'use client';

import { useState, useEffect } from 'react';
import { 
  ProductWithDetails, 
  ProductFormData,
  getProductsByType, 
  updateProduct,
  initializeDefaultProducts
} from '@/lib/actions/product-actions';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Package, 
  Edit, 
  DollarSign, 
  Tag, 
  Loader2,
  ExternalLink,
  Trophy,
  Users,
  Music
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ProductType } from '@prisma/client';

const productIcons = {
  [ProductType.FAN_CONTEST]: Trophy,
  [ProductType.MEMBERSHIP]: Users,
  [ProductType.ENTRY]: Music,
  [ProductType.VOTEPACK]: Package,
};

const productColors = {
  [ProductType.FAN_CONTEST]: 'text-purple-600 bg-purple-100',
  [ProductType.MEMBERSHIP]: 'text-blue-600 bg-blue-100',
  [ProductType.ENTRY]: 'text-green-600 bg-green-100',
  [ProductType.VOTEPACK]: 'text-gray-600 bg-gray-100',
};

export default function ProductsManagement() {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);
  const [formData, setFormData] = useState<Partial<ProductFormData>>({
    name: '',
    price: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { products: fetchedProducts, error } = await getProductsByType([
        ProductType.FAN_CONTEST,
        ProductType.MEMBERSHIP,
        ProductType.ENTRY
      ]);
      
      if (error) {
        toast.error(error);
      } else if (fetchedProducts) {
        setProducts(fetchedProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeProducts = async () => {
    setIsInitializing(true);
    try {
      const { success, error, results } = await initializeDefaultProducts();
      
      if (error) {
        toast.error(error);
      } else if (success) {
        toast.success('Default products initialized successfully');
        fetchProducts();
      }
    } catch (error) {
      console.error('Error initializing products:', error);
      toast.error('Failed to initialize products');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleOpenDialog = (product: ProductWithDetails) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price / 100, // Convert cents to dollars for display
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'price') {
      const numValue = parseFloat(value) || 0;
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
    
    if (!editingProduct) return;
    
    // Validate form
    if (!formData.name?.trim()) {
      toast.error('Please enter a name for the product');
      return;
    }
    
    if (!formData.price || formData.price <= 0) {
      toast.error('Price must be greater than zero');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { product, error } = await updateProduct(editingProduct.id, formData);
      
      if (error) {
        toast.error(error);
      } else {
        toast.success('Product updated successfully');
        fetchProducts();
        handleCloseDialog();
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProductDisplayName = (type: ProductType) => {
    switch (type) {
      case ProductType.FAN_CONTEST:
        return 'Fan Contest Entry';
      case ProductType.MEMBERSHIP:
        return 'Membership';
      case ProductType.ENTRY:
        return 'Song Entry';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Product Settings</h2>
          <p className="text-gray-500 mt-1">Manage pricing for different product types</p>
        </div>
        {products.length === 0 && !loading && (
          <Button onClick={handleInitializeProducts} disabled={isInitializing}>
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Initialize Default Products
              </>
            )}
          </Button>
        )}
      </div>
      
      {loading ? (
        <div className="flex justify-center my-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-gray-100 mb-4">
              <Package className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Products Found</h3>
            <p className="text-sm text-gray-500 mb-4 text-center max-w-md">
              Click the button above to initialize default products for Fan Contest Entry, Membership, and Song Entry.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product) => {
            const Icon = productIcons[product.type] || Package;
            const colorClass = productColors[product.type] || 'text-gray-600 bg-gray-100';
            
            return (
              <Card key={product.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {getProductDisplayName(product.type)}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Created {formatDistanceToNow(new Date(product.createdAt), { addSuffix: true })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500 flex items-center">
                        <DollarSign className="mr-2 h-4 w-4" /> Price
                      </span>
                      <span className="font-semibold text-lg">${(product.price / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500 flex items-center">
                        <Tag className="mr-2 h-4 w-4" /> Price ID
                      </span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {product.stripePriceId.slice(0, 12)}...
                      </code>
                    </div>
                    {product.stripeProductId && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500 flex items-center">
                          <Tag className="mr-2 h-4 w-4" /> Product ID
                        </span>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {product.stripeProductId.slice(0, 12)}...
                        </code>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleOpenDialog(product)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Price
                  </Button>
                  {product.stripeProductId && (
                    <a 
                      href={`https://dashboard.stripe.com/products/${product.stripeProductId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="secondary" size="sm">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View in Stripe
                      </Button>
                    </a>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {editingProduct ? getProductDisplayName(editingProduct.type) : 'Product'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Fan Contest Entry"
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
                    placeholder="25.00"
                    value={formData.price}
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
                    Updating...
                  </>
                ) : (
                  'Update'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 