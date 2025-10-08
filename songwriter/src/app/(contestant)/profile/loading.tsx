
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
    return (
        <div className="min-h-screen bg-white">
            {/* Full-width background container */}
            <div className="w-full">
                {/* Header with consistent max-width */}
                <div className="w-full max-w-xl mx-auto">
                    {/* Profile Header Skeleton - maintaining aspect ratio */}
                    <div className="relative w-full h-[450px] md:h-[550px]">
                        {/* Dark overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30"></div>
                        
                        {/* Eye icon for preview */}
                        <div className="absolute top-4 right-4">
                            <Skeleton className="h-14 w-14 rounded-full bg-white/80" />
                        </div>
                        
                        {/* Content in the overlay */}
                        <div className="absolute inset-0 flex flex-col justify-end p-8">
                            {/* Centered profile photo */}
                            <div className="flex flex-col items-center mb-2">
                                <div className="relative w-24 h-24 mb-4">
                                    <Skeleton className="h-24 w-24 rounded-full" />
                                </div>
                            </div>
                            
                            {/* Artist name and description */}
                            <div className="text-center mb-8">
                                <Skeleton className="h-12 w-64 mx-auto bg-white/30 mb-3" />
                                <Skeleton className="h-6 w-80 mx-auto bg-white/30" />
                            </div>
                            
                            {/* Bottom action buttons */}
                            <div className="flex flex-col md:flex-row w-full gap-4">
                                <Skeleton className="h-16 flex-1 rounded-lg bg-white/80" />
                                <Skeleton className="h-16 flex-1 rounded-lg bg-[#D33F49]/80" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Content area with consistent max-width */}
            <div className="flex justify-center w-full">
                <div className="w-full max-w-xl mx-auto p-4 md:p-8">
                    {/* Support Tickets Skeleton */}
                    <div className="mb-8">
                        <Skeleton className="h-7 w-48 mb-2" />
                        <Skeleton className="h-4 w-72 mb-4" />
                        
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                            {[1, 2].map((i) => (
                                <div key={i} className="p-4 border-b border-gray-100">
                                    <div className="flex justify-between mb-2">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-5 w-20" />
                                    </div>
                                    <Skeleton className="h-4 w-full mb-2" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <div className="flex justify-end mt-3">
                                        <Skeleton className="h-8 w-20 rounded-md" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Music Section Skeleton */}
                    <div className="mb-8">
                        <Skeleton className="h-7 w-48 mb-2" />
                        <Skeleton className="h-4 w-72 mb-4" />

                        {/* Music tracks with background */}
                        <div className="bg-[#F6F7F8] rounded-lg shadow-sm overflow-hidden border border-gray-100">
                            {/* Vote count subheader skeleton */}
                            <div className="p-4 flex items-center justify-between">
                                <Skeleton className="w-24 h-24 rounded-lg" />
                                
                                <div className="flex items-center">
                                    <div className="flex items-center">
                                        <Skeleton className="h-8 w-8 rounded-full mr-2" />
                                        <Skeleton className="h-8 w-20" />
                                    </div>
                                </div>
                            </div>

                            {/* Music tracks grouped by competition skeleton */}
                            <div className="pb-4 border-t border-gray-200">
                                {/* Competition skeletons */}
                                {[1, 2].map((i) => (
                                    <div key={i} className="mb-6">
                                        {/* Competition header */}
                                        <div className="bg-[#EFF2F6] p-4">
                                            <Skeleton className="h-6 w-40" />
                                        </div>
                                        
                                        {/* Songs in this competition */}
                                        <div className="p-4 space-y-4">
                                            {[1, 2].map((j) => (
                                                <div key={j} className="bg-white rounded-lg border border-gray-200 p-4 transition-all hover:shadow-md">
                                                    <div className="flex justify-between mb-3">
                                                        <Skeleton className="h-6 w-32" />
                                                        <Skeleton className="h-6 w-16" />
                                                    </div>
                                                    <div className="flex">
                                                        <Skeleton className="h-14 w-14 rounded-lg mr-3" />
                                                        <div className="flex-1">
                                                            <Skeleton className="h-5 w-full md:w-3/4 mb-2" />
                                                            <div className="flex flex-wrap gap-2">
                                                                <Skeleton className="h-6 w-16 rounded-full" />
                                                                <Skeleton className="h-6 w-20 rounded-full" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 flex justify-end space-x-2">
                                                        <Skeleton className="h-9 w-24 rounded-md" />
                                                        <Skeleton className="h-9 w-24 rounded-md" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add New Submission Button Skeleton */}
                        <div className="mt-6">
                            <Skeleton className="h-16 w-full rounded-xl bg-gray-100" />
                        </div>
                    </div>

                    {/* Contest Section Skeleton */}
                    <div className="mb-8">
                        <Skeleton className="h-64 w-full rounded-lg shadow-sm" />
                    </div>
                </div>
            </div>
        </div>
    );
}