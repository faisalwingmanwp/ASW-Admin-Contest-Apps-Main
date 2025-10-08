'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { approveScreener, rejectScreener, getPendingScreeners, getActiveTeamMembers, getPendingInvitations } from '@/lib/actions/screener-actions';
import { updateUserRole, removeTeamMember, resendInvitation, cancelInvitation } from '@/lib/actions/team-actions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckIcon, XIcon, ClockIcon, UserIcon, CalendarIcon, MailIcon, UsersIcon, Edit3Icon, SaveIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { UserRole } from '@prisma/client';

type PendingScreenerApplication = {
  id: string;
  userId: string;
  createdAt: Date;
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  preferredCategories: {
    id: string;
    title: string;
  }[];
};

type TeamMember = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  approved: boolean;
  isSuperAdmin: boolean;
  createdAt: Date | null;
  userCreatedAt?: Date | null;
  preferredCategories?: { id: string; title: string }[];
  reviewStats?: { total: number; completed: number } | null;
};

type Invitation = {
  id: string;
  email: string;
  status: string;
  invitedRole: UserRole;
  createdAt: Date;
};

export default function TeamManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'active' ? 'active' : tabParam === 'invited' ? 'invited' : 'pending');
  
  const [pendingScreeners, setPendingScreeners] = useState<PendingScreenerApplication[]>([]);
  const [activeTeamMembers, setActiveTeamMembers] = useState<TeamMember[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [actionStates, setActionStates] = useState<Record<string, { resending?: boolean; canceling?: boolean }>>({});
  
  // Separate functions for fetching each type of data
  const fetchPendingScreeners = async () => {
    try {
      const { screeners, error } = await getPendingScreeners();
      if (error) {
        toast.error(error);
      } else {
        const formattedScreeners = screeners?.map(s => ({
          id: s.id,
          userId: s.userId,
          createdAt: s.createdAt,
          user: {
            email: s.users.email,
            firstName: s.users.first_name,
            lastName: s.users.last_name,
          },
          preferredCategories: s.Category?.map(c => ({ id: c.id, title: c.title })) || [],
        })) || [];
        setPendingScreeners(formattedScreeners);
      }
    } catch (error) {
      console.error('Error fetching pending screeners:', error);
      toast.error('Failed to load pending applications');
    }
  };

  const fetchActiveTeamMembers = async () => {
    try {
      const { teamMembers, error } = await getActiveTeamMembers();
      if (error) {
        toast.error(error);
      } else {
        setActiveTeamMembers(teamMembers || []);
      }
    } catch (error) {
      console.error('Error fetching active team members:', error);
      toast.error('Failed to load active team members');
    }
  };

  const fetchInvitedUsers = async () => {
    try {
      const { invitations, error } = await getPendingInvitations();
      if (error) {
        toast.error(error);
      } else {
        setInvitedUsers(invitations?.map(inv => ({...inv, invitedRole: inv.invitedRole as UserRole })) || []);
      }
    } catch (error) {
      console.error('Error fetching invited users:', error);
      toast.error('Failed to load invited users');
    }
  };

  // Fetch all data on initial load
  const fetchAllData = async () => {
    setIsLoading(true);
    setProcessingAction(null);
    setEditingRoleId(null);
    setIsUpdatingRole(null);
    
    await Promise.all([
      fetchPendingScreeners(),
      fetchActiveTeamMembers(),
      fetchInvitedUsers()
    ]);
    
    setIsLoading(false);
  };

  // Fetch data for current tab (used after actions like approve/reject)
  const fetchCurrentTabData = async () => {
    setProcessingAction(null);
    setEditingRoleId(null);
    setIsUpdatingRole(null);
    
    try {
      if (activeTab === 'pending') {
        await fetchPendingScreeners();
      } else if (activeTab === 'active') {
        await fetchActiveTeamMembers();
      } else if (activeTab === 'invited') {
        await fetchInvitedUsers();
      }
    } catch (error) {
      console.error('Error fetching current tab data:', error);
      toast.error('Failed to refresh data');
    }
  };
  
  // Initial data load
  useEffect(() => {
    fetchAllData();
  }, []); // Only run on mount, not when activeTab changes
  
  const handleApproveScreener = async (screenerId: string) => {
    setProcessingAction(screenerId);
    const { success, error } = await approveScreener(screenerId);
    if (error) {
      toast.error(error);
    } else if (success) {
      toast.success('Screener approved successfully');
      // Refresh both pending and active data since approval moves screener between tabs
      await Promise.all([fetchPendingScreeners(), fetchActiveTeamMembers()]);
    }
    setProcessingAction(null);
  };
  
  const handleRejectScreenerApplication = async (screenerApplicationId: string) => {
    setProcessingAction(screenerApplicationId);
    const result = await rejectScreener(screenerApplicationId);
    if (result.error) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success('Screener application rejected successfully.');
      await fetchPendingScreeners(); // Only need to refresh pending
    }
    setProcessingAction(null);
  };

  const handleRemoveActiveTeamMember = async (userId: string) => {
    setProcessingAction(userId);
    const result = await removeTeamMember(userId);
    if (result.error) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success(result.message || 'Team member removed successfully.');
      await fetchActiveTeamMembers(); // Only need to refresh active
    }
    setProcessingAction(null);
  };
  
  const handleInitiateRoleChange = (userId: string, currentRole: UserRole) => {
    setEditingRoleId(userId);
    setSelectedNewRole(currentRole);
  };
  
  const handleConfirmRoleChange = async (userId: string) => {
    if (!selectedNewRole) {
      toast.error("Please select a new role.");
      return;
    }
    setIsUpdatingRole(userId);
    toast.loading("Updating user role...");
    const { success, error, message } = await updateUserRole(userId, selectedNewRole);
    toast.dismiss();
    if (success) {
      toast.success(message || "User role updated successfully.");
      await fetchActiveTeamMembers(); // Refresh active team members
    } else {
      toast.error(error || "Failed to update user role.");
      setIsUpdatingRole(null);
    }
  };
  
  const getInitials = (firstName: string | null, lastName: string | null) => {
    const firstInitial = firstName ? firstName.charAt(0) : '';
    const lastInitial = lastName ? lastName.charAt(0) : '';
    return (firstInitial + lastInitial).toUpperCase() || 'U';
  };
  
  const getRoleDisplayName = (role: UserRole) => role ? (role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()) : "N/A";

  // Roles available for changing a user to (similar to invite, but might differ slightly)
  const rolesToExcludeForAssignment: UserRole[] = [UserRole.UNVERIFIED]; // Define with correct type
  const assignableRoles = Object.values(UserRole).filter(role => 
    !rolesToExcludeForAssignment.includes(role) // Use the correctly typed array
  );
  
  const handleResendInvitation = async (invitationId: string) => {
    setActionStates(prev => ({ ...prev, [invitationId]: { ...prev[invitationId], resending: true } }));
    const result = await resendInvitation(invitationId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message);
      await fetchInvitedUsers();
    }
    setActionStates(prev => ({ ...prev, [invitationId]: { ...prev[invitationId], resending: false } }));
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setActionStates(prev => ({ ...prev, [invitationId]: { ...prev[invitationId], canceling: true } }));
    const result = await cancelInvitation(invitationId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message);
      await fetchInvitedUsers();
    }
    setActionStates(prev => ({ ...prev, [invitationId]: { ...prev[invitationId], canceling: false } }));
  };
  
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-gray-500 mt-1">Manage team member applications, roles, and invitations</p>
        </div>
        
        <Button
          variant="outline"
          onClick={() => {
            router.push('/dashboard/team/invite');
          }}
        >
          <UsersIcon className="mr-2 h-4 w-4" />
          Invite New Team Member
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={(value) => {
        router.push(`/dashboard/screeners?tab=${value}`, { scroll: false });
        setActiveTab(value);
      }}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="pending">
            Pending Applications
            {pendingScreeners.length > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white" variant="default">
                {pendingScreeners.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">
            Active Team Members
            {activeTeamMembers.length > 0 && (
              <Badge className="ml-2 bg-green-500 text-white" variant="default">
                {activeTeamMembers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invited">
            Invited Users
            {invitedUsers.length > 0 && (
              <Badge className="ml-2 bg-blue-500 text-white" variant="default">
                {invitedUsers.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pendingScreeners.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">No pending applications</h3>
              <p className="mt-1 text-gray-500">When people apply to be screeners, they'll appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingScreeners.map((screenerApp) => (
                    <TableRow key={screenerApp.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {getInitials(screenerApp.user.firstName, screenerApp.user.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {[screenerApp.user.firstName, screenerApp.user.lastName].filter(Boolean).join(' ') || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">{screenerApp.user.email}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(screenerApp.createdAt), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {screenerApp.preferredCategories.length > 0 ? (
                            screenerApp.preferredCategories.map((category) => (
                              <Badge key={category.id} variant="secondary" className="bg-gray-100 text-xs">
                                {category.title}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-amber-100 text-amber-800">
                          Pending Review
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => handleRejectScreenerApplication(screenerApp.id)}
                            disabled={processingAction === screenerApp.id}
                          >
                            {processingAction === screenerApp.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XIcon className="mr-1 h-4 w-4" />
                                Reject
                              </>
                            )}
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveScreener(screenerApp.id)}
                            disabled={processingAction === screenerApp.id}
                          >
                            {processingAction === screenerApp.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckIcon className="mr-1 h-4 w-4" />
                                Approve
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="active">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeTeamMembers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">No active team members</h3>
              <p className="mt-1 text-gray-500">Approve applications or invite new members to build your team.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTeamMembers.map((member) => {
                    const name = [member.firstName, member.lastName].filter(Boolean).join(' ') || 'N/A';
                    const screenerJoinedDate = member.role === UserRole.SCREENER && member.createdAt ? formatDistanceToNow(new Date(member.createdAt), { addSuffix: true }) : null;
                    const userJoinedDate = member.userCreatedAt ? formatDistanceToNow(new Date(member.userCreatedAt), {addSuffix: true}) : (member.createdAt ? formatDistanceToNow(new Date(member.createdAt), {addSuffix:true}) : "N/A");
                    const roleDisplayName = getRoleDisplayName(member.role);
                    
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                            </Avatar>
                            <div><p className="font-medium">{name}</p>{member.isSuperAdmin && <Badge variant="destructive" className="text-xs mt-1">Super Admin</Badge>}</div>
                          </div>
                        </TableCell>
                        <TableCell><span className="text-gray-600">{member.email}</span></TableCell>
                        <TableCell>
                          {editingRoleId === member.id ? (
                            <div className="flex items-center gap-2">
                              <Select value={selectedNewRole || member.role} onValueChange={(value: UserRole) => setSelectedNewRole(value)}>
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {assignableRoles.map(role => <SelectItem key={role} value={role} disabled={role === UserRole.ADMIN && !member.isSuperAdmin}>{getRoleDisplayName(role)}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Button size="icon" onClick={() => handleConfirmRoleChange(member.id)} disabled={isUpdatingRole === member.id || selectedNewRole === member.role} className="bg-green-500 hover:bg-green-600 text-white">{isUpdatingRole === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}</Button>
                              <Button size="icon" variant="ghost" onClick={() => setEditingRoleId(null)}><XIcon className="h-4 w-4" /></Button>
                            </div>
                          ) : (
                            <Badge variant={roleDisplayName === 'Admin' || member.isSuperAdmin ? "destructive" : "outline"} className={`${roleDisplayName === 'Screener' ? 'bg-sky-100 text-sky-800' : ''} cursor-pointer hover:opacity-80`} onClick={() => !member.isSuperAdmin && handleInitiateRoleChange(member.id, member.role)}>
                              {roleDisplayName} { !member.isSuperAdmin && <Edit3Icon className="ml-1.5 h-3 w-3 inline-block" />}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {member.role === UserRole.SCREENER ? (
                              <>
                                <div>Screener Since: {screenerJoinedDate || 'N/A'}</div>
                                {member.reviewStats && <div>Reviews: {member.reviewStats.completed}/{member.reviewStats.total}</div>}
                                {member.preferredCategories && member.preferredCategories.length > 0 && <div className="flex flex-wrap gap-1 mt-1 max-w-xs">{member.preferredCategories.map(cat => <Badge key={cat.id} variant="secondary" className="text-xs">{cat.title}</Badge>)}</div>}
                              </>
                            ) : (
                              <div>Joined: {userJoinedDate}</div>
                            )}
                            <Badge variant={!!member.approved ? "default" : "secondary"} className={`mt-1 text-xs ${!!member.approved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{member.approved ? (member.role === UserRole.SCREENER ? 'App. Screener' : 'User Active') : (member.role === UserRole.SCREENER ? 'Pending App.' : 'User Inactive')}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!(member.isSuperAdmin) && (member.role !== UserRole.ADMIN || (member.role === UserRole.ADMIN && !member.isSuperAdmin /* Allow removing non-super admins */ )) && (
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveActiveTeamMember(member.id)} disabled={processingAction === member.id || member.id === 'current_user_id_placeholder' /* Prevent self-removal */ }>{processingAction === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="invited">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : invitedUsers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
              <MailIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">No pending invitations</h3>
              <p className="mt-1 text-gray-500">Invite new team members using the button above.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Invited For Role</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitedUsers.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 bg-blue-100 text-blue-600 flex items-center justify-center">
                            <MailIcon className="h-5 w-5" />
                          </Avatar>
                          <div><p className="font-medium">{invitation.email}</p></div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-sm">
                          {getRoleDisplayName(invitation.invitedRole)}
                        </Badge>
                      </TableCell>
                      <TableCell><span className="text-sm text-gray-500">{formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}</span></TableCell>
                      <TableCell><Badge variant="outline" className="bg-blue-100 text-blue-800">Invited</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleResendInvitation(invitation.id)}
                            disabled={actionStates[invitation.id]?.resending || actionStates[invitation.id]?.canceling}
                          >
                            {actionStates[invitation.id]?.resending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend"}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-600" 
                            onClick={() => handleCancelInvitation(invitation.id)}
                            disabled={actionStates[invitation.id]?.resending || actionStates[invitation.id]?.canceling}
                          >
                             {actionStates[invitation.id]?.canceling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
