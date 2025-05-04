import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMessaging } from '@/hooks/useMessaging';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

// Form schema for direct message
const directMessageSchema = z.object({
  userId: z.string().min(1, 'Please select a user'),
});

// Form schema for group conversation
const groupConversationSchema = z.object({
  title: z.string().min(1, 'Group name is required'),
  userIds: z.array(z.string()).min(1, 'Select at least one participant'),
});

// Form schema for announcement
const announcementSchema = z.object({
  title: z.string().min(1, 'Announcement title is required'),
  organizationId: z.string().min(1, 'Organization is required'),
  userIds: z.array(z.string()).min(1, 'Select at least one recipient'),
});

type User = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  email: string;
};

type Organization = {
  id: string;
  name: string;
};

export const NewConversationModal = ({ onSuccess }: { onSuccess: (conversationId: string) => void }) => {
  const [activeTab, setActiveTab] = useState('direct');
  const { user, userRole } = useAuth();
  const { 
    createDirectConversationMutation,
    createGroupConversationMutation,
    createAnnouncementConversationMutation,
    isCreatingDirectConversation,
    isCreatingGroupConversation,
    isCreatingAnnouncementConversation
  } = useMessaging();

  // Form for direct message
  const directForm = useForm<z.infer<typeof directMessageSchema>>({
    resolver: zodResolver(directMessageSchema),
    defaultValues: {
      userId: '',
    },
  });

  // Form for group message
  const groupForm = useForm<z.infer<typeof groupConversationSchema>>({
    resolver: zodResolver(groupConversationSchema),
    defaultValues: {
      title: '',
      userIds: [],
    },
  });

  // Form for announcement
  const announcementForm = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      organizationId: '',
      userIds: [],
    },
  });

  // Query users
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, avatar_url')
        .neq('id', user?.id || '');

      if (error) throw error;
      return data as User[];
    },
  });

  // Query organizations (for organization admins and above)
  const { data: organizations, isLoading: isLoadingOrganizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name');

      if (error) throw error;
      return data as Organization[];
    },
    enabled: userRole === 'organization' || userRole === 'regional' || userRole === 'superadmin',
  });

  // Handle direct message creation
  const handleDirectSubmit = directForm.handleSubmit(async (data) => {
    try {
      const conversationId = await createDirectConversationMutation.mutate(data.userId, {
        onSuccess: (id) => {
          if (id) {
            onSuccess(id);
          }
        }
      });
    } catch (error) {
      console.error('Failed to create direct conversation:', error);
    }
  });

  // Handle group conversation creation
  const handleGroupSubmit = groupForm.handleSubmit(async (data) => {
    try {
      createGroupConversationMutation.mutate({
        title: data.title,
        participantIds: data.userIds,
      }, {
        onSuccess: (id) => {
          if (id) {
            onSuccess(id);
          }
        }
      });
    } catch (error) {
      console.error('Failed to create group conversation:', error);
    }
  });

  // Handle announcement creation
  const handleAnnouncementSubmit = announcementForm.handleSubmit(async (data) => {
    try {
      createAnnouncementConversationMutation.mutate({
        title: data.title,
        organizationId: data.organizationId,
        participantIds: data.userIds,
      }, {
        onSuccess: (id) => {
          if (id) {
            onSuccess(id);
          }
        }
      });
    } catch (error) {
      console.error('Failed to create announcement conversation:', error);
    }
  });

  return (
    <Tabs defaultValue="direct" value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="direct">Direct</TabsTrigger>
        <TabsTrigger value="group">Group</TabsTrigger>
        {(userRole === 'organization' || userRole === 'regional' || userRole === 'superadmin') && (
          <TabsTrigger value="announcement">Announcement</TabsTrigger>
        )}
      </TabsList>

      {/* Direct Message Tab */}
      <TabsContent value="direct">
        <Form {...directForm}>
          <form onSubmit={handleDirectSubmit} className="space-y-4 pt-4">
            <FormField
              control={directForm.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select User</FormLabel>
                  <FormControl>
                    <ScrollArea className="h-[200px] rounded-md border p-4">
                      {isLoadingUsers ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {users?.map((user) => (
                            <div
                              key={user.id}
                              className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer ${
                                field.value === user.id ? 'bg-muted' : 'hover:bg-muted/50'
                              }`}
                              onClick={() => field.onChange(user.id)}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>
                                  {user.first_name?.[0]}
                                  {user.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {user.first_name} {user.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {user.email}
                                </p>
                              </div>
                              <div className="flex h-4 w-4 items-center justify-center">
                                <div
                                  className={`h-4 w-4 rounded-full ${
                                    field.value === user.id ? 'bg-primary' : 'border border-primary'
                                  }`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isCreatingDirectConversation}
            >
              {isCreatingDirectConversation && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Start Conversation
            </Button>
          </form>
        </Form>
      </TabsContent>

      {/* Group Chat Tab */}
      <TabsContent value="group">
        <Form {...groupForm}>
          <form onSubmit={handleGroupSubmit} className="space-y-4 pt-4">
            <FormField
              control={groupForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter group name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={groupForm.control}
              name="userIds"
              render={() => (
                <FormItem>
                  <FormLabel>Select Participants</FormLabel>
                  <FormControl>
                    <ScrollArea className="h-[200px] rounded-md border p-4">
                      {isLoadingUsers ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {users?.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50"
                            >
                              <Checkbox
                                id={`user-${user.id}`}
                                checked={groupForm.watch('userIds').includes(user.id)}
                                onCheckedChange={(checked) => {
                                  const currentIds = groupForm.getValues('userIds');
                                  if (checked) {
                                    groupForm.setValue('userIds', [...currentIds, user.id]);
                                  } else {
                                    groupForm.setValue(
                                      'userIds',
                                      currentIds.filter((id) => id !== user.id)
                                    );
                                  }
                                }}
                              />
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>
                                  {user.first_name?.[0]}
                                  {user.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <label
                                  htmlFor={`user-${user.id}`}
                                  className="text-sm font-medium truncate cursor-pointer"
                                >
                                  {user.first_name} {user.last_name}
                                </label>
                                <p className="text-xs text-muted-foreground truncate">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isCreatingGroupConversation}
            >
              {isCreatingGroupConversation && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Group
            </Button>
          </form>
        </Form>
      </TabsContent>

      {/* Announcement Tab */}
      {(userRole === 'organization' || userRole === 'regional' || userRole === 'superadmin') && (
        <TabsContent value="announcement">
          <Form {...announcementForm}>
            <form onSubmit={handleAnnouncementSubmit} className="space-y-4 pt-4">
              <FormField
                control={announcementForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Announcement Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter announcement title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={announcementForm.control}
                name="organizationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="">Select an organization</option>
                        {organizations?.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={announcementForm.control}
                name="userIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Select Recipients</FormLabel>
                    <FormControl>
                      <ScrollArea className="h-[200px] rounded-md border p-4">
                        {isLoadingUsers ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {users?.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50"
                              >
                                <Checkbox
                                  id={`announcement-user-${user.id}`}
                                  checked={announcementForm.watch('userIds').includes(user.id)}
                                  onCheckedChange={(checked) => {
                                    const currentIds = announcementForm.getValues('userIds');
                                    if (checked) {
                                      announcementForm.setValue('userIds', [...currentIds, user.id]);
                                    } else {
                                      announcementForm.setValue(
                                        'userIds',
                                        currentIds.filter((id) => id !== user.id)
                                      );
                                    }
                                  }}
                                />
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.avatar_url} />
                                  <AvatarFallback>
                                    {user.first_name?.[0]}
                                    {user.last_name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <label
                                    htmlFor={`announcement-user-${user.id}`}
                                    className="text-sm font-medium truncate cursor-pointer"
                                  >
                                    {user.first_name} {user.last_name}
                                  </label>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isCreatingAnnouncementConversation}
              >
                {isCreatingAnnouncementConversation && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Announcement
              </Button>
            </form>
          </Form>
        </TabsContent>
      )}
    </Tabs>
  );
};
