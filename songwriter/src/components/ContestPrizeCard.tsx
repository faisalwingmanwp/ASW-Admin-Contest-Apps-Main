"use client";
import { Clipboard, Hash, Medal } from "lucide-react";

interface ContestPrizeCardProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export default function ContestPrizeCard({ checked, onChange }: ContestPrizeCardProps) {
  const isInteractive = typeof onChange === 'function';

  return (
    <div className="rounded-lg overflow-hidden">
      {/* Conditionally render the checkbox section */}
      {isInteractive && (
        <div className="bg-[#4A90E2] text-white p-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              className="h-5 w-5 rounded border-white mr-3"
            />
            <span className="text-lg font-medium">Yes, sign me up!</span>
          </label>
        </div>
      )}
      
      <div className="p-8 bg-[#E8E8E8] text-[#000000]">
        {!isInteractive && (
          <>
            <h2 className="text-2xl font-bold mb-4">Why Your Vote Matters</h2>
            <p className="text-xl mb-8 text-gray-500">Every vote brings this talented musician closer to winning:</p>
          </>
        )}
        <h3 className="text-3xl font-bold mb-6">$5,000 <span className="text-2xl font-normal">Cash prize +</span></h3>

        <ul className="space-y-4">
          <li className="flex items-center">
            <div className="mr-3">
              <Clipboard size={20} className="text-[#000000]" />
            </div>
            <span className="text-base">American Songwriter magazine feature</span>
          </li>
          <li className="flex items-center">
            <div className="mr-3">
              <Hash size={20} className="text-[#000000]" />
            </div>
            <span className="text-base">Social media spotlight</span>
          </li>
          <li className="flex items-center">
            <div className="mr-3">
              <Medal size={20} className="text-[#000000]" />
            </div>
            <span className="text-base">Automatic finalist status for judge selection</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
