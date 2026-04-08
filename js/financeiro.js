document.addEventListener("DOMContentLoaded", async () => {
  if (window.AppAuth?.ready) {
    await window.AppAuth.ready;
  }
  const STORAGE_KEY = "financeiroLancamentos";
  const FECHAMENTOS_KEY = "financeiroCompetenciasFechadas";
  const REMOTE_TABLE = "financeiro";
  const REMOTE_COMPETENCIA_TABLE = "financeiro_competencias";
  const CLIENTES_REMOTE_TABLE = "clientes";
  const CLIENTES_LOCAL_KEY = "clientesCadastro";
  const menuToggle = document.getElementById("menuToggleFinanceiro");
  const sidePanel = document.getElementById("sidePanelFinanceiro");
  const btnSair = document.getElementById("btnSairFinanceiro");
  const docUser = document.getElementById("docUserFinanceiro");
  const btnNovo = document.getElementById("btnNovoLancamento");
  const modal = document.getElementById("modalFinanceiro");
  const btnFechar = document.getElementById("btnFecharFinanceiro");
  const financeiroForm = document.getElementById("financeiroForm");
  const financeiroTable = document.getElementById("financeiroTable");
  const pesquisar = document.getElementById("pesquisarFinanceiro");
  const filtroStatus = document.getElementById("filtroStatusFinanceiro");
  const filtroMes = document.getElementById("filtroMesFinanceiro");
  const competenciaStatus = document.getElementById("financeiroCompetenciaStatus");
  const btnFecharCompetencia = document.getElementById("btnFecharCompetencia");
  const btnReabrirCompetencia = document.getElementById("btnReabrirCompetencia");
  const financeiroAlertas = document.getElementById("financeiroAlertas");
  const modalObservacao = document.getElementById("modalObservacaoFinanceiro");
  const btnFecharObservacao = document.getElementById("btnFecharObservacaoFinanceiro");
  const textoObservacao = document.getElementById("textoObservacaoFinanceiro");
  const observacaoMeta = document.getElementById("observacaoMetaFinanceiro");
  const modoVisualizacao = document.getElementById("modoVisualizacaoFinanceiro");
  const modoEdicao = document.getElementById("modoEdicaoFinanceiro");
  const editarObservacao = document.getElementById("editarObservacaoFinanceiro");
  const btnEditarObservacao = document.getElementById("btnEditarObservacaoFinanceiro");
  const btnSalvarObservacao = document.getElementById("btnSalvarObservacaoFinanceiro");
  const clienteFinanceiro = document.getElementById("clienteFinanceiro");
  const empresaFinanceiro = document.getElementById("empresaFinanceiro");
  const tituloModalFinanceiro = document.getElementById("tituloModalFinanceiro");
  const financeiroEditId = document.getElementById("financeiroEditId");
  const btnHistoricoCompetencia = document.getElementById("btnHistoricoCompetencia");
  const modalCompetencia = document.getElementById("modalFechamentoCompetencia");
  const btnFecharModalCompetencia = document.getElementById("btnFecharModalCompetencia");
  const tituloModalCompetencia = document.getElementById("tituloModalCompetencia");
  const metaModalCompetencia = document.getElementById("metaModalCompetencia");
  const observacaoCompetencia = document.getElementById("observacaoCompetenciaFinanceiro");
  const btnConfirmarCompetencia = document.getElementById("btnConfirmarCompetencia");
  const modalHistoricoCompetencia = document.getElementById("modalHistoricoCompetencia");
  const btnFecharHistoricoCompetencia = document.getElementById("btnFecharHistoricoCompetencia");
  const historicoCompetenciaMeta = document.getElementById("historicoCompetenciaMeta");
  const historicoCompetenciaLista = document.getElementById("historicoCompetenciaLista");

  const tipoUsuario = window.AppAuth?.getRole?.() || localStorage.getItem("tipoUsuario") || "financeiro";
  const usuarioAtual = (window.AppAuth?.getUser?.() || localStorage.getItem("usuarioEmail") || "usuario").toLowerCase();
  const nomeExibicao = window.AppAuth?.getName?.() || (usuarioAtual.charAt(0).toUpperCase() + usuarioAtual.slice(1));
  const podeGerirFinanceiro = window.AppAuth?.can?.("financeiro_manage") ?? ["admin", "financeiro"].includes(tipoUsuario);
  let lancamentos = [];
  let usadosCache = [];
  let clientesCache = [];
  let financeiroModo = "remote";
  let avisoFallbackMostrado = false;
  let lancamentoEmObservacao = null;
  let competenciasFechadas = [];
  let ultimoRecorte = [];
  let acaoCompetenciaAtual = "fechar";
  const iconeOlho = `
    <svg class="icone-acao" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12C3.8 7.8 7.4 5.5 12 5.5C16.6 5.5 20.2 7.8 22 12C20.2 16.2 16.6 18.5 12 18.5C7.4 18.5 3.8 16.2 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `;

  function abrirModal() {
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  }

  function fecharModal() {
    modal.classList.add("hidden");
    modal.style.display = "none";
    if (financeiroEditId) financeiroEditId.value = "";
    if (tituloModalFinanceiro) tituloModalFinanceiro.textContent = "Novo Lancamento Financeiro";
  }

  function moeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function moedaCurta(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  }

  function carregarLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  function carregarClientesLocal() {
    try {
      return JSON.parse(localStorage.getItem(CLIENTES_LOCAL_KEY) || "[]");
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  function salvarLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lancamentos));
  }

  function normalizarLancamento(item) {
    const numeros = Array.isArray(item?.numeros)
      ? item.numeros.map((valor) => AppUtils.cleanNumber(valor)).filter(Boolean)
      : ((item?.numero || "").split(",").map((valor) => AppUtils.cleanNumber(valor)).filter(Boolean));

    return {
      ...item,
      numero: item?.numero || numeros.join(","),
      numeros,
      quantidadeNumeros: Number(item?.quantidadeNumeros || numeros.length || 0)
    };
  }

  function avisarFallback() {
    if (avisoFallbackMostrado) return;
    avisoFallbackMostrado = true;
    AppUtils.toast("Financeiro em modo local. Configure a tabela remoto para sincronizar no Supabase.", "warning", 4200);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function normalizarCliente(item) {
    return {
      id: item?.id || "",
      nome: (item?.nome || "").trim(),
      razaoSocial: (item?.razaoSocial || item?.razao_social || "").trim(),
      status: item?.status === "inativo" ? "inativo" : "ativo"
    };
  }

  function carregarFechamentosLocal() {
    try {
      return JSON.parse(localStorage.getItem(FECHAMENTOS_KEY) || "[]");
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  function salvarFechamentosLocal() {
    localStorage.setItem(FECHAMENTOS_KEY, JSON.stringify(competenciasFechadas));
  }

  function normalizarCompetencia(item) {
    return {
      competencia: item?.competencia || "",
      status: item?.status === "fechado" ? "fechado" : "aberto",
      fechadoEm: item?.fechadoEm || item?.fechado_em || "",
      fechadoPor: item?.fechadoPor || item?.fechado_por || "",
      observacao: item?.observacao || item?.observacao_fechamento || "",
      historico: Array.isArray(item?.historico) ? item.historico : []
    };
  }

  function toDbCompetencia(item) {
    return {
      competencia: item.competencia,
      status: item.status,
      fechado_em: item.fechadoEm || "",
      fechado_por: item.fechadoPor || ""
    };
  }

  function mergeCompetenciaMeta(remotas, locais) {
    const mapaLocal = new Map((locais || []).map((item) => [item.competencia, normalizarCompetencia(item)]));
    const remotasNormalizadas = (remotas || []).map((item) => {
      const local = mapaLocal.get(item.competencia);
      if (!local) return normalizarCompetencia(item);
      return {
        ...normalizarCompetencia(item),
        observacao: local.observacao || "",
        historico: Array.isArray(local.historico) ? local.historico : []
      };
    });
    const competenciasRemotas = new Set(remotasNormalizadas.map((item) => item.competencia));
    const apenasLocais = (locais || [])
      .map(normalizarCompetencia)
      .filter((item) => item.competencia && !competenciasRemotas.has(item.competencia));
    return [...remotasNormalizadas, ...apenasLocais];
  }

  function isCompetenciaFechada(competencia) {
    if (!competencia) return false;
    return competenciasFechadas.some((item) => item.competencia === competencia && item.status === "fechado");
  }

  async function carregarCompetenciasFechadas() {
    const locais = carregarFechamentosLocal().map(normalizarCompetencia);
    if (!window.appDb) {
      return locais;
    }

    try {
      const rows = await window.appDb.list(REMOTE_COMPETENCIA_TABLE, { order: "competencia.desc" });
      return mergeCompetenciaMeta(rows.map(normalizarCompetencia), locais);
    } catch (error) {
      console.warn("Tabela de competencias do financeiro indisponivel, usando localStorage.", error);
      return locais;
    }
  }

  async function salvarStatusCompetencia(payload, contexto = {}) {
    const baseAtual = competenciasFechadas.find((item) => item.competencia === payload.competencia) || { competencia: payload.competencia, historico: [] };
    const evento = {
      acao: payload.status === "fechado" ? "fechamento" : "reabertura",
      data: new Date().toLocaleString("pt-BR"),
      usuario: contexto.usuario || usuarioAtual,
      observacao: contexto.observacao || ""
    };
    const normalizado = normalizarCompetencia({
      ...baseAtual,
      ...payload,
      observacao: contexto.observacao ?? baseAtual.observacao ?? "",
      historico: [...(Array.isArray(baseAtual.historico) ? baseAtual.historico : []), evento]
    });
    const indice = competenciasFechadas.findIndex((item) => item.competencia === normalizado.competencia);
    if (indice >= 0) {
      competenciasFechadas[indice] = normalizado;
    } else {
      competenciasFechadas.push(normalizado);
    }

    if (window.appDb) {
      try {
        const existente = await window.appDb.list(REMOTE_COMPETENCIA_TABLE, { order: "competencia.desc" });
        const linhaAtual = Array.isArray(existente)
          ? existente.find((item) => item.competencia === normalizado.competencia)
          : null;
        if (linhaAtual) {
          await window.appDb.update(REMOTE_COMPETENCIA_TABLE, { competencia: `eq.${normalizado.competencia}` }, toDbCompetencia(normalizado));
        } else {
          await window.appDb.insert(REMOTE_COMPETENCIA_TABLE, toDbCompetencia(normalizado));
        }
      } catch (error) {
        console.warn("Nao foi possivel salvar o status da competencia no remoto.", error);
      }
    }

    salvarFechamentosLocal();
  }

  function atualizarStatusCompetenciaAtual() {
    if (!competenciaStatus) return;
    const competencia = filtroMes?.value || "";
    if (!competencia) {
      competenciaStatus.textContent = "Selecione uma competencia para gerenciar o fechamento.";
      return;
    }
    const fechamento = competenciasFechadas.find((item) => item.competencia === competencia);
    if (!fechamento || fechamento.status !== "fechado") {
      competenciaStatus.textContent = `A competencia ${competencia} esta aberta para novos lancamentos e edicoes.`;
      return;
    }
    const meta = fechamento.fechadoEm ? ` em ${fechamento.fechadoEm}` : "";
    const usuario = fechamento.fechadoPor ? ` por ${fechamento.fechadoPor}` : "";
    const observacao = fechamento.observacao ? ` Observacao: ${fechamento.observacao}` : "";
    competenciaStatus.textContent = `A competencia ${competencia} esta fechada${meta}${usuario}.${observacao}`;
  }

  function abrirModalCompetencia(acao) {
    const competencia = filtroMes?.value || "";
    if (!competencia) {
      AppUtils.toast("Selecione uma competencia.", "warning");
      return;
    }
    acaoCompetenciaAtual = acao;
    const fechamento = competenciasFechadas.find((item) => item.competencia === competencia);
    if (tituloModalCompetencia) {
      tituloModalCompetencia.textContent = acao === "fechar" ? "Fechar Competencia" : "Reabrir Competencia";
    }
    if (metaModalCompetencia) {
      metaModalCompetencia.textContent = acao === "fechar"
        ? `Voce esta fechando a competencia ${competencia}. Registre um contexto para historico e auditoria.`
        : `Voce esta reabrindo a competencia ${competencia}. Explique o motivo da reabertura.`;
    }
    if (observacaoCompetencia) {
      observacaoCompetencia.value = acao === "fechar" ? (fechamento?.observacao || "") : "";
    }
    modalCompetencia?.classList.remove("hidden");
    if (modalCompetencia) modalCompetencia.style.display = "flex";
  }

  function fecharModalCompetencia() {
    if (!modalCompetencia) return;
    modalCompetencia.classList.add("hidden");
    modalCompetencia.style.display = "none";
  }

  function abrirHistoricoCompetencia() {
    const competencia = filtroMes?.value || obterCompetenciaReferencia();
    if (!competencia) {
      AppUtils.toast("Selecione uma competencia para ver o historico.", "warning");
      return;
    }
    const fechamento = competenciasFechadas.find((item) => item.competencia === competencia) || normalizarCompetencia({ competencia, historico: [] });
    if (historicoCompetenciaMeta) {
      historicoCompetenciaMeta.innerHTML = `
        <span>${AppUtils.escapeHtml(competencia)}</span>
        <span>Status atual: ${AppUtils.escapeHtml(fechamento.status)}</span>
        <span>${AppUtils.escapeHtml(fechamento.fechadoPor || "Sem responsavel definido")}</span>
      `;
    }
    if (historicoCompetenciaLista) {
      const historico = Array.isArray(fechamento.historico) ? [...fechamento.historico].reverse() : [];
      historicoCompetenciaLista.innerHTML = historico.length
        ? historico.map((item) => `
          <div class="home-summary-item">
            <strong>${AppUtils.escapeHtml(item.acao || "-")} por ${AppUtils.escapeHtml(item.usuario || "-")}</strong>
            <span>${AppUtils.escapeHtml(item.data || "-")} | ${AppUtils.escapeHtml(item.observacao || "Sem observacao")}</span>
          </div>
        `).join("")
        : `<div class="home-summary-item"><strong>Sem historico registrado</strong><span>Os proximos fechamentos e reaberturas aparecerao aqui.</span></div>`;
    }
    modalHistoricoCompetencia?.classList.remove("hidden");
    if (modalHistoricoCompetencia) modalHistoricoCompetencia.style.display = "flex";
  }

  function fecharHistoricoCompetencia() {
    if (!modalHistoricoCompetencia) return;
    modalHistoricoCompetencia.classList.add("hidden");
    modalHistoricoCompetencia.style.display = "none";
  }

  function obterCompetenciaReferencia() {
    if (filtroMes?.value) return filtroMes.value;
    const competencias = [...new Set(lancamentos.map((item) => item.competencia).filter(Boolean))].sort().reverse();
    return competencias[0] || "";
  }

  function sanitize(payload) {
    const numeros = (payload.numero || "")
      .split(/[\n,;]+/)
      .map((item) => AppUtils.cleanNumber(item))
      .filter(Boolean);

    return {
      id: payload.id || `fin-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      clienteId: payload.clienteId || "",
      competencia: payload.competencia || "",
      cliente: (payload.cliente || "").trim(),
      empresa: (payload.empresa || "").trim(),
      numero: numeros.join(","),
      numeros,
      quantidadeNumeros: numeros.length,
      operadora: AppUtils.normalizeOperator(payload.operadora || ""),
      valor: Number(payload.valor || 0),
      custo: Number(payload.custo || 0),
      vencimento: payload.vencimento || "",
      status: payload.status || "pendente",
      observacao: (payload.observacao || "").trim(),
      atualizadoEm: new Date().toLocaleString("pt-BR")
    };
  }

  function toDbFinanceiro(item) {
    return {
      id: item.id,
      cliente_id: item.clienteId ? Number(item.clienteId) || null : null,
      competencia: item.competencia || "",
      cliente: item.cliente || "",
      empresa: item.empresa || "",
      numero: item.numero || "",
      quantidade_numeros: Number(item.quantidadeNumeros || 0),
      operadora: item.operadora || "",
      valor: Number(item.valor || 0),
      custo: Number(item.custo || 0),
      vencimento: item.vencimento || "",
      status: item.status || "pendente",
      observacao: item.observacao || "",
      atualizado_em: item.atualizadoEm || ""
    };
  }

  function fromDbFinanceiro(row) {
    const numeros = ((row.numero || "").split(","))
      .map((valor) => AppUtils.cleanNumber(valor))
      .filter(Boolean);

    return {
      id: row.id,
      clienteId: row.cliente_id || "",
      competencia: row.competencia || "",
      cliente: row.cliente || "",
      empresa: row.empresa || "",
      numero: row.numero || "",
      numeros,
      quantidadeNumeros: Number(row.quantidade_numeros || numeros.length || 0),
      operadora: row.operadora || "",
      valor: Number(row.valor || 0),
      custo: Number(row.custo || 0),
      vencimento: row.vencimento || "",
      status: row.status || "pendente",
      observacao: row.observacao || "",
      atualizadoEm: row.atualizado_em || ""
    };
  }

  async function carregarLancamentos() {
    if (!window.appDb) {
      financeiroModo = "local";
      avisarFallback();
      return carregarLocal().map(normalizarLancamento);
    }

    try {
      const rows = await window.appDb.list(REMOTE_TABLE, { order: "competencia.desc" });
      financeiroModo = "remote";
      return rows.map(fromDbFinanceiro);
    } catch (error) {
      console.warn("Financeiro remoto indisponivel, usando localStorage.", error);
      financeiroModo = "local";
      avisarFallback();
      return carregarLocal().map(normalizarLancamento);
    }
  }

  async function carregarClientesCadastro() {
    if (!window.appDb) {
      return carregarClientesLocal().map(normalizarCliente).filter((cliente) => cliente.status === "ativo");
    }

    try {
      const rows = await window.appDb.list(CLIENTES_REMOTE_TABLE, { order: "nome.asc" });
      return rows.map(normalizarCliente).filter((cliente) => cliente.status === "ativo");
    } catch (error) {
      console.warn("Clientes remoto indisponivel no financeiro, usando localStorage.", error);
      return carregarClientesLocal().map(normalizarCliente).filter((cliente) => cliente.status === "ativo");
    }
  }

  function preencherSelectClientes() {
    if (!clienteFinanceiro) return;
    const selecionadoAtual = clienteFinanceiro.value;
    clienteFinanceiro.innerHTML = `<option value="">Selecione um cliente</option>`;

    clientesCache.forEach((cliente) => {
      const option = document.createElement("option");
      option.value = cliente.id;
      option.textContent = cliente.nome;
      option.dataset.empresa = cliente.razaoSocial || cliente.nome;
      clienteFinanceiro.appendChild(option);
    });

    if (selecionadoAtual) {
      clienteFinanceiro.value = selecionadoAtual;
    }
  }

  function sincronizarClienteFinanceiro() {
    if (!clienteFinanceiro || !empresaFinanceiro) return;
    const option = clienteFinanceiro.options[clienteFinanceiro.selectedIndex];
    empresaFinanceiro.value = option?.dataset?.empresa || "";
  }

  async function inserirLancamento(payload) {
    if (financeiroModo === "remote" && window.appDb) {
      try {
        const [salvo] = await window.appDb.insert(REMOTE_TABLE, toDbFinanceiro(payload));
        return fromDbFinanceiro(salvo);
      } catch (error) {
        console.warn("Falha ao salvar financeiro remoto, usando localStorage.", error);
        financeiroModo = "local";
        avisarFallback();
      }
    }

    const localPayload = {
      ...normalizarLancamento(payload)
    };
    lancamentos.unshift(localPayload);
    salvarLocal();
    return localPayload;
  }

  async function excluirLancamento(id) {
    if (financeiroModo === "remote" && window.appDb) {
      try {
        await window.appDb.remove(REMOTE_TABLE, { id: `eq.${id}` });
        return;
      } catch (error) {
        console.warn("Falha ao excluir financeiro remoto, usando localStorage.", error);
        financeiroModo = "local";
        avisarFallback();
      }
    }

    lancamentos = lancamentos.filter((item) => item.id !== id);
    salvarLocal();
  }

  async function atualizarLancamento(payload) {
    const itemNormalizado = normalizarLancamento(payload);

    if (financeiroModo === "remote" && window.appDb) {
      try {
        const rows = await window.appDb.update(REMOTE_TABLE, { id: `eq.${itemNormalizado.id}` }, toDbFinanceiro(itemNormalizado));
        const salvo = Array.isArray(rows) && rows.length ? fromDbFinanceiro(rows[0]) : itemNormalizado;
        lancamentos = lancamentos.map((item) => item.id === salvo.id ? salvo : item);
        return salvo;
      } catch (error) {
        console.warn("Falha ao atualizar financeiro remoto, usando localStorage.", error);
        financeiroModo = "local";
        avisarFallback();
      }
    }

    lancamentos = lancamentos.map((item) => item.id === itemNormalizado.id ? itemNormalizado : item);
    salvarLocal();
    return itemNormalizado;
  }

  function validar(payload) {
    if (!payload.competencia) return "Informe a competencia.";
    if (!payload.cliente) return "Informe o cliente.";
    if (!payload.numeros.length) return "Informe pelo menos um numero.";
    if (Number.isNaN(payload.valor) || payload.valor <= 0) return "Informe um valor cobrado valido.";
    if (Number.isNaN(payload.custo) || payload.custo < 0) return "Informe um custo valido.";
    if (!payload.vencimento) return "Informe o vencimento.";
    if (!["pendente", "pago", "atrasado"].includes(payload.status)) return "Status financeiro invalido.";
    return "";
  }

  function preencherMeses() {
    if (!filtroMes) return;
    const valorAtual = filtroMes.value;
    const competencias = [...new Set(lancamentos.map((item) => item.competencia).filter(Boolean))].sort().reverse();
    filtroMes.innerHTML = `<option value="">Todas as competencias</option>`;
    competencias.forEach((competencia) => {
      const option = document.createElement("option");
      option.value = competencia;
      option.textContent = competencia;
      filtroMes.appendChild(option);
    });
    filtroMes.value = valorAtual || competencias[0] || "";
    atualizarStatusCompetenciaAtual();
  }

  function prepararModalNovo() {
    if (financeiroForm) financeiroForm.reset();
    if (financeiroEditId) financeiroEditId.value = "";
    if (tituloModalFinanceiro) tituloModalFinanceiro.textContent = "Novo Lancamento Financeiro";
    preencherSelectClientes();
    sincronizarClienteFinanceiro();
    sugerirUltimoUsado();
  }

  function preencherFormularioEdicao(lancamento) {
    if (!lancamento) return;
    if (financeiroEditId) financeiroEditId.value = lancamento.id || "";
    if (tituloModalFinanceiro) tituloModalFinanceiro.textContent = "Editar Lancamento Financeiro";
    preencherSelectClientes();
    const clienteEncontrado = clientesCache.find((cliente) => String(cliente.id) === String(lancamento.clienteId))
      || clientesCache.find((cliente) => cliente.nome === lancamento.cliente);
    if (clienteFinanceiro) {
      clienteFinanceiro.value = clienteEncontrado ? String(clienteEncontrado.id) : "";
    }
    sincronizarClienteFinanceiro();
    if (!empresaFinanceiro.value) {
      empresaFinanceiro.value = lancamento.empresa || "";
    }
    document.getElementById("competenciaFinanceiro").value = lancamento.competencia || "";
    document.getElementById("numeroFinanceiro").value = Array.isArray(lancamento.numeros) ? lancamento.numeros.join(", ") : (lancamento.numero || "");
    document.getElementById("operadoraFinanceiro").value = lancamento.operadora || "";
    document.getElementById("valorFinanceiro").value = Number(lancamento.valor || 0);
    document.getElementById("custoFinanceiro").value = Number(lancamento.custo || 0);
    document.getElementById("vencimentoFinanceiro").value = lancamento.vencimento || "";
    document.getElementById("statusFinanceiro").value = lancamento.status || "pendente";
    document.getElementById("observacaoFinanceiro").value = lancamento.observacao || "";
  }

  function renderAlertas(lista) {
    if (!financeiroAlertas) return;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const referencia = obterCompetenciaReferencia();
    const ativosNoMes = referencia ? lista.filter((item) => item.competencia === referencia) : lista;
    const vencendo = ativosNoMes.filter((item) => {
      if (!item.vencimento || item.status === "pago") return false;
      const data = new Date(`${item.vencimento}T00:00:00`);
      const diff = Math.ceil((data - hoje) / 86400000);
      return diff >= 0 && diff <= 7;
    });
    const atrasados = ativosNoMes.filter((item) => {
      if (!item.vencimento || item.status === "pago") return false;
      const data = new Date(`${item.vencimento}T00:00:00`);
      return item.status === "atrasado" || data < hoje;
    });
    const margensNegativas = ativosNoMes.filter((item) => Number(item.valor || 0) - Number(item.custo || 0) < 0);
    const clientesNoMes = new Set(ativosNoMes.map((item) => String(item.clienteId || item.cliente || "")).filter(Boolean));
    const clientesSemLancamento = referencia
      ? clientesCache.filter((cliente) => !clientesNoMes.has(String(cliente.id)) && !clientesNoMes.has(cliente.nome))
      : [];
    const clientesAtrasadosAntigos = ativosNoMes.filter((item) => {
      if (!item.vencimento || item.status === "pago") return false;
      const data = new Date(`${item.vencimento}T00:00:00`);
      const diff = Math.floor((hoje - data) / 86400000);
      return diff > 15;
    });
    const margensBaixas = ativosNoMes.filter((item) => {
      const valor = Number(item.valor || 0);
      const custo = Number(item.custo || 0);
      if (!valor) return false;
      return ((valor - custo) / valor) < 0.1;
    });
    const clienteTop = Object.entries(ativosNoMes.reduce((acc, item) => {
      const chave = item.cliente || "Nao informado";
      acc[chave] = (acc[chave] || 0) + Number(item.valor || 0);
      return acc;
    }, {})).sort((a, b) => b[1] - a[1])[0];
    const receitaTotal = ativosNoMes.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const competencias = [...new Set(lancamentos.map((item) => item.competencia).filter(Boolean))].sort().reverse();
    const indiceReferencia = competencias.indexOf(referencia);
    const competenciaAnterior = indiceReferencia >= 0 ? (competencias[indiceReferencia + 1] || "") : "";
    const operadoraAnterior = {};
    const operadoraAtual = {};
    lancamentos.filter((item) => item.competencia === competenciaAnterior).forEach((item) => {
      const chave = item.operadora || "Nao informada";
      operadoraAnterior[chave] = (operadoraAnterior[chave] || 0) + Number(item.custo || 0);
    });
    ativosNoMes.forEach((item) => {
      const chave = item.operadora || "Nao informada";
      operadoraAtual[chave] = (operadoraAtual[chave] || 0) + Number(item.custo || 0);
    });
    const operadoraPressionada = Object.keys(operadoraAtual).find((operadora) => operadoraAnterior[operadora] && operadoraAtual[operadora] > (operadoraAnterior[operadora] * 1.2));
    const numerosParados = usadosCache.filter((item) => {
      if ((item.ativo || "ativado") !== "ativado" || !item.data_alteracao) return false;
      const data = new Date(item.data_alteracao.replace(",", ""));
      if (Number.isNaN(data.getTime())) return false;
      return ((hoje - data) / 86400000) > 60;
    });

    const alertas = [];
    if (referencia && isCompetenciaFechada(referencia)) {
      const fechamento = competenciasFechadas.find((item) => item.competencia === referencia && item.status === "fechado");
      alertas.push({
        tipo: "info",
        titulo: `Competencia ${referencia} fechada`,
        texto: `Edicoes e exclusoes estao bloqueadas${fechamento?.fechadoEm ? ` desde ${fechamento.fechadoEm}` : ""}.`
      });
    }
    if (vencendo.length) {
      alertas.push({ tipo: "warning", titulo: "Vencimentos proximos", texto: `${vencendo.length} lancamento(s) vencem nos proximos 7 dias.` });
    }
    if (atrasados.length) {
      alertas.push({ tipo: "warning", titulo: "Titulos em atraso", texto: `${atrasados.length} lancamento(s) estao vencidos ou marcados como atrasado.` });
    }
    if (margensNegativas.length) {
      alertas.push({ tipo: "warning", titulo: "Margens negativas", texto: `${margensNegativas.length} lancamento(s) exigem revisao de valor e custo.` });
    }
    if (clientesSemLancamento.length) {
      alertas.push({ tipo: "warning", titulo: "Clientes sem lancamento no mes", texto: `${clientesSemLancamento.length} cliente(s) ativos ainda nao possuem lancamento em ${referencia}.` });
    }
    if (clientesAtrasadosAntigos.length) {
      alertas.push({ tipo: "warning", titulo: "Clientes com atraso acima de 15 dias", texto: `${clientesAtrasadosAntigos.length} lancamento(s) seguem sem pagamento ha mais de 15 dias.` });
    }
    if (margensBaixas.length) {
      alertas.push({ tipo: "warning", titulo: "Margem abaixo do limite", texto: `${margensBaixas.length} lancamento(s) operam com margem inferior a 10% no recorte atual.` });
    }
    if (clienteTop && receitaTotal && (clienteTop[1] / receitaTotal) >= 0.45) {
      alertas.push({ tipo: "warning", titulo: "Concentracao excessiva de receita", texto: `${clienteTop[0]} representa ${Math.round((clienteTop[1] / receitaTotal) * 100)}% da receita do periodo.` });
    }
    if (operadoraPressionada) {
      alertas.push({ tipo: "warning", titulo: "Custo de operadora em alta", texto: `O custo da operadora ${operadoraPressionada} subiu mais de 20% frente a ${competenciaAnterior || "competencia anterior"}.` });
    }
    if (numerosParados.length) {
      alertas.push({ tipo: "info", titulo: "Numeros usados sem movimentacao", texto: `${numerosParados.length} numero(s) estao ativos sem atualizacao ha mais de 60 dias.` });
    }
    if (!alertas.length) {
      alertas.push({ tipo: "success", titulo: "Operacao financeira estavel", texto: "Nenhum alerta critico foi encontrado no recorte atual." });
    }

    financeiroAlertas.innerHTML = alertas.map((alerta) => `
      <div class="financeiro-alerta-item ${alerta.tipo}">
        <strong>${AppUtils.escapeHtml(alerta.titulo)}</strong>
        <span>${AppUtils.escapeHtml(alerta.texto)}</span>
      </div>
    `).join("");
  }

  function atualizarResumo(lista) {
    const receita = lista.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const custo = lista.reduce((acc, item) => acc + Number(item.custo || 0), 0);
    const margem = receita - custo;
    const pendentes = lista.filter((item) => item.status !== "pago").length;

    setText("financeiroReceita", moedaCurta(receita));
    setText("financeiroCusto", moedaCurta(custo));
    setText("financeiroMargem", moedaCurta(margem));
    setText("financeiroPendentes", pendentes);

    const resumo = document.getElementById("financeiroResumo");
    if (!resumo) return;
    if (!lista.length) {
      resumo.innerHTML = `
        <div class="app-empty-state">
          <strong>Sem lancamentos neste recorte</strong>
          <span>Ajuste os filtros ou cadastre um novo lancamento para alimentar o resumo financeiro.</span>
        </div>
      `;
      return;
    }

    const topCliente = Object.entries(lista.reduce((acc, item) => {
      const cliente = item.cliente || "Nao informado";
      acc[cliente] = (acc[cliente] || 0) + Number(item.valor || 0);
      return acc;
    }, {})).sort((a, b) => b[1] - a[1])[0];

    const margensNegativas = lista.filter((item) => Number(item.valor || 0) - Number(item.custo || 0) < 0).length;

    resumo.innerHTML = `
      <div class="home-summary-item"><strong>Total de lancamentos:</strong><span>${lista.length}</span></div>
      <div class="home-summary-item"><strong>Total de numeros vinculados:</strong><span>${lista.reduce((acc, item) => acc + Number(item.quantidadeNumeros || 0), 0)}</span></div>
      <div class="home-summary-item"><strong>Maior cliente do recorte:</strong><span>${topCliente ? `${topCliente[0]} (${moeda(topCliente[1])})` : "-"}</span></div>
      <div class="home-summary-item"><strong>Lancamentos com margem negativa:</strong><span>${margensNegativas}</span></div>
      <div class="home-summary-item"><strong>Clientes distintos:</strong><span>${new Set(lista.map((item) => item.cliente).filter(Boolean)).size}</span></div>
    `;
  }

  function aplicarFiltros() {
    const termo = (pesquisar?.value || "").toLowerCase().trim();
    const status = filtroStatus?.value || "";
    const competencia = filtroMes?.value || "";

    const lista = lancamentos.filter((item) => {
      if (status && item.status !== status) return false;
      if (competencia && item.competencia !== competencia) return false;
      if (!termo) return true;
      return [
        item.cliente,
        item.empresa,
        item.numero,
        item.numeros?.join(" "),
        item.operadora,
        item.competencia,
        item.status,
        item.observacao
      ].some((valor) => (valor || "").toString().toLowerCase().includes(termo));
    });

    ultimoRecorte = lista;
    renderTabela(lista);
    atualizarResumo(lista);
    renderAlertas(lista);
    atualizarStatusCompetenciaAtual();
  }

  function abrirModalObservacao(lancamento) {
    if (!modalObservacao || !lancamento) return;
    lancamentoEmObservacao = lancamento;
    const bloqueado = isCompetenciaFechada(lancamento.competencia);
    const semEdicao = bloqueado || !podeGerirFinanceiro;
    if (textoObservacao) {
      textoObservacao.textContent = lancamento.observacao || "Nenhuma observacao registrada.";
    }
    if (observacaoMeta) {
      const numeroBase = Array.isArray(lancamento.numeros) && lancamento.numeros.length
        ? AppUtils.formatPhone(lancamento.numeros[0])
        : "-";
      observacaoMeta.innerHTML = `
        <span>${AppUtils.escapeHtml(lancamento.cliente || "Sem cliente")}</span>
        <span>${AppUtils.escapeHtml(lancamento.empresa || "Sem empresa")}</span>
        <span>${AppUtils.escapeHtml(numeroBase)}</span>
      `;
    }
    if (editarObservacao) {
      editarObservacao.value = lancamento.observacao || "";
    }
    if (modoVisualizacao) modoVisualizacao.classList.remove("hidden");
    if (modoEdicao) modoEdicao.classList.add("hidden");
    if (btnEditarObservacao) {
      btnEditarObservacao.classList.toggle("hidden", semEdicao);
      btnEditarObservacao.disabled = semEdicao;
    }
    if (btnSalvarObservacao) btnSalvarObservacao.classList.add("hidden");
    modalObservacao.classList.remove("hidden");
    modalObservacao.style.display = "flex";
  }

  function fecharModalObservacao() {
    if (!modalObservacao) return;
    modalObservacao.classList.add("hidden");
    modalObservacao.style.display = "none";
    lancamentoEmObservacao = null;
    if (modoVisualizacao) modoVisualizacao.classList.remove("hidden");
    if (modoEdicao) modoEdicao.classList.add("hidden");
    if (btnEditarObservacao) btnEditarObservacao.classList.remove("hidden");
    if (btnSalvarObservacao) btnSalvarObservacao.classList.add("hidden");
  }

  function renderTabela(lista) {
    if (!financeiroTable) return;
    if (!lista.length) {
      financeiroTable.innerHTML = `
        <tr>
          <td colspan="13">
            <div class="app-empty-state">
              <strong>Nenhum lancamento encontrado</strong>
              <span>Esse recorte nao retornou resultados. Revise os filtros ou crie um novo lancamento financeiro.</span>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    financeiroTable.innerHTML = lista.map((item) => {
      const margem = Number(item.valor || 0) - Number(item.custo || 0);
      const bloqueado = isCompetenciaFechada(item.competencia);
      const semEdicao = bloqueado || !podeGerirFinanceiro;
      const numeros = Array.isArray(item.numeros) && item.numeros.length
        ? item.numeros
        : (item.numero ? item.numero.split(",").filter(Boolean) : []);
      const numeroPrincipal = numeros[0] ? AppUtils.formatPhone(numeros[0]) : "-";
      const resumoNumeros = numeros.length > 1 ? `${numeroPrincipal} +${numeros.length - 1}` : numeroPrincipal;
      return `
        <tr>
          <td>
            ${AppUtils.escapeHtml(item.competencia || "-")}
            ${bloqueado ? '<div class="financeiro-status-chip fechado">Fechado</div>' : '<div class="financeiro-status-chip">Aberto</div>'}
          </td>
          <td>${AppUtils.escapeHtml(item.cliente || "-")}</td>
          <td>${AppUtils.escapeHtml(item.empresa || "-")}</td>
          <td>${AppUtils.escapeHtml(resumoNumeros)}</td>
          <td>
            <select class="financeiro-inline-select" data-field="operadora" data-id="${item.id}" ${semEdicao ? "disabled" : ""}>
              <option value="">Selecionar</option>
              <option value="TIP" ${item.operadora === "TIP" ? "selected" : ""}>TIP</option>
              <option value="Algar" ${item.operadora === "Algar" ? "selected" : ""}>Algar</option>
              <option value="Conectel" ${item.operadora === "Conectel" ? "selected" : ""}>Conectel</option>
            </select>
          </td>
          <td>${AppUtils.escapeHtml(moeda(item.valor))}</td>
          <td>${AppUtils.escapeHtml(moeda(item.custo))}</td>
          <td>${AppUtils.escapeHtml(moeda(margem))}</td>
          <td>${AppUtils.escapeHtml(item.vencimento || "-")}</td>
          <td>
            <select class="financeiro-inline-select" data-field="status" data-id="${item.id}" ${semEdicao ? "disabled" : ""}>
              <option value="pendente" ${item.status === "pendente" ? "selected" : ""}>Pendente</option>
              <option value="pago" ${item.status === "pago" ? "selected" : ""}>Pago</option>
              <option value="atrasado" ${item.status === "atrasado" ? "selected" : ""}>Atrasado</option>
            </select>
          </td>
          <td>
            <button class="btn-editar-financeiro" data-id="${item.id}" type="button" ${semEdicao ? "disabled" : ""}>Editar</button>
          </td>
          <td style="text-align:center;">
            <button class="table-action-btn btn-visualizar-obs" data-id="${item.id}" type="button" title="Visualizar observacao">
              ${iconeOlho}
            </button>
          </td>
          <td><button class="del-btn-financeiro" data-id="${item.id}" type="button" ${semEdicao ? "disabled" : ""}>Excluir</button></td>
        </tr>
      `;
    }).join("");

    financeiroTable.querySelectorAll(".financeiro-inline-select").forEach((select) => {
      select.addEventListener("change", async () => {
        const id = select.dataset.id;
        const field = select.dataset.field;
        const atual = lancamentos.find((item) => item.id === id);
        if (!atual || !field) return;
        if (isCompetenciaFechada(atual.competencia)) {
          AppUtils.toast("A competencia deste lancamento esta fechada.", "warning");
          aplicarFiltros();
          return;
        }

        const proximo = {
          ...atual,
          [field]: field === "operadora"
            ? AppUtils.normalizeOperator(select.value)
            : select.value,
          atualizadoEm: new Date().toLocaleString("pt-BR")
        };

        await atualizarLancamento(proximo);
        await AppUtils.logAudit({
          entity_type: "financeiro",
          entity_id: atual.id,
          action: `update_${field}`,
          details: [{ field, before: atual[field] || "", after: proximo[field] || "" }]
        });
        preencherMeses();
        aplicarFiltros();
        AppUtils.toast(`${field === "status" ? "Status" : "Operadora"} atualizad${field === "status" ? "o" : "a"}.`, "success");
      });
    });

    financeiroTable.querySelectorAll(".btn-editar-financeiro").forEach((button) => {
      button.addEventListener("click", () => {
        const item = lancamentos.find((lancamento) => lancamento.id === button.dataset.id);
        if (!item) return;
        if (isCompetenciaFechada(item.competencia)) {
          AppUtils.toast("A competencia deste lancamento esta fechada.", "warning");
          return;
        }
        preencherFormularioEdicao(item);
        abrirModal();
      });
    });

    financeiroTable.querySelectorAll(".btn-visualizar-obs").forEach((button) => {
      button.addEventListener("click", () => {
        const item = lancamentos.find((lancamento) => lancamento.id === button.dataset.id);
        abrirModalObservacao(item);
      });
    });

    financeiroTable.querySelectorAll(".del-btn-financeiro").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.id;
        const confirmacao = await AppUtils.confirmDialog({
          title: "Excluir lancamento",
          message: "Deseja excluir este lancamento financeiro?",
          confirmText: "Excluir",
          danger: true
        });
        if (!confirmacao) return;
        const item = lancamentos.find((lancamento) => lancamento.id === id);
        if (item && isCompetenciaFechada(item.competencia)) {
          AppUtils.toast("A competencia deste lancamento esta fechada.", "warning");
          return;
        }
        await excluirLancamento(id);
        if (item) {
          await AppUtils.logAudit({
            entity_type: "financeiro",
            entity_id: item.id,
            action: "delete",
            details: [{ field: "cliente", before: item.cliente || "", after: "" }]
          });
        }
        if (financeiroModo === "remote") {
          lancamentos = lancamentos.filter((item) => item.id !== id);
        }
        preencherMeses();
        aplicarFiltros();
        AppUtils.toast("Lancamento excluido.", "success");
      });
    });
  }

  async function carregarSugestoes() {
    try {
      usadosCache = await window.appDb.list("usados", { order: "id.asc" });
    } catch (error) {
      usadosCache = [];
    }
  }

  function sugerirUltimoUsado() {
    const ultimo = usadosCache[usadosCache.length - 1];
    if (!ultimo) return;
    const numeroEl = document.getElementById("numeroFinanceiro");
    const operadoraEl = document.getElementById("operadoraFinanceiro");
    if (numeroEl && !numeroEl.value) numeroEl.value = ultimo.number || "";
    if (operadoraEl && !operadoraEl.value) operadoraEl.value = ultimo.operadora || "";
  }

  if (docUser) {
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
    if (modal && event.target === modal) {
      fecharModal();
    }
    if (modalObservacao && event.target === modalObservacao) {
      fecharModalObservacao();
    }
    if (modalCompetencia && event.target === modalCompetencia) {
      fecharModalCompetencia();
    }
    if (modalHistoricoCompetencia && event.target === modalHistoricoCompetencia) {
      fecharHistoricoCompetencia();
    }
  });

  if (btnNovo) {
    btnNovo.addEventListener("click", () => {
      if (!podeGerirFinanceiro) {
        AppUtils.toast("Seu perfil nao pode criar lancamentos financeiros.", "warning");
        return;
      }
      prepararModalNovo();
      abrirModal();
    });
  }

  if (clienteFinanceiro) {
    clienteFinanceiro.addEventListener("change", sincronizarClienteFinanceiro);
  }

  if (btnFechar) {
    btnFechar.addEventListener("click", fecharModal);
  }

  if (btnFecharObservacao) {
    btnFecharObservacao.addEventListener("click", fecharModalObservacao);
  }

  if (btnFecharModalCompetencia) {
    btnFecharModalCompetencia.addEventListener("click", fecharModalCompetencia);
  }

  if (btnFecharHistoricoCompetencia) {
    btnFecharHistoricoCompetencia.addEventListener("click", fecharHistoricoCompetencia);
  }

  if (btnEditarObservacao) {
    btnEditarObservacao.addEventListener("click", () => {
      if (!lancamentoEmObservacao) return;
      if (!podeGerirFinanceiro) {
        AppUtils.toast("Seu perfil nao pode editar observacoes financeiras.", "warning");
        return;
      }
      if (isCompetenciaFechada(lancamentoEmObservacao.competencia)) {
        AppUtils.toast("A competencia deste lancamento esta fechada.", "warning");
        return;
      }
      if (modoVisualizacao) modoVisualizacao.classList.add("hidden");
      if (modoEdicao) modoEdicao.classList.remove("hidden");
      btnEditarObservacao.classList.add("hidden");
      if (btnSalvarObservacao) btnSalvarObservacao.classList.remove("hidden");
      editarObservacao?.focus();
    });
  }

  if (btnSalvarObservacao) {
    btnSalvarObservacao.addEventListener("click", async () => {
      if (!lancamentoEmObservacao || !editarObservacao) return;
      if (!podeGerirFinanceiro) {
        AppUtils.toast("Seu perfil nao pode salvar observacoes financeiras.", "warning");
        return;
      }
      const atualizado = await atualizarLancamento({
        ...lancamentoEmObservacao,
        observacao: editarObservacao.value,
        atualizadoEm: new Date().toLocaleString("pt-BR")
      });
      await AppUtils.logAudit({
        entity_type: "financeiro",
        entity_id: atualizado.id,
        action: "update_observacao",
        details: [{ field: "observacao", before: lancamentoEmObservacao.observacao || "", after: atualizado.observacao || "" }]
      });
      lancamentoEmObservacao = atualizado;
      preencherMeses();
      aplicarFiltros();
      abrirModalObservacao(atualizado);
      AppUtils.toast("Observacao atualizada.", "success");
    });
  }

  if (financeiroForm) {
    financeiroForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!podeGerirFinanceiro) {
        AppUtils.toast("Seu perfil nao pode alterar o financeiro.", "warning");
        return;
      }
      const editId = financeiroEditId?.value || "";
      const clienteSelecionado = document.getElementById("clienteFinanceiro");
      const clienteOption = clienteSelecionado?.options?.[clienteSelecionado.selectedIndex];
      const payload = sanitize({
        id: editId || undefined,
        clienteId: clienteSelecionado?.value || "",
        cliente: clienteOption?.text || "",
        competencia: document.getElementById("competenciaFinanceiro").value,
        empresa: document.getElementById("empresaFinanceiro").value,
        numero: document.getElementById("numeroFinanceiro").value,
        operadora: document.getElementById("operadoraFinanceiro").value,
        valor: document.getElementById("valorFinanceiro").value,
        custo: document.getElementById("custoFinanceiro").value,
        vencimento: document.getElementById("vencimentoFinanceiro").value,
        status: document.getElementById("statusFinanceiro").value,
        observacao: document.getElementById("observacaoFinanceiro").value
      });

      const erro = validar(payload);
      if (erro) {
        AppUtils.toast(erro, "warning");
        return;
      }

      const competenciaOriginal = editId
        ? lancamentos.find((item) => item.id === editId)?.competencia || ""
        : "";
      if ((payload.competencia && isCompetenciaFechada(payload.competencia)) || (competenciaOriginal && isCompetenciaFechada(competenciaOriginal))) {
        AppUtils.toast("Nao e possivel salvar porque a competencia esta fechada.", "warning");
        return;
      }

      if (editId) {
        const anterior = lancamentos.find((item) => item.id === editId);
        const salvo = await atualizarLancamento(payload);
        await AppUtils.logAudit({
          entity_type: "financeiro",
          entity_id: salvo.id,
          action: "update",
          details: AppUtils.diffObjects(anterior, salvo, ["competencia", "cliente", "empresa", "numero", "operadora", "valor", "custo", "vencimento", "status", "observacao"])
        });
        if (financeiroModo !== "remote") {
          // atualizado diretamente na lista local dentro da funcao
        }
        if (financeiroModo === "remote") {
          lancamentos = lancamentos.map((item) => item.id === salvo.id ? salvo : item);
        }
        preencherMeses();
        aplicarFiltros();
        fecharModal();
        financeiroForm.reset();
        if (financeiroEditId) financeiroEditId.value = "";
        AppUtils.toast("Lancamento financeiro atualizado.", "success");
        return;
      }

      const salvo = await inserirLancamento(payload);
      await AppUtils.logAudit({
        entity_type: "financeiro",
        entity_id: salvo.id,
        action: "create",
        details: [{ field: "cliente", before: "", after: salvo.cliente || "" }]
      });
      if (financeiroModo === "remote") {
        lancamentos.unshift(salvo);
      }
      preencherMeses();
      aplicarFiltros();
      fecharModal();
      financeiroForm.reset();
      AppUtils.toast("Lancamento financeiro salvo.", "success");
    });
  }

  [pesquisar, filtroStatus, filtroMes].forEach((element) => {
    if (!element) return;
    element.addEventListener("input", aplicarFiltros);
    element.addEventListener("change", aplicarFiltros);
  });

  if (btnFecharCompetencia) {
    btnFecharCompetencia.addEventListener("click", async () => {
      if (!podeGerirFinanceiro) {
        AppUtils.toast("Seu perfil nao pode fechar competencias.", "warning");
        return;
      }
      const competencia = filtroMes?.value || "";
      if (!competencia) {
        AppUtils.toast("Selecione uma competencia para fechar.", "warning");
        return;
      }
      if (isCompetenciaFechada(competencia)) {
        AppUtils.toast("Essa competencia ja esta fechada.", "warning");
        return;
      }
      abrirModalCompetencia("fechar");
    });
  }

  if (btnReabrirCompetencia) {
    btnReabrirCompetencia.addEventListener("click", async () => {
      if (!podeGerirFinanceiro) {
        AppUtils.toast("Seu perfil nao pode reabrir competencias.", "warning");
        return;
      }
      const competencia = filtroMes?.value || "";
      if (!competencia) {
        AppUtils.toast("Selecione uma competencia para reabrir.", "warning");
        return;
      }
      if (!isCompetenciaFechada(competencia)) {
        AppUtils.toast("Essa competencia ja esta aberta.", "warning");
        return;
      }
      abrirModalCompetencia("reabrir");
    });
  }

  if (btnHistoricoCompetencia) {
    btnHistoricoCompetencia.addEventListener("click", abrirHistoricoCompetencia);
  }

  if (btnConfirmarCompetencia) {
    btnConfirmarCompetencia.addEventListener("click", async () => {
      if (!podeGerirFinanceiro) {
        AppUtils.toast("Seu perfil nao pode alterar o status da competencia.", "warning");
        return;
      }
      const competencia = filtroMes?.value || "";
      if (!competencia) {
        AppUtils.toast("Selecione uma competencia.", "warning");
        return;
      }
      const observacao = observacaoCompetencia?.value?.trim() || "";
      if (acaoCompetenciaAtual === "reabrir" && !observacao) {
        AppUtils.toast("Informe o motivo da reabertura para registrar no historico.", "warning");
        return;
      }
      const fechamentoAnterior = competenciasFechadas.find((item) => item.competencia === competencia);
      const payload = acaoCompetenciaAtual === "fechar"
        ? {
            competencia,
            status: "fechado",
            fechadoEm: new Date().toLocaleString("pt-BR"),
            fechadoPor: usuarioAtual
          }
        : {
            competencia,
            status: "aberto",
            fechadoEm: "",
            fechadoPor: ""
          };
      await salvarStatusCompetencia(payload, { usuario: usuarioAtual, observacao });
      await AppUtils.logAudit({
        entity_type: "financeiro_competencia",
        entity_id: competencia,
        action: acaoCompetenciaAtual === "fechar" ? "fechar_competencia" : "reabrir_competencia",
        details: [
          { field: "status", before: fechamentoAnterior?.status || "aberto", after: payload.status },
          { field: "observacao", before: fechamentoAnterior?.observacao || "", after: observacao }
        ]
      });
      fecharModalCompetencia();
      atualizarStatusCompetenciaAtual();
      aplicarFiltros();
      AppUtils.toast(
        acaoCompetenciaAtual === "fechar"
          ? `Competencia ${competencia} fechada com historico.`
          : `Competencia ${competencia} reaberta e registrada no historico.`,
        "success"
      );
    });
  }

  await carregarSugestoes();
  clientesCache = await carregarClientesCadastro();
  preencherSelectClientes();
  competenciasFechadas = await carregarCompetenciasFechadas();
  lancamentos = await carregarLancamentos();
  if (btnNovo) btnNovo.disabled = !podeGerirFinanceiro;
  if (btnFecharCompetencia) btnFecharCompetencia.disabled = !podeGerirFinanceiro;
  if (btnReabrirCompetencia) btnReabrirCompetencia.disabled = !podeGerirFinanceiro;
  preencherMeses();
  aplicarFiltros();
});


