/**
 * AI Analysis service — connects to /api/analysis endpoints.
 */

import { AnalysisResult, AIAnalysisReport } from '../types';
import { apiFetch } from './api';

/**
 * Run multimodal AI analysis with image + optional gene file.
 * This replaces the direct frontend->DeepSeek call and routes through the backend.
 */
export async function runMultimodalAnalysis(
    imageFile: File,
    geneFile?: File | null
): Promise<AIAnalysisReport & { diseaseRisks: any[]; gwasAnalysis: any[]; modelConfidence: any[]; lifecycleProjection: any[] }> {
    const formData = new FormData();
    formData.append('image_file', imageFile);

    if (geneFile) {
        formData.append('gene_file', geneFile);
    }

    return apiFetch('/api/analysis/multimodal', {
        method: 'POST',
        body: formData,
        isFormData: true,
    });
}

/**
 * Get a deterministic health report for a user (mirrors mockData.ts logic on backend).
 */
export async function getHealthReport(userId: string): Promise<AnalysisResult> {
    return apiFetch<AnalysisResult>(`/api/analysis/health-report/${userId}`);
}

/**
 * Chat with the AI medical assistant via the backend.
 * This replaces the direct frontend->DeepSeek API call.
 */
export async function chatWithAI(
    messages: { role: string; content: string }[],
    jsonMode: boolean = false
): Promise<string> {
    const data = await apiFetch<{ content: string }>('/api/analysis/chat', {
        method: 'POST',
        body: { messages, json_mode: jsonMode },
    });
    return data.content;
}
