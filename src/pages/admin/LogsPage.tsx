import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface AppLog {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  level: string;
  message: string;
  context: any;
  app_version: string | null;
}

export default function LogsPage() {
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [emailFilter, setEmailFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['app_logs', levelFilter, emailFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('app_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (levelFilter !== 'all') {
        query = query.eq('level', levelFilter);
      }
      if (emailFilter.trim()) {
        query = query.ilike('user_email', `%${emailFilter.trim()}%`);
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00');
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AppLog[];
    },
    refetchInterval: 30000,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Uygulama Logları</h1>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
        >
          <RefreshCw size={14} />
          Yenile
        </button>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={levelFilter}
          onChange={e => setLevelFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded bg-slate-700 text-white border border-slate-600"
        >
          <option value="all">Tüm Seviyeler</option>
          <option value="error">Hata</option>
          <option value="warn">Uyarı</option>
          <option value="info">Bilgi</option>
        </select>
        <input
          type="text"
          placeholder="E-posta ile filtrele..."
          value={emailFilter}
          onChange={e => setEmailFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-blue-500"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="px-3 py-1.5 text-sm rounded bg-slate-700 text-white border border-slate-600"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="px-3 py-1.5 text-sm rounded bg-slate-700 text-white border border-slate-600"
        />
      </div>

      {isLoading ? (
        <p className="text-slate-400">Loglar yükleniyor...</p>
      ) : !logs?.length ? (
        <p className="text-slate-400">Log bulunamadı.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Kullanıcı</th>
                <th className="px-4 py-3">Seviye</th>
                <th className="px-4 py-3">Mesaj</th>
                <th className="px-4 py-3">Bağlam</th>
                <th className="px-4 py-3">Sürüm</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <>
                  <tr
                    key={log.id}
                    className="border-b border-slate-700 hover:bg-slate-800/50 cursor-pointer"
                    onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{log.user_email || log.user_id || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          log.level === 'error'
                            ? 'bg-red-900/50 text-red-400'
                            : log.level === 'warn'
                            ? 'bg-yellow-900/50 text-yellow-400'
                            : 'bg-blue-900/50 text-blue-400'
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white max-w-md truncate">{log.message}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                      {log.context ? JSON.stringify(log.context).slice(0, 60) + '...' : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{log.app_version || '-'}</td>
                  </tr>
                  {expandedLogId === log.id && log.context && (
                    <tr key={`${log.id}-expanded`} className="border-b border-slate-700 bg-slate-800/80">
                      <td colSpan={6} className="px-4 py-3">
                        <pre className="text-xs text-slate-300 whitespace-pre-wrap overflow-x-auto bg-slate-900 p-3 rounded max-h-64 overflow-y-auto">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
