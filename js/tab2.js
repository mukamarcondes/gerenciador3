document.addEventListener("DOMContentLoaded", async () => {
  if (window.AppAuth?.ready) {
    await window.AppAuth.ready;
  }
  const tabela = document.getElementById("usadosTable");
  const pesquisa = document.getElementById("pesquisaUsados");
  const btnExportar = document.getElementById("exportarExcel");
  const btnExcluirTodosUsados = document.getElementById("btnExcluirTodosUsados");
  const importarPlanilha = document.getElementById("importarPlanilha");
  const dropBox = document.getElementById("dropBox");
  const nomeArquivo = document.getElementById("nomeArquivo");
  const prevPage = document.getElementById("prevPage");
  const nextPage = document.getElementById("nextPage");
  const paginaInfo = document.getElementById("paginaInfo");
  const countAtivado = document.getElementById("countAtivado");
  const countDesativado = document.getElementById("countDesativado");
  const modalObservacao = document.getElementById("modalObservacao");
  const formObservacao = document.getElementById("formObservacao");
  const btnFecharObservacao = document.getElementById("btnFecharObservacao");
  const observacaoInput = document.getElementById("observacao");
  const modalVisualizarObservacao = document.getElementById("modalVisualizarObservacao");
  const btnFecharVisualizacao = document.getElementById("btnFecharVisualizacao");
  const textoObservacao = document.getElementById("textoObservacao");
  const btnEditarObservacao = document.getElementById("btnEditarObservacao");
  const btnSalvarObservacao = document.getElementById("btnSalvarObservacao");
  const modoVisualizacao = document.getElementById("modoVisualizacao");
  const modoEdicao = document.getElementById("modoEdicao");
  const observacaoEditar = document.getElementById("observacaoEditar");
  const bulkBarUsados = document.getElementById("bulkBarUsados");
  const bulkInfoUsados = document.getElementById("bulkInfoUsados");
  const bulkOperadoraUsados = document.getElementById("bulkOperadoraUsados");
  const bulkStatusUsados = document.getElementById("bulkStatusUsados");
  const btnAplicarEdicaoUsados = document.getElementById("btnAplicarEdicaoUsados");
  const btnExcluirSelecionadosUsados = document.getElementById("btnExcluirSelecionadosUsados");
  const btnLimparSelecaoUsados = document.getElementById("btnLimparSelecaoUsados");
  const selecionarTodosUsados = document.getElementById("selecionarTodosUsados");
  const modalHistoricoUsado = document.getElementById("modalHistoricoUsado");
  const historicoUsadoLista = document.getElementById("historicoUsadoLista");
  const btnFecharHistoricoUsado = document.getElementById("btnFecharHistoricoUsado");
  const menuToggleUsados = document.getElementById("menuToggleUsados");
  const sidePanelUsados = document.getElementById("sidePanelUsados");
  const btnSairUsados = document.getElementById("btnSairUsados");
  const acoesToggleUsados = document.getElementById("acoesToggleUsados");
  const acoesMenuUsados = document.getElementById("acoesMenuUsados");
  const operadoraFiltroVisual = document.getElementById("operadoraFiltroVisual");
  const docUserUsados = document.getElementById("docUserUsados");

  const perfilUsuario = window.AppAuth?.getRole?.() || localStorage.getItem("tipoUsuario") || "operador_numeros";
  const usuarioAtual = (window.AppAuth?.getUser?.() || localStorage.getItem("usuarioEmail") || "usuario").toLowerCase();
  const nomeExibicao = window.AppAuth?.getName?.() || (usuarioAtual.charAt(0).toUpperCase() + usuarioAtual.slice(1));
  const podeGerirOperacional = window.AppAuth?.can?.("operacional_manage") ?? ["admin", "operador_numeros"].includes(perfilUsuario);
  const isAdmin = perfilUsuario === "admin";
  let tipoUsuario = isAdmin ? "admin" : "user";
  let paginaAtual = 1;
  const itensPorPagina = 10;
  const TAMANHO_LOTE_IMPORTACAO = 200;
  let usados = [];
  let empresasConhecidas = [];
  let listaAtual = usados;
  let numeroEmDesativacao = null;
  let numeroEmVisualizacao = null;
  let historicoCache = null;
  const selecionadosUsados = new Set();

  const iconeOlho = `<svg class="icone-acao icone-observacao" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const iconeHistorico = `<svg class="icone-acao" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/><path d="M12 7v5l3 3"/></svg>`;
  const iconeLixeira = `<img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237101ce' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 6h18'/><path d='M8 6V4h8v2'/><path d='M19 6l-1 14H6L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/></svg>" alt="Excluir" title="Excluir" style="width:18px;height:18px;vertical-align:middle;">`;
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

  function updateBulkBarUsados() {
    if (!bulkBarUsados || !bulkInfoUsados) return;
    const total = selecionadosUsados.size;
    bulkInfoUsados.textContent = `${total} selecionado(s)`;
    bulkBarUsados.classList.toggle("hidden", total === 0 || tipoUsuario !== "admin");
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
      bulk_update: "Edicao em massa",
      update_responsavel: "Responsavel alterado",
      update_empresa: "Empresa alterada",
      update_operadora: "Operadora alterada",
      reativar: "Numero reativado",
      reativar_para_livres: "Reativado para livres",
      reativado_de_usados: "Retornado de usados",
      desativar: "Numero desativado",
      update_observacao: "Observacao alterada",
      delete: "Numero excluido",
      delete_all: "Exclusao em massa",
      bulk_delete: "Exclusao de selecionados",
      bulk_import: "Importacao em lote"
    };

    return mapa[action] || (action || "Alteracao");
  }

  function classeHistorico(action) {
    if ((action || "").includes("delete")) return "danger";
    if ((action || "").includes("import")) return "success";
    if ((action || "").includes("desativar")) return "danger";
    if ((action || "").includes("reativar")) return "success";
    if ((action || "").includes("update") || (action || "").includes("bulk")) return "info";
    return "default";
  }

  async function carregarHistoricoUsado(numeroItem) {
    if (!window.appDb) return [];
    if (!historicoCache) {
      try {
        historicoCache = await window.appDb.list("audit_logs", { order: "created_at.desc" });
      } catch (error) {
        console.error(error);
        historicoCache = [];
      }
    }

    const numeroLimpo = AppUtils.cleanNumber(numeroItem?.number);
    return historicoCache.filter((registro) => {
      const detalhes = AppUtils.parseAuditDetails(registro.details);
      const entityId = String(registro.entity_id || "");
      const detailsTexto = typeof registro.details === "string" ? registro.details : "";

      return (
        registro.entity_type === "usados" &&
        (
          entityId === String(numeroItem?.id || "") ||
          detailsTexto.includes(numeroLimpo) ||
          detalhes.some((detail) => detalheCombinaComNumero(detail, numeroLimpo))
        )
      );
    });
  }

  function renderHistoricoUsado(registros) {
    if (!historicoUsadoLista) return;
    if (!registros.length) {
      historicoUsadoLista.innerHTML = `<div class="history-item">Nenhum historico encontrado para este numero.</div>`;
      return;
    }

    historicoUsadoLista.innerHTML = registros.map((item) => {
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

  function fromDbUsado(row) {
    return {
      id: row.id,
      ddd: row.ddd || "",
      cidade: row.cidade || "",
      operadora: row.operadora || "",
      number: row.number || "",
      responsavel: row.responsavel || "",
      empresa: row.empresa || "",
      ativo: row.ativo || "ativado",
      observacao: row.observacao || "",
      dataAlteracao: row.data_alteracao || ""
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

  async function carregarUsados() {
    try {
      const [dadosUsados, dadosEmpresas] = await Promise.all([
        window.appDb.list("usados", { order: "id.asc" }),
        window.appDb.list("empresas", { order: "id.asc" })
      ]);

      usados = dadosUsados.map(fromDbUsado);
      empresasConhecidas = dadosEmpresas.map((item) => ({
        id: item.id,
        ddd: item.ddd || "",
        cidade: item.cidade || "",
        operadora: item.operadora || "",
        number: item.number || ""
      }));
      listaAtual = usados;
      render(usados);
      atualizarContador();
      atualizarPaginacao(usados);
    } catch (error) {
      console.error(error);
      AppUtils.toast("Nao foi possivel carregar os numeros usados.", "error");
    }
  }

  function numeroExiste(numero, ignoreId = null) {
    const alvo = AppUtils.cleanNumber(numero);
    return [...usados, ...empresasConhecidas].some((item) => {
      if (ignoreId !== null && item.id === ignoreId) return false;
      return AppUtils.cleanNumber(item.number) === alvo;
    });
  }

  function sanitizarUsado(payload) {
    return {
      ddd: AppUtils.cleanNumber(payload.ddd).slice(0, 2),
      cidade: AppUtils.normalizeCity(payload.cidade),
      operadora: AppUtils.normalizeOperator(payload.operadora),
      number: AppUtils.cleanNumber(payload.number),
      responsavel: (payload.responsavel || "").trim(),
      empresa: (payload.empresa || "").trim(),
      ativo: payload.ativo || "ativado",
      observacao: payload.observacao || "",
      dataAlteracao: payload.dataAlteracao || new Date().toLocaleString("pt-BR")
    };
  }

  function escolherOperadoraMaisComum(registros) {
    const contagem = {};

    registros.forEach((registro) => {
      const operadora = AppUtils.normalizeOperator(registro.operadora);
      if (!operadora) return;
      contagem[operadora] = (contagem[operadora] || 0) + 1;
    });

    const ordenadas = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
    if (ordenadas.length === 0) return "";
    if (ordenadas.length > 1 && ordenadas[0][1] === ordenadas[1][1]) return "";
    return ordenadas[0][0];
  }

  function inferirOperadora(numero, dddImportado) {
    const numeroLimpo = AppUtils.cleanNumber(numero);
    if (!numeroLimpo) return "";

    const ddd = (dddImportado || numeroLimpo.substring(0, 2) || "").trim();
    const baseConhecida = [...empresasConhecidas, ...usados]
      .filter((item) => item.operadora && item.number)
      .map((item) => ({
        operadora: AppUtils.normalizeOperator(item.operadora),
        numero: AppUtils.cleanNumber(item.number),
        ddd: (item.ddd || AppUtils.cleanNumber(item.number).substring(0, 2) || "").trim()
      }))
      .filter((item) => item.operadora && item.numero);

    const matchExato = baseConhecida.find((item) => item.numero === numeroLimpo);
    if (matchExato) return matchExato.operadora;

    const prefixoBloco = numeroLimpo.substring(0, 6);
    const mesmoBloco = baseConhecida.filter((item) => item.ddd === ddd && item.numero.substring(0, 6) === prefixoBloco);
    const operadoraMesmoBloco = escolherOperadoraMaisComum(mesmoBloco);
    if (operadoraMesmoBloco) return operadoraMesmoBloco;

    const prefixoCurto = numeroLimpo.substring(0, 5);
    const mesmoPrefixo = baseConhecida.filter((item) => item.ddd === ddd && item.numero.substring(0, 5) === prefixoCurto);
    const operadoraMesmoPrefixo = escolherOperadoraMaisComum(mesmoPrefixo);
    if (operadoraMesmoPrefixo) return operadoraMesmoPrefixo;

    const mesmoDdd = baseConhecida.filter((item) => item.ddd === ddd);
    const operadoraMesmoDdd = escolherOperadoraMaisComum(mesmoDdd);
    if (mesmoDdd.length >= 3 && operadoraMesmoDdd) return operadoraMesmoDdd;

    return "";
  }

  fecharModal(modalObservacao);
  fecharModal(modalVisualizarObservacao);
  fecharModal(modalHistoricoUsado);
  if (btnExcluirTodosUsados) btnExcluirTodosUsados.style.display = isAdmin ? "" : "none";
  if (selecionarTodosUsados) selecionarTodosUsados.style.display = isAdmin ? "" : "none";
  updateBulkBarUsados();
  if (docUserUsados) {
    docUserUsados.innerHTML = `<strong>${nomeExibicao}</strong><br>${perfilUsuario}`;
  }

  if (menuToggleUsados && sidePanelUsados) {
    menuToggleUsados.addEventListener("click", (event) => {
      event.stopPropagation();
      sidePanelUsados.classList.toggle("hidden");
    });
  }

  if (acoesToggleUsados && acoesMenuUsados) {
    acoesToggleUsados.innerHTML = "\u22EE";
    acoesToggleUsados.addEventListener("click", (event) => {
      event.stopPropagation();
      acoesMenuUsados.classList.toggle("hidden");
    });
  }

  async function salvarRegistro(n, action = "update") {
    const [salvo] = await window.appDb.update("usados", { id: `eq.${n.id}` }, toDbUsado(n));
    const normalizado = fromDbUsado(salvo);

    await AppUtils.logAudit({
      entity_type: "usados",
      entity_id: normalizado.id,
      action,
      details: AppUtils.diffObjects(n, normalizado, ["operadora", "responsavel", "empresa", "ativo", "observacao", "dataAlteracao"])
    });
    historicoCache = null;

    return normalizado;
  }

  async function excluirRegistro(id, item) {
    await window.appDb.remove("usados", { id: `eq.${id}` });
    await AppUtils.logAudit({
      entity_type: "usados",
      entity_id: id,
      action: "delete",
      details: [item]
    });
  }

  async function reativarParaLivres(item) {
    const numeroLimpo = AppUtils.cleanNumber(item.number);
    const jaExisteEmLivres = empresasConhecidas.some((registro) => AppUtils.cleanNumber(registro.number) === numeroLimpo);

    if (jaExisteEmLivres) {
      throw new Error("duplicate_livre");
    }

    const dataAlteracao = new Date().toLocaleString("pt-BR");
    const payloadLivre = {
      ddd: item.ddd || "",
      cidade: item.cidade || "",
      operadora: item.operadora || "",
      number: item.number || "",
      status: "livre",
      responsavel: "",
      empresa: "",
      ativo: "",
      observacao: item.observacao || "",
      dataAlteracao
    };

    const [livreCriado] = await window.appDb.insert("empresas", [toDbEmpresa(payloadLivre)]);
    await window.appDb.remove("usados", { id: `eq.${item.id}` });

    await AppUtils.logAudit({
      entity_type: "usados",
      entity_id: item.id,
      action: "reativar_para_livres",
      details: [{
        number: AppUtils.formatPhone(item.number),
        origem: "usados",
        destino: "livres",
        statusAnterior: item.ativo,
        statusNovo: "livre",
        dataAlteracao
      }]
    });

    await AppUtils.logAudit({
      entity_type: "empresas",
      entity_id: livreCriado.id,
      action: "reativado_de_usados",
      details: [{
        number: AppUtils.formatPhone(item.number),
        origem: "usados",
        destino: "livres",
        statusNovo: "livre",
        dataAlteracao
      }]
    });

    historicoCache = null;
    return livreCriado;
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

  function atualizarContador() {
    let ativado = 0;
    let desativado = 0;

    usados.forEach((n) => {
      if (n.ativo === "ativado") ativado++;
      if (n.ativo === "desativado") desativado++;
    });

    if (countAtivado) countAtivado.innerText = ativado;
    if (countDesativado) countDesativado.innerText = desativado;
  }

  function atualizarPaginacao(lista) {
    const totalPaginas = Math.ceil(lista.length / itensPorPagina) || 1;

    if (paginaInfo) paginaInfo.innerText = `${paginaAtual} de ${totalPaginas}`;
    if (prevPage) prevPage.disabled = paginaAtual === 1;
    if (nextPage) nextPage.disabled = paginaAtual === totalPaginas;
  }

  function paginar(lista) {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return lista.slice(inicio, fim);
  }

  function render(lista) {
    if (!tabela) return;

    tabela.innerHTML = "";
    listaAtual = lista;

    if (lista.length === 0) {
      tabela.innerHTML = `<tr><td colspan="13">Nenhum numero usado</td></tr>`;
      atualizarPaginacao(lista);
      updateBulkBarUsados();
      return;
    }

    const listaPaginada = paginar(lista);
    atualizarPaginacao(lista);

    listaPaginada.forEach((n, i) => {
      const tr = document.createElement("tr");
      const botaoExcluir = tipoUsuario === "admin"
        ? `<button class="del-btn" aria-label="Excluir" title="Excluir">${iconeLixeira}</button>`
        : `<span style="color:#aaa;" title="Bloqueado">Bloqueado</span>`;
      const operadoraCell = tipoUsuario === "admin"
        ? `<select class="operadora-select">
            <option value="">Selecionar</option>
            ${AppUtils.OPERADORAS.map((op) => `<option value="${op}" ${n.operadora === op ? "selected" : ""}>${op}</option>`).join("")}
          </select>`
        : `${n.operadora || "-"}`;
      const statusDisabled = tipoUsuario === "user" && n.ativo === "desativado" ? "disabled" : "";

      tr.innerHTML = `
        <td>${tipoUsuario === "admin" ? `<input type="checkbox" class="selecionar-usado" data-id="${n.id}" ${selecionadosUsados.has(n.id) ? "checked" : ""}>` : ""}</td>
        <td>${String((paginaAtual - 1) * itensPorPagina + i + 1).padStart(3, "0")}</td>
        <td>${n.ddd || ""}</td>
        <td>${n.cidade || "-"}</td>
        <td>${operadoraCell}</td>
        <td class="numero-copiavel" style="cursor:pointer;">${AppUtils.formatPhone(n.number)}</td>
        <td>${n.dataAlteracao || "-"}</td>
        <td>
          <select class="respSelect" ${tipoUsuario === "user" ? "disabled" : ""}>
            <option value="">Selecionar</option>
            <option value="Fabricio" ${n.responsavel === "Fabricio" ? "selected" : ""}>Fabricio</option>
            <option value="Priscila" ${n.responsavel === "Priscila" ? "selected" : ""}>Priscila</option>
          </select>
        </td>
        <td>
          <input class="empInput" value="${n.empresa || ""}" style="background:transparent;border:none;width:90%;" ${tipoUsuario === "user" ? "disabled" : ""}>
        </td>
        <td>
          <select class="status-select" ${statusDisabled}>
            <option value="ativado" ${n.ativo === "ativado" ? "selected" : ""}>Ativado</option>
            <option value="desativado" ${n.ativo === "desativado" ? "selected" : ""}>Desativado</option>
          </select>
        </td>
        <td style="text-align: center; cursor: pointer;">
          <span class="btn-visualizar-obs" data-obs="${n.observacao || ""}" title="Visualizar observacao">${iconeOlho}</span>
        </td>
        <td style="text-align: center; cursor: pointer;">
          <span class="table-action-btn btn-historico-usado" title="Historico">${iconeHistorico}</span>
        </td>
        <td>${botaoExcluir}</td>
      `;

      tr.querySelector(".numero-copiavel").addEventListener("click", () => {
        navigator.clipboard.writeText(n.number);
        AppUtils.toast("Numero copiado.", "success");
      });

      const btnVisualizarObs = tr.querySelector(".btn-visualizar-obs");
      btnVisualizarObs.addEventListener("click", () => {
        numeroEmVisualizacao = n;
        textoObservacao.innerText = n.observacao || "Nenhuma observacao registrada";
        observacaoEditar.value = n.observacao || "";
        modoVisualizacao.style.display = "block";
        modoEdicao.style.display = "none";
        btnEditarObservacao.style.display = tipoUsuario === "admin" ? "inline-block" : "none";
        btnSalvarObservacao.style.display = "none";
        abrirModal(modalVisualizarObservacao);
      });

      const btnHistoricoUsado = tr.querySelector(".btn-historico-usado");
      btnHistoricoUsado.addEventListener("click", async () => {
        historicoUsadoLista.innerHTML = `<div class="history-item">Carregando historico...</div>`;
        abrirModal(modalHistoricoUsado);
        const registros = await carregarHistoricoUsado(n);
        renderHistoricoUsado(registros);
      });

      const respSelect = tr.querySelector(".respSelect");
      respSelect.addEventListener("change", async (e) => {
        const antes = { ...n };
        try {
          n.responsavel = e.target.value;
          n.dataAlteracao = new Date().toLocaleString("pt-BR");
          const salvo = await salvarRegistro(n, "update_responsavel");
          const index = usados.findIndex((item) => item.id === n.id);
          if (index >= 0) usados[index] = salvo;
          AppUtils.toast("Responsavel atualizado.", "success");
        } catch (error) {
          console.error(error);
          n.responsavel = antes.responsavel;
          AppUtils.toast("Nao foi possivel atualizar o responsavel.", "error");
          render(listaAtual);
        }
      });

      const empInput = tr.querySelector(".empInput");
      empInput.addEventListener("change", async (e) => {
        const antes = { ...n };
        try {
          n.empresa = e.target.value.trim();
          n.dataAlteracao = new Date().toLocaleString("pt-BR");
          const salvo = await salvarRegistro(n, "update_empresa");
          const index = usados.findIndex((item) => item.id === n.id);
          if (index >= 0) usados[index] = salvo;
          AppUtils.toast("Empresa atualizada.", "success");
        } catch (error) {
          console.error(error);
          n.empresa = antes.empresa;
          AppUtils.toast("Nao foi possivel atualizar a empresa.", "error");
          render(listaAtual);
        }
      });

      if (tipoUsuario === "admin") {
        const checkbox = tr.querySelector(".selecionar-usado");
        if (checkbox) {
          checkbox.addEventListener("change", (event) => {
            if (event.target.checked) {
              selecionadosUsados.add(n.id);
            } else {
              selecionadosUsados.delete(n.id);
            }
            updateBulkBarUsados();
          });
        }

        const operadoraSelect = tr.querySelector(".operadora-select");
        operadoraSelect.addEventListener("change", async (e) => {
          const antes = { ...n };
          const candidato = sanitizarUsado({ ...n, operadora: e.target.value });
          const erro = AppUtils.validateUsadoPayload(candidato);

          if (erro) {
            AppUtils.toast(erro, "warning");
            render(listaAtual);
            return;
          }

          try {
            n.operadora = candidato.operadora;
            n.dataAlteracao = new Date().toLocaleString("pt-BR");
            const salvo = await salvarRegistro(n, "update_operadora");
            const index = usados.findIndex((item) => item.id === n.id);
            if (index >= 0) usados[index] = salvo;
            await AppUtils.logAudit({
              entity_type: "usados",
              entity_id: n.id,
              action: "update_operadora",
              details: AppUtils.diffObjects(antes, salvo, ["operadora", "dataAlteracao"])
            });
            historicoCache = null;
            AppUtils.toast("Operadora atualizada.", "success");
          } catch (error) {
            console.error(error);
            n.operadora = antes.operadora;
            AppUtils.toast("Nao foi possivel atualizar a operadora.", "error");
            render(listaAtual);
          }
        });
      }

      tr.querySelector(".status-select").addEventListener("change", async (e) => {
        const destino = e.target.value;

        if (tipoUsuario === "user" && destino === "ativado") {
          AppUtils.toast("Usuario comum nao pode reativar numeros.", "warning");
          render(listaAtual);
          return;
        }

        if (destino === "desativado") {
          numeroEmDesativacao = n;
          observacaoInput.value = n.observacao || "";
          abrirModal(modalObservacao);
          return;
        }

        if (n.ativo === "desativado" && destino === "ativado") {
          const confirmado = await AppUtils.confirmDialog({
            title: "Reativar numero",
            message: `Deseja reativar ${AppUtils.formatPhone(n.number)} e devolve-lo para os livres?`,
            confirmText: "Reativar"
          });
          if (!confirmado) {
            render(listaAtual);
            return;
          }

          try {
            await reativarParaLivres(n);
            usados = usados.filter((item) => item.id !== n.id);
            empresasConhecidas.push({
              ddd: n.ddd || "",
              cidade: n.cidade || "",
              operadora: n.operadora || "",
              number: n.number || ""
            });
            selecionadosUsados.delete(n.id);
            atualizarContador();
            render(usados);
            AppUtils.toast("Numero reativado e devolvido para livres.", "success");
          } catch (error) {
            console.error(error);
            if (error.message === "duplicate_livre") {
              AppUtils.toast("Esse numero ja existe na tela de livres.", "warning");
            } else {
              AppUtils.toast("Nao foi possivel reativar este numero.", "error");
            }
            render(listaAtual);
          }
          return;
        }

        try {
          const antes = { ...n };
          n.ativo = "ativado";
          n.dataAlteracao = new Date().toLocaleString("pt-BR");
          const salvo = await salvarRegistro(n, "reativar");
          const index = usados.findIndex((item) => item.id === n.id);
          if (index >= 0) usados[index] = salvo;
          await AppUtils.logAudit({
            entity_type: "usados",
            entity_id: n.id,
            action: "reativar",
            details: AppUtils.diffObjects(antes, salvo, ["ativo", "dataAlteracao"])
          });
          atualizarContador();
          render(usados);
          AppUtils.toast("Numero reativado.", "success");
        } catch (error) {
          console.error(error);
          AppUtils.toast("Nao foi possivel atualizar o status.", "error");
          render(listaAtual);
        }
      });

      if (tipoUsuario === "admin") {
        tr.querySelector(".del-btn").addEventListener("click", async () => {
          const confirmado = await AppUtils.confirmDialog({
            title: "Excluir numero",
            message: `Deseja excluir o numero ${AppUtils.formatPhone(n.number)}?`,
            confirmText: "Excluir",
            danger: true
          });
          if (!confirmado) return;

          try {
            await excluirRegistro(n.id, n);
            usados = usados.filter((num) => num.id !== n.id);
            selecionadosUsados.delete(n.id);
            paginaAtual = 1;
            render(usados);
            atualizarContador();
            AppUtils.toast("Numero excluido.", "success");
          } catch (error) {
            console.error(error);
            AppUtils.toast("Nao foi possivel excluir este numero.", "error");
          }
        });
      }

      tabela.appendChild(tr);
    });

    if (selecionarTodosUsados && tipoUsuario === "admin") {
      const idsPagina = listaPaginada.map((item) => item.id);
      selecionarTodosUsados.checked = idsPagina.length > 0 && idsPagina.every((id) => selecionadosUsados.has(id));
    }
    updateBulkBarUsados();
  }

  if (btnFecharVisualizacao) {
    btnFecharVisualizacao.addEventListener("click", () => {
      fecharModal(modalVisualizarObservacao);
      modoVisualizacao.style.display = "block";
      modoEdicao.style.display = "none";
      btnEditarObservacao.style.display = "none";
      btnSalvarObservacao.style.display = "none";
      numeroEmVisualizacao = null;
    });
  }

  if (btnEditarObservacao) {
    btnEditarObservacao.addEventListener("click", () => {
      modoVisualizacao.style.display = "none";
      modoEdicao.style.display = "block";
      btnEditarObservacao.style.display = "none";
      btnSalvarObservacao.style.display = "inline-block";
    });
  }

  if (btnSalvarObservacao) {
    btnSalvarObservacao.addEventListener("click", async () => {
      if (!numeroEmVisualizacao || tipoUsuario !== "admin") return;

      try {
        const antes = { ...numeroEmVisualizacao };
        numeroEmVisualizacao.observacao = observacaoEditar.value.trim();
        numeroEmVisualizacao.dataAlteracao = new Date().toLocaleString("pt-BR");
        const salvo = await salvarRegistro(numeroEmVisualizacao, "update_observacao");
        const index = usados.findIndex((item) => item.id === numeroEmVisualizacao.id);
        if (index >= 0) usados[index] = salvo;
        numeroEmVisualizacao = salvo;
        await AppUtils.logAudit({
          entity_type: "usados",
          entity_id: salvo.id,
          action: "update_observacao",
          details: AppUtils.diffObjects(antes, salvo, ["observacao", "dataAlteracao"])
        });
        modoVisualizacao.style.display = "block";
        modoEdicao.style.display = "none";
        btnEditarObservacao.style.display = "inline-block";
        btnSalvarObservacao.style.display = "none";
        textoObservacao.innerText = numeroEmVisualizacao.observacao || "Nenhuma observacao registrada";
        AppUtils.toast("Observacao atualizada.", "success");
      } catch (error) {
        console.error(error);
        AppUtils.toast("Nao foi possivel salvar a observacao.", "error");
      }
    });
  }

  if (modalVisualizarObservacao) {
    modalVisualizarObservacao.addEventListener("click", (e) => {
      if (e.target === modalVisualizarObservacao) {
        fecharModal(modalVisualizarObservacao);
        numeroEmVisualizacao = null;
      }
    });
  }

  if (btnFecharHistoricoUsado) {
    btnFecharHistoricoUsado.addEventListener("click", () => fecharModal(modalHistoricoUsado));
  }

  if (modalHistoricoUsado) {
    modalHistoricoUsado.addEventListener("click", (event) => {
      if (event.target === modalHistoricoUsado) fecharModal(modalHistoricoUsado);
    });
  }

  if (btnFecharObservacao) {
    btnFecharObservacao.addEventListener("click", () => {
      fecharModal(modalObservacao);
      formObservacao.reset();
      numeroEmDesativacao = null;
    });
  }

  if (modalObservacao) {
    modalObservacao.addEventListener("click", (e) => {
      if (e.target === modalObservacao) {
        fecharModal(modalObservacao);
        formObservacao.reset();
        numeroEmDesativacao = null;
      }
    });
  }

  if (formObservacao) {
    formObservacao.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!numeroEmDesativacao) return;

      try {
        const antes = { ...numeroEmDesativacao };
        numeroEmDesativacao.observacao = observacaoInput.value.trim();
        numeroEmDesativacao.ativo = "desativado";
        numeroEmDesativacao.dataAlteracao = new Date().toLocaleString("pt-BR");
        const salvo = await salvarRegistro(numeroEmDesativacao, "desativar");
        const index = usados.findIndex((item) => item.id === numeroEmDesativacao.id);
        if (index >= 0) usados[index] = salvo;
        await AppUtils.logAudit({
          entity_type: "usados",
          entity_id: salvo.id,
          action: "desativar",
          details: AppUtils.diffObjects(antes, salvo, ["ativo", "observacao", "dataAlteracao"])
        });
        atualizarContador();
        fecharModal(modalObservacao);
        formObservacao.reset();
        numeroEmDesativacao = null;
        render(usados);
        AppUtils.toast("Numero desativado.", "success");
      } catch (error) {
        console.error(error);
        AppUtils.toast("Nao foi possivel salvar a desativacao.", "error");
      }
    });
  }

  if (prevPage) {
    prevPage.addEventListener("click", () => {
      if (paginaAtual > 1) {
        paginaAtual--;
        render(listaAtual);
      }
    });
  }

  if (nextPage) {
    nextPage.addEventListener("click", () => {
      const totalPaginas = Math.ceil(listaAtual.length / itensPorPagina);
      if (paginaAtual < totalPaginas) {
        paginaAtual++;
        render(listaAtual);
      }
    });
  }

  if (pesquisa) {
    pesquisa.addEventListener("input", () => {
      const q = pesquisa.value.toLowerCase();
      const filtrado = usados.filter((n) =>
        (n.number && AppUtils.formatPhone(n.number).toLowerCase().includes(q)) ||
        (n.ddd && n.ddd.toLowerCase().includes(q)) ||
        (n.cidade && n.cidade.toLowerCase().includes(q)) ||
        (n.operadora && n.operadora.toLowerCase().includes(q)) ||
        (n.responsavel && n.responsavel.toLowerCase().includes(q)) ||
        (n.empresa && n.empresa.toLowerCase().includes(q))
      );

      paginaAtual = 1;
      render(filtrado);
    });
  }

  document.addEventListener("click", (event) => {
    if (acoesMenuUsados && acoesToggleUsados && !acoesMenuUsados.contains(event.target) && event.target !== acoesToggleUsados && !acoesToggleUsados.contains(event.target)) {
      acoesMenuUsados.classList.add("hidden");
    }

    if (sidePanelUsados && menuToggleUsados && !sidePanelUsados.contains(event.target) && event.target !== menuToggleUsados && !menuToggleUsados.contains(event.target)) {
      sidePanelUsados.classList.add("hidden");
    }
  });

  if (operadoraFiltroVisual) {
    operadoraFiltroVisual.addEventListener("change", () => {
      const op = operadoraFiltroVisual.value;
      paginaAtual = 1;
      if (!op || op === "todas") {
        render(usados);
        return;
      }
      render(usados.filter((n) => n.operadora === op));
    });
  }

  if (selecionarTodosUsados) {
    selecionarTodosUsados.addEventListener("change", (event) => {
      if (tipoUsuario !== "admin") return;
      const idsPagina = paginar(listaAtual).map((item) => item.id);
      idsPagina.forEach((id) => {
        if (event.target.checked) {
          selecionadosUsados.add(id);
        } else {
          selecionadosUsados.delete(id);
        }
      });
      render(listaAtual);
    });
  }

  if (btnLimparSelecaoUsados) {
    btnLimparSelecaoUsados.addEventListener("click", () => {
      selecionadosUsados.clear();
      render(listaAtual);
    });
  }

  if (btnAplicarEdicaoUsados) {
    btnAplicarEdicaoUsados.addEventListener("click", async () => {
      if (tipoUsuario !== "admin" || selecionadosUsados.size === 0) return;

      const operadoraDestino = bulkOperadoraUsados ? bulkOperadoraUsados.value : "";
      const statusDestino = bulkStatusUsados ? bulkStatusUsados.value : "";
      if (!operadoraDestino && !statusDestino) {
        AppUtils.toast("Escolha pelo menos uma alteracao em massa.", "warning");
        return;
      }

      const confirmado = await AppUtils.confirmDialog({
        title: "Aplicar edicao em massa",
        message: `Aplicar alteracoes em ${selecionadosUsados.size} numero(s) selecionado(s)?`,
        confirmText: "Aplicar"
      });
      if (!confirmado) return;

      try {
        for (const id of selecionadosUsados) {
          const item = usados.find((registro) => registro.id === id);
          if (!item) continue;
          const antes = { ...item };
          if (operadoraDestino) item.operadora = operadoraDestino;
          if (statusDestino) item.ativo = statusDestino;
          item.dataAlteracao = new Date().toLocaleString("pt-BR");
          const salvo = await salvarRegistro(item, "bulk_update");
          const index = usados.findIndex((registro) => registro.id === id);
          if (index >= 0) usados[index] = salvo;
          await AppUtils.logAudit({
            entity_type: "usados",
            entity_id: salvo.id,
            action: "bulk_update",
            details: AppUtils.diffObjects(antes, salvo, ["operadora", "ativo", "dataAlteracao"])
          });
        }

        if (bulkOperadoraUsados) bulkOperadoraUsados.value = "";
        if (bulkStatusUsados) bulkStatusUsados.value = "";
        selecionadosUsados.clear();
        historicoCache = null;
        render(usados);
        atualizarContador();
        AppUtils.toast("Edicao em massa concluida.", "success");
      } catch (error) {
        console.error(error);
        AppUtils.toast("Nao foi possivel aplicar a edicao em massa.", "error");
      }
    });
  }

  if (btnExcluirSelecionadosUsados) {
    btnExcluirSelecionadosUsados.addEventListener("click", async () => {
      if (tipoUsuario !== "admin" || selecionadosUsados.size === 0) return;
      const confirmado = await AppUtils.confirmDialog({
        title: "Excluir selecionados",
        message: `Deseja excluir ${selecionadosUsados.size} numero(s) selecionado(s)?`,
        confirmText: "Excluir",
        danger: true
      });
      if (!confirmado) return;

      try {
        for (const id of [...selecionadosUsados]) {
          const item = usados.find((registro) => registro.id === id);
          if (!item) continue;
          await excluirRegistro(id, item);
        }

        usados = usados.filter((registro) => !selecionadosUsados.has(registro.id));
        selecionadosUsados.clear();
        historicoCache = null;
        paginaAtual = 1;
        render(usados);
        atualizarContador();
        AppUtils.toast("Selecionados excluidos.", "success");
      } catch (error) {
        console.error(error);
        AppUtils.toast("Nao foi possivel excluir os selecionados.", "error");
      }
    });
  }

  if (btnExcluirTodosUsados) {
    btnExcluirTodosUsados.addEventListener("click", async () => {
      if (tipoUsuario !== "admin") return;
      const confirmado = await AppUtils.confirmDialog({
        title: "Excluir todos os usados",
        message: "Essa acao remove todos os numeros usados. Deseja continuar?",
        confirmText: "Excluir Tudo",
        danger: true
      });
      if (!confirmado) return;

      try {
        await window.appDb.remove("usados", { id: "gt.0" });
        await AppUtils.logAudit({
          entity_type: "usados",
          entity_id: "all",
          action: "delete_all",
          details: [{ total: usados.length }]
        });
        usados = [];
        selecionadosUsados.clear();
        historicoCache = null;
        render(usados);
        atualizarContador();
        AppUtils.toast("Todos os numeros usados foram excluidos.", "success");
      } catch (error) {
        console.error(error);
        AppUtils.toast("Nao foi possivel excluir todos os numeros usados.", "error");
      }
    });
  }

  if (importarPlanilha) {
    importarPlanilha.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) processarArquivo(file);
    });

    if (nomeArquivo) {
      document.addEventListener("change", (e) => {
        if (e.target === importarPlanilha) {
          nomeArquivo.textContent = e.target.files[0]?.name || "";
        }
      });
    }
  }

  if (dropBox) {
    dropBox.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropBox.classList.add("dragover");
    });

    dropBox.addEventListener("dragleave", () => {
      dropBox.classList.remove("dragover");
    });

    dropBox.addEventListener("drop", (e) => {
      e.preventDefault();
      dropBox.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file) processarArquivo(file);
    });
  }

  function processarArquivo(file) {
    if (!file) return;
    if (nomeArquivo) nomeArquivo.textContent = file.name;

    const reader = new FileReader();
    reader.onload = async function(event) {
      const linhas = event.target.result.split("\n");
      const novos = [];
      let importados = 0;
      let duplicados = 0;
      let inferidos = 0;
      let invalidos = 0;

      linhas.slice(1).forEach((linha) => {
        if (!linha.trim()) return;
        const col = linha.split(";");
        if (col.length < 4) {
          invalidos++;
          return;
        }

        const candidato = sanitizarUsado({
          ddd: col[0]?.trim(),
          cidade: col[1]?.trim(),
          operadora: col[2]?.trim(),
          number: col[3]?.trim(),
          responsavel: col[4]?.trim(),
          empresa: col[5]?.trim(),
          ativo: (col[6]?.trim() || "ativado").toLowerCase()
        });

        if (!candidato.operadora) {
          candidato.operadora = inferirOperadora(candidato.number, candidato.ddd);
          if (candidato.operadora) inferidos++;
        }

        const erro = AppUtils.validateUsadoPayload(candidato);
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
          { label: "Inferidos", value: inferidos },
          { label: "Duplicados", value: duplicados },
          { label: "Invalidos", value: invalidos }
        ],
        columns: [
          { key: "ddd", label: "DDD" },
          { key: "cidade", label: "Cidade" },
          { key: "operadora", label: "Operadora" },
          { key: "number", label: "Numero" },
          { key: "responsavel", label: "Responsavel" },
          { key: "ativo", label: "Status" }
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
        if (nomeArquivo) nomeArquivo.textContent = `Importando 0/${novos.length}`;
        const inseridos = await inserirEmLotes("usados", novos, toDbUsado, ({ atual, total, lote, lotes }) => {
          if (nomeArquivo) nomeArquivo.textContent = `Importando ${atual}/${total} (lote ${lote}/${lotes})`;
        });
        usados = [...usados, ...inseridos.map(fromDbUsado)];
        await AppUtils.logAudit({
          entity_type: "usados",
          entity_id: "import",
          action: "bulk_import",
          details: [{ total: inseridos.length, inferidos }]
        });
        historicoCache = null;
        paginaAtual = 1;
        render(usados);
        atualizarContador();
        AppUtils.toast(`Importados: ${importados} | Inferidos: ${inferidos} | Duplicados: ${duplicados} | Invalidos: ${invalidos}`, "success", 4200);
      } catch (error) {
        console.error(error);
        AppUtils.toast("Nao foi possivel importar os numeros para o Supabase.", "error");
      } finally {
        if (nomeArquivo) nomeArquivo.textContent = file.name;
      }
    };

    reader.readAsText(file);
  }

  if (btnExportar) {
    btnExportar.addEventListener("click", () => {
      if (usados.length === 0) {
        AppUtils.toast("Nenhum numero para exportar.", "warning");
        return;
      }

      let csv = "DDD;Cidade;Operadora;Numero;Responsavel;Empresa;Status\n";
      usados.forEach((n) => {
        csv += `${n.ddd || ""};${n.cidade || ""};${n.operadora || ""};${n.number};${n.responsavel || ""};${n.empresa || ""};${n.ativo || ""}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "numeros_usados.csv";
      link.click();
      URL.revokeObjectURL(url);
      AppUtils.toast("Exportacao concluida.", "success");
    });
  }

  const colunas = document.querySelectorAll(".ordenar");
  let ordemAsc = true;

  colunas.forEach((col) => {
    col.addEventListener("click", () => {
      const campo = col.dataset.col;
      usados.sort((a, b) => {
        const valA = a[campo] || "";
        const valB = b[campo] || "";
        if (valA < valB) return ordemAsc ? -1 : 1;
        if (valA > valB) return ordemAsc ? 1 : -1;
        return 0;
      });

      ordemAsc = !ordemAsc;
      paginaAtual = 1;
      render(usados);
    });
  });

  const filtros = document.querySelectorAll(".operadora-btn");
  filtros.forEach((btn) => {
    btn.addEventListener("click", () => {
      const op = btn.dataset.op;
      paginaAtual = 1;
      if (op === "todas") {
        render(usados);
        return;
      }
      render(usados.filter((n) => n.operadora === op));
    });
  });

  carregarUsados();
});


