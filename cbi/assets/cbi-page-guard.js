import { CBI } from "./cbi-supabase.js";

const page = document.body;

async function signOut(event) {
  event.preventDefault();
  await CBI.signOut();
  window.location.replace("./acceso.html");
}

document.querySelectorAll("[data-cbi-logout]").forEach((link) => {
  link.addEventListener("click", signOut);
});

const code = page.dataset.cbiCallCode || "";
const kind = page.dataset.cbiCallKind || "";
const requireCallId = page.dataset.cbiRequireCallId === "true";

try {
  const access = await CBI.requireCallAccess({ code, kind, requireCallId });
  if (access) {
    document.querySelectorAll("[data-cbi-call-name]").forEach((element) => {
      element.textContent = access.call.name;
    });
    document.querySelectorAll("[data-cbi-call-code]").forEach((element) => {
      element.textContent = access.call.code;
    });
    page.dataset.cbiAccess = "granted";
    document.dispatchEvent(new CustomEvent("cbi:access-granted", { detail: access }));
  }
} catch (error) {
  console.error(error);
  window.location.replace("./convocatorias.html");
}
