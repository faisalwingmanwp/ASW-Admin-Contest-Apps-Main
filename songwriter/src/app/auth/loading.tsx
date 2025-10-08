import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AuthLoading() {
    return (
        <div className="w-full">
            <Card className="border-0 shadow-none">
                <CardHeader className="text-center space-y-2">
                    <Skeleton className="h-8 w-3/4 mx-auto" />
                    <Skeleton className="h-4 w-2/3 mx-auto" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {/* Input field skeleton */}
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                        
                        {/* Button skeleton */}
                        <Skeleton className="h-11 w-full rounded-md" />
                        
                        {/* Additional info skeleton */}
                        <div className="text-center mt-6 space-y-1">
                            <Skeleton className="h-3 w-36 mx-auto" />
                            <Skeleton className="h-3 w-52 mx-auto" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}