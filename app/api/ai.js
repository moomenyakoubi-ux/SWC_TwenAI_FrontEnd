import { API_BASE } from '../config/api';

const PERMESSO_KEYWORDS = [
  'permesso di soggiorno',
  'permesso soggiorno',
  'questura',
  'ufficio immigrazione',
  'sportello amico',
  'kit',
  'mod 209',
  'mod. 209',
  'ricevuta poste',
  'codice assicurata',
  'codice ologramma',
  'impronte',
  'rinnovo permesso',
  'conversione',
  'decreto flussi',
];

export const inferIntentFromQuestion = (question) => {
  const normalized = String(question || '').toLowerCase();
  const isPermesso = PERMESSO_KEYWORDS.some((keyword) => normalized.includes(keyword));
  return isPermesso ? 'permesso_soggiorno' : 'passaporto';
};

export const askAI = async (question, options = {}) => {
  const baseUrl = (API_BASE || '').replace(/\/$/, '');
  const manualIntent = options?.intent;
  const intent = manualIntent || inferIntentFromQuestion(question);
  const requestedLang = String(options?.lang || 'it').trim().toLowerCase();
  const lang = requestedLang === 'ar' ? 'ar' : 'it';
  const payload = {
    question,
    intent,
    lang,
  };
  if (__DEV__) {
    console.log('[askAI] payload', payload);
  }
  const response = await fetch(`${baseUrl}/api/ai/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`);
  }

  return response.json();
};
