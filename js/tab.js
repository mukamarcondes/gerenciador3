document.addEventListener("DOMContentLoaded", async () => {
  if (window.AppAuth?.ready) {
    await window.AppAuth.ready;
  }
  const modal = document.getElementById("modal");
  const btnNovo = document.getElementById("btnNovo");
  const btnUsados = document.getElementById("btnUsados");
  const btnFechar = document.getElementById("btnFechar");
  const btnImportarLivres = document.getElementById("btnImportarLivres");
  const btnExportarLivres = document.getElementById("btnExportarLivres");
  const btnExcluirTodosLivres = document.getElementById("btnExcluirTodosLivres");
  const importarLivresInput = document.getElementById("importarLivres");
  const empresaForm = document.getElementById("empresaForm");
  const empresasTable = document.getElementById("empresasTable");
  const pesquisar = document.getElementById("pesquisar");
  const btnSair = document.getElementById("btnSair");
  const modalUsado = document.getElementById("modalUsado");
  const formUsado = document.getElementById("formUsado");
  const btnFecharUsado = document.getElementById("btnFecharUsado");
  const prevPage = document.getElementById("prevPage");
  const nextPage = document.getElementById("nextPage");
  const paginaInfo = document.getElementById("paginaInfo");
  const observacaoLivreInput = document.getElementById("observacaoLivre");
  const bulkBarLivres = document.getElementById("bulkBarLivres");
  const bulkInfoLivres = document.getElementById("bulkInfoLivres");
  const bulkStatusLivres = document.getElementById("bulkStatusLivres");
  const btnAplicarStatusLivres = document.getElementById("btnAplicarStatusLivres");
  const btnExcluirSelecionadosLivres = document.getElementById("btnExcluirSelecionadosLivres");
  const btnLimparSelecaoLivres = document.getElementById("btnLimparSelecaoLivres");
  const selecionarTodosLivres = document.getElementById("selecionarTodosLivres");
  const modalObservacaoLivre = document.getElementById("modalObservacaoLivre");
  const formObservacaoLivre = document.getElementById("formObservacaoLivre");
  const observacaoLivreEditar = document.getElementById("observacaoLivreEditar");
  const btnFecharObservacaoLivre = document.getElementById("btnFecharObservacaoLivre");
  const modalHistoricoLivre = document.getElementById("modalHistoricoLivre");
  const historicoLivreLista = document.getElementById("historicoLivreLista");
  const btnFecharHistoricoLivre = document.getElementById("btnFecharHistoricoLivre");
  const menuToggleLivres = document.getElementById("menuToggleLivres");
  const sidePanelLivres = document.getElementById("sidePanelLivres");
  const acoesToggleLivres = document.getElementById("acoesToggleLivres");
  const acoesMenuLivres = document.getElementById("acoesMenuLivres");
  const statusFiltroVisual = document.getElementById("statusFiltroVisual");
  const docUserLivres = document.getElementById("docUserLivres");
  const docToolbarLivres = document.querySelector(".doc-toolbar");
  const consultaInteligente = document.getElementById("consultaInteligente");
  const btnExecutarConsulta = document.getElementById("btnExecutarConsulta");
  const consultaResultado = document.getElementById("consultaResultado");
  const consultaHistorico = document.getElementById("consultaHistorico");
  const sugestoesConsulta = document.querySelectorAll(".consulta-sugestao");
  const btnNotificacoes = document.getElementById("btnNotificacoes");
  const contadorNotificacoes = document.getElementById("contadorNotificacoes");
  const painelNotificacoes = document.getElementById("painelNotificacoes");

  const perfilUsuario = window.AppAuth?.getRole?.() || localStorage.getItem("tipoUsuario") || "operador_numeros";
  const usuarioAtual = (window.AppAuth?.getUser?.() || localStorage.getItem("usuarioEmail") || "usuario").toLowerCase();
  const nomeExibicao = window.AppAuth?.getName?.() || (usuarioAtual.charAt(0).toUpperCase() + usuarioAtual.slice(1));
  const podeGerirOperacional = window.AppAuth?.can?.("operacional_manage") ?? ["admin", "operador_numeros"].includes(perfilUsuario);
  const isAdmin = perfilUsuario === "admin";
  let tipoUsuario = isAdmin ? "admin" : "user";
  let numeroSelecionado = null;
  let empresasCache = [];
  let usadosCache = [];
  let paginaAtual = 1;
  let numeroEmObservacao = null;
  let historicoCache = null;
  let listaRenderizada = [];
  let ultimaListaFonte = [];
  let contextoConsultaAnterior = null;
  let ultimoResultadoChat = [];
  let ultimoPayloadConsulta = null;
  let alertasSistema = [];
  const historicoConsultas = [];
  const selecionadosLivres = new Set();
  const estadoFiltros = {
    busca: "",
    status: "todos",
    idsChat: null
  };

  const itensPorPagina = 10;
  const TAMANHO_LOTE_IMPORTACAO = 200;
  const iconeLixeira = `<img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237101ce' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 6h18'/><path d='M8 6V4h8v2'/><path d='M19 6l-1 14H6L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/></svg>" alt="Excluir" title="Excluir" style="width:18px;height:18px;vertical-align:middle;">`;
  const iconeOlho = `<svg class="icone-acao" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const iconeHistorico = `<svg class="icone-acao" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/><path d="M12 7v5l3 3"/></svg>`;
  const iconeTroca = `<span aria-hidden="true">🔄</span>`;

  function abrirModal(elemento) {
    if (!elemento) return;
    elemento.classList.remove("hidden");
    elemento.style.display = "flex";
  }

  function fecharModal(elemento) {
    if (!elemento) return;
    elemento.classList.add("hidden");
    elemento.style.display = "none";
  }

  function fromDbEmpresa(row) {
    return {
      id: row.id,
      ddd: row.ddd || "",
      cidade: row.cidade || "",
      operadora: row.operadora || "",
      number: row.number || "",
      status: row.status || "livre",
      responsavel: row.responsavel || "",
      empresa: row.empresa || "",
      ativo: row.ativo || "",
      observacao: row.observacao || "",
      dataAlteracao: row.data_alteracao || ""
    };
  }

  function toDbEmpresa(item) {
    return {
      ddd: item.ddd || "",
      cidade: item.cidade || "",
      operadora: item.operadora || "",
      number: item.number || "",
      status: item.status || "livre",
      responsavel: item.responsavel || null,
      empresa: item.empresa || null,
      ativo: item.ativo || null,
      observacao: item.observacao || null,
      data_alteracao: item.dataAlteracao || ""
    };
  }

  function toDbUsado(item) {
    return {
      ddd: item.ddd || "",
      cidade: item.cidade || "",
      operadora: item.operadora || "",
      number: item.number || "",
      responsavel: item.responsavel || null,
      empresa: item.empresa || null,
      ativo: item.ativo || "ativado",
      observacao: item.observacao || null,
      data_alteracao: item.dataAlteracao || ""
    };
  }

  async function carregarCaches() {
    const [empresas, usados] = await Promise.all([
      window.appDb.list("empresas", { order: "id.asc" }),
      window.appDb.list("usados", { order: "id.asc" })
    ]);

    empresasCache = empresas.map(fromDbEmpresa);
    usadosCache = usados.map((item) => ({
      id: item.id,
      ddd: item.ddd || "",
      cidade: item.cidade || "",
      operadora: item.operadora || "",
      number: item.number || "",
      responsavel: item.responsavel || "",
      empresa: item.empresa || "",
      ativo: item.ativo || "ativado",
      observacao: item.observacao || "",
      dataAlteracao: item.data_alteracao || ""
    }));
  }

  function numeroExiste(numero, ignoreId = null) {
    const alvo = AppUtils.cleanNumber(numero);

    return [...empresasCache, ...usadosCache].some((item) => {
      if (ignoreId !== null && item.id === ignoreId) return false;
      return AppUtils.cleanNumber(item.number) === alvo;
    });
  }

  function sanitizarEmpresa(payload) {
    return {
      ddd: AppUtils.cleanNumber(payload.ddd).slice(0, 2),
      cidade: AppUtils.normalizeCity(payload.cidade),
      operadora: AppUtils.normalizeOperator(payload.operadora),
      number: AppUtils.cleanNumber(payload.number),
      status: payload.status,
      responsavel: payload.responsavel || "",
      empresa: (payload.empresa || "").trim(),
      ativo: payload.ativo || "",
      observacao: payload.observacao || "",
      dataAlteracao: payload.dataAlteracao || new Date().toLocaleString("pt-BR")
    };
  }

  function updateBulkBarLivres() {
    if (!bulkBarLivres || !bulkInfoLivres) return;
    const total = selecionadosLivres.size;
    bulkInfoLivres.textContent = `${total} selecionado(s)`;
    bulkBarLivres.classList.toggle("hidden", total === 0 || tipoUsuario !== "admin");
  }

  function detalheCombinaComNumero(detail, numeroLimpo) {
    if (!detail) return false;
    if (typeof detail === "string") return AppUtils.cleanNumber(detail).includes(numeroLimpo);

    return Object.values(detail).some((value) => {
      if (value && typeof value === "object") {
        return detalheCombinaComNumero(value, numeroLimpo);
      }
      return AppUtils.cleanNumber(value).includes(numeroLimpo);
    });
  }

  function formatarDetalheHistorico(detail) {
    if (!detail) return "<div>Sem detalhes adicionais.</div>";

    if (detail.field) {
      return `<div>${AppUtils.escapeHtml(detail.field)}: <strong>${AppUtils.escapeHtml(detail.before || "-")}</strong> ${iconeTroca} <strong>${AppUtils.escapeHtml(detail.after || "-")}</strong></div>`;
    }

    if (typeof detail === "object") {
      const pares = Object.entries(detail)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([key, value]) => `<div><strong>${AppUtils.escapeHtml(key)}:</strong> ${AppUtils.escapeHtml(value)}</div>`);

      return pares.length ? pares.join("") : "<div>Sem detalhes adicionais.</div>";
    }

    return `<div>${AppUtils.escapeHtml(detail)}</div>`;
  }

  function formatarAcaoHistorico(action) {
    const mapa = {
      create: "Numero criado",
      update_status: "Status alterado",
      move_to_usados: "Movido para usados",
      update_observacao: "Observacao alterada",
      delete: "Numero excluido",
      delete_all: "Exclusao em massa",
      bulk_update_status: "Edicao em massa",
      bulk_delete: "Exclusao de selecionados",
      bulk_import: "Importacao em lote"
    };

    return mapa[action] || (action || "Alteracao");
  }

  function classeHistorico(action) {
    if ((action || "").includes("delete")) return "danger";
    if ((action || "").includes("create") || (action || "").includes("import")) return "success";
    if ((action || "").includes("move") || (action || "").includes("update")) return "info";
    return "default";
  }

  async function carregarHistoricoGeral() {
    if (!window.appDb) return [];
    if (!historicoCache) {
      try {
        historicoCache = await window.appDb.list("audit_logs", { order: "created_at.desc" });
      } catch (error) {
        console.error(error);
        historicoCache = [];
      }
    }

    return historicoCache;
  }

  async function carregarHistoricoLivre(numeroItem) {
    const logs = await carregarHistoricoGeral();

    const numeroLimpo = AppUtils.cleanNumber(numeroItem?.number);
    return logs.filter((registro) => {
      const detalhes = AppUtils.parseAuditDetails(registro.details);
      const entityId = String(registro.entity_id || "");
      const detailsTexto = typeof registro.details === "string" ? registro.details : "";

      return (
        registro.entity_type === "empresas" &&
        (
          entityId === String(numeroItem?.id || "") ||
          detailsTexto.includes(numeroLimpo) ||
          detalhes.some((detail) => detalheCombinaComNumero(detail, numeroLimpo))
        )
      );
    });
  }

  function renderHistoricoLivre(registros) {
    if (!historicoLivreLista) return;
    if (!registros.length) {
      historicoLivreLista.innerHTML = `<div class="history-item">Nenhum historico encontrado para este numero.</div>`;
      return;
    }

    historicoLivreLista.innerHTML = registros.map((item) => {
      const detalhes = AppUtils.parseAuditDetails(item.details);
      const descricao = detalhes.length
        ? detalhes.map((detail) => formatarDetalheHistorico(detail)).join("")
        : "<div>Sem detalhes adicionais.</div>";

      return `
        <div class="history-item ${classeHistorico(item.action)}">
          <div class="history-dot"></div>
          <div class="history-body">
            <strong>${AppUtils.escapeHtml(formatarAcaoHistorico(item.action))}</strong>
            <div class="history-meta">${AppUtils.escapeHtml(item.actor || "local")} | ${AppUtils.escapeHtml(item.actor_role || "user")} | ${AppUtils.escapeHtml(item.created_at || "")}</div>
            <div class="history-details">${descricao}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  function normalizarTextoConsulta(value) {
    return (value || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function parseDataPtBr(value) {
    if (!value) return null;
    const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})(?:,\s*(\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!match) return null;
    const [, dia, mes, ano, hora = "00", minuto = "00", segundo = "00"] = match;
    const data = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto), Number(segundo));
    return Number.isNaN(data.getTime()) ? null : data;
  }

  function formatarDataRelativa(data) {
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) return "Data nao encontrada";
    const agora = new Date();
    const diffDias = Math.max(0, Math.floor((agora.getTime() - data.getTime()) / 86400000));
    if (diffDias === 0) return "hoje";
    if (diffDias === 1) return "ha 1 dia";
    return `ha ${diffDias} dias`;
  }

  function formatarDataDetalhada(data) {
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) return "Data nao encontrada";
    return data.toLocaleString("pt-BR");
  }

  function extrairDataReservaAtual(item, logs) {
    const numeroLimpo = AppUtils.cleanNumber(item?.number);
    const relacionados = logs
      .filter((registro) => {
        if (registro.entity_type !== "empresas") return false;
        const detalhes = AppUtils.parseAuditDetails(registro.details);
        const detailsTexto = typeof registro.details === "string" ? registro.details : "";
        const entityId = String(registro.entity_id || "");

        return entityId === String(item?.id || "") ||
          detailsTexto.includes(numeroLimpo) ||
          detalhes.some((detail) => detalheCombinaComNumero(detail, numeroLimpo));
      })
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let ultimaReserva = null;

    relacionados.forEach((registro) => {
      const detalhes = AppUtils.parseAuditDetails(registro.details);
      const acao = registro.action || "";
      const dataRegistro = registro.created_at ? new Date(registro.created_at) : null;
      const criadoReservado = acao === "create" && detalhes.some((detail) => detail?.status === "reservado");
      const alterouParaReservado = detalhes.some((detail) => detail?.field === "status" && detail?.after === "reservado");

      if (criadoReservado || alterouParaReservado) {
        ultimaReserva = dataRegistro;
      }
    });

    return ultimaReserva || parseDataPtBr(item?.dataAlteracao);
  }

  function obterTopReservadosMaisAntigos(logs, limite = 5) {
    return empresasCache
      .filter((item) => item.status === "reservado")
      .map((item) => {
        const dataReserva = extrairDataReservaAtual(item, logs);
        const dias = dataReserva ? Math.max(0, Math.floor((Date.now() - dataReserva.getTime()) / 86400000)) : null;

        return {
          ...item,
          dataReserva,
          diasReservado: dias
        };
      })
      .sort((a, b) => {
        const aDias = a.diasReservado ?? -1;
        const bDias = b.diasReservado ?? -1;
        return bDias - aDias;
      })
      .slice(0, limite);
  }

  function montarResumoAgrupado(lista, chave, limite = 8) {
    return Object.entries(
      lista.reduce((acc, item) => {
        const valor = (item[chave] || "Nao informado").trim() || "Nao informado";
        acc[valor] = (acc[valor] || 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, limite);
  }

  function extrairLimiteConsulta(texto) {
    const match = texto.match(/\b(?:top|primeiros?|ultimos?|mostrar|mostre|liste|listar)\s+(\d{1,2})\b/);
    if (!match) return 8;
    return Math.min(Math.max(Number(match[1]) || 8, 1), 50);
  }

  function extrairDddConsulta(texto) {
    const match = texto.match(/\bddd\s*(\d{2})\b/);
    return match ? match[1] : "";
  }

  function extrairDiasMinimos(texto) {
    const match = texto.match(/\b(?:mais de|acima de|pelo menos)\s*(\d{1,3})\s*dias?\b/);
    return match ? Number(match[1]) : null;
  }

  function detectarOperadoraConsulta(texto) {
    if (texto.includes("conectel")) return "Conectel";
    if (texto.includes("algar")) return "Algar";
    if (texto.includes("tip")) return "TIP";
    return "";
  }

  function detectarCidadeConsulta(texto) {
    if (texto.includes("sp")) {
      const saoPaulo = empresasCache.find((item) => AppUtils.normalizeCity(item.cidade) === "Sao Paulo");
      if (saoPaulo) return "Sao Paulo";
    }
    if (texto.includes("floripa")) {
      const floripa = empresasCache.find((item) => AppUtils.normalizeCity(item.cidade) === "Florianopolis");
      if (floripa) return "Florianopolis";
    }
    const cidades = [...new Set(empresasCache.map((item) => AppUtils.normalizeCity(item.cidade)).filter(Boolean))];
    return cidades.find((cidade) => normalizarTextoConsulta(cidade) && texto.includes(normalizarTextoConsulta(cidade))) || "";
  }

  function detectarStatusConsulta(texto) {
    if (texto.includes("reservad")) return "reservado";
    if (texto.includes("livre")) return "livre";
    if (texto.includes("parado") || texto.includes("travado")) return "reservado";
    if (texto.includes("ocupado") || texto.includes("usado")) return "ocupado";
    return "todos";
  }

  function interpretarConsulta(query) {
    const texto = normalizarTextoConsulta(query);
    const querReservado = texto.includes("reservad");
    const querTempoParado = ["mais tempo", "maior tempo", "tempo parado", "ha mais tempo", "antigo", "antigos", "parado"].some((termo) => texto.includes(termo));
    const querTotal = ["quantos", "qtd", "total", "contar"].some((termo) => texto.includes(termo));
    const querOperadora = texto.includes("operadora");
    const querCidade = texto.includes("cidade");

    let intent = "ajuda";
    if (querReservado && querTempoParado) intent = "reservados_antigos";
    else if (querTotal && querReservado) intent = "total_reservados";
    else if (querTotal && texto.includes("livre")) intent = "total_livres";
    else if (querTotal && (texto.includes("ocupado") || texto.includes("usado"))) intent = "total_ocupados";
    else if (querOperadora && !querTotal) intent = "resumo_operadora";
    else if (querCidade && !querTotal) intent = "resumo_cidade";
    else if (detectarStatusConsulta(texto) !== "todos" || detectarCidadeConsulta(texto) || detectarOperadoraConsulta(texto) || extrairDddConsulta(texto)) intent = "listar_filtrados";

    return {
      intent,
      texto,
      filtros: {
        status: detectarStatusConsulta(texto),
        operadora: detectarOperadoraConsulta(texto),
        cidade: detectarCidadeConsulta(texto),
        ddd: extrairDddConsulta(texto),
        limite: extrairLimiteConsulta(texto),
        diasMinimos: extrairDiasMinimos(texto)
      }
    };
  }

  function filtrarListaTexto(lista, busca) {
    const q = (busca || "").toLowerCase().trim();
    if (!q) return lista;
    return lista.filter((e) =>
      (e.number && AppUtils.formatPhone(e.number).toLowerCase().includes(q)) ||
      (e.ddd && e.ddd.toLowerCase().includes(q)) ||
      (e.cidade && e.cidade.toLowerCase().includes(q)) ||
      (e.operadora && e.operadora.toLowerCase().includes(q)) ||
      (e.status && e.status.toLowerCase().includes(q))
    );
  }

  function aplicarFiltrosAtuais() {
    let lista = [...empresasCache];

    if (estadoFiltros.status && estadoFiltros.status !== "todos") {
      lista = lista.filter((item) => item.status === estadoFiltros.status);
    }

    if (estadoFiltros.idsChat instanceof Set) {
      lista = lista.filter((item) => estadoFiltros.idsChat.has(item.id));
    }

    lista = filtrarListaTexto(lista, estadoFiltros.busca);
    renderTable(lista);
  }

  function aplicarResultadoChatNaTabela(lista, filtros = {}) {
    paginaAtual = 1;
    estadoFiltros.idsChat = new Set(lista.map((item) => item.id));
    if (filtros.status && statusFiltroVisual) {
      statusFiltroVisual.value = filtros.status;
      estadoFiltros.status = filtros.status;
    }
    aplicarFiltrosAtuais();
  }

  function limparFiltroChat() {
    estadoFiltros.idsChat = null;
  }

  function detectarConsultaContextual(texto) {
    return ["agora", "so os", "somente os", "apenas os", "desses", "destes", "deles", "essas", "esses", "mantem", "mantenha"].some((termo) => texto.includes(termo));
  }

  function mesclarConsultaComMemoria(consulta) {
    if (!contextoConsultaAnterior) return consulta;
    if (!detectarConsultaContextual(consulta.texto)) return consulta;

    const filtros = {
      ...contextoConsultaAnterior.filtros,
      ...consulta.filtros
    };

    if (consulta.filtros.status === "todos" && contextoConsultaAnterior.filtros?.status) {
      filtros.status = contextoConsultaAnterior.filtros.status;
    }

    if (!consulta.filtros.operadora && contextoConsultaAnterior.filtros?.operadora) {
      filtros.operadora = contextoConsultaAnterior.filtros.operadora;
    }

    if (!consulta.filtros.cidade && contextoConsultaAnterior.filtros?.cidade) {
      filtros.cidade = contextoConsultaAnterior.filtros.cidade;
    }

    if (!consulta.filtros.ddd && contextoConsultaAnterior.filtros?.ddd) {
      filtros.ddd = contextoConsultaAnterior.filtros.ddd;
    }

    const consultaPedeTotal = ["quantos", "qtd", "total", "contar"].some((termo) => consulta.texto.includes(termo));
    if (consultaPedeTotal) {
      if (filtros.status === "reservado") {
        return { ...consulta, intent: "total_reservados", filtros };
      }
      if (filtros.status === "livre") {
        return { ...consulta, intent: "total_livres", filtros };
      }
      if (filtros.status === "ocupado") {
        return { ...consulta, intent: "total_ocupados", filtros };
      }
    }

    if (consulta.intent === "ajuda" || consulta.intent === "listar_filtrados") {
      return {
        ...consulta,
        intent: contextoConsultaAnterior.intent === "reservados_antigos" ? "reservados_antigos" : "listar_filtrados",
        filtros
      };
    }

    return {
      ...consulta,
      filtros
    };
  }

  function registrarMensagemConsulta(role, titulo, texto) {
    historicoConsultas.push({ role, titulo, texto });
    if (historicoConsultas.length > 8) {
      historicoConsultas.shift();
    }
    renderHistoricoConsulta();
  }

  function renderHistoricoConsulta() {
    if (!consultaHistorico) return;
    if (!historicoConsultas.length) {
      consultaHistorico.classList.add("hidden");
      consultaHistorico.innerHTML = "";
      return;
    }

    consultaHistorico.classList.remove("hidden");
    consultaHistorico.innerHTML = historicoConsultas.map((item) => `
      <div class="consulta-ia-msg ${item.role}">
        <strong>${AppUtils.escapeHtml(item.titulo)}</strong>
        <span>${AppUtils.escapeHtml(item.texto)}</span>
      </div>
    `).join("");
  }

  function gerarSugestoesRelacionadas(payload) {
    if (!payload) return [];
    const sugestoes = [];

    if (payload.intent === "reservados_antigos") {
      sugestoes.push("Agora so os da Algar");
      sugestoes.push("Agora so os de Sao Paulo");
      sugestoes.push("Reservados ha mais de 30 dias");
    } else if (payload.intent === "listar_filtrados") {
      sugestoes.push("Quantos numeros sao esses?");
      sugestoes.push("Mostrar resumo por cidade");
      sugestoes.push("Mostrar resumo por operadora");
    } else {
      sugestoes.push("Quais sao os 10 reservados mais antigos?");
      sugestoes.push("Me mostra os reservados do DDD 11");
      sugestoes.push("Quantos livres em Sao Paulo?");
    }

    return sugestoes.slice(0, 3);
  }

  function exportarResultadoChat() {
    if (!ultimoResultadoChat.length) {
      AppUtils.toast("Nao ha resultado filtrado para exportar.", "warning");
      return;
    }

    let csv = "DDD;Cidade;Operadora;Numero;Status;Observacao;Ultima Alteracao\n";
    ultimoResultadoChat.forEach((item) => {
      csv += `${item.ddd || ""};${item.cidade || ""};${item.operadora || ""};${item.number || ""};${item.status || ""};${(item.observacao || "").replace(/;/g, ",")};${item.dataAlteracao || ""}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "resultado_chat_numeros.csv";
    link.click();
    URL.revokeObjectURL(url);
    AppUtils.toast("Resultado do chat exportado.", "success");
  }

  function limparFiltrosDoChat() {
    limparFiltroChat();
    estadoFiltros.status = "todos";
    estadoFiltros.busca = "";
    ultimoResultadoChat = [];
    ultimoPayloadConsulta = null;
    contextoConsultaAnterior = null;
    if (pesquisar) pesquisar.value = "";
    if (statusFiltroVisual) statusFiltroVisual.value = "todos";
    if (consultaInteligente) consultaInteligente.value = "";
    if (consultaResultado) {
      consultaResultado.classList.add("hidden");
      consultaResultado.innerHTML = "";
    }
    historicoConsultas.length = 0;
    renderHistoricoConsulta();
    aplicarFiltrosAtuais();
    AppUtils.toast("Filtros e contexto do chat limpos.", "info");
  }

  function construirExplicacaoConsulta(consulta) {
    const partes = [];
    const filtros = consulta?.filtros || {};
    if (filtros.status && filtros.status !== "todos") partes.push(`status ${filtros.status}`);
    if (filtros.operadora) partes.push(`operadora ${filtros.operadora}`);
    if (filtros.cidade) partes.push(`cidade ${filtros.cidade}`);
    if (filtros.ddd) partes.push(`DDD ${filtros.ddd}`);
    if (filtros.diasMinimos !== null && filtros.diasMinimos !== undefined) partes.push(`periodo acima de ${filtros.diasMinimos} dias`);
    if (filtros.limite) partes.push(`limite ${filtros.limite}`);
    return partes.length ? `Considerei ${partes.join(" + ")}.` : "Considerei toda a base disponivel.";
  }

  function calcularMetricasResultado(lista, logs, intent) {
    const total = lista.length;
    const reservados = lista.filter((item) => item.status === "reservado");
    const livres = lista.filter((item) => item.status === "livre").length;
    const ocupados = lista.filter((item) => item.status === "ocupado").length;
    const reservadosComTempo = reservados.map((item) => {
      const dataReserva = extrairDataReservaAtual(item, logs || []);
      const dias = dataReserva ? Math.max(0, Math.floor((Date.now() - dataReserva.getTime()) / 86400000)) : null;
      return { ...item, diasReservado: dias };
    }).filter((item) => item.diasReservado !== null);

    const mediaReservado = reservadosComTempo.length
      ? Math.round(reservadosComTempo.reduce((acc, item) => acc + item.diasReservado, 0) / reservadosComTempo.length)
      : null;
    const maxReservado = reservadosComTempo.length
      ? Math.max(...reservadosComTempo.map((item) => item.diasReservado))
      : null;

    return [
      { label: "Total analisado", value: `${total}` },
      { label: "Reservados", value: `${reservados.length}` },
      { label: "Livres", value: `${livres}` },
      { label: "Ocupados", value: `${ocupados}` },
      ...(intent === "reservados_antigos" || reservados.length
        ? [
            { label: "Media em reservado", value: mediaReservado === null ? "-" : `${mediaReservado} dias` },
            { label: "Maior tempo parado", value: maxReservado === null ? "-" : `${maxReservado} dias` }
          ]
        : [])
    ];
  }

  function gerarAlertasResultado(lista, logs) {
    const alertas = [];
    if (!lista.length) return alertas;

    const reservados = lista
      .filter((item) => item.status === "reservado")
      .map((item) => {
        const dataReserva = extrairDataReservaAtual(item, logs || []);
        const dias = dataReserva ? Math.max(0, Math.floor((Date.now() - dataReserva.getTime()) / 86400000)) : null;
        return { ...item, diasReservado: dias };
      });

    const muitoAntigos = reservados.filter((item) => (item.diasReservado ?? -1) >= 30);
    if (muitoAntigos.length) {
      alertas.push({
        level: "warning",
        text: `${muitoAntigos.length} numero(s) reservado(s) ha pelo menos 30 dias. Priorize revisar os mais antigos.`
      });
    }

    const porCidade = montarResumoAgrupado(reservados, "cidade", 1);
    if (porCidade.length && reservados.length >= 4) {
      const [cidade, totalCidade] = porCidade[0];
      const percentual = Math.round((totalCidade / reservados.length) * 100);
      if (percentual >= 50) {
        alertas.push({
          level: "warning",
          text: `Concentracao por cidade: ${cidade} representa ${percentual}% dos reservados deste recorte.`
        });
      }
    }

    const porOperadora = montarResumoAgrupado(reservados, "operadora", 1);
    if (porOperadora.length && reservados.length >= 4) {
      const [operadora, totalOperadora] = porOperadora[0];
      const percentual = Math.round((totalOperadora / reservados.length) * 100);
      if (percentual >= 50) {
        alertas.push({
          level: "warning",
          text: `Excesso por operadora: ${operadora} concentra ${percentual}% dos reservados deste recorte.`
        });
      }
    }

    const porDdd = montarResumoAgrupado(lista, "ddd", 1);
    if (porDdd.length && lista.length >= 6) {
      const [ddd, totalDdd] = porDdd[0];
      const percentual = Math.round((totalDdd / lista.length) * 100);
      if (percentual >= 45) {
        alertas.push({
          level: "info",
          text: `Possivel anomalia de distribuicao: DDD ${ddd} concentra ${percentual}% deste resultado.`
        });
      }
    }

    return alertas.slice(0, 4);
  }

  function construirAlertasSistema(logs) {
    const reservados = empresasCache
      .filter((item) => item.status === "reservado")
      .map((item) => {
        const dataReserva = extrairDataReservaAtual(item, logs || []);
        const dias = dataReserva ? Math.max(0, Math.floor((Date.now() - dataReserva.getTime()) / 86400000)) : null;
        return { ...item, diasReservado: dias };
      });

    const alertas = [];
    const antigos = reservados.filter((item) => (item.diasReservado ?? -1) >= 30);
    if (antigos.length) {
      alertas.push({
        level: "warning",
        title: "Reservados ha mais de 30 dias",
        text: `${antigos.length} numero(s) estao parados ha pelo menos 30 dias.`,
        query: "Reservados ha mais de 30 dias"
      });
    }

    const cidadeTop = montarResumoAgrupado(reservados, "cidade", 1);
    if (cidadeTop.length && reservados.length >= 4) {
      const [cidade, total] = cidadeTop[0];
      const percentual = Math.round((total / reservados.length) * 100);
      if (percentual >= 50) {
        alertas.push({
          level: "warning",
          title: "Concentracao por cidade",
          text: `${cidade} concentra ${percentual}% dos reservados.`,
          query: `Me mostra os reservados de ${cidade}`
        });
      }
    }

    const operadoraTop = montarResumoAgrupado(reservados, "operadora", 1);
    if (operadoraTop.length && reservados.length >= 4) {
      const [operadora, total] = operadoraTop[0];
      const percentual = Math.round((total / reservados.length) * 100);
      if (percentual >= 50) {
        alertas.push({
          level: "warning",
          title: "Excesso por operadora",
          text: `${operadora} concentra ${percentual}% dos numeros reservados.`,
          query: `Me mostra os reservados da ${operadora}`
        });
      }
    }

    const dddTop = montarResumoAgrupado(empresasCache, "ddd", 1);
    if (dddTop.length && empresasCache.length >= 6) {
      const [ddd, total] = dddTop[0];
      const percentual = Math.round((total / empresasCache.length) * 100);
      if (percentual >= 45) {
        alertas.push({
          level: "info",
          title: "Anomalia por DDD",
          text: `DDD ${ddd} concentra ${percentual}% da base visivel.`,
          query: `Me mostra os numeros do DDD ${ddd}`
        });
      }
    }

    return alertas.slice(0, 6);
  }

  async function atualizarCentroNotificacoes() {
    const logs = await carregarHistoricoGeral();
    alertasSistema = construirAlertasSistema(logs);
    renderCentroNotificacoes();
  }

  function renderCentroNotificacoes() {
    if (contadorNotificacoes) {
      contadorNotificacoes.textContent = String(alertasSistema.length);
    }

    if (!painelNotificacoes) return;
    if (!alertasSistema.length) {
      painelNotificacoes.innerHTML = `<div class="consulta-ia-vazio">Nenhum alerta ativo no momento.</div>`;
      return;
    }

    painelNotificacoes.innerHTML = `
      <div class="notificacoes-lista">
        ${alertasSistema.map((item, index) => `
          <div class="notificacao-item ${AppUtils.escapeHtml(item.level || "info")}">
            <strong>${AppUtils.escapeHtml(item.title)}</strong>
            <span>${AppUtils.escapeHtml(item.text)}</span>
            <button type="button" data-alerta-index="${index}">Analisar</button>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderConsultaResultado(payload) {
    if (!consultaResultado) return;
    consultaResultado.classList.remove("hidden");
    ultimoPayloadConsulta = payload || null;
    const sugestoes = gerarSugestoesRelacionadas(payload);
    const explicacaoHtml = payload?.explanation ? `
      <div class="consulta-ia-card-mini">
        <strong>Como interpretei</strong>
        <span>${AppUtils.escapeHtml(payload.explanation)}</span>
      </div>
    ` : "";
    const metricasHtml = Array.isArray(payload?.metrics) && payload.metrics.length ? `
      <div class="consulta-ia-grid consulta-ia-kpis">
        ${payload.metrics.map((item) => `
          <div class="consulta-ia-card-mini">
            <strong>${AppUtils.escapeHtml(item.label)}</strong>
            <span>${AppUtils.escapeHtml(item.value)}</span>
          </div>
        `).join("")}
      </div>
    ` : "";
    const alertasHtml = Array.isArray(payload?.alerts) && payload.alerts.length ? `
      <div class="consulta-ia-grid">
        ${payload.alerts.map((item) => `
          <div class="consulta-ia-alerta ${AppUtils.escapeHtml(item.level || "info")}">
            ${AppUtils.escapeHtml(item.text)}
          </div>
        `).join("")}
      </div>
    ` : "";
    const toolbar = `
      <div class="consulta-ia-toolbar">
        <button class="consulta-ia-action primary" type="button" data-chat-action="exportar">Exportar resultado</button>
        <button class="consulta-ia-action" type="button" data-chat-action="limpar">Limpar filtros do chat</button>
      </div>
    `;
    const sugestoesHtml = sugestoes.length ? `
      <div class="consulta-ia-sugestoes-dinamicas">
        ${sugestoes.map((item) => `<button class="consulta-sugestao" type="button" data-query="${AppUtils.escapeHtml(item)}">${AppUtils.escapeHtml(item)}</button>`).join("")}
      </div>
    ` : "";

    if (!payload) {
      consultaResultado.innerHTML = `${toolbar}<div class="consulta-ia-vazio">Nao foi possivel montar a consulta.</div>`;
      return;
    }

    if (payload.type === "lista") {
      consultaResultado.innerHTML = `
        ${toolbar}
        <h3>${AppUtils.escapeHtml(payload.title)}</h3>
        <p>${AppUtils.escapeHtml(payload.description)}</p>
        ${explicacaoHtml}
        ${metricasHtml}
        ${alertasHtml}
        <div class="consulta-ia-meta">
          ${(payload.meta || []).map((item) => `<span class="consulta-ia-pill">${AppUtils.escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="consulta-ia-lista">
          ${payload.items.length ? payload.items.map((item) => `
            <div class="consulta-ia-item">
              <strong>${AppUtils.escapeHtml(item.principal)}</strong>
              <span>${AppUtils.escapeHtml(item.secundario)}</span>
              <em>${AppUtils.escapeHtml(item.destaque)}</em>
            </div>
          `).join("") : `<div class="consulta-ia-vazio">Nenhum registro encontrado para essa consulta.</div>`}
        </div>
        ${sugestoesHtml}
      `;
      return;
    }

    if (payload.type === "resumo") {
      consultaResultado.innerHTML = `
        ${toolbar}
        <h3>${AppUtils.escapeHtml(payload.title)}</h3>
        <p>${AppUtils.escapeHtml(payload.description)}</p>
        ${explicacaoHtml}
        ${metricasHtml}
        ${alertasHtml}
        <div class="consulta-ia-meta">
          ${(payload.meta || []).map((item) => `<span class="consulta-ia-pill">${AppUtils.escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="consulta-ia-lista">
          ${payload.items.map((item) => `
            <div class="consulta-ia-item">
              <strong>${AppUtils.escapeHtml(item.label)}</strong>
              <span>${AppUtils.escapeHtml(item.detail || "")}</span>
              <em>${AppUtils.escapeHtml(item.value)}</em>
            </div>
          `).join("")}
        </div>
        ${sugestoesHtml}
      `;
      return;
    }

    consultaResultado.innerHTML = `
      ${toolbar}
      <h3>${AppUtils.escapeHtml(payload.title)}</h3>
      <p>${AppUtils.escapeHtml(payload.description)}</p>
      ${explicacaoHtml}
      ${metricasHtml}
      ${alertasHtml}
      <div class="consulta-ia-meta">
        ${(payload.meta || []).map((item) => `<span class="consulta-ia-pill">${AppUtils.escapeHtml(item)}</span>`).join("")}
      </div>
      ${sugestoesHtml}
    `;
  }

  function finalizarConsulta(pergunta, consulta, payload, listaResultado = []) {
    const logsAnalise = (payload?.intent === "reservados_antigos" || listaResultado.some?.((item) => item.status === "reservado")) ? (historicoCache || []) : [];
    ultimoResultadoChat = Array.isArray(listaResultado) ? [...listaResultado] : [];
    contextoConsultaAnterior = {
      intent: consulta.intent,
      filtros: { ...consulta.filtros }
    };
    registrarMensagemConsulta("user", "Pergunta", pergunta);
    registrarMensagemConsulta("bot", payload?.title || "Resposta", payload?.description || "Consulta concluida.");
    renderConsultaResultado({
      ...payload,
      intent: consulta.intent,
      explanation: construirExplicacaoConsulta(consulta),
      metrics: calcularMetricasResultado(listaResultado, logsAnalise, consulta.intent),
      alerts: gerarAlertasResultado(listaResultado, logsAnalise)
    });
  }

  async function executarConsultaInteligente(query) {
    const texto = (query || "").trim();
    if (!texto) {
      AppUtils.toast("Digite uma pergunta para consultar os numeros.", "warning");
      return;
    }

    const consulta = mesclarConsultaComMemoria(interpretarConsulta(texto));
    const tipo = consulta.intent;
    const { status, operadora, cidade, ddd, limite, diasMinimos } = consulta.filtros;
    const logs = tipo === "reservados_antigos" ? await carregarHistoricoGeral() : [];
    const baseFiltrada = empresasCache.filter((item) => {
      if (status !== "todos" && item.status !== status) return false;
      if (operadora && item.operadora !== operadora) return false;
      if (cidade && AppUtils.normalizeCity(item.cidade) !== cidade) return false;
      if (ddd && item.ddd !== ddd) return false;
      return true;
    });

    if (tipo === "reservados_antigos") {
      const top = obterTopReservadosMaisAntigos(logs, Math.max(limite, 1))
        .filter((item) => {
          if (operadora && item.operadora !== operadora) return false;
          if (cidade && AppUtils.normalizeCity(item.cidade) !== cidade) return false;
          if (ddd && item.ddd !== ddd) return false;
          if (diasMinimos !== null && (item.diasReservado ?? -1) < diasMinimos) return false;
          return true;
        });
      aplicarResultadoChatNaTabela(top, { status: "reservado" });
      finalizarConsulta(texto, consulta, {
        type: "lista",
        title: "Numeros reservados ha mais tempo",
        description: "A lista abaixo considera os numeros que estao atualmente em reservado, usa o historico para estimar desde quando entraram nesse status e ja aplica esse resultado na tabela.",
        meta: [
          `${top.length} resultado(s)`,
          `${baseFiltrada.filter((item) => item.status === "reservado").length} reservado(s) na base filtrada`,
          operadora || cidade || ddd ? "Filtros do chat aplicados" : "Tabela filtrada automaticamente"
        ],
        items: top.map((item) => ({
          principal: AppUtils.formatPhone(item.number),
          secundario: `${item.cidade || "Sem cidade"} | ${item.operadora || "Sem operadora"} | ${formatarDataRelativa(item.dataReserva)} | desde ${formatarDataDetalhada(item.dataReserva)}`,
          destaque: item.diasReservado === null ? "Sem data" : `${item.diasReservado} dia(s)`
        }))
      }, top);
      return;
    }

    if (tipo === "total_reservados") {
      const listaReservados = baseFiltrada.filter((item) => item.status === "reservado");
      const total = listaReservados.length;
      aplicarResultadoChatNaTabela(listaReservados, { status: "reservado" });
      finalizarConsulta(texto, consulta, {
        title: "Total de numeros reservados",
        description: "Contagem atual considerando os filtros pedidos no chat. A tabela tambem foi ajustada para mostrar esses numeros.",
        meta: [`${total} reservado(s)`]
      }, listaReservados);
      return;
    }

    if (tipo === "total_livres") {
      const listaLivres = baseFiltrada.filter((item) => item.status === "livre");
      const total = listaLivres.length;
      aplicarResultadoChatNaTabela(listaLivres, { status: "livre" });
      finalizarConsulta(texto, consulta, {
        title: "Total de numeros livres",
        description: "Contagem atual dos numeros disponiveis com status livre dentro dos filtros informados.",
        meta: [`${total} livre(s)`]
      }, listaLivres);
      return;
    }

    if (tipo === "total_ocupados") {
      const listaOcupados = baseFiltrada.filter((item) => item.status === "ocupado");
      const total = listaOcupados.length + usadosCache.length;
      aplicarResultadoChatNaTabela(listaOcupados, { status: "ocupado" });
      finalizarConsulta(texto, consulta, {
        title: "Total de numeros ocupados",
        description: "Soma dos ocupados ainda visiveis na tabela e dos numeros ja movidos para usados.",
        meta: [`${total} ocupado(s)`]
      }, listaOcupados);
      return;
    }

    if (tipo === "resumo_operadora") {
      limparFiltroChat();
      aplicarFiltrosAtuais();
      const agrupado = montarResumoAgrupado(baseFiltrada, "operadora");
      finalizarConsulta(texto, consulta, {
        type: "resumo",
        title: "Resumo por operadora",
        description: "Distribuicao atual dos numeros disponiveis agrupados por operadora dentro da base filtrada.",
        meta: [`${baseFiltrada.length} numero(s) analisado(s)`],
        items: agrupado.map(([label, total]) => ({
          label,
          detail: "Numeros disponiveis",
          value: `${total} numero(s)`
        }))
      }, baseFiltrada);
      return;
    }

    if (tipo === "resumo_cidade") {
      limparFiltroChat();
      aplicarFiltrosAtuais();
      const agrupado = montarResumoAgrupado(baseFiltrada, "cidade");
      finalizarConsulta(texto, consulta, {
        type: "resumo",
        title: "Resumo por cidade",
        description: "Distribuicao atual dos numeros disponiveis agrupados por cidade dentro da base filtrada.",
        meta: [`${baseFiltrada.length} numero(s) analisado(s)`],
        items: agrupado.map(([label, total]) => ({
          label,
          detail: "Numeros disponiveis",
          value: `${total} numero(s)`
        }))
      }, baseFiltrada);
      return;
    }

    if (tipo === "listar_filtrados") {
      const lista = baseFiltrada.slice(0, limite);
      aplicarResultadoChatNaTabela(baseFiltrada, { status });
      finalizarConsulta(texto, consulta, {
        type: "lista",
        title: "Resultado da consulta",
        description: "Encontrei os numeros abaixo com base nos filtros identificados no seu texto e apliquei esse recorte na tabela.",
        meta: [
          `${baseFiltrada.length} numero(s) encontrado(s)`,
          operadora ? `Operadora: ${operadora}` : "Todas as operadoras",
          cidade ? `Cidade: ${cidade}` : "Todas as cidades",
          ddd ? `DDD: ${ddd}` : "Todos os DDDs"
        ],
        items: lista.map((item) => ({
          principal: AppUtils.formatPhone(item.number),
          secundario: `${item.cidade || "Sem cidade"} | ${item.operadora || "Sem operadora"} | status ${item.status || "-"}`,
          destaque: `DDD ${item.ddd || "-"}`
        }))
      }, baseFiltrada);
      return;
    }

    limparFiltroChat();
    aplicarFiltrosAtuais();
    finalizarConsulta(texto, consulta, {
      title: "Consulta nao reconhecida",
      description: "Tente perguntas como: quais sao os 10 reservados mais antigos da Algar, quantos livres em Sao Paulo, me mostra os reservados do DDD 11 ou mostrar resumo por cidade.",
      meta: ["Consulta local baseada nos dados da tela e no historico"]
    }, []);
  }

  async function carregarEmpresas() {
    try {
      await carregarCaches();
      aplicarFiltrosAtuais();
      await atualizarCentroNotificacoes();
    } catch (error) {
      console.error(error);
      AppUtils.toast("Nao foi possivel carregar os numeros.", "error");
    }
  }

  async function inserirEmpresa(item) {
    const [salvo] = await window.appDb.insert("empresas", toDbEmpresa(item));
    return fromDbEmpresa(salvo);
  }

  async function atualizarEmpresa(id, payload) {
    const [salvo] = await window.appDb.update("empresas", { id: `eq.${id}` }, payload);
    return fromDbEmpresa(salvo);
  }

  async function excluirEmpresaRemota(id) {
    await window.appDb.remove("empresas", { id: `eq.${id}` });
  }

  async function moverParaUsados(item) {
    await window.appDb.insert("usados", toDbUsado(item));
    await excluirEmpresaRemota(item.id);
  }

  function setImportarLivresLabel(texto) {
    if (!btnImportarLivres) return;
    const alvo = btnImportarLivres.querySelector("span");
    if (alvo) {
      alvo.textContent = texto;
      return;
    }
    btnImportarLivres.textContent = texto;
  }

  async function inserirEmLotes(table, rows, mapFn, onProgress) {
    const inseridos = [];

    for (let index = 0; index < rows.length; index += TAMANHO_LOTE_IMPORTACAO) {
      const lote = rows.slice(index, index + TAMANHO_LOTE_IMPORTACAO);
      const resposta = await window.appDb.insert(table, lote.map(mapFn));
      inseridos.push(...resposta);

      if (onProgress) {
        onProgress({
          atual: Math.min(index + lote.length, rows.length),
          total: rows.length,
          lote: Math.floor(index / TAMANHO_LOTE_IMPORTACAO) + 1,
          lotes: Math.ceil(rows.length / TAMANHO_LOTE_IMPORTACAO)
        });
      }
    }

    return inseridos;
  }

  function aplicarPermissoes() {
    fecharModal(modal);
    fecharModal(modalUsado);
    fecharModal(modalObservacaoLivre);
    fecharModal(modalHistoricoLivre);

    if (btnNovo) btnNovo.style.display = podeGerirOperacional ? "" : "none";
    if (btnImportarLivres) btnImportarLivres.style.display = podeGerirOperacional ? "" : "none";
    if (btnExcluirTodosLivres) btnExcluirTodosLivres.style.display = isAdmin ? "" : "none";
    if (selecionarTodosLivres) selecionarTodosLivres.style.display = isAdmin ? "" : "none";
    if (docToolbarLivres) {
      docToolbarLivres.classList.toggle("user-toolbar", !isAdmin);
    }
    updateBulkBarLivres();
    if (docUserLivres) {
      docUserLivres.innerHTML = `<strong>${nomeExibicao}</strong><br>${perfilUsuario}`;
    }
  }

  if (btnUsados) {
    btnUsados.addEventListener("click", () => {
      window.location.href = "tab2.html";
    });
  }

  if (menuToggleLivres && sidePanelLivres) {
    menuToggleLivres.addEventListener("click", (event) => {
      event.stopPropagation();
      sidePanelLivres.classList.toggle("hidden");
    });
  }

  if (btnNotificacoes && painelNotificacoes) {
    btnNotificacoes.addEventListener("click", (event) => {
      event.stopPropagation();
      painelNotificacoes.classList.toggle("hidden");
    });
  }

  if (painelNotificacoes) {
    painelNotificacoes.addEventListener("click", (event) => {
      const botao = event.target.closest("[data-alerta-index]");
      if (!botao) return;
      const alerta = alertasSistema[Number(botao.dataset.alertaIndex)];
      if (!alerta?.query) return;
      if (consultaInteligente) consultaInteligente.value = alerta.query;
      painelNotificacoes.classList.add("hidden");
      executarConsultaInteligente(alerta.query);
    });
  }

  if (acoesToggleLivres && acoesMenuLivres) {
    acoesToggleLivres.innerHTML = "\u22EE";
    acoesToggleLivres.addEventListener("click", (event) => {
      event.stopPropagation();
      acoesMenuLivres.classList.toggle("hidden");
    });
  }

  if (btnFecharUsado) {
    btnFecharUsado.addEventListener("click", () => {
      fecharModal(modalUsado);
    });
  }

  if (modalUsado) {
    modalUsado.addEventListener("click", (e) => {
      if (e.target === modalUsado) {
        fecharModal(modalUsado);
      }
    });
  }

  if (btnNovo) {
    btnNovo.addEventListener("click", () => {
      abrirModal(modal);
    });
  }

  if (btnFechar) {
    btnFechar.addEventListener("click", () => {
      fecharModal(modal);
    });
  }

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      fecharModal(modal);
    }
    if (acoesMenuLivres && acoesToggleLivres && !acoesMenuLivres.contains(e.target) && e.target !== acoesToggleLivres) {
      acoesMenuLivres.classList.add("hidden");
    }
    if (sidePanelLivres && menuToggleLivres && !sidePanelLivres.contains(e.target) && e.target !== menuToggleLivres && !menuToggleLivres.contains(e.target)) {
      sidePanelLivres.classList.add("hidden");
    }
    if (painelNotificacoes && btnNotificacoes && !painelNotificacoes.contains(e.target) && e.target !== btnNotificacoes && !btnNotificacoes.contains(e.target)) {
      painelNotificacoes.classList.add("hidden");
    }
  });

  if (btnImportarLivres && importarLivresInput) {
    btnImportarLivres.addEventListener("click", () => importarLivresInput.click());
    importarLivresInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) processarImportacaoLivres(file);
    });
  }

  if (btnExportarLivres) {
    btnExportarLivres.addEventListener("click", () => {
      if (empresasCache.length === 0) {
        AppUtils.toast("Nenhum numero disponivel para exportar.", "warning");
        return;
      }

      let csv = "DDD;Cidade;Operadora;Numero;Status;Observacao;Ultima Alteracao\n";
      empresasCache.forEach((item) => {
        csv += `${item.ddd || ""};${item.cidade || ""};${item.operadora || ""};${item.number || ""};${item.status || ""};${(item.observacao || "").replace(/;/g, ",")};${item.dataAlteracao || ""}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "numeros_disponiveis.csv";
      link.click();
      URL.revokeObjectURL(url);
      AppUtils.toast("Exportacao concluida.", "success");
    });
  }

  if (btnExcluirTodosLivres) {
    btnExcluirTodosLivres.addEventListener("click", async () => {
      if (tipoUsuario !== "admin") return;
      const confirmado = await AppUtils.confirmDialog({
        title: "Excluir todos os numeros",
        message: "Essa acao remove todos os numeros livres e reservados. Deseja continuar?",
        confirmText: "Excluir Tudo",
        danger: true
      });
      if (!confirmado) return;

      try {
        await window.appDb.remove("empresas", { id: "gt.0" });
        await AppUtils.logAudit({
          entity_type: "empresas",
          entity_id: "all",
          action: "delete_all",
          details: [{ total: empresasCache.length }]
        });
        historicoCache = null;
        empresasCache = [];
        selecionadosLivres.clear();
        aplicarFiltrosAtuais();
        await atualizarCentroNotificacoes();
        AppUtils.toast("Todos os numeros livres foram excluidos.", "success");
      } catch (error) {
        console.error(error);
        AppUtils.toast("Nao foi possivel excluir todos os numeros.", "error");
      }
    });
  }

  if (empresaForm) {
    empresaForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const candidato = sanitizarEmpresa({
        ddd: document.getElementById("ddd").value,
        cidade: document.getElementById("cidade").value,
        operadora: document.getElementById("operadora").value,
        number: document.getElementById("number").value,
        status: document.getElementById("status").value,
        observacao: observacaoLivreInput ? observacaoLivreInput.value : ""
      });

      const erro = AppUtils.validateLivrePayload(candidato);
      if (erro) {
        AppUtils.toast(erro, "warning");
        return;
      }

      if (numeroExiste(candidato.number)) {
        AppUtils.toast("Esse numero ja existe em livres ou usados.", "warning");
        return;
      }

      try {
        const salvo = await inserirEmpresa(candidato);
        empresasCache.push(salvo);
        await AppUtils.logAudit({
          entity_type: "empresas",
          entity_id: salvo.id,
          action: "create",
          details: [salvo]
        });
        historicoCache = null;
        aplicarFiltrosAtuais();
        await atualizarCentroNotificacoes();

        empresaForm.reset();
        fecharModal(modal);
        AppUtils.toast("Numero cadastrado com sucesso.", "success");
      } catch (error) {
        console.error(error);
        AppUtils.toast("Nao foi possivel salvar no Supabase.", "error");
      }
    });
  }

  if (btnFecharObservacaoLivre) {
    btnFecharObservacaoLivre.addEventListener("click", () => {
      fecharModal(modalObservacaoLivre);
      numeroEmObservacao = null;
      if (formObservacaoLivre) formObservacaoLivre.reset();
    });
  }

  if (modalObservacaoLivre) {
    modalObservacaoLivre.addEventListener("click", (event) => {
      if (event.target === modalObservacaoLivre) {
        fecharModal(modalObservacaoLivre);
        numeroEmObservacao = null;
      }
    });
  }

  if (formObservacaoLivre) {
    formObservacaoLivre.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!numeroEmObservacao) return;

      const antes = { ...numeroEmObservacao };
      try {
        const salvo = await atualizarEmpresa(numeroEmObservacao.id, {
          observacao: observacaoLivreEditar.value.trim(),
          data_alteracao: new Date().toLocaleString("pt-BR")
        });
        const index = empresasCache.findIndex((item) => item.id === numeroEmObservacao.id);
        if (index >= 0) empresasCache[index] = salvo;
        await AppUtils.logAudit({
          entity_type: "empresas",
          entity_id: salvo.id,
          action: "update_observacao",
          details: AppUtils.diffObjects(antes, salvo, ["observacao", "dataAlteracao"])
        });
        historicoCache = null;
        fecharModal(modalObservacaoLivre);
        numeroEmObservacao = null;
        renderTable(listaAtualSource());
        AppUtils.toast("Observacao atualizada.", "success");
      } catch (error) {
        console.error(error);
        AppUtils.toast("Nao foi possivel salvar a observacao.", "error");
      }
    });
  }

  if (btnFecharHistoricoLivre) {
    btnFecharHistoricoLivre.addEventListener("click", () => fecharModal(modalHistoricoLivre));
  }

  if (modalHistoricoLivre) {
    modalHistoricoLivre.addEventListener("click", (event) => {
      if (event.target === modalHistoricoLivre) fecharModal(modalHistoricoLivre);
    });
  }

  function atualizarContador() {
    let livre = 0;
    let reservado = 0;
    let ocupado = 0;

    empresasCache.forEach((emp) => {
      if (emp.status === "livre") livre++;
      if (emp.status === "reservado") reservado++;
      if (emp.status === "ocupado") ocupado++;
    });

    document.getElementById("countLivre").innerText = livre;
    document.getElementById("countPendente").innerText = reservado;
    document.getElementById("countUsado").innerText = ocupado + usadosCache.length;
  }

  function paginar(lista) {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return lista.slice(inicio, fim);
  }

  function atualizarPaginacao(lista) {
    const totalPaginas = Math.ceil(lista.length / itensPorPagina) || 1;

    if (paginaInfo) paginaInfo.innerText = `${paginaAtual} de ${totalPaginas}`;
    if (prevPage) prevPage.disabled = paginaAtual === 1;
    if (nextPage) nextPage.disabled = paginaAtual === totalPaginas;
  }

  function renderTable(lista) {
    listaRenderizada = Array.isArray(lista) ? [...lista] : [];
    ultimaListaFonte = Array.isArray(lista) ? [...lista] : [];
    empresasTable.innerHTML = "";

    if (lista.length === 0) {
      empresasTable.innerHTML = `
      <tr>
      <td colspan="11">Nenhum numero cadastrado</td>
      </tr>
      `;
      atualizarPaginacao(lista);
      updateBulkBarLivres();
      return;
    }

    const listaPaginada = paginar(lista);

    listaPaginada.forEach((emp, i) => {
      const tr = document.createElement("tr");
      const botaoExcluir = tipoUsuario === "admin"
        ? `<button class="del-btn" aria-label="Excluir" title="Excluir">${iconeLixeira}</button>`
        : `<span style="color:#aaa;">Bloqueado</span>`;

      let opcoesStatus = `
      <option value="livre" ${emp.status === "livre" ? "selected" : ""}>Livre</option>
      <option value="reservado" ${emp.status === "reservado" ? "selected" : ""}>Reservado</option>
      `;

      if (tipoUsuario === "admin") {
        opcoesStatus += `<option value="ocupado" ${emp.status === "ocupado" ? "selected" : ""}>Ocupado</option>`;
      }

      tr.innerHTML = `
      <td>${tipoUsuario === "admin" ? `<input type="checkbox" class="selecionar-livre" data-id="${emp.id}" ${selecionadosLivres.has(emp.id) ? "checked" : ""}>` : ""}</td>
      <td>${String((paginaAtual - 1) * itensPorPagina + i + 1).padStart(3, "0")}</td>
      <td>${emp.ddd}</td>
      <td>${emp.cidade}</td>
      <td>${emp.operadora}</td>
      <td class="numero-copiavel" style="cursor:pointer;">${AppUtils.formatPhone(emp.number)}</td>
      <td>${emp.dataAlteracao || "-"}</td>
      <td>
      <select class="statusSelect">
      ${opcoesStatus}
      </select>
      </td>
      <td style="text-align:center;"><span class="table-action-btn btn-observacao-livre" title="Observacao">${iconeOlho}</span></td>
      <td style="text-align:center;"><span class="table-action-btn btn-historico-livre" title="Historico">${iconeHistorico}</span></td>
      <td>${botaoExcluir}</td>
      `;

      tr.querySelector(".numero-copiavel").addEventListener("click", () => {
        navigator.clipboard.writeText(emp.number);
        AppUtils.toast("Numero copiado.", "success");
      });

      const btnObservacaoLivre = tr.querySelector(".btn-observacao-livre");
      if (btnObservacaoLivre) {
        btnObservacaoLivre.addEventListener("click", () => {
          numeroEmObservacao = emp;
          if (observacaoLivreEditar) observacaoLivreEditar.value = emp.observacao || "";
          abrirModal(modalObservacaoLivre);
        });
      }

      const btnHistoricoLivre = tr.querySelector(".btn-historico-livre");
      if (btnHistoricoLivre) {
        btnHistoricoLivre.addEventListener("click", async () => {
          historicoLivreLista.innerHTML = `<div class="history-item">Carregando historico...</div>`;
          abrirModal(modalHistoricoLivre);
          const registros = await carregarHistoricoLivre(emp);
          renderHistoricoLivre(registros);
        });
      }

      tr.querySelector(".statusSelect").addEventListener("change", async (e) => {
        const novoStatus = e.target.value;

        if (novoStatus === "ocupado") {
          if (tipoUsuario !== "admin") {
            AppUtils.toast("Apenas administradores podem marcar como ocupado.", "warning");
            aplicarFiltrosAtuais();
            return;
          }

          numeroSelecionado = emp;
          abrirModal(modalUsado);
          return;
        }

        const antes = { ...emp };

        try {
          const salvo = await atualizarEmpresa(emp.id, {
            status: novoStatus,
            data_alteracao: new Date().toLocaleString("pt-BR")
          });

          const index = empresasCache.findIndex((item) => item.id === emp.id);
          if (index >= 0) empresasCache[index] = salvo;
          await AppUtils.logAudit({
            entity_type: "empresas",
            entity_id: emp.id,
            action: "update_status",
            details: AppUtils.diffObjects(antes, salvo, ["status", "dataAlteracao"])
          });
          historicoCache = null;
          atualizarContador();
          aplicarFiltrosAtuais();
          await atualizarCentroNotificacoes();
          AppUtils.toast("Status atualizado.", "success");
        } catch (error) {
          console.error(error);
          AppUtils.toast("Nao foi possivel atualizar o numero.", "error");
          aplicarFiltrosAtuais();
        }
      });

      if (tipoUsuario === "admin") {
        const checkbox = tr.querySelector(".selecionar-livre");
        if (checkbox) {
          checkbox.addEventListener("change", (event) => {
            if (event.target.checked) {
              selecionadosLivres.add(emp.id);
            } else {
              selecionadosLivres.delete(emp.id);
            }
            updateBulkBarLivres();
          });
        }

        tr.querySelector(".del-btn").addEventListener("click", async () => {
          const confirmado = await AppUtils.confirmDialog({
            title: "Excluir numero",
            message: `Deseja excluir o numero ${AppUtils.formatPhone(emp.number)}?`,
            confirmText: "Excluir",
            danger: true
          });
          if (!confirmado) return;

          try {
            await excluirEmpresaRemota(emp.id);
            await AppUtils.logAudit({
              entity_type: "empresas",
              entity_id: emp.id,
              action: "delete",
              details: [emp]
            });
            historicoCache = null;
            empresasCache = empresasCache.filter((item) => item.id !== emp.id);
            selecionadosLivres.delete(emp.id);
            aplicarFiltrosAtuais();
            await atualizarCentroNotificacoes();
            AppUtils.toast("Numero excluido.", "success");
          } catch (error) {
            console.error(error);
            AppUtils.toast("Nao foi possivel excluir o numero.", "error");
          }
        });
      }

      empresasTable.appendChild(tr);
    });

    atualizarContador();
    atualizarPaginacao(lista);
    if (selecionarTodosLivres && tipoUsuario === "admin") {
      const idsPagina = listaPaginada.map((item) => item.id);
      selecionarTodosLivres.checked = idsPagina.length > 0 && idsPagina.every((id) => selecionadosLivres.has(id));
    }
    updateBulkBarLivres();
  }

  function listaAtualSource() {
    return Array.isArray(ultimaListaFonte) ? ultimaListaFonte : empresasCache;
  }

  if (pesquisar) {
    pesquisar.addEventListener("input", () => {
      paginaAtual = 1;
      estadoFiltros.busca = pesquisar.value || "";
      aplicarFiltrosAtuais();
    });
  }

  if (btnExecutarConsulta) {
    btnExecutarConsulta.addEventListener("click", () => {
      executarConsultaInteligente(consultaInteligente ? consultaInteligente.value : "");
    });
  }

  if (consultaInteligente) {
    consultaInteligente.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        executarConsultaInteligente(consultaInteligente.value);
      }
    });
  }

  sugestoesConsulta.forEach((button) => {
    button.addEventListener("click", () => {
      const query = button.dataset.query || "";
      if (consultaInteligente) consultaInteligente.value = query;
      executarConsultaInteligente(query);
    });
  });

  if (consultaResultado) {
    consultaResultado.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-chat-action]");
      if (actionButton) {
        const action = actionButton.dataset.chatAction;
        if (action === "exportar") {
          exportarResultadoChat();
          return;
        }
        if (action === "limpar") {
          limparFiltrosDoChat();
          return;
        }
      }

      const queryButton = event.target.closest("[data-query]");
      if (queryButton) {
        const query = queryButton.dataset.query || "";
        if (consultaInteligente) consultaInteligente.value = query;
        executarConsultaInteligente(query);
      }
    });
  }

  if (statusFiltroVisual) {
    statusFiltroVisual.addEventListener("change", () => {
      paginaAtual = 1;
      estadoFiltros.status = statusFiltroVisual.value || "todos";
      aplicarFiltrosAtuais();
    });
  }

  if (selecionarTodosLivres) {
    selecionarTodosLivres.addEventListener("change", (event) => {
      if (tipoUsuario !== "admin") return;
      const idsPagina = paginar(listaAtualSource()).map((item) => item.id);
      idsPagina.forEach((id) => {
        if (event.target.checked) {
          selecionadosLivres.add(id);
        } else {
          selecionadosLivres.delete(id);
        }
      });
      renderTable(listaAtualSource());
    });
  }

  if (btnLimparSelecaoLivres) {
    btnLimparSelecaoLivres.addEventListener("click", () => {
      selecionadosLivres.clear();
      renderTable(listaAtualSource());
    });
  }

  if (btnAplicarStatusLivres) {
    btnAplicarStatusLivres.addEventListener("click", async () => {
      if (tipoUsuario !== "admin") return;
      const novoStatus = bulkStatusLivres ? bulkStatusLivres.value : "";
      if (!novoStatus || selecionadosLivres.size === 0) {
        AppUtils.toast("Selecione numeros e um status.", "warning");
        return;
      }

      const confirmacao = await AppUtils.confirmDialog({
        title: "Aplicar edicao em massa",
        message: `Alterar o status de ${selecionadosLivres.size} numero(s) para ${novoStatus}?`,
        confirmText: "Aplicar"
      });
      if (!confirmacao) return;

      try {
        for (const id of selecionadosLivres) {
          const item = empresasCache.find((empresa) => empresa.id === id);
          if (!item) continue;
          const antes = { ...item };
          const salvo = await atualizarEmpresa(id, {
            status: novoStatus,
            data_alteracao: new Date().toLocaleString("pt-BR")
          });
          const index = empresasCache.findIndex((empresa) => empresa.id === id);
          if (index >= 0) empresasCache[index] = salvo;
          await AppUtils.logAudit({
            entity_type: "empresas",
            entity_id: salvo.id,
            action: "bulk_update_status",
            details: AppUtils.diffObjects(antes, salvo, ["status", "dataAlteracao"])
          });
        }

        if (bulkStatusLivres) bulkStatusLivres.value = "";
        selecionadosLivres.clear();
        historicoCache = null;
        aplicarFiltrosAtuais();
        await atualizarCentroNotificacoes();
        AppUtils.toast("Edicao em massa concluida.", "success");
      } catch (error) {
        console.error(error);
        AppUtils.toast("Nao foi possivel aplicar a edicao em massa.", "error");
      }
    });
  }

  if (btnExcluirSelecionadosLivres) {
    btnExcluirSelecionadosLivres.addEventListener("click", async () => {
      if (tipoUsuario !== "admin" || selecionadosLivres.size === 0) return;
      const confirmacao = await AppUtils.confirmDialog({
        title: "Excluir selecionados",
        message: `Deseja excluir ${selecionadosLivres.size} numero(s) selecionado(s)?`,
        confirmText: "Excluir",
        danger: true
      });
      if (!confirmacao) return;

      try {
        for (const id of [...selecionadosLivres]) {
          const item = empresasCache.find((empresa) => empresa.id === id);
          if (!item) continue;
          await excluirEmpresaRemota(id);
          await AppUtils.logAudit({
            entity_type: "empresas",
            entity_id: id,
            action: "bulk_delete",
            details: [item]
          });
        }

        empresasCache = empresasCache.filter((item) => !selecionadosLivres.has(item.id));
        selecionadosLivres.clear();
        historicoCache = null;
        aplicarFiltrosAtuais();
        await atualizarCentroNotificacoes();
        AppUtils.toast("Numeros selecionados excluidos.", "success");
      } catch (error) {
        console.error(error);
        AppUtils.toast("Nao foi possivel excluir os selecionados.", "error");
      }
    });
  }

  const filtros = document.querySelectorAll(".filtro-btn");
  filtros.forEach((btn) => {
    btn.addEventListener("click", () => {
      paginaAtual = 1;
      const status = btn.dataset.status;

      if (status === "todos") {
        limparFiltroChat();
        estadoFiltros.status = "todos";
        if (statusFiltroVisual) statusFiltroVisual.value = "todos";
        aplicarFiltrosAtuais();
        return;
      }

      limparFiltroChat();
      estadoFiltros.status = status;
      if (statusFiltroVisual) statusFiltroVisual.value = status;
      aplicarFiltrosAtuais();
    });
  });

  const colunas = document.querySelectorAll(".ordenar");
  let ordemAsc = true;

  colunas.forEach((col) => {
    col.addEventListener("click", () => {
      const campo = col.dataset.col;
      empresasCache.sort((a, b) => {
        const valA = a[campo] || "";
        const valB = b[campo] || "";

        if (valA < valB) return ordemAsc ? -1 : 1;
        if (valA > valB) return ordemAsc ? 1 : -1;
        return 0;
      });

      ordemAsc = !ordemAsc;
      aplicarFiltrosAtuais();
    });
  });

  if (formUsado) {
    formUsado.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!numeroSelecionado) return;

      const antes = { ...numeroSelecionado };
      numeroSelecionado.responsavel = document.getElementById("responsavel").value;
      numeroSelecionado.empresa = document.getElementById("empresaUsado").value.trim();
      numeroSelecionado.ativo = "ativado";
      numeroSelecionado.dataAlteracao = new Date().toLocaleString("pt-BR");

      try {
        await moverParaUsados(numeroSelecionado);
        await AppUtils.logAudit({
          entity_type: "empresas",
          entity_id: numeroSelecionado.id,
          action: "move_to_usados",
          details: AppUtils.diffObjects(antes, numeroSelecionado, ["responsavel", "empresa", "ativo", "dataAlteracao"])
        });
        historicoCache = null;
        empresasCache = empresasCache.filter((n) => n.id !== numeroSelecionado.id);
        AppUtils.toast("Numero movido para usados.", "success");
        window.location.href = "tab2.html";
      } catch (error) {
        console.error(error);
        AppUtils.toast("Nao foi possivel mover o numero para usados.", "error");
      }
    });
  }

  async function processarImportacaoLivres(file) {
    const reader = new FileReader();

    reader.onload = async function(event) {
      const conteudo = (event.target.result || "").replace(/^\uFEFF/, "");
      const linhas = conteudo.split(/\r?\n/);
      const novos = [];
      let importados = 0;
      let duplicados = 0;
      let invalidos = 0;

      const cabecalho = (linhas[0] || "").toLowerCase();
      const delimitador = cabecalho.includes(";") ? ";" : ",";

      linhas.slice(1).forEach((linha) => {
        if (!linha.trim()) return;
        const col = linha.split(delimitador).map((valor) => valor.trim());
        if (col.length < 4) {
          invalidos++;
          return;
        }

        const candidato = sanitizarEmpresa({
          ddd: col[0]?.trim(),
          cidade: col[1]?.trim(),
          operadora: col[2]?.trim(),
          number: col[3]?.trim(),
          status: (col[4]?.trim() || "livre").toLowerCase()
        });

        const erro = AppUtils.validateLivrePayload(candidato);
        if (erro) {
          invalidos++;
          return;
        }

        if (numeroExiste(candidato.number) || novos.some((item) => item.number === candidato.number)) {
          duplicados++;
          return;
        }

        novos.push(candidato);
        importados++;
      });

      if (novos.length === 0) {
        AppUtils.toast(`Importados: ${importados} | Duplicados: ${duplicados} | Invalidos: ${invalidos}`, "warning", 4200);
        return;
      }

      const confirmarImportacao = await AppUtils.previewDialog({
        title: "Pre-visualizacao da importacao",
        summary: [
          { label: "Prontos para importar", value: novos.length },
          { label: "Duplicados", value: duplicados },
          { label: "Invalidos", value: invalidos }
        ],
        columns: [
          { key: "ddd", label: "DDD" },
          { key: "cidade", label: "Cidade" },
          { key: "operadora", label: "Operadora" },
          { key: "number", label: "Numero" },
          { key: "status", label: "Status" }
        ],
        rows: novos.slice(0, 8).map((item) => ({
          ...item,
          number: AppUtils.formatPhone(item.number)
        })),
        confirmText: "Importar Agora"
      });

      if (!confirmarImportacao) {
        AppUtils.toast("Importacao cancelada.", "info");
        return;
      }

      try {
        if (btnImportarLivres) {
          btnImportarLivres.disabled = true;
          setImportarLivresLabel("Importando...");
        }

        const inseridos = await inserirEmLotes("empresas", novos, toDbEmpresa, ({ lote, lotes }) => {
          if (btnImportarLivres) {
            setImportarLivresLabel(`Lote ${lote}/${lotes}`);
          }
        });
        const salvos = inseridos.map(fromDbEmpresa);
        empresasCache = [...empresasCache, ...salvos];
        await AppUtils.logAudit({
          entity_type: "empresas",
          entity_id: "import",
          action: "bulk_import",
          details: [{ total: salvos.length }]
        });
        historicoCache = null;
        aplicarFiltrosAtuais();
        await atualizarCentroNotificacoes();
        AppUtils.toast(`Importados: ${importados} | Duplicados: ${duplicados} | Invalidos: ${invalidos}`, "success", 4200);
      } catch (error) {
        console.error(error);
        AppUtils.toast("Nao foi possivel importar os numeros livres.", "error");
      } finally {
        if (btnImportarLivres) {
          btnImportarLivres.disabled = false;
          setImportarLivresLabel("Importar");
        }
      }
    };

    reader.readAsText(file);
  }

  if (prevPage) {
    prevPage.addEventListener("click", () => {
      if (paginaAtual > 1) {
        paginaAtual--;
        renderTable(listaAtualSource());
      }
    });
  }

  if (nextPage) {
    nextPage.addEventListener("click", () => {
      const totalPaginas = Math.ceil(listaAtualSource().length / itensPorPagina);
      if (paginaAtual < totalPaginas) {
        paginaAtual++;
        renderTable(listaAtualSource());
      }
    });
  }

  async function init() {
    aplicarPermissoes();
    await carregarEmpresas();
  }

  init();
});


