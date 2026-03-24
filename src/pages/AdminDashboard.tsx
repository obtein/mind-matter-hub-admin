import { Routes, Route, Navigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import DevicesPage from '@/pages/admin/DevicesPage';
import LogsPage from '@/pages/admin/LogsPage';
import CommandsPage from '@/pages/admin/CommandsPage';
import UsersPage from '@/pages/admin/UsersPage';

export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen bg-slate-900">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/devices" replace />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/commands" element={<CommandsPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Routes>
      </main>
    </div>
  );
}
