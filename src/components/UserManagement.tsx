import React, { useState } from 'react';
import { 
  Users, UserPlus, Shield, UserX, UserCheck, Key, Mail, Tag, ChevronRight, CheckCircle2, Trash2 
} from 'lucide-react';
import { User, UserRole } from '../types';

interface UserManagementProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onDeleteUser: (userId: string) => void;
  currentUser: User;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  currentUser
}) => {
  // New user registration forms
  const [isRegistering, setIsRegistering] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('sales');
  const [newPassword, setNewPassword] = useState('password123');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      alert('Email này đã tồn tại trong hệ thống!');
      return;
    }

    if (newRole === 'admin' && currentUser.email !== 'longsx110@gmail.com') {
      alert('🔒 Chỉ Admin (longsx110@gmail.com) mới có quyền tạo tài khoản Admin!');
      return;
    }

    onAddUser({
      name: newName,
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      password: newPassword,
      isActive: true
    });

    // Reset Form
    setNewName('');
    setNewEmail('');
    setNewRole('sales');
    setNewPassword('password123');
    setIsRegistering(false);
  };

  const toggleUserActive = (user: User) => {
    if (user.id === currentUser.id) {
      alert('Bạn không thể tự khóa tài khoản của chính mình!');
      return;
    }

    if (user.role === 'admin' && currentUser.email !== 'longsx110@gmail.com') {
      alert('🔒 Chỉ Admin (longsx110@gmail.com) mới có quyền khóa/mở khóa tài khoản Admin!');
      return;
    }

    onUpdateUser(user.id, { isActive: !user.isActive });
  };

  const changeUserRole = (userId: string, role: UserRole) => {
    if (userId === currentUser.id) {
      alert('Bạn không thể tự thay đổi vai trò của chính mình!');
      return;
    }

    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    if (targetUser.role === 'admin' && currentUser.email !== 'longsx110@gmail.com') {
      alert('🔒 Chỉ Admin (longsx110@gmail.com) mới có quyền thay đổi vai trò Admin!');
      return;
    }

    if (role === 'admin' && currentUser.email !== 'longsx110@gmail.com') {
      alert('🔒 Bạn không có quyền cấp quyền Admin!');
      return;
    }

    onUpdateUser(userId, { role });
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser.id) {
      alert('Bạn không thể tự xóa tài khoản của chính mình!');
      return;
    }

    if (user.role === 'admin' && currentUser.email !== 'longsx110@gmail.com') {
      alert('🔒 Chỉ Admin (longsx110@gmail.com) mới có quyền xóa tài khoản Admin!');
      return;
    }

    if (window.confirm(`Xóa vĩnh viễn tài khoản của ${user.name} (${user.email})?`)) {
      onDeleteUser(user.id);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            👨‍👩‍👧‍👦 Hệ Thống Phân Quyền Thành Viên (Admin)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Chỉ định vai trò và trạng thái hoạt động cho Nhân viên, Học Vụ và Đội Ngũ Kinh Doanh.
          </p>
        </div>

        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors shadow"
          id="btn-register-user-trigger"
        >
          <UserPlus className="w-4 h-4" /> {isRegistering ? 'Đóng form thêm mới' : 'Đăng ký Tài khoản mới'}
        </button>
      </div>

      {/* NEW USER REGISTER FORM CONTAINER */}
      {isRegistering && (
        <div className="bg-white rounded-xl border border-slate-200 shadow p-6 animate-fade-in" id="register-user-form">
          <h3 className="font-bold text-slate-800 text-md mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
            📝 Đăng Ký Hội Viên Sáng Tạo Xanh
          </h3>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600 uppercase">Họ và Tên thành viên *</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Nguyễn Văn A"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none"
                id="reg-user-name"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600 uppercase">Email Đăng Nhập *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="văn_a@sangtaoxanh.edu.vn"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none"
                  id="reg-user-email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase">Vai Trò Hệ Thống</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm bg-white font-semibold text-slate-700"
                  id="reg-user-role"
                >
                  {currentUser.email === 'longsx110@gmail.com' && (
                    <option value="admin">Quản trị viên</option>
                  )}
                  <option value="hoc_vu">Học Vụ (Academic)</option>
                  <option value="sales">Kinh Doanh (Sales)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase">Mật Khẩu *</label>
                <div className="relative">
                  <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-7 pr-2 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                    id="reg-user-password"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors shadow"
              id="btn-register-user-confirm"
            >
              🚀 Nhấp Đăng Ký Ngay
            </button>
          </form>
        </div>
      )}

      {/* USER DIRECTORY LIST */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="users-directory-list">
        <div className="p-5 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800 text-md flex items-center gap-2">
            📂 Danh Sách Tài Khoản Nhân Viên Sáng Tạo Xanh ({users.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {users.map((u) => {
            const isMe = u.id === currentUser.id;
            const roleLabels = {
              admin: { label: 'Admin (Quản trị)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
              hoc_vu: { label: 'Học vụ (Academic Staff)', color: 'bg-teal-50 text-teal-700 border-teal-200' },
              sales: { label: 'Kinh doanh (Sales Team)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
            };

            const roleCfg = roleLabels[u.role] || { label: u.role, color: 'bg-slate-50 text-slate-500' };

            return (
              <div 
                key={u.id} 
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                id={`user-item-${u.id}`}
              >
                {/* Info block */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${u.isActive ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-slate-100 text-slate-400 line-through'}`}>
                    {u.name.split(' ').pop()?.substring(0, 2) || 'TV'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${u.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                        {u.name}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase shrink-0">
                          Bạn (Tôi)
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {u.email}
                    </span>
                  </div>
                </div>

                {/* Role and Action block */}
                <div className="flex flex-wrap items-center gap-3.5 w-full sm:w-auto justify-end">
                  {/* Select Role */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400 font-medium">Vai trò:</span>
                    {isMe ? (
                      <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${roleCfg.color}`}>
                        {roleCfg.label}
                      </span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => changeUserRole(u.id, e.target.value as UserRole)}
                        disabled={!u.isActive || (u.role === 'admin' && currentUser.email !== 'longsx110@gmail.com')}
                        className="py-1 px-2 border border-slate-200 rounded font-semibold text-xs text-slate-700 bg-white"
                      >
                        {(u.role === 'admin' || currentUser.email === 'longsx110@gmail.com') && (
                          <option value="admin">Quản trị viên</option>
                        )}
                        <option value="hoc_vu">Học Vụ</option>
                        <option value="sales">Kinh Doanh</option>
                      </select>
                    )}
                  </div>

                  {/* Active Toggle Button */}
                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <button
                      onClick={() => toggleUserActive(u)}
                      disabled={isMe || (u.role === 'admin' && currentUser.email !== 'longsx110@gmail.com')}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        isMe || (u.role === 'admin' && currentUser.email !== 'longsx110@gmail.com')
                          ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-50'
                          : u.isActive
                          ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      }`}
                      id={`btn-toggle-active-${u.id}`}
                    >
                      {u.isActive ? (
                        <>
                          <UserX className="w-3.5 h-3.5" /> Khóa tài khoản
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" /> Kích hoạt lại
                        </>
                      )}
                    </button>
                  </div>

                  {/* Delete Button */}
                  <div className="flex items-center border-l border-slate-200 pl-3">
                    <button
                      onClick={() => handleDeleteUser(u)}
                      disabled={isMe || (u.role === 'admin' && currentUser.email !== 'longsx110@gmail.com')}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        isMe || (u.role === 'admin' && currentUser.email !== 'longsx110@gmail.com')
                          ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-50'
                          : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                      }`}
                      id={`btn-delete-${u.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa vĩnh viễn
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
