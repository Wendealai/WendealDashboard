/**
 * Inspection Service - n8n Single-Endpoint API with localStorage Fallback
 *
 * Single POST endpoint: https://n8n.wendealai.com.au/webhook/inspection-api
 * Actions: submit, load, list, delete
 *
 * Falls back to localStorage if n8n is unreachable.
 */

import type { CleaningInspection } from '@/pages/CleaningInspection/types';

/** n8n single API endpoint */
const API_ENDPOINT = 'https://n8n.wendealai.com.au/webhook/inspection-api';
const LOCAL_STORAGE_KEY = 'archived-cleaning-inspections';

/**
 * Call the n8n API with an action and payload
 */
async function callApi(payload: Record<string, any>): Promise<any> {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Submit a completed inspection to n8n backend.
 * Always saves to localStorage first as backup.
 */
export async function submitInspection(
  inspection: CleaningInspection
): Promise<{ success: boolean; source: 'n8n' | 'localStorage' }> {
  // Always save to localStorage first (as backup)
  saveToLocalStorage(inspection);

  try {
    const result = await callApi({
      action: 'submit',
      data: inspection,
    });

    if (result.success) {
      console.log('[InspectionService] Submitted to n8n:', result.id);
      return { success: true, source: 'n8n' };
    }

    console.warn('[InspectionService] n8n submit failed:', result.error);
    return { success: true, source: 'localStorage' };
  } catch (error) {
    console.warn(
      '[InspectionService] n8n unreachable, using localStorage:',
      error
    );
    return { success: true, source: 'localStorage' };
  }
}

/**
 * Load an inspection by ID. Tries n8n first, falls back to localStorage.
 */
export async function loadInspection(
  id: string
): Promise<CleaningInspection | null> {
  // Try n8n first
  try {
    const result = await callApi({ action: 'load', id });
    if (result.success && result.data) {
      console.log('[InspectionService] Loaded from n8n:', id);
      return result.data as CleaningInspection;
    }
  } catch {
    console.warn('[InspectionService] n8n load failed, trying localStorage');
  }

  // Fallback to localStorage
  return loadFromLocalStorage(id);
}

/**
 * Load all inspections from localStorage.
 * In the future, can also call n8n list action.
 */
export function loadAllInspections(): CleaningInspection[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Delete an inspection from both n8n and localStorage.
 */
export async function deleteInspection(id: string): Promise<void> {
  // Delete from localStorage
  try {
    const archives = loadAllInspections().filter(a => a.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(archives));
  } catch {
    console.error('[InspectionService] localStorage delete failed');
  }

  // Also delete from n8n (best effort)
  try {
    await callApi({ action: 'delete', id });
  } catch {
    // Silently ignore n8n delete failures
  }
}

// ──────────────────── localStorage Helpers ──────────────────────

/**
 * Save inspection to localStorage archive
 */
function saveToLocalStorage(inspection: CleaningInspection): void {
  try {
    const archives = loadAllInspections();
    const existingIndex = archives.findIndex(a => a.id === inspection.id);
    if (existingIndex >= 0) {
      archives[existingIndex] = inspection;
    } else {
      archives.unshift(inspection);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(archives));
  } catch (error) {
    console.error('[InspectionService] localStorage save failed:', error);
  }
}

/**
 * Load a single inspection from localStorage by ID
 */
function loadFromLocalStorage(id: string): CleaningInspection | null {
  try {
    const archives = loadAllInspections();
    return (archives.find(a => a.id === id) as CleaningInspection) || null;
  } catch {
    return null;
  }
}
