const header = document.querySelector(".site-header");
const navigation = header?.querySelector(".main-nav");
const actions = header?.querySelector(".header-actions");

if (header && navigation && actions) {
  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const navigationId = navigation.id || "site-navigation";
  navigation.id = navigationId;

  const platformButton = actions.querySelector(".platform-button");
  if (platformButton) {
    const prefix = document.createElement("span");
    prefix.className = "platform-button-prefix";
    prefix.textContent = "Acceso a";

    const name = document.createElement("span");
    name.className = "platform-button-name";
    name.textContent = "plataforma";
    platformButton.replaceChildren(prefix, document.createTextNode(" "), name);
  }

  const menuButton = document.createElement("button");
  menuButton.className = "menu-toggle";
  menuButton.type = "button";
  menuButton.setAttribute("aria-controls", navigationId);
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Abrir menú");
  menuButton.innerHTML = '<span class="menu-toggle-icon" aria-hidden="true"></span>';
  actions.append(menuButton);
  header.classList.add("has-mobile-menu");

  function setMenuState(open) {
    const isOpen = mobileQuery.matches && open;
    header.classList.toggle("is-menu-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");

    if (mobileQuery.matches) {
      navigation.setAttribute("aria-hidden", String(!isOpen));
      navigation.inert = !isOpen;
    } else {
      navigation.removeAttribute("aria-hidden");
      navigation.inert = false;
    }
  }

  menuButton.addEventListener("click", () => {
    setMenuState(!header.classList.contains("is-menu-open"));
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuState(false);
  });

  document.addEventListener("click", (event) => {
    if (header.classList.contains("is-menu-open") && !header.contains(event.target)) {
      setMenuState(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && header.classList.contains("is-menu-open")) {
      setMenuState(false);
      menuButton.focus();
    }
  });

  mobileQuery.addEventListener("change", () => setMenuState(false));
  setMenuState(false);
}
