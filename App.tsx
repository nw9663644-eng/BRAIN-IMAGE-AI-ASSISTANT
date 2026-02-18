import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { UserRole, UserProfile, MedicalCase, CaseMessage, AnalysisResult } from './types';
import { Brain, Activity, UserCircle, LogOut, FileText, X, MessageSquare, ClipboardList, ImageIcon, Clock, CheckCircle2, AlertCircle, Send, ChevronRight, Calendar, Bell, Scan, Tag, Dna, Network, Users, ArrowRight, Sparkles, Stethoscope, Award, MapPin } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import HeritabilityChart from './components/HeritabilityChart';
import BrainConnectivityMap from './components/BrainConnectivityMap';
import ChatInterface from './components/ChatInterface';
import LoginScreen from './components/LoginScreen';
import PatientHome from './components/PatientHome';
import UploadForm from './components/UploadForm';
import AIAnalysisView from './components/AIAnalysisView';
import { generateAnalysisResult } from './utils/mockData';
import { getToken } from './services/api';
import { getMe, logoutUser as apiLogout } from './services/authService';
import { fetchCases, createCase, sendCaseMessage, submitDiagnosis, markCaseAsRead } from './services/caseService';
import { getHealthReport } from './services/analysisService';

const App: React.FC = () => {
  // 1. Persist User Session
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('neurogen_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  // 2. Persist Navigation State
  // Updated type to include 'ai-lab'
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'chat' | 'history' | 'ai-lab'>(() => {
    return (localStorage.getItem('neurogen_active_tab') as any) || 'overview';
  });

  const [patientView, setPatientView] = useState<'dashboard' | 'upload' | 'ai-analysis-start'>(() => {
    return (localStorage.getItem('neurogen_patient_view') as any) || 'dashboard';
  });

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [medicalCases, setMedicalCases] = useState<MedicalCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<MedicalCase | null>(null);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [userAnalysis, setUserAnalysis] = useState<AnalysisResult | null>(null);

  // Doctor reply/Chat inputs
  const [doctorReplyText, setDoctorReplyText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Persistence Effects
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('neurogen_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('neurogen_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('neurogen_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('neurogen_patient_view', patientView);
  }, [patientView]);

  useEffect(() => {
    if (selectedCase) {
      localStorage.setItem('neurogen_selected_case_id', selectedCase.id);
    } else {
      localStorage.removeItem('neurogen_selected_case_id');
    }
  }, [selectedCase]);

  // ─── Backend Data Loading ──────────────────────────────
  const loadCasesFromBackend = useCallback(async () => {
    if (!currentUser || !getToken()) return;
    setIsLoadingCases(true);
    try {
      const cases = await fetchCases();
      setMedicalCases(cases);

      const savedCaseId = localStorage.getItem('neurogen_selected_case_id');
      if (savedCaseId) {
        const found = cases.find((c: MedicalCase) => c.id === savedCaseId);
        if (found) setSelectedCase(found);
      }
    } catch (err) {
      console.error('Failed to load cases:', err);
      // Fallback: try localStorage
      const storedCases = localStorage.getItem('neurogen_cases');
      if (storedCases) setMedicalCases(JSON.parse(storedCases));
    } finally {
      setIsLoadingCases(false);
    }
  }, [currentUser]);

  // Load health report from backend
  const loadHealthReport = useCallback(async () => {
    if (!currentUser) return;
    try {
      const report = await getHealthReport(currentUser.id);
      setUserAnalysis(report);
    } catch (err) {
      console.error('Failed to load health report, using local fallback:', err);
      setUserAnalysis(generateAnalysisResult(currentUser.id));
    }
  }, [currentUser]);

  // Load cases when user changes
  useEffect(() => {
    if (currentUser) {
      loadCasesFromBackend();
      loadHealthReport();
    }
  }, [currentUser, loadCasesFromBackend, loadHealthReport]);

  // Polling for real-time updates (every 15 seconds)
  useEffect(() => {
    if (!currentUser || !getToken()) return;
    const interval = setInterval(loadCasesFromBackend, 15000);
    return () => clearInterval(interval);
  }, [currentUser, loadCasesFromBackend]);

  // Update selected case when medicalCases changes (to reflect real-time updates in the active view)
  useEffect(() => {
    if (selectedCase) {
      const updatedCase = medicalCases.find(c => c.id === selectedCase.id);
      if (updatedCase) {
        setSelectedCase(updatedCase);
        // If viewing, clear unread flags
        if (currentUser) {
          if (currentUser.role === UserRole.DOCTOR && updatedCase.hasUnreadForDoctor) {
            markAsReadHandler(updatedCase.id, UserRole.DOCTOR);
          } else if (currentUser.role === UserRole.PATIENT && updatedCase.hasUnreadForPatient) {
            markAsReadHandler(updatedCase.id, UserRole.PATIENT);
          }
        }
      }
    }
  }, [medicalCases]);

  // Scroll chat to bottom when messages change
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [selectedCase?.messages]);

  const saveCasesToStorage = (cases: MedicalCase[]) => {
    setMedicalCases(cases);
    // Keep localStorage as fallback cache
    try { localStorage.setItem('neurogen_cases', JSON.stringify(cases)); } catch (e) { }
  };

  const markAsReadHandler = async (caseId: string, role: UserRole) => {
    try {
      await markCaseAsRead(caseId);
    } catch (e) { console.error('markAsRead failed:', e); }
    const updatedCases = medicalCases.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          hasUnreadForDoctor: role === UserRole.DOCTOR ? false : c.hasUnreadForDoctor,
          hasUnreadForPatient: role === UserRole.PATIENT ? false : c.hasUnreadForPatient
        };
      }
      return c;
    });
    saveCasesToStorage(updatedCases);
  };

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    // Reset views on explicit login, but keep them if restoring from session
    setActiveTab('overview');
    setPatientView('dashboard');
    setSelectedCase(null);
  };

  const handleLogout = () => {
    apiLogout();
    setCurrentUser(null);
    setSelectedCase(null);
    setActiveTab('overview');
    setPatientView('dashboard');
    setUserAnalysis(null);
  };

  const handleCaseSubmit = async (file: File | null, description: string, modality?: string, tags?: string[]) => {
    if (!currentUser) return;

    try {
      const newCase = await createCase({
        description,
        modality,
        tags,
        imageFile: file,
      });
      setMedicalCases([newCase, ...medicalCases]);
    } catch (err) {
      console.error('Failed to create case via API, using local fallback:', err);
      // Fallback: create locally with base64 image
      const now = new Date();
      const timeString = now.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

      // Convert file to base64 data URL so it survives localStorage
      let imageDataUrl: string | null = null;
      if (file) {
        imageDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const newCase: MedicalCase = {
        id: Date.now().toString(),
        patientId: currentUser.id,
        patientName: currentUser.name,
        imageUrl: imageDataUrl,
        description, timestamp: timeString, status: 'pending',
        messages: [], hasUnreadForDoctor: true, hasUnreadForPatient: false,
        modality: modality as any, tags,
      };
      saveCasesToStorage([newCase, ...medicalCases]);
    }

    setPatientView('dashboard');
    setActiveTab('history');
  };

  const handleDoctorOfficialDiagnosis = async () => {
    if (!selectedCase || !currentUser || !doctorReplyText.trim()) return;

    try {
      const updatedCase = await submitDiagnosis(selectedCase.id, doctorReplyText);
      const updatedCases = medicalCases.map(c => c.id === selectedCase.id ? updatedCase : c);
      saveCasesToStorage(updatedCases);
      setSelectedCase(updatedCase);
    } catch (err) {
      console.error('Failed to submit diagnosis:', err);
      // Fallback: update locally
      const now = new Date();
      const timeString = now.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      const updatedCases = medicalCases.map(c => {
        if (c.id === selectedCase.id) {
          return { ...c, status: 'completed' as const, doctorFeedback: doctorReplyText, doctorName: currentUser.name, replyTimestamp: timeString, hasUnreadForPatient: true };
        }
        return c;
      });
      saveCasesToStorage(updatedCases);
    }
    setDoctorReplyText('');
  };

  const handleSendChatMessage = async () => {
    if (!selectedCase || !currentUser || !chatInput.trim()) return;
    const text = chatInput;
    setChatInput('');

    try {
      const newMsg = await sendCaseMessage(selectedCase.id, text);
      const updatedCases = medicalCases.map(c => {
        if (c.id === selectedCase.id) {
          return {
            ...c,
            messages: [...c.messages, newMsg],
            hasUnreadForDoctor: currentUser.role === UserRole.PATIENT,
            hasUnreadForPatient: currentUser.role === UserRole.DOCTOR,
          };
        }
        return c;
      });
      saveCasesToStorage(updatedCases);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Fallback: add locally
      const now = new Date();
      const newMessage: CaseMessage = {
        id: Date.now().toString(), senderId: currentUser.id, senderName: currentUser.name,
        senderRole: currentUser.role, text, timestamp: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };
      const updatedCases = medicalCases.map(c => {
        if (c.id === selectedCase.id) {
          return { ...c, messages: [...c.messages, newMessage], hasUnreadForDoctor: currentUser.role === UserRole.PATIENT, hasUnreadForPatient: currentUser.role === UserRole.DOCTOR };
        }
        return c;
      });
      saveCasesToStorage(updatedCases);
    }
  };

  // userAnalysis is now loaded from backend via loadHealthReport()

  const filteredCases = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.PATIENT) {
      return medicalCases.filter(c => c.patientId === currentUser.id);
    } else {
      return medicalCases; // Doctors see all cases
    }
  }, [currentUser, medicalCases]);

  const pendingCount = useMemo(() => {
    return medicalCases.filter(c => c.status === 'pending').length;
  }, [medicalCases]);

  const unreadMessagesCount = useMemo(() => {
    if (!currentUser) return 0;
    return medicalCases.filter(c =>
      currentUser.role === UserRole.DOCTOR ? c.hasUnreadForDoctor : c.hasUnreadForPatient
    ).length;
  }, [medicalCases, currentUser]);


  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const role = currentUser.role;

  // PATIENT VIEW: Dashboard
  if (role === UserRole.PATIENT && patientView === 'dashboard' && activeTab === 'overview') {
    return (
      <PatientHome
        userName={currentUser.name}
        onNavigate={(view) => {
          if (view === 'upload') setPatientView('upload');
          else if (view === 'ai-analysis-start') setPatientView('ai-analysis-start');
          else if (view === 'analysis') setActiveTab('analysis');
          else if (view === 'history') setActiveTab('history');
        }}
        onLogout={handleLogout}
      />
    );
  }

  // PATIENT VIEW: Upload Form (For Doctor)
  if (role === UserRole.PATIENT && patientView === 'upload') {
    return (
      <UploadForm
        onBack={() => setPatientView('dashboard')}
        onSubmit={handleCaseSubmit}
      />
    );
  }

  // PATIENT VIEW: AI Deep Analysis (New Feature)
  if (role === UserRole.PATIENT && patientView === 'ai-analysis-start') {
    return (
      <AIAnalysisView
        onBack={() => setPatientView('dashboard')}
        userRole={currentUser.role}
        userName={currentUser.name}
      />
    );
  }

  // Profile Modal (Enhanced)
  const ProfileModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className={`bg-white rounded-2xl w-full ${role === UserRole.DOCTOR ? 'max-w-xl' : 'max-w-sm'} overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto`}>
        <button
          onClick={() => setShowProfileModal(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center relative">
          <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold border-2 border-white/30 shadow-xl">
            {currentUser.name[0]}
          </div>
          <h3 className="text-xl font-bold flex items-center justify-center gap-2">
            {currentUser.name}
            {role === UserRole.DOCTOR && <CheckCircle2 size={18} className="text-blue-200" />}
          </h3>
          <p className="text-white/80 text-sm mt-1">
            {role === UserRole.DOCTOR ? `工号: ${currentUser.id}` : `ID: ${currentUser.id}`}
          </p>

          {/* Doctor Title Display */}
          {role === UserRole.DOCTOR && currentUser.title && (
            <p className="text-white/95 text-sm font-semibold mt-1 tracking-wide">{currentUser.title}</p>
          )}

          {currentUser.hospital && (
            <div className="flex justify-center mt-2">
              <span className="text-white/90 text-xs font-medium bg-white/10 px-3 py-1 rounded-full border border-white/20 flex items-center gap-1">
                <MapPin size={10} />
                {currentUser.hospital}
              </span>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* Profile Content */}
          <div className="space-y-4">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 text-sm flex items-center gap-2"><UserCircle size={14} /> 角色</span>
              <span className="font-bold text-slate-700">{role === UserRole.DOCTOR ? '专家医生' : '用户'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 text-sm flex items-center gap-2"><Users size={14} /> 性别/年龄</span>
              <span className="font-bold text-slate-700">{currentUser.gender} / {currentUser.age}岁</span>
            </div>

            {/* Department Row */}
            {role === UserRole.DOCTOR && currentUser.department && (
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 text-sm flex items-center gap-2"><Stethoscope size={14} /> 科室</span>
                <span className="font-bold text-slate-700">{currentUser.department}</span>
              </div>
            )}

            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 text-sm flex items-center gap-2"><Calendar size={14} /> 注册时间</span>
              <span className="font-bold text-slate-700">{currentUser.registrationDate}</span>
            </div>

            {/* Doctor Specialties Block */}
            {role === UserRole.DOCTOR && currentUser.specialties && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                <span className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Award size={14} /> 擅长领域
                </span>
                <p className="text-sm text-slate-700 leading-relaxed text-justify">
                  {currentUser.specialties}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowProfileModal(false)}
            className="w-full mt-6 bg-slate-100 text-slate-700 font-medium py-3 rounded-xl hover:bg-slate-200 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {showProfileModal && <ProfileModal />}

      {/* Sidebar */}
      <div className={`w-64 fixed inset-y-0 left-0 z-50 flex flex-col ${role === UserRole.DOCTOR ? 'bg-slate-900' : 'bg-indigo-900'} text-white shadow-xl`}>
        <div className="p-6 border-b border-white/10 flex items-center gap-3 cursor-pointer" onClick={() => { setPatientView('dashboard'); setActiveTab('overview'); }}>
          <div className="bg-white/10 p-2 rounded-lg">
            <Brain size={24} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-wide">NeuroGen Link</span>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button
            onClick={() => {
              setActiveTab('overview');
              setPatientView('dashboard');
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'overview' ? 'bg-white/15 shadow-inner' : 'hover:bg-white/5'}`}
          >
            <Activity size={20} />
            <div className="flex-1 flex items-center justify-between">
              <span className="font-medium">{role === UserRole.DOCTOR ? '工作台 & 概览' : '概览'}</span>
              {role === UserRole.DOCTOR && pendingCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg animate-pulse">{pendingCount}</span>
              )}
            </div>
          </button>

          {role === UserRole.PATIENT && (
            <button
              onClick={() => {
                setActiveTab('history');
                setPatientView('dashboard');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'history' ? 'bg-white/15 shadow-inner' : 'hover:bg-white/5'}`}
            >
              <Clock size={20} />
              <div className="flex-1 flex items-center justify-between">
                <span className="font-medium">历史记录</span>
                {unreadMessagesCount > 0 && (
                  <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{unreadMessagesCount}</span>
                )}
              </div>
            </button>
          )}

          <button
            onClick={() => {
              setActiveTab('analysis');
              setPatientView('dashboard');
              if (role === UserRole.PATIENT) setSelectedCase(null);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'analysis' ? 'bg-white/15 shadow-inner' : 'hover:bg-white/5'}`}
          >
            <FileText size={20} />
            <span className="font-medium">{role === UserRole.DOCTOR ? '患者详情 (Detail)' : '我的健康报告'}</span>
          </button>

          {/* NEW: AI Analysis Tab for Doctors */}
          {role === UserRole.DOCTOR && (
            <button
              onClick={() => {
                setActiveTab('ai-lab');
                setPatientView('dashboard');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'ai-lab' ? 'bg-white/15 shadow-inner' : 'hover:bg-white/5'}`}
            >
              <Scan size={20} />
              <span className="font-medium">AI 影像深度分析</span>
            </button>
          )}

          <button
            onClick={() => {
              setActiveTab('chat');
              setPatientView('dashboard');
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'chat' ? 'bg-white/15 shadow-inner' : 'hover:bg-white/5'}`}
          >
            {role === UserRole.DOCTOR ? <MessageSquare size={20} /> : <UserCircle size={20} />}
            <span className="font-medium">{role === UserRole.DOCTOR ? 'AI 全科助理' : 'AI 健康顾问'}</span>
          </button>
        </nav>

        {/* User Profile Section (Bottom) */}
        <div className="p-4 border-t border-white/10">
          <div
            onClick={() => setShowProfileModal(true)}
            className="mb-4 px-4 flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-xl transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform border border-white/20">
              <span className="text-sm font-bold text-white">{currentUser.name[0]}</span>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{currentUser.name}</span>
              <span className="text-xs text-white/50 truncate">
                {role === UserRole.DOCTOR ? `Dr. ${currentUser.id}` : `ID: ***${currentUser.id.slice(-4)}`}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-white/70 hover:text-red-300 transition-colors"
          >
            <LogOut size={18} />
            <span>退出登录</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-8">
        {/* Only show the main header if we are NOT in the full-screen AI analysis mode */}
        {activeTab !== 'ai-lab' && (
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                {role === UserRole.DOCTOR ? '临床医生工作台' : `欢迎回来，${currentUser.name}`}
              </h1>
              <p className="text-slate-500 mt-1">
                {role === UserRole.DOCTOR ? '今日概览：查看患者消息、诊断申请与科研数据' : '由 NeuroGen AI 提供支持的个性化精准医疗服务'}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
              <div className={`w-2 h-2 rounded-full ${role === UserRole.DOCTOR ? 'bg-green-500 animate-pulse' : 'bg-indigo-500 animate-pulse'}`}></div>
              <span className="text-sm font-medium text-slate-600">
                数据流正常
              </span>
            </div>
          </header>
        )}

        {/* AI Analysis View for Doctor (Full Content Area) */}
        {activeTab === 'ai-lab' && (
          <div className="-m-8">
            <AIAnalysisView
              onBack={() => setActiveTab('overview')}
              userRole={currentUser.role}
              userName={currentUser.name}
            />
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-12 gap-6 animate-fade-in-up">
            {/* DOCTOR VIEW REFACTOR: Priority on Patient List */}
            {role === UserRole.DOCTOR ? (
              <>
                {/* Top Stats Row */}
                <div className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase">待处理诊断</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{pendingCount}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                      <AlertCircle size={20} />
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase">未读消息</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{unreadMessagesCount}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                      <MessageSquare size={20} />
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase">关联患者</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{new Set(medicalCases.map(c => c.patientId)).size}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Users size={20} />
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase">今日排班</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">专家门诊 (上午)</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <Calendar size={20} />
                    </div>
                  </div>
                </div>

                {/* Main Content: Patient Message List (The "Inbox") */}
                <div className="col-span-12 lg:col-span-8">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[700px]">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <MessageSquare className="text-indigo-600" size={20} />
                          患者咨询与病例列表
                        </h3>
                        <p className="text-slate-500 text-xs mt-1">实时显示患者提交的诊断申请与沟通消息</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">按时间排序</span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">只看未读</span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50 custom-scrollbar">
                      {medicalCases.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                          <ClipboardList size={48} className="mb-4 opacity-30" />
                          <p>暂无患者提交记录</p>
                        </div>
                      ) : (
                        medicalCases.map(c => {
                          const lastMsg = c.messages.length > 0 ? c.messages[c.messages.length - 1].text : c.description;
                          const isUnread = c.hasUnreadForDoctor;

                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedCase(c);
                                setActiveTab('analysis');
                                setDoctorReplyText(c.doctorFeedback || '');
                              }}
                              className={`group flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${isUnread ? 'bg-white border-l-4 border-l-orange-500 border-y-slate-200 border-r-slate-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                            >
                              {/* Avatar Area */}
                              <div className="relative shrink-0">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${c.status === 'pending' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                  {c.patientName[0]}
                                </div>
                                {isUnread && <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white animate-pulse"></div>}
                              </div>

                              {/* Content Area */}
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 text-base">{c.patientName}</span>
                                    <span className="text-xs text-slate-400">ID: {c.patientId.slice(-4)}</span>
                                    {c.modality && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">{c.modality}</span>}
                                  </div>
                                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{c.messages.length > 0 ? c.messages[c.messages.length - 1].timestamp : c.timestamp.split(' ')[0]}</span>
                                </div>

                                <p className={`text-sm truncate pr-4 ${isUnread ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                                  {isUnread ? '[新消息] ' : ''}{lastMsg}
                                </p>

                                <div className="flex items-center gap-3 mt-3">
                                  {c.status === 'pending' ? (
                                    <span className="text-[10px] flex items-center gap-1 bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 font-bold">
                                      <AlertCircle size={10} /> 待诊断
                                    </span>
                                  ) : (
                                    <span className="text-[10px] flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100 font-bold">
                                      <CheckCircle2 size={10} /> 已完成
                                    </span>
                                  )}
                                  {c.tags?.map((t, i) => (
                                    <span key={i} className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{t}</span>
                                  ))}
                                </div>
                              </div>

                              {/* Action Arrow */}
                              <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full">
                                  <ArrowRight size={16} />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Sidebar: Research & Tools */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                  {/* Small version of Heritability Chart */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
                      <Activity size={16} className="text-indigo-600" /> 科研数据监测 (Real-time)
                    </h4>
                    <div className="relative">
                      <HeritabilityChart />
                      {/* Overlay to make it static/preview-like if needed, or keep interactive */}
                    </div>
                    <div className="mt-4 text-center">
                      <button onClick={() => setActiveTab('analysis')} className="text-xs text-indigo-600 hover:underline">查看完整分析报告 &gt;</button>
                    </div>
                  </div>

                  {/* Brain Map Preview */}
                  <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg h-[450px] relative group cursor-pointer" onClick={() => setActiveTab('ai-lab')}>
                    <BrainConnectivityMap />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-white/20 backdrop-blur text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 border border-white/30">
                        <Scan size={16} /> 进入 AI 影像实验室
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-xl border border-indigo-100 shadow-sm">
                    <h4 className="font-bold text-indigo-900 mb-2 text-sm flex items-center gap-2">
                      <Sparkles size={14} /> AI 辅助提示
                    </h4>
                    <p className="text-xs text-indigo-800 leading-relaxed">
                      昨日新增 3 例 <span className="font-bold">AD 早期疑似</span> 病例。建议优先复核患者 [王建国] 的海马体体积数据与 MoCA 评分。
                    </p>
                  </div>
                </div>
              </>
            ) : (
              // PATIENT VIEW (Keep Original Logic for Patients)
              <>
                <div className="col-span-12 lg:col-span-8 space-y-6">
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="relative z-10">
                      <h3 className="font-bold text-xl mb-4 text-slate-800 flex items-center gap-2">
                        <Activity className="text-indigo-600" />
                        您的基因组与大脑概览
                      </h3>
                      <div className="prose max-w-none text-slate-600 leading-relaxed">
                        <p>
                          <span className="font-semibold text-indigo-600">{currentUser.name}</span>，您的健康档案分析已完成：
                          <br /><br />
                          根据您的基因测序结果，我们在情绪调节相关的神经回路中发现了活跃的表达信号。
                          目前您的神经可塑性处于 <span className="text-emerald-600 font-bold">最佳状态</span>。
                          建议您继续保持当前的认知训练计划，以强化海马体与皮层之间的连接强度。
                        </p>
                      </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full opacity-50 z-0 group-hover:scale-110 transition-transform duration-700"></div>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-6">
                  <BrainConnectivityMap />
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Dna size={64} className="text-indigo-900" />
                    </div>
                    <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                      <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">健康贴士</span>
                    </h4>
                    <p className="text-sm text-indigo-800 leading-relaxed z-10 relative">
                      根据您的年龄 ({currentUser.age}岁) 和性别特征，AI 建议您关注深睡眠质量。最近的研究表明，优质的睡眠有助于清除大脑代谢废物（类淋巴系统）。
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ... (Rest of the tabs: History, Analysis, Chat remain the same as previous) ... */}
        {/* Patient History View */}
        {activeTab === 'history' && role === UserRole.PATIENT && (
          <div className="max-w-4xl mx-auto animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              我的检查记录
            </h2>

            <div className="bg-[#0f172a] rounded-2xl p-6 shadow-xl border border-slate-800 min-h-[500px]">
              {filteredCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 mt-20">
                  <ClipboardList size={48} className="mb-4 opacity-50" />
                  <p>暂无记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCases.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCase(c);
                        setActiveTab('analysis');
                      }}
                      className="group flex items-center justify-between p-4 rounded-xl border border-slate-800/50 bg-[#1e293b]/50 hover:bg-[#1e293b] cursor-pointer transition-all hover:border-blue-500/30"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-slate-300 font-mono text-sm tracking-wide">
                            {c.timestamp.replace(/\//g, '.').replace(' ', ',')}
                          </span>
                          {c.modality && (
                            <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                              {c.modality}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 truncate max-w-[200px]">
                          {c.description}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        {c.hasUnreadForPatient && (
                          <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">新回复</span>
                        )}

                        {c.status === 'completed' ? (
                          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                            完成
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/30 border border-amber-500/30 text-amber-400 text-xs font-bold">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></div>
                            等待诊断
                          </span>
                        )}
                        <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analysis & Details View - WITH CHAT */}
        {activeTab === 'analysis' && (
          <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-slate-200 min-h-[500px] animate-fade-in flex flex-col">
            {/* Back button */}
            {selectedCase && (
              <button
                onClick={() => {
                  if (role === UserRole.PATIENT) setActiveTab('history');
                  else setActiveTab('overview');
                  setSelectedCase(null);
                }}
                className="mb-4 text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 self-start"
              >
                <ChevronRight className="rotate-180" size={14} /> 返回列表
              </button>
            )}

            {selectedCase ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                {/* Left Column: Case Details & Analysis */}
                <div className="space-y-6 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <ImageIcon size={18} className="text-blue-500" />
                        影像与主诉
                      </h3>
                      {selectedCase.modality && (
                        <div className="flex gap-1">
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-bold border border-blue-200">{selectedCase.modality}</span>
                          {selectedCase.tags?.map((t, i) => (
                            <span key={i} className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded border border-slate-300">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-100 flex items-center justify-center min-h-[200px] mb-4">
                      {selectedCase.imageUrl ? (
                        <img src={selectedCase.imageUrl} alt="Case" className="max-h-64 rounded object-contain" />
                      ) : (
                        <div className="text-slate-400 flex flex-col items-center">
                          <ImageIcon size={32} />
                          <span className="text-sm mt-2">无图片预览</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 uppercase font-bold">患者描述</p>
                      <p className="text-slate-800 text-sm bg-white p-3 rounded border border-slate-100">{selectedCase.description}</p>
                      <div className="flex justify-between text-xs text-slate-400 mt-2">
                        <span>患者: {selectedCase.patientName}</span>
                        <span>时间: {selectedCase.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Analysis Result */}
                  {userAnalysis && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                      <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                        <Activity size={18} /> AI 辅助分析
                      </h3>
                      <p className="text-sm text-indigo-800 leading-relaxed mb-4">
                        {userAnalysis.diagnosisSuggestion}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-lg border border-indigo-100 text-center">
                          <span className="block text-2xl font-bold text-indigo-600">{userAnalysis.riskScore.toFixed(0)}</span>
                          <span className="text-xs text-slate-500">风险评分</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-indigo-100 text-center">
                          <span className="block text-lg font-bold text-indigo-600 truncate">{userAnalysis.dominantRegion}</span>
                          <span className="text-xs text-slate-500">活跃脑区</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Interaction & Chat */}
                <div className="flex flex-col h-[600px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  {/* Chat Header */}
                  <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                      <MessageSquare size={18} className="text-green-500" />
                      医患沟通
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${selectedCase.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {selectedCase.status === 'completed' ? '诊断已完成' : '等待诊断'}
                    </span>
                  </div>

                  {/* Chat Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100/50" ref={chatScrollRef}>
                    {/* System Message for Case Creation */}
                    <div className="flex justify-center">
                      <span className="text-[10px] text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                        病例创建于 {selectedCase.timestamp}
                      </span>
                    </div>

                    {selectedCase.messages.map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      const isDoc = msg.senderRole === UserRole.DOCTOR;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`flex items-center gap-1 mb-1 text-[10px] ${isMe ? 'flex-row-reverse' : ''} text-slate-500`}>
                              <span className="font-bold">{msg.senderName}</span>
                              <span>{isDoc ? '(医生)' : '(患者)'}</span>
                              <span>• {msg.timestamp}</span>
                            </div>
                            <div className={`px-3 py-2 rounded-lg text-sm shadow-sm ${isMe
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : isDoc
                                ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                              }`}>
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Doctor's Official Diagnosis Display (if completed) */}
                    {selectedCase.status === 'completed' && selectedCase.doctorFeedback && (
                      <div className="mx-4 my-4">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 relative">
                          <div className="absolute -top-3 left-4 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 size={12} /> 专家诊断结论
                          </div>
                          <p className="text-slate-800 text-sm mt-2 whitespace-pre-wrap leading-relaxed">
                            {selectedCase.doctorFeedback}
                          </p>
                          <div className="mt-2 text-right text-xs text-green-700/60 font-medium">
                            Dr. {selectedCase.doctorName} • {selectedCase.replyTimestamp}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="bg-white p-4 border-t border-slate-200">
                    {/* If pending and user is doctor, show diagnosis box toggle or chat */}
                    {role === UserRole.DOCTOR && selectedCase.status === 'pending' && (
                      <div className="mb-4 pb-4 border-b border-slate-100">
                        <label className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                          <ClipboardList size={14} />
                          下达诊断结论 (将结束病例状态)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={doctorReplyText}
                            onChange={(e) => setDoctorReplyText(e.target.value)}
                            placeholder="输入正式诊断建议..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                          />
                          <button
                            onClick={handleDoctorOfficialDiagnosis}
                            disabled={!doctorReplyText.trim()}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 rounded font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            发送诊断
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Regular Chat Input */}
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                        placeholder="发送消息..."
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleSendChatMessage}
                        disabled={!chatInput.trim()}
                        className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:bg-slate-300 shadow-md"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // No Case Selected View (Default Analysis Tab)
              userAnalysis ? (
                <div className="flex flex-col items-center justify-center h-full space-y-8 py-10">
                  <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">遗传风险评分 (PRS)</h3>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-indigo-600">{userAnalysis.riskScore.toFixed(1)}</span>
                        <span className="text-slate-400 mb-1">/ 100</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${userAnalysis.riskScore > 50 ? 'bg-orange-400' : 'bg-emerald-400'}`}
                          style={{ width: `${userAnalysis.riskScore}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg">
                      <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-wider mb-4">AI 诊断建议</h3>
                      <p className="leading-relaxed">
                        {userAnalysis.diagnosisSuggestion}
                      </p>
                      <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-indigo-300">
                        <span>置信度: 92.4%</span>
                        <span>模型: NeuroGen-V3</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm">请从列表选择一个具体的病例以查看详情或与医生沟通。</p>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* AI Chat Tab - Cleaned up to remove redundant header */}
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <ChatInterface role={role} />
          </div>
        )}
      </div>
      <Analytics />
    </div>
  );
};

export default App;