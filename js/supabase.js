(function () {
  const SUPABASE_URL = "https://lwyxoiemrxatcxnfsbvv.supabase.co";
  const SUPABASE_KEY = "sb_publishable_OXbKNYuzWGKxSvNaKEVhew_SnzSoq-d";
  const SESSION_STORAGE_KEY = "investidor.supabase.session";

  function buildUrl(path, query) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  function buildAuthUrl(path, query) {
    const url = new URL(`${SUPABASE_URL}/auth/v1/${path}`);
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  function readStoredSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function writeStoredSession(session) {
    if (!session) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  function normalizeSession(payload) {
    if (!payload) return null;
    const expiresAt = payload.expires_at || Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600);
    return {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      token_type: payload.token_type || "bearer",
      expires_at: expiresAt,
      expires_in: Number(payload.expires_in || Math.max(expiresAt - Math.floor(Date.now() / 1000), 0)),
      user: payload.user || null
    };
  }

  async function authRequest(path, options = {}) {
    const { method = "GET", query = {}, body, accessToken } = options;
    const headers = {
      apikey: SUPABASE_KEY
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const response = await fetch(buildAuthUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `Erro Auth (${response.status})`);
    }
    if (!text) return null;
    return JSON.parse(text);
  }

  async function refreshSession() {
    const session = readStoredSession();
    if (!session?.refresh_token) return null;
    try {
      const payload = await authRequest("token", {
        method: "POST",
        query: { grant_type: "refresh_token" },
        body: { refresh_token: session.refresh_token }
      });
      const normalized = normalizeSession(payload);
      writeStoredSession(normalized);
      return normalized;
    } catch {
      writeStoredSession(null);
      return null;
    }
  }

  async function ensureSession(options = {}) {
    const { allowGuest = false } = options;
    let session = readStoredSession();
    const now = Math.floor(Date.now() / 1000);

    if (session?.access_token && Number(session.expires_at || 0) > now + 30) {
      return session;
    }

    session = await refreshSession();
    if (!session && !allowGuest) {
      throw new Error("Sessao inexistente ou expirada.");
    }
    return session;
  }

  async function getUser() {
    const session = await ensureSession();
    const user = await authRequest("user", { accessToken: session.access_token });
    const merged = { ...session, user };
    writeStoredSession(merged);
    return user;
  }

  async function signIn(email, password) {
    const payload = await authRequest("token", {
      method: "POST",
      query: { grant_type: "password" },
      body: { email, password }
    });
    const normalized = normalizeSession(payload);
    writeStoredSession(normalized);
    return normalized;
  }

  async function signOut() {
    const session = readStoredSession();
    try {
      if (session?.access_token) {
        await authRequest("logout", { method: "POST", accessToken: session.access_token });
      }
    } catch {}
    writeStoredSession(null);
  }

  async function request(path, options = {}) {
    const { method = "GET", query = {}, body, prefer, auth = true } = options;
    const session = auth ? await ensureSession({ allowGuest: false }) : await ensureSession({ allowGuest: true });
    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session?.access_token || SUPABASE_KEY}`
    };

    if (prefer) headers.Prefer = prefer;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Erro Supabase (${response.status})`);
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    return response.text();
  }

  async function list(table, options = {}) {
    const pageSize = options.pageSize || 1000;
    const results = [];
    let offset = 0;

    while (true) {
      const query = {
        select: options.select || "*",
        limit: pageSize,
        offset
      };

      if (options.order) query.order = options.order;
      Object.assign(query, options.filters || {});

      const page = await request(table, { query, auth: options.auth !== false });
      results.push(...page);
      if (!Array.isArray(page) || page.length < pageSize) break;
      offset += pageSize;
    }

    return results;
  }

  async function insert(table, rows, options = {}) {
    const payload = Array.isArray(rows) ? rows : [rows];
    return request(table, {
      method: "POST",
      body: payload,
      prefer: "return=representation",
      auth: options.auth !== false
    });
  }

  async function update(table, filters, payload, options = {}) {
    return request(table, {
      method: "PATCH",
      query: filters,
      body: payload,
      prefer: "return=representation",
      auth: options.auth !== false
    });
  }

  async function remove(table, filters, options = {}) {
    return request(table, {
      method: "DELETE",
      query: filters,
      auth: options.auth !== false
    });
  }

  async function getProfileByUser(user) {
    if (!user?.id && !user?.email) throw new Error("Usuario autenticado invalido.");
    let rows = [];
    if (user.id) {
      rows = await list("usuarios_sistema", { filters: { select: "*", user_id: `eq.${user.id}` }, auth: true });
    }
    if (!rows.length && user.email) {
      rows = await list("usuarios_sistema", { filters: { select: "*", email: `eq.${user.email.toLowerCase()}` }, auth: true });
    }
    const profile = rows[0] || null;
    if (profile) {
      return {
        id: profile.id || profile.user_id || user.id,
        userId: profile.user_id || user.id,
        email: (profile.email || user.email || "").toLowerCase(),
        nome: profile.nome || user.user_metadata?.nome || user.email || "usuario",
        perfil: profile.perfil || user.user_metadata?.perfil || "operador_numeros",
        ativo: profile.ativo !== false
      };
    }

    const metadataRole = user.user_metadata?.perfil || user.user_metadata?.role;
    if (metadataRole) {
      return {
        id: user.id,
        userId: user.id,
        email: (user.email || "").toLowerCase(),
        nome: user.user_metadata?.nome || user.email || "usuario",
        perfil: metadataRole,
        ativo: true
      };
    }

    throw new Error("Perfil do usuario nao encontrado em usuarios_sistema.");
  }

  window.appDb = {
    list,
    insert,
    update,
    remove,
    request,
    auth: {
      signIn,
      signOut,
      getUser,
      ensureSession,
      getSession: readStoredSession,
      getProfileByUser
    },
    config: {
      url: SUPABASE_URL
    }
  };
})();
