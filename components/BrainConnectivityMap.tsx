import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Network, ZoomIn, Activity, Share2 } from 'lucide-react';

// Enhanced 3D Node Data representing a sagittal/oblique projection
// x: Anterior-Posterior (0=Back, 100=Front)
// y: Dorsal-Ventral (0=Bottom, 100=Top)
// z: Medial-Lateral (Depth for size/opacity)
const BRAIN_NODES = [
  // Frontal Lobe
  { id: 'dlpfc', name: '背外侧前额叶 (DLPFC)', x: 85, y: 75, z: 80, score: 0.95, group: 'Cortical' },
  { id: 'ofc', name: '眶额皮层 (OFC)', x: 82, y: 35, z: 70, score: 0.75, group: 'Cortical' },
  { id: 'm1', name: '运动皮层 (M1)', x: 60, y: 88, z: 75, score: 0.60, group: 'Cortical' },
  
  // Parietal Lobe
  { id: 'pcc', name: '后扣带回 (PCC)', x: 45, y: 65, z: 90, score: 0.98, group: 'Default Mode' }, // Major Hub
  { id: 'precuneus', name: '楔前叶', x: 35, y: 75, z: 85, score: 0.85, group: 'Default Mode' },
  
  // Occipital Lobe
  { id: 'v1', name: '初级视觉皮层 (V1)', x: 10, y: 45, z: 60, score: 0.40, group: 'Sensory' },
  
  // Temporal / Limbic (Deep)
  { id: 'hippocampus', name: '海马体 (Hippocampus)', x: 55, y: 35, z: 50, score: 0.88, group: 'Limbic' },
  { id: 'amygdala', name: '杏仁核 (Amygdala)', x: 62, y: 28, z: 55, score: 0.82, group: 'Limbic' },
  { id: 'temporal', name: '颞极 (Temporal Pole)', x: 65, y: 20, z: 45, score: 0.55, group: 'Cortical' },
  
  // Subcortical / Central
  { id: 'thalamus', name: '丘脑 (Thalamus)', x: 50, y: 50, z: 40, score: 0.92, group: 'Subcortical' }, // Major Relay
  { id: 'striatum', name: '纹状体 (Striatum)', x: 55, y: 55, z: 45, score: 0.78, group: 'Subcortical' },
  { id: 'insula', name: '岛叶 (Insula)', x: 60, y: 45, z: 65, score: 0.89, group: 'Salience' },
  
  // Brainstem
  { id: 'brainstem', name: '脑干 (Brainstem)', x: 40, y: 10, z: 30, score: 0.70, group: 'Subcortical' },
];

// Define functional connections
const CONNECTIONS = [
  { start: 'dlpfc', end: 'pcc', type: 'DMN-CEN', strength: 0.8 },
  { start: 'pcc', end: 'precuneus', type: 'Structural', strength: 0.9 },
  { start: 'hippocampus', end: 'pcc', type: 'Memory', strength: 0.85 },
  { start: 'amygdala', end: 'hippocampus', type: 'Limbic', strength: 0.9 },
  { start: 'amygdala', end: 'ofc', type: 'Emotion', strength: 0.75 },
  { start: 'thalamus', end: 'm1', type: 'Motor', strength: 0.7 },
  { start: 'thalamus', end: 'v1', type: 'Sensory', strength: 0.6 },
  { start: 'thalamus', end: 'pcc', type: 'Relay', strength: 0.65 },
  { start: 'striatum', end: 'thalamus', type: 'Loop', strength: 0.8 },
  { start: 'insula', end: 'acc', type: 'Salience', strength: 0.82 },
  { start: 'dlpfc', end: 'm1', type: 'Control', strength: 0.5 },
  { start: 'brainstem', end: 'thalamus', type: 'Arousal', strength: 0.7 },
];

const BrainConnectivityMap: React.FC = () => {
  const getCoordinates = (id: string) => {
    const node = BRAIN_NODES.find(n => n.id === id);
    return node ? { x: node.x, y: node.y } : null;
  };

  return (
    <div className="bg-[#0b1121] p-0 rounded-2xl shadow-2xl border border-slate-800 h-full relative overflow-hidden group flex flex-col">
      {/* 1. Futuristic Background Grid & Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0b1121] to-[#0b1121] pointer-events-none"></div>
      
      {/* 3D Perspective Grid Floor */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)', 
             backgroundSize: '30px 30px',
             transform: 'perspective(600px) rotateX(75deg) translateY(-100px) scale(3)',
             transformOrigin: '50% 100%',
             maskImage: 'linear-gradient(to top, black, transparent)'
           }}>
      </div>

      {/* Header UI */}
      <div className="flex justify-between items-start p-6 relative z-20">
        <div>
           <h3 className="text-lg font-bold text-white flex items-center gap-2 drop-shadow-md">
             <Network className="text-cyan-400" size={20} />
             全脑功能连接组 (Connectome)
           </h3>
           <p className="text-xs text-slate-400 mt-1 max-w-[250px]">
             基于 fMRI BOLD 信号相关性的功能网络拓扑。
             节点颜色代表<span className="text-cyan-400 font-medium">功能网络归属</span>，大小代表<span className="text-indigo-400 font-medium">Hub中心度</span>。
           </p>
        </div>
        <div className="flex gap-2">
            <button className="bg-slate-800/80 p-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 text-slate-400 transition-colors">
              <Share2 size={16} />
            </button>
            <button className="bg-slate-800/80 p-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 text-cyan-400 transition-colors">
              <ZoomIn size={16} />
            </button>
        </div>
      </div>
      
      {/* Main Visualization Area */}
      <div className="flex-1 w-full relative min-h-[360px]">
         
         {/* 2. Abstract Brain Wireframe Background (SVG) */}
         <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-20" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
            <defs>
               <linearGradient id="wireframeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.6" />
               </linearGradient>
            </defs>
            {/* Brain Silhouette Path */}
            <path d="M 320 220 
                     C 350 210, 380 150, 350 100 
                     C 330 60, 250 20, 180 30 
                     C 100 40, 40 100, 40 180 
                     C 40 240, 100 270, 160 260 
                     C 200 255, 250 250, 270 260
                     C 290 270, 310 230, 320 220 Z" 
                  fill="none" stroke="url(#wireframeGrad)" strokeWidth="1.5" strokeDasharray="4 4" />
            
            {/* Internal Structures Hint */}
            <path d="M 160 260 C 160 180, 200 120, 280 100" stroke="#6366f1" strokeWidth="0.5" fill="none" opacity="0.5" />
            <ellipse cx="200" cy="160" rx="60" ry="40" stroke="#67e8f9" strokeWidth="0.5" fill="none" opacity="0.3" transform="rotate(-15 200 160)"/>
         </svg>

         {/* 3. Dynamic Connection Lines (SVG Layer) */}
         <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
            <defs>
               <filter id="glow-line" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
               </filter>
            </defs>
            {CONNECTIONS.map((conn, idx) => {
               const start = getCoordinates(conn.start);
               const end = getCoordinates(conn.end);
               if (!start || !end) return null;
               
               // Calculate opacity based on 'depth' simulation or strength
               const opacity = conn.strength * 0.6;
               
               return (
                  <g key={idx}>
                    {/* Base Line */}
                    <line 
                      x1={`${start.x}%`} y1={`${100 - start.y}%`} 
                      x2={`${end.x}%`} y2={`${100 - end.y}%`} 
                      stroke="#6366f1" 
                      strokeWidth="1"
                      strokeOpacity={opacity * 0.5}
                    />
                    {/* Active Signal Packet Animation */}
                    <circle r="2" fill="#22d3ee">
                       <animateMotion 
                          dur={`${2 + Math.random() * 2}s`} 
                          repeatCount="indefinite"
                          path={`M ${start.x*4} ${300 - (start.y*3)} L ${end.x*4} ${300 - (end.y*3)}`} 
                          // Note: SVG Coord mapping is tricky in mixed HTML/SVG. 
                          // Using simple CSS animation on lines is safer for Responsive layouts.
                       />
                       {/* Simpler CSS approach for dashes below */}
                    </circle>
                    <line 
                      x1={`${start.x}%`} y1={`${100 - start.y}%`} 
                      x2={`${end.x}%`} y2={`${100 - end.y}%`} 
                      stroke={`url(#connGradient-${idx})`} 
                      strokeWidth={conn.strength * 2}
                      strokeDasharray="6 6"
                      strokeLinecap="round"
                      className="animate-[dash_30s_linear_infinite]"
                      style={{ filter: 'url(#glow-line)', opacity: opacity }}
                    >
                       <animate attributeName="stroke-dashoffset" from="100" to="0" dur={`${3 / conn.strength}s`} repeatCount="indefinite" />
                    </line>
                    <defs>
                       <linearGradient id={`connGradient-${idx}`} gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#22d3ee" />
                       </linearGradient>
                    </defs>
                  </g>
               );
            })}
         </svg>

        {/* 4. Nodes Scatter Plot */}
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis type="number" dataKey="x" hide domain={[0, 100]} />
            <YAxis type="number" dataKey="y" hide domain={[0, 100]} />
            <ZAxis type="number" dataKey="score" range={[60, 500]} name="中心度" />
            
            <Tooltip 
              cursor={{ strokeDasharray: '3 3', stroke: '#22d3ee', strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#0f172a]/95 backdrop-blur-md border border-cyan-500/30 p-4 rounded-xl shadow-2xl min-w-[200px] animate-fade-in text-white z-50">
                      <div className="flex items-center justify-between mb-2">
                         <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                            data.group === 'Default Mode' ? 'border-red-500/50 text-red-400 bg-red-900/20' : 
                            data.group === 'Limbic' ? 'border-amber-500/50 text-amber-400 bg-amber-900/20' : 
                            'border-cyan-500/50 text-cyan-400 bg-cyan-900/20'
                         }`}>
                           {data.group}
                         </span>
                         <Activity size={14} className="text-slate-400" />
                      </div>
                      <p className="font-bold text-lg mb-1">{data.name}</p>
                      <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 mb-1 overflow-hidden">
                         <div className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full" style={{ width: `${data.score * 100}%` }}></div>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                         <span>Connectivity</span>
                         <span className="font-mono text-cyan-300">{data.score.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            
            <Scatter data={BRAIN_NODES} animationDuration={1000}>
              {BRAIN_NODES.map((entry, index) => {
                // Determine color based on Hub status or Group
                const isHub = entry.score > 0.9;
                let fillColor = '#6366f1'; // Indigo (Default)
                
                if (entry.group === 'Default Mode') fillColor = '#f43f5e'; // Rose
                if (entry.group === 'Limbic') fillColor = '#f59e0b'; // Amber
                if (entry.group === 'Sensory') fillColor = '#10b981'; // Emerald
                if (entry.group === 'Subcortical') fillColor = '#8b5cf6'; // Violet
                
                // Depth Effect: Opacity based on 'z'
                const depthOpacity = 0.4 + (entry.z / 100) * 0.6;
                
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={fillColor}
                    fillOpacity={depthOpacity}
                    stroke={isHub ? '#fff' : fillColor}
                    strokeWidth={isHub ? 2 : 0}
                    className={isHub ? "animate-pulse" : ""}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend / Status Footer */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-20">
        <div className="flex items-center gap-4 bg-slate-900/80 rounded-full px-5 py-2 border border-slate-700 shadow-xl backdrop-blur-md">
           <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
              <span className="text-[10px] text-slate-300 font-medium">DMN 核心网络</span>
           </div>
           <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
              <span className="text-[10px] text-slate-300 font-medium">边缘系统</span>
           </div>
           <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
              <span className="text-[10px] text-slate-300 font-medium">突显网络</span>
           </div>
           <div className="h-3 w-px bg-slate-600 mx-1"></div>
           <div className="text-[10px] text-indigo-300 font-mono animate-pulse">
              Live Data: 120ms
           </div>
        </div>
      </div>
    </div>
  );
};

export default BrainConnectivityMap;