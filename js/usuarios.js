document.addEventListener("DOMContentLoaded", async () => {
  if (window.AppAuth?.ready) {
    await window.AppAuth.ready;
  }

  const menuToggle = document.getElementById("menuToggleUsuarios");
  const sidePanel = document.getElementById("sidePanelUsuarios");
  const docUser = document.getElementById("docUserUsuarios");
  const lista = document.getElementById("usuariosLista");
  const filtroBusca = document.getElementById("filtroBuscaUsuarios");
  const filtroStatus = document.getElementById("filtroStatusUsuarios");
  const PERFIS = [
    { value: "admin", label: "Administrador" },
    { value: "operador_numeros", label: "Operador de Numeros" },
    { value: "financeiro", label: "Financeiro" },
    { value: "diretoria", label: "Diretoria" }
  ];
  let usuariosCache = [];

  function normalizarTexto(valor) {
    return (valor || "").toString().trim().toLowerCase();
  }

  function normalizarPerfil(perfil) {
    return window.AppAuth?.normalizeRole?.(perfil) || perfil || "operador_numeros";
  }

  function rotuloPerfil(perfil) {
    return PERFIS.find((item) => item.value === normalizarPerfil(perfil))?.label || perfil || "Operador de Numeros";
  }

  function normalizarUsuarioSistema(item) {
    return {
      userId: item?.user_id || "",
      email: (item?.email || "").toLowerCase(),
      nome: item?.nome || item?.email || "Usuario",
      perfil: normalizarPerfil(item?.perfil),
      ativo: item?.ativo !== false,
      createdAt: item?.created_at || ""
    };
  }

  function formatarDataCurta(value) {
    if (!value) return "-";
    const data = new Date(value);
    return Number.isNaN(data.getTime()) ? value : data.toLocaleDateString("pt-BR");
  }

  function atualizarResumo() {
    const total = usuariosCache.length;
    const ativos = usuariosCache.filter((item) => item.ativo).length;
    const inativos = total - ativos;
    const resumoPerfis = Object.entries(
      usuariosCache.reduce((acc, item) => {
        const perfil = normalizarPerfil(item.perfil);
        acc[perfil] = (acc[perfil] || 0) + 1;
        return acc;
      }, {})
    ).map(([perfil, quantidade]) => `${rotuloPerfil(perfil)}: ${quantidade}`).join(" | ");

    const set = (id, valor) => {
      const el = document.getElementById(id);
      if (el) el.textContent = valor;
    };

    set("usuariosTotal", total);
    set("usuariosAtivos", ativos);
    set("usuariosInativos", inativos);
    set("usuariosResumoPerfis", resumoPerfis || "Sem dados");
  }

  function filtrarUsuarios() {
    const busca = normalizarTexto(filtroBusca?.value);
    const status = filtroStatus?.value || "";

    return usuariosCache.filter((item) => {
      if (status) {
        const statusAtual = item.ativo ? "ativo" : "inativo";
        if (statusAtual !== status) return false;
      }
      if (!busca) return true;
      return [item.nome, item.email, item.perfil, rotuloPerfil(item.perfil)].some((campo) => normalizarTexto(campo).includes(busca));
    });
  }

  async function atualizarUsuario(userId, payload) {
    const [salvo] = await window.appDb.update("usuarios_sistema", { user_id: `eq.${userId}` }, payload);
    return normalizarUsuarioSistema(salvo || { user_id: userId, ...payload });
  }

  function renderUsuarios() {
    if (!lista) return;

    const usuarios = filtrarUsuarios();
    if (!usuarios.length) {
      lista.innerHTML = `<div class="usuarios-empty">Nenhum usuario encontrado para este filtro.</div>`;
      return;
    }

    lista.innerHTML = usuarios.map((item) => `
      <article class="usuarios-card" data-user-id="${item.userId}">
        <div>
          <strong>${AppUtils.escapeHtml(item.nome)}</strong>
          <span>${AppUtils.escapeHtml(item.email)}</span>
          <span>${AppUtils.escapeHtml(rotuloPerfil(item.perfil))}</span>
          <span>Criado em ${AppUtils.escapeHtml(formatarDataCurta(item.createdAt))}</span>
        </div>
        <div>
          <span class="usuarios-chip ${item.ativo ? "ativo" : "inativo"}">${item.ativo ? "Ativo" : "Inativo"}</span>
        </div>
        <div>
          <select data-user-role="${item.userId}">
            ${PERFIS.map((perfil) => `
              <option value="${perfil.value}" ${item.perfil === perfil.value ? "selected" : ""}>${perfil.label}</option>
            `).join("")}
          </select>
        </div>
        <div>
          <button type="button" class="secundario" data-user-toggle="${item.userId}">${item.ativo ? "Desativar" : "Ativar"}</button>
        </div>
      </article>
    `).join("");

    lista.querySelectorAll("[data-user-role]").forEach((select) => {
      select.addEventListener("change", async (event) => {
        const userId = event.target.dataset.userRole;
        const novoPerfil = event.target.value;
        const alvo = usuariosCache.find((user) => user.userId === userId);
        if (!alvo || alvo.perfil === novoPerfil) return;

        const emailAtual = (window.AppAuth?.getUser?.() || "").toLowerCase();
        const adminsAtivos = usuariosCache.filter((user) => user.ativo && user.perfil === "admin");
        if (alvo.email === emailAtual && alvo.perfil === "admin" && novoPerfil !== "admin") {
          event.target.value = alvo.perfil;
          AppUtils.toast("Voce nao pode remover seu proprio perfil de admin por aqui.", "warning");
          return;
        }
        if (alvo.perfil === "admin" && alvo.ativo && novoPerfil !== "admin" && adminsAtivos.length <= 1) {
          event.target.value = alvo.perfil;
          AppUtils.toast("O sistema precisa manter pelo menos um admin ativo.", "warning");
          return;
        }

        try {
          const normalizado = await atualizarUsuario(userId, { perfil: novoPerfil });
          usuariosCache = usuariosCache.map((user) => user.userId === userId ? normalizado : user);
          await AppUtils.logAudit({
            entity_type: "usuarios_sistema",
            entity_id: userId,
            action: "update_role",
            details: [{ field: "perfil", before: alvo.perfil, after: novoPerfil }]
          });
          atualizarResumo();
          renderUsuarios();
          AppUtils.toast("Perfil atualizado com sucesso.", "success");
        } catch (error) {
          console.error(error);
          event.target.value = alvo.perfil;
          AppUtils.toast("Nao foi possivel atualizar o perfil do usuario.", "error");
        }
      });
    });

    lista.querySelectorAll("[data-user-toggle]").forEach((button) => {
      button.addEventListener("click", async () => {
        const userId = button.dataset.userToggle;
        const alvo = usuariosCache.find((user) => user.userId === userId);
        if (!alvo) return;

        const emailAtual = (window.AppAuth?.getUser?.() || "").toLowerCase();
        const adminsAtivos = usuariosCache.filter((user) => user.ativo && user.perfil === "admin");
        if (alvo.email === emailAtual && alvo.ativo) {
          AppUtils.toast("Voce nao pode desativar o proprio acesso por aqui.", "warning");
          return;
        }
        if (alvo.perfil === "admin" && alvo.ativo && adminsAtivos.length <= 1) {
          AppUtils.toast("O sistema precisa manter pelo menos um admin ativo.", "warning");
          return;
        }

        try {
          const normalizado = await atualizarUsuario(userId, { ativo: !alvo.ativo });
          usuariosCache = usuariosCache.map((user) => user.userId === userId ? normalizado : user);
          await AppUtils.logAudit({
            entity_type: "usuarios_sistema",
            entity_id: userId,
            action: normalizado.ativo ? "activate_user" : "deactivate_user",
            details: [{ field: "ativo", before: String(alvo.ativo), after: String(normalizado.ativo) }]
          });
          atualizarResumo();
          renderUsuarios();
          AppUtils.toast(`Usuario ${normalizado.ativo ? "ativado" : "desativado"} com sucesso.`, "success");
        } catch (error) {
          console.error(error);
          AppUtils.toast("Nao foi possivel atualizar o status do usuario.", "error");
        }
      });
    });
  }

  async function carregarUsuarios() {
    try {
      usuariosCache = (await window.appDb.list("usuarios_sistema", { order: "nome.asc" })).map(normalizarUsuarioSistema);
      atualizarResumo();
      renderUsuarios();
    } catch (error) {
      console.error(error);
      if (lista) {
        lista.innerHTML = `<div class="usuarios-empty">Nao foi possivel carregar os usuarios.</div>`;
      }
      AppUtils.toast("Nao foi possivel carregar a gestao de usuarios.", "error");
    }
  }

  if (docUser) {
    const tipoUsuario = window.AppAuth?.getRole?.() || "admin";
    const usuarioAtual = (window.AppAuth?.getUser?.() || "usuario").toLowerCase();
    const nomeExibicao = window.AppAuth?.getName?.() || (usuarioAtual.charAt(0).toUpperCase() + usuarioAtual.slice(1));
    docUser.innerHTML = `<strong>${nomeExibicao}</strong><br>${tipoUsuario}`;
  }

  if (menuToggle && sidePanel) {
    menuToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      sidePanel.classList.toggle("hidden");
    });
  }

  document.addEventListener("click", (event) => {
    if (sidePanel && menuToggle && !sidePanel.contains(event.target) && event.target !== menuToggle && !menuToggle.contains(event.target)) {
      sidePanel.classList.add("hidden");
    }
  });

  [filtroBusca, filtroStatus].forEach((campo) => {
    if (!campo) return;
    campo.addEventListener("input", renderUsuarios);
    campo.addEventListener("change", renderUsuarios);
  });

  carregarUsuarios();
});
