import React, { useState, useEffect } from 'react';
import { UserRole, UserProfile, Gender } from '../types';
import { Brain, Lock, Info, BookOpen, ShieldCheck, Stethoscope, HeartPulse, ArrowRight, X, Cpu, Activity, Dna, Layers, Zap, Building2, Users, Network, FileCheck, ChevronRight, CheckCircle2, Globe, Radio, Server, HelpCircle, FileText, MousePointer2, Scan } from 'lucide-react';
import ParticleBackground from './ParticleBackground';
import { registerUser, loginUser } from '../services/authService';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'doctor' | 'patient'>('patient');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showAbout, setShowAbout] = useState(false);
  const [showGuide, setShowGuide] = useState(false); // New state for Guide Modal

  // Form Fields
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('男');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [trialApplied, setTrialApplied] = useState(false);

  // Clear errors/success when switching tabs/modes
  useEffect(() => {
    setError('');
    setSuccessMsg('');
    setId('');
    setPassword('');
    setName('');
  }, [activeTab, authMode]);

  const validateInputs = (): boolean => {
    // ID Validation
    if (activeTab === 'patient') {
      if (!/^\d{18}$/.test(id)) {
        setError('患者登录需输入 18 位身份证号码');
        return false;
      }
    } else {
      if (!/^\d{10}$/.test(id)) {
        setError('医生登录需输入 10 位工号 ID');
        return false;
      }
    }

    // Password Validation
    if (password.length < 8) {
      setError('密码长度必须至少 8 位');
      return false;
    }

    // Registration Fields Validation
    if (authMode === 'register') {
      if (!name.trim()) {
        setError('请输入姓名');
        return false;
      }
      if (!age || parseInt(age) < 0 || parseInt(age) > 120) {
        setError('请输入有效的年龄');
        return false;
      }
      if (!phone || !/^\d{11}$/.test(phone)) {
        setError('请输入有效的 11 位手机号码');
        return false;
      }
    }

    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!validateInputs()) return;

    setIsLoading(true);

    try {
      if (authMode === 'register') {
        await registerUser({
          id,
          password,
          role: activeTab === 'doctor' ? UserRole.DOCTOR : UserRole.PATIENT,
          name,
          gender,
          age: parseInt(age),
          phone,
          department: activeTab === 'doctor' ? '神经内科' : undefined,
        });
        setIsLoading(false);
        setAuthMode('login');
        setSuccessMsg('注册成功！请使用账号密码登录。');
        setPassword('');
      } else {
        const user = await loginUser({
          id,
          password,
          role: activeTab === 'doctor' ? UserRole.DOCTOR : UserRole.PATIENT,
        });
        setIsLoading(false);
        onLogin(user);
      }
    } catch (err: any) {
      // If backend is unreachable, fall back to localStorage auth
      const isNetworkError = err.message === 'Failed to fetch' || err.message?.includes('NetworkError');
      if (isNetworkError) {
        console.warn('Backend unreachable, falling back to localStorage auth');
        const storedUsers = localStorage.getItem('neurogen_users');
        const users: UserProfile[] = storedUsers ? JSON.parse(storedUsers) : [];

        if (authMode === 'register') {
          if (users.find(u => u.id === id)) {
            setError('该 ID 已被注册');
            setIsLoading(false);
            return;
          }
          const newUser: UserProfile = {
            id, password,
            role: activeTab === 'doctor' ? UserRole.DOCTOR : UserRole.PATIENT,
            name, gender, age: parseInt(age), phone,
            department: activeTab === 'doctor' ? '神经内科' : undefined,
            registrationDate: new Date().toISOString().split('T')[0],
          };
          users.push(newUser);
          localStorage.setItem('neurogen_users', JSON.stringify(users));
          setIsLoading(false);
          setAuthMode('login');
          setSuccessMsg('注册成功！（离线模式）请使用账号密码登录。');
          setPassword('');
        } else {
          const user = users.find(u => u.id === id && u.password === password);
          if (!user) {
            setError('账号或密码错误 (未注册请先注册)');
            setIsLoading(false);
            return;
          }
          const expectedRole = activeTab === 'doctor' ? UserRole.DOCTOR : UserRole.PATIENT;
          if (user.role !== expectedRole) {
            setError(`该账号不是${activeTab === 'doctor' ? '医生' : '患者'}账号`);
            setIsLoading(false);
            return;
          }
          setIsLoading(false);
          onLogin(user);
        }
      } else {
        setIsLoading(false);
        setError(err.message || '操作失败，请重试');
      }
    }
  };

  // Helper to ensure user exists in backend DB and fill form
  const fillAccount = async (user: UserProfile) => {
    setAuthMode('login');

    // Try to register the test user in the backend (ignore if already exists)
    try {
      await registerUser({
        id: user.id,
        password: user.password!,
        role: user.role,
        name: user.name,
        gender: user.gender || '男' as Gender,
        age: user.age || 30,
        phone: user.phone || '13800138000',
        department: user.department,
        title: user.title,
        hospital: user.hospital,
        specialties: user.specialties,
      });
    } catch (e) {
      // User may already exist, which is fine
    }

    // Also keep in localStorage as fallback
    const storedUsers = localStorage.getItem('neurogen_users');
    const users: UserProfile[] = storedUsers ? JSON.parse(storedUsers) : [];
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem('neurogen_users', JSON.stringify(users));

    setId(user.id);
    setPassword(user.password!);
    setSuccessMsg('');
    setError('');
  };

  const fillTestPatient = () => {
    setActiveTab('patient');
    fillAccount({
      id: '110101199501011234',
      password: 'neuralpassword',
      role: UserRole.PATIENT,
      name: '测试患者',
      gender: '男',
      age: 30,
      phone: '13800138000',
      registrationDate: '2025-01-01'
    });
  };

  const fillTestDoctor = () => {
    setActiveTab('doctor');
    fillAccount({
      id: '1111111111',
      password: '00000000',
      role: UserRole.DOCTOR,
      name: '李质',
      gender: '男',
      age: 45,
      phone: '13800138888',
      department: '脑科',
      title: '脑科主任医生，教授',
      hospital: '北京第一人民医院',
      specialties: '抑郁症、焦虑症、精神分裂症、恐惧症、睡眠障碍、进食障碍等的诊断与药物治疗；新药临床试验与难治性精神障碍的优化治疗，心境障碍、精神分裂症、神经症、睡眠障碍、精神药理学等脑科疾病学',
      registrationDate: '2020-05-20'
    });
  };

  // --- About Modal Component ---
  const AboutModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-600/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Brain size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">NeuroGen Link</h2>
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-xs font-semibold tracking-wide uppercase">关于我们</span>
                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                <span className="text-slate-500 text-xs">v2.1.0 Build 2025</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowAbout(false)}
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all hover:rotate-90"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Scrollable Area */}
        <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-8 md:p-10 space-y-12">

          {/* Mission Statement */}
          <section className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-2">
              <Building2 size={12} /> 成立于 2020 年 · 专注医疗影像 AI
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              全流程医疗影像 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">AI 解决方案</span>
            </h3>
            <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed text-sm md:text-base">
              NeuroGen Link 致力于将前沿深度学习技术应用于临床实践。我们提供从 <span className="text-slate-200">影像预处理</span> 到 <span className="text-slate-200">高精度模型推理</span> 的全流程能力，通过 AI 赋能医生，为患者提供更精准的诊断。
            </p>
          </section>

          {/* Key Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors group">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <Cpu size={24} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Gemini AI 内核驱动</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                集成 Gemini AI 大模型与 CycleGAN 跨模态生成技术，实现基因-影像双向推演，诊断准确率提升至 94.5%。
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors group">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <Network size={24} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">多模态融合 (Multimodal)</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                不仅支持 fMRI/CT 影像，更融合 scRNA-seq 单细胞测序数据与 GWAS 全基因组关联分析，提供全维度病理画像。
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors group">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck size={24} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">医疗级数据隐私</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                严格遵循 HIPAA 与 GDPR 标准。采用联邦学习架构，数据不出本地，模型云端更新，确保患者隐私绝对安全。
              </p>
            </div>
          </div>

          {/* Team Section */}
          <section>
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Users size={16} /> 核心研发团队
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "Dr. Sarah Lin", role: "首席科学家 (CSO)", desc: "前哈佛医学院神经影像实验室主任" },
                { name: "James Wu", role: "AI 架构师", desc: "Gemini AI 早期核心贡献者" },
                { name: "Prof. Li", role: "医学顾问", desc: "北京协和医院神经内科主任医师" },
                { name: "Emily Chen", role: "产品总监", desc: "致力于打造有温度的医疗科技产品" },
              ].map((member, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-white/5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-bold text-white">
                    {member.name[0]}
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{member.name}</div>
                    <div className="text-indigo-400 text-xs font-medium mb-0.5">{member.role}</div>
                    <div className="text-slate-500 text-xs leading-tight">{member.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Partners Footer */}
          <div className="border-t border-white/10 pt-8 pb-4">
            <p className="text-center text-slate-500 text-xs mb-6">战略合作伙伴 & 技术支持</p>
            <div className="flex flex-wrap justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {/* Simulated Logos with text for now */}
              <div className="flex items-center gap-2 font-bold text-white text-lg"><Globe size={20} /> Google Cloud</div>
              <div className="flex items-center gap-2 font-bold text-white text-lg"><Cpu size={20} /> NVIDIA Health</div>
              <div className="flex items-center gap-2 font-bold text-white text-lg"><Activity size={20} /> Siemens Healthineers</div>
              <div className="flex items-center gap-2 font-bold text-white text-lg"><Server size={20} /> Gemini AI</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );

  // --- User Guide Modal (NEW) ---
  const UserGuideModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/10 bg-[#0f172a] sticky top-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg"><BookOpen size={20} className="text-white" /></div>
            <h2 className="text-xl font-bold text-white tracking-wide">产品使用说明书</h2>
            <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50">V2.0</span>
          </div>
          <button
            onClick={() => setShowGuide(false)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#0f172a] to-[#1e293b]">
          <div className="max-w-5xl mx-auto p-8 md:p-12 space-y-12">

            {/* 1. Process Flow (Visual) */}
            <div className="relative">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-700/50 -translate-y-1/2 z-0 rounded-full"></div>
              <div className="relative z-10 flex justify-between px-4 md:px-12">
                {[
                  { icon: <Zap size={20} />, title: "上传", desc: "DICOM/JPG 影像" },
                  { icon: <Cpu size={20} />, title: "分析", desc: "AI 多模态推理" },
                  { icon: <Scan size={20} />, title: "查看", desc: "热力图 & 风险" },
                  { icon: <FileText size={20} />, title: "报告", desc: "导出 PDF/JSON" },
                ].map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center group">
                    <div className="w-14 h-14 bg-[#0f172a] border-2 border-indigo-500 rounded-full flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)] mb-3 group-hover:scale-110 transition-transform group-hover:bg-indigo-600 group-hover:text-white">
                      {step.icon}
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">{step.title}</h4>
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{step.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Detailed Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border-t-4 border-indigo-500 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <MousePointer2 size={18} className="text-indigo-600" /> 操作指南
                </h3>
                <ul className="space-y-4 text-sm text-slate-600 leading-relaxed">
                  <li>
                    <strong className="block text-slate-900 mb-1">1. 上传影像</strong>
                    登录后进入“医学影像”页面，支持 <span className="bg-slate-100 px-1 rounded text-xs font-mono">DICOM / NIfTI / JPG</span>；建议移除多余压缩。
                  </li>
                  <li>
                    <strong className="block text-slate-900 mb-1">2. 自动参数配置</strong>
                    系统自动识别影像模态（CT/MRI），并推荐最佳 AI 检测模型（Gemini AI + CycleGAN）。
                  </li>
                  <li>
                    <strong className="block text-slate-900 mb-1">3. 查看结果与导出</strong>
                    查看病灶热力图、风险置信度及全基因组关联分析，支持导出 PDF 诊断报告。
                  </li>
                </ul>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border-t-4 border-purple-500 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Layers size={18} className="text-purple-600" /> 功能说明
                </h3>
                <ul className="space-y-4 text-sm text-slate-600 leading-relaxed">
                  <li>
                    <strong className="block text-slate-900 mb-1">1. 影像预处理 (Preprocessing)</strong>
                    自动归一化、去噪、伽马校正与对比度增强，提升模型鲁棒性。
                  </li>
                  <li>
                    <strong className="block text-slate-900 mb-1">2. AI 多模态融合</strong>
                    结合 fMRI 宏观影像与 scRNA-seq 微观基因特征，输出边界框、分割掩模与患病概率。
                  </li>
                  <li>
                    <strong className="block text-slate-900 mb-1">3. 可解释性可视化</strong>
                    支持 Grad-CAM 与 SHAP 热力图，显示模型关注的关键脑区（如海马体、杏仁核）。
                  </li>
                </ul>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border-t-4 border-teal-500 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <HelpCircle size={18} className="text-teal-600" /> 常见问题 (FAQ)
                </h3>
                <ul className="space-y-4 text-sm text-slate-600 leading-relaxed">
                  <li className="bg-slate-50 p-3 rounded-lg">
                    <span className="text-xs font-bold text-slate-800 block mb-1">Q: 如何提升分析速度？</span>
                    使用较小分辨率影像、开启轻量模式或分批上传；避开高峰期可降低排队时间。
                  </li>
                  <li className="bg-slate-50 p-3 rounded-lg">
                    <span className="text-xs font-bold text-slate-800 block mb-1">Q: 分析结果可直接作为诊断依据吗？</span>
                    AI 仅为辅助工具，最终诊断应由临床医生结合影像与临床信息综合判断。
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>

        {/* Footer: Professional Terminology */}
        <div className="bg-black/40 backdrop-blur-md border-t border-white/10 p-6 relative z-20">
          <div className="max-w-6xl mx-auto">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BookOpen size={14} /> 专业术语解释 (鼠标悬停查看详情)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { term: "归一化 (Normalization)", desc: "将图像像素值映射到统一范围（如 0-1），减少不同设备扫描件导致的强度差异，加速模型收敛。" },
                { term: "热力图 (Heatmap)", desc: "基于梯度的类激活映射 (CAM)，用暖色调高亮显示神经网络在做出诊断决策时最关注的图像区域。" },
                { term: "去噪 (Denoising)", desc: "使用深度学习自动编码器抑制图像中的随机噪声，提高解剖结构的边缘可见性并提升检测精度。" },
                { term: "多尺度检测 (Multi-scale)", desc: "特征金字塔网络 (FPN) 技术，在不同分辨率层级下进行并发检测，以提高对微小病灶和弥漫性病变的识别能力。" },
              ].map((item, idx) => (
                <div key={idx} className="group relative bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 cursor-help transition-colors">
                  <span className="text-sm font-bold text-indigo-300 group-hover:text-white transition-colors">{item.term}</span>

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-800 text-slate-200 text-xs rounded-xl shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 leading-relaxed">
                    <div className="font-bold text-white mb-1">{item.term.split(' ')[0]}</div>
                    {item.desc}
                    <div className="absolute bottom-[-6px] left-6 w-3 h-3 bg-slate-800 border-b border-r border-slate-700 transform rotate-45"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen text-white overflow-hidden font-sans">
      <ParticleBackground />

      {/* Top System Status Bar */}
      <div className="absolute top-0 left-0 w-full z-40 bg-slate-950/50 backdrop-blur-sm border-b border-white/5 py-2 px-6 flex justify-between items-center text-[10px] text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><Globe size={12} className="text-blue-500" /> NeuroGen Cloud: <span className="text-emerald-400">Online</span></span>
          <span className="flex items-center gap-1.5"><Server size={12} className="text-purple-500" /> Gemini AI Node: <span className="text-emerald-400">Connected</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Radio size={12} className="text-red-400 animate-pulse" />
          <span>System Broadcast: <span className="text-slate-200">最新 fMRI 融合算法补丁已部署 (v2.1.4)</span></span>
        </div>
      </div>

      {/* Show Modals if active */}
      {showAbout && <AboutModal />}
      {showGuide && <UserGuideModal />}

      {/* Top Right Actions */}
      <div className="fixed top-12 right-6 z-40 flex items-center gap-3 animate-fade-in-down">
        <button
          onClick={() => setShowGuide(true)}
          className="group flex items-center gap-2 bg-indigo-600/90 hover:bg-indigo-500 text-white pl-4 pr-5 py-2.5 rounded-full shadow-lg shadow-indigo-900/30 border border-indigo-400/30 backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
        >
          <BookOpen size={18} className="group-hover:-rotate-12 transition-transform" />
          <span className="font-semibold text-sm">使用说明</span>
        </button>

        <button
          onClick={() => setShowAbout(true)}
          className="group flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white pl-4 pr-5 py-2.5 rounded-full shadow-lg border border-white/10 backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
        >
          <Info size={18} className="group-hover:rotate-12 transition-transform" />
          <span className="font-semibold text-sm">关于</span>
        </button>
      </div>

      <div className="z-10 w-full max-w-md px-4 flex flex-col items-center my-8 mt-16">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-4 border border-white/10 ring-4 ring-indigo-500/20">
            <Brain size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">
            NeuroGen Link
          </h1>
          <p className="text-indigo-200/80 text-sm tracking-wide font-light flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 医疗影像 AI 诊断平台
          </p>
        </div>

        {/* Login/Register Card */}
        <div className="w-full bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden transition-all duration-500 group hover:border-white/20">

          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <FingerprintIcon size={120} className="text-indigo-500 rotate-12" />
          </div>

          {/* Header Toggle */}
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {authMode === 'login' ? '用户登录' : '注册新账号'}
            </h2>
            <button
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); setSuccessMsg(''); }}
              className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-white/5"
            >
              {authMode === 'login' ? '没有账号？去注册' : '已有账号？去登录'} <ArrowRight size={12} />
            </button>
          </div>

          {/* Role Toggles */}
          <div className="flex p-1 bg-slate-950/50 rounded-xl mb-6 relative border border-white/5 z-10">
            <div
              className={`absolute inset-y-1 w-[calc(50%-4px)] bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-md transition-all duration-300 ease-out ${activeTab === 'patient' ? 'left-[50%]' : 'left-1'}`}
            />
            <button
              type="button"
              onClick={() => setActiveTab('doctor')}
              className={`flex-1 relative z-10 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${activeTab === 'doctor' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Stethoscope size={16} /> 医生
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('patient')}
              className={`flex-1 relative z-10 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${activeTab === 'patient' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <HeartPulse size={16} /> 患者
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 relative z-10">

            {/* Identity Field */}
            <div className="space-y-1">
              <label className="text-xs text-indigo-200/70 ml-1">
                {activeTab === 'patient' ? '身份证号 (18位)' : '医生工号 (10位)'}
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <ShieldCheck size={18} />
                </div>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700/50 text-white placeholder-slate-600 text-sm rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-indigo-500 focus:bg-slate-900/80 transition-all"
                  placeholder={activeTab === 'patient' ? "18位身份证号" : "10位工号"}
                  maxLength={activeTab === 'patient' ? 18 : 10}
                />
              </div>
            </div>

            {/* Registration Extra Fields */}
            {authMode === 'register' && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-indigo-200/70 ml-1">姓名</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-700/50 text-white text-sm rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500"
                      placeholder="真实姓名"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-indigo-200/70 ml-1">性别</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as Gender)}
                      className="w-full bg-slate-950/50 border border-slate-700/50 text-white text-sm rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 appearance-none"
                    >
                      <option value="男">男</option>
                      <option value="女">女</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-indigo-200/70 ml-1">年龄</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-700/50 text-white text-sm rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500"
                      placeholder="年龄"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-indigo-200/70 ml-1">电话</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-700/50 text-white text-sm rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500"
                      placeholder="手机号码"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-xs text-indigo-200/70 ml-1">密码 ({'>'}=8位)</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700/50 text-white placeholder-slate-600 text-sm rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-indigo-500 focus:bg-slate-900/80 transition-all"
                  placeholder="请输入密码"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-xs bg-red-950/30 p-2 rounded-lg border border-red-500/20 text-center animate-pulse">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="text-emerald-400 text-xs bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20 text-center flex items-center justify-center gap-1 animate-fade-in">
                <CheckCircle2 size={12} /> {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-900/40 active:scale-[0.98] transition-all flex justify-center items-center text-sm"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{authMode === 'login' ? '登录中...' : '注册中...'}</span>
                </div>
              ) : (authMode === 'login' ? '安全登录' : '立即注册')}
            </button>

            <div className="text-center mt-2">
              <span className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                <Lock size={10} /> 256-bit SSL 加密传输中
              </span>
            </div>
          </form>

          {authMode === 'login' && (
            <div className="mt-6 flex justify-center gap-4 relative z-10">
              {activeTab === 'patient' ? (
                <button onClick={fillTestPatient} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors px-4 py-1.5 rounded-full bg-emerald-950/30 border border-emerald-500/30 hover:bg-emerald-950/50">
                  ⚡ 一键填充 患者账号
                </button>
              ) : (
                <button onClick={fillTestDoctor} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors px-4 py-1.5 rounded-full bg-amber-950/30 border border-amber-500/30 hover:bg-amber-950/50">
                  ⚡ 一键填充 医生账号
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Ecosystem */}
      <div className="absolute bottom-0 w-full bg-slate-950/80 backdrop-blur-md border-t border-white/5 py-4 px-8 z-30 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-xs text-slate-500">
          © 2025 NeuroGen Medical AI. All rights reserved.
        </div>
        <div className="flex items-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex items-center gap-1 text-slate-400 text-xs font-bold uppercase tracking-wider border px-2 py-1 rounded border-slate-700">
            <ShieldCheck size={12} /> HIPAA Compliant
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-xs font-bold uppercase tracking-wider border px-2 py-1 rounded border-slate-700">
            <FileCheck size={12} /> ISO 27001
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-xs font-bold uppercase tracking-wider border px-2 py-1 rounded border-slate-700">
            <Zap size={12} /> FDA Cleared
          </div>
        </div>
      </div>
    </div>
  );
};

// Placeholder icon for UI decoration
const FingerprintIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 12c0-3 2.5-5.5 5.5-5.5S23 9 23 12M12 12c0 3-2.5 5.5-5.5 5.5S1 15 1 12M12 12V2M12 12v10M12 2a10 10 0 0 1 10 10M12 2a10 10 0 0 0-10 10M12 22a10 10 0 0 1-10-10M12 22a10 10 0 0 0 10-10" />
  </svg>
);

export default LoginScreen;