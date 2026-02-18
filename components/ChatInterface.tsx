import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Eraser, MessageSquare, ChevronRight, Stethoscope, Pill, BrainCircuit, Activity, Globe, Info } from 'lucide-react';
import { ChatMessage, UserRole } from '../types';
import { callDeepSeekAPI, DeepSeekMessage } from '../services/deepSeekService';
import { SYSTEM_INSTRUCTION } from '../constants';

interface ChatInterfaceProps {
  role: UserRole;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ role }) => {
  // Initialize state from localStorage or use default welcome message
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(`neurogen_ai_chat_history_${role}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Revive Date objects
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    } catch (e) {
      console.warn("Failed to load chat history", e);
    }

    return [{
      id: '1',
      role: 'model',
      text: role === UserRole.DOCTOR
        ? "您好，医生。我是您的全科医学科研助理。无论是查询疑难杂症、检索前沿文献，还是探讨临床病理，我都能为您提供支持。\n\n已连接 Gemini AI 全网医学知识库，随时为您服务。"
        : "您好！我是您的 24 小时 AI 健康顾问。我可以回答您的任何健康疑问，解释体检报告，或提供生活建议。请问今天感觉如何？",
      timestamp: new Date()
    }];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`neurogen_ai_chat_history_${role}`, JSON.stringify(messages));
  }, [messages, role]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Safety timeout — auto-cancel after 30 seconds to prevent stuck loading
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'user') {
          return [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'model' as const,
            text: '⏱️ 请求超时。请检查网络连接或刷新页面后重试。',
            timestamp: new Date()
          }];
        }
        return prev;
      });
    }, 30000);

    try {
      const roleInstruction = role === UserRole.DOCTOR
        ? " [当前用户是一名临床医生。请使用专业医学术语，提供详细的机制解释。]"
        : " [当前用户是一名患者。请使用通俗易懂的类比，语气亲切温和。]";

      const apiMessages: DeepSeekMessage[] = [
        { role: 'system', content: SYSTEM_INSTRUCTION + roleInstruction },
        ...newMessages.slice(1).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text
        } as DeepSeekMessage))
      ];

      const responseText = await callDeepSeekAPI(apiMessages);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "Gemini 正在思考，但未返回内容。",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      console.error("Chat Error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `抱歉，连接 AI 服务时出现问题：${error.message}。\n请刷新页面后重试。`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      clearTimeout(safetyTimeout);
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    const resetState = [{
      id: Date.now().toString(),
      role: 'model' as const,
      text: role === UserRole.DOCTOR
        ? "会话已重置。我是您的全科医学 AI 助理，请问有什么新问题？"
        : "会话已重置。我是您的 AI 健康顾问，请问还有什么可以帮您？",
      timestamp: new Date()
    }];
    setMessages(resetState);
    localStorage.removeItem(`neurogen_ai_chat_history_${role}`);
  };

  const quickQuestions = role === UserRole.DOCTOR ? [
    { icon: <BrainCircuit size={14} />, text: "解释阿尔茨海默病的淀粉样蛋白假说" },
    { icon: <Activity size={14} />, text: "最新的高血压防治指南要点" },
    { icon: <Pill size={14} />, text: "免疫检查点抑制剂的副作用" },
  ] : [
    { icon: <Stethoscope size={14} />, text: "经常头痛需要做 CT 吗？" },
    { icon: <BrainCircuit size={14} />, text: "如何改善深度睡眠？" },
    { icon: <Activity size={14} />, text: "感冒和流感的区别" },
  ];

  return (
    <div className="flex flex-col h-[750px] bg-white/50 rounded-[32px] shadow-2xl border border-white/60 overflow-hidden font-sans relative backdrop-blur-xl">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none bg-gradient-to-b from-indigo-100/50 via-purple-50/30 to-white/80"></div>

      {/* Header */}
      <div className="relative z-10 px-6 py-5 flex items-center justify-between border-b border-white/40 bg-white/40 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/10 transform transition-transform hover:scale-105 border border-white/50 ${role === UserRole.DOCTOR ? 'bg-gradient-to-br from-indigo-600 to-purple-700' : 'bg-gradient-to-br from-teal-500 to-emerald-600'}`}>
            <Bot size={26} className="text-white drop-shadow-md" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 tracking-tight">
              {role === UserRole.DOCTOR ? 'NeuroGen Research AI' : 'NeuroGen Health AI'}
            </h3>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Gemini AI 联网模型
            </p>
          </div>
        </div>

        <button
          onClick={clearHistory}
          className="group p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-full transition-all border border-transparent hover:border-slate-200 shadow-sm hover:shadow"
          title="清空对话历史"
        >
          <Eraser size={18} className="group-hover:-rotate-12 transition-transform" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth z-0 custom-scrollbar">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
              <div className={`flex items-end gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>

                {/* Avatar */}
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-white/80 ${isUser ? 'bg-slate-800' : 'bg-white'}`}>
                  {isUser ? <User size={16} className="text-white" /> : <Sparkles size={16} className="text-indigo-600" />}
                </div>

                {/* Bubble */}
                <div className={`relative px-5 py-4 shadow-sm text-[15px] leading-relaxed transition-all hover:shadow-md ${isUser
                  ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-2xl rounded-br-sm'
                  : 'bg-white/80 backdrop-blur-sm text-slate-700 border border-white/60 rounded-2xl rounded-bl-sm'
                  }`}>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  <div className={`text-[10px] mt-2 font-medium opacity-60 ${isUser ? 'text-indigo-100 text-right' : 'text-slate-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex items-end gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm border border-white/80">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
              </div>
              <div className="bg-white/60 backdrop-blur-sm px-5 py-4 rounded-2xl rounded-bl-sm shadow-sm border border-white/50 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-200"></span>
                </div>
                <span className="text-xs text-slate-500 font-medium">Gemini 正在思考...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length < 3 && !isLoading && (
        <div className="px-6 pb-2 z-10">
          <div className="flex flex-wrap gap-2.5 justify-center">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q.text)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/70 hover:bg-white border border-white/50 hover:border-indigo-200 rounded-xl text-xs text-slate-600 hover:text-indigo-700 transition-all shadow-sm hover:shadow-md backdrop-blur-sm group"
              >
                <span className="text-indigo-400 group-hover:scale-110 transition-transform">{q.icon}</span>
                {q.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-5 relative z-20">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-0 group-focus-within:opacity-10 transition-opacity blur-md"></div>
          <div className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-lg shadow-slate-200/50 transition-all group-focus-within:border-indigo-300 group-focus-within:shadow-indigo-100 group-focus-within:ring-4 group-focus-within:ring-indigo-50/50">
            <MessageSquare size={20} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={role === UserRole.DOCTOR ? "输入医学问题、病例或研究课题..." : "问我任何关于健康的问题..."}
              className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-[15px] text-slate-700 placeholder:text-slate-400 h-10"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${!input.trim()
                ? 'bg-slate-100 text-slate-300'
                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-110 active:scale-95'
                }`}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={input.trim() ? 'ml-0.5' : ''} />}
            </button>
          </div>
        </div>
        <div className="text-center mt-3 flex items-center justify-center gap-1.5 opacity-60">
          <Info size={10} className="text-slate-400" />
          <span className="text-[10px] text-slate-400">AI 生成内容仅供参考，不作为最终诊断依据</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;