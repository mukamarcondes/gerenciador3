(function () {
  const PAGE_RULES = {
    "home.html": ["admin", "operador_numeros", "financeiro", "diretoria"],
    "tab.html": ["admin", "operador_numeros"],
    "tab2.html": ["admin", "operador_numeros"],
    "dashboards.html": ["admin", "operador_numeros"],
    "financeiro.html": ["admin", "financeiro"],
    "clientes.html": ["admin", "financeiro"],
    "dashboard-financeiro.html": ["admin", "financeiro", "diretoria"],
    "diretoria.html": ["admin", "diretoria"],
    "auditoria.html": ["admin", "diretoria"],
    "usuarios.html": ["admin"]
  };

  const MODULE_RULES = {
    home: ["admin", "operador_numeros", "financeiro", "diretoria"],
    operacional: ["admin", "operador_numeros"],
    financeiro: ["admin", "financeiro"],
    financeiro_dashboard: ["admin", "financeiro", "diretoria"],
    diretoria: ["admin", "diretoria"],
    auditoria: ["admin", "diretoria"],
    users: ["admin"]
  };

  const PROFILE_STORAGE_KEY = "investidor.auth.profile";
  let currentProfile = readProfile();

  function normalizeRole(role) {
    const normalized = (role || "").toString().trim().toLowerCase();
    if (["admin", "operador_numeros", "financeiro", "diretoria"].includes(normalized)) return normalized;
    if (["operacional", "user", "operador", "operador de numeros"].includes(normalized)) return "operador_numeros";
    return "operador_numeros";
  }

  function readProfile() {
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "null");
      if (!profile) return null;
      profile.perfil = normalizeRole(profile.perfil);
      return profile;
    } catch {
      return null;
    }
  }

  function writeProfile(profile) {
    currentProfile = profile ? { ...profile, perfil: normalizeRole(profile.perfil) } : null;
    if (currentProfile) {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(currentProfile));
      syncLegacyStorage(currentProfile);
    } else {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      localStorage.removeItem("tipoUsuario");
      localStorage.removeItem("usuarioEmail");
    }
    return currentProfile;
  }

  function syncLegacyStorage(profile) {
    if (!profile) return;
    localStorage.setItem("tipoUsuario", normalizeRole(profile.perfil));
    localStorage.setItem("usuarioEmail", (profile.email || "usuario").toLowerCase());
  }

  function clearProfile() {
    writeProfile(null);
  }

  function getCurrentPage() {
    const path = window.location.pathname.split("/").pop();
    return path || "index.html";
  }

  function getRole() {
    return normalizeRole(currentProfile?.perfil || localStorage.getItem("tipoUsuario"));
  }

  function getUser() {
    return (currentProfile?.email || localStorage.getItem("usuarioEmail") || "usuario").toLowerCase();
  }

  function getName() {
    return currentProfile?.nome || getUser();
  }

  function isAllowed(allowedRoles, role = getRole()) {
    return !allowedRoles || allowedRoles.includes(role);
  }

  function canAccessPage(page = getCurrentPage(), role = getRole()) {
    return isAllowed(PAGE_RULES[page], role);
  }

  function getTargetModule(target) {
    if (!target) return "home";
    const page = target.split("?")[0];
    if (page === "home.html") return "home";
    if (["tab.html", "tab2.html", "dashboards.html"].includes(page)) return "operacional";
    if (["financeiro.html", "clientes.html"].includes(page)) return "financeiro";
    if (page === "dashboard-financeiro.html") return "financeiro_dashboard";
    if (page === "diretoria.html") return "diretoria";
    if (page === "auditoria.html") return "auditoria";
    if (page === "usuarios.html") return "users";
    return null;
  }

  function canViewTarget(target, role = getRole()) {
    const module = getTargetModule(target);
    if (!module) return true;
    return isAllowed(MODULE_RULES[module], role);
  }

  function can(permission, role = getRole()) {
    const permissions = {
      operacional_manage: ["admin", "operador_numeros"],
      operacional_delete: ["admin"],
      operacional_bulk: ["admin"],
      financeiro_manage: ["admin", "financeiro"],
      clientes_manage: ["admin", "financeiro"],
      diretoria_view: ["admin", "diretoria"],
      auditoria_view: ["admin", "diretoria"],
      financeiro_dashboard_view: ["admin", "financeiro", "diretoria"],
      financeiro_dashboard_export: ["admin", "financeiro", "diretoria"],
      dashboard_operacional_export: ["admin", "operador_numeros"],
      users_manage: ["admin"]
    };
    return isAllowed(permissions[permission], role);
  }

  function extractTarget(element) {
    if (!element) return "";
    const onclick = element.getAttribute("onclick") || "";
    const match = onclick.match(/window\.location\.href='([^']+)'/);
    if (match) return match[1];
    if (element.dataset?.target) return element.dataset.target;
    if (element.classList.contains("active")) return getCurrentPage();
    return "";
  }

  function applyVisibility() {
    const role = getRole();
    const selectors = [".doc-sidebar-link", ".home-nav-card"];
    document.querySelectorAll(selectors.join(",")).forEach((element) => {
      const target = extractTarget(element);
      if (!target) return;
      if (!canViewTarget(target, role)) {
        element.style.display = "none";
      }
    });
  }

  function consumeMessage() {
    const message = sessionStorage.getItem("appAuthMessage");
    if (!message) return;
    sessionStorage.removeItem("appAuthMessage");
    if (window.AppUtils?.toast) {
      window.AppUtils.toast(message, "warning");
    }
  }

  function redirectToLogin(message) {
    if (message) sessionStorage.setItem("appAuthMessage", message);
    clearProfile();
    if (getCurrentPage() !== "index.html") {
      window.location.href = "index.html";
    }
  }

  async function resolveProfile() {
    const session = await window.appDb.auth.ensureSession({ allowGuest: true });
    if (!session?.access_token) return null;
    const user = session.user || await window.appDb.auth.getUser();
    const profile = await window.appDb.auth.getProfileByUser(user);
    if (profile.ativo === false) {
      throw new Error("Seu usuario esta inativo.");
    }
    writeProfile(profile);
    return profile;
  }

  async function completeLogin() {
    return resolveProfile();
  }

  async function logout() {
    try {
      await window.appDb.auth.signOut();
    } finally {
      clearProfile();
    }
  }

  async function bootstrap() {
    const page = getCurrentPage();
    if (!window.appDb?.auth) {
      throw new Error("Camada de autenticacao indisponivel.");
    }

    if (page === "index.html" || page === "") {
      try {
        const profile = await resolveProfile();
        if (profile) {
          window.location.href = "home.html";
        }
      } catch {
        clearProfile();
      }
      return currentProfile;
    }

    try {
      const profile = await resolveProfile();
      if (!profile) {
        redirectToLogin("Faca login para acessar o sistema.");
        return null;
      }
      if (!canAccessPage(page, profile.perfil)) {
        sessionStorage.setItem("appAuthMessage", "Seu perfil nao tem acesso a essa area.");
        window.location.href = "home.html";
        return null;
      }
      return profile;
    } catch (error) {
      console.error(error);
      redirectToLogin(error?.message || "Sua sessao expirou. Entre novamente.");
      return null;
    }
  }

  function bindGlobalLogout() {
    document.addEventListener("click", async (event) => {
      const button = event.target.closest("[id^='btnSair']");
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      await logout();
      window.location.href = "index.html";
    }, true);
  }

  const ready = bootstrap().then((profile) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        applyVisibility();
        consumeMessage();
        bindGlobalLogout();
      }, { once: true });
    } else {
      applyVisibility();
      consumeMessage();
      bindGlobalLogout();
    }
    return profile;
  });

  window.AppAuth = {
    ready,
    getRole,
    getUser,
    getName,
    getProfile: () => currentProfile,
    can,
    canAccessPage,
    canViewTarget,
    normalizeRole,
    applyVisibility,
    consumeMessage,
    logout,
    completeLogin,
    syncLegacyStorage
  };
})();
