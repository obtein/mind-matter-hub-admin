import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw } from 'lucide-react';

interface DeviceHeartbeat {
  id: string;
  user_id: string;
  user_email: string | null;
  app_version: string | null;
  platform: string | null;
  os_info: string | null;
  last_seen_at: string;
}

function isOnline(lastSeen: string): boolean {
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 5 * 60 * 1000; // 5 minutes
}

export default function DevicesPage() {
  const { data: devices, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['device_heartbeats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_heartbeats')
        .select('*')
        .order('last_seen_at', { ascending: false });
      if (error) throw error;
      return data as DeviceHeartbeat[];
    },
    refetchInterval: 30000,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Cihazlar</h1>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
        >
          <RefreshCw size={14} />
          Yenile
        </button>
      </div>
      {dataUpdatedAt > 0 && (
        <p className="text-xs text-slate-500 mb-3">
          Son güncelleme: {new Date(dataUpdatedAt).toLocaleTimeString()}
        </p>
      )}
      {isLoading ? (
        <p className="text-slate-400">Cihazlar yükleniyor...</p>
      ) : !devices?.length ? (
        <p className="text-slate-400">Cihaz bulunamadı.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Kullanıcı E-posta</th>
                <th className="px-4 py-3">Uygulama Sürümü</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">İşletim Sistemi</th>
                <th className="px-4 py-3">Son Görülme</th>
                <th className="px-4 py-3">Durum</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(device => {
                const online = isOnline(device.last_seen_at);
                return (
                  <tr key={device.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-white">{device.user_email || device.user_id}</td>
                    <td className="px-4 py-3 text-slate-300">{device.app_version || '-'}</td>
                    <td className="px-4 py-3 text-slate-300">{device.platform || '-'}</td>
                    <td className="px-4 py-3 text-slate-300">{device.os_info || '-'}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          online
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-red-900/50 text-red-400'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`} />
                        {online ? 'Çevrimiçi' : 'Çevrimdışı'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
