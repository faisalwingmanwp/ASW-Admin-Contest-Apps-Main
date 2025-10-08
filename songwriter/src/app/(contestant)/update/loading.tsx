import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileUpdateLoading() {
    return (
        <div className="container max-w-5xl mx-auto p-4 md:p-8">
            <div className="w-full max-w-3xl mx-auto">
                {/* Page Header Skeleton */}
                <div className="mb-8">
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-full max-w-md mb-8" />
                </div>

                {/* Form Skeleton */}
                <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 space-y-6">
                    {/* Profile Photo Section */}
                    <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-gray-100">
                        <Skeleton className="h-32 w-32 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-64" />
                            <div className="flex gap-2 mt-3">
                                <Skeleton className="h-9 w-24 rounded-md" />
                                <Skeleton className="h-9 w-24 rounded-md" />
                            </div>
                        </div>
                    </div>

                    {/* Personal Info Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name fields */}
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                        
                        {/* Contact fields */}
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                        
                        {/* Username field */}
                        <div className="space-y-2 md:col-span-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                        
                        {/* Bio field */}
                        <div className="space-y-2 md:col-span-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-32 w-full rounded-md" />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Skeleton className="h-10 w-24 rounded-md" />
                        <Skeleton className="h-10 w-24 rounded-md" />
                    </div>
                </div>
            </div>
        </div>
    );
}
