/**
 * Case management service — connects to /api/cases endpoints.
 */

import { MedicalCase, CaseMessage, UserRole } from '../types';
import { apiFetch } from './api';

// ─── API Response types ──────────────────────────────────

interface CaseMessageAPI {
    id: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    text: string;
    timestamp: string;
}

interface MedicalCaseAPI {
    id: string;
    patientId: string;
    patientName: string;
    imageUrl: string | null;
    description: string;
    timestamp: string;
    status: 'pending' | 'completed';
    doctorFeedback?: string;
    doctorName?: string;
    replyTimestamp?: string;
    messages: CaseMessageAPI[];
    hasUnreadForDoctor: boolean;
    hasUnreadForPatient: boolean;
    modality?: string;
    tags?: string[];
}

// ─── Converters ──────────────────────────────────────────

function toCaseMessage(m: CaseMessageAPI): CaseMessage {
    return {
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderName,
        senderRole: m.senderRole as UserRole,
        text: m.text,
        timestamp: m.timestamp,
    };
}

function toMedicalCase(c: MedicalCaseAPI): MedicalCase {
    return {
        id: c.id,
        patientId: c.patientId,
        patientName: c.patientName,
        imageUrl: c.imageUrl,
        description: c.description,
        timestamp: c.timestamp,
        status: c.status,
        doctorFeedback: c.doctorFeedback,
        doctorName: c.doctorName,
        replyTimestamp: c.replyTimestamp,
        messages: (c.messages || []).map(toCaseMessage),
        hasUnreadForDoctor: c.hasUnreadForDoctor,
        hasUnreadForPatient: c.hasUnreadForPatient,
        modality: c.modality as any,
        tags: c.tags,
    };
}

// ─── API Functions ───────────────────────────────────────

export async function fetchCases(): Promise<MedicalCase[]> {
    const data = await apiFetch<MedicalCaseAPI[]>('/api/cases');
    return data.map(toMedicalCase);
}

export async function fetchCase(caseId: string): Promise<MedicalCase> {
    const data = await apiFetch<MedicalCaseAPI>(`/api/cases/${caseId}`);
    return toMedicalCase(data);
}

export async function createCase(params: {
    description: string;
    modality?: string;
    tags?: string[];
    imageFile?: File | null;
}): Promise<MedicalCase> {
    const formData = new FormData();
    formData.append('description', params.description);

    if (params.modality) {
        formData.append('modality', params.modality);
    }
    if (params.tags && params.tags.length > 0) {
        formData.append('tags', params.tags.join(','));
    }
    if (params.imageFile) {
        formData.append('image', params.imageFile);
    }

    const data = await apiFetch<MedicalCaseAPI>('/api/cases', {
        method: 'POST',
        body: formData,
        isFormData: true,
    });

    return toMedicalCase(data);
}

export async function sendCaseMessage(
    caseId: string,
    text: string
): Promise<CaseMessage> {
    const data = await apiFetch<CaseMessageAPI>(`/api/cases/${caseId}/messages`, {
        method: 'POST',
        body: { text },
    });
    return toCaseMessage(data);
}

export async function submitDiagnosis(
    caseId: string,
    feedback: string
): Promise<MedicalCase> {
    const data = await apiFetch<MedicalCaseAPI>(`/api/cases/${caseId}/diagnosis`, {
        method: 'POST',
        body: { feedback },
    });
    return toMedicalCase(data);
}

export async function markCaseAsRead(caseId: string): Promise<void> {
    await apiFetch(`/api/cases/${caseId}/read`, { method: 'PATCH' });
}
