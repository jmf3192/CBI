import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Content-Type": "application/json",
};

const roles = new Set(["admin", "user"]);
const statuses = new Set(["active", "inactive"]);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
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
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
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

function normalizeCallIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

async function requireAdmin(req: Request, admin: ReturnType<typeof createAdminClient>) {
  const authorization = req.headers.get("Authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    throw Object.assign(new Error("Sesion no encontrada."), { status: 401 });
  }

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
  const [profilesResult, callsResult, accessResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, full_name, role, status, last_login_at, created_at, updated_at")
      .order("full_name", { ascending: true }),
    admin.from("calls").select("id, code, name, status").eq("status", "active").order("name"),
    admin.from("user_call_access").select("user_id, call_id, access_level"),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (callsResult.error) throw callsResult.error;
  if (accessResult.error) throw accessResult.error;

  return {
    users: profilesResult.data || [],
    calls: callsResult.data || [],
    access: accessResult.data || [],
  };
}

async function ensureNotRemovingLastAdmin(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  nextRole: string,
  nextStatus: string,
) {
  const { data: existing, error: existingError } = await admin
    .from("profiles")
    .select("id, role, status")
    .eq("id", userId)
    .maybeSingle();

  if (existingError || !existing) return;

  const removesAdmin =
    existing.role === "admin" &&
    existing.status === "active" &&
    (nextRole !== "admin" || nextStatus !== "active");

  if (!removesAdmin) return;

  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("status", "active");

  if (error) throw error;

  if ((count || 0) <= 1) {
    throw new Error("No se puede desactivar o degradar el ultimo administrador activo.");
  }
}

async function replaceAccess(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  callIds: string[],
  role: string,
) {
  const { error: deleteError } = await admin
    .from("user_call_access")
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  if (callIds.length === 0) return;

  const rows = callIds.map((callId) => ({
    user_id: userId,
    call_id: callId,
    access_level: role === "admin" ? "admin" : "evaluate",
  }));

  const { error: insertError } = await admin.from("user_call_access").insert(rows);
  if (insertError) throw insertError;
}

async function createUser(req: Request, admin: ReturnType<typeof createAdminClient>) {
  const body = await req.json();
  const email = requireString(body.email, "email").toLowerCase();
  const fullName = requireString(body.full_name, "nombre");
  const password = requireString(body.password, "password");
  const role = optionalEnum(body.role, roles, "user");
  const status = optionalEnum(body.status, statuses, "active");
  const callIds = normalizeCallIds(body.call_ids);

  if (password.length < 8) {
    throw new Error("La contrasena debe tener al menos 8 caracteres.");
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) throw error || new Error("No se ha creado el usuario.");

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    email,
    full_name: fullName,
    role,
    status,
  });
  if (profileError) throw profileError;

  await replaceAccess(admin, data.user.id, callIds, role);

  return data.user.id;
}

async function updateUser(req: Request, admin: ReturnType<typeof createAdminClient>) {
  const body = await req.json();
  const userId = requireString(body.id, "id");
  const email = requireString(body.email, "email").toLowerCase();
  const fullName = requireString(body.full_name, "nombre");
  const role = optionalEnum(body.role, roles, "user");
  const status = optionalEnum(body.status, statuses, "active");
  const callIds = normalizeCallIds(body.call_ids);
  const password = typeof body.password === "string" ? body.password : "";

  if (password && password.length < 8) {
    throw new Error("La contrasena debe tener al menos 8 caracteres.");
  }

  await ensureNotRemovingLastAdmin(admin, userId, role, status);

  const authUpdate: Record<string, unknown> = {
    email,
    user_metadata: { full_name: fullName },
  };

  if (password) authUpdate.password = password;

  const { error: authError } = await admin.auth.admin.updateUserById(userId, authUpdate);
  if (authError) throw authError;

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: fullName,
    role,
    status,
  });
  if (profileError) throw profileError;

  await replaceAccess(admin, userId, callIds, role);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createAdminClient();
    const actor = await requireAdmin(req, admin);

    if (req.method === "GET") {
      return json(await listData(admin));
    }

    if (req.method === "POST") {
      const userId = await createUser(req, admin);
      await admin.from("audit_log").insert({
        actor_user_id: actor.id,
        action: "user.create",
        entity_type: "user",
        entity_id: userId,
      });
      return json(await listData(admin), 201);
    }

    if (req.method === "PATCH") {
      await updateUser(req, admin);
      await admin.from("audit_log").insert({
        actor_user_id: actor.id,
        action: "user.update",
        entity_type: "user",
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
