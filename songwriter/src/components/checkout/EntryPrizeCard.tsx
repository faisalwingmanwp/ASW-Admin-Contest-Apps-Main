"use client";
import { Clipboard, Hash, Medal } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "../ui/checkbox";

interface EntryPrizeCardProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function EntryPrizeCard({ checked, onChange }: EntryPrizeCardProps) {
  return (
    <div className="rounded-lg overflow-hidden mb-8">
      {/* Checkbox section at the top with blue background */}
      <div className="p-4 bg-[#2B6CA3] text-white flex items-center">
        <div className="flex items-center">
          <Checkbox 
            id="fan-contest-opt-in" 
            checked={checked}
            onCheckedChange={(checked: boolean) => onChange(checked)}
            className="h-5 w-5 border-white bg-white data-[state=checked]:bg-white data-[state=checked]:text-black"
          />
          <Label 
            htmlFor="fan-contest-opt-in" 
            className="ml-2 text-lg font-medium cursor-pointer"
          >
            Yes, sign me up!
          </Label>
        </div>
      </div>
      
      {/* Main content with light gray background and black text */}
      <div className="p-6 bg-[#E8E8E8] text-[#000000]">
        <h3 className="text-4xl font-bold mb-2">$5,000 <span className="text-2xl font-bold">Cash prize +</span></h3>

        <ul className="space-y-4 mt-6">
          <li className="flex items-center">
            <div className="mr-4 flex-shrink-0">
              <Clipboard className="h-5 w-5 text-[#000000]" />
            </div>
            <span className="text-base">American Songwriter Magazine feature</span>
          </li>
          <li className="flex items-center">
            <div className="mr-4 flex-shrink-0">
              <Hash className="h-5 w-5 text-[#000000]" />
            </div>
            <span className="text-base">Social Media spotlight</span>
          </li>
          <li className="flex items-center">
            <div className="mr-4 flex-shrink-0">
              <Medal className="h-5 w-5 text-[#000000]" />
            </div>
            <span className="text-base">Automatic inclusion in Top Songs heard by official judges</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
