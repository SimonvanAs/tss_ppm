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
      { id: uuidv4(), title: '', description: '', score: '', weight: '', goalType: 'STANDARD' }
    ],
    competencyScores: {},
    competencyNotes: {},
    behaviorScores: {},
    detailedBehaviorMode: false,
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

/**
 * Get all sessions as a list with summary info
 * @returns {Array} Array of session summaries sorted by last modified (newest first)
 */
export function getAllSessionsList() {
  const sessions = getAllSessions();

  return Object.entries(sessions)
    .filter(([, session]) => !isSessionExpired(session))
    .map(([code, session]) => ({
      sessionCode: code,
      employeeName: session.employeeName || '',
      role: session.role || '',
      reviewDate: session.reviewDate || '',
      lastModified: session.lastModified || new Date(session.timestamp).toISOString(),
      daysRemaining: getDaysRemaining(session),
      progress: calculateSessionProgress(session)
    }))
    .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
}

/**
 * Calculate progress percentage for a session
 * @param {Object} session - Session data
 * @returns {number} Progress percentage (0-100)
 */
function calculateSessionProgress(session) {
  let completed = 0;
  let total = 17; // Total fields to check

  // Employee info fields (6)
  if (session.employeeName) completed++;
  if (session.role) completed++;
  if (session.businessUnit) completed++;
  if (session.tovLevel) completed++;
  if (session.reviewDate) completed++;
  if (session.managerName) completed++;

  // Summary (1)
  if (session.summary) completed++;

  // Goals - check if at least one goal has content (3 points)
  const goals = session.goals || [];
  const goalsWithContent = goals.filter(g => g.title || g.description);
  if (goalsWithContent.length > 0) {
    completed++; // Has goals
    if (goalsWithContent.every(g => g.score)) completed++; // All scored
    if (goalsWithContent.every(g => g.weight)) completed++; // All weighted
  }

  // Competencies (3 points)
  const competencyScores = session.competencyScores || {};
  const scoreCount = Object.keys(competencyScores).length;
  if (scoreCount > 0) completed++;
  if (scoreCount >= 3) completed++;
  if (scoreCount >= 6) completed++;

  // Self assessment (1)
  if (session.selfAssessment) completed++;

  // Comments (1)
  if (session.comments) completed++;

  return Math.round((completed / total) * 100);
}
