const CONFIG = {
  googleAppsScriptUrl:
    "https://script.google.com/macros/s/AKfycbzFAaSMHS_z-C6Pt1hZiD72buNCFcm6d1TlSe1CorRT6IWHB5oK76yHPMCP8PDxr1AYgA/exec",
  showExplanations: true,
  requestTimeoutMs: 15000
};

async function apiRequest(action, payload = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);

  try {
    const response = await fetch(CONFIG.googleAppsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("Server error: " + response.status);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data;

  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Google Sheet request timeout");
    }
    throw err;

  } finally {
    clearTimeout(timeout);
  }
}
