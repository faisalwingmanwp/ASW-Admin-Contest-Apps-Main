"use client";

import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="p-4 bg-gray-100 rounded-lg">
            <BarChart3 className="h-12 w-12 text-gray-400" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500">This section is under development. Coming soon!</p>
        </div>
        
        <Button variant="outline" disabled>
          Configure Settings
        </Button>
      </div>
    </div>
  );
} 