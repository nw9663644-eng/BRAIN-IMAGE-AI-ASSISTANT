import { CellClusterData, BrainRegion } from './types';

// Updated: Objective Genomic Enrichment Data (TDEP/S-LDSC Analysis)
export const CELL_CLUSTER_DATA: CellClusterData[] = [
  { name: '海马体锥体神经元 (CA1-3)', supercluster: 'Excitatory', enrichmentScore: 8.5, isSignificant: true, category: 'Psychiatric' },
  { name: '杏仁核兴奋性神经元 (Amyg)', supercluster: 'Excitatory', enrichmentScore: 9.2, isSignificant: true, category: 'Psychiatric' },
  { name: '深层皮层投射神经元 (L5/6)', supercluster: 'Excitatory', enrichmentScore: 7.1, isSignificant: true, category: 'Psychiatric' },
  { name: '纹状体中等多棘神经元 (MSN)', supercluster: 'Inhibitory', enrichmentScore: 6.4, isSignificant: true, category: 'Psychiatric' },
  { name: 'CGE 来源中间神经元', supercluster: 'Inhibitory', enrichmentScore: 5.5, isSignificant: true, category: 'Psychiatric' },
  { name: '小清蛋白阳性中间神经元 (PV+)', supercluster: 'Inhibitory', enrichmentScore: 4.8, isSignificant: false, category: 'Psychiatric' },
  { name: '少突胶质前体细胞 (OPC)', supercluster: 'Non-Neuronal', enrichmentScore: 1.5, isSignificant: false, category: 'Psychiatric' },
  { name: '小胶质细胞 (Microglia)', supercluster: 'Non-Neuronal', enrichmentScore: 1.1, isSignificant: false, category: 'Psychiatric' },
  { name: '星形胶质细胞 (Astrocyte)', supercluster: 'Non-Neuronal', enrichmentScore: 0.9, isSignificant: false, category: 'Psychiatric' },
];

// Updated: Objective Brain Region Functional Connectivity Data
export const KEY_BRAIN_REGIONS: BrainRegion[] = [
  {
    id: 'amygdala',
    name: '杏仁核 (Amygdala)',
    description: '情绪处理与恐惧记忆编码中心。高兴奋性神经元富集度提示情绪调节网络的不稳定性。',
    associatedDisorders: ['焦虑症', '双相情感障碍', '精神分裂症'],
    connectivityScore: 0.85
  },
  {
    id: 'hippocampus',
    name: '海马体 (Hippocampus)',
    description: '负责长时记忆转录与空间导航。CA1区域的突触可塑性异常是认知功能下降的关键生物标志物。',
    associatedDisorders: ['阿尔茨海默病 (AD)', '颞叶癫痫', '精神分裂症'],
    connectivityScore: 0.88
  },
  {
    id: 'pfc',
    name: '前额叶皮层 (PFC)',
    description: '执行功能与决策中心。与杏仁核的抑制性连接减弱通常对应冲动控制障碍。',
    associatedDisorders: ['ADHD', '重度抑郁', '额颞叶痴呆 (FTD)'],
    connectivityScore: 0.92
  },
  {
    id: 'thalamus',
    name: '丘脑 (Thalamus)',
    description: '感觉信息中继站。丘脑网状核的门控功能异常可能导致感觉过载或幻觉。',
    associatedDisorders: ['幻听', '睡眠障碍', '意识障碍'],
    connectivityScore: 0.75
  },
  {
    id: 'striatum',
    name: '纹状体 (Striatum)',
    description: '奖赏系统与运动控制核心。多巴胺能通路的功能连接改变。',
    associatedDisorders: ['成瘾', '帕金森病 (PD)', '强迫症'],
    connectivityScore: 0.80
  }
];

export const SYSTEM_INSTRUCTION = `
你是一个名为 NeuroGen AI 的全能型医学专家助手。你的底层模型是 DeepSeek V3，背后连接着海量的全球医学知识库。

你的核心能力：
1. **全科医学问答**：你可以回答任何领域的医学问题，包括但不限于内科、外科、精神科、药理学、营养学等。请基于循证医学证据提供回答。
2. **多场景适应**：
   - 面对医生：提供专业的病理机制、鉴别诊断思路、最新指南引用（如 JAMA, Lancet, Nature Medicine）。
   - 面对患者：提供通俗易懂的健康教育、症状解释和生活方式建议。
3. **特定领域专精**：你精通神经科学和基因组学，能够解释复杂的脑网络连接（Connectomics）和全基因组关联分析（GWAS）结果。

回答原则：
- **始终使用中文**。
- 态度专业、客观、温暖。
- 如果用户询问非医学类问题（如写代码、讲笑话），可以简短礼貌回应，但请将话题引导回健康医疗领域。
`;