import React, { useState } from 'react';
import { 
  Check, X, AlertTriangle, MessageSquare, Clock, ArrowUpRight, 
  MapPin, Calendar, Users, Briefcase, ChevronDown, CheckCircle
} from 'lucide-react';
import { ClassRequest, User, Class } from '../types';

interface RequestManagerProps {
  currentUser: User;
  requests: ClassRequest[];
  onApproveRequest: (requestId: string, classDetails: Omit<Class, 'id' | 'enrolledCount' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  onRejectRequest: (requestId: string, reason: string) => void;
}

export const RequestManager: React.FC<RequestManagerProps> = ({
  currentUser,
  requests,
  onApproveRequest,
  onRejectRequest
}) => {
  // Pending and handled lists
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const handledRequests = requests.filter(r => r.status !== 'pending');

  // Interactive local states for approving/rejecting
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);

  // Approve Form fields
  const [assignClassName, setAssignClassName] = useState('');
  const [assignTeacher, setAssignTeacher] = useState('');
  const [assignRoom, setAssignRoom] = useState('');
  const [assignCapacity, setAssignCapacity] = useState(15);
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignSchedule, setAssignSchedule] = useState('');

  // Reject reason field
  const [rejectionReason, setRejectionReason] = useState('');

  // Prepare approve form defaults based on request
  const startApproving = (req: ClassRequest) => {
    setApprovingRequestId(req.id);
    setRejectingRequestId(null);
    setAssignClassName(`${req.requestedLevel} - GV: TBD`);
    setAssignTeacher('TBD');
    setAssignRoom('Phòng học trực tuyến');
    setAssignCapacity(12);
    setAssignStartDate(req.expectedStartDate);
    setAssignSchedule(req.preferredSchedule);
  };

  const handleApproveSubmit = (e: React.FormEvent, reqId: string) => {
    e.preventDefault();
    if (!assignClassName.trim() || !assignTeacher.trim()) {
      alert('Vui lòng nhập đầy đủ Tên lớp và Giáo viên phân bổ!');
      return;
    }

    onApproveRequest(reqId, {
      name: assignClassName,
      level: requests.find(r => r.id === reqId)?.requestedLevel || 'A1',
      teacher: assignTeacher,
      schedule: assignSchedule,
      startDate: assignStartDate,
      room: assignRoom,
      maxCapacity: Number(assignCapacity),
      notes: `Lớp được duyệt từ đề xuất của ${requests.find(r => r.id === reqId)?.submittedByName}`
    });

    setApprovingRequestId(null);
  };

  const handleRejectSubmit = (e: React.FormEvent, reqId: string) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert('Vui lòng điền lý do từ chối để giải trình cho Sales!');
      return;
    }

    onRejectRequest(reqId, rejectionReason);
    setRejectingRequestId(null);
    setRejectionReason('');
  };

  const isHocVu = currentUser.role === 'hoc_vu';
  const isAdmin = currentUser.role === 'admin';
  const canManageRequests = isAdmin || isHocVu;

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          📥 Trung Tâm Phê Duyệt Mở Lớp (Admin & Học vụ)
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {isAdmin 
            ? 'Phê duyệt hoặc từ chối các đề xuất mở lớp học mới do phòng kinh doanh (Sales) đề trình.' 
            : 'Theo dõi các đề xuất mở lớp học đang chờ xử lý từ phòng kinh doanh.'}
        </p>
      </div>

      {/* PENDING REQUESTS PANEL */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" id="pending-requests-section">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-md flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> Hồ Sơ Yêu Cầu Chờ Phê Duyệt ({pendingRequests.length})
          </h3>
          <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200 animate-pulse">
            Chờ xử lý
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="text-center py-10 text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
            <CheckCircle className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
            <p className="text-sm font-semibold text-slate-600">Tuyệt vời! Không còn yêu cầu nào cần duyệt</p>
            <p className="text-xs text-slate-400 mt-1">Các đề xuất mở lớp từ Sales đã được xử lý đầy đủ.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingRequests.map((req) => {
              const isApprovingThis = approvingRequestId === req.id;
              const isRejectingThis = rejectingRequestId === req.id;

              return (
                <div 
                  key={req.id} 
                  className={`p-5 rounded-xl border transition-all duration-300 ${
                    isApprovingThis 
                      ? 'border-emerald-500 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/10' 
                      : isRejectingThis 
                      ? 'border-rose-400 bg-rose-50/10 shadow-md' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                  id={`pending-req-${req.id}`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    {/* Information column */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono uppercase tracking-wider bg-slate-100 py-0.5 px-2 rounded font-bold text-slate-500">
                          REQ ID: {req.id}
                        </span>
                        <strong className="text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded font-semibold text-sm">
                          Cấp độ: {req.requestedLevel}
                        </strong>
                        <span className="text-xs font-medium text-slate-400">
                          Gửi bởi: <strong className="text-slate-700">{req.submittedByName}</strong>
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          • {new Date(req.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>Lịch học mong muốn: <strong className="text-slate-800">{req.preferredSchedule}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>Khai giảng: <strong className="text-slate-800">{req.expectedStartDate}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>
                            Sĩ số hiện tại: <strong className="text-emerald-600 font-mono font-bold text-base">{req.interestCount}</strong> / {req.targetHeadcount} học viên (Yêu cầu)
                          </span>
                        </div>
                      </div>

                      {req.notes && (
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 italic">
                          <strong>Ý kiến đề xuất của Sales:</strong> "{req.notes}"
                        </div>
                      )}
                    </div>

                    {/* Operational Action buttons (Admin & Học vụ can manage) */}
                    {canManageRequests && !isApprovingThis && !isRejectingThis && (
                      <div className="flex items-center gap-2 self-stretch md:self-center shrink-0">
                        <button
                          onClick={() => setRejectingRequestId(req.id)}
                          className="flex items-center justify-center gap-1 flex-1 md:flex-none px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 font-bold hover:bg-rose-100 rounded-lg text-xs transition-colors shadow-sm focus:outline-none"
                          id={`btn-reject-trigger-${req.id}`}
                        >
                          <X className="w-3.5 h-3.5" /> Bác bỏ đề xuất
                        </button>
                        <button
                          onClick={() => startApproving(req)}
                          className="flex items-center justify-center gap-1 flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow focus:outline-none"
                          id={`btn-approve-trigger-${req.id}`}
                        >
                          <Check className="w-3.5 h-3.5" /> Chấp thuận mở lớp
                        </button>
                      </div>
                    )}

                    {!canManageRequests && (
                      <div className="text-xs text-slate-400 border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-lg font-medium self-center">
                        🔒 Chỉ Admin và Học vụ mới có quyền Duyệt / Từ chối
                      </div>
                    )}
                  </div>

                  {/* MINI FORM: REJECT REQUEST */}
                  {isRejectingThis && (
                    <form onSubmit={(e) => handleRejectSubmit(e, req.id)} className="mt-4 p-4 border border-rose-200 bg-rose-50/40 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs uppercase">
                        <AlertTriangle className="w-4 h-4 text-rose-500" /> Lý do từ chối yêu cầu của Sales
                      </div>
                      <textarea
                        required
                        placeholder="Hãy ghi lý do, ví dụ: Thiếu phòng học buổi tối vào lịch này, hoặc giáo viên bận..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={2}
                        className="w-full p-2.5 bg-white border border-rose-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setRejectingRequestId(null)}
                          className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50 transition-colors"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors shadow"
                          id={`btn-reject-confirm-${req.id}`}
                        >
                          Xác nhận Bác bỏ
                        </button>
                      </div>
                    </form>
                  )}

                  {/* COMPREHENSIVE FORM: APPROVE REQUEST (TRANSFORM TO CLASS) */}
                  {isApprovingThis && (
                    <form onSubmit={(e) => handleApproveSubmit(e, req.id)} className="mt-4 p-5 border border-emerald-200 bg-emerald-50/20 rounded-xl space-y-4">
                      <div className="text-emerald-800 font-bold text-xs uppercase tracking-wider">
                        🛠️ CẤU HÌNH LỚP HỌC MỚI KHAI SINH TỪ YÊU CẦU
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tên Lớp Chính Thức *</label>
                          <input
                            type="text"
                            required
                            value={assignClassName}
                            onChange={(e) => setAssignClassName(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Cấp độ</label>
                          <input
                            type="text"
                            disabled
                            value={req.requestedLevel}
                            className="w-full px-3 py-1.5 text-sm border border-slate-100 rounded bg-slate-100 text-slate-500 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Giáo viên được phân bổ *</label>
                          <input
                            type="text"
                            required
                            value={assignTeacher}
                            onChange={(e) => setAssignTeacher(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Thời khóa biểu chính thức</label>
                          <input
                            type="text"
                            value={assignSchedule}
                            onChange={(e) => setAssignSchedule(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ngày Khai Giảng</label>
                          <input
                            type="date"
                            value={assignStartDate}
                            onChange={(e) => setAssignStartDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Phòng Học phân bổ</label>
                          <input
                            type="text"
                            value={assignRoom}
                            onChange={(e) => setAssignRoom(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sĩ số tối đa *</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={assignCapacity}
                            onChange={(e) => setAssignCapacity(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-white font-mono"
                          />
                        </div>
                        <div className="flex items-end justify-between p-2 bg-slate-100 border border-slate-200 rounded text-xs text-slate-600">
                          <div>
                            Sĩ số khởi tạo: <strong className="text-emerald-700">{req.interestCount} học viên tiềm năng</strong>
                          </div>
                          <span>(Kế thừa từ Sales)</span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50">
                        <button
                          type="button"
                          onClick={() => setApprovingRequestId(null)}
                          className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded shadow-md transition-all"
                          id={`btn-approve-confirm-${req.id}`}
                        >
                          Xác nhận Khai Sinh Lớp Học
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPLETED REQUESTS HISTORY PANEL */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" id="handled-requests-section">
        <h3 className="font-bold text-slate-700 text-md mb-4 pb-2 border-b border-slate-100">
          📜 Lịch sử phê duyệt đề xuất lớp học ({handledRequests.length})
        </h3>

        {handledRequests.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            Chưa có yêu cầu nào được giải quyết trước đây.
          </div>
        ) : (
          <div className="space-y-3">
            {handledRequests.map((req) => {
              const isApproved = req.status === 'approved';
              return (
                <div 
                  key={req.id} 
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-800 font-semibold">{req.requestedLevel} đề xuất của {req.submittedByName}</strong>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isApproved ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                        {isApproved ? 'Đã duyệt' : 'Từ chối'}
                      </span>
                    </div>
                    <div className="text-slate-500">
                      Sĩ số đề xuất: {req.interestCount} / {req.targetHeadcount} • Khai giảng: {req.expectedStartDate} • Khung giờ: {req.preferredSchedule}
                    </div>
                    {req.rejectionReason && (
                      <div className="text-rose-700 font-medium">Lý do từ chối: {req.rejectionReason}</div>
                    )}
                    {req.approvedClassId && (
                      <div className="text-emerald-700 font-semibold">Tên lớp: {req.approvedClassId}</div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono self-end sm:self-auto shrink-0">
                    Cập nhật: {new Date(req.updatedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
