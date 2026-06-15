import React, { useState } from 'react';
import { ShieldAlert, Search, Calendar, Filter, Trash2 } from 'lucide-react';
import { AuditLog } from '../types';

interface ActionLogsProps {
  logs: AuditLog[];
  onClearLogs?: () => void;
}

export const ActionLogs: React.FC<ActionLogsProps> = ({ logs, onClearLogs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || log.userRole === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans" id="audit-logs-section">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" /> Nhật Ký Hoạt Động
          </h3>
          <p className="text-xs text-slate-500 mt-1">Lưu trữ lịch sử hệ thống.</p>
        </div>

        {onClearLogs && logs.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Xóa toàn bộ nhật ký?')) {
                onClearLogs();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Xóa nhật ký
          </button>
        )}
      </div>

      {/* FILTER SEARCH AREA */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm hành động, nhân sự..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          />
        </div>
        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full text-slate-700 font-medium py-1.5 px-3 border border-slate-200 rounded-lg text-xs bg-white"
          >
            <option value="all">👨‍💼 Lọc theo bộ phận</option>
            <option value="admin">Admin</option>
            <option value="hoc_vu">Học Vụ</option>
            <option value="sales">Sales</option>
          </select>
        </div>
      </div>

      {/* RENDER TABLE LOGS */}
      {filteredLogs.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs">
          Không tìm thấy dòng ghi chép hoạt động nào tương ứng.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[10px] text-slate-400 font-bold">
              <tr>
                <th className="px-4 py-3 font-semibold">Khung giờ</th>
                <th className="px-4 py-3 font-semibold">Nhân Sự</th>
                <th className="px-4 py-3 font-semibold">Vai Trò</th>
                <th className="px-4 py-3 font-semibold">Hoạt động hành vi</th>
                <th className="px-4 py-3 font-semibold">Mô tả chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {[...filteredLogs].reverse().map((log) => {
                const roleColors = {
                  admin: 'bg-indigo-50 border border-indigo-200 text-indigo-700',
                  hoc_vu: 'bg-blue-50 border border-blue-200 text-blue-700',
                  sales: 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                };
                
                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {log.userName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${roleColors[log.userRole] || 'bg-slate-100'}`}>
                        {log.userRole.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-indigo-950">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-normal">
                      {log.details}
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
};
