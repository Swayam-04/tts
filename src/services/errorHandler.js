/**
 * VAANI AI - Centralized Error Handler
 * Standardizes errors across Backend API, Ollama, and loopback daemons.
 */

/**
 * Standardized Error Response Model
 * @typedef {Object} ServiceError
 * @property {string} message - User-friendly error message
 * @property {string} type - Error category (e.g. BACKEND_OFFLINE, OLLAMA_UNAVAILABLE, REQUEST_TIMEOUT, INVALID_RESPONSE, UNKNOWN)
 * @property {string} technicalDetails - Raw stack trace or error log
 * @property {string} timestamp - Occurrence timestamp
 */

/**
 * Intercepts and parses exceptions into standardized error objects
 * @param {Error} error - Captured exception
 * @returns {ServiceError} Standardized error payload
 */
export function handleServiceError(error) {
  console.error("[VAANI AI Central Handler] Exception Caught:", error);
  
  const parsed = {
    message: error.message || "An unexpected system exception occurred during secure processing.",
    type: "UNKNOWN",
    technicalDetails: error.stack || error.toString(),
    timestamp: new Date().toLocaleTimeString()
  };

  const errorMsg = error.message ? error.message.toLowerCase() : '';

  // Identify specific backend issues based on error trace
  if (errorMsg.includes("404")) {
    parsed.type = "404_NOT_FOUND";
    parsed.message = "Backend API route not found (404).";
  } else if (errorMsg.includes("500")) {
    parsed.type = "500_INTERNAL_ERROR";
    parsed.message = "Internal server error on backend (500).";
  } else if (errorMsg.includes("refused")) {
    parsed.type = "CONNECTION_REFUSED";
    parsed.message = "Connection refused by the backend server.";
  } else if (errorMsg.includes("timeout")) {
    parsed.type = "REQUEST_TIMEOUT";
    parsed.message = "Request timeout. The backend took too long to respond.";
  } else if (errorMsg.includes("invalid json")) {
    parsed.type = "INVALID_JSON";
    parsed.message = "Invalid JSON payload structure received.";
  } else if (errorMsg.includes("cannot connect") || errorMsg.includes("backend is not running") || errorMsg.includes("fetch") || errorMsg.includes("network")) {
    parsed.type = "BACKEND_UNAVAILABLE";
    parsed.message = "Backend unavailable. Cannot reach Flask server.";
  } else {
    // Prevent generic UNKNOWN by attempting to display the raw message
    parsed.type = "BACKEND_ERROR";
    parsed.message = error.message || "An error occurred during communication.";
  }

  return parsed;
}
