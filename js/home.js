document.addEventListener("DOMContentLoaded", async () => {
  if (window.AppAuth?.ready) {
    await window.AppAuth.ready;
  }
  const FECHAMENTOS_KEY = "financeiroCompetenciasFechadas";
  const menuToggleHome = document.getElementById("menuToggleHome");
  const sidePanelHome = document.getElementById("sidePanelHome");
  const btnSairHome = document.getElementById("btnSairHome");
  const docUserHome = document.getElementById("docUserHome");
  const auditFiltroArea = document.getElementById("homeAuditFiltroArea");
  let logsCache = [];

  const tipoUsuario = window.AppAuth?.getRole?.() || localStorage.getItem("tipoUsuario") || "operador_numeros";
  const usuarioAtual = (window.AppAuth?.getUser?.() || localStorage.getItem("usuarioEmail") || "usuario").toLowerCase();
  const nomeExibicao = window.AppAuth?.getName?.() || (usuarioAtual.charAt(0).toUpperCase() + usuarioAtual.slice(1));

  if (docUserHome) {
    docUserHome.innerHTML = `<strong>${nomeExibicao}</strong><br>${tipoUsuario}`;
  }

  if (menuToggleHome && sidePanelHome) {
    menuToggleHome.addEventListener("click", (event) => {
      event.stopPropagation();
      sidePanelHome.classList.toggle("hidden");
    });
  }

  document.addEventListener("click", (event) => {
    if (sidePanelHome && menuToggleHome && !sidePanelHome.contains(event.target) && event.target !== menuToggleHome && !menuToggleHome.contains(event.target)) {
      sidePanelHome.classList.add("hidden");
    }
  });

  function formatDate(text) {
    if (!text) return "-";
    const data = new Date(text);
    return Number.isNaN(data.getTime()) ? text : data.toLocaleString("pt-BR");
  }

  function moeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function normalizarCompetencia(item) {
    return {
      competencia: item?.competencia || "",
      status: item?.status === "fechado" ? "fechado" : "aberto",
      fechadoEm: item?.fechadoEm || item?.fechado_em || "",
      fechadoPor: item?.fechadoPor || item?.fechado_por || ""
    };
  }

  function carregarFechamentosLocal() {
    try {
      return JSON.parse(localStorage.getItem(FECHAMENTOS_KEY) || "[]").map(normalizarCompetencia);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  function renderResumo(empresas, usados) {
    let livres = 0;
    let reservados = 0;
    let ocupadosDisponiveis = 0;
    let ativados = 0;
    let desativados = 0;

    empresas.forEach((item) => {
      if (item.status === "livre") livres++;
      if (item.status === "reservado") reservados++;
      if (item.status === "ocupado") ocupadosDisponiveis++;
    });

    usados.forEach((item) => {
      if (item.ativo === "ativado") ativados++;
      if (item.ativo === "desativado") desativados++;
    });

    setText("homeCountLivre", livres);
    setText("homeCountReservado", reservados);
    setText("homeCountOcupado", ocupadosDisponiveis + usados.length);
    setText("homeCountUsados", usados.length);

    const resumo = document.getElementById("homeResumoRapido");
    if (!resumo) return;

    resumo.innerHTML = `
      <div class="home-summary-item"><strong>Total de numeros:</strong><span>${empresas.length + usados.length}</span></div>
      <div class="home-summary-item"><strong>Usados ativados:</strong><span>${ativados}</span></div>
      <div class="home-summary-item"><strong>Usados desativados:</strong><span>${desativados}</span></div>
      <div class="home-summary-item"><strong>Ultima atualizacao em disponiveis:</strong><span>${formatDate(empresas[empresas.length - 1]?.data_alteracao || empresas[empresas.length - 1]?.dataAlteracao)}</span></div>
      <div class="home-summary-item"><strong>Ultima atualizacao em usados:</strong><span>${formatDate(usados[usados.length - 1]?.data_alteracao || usados[usados.length - 1]?.dataAlteracao)}</span></div>
    `;
  }

  function traduzirAcao(action) {
    const mapa = {
      create: "Numero criado",
      update: "Registro atualizado",
      update_status: "Status alterado",
      update_observacao: "Observacao alterada",
      update_operadora: "Operadora alterada",
      update_cliente: "Cliente alterado",
      login: "Login realizado",
      move_to_usados: "Movido para usados",
      delete: "Registro excluido",
      bulk_import: "Importacao em lote",
      fechar_competencia: "Competencia fechada",
      reabrir_competencia: "Competencia reaberta"
    };
    return mapa[action] || action || "Alteracao";
  }

  function traduzirArea(entityType) {
    const mapa = {
      empresas: "Numeros Disponiveis",
      usados: "Numeros Usados",
      financeiro: "Financeiro",
      financeiro_competencias: "Fechamento de Competencia",
      cliente: "Clientes",
      auth: "Acessos"
    };
    return mapa[entityType] || entityType || "Sistema";
  }

  function isAcaoCritica(log) {
    return ["delete", "deactivate_user", "update_role", "fechar_competencia", "reabrir_competencia"].includes(log.action);
  }

  function descreverDetalhes(log) {
    const detalhes = AppUtils.parseAuditDetails(log.details);
    if (!detalhes.length) return "Sem detalhes adicionais.";

    const principal = detalhes[0];
    if (principal?.field) {
      return `${principal.field}: ${principal.before || "-"} para ${principal.after || "-"}`;
    }

    if (typeof principal === "object") {
      const pares = Object.entries(principal)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .slice(0, 2)
        .map(([key, value]) => `${key}: ${value}`);
      return pares.length ? pares.join(" | ") : "Sem detalhes adicionais.";
    }

    return String(principal);
  }

  function renderRecentes(logs) {
    const container = document.getElementById("homeRecentes");
    if (!container) return;

    if (!logs.length) {
      container.innerHTML = `<div class="home-activity-empty">Nenhuma atividade recente encontrada.</div>`;
      return;
    }

    container.innerHTML = logs.slice(0, 6).map((log) => `
      <div class="home-activity-item">
        <strong>${traduzirAcao(log.action)}</strong>
        <span>${traduzirArea(log.entity_type)} • ${log.actor || "local"} • ${formatDate(log.created_at || "-")}</span>
      </div>
    `).join("");
  }

  function renderAuditoria(logs) {
    const resumo = document.getElementById("homeAuditoriaResumo");
    const lista = document.getElementById("homeAuditoriaLista");
    if (!resumo || !lista) return;

    const area = auditFiltroArea?.value || "";
    const filtrados = area ? logs.filter((log) => log.entity_type === area) : logs;
    const usuarios = new Set(filtrados.map((log) => log.actor).filter(Boolean));
    const acoes = new Set(filtrados.map((log) => log.action).filter(Boolean));

    if (!filtrados.length) {
      resumo.innerHTML = `
        <div class="app-empty-state">
          <strong>Sem eventos nessa area</strong>
          <span>Ajuste o filtro para visualizar outra frente da auditoria.</span>
        </div>
      `;
      lista.innerHTML = `<div class="home-activity-empty">Nenhum evento recente encontrado para este filtro.</div>`;
      return;
    }

    resumo.innerHTML = `
      <div class="home-summary-item"><strong>Eventos no filtro:</strong><span>${filtrados.length}</span></div>
      <div class="home-summary-item"><strong>Ultimo evento:</strong><span>${formatDate(filtrados[0]?.created_at || "-")}</span></div>
      <div class="home-summary-item"><strong>Usuarios envolvidos:</strong><span>${usuarios.size}</span></div>
      <div class="home-summary-item"><strong>Tipos de acao:</strong><span>${acoes.size}</span></div>
      <div class="home-summary-item"><strong>Area em foco:</strong><span>${traduzirArea(area || filtrados[0]?.entity_type)}</span></div>
    `;

    lista.innerHTML = filtrados.slice(0, 10).map((log) => `
      <div class="home-activity-item">
        <strong>${traduzirArea(log.entity_type)} • ${traduzirAcao(log.action)}</strong>
        <span>${log.actor || "local"} • ${log.actor_role || "user"} • ${formatDate(log.created_at || "-")}</span>
        <span>${descreverDetalhes(log)}</span>
      </div>
    `).join("");
  }

  function renderExecutivo(financeiro, fechamentos, logs = []) {
    const container = document.getElementById("homeExecutivoResumo");
    const alertas = document.getElementById("homeAlertasCriticos");
    if (!container || !alertas) return;

    const competencias = [...new Set(financeiro.map((item) => item.competencia).filter(Boolean))].sort().reverse();
    const competenciaAtual = competencias[0] || "-";
    const recorte = competenciaAtual !== "-" ? financeiro.filter((item) => item.competencia === competenciaAtual) : [];
    const receita = recorte.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const pendentes = recorte.filter((item) => item.status === "pendente" || item.status === "atrasado");
    const margensNegativas = recorte.filter((item) => Number(item.valor || 0) - Number(item.custo || 0) < 0);
    const fechamento = fechamentos.find((item) => item.competencia === competenciaAtual && item.status === "fechado");
    const acoesCriticasRecentes = logs.filter(isAcaoCritica).slice(0, 3);

    container.innerHTML = `
      <div class="home-summary-item"><strong>Competencia atual:</strong><span>${competenciaAtual}</span></div>
      <div class="home-summary-item"><strong>Receita do mes:</strong><span>${moeda(receita)}</span></div>
      <div class="home-summary-item"><strong>Pendencias:</strong><span>${pendentes.length}</span></div>
      <div class="home-summary-item"><strong>Status do fechamento:</strong><span>${fechamento ? `Fechado por ${fechamento.fechadoPor || "usuario"} em ${fechamento.fechadoEm || "-"}` : "Competencia aberta"}</span></div>
      <div class="home-summary-item"><strong>Atalhos rapidos:</strong><span>Financeiro, Dashboard Financeiro, Diretoria e Clientes</span></div>
    `;

    const listaAlertas = [];
    if (pendentes.length) {
      listaAlertas.push({ titulo: "Pendencias financeiras", texto: `${pendentes.length} lancamento(s) seguem pendentes ou atrasados em ${competenciaAtual}.` });
    }
    if (margensNegativas.length) {
      listaAlertas.push({ titulo: "Margens negativas", texto: `${margensNegativas.length} lancamento(s) precisam de revisao imediata.` });
    }
    if (!fechamento && competenciaAtual !== "-") {
      listaAlertas.push({ titulo: "Competencia aberta", texto: `${competenciaAtual} ainda nao foi fechada.` });
    }
    acoesCriticasRecentes.forEach((log) => {
      listaAlertas.push({
        titulo: `Auditoria critica: ${traduzirAcao(log.action)}`,
        texto: `${traduzirArea(log.entity_type)} por ${log.actor || "local"} em ${formatDate(log.created_at)}.`
      });
    });

    alertas.innerHTML = listaAlertas.length
      ? listaAlertas.map((alerta) => `
        <div class="home-activity-item">
          <strong>${alerta.titulo}</strong>
          <span>${alerta.texto}</span>
        </div>
      `).join("")
      : `<div class="home-activity-empty">Sem alertas executivos criticos no momento.</div>`;
  }

  try {
    const [empresas, usados, logs, financeiro, fechamentos] = await Promise.all([
      window.appDb.list("empresas", { order: "id.asc" }),
      window.appDb.list("usados", { order: "id.asc" }),
      window.appDb.list("audit_logs", { order: "created_at.desc" }).catch(() => []),
      window.appDb.list("financeiro", { order: "competencia.desc" }).catch(() => JSON.parse(localStorage.getItem("financeiroLancamentos") || "[]")),
      window.appDb.list("financeiro_competencias", { order: "competencia.desc" }).catch(() => carregarFechamentosLocal())
    ]);

    renderResumo(empresas, usados);
    logsCache = Array.isArray(logs) ? logs : [];
    renderRecentes(logsCache);
    renderAuditoria(logsCache);
    renderExecutivo(financeiro, fechamentos.map(normalizarCompetencia), logsCache);
  } catch (error) {
    console.error(error);
    const resumo = document.getElementById("homeResumoRapido");
    const recentes = document.getElementById("homeRecentes");
    const executivo = document.getElementById("homeExecutivoResumo");
    const alertas = document.getElementById("homeAlertasCriticos");
    const auditoriaResumo = document.getElementById("homeAuditoriaResumo");
    const auditoriaLista = document.getElementById("homeAuditoriaLista");
    if (resumo) resumo.innerHTML = `<div class="home-activity-empty">Nao foi possivel carregar os resumos.</div>`;
    if (recentes) recentes.innerHTML = `<div class="home-activity-empty">Nao foi possivel carregar a atividade recente.</div>`;
    if (executivo) executivo.innerHTML = `<div class="home-activity-empty">Nao foi possivel carregar a home executiva.</div>`;
    if (alertas) alertas.innerHTML = `<div class="home-activity-empty">Nao foi possivel carregar os alertas executivos.</div>`;
    if (auditoriaResumo) auditoriaResumo.innerHTML = `<div class="home-activity-empty">Nao foi possivel carregar a auditoria.</div>`;
    if (auditoriaLista) auditoriaLista.innerHTML = `<div class="home-activity-empty">Nao foi possivel carregar os eventos de auditoria.</div>`;
  }

  if (auditFiltroArea) {
    auditFiltroArea.addEventListener("change", () => renderAuditoria(logsCache));
  }
});


