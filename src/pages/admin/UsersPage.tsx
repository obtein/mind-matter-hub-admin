import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, RefreshCw, ShieldCheck, ShieldOff, KeyRound } from 'lucide-react';

interface UserRecord {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch users by joining profiles/device_heartbeats with admin_users
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['admin_user_list'],
    queryFn: async () => {
      // Get all unique users from device_heartbeats
      const { data: heartbeats, error: hbError } = await supabase
        .from('device_heartbeats')
        .select('user_id, user_email, created_at')
        .order('created_at', { ascending: false });
      if (hbError) throw hbError;

      // Get admin users
      const { data: admins, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id');
      if (adminError) throw adminError;

      const adminSet = new Set(admins?.map(a => a.user_id) || []);

      // Deduplicate by user_id
      const seenIds = new Set<string>();
      const userList: UserRecord[] = [];
      for (const hb of heartbeats || []) {
        if (!seenIds.has(hb.user_id)) {
          seenIds.add(hb.user_id);
          userList.push({
            id: hb.user_id,
            email: hb.user_email || hb.user_id,
            created_at: hb.created_at || '',
            last_sign_in_at: null,
            is_admin: adminSet.has(hb.user_id),
          });
        }
      }

      return userList;
    },
  });

  const createUser = useMutation({
    mutationFn: async () => {
      // Use Supabase Auth admin invite or signUp
      const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('User created successfully');
      setNewEmail('');
      setNewPassword('');
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ['admin_user_list'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create user');
    },
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase
          .from('admin_users')
          .insert({ user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_users')
          .delete()
          .eq('user_id', userId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Admin status updated');
      queryClient.invalidateQueries({ queryKey: ['admin_user_list'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update admin status');
    },
  });

  const resetPassword = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Password reset email sent');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send reset email');
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Users</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            <UserPlus size={14} />
            New User
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Create user form */}
      {showCreateForm && (
        <div className="mb-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-sm font-medium text-white mb-3">Create New User</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="px-3 py-1.5 text-sm rounded bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="px-3 py-1.5 text-sm rounded bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => createUser.mutate()}
              disabled={createUser.isPending || !newEmail || !newPassword}
              className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded transition-colors"
            >
              {createUser.isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-1.5 text-sm bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-slate-400">Loading users...</p>
      ) : !users?.length ? (
        <p className="text-slate-400">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-white">{user.email}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">{user.id.slice(0, 12)}...</td>
                  <td className="px-4 py-3">
                    {user.is_admin ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-900/50 text-green-400">
                        Admin
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-400">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleAdmin.mutate({ userId: user.id, makeAdmin: !user.is_admin })}
                        title={user.is_admin ? 'Remove admin' : 'Make admin'}
                        className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      >
                        {user.is_admin ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                      </button>
                      <button
                        onClick={() => resetPassword.mutate(user.email)}
                        title="Send password reset"
                        className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      >
                        <KeyRound size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
