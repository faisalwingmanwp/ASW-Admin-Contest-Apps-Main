export default function OrdersLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Orders List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-2 bg-gray-100 rounded-lg animate-pulse">
                    <div className="w-5 h-5"></div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="h-5 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mb-2"></div>
                    <div className="flex items-center gap-4">
                      <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse"></div>
                      <div className="h-4 w-24 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 