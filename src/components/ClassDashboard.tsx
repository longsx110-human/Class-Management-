import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, RefreshCw, Edit, Plus, Users, Calendar, MapPin, 
  BookOpen, ChevronRight, CheckCircle2, AlertTriangle, PlayCircle, Eye, LogIn,
  LayoutGrid, List, FileText, Download
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { Class, ClassStatus, User } from '../types';

interface ClassDashboardProps {
  classes: Class[];
  currentUser: User;
  onUpdateClass: (updatedClass: Class, changeReason?: string) => void;
  onAddClass?: (newClass: Class) => void;
  onConfirmClassOpening?: (classId: string) => void;
}

const CLASS_LEVELS = [
  "Khóa học giao tiếp",
  "Khóa học giao tiếp 1:1",
  "Chương trình trải nghiệm",
  "Smartkids",
  "Superkids",
  "Teen",
  "TOEIC 2 kỹ năng Level A (nghe đọc 400+)",
  "TOEIC 2 kỹ năng Level B (nghe đọc 500+)",
  "TOEIC 4 kỹ năng Level A (nghe đọc 400+, nói viêt 120+)",
  "TOEIC 4 kỹ năng Level B (nghe đọc 500+, nói viết 150+)",
  "HSK 1-3",
  "HSK 4",
  "HSK 5",
  "Giao tiếp cơ bản",
  "Giao tiếp nâng cao",
  "Giao tiếp 1:1",
  "Lớp online giao tiếp",
  "IELTS Pre (<4.0)",
  "IELTS Cơ bản (4.0 - 4.5)",
  "IELTS Tiền trung cấp (4.5 - 5.0)",
  "IELTS Trung Cấp (5.0 - 5.5)",
  "IELTS Trung cao cấp (5.5 - 6.0)",
  "IELTS Cao Cấp (6.0 - 6.5)",
  "IELTS Luyệt đề (6.5+)",
];

export const ClassDashboard: React.FC<ClassDashboardProps> = ({
  classes,
  currentUser,
  onUpdateClass,
  onAddClass,
  onConfirmClassOpening
}) => {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [scheduleFilter, setScheduleFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Real-time polling simulation state
  const [secondsToRefresh, setSecondsToRefresh] = useState(60);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(new Date().toLocaleTimeString());

  // Edit / Modal state
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isAddingClass, setIsAddingClass] = useState(false);

  // New Class Form state (Admin only can directly create, or approve requests)
  const [newClassName, setNewClassName] = useState('');
  const [newClassLevel, setNewClassLevel] = useState(CLASS_LEVELS[0]);
  const [newClassTeacher, setNewClassTeacher] = useState('');
  const [newClassSchedule, setNewClassSchedule] = useState('');
  const [newClassStartDate, setNewClassStartDate] = useState('');
  const [newClassRoom, setNewClassRoom] = useState('');
  const [newClassMaxCapacity, setNewClassMaxCapacity] = useState(15);
  const [newClassNotes, setNewClassNotes] = useState('');
  const [newClassSyllabusUrl, setNewClassSyllabusUrl] = useState('');
  const [newClassSyllabusName, setNewClassSyllabusName] = useState('');

  // Syllabus Upload States
  const [uploadingSyllabus, setUploadingSyllabus] = useState(false);
  const [uploadSyllabusProgress, setUploadSyllabusProgress] = useState(0);

  const handleSyllabusUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSyllabus(true);
    setUploadSyllabusProgress(10);
    try {
      const fileRef = ref(storage, `classes/${Date.now()}_${file.name}`);
      setUploadSyllabusProgress(40);
      const snapshot = await uploadBytes(fileRef, file);
      setUploadSyllabusProgress(80);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      setUploadSyllabusProgress(100);

      if (editingClass) {
        setEditingClass({
          ...editingClass,
          syllabusUrl: downloadUrl,
          syllabusName: file.name
        });
      } else {
        setNewClassSyllabusUrl(downloadUrl);
        setNewClassSyllabusName(file.name);
      }
      alert('Tải lên giáo trình thành công!');
    } catch (err: any) {
      console.error(err);
      alert('Lỗi tải tệp lên Firebase Storage: ' + (err.message || err));
    } finally {
      setUploadingSyllabus(false);
      setUploadSyllabusProgress(0);
    }
  };

  const handleRemoveSyllabus = () => {
    if (editingClass) {
      setEditingClass({
        ...editingClass,
        syllabusUrl: '',
        syllabusName: ''
      });
    } else {
      setNewClassSyllabusUrl('');
      setNewClassSyllabusName('');
    }
  };

  // Extract unique teachers, levels, schedules for filter select options
  const uniqueTeachers = Array.from(new Set(classes.map(c => c.teacher))).filter(Boolean);
  const uniqueLevels = Array.from(new Set(classes.map(c => c.level))).filter(Boolean);
  const uniqueSchedules = Array.from(new Set(classes.map(c => c.schedule))).filter(Boolean);

  // Auto-refresh countdown effect
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsToRefresh((prev) => {
        if (prev <= 1) {
          triggerRefresh();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdatedTime(new Date().toLocaleTimeString());
    }, 800);
  };

  const handleManualRefresh = () => {
    setSecondsToRefresh(60);
    triggerRefresh();
  };

  // Filter and search logic
  const filteredClasses = classes.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesLevel = levelFilter === 'all' || c.level === levelFilter;
    const matchesTeacher = teacherFilter === 'all' || c.teacher === teacherFilter;
    const matchesSchedule = scheduleFilter === 'all' || c.schedule.includes(scheduleFilter);

    return matchesSearch && matchesStatus && matchesLevel && matchesTeacher && matchesSchedule;
  });

  // Calculate capacity percentage
  const getCapacityInfo = (current: number, max: number) => {
    const pct = max > 0 ? (current / max) * 100 : 0;
    const isNearlyFull = pct >= 80 && pct < 100;
    const isFull = pct >= 100;
    return { pct, isNearlyFull, isFull };
  };

  // Handler for class details edit Form submit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClass) {
      const isFullNow = editingClass.enrolledCount >= editingClass.maxCapacity;
      let updatedStatus = editingClass.status;
      if (isFullNow && editingClass.status === 'active') {
        updatedStatus = 'full';
      } else if (!isFullNow && editingClass.status === 'full') {
        updatedStatus = 'active';
      }

      onUpdateClass({
        ...editingClass,
        status: updatedStatus,
        updatedAt: new Date().toISOString()
      }, `Cập nhật thông tin chi tiết lớp ${editingClass.name}`);
      setEditingClass(null);
    }
  };

  // Direct edit of enrollment (+/-) for Học vụ and Sales
  const adjustEnrollment = (cls: Class, amount: number) => {
    const newCount = Math.max(0, cls.enrolledCount + amount);
    if (newCount > cls.maxCapacity) {
      alert(`Số lượng học viên vượt quá giới hạn tối đa (${cls.maxCapacity})!`);
      return;
    }

    let nextStatus = cls.status;
    if (newCount >= cls.maxCapacity && cls.status === 'active') {
      nextStatus = 'full';
    } else if (newCount < cls.maxCapacity && cls.status === 'full') {
      nextStatus = 'active';
    }

    onUpdateClass({
      ...cls,
      enrolledCount: newCount,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    }, `Thay đổi sĩ số lớp ${cls.name}: ${cls.enrolledCount} -> ${newCount}`);
  };

  // Direct manual text input of enrollment
  const setEnrollmentCountDirect = (cls: Class, valStr: string) => {
    const newCount = parseInt(valStr, 10);
    if (isNaN(newCount) || newCount < 0) return;
    if (newCount > cls.maxCapacity) {
      alert(`Sĩ số tối đa là ${cls.maxCapacity}!`);
      return;
    }

    let nextStatus = cls.status;
    if (newCount >= cls.maxCapacity && cls.status === 'active') {
      nextStatus = 'full';
    } else if (newCount < cls.maxCapacity && cls.status === 'full') {
      nextStatus = 'active';
    }

    onUpdateClass({
      ...cls,
      enrolledCount: newCount,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    }, `Cập nhật trực tiếp sĩ số lớp ${cls.name}: từ ${cls.enrolledCount} sang ${newCount}`);
  };

  // Handle Admin directly creating a new class (not through a Sales request)
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassTeacher.trim()) {
      alert('Vui lòng điền đầy đủ tên lớp và giáo viên!');
      return;
    }

    if (onAddClass) {
      const created: Class = {
        id: `class_${Date.now()}`,
        name: newClassName,
        level: newClassLevel,
        teacher: newClassTeacher,
        schedule: newClassSchedule || 'Tùy chọn',
        startDate: newClassStartDate || new Date().toISOString().split('T')[0],
        room: newClassRoom || 'Phòng học trực tuyến',
        enrolledCount: 0,
        maxCapacity: Number(newClassMaxCapacity),
        status: 'upcoming',
        notes: newClassNotes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syllabusUrl: newClassSyllabusUrl || undefined,
        syllabusName: newClassSyllabusName || undefined
      };
      
      onAddClass(created);
      setIsAddingClass(false);
      // Reset form
      setNewClassName('');
      setNewClassTeacher('');
      setNewClassSchedule('');
      setNewClassStartDate('');
      setNewClassRoom('');
      setNewClassMaxCapacity(15);
      setNewClassNotes('');
      setNewClassSyllabusUrl('');
      setNewClassSyllabusName('');
    }
  };

  const handleDownloadCSV = () => {
    // Only export the currently filtered "active" classes
    const activeClassesToDownload = filteredClasses.filter(c => c.status === 'active');
    
    if (activeClassesToDownload.length === 0) {
      alert("Không có lớp học nào đang hoạt động trong danh sách hiện tại để xuất CSV.");
      return;
    }

    const headers = ['Mã Lớp', 'Tên Lớp', 'Trình Độ', 'Giáo Viên', 'Lịch Học', 'Phòng Học', 'Sĩ Số', 'Công Suất'];
    const escapeCSV = (val: string) => `"${val.replace(/"/g, '""')}"`;

    const rows = activeClassesToDownload.map(cls => [
      escapeCSV(cls.id),
      escapeCSV(cls.name),
      escapeCSV(cls.level),
      escapeCSV(cls.teacher),
      escapeCSV(cls.schedule),
      escapeCSV(cls.room),
      cls.enrolledCount,
      cls.maxCapacity
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(ro => ro.join(','))
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Lop_Hoc_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalClasses = classes.length;
  const activeClasses = classes.filter(c => c.status === 'active').length;
  const nearlyFullClasses = classes.filter(c => c.enrolledCount >= c.maxCapacity * 0.8 && c.status !== 'cancelled').length;
  const totalEnrolled = classes.reduce((sum, c) => sum + c.enrolledCount, 0);

  return (
    <div className="space-y-6 font-sans" id="dashboard-container">
      {/* Real-time Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            📊 Bảng Quản Lý Lớp Học Quốc Tế Sáng Tạo Xanh
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Cập nhật toàn bộ lớp học, phòng học, sĩ số và trạng thái tuyển sinh thời gian thực
          </p>
        </div>
        
        {/* Fresh system indicators */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex flex-col items-end mr-1 text-right">
            <span className="text-xs font-mono text-slate-400">
              Cập nhật: {lastUpdatedTime}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium text-emerald-600">
                Tự động làm mới sau: <strong className="font-mono text-emerald-600">{secondsToRefresh}s</strong>
              </span>
            </div>
          </div>
          <button 
            onClick={handleManualRefresh}
            className={`p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`}
            title="Làm mới dữ liệu ngay"
            id="btn-manual-refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg transition-colors font-bold text-sm shadow-sm"
            id="btn-download-csv"
            title="Tải xuống báo cáo CSV các lớp đang hoạt động"
          >
            <Download className="w-4 h-4" /> Tải Báo Cáo
          </button>
          {(currentUser.role === 'admin' || currentUser.role === 'hoc_vu') && onAddClass && (
            <button
              onClick={() => setIsAddingClass(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg transition-colors font-bold text-sm shadow"
              id="btn-admin-add-class"
            >
              <Plus className="w-4 h-4" /> Tạo Lớp Trực Tiếp
            </button>
          )}
        </div>
      </div>

      {/* STAT CARDS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stat-cards-panel">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Tổng số lớp</p>
          <h3 className="text-3xl font-black text-slate-900 leading-none">{totalClasses.toString().padStart(2, '0')}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <p className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest mb-1">Đang hoạt động</p>
          <h3 className="text-3xl font-black text-emerald-600 leading-none">{activeClasses.toString().padStart(2, '0')}</h3>
        </div>
        <div className="bg-red-50/50 p-5 rounded-2xl border border-red-200 shadow-sm flex flex-col justify-between hover:bg-red-50 transition-colors">
          <p className="text-xs font-extrabold text-red-600 uppercase tracking-widest mb-1">Sắp đầy (&ge;80%)</p>
          <h3 className="text-3xl font-black text-red-700 leading-none">{nearlyFullClasses.toString().padStart(2, '0')}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Tổng học viên</p>
          <h3 className="text-3xl font-black text-slate-900 leading-none">{totalEnrolled}</h3>
        </div>
      </div>

      {/* FILTER & SEARCH CONTAINER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" /> Bộ lọc & Tìm kiếm nhanh
          </h3>
          
          {/* View Mode Toggle Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto shadow-inner">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-805'
              }`}
              id="switch-view-grid"
              title="Hiển thị dạng ô lưới"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Lưới
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'list' 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-805'
              }`}
              id="switch-view-list"
              title="Hiển thị dạng danh sách hàng"
            >
              <List className="w-3.5 h-3.5" /> Danh sách
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search Term */}
          <div className="relative col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm lớp, giáo viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              id="search-input"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-slate-700 font-medium py-2 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              id="filter-status"
            >
              <option value="all">🛡️ Tất cả trạng thái</option>
              <option value="active">🟢 Đang hoạt động (Active)</option>
              <option value="upcoming">🟡 Lớp Sắp khai giảng (Upcoming)</option>
              <option value="full">🔴 Lớp Đã đầy (Full)</option>
              <option value="cancelled">⚫ Đã hủy (Cancelled)</option>
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full text-slate-700 font-medium py-2 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              id="filter-level"
            >
              <option value="all">🎓 Tất cả cấp độ</option>
              {CLASS_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>

          {/* Teacher Filter */}
          <div>
            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="w-full text-slate-700 font-medium py-2 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              id="filter-teacher"
            >
              <option value="all">👨‍🏫 Tất cả giáo viên</option>
              {uniqueTeachers.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Schedule Filter */}
          <div>
            <select
              value={scheduleFilter}
              onChange={(e) => setScheduleFilter(e.target.value)}
              className="w-full text-slate-700 font-medium py-2 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              id="filter-schedule"
            >
              <option value="all">📅 Tất cả lịch học</option>
              {uniqueSchedules.map((sch) => (
                <option key={sch} value={sch}>{sch}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Mini stats count */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-semibold text-slate-500">
          <span>Tìm thấy: <strong className="text-emerald-600">{filteredClasses.length}</strong> lớp</span>
          <span>•</span>
          <span className="flex items-center gap-1">🟢 {classes.filter(c => c.status === 'active').length} lớp hoạt động</span>
          <span>•</span>
          <span className="flex items-center gap-1">🟡 {classes.filter(c => c.status === 'upcoming').length} lớp sắp mở</span>
          <span>•</span>
          <span className="flex items-center gap-1">🔴 {classes.filter(c => c.status === 'full').length} lớp đã đầy</span>
        </div>
      </div>

      {/* DASHBOARD GRID / CARD LIST */}
      {filteredClasses.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center text-slate-500" id="empty-state">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-semibold text-slate-700 text-lg">Chưa có lớp nào khớp với bộ lọc</h4>
          <p className="text-sm text-slate-400 mt-1">Hãy thử xóa bộ lọc tìm kiếm hoặc tạo một yêu cầu lớp mới</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="class-grid-cards">
          {filteredClasses.map((cls) => {
            const { pct, isNearlyFull, isFull } = getCapacityInfo(cls.enrolledCount, cls.maxCapacity);
            const canUpdateEnrollment = currentUser.role === 'admin' || currentUser.role === 'hoc_vu';

            // Status badges and colors
            const statusConfig = {
              active: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: '🟢 Đang chạy', ring: 'ring-emerald-500/10' },
              upcoming: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: '🟡 Sắp khai giảng', ring: 'ring-amber-500/10' },
              full: { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: '🔴 Đầy sĩ số', ring: 'ring-rose-500/10' },
              cancelled: { bg: 'bg-slate-100 text-slate-700 border-slate-300', text: '⚫ Đã hủy', ring: 'ring-slate-500/10' }
            };

            const currentStatus = statusConfig[cls.status] || { bg: 'bg-slate-50 text-slate-700 border-slate-200', text: cls.status, ring: '' };

            return (
              <div 
                key={cls.id} 
                className={`group min-h-[300px] flex flex-col justify-between bg-white rounded-xl border transition-all duration-300 shadow-sm hover:shadow-md relative overflow-hidden ${
                  isNearlyFull 
                    ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/10' 
                    : isFull 
                    ? 'border-rose-300 bg-rose-50/5' 
                    : 'border-slate-200'
                }`}
                id={`class-card-${cls.id}`}
              >
                {/* Visual Highlight indicator for nearly full classes */}
                {isNearlyFull && (
                  <div className="absolute top-0 right-0 left-0 bg-amber-400 text-amber-950 font-bold text-[10px] uppercase tracking-wider py-0.5 text-center px-4">
                    ⚠️ Sắp đầy sĩ số (&ge;80% Công suất)
                  </div>
                )}
                {isFull && (
                  <div className="absolute top-0 right-0 left-0 bg-rose-500 text-white font-bold text-[10px] uppercase tracking-wider py-0.5 text-center px-4">
                    🚫 Đã đạt giới hạn tối đa
                  </div>
                )}

                {/* Card Top Information Header */}
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex justify-between items-start gap-2 pt-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-slate-400 uppercase tracking-wider bg-slate-100 py-0.5 px-2 rounded font-bold">
                          ID: {cls.id}
                        </span>
                        <div className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${currentStatus.bg}`}>
                          {currentStatus.text}
                        </div>
                        {cls.status === 'upcoming' && cls.enrolledCount >= 9 && (currentUser.role === 'admin' || currentUser.role === 'hoc_vu') && (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded uppercase flex items-center gap-1 animate-pulse border border-indigo-200">
                            <AlertTriangle className="w-3 h-3" />
                            Action Required
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                        {cls.name}
                      </h4>
                    </div>
                    {(currentUser.role === 'admin' || currentUser.role === 'hoc_vu') && (
                      <button
                        onClick={() => setEditingClass(cls)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors shrink-0"
                        title="Chỉnh sửa thông tin lớp học"
                        id={`btn-edit-class-${cls.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Level and Details parameters */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm my-2">
                    <div className="flex items-center gap-2 text-slate-600">
                      <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <div className="text-[11px] text-slate-400 leading-3 uppercase tracking-wider">Trình Độ</div>
                        <span className="font-semibold text-slate-800">{cls.level}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <div className="text-[11px] text-slate-400 leading-3 uppercase tracking-wider">Giáo Viên</div>
                        <span className="font-semibold text-slate-800">{cls.teacher}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <div className="text-[11px] text-slate-400 leading-3 uppercase tracking-wider">Thời khóa biểu</div>
                        <span className="font-medium text-slate-700 text-xs">{cls.schedule}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <div className="text-[11px] text-slate-400 leading-3 uppercase tracking-wider">Phòng / Ngày bắt đầu</div>
                        <span className="font-medium text-slate-700 text-xs">
                          {cls.room} • {cls.startDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Class Notes */}
                  {cls.notes && (
                    <div className="p-2.5 bg-slate-50/50 rounded-lg border border-slate-100 text-xs text-slate-500">
                      <strong>Ghi chú:</strong> {cls.notes}
                    </div>
                  )}

                  {cls.syllabusUrl && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-blue-700 transition-all hover:bg-blue-50">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="font-medium truncate flex-1 select-none">Giáo trình: <strong>{cls.syllabusName || 'Xem giáo trình'}</strong></span>
                      <a 
                        href={cls.syllabusUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[11px] underline hover:text-blue-900 font-extrabold shrink-0"
                      >
                        Mở / Tải về
                      </a>
                    </div>
                  )}
                </div>

                {/* Progress bar and active enrollment operations tracker */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-xl space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Sĩ số học viên đăng ký</span>
                    <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 border border-slate-200 rounded">
                      {cls.enrolledCount} / {cls.maxCapacity} {isNearlyFull && '⚠️'} {isFull && '🔴'}
                    </span>
                  </div>

                  {/* Progress visual bar */}
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFull 
                          ? 'bg-rose-500' 
                          : isNearlyFull 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                      }`} 
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  {/* Enrollment Interactive progress modifiers for Sales & Academic */}
                  {canUpdateEnrollment && (
                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1" id={`enrollment-controls-${cls.id}`}>
                      <div className="flex items-center border border-slate-200 bg-white rounded-lg overflow-hidden shrink-0 w-full sm:w-auto">
                        <button 
                          onClick={() => adjustEnrollment(cls, -1)}
                          disabled={cls.enrolledCount <= 0}
                          className="px-3 py-1.5 font-bold hover:bg-slate-100 transition-colors border-r border-slate-200 disabled:opacity-50 text-slate-600 disabled:pointer-events-none"
                          title="Bớt 1 học viên"
                        >
                          -1
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={cls.maxCapacity}
                          value={cls.enrolledCount}
                          onChange={(e) => setEnrollmentCountDirect(cls, e.target.value)}
                          className="w-12 text-center text-sm font-mono font-semibold text-slate-800 bg-transparent focus:outline-none focus:bg-blue-50 focus:text-blue-700 h-9"
                          title="Nhập trực tiếp sĩ số"
                        />
                        <button 
                          onClick={() => adjustEnrollment(cls, 1)}
                          disabled={cls.enrolledCount >= cls.maxCapacity}
                          className="px-3 py-1.5 font-bold hover:bg-slate-100 transition-colors border-l border-slate-200 disabled:opacity-50 text-slate-600 disabled:pointer-events-none"
                          title="Thêm 1 học viên"
                        >
                          +1
                        </button>
                      </div>

                      {/* Prompts to confirm class opening if it hits target & is Upcoming */}
                      {cls.status === 'upcoming' && cls.enrolledCount >= cls.maxCapacity * 0.8 && onConfirmClassOpening && (currentUser.role === 'admin' || currentUser.role === 'hoc_vu') && (
                        <button
                          onClick={() => onConfirmClassOpening(cls.id)}
                          className="w-full flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs tracking-wide shadow-sm transition-colors uppercase animate-pulse"
                          title="Nhấn để phê duyệt khai giảng và chuyển thành Đang chạy"
                          id={`btn-open-class-${cls.id}`}
                        >
                          <PlayCircle className="w-4 h-4" /> Khai giảng chính thức
                        </button>
                      )}
                      
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 flex-1 text-right mt-1 sm:mt-0 justify-end">
                        <span>Lớp:</span> 
                        <strong className="text-slate-600 uppercase font-semibold">
                          {cls.status === 'active' ? 'Đang hoạt động' : cls.status === 'upcoming' ? 'Chờ khai giảng' : cls.status === 'full' ? 'Lớp đầy' : 'Đã hủy'}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="class-list-view">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <th className="py-4 px-5 font-extrabold text-slate-700">Thông tin lớp học</th>
                  <th className="py-4 px-5 font-extrabold text-slate-700 hidden md:table-cell">Mức độ & Giáo viên</th>
                  <th className="py-4 px-5 font-extrabold text-slate-700 hidden lg:table-cell">Lịch học & phòng</th>
                  <th className="py-4 px-5 font-extrabold text-slate-700">Tiến độ tuyển sinh</th>
                  <th className="py-4 px-5 font-extrabold text-slate-700 text-right">Đăng ký & Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClasses.map((cls) => {
                  const { pct, isNearlyFull, isFull } = getCapacityInfo(cls.enrolledCount, cls.maxCapacity);
                  const canUpdateEnrollment = currentUser.role === 'admin' || currentUser.role === 'hoc_vu';

                  // Status badges and colors
                  const statusConfig = {
                    active: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: '🟢 Đang chạy' },
                    upcoming: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: '🟡 Sắp khai giảng' },
                    full: { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: '🔴 Đầy sĩ số' },
                    cancelled: { bg: 'bg-slate-100 text-slate-700 border-slate-300', text: '⚫ Đã hủy' }
                  };

                  const currentStatus = statusConfig[cls.status] || { bg: 'bg-slate-50 text-slate-700 border-slate-200', text: cls.status };

                  return (
                    <tr 
                      key={cls.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isNearlyFull 
                          ? 'bg-amber-50/10' 
                          : isFull 
                          ? 'bg-rose-50/5' 
                          : ''
                      }`}
                      id={`class-row-${cls.id}`}
                    >
                      {/* Name & ID & Status Badge */}
                      <td className="py-4 px-5 align-middle">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 py-0.5 px-1.5 rounded font-bold">
                              {cls.id}
                            </span>
                            <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${currentStatus.bg}`}>
                              {currentStatus.text}
                            </div>
                            {isNearlyFull && (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                ⚠️ Sắp đầy
                              </span>
                            )}
                            {isFull && (
                              <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                🚫 Hết chỗ
                              </span>
                            )}
                            {cls.status === 'upcoming' && cls.enrolledCount >= 9 && (currentUser.role === 'admin' || currentUser.role === 'hoc_vu') && (
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[9px] rounded uppercase flex items-center gap-0.5 animate-pulse border border-indigo-200">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Action Required
                              </span>
                            )}
                          </div>
                          <span className="font-extrabold text-slate-800 block text-sm leading-snug">
                            {cls.name}
                          </span>
                          {cls.syllabusUrl && (
                            <div className="flex items-center gap-1.1 text-xs text-blue-600 mt-1 select-none font-semibold">
                              <FileText className="w-3.5 h-3.5 mr-0.5" />
                              <a 
                                href={cls.syllabusUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {cls.syllabusName || 'Xem giáo trình'}
                              </a>
                            </div>
                          )}
                          {/* Fallback indicators for small screen view */}
                          <div className="md:hidden space-y-1 block text-slate-500 text-xs mt-1">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-3 h-3 text-slate-400" />
                              <span>{cls.level} • GV: {cls.teacher}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{cls.schedule} • {cls.room}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Level & Teacher */}
                      <td className="py-4 px-5 hidden md:table-cell align-middle">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Cấp độ: <strong>{cls.level}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>GV: <strong>{cls.teacher}</strong></span>
                          </div>
                        </div>
                      </td>

                      {/* Schedule & Room */}
                      <td className="py-4 px-5 hidden lg:table-cell align-middle max-w-xs">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{cls.schedule}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{cls.room} • {cls.startDate}</span>
                          </div>
                        </div>
                      </td>

                      {/* Enrolledcount & Capacity Progress Bar */}
                      <td className="py-4 px-5 align-middle">
                        <div className="space-y-1.5 w-32 sm:w-44">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-mono font-bold text-slate-700">
                              {cls.enrolledCount}/{cls.maxCapacity} {isNearlyFull && '⚠️'} {isFull && '🔴'}
                            </span>
                            <span className="text-slate-400 text-[10px]">{Math.round(pct)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isFull 
                                  ? 'bg-rose-500' 
                                  : isNearlyFull 
                                  ? 'bg-amber-500' 
                                  : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                              }`} 
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Interactive modifier, manual edits, and approve start */}
                      <td className="py-4 px-5 text-right align-middle">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {canUpdateEnrollment && (
                            <div className="flex items-center border border-slate-200 bg-white rounded-md overflow-hidden shrink-0 h-8 shadow-sm">
                              <button 
                                onClick={() => adjustEnrollment(cls, -1)}
                                disabled={cls.enrolledCount <= 0}
                                className="px-2.5 h-full hover:bg-slate-100 transition-colors border-r border-slate-200 disabled:opacity-50 text-slate-600 disabled:pointer-events-none text-xs font-bold"
                                title="Bớt 1 học viên"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                max={cls.maxCapacity}
                                value={cls.enrolledCount}
                                onChange={(e) => setEnrollmentCountDirect(cls, e.target.value)}
                                className="w-10 text-center text-xs font-mono font-semibold text-slate-800 bg-transparent focus:outline-none h-full focus:bg-emerald-50 focus:text-emerald-700"
                                title="Nhập sĩ số"
                              />
                              <button 
                                onClick={() => adjustEnrollment(cls, 1)}
                                disabled={cls.enrolledCount >= cls.maxCapacity}
                                className="px-2.5 h-full hover:bg-slate-100 transition-colors border-l border-slate-200 disabled:opacity-50 text-slate-600 disabled:pointer-events-none text-xs font-bold"
                                title="Thêm 1 học viên"
                              >
                                +
                              </button>
                            </div>
                          )}

                          {cls.status === 'upcoming' && cls.enrolledCount >= cls.maxCapacity * 0.8 && onConfirmClassOpening && (currentUser.role === 'admin' || currentUser.role === 'hoc_vu') && (
                            <button
                              onClick={() => onConfirmClassOpening(cls.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded text-[11px] uppercase tracking-wider shadow-sm transition-all animate-pulse"
                              title="Khai giảng chính thức"
                              id={`btn-open-class-row-${cls.id}`}
                            >
                              <PlayCircle className="w-3.5 h-3.5" /> Mở lớp
                            </button>
                          )}

                          {(currentUser.role === 'admin' || currentUser.role === 'hoc_vu') && (
                            <button
                              onClick={() => setEditingClass(cls)}
                              className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-slate-50 transition-colors inline-flex items-center"
                              title="Sửa thông tin lớp"
                              id={`btn-edit-class-row-${cls.id}`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADMIN EDIT CLASS DIALOG MODAL */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-blue-600 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Edit className="w-5 h-5" /> Chỉnh Sửa Chi Tiết Lớp Học
              </h3>
              <button 
                onClick={() => setEditingClass(null)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded p-1 transition-all"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tên Lớp Học *</label>
                <input
                  type="text"
                  required
                  value={editingClass.name}
                  onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Cấp Độ *</label>
                  <select
                    value={editingClass.level}
                    onChange={(e) => setEditingClass({ ...editingClass, level: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {CLASS_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Giáo Viên *</label>
                  <input
                    type="text"
                    required
                    value={editingClass.teacher}
                    onChange={(e) => setEditingClass({ ...editingClass, teacher: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Sĩ số tối đa *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingClass.maxCapacity}
                    onChange={(e) => setEditingClass({ ...editingClass, maxCapacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Trạng thái lớp</label>
                  <select
                    value={editingClass.status}
                    onChange={(e) => setEditingClass({ ...editingClass, status: e.target.value as ClassStatus })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="active">Active (Trong hoạt động)</option>
                    <option value="upcoming">Upcoming (Sắp khai giảng)</option>
                    <option value="full">Full (Đầy sĩ số)</option>
                    <option value="cancelled">Cancelled (Đã hủy)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Thời khóa biểu (ví dụ: T2/T4/T6 tối)</label>
                <input
                  type="text"
                  value={editingClass.schedule}
                  onChange={(e) => setEditingClass({ ...editingClass, schedule: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Phòng Học</label>
                  <input
                    type="text"
                    value={editingClass.room}
                    onChange={(e) => setEditingClass({ ...editingClass, room: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Ngày Bắt Đầu</label>
                  <input
                    type="date"
                    value={editingClass.startDate}
                    onChange={(e) => setEditingClass({ ...editingClass, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Ghi Chú Lớp Học</label>
                <textarea
                  value={editingClass.notes}
                  onChange={(e) => setEditingClass({ ...editingClass, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                />
              </div>

              {/* Syllabus Attachment upload to Storage */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Giáo trình / Tài liệu đính kèm (Tùy chọn)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    onChange={handleSyllabusUpload}
                    className="hidden"
                    id="edit-class-syllabus-input"
                  />
                  <label
                    htmlFor="edit-class-syllabus-input"
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer transition-all"
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    {uploadingSyllabus ? 'Đang tải lên...' : (editingClass.syllabusName || 'Chọn tệp giáo trình')}
                  </label>
                  {editingClass.syllabusUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveSyllabus}
                      className="text-xs text-rose-500 hover:text-rose-700 font-semibold underline"
                    >
                      Xóa
                    </button>
                  )}
                </div>
                {uploadSyllabusProgress > 0 && uploadSyllabusProgress < 100 && (
                  <div className="w-full bg-slate-200 h-1 rounded overflow-hidden mt-1">
                    <div className="bg-blue-500 h-full" style={{ width: `${uploadSyllabusProgress}%` }} />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow transition-colors"
                >
                  Xác nhận lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ADMIN ADD DIRECT CLASS MODAL */}
      {isAddingClass && (currentUser.role === 'admin' || currentUser.role === 'hoc_vu') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-slide-up">
            <div className="px-6 py-4 bg-emerald-600 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" /> Thêm Lớp Học Mới Trực Tiếp
              </h3>
              <button 
                onClick={() => setIsAddingClass(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded p-1 transition-all"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateClass} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tên Lớp Học *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: IELTS Song Thư 5.5"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Cấp Độ *</label>
                  <select
                    value={newClassLevel}
                    onChange={(e) => setNewClassLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {CLASS_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Giáo Viên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Tên giáo viên"
                    value={newClassTeacher}
                    onChange={(e) => setNewClassTeacher(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Sĩ số tối đa *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Sĩ số tối đa"
                    value={newClassMaxCapacity}
                    onChange={(e) => setNewClassMaxCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Phòng Học</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Phòng 303"
                    value={newClassRoom}
                    onChange={(e) => setNewClassRoom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Lịch Học (Thứ + Ca)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: T3/T5 tối (18h-19h30)"
                    value={newClassSchedule}
                    onChange={(e) => setNewClassSchedule(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Ngày Bắt Đầu Dự Kiến</label>
                  <input
                    type="date"
                    value={newClassStartDate}
                    onChange={(e) => setNewClassStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Ghi Chú ban đầu</label>
                <textarea
                  placeholder="Ghi chú thêm thông tin cho lớp..."
                  value={newClassNotes}
                  onChange={(e) => setNewClassNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                />
              </div>

              {/* Syllabus Attachment upload to Storage */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Giáo trình / Tài liệu đính kèm (Tùy chọn)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    onChange={handleSyllabusUpload}
                    className="hidden"
                    id="add-class-syllabus-input"
                  />
                  <label
                    htmlFor="add-class-syllabus-input"
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer transition-all"
                  >
                    <FileText className="w-4 h-4 text-emerald-500" />
                    {uploadingSyllabus ? 'Đang tải lên...' : (newClassSyllabusName || 'Chọn tệp giáo trình')}
                  </label>
                  {newClassSyllabusUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveSyllabus}
                      className="text-xs text-rose-500 hover:text-rose-700 font-semibold underline"
                    >
                      Xóa
                    </button>
                  )}
                </div>
                {uploadSyllabusProgress > 0 && uploadSyllabusProgress < 100 && (
                  <div className="w-full bg-slate-200 h-1 rounded overflow-hidden mt-1">
                    <div className="bg-emerald-500 h-full" style={{ width: `${uploadSyllabusProgress}%` }} />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingClass(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow transition-colors"
                >
                  Tạo trực tiếp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
