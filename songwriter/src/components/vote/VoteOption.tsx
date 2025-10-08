'use client';

import { VotePackWithProduct } from './VotePackSelect';

interface VoteOptionProps {
  votePack: VotePackWithProduct;
  isSelected: boolean;
  onSelect: () => void;
  bonusPercentage: number | null;
}

export default function VoteOption({
  votePack,
  isSelected,
  onSelect,
  bonusPercentage,
}: VoteOptionProps) {
  return (
    <div 
      onClick={onSelect}
      className={`flex items-center justify-between py-4 ${isSelected ? 'bg-gray-50' : ''} cursor-pointer border-b border-gray-100`}
    >
      <div className="flex items-center ml-2">
        <span className="text-xl mr-3 text-black">★</span>
        <span className="text-xl font-medium">{votePack.quantity}</span>
        
        {bonusPercentage && (
          <div className="ml-6">
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
              {bonusPercentage}% Bonus
            </span>
          </div>
        )}
      </div>
      
      <div className="bg-black text-white rounded-lg px-4 py-2 min-w-[90px] text-center mr-2">
        <span className="text-base font-medium">
          {votePack.product.price === 0 ? 'Free' : `$${(votePack.product.price / 100).toFixed(2)}`}
        </span>
      </div>
    </div>
  );
} 