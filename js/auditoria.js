document.addEventListener("DOMContentLoaded", async () => {
  if (window.AppAuth?.ready) {
    await window.AppAuth.ready;
  }

  const menuToggle = document.getElementById("menuToggleAuditoria");
  const sidePanel = document.getElementById("sidePanelAuditoria");
  const docUser = document.getElementById("docUserAuditoria");
  const lista = document.getElementById("auditoriaLista");
  const mudancasSensiveis = document.getElementById("auditoriaMudancasSensiveis");
  const acessosFechamentos = document.getElementById("auditoriaAcessosFechamentos");
  const buscaInput = document.getElementById("auditoriaBusca");
  const usuarioSelect = document.getElementById("auditoriaUsuario");
  const perfilSelect = document.getElementById("auditoriaPerfil");
  const areaSelect = document.getElementById("auditoriaArea");
  const acaoSelect = document.getElementById("auditoriaAcao");
  const periodoSelect = document.getElementById("auditoriaPeriodo");
  const limparBtn = document.getElementById("auditoriaLimpar");
  const exportarBtn = document.getElementById("auditoriaExportar");
  let logsCache = [];

  function formatDate(text) {
    if (!text) return "-";
    const data = new Date(text);
    return Number.isNaN(data.getTime()) ? text : data.toLocaleString("pt-BR");
  }

  function normalizarTexto(valor) {
    return (valor || "").toString().trim().toLowerCase();
  }

  function traduzirAcao(action) {
    const mapa = {
      create: "Criacao",
      update: "Atualizacao",
      delete: "Exclusao",
      bulk_import: "Importacao em lote",
      update_status: "Status alterado",
      update_role: "Perfil alterado",
      activate_user: "Usuario ativado",
      deactivate_user: "Usuario desativado",
      fechar_competencia: "Competencia fechada",
      reabrir_competencia: "Competencia reaberta",
      login: "Login"
    };
    return mapa[action] || action || "Alteracao";
  }

  function traduzirPerfil(role) {
    const mapa = {
      admin: "Administrador",
      operador_numeros: "Operador de Numeros",
      financeiro: "Financeiro",
      diretoria: "Diretoria"
    };
    return mapa[role] || role || "-";
  }

  function traduzirArea(entityType) {
    const mapa = {
      empresas: "Numeros Disponiveis",
      usados: "Numeros Usados",
      financeiro: "Financeiro",
      financeiro_competencia: "Competencia Financeira",
      financeiro_competencias: "Competencia Financeira",
      cliente: "Clientes",
      usuarios_sistema: "Usuarios",
      auth: "Acessos"
    };
    return mapa[entityType] || entityType || "Sistema";
  }

  function parseDetalhes(log) {
    const detalhes = AppUtils.parseAuditDetails(log.details);
    if (!detalhes.length) return ["Sem detalhes adicionais."];
    return detalhes.map((item) => {
      if (item?.field) {
        return `${item.field}: ${item.before || "-"} -> ${item.after || "-"}`;
      }
      if (typeof item === "object") {
        const pares = Object.entries(item)
          .filter(([, valor]) => valor !== undefined && valor !== null && valor !== "")
          .slice(0, 4)
          .map(([chave, valor]) => `${chave}: ${valor}`);
        return pares.join(" | ") || "Sem detalhes adicionais.";
      }
      return String(item);
    });
  }

  function isAcaoCritica(log) {
    return ["delete", "deactivate_user", "update_role", "fechar_competencia", "reabrir_competencia"].includes(log.action);
  }

  function preencherFiltros() {
    const preencher = (select, values, labelFn = (value) => value) => {
      if (!select) return;
      const atual = select.value;
      const primeiraOpcao = select.options[0]?.outerHTML || "";
      select.innerHTML = primeiraOpcao;
      values.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = labelFn(value);
        select.appendChild(option);
      });
      select.value = atual;
    };

    preencher(usuarioSelect, [...new Set(logsCache.map((log) => log.actor).filter(Boolean))].sort());
    preencher(perfilSelect, [...new Set(logsCache.map((log) => log.actor_role).filter(Boolean))].sort(), traduzirPerfil);
    preencher(areaSelect, [...new Set(logsCache.map((log) => log.entity_type).filter(Boolean))].sort(), traduzirArea);
    preencher(acaoSelect, [...new Set(logsCache.map((log) => log.action).filter(Boolean))].sort(), traduzirAcao);
  }

  function filtrarLogs() {
    const busca = normalizarTexto(buscaInput?.value);
    const usuario = usuarioSelect?.value || "";
    const perfil = perfilSelect?.value || "";
    const area = areaSelect?.value || "";
    const acao = acaoSelect?.value || "";
    const periodo = Number(periodoSelect?.value || 0);
    const agora = new Date();

    return logsCache.filter((log) => {
      if (usuario && log.actor !== usuario) return false;
      if (perfil && log.actor_role !== perfil) return false;
      if (area && log.entity_type !== area) return false;
      if (acao && log.action !== acao) return false;
      if (periodo) {
        const data = new Date(log.created_at);
        if (Number.isNaN(data.getTime())) return false;
        const diff = (agora - data) / 86400000;
        if (diff > periodo) return false;
      }
      if (!busca) return true;
      return [
        log.actor,
        log.actor_role,
        log.action,
        log.entity_type,
        log.entity_id,
        ...(AppUtils.parseAuditDetails(log.details).map((item) => JSON.stringify(item)))
      ].some((campo) => normalizarTexto(campo).includes(busca));
    });
  }

  function atualizarResumo(logs) {
    const total = logs.length;
    const usuarios = new Set(logs.map((log) => log.actor).filter(Boolean));
    const acoes = new Set(logs.map((log) => log.action).filter(Boolean));
    const perfis = [...new Set(logs.map((log) => log.actor_role).filter(Boolean))];
    const areas = [...new Set(logs.map((log) => traduzirArea(log.entity_type)).filter(Boolean))];
    const criticas = logs.filter(isAcaoCritica);

    const set = (id, valor) => {
      const el = document.getElementById(id);
      if (el) el.textContent = valor;
    };

    set("auditoriaTotal", total);
    set("auditoriaUsuarios", usuarios.size);
    set("auditoriaAcoes", acoes.size);
    set("auditoriaUltimoEvento", logs[0]?.created_at ? `Ultimo evento em ${formatDate(logs[0].created_at)}` : "Sem eventos");
    set("auditoriaPerfis", perfis.length ? perfis.map(traduzirPerfil).join(" | ") : "Sem perfis");
    set("auditoriaAreas", areas.length ? areas.join(" | ") : "Sem areas");
    set("auditoriaCriticas", criticas.length);
    set("auditoriaCriticasTexto", criticas.length ? `${criticas.length} acao(oes) exigem revisao` : "Nenhuma acao critica no recorte");

    const resumo = document.getElementById("auditoriaResumo");
    if (resumo) {
      resumo.textContent = [
        usuarioSelect?.value && `Usuario: ${usuarioSelect.value}`,
        perfilSelect?.value && `Perfil: ${traduzirPerfil(perfilSelect.value)}`,
        areaSelect?.value && `Area: ${traduzirArea(areaSelect.value)}`,
        acaoSelect?.value && `Acao: ${traduzirAcao(acaoSelect.value)}`,
        periodoSelect?.value && `Periodo: ${periodoSelect.value} dia(s)`,
        buscaInput?.value && `Busca: ${buscaInput.value}`
      ].filter(Boolean).join(" | ") || "Sem filtros aplicados";
    }
  }

  function renderListaDestaque(container, logs, formatter, emptyText) {
    if (!container) return;
    if (!logs.length) {
      container.innerHTML = `<div class="auditoria-empty">${AppUtils.escapeHtml(emptyText)}</div>`;
      return;
    }

    container.innerHTML = logs.map((log) => formatter(log)).join("");
  }

  function renderDestaques(logs) {
    const eventosUsuarios = logs
      .filter((log) => ["usuarios_sistema", "auth"].includes(log.entity_type) || ["update_role", "activate_user", "deactivate_user", "login"].includes(log.action))
      .slice(0, 5);

    const eventosCriticos = logs
      .filter((log) => ["fechar_competencia", "reabrir_competencia", "login"].includes(log.action) || log.entity_type === "financeiro_competencias")
      .slice(0, 5);

    renderListaDestaque(
      mudancasSensiveis,
      eventosUsuarios,
      (log) => `
        <article class="auditoria-destaque-item">
          <strong>${AppUtils.escapeHtml(traduzirAcao(log.action))}</strong>
          <span>${AppUtils.escapeHtml(log.actor || "local")} - ${AppUtils.escapeHtml(traduzirPerfil(log.actor_role))} - ${AppUtils.escapeHtml(formatDate(log.created_at))}</span>
          <span>${AppUtils.escapeHtml(parseDetalhes(log)[0] || "Sem detalhes adicionais.")}</span>
        </article>
      `,
      "Nenhuma mudanca sensivel encontrada no recorte."
    );

    renderListaDestaque(
      acessosFechamentos,
      eventosCriticos,
      (log) => `
        <article class="auditoria-destaque-item">
          <strong>${AppUtils.escapeHtml(traduzirArea(log.entity_type))} - ${AppUtils.escapeHtml(traduzirAcao(log.action))}</strong>
          <span>${AppUtils.escapeHtml(log.actor || "local")} - ${AppUtils.escapeHtml(formatDate(log.created_at))}</span>
          <span>${AppUtils.escapeHtml(parseDetalhes(log)[0] || "Sem detalhes adicionais.")}</span>
        </article>
      `,
      "Nenhum acesso relevante ou fechamento encontrado no recorte."
    );
  }

  function renderLogs() {
    if (!lista) return;
    const logs = filtrarLogs();
    atualizarResumo(logs);
    renderDestaques(logs);

    if (!logs.length) {
      lista.innerHTML = `<div class="auditoria-empty">Nenhum evento encontrado para este filtro.</div>`;
      return;
    }

    lista.innerHTML = logs.map((log) => `
      <article class="auditoria-item">
        <div class="auditoria-item-topo">
          <strong>${AppUtils.escapeHtml(traduzirArea(log.entity_type))} - ${AppUtils.escapeHtml(traduzirAcao(log.action))}</strong>
          <span>${AppUtils.escapeHtml(formatDate(log.created_at))}</span>
        </div>
        <div class="auditoria-meta">
          <span class="auditoria-chip">${AppUtils.escapeHtml(log.actor || "local")}</span>
          <span class="auditoria-chip">${AppUtils.escapeHtml(traduzirPerfil(log.actor_role || "-"))}</span>
          <span class="auditoria-chip">${AppUtils.escapeHtml(String(log.entity_id || "-"))}</span>
          ${isAcaoCritica(log) ? `<span class="auditoria-chip">Acao critica</span>` : ""}
        </div>
        <div class="auditoria-detalhes">
          ${parseDetalhes(log).map((item) => `<div class="auditoria-detalhe">${AppUtils.escapeHtml(item)}</div>`).join("")}
        </div>
      </article>
    `).join("");
  }

  async function carregarLogs() {
    try {
      logsCache = await window.appDb.list("audit_logs", { order: "created_at.desc" });
      preencherFiltros();
      renderLogs();
    } catch (error) {
      console.error(error);
      if (lista) {
        lista.innerHTML = `<div class="auditoria-empty">Nao foi possivel carregar a auditoria.</div>`;
      }
      AppUtils.toast("Nao foi possivel carregar a auditoria.", "error");
    }
  }

  function exportarCsv() {
    const logs = filtrarLogs();
    if (!logs.length) {
      AppUtils.toast("Nao ha eventos para exportar com esse filtro.", "warning");
      return;
    }

    AppUtils.downloadCsv(
      "auditoria.csv",
      ["Data", "Usuario", "Perfil", "Area", "Acao", "Critica", "Registro", "Detalhes"],
      logs.map((log) => [
        formatDate(log.created_at),
        log.actor || "local",
        traduzirPerfil(log.actor_role),
        traduzirArea(log.entity_type),
        traduzirAcao(log.action),
        isAcaoCritica(log) ? "Sim" : "Nao",
        String(log.entity_id || "-"),
        parseDetalhes(log).join(" | ")
      ])
    );
  }

  if (docUser) {
    const tipoUsuario = window.AppAuth?.getRole?.() || "diretoria";
    const usuarioAtual = (window.AppAuth?.getUser?.() || "usuario").toLowerCase();
    const nomeExibicao = window.AppAuth?.getName?.() || (usuarioAtual.charAt(0).toUpperCase() + usuarioAtual.slice(1));
    docUser.innerHTML = `<strong>${nomeExibicao}</strong><br>${traduzirPerfil(tipoUsuario)}`;
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

  [buscaInput, usuarioSelect, perfilSelect, areaSelect, acaoSelect, periodoSelect].forEach((campo) => {
    if (!campo) return;
    campo.addEventListener("input", renderLogs);
    campo.addEventListener("change", renderLogs);
  });

  if (limparBtn) {
    limparBtn.addEventListener("click", () => {
      [buscaInput, usuarioSelect, perfilSelect, areaSelect, acaoSelect, periodoSelect].forEach((campo) => {
        if (campo) campo.value = "";
      });
      renderLogs();
    });
  }

  if (exportarBtn) {
    exportarBtn.addEventListener("click", exportarCsv);
  }

  carregarLogs();
});
