import { Skeleton } from "@/components/ui/skeleton";

export default function SlugLoading() {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center">
            {/* Container to limit width on desktop */}
            <div className="w-full md:max-w-xl">
                {/* Artist Cover Section Skeleton */}
                <div className="relative w-full h-[450px] md:h-[550px] bg-gray-200">
                    {/* Overlay with artist name skeleton */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 flex flex-col justify-end items-center p-8">
                        <Skeleton className="w-32 h-6 bg-white/30 mb-2" />
                        <Skeleton className="w-64 h-14 bg-white/30 mb-2" />
                        <Skeleton className="w-48 h-6 bg-white/30 mb-8" />
                        
                        {/* Vote Now Button Skeleton */}
                        <Skeleton className="h-14 w-full max-w-md rounded-lg bg-[#D33F49]/30" />
                    </div>
                    
                    {/* Share button skeleton */}
                    <div className="absolute top-4 right-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                </div>

                <main className="">
                    {/* About Section Skeleton */}
                    <div className="p-2 py-10 px-4">
                        <Skeleton className="h-7 w-32 mb-4" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </div>

                    {/* Music Section Skeleton */}
                    <div className="bg-[#F6F7F8] p-6">
                        <Skeleton className="h-7 w-48 mb-2" />
                        <Skeleton className="h-5 w-64 mb-4" />

                        {/* Subheader + Music tracks Skeleton */}
                        <div className="overflow-hidden">
                            {/* Vote count subheader skeleton */}
                            <div className="py-4 flex items-center justify-between">
                                <Skeleton className="w-24 h-24 rounded-lg" />
                                
                                <div className="flex items-center">
                                    <div className="flex items-center mr-3">
                                        <Skeleton className="h-8 w-20 mr-2" />
                                    </div>
                                </div>
                            </div>

                            {/* Music tracks grouped by competition skeleton */}
                            <div className="pb-4 border-t-1 border-grey">
                                {/* Competition skeletons */}
                                {[1, 2].map((i) => (
                                    <div key={i} className="mb-6">
                                        {/* Competition header */}
                                        <Skeleton className="h-12 w-full bg-[#EFF2F6]/80 mb-4" />
                                        
                                        {/* Songs in this competition */}
                                        <div className="py-4 px-4 space-y-4">
                                            {[1, 2, 3].map((j) => (
                                                <div key={j} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex justify-between mb-3">
                                                        <Skeleton className="h-6 w-40" />
                                                        <Skeleton className="h-6 w-16" />
                                                    </div>
                                                    <div className="flex items-center">
                                                        <Skeleton className="h-16 w-16 rounded-lg mr-3" />
                                                        <div className="flex-1">
                                                            <Skeleton className="h-5 w-3/4 mb-2" />
                                                            <Skeleton className="h-4 w-1/2" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Contest Section Skeleton */}
                    <div className="p-4">
                        <Skeleton className="h-40 w-full rounded-lg" />
                    </div>
                </main>
            </div>
        </div>
    );
}