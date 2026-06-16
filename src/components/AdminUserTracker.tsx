import React, { useState } from 'react';
import { User, Class, ClassRequest, AuditLog } from '../types';
import { 
  Shield, Mail, Calendar, Sparkles, BookOpen, FileText, Activity, ArrowRight, Search, Filter
} from 'lucide-react';

interface AdminUserTrackerProps {
  users: User[];
  classes: Class[];
  requests: ClassRequest[];
  auditLogs: AuditLog[];
  onSelectUser: (user: User) => void;
}

export const AdminUserTracker: React.FC<AdminUserTrackerProps> = ({
  users,
  classes,
  requests,
  auditLogs,
  onSelectUser
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Calculate metrics for each user
  const getUserMetrics = (user: User) => {
    // Classes assigned (matching name or ID)
    const userClassesCount = classes.filter(c => c.teacher.trim().toLowerCase() === user.name.trim().toLowerCase()).length;
    // Submitted requests (by user id)
    const userRequestsCount = requests.filter(r => r.submittedBy === user.id).length;
    // Audit logs generated
    const userLogsCount = auditLogs.filter(log => log.userId === user.id).length;

    return {
      classesCount: userClassesCount,
      requestsCount: userRequestsCount,
      logsCount: userLogsCount
    };
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold rounded-lg border bg-indigo-50 border-indigo-200 text-indigo-700">
            <Shield className="w-3.5 h-3.5" /> Quản trị
          </span>
        );
      case 'hoc_vu':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold rounded-lg border bg-teal-50 border-teal-200 text-teal-700">
            <BookOpen className="w-3.5 h-3.5" /> Học vụ
          </span>
        );
      case 'sales':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-700">
            <Sparkles className="w-3.5 h-3.5" /> Sales
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-600 opacity-20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-teal-500 opacity-10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-red-600 to-orange-500 text-white font-extrabold rounded-full text-[10px] uppercase tracking-widest leading-none shadow-md">
              👑 Trưởng Ban Quản Trị Hệ Thống
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Bảng Cấu Hình Admin Quốc Tế
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-xl font-medium">
              Chào mừng bạn đến với trung tâm giám sát hoạt động. Tại đây bạn có thể kiểm thử, theo dõi số liệu và truy cập trực tiếp dashboard của bất kỳ thành viên nào.
            </p>
          </div>

          <div className="bg-slate-800 bg-opacity-40 backdrop-blur-md border border-slate-700 rounded-2xl p-5 shrink-0 flex flex-col gap-1 justify-center shadow-lg">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Trạng thái Cơ sở dữ liệu:</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse shadow-md shadow-emerald-500/50" />
              <span className="text-sm font-bold text-slate-200">Đồng bộ trực tiếp Cloud DB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Database Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-indigo-50 text-indigo-700 rounded-xl animate-fade-in">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tổng Nhân Sự</span>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{users.length}</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-teal-50 text-teal-700 rounded-xl animate-fade-in">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Lớp Học Vận Hành</span>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{classes.length}</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-emerald-50 text-emerald-700 rounded-xl animate-fade-in">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Yêu Cầu Mở Lớp</span>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{requests.length}</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-amber-50 text-amber-700 rounded-xl animate-fade-in">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Sự Kiện Nhật Ký</span>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{auditLogs.length}</h3>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm thành viên theo họ tên, email đăng nhập..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-55 focus:bg-white focus:outline-none transition-all font-medium text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-600 uppercase">Bộ lọc vai trò:</span>
            <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${roleFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setRoleFilter('admin')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${roleFilter === 'admin' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Admin
              </button>
              <button
                onClick={() => setRoleFilter('hoc_vu')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${roleFilter === 'hoc_vu' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Học vụ
              </button>
              <button
                onClick={() => setRoleFilter('sales')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${roleFilter === 'sales' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Sales
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Directory Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="applet-admin-user-tracker-container">
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center bg-gradient-to-r from-slate-50 to-slate-100">
          <h3 className="font-extrabold text-slate-800 text-md flex items-center gap-2">
            📋 Danh Sách Hội Viên Đối Soát ({filteredUsers.length} tài khoản)
          </h3>
          <span className="text-xs font-bold text-indigo-600 uppercase font-mono tracking-wider">Bảo mật đa tầng active</span>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            🔍 Không tìm thấy thành viên Sáng Tạo Xanh phù hợp với tìm kiếm.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUsers.map((u) => {
              const metrics = getUserMetrics(u);
              const creationTime = u.createdAt 
                ? new Date(u.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
                : 'Đầu năm 2026';

              return (
                <div 
                  key={u.id} 
                  className="p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 hover:bg-slate-50/50 transition-all"
                  id={`admin-user-row-${u.id}`}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center font-extrabold text-indigo-700 text-md">
                        {u.name.split(' ').pop()?.substring(0, 2) || 'TV'}
                      </div>
                      <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${u.isActive ? 'bg-emerald-500 shadow-inner' : 'bg-slate-300'}`} />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-extrabold text-slate-800 text-base leading-none">{u.name}</h4>
                        {getRoleBadge(u.role)}
                        {u.id === '040SrB7DPsQr7IHKF4VjGfQUqfz1' && (
                          <span className="text-[9px] font-extrabold bg-indigo-600 text-white rounded px-2 py-0.5 uppercase tracking-wide">
                            ADMIN MỤC TIÊU
                          </span>
                        )}
                        {!u.isActive && (
                          <span className="text-[10px] font-extrabold bg-slate-400 text-white rounded px-1.5 py-0.5 uppercase">
                            Khóa
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-mono">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {u.email}
                        </span>
                        <span className="hidden sm:inline text-slate-300">•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Ngày tạo: {creationTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Indicators */}
                  <div className="grid grid-cols-3 gap-3 min-w-[280px] md:min-w-[340px]">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                      <div className="text-lg font-extrabold text-slate-800 leading-none">{metrics.classesCount}</div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">Lớp học</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                      <div className="text-lg font-extrabold text-slate-800 leading-none">{metrics.requestsCount}</div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">Đề đạt lớp</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                      <div className="text-lg font-extrabold text-slate-800 leading-none">{metrics.logsCount}</div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">Sự kiện Log</span>
                    </div>
                  </div>

                  {/* Impersonation action */}
                  <div className="flex items-center justify-end shrink-0 border-t lg:border-t-0 border-slate-100 pt-4 lg:pt-0">
                    <button
                      onClick={() => onSelectUser(u)}
                      className="w-full lg:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                      id={`impersonate-btn-${u.id}`}
                    >
                      <span>Xem Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5 font-bold" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
