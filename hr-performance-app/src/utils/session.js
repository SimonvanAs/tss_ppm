import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'hr_performance_sessions';
const SESSION_EXPIRY_DAYS = 14;

/**
 * Generate a unique session code (8-12 alphanumeric characters)
 * @returns {string} Session code
 */
export function generateSessionCode() {
  const uuid = uuidv4().replace(/-/g, '').toUpperCase();
  return uuid.substring(0, 10);
}

/**
 * Get all stored sessions
 * @returns {Object} Sessions object keyed by session code
 */
function getAllSessions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error('Error reading sessions from localStorage:', e);
    return {};
  }
}

/**
 * Save all sessions to localStorage
 * @param {Object} sessions - Sessions object
 */
function saveAllSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Error saving sessions to localStorage:', e);
  }
}

/**
 * Check if a session is expired
 * @param {Object} session - Session object with timestamp
 * @returns {boolean} True if expired
 */
function isSessionExpired(session) {
  if (!session?.timestamp) return true;

  const expiryTime = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - session.timestamp > expiryTime;
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions() {
  const sessions = getAllSessions();
  const cleanedSessions = {};

  Object.entries(sessions).forEach(([code, session]) => {
    if (!isSessionExpired(session)) {
      cleanedSessions[code] = session;
    }
  });

  saveAllSessions(cleanedSessions);
}

/**
 * Save form data to a session
 * @param {string} sessionCode - Session code
 * @param {Object} formData - Form data to save
 */
export function saveSession(sessionCode, formData) {
  const sessions = getAllSessions();

  sessions[sessionCode] = {
    ...formData,
    timestamp: Date.now(),
    lastModified: new Date().toISOString()
  };

  saveAllSessions(sessions);
}

/**
 * Load a session by code
 * @param {string} sessionCode - Session code
 * @returns {Object|null} Session data or null if not found/expired
 */
export function loadSession(sessionCode) {
  const sessions = getAllSessions();
  const session = sessions[sessionCode?.toUpperCase()];

  if (!session) return null;

  if (isSessionExpired(session)) {
    // Clean up this expired session
    delete sessions[sessionCode.toUpperCase()];
    saveAllSessions(sessions);
    return null;
  }

  return session;
}

/**
 * Delete a session
 * @param {string} sessionCode - Session code to delete
 */
export function deleteSession(sessionCode) {
  const sessions = getAllSessions();
  delete sessions[sessionCode?.toUpperCase()];
  saveAllSessions(sessions);
}

/**
 * Get days remaining before session expires
 * @param {Object} session - Session object with timestamp
 * @returns {number} Days remaining
 */
export function getDaysRemaining(session) {
  if (!session?.timestamp) return 0;

  const expiryTime = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const timeRemaining = (session.timestamp + expiryTime) - Date.now();
  return Math.max(0, Math.ceil(timeRemaining / (24 * 60 * 60 * 1000)));
}

/**
 * Create initial form data structure
 * @returns {Object} Initial form data
 */
export function createInitialFormData() {
  return {
    employeeName: '',
    role: '',
    businessUnit: '',
    tovLevel: '',
    reviewDate: new Date().toISOString().split('T')[0],
    managerName: '',
    summary: '',
    goals: [
      { id: uuidv4(), title: '', description: '', score: '', weight: '' }
    ],
    competencyScores: {},
    selfAssessment: '',
    comments: '',
    language: 'en'
  };
}

/**
 * Sanitize input to prevent XSS
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Decode sanitized input for display
 * @param {string} input - Sanitized input
 * @returns {string} Decoded input
 */
export function decodeInput(input) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}
