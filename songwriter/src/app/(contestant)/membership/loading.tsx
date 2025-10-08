import { Skeleton } from "@/components/ui/skeleton";

export default function MembershipLoading() {
    return (
        <div className="min-h-screen bg-white">
            <div className="container max-w-5xl mx-auto p-4 md:p-8">
                <div className="w-full max-w-3xl mx-auto">
                    {/* Page Header Skeleton */}
                    <div className="mb-8">
                        <Skeleton className="h-8 w-64 mb-3" />
                        <Skeleton className="h-5 w-full max-w-md mb-8" />
                    </div>

                    {/* Membership Status Card */}
                    <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 mb-8 border border-gray-100">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                            <div className="mb-4 md:mb-0">
                                <Skeleton className="h-6 w-48 mb-3" />
                                <Skeleton className="h-5 w-64" />
                            </div>
                            <Skeleton className="h-12 w-32 rounded-md bg-[#D33F49]/50" />
                        </div>
                    </div>

                    {/* Membership Plans Section */}
                    <div className="mb-10">
                        <Skeleton className="h-7 w-48 mb-5" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Premium Plan Card */}
                            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-[#D33F49] relative transition-all hover:shadow-lg">
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                    <Skeleton className="h-6 w-28 rounded-full bg-[#D33F49]/60" />
                                </div>
                                <div className="pt-4">
                                    <Skeleton className="h-7 w-32 mb-2" />
                                    <Skeleton className="h-10 w-36 mb-4" />
                                    <div className="space-y-2 mb-6">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                    <div className="space-y-3">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div key={i} className="flex items-center">
                                                <Skeleton className="h-5 w-5 rounded-full mr-2 bg-green-100" />
                                                <Skeleton className="h-4 flex-1" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6">
                                        <Skeleton className="h-12 w-full rounded-md bg-[#D33F49]/60" />
                                    </div>
                                </div>
                            </div>

                            {/* Basic Plan Card */}
                            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 transition-all hover:shadow-md">
                                <Skeleton className="h-7 w-32 mb-2" />
                                <Skeleton className="h-10 w-32 mb-4" />
                                <div className="space-y-2 mb-6">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center">
                                            <Skeleton className="h-5 w-5 rounded-full mr-2 bg-gray-100" />
                                            <Skeleton className="h-4 flex-1" />
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6">
                                    <Skeleton className="h-12 w-full rounded-md bg-gray-200" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Membership History Section */}
                    <div className="mb-8">
                        <Skeleton className="h-7 w-48 mb-4" />
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                            <div className="p-4 bg-gray-50">
                                <div className="grid grid-cols-4 gap-4">
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-5 w-24" />
                                </div>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="p-4">
                                        <div className="grid grid-cols-4 gap-4">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-4 w-16" />
                                            <Skeleton className="h-4 w-20" />
                                            <Skeleton className="h-10 w-24 rounded-md" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
