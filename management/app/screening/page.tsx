'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Music2, 
  CheckCircle2, 
  XCircle,
  Clock, 
  BarChart2, 
  FileMusic,
  Calendar,
  HelpCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getScreenerDashboardData } from '@/lib/actions/screener-actions';
import { ReviewStatus } from '@prisma/client';

interface EntryToReview {
  id: string;
  entry: {
    id: string;
    song: {
      title: string;
    };
    category: {
      title: string;
    };
    contestant: {
      username: string;
    };
    createdAt: Date;
  };
  status: ReviewStatus;
  assignedAt: Date;
}

export default function ScreeningDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [pendingReviews, setPendingReviews] = useState<EntryToReview[]>([]);
  const [completedReviews, setCompletedReviews] = useState<EntryToReview[]>([]);
  const [stats, setStats] = useState({
    needsReview: 0,
    completed: 0
  });

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { user, stats, pendingReviews, completedReviews, error } = await getScreenerDashboardData();

        if (error || !user) {
          console.error('Error loading user data:', error);
          return;
        }

        setUserData(user);
        setStats({
          needsReview: stats.pending + stats.assigned,
          completed: stats.completed
        });
        setPendingReviews(pendingReviews as any);
        setCompletedReviews(completedReviews as any);

      } catch (error) {
        console.error('Error in dashboard data loading:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadDashboardData();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }

  // Calculate completion percentage
  const totalReviews = stats.needsReview + stats.completed;
  const completionPercentage = totalReviews > 0 
    ? Math.round((stats.completed / totalReviews) * 100) 
    : 0;

  return (
    <div>
      {/* Welcome Card */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle>Welcome back, {userData?.firstName || 'Screener'}</CardTitle>
          <CardDescription>
            You have {stats.needsReview} entries that need review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Completion Progress</span>
                <span className="text-sm font-medium">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-orange-50 p-3 rounded-md text-center">
                <div className="font-bold text-2xl text-orange-600">{stats.needsReview}</div>
                <div className="text-xs text-gray-500">Needs Review</div>
              </div>
              <div className="bg-green-50 p-3 rounded-md text-center">
                <div className="font-bold text-2xl text-green-600">{stats.completed}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/screening/entries">
              <FileMusic className="mr-2 h-4 w-4" />
              Review Entries
            </Link>
          </Button>
        </CardFooter>
      </Card>
      
      {/* Pending Reviews */}
      <h2 className="text-xl font-semibold mb-4">Entries Needing Review</h2>
      {pendingReviews.length === 0 ? (
        <Card className="bg-gray-50 mb-6">
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">All caught up! No entries need review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {pendingReviews.slice(0, 4).map((review) => (
            <Card key={review.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <Badge 
                    variant="outline" 
                    className="bg-orange-100 text-orange-800"
                  >
                    Needs Review
                  </Badge>
                  <Badge variant="outline" className="bg-gray-100">{review.entry.category.title}</Badge>
                </div>
                <CardTitle className="text-lg mt-2">{review.entry.song.title}</CardTitle>
                <CardDescription>{review.entry.contestant.username}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="text-sm text-gray-500 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Assigned {formatDistanceToNow(new Date(review.assignedAt), { addSuffix: true })}
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/screening/entries/${review.entry.id}`}>
                    Review Now
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Recent Activity */}
      <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
      {completedReviews.length === 0 ? (
        <Card className="bg-gray-50">
          <CardContent className="py-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">No review activity yet. Start reviewing entries!</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="space-y-4">
              {completedReviews.slice(0, 5).map((review) => (
                <div key={review.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-full ${
                      review.status === ReviewStatus.COMPLETED ? 'bg-green-100' :
                      review.status === ReviewStatus.NEEDS_MORE_INFORMATION || review.status === ReviewStatus.NEEDS_ANOTHER_REVIEW ? 'bg-amber-100' : 'bg-blue-100'
                    }`}>
                      {review.status === ReviewStatus.COMPLETED ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : review.status === ReviewStatus.NEEDS_MORE_INFORMATION ? (
                        <XCircle className="h-5 w-5 text-amber-600" />
                      ) : review.status === ReviewStatus.NEEDS_ANOTHER_REVIEW ? (
                        <HelpCircle className="h-5 w-5 text-amber-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{review.entry.song.title}</div>
                      <div className="text-sm text-gray-500">
                        {review.entry.contestant.username} • {review.entry.category.title}
                      </div>
                      {review.status !== ReviewStatus.COMPLETED && (
                        <div className="text-sm text-amber-800 font-medium mt-1">
                          {review.status === ReviewStatus.NEEDS_MORE_INFORMATION ? 'Marked for requiring more information' :
                           review.status === ReviewStatus.NEEDS_ANOTHER_REVIEW ? 'Marked for another review' :
                           null}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(review.assignedAt), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
