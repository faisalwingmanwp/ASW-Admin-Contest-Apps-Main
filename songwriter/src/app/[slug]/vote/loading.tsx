
import { ChevronLeft } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export default function SlugVoteLoading() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
                {/* Header with back button */}
                <div className="flex items-center space-x-2 p-4 border-b border-gray-100">
                    <button className="flex items-center text-gray-500 hover:text-gray-700">
                        <ChevronLeft className="h-5 w-5" />
                        <span>Back</span>
                    </button>
                </div>

                {/* Main content */}
                <div className="p-6">
                    {/* Contestant info */}
                    <div className="flex items-center mb-6">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="ml-4">
                            <Skeleton className="h-6 w-32 mb-2" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    </div>

                    {/* Song title */}
                    <div className="mb-8">
                        <Skeleton className="h-8 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>

                    {/* Input fields */}
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                        <div>
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                    </div>

                    {/* Vote options */}
                    <div className="mb-8">
                        <Skeleton className="h-7 w-48 mb-2" />
                        <Skeleton className="h-5 w-64 mb-6" />

                        {/* Free vote option */}
                        <div className="flex items-center justify-between py-4 px-1">
                            <div className="flex items-center">
                                <Skeleton className="h-6 w-6 mr-3 rounded-full" />
                                <Skeleton className="h-8 w-8" />
                            </div>
                            <Skeleton className="h-12 w-24 rounded-lg" />
                        </div>

                        <div className="border-t border-gray-200 my-5"></div>

                        <Skeleton className="h-6 w-56 mb-5" />

                        {/* Paid vote options */}
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between py-4 px-1">
                                <div className="flex items-center">
                                    <Skeleton className="h-6 w-6 mr-3 rounded-full" />
                                    <Skeleton className="h-8 w-12" />
                                </div>
                                <Skeleton className="h-12 w-24 rounded-lg" />
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-4 mb-12">
                        <Skeleton className="h-3 w-full mx-auto max-w-md" />
                    </div>
                </div>
            </div>
        </div>
    );
}