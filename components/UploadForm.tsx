import React, { useState, useRef } from 'react';
import { Upload, X, FileText, ArrowLeft, Loader2, Sparkles, Scan, Tag, CheckCircle2 } from 'lucide-react';

interface UploadFormProps {
  onBack: () => void;
  onSubmit: (file: File | null, description: string, modality?: string, tags?: string[]) => void;
}

const UploadForm: React.FC<UploadFormProps> = ({ onBack, onSubmit }) => {
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Auto-classification state
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [detectedModality, setDetectedModality] = useState<string>('');
  const [detectedTags, setDetectedTags] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateImageAnalysis = (file: File) => {
    setIsAnalyzingImage(true);
    setDetectedModality('');
    setDetectedTags([]);

    // Simulate AI processing delay
    setTimeout(() => {
      // Mock logic based on file type/name for demo purposes
      let modality = 'MRI';
      let tags = ['Brain', 'Axial View'];
      
      const lowerName = file.name.toLowerCase();
      if (lowerName.includes('ct') || lowerName.includes('chest')) {
        modality = 'CT';
        tags = ['Chest', 'Lung Window'];
      } else if (lowerName.includes('xray') || lowerName.includes('x-ray')) {
        modality = 'X-Ray';
        tags = ['Skeletal', 'Fracture Check'];
      } else if (file.type === 'application/dicom' || file.name.endsWith('.dcm')) {
        modality = 'DICOM';
        tags = ['Raw Data', 'Multi-slice'];
      }

      setDetectedModality(modality);
      setDetectedTags(tags);
      setIsAnalyzingImage(false);
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Create preview if it's an image
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
      
      simulateImageAnalysis(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      // Create preview if it's an image
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
      simulateImageAnalysis(file);
    }
  };

  const handleSubmit = () => {
    if (!description.trim()) {
      alert("请填写病情描述");
      return;
    }
    if (isAnalyzingImage) {
        alert("请等待影像智能识别完成");
        return;
    }

    setIsSubmitting(true);
    // Simulate network delay
    setTimeout(() => {
      onSubmit(selectedFile, description, detectedModality, detectedTags);
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-slate-800 font-bold text-lg">医疗影像AI诊断系统</span>
        </div>
        <div className="flex gap-4">
          <button onClick={onBack} className="text-slate-500 hover:text-slate-800 text-sm font-medium">首页</button>
          <button className="text-slate-500 hover:text-slate-800 text-sm font-medium">历史报告</button>
          <button className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded">退出</button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl overflow-hidden flex flex-col animate-fade-in-up">
          
          <div className="p-8 border-b border-slate-100 text-center">
            <h2 className="text-2xl font-bold text-slate-800">发起专家诊断申请</h2>
            <p className="text-slate-500 text-sm mt-2">上传医学影像并填写主诉，系统将自动进行分类和初步标记</p>
          </div>

          <div className="p-8 space-y-8">
            {/* Upload Area */}
            <div 
              className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${selectedFile ? 'border-blue-200 bg-blue-50/50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".jpg,.jpeg,.png,.dcm,.nii" 
                onChange={handleFileChange}
              />
              
              {selectedFile ? (
                <div className="w-full flex flex-col items-center animate-fade-in">
                  <div className="relative mb-4">
                    {previewUrl ? (
                      <div className="relative overflow-hidden rounded-lg shadow-md border border-slate-200">
                         <img src={previewUrl} alt="Preview" className="max-h-64 object-contain" />
                         {/* Scan Animation Overlay */}
                         {isAnalyzingImage && (
                            <div className="absolute inset-0 bg-blue-900/20 z-10">
                                <div className="w-full h-1 bg-blue-400/80 shadow-[0_0_10px_rgba(96,165,250,0.8)] absolute top-0 animate-[scan_1.5s_ease-in-out_infinite]"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                   <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                                      <Scan size={14} className="animate-pulse" /> AI 识别影像类型中...
                                   </div>
                                </div>
                            </div>
                         )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center p-8 bg-white rounded-xl shadow-sm">
                        <FileText size={48} className="text-blue-500 mb-2" />
                        <span className="text-slate-700 font-medium">{selectedFile.name}</span>
                      </div>
                    )}
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setDetectedModality('');
                        setDetectedTags([]);
                      }}
                      className="absolute -top-3 -right-3 bg-white text-red-500 rounded-full p-1.5 shadow-md border border-slate-100 hover:bg-red-50 z-20"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Classification Results */}
                  {!isAnalyzingImage && detectedModality && (
                     <div className="flex flex-wrap gap-2 justify-center animate-fade-in-up">
                        <div className="bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                           <Scan size={12} /> 类型: {detectedModality}
                        </div>
                        {detectedTags.map((tag, idx) => (
                           <div key={idx} className="bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                              <Tag size={12} /> {tag}
                           </div>
                        ))}
                        <div className="text-emerald-500 text-xs flex items-center gap-1 font-medium ml-2">
                           <CheckCircle2 size={12} /> 识别成功
                        </div>
                     </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload size={32} />
                  </div>
                  <h4 className="text-slate-700 font-semibold mb-1">点击 or 拖拽上传医学影像</h4>
                  <p className="text-slate-400 text-xs">支持 JPG, PNG, DICOM (CT/MRI/X-ray)</p>
                </>
              )}
            </div>

            {/* Description Area */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">病情描述 / 主诉：</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[120px] resize-y shadow-inner"
                placeholder="请详细描述您的症状（如：胸痛持续时间、过往病史等），以便医生结合影像进行判断..."
              />
            </div>

            <div className="flex justify-center pt-2">
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || isAnalyzingImage}
                className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-3 px-12 rounded-full shadow-lg shadow-pink-500/30 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                {isSubmitting ? '提交中...' : '提交给专家诊断'}
              </button>
            </div>
          </div>

        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default UploadForm;