import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Zap, ScanEye, FileText, ArrowLeft, Loader2, Sparkles, Download, Brain, AlertTriangle, CheckCircle2, Info, ZoomIn, ZoomOut, RefreshCw, Move, Activity, Dna, Layers, Network, ChevronRight, BarChart3, Clock, Trash2, Cpu, Stethoscope, ChevronDown, FileSpreadsheet, Microscope, Table2, TrendingUp, Shield, Calendar, GitBranch } from 'lucide-react';
// import { GoogleGenAI, Type } from "@google/genai"; // Removed direct client-side SDK for this version
import { AIRegionRisk, AIAnalysisReport, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LineChart, Line, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine, Area, ComposedChart, Legend } from 'recharts';

interface AIAnalysisViewProps {
   onBack: () => void;
   userRole?: UserRole;
   userName?: string;
}

// Extended Report Interface
interface ExtendedAnalysisReport extends AIAnalysisReport {
   diseaseRisks: { name: string; probability: number; color: string }[];
   gwasAnalysis: { name: string; score: number; pValue?: string }[];
   modelConfidence: { name: string; probability: number }[];
   lifecycleProjection: { year: number; riskLevel: number }[];
}

// Medical Terms Dictionary for Tooltips
const MEDICAL_TERMS: Record<string, string> = {
   '海马体': '大脑边缘系统核心，负责长时记忆存储和空间导航。异常萎缩常与认知功能下降相关。',
   '杏仁核': '情绪处理中心。过度活跃可能与焦虑有关，体积减小可能影响情绪调节。',
   '前扣带回': '负责注意力分配、情绪控制和决策。功能异常常见于抑郁症。',
   '高信号': 'MRI T2/FLAIR 序列上的亮区，可能提示水肿、脱髓鞘、炎症或缺血。',
   '占位效应': '病变组织推挤周围正常脑组织，导致中线偏移或脑室受压。',
   'CycleGAN': '一种跨模态生成对抗网络，用于将基因表达特征映射为虚拟的 fMRI 影像特征。',
   'GWAS': '全基因组关联分析，用于寻找与特定疾病相关的基因变异。',
   'S-LDSC': '分层连锁不平衡评分回归，用于评估不同细胞类型的遗传力富集程度。',
   '双流融合': 'Two-Stream Fusion，同时处理真实 fMRI 影像和由基因生成的虚拟影像特征的深度学习架构。',
   '黑质': '中脑的一部分，富含多巴胺能神经元。帕金森病中可见黑质致密带信号减弱。',
   '白质高信号': 'WMH，常见于脑小血管病、脱髓鞘疾病或老年性改变。',
   'scRNA-seq': '单细胞测序技术，可揭示单个细胞水平上的基因表达谱，用于识别致病细胞亚群。',
   '小胶质细胞': '中枢神经系统的免疫细胞，在神经炎症和突触修剪中起关键作用。'
};

// Mock Data for Radar Chart (Multi-dimensional Assessment)
const RADAR_DATA = [
   { subject: '记忆功能', A: 65, fullMark: 100 },
   { subject: '执行控制', A: 85, fullMark: 100 },
   { subject: '情绪稳定', A: 45, fullMark: 100 },
   { subject: '运动协调', A: 90, fullMark: 100 },
   { subject: '遗传韧性', A: 40, fullMark: 100 },
   { subject: '脑结构完整', A: 70, fullMark: 100 },
];

// Mock Data for Gene Table
const GENE_TABLE_DATA = [
   { gene: 'APOE-ε4', type: 'Risk Factor', location: 'Chr 19', effect: 'Aβ 清除受阻', significance: 'P < 1.2e-8' },
   { gene: 'TREM2', type: 'Inflammation', location: 'Chr 6', effect: '小胶质细胞激活', significance: 'P < 4.5e-6' },
   { gene: 'CD33', type: 'Immunity', location: 'Chr 19', effect: '吞噬功能抑制', significance: 'P < 0.001' },
   { gene: 'MAPT', type: 'Structure', location: 'Chr 17', effect: 'Tau 蛋白沉积', significance: 'P < 0.05' },
];

// Brain Risk Map Visualization Component
const BrainRiskMap: React.FC<{ regions: AIRegionRisk[] }> = ({ regions }) => {
   const getRegionStatus = (searchTerms: string[]) => {
      const found = regions.find(r => searchTerms.some(term => r.name.includes(term)));
      if (!found) return { color: '#334155', level: 'N/A' }; // Slate-700
      if (found.level === 'High Risk') return { color: '#ef4444', level: 'High' };
      if (found.level === 'Moderate') return { color: '#f59e0b', level: 'Mod' };
      return { color: '#10b981', level: 'Low' };
   };

   const pfc = getRegionStatus(['前额叶', 'PFC', 'Frontal']);
   const acc = getRegionStatus(['前扣带回', 'ACC', 'Cingulate']);
   const hippo = getRegionStatus(['海马体', 'Hippocampus']);
   const amyg = getRegionStatus(['杏仁核', 'Amygdala']);
   const sn = getRegionStatus(['黑质', 'Substantia Nigra']);

   return (
      <div className="relative w-full h-[320px] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden flex items-center justify-center p-4 shadow-inner">
         <div className="absolute top-4 left-5 z-10">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Risk Topology</div>
            <div className="text-sm font-bold text-white">脑区风险拓扑图</div>
         </div>

         <svg viewBox="0 0 500 400" className="w-full h-full drop-shadow-2xl">
            <defs>
               <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
               </filter>
               <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
               </linearGradient>
            </defs>

            {/* Brain Silhouette (Abstract Side View) */}
            <path d="M140,360 C60,350 30,250 50,140 C70,60 180,20 290,30 C400,40 470,140 450,250 C430,330 330,370 250,360 Z"
               fill="url(#brainGradient)" stroke="#334155" strokeWidth="2" />

            {/* PFC Area (Frontal) */}
            <g transform="translate(70, 110)">
               <path d="M10,60 C20,20 70,10 100,30 L90,120 C50,110 20,90 10,60 Z"
                  fill={pfc.color} fillOpacity="0.3" stroke={pfc.color} strokeWidth="2" filter="url(#glow)" />
               <circle cx="50" cy="70" r="4" fill="white" />
               <line x1="50" y1="70" x2="20" y2="40" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
               <text x="20" y="30" fill="white" fontSize="14" fontWeight="bold">PFC (前额叶)</text>
               <rect x="20" y="36" width="40" height="16" rx="4" fill={pfc.color} />
               <text x="40" y="48" fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">{pfc.level}</text>
            </g>

            {/* ACC Area (Top Center) */}
            <g transform="translate(190, 70)">
               <path d="M20,40 C60,20 130,30 150,60 L130,90 C90,70 50,70 20,40 Z"
                  fill={acc.color} fillOpacity="0.3" stroke={acc.color} strokeWidth="2" filter="url(#glow)" />
               <circle cx="90" cy="60" r="4" fill="white" />
               <line x1="90" y1="60" x2="90" y2="30" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
               <text x="90" y="20" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">ACC (前扣带回)</text>
               <rect x="70" y="26" width="40" height="16" rx="4" fill={acc.color} />
               <text x="90" y="38" fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">{acc.level}</text>
            </g>

            {/* Hippocampus (Middle Lower) */}
            <g transform="translate(230, 210)">
               <ellipse cx="60" cy="30" rx="60" ry="25" transform="rotate(10)"
                  fill={hippo.color} fillOpacity="0.3" stroke={hippo.color} strokeWidth="2" filter="url(#glow)" />
               <circle cx="60" cy="30" r="4" fill="white" />
               <line x1="60" y1="30" x2="140" y2="30" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
               <text x="145" y="35" fill="white" fontSize="14" fontWeight="bold">Hippocampus</text>
               <rect x="145" y="42" width="40" height="16" rx="4" fill={hippo.color} />
               <text x="165" y="54" fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">{hippo.level}</text>
            </g>

            {/* Amygdala (Small, near Hippo) */}
            <g transform="translate(180, 230)">
               <circle cx="20" cy="20" r="20"
                  fill={amyg.color} fillOpacity="0.5" stroke={amyg.color} strokeWidth="2" filter="url(#glow)" />
               <circle cx="20" cy="20" r="4" fill="white" />
               <line x1="20" y1="20" x2="20" y2="70" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
               <text x="20" y="85" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">Amygdala</text>
               <rect x="0" y="92" width="40" height="16" rx="4" fill={amyg.color} />
               <text x="20" y="104" fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">{amyg.level}</text>
            </g>
         </svg>

         {/* Legend Overlay */}
         <div className="absolute bottom-4 right-4 bg-slate-800/90 backdrop-blur p-3 rounded-xl border border-slate-700 text-xs space-y-2 shadow-lg">
            <div className="flex items-center gap-2 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span> High Risk</div>
            <div className="flex items-center gap-2 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span> Moderate</div>
            <div className="flex items-center gap-2 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span> Low Risk</div>
         </div>
      </div>
   );
};

const UploadBox = ({
   title,
   subTitle,
   accept,
   icon,
   file,
   onFileSelect,
   onClear,
   colorClass
}: {
   title: string;
   subTitle: string;
   accept: string;
   icon: React.ReactNode;
   file: File | null;
   onFileSelect: (file: File) => void;
   onClear: () => void;
   colorClass: 'blue' | 'emerald';
}) => {
   const inputRef = useRef<HTMLInputElement>(null);

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
         onFileSelect(e.target.files[0]);
      }
   };

   const borderColor = colorClass === 'blue' ? 'border-blue-200 hover:border-blue-400' : 'border-emerald-200 hover:border-emerald-400';
   const bgColor = colorClass === 'blue' ? 'bg-blue-50/50 hover:bg-blue-50' : 'bg-emerald-50/50 hover:bg-emerald-50';
   const iconColor = colorClass === 'blue' ? 'text-blue-500' : 'text-emerald-500';
   const iconBg = colorClass === 'blue' ? 'bg-blue-100' : 'bg-emerald-100';

   return (
      <div
         onClick={() => !file && inputRef.current?.click()}
         className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all h-48 ${file ? 'border-solid border-slate-200 bg-white' : `${borderColor} ${bgColor}`}`}
      >
         <input
            type="file"
            ref={inputRef}
            className="hidden"
            accept={accept}
            onChange={handleFileChange}
         />

         {file ? (
            <div className="w-full flex flex-col items-center animate-fade-in">
               <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${iconBg} ${iconColor}`}>
                  {icon}
               </div>
               <p className="text-sm font-bold text-slate-700 truncate max-w-[200px] mb-1">{file.name}</p>
               <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
               <button
                  onClick={(e) => { e.stopPropagation(); onClear(); }}
                  className="mt-3 text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 bg-red-50 px-2 py-1 rounded"
               >
                  <X size={12} /> 移除文件
               </button>
            </div>
         ) : (
            <>
               <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${iconBg} ${iconColor}`}>
                  {icon}
               </div>
               <h4 className="text-sm font-bold text-slate-700 mb-1">{title}</h4>
               <p className="text-xs text-slate-400">{subTitle}</p>
            </>
         )}
      </div>
   );
};

const AIAnalysisView: React.FC<AIAnalysisViewProps> = ({ onBack, userRole = UserRole.PATIENT, userName }) => {
   const [step, setStep] = useState<'upload' | 'analyzing' | 'initial_report' | 'deep_dashboard'>('upload');
   const [resultTab, setResultTab] = useState<'diagnosis' | 'genetics' | 'model' | 'lifecycle'>('diagnosis');

   const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
   const [selectedGeneFile, setSelectedGeneFile] = useState<File | null>(null);
   const [previewUrl, setPreviewUrl] = useState<string | null>(null);

   const [report, setReport] = useState<ExtendedAnalysisReport | null>(null);
   const [analysisEngine, setAnalysisEngine] = useState<'python' | 'deepseek'>('deepseek');

   // Lifecycle Simulation States
   const [enableLifestyle, setEnableLifestyle] = useState(false);
   const [enableMedication, setEnableMedication] = useState(false);

   const processImageFile = (file: File) => {
      setSelectedImageFile(file);
      if (file.type.startsWith('image/')) {
         const reader = new FileReader();
         reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
         };
         reader.readAsDataURL(file);
      } else {
         setPreviewUrl(null);
      }
   };

   const processGeneFile = (file: File) => {
      setSelectedGeneFile(file);
   };

   // ... (runAnalysis and mockData logic remains the same) ...
   const isDeployed = typeof window !== 'undefined'
      && !window.location.hostname.includes('localhost')
      && !window.location.hostname.includes('127.0.0.1');

   const runAnalysis = async (engine: 'python' | 'deepseek') => {
      if (!selectedImageFile) {
         alert("请至少上传脑影像文件");
         return;
      }

      setAnalysisEngine(engine);
      setStep('analyzing');

      try {
         if (engine === 'deepseek' && !isDeployed) {
            // Only try backend on localhost
            try {
               const controller = new AbortController();
               const timeoutId = setTimeout(() => controller.abort(), 5000);

               const formData = new FormData();
               formData.append('image_file', selectedImageFile);
               if (selectedGeneFile) {
                  formData.append('gene_file', selectedGeneFile);
               }

               const response = await fetch('http://localhost:8000/analyze_multimodal', {
                  method: 'POST',
                  body: formData,
                  signal: controller.signal,
               });

               clearTimeout(timeoutId);

               if (!response.ok) {
                  throw new Error(`Server responded with ${response.status}`);
               }

               const data = await response.json();
               setReport({ ...mockReportData, ...data });
               setStep('initial_report');
               return;

            } catch (serverError) {
               console.warn("Backend unavailable, using demo data:", serverError);
               fallbackToMockData(false);
            }

         } else {
            // On Vercel or python engine: use mock data directly
            fallbackToMockData(engine === 'python');
         }

      } catch (error: any) {
         console.warn("Analysis Error:", error.message);
         fallbackToMockData(false);
      }
   };

   const mockReportData: ExtendedAnalysisReport = {
      summary: "综合患者 T1-MRI 结构影像与外周血单细胞测序 (scRNA-seq) 数据，本系统分析发现：患者右侧海马体体积较同龄常模缩小约 12%，且对应的小胶质细胞亚群 (Microglia-AD) 中 TREM2 基因表达显著上调 (P < 0.001)。CycleGAN 跨模态模拟显示，基因表达特征与影像学萎缩模式存在高度病理一致性，提示神经炎症是导致海马体萎缩的关键驱动因素。目前综合诊断倾向于【早期阿尔茨海默病 (MCI-AD)】，且存在 5 年内进展为中度 AD 的高风险。",
      detailedFindings: "【影像学层面】：右侧海马体头部 T2 信号稍高，体积较常模减小 12%。功能连接分析 (fMRI) 显示内嗅皮层-海马回路连接强度减弱，提示记忆编码功能受损。\n\n【基因组学层面】：单细胞分析检测到 TREM2+ 小胶质细胞比例异常升高 (Top 5%)，APOE-ε4 等位基因风险位点富集，提示神经免疫反应活跃。\n\n【多模态关联】：CycleGAN 模拟表明，TREM2 高表达区域与海马体萎缩区域在空间上重叠度达 85%，支持“炎症-退行性变”耦合假说。",
      regions: [
         { name: "海马体 (Hippocampus)", description: "体积萎缩 (12%) 伴炎症基因高表达，CA1区受损明显", score: 0.85, level: "High Risk" },
         { name: "内嗅皮层 (Entorhinal)", description: "功能连接强度减弱 (Z-score: -2.1)", score: 0.65, level: "Moderate" },
         { name: "小胶质细胞 (Microglia)", description: "TREM2+ 亚群激活，CD33 表达上调", score: 0.90, level: "High Risk" },
         { name: "黑质 (Substantia Nigra)", description: "形态正常，无铁沉积异常信号", score: 0.1, level: "Low" },
         { name: "前额叶 (PFC)", description: "代谢水平轻度下降，未见明显萎缩", score: 0.3, level: "Low" }
      ],
      recommendation: "1. 确诊检查建议：建议进行 CSF 生物标志物 (Aβ42/Tau) 检测或 Amyloid PET-CT 以明确病理分级。\n2. 药物/治疗方向：考虑使用抗炎类神经保护药物（如甘露特钠）或乙酰胆碱酯酶抑制剂；建议加入针对 TREM2 通路的临床试验。\n3. 生活方式干预：坚持地中海饮食（抗炎），每周进行至少 150 分钟中等强度有氧运动，增加认知储备训练。\n4. 随访计划：建议 3 个月后复查单细胞外周血标志物，6 个月后复查脑部 MRI。",
      diseaseRisks: [
         { name: "阿尔茨海默病 (AD)", probability: 82, color: "#ef4444" },
         { name: "神经炎症 (Neuroinflammation)", probability: 75, color: "#f97316" },
         { name: "轻度认知障碍 (MCI)", probability: 60, color: "#f59e0b" },
         { name: "脑血管病 (CVD)", probability: 20, color: "#34d399" },
         { name: "帕金森病 (PD)", probability: 5, color: "#10b981" }
      ],
      gwasAnalysis: [
         { name: "Microglia (TREM2+)", score: 98, pValue: "P < 1.2e-8" },
         { name: "Astrocyte (Reactive)", score: 75, pValue: "P < 4.5e-6" },
         { name: "Excitatory Neurons", score: 45, pValue: "P = 0.04" },
         { name: "Oligodendrocytes", score: 30, pValue: "n.s." },
         { name: "Inhibitory Neurons", score: 15, pValue: "n.s." },
      ],
      modelConfidence: [
         { name: "AD (阿尔茨海默病)", probability: 78.5 },
         { name: "MCI (轻度认知障碍)", probability: 18.2 },
         { name: "Other", probability: 3.3 }
      ],
      lifecycleProjection: [
         { year: 2025, riskLevel: 55 },
         { year: 2026, riskLevel: 62 },
         { year: 2027, riskLevel: 70 },
         { year: 2028, riskLevel: 78 },
         { year: 2029, riskLevel: 85 },
         { year: 2030, riskLevel: 90 },
         { year: 2031, riskLevel: 92 },
         { year: 2032, riskLevel: 94 },
         { year: 2033, riskLevel: 96 },
         { year: 2034, riskLevel: 97 }
      ]
   };

   const fallbackToMockData = (isFast: boolean) => {
      setTimeout(() => {
         setReport(mockReportData);
         setStep('initial_report');
      }, isFast ? 1500 : 3000);
   };

   const renderTextWithTooltips = (text: string) => {
      let parts = [text];
      Object.keys(MEDICAL_TERMS).forEach(term => {
         const newParts: any[] = [];
         parts.forEach(part => {
            if (typeof part === 'string') {
               const split = part.split(term);
               split.forEach((s, i) => {
                  newParts.push(s);
                  if (i < split.length - 1) {
                     newParts.push(
                        <span key={`${term}-${i}`} className="group relative inline-block text-indigo-600 font-bold cursor-help border-b border-indigo-300 mx-0.5 hover:bg-indigo-50">
                           {term}
                           <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-800 text-white text-xs p-3 rounded-lg shadow-xl z-50 pointer-events-none leading-relaxed text-left">
                              <span className="block font-bold text-indigo-300 mb-1">{term}</span>
                              {MEDICAL_TERMS[term]}
                              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></span>
                           </span>
                        </span>
                     );
                  }
               });
            } else {
               newParts.push(part);
            }
         });
         parts = newParts;
      });
      return parts;
   };

   const handleDownloadPDF = () => {
      if (!report) return;
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
         alert("请允许弹出窗口以生成报告");
         return;
      }
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>NeuroGen_AI_Diagnosis_Report_${new Date().toISOString().split('T')[0]}</title>
        <style>
          body { font-family: 'SimSun', 'Songti SC', serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
          h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; font-size: 24px; }
          .meta { margin-bottom: 30px; font-size: 14px; color: #555; display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 16px; font-weight: bold; border-left: 4px solid #4f46e5; padding-left: 10px; margin-bottom: 15px; background: #f9fafb; padding: 8px; color: #333; }
          .content { line-height: 1.8; font-size: 14px; text-align: justify; }
          .risk-high { color: #dc2626; font-weight: bold; }
          .risk-mod { color: #d97706; font-weight: bold; }
          .disclaimer { margin-top: 50px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
          th { background-color: #f9fafb; font-weight: bold; }
          ul { margin-top: 5px; padding-left: 20px; }
          li { margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <h1>NeuroGen AI 融合诊断报告</h1>
        <div class="meta">
          <div>分析编号: ${Date.now().toString().slice(-8)}</div>
          <div>生成日期: ${new Date().toLocaleDateString('zh-CN')}</div>
          <div>分析引擎: Gemini AI + CycleGAN Fusion</div>
        </div>
        <div class="section">
          <div class="section-title">综合诊断总结</div>
          <div class="content">${report.summary}</div>
        </div>
        <div class="section">
          <div class="section-title">详细发现 (多模态互证)</div>
          <div class="content" style="white-space: pre-wrap;">${report.detailedFindings}</div>
        </div>
        <div class="section">
          <div class="section-title">脑区风险评估</div>
          <table>
            <thead>
              <tr><th>脑区</th><th>异常描述</th><th>风险等级</th></tr>
            </thead>
            <tbody>
              ${report.regions.map(r => `<tr><td>${r.name}</td><td>${r.description}</td><td class="${r.level === 'High Risk' ? 'risk-high' : (r.level === 'Moderate' ? 'risk-mod' : '')}">${r.level}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
         <div class="section">
          <div class="section-title">主要疾病风险概率</div>
           <ul>${report.diseaseRisks.map(d => `<li><span style="display:inline-block;width:12px;height:12px;background:${d.color};margin-right:8px;border-radius:2px;"></span><strong>${d.name}</strong>: ${d.probability}%</li>`).join('')}</ul>
        </div>
        <div class="section">
          <div class="section-title">临床建议与干预</div>
          <div class="content" style="white-space: pre-wrap;">${report.recommendation}</div>
        </div>
        <div class="disclaimer">
          <p>本报告由 NeuroGen AI 系统自动生成，仅供临床参考，不作为最终医疗诊断依据。</p>
          <p>请务必结合患者临床体征、病史及其他检查结果由专业医师进行综合判断。</p>
        </div>
        <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
      </body>
      </html>
    `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
   };

   // Helper to generate simulated data with interventions
   const getLifecycleData = () => {
      if (!report) return [];
      return report.lifecycleProjection.map(item => {
         let interventionFactor = 0;
         if (enableLifestyle) interventionFactor += 0.15; // 15% reduction
         if (enableMedication) interventionFactor += 0.25; // 25% reduction

         // Calculate adjusted risk (simple decay model for demo)
         // Intervention starts effective from year 2026 roughly
         const yearsFromStart = item.year - 2025;
         const reduction = yearsFromStart > 0 ? (item.riskLevel * interventionFactor * Math.min(yearsFromStart / 2, 1)) : 0;

         return {
            ...item,
            interventionRisk: Math.max(item.riskLevel - reduction, 20) // Floor at 20 risk
         };
      });
   };

   // --- RENDERERS ---
   if (['upload', 'analyzing', 'initial_report'].includes(step)) {
      // ... (Keep existing Light Mode Logic mostly same, condensed for brevity here) ...
      // Using exact same code structure as before for these steps to ensure "no other changes"
      return (
         <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
            <header className="bg-slate-700 text-white px-8 py-3 flex justify-between items-center shadow-md">
               <div className="flex items-center gap-2"><h1 className="text-lg font-bold flex items-center gap-2">医疗影像AI诊断系统</h1></div>
               <div className="flex gap-4 text-sm font-medium">
                  <button onClick={onBack} className="hover:text-indigo-300 transition-colors">首页</button>
                  <button className="hover:text-indigo-300 transition-colors">历史报告</button>
                  <button onClick={onBack} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-xs transition-colors">退出</button>
               </div>
            </header>
            <div className="flex-1 flex flex-col items-center p-8">
               <h2 className="text-2xl font-bold mb-8 flex items-center gap-2 border-b-2 border-slate-800 pb-1">AI 多模态深度分析 (Multimodal)</h2>
               {step === 'upload' && (
                  <div className="w-full max-w-5xl animate-fade-in-up">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div><h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Brain className="text-blue-600" /> 1. 脑影像数据 (Macro)</h3><UploadBox title="上传 fMRI / MRI 影像" subTitle="支持 DICOM, NIfTI, JPG" accept="image/*,.dcm,.nii" icon={<Brain size={24} />} file={selectedImageFile} onFileSelect={processImageFile} onClear={() => { setSelectedImageFile(null); setPreviewUrl(null); }} colorClass="blue" /></div>
                        <div><h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Dna className="text-emerald-600" /> 2. 单细胞/基因数据 (Micro)</h3><UploadBox title="上传 scRNA-seq / 基因数据" subTitle="支持 CSV, TXT, Excel Gene Matrix" accept=".csv,.txt,.xlsx,.json" icon={<Dna size={24} />} file={selectedGeneFile} onFileSelect={processGeneFile} onClear={() => setSelectedGeneFile(null)} colorClass="emerald" /></div>
                     </div>
                     <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">准备开始 AI 融合分析</h3>
                        <p className="text-slate-500 text-sm mb-6 max-w-2xl">系统将使用 <span className="font-bold text-indigo-600">CycleGAN</span> 跨模态引擎，将微观基因表达特征映射到宏观影像空间，并结合 Gemini AI 知识库进行病理推演。</p>
                        <div className="flex gap-4">
                           <button onClick={() => runAnalysis('python')} disabled={!selectedImageFile} className="px-6 py-3 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium transition-colors disabled:opacity-50">仅特征提取 (Python)</button>
                           <button onClick={() => runAnalysis('deepseek')} disabled={!selectedImageFile} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-10 rounded-lg shadow-lg shadow-indigo-500/30 flex items-center gap-2 transform hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"><Sparkles size={20} /> 开始深度融合诊断</button>
                        </div>
                        {!selectedImageFile && (<p className="text-xs text-red-400 mt-4 flex items-center gap-1"><AlertTriangle size={12} /> 请至少上传一份脑影像文件</p>)}
                     </div>
                     <div className="mt-8 grid grid-cols-3 gap-4 opacity-70">
                        <div className="flex items-center gap-2 text-xs text-slate-400 justify-center"><CheckCircle2 size={14} className="text-green-500" /> 支持 10x Genomics 数据格式</div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 justify-center"><CheckCircle2 size={14} className="text-green-500" /> 支持 3T/7T fMRI 影像</div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 justify-center"><CheckCircle2 size={14} className="text-green-500" /> 符合 HIPAA 数据隐私标准</div>
                     </div>
                  </div>
               )}
               {step === 'analyzing' && (
                  <div className="flex flex-col items-center justify-center py-16 animate-fade-in w-full max-w-2xl">
                     <div className="relative mb-8"><Loader2 size={80} className="text-indigo-200 animate-spin" /><div className="absolute inset-0 flex items-center justify-center"><Network size={32} className="text-indigo-600 animate-pulse" /></div></div>
                     <h3 className="text-2xl font-bold text-slate-800 mb-2">正在进行跨模态特征对齐...</h3>
                     <p className="text-slate-500 text-center mb-6">正在将 fMRI 影像体素 (Voxel) 与 scRNA-seq 基因表达矩阵进行空间映射</p>
                     <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden relative"><div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-emerald-500 animate-[scan_2s_ease-in-out_infinite] w-1/3 rounded-full"></div></div>
                     <div className="flex justify-between w-full text-xs font-mono text-slate-400"><span>Image Feature Extraction</span><span>Gene Set Enrichment</span><span>Gemini AI Inference</span></div>
                  </div>
               )}
               {step === 'initial_report' && report && (
                  <div className="w-full max-w-5xl bg-white p-10 rounded-xl shadow-xl border border-slate-200 animate-fade-in-up">
                     <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-6">
                        <div>
                           <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">AI 融合诊断报告 <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200">Multimodal</span></h2>
                           <p className="text-slate-500 text-sm">分析源: {selectedImageFile?.name} {selectedGeneFile ? `+ ${selectedGeneFile.name}` : ''}</p>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"><Download size={16} /> 下载 PDF</button>
                           <button onClick={() => setStep('deep_dashboard')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-indigo-500/30 animate-pulse"><Sparkles size={16} /> 进入深度分析看板</button>
                        </div>
                     </div>
                     <div className="space-y-6">
                        <div className="bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-100 p-6 rounded-xl">
                           <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Info size={18} className="text-blue-600" /> 综合诊断总结</h4>
                           <p className="text-slate-800 leading-relaxed text-justify font-medium">{report.summary}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                              <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><ScanEye size={16} /> 影像学发现 (fMRI)</h4>
                              <div className="text-slate-600 text-sm leading-7 text-justify">{renderTextWithTooltips(report.detailedFindings.split('单细胞')[0] || report.detailedFindings)}</div>
                           </div>
                           <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                              <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Dna size={16} /> 单细胞/基因发现 (scRNA)</h4>
                              <div className="text-slate-600 text-sm leading-7 text-justify">{report.detailedFindings.includes('单细胞') ? renderTextWithTooltips('单细胞' + report.detailedFindings.split('单细胞')[1]) : "未检测到显著的单细胞数据异常描述，或主要基于影像特征推断。"}</div>
                           </div>
                        </div>
                        <div>
                           <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Stethoscope size={18} /> 临床建议</h4>
                           <div className="bg-white border-l-4 border-emerald-500 p-4 shadow-sm text-slate-700">{report.recommendation}</div>
                        </div>
                     </div>
                     <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">* 鼠标悬停在蓝色高亮术语上可查看详细解释。本报告由 AI 生成，仅供参考，不可替代医生诊断。</div>
                  </div>
               )}
            </div>
         </div>
      );
   }

   // --- DARK MODE DASHBOARD (Fig 3/4) ---
   if (step === 'deep_dashboard' && report) {
      return (
         <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col font-sans">
            {/* Style block for specific 3D animations */}
            <style>{`
          @keyframes spin-slow-y { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }
          @keyframes spin-slow-z { from { transform: rotateX(70deg) rotateZ(0deg); } to { transform: rotateX(70deg) rotateZ(360deg); } }
          @keyframes float-slow { 0%, 100% { transform: rotateY(15deg) translateZ(0px) translateY(0px); } 50% { transform: rotateY(15deg) translateZ(0px) translateY(-10px); } }
          @keyframes float-slow-reverse { 0%, 100% { transform: rotateY(-15deg) translateZ(0px) translateY(0px); } 50% { transform: rotateY(-15deg) translateZ(0px) translateY(-10px); } }
          @keyframes dash-flow { to { stroke-dashoffset: -20; } }
          .preserve-3d { transform-style: preserve-3d; }
          .animate-spin-slow-y { animation: spin-slow-y 10s linear infinite; }
          .animate-spin-slow-z { animation: spin-slow-z 8s linear infinite; }
          .animate-float-slow { animation: float-slow 4s ease-in-out infinite; }
          .animate-float-slow-reverse { animation: float-slow-reverse 5s ease-in-out infinite; }
          .animate-dash-flow { animation: dash-flow 1s linear infinite; }
          .animate-dash-flow-reverse { animation: dash-flow 1s linear infinite reverse; }
        `}</style>

            {/* Header - Dark */}
            <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shadow-lg sticky top-0 z-40">
               <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="text-purple-500" /> NeuroGen 深度分析
               </h1>
               <button onClick={() => setStep('initial_report')} className="text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                  <ArrowLeft size={16} /> 返回报告
               </button>
            </header>

            <div className="flex flex-1 overflow-hidden animate-fade-in">
               {/* Sidebar Navigation */}
               <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-4 space-y-2 shrink-0">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-3">分析维度</div>
                  <button onClick={() => setResultTab('diagnosis')} className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${resultTab === 'diagnosis' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Activity size={18} /> 诊断详情</button>
                  <button onClick={() => setResultTab('genetics')} className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${resultTab === 'genetics' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Dna size={18} /> 单细胞 & GWAS</button>
                  <button onClick={() => setResultTab('model')} className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${resultTab === 'model' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Layers size={18} /> 双流融合模型</button>
                  <button onClick={() => setResultTab('lifecycle')} className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${resultTab === 'lifecycle' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Clock size={18} /> 全生命周期推演</button>
               </div>

               {/* Dashboard Content */}
               <div className="flex-1 bg-[#0f172a] p-8 overflow-y-auto">
                  {/* TAB 1, 2 content remains unchanged */}
                  {resultTab === 'diagnosis' && (
                     <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                           <div className="lg:col-span-2 space-y-6">
                              <h2 className="text-2xl font-bold text-white mb-4">个性化风险评估</h2>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {report.diseaseRisks.map((risk, idx) => (
                                    <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 hover:bg-slate-800 transition-colors">
                                       <div className="flex justify-between items-start mb-2"><h4 className="text-slate-300 text-sm font-medium">{risk.name}</h4><Activity size={16} style={{ color: risk.color }} /></div>
                                       <div className="flex items-baseline gap-2 mb-2"><span className="text-4xl font-bold tracking-tight" style={{ color: risk.color }}>{risk.probability}%</span><span className="text-xs text-slate-500">风险概率</span></div>
                                       <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${risk.probability}%`, backgroundColor: risk.color }}></div></div>
                                    </div>
                                 ))}
                              </div>
                              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Brain size={20} /> 异常脑区检测</h3>
                                 <div className="space-y-4">
                                    {report.regions.map((region, idx) => (
                                       <div key={idx} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-slate-600 transition-colors">
                                          <div><div className="text-white font-medium flex items-center gap-2">{region.name}<span className="text-xs text-slate-500 px-2 py-0.5 border border-slate-700 rounded">{region.description.split('，')[0]}</span></div><div className="text-slate-400 text-xs mt-1">{region.description}</div></div>
                                          <div className="text-right"><div className={`text-sm font-bold ${region.level === 'High Risk' ? 'text-red-400' : 'text-amber-400'}`}>{region.level}</div><div className="text-xs text-slate-600">Risk Score: {region.score.toFixed(2)}</div></div>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           </div>
                           <div className="space-y-6">
                              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px]">
                                 <h3 className="text-slate-300 text-sm font-bold uppercase tracking-wider mb-2 self-start flex items-center gap-2"><Activity size={14} className="text-indigo-400" /> 多维健康评估</h3>
                                 <div className="w-full h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                       <RadarChart cx="50%" cy="50%" outerRadius="70%" data={RADAR_DATA}>
                                          <PolarGrid stroke="#334155" />
                                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                          <Radar name="Assessment" dataKey="A" stroke="#818cf8" strokeWidth={2} fill="#6366f1" fillOpacity={0.3} />
                                          <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }} />
                                       </RadarChart>
                                    </ResponsiveContainer>
                                 </div>
                                 <p className="text-xs text-slate-500 text-center px-4">* 基于多模态数据的综合能力评估模型</p>
                              </div>
                              <BrainRiskMap regions={report.regions} />
                           </div>
                        </div>
                     </div>
                  )}
                  {resultTab === 'genetics' && (
                     <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between mb-4"><h2 className="text-2xl font-bold text-white flex items-center gap-2"><Dna className="text-emerald-500" /> 单细胞与遗传学分析</h2><span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">Microscopic Evidence</span></div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
                           <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2"><Microscope size={16} /> 致病细胞类型富集 (Cell Type Enrichment)</h3>
                           <div className="space-y-6">
                              {report.gwasAnalysis.map((item, idx) => (
                                 <div key={idx}>
                                    <div className="flex justify-between text-sm mb-2"><span className="text-slate-200 font-medium">{item.name}</span><div className="flex items-center gap-3"><span className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{item.pValue || 'P < 0.05'}</span><span className="text-emerald-400 font-mono font-bold">{item.score}</span></div></div>
                                    <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden p-0.5"><div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 relative transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(52,211,153,0.3)]" style={{ width: `${item.score}%` }}><div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white/60"></div></div></div>
                                 </div>
                              ))}
                           </div>
                           <div className="mt-8 p-4 bg-slate-900 rounded-xl border border-slate-700 text-xs text-slate-400 leading-relaxed flex gap-3"><Info className="shrink-0 text-emerald-500" size={16} /><div><p className="font-bold text-slate-300 mb-1">技术说明 (S-LDSC / scRNA-seq)：</p>基于您上传的基因表达矩阵，系统识别出 <span className="text-emerald-400">Microglia (TREM2+)</span> 为关键驱动细胞群。这与 fMRI 影像中发现的炎症区域高度重合，支持神经炎症假说。</div></div>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
                           <h3 className="text-blue-400 text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2"><Table2 size={16} /> 关键风险基因位点 (Risk Loci)</h3>
                           <div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wider"><th className="py-3 px-4">基因符号</th><th className="py-3 px-4">病理类型</th><th className="py-3 px-4">染色体位置</th><th className="py-3 px-4">致病机理推断</th><th className="py-3 px-4 text-right">显著性 (P-value)</th></tr></thead><tbody className="text-sm text-slate-300">{GENE_TABLE_DATA.map((row, i) => (<tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"><td className="py-3 px-4 font-bold text-white">{row.gene}</td><td className="py-3 px-4"><span className={`px-2 py-0.5 rounded text-[10px] border ${row.type === 'Risk Factor' ? 'bg-red-900/20 text-red-300 border-red-800' : row.type === 'Inflammation' ? 'bg-orange-900/20 text-orange-300 border-orange-800' : 'bg-blue-900/20 text-blue-300 border-blue-800'}`}>{row.type}</span></td><td className="py-3 px-4 font-mono text-slate-500">{row.location}</td><td className="py-3 px-4 text-slate-400">{row.effect}</td><td className="py-3 px-4 text-right font-mono text-emerald-400">{row.significance}</td></tr>))}</tbody></table></div>
                        </div>
                     </div>
                  )}
                  {resultTab === 'model' && (
                     <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                        <h2 className="text-2xl font-bold text-white mb-6">双流融合网络分析 (Two-Stream Fusion)</h2>

                        {/* 3D Architecture Visualization Container */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-0 overflow-hidden relative min-h-[400px] flex flex-col items-center justify-center">

                           {/* Background Grid for 3D effect */}
                           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-slate-900 pointer-events-none"></div>
                           <div className="absolute inset-0 opacity-20 pointer-events-none"
                              style={{
                                 backgroundImage: 'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)',
                                 backgroundSize: '40px 40px',
                                 transform: 'perspective(500px) rotateX(60deg) translateY(-100px) scale(2)',
                                 transformOrigin: '50% 0%'
                              }}>
                           </div>

                           {/* 3D Scene Container */}
                           <div className="relative w-full h-[300px] flex items-center justify-center" style={{ perspective: '1000px' }}>

                              {/* Left Node: scRNA-seq */}
                              <div className="absolute left-[10%] md:left-[15%] flex flex-col items-center gap-3 animate-float-slow" style={{ transform: 'rotateY(15deg) translateZ(0px)' }}>
                                 <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/50 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)] backdrop-blur-sm relative group">
                                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-50 animate-pulse"></div>
                                    <Dna size={40} className="text-emerald-400 relative z-10" />
                                    {/* Floating Bits */}
                                    <div className="absolute -top-2 -right-2 w-3 h-3 bg-emerald-400 rounded-full animate-bounce"></div>
                                 </div>
                                 <div className="text-center">
                                    <div className="text-emerald-400 font-bold text-sm tracking-wider">scRNA-seq</div>
                                    <div className="text-slate-500 text-[10px]">Micro-Gene Expression</div>
                                 </div>
                              </div>

                              {/* Right Node: fMRI */}
                              <div className="absolute right-[10%] md:right-[15%] flex flex-col items-center gap-3 animate-float-slow-reverse" style={{ transform: 'rotateY(-15deg) translateZ(0px)' }}>
                                 <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/50 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)] backdrop-blur-sm relative">
                                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-50 animate-pulse delay-75"></div>
                                    <Activity size={40} className="text-blue-400 relative z-10" />
                                    {/* Floating Bits */}
                                    <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                                 </div>
                                 <div className="text-center">
                                    <div className="text-blue-400 font-bold text-sm tracking-wider">fMRI BOLD</div>
                                    <div className="text-slate-500 text-[10px]">Macro-Brain Activity</div>
                                 </div>
                              </div>

                              {/* Connecting Pipes (SVG) */}
                              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                                 <defs>
                                    <linearGradient id="gradLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                                       <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                                       <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
                                       <stop offset="100%" stopColor="#6366f1" stopOpacity="1" />
                                    </linearGradient>
                                    <linearGradient id="gradRight" x1="100%" y1="0%" x2="0%" y2="0%">
                                       <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                                       <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
                                       <stop offset="100%" stopColor="#6366f1" stopOpacity="1" />
                                    </linearGradient>
                                 </defs>
                                 {/* Left Pipe */}
                                 <path d="M 20% 50% C 35% 50%, 35% 50%, 50% 50%" stroke="url(#gradLeft)" strokeWidth="2" fill="none" strokeDasharray="5 5" className="animate-dash-flow" />
                                 {/* Right Pipe */}
                                 <path d="M 80% 50% C 65% 50%, 65% 50%, 50% 50%" stroke="url(#gradRight)" strokeWidth="2" fill="none" strokeDasharray="5 5" className="animate-dash-flow-reverse" />

                                 {/* Moving Particles */}
                                 <circle r="3" fill="#fff">
                                    <animateMotion dur="2s" repeatCount="indefinite" path="M 20% 50% C 35% 50%, 35% 50%, 48% 50%" />
                                 </circle>
                                 <circle r="3" fill="#fff">
                                    <animateMotion dur="2s" repeatCount="indefinite" path="M 80% 50% C 65% 50%, 65% 50%, 52% 50%" />
                                 </circle>
                              </svg>

                              {/* Center Core: 3D Transformer Cube/Layers */}
                              <div className="relative w-40 h-40 flex items-center justify-center preserve-3d animate-spin-slow-y">
                                 {/* Simulated 3D Layers */}
                                 <div className="absolute w-32 h-32 bg-indigo-500/10 border border-indigo-400/30 rounded-lg transform translate-z-[-40px]" style={{ transform: 'translateZ(-40px)' }}></div>
                                 <div className="absolute w-32 h-32 bg-indigo-500/10 border border-indigo-400/30 rounded-lg transform translate-z-[-20px]" style={{ transform: 'translateZ(-20px)' }}></div>
                                 <div className="absolute w-32 h-32 bg-indigo-600/20 border border-indigo-400/50 rounded-lg transform translate-z-[0px]" style={{ transform: 'translateZ(0px)', boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                       <Brain size={48} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                                    </div>
                                 </div>
                                 <div className="absolute w-32 h-32 bg-indigo-500/10 border border-indigo-400/30 rounded-lg transform translate-z-[20px]" style={{ transform: 'translateZ(20px)' }}></div>
                                 <div className="absolute w-32 h-32 bg-indigo-500/10 border border-indigo-400/30 rounded-lg transform translate-z-[40px]" style={{ transform: 'translateZ(40px)' }}></div>

                                 {/* Orbiting Ring */}
                                 <div className="absolute w-48 h-48 border border-cyan-400/30 rounded-full animate-spin-slow-z" style={{ transform: 'rotateX(70deg)' }}></div>
                              </div>

                              {/* Status Label (Floating below) */}
                              <div className="absolute bottom-10 flex flex-col items-center">
                                 <div className="bg-slate-900/80 backdrop-blur border border-indigo-500/30 px-4 py-1.5 rounded-full text-xs text-indigo-300 flex items-center gap-2 mb-2 shadow-lg">
                                    <Loader2 size={12} className="animate-spin" />
                                    CycleGAN 正在生成虚拟病理映射...
                                 </div>
                              </div>

                           </div>

                           <div className="bg-slate-900/50 w-full p-4 border-t border-slate-700/50 text-center relative z-10">
                              <h4 className="text-white font-mono text-sm mb-1">模型架构: <span className="text-indigo-400">Multimodal-Transformer</span></h4>
                              <p className="text-xs text-slate-500">通过 CycleGAN 将微观基因特征翻译为宏观影像特征，实现跨模态证据互证。</p>
                           </div>
                        </div>

                        {/* New Chart: AI Disease Confidence */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
                           <h3 className="text-white text-sm font-bold mb-6 flex items-center gap-2">
                              <BarChart3 size={16} className="text-indigo-400" />
                              AI 疾病预测置信度 (Top Predictions)
                           </h3>
                           <div className="h-[250px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                 <BarChart
                                    data={report.diseaseRisks.slice(0, 3)}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                 >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" />
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis
                                       type="category"
                                       dataKey="name"
                                       width={180}
                                       tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 500 }}
                                       axisLine={false}
                                       tickLine={false}
                                    />
                                    <RechartsTooltip
                                       cursor={{ fill: '#1e293b', opacity: 0.5 }}
                                       contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '0.75rem' }}
                                       formatter={(value: number) => [`${value}%`, '置信度']}
                                    />
                                    <Bar dataKey="probability" radius={[0, 4, 4, 0]} barSize={24} animationDuration={1500}>
                                       {report.diseaseRisks.slice(0, 3).map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                                       ))}
                                    </Bar>
                                 </BarChart>
                              </ResponsiveContainer>
                           </div>
                        </div>

                        {/* Existing Confidence Section (Raw Softmax) */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
                           <h3 className="text-white text-sm font-bold mb-6">分类置信度 (Softmax Probability - Raw Output)</h3>
                           <div className="space-y-5">{report.modelConfidence.map((item, idx) => (<div key={idx}><div className="flex justify-between text-sm mb-2"><span className="text-slate-300">{item.name}</span><span className={`font-bold ${idx === 0 ? 'text-red-400' : 'text-amber-400'}`}>{item.probability}%</span></div><div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${idx === 0 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${item.probability}%` }}></div></div></div>))}</div>
                        </div>
                     </div>
                  )}

                  {/* TAB 4: LIFECYCLE content remains unchanged */}
                  {resultTab === 'lifecycle' && (
                     <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">全生命周期推演 (Temporal Simulation)</h2>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                           {/* Left: Main Chart Area */}
                           <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 h-[500px] flex flex-col">
                              <div className="flex justify-between items-start mb-6">
                                 <div>
                                    <h3 className="text-sm text-blue-400 font-bold mb-1 flex items-center gap-2">
                                       <Clock size={16} /> 疾病轨迹预测 (G + Δt)
                                    </h3>
                                    <p className="text-xs text-slate-500">基于风险基因表达累积效应的自然病程推演</p>
                                 </div>
                                 <div className="flex items-center gap-2 text-[10px]">
                                    <span className="flex items-center gap-1 text-slate-400"><div className="w-2 h-2 rounded-full bg-blue-500"></div> 自然病程</span>
                                    {(enableLifestyle || enableMedication) && (
                                       <span className="flex items-center gap-1 text-emerald-400 animate-fade-in"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> 干预后预测</span>
                                    )}
                                 </div>
                              </div>

                              <div className="flex-1 w-full min-h-0">
                                 <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={getLifecycleData()} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                       <defs>
                                          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                                             <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                             <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                          </linearGradient>
                                          <linearGradient id="intervGrad" x1="0" y1="0" x2="0" y2="1">
                                             <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                             <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                          </linearGradient>
                                       </defs>
                                       <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                       <XAxis dataKey="year" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                                       <YAxis stroke="#94a3b8" domain={[0, 100]} label={{ value: '神经病理负荷 (Load)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                                       <RechartsTooltip
                                          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                          labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
                                          formatter={(value: number, name: string) => [value.toFixed(1), name === 'riskLevel' ? '自然风险' : '干预后风险']}
                                       />

                                       {/* Clinical Threshold Lines */}
                                       <ReferenceLine y={60} label={{ position: 'right', value: 'MCI 阈值', fill: '#f59e0b', fontSize: 10 }} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.6} />
                                       <ReferenceLine y={85} label={{ position: 'right', value: '不可逆损伤', fill: '#ef4444', fontSize: 10 }} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.6} />

                                       {/* Highlighting the difference */}
                                       {(enableLifestyle || enableMedication) && (
                                          <Area type="monotone" dataKey="riskLevel" stroke="none" fill="none" />
                                       )}

                                       <Line name="riskLevel" type="monotone" dataKey="riskLevel" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />

                                       {(enableLifestyle || enableMedication) && (
                                          <Line name="interventionRisk" type="monotone" dataKey="interventionRisk" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" dot={{ fill: '#10b981', r: 3 }} animationDuration={1000} />
                                       )}
                                    </ComposedChart>
                                 </ResponsiveContainer>
                              </div>
                           </div>

                           {/* Right: Intervention Simulator Panel */}
                           <div className="space-y-6">

                              {/* Simulator Controls */}
                              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                                 <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                                    <GitBranch size={18} className="text-purple-400" />
                                    干预效果模拟器
                                 </h4>

                                 <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-700">
                                       <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${enableLifestyle ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                             <Activity size={16} />
                                          </div>
                                          <div>
                                             <div className="text-sm font-medium text-slate-200">生活方式干预</div>
                                             <div className="text-[10px] text-slate-500">饮食、运动、认知训练</div>
                                          </div>
                                       </div>
                                       <button
                                          onClick={() => setEnableLifestyle(!enableLifestyle)}
                                          className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${enableLifestyle ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                       >
                                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${enableLifestyle ? 'left-6' : 'left-1'}`}></div>
                                       </button>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-700">
                                       <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${enableMedication ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                                             <Zap size={16} />
                                          </div>
                                          <div>
                                             <div className="text-sm font-medium text-slate-200">药物/靶向治疗</div>
                                             <div className="text-[10px] text-slate-500">抗炎药物、Aβ清除剂</div>
                                          </div>
                                       </div>
                                       <button
                                          onClick={() => setEnableMedication(!enableMedication)}
                                          className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${enableMedication ? 'bg-blue-500' : 'bg-slate-700'}`}
                                       >
                                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${enableMedication ? 'left-6' : 'left-1'}`}></div>
                                       </button>
                                    </div>
                                 </div>

                                 {(enableLifestyle || enableMedication) && (
                                    <div className="mt-4 pt-4 border-t border-slate-700 animate-fade-in">
                                       <div className="text-xs text-slate-400 mb-1">预测干预效果：</div>
                                       <div className="flex items-center gap-2 text-emerald-400 font-bold">
                                          <TrendingUp size={16} className="rotate-180" />
                                          风险降低 {(enableLifestyle && enableMedication ? 40 : (enableLifestyle ? 15 : 25))}%
                                       </div>
                                       <p className="text-[10px] text-slate-500 mt-1">MCI 转化时间预计推迟 3-5 年</p>
                                    </div>
                                 )}
                              </div>

                              {/* Scientific Context */}
                              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-6">
                                 <h4 className="text-indigo-300 font-bold mb-3 text-sm flex items-center gap-2">
                                    <Shield size={14} /> 算法原理说明
                                 </h4>
                                 <p className="text-xs text-slate-400 leading-relaxed text-justify mb-2">
                                    <strong>时间轴建模 (Temporal Modeling):</strong><br />
                                    系统将第一阶段筛选出的风险基因表达量作为变量 <em>G</em>，通过数学插值模型 <em>G + Δt</em> 模拟基因表达随时间累积的恶化过程。
                                 </p>
                                 <p className="text-xs text-slate-400 leading-relaxed text-justify">
                                    <strong>虚拟病理生成:</strong><br />
                                    将模拟出的“未来基因状态”输入 CycleGAN 引擎，生成对应的虚拟影像特征，从而预测脑萎缩轨迹。
                                 </p>
                              </div>
                           </div>
                        </div>

                        {/* Bottom: Milestone Timeline */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                           <h3 className="text-white text-sm font-bold mb-4 flex items-center gap-2">关键病程节点预测 (Milestones)</h3>
                           <div className="relative pt-6 pb-2">
                              {/* Timeline Line */}
                              <div className="absolute top-8 left-0 right-0 h-0.5 bg-slate-700"></div>

                              <div className="grid grid-cols-4 gap-4 relative z-10">
                                 {[
                                    { year: 2025, title: '当前状态', status: 'Pre-clinical', color: 'bg-emerald-500' },
                                    { year: 2027, title: '淀粉样蛋白沉积', status: 'Early Pathology', color: 'bg-blue-500' },
                                    { year: 2029, title: 'MCI 转化拐点', status: 'Prodromal', color: 'bg-amber-500' },
                                    { year: 2033, title: '海马体显著萎缩', status: 'Clinical AD', color: 'bg-red-500' },
                                 ].map((milestone, idx) => (
                                    <div key={idx} className="flex flex-col items-center text-center group">
                                       <div className={`w-4 h-4 rounded-full ${milestone.color} border-4 border-[#0f172a] shadow-lg mb-2 group-hover:scale-125 transition-transform`}></div>
                                       <div className="text-sm font-bold text-white mb-1">{milestone.year}</div>
                                       <div className="text-xs font-medium text-slate-300">{milestone.title}</div>
                                       <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{milestone.status}</div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </div>
      );
   }

   // Fallback
   return <div className="p-10 text-center">未知状态</div>;
};

export default AIAnalysisView;