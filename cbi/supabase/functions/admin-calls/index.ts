import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Content-Type": "application/json",
};

const callKinds = new Set(["normal", "strategy", "tracking", "sprint"]);
const callStatuses = new Set(["draft", "active", "inactive", "archived"]);
const fixedRoutes: Record<string, string> = {
  strategy: "./estrategia-financiacion-demo.html",
  tracking: "./seguimiento-demo.html",
  sprint: "./sprint-demo.html",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function getSecretKey() {
  const modernKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modernKeys) {
    const parsed = JSON.parse(modernKeys);
    if (parsed.default) return parsed.default;
  }

  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;
  throw new Error("No hay clave segura disponible en Edge Functions.");
}

function createAdminClient() {
  return createClient(Deno.env.get("SUPABASE_URL") || "", getSecretKey(), {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Falta el campo ${field}.`);
  }
  return value.trim();
}

function optionalEnum(value: unknown, allowed: Set<string>, fallback: string) {
  return typeof value === "string" && allowed.has(value) ? value : fallback;
}

function normalizeCode(value: unknown) {
  const code = requireString(value, "codigo").toUpperCase().replace(/\s+/g, "-");
  if (!/^[A-Z0-9][A-Z0-9_-]{2,79}$/.test(code)) {
    throw new Error("El codigo solo puede contener letras, numeros, guiones y guiones bajos.");
  }
  return code;
}

function normalizeRoute(value: unknown, kind: string) {
  if (fixedRoutes[kind]) return fixedRoutes[kind];
  if (value === null || value === undefined || value === "") return null;
  const route = requireString(value, "ruta");
  if (!/^\.\/[a-z0-9-]+\.html$/.test(route)) {
    throw new Error("La ruta debe tener el formato ./nombre-dashboard.html.");
  }
  return route;
}

async function requireAdmin(req: Request, admin: ReturnType<typeof createAdminClient>) {
  const authorization = req.headers.get("Authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("Sesion no encontrada."), { status: 401 });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    throw Object.assign(new Error("Sesion no valida."), { status: 401 });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, status")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin" || profile.status !== "active") {
    throw Object.assign(new Error("Acceso reservado a administradores."), { status: 403 });
  }
  return userData.user;
}

async function listData(admin: ReturnType<typeof createAdminClient>) {
  const [callsResult, accessResult] = await Promise.all([
    admin
      .from("calls")
      .select("id, code, name, kind, description, route_path, status, created_at, updated_at")
      .order("name"),
    admin.from("user_call_access").select("user_id, call_id, access_level"),
  ]);
  if (callsResult.error) throw callsResult.error;
  if (accessResult.error) throw accessResult.error;
  return { calls: callsResult.data || [], access: accessResult.data || [] };
}

function callValues(body: Record<string, unknown>) {
  const kind = optionalEnum(body.kind, callKinds, "normal");
  return {
    code: normalizeCode(body.code),
    name: requireString(body.name, "nombre"),
    kind,
    route_path: normalizeRoute(body.route_path, kind),
    status: optionalEnum(body.status, callStatuses, "draft"),
  };
}

async function createCall(body: Record<string, unknown>, admin: ReturnType<typeof createAdminClient>) {
  const values = callValues(body);
  const { data, error } = await admin.from("calls").insert(values).select("id").single();
  if (error || !data) throw error || new Error("No se ha creado la call.");
  return data.id;
}

async function updateCall(body: Record<string, unknown>, admin: ReturnType<typeof createAdminClient>) {
  const id = requireString(body.id, "id");
  const values = callValues(body);
  const { data, error } = await admin.from("calls").update(values).eq("id", id).select("id").single();
  if (error || !data) throw error || new Error("La call ya no existe.");
  return id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createAdminClient();
    const actor = await requireAdmin(req, admin);
    if (req.method === "GET") return json(await listData(admin));

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("El cuerpo de la solicitud no es válido.");
    }
    if (req.method === "POST") {
      const callId = await createCall(body, admin);
      await admin.from("audit_log").insert({
        actor_user_id: actor.id,
        action: "call.create",
        entity_type: "call",
        entity_id: callId,
      });
      return json(await listData(admin), 201);
    }

    if (req.method === "PATCH") {
      const callId = await updateCall(body, admin);
      await admin.from("audit_log").insert({
        actor_user_id: actor.id,
        action: "call.update",
        entity_type: "call",
        entity_id: callId,
      });
      return json(await listData(admin));
    }

    return json({ error: "Metodo no permitido." }, 405);
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 400;
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return json({ error: message }, status);
  }
});
