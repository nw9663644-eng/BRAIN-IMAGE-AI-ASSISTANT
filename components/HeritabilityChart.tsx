import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine, Label } from 'recharts';
import { CELL_CLUSTER_DATA } from '../constants';
import { Dna, BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react';

const HeritabilityChart: React.FC = () => {
  const data = CELL_CLUSTER_DATA.filter(d => d.category === 'Psychiatric' || d.category === 'Structural');

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 relative overflow-hidden group">
      {/* Background Gradient Decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-50 to-transparent opacity-50 rounded-bl-full pointer-events-none"></div>

      <div className="flex items-start justify-between mb-6 relative z-10">
         <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <Dna className="text-indigo-600" size={20} />
               细胞类型基因组富集度 (S-LDSC / TDEP)
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
               基于分层连锁不平衡评分回归分析，展示精神疾病遗传风险在不同神经细胞类型中的分布特异性。
               <span className="text-indigo-600 font-medium ml-1">高显著性 (P {'<'} 0.05)</span> 提示潜在的细胞病理靶点。
            </p>
         </div>
         <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 flex flex-col items-end">
             <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Analysis Engine</span>
             <span className="text-xs font-bold text-slate-700 flex items-center gap-1"><BarChart3 size={10}/> MAGMA v1.09</span>
         </div>
      </div>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 100, bottom: 20 }}
            barSize={24}
          >
            <defs>
              <linearGradient id="excitatoryGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f87171" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="inhibitoryGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="nonNeuronalGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#64748b" stopOpacity={1} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#e2e8f0" />
            <XAxis 
              type="number" 
              domain={[0, 10]} 
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fontSize: 10, fill: '#64748b' }}
            >
               <Label position="insideBottom" offset={-10} fill="#94a3b8" fontSize={10} value="-log10(P) Enrichment Score" />
            </XAxis>
            <YAxis 
              type="category" 
              dataKey="name" 
              width={140} 
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc', opacity: 0.5 }}
              content={({ active, payload }) => {
                 if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                       <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs">
                          <p className="font-bold mb-1 text-sm">{d.name}</p>
                          <p className="text-slate-400 mb-2">{d.supercluster}</p>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="text-indigo-300">Enrichment:</span>
                             <span className="font-mono font-bold">{d.enrichmentScore.toFixed(2)}</span>
                          </div>
                          {d.isSignificant ? (
                             <span className="text-emerald-400 flex items-center gap-1 font-bold"><CheckCircle2 size={12}/> 统计显著</span>
                          ) : (
                             <span className="text-slate-500">未达显著水平</span>
                          )}
                       </div>
                    );
                 }
                 return null;
              }}
            />
            <ReferenceLine x={1.3} stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'top', value: 'P=0.05', fill: '#94a3b8', fontSize: 10 }} />
            
            <Bar dataKey="enrichmentScore" radius={[0, 6, 6, 0]} animationDuration={1500}>
              {data.map((entry, index) => {
                let fillUrl = 'url(#nonNeuronalGradient)';
                if (entry.supercluster === 'Excitatory') fillUrl = 'url(#excitatoryGradient)';
                if (entry.supercluster === 'Inhibitory') fillUrl = 'url(#inhibitoryGradient)';
                
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={fillUrl}
                    stroke={entry.isSignificant ? "rgba(0,0,0,0.1)" : "none"} 
                    strokeWidth={1}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600 justify-center border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-red-50 rounded-full border border-red-100">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div> 兴奋性神经元 (Excitatory)
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div> 抑制性神经元 (Inhibitory)
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
          <div className="w-2 h-2 bg-slate-400 rounded-full"></div> 非神经元 (Glia/Other)
        </div>
      </div>
    </div>
  );
};

export default HeritabilityChart;