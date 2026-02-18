/**
 * This service is DEPRECATED.
 * All AI calls now go through the backend via deepSeekService.ts → POST /chat.
 * This file is kept for reference only.
 */

import { SYSTEM_INSTRUCTION } from '../constants';

let chatSession: any = null;

export const initializeGenAI = () => {
  // No-op: AI is now handled by the backend
};

export const startChat = (isDoctor: boolean) => {
  // No-op: AI is now handled by the backend
  chatSession = true;
};

export const sendMessage = async (message: string): Promise<string> => {
  // Redirect to backend via deepSeekService
  const { callDeepSeekAPI } = await import('./deepSeekService');

  const messages = [
    { role: 'system' as const, content: SYSTEM_INSTRUCTION },
    { role: 'user' as const, content: message },
  ];

  return callDeepSeekAPI(messages);
};