document.addEventListener("DOMContentLoaded", async () => {
  if (window.AppAuth?.ready) {
    await window.AppAuth.ready;
  }
  const STORAGE_KEY = "clientesCadastro";
  const REMOTE_TABLE = "clientes";
  const menuToggle = document.getElementById("menuToggleClientes");
  const sidePanel = document.getElementById("sidePanelClientes");
  const btnSair = document.getElementById("btnSairClientes");
  const docUser = document.getElementById("docUserClientes");
  const btnNovo = document.getElementById("btnNovoCliente");
  const btnImportar = document.getElementById("btnImportarClientes");
  const arquivoImportacao = document.getElementById("arquivoImportacaoClientes");
  const modal = document.getElementById("modalCliente");
  const btnFechar = document.getElementById("btnFecharCliente");
  const form = document.getElementById("clienteForm");
  const table = document.getElementById("clientesTable");
  const filtroStatus = document.getElementById("filtroStatusClientes");
  const pesquisar = document.getElementById("pesquisarClientes");
  const tituloModal = document.getElementById("tituloModalCliente");
  const modalObservacao = document.getElementById("modalObservacaoCliente");
  const btnFecharObservacao = document.getElementById("btnFecharObservacaoCliente");
  const clienteObservacaoMeta = document.getElementById("clienteObservacaoMeta");
  const clienteObservacaoTexto = document.getElementById("clienteObservacaoTexto");
  const modalVinculos = document.getElementById("modalVinculosCliente");
  const btnFecharVinculos = document.getElementById("btnFecharVinculosCliente");
  const clienteVinculosMeta = document.getElementById("clienteVinculosMeta");
  const clienteVinculosResumo = document.getElementById("clienteVinculosResumo");
  const clienteVinculosLancamentos = document.getElementById("clienteVinculosLancamentos");
  const modalHistorico = document.getElementById("modalHistoricoCliente");
  const btnFecharHistorico = document.getElementById("btnFecharHistoricoCliente");
  const clienteHistoricoMeta = document.getElementById("clienteHistoricoMeta");
  const clienteHistoricoLista = document.getElementById("clienteHistoricoLista");

  const tipoUsuario = window.AppAuth?.getRole?.() || localStorage.getItem("tipoUsuario") || "financeiro";
  const usuarioAtual = (window.AppAuth?.getUser?.() || localStorage.getItem("usuarioEmail") || "usuario").toLowerCase();
  const nomeExibicao = window.AppAuth?.getName?.() || (usuarioAtual.charAt(0).toUpperCase() + usuarioAtual.slice(1));
  const podeGerirClientes = window.AppAuth?.can?.("clientes_manage") ?? ["admin", "financeiro"].includes(tipoUsuario);

  let clientes = [];
  let financeirosCache = [];
  let usadosCache = [];
  let historicoCache = null;
  let clientesModo = "remote";
  let avisoFallbackMostrado = false;
  let clienteEmEdicao = null;

  const iconeOlho = `
    <svg class="icone-acao" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12C3.8 7.8 7.4 5.5 12 5.5C16.6 5.5 20.2 7.8 22 12C20.2 16.2 16.6 18.5 12 18.5C7.4 18.5 3.8 16.2 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `;

  function formatarDataHistorico(value) {
    if (!value) return "";
    const data = new Date(value);
    return Number.isNaN(data.getTime()) ? String(value) : data.toLocaleString("pt-BR");
  }

  function abrirModal() {
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  }

  function fecharModal() {
    modal.classList.add("hidden");
    modal.style.display = "none";
    clienteEmEdicao = null;
    form?.reset();
  }

  function abrirObservacao(cliente) {
    if (!cliente || !modalObservacao) return;
    clienteObservacaoMeta.innerHTML = `
      <span>${AppUtils.escapeHtml(cliente.nome || "Sem nome")}</span>
      <span>${AppUtils.escapeHtml(cliente.razaoSocial || cliente.nome || "Sem razao social")}</span>
      <span>${AppUtils.escapeHtml(cliente.status || "ativo")}</span>
    `;
    clienteObservacaoTexto.textContent = cliente.observacao || "Nenhuma observacao registrada.";
    modalObservacao.classList.remove("hidden");
    modalObservacao.style.display = "flex";
  }

  function fecharObservacao() {
    if (!modalObservacao) return;
    modalObservacao.classList.add("hidden");
    modalObservacao.style.display = "none";
  }

  function abrirVinculos(cliente) {
    if (!cliente || !modalVinculos) return;
    const financeiros = financeirosCache.filter((item) => String(item.clienteId || item.cliente_id || "") === String(cliente.id) || item.cliente === cliente.nome);
    const numerosFinanceiro = [...new Set(financeiros.flatMap((item) => ((item.numero || "").split(",").map((numero) => AppUtils.formatPhone(numero)).filter(Boolean))))];
    const usadosCliente = usadosCache.filter((item) => {
      const empresa = (item.empresa || "").trim().toLowerCase();
      const baseNome = (cliente.nome || "").trim().toLowerCase();
      const baseRazao = (cliente.razaoSocial || "").trim().toLowerCase();
      return !!empresa && (empresa === baseNome || empresa === baseRazao);
    });
    const receita = financeiros.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const custo = financeiros.reduce((acc, item) => acc + Number(item.custo || 0), 0);
    const competencias = [...new Set(financeiros.map((item) => item.competencia).filter(Boolean))].sort().reverse();

    clienteVinculosMeta.innerHTML = `
      <span>${AppUtils.escapeHtml(cliente.nome || "Sem nome")}</span>
      <span>${AppUtils.escapeHtml(cliente.razaoSocial || cliente.nome || "Sem razao social")}</span>
      <span>${AppUtils.escapeHtml(cliente.status || "ativo")}</span>
    `;

    clienteVinculosResumo.innerHTML = `
      <div class="home-summary-item"><strong>Lancamentos financeiros:</strong><span>${financeiros.length}</span></div>
      <div class="home-summary-item"><strong>Receita total:</strong><span>${Number(receita).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>
      <div class="home-summary-item"><strong>Margem total:</strong><span>${Number(receita - custo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>
      <div class="home-summary-item"><strong>Competencias:</strong><span>${competencias.length ? competencias.join(", ") : "-"}</span></div>
      <div class="home-summary-item"><strong>Numeros no financeiro:</strong><span>${numerosFinanceiro.length ? numerosFinanceiro.join(", ") : "-"}</span></div>
      <div class="home-summary-item"><strong>Numeros usados vinculados:</strong><span>${usadosCliente.length}</span></div>
    `;

    if (!financeiros.length && !usadosCliente.length) {
      clienteVinculosLancamentos.innerHTML = `<div class="home-activity-empty">Nenhum vinculo financeiro ou operacional encontrado para este cliente.</div>`;
    } else {
      clienteVinculosLancamentos.innerHTML = [
        ...financeiros.slice(0, 6).map((item) => `
          <div class="home-activity-item">
            <strong>${AppUtils.escapeHtml(item.competencia || "Sem competencia")} • ${Number(item.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
            <span>${AppUtils.escapeHtml(item.numero || "-")} • ${AppUtils.escapeHtml(item.status || "-")}</span>
          </div>
        `),
        ...usadosCliente.slice(0, 4).map((item) => `
          <div class="home-activity-item">
            <strong>${AppUtils.escapeHtml(AppUtils.formatPhone(item.number || ""))}</strong>
            <span>${AppUtils.escapeHtml(item.operadora || "-")} • ${AppUtils.escapeHtml(item.ativo || "-")}</span>
          </div>
        `)
      ].join("");
    }

    modalVinculos.classList.remove("hidden");
    modalVinculos.style.display = "flex";
  }

  function fecharVinculos() {
    if (!modalVinculos) return;
    modalVinculos.classList.add("hidden");
    modalVinculos.style.display = "none";
  }

  function formatarDetalheHistorico(detail) {
    if (!detail) return "<div>Sem detalhes adicionais.</div>";

    if (detail.field) {
      return `<div>${AppUtils.escapeHtml(detail.field)}: <strong>${AppUtils.escapeHtml(detail.before || "-")}</strong> para <strong>${AppUtils.escapeHtml(detail.after || "-")}</strong></div>`;
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
      create: "Cliente criado",
      update: "Cadastro atualizado",
      delete: "Cliente excluido"
    };

    return mapa[action] || (action || "Alteracao");
  }

  function classeHistorico(action) {
    if ((action || "").includes("delete")) return "danger";
    if ((action || "").includes("create")) return "success";
    if ((action || "").includes("update")) return "info";
    return "default";
  }

  async function carregarHistoricoCliente(cliente) {
    if (!window.appDb || !cliente?.id) return [];
    if (!historicoCache) {
      try {
        historicoCache = await window.appDb.list("audit_logs", { order: "created_at.desc" });
      } catch (error) {
        console.error(error);
        historicoCache = [];
      }
    }

    return historicoCache.filter((registro) =>
      registro.entity_type === "cliente" &&
      String(registro.entity_id || "") === String(cliente.id)
    );
  }

  function renderHistoricoCliente(registros) {
    if (!clienteHistoricoLista) return;
    if (!registros.length) {
      clienteHistoricoLista.innerHTML = `<div class="history-item">Nenhum historico encontrado para este cliente.</div>`;
      return;
    }

    clienteHistoricoLista.innerHTML = registros.map((item) => {
      const detalhes = AppUtils.parseAuditDetails(item.details);
      const descricao = detalhes.length
        ? detalhes.map((detail) => formatarDetalheHistorico(detail)).join("")
        : "<div>Sem detalhes adicionais.</div>";

      return `
        <div class="history-item ${classeHistorico(item.action)}">
          <div class="history-dot"></div>
          <div class="history-body">
            <strong>${AppUtils.escapeHtml(formatarAcaoHistorico(item.action))}</strong>
            <div class="history-meta">${AppUtils.escapeHtml(item.actor || "local")} | ${AppUtils.escapeHtml(item.actor_role || "user")} | ${AppUtils.escapeHtml(formatarDataHistorico(item.created_at))}</div>
            <div class="history-details">${descricao}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  async function abrirHistorico(cliente) {
    if (!cliente || !modalHistorico) return;
    if (clienteHistoricoMeta) {
      clienteHistoricoMeta.innerHTML = `
        <span>${AppUtils.escapeHtml(cliente.nome || "Sem nome")}</span>
        <span>${AppUtils.escapeHtml(cliente.razaoSocial || cliente.nome || "Sem razao social")}</span>
        <span>${AppUtils.escapeHtml(cliente.status || "ativo")}</span>
      `;
    }
    if (clienteHistoricoLista) {
      clienteHistoricoLista.innerHTML = `<div class="history-item">Carregando historico...</div>`;
    }
    modalHistorico.classList.remove("hidden");
    modalHistorico.style.display = "flex";
    const registros = await carregarHistoricoCliente(cliente);
    renderHistoricoCliente(registros);
  }

  function fecharHistorico() {
    if (!modalHistorico) return;
    modalHistorico.classList.add("hidden");
    modalHistorico.style.display = "none";
  }

  function carregarLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  function salvarLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
  }

  function avisarFallback() {
    if (avisoFallbackMostrado) return;
    avisoFallbackMostrado = true;
    AppUtils.toast("Clientes em modo local. Configure a tabela remoto para sincronizar no Supabase.", "warning", 4200);
  }

  function normalizarCliente(item) {
    return {
      id: item?.id || `cli-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      nome: (item?.nome || "").trim(),
      razaoSocial: (item?.razaoSocial || item?.razao_social || "").trim(),
      documento: (item?.documento || "").trim(),
      contato: (item?.contato || "").trim(),
      email: (item?.email || "").trim(),
      telefone: (item?.telefone || "").trim(),
      cidade: AppUtils.normalizeCity(item?.cidade || ""),
      uf: (item?.uf || "").trim().toUpperCase(),
      status: item?.status === "inativo" ? "inativo" : "ativo",
      observacao: (item?.observacao || "").trim()
    };
  }

  function toDbCliente(item) {
    return {
      nome: item.nome || "",
      razao_social: item.razaoSocial || "",
      documento: item.documento || "",
      contato: item.contato || "",
      email: item.email || "",
      telefone: item.telefone || "",
      cidade: item.cidade || "",
      uf: item.uf || "",
      status: item.status || "ativo",
      observacao: item.observacao || "",
      atualizado_em: new Date().toISOString()
    };
  }

  async function carregarClientes() {
    if (!window.appDb) {
      clientesModo = "local";
      avisarFallback();
      return carregarLocal().map(normalizarCliente);
    }

    try {
      const rows = await window.appDb.list(REMOTE_TABLE, { order: "nome.asc" });
      clientesModo = "remote";
      return rows.map(normalizarCliente);
    } catch (error) {
      console.warn("Clientes remoto indisponivel, usando localStorage.", error);
      clientesModo = "local";
      avisarFallback();
      return carregarLocal().map(normalizarCliente);
    }
  }

  async function salvarCliente(payload) {
    const item = normalizarCliente(payload);

    if (clientesModo === "remote" && window.appDb) {
      try {
        if (clienteEmEdicao?.id) {
          const rows = await window.appDb.update(REMOTE_TABLE, { id: `eq.${clienteEmEdicao.id}` }, toDbCliente(item));
          return rows && rows[0] ? normalizarCliente(rows[0]) : item;
        }
        const [salvo] = await window.appDb.insert(REMOTE_TABLE, toDbCliente(item));
        return normalizarCliente(salvo);
      } catch (error) {
        console.warn("Falha ao salvar cliente remoto, usando localStorage.", error);
        clientesModo = "local";
        avisarFallback();
      }
    }

    if (clienteEmEdicao?.id) {
      clientes = clientes.map((cliente) => String(cliente.id) === String(clienteEmEdicao.id) ? item : cliente);
    } else {
      clientes.unshift(item);
    }
    salvarLocal();
    return item;
  }

  async function excluirCliente(id) {
    if (clientesModo === "remote" && window.appDb) {
      try {
        await window.appDb.remove(REMOTE_TABLE, { id: `eq.${id}` });
        clientes = clientes.filter((cliente) => String(cliente.id) !== String(id));
        return;
      } catch (error) {
        console.warn("Falha ao excluir cliente remoto, usando localStorage.", error);
        clientesModo = "local";
        avisarFallback();
      }
    }

    clientes = clientes.filter((cliente) => String(cliente.id) !== String(id));
    salvarLocal();
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function atualizarResumo(lista) {
    setText("clientesTotal", lista.length);
    setText("clientesAtivos", lista.filter((cliente) => cliente.status === "ativo").length);
    setText("clientesInativos", lista.filter((cliente) => cliente.status === "inativo").length);
    setText("clientesCidades", new Set(lista.map((cliente) => cliente.cidade).filter(Boolean)).size);

    const resumo = document.getElementById("clientesResumo");
    if (!resumo) return;
    if (!lista.length) {
      resumo.innerHTML = `
        <div class="app-empty-state">
          <strong>Sem clientes neste recorte</strong>
          <span>Ajuste os filtros ou cadastre um novo cliente para alimentar o resumo.</span>
        </div>
      `;
      return;
    }

    const topCidade = Object.entries(lista.reduce((acc, cliente) => {
      const chave = cliente.cidade || "Nao informada";
      acc[chave] = (acc[chave] || 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1])[0];

    resumo.innerHTML = `
      <div class="home-summary-item"><strong>Total do recorte:</strong><span>${lista.length}</span></div>
      <div class="home-summary-item"><strong>Com documento:</strong><span>${lista.filter((cliente) => cliente.documento).length}</span></div>
      <div class="home-summary-item"><strong>Com contato:</strong><span>${lista.filter((cliente) => cliente.contato || cliente.telefone || cliente.email).length}</span></div>
      <div class="home-summary-item"><strong>Cidade com mais clientes:</strong><span>${topCidade ? `${topCidade[0]} (${topCidade[1]})` : "-"}</span></div>
      <div class="home-summary-item"><strong>Razao social preenchida:</strong><span>${lista.filter((cliente) => cliente.razaoSocial).length}</span></div>
    `;
  }

  function renderTabela(lista) {
    if (!table) return;
    if (!lista.length) {
      table.innerHTML = `
        <tr>
          <td colspan="11">
            <div class="app-empty-state">
              <strong>Nenhum cliente encontrado</strong>
              <span>Esse recorte nao retornou resultados. Revise os filtros ou cadastre um novo cliente.</span>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    table.innerHTML = lista.map((cliente) => `
      <tr>
        <td>${AppUtils.escapeHtml(cliente.nome || "-")}</td>
        <td>${AppUtils.escapeHtml(cliente.razaoSocial || "-")}</td>
        <td>${AppUtils.escapeHtml(cliente.documento || "-")}</td>
        <td>${AppUtils.escapeHtml(cliente.contato || cliente.telefone || cliente.email || "-")}</td>
        <td>${AppUtils.escapeHtml([cliente.cidade, cliente.uf].filter(Boolean).join(" / ") || "-")}</td>
        <td>${AppUtils.escapeHtml(cliente.status || "ativo")}</td>
        <td style="text-align:center;">
          <button class="table-action-btn btn-visualizar-obs" data-obs-id="${cliente.id}" type="button" title="Visualizar observacao">${iconeOlho}</button>
        </td>
        <td><button class="doc-table-link-btn" data-vinculos-id="${cliente.id}" type="button">Vinculos</button></td>
        <td><button class="doc-table-link-btn" data-historico-id="${cliente.id}" type="button">Historico</button></td>
        <td><button class="doc-table-link-btn" data-edit-id="${cliente.id}" type="button" ${podeGerirClientes ? "" : "disabled"}>Editar</button></td>
        <td><button class="del-btn-financeiro" data-del-id="${cliente.id}" type="button" ${podeGerirClientes ? "" : "disabled"}>Excluir</button></td>
      </tr>
    `).join("");

    table.querySelectorAll("[data-obs-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const cliente = clientes.find((item) => String(item.id) === String(button.dataset.obsId));
        abrirObservacao(cliente);
      });
    });

    table.querySelectorAll("[data-vinculos-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const cliente = clientes.find((item) => String(item.id) === String(button.dataset.vinculosId));
        abrirVinculos(cliente);
      });
    });

    table.querySelectorAll("[data-historico-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const cliente = clientes.find((item) => String(item.id) === String(button.dataset.historicoId));
        await abrirHistorico(cliente);
      });
    });

    table.querySelectorAll("[data-edit-id]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!podeGerirClientes) {
          AppUtils.toast("Seu perfil nao pode editar clientes.", "warning");
          return;
        }
        const cliente = clientes.find((item) => String(item.id) === String(button.dataset.editId));
        if (!cliente || !form) return;
        clienteEmEdicao = cliente;
        if (tituloModal) tituloModal.textContent = "Editar Cliente";
        document.getElementById("clienteNome").value = cliente.nome || "";
        document.getElementById("clienteRazaoSocial").value = cliente.razaoSocial || "";
        document.getElementById("clienteDocumento").value = cliente.documento || "";
        document.getElementById("clienteContato").value = cliente.contato || "";
        document.getElementById("clienteEmail").value = cliente.email || "";
        document.getElementById("clienteTelefone").value = cliente.telefone || "";
        document.getElementById("clienteCidade").value = cliente.cidade || "";
        document.getElementById("clienteUf").value = cliente.uf || "";
        document.getElementById("clienteStatus").value = cliente.status || "ativo";
        document.getElementById("clienteObservacao").value = cliente.observacao || "";
        abrirModal();
      });
    });

    table.querySelectorAll("[data-del-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!podeGerirClientes) {
          AppUtils.toast("Seu perfil nao pode excluir clientes.", "warning");
          return;
        }
        const id = button.dataset.delId;
        const confirmar = await AppUtils.confirmDialog({
          title: "Excluir cliente",
          message: "Deseja excluir este cliente cadastrado?",
          confirmText: "Excluir",
          danger: true
        });
        if (!confirmar) return;
        const anterior = clientes.find((cliente) => String(cliente.id) === String(id));
        await excluirCliente(id);
        if (anterior) {
          await AppUtils.logAudit({
            entity_type: "cliente",
            entity_id: anterior.id,
            action: "delete",
            details: [{ field: "nome", before: anterior.nome, after: "" }]
          });
          historicoCache = null;
        }
        aplicarFiltros();
        AppUtils.toast("Cliente excluido.", "success");
      });
    });
  }

  function aplicarFiltros() {
    const termo = (pesquisar?.value || "").toLowerCase().trim();
    const status = filtroStatus?.value || "";

    const lista = clientes.filter((cliente) => {
      if (status && cliente.status !== status) return false;
      if (!termo) return true;
      return [
        cliente.nome,
        cliente.razaoSocial,
        cliente.documento,
        cliente.contato,
        cliente.email,
        cliente.telefone,
        cliente.cidade,
        cliente.uf,
        cliente.observacao
      ].some((valor) => (valor || "").toString().toLowerCase().includes(termo));
    });

    renderTabela(lista);
    atualizarResumo(lista);
  }

  function validar(cliente) {
    if (!cliente.nome) return "Informe o nome do cliente.";
    if (cliente.email && !cliente.email.includes("@")) return "Informe um email valido.";
    if (cliente.uf && cliente.uf.length !== 2) return "UF deve ter 2 letras.";
    return "";
  }

  function clienteDuplicado(candidato, ignorarId = "") {
    const documento = (candidato.documento || "").trim().toLowerCase();
    const email = (candidato.email || "").trim().toLowerCase();
    const nome = (candidato.nome || "").trim().toLowerCase();
    return clientes.some((cliente) => {
      if (ignorarId && String(cliente.id) === String(ignorarId)) return false;
      const clienteDocumento = (cliente.documento || "").trim().toLowerCase();
      const clienteEmail = (cliente.email || "").trim().toLowerCase();
      const clienteNome = (cliente.nome || "").trim().toLowerCase();
      if (documento && clienteDocumento && documento === clienteDocumento) return true;
      if (email && clienteEmail && email === clienteEmail) return true;
      return !!nome && !!clienteNome && nome === clienteNome;
    });
  }

  function normalizarCabecalhoImportacao(valor) {
    return (valor || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  function mapearCampoImportacao(cabecalho) {
    const mapa = {
      nome: "nome",
      cliente: "nome",
      razaosocial: "razaoSocial",
      razao: "razaoSocial",
      empresa: "razaoSocial",
      documento: "documento",
      cpf: "documento",
      cnpj: "documento",
      contato: "contato",
      responsavel: "contato",
      email: "email",
      telefone: "telefone",
      celular: "telefone",
      cidade: "cidade",
      uf: "uf",
      status: "status",
      observacao: "observacao",
      observacoes: "observacao",
      obs: "observacao"
    };
    return mapa[normalizarCabecalhoImportacao(cabecalho)] || "";
  }

  async function importarClientes(file) {
    if (!file) return;
    if (!podeGerirClientes) {
      AppUtils.toast("Seu perfil nao pode importar clientes.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const conteudo = (event.target?.result || "").replace(/^\uFEFF/, "");
      const linhas = conteudo.split(/\r?\n/).filter((linha) => linha.trim());
      if (linhas.length < 2) {
        AppUtils.toast("O arquivo precisa ter cabecalho e pelo menos uma linha.", "warning");
        return;
      }

      const delimitador = (linhas[0].match(/;/g) || []).length >= (linhas[0].match(/,/g) || []).length ? ";" : ",";
      const cabecalhos = linhas[0].split(delimitador).map((item) => item.trim());
      const campos = cabecalhos.map(mapearCampoImportacao);
      if (!campos.includes("nome")) {
        AppUtils.toast("O arquivo precisa ter a coluna nome.", "warning");
        return;
      }

      const novos = [];
      let duplicados = 0;
      let invalidos = 0;

      linhas.slice(1).forEach((linha) => {
        const colunas = linha.split(delimitador).map((item) => item.trim());
        if (!colunas.some(Boolean)) return;

        const bruto = {};
        campos.forEach((campo, index) => {
          if (!campo) return;
          bruto[campo] = colunas[index] || "";
        });

        const candidato = normalizarCliente({
          nome: bruto.nome,
          razaoSocial: bruto.razaoSocial,
          documento: bruto.documento,
          contato: bruto.contato,
          email: bruto.email,
          telefone: bruto.telefone,
          cidade: bruto.cidade,
          uf: bruto.uf,
          status: (bruto.status || "ativo").toLowerCase(),
          observacao: bruto.observacao
        });

        const erro = validar(candidato);
        if (erro) {
          invalidos++;
          return;
        }

        if (clienteDuplicado(candidato) || novos.some((item) => clienteDuplicado(candidato, item.id) || ((item.documento && candidato.documento && item.documento === candidato.documento) || (item.email && candidato.email && item.email === candidato.email) || item.nome === candidato.nome))) {
          duplicados++;
          return;
        }

        novos.push(candidato);
      });

      if (!novos.length) {
        AppUtils.toast(`Duplicados: ${duplicados} | Invalidos: ${invalidos}`, "warning", 4200);
        return;
      }

      const confirmar = await AppUtils.previewDialog({
        title: "Pre-visualizacao da importacao de clientes",
        summary: [
          { label: "Prontos para importar", value: novos.length },
          { label: "Duplicados", value: duplicados },
          { label: "Invalidos", value: invalidos }
        ],
        columns: [
          { key: "nome", label: "Nome" },
          { key: "razaoSocial", label: "Razao social" },
          { key: "documento", label: "Documento" },
          { key: "contato", label: "Contato" },
          { key: "cidadeUf", label: "Cidade / UF" },
          { key: "status", label: "Status" }
        ],
        rows: novos.slice(0, 8).map((item) => ({
          ...item,
          cidadeUf: [item.cidade, item.uf].filter(Boolean).join(" / ")
        })),
        confirmText: "Importar Agora"
      });

      if (!confirmar) {
        AppUtils.toast("Importacao cancelada.", "info");
        return;
      }

      try {
        if (btnImportar) {
          btnImportar.disabled = true;
          btnImportar.textContent = "Importando...";
        }

        let inseridos = [];
        if (clientesModo === "remote" && window.appDb) {
          inseridos = await window.appDb.insert(REMOTE_TABLE, novos.map(toDbCliente));
          inseridos = inseridos.map(normalizarCliente);
        } else {
          inseridos = novos.map(normalizarCliente);
          clientes = [...inseridos, ...clientes];
          salvarLocal();
        }

        clientes = [...inseridos, ...clientes.filter((cliente) => !inseridos.some((novo) => String(novo.id) === String(cliente.id)))];
        await AppUtils.logAudit({
          entity_type: "cliente",
          entity_id: "import",
          action: "bulk_import",
          details: [{ total: inseridos.length, duplicados, invalidos, arquivo: file.name }]
        });
        historicoCache = null;
        aplicarFiltros();
        AppUtils.toast(`Clientes importados: ${inseridos.length} | Duplicados: ${duplicados} | Invalidos: ${invalidos}`, "success", 4200);
      } catch (error) {
        console.error(error);
        AppUtils.toast("Nao foi possivel importar os clientes.", "error");
      } finally {
        if (btnImportar) {
          btnImportar.disabled = !podeGerirClientes;
          btnImportar.textContent = "Importar clientes";
        }
        if (arquivoImportacao) {
          arquivoImportacao.value = "";
        }
      }
    };

    reader.readAsText(file);
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
      fecharObservacao();
    }
    if (modalVinculos && event.target === modalVinculos) {
      fecharVinculos();
    }
    if (modalHistorico && event.target === modalHistorico) {
      fecharHistorico();
    }
  });

  if (btnNovo) {
    btnNovo.addEventListener("click", () => {
      if (!podeGerirClientes) {
        AppUtils.toast("Seu perfil nao pode criar clientes.", "warning");
        return;
      }
      clienteEmEdicao = null;
      if (tituloModal) tituloModal.textContent = "Novo Cliente";
      form?.reset();
      abrirModal();
    });
  }

  if (btnImportar && arquivoImportacao) {
    btnImportar.addEventListener("click", () => {
      if (!podeGerirClientes) {
        AppUtils.toast("Seu perfil nao pode importar clientes.", "warning");
        return;
      }
      arquivoImportacao.click();
    });

    arquivoImportacao.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      await importarClientes(file);
    });
  }

  if (btnFechar) {
    btnFechar.addEventListener("click", fecharModal);
  }

  if (btnFecharObservacao) {
    btnFecharObservacao.addEventListener("click", fecharObservacao);
  }

  if (btnFecharVinculos) {
    btnFecharVinculos.addEventListener("click", fecharVinculos);
  }

  if (btnFecharHistorico) {
    btnFecharHistorico.addEventListener("click", fecharHistorico);
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!podeGerirClientes) {
        AppUtils.toast("Seu perfil nao pode salvar clientes.", "warning");
        return;
      }
      const payload = normalizarCliente({
        id: clienteEmEdicao?.id,
        nome: document.getElementById("clienteNome").value,
        razaoSocial: document.getElementById("clienteRazaoSocial").value,
        documento: document.getElementById("clienteDocumento").value,
        contato: document.getElementById("clienteContato").value,
        email: document.getElementById("clienteEmail").value,
        telefone: document.getElementById("clienteTelefone").value,
        cidade: document.getElementById("clienteCidade").value,
        uf: document.getElementById("clienteUf").value,
        status: document.getElementById("clienteStatus").value,
        observacao: document.getElementById("clienteObservacao").value
      });

      const erro = validar(payload);
      if (erro) {
        AppUtils.toast(erro, "warning");
        return;
      }

      const salvo = await salvarCliente(payload);
      await AppUtils.logAudit({
        entity_type: "cliente",
        entity_id: salvo.id,
        action: clienteEmEdicao?.id ? "update" : "create",
        details: clienteEmEdicao?.id
          ? AppUtils.diffObjects(clienteEmEdicao, salvo, ["nome", "razaoSocial", "documento", "contato", "email", "telefone", "cidade", "uf", "status", "observacao"])
          : [{ field: "nome", before: "", after: salvo.nome }]
      });
      historicoCache = null;
      if (clienteEmEdicao?.id) {
        clientes = clientes.map((cliente) => String(cliente.id) === String(clienteEmEdicao.id) ? salvo : cliente);
      } else if (clientesModo === "remote") {
        clientes.unshift(salvo);
      }
      aplicarFiltros();
      fecharModal();
      AppUtils.toast("Cliente salvo com sucesso.", "success");
    });
  }

  [filtroStatus, pesquisar].forEach((element) => {
    if (!element) return;
    element.addEventListener("input", aplicarFiltros);
    element.addEventListener("change", aplicarFiltros);
  });

  clientes = await carregarClientes();
  if (btnNovo) btnNovo.disabled = !podeGerirClientes;
  if (btnImportar) btnImportar.disabled = !podeGerirClientes;
  try {
    financeirosCache = await window.appDb.list("financeiro", { order: "competencia.desc" });
  } catch (error) {
    financeirosCache = JSON.parse(localStorage.getItem("financeiroLancamentos") || "[]");
  }
  try {
    usadosCache = await window.appDb.list("usados", { order: "id.asc" });
  } catch (error) {
    usadosCache = [];
  }
  aplicarFiltros();
});


