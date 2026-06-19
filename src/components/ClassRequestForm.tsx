import React, { useState } from 'react';
import { PlusCircle, Calendar, Users, FileText, CheckCircle2, XCircle, AlertCircle, Clock, Award } from 'lucide-react';
import { ClassRequest, User } from '../types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { CLASS_LEVELS } from './ClassDashboard';

interface ClassRequestFormProps {
  currentUser: User;
  requests: ClassRequest[];
  onSubmitRequest: (requestFormData: Omit<ClassRequest, 'id' | 'submittedBy' | 'submittedByName' | 'status' | 'createdAt' | 'updatedAt'>) => void;
}

export const ClassRequestForm: React.FC<ClassRequestFormProps> = ({
  currentUser,
  requests,
  onSubmitRequest
}) => {
  // Form fields
  const [requestedLevel, setRequestedLevel] = useState(CLASS_LEVELS[0]);
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState('');
  const [customDays, setCustomDays] = useState('');
  const [expectedStartDate, setExpectedStartDate] = useState('');
  const [interestCount, setInterestCount] = useState(5);
  const [targetHeadcount, setTargetHeadcount] = useState(10);
  const [notes, setNotes] = useState('');

  // Support file uploading to Firebase Storage
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentName, setDocumentName] = useState('');

  // Tab state for Sales view
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  const availableDays = ['T2/T4/T6', 'T3/T5/T7', 'T7/CN'];

  // Toggle preferred day select
  const handleDaySelect = (day: string) => {
    if (preferredDays.includes(day)) {
      setPreferredDays(preferredDays.filter(d => d !== day));
    } else {
      setPreferredDays([day]); // single choice or append. Standard is T2/T4/T6
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setUploadProgress(10);
    try {
      const fileRef = ref(storage, `requests/${Date.now()}_${file.name}`);
      setUploadProgress(40);
      const snapshot = await uploadBytes(fileRef, file);
      setUploadProgress(80);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      setUploadProgress(100);

      setDocumentUrl(downloadUrl);
      setDocumentName(file.name);
      alert('Tải tập tin đính kèm thành công!');
    } catch (err: any) {
      console.error(err);
      alert('Lỗi tải tệp lên Firebase Storage: ' + (err.message || err));
    } finally {
      setUploadingDoc(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveDoc = () => {
    setDocumentUrl('');
    setDocumentName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expectedStartDate) {
      alert('Vui lòng chọn ngày bắt đầu dự kiến!');
      return;
    }

    const scheduleString = `${preferredDays.length > 0 ? preferredDays[0] : (customDays || 'Tùy chọn')} | Ca: ${preferredTime}`;

    onSubmitRequest({
      requestedLevel,
      preferredSchedule: scheduleString,
      expectedStartDate,
      interestCount,
      targetHeadcount,
      notes,
      documentUrl: documentUrl || undefined,
      documentName: documentName || undefined
    });

    // Reset Form & switch to history tab
    setNotes('');
    setPreferredDays([]);
    setCustomDays('');
    setExpectedStartDate('');
    setInterestCount(5);
    setTargetHeadcount(10);
    setDocumentUrl('');
    setDocumentName('');
    setActiveTab('history');
  };

  // Filter requests submitted by this logged-in Sales user
  const myRequests = requests.filter(req => req.submittedBy === currentUser.id);

  return (
    <div className="space-y-6 font-sans">
      {/* Sales Header Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            🤝 Trung Tâm Yêu Cầu Mở Lớp (Kế hoạch Sales)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gửi đề xuất mở lớp học mới khi có đủ dữ liệu học viên tiềm năng từ thị trường
          </p>
        </div>
        
        {/* Toggle Panel buttons */}
        <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'create' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            id="tab-create-request"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Gửi Yêu Cầu
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-md transition-all relative ${activeTab === 'history' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            id="tab-history-requests"
          >
            📋 Yêu Cầu Của Tôi
            {myRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white font-bold h-4 w-4 rounded-full flex items-center justify-center text-[9px]">
                {myRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'create' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="form-create-request">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
              📝 Phiếu Điền Yêu Cầu Mở Lớp Học Sáng Tạo Xanh
            </h3>
            <p className="text-xs text-slate-400 mt-1">Vui lòng điền chi tiết lịch dự thảo và sĩ số tiềm năng</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Autofilled info banner */}
            <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-lg flex items-center justify-between text-xs text-emerald-700">
              <span className="font-semibold flex items-center gap-1.5">
                👤 Đăng nhập Người đề xuất:
              </span>
              <strong className="bg-emerald-100/50 border border-emerald-300/85 py-0.5 px-2.5 rounded font-mono uppercase font-bold text-emerald-800">
                {currentUser.name} ({currentUser.role.toUpperCase()})
              </strong>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Level Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Cấp độ yêu cầu mở lớp *
                </label>
                <select
                  value={requestedLevel}
                  onChange={(e) => setRequestedLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  id="req-level"
                >
                  {CLASS_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      🎓 {level}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Ngày khai giảng kỳ vọng *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={expectedStartDate}
                    onChange={(e) => setExpectedStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    id="req-start-date"
                  />
                </div>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                Lựa Chọn Lịch Ưu Tiên (Chọn hoặc tự ghi)
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Predefined days */}
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400 font-medium">Chọn ngày học định kỳ</span>
                  <div className="flex flex-wrap gap-2">
                    {availableDays.map((day) => {
                      const isSelected = preferredDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleDaySelect(day)}
                          className={`px-3 py-1.5 text-xs rounded-lg border font-semibold transition-all ${
                            isSelected 
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-600 shadow-sm' 
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  {preferredDays.length === 0 && (
                    <input
                      type="text"
                      placeholder="Hoặc gõ tay: ví dụ T2/T5/CN"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400"
                    />
                  )}
                </div>

                {/* Common Time slots */}
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400 font-medium font-bold">Khung giờ học</span>
                  <input
                    type="text"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    placeholder="Ví dụ: 19:00 - 21:00 hoặc 19:30 - 21:00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Interest Count and Target Headcount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-slate-100 pt-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-500" /> Sĩ số học viên quan tâm hiện có *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={interestCount}
                    onChange={(e) => setInterestCount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    id="req-interest"
                  />
                  <span className="text-xs text-slate-400 whitespace-nowrap">học viên đã cọc/hỏi</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                  🛡️ Chỉ tiêu sĩ số mong muốn tối thiểu để mở *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={targetHeadcount}
                    onChange={(e) => setTargetHeadcount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    id="req-target"
                  />
                  <span className="text-xs text-slate-400 whitespace-nowrap">mục tiêu (mặc định: 10)</span>
                </div>
              </div>
            </div>

            {/* Notes Textarea */}
            <div className="space-y-1 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" /> Ghi chú nghiệp vụ / Đề xuất thêm phòng, GV
              </label>
              <textarea
                placeholder="Ví dụ: Các học viên này đa số là học sinh cấp 3 trường chuyên, muốn học với giáo viên bản xứ buổi tối..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                id="req-notes"
              />
            </div>

            {/* Firebase Storage Document Upload */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                Tài liệu đính kèm minh chứng đóng tiền / danh sách (Tùy chọn)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  onChange={handleDocUpload}
                  className="hidden"
                  id="doc-file-input"
                />
                <label
                  htmlFor="doc-file-input"
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer transition-all"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  {uploadingDoc ? 'Đang tải lên...' : (documentName || 'Chọn tài liệu minh chứng')}
                </label>
                {documentUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveDoc}
                    className="text-xs text-rose-500 hover:text-rose-700 font-semibold underline"
                  >
                    Xóa
                  </button>
                )}
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-slate-200 h-1 rounded overflow-hidden mt-1">
                  <div className="bg-emerald-500 h-full" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-lg text-sm shadow transition-all active:scale-[0.98]"
                id="btn-submit-request"
              >
                Gửi Đề Xuất Mở Lớp Cho Admin
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* MY REQUESTS HISTORY TAB */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" id="my-requests-list">
          <h3 className="font-bold text-slate-800 text-md mb-4 flex items-center gap-2">
            📊 Lịch sử gửi yêu cầu của tôi
          </h3>
          
          {myRequests.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 border border-slate-100 rounded-xl text-slate-400">
              <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">Bạn chưa gửi yêu cầu mở lớp nào.</p>
              <button 
                onClick={() => setActiveTab('create')} 
                className="text-xs text-emerald-600 font-extrabold hover:underline mt-1 focus:outline-none"
              >
                Nhấp vào đây để thêm mới
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.map((req) => {
                // Status mapping with styles
                const statuses = {
                  pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Đang xử lý (Pending)', icon: <Clock className="w-4 h-4 text-amber-500 shrink-0" /> },
                  approved: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Đã duyệt (Approved)', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> },
                  rejected: { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'Đã bác bỏ (Rejected)', icon: <XCircle className="w-4 h-4 text-rose-500 shrink-0" /> }
                };

                const stat = statuses[req.status] || { bg: 'bg-slate-50 text-slate-500', text: req.status, icon: null };

                return (
                  <div 
                    key={req.id} 
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <strong className="text-slate-800 text-semibold bg-white px-2.2 py-0.5 border border-slate-200 rounded text-sm shrink-0">
                          {req.requestedLevel}
                        </strong>
                        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 border rounded-full text-xs font-semibold ${stat.bg}`}>
                          {stat.icon}
                          {stat.text}
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          Gửi lúc: {new Date(req.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                        <div>
                          📅 Lịch học: <strong className="text-slate-800">{req.preferredSchedule}</strong>
                        </div>
                        <div>
                          🗓️ Khai giảng: <strong className="text-slate-800">{req.expectedStartDate}</strong>
                        </div>
                        <div>
                          👥 Sĩ số: <strong className="text-emerald-600 font-mono">{req.interestCount}</strong> / {req.targetHeadcount} (Yêu cầu)
                        </div>
                      </div>

                      {req.notes && (
                        <p className="text-xs border-l-2 border-slate-200 pl-2 text-slate-500 italic mt-1 bg-white/70 py-1 pr-1">
                          "{req.notes}"
                        </p>
                      )}

                      {req.documentUrl && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-600 bg-white/70 py-1 px-2 border border-slate-100 rounded w-fit">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          <a 
                            href={req.documentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:underline font-semibold"
                          >
                            Tài liệu minh chứng: {req.documentName || 'Tải xuống'}
                          </a>
                        </div>
                      )}

                      {/* Display response details if approved/rejected */}
                      {req.status === 'rejected' && req.rejectionReason && (
                        <div className="p-2.5 bg-rose-50 rounded border border-rose-100 text-xs text-rose-800 mt-2">
                          <strong>Lý do từ chối:</strong> {req.rejectionReason}
                        </div>
                      )}
                      
                      {req.status === 'approved' && req.approvedClassId && (
                        <div className="p-2.5 bg-emerald-50 rounded border border-emerald-100 text-xs text-emerald-800 mt-2">
                          🎉 Yêu cầu đã duyệt! Tên lớp học tương ứng: <strong className="font-mono bg-white px-1.5 py-0.5 border border-emerald-200 rounded">{req.approvedClassId}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
