import React from 'react';
import { CloudUpload, History, Sparkles, LogOut, Home, FileText } from 'lucide-react';

interface PatientHomeProps {
  userName: string;
  onNavigate: (view: 'upload' | 'history' | 'analysis' | 'ai-analysis-start') => void;
  onLogout: () => void;
}

const PatientHome: React.FC<PatientHomeProps> = ({ userName, onNavigate, onLogout }) => {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans">
      {/* Navbar */}
      <header className="flex justify-between items-center px-8 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-wide">医疗影像AI诊断系统</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <button className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors">
            <Home size={18} /> 首页
          </button>
          <button className="flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors" onClick={() => onNavigate('history')}>
            <History size={18} /> 历史报告
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded text-white transition-colors"
          >
            <LogOut size={16} /> 退出
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center mb-16 animate-fade-in-up">
          <h1 className="text-5xl font-bold mb-4 tracking-tight">欢迎使用医疗AI诊断系统</h1>
          <p className="text-slate-400 text-lg">
            您可以在这里上传新的检查影像，或查看历史记录并与医生沟通。
          </p>
        </div>

        {/* Cards Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl animate-fade-in-up delay-100">
          
          {/* Upload Card */}
          <div className="group bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-10 flex flex-col items-center text-center transition-all duration-300 hover:bg-slate-900 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/20">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
              <CloudUpload size={40} className="text-blue-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-2xl font-bold mb-4">上传新的影像</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              前往诊断申请页，上传CT/MRI等医学影像，由AI与医生共同完成分析。
            </p>
            <button 
              onClick={() => onNavigate('upload')}
              className="mt-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-semibold text-white transition-colors w-40"
            >
              上传影像
            </button>
          </div>

          {/* History Card */}
          <div className="group bg-slate-900/50 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-10 flex flex-col items-center text-center transition-all duration-300 hover:bg-slate-900 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-900/20">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors duration-300">
              <History size={40} className="text-purple-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-2xl font-bold mb-4">查看历史记录与诊断结果</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              查看以往检查的诊断结果，并进入病例详情与医生进行追问沟通。
            </p>
            <button 
              onClick={() => onNavigate('history')}
              className="mt-auto px-8 py-3 bg-transparent border border-slate-600 hover:border-purple-500 hover:text-purple-400 rounded-full font-semibold text-slate-300 transition-all w-40"
            >
              查看历史记录
            </button>
          </div>

          {/* AI Analysis Card */}
          <div className="group bg-slate-900/50 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-10 flex flex-col items-center text-center transition-all duration-300 hover:bg-slate-900 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/20">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-colors duration-300">
              <Sparkles size={40} className="text-emerald-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-2xl font-bold mb-4">AI 深度分析</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              直接调用 Gemini/Python AI 引擎对影像进行即时深度解读与异常检测。
            </p>
            <button 
              onClick={() => onNavigate('ai-analysis-start')}
              className="mt-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-full font-semibold text-white transition-colors w-40"
            >
              AI 分析
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PatientHome;