import { UserProfile, AnalysisResult } from '../types';

// Simple hash function to generate a seed from a string (User ID)
const hashCode = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Generate specific analysis results based on the user ID
// This ensures different users see different results, but the same user always sees the same result.
export const generateAnalysisResult = (userId: string): AnalysisResult => {
  const seed = hashCode(userId);
  
  const regions = ['海马体 CA1', '杏仁核 (BLA)', '前额叶皮层 (PFC)', '丘脑网状核', '纹状体', '黑质 (SNpc)'];
  const diagnoses = [
    '建议进行进一步的 fMRI 扫描以排除焦虑症风险。',
    '遗传风险评分较低，建议保持健康睡眠习惯。',
    '检测到海马体功能连接减弱，建议关注记忆力变化以排查早期 AD。',
    '神经回路连接正常，处于健康范围。',
    '多巴胺能通路活跃度异常，建议排查帕金森病风险。',
    '脑白质高信号提示轻度脑小血管病变，建议控制血压。'
  ];

  return {
    riskScore: (seed % 60) + 20, // Random score between 20 and 80
    dominantRegion: regions[seed % regions.length],
    diagnosisSuggestion: diagnoses[seed % diagnoses.length],
    geneCount: (seed % 500) + 100
  };
};