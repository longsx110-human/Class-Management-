import React, { useState, useEffect } from 'react';
import { 
  Toast, ToastMessage 
} from './components/Toast';
import { 
  User, Class, ClassRequest, AuditLog, EnrollmentLog, UserRole 
} from './types';
import { 
  INITIAL_USERS, INITIAL_CLASSES, INITIAL_REQUESTS, INITIAL_AUDIT_LOGS 
} from './data/mockData';
import { ClassDashboard } from './components/ClassDashboard';
import { ClassRequestForm } from './components/ClassRequestForm';
import { RequestManager } from './components/RequestManager';
import { EnrollmentTracker } from './components/EnrollmentTracker';
import { UserManagement } from './components/UserManagement';
import { ActionLogs } from './components/ActionLogs';
import { AdminUserTracker } from './components/AdminUserTracker';
import { 
  GraduationCap, ClipboardList, ShieldAlert, Users, 
  Settings, LogOut, CheckSquare, PlusCircle, LogIn, Lock, Mail, UserPlus, FileText 
} from 'lucide-react';

import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { 
  collection, 
  doc, 
  setDoc as firebaseSetDoc, 
  getDoc, 
  getDocs, 
  onSnapshot,
  getDocFromServer,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';

const cleanFirestoreData = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(cleanFirestoreData);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    Object.keys(obj).forEach((key) => {
      if (obj[key] !== undefined) {
        cleaned[key] = cleanFirestoreData(obj[key]);
      }
    });
    return cleaned;
  }
  return obj;
};

const setDoc = async (docRef: any, data: any, options?: any) => {
  return firebaseSetDoc(docRef, cleanFirestoreData(data), options);
};
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('stx_active_user');
    return cached ? JSON.parse(cached) : null;
  });

  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [classes, setClasses] = useState<Class[]>(INITIAL_CLASSES);
  const [requests, setRequests] = useState<ClassRequest[]>(INITIAL_REQUESTS);
  const [enrollmentLogs, setEnrollmentLogs] = useState<EnrollmentLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [selectedUserForView, setSelectedUserForView] = useState<User | null>(null);

  // Login credentials states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // TOAST TRIGGERS
  const showToast = (text: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    const newToast: ToastMessage = {
      id: `toast_${Date.now()}`,
      text,
      type
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const handleRemoveToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // AUDIT LOGGER
  const logAction = async (userObj: User, action: string, details: string) => {
    const newLog: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId: userObj.id,
      userName: userObj.name,
      userRole: userObj.role,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'auditLogs', newLog.id), newLog);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `auditLogs/${newLog.id}`);
    }
  };

  // Connection check & Bootstrap helper
  async function testConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  }

  const bootstrapDatabaseIfEmpty = async () => {
    try {
      const classesSnap = await getDocs(collection(db, 'classes'));
      if (classesSnap.empty) {
        for (const cls of INITIAL_CLASSES) {
          await setDoc(doc(db, 'classes', cls.id), cls);
        }
      }
      const usersSnap = await getDocs(collection(db, 'users'));
      if (usersSnap.empty) {
        for (const u of INITIAL_USERS) {
          // Strip the "password" field to strictly match isValidUser rule schema keys (id, name, email, role, isActive - exactly 5)
          const cleanUser = {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            isActive: u.isActive
          };
          await setDoc(doc(db, 'users', u.id), cleanUser);
        }
      }
      const reqSnap = await getDocs(collection(db, 'classRequests'));
      if (reqSnap.empty) {
        for (const r of INITIAL_REQUESTS) {
          await setDoc(doc(db, 'classRequests', r.id), r);
        }
      }
      const auditSnap = await getDocs(collection(db, 'auditLogs'));
      if (auditSnap.empty) {
        for (const a of INITIAL_AUDIT_LOGS) {
          await setDoc(doc(db, 'auditLogs', a.id), a);
        }
      }
    } catch (err) {
      console.warn('Bootstrapping error:', err);
    }
  };

  const [authStateUser, setAuthStateUser] = useState<any>(null);

  // 1. Auth state monitor hook
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthStateUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userEmail = firebaseUser.email?.toLowerCase();
          if (!userEmail) {
            setCurrentUser(null);
            setAuthStateUser(null);
            await signOut(auth);
            showToast('Email không hợp lệ.', 'error');
            return;
          }

          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const appUser = userDoc.data() as User;
            if (!appUser.isActive) {
              setCurrentUser(null);
              setAuthStateUser(null);
              await signOut(auth);
              showToast('🔒 Tài khoản đã bị tạm khóa. Vui lòng liên hệ Admin!', 'error');
              return;
            }
            setCurrentUser(appUser);
            localStorage.setItem('stx_active_user', JSON.stringify(appUser));
          } else {
            // Check if there is an admin-created temp user doc with this email
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', userEmail));
            const qSnap = await getDocs(q);
            
            let matchedTempUser: User | null = null;
            let matchedTempDocId: string | null = null;
            
            qSnap.forEach((d) => {
              const u = d.data() as User;
              if (d.id !== firebaseUser.uid) {
                matchedTempUser = u;
                matchedTempDocId = d.id;
              }
            });
            
            if (matchedTempUser) {
              const tempUser = matchedTempUser as User;
              if (!tempUser.isActive) {
                setCurrentUser(null);
                setAuthStateUser(null);
                await signOut(auth);
                showToast('🔒 Tài khoản đã bị tạm khóa. Vui lòng liên hệ Admin!', 'error');
                return;
              }
              
              // Migrate temporary ID to authenticated Firebase uid
              const cleanUser = {
                id: firebaseUser.uid,
                name: tempUser.name,
                email: tempUser.email,
                role: tempUser.role,
                isActive: tempUser.isActive,
                createdAt: tempUser.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              
              await setDoc(userDocRef, cleanUser);
              if (matchedTempDocId) {
                await deleteDoc(doc(db, 'users', matchedTempDocId));
              }
              
              setCurrentUser(cleanUser as User);
              localStorage.setItem('stx_active_user', JSON.stringify(cleanUser));
            } else if (userEmail === 'longsx110@gmail.com') {
              // Create default root admin on first launch
              const cleanUser = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'Admin tối cao',
                email: userEmail,
                role: 'admin' as UserRole,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              await setDoc(userDocRef, cleanUser);
              setCurrentUser(cleanUser as User);
              localStorage.setItem('stx_active_user', JSON.stringify(cleanUser));
            } else {
              setCurrentUser(null);
              setAuthStateUser(null);
              await signOut(auth);
              showToast('🔒 Email này chưa được Admin cấp tài khoản hệ thống!', 'error');
            }
          }
        } catch (err) {
          console.error("Error matching user in Firestore:", err);
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem('stx_active_user');
      }
      setIsFirebaseReady(true);
    });

    return () => unsubAuth();
  }, []);

  // 2. Realtime subscriber hooks - only start once authenticated
  useEffect(() => {
    if (!currentUser) {
      // Offline fallback
      setUsers(INITIAL_USERS);
      setClasses(INITIAL_CLASSES);
      setRequests(INITIAL_REQUESTS);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      return;
    }

    testConnection().then(() => {
      bootstrapDatabaseIfEmpty();
    });

    const isAdminUser = currentUser.role === 'admin' || currentUser.email === 'longsx110@gmail.com';

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      const list: Class[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as Class);
      });
      setClasses(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'classes');
    });

    const usersQuery = isAdminUser 
      ? collection(db, 'users')
      : query(collection(db, 'users'), where('id', '==', currentUser.id));

    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      const list: User[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as User);
      });
      setUsers(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    const requestsQuery = isAdminUser
      ? collection(db, 'classRequests')
      : query(collection(db, 'classRequests'), where('submittedBy', '==', currentUser.id));

    const unsubRequests = onSnapshot(requestsQuery, (snap) => {
      const list: ClassRequest[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as ClassRequest);
      });
      setRequests(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'classRequests');
    });

    const enrollmentLogsQuery = isAdminUser
      ? collection(db, 'enrollmentLogs')
      : query(collection(db, 'enrollmentLogs'), where('updatedBy', '==', currentUser.id));

    const unsubEnrollmentLogs = onSnapshot(enrollmentLogsQuery, (snap) => {
      const list: EnrollmentLog[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as EnrollmentLog);
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEnrollmentLogs(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'enrollmentLogs');
    });

    const auditLogsQuery = isAdminUser
      ? collection(db, 'auditLogs')
      : query(collection(db, 'auditLogs'), where('userId', '==', currentUser.id));

    const unsubAuditLogs = onSnapshot(auditLogsQuery, (snap) => {
      const list: AuditLog[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as AuditLog);
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'auditLogs');
    });

    return () => {
      unsubClasses();
      unsubUsers();
      unsubRequests();
      unsubEnrollmentLogs();
      unsubAuditLogs();
    };
  }, [currentUser?.id, currentUser?.role]);

  // AUTH HANDLERS
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      showToast('Đăng nhập Google thành công!', 'success');
    } catch (err: any) {
      showToast(`Lỗi đăng nhập Google: ${err.message}`, 'error');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      showToast('Vui lòng điền đầy đủ Email và Mật khẩu!', 'warning');
      return;
    }

    const email = loginEmail.trim().toLowerCase();
    const password = loginPassword;

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          // If auth fails, check if Admin pre-created their document
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', email));
          const qSnap = await getDocs(q);
          let foundUser: any = null;
          let oldDocId: string | null = null;
          
          qSnap.forEach(d => {
            foundUser = d.data();
            oldDocId = d.id;
          });

          // To allow them to log in for the first time, password must be 'password123' 
          // or whatever was set as foundUser.password
          if (foundUser && (password === 'password123' || password === foundUser.password)) {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Migrate old document to new UID!
            const fbUid = userCredential.user.uid;
            const newDocRef = doc(db, 'users', fbUid);
            const cleanUser = {
              id: fbUid,
              name: foundUser.name,
              email: foundUser.email,
              role: foundUser.role,
              isActive: foundUser.isActive,
              createdAt: foundUser.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await setDoc(newDocRef, cleanUser);
            
            if (oldDocId && oldDocId !== fbUid) {
              await deleteDoc(doc(db, 'users', oldDocId));
            }
          } else if (email === 'longsx110@gmail.com') {
             userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } else {
             if (foundUser) showToast('Mật khẩu của tài khoản chưa chính xác!', 'error');
             else showToast('Tài khoản này hiện chưa được Admin tạo trên hệ thống.', 'error');
             throw err;
          }
        } else {
          throw err;
        }
      }
      
      const fbUid = userCredential.user.uid;
      const userDocRef = doc(db, 'users', fbUid);
      const userDoc = await getDoc(userDocRef);
      let appUser: User;
      
      if (userDoc.exists()) {
        appUser = userDoc.data() as User;
      } else {
        appUser = {
          id: fbUid,
          name: email.split('@')[0],
          email: email,
          role: email === 'longsx110@gmail.com' ? 'admin' : 'sales',
          isActive: true
        };
        const cleanUser = {
          id: appUser.id,
          name: appUser.name,
          email: appUser.email,
          role: appUser.role,
          isActive: appUser.isActive
        };
        await setDoc(userDocRef, cleanUser);
      }

      if (!appUser.isActive) {
        await signOut(auth);
        showToast('Tài khoản này hiện đang bị tạm khóa. Vui lòng liên hệ Admin!', 'error');
        return;
      }

      setCurrentUser(appUser);
      localStorage.setItem('stx_active_user', JSON.stringify(appUser));
      setActiveTab('dashboard');
      await logAction(appUser, 'Đăng nhập', `Người dùng ${appUser.name} đã đăng nhập vào hệ thống.`);
      showToast(`Chào mừng trở lại, ${appUser.name}!`, 'success');
    } catch (err: any) {
      showToast(`Lỗi đăng nhập: ${err.message || err}`, 'error');
    }
  };



  const handleLogout = async () => {
    if (currentUser) {
      await logAction(currentUser, 'Đăng xuất', `Người dùng ${currentUser.name} đã đăng xuất.`);
    }
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Signout Auth error:', err);
    }
    setCurrentUser(null);
    localStorage.removeItem('stx_active_user');
    setLoginPassword('');
    showToast('Bạn đã đăng xuất thành công khỏi hệ thống.', 'info');
  };

  // APPLICATION STATE MODIFICATION PROP-FUNCTIONS
  const handleUpdateClass = async (updatedClass: Class, changeReason?: string) => {
    if (!currentUser) return;

    try {
      await setDoc(doc(db, 'classes', updatedClass.id), updatedClass);
      await logAction(currentUser, 'Cập nhật Lớp học', changeReason || `Chỉnh sửa lớp ${updatedClass.name}`);
      showToast(`Đã lưu cập nhật lớp học: ${updatedClass.name}`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `classes/${updatedClass.id}`);
    }
  };

  const handleAddClass = async (newClass: Class) => {
    if (!currentUser) return;
    
    try {
      await setDoc(doc(db, 'classes', newClass.id), newClass);
      await logAction(currentUser, 'Thêm mới Lớp học', `Admin trực tiếp tạo lớp học mới ${newClass.name} (ID: ${newClass.id})`);
      showToast(`Đã tạo trực tiếp lớp học mới ${newClass.name}!`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `classes/${newClass.id}`);
    }
  };

  // Convert "Upcoming" class to "Active" officially
  const handleConfirmClassOpening = async (classId: string) => {
    if (!currentUser) return;

    const matchedClass = classes.find((c) => c.id === classId);
    if (!matchedClass) return;

    const updated: Class = {
      ...matchedClass,
      status: 'active',
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'classes', classId), updated);

      const newEnrollLog: EnrollmentLog = {
        id: `en_log_${Date.now()}`,
        classId: matchedClass.id,
        className: matchedClass.name,
        updatedBy: currentUser.id,
        updatedByName: currentUser.name,
        previousCount: matchedClass.enrolledCount,
        newCount: matchedClass.enrolledCount,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'enrollmentLogs', newEnrollLog.id), newEnrollLog);

      await logAction(
        currentUser, 
        'Khai giảng chính thức', 
        `Xác nhận mở lớp thành công. Chuyển lớp ${matchedClass.name} từ Sắp khai giảng thành Đang hoạt động.`
      );
      showToast(`Chúc mừng! Lớp ${matchedClass.name} đã được khai giảng và chuyển sang Đang hoạt động!`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `classes/${classId}`);
    }
  };

  // Sales Submit form to request a new class
  const handleSalesSubmitRequest = async (
    requestFormData: Omit<ClassRequest, 'id' | 'submittedBy' | 'submittedByName' | 'status' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!currentUser) return;

    const newRequest: ClassRequest = {
      ...requestFormData,
      id: `req_${Date.now()}`,
      submittedBy: currentUser.id,
      submittedByName: currentUser.name,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'classRequests', newRequest.id), newRequest);

      await logAction(
        currentUser, 
        'Đề xuất mở lớp', 
        `Gửi yêu cầu mở lớp cấp độ ${newRequest.requestedLevel} với số lượng quan tâm ban đầu là ${newRequest.interestCount}`
      );
      showToast('Đã gửi đề xuất mở lớp học mới thành công. Hãy chờ Admin xét duyệt!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `classRequests/${newRequest.id}`);
    }
  };

  // Admin approves Class Request -> Converts to a real upcoming Class and automatically populates initial students
  const handleAdminApproveRequest = async (
    requestId: string, 
    classDetails: Omit<Class, 'id' | 'enrolledCount' | 'status' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!currentUser) return;

    const matchedReq = requests.find((r) => r.id === requestId);
    if (!matchedReq) return;

    const newClassId = `class_${Date.now()}`;
    const newClass: Class = {
      ...classDetails,
      id: newClassId,
      enrolledCount: matchedReq.interestCount,
      status: 'upcoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedRequest: ClassRequest = {
      ...matchedReq,
      status: 'approved',
      approvedClassId: `${classDetails.name} (Mã: ${newClassId})`,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'classes', newClassId), newClass);
      await setDoc(doc(db, 'classRequests', requestId), updatedRequest);

      const initialLog: EnrollmentLog = {
        id: `en_log_${Date.now()}`,
        classId: newClassId,
        className: newClass.name,
        updatedBy: matchedReq.submittedBy,
        updatedByName: `${matchedReq.submittedByName} (Sales khởi tạo)`,
        previousCount: 0,
        newCount: matchedReq.interestCount,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'enrollmentLogs', initialLog.id), initialLog);

      await logAction(
        currentUser, 
        'Duyệt đề xuất & Tạo lớp', 
        `Phê duyệt yêu cầu ${requestId}. Khởi tạo lớp học tuyển sinh ${newClass.name} thành công.`
      );
      showToast(`Đã duyệt đề xuất thành công và tạo lớp: ${newClass.name}!`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `classes/${newClassId}`);
    }
  };

  // Admin rejects Class Request
  const handleAdminRejectRequest = async (requestId: string, reason: string) => {
    if (!currentUser) return;

    const matchedReq = requests.find((r) => r.id === requestId);
    if (!matchedReq) return;

    const updatedRequest: ClassRequest = {
      ...matchedReq,
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'classRequests', requestId), updatedRequest);

      await logAction(
        currentUser, 
        'Từ chối đề xuất', 
        `Bác bỏ yêu cầu đề xuất mở lớp ${requestId} với lý do: "${reason}"`
      );
      showToast('Đã bác bỏ đề nghị mở lớp học mới.', 'warning');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `classRequests/${requestId}`);
    }
  };

  // Academic staff / Sales updates enrollment numbers
  const handleUpdateEnrollment = async (cls: Class, previousCount: number, newCount: number) => {
    if (!currentUser) return;

    let finalStatus = cls.status;
    if (newCount >= cls.maxCapacity && cls.status === 'active') {
      finalStatus = 'full';
    } else if (newCount < cls.maxCapacity && cls.status === 'full') {
      finalStatus = 'active';
    }

    const updatedClass: Class = {
      ...cls,
      enrolledCount: newCount,
      status: finalStatus,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'classes', cls.id), updatedClass);

      const newLog: EnrollmentLog = {
        id: `en_log_${Date.now()}_${Math.random().toString(36).substr(2, 3)}`,
        classId: cls.id,
        className: cls.name,
        updatedBy: currentUser.id,
        updatedByName: currentUser.name,
        previousCount,
        newCount,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'enrollmentLogs', newLog.id), newLog);

      await logAction(
        currentUser, 
        'Điều chỉnh sĩ số', 
        `Sửa sĩ số lớp ${cls.name} từ ${previousCount} thành ${newCount}.`
      );
      showToast(`Đã đổi sĩ số lớp ${cls.name} sang ${newCount}!`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `classes/${cls.id}`);
    }
  };

  // Add User (Admin task)
  const handleAdminAddUser = async (userFormData: Omit<User, 'id'>) => {
    if (!currentUser) return;

    const newUser: User = {
      ...userFormData,
      id: `user_${Date.now()}`
    };

    const cleanUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isActive: newUser.isActive
    };

    try {
      await setDoc(doc(db, 'users', newUser.id), cleanUser);
      
      await logAction(
        currentUser,
        'Đăng ký tài khoản',
        `Tạo mới tài khoản cho ${newUser.name} làm nhiệm vụ ${newUser.role.toUpperCase()}`
      );
      showToast(`Đăng ký thành công tài khoản cho ${newUser.name}!`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${newUser.id}`);
    }
  };

  // Update existing User status/role
  const handleAdminUpdateUser = async (userId: string, updates: Partial<User>) => {
    if (!currentUser) return;

    const matched = users.find(u => u.id === userId);
    if (!matched) return;

    const updated: User = { ...matched, ...updates };

    const cleanUser = {
      id: userId,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive
    };

    try {
      await setDoc(doc(db, 'users', userId), cleanUser);

      let actionLabel = 'Chỉnh sửa tài khoản';
      let detailString = `Cập nhật thông tin chi tiết của tài khoản ${matched.name}`;

      if (updates.isActive !== undefined) {
        actionLabel = updates.isActive ? 'Kích hoạt tài khoản' : 'Khóa tài khoản';
        detailString = updates.isActive 
          ? `Mở khóa hoạt động lại cho tài khoản ${matched.name}` 
          : `Vô hiệu hóa hoạt động tài khoản ${matched.name}`;
      }

      if (updates.role !== undefined) {
        actionLabel = 'Thay đổi vai trò';
        detailString = `Đổi nhóm quyền của ${matched.name} từ ${matched.role.toUpperCase()} thành ${updates.role.toUpperCase()}`;
      }

      await logAction(currentUser, actionLabel, detailString);
      showToast('Cập nhật tài khoản thành công!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  // Delete existing User (with super-admin check for admin accounts)
  const handleAdminDeleteUser = async (userId: string) => {
    if (!currentUser) return;

    const matched = users.find(u => u.id === userId);
    if (!matched) return;

    if (matched.role === 'admin' && currentUser.email !== 'longsx110@gmail.com') {
      showToast('🔒 Chỉ Admin (longsx110@gmail.com) mới có quyền xóa tài khoản Admin!', 'error');
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));

      await logAction(
        currentUser,
        'Xóa tài khoản',
        `Xóa vĩnh viễn tài khoản của ${matched.name} (${matched.email})`
      );
      showToast('Đã xóa tài khoản!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  const handleClearLogs = async () => {
    if (!currentUser) return;
    const initialLog: AuditLog = {
      id: `audit_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'Xử lý nhật ký',
      details: 'Ghi nhận yêu cầu dọn dẹp hệ thống (Không thể xóa lịch sử bất biến theo quy tắc bảo mật học vụ).',
      timestamp: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'auditLogs', initialLog.id), initialLog);
      showToast('Đã ghi nhận hành động. Theo chính sách bảo mật bất biến, logs lịch sử không được phép xóa.', 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `auditLogs/${initialLog.id}`);
    }
  };


  // TAB RENDER DICTIONARY
  const renderActiveScreen = () => {
    if (!currentUser) return null;
    const effectiveUser = selectedUserForView || currentUser;

    switch (activeTab) {
      case 'dashboard':
        return (
          <ClassDashboard 
            classes={classes} 
            currentUser={effectiveUser} 
            onUpdateClass={handleUpdateClass}
            onAddClass={(effectiveUser.role === 'admin' || effectiveUser.role === 'hoc_vu') ? handleAddClass : undefined}
            onConfirmClassOpening={handleConfirmClassOpening}
          />
        );
      case 'requests':
        if (effectiveUser.role === 'sales') {
          return (
            <ClassRequestForm 
              currentUser={effectiveUser}
              requests={requests}
              onSubmitRequest={handleSalesSubmitRequest}
            />
          );
        } else {
          // Admin & Học vụ see management board
          return (
            <RequestManager 
              currentUser={effectiveUser}
              requests={requests}
              onApproveRequest={handleAdminApproveRequest}
              onRejectRequest={handleAdminRejectRequest}
            />
          );
        }
      case 'enrollment':
        return (
          <EnrollmentTracker 
            classes={classes}
            currentUser={effectiveUser}
            onUpdateEnrollment={handleUpdateEnrollment}
            onConfirmClassOpening={handleConfirmClassOpening}
            enrollmentLogs={enrollmentLogs}
          />
        );
      case 'users':
        if (effectiveUser.role !== 'admin') {
          return (
            <div className="bg-rose-50 border border-rose-200 p-8 rounded-xl text-center text-rose-700">
              🔒 Chỉ Admin mới có quyền truy cập chức năng này.
            </div>
          );
        }
        return (
          <UserManagement 
            users={users} 
            onAddUser={handleAdminAddUser} 
            onUpdateUser={handleAdminUpdateUser}
            onDeleteUser={handleAdminDeleteUser}
            currentUser={effectiveUser}
          />
        );
      case 'audit_logs':
        if (effectiveUser.role !== 'admin') {
          return (
            <div className="bg-rose-50 border border-rose-200 p-8 rounded-xl text-center text-rose-700">
              🔒 Chỉ Admin mới có quyền truy cập chức năng này.
            </div>
          );
        }
        return (
          <ActionLogs 
            logs={auditLogs} 
            onClearLogs={handleClearLogs}
          />
        );
      default:
        return (
          <div className="p-8 text-center text-slate-400">
            Chương trình lỗi: Screen "{activeTab}" không hỗ trợ.
          </div>
        );
    }
  };

  if (!isFirebaseReady) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
          <p className="text-slate-500 text-sm font-medium">Đang khởi động hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans" id="main-root-workspace">
      {/* GLOBAL TOAST BANNER CONTAINER */}
      <Toast toasts={toasts} onRemove={handleRemoveToast} />

      {/* RENDER LOGIN / SIGN UP FLOW IF NOT AUTHENTICATED */}
      {!currentUser ? (
        <div className="flex-1 flex flex-col justify-center items-center p-4 py-12 md:py-16 select-none bg-gradient-to-tr from-emerald-50/40 via-slate-50 to-teal-50/30">
          <div className="max-w-md w-full space-y-6">
            
            {/* Logo/Branding Block */}
            <div className="text-center space-y-2">
              <div className="bg-white px-4 py-2 border border-slate-200/80 rounded-2xl shadow-sm inline-flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest leading-none">Hệ thống nội bộ</span>
              </div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 tracking-tight leading-none uppercase">
                Sáng Tạo Xanh
              </h1>
              <p className="text-slate-500 text-sm font-medium">
                Quản lý lớp học kết nối phòng tuyển sinh, học vụ và quản lý
              </p>
            </div>

            {/* Standard Login Forms */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5" />

              {/* LOGIN FORM */}
              <form onSubmit={handleLoginSubmit} className="space-y-4" id="login-form-submit">
                <h3 className="font-extrabold text-slate-800 text-lg text-center flex items-center justify-center gap-1.5 uppercase tracking-wide">
                  <LogIn className="w-5 h-5 text-emerald-600" /> ĐĂNG NHẬP HỆ THỐNG
                </h3>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Email Đăng Nhập</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="ten.nhanvien@sangtaoxanh.edu.vn"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      id="login-email-input"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-600 uppercase">Mật Khẩu</label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      id="login-password-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-xl text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                  id="btn-login-submit"
                >
                  Đăng Nhập
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hoặc</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  id="btn-google-login"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Tiếp tục với Google
                </button>

                <div className="text-center pt-2 text-xs font-semibold text-slate-400">
                  🔒 Hệ thống nội bộ - Vui lòng hệ Admin để cấp tài khoản.
                </div>
              </form>
            </div>


          </div>
        </div>
      ) : (
        /* RENDER AUTHENTICATED BOARD SYSTEM */
        (() => {
          const isSystemAdmin = currentUser.id === '040SrB7DPsQr7IHKF4VjGfQUqfz1' || currentUser.email === 'longsx110@gmail.com';
          const effectiveUser = selectedUserForView || currentUser;

          return (
            <>
              {/* ADMIN MODE BANNER FOR ACTIVE IMPERSONATION */}
              {isSystemAdmin && selectedUserForView && (
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 px-4 shadow-md font-sans border-b border-orange-700 animate-fade-in z-50 relative">
                  <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-white/20 text-white font-extrabold px-3 py-1 rounded-full text-[10px] uppercase tracking-widest border border-white/10 animate-pulse">
                        👑 Admin View (Badge)
                      </span>
                      <span className="text-xs sm:text-sm font-bold">
                        Bạn đang kiểm tra với tư cách: <strong className="underline text-indigo-100 font-extrabold">{selectedUserForView.name}</strong> ({selectedUserForView.role.toUpperCase()})
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedUserForView(null)}
                      className="px-4 py-1.5 bg-white text-orange-600 hover:text-orange-700 font-extrabold rounded-lg text-xs hover:bg-slate-50 transition-all shadow-sm shrink-0 cursor-pointer"
                      id="btn-exit-impersonation"
                    >
                      Trở lại Admin Dashboard
                    </button>
                  </div>
                </div>
              )}

              {/* HEADER CONTAINER */}
              <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm px-4 md:px-8 py-3.5">
                <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
                  {/* Brand Title */}
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-2.5 rounded bg-gradient-to-b from-emerald-500 to-teal-600 shrink-0" />
                    <div>
                      <h1 className="text-lg md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 tracking-tight leading-none">
                        SÁNG TẠO XANH
                      </h1>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5 block">
                        Class Management Portal {isSystemAdmin && <span className="text-indigo-600 font-extrabold ml-1">● Admin Badged</span>}
                      </span>
                    </div>
                  </div>

                  {/* Active User details & logout */}
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-slate-800">{currentUser.name}</div>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          Vai trò: {currentUser.role === 'admin' ? 'Quản trị' : currentUser.role === 'hoc_vu' ? 'Học vụ' : 'Kinh Doanh'}
                        </span>
                      </div>
                    </div>

                    <div className="h-9 w-9 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center font-extrabold text-emerald-700">
                      {currentUser.name.split(' ').pop()?.substring(0, 2)}
                    </div>

                    {/* Log Out button */}
                    <button
                      onClick={handleLogout}
                      className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Đăng xuất khỏi hệ thống"
                      id="btn-logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </header>

              {/* IF ADMIN AND DIRECTLY IN MAIN DASHBOARD, RENDER AdminUserTracker DIRECTLY */}
              {isSystemAdmin && !selectedUserForView ? (
                <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 animate-fade-in">
                  <AdminUserTracker 
                    users={users}
                    classes={classes}
                    requests={requests}
                    auditLogs={auditLogs}
                    onSelectUser={(u) => setSelectedUserForView(u)}
                  />
                </main>
              ) : (
                <>
                  {/* DYNAMIC NAVIGATION TABS IN COMPLIANCE WITH ROLE RESTRICTIONS */}
                  <nav className="bg-white border-b border-slate-200 px-4 md:px-8">
                    <div className="max-w-7xl mx-auto flex space-x-1 overflow-x-auto py-2">
                      
                      {/* Column 1: Universal dashboard */}
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`py-2 px-3 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all flex items-center gap-1.5 whitespace-nowrap ${
                          activeTab === 'dashboard' 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/10 font-extrabold' 
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                        id="nav-tab-dashboard"
                      >
                        📊 Lớp học Đang Chạy
                      </button>

                      {/* Column 2: Class Requests (Sales submits, Admin approvals) */}
                      <button
                        onClick={() => setActiveTab('requests')}
                        className={`py-2 px-3 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all flex items-center gap-1.5 whitespace-nowrap relative ${
                          activeTab === 'requests' 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/10 font-extrabold' 
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                        id="nav-tab-requests"
                      >
                        {effectiveUser.role === 'sales' ? '📝 Đề xuất mở lớp' : '📥 Duyệt đề xuất mở lớp'}
                        {effectiveUser.role !== 'sales' && requests.filter(r => r.status === 'pending').length > 0 && (
                          <span className="bg-emerald-500 text-white font-extrabold h-4 w-4 rounded-full flex items-center justify-center text-[9px]">
                            {requests.filter(r => r.status === 'pending').length}
                          </span>
                        )}
                      </button>

                      {/* Column 3: Enrollment Progress Tracker */}
                      <button
                        onClick={() => setActiveTab('enrollment')}
                        className={`py-2 px-3 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all flex items-center gap-1.5 whitespace-nowrap relative ${
                          activeTab === 'enrollment' 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/10 font-extrabold' 
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                        id="nav-tab-enrollment"
                      >
                        🚀 Bảng tuyển sinh lớp chờ
                        {classes.filter(c => c.status === 'upcoming').length > 0 && (
                          <span className="bg-emerald-500 text-white font-extrabold h-4 w-4 rounded-full flex items-center justify-center text-[9px]">
                            {classes.filter(c => c.status === 'upcoming').length}
                          </span>
                        )}
                      </button>

                      {/* Column 4: Admin Exclusive Accounts config */}
                      {effectiveUser.role === 'admin' && (
                        <button
                          onClick={() => setActiveTab('users')}
                          className={`py-2 px-3 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'users' 
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/10 font-extrabold' 
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          id="nav-tab-users"
                        >
                          👨‍👩‍👧‍👦 Cấu hình phân quyền
                        </button>
                      )}

                      {/* Column 5: Admin Exclusive Database checkups logs */}
                      {effectiveUser.role === 'admin' && (
                        <button
                          onClick={() => setActiveTab('audit_logs')}
                          className={`py-2 px-3 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'audit_logs' 
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/10 font-extrabold' 
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          id="nav-tab-logs"
                        >
                          📜 Nhật ký hoạt động
                        </button>
                      )}
                    </div>
                  </nav>

                  {/* APPLICATION MAIN STAGE */}
                  <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 animate-fade-in">
                    {renderActiveScreen()}
                  </main>
                </>
              )}

              {/* Humble footer */}
              <footer className="py-4 border-t border-slate-200 text-center text-slate-400 text-[11px] font-medium bg-white">
                <p>Hệ thống Quản lý Lớp học Sáng Tạo Xanh &copy; 2026. Thiết kế theo tiêu chuẩn trải nghiệm nội bộ tập trung.</p>
              </footer>
            </>
          );
        })()
      )}
    </div>
  );
}
