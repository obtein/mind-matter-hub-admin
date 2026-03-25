import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, RefreshCw, RotateCcw, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface AdminCommand {
  id: string;
  created_at: string;
  command_type: string;
  payload: any;
  target_user_id: string | null;
  status: string;
}

export default function CommandsPage() {
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const [targetEmail, setTargetEmail] = useState('');

  const { data: commands, isLoading } = useQuery({
    queryKey: ['admin_commands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_commands')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AdminCommand[];
    },
    refetchInterval: 15000,
  });

  const ALLOWED_COMMANDS = ['force_update', 'show_message', 'restart'] as const;

  const sendCommand = useMutation({
    mutationFn: async (params: { command_type: string; payload?: any; target_user_id?: string | null }) => {
      if (!ALLOWED_COMMANDS.includes(params.command_type as any)) {
        throw new Error(`Invalid command type: ${params.command_type}`);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Resolve target user ID from email if provided
      let resolvedTargetId: string | null = null;
      if (targetEmail.trim()) {
        const { data: targetUsers, error: lookupError } = await supabase
          .from('device_heartbeats')
          .select('user_id')
          .ilike('user_email', targetEmail.trim())
          .limit(1);
        if (lookupError) throw lookupError;
        if (targetUsers && targetUsers.length > 0) {
          resolvedTargetId = targetUsers[0].user_id;
        }
      }

      const { error } = await supabase.from('admin_commands').insert({
        command_type: params.command_type,
        payload: params.payload || null,
        target_user_id: resolvedTargetId,
        status: 'pending',
        issued_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Command sent');
      queryClient.invalidateQueries({ queryKey: ['admin_commands'] });
      setMessageText('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send command');
    },
  });

  const handleForceUpdate = () => {
    sendCommand.mutate({ command_type: 'force_update' });
  };

  const handleRestartAll = () => {
    sendCommand.mutate({ command_type: 'restart' });
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) {
      toast.error('Please enter a message');
      return;
    }
    sendCommand.mutate({
      command_type: 'send_message',
      payload: { message: messageText.trim() },
    });
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Commands</h1>

      {/* Target filter */}
      <div className="mb-4">
        <label className="block text-slate-400 text-xs mb-1">Target user email (empty = all)</label>
        <input
          type="text"
          placeholder="user@example.com or leave empty for all"
          value={targetEmail}
          onChange={e => setTargetEmail(e.target.value)}
          className="px-3 py-1.5 text-sm rounded bg-slate-700 text-white border border-slate-600 w-80 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleForceUpdate}
          disabled={sendCommand.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded text-sm font-medium transition-colors"
        >
          <RefreshCw size={16} />
          Force Update All
        </button>
        <button
          onClick={handleRestartAll}
          disabled={sendCommand.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white rounded text-sm font-medium transition-colors"
        >
          <RotateCcw size={16} />
          Restart All
        </button>
      </div>

      {/* Send message */}
      <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
        <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
          <MessageSquare size={16} />
          Send Message
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-blue-500"
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={sendCommand.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded text-sm font-medium transition-colors"
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </div>

      {/* Command history */}
      <h2 className="text-lg font-semibold text-white mb-3">Command History</h2>
      {isLoading ? (
        <p className="text-slate-400">Loading...</p>
      ) : !commands?.length ? (
        <p className="text-slate-400">No commands sent yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Payload</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {commands.map(cmd => (
                <tr key={cmd.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                    {format(new Date(cmd.created_at), 'yyyy-MM-dd HH:mm:ss')}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{cmd.command_type}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                    {cmd.payload ? JSON.stringify(cmd.payload) : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {cmd.target_user_id || 'All'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        cmd.status === 'pending'
                          ? 'bg-yellow-900/50 text-yellow-400'
                          : cmd.status === 'completed'
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {cmd.status}
                    </span>
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
