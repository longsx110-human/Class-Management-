import React, { useState } from 'react';
import { 
  Compass, TrendingUp, UserCheck2, RefreshCw, PlusCircle, MinusCircle, 
  ChevronRight, PlayCircle, History, User2
} from 'lucide-react';
import { Class, User, EnrollmentLog } from '../types';

interface EnrollmentTrackerProps {
  classes: Class[];
  currentUser: User;
  onUpdateEnrollment: (cls: Class, previousCount: number, newCount: number) => void;
  onConfirmClassOpening: (classId: string) => void;
  enrollmentLogs: EnrollmentLog[];
}

export const EnrollmentTracker: React.FC<EnrollmentTrackerProps> = ({
  classes,
  currentUser,
  onUpdateEnrollment,
  onConfirmClassOpening,
  enrollmentLogs
}) => {
  // Filter for upcoming classes
  const upcomingClasses = classes.filter(c => c.status === 'upcoming');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    upcomingClasses.length > 0 ? upcomingClasses[0].id : null
  );

  const selectedClass = classes.find(c => c.id === selectedClassId) || upcomingClasses[0];

  // If there are newly approved classes but none are selected, update selectedClassId
  React.useEffect(() => {
    if (upcomingClasses.length > 0 && (!selectedClassId || !classes.some(c => c.id === selectedClassId))) {
      setSelectedClassId(upcomingClasses[0].id);
    }
  }, [classes, upcomingClasses, selectedClassId]);

  const handleAdjustCount = (cls: Class, amount: number) => {
    const prevCount = cls.enrolledCount;
    const newCount = Math.max(0, prevCount + amount);
    if (newCount > cls.maxCapacity) {
      alert(`Sĩ số vượt quá giới hạn tối đa cho phép là ${cls.maxCapacity}!`);
      return;
    }
    onUpdateEnrollment(cls, prevCount, newCount);
  };

  const handleInputChange = (cls: Class, valStr: string) => {
    const newCount = parseInt(valStr, 10);
    if (isNaN(newCount) || newCount < 0) return;
    if (newCount > cls.maxCapacity) {
      alert(`Sĩ số tối đa cho phép là ${cls.maxCapacity}!`);
      return;
    }
    onUpdateEnrollment(cls, cls.enrolledCount, newCount);
  };

  // Filter logs for selected class
  const classSpecificLogs = enrolmentLogs => 
    enrolmentLogs.filter((log: EnrollmentLog) => log.classId === selectedClassId);

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'hoc_vu' || currentUser.role === 'sales';
  const isHocVuOrAdmin = currentUser.role === 'admin' || currentUser.role === 'hoc_vu';

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 animate-fade-in">
          🚀 Theo Dõi Trực Quan Tiến Độ Tuyển Sinh (Học vụ & Sales)
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Học vụ và Sales cùng chung sức hoàn thiện chỉ tiêu mở lớp. Khi sĩ số tuyển sinh đạt yêu cầu đầu vào (&ge;80% sĩ số) sẽ thông báo mở lớp.
        </p>
      </div>

      {upcomingClasses.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-semibold text-slate-700 text-lg">Chưa có lớp nào đang chờ tuyển sinh</h4>
          <p className="text-sm text-slate-400 mt-1">
            Mọi lớp học đều đã hoạt động hoặc đã kết thúc. Sales có thể gửi đề xuất để tạo thêm lớp chờ mới!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="enrollment-tracker-layout">
          {/* LEFT COLUMN: UPCOMING CLASSES LIST */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <h3 className="text-slate-800 font-bold text-sm uppercase tracking-wide border-b border-slate-100 pb-2">
              Lớp đang tuyển sinh ({upcomingClasses.length})
            </h3>
            
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {upcomingClasses.map((cls) => {
                const isSelected = cls.id === selectedClassId;
                const ratio = cls.enrolledCount / cls.maxCapacity;
                const progressPercent = Math.min(100, ratio * 100);
                const hasReached80 = cls.enrolledCount >= cls.maxCapacity * 0.8;

                return (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all flex flex-col justify-between gap-2 focus:outline-none ${
                      isSelected 
                        ? 'border-emerald-600 bg-emerald-50/30 shadow-sm font-extrabold' 
                        : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full gap-2 text-xs">
                       <span className="font-semibold text-slate-800 break-normal leading-4">{cls.name}</span>
                       <span className="font-mono bg-white px-2 py-0.5 border border-slate-100 rounded text-slate-500 font-bold shrink-0">
                        {cls.enrolledCount}/{cls.maxCapacity}
                      </span>
                    </div>

                    <div className="w-full">
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${hasReached80 ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center w-full pt-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest">{cls.level}</span>
                      {hasReached80 && (
                        <span className="text-[9px] font-bold bg-emerald-100 border border-emerald-200 text-emerald-800 py-0.5 px-1.5 rounded uppercase">
                          Đạt chỉ tiêu
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CENTRE & RIGHT COLUMN: SELECT CLASS DETAIL & LOGS */}
          {selectedClass ? (
            <div className="lg:col-span-2 space-y-6" id="enrollment-detail-panel">
              {/* INTERACTIVE BOARD */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div className="flex flex-wrap justify-between items-start gap-4 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <span className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-2 py-0.5 rounded uppercase font-mono">
                      Cấp độ: {selectedClass.level}
                    </span>
                    <h3 className="font-bold text-slate-800 text-lg">{selectedClass.name}</h3>
                    <p className="text-xs text-slate-500">Giáo viên: {selectedClass.teacher} • Bắt đầu: {selectedClass.startDate}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-400">Trạng thái:</div>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 inline-block uppercase mt-1">
                      🟡 Chờ khai giảng
                    </span>
                  </div>
                </div>

                {/* VISUAL ENGINE RIPPLE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-600">Thước đo tiến độ tuyển sinh</div>
                    
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold font-mono text-emerald-600">{selectedClass.enrolledCount}</span>
                      <span className="text-slate-400 text-sm">/ {selectedClass.maxCapacity} sĩ số tối đa</span>
                    </div>

                    <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 text-[10px] text-white font-bold ${
                          selectedClass.enrolledCount >= selectedClass.maxCapacity * 0.8
                            ? 'bg-emerald-500' 
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        }`}
                        style={{ width: `${Math.min(100, (selectedClass.enrolledCount / selectedClass.maxCapacity) * 100)}%` }}
                      >
                        {Math.round((selectedClass.enrolledCount / selectedClass.maxCapacity) * 100)}%
                      </div>
                    </div>

                    <div className="text-xs text-slate-400">
                      * Đạt tối thiểu 80% sĩ số (<strong className="text-slate-700 font-semibold">{Math.ceil(selectedClass.maxCapacity * 0.8)} học viên</strong>) là đủ điều kiện chính thức kích hoạt lớp học.
                    </div>
                  </div>

                  {/* CONTROLLER MODULE */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-widest text-center">
                      Cập nhật Số lượng học viên
                    </div>

                    {canEdit ? (
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleAdjustCount(selectedClass, -1)}
                          disabled={selectedClass.enrolledCount <= 0}
                          className="p-1 text-slate-500 hover:text-emerald-600 disabled:opacity-30 focus:outline-none transition-transform active:scale-95 disabled:pointer-events-none"
                          title="Bớt 1 học viên"
                        >
                          <MinusCircle className="w-10 h-10" />
                        </button>

                        <input
                          type="number"
                          min="0"
                          max={selectedClass.maxCapacity}
                          value={selectedClass.enrolledCount}
                          onChange={(e) => handleInputChange(selectedClass, e.target.value)}
                          className="w-20 text-center font-mono font-extrabold text-2xl text-slate-800 bg-white border border-slate-200 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                        />

                        <button
                          onClick={() => handleAdjustCount(selectedClass, 1)}
                          disabled={selectedClass.enrolledCount >= selectedClass.maxCapacity}
                          className="p-1 text-slate-500 hover:text-emerald-600 disabled:opacity-30 focus:outline-none transition-transform active:scale-95 disabled:pointer-events-none"
                          title="Thêm 1 học viên"
                        >
                          <PlusCircle className="w-10 h-10" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center p-3 text-xs text-rose-600 font-semibold">
                        🔒 Tài khoản không đủ thẩm quyền thay đổi
                      </div>
                    )}

                    {/* CONFIRM OPEN CLASS IF AT TARGET */}
                    {selectedClass.enrolledCount >= selectedClass.maxCapacity * 0.8 && (
                      <div className="pt-2 animate-fade-in text-center space-y-2">
                        <div className="text-xs text-emerald-700 font-bold flex items-center gap-1 justify-center">
                          <TrendingUp className="w-4 h-4" /> Đã đạt chỉ tiêu mở lớp!
                        </div>
                        {isHocVuOrAdmin ? (
                          <button
                            onClick={() => onConfirmClassOpening(selectedClass.id)}
                            className="w-full flex items-center justify-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm transition-colors shadow-md animate-bounce"
                            id="btn-confirm-opening-focused"
                          >
                            <PlayCircle className="w-4.5 h-4.5" /> Xác Nhận Khai Giảng Ngay
                          </button>
                        ) : (
                          <p className="text-[10px] text-slate-400">
                            Vui lòng liên hệ Học Vụ để bấm nút chính thức Chuyển sang Active.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ENROLLMENT CHANGELOG HISTORIES */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" id="enrollment-history-panel">
                <h4 className="text-slate-800 font-bold text-sm uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-slate-500" /> Hành Trình Cập Nhật Sĩ Số Lớp Học Quy Hoạch
                </h4>

                {classSpecificLogs(enrollmentLogs).length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Chưa có nhật ký ghi nhận cập nhật nào của riêng lớp này trước đây.
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                    {[...classSpecificLogs(enrollmentLogs)].reverse().map((log) => {
                      const difference = log.newCount - log.previousCount;
                      const isAddition = difference > 0;

                      return (
                        <div 
                          key={log.id} 
                          className="flex justify-between items-center bg-slate-50/50 border border-slate-100 p-2.5 rounded-lg text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold ${isAddition ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {isAddition ? `+${difference}` : difference}
                            </div>
                            <div>
                              <span><strong>{log.updatedByName}</strong> thay đổi sĩ số</span>
                              <div className="text-[10px] text-slate-400">
                                Sĩ số cũ: {log.previousCount} &rarr; Sĩ số mới: {log.newCount}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString('vi-VN')} {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              Chọn một lớp ở cột bên trái để hiển thị tiến độ và lịch sử ghi nhận sĩ số.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
