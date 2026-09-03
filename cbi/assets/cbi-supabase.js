const SUPABASE_URL = "https://wtiugprfadlwfpmfnvhe.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bAPAi8NU0f2LN0qrHiHQgw_ii3ge-gS";
const SESSION_STORAGE_KEY = "cbi.supabase.session";

function isConfigured() {
  return !SUPABASE_PUBLISHABLE_KEY.startsWith("PENDING_");
}

function configuredOrThrow() {
  if (!isConfigured()) {
    throw new Error("La conexion con Supabase esta pendiente de clave publicable.");
  }
}

function normalizeSession(payload) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: payload.expires_at || now + Number(payload.expires_in || 3600),
    user: payload.user,
  };
}

function saveSession(session) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function readSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    clearSession();
    return null;
  }
}

function clearSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

function translateError(message) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "Email pendiente de confirmacion.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Usuario o contrasena incorrectos.";
  }

  return message;
}

async function readResponse(response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      payload?.msg ||
      payload?.message ||
      payload?.error_description ||
      payload?.error ||
      "La operacion no se ha podido completar.";
    throw new Error(translateError(message));
  }

  return payload;
}

async function supabaseFetch(path, options = {}) {
  configuredOrThrow();

  const headers = new Headers(options.headers || {});
  headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);

  if (options.session?.access_token) {
    headers.set("Authorization", `Bearer ${options.session.access_token}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers,
    body:
      options.body && typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : options.body,
  });

  return readResponse(response);
}

async function refreshSession(session) {
  if (!session?.refresh_token) return null;

  try {
    const payload = await supabaseFetch("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: { refresh_token: session.refresh_token },
    });
    const refreshed = normalizeSession(payload);
    saveSession(refreshed);
    return refreshed;
  } catch {
    clearSession();
    return null;
  }
}

async function getSession() {
  const session = readSession();
  if (!session?.access_token) return null;

  const expiresSoon = Number(session.expires_at || 0) - Math.floor(Date.now() / 1000) < 90;
  if (expiresSoon) {
    return refreshSession(session);
  }

  return session;
}

async function signIn(email, password) {
  const payload = await supabaseFetch("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
  const session = normalizeSession(payload);
  saveSession(session);
  return session;
}

async function signOut() {
  const session = readSession();
  clearSession();

  if (!session?.access_token || !isConfigured()) return;

  try {
    await supabaseFetch("/auth/v1/logout", {
      method: "POST",
      session,
    });
  } catch {
    // Local logout has already happened.
  }
}

async function getProfile(session) {
  const userId = encodeURIComponent(session.user.id);
  const result = await supabaseFetch(
    `/rest/v1/profiles?select=id,email,full_name,role,status&id=eq.${userId}`,
    { session },
  );
  return result?.[0] || null;
}

async function requireSession(options = {}) {
  const session = await getSession();
  if (!session) {
    window.location.replace("./acceso.html");
    return null;
  }

  const profile = await getProfile(session);
  if (!profile || profile.status !== "active") {
    await signOut();
    window.location.replace("./acceso.html");
    return null;
  }

  if (options.adminOnly && profile.role !== "admin") {
    window.location.replace("./convocatorias.html");
    return null;
  }

  return { session, profile };
}

async function listCalls(session) {
  return supabaseFetch(
    "/rest/v1/calls?select=id,code,name,status&status=eq.active&order=name.asc",
    { session },
  );
}

async function invokeAdminUsers(session, options = {}) {
  return supabaseFetch("/functions/v1/admin-users", {
    ...options,
    session,
  });
}

export const CBI = {
  clearSession,
  getProfile,
  getSession,
  invokeAdminUsers,
  isConfigured,
  listCalls,
  requireSession,
  signIn,
  signOut,
  url: SUPABASE_URL,
};
