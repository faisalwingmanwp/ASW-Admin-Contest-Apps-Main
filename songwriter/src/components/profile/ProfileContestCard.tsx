'use client';
import { Clipboard, Hash, Medal } from "lucide-react";

export default function ProfileContestCard() {
  return (
    <div className="p-10 bg-black text-white rounded-lg">
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Why Your Vote Matters</h2>
        <p className="text-xl mb-8 text-gray-300">Every vote brings this talented musician closer to winning:</p>
        
        <h3 className="text-4xl font-bold mb-8">$5,000 <span className="text-3xl">Cash prize +</span></h3>

        <ul className="space-y-6">
          <li className="flex items-center">
            <div className="mr-4">
              <Clipboard size={24} />
            </div>
            <span className="text-xl text-gray-300">American Songwriter magazine feature</span>
          </li>
          <li className="flex items-center">
            <div className="mr-4">
              <Hash size={24} />
            </div>
            <span className="text-xl text-gray-300">Social media spotlight</span>
          </li>
          <li className="flex items-center">
            <div className="mr-4">
              <Medal size={24} />
            </div>
            <span className="text-xl text-gray-300">Automatic finalist status for judge selection</span>
          </li>
        </ul>
      </div>
      
      {/* Action Steps Section - Only for profile page */}
      <div className="border-t border-gray-700 pt-8">
        <h2 className="text-2xl font-bold mb-6">Action Steps:</h2>
        <ol className="space-y-4 list-decimal list-inside">
          <li className="text-lg">Submit songs</li>
          <li className="text-lg">Share your profile on social</li>
          <li className="text-lg">Ask fans to vote daily</li>
          <li className="text-lg">Track your progress</li>
        </ol>
        
        <p className="mt-6 text-gray-400">
          More votes = better chances. Start promoting now!
        </p>
      </div>
    </div>
  );
}
