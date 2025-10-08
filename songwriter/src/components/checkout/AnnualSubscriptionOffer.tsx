"use client";

interface AnnualSubscriptionOfferProps {
  isSelected: boolean;
  onToggle: (selected: boolean) => void;
  disabled?: boolean;
  originalPrice: number; // price in cents
  discountPercent: number; // discount percentage
}

export default function AnnualSubscriptionOffer({ 
  isSelected, 
  onToggle, 
  disabled = false,
  originalPrice: _originalPrice,
  discountPercent
}: AnnualSubscriptionOfferProps) {
  // Prices are intentionally hard-coded for display per request.
  return (
    <div className="max-w-xl mx-auto w-full rounded-lg overflow-hidden mb-8">
      {/* Checkbox section at the top with blue background */}
      <div className="bg-[#2B6CA3] text-white p-6">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={disabled}
            className="h-5 w-5 rounded border-white mr-3"
          />
          <span className="text-lg font-medium">Yes, I will take it!</span>
        </label>
      </div>
      
      {/* Main content with light gray background */}
      <div className="p-8 bg-[#E8E8E8] text-[#000000]">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <img 
              src="/subscription.png" 
              alt="American Songwriter Magazine" 
              width={80} 
              height={80}
              className="object-contain rounded-lg"
            />
          </div>
          <div className="flex-grow">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-full bg-black text-white px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                {discountPercent}% off
              </span>
              <h3 className="text-xl font-semibold text-black">Annual Magazine Subscription</h3>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-extrabold text-black">59.99</span>
              <span className="text-sm text-black/60">$119.99 originally</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 