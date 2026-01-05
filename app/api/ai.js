import { BACKEND_BASE_URL } from '../config/api';

export const askAI = async (question) => {
  const baseUrl = (BACKEND_BASE_URL || '').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/ai/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      intent: null,
      lang: 'it',
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`);
  }

  return response.json();
};
