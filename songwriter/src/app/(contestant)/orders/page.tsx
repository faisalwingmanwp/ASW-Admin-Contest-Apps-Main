'use client';

import { useState, useEffect } from 'react';
import { getContestantOrders } from '@/lib/order-actions';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface OrderCardProps {
  order: any;
  onCompletePayment: (entryId: string) => void;
  isProcessing: boolean;
}

function OrderCard({ order, onCompletePayment, isProcessing }: OrderCardProps) {
  const isIncomplete = order.type === 'entry' && !order.paid;
  const isCompleted = order.type === 'purchase' || (order.type === 'entry' && order.paid);
  
  const handleCompleteClick = () => {
    if (order.type === 'entry' && !order.paid) {
      onCompletePayment(order.id);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border-2 ${
      isCompleted ? 'border-green-200' : 'border-red-200'
    } overflow-hidden`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <XCircle className="h-3 w-3 mr-1" />
              Incomplete
            </Badge>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {format(new Date(order.createdAt), 'MMM d, yyyy')}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        <h3 className="text-lg font-medium mb-1">
          {order.type === 'entry' ? order.song.title : order.product.name}
        </h3>
        
        <p className="text-gray-600 text-sm mb-3">
          {order.type === 'entry' && order.competition 
            ? order.competition.name 
            : 'Purchase'
          }
        </p>

        {/* Categories */}
        {order.type === 'entry' && (
          <div className="mb-4">
            <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
              <span className="font-medium">CATEGORIES</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {/* Show all categories if available, otherwise show the single category */}
              {order.allCategories && order.allCategories.length > 0 ? (
                order.allCategories.map((category: any) => (
                  <Badge key={category.id} variant="outline" className="bg-gray-100 text-gray-700">
                    {category.title}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="bg-gray-100 text-gray-700">
                  {order.category.title}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Price and Action */}
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">
            ${(order.type === 'entry' ? order.product.price : order.priceAtPurchase) / 100}
          </div>
          
          {isIncomplete && (
            <Button 
              onClick={handleCompleteClick}
              disabled={isProcessing}
              className="bg-[#D33F49] hover:bg-[#C03541] text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing
                </>
              ) : (
                'Complete'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'incomplete' | 'completed'>('all');
  const [processingEntryId, setProcessingEntryId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ordersData = await getContestantOrders();
        setOrders(ordersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCompletePayment = async (entryId: string) => {
    try {
      setProcessingEntryId(entryId);
      
      const response = await fetch('/api/create-payment-intent/existing-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        console.error(data.error);
        alert('Error creating checkout session: ' + data.error);
        return;
      }
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
      
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setProcessingEntryId(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-2xl font-bold mb-6">Order History</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border-2 border-gray-200 p-4 animate-pulse">
              <div className="flex justify-between items-center mb-4">
                <div className="h-6 w-24 bg-gray-200 rounded"></div>
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
              </div>
              <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-1/2 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 w-full bg-gray-200 rounded mb-4"></div>
              <div className="flex justify-between items-center">
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
                <div className="h-10 w-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <div className="flex items-center text-red-800">
            <XCircle className="w-6 h-6 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!orders) {
    return null;
  }

  // Combine and process all orders
  const allOrdersData = [
    ...orders.purchases.map((purchase: any) => ({
      ...purchase,
      type: 'purchase' as const,
    })),
    ...orders.entries.map((entry: any) => ({
      ...entry,
      type: 'entry' as const,
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filter orders based on active tab
  const filteredOrders = allOrdersData.filter(order => {
    if (activeTab === 'all') return true;
    if (activeTab === 'completed') {
      return order.type === 'purchase' || (order.type === 'entry' && order.paid);
    }
    if (activeTab === 'incomplete') {
      return order.type === 'entry' && !order.paid;
    }
    return true;
  });

  const stats = orders.stats || { totalOrders: 0, completedOrders: 0, incompleteOrders: 0 };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Order History</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-[#D33F49] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Orders ({stats.totalOrders})
        </button>
        <button
          onClick={() => setActiveTab('incomplete')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'incomplete'
              ? 'bg-[#D33F49] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Incomplete ({stats.incompleteOrders})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'completed'
              ? 'bg-[#D33F49] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Completed ({stats.completedOrders})
        </button>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            {activeTab === 'all' 
              ? 'No orders found' 
              : `No ${activeTab} orders found`
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onCompletePayment={handleCompletePayment}
              isProcessing={processingEntryId === order.id}
            />
          ))}
        </div>
      )}
    </div>
  );
} 