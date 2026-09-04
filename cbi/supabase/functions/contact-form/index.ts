const allowedOrigins = new Set([
  "https://jmf3192.github.io",
  "https://con-asociados.com",
  "https://www.con-asociados.com",
  "http://127.0.0.1:8787",
  "http://localhost:8787",
]);

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://jmf3192.github.io",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
    "Content-Type": "application/json",
  };
}

function json(body: Record<string, string>, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

function requiredText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string") throw new Error(`Falta el campo ${field}.`);
  const text = value.trim();
  if (!text || text.length > maxLength) throw new Error(`El campo ${field} no es válido.`);
  return text;
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ error: "Método no permitido." }, 405, origin);
  }

  if (!origin || !allowedOrigins.has(origin)) {
    return json({ error: "Origen no autorizado." }, 403, origin);
  }

  try {
    const body = await req.json();
    if (body.website) return json({ ok: "true" }, 200, origin);

    const nombre = requiredText(body.nombre, "nombre", 120);
    const empresa = requiredText(body.empresa, "empresa", 160);
    const email = requiredText(body.email, "correo electrónico", 254).toLowerCase();
    const mensaje = requiredText(body.mensaje, "mensaje", 5000);
    const privacidad = body.privacidad === "aceptada";

    if (!validEmail(email)) throw new Error("El correo electrónico no es válido.");
    if (!privacidad) throw new Error("Debes aceptar la política de privacidad.");

    const webhookUrl = Deno.env.get("CONTACT_MAKE_WEBHOOK");
    if (!webhookUrl) {
      console.error("CONTACT_MAKE_WEBHOOK no está configurado.");
      return json({ error: "El formulario no está disponible temporalmente." }, 503, origin);
    }

    const forward = new FormData();
    forward.append("nombre", nombre);
    forward.append("empresa", empresa);
    forward.append("email", email);
    forward.append("mensaje", mensaje);
    forward.append("privacidad", "aceptada");
    forward.append("pagina", typeof body.pagina === "string" ? body.pagina.slice(0, 1000) : "");

    const response = await fetch(webhookUrl, { method: "POST", body: forward });
    if (!response.ok) {
      console.error("Make rechazó la consulta:", response.status);
      return json({ error: "No se ha podido enviar la consulta." }, 502, origin);
    }

    return json({ ok: "true" }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se ha podido procesar la consulta.";
    return json({ error: message }, 400, origin);
  }
});
