/**
 * VAANI AI - Flask Backend Integration API Service
 * Handles communication with the local Flask server (http://127.0.0.1:5000)
 */

import { BASE_URL } from '../config/config';
import { handleServiceError } from './errorHandler';

/**
 * Parses and validates raw input text into structured missile data fields.
 * Supports JSON, key-value lines, comma-separated tokens, and a raw text fallback.
 * 
 * @param {string} text - Raw input text from the editor
 * @returns {Object} Structured payload (guaranteed non-null fallback)
 */
export function parseInputToMissileData(text) {
  if (!text || !text.trim()) {
    throw new Error("Input text cannot be empty.");
  }

  const cleanText = text.trim();

  // Try parsing as JSON first
  try {
    const parsed = JSON.parse(cleanText);
    if (parsed && typeof parsed === 'object') {
      return parsed; // Send whatever JSON fields they typed (e.g. missile, mv)
    }
  } catch (err) {
    // Not valid JSON, just pass it as raw text
  }

  // Pass as raw text
  return { text: cleanText };
}

/**
 * Sends structured missile telemetry to the local Flask backend /generate endpoint.
 * @param {Object} data - Structured missile report details
 * @returns {Promise<Object>} Backend generated report and optional audio file
 */
export async function generateMissileReport(data) {
  console.log("[VAANI AI API] Outgoing HTTP POST request to:", `${BASE_URL}/generate`);
  console.log("[VAANI AI API] Request Payload:", JSON.stringify(data, null, 2));

  try {
    const response = await fetch(`${BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    console.log("[VAANI AI API] HTTP Response Status:", response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error("[VAANI AI API] Server Error Body:", errText);
      
      // Parse specific exceptions forwarded by backend
      if (errText.toLowerCase().includes('ollama') && errText.toLowerCase().includes('running')) {
        throw new Error("Ollama unavailable. Verify your local Ollama server is active and running.");
      }
      throw new Error(`Backend server error (${response.status}): ${errText || response.statusText}`);
    }

    const json = await response.json();
    console.log("[VAANI AI API] Received Response JSON:", JSON.stringify(json, null, 2));
    
    // Guard against malformed JSON structures
    if (!json || typeof json !== 'object') {
      throw new Error("Invalid JSON structure received from local Flask backend.");
    }
    
    if (json.generated_text === undefined && json.generated_text === null) {
      throw new Error("Unexpected response: missing 'generated_text' property.");
    }

    return json;
  } catch (error) {
    console.error("[VAANI AI API] Connection Exception Caught:", error);
    
    // Catch fetch/connection issues
    if (error.name === 'TypeError' && (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network'))) {
      const connectionError = new Error("Cannot connect to backend. Backend is not running.");
      throw handleServiceError(connectionError);
    }
    throw handleServiceError(error);
  }
}
