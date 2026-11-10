import { CBI } from "./cbi-supabase.js";

import { installDataConsumer } from "./cbi-data-consumer.js";

const page = document.body;

async function signOut(event) {
  event.preventDefault();
  await CBI.signOut();
  window.location.replace("./acceso.html");
}

document.querySelectorAll("[data-cbi-logout]").forEach((link) => {
  link.addEventListener("click", signOut);
});

// Access configuration must not reuse data-cbi-call-code: that attribute is a
// render target and replacing its text would destroy the page when used on body.
const code = page.dataset.cbiAccessCode || "";
const kind = page.dataset.cbiCallKind || "";
const requireCallId = page.dataset.cbiRequireCallId === "true";

try {
  const access = await CBI.requireCallAccess({ code, kind, requireCallId });
  if (access) {
    document.querySelectorAll("[data-cbi-call-name]").forEach((element) => {
      element.textContent = access.call.name;
    });
    document.querySelectorAll("[data-cbi-call-code]:not(body)").forEach((element) => {
      element.textContent = access.call.code;
    });
    try { await installDataConsumer(access); }
    catch(error) { console.error(error);const notice=document.createElement('p');notice.setAttribute('role','status');notice.textContent='No se pudo consultar la base compartida; esta carga usa los archivos originales.';page.prepend(notice); }
    document.querySelectorAll("[data-cbi-admin]").forEach(el=>el.hidden=access.profile.role!=="admin");
    page.dataset.cbiAccess = "granted";
    document.dispatchEvent(new CustomEvent("cbi:access-granted", { detail: access }));
  }
} catch (error) {
  console.error(error);
  window.location.replace("./convocatorias.html");
}
