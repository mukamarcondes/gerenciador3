document.addEventListener("DOMContentLoaded", async () => {
  if (window.AppAuth?.ready) {
    await window.AppAuth.ready;
  }
  let chartStatus = null;
  let chartOperadora = null;
  let chartUsados = null;
  let chartResponsavel = null;
  let chartCidade = null;
  let chartStatusOperadora = null;
  let chartFinanceiroCompetencia = null;
  let chartFinanceiroClientes = null;
  let chartFinanceiroOperadora = null;
  let chartFinanceiroStatus = null;
  let empresasCache = [];
  let usadosCache = [];
  let financeiroCache = [];
  let ultimoDashboard = { empresas: [], usados: [] };
  let ultimoDashboardFiltros = [];
  const FINANCEIRO_LOCAL_KEY = "financeiroLancamentos";

  function mapEmpresa(row) {
    return {
      id: row.id,
      ddd: row.ddd || "",
      cidade: row.cidade || "",
      operadora: row.operadora || "",
      number: row.number || "",
      status: row.status || "livre",
      dataAlteracao: row.data_alteracao || ""
    };
  }

  function mapUsado(row) {
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

  function mapFinanceiro(row) {
    return {
      id: row.id,
      competencia: row.competencia || "",
      cliente: row.cliente || "",
      empresa: row.empresa || "",
      numero: row.numero || "",
      operadora: row.operadora || "",
      valor: Number(row.valor || 0),
      custo: Number(row.custo || 0),
      vencimento: row.vencimento || "",
      status: row.status || "pendente",
      observacao: row.observacao || "",
      atualizadoEm: row.atualizado_em || row.atualizadoEm || ""
    };
  }

  function normalizarTexto(valor) {
    return (valor || "").toString().trim().toLowerCase();
  }

  function normalizarOperadora(operadora) {
    if (!operadora) return null;
    const valor = operadora.trim().toLowerCase();
    if (valor === "tip") return "TIP";
    if (valor === "algar") return "Algar";
    if (valor === "conectel") return "Conectel";
    return operadora.trim();
  }

  function parseDataBR(valor) {
    if (!valor || typeof valor !== "string") return null;
    const match = valor.match(/^(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return null;
    const [, dd, mm, yyyy, hh, min, ss] = match;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss || 0));
  }

  function moedaCurta(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  }

  function normalizarArquivo(valor) {
    return (valor || "geral")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
  }

  function setLoadingDashboard(ativo, texto = "Carregando indicadores do dashboard...") {
    const el = document.getElementById("loadingDashboard");
    if (!el) return;
    el.textContent = texto;
    el.classList.toggle("show", ativo);
  }

  function renderChipsFiltrosDashboard(chips) {
    const container = document.getElementById("chipsFiltrosDashboard");
    if (!container) return;
    container.innerHTML = (chips || []).map((item) => `
      <div class="dashboard-chip">
        <span>${item.label}</span>
        <button type="button" data-remove-filter="${item.id}" aria-label="Remover filtro">x</button>
      </div>
    `).join("");
    container.querySelectorAll("[data-remove-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        const campo = document.getElementById(button.dataset.removeFilter);
        if (campo) campo.value = "";
        aplicarFiltros();
      });
    });
  }

  function exportarCsvDashboard() {
    const linhas = [
      ...ultimoDashboard.empresas.map((item) => ["disponivel", item.ddd || "", item.cidade || "", item.operadora || "", item.number || "", item.status || "", "", item.dataAlteracao || ""]),
      ...ultimoDashboard.usados.map((item) => ["usado", item.ddd || "", item.cidade || "", item.operadora || "", item.number || "", item.responsavel || "", item.empresa || "", item.dataAlteracao || ""])
    ];
    if (!linhas.length) {
      AppUtils.toast("Nao ha dados filtrados para exportar.", "warning");
      return;
    }
    AppUtils.downloadCsv(
      `dashboard-operacional-${new Date().toISOString().slice(0, 10)}.csv`,
      ["tipo_registro", "ddd", "cidade", "operadora", "numero", "status_responsavel", "empresa", "atualizado_em"],
      linhas
    );
    AppUtils.toast("CSV do dashboard exportado.", "success");
  }

  function preencherSelect(select, valores, labelPadrao) {
    if (!select) return;
    const valorAtual = select.value;
    select.innerHTML = `<option value="">${labelPadrao}</option>`;
    [...new Set(valores.filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .forEach((valor) => {
        const option = document.createElement("option");
        option.value = valor;
        option.textContent = valor;
        select.appendChild(option);
      });
    select.value = valorAtual;
  }

  function atualizarOpcoesFiltros() {
    preencherSelect(document.getElementById("filtroOperadora"), [...empresasCache.map((item) => item.operadora), ...usadosCache.map((item) => item.operadora)], "Todas as operadoras");
    preencherSelect(document.getElementById("filtroCidade"), [...empresasCache.map((item) => item.cidade), ...usadosCache.map((item) => item.cidade)], "Todas as cidades");
    preencherSelect(document.getElementById("filtroResponsavel"), usadosCache.map((item) => item.responsavel), "Todos os responsáveis");
    preencherSelect(document.getElementById("filtroEmpresa"), usadosCache.map((item) => item.empresa), "Todas as empresas");
  }

  function preencherSelectCompetenciaFinanceiro() {
    const select = document.getElementById("filtroCompetenciaFinanceiroDashboard");
    if (!select) return;
    const atual = select.value;
    select.innerHTML = `<option value="">Todas as competencias</option>`;
    [...new Set(financeiroCache.map((item) => item.competencia).filter(Boolean))]
      .sort()
      .reverse()
      .forEach((competencia) => {
        const option = document.createElement("option");
        option.value = competencia;
        option.textContent = competencia;
        select.appendChild(option);
      });
    select.value = atual;
  }

  function renderGraficoStatus(livre, reservado, ocupado) {
    const ctx = document.getElementById("graficoStatus")?.getContext("2d");
    if (!ctx) return;
    if (chartStatus) chartStatus.destroy();
    chartStatus = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Livres", "Reservados", "Ocupados"],
        datasets: [{
          data: [livre, reservado, ocupado],
          backgroundColor: ["#93C5FD", "#3B82F6", "#1E3A8A"],
          borderWidth: 2
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
    });
  }

  function renderGraficoOperadora(empresas, usados) {
    const operadoras = {};
    [...empresas, ...usados].forEach((item) => {
      const operadora = normalizarOperadora(item.operadora);
      if (!operadora) return;
      operadoras[operadora] = (operadoras[operadora] || 0) + 1;
    });

    const labels = Object.keys(operadoras);
    const dados = Object.values(operadoras);
    const ctx = document.getElementById("graficoOperadora")?.getContext("2d");
    if (!ctx) return;
    if (chartOperadora) chartOperadora.destroy();
    chartOperadora = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels.length ? labels : ["Sem dados"],
        datasets: [{
          label: "Quantidade",
          data: dados.length ? dados : [0],
          backgroundColor: ["#1E3A8A", "#3B82F6", "#93C5FD"],
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } }
      }
    });
  }

  function renderGraficoUsados(ativado, desativado) {
    const ctx = document.getElementById("graficoUsados")?.getContext("2d");
    if (!ctx) return;
    if (chartUsados) chartUsados.destroy();
    chartUsados = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Ativados", "Desativados"],
        datasets: [{
          data: [ativado, desativado],
          backgroundColor: ["#1E3A8A", "#60A5FA"],
          borderWidth: 2
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
    });
  }

  function renderGraficoResponsavel(usados) {
    const responsaveis = {};
    usados.forEach((u) => {
      if (u.responsavel) responsaveis[u.responsavel] = (responsaveis[u.responsavel] || 0) + 1;
    });
    const labels = Object.keys(responsaveis);
    const dados = Object.values(responsaveis);
    const ctx = document.getElementById("graficoResponsavel")?.getContext("2d");
    if (!ctx) return;
    if (chartResponsavel) chartResponsavel.destroy();
    chartResponsavel = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels.length ? labels : ["Sem dados"],
        datasets: [{
          label: "Números Atribuídos",
          data: dados.length ? dados : [0],
          backgroundColor: "#60A5FA",
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  function renderGraficoCidade(empresas, usados) {
    const cidades = {};
    [...empresas, ...usados].forEach((item) => {
      if (item.cidade) cidades[item.cidade] = (cidades[item.cidade] || 0) + 1;
    });
    const top10 = Object.entries(cidades).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const labels = top10.map((item) => item[0]);
    const dados = top10.map((item) => item[1]);
    const ctx = document.getElementById("graficoCidade")?.getContext("2d");
    if (!ctx) return;
    if (chartCidade) chartCidade.destroy();
    chartCidade = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels.length ? labels : ["Sem dados"],
        datasets: [{
          label: "Quantidade",
          data: dados.length ? dados : [0],
          backgroundColor: "#1E3A8A",
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  function renderGraficoStatusOperadora(empresas, usados) {
    const statusOperadora = {
      TIP: { livre: 0, reservado: 0, ocupado: 0 },
      Algar: { livre: 0, reservado: 0, ocupado: 0 },
      Conectel: { livre: 0, reservado: 0, ocupado: 0 }
    };

    empresas.forEach((emp) => {
      const operadora = normalizarOperadora(emp.operadora);
      if (!operadora || !statusOperadora[operadora]) return;
      if (emp.status === "livre") statusOperadora[operadora].livre++;
      if (emp.status === "reservado") statusOperadora[operadora].reservado++;
      if (emp.status === "ocupado") statusOperadora[operadora].ocupado++;
    });

    usados.forEach((uso) => {
      const operadora = normalizarOperadora(uso.operadora);
      if (!operadora || !statusOperadora[operadora]) return;
      statusOperadora[operadora].ocupado++;
    });

    const ctx = document.getElementById("graficoStatusOperadora")?.getContext("2d");
    if (!ctx) return;
    if (chartStatusOperadora) chartStatusOperadora.destroy();
    chartStatusOperadora = new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(statusOperadora),
        datasets: [
          { label: "Livres", data: Object.values(statusOperadora).map((s) => s.livre), backgroundColor: "#1E3A8A", borderWidth: 1 },
          { label: "Reservados", data: Object.values(statusOperadora).map((s) => s.reservado), backgroundColor: "#3B82F6", borderWidth: 1 },
          { label: "Ocupados", data: Object.values(statusOperadora).map((s) => s.ocupado), backgroundColor: "#93C5FD", borderWidth: 1 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
        scales: { y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }, x: { stacked: true } }
      }
    });
  }

  function renderGraficoFinanceiroCompetencia(lista) {
    const ctx = document.getElementById("graficoFinanceiroCompetencia")?.getContext("2d");
    if (!ctx) return;
    if (chartFinanceiroCompetencia) chartFinanceiroCompetencia.destroy();

    const mapa = {};
    lista.forEach((item) => {
      const chave = item.competencia || "Sem competencia";
      if (!mapa[chave]) mapa[chave] = { receita: 0, custo: 0, margem: 0 };
      mapa[chave].receita += Number(item.valor || 0);
      mapa[chave].custo += Number(item.custo || 0);
      mapa[chave].margem += Number(item.valor || 0) - Number(item.custo || 0);
    });

    const labels = Object.keys(mapa);
    chartFinanceiroCompetencia = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels.length ? labels : ["Sem dados"],
        datasets: [
          { label: "Receita", data: labels.length ? labels.map((l) => mapa[l].receita) : [0], backgroundColor: "#1E3A8A" },
          { label: "Custo", data: labels.length ? labels.map((l) => mapa[l].custo) : [0], backgroundColor: "#60A5FA" },
          { label: "Margem", data: labels.length ? labels.map((l) => mapa[l].margem) : [0], backgroundColor: "#93C5FD" }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
    });
  }

  function renderGraficoFinanceiroClientes(lista) {
    const ctx = document.getElementById("graficoFinanceiroClientes")?.getContext("2d");
    if (!ctx) return;
    if (chartFinanceiroClientes) chartFinanceiroClientes.destroy();

    const clientes = {};
    lista.forEach((item) => {
      const chave = item.cliente || "Nao informado";
      clientes[chave] = (clientes[chave] || 0) + Number(item.valor || 0);
    });

    const top = Object.entries(clientes).sort((a, b) => b[1] - a[1]).slice(0, 8);
    chartFinanceiroClientes = new Chart(ctx, {
      type: "bar",
      data: {
        labels: top.length ? top.map((item) => item[0]) : ["Sem dados"],
        datasets: [{
          label: "Receita",
          data: top.length ? top.map((item) => item[1]) : [0],
          backgroundColor: "#3B82F6"
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  function renderGraficoFinanceiroOperadora(lista) {
    const ctx = document.getElementById("graficoFinanceiroOperadora")?.getContext("2d");
    if (!ctx) return;
    if (chartFinanceiroOperadora) chartFinanceiroOperadora.destroy();

    const operadoras = {};
    lista.forEach((item) => {
      const chave = normalizarOperadora(item.operadora) || "Nao informada";
      operadoras[chave] = (operadoras[chave] || 0) + Number(item.custo || 0);
    });

    const labels = Object.keys(operadoras);
    chartFinanceiroOperadora = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels.length ? labels : ["Sem dados"],
        datasets: [{
          data: labels.length ? labels.map((label) => operadoras[label]) : [0],
          backgroundColor: ["#1E3A8A", "#3B82F6", "#93C5FD", "#60A5FA"]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
    });
  }

  function renderGraficoFinanceiroStatus(lista) {
    const ctx = document.getElementById("graficoFinanceiroStatus")?.getContext("2d");
    if (!ctx) return;
    if (chartFinanceiroStatus) chartFinanceiroStatus.destroy();

    const contagem = { pago: 0, pendente: 0, atrasado: 0 };
    lista.forEach((item) => {
      if (contagem[item.status] !== undefined) contagem[item.status]++;
    });

    chartFinanceiroStatus = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Pago", "Pendente", "Atrasado"],
        datasets: [{
          data: [contagem.pago, contagem.pendente, contagem.atrasado],
          backgroundColor: ["#1D4ED8", "#60A5FA", "#1E3A8A"]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
    });
  }

  function renderAlertasFinanceiros(lista) {
    const container = document.getElementById("financeiroAlertasDashboard");
    if (!container) return;

    const alertas = [];
    const margensNegativas = lista.filter((item) => Number(item.valor || 0) - Number(item.custo || 0) < 0);
    if (margensNegativas.length) {
      alertas.push({
        titulo: "Margem negativa encontrada",
        texto: `${margensNegativas.length} lancamento(s) estao com custo maior que a receita neste recorte.`
      });
    }

    const atrasados = lista.filter((item) => item.status === "atrasado");
    if (atrasados.length) {
      alertas.push({
        titulo: "Lancamentos atrasados",
        texto: `${atrasados.length} lancamento(s) estao marcados como atrasado.`
      });
    }

    const clienteTop = Object.entries(lista.reduce((acc, item) => {
      const chave = item.cliente || "Nao informado";
      acc[chave] = (acc[chave] || 0) + Number(item.valor || 0);
      return acc;
    }, {})).sort((a, b) => b[1] - a[1])[0];

    if (clienteTop) {
      const totalReceita = lista.reduce((acc, item) => acc + Number(item.valor || 0), 0);
      const percentual = totalReceita ? Math.round((clienteTop[1] / totalReceita) * 100) : 0;
      if (percentual >= 45) {
        alertas.push({
          titulo: "Concentracao de receita",
          texto: `${clienteTop[0]} representa ${percentual}% da receita deste recorte.`
        });
      }
    }

    if (!alertas.length) {
      container.innerHTML = `<div class="financeiro-alerta-item"><strong>Sem alertas financeiros</strong><span>O recorte atual nao apresentou sinais criticos.</span></div>`;
      return;
    }

    container.innerHTML = alertas.map((alerta) => `
      <div class="financeiro-alerta-item">
        <strong>${alerta.titulo}</strong>
        <span>${alerta.texto}</span>
      </div>
    `).join("");
  }

  function atualizarDashboardFinanceiro(lista) {
    const receita = lista.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const custo = lista.reduce((acc, item) => acc + Number(item.custo || 0), 0);
    const margem = receita - custo;
    const pendentes = lista.filter((item) => item.status === "pendente" || item.status === "atrasado").length;

    const set = (id, valor) => {
      const el = document.getElementById(id);
      if (el) el.textContent = valor;
    };

    set("financeiroReceitaDashboard", moedaCurta(receita));
    set("financeiroCustoDashboard", moedaCurta(custo));
    set("financeiroMargemDashboard", moedaCurta(margem));
    set("financeiroPendentesDashboard", pendentes);

    renderGraficoFinanceiroCompetencia(lista);
    renderGraficoFinanceiroClientes(lista);
    renderGraficoFinanceiroOperadora(lista);
    renderGraficoFinanceiroStatus(lista);
    renderAlertasFinanceiros(lista);
  }

  function atualizarDashboard(empresas, usados) {
    ultimoDashboard = { empresas: [...empresas], usados: [...usados] };
    let livre = 0;
    let reservado = 0;
    let ocupado = 0;

    empresas.forEach((emp) => {
      if (emp.status === "livre") livre++;
      if (emp.status === "reservado") reservado++;
      if (emp.status === "ocupado") ocupado++;
    });

    const totalUsados = usados.length;
    let ativado = 0;
    let desativado = 0;

    usados.forEach((u) => {
      if (u.ativo === "ativado") ativado++;
      if (u.ativo === "desativado") desativado++;
    });

    document.getElementById("countLivre").textContent = livre;
    document.getElementById("countReservado").textContent = reservado;
    document.getElementById("countOcupado").textContent = ocupado + totalUsados;
    document.getElementById("countTotal").textContent = empresas.length + usados.length;

    renderGraficoStatus(livre, reservado, ocupado + totalUsados);
    renderGraficoOperadora(empresas, usados);
    renderGraficoUsados(ativado, desativado);
    renderGraficoResponsavel(usados);
    renderGraficoCidade(empresas, usados);
    renderGraficoStatusOperadora(empresas, usados);
  }

  function aplicarFiltros() {
    const filtroOperadora = normalizarTexto(document.getElementById("filtroOperadora")?.value);
    const filtroCidade = normalizarTexto(document.getElementById("filtroCidade")?.value);
    const filtroResponsavel = normalizarTexto(document.getElementById("filtroResponsavel")?.value);
    const filtroEmpresa = normalizarTexto(document.getElementById("filtroEmpresa")?.value);
    const filtroPeriodo = document.getElementById("filtroPeriodo")?.value || "";
    const filtroBusca = normalizarTexto(document.getElementById("filtroBusca")?.value);
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

    function dentroDoPeriodo(dataTexto) {
      if (!filtroPeriodo) return true;
      const data = parseDataBR(dataTexto);
      if (!data) return false;
      if (filtroPeriodo === "hoje") return data >= inicioHoje;
      const dias = Number(filtroPeriodo);
      if (Number.isNaN(dias)) return true;
      return ((agora - data) / (1000 * 60 * 60 * 24)) <= dias;
    }

    function combinaBusca(item) {
      if (!filtroBusca) return true;
      return [item.number, item.cidade, item.operadora, item.responsavel, item.empresa, item.observacao, item.status, item.ativo]
        .some((campo) => normalizarTexto(campo).includes(filtroBusca));
    }

    const empresas = empresasCache.filter((item) => {
      if (filtroOperadora && normalizarTexto(item.operadora) !== filtroOperadora) return false;
      if (filtroCidade && normalizarTexto(item.cidade) !== filtroCidade) return false;
      if (!dentroDoPeriodo(item.dataAlteracao)) return false;
      return combinaBusca(item);
    });

    const usados = usadosCache.filter((item) => {
      if (filtroOperadora && normalizarTexto(item.operadora) !== filtroOperadora) return false;
      if (filtroCidade && normalizarTexto(item.cidade) !== filtroCidade) return false;
      if (filtroResponsavel && normalizarTexto(item.responsavel) !== filtroResponsavel) return false;
      if (filtroEmpresa && normalizarTexto(item.empresa) !== filtroEmpresa) return false;
      if (!dentroDoPeriodo(item.dataAlteracao)) return false;
      return combinaBusca(item);
    });

    const ativos = [
      filtroOperadora && `Operadora: ${document.getElementById("filtroOperadora").value}`,
      filtroCidade && `Cidade: ${document.getElementById("filtroCidade").value}`,
      filtroResponsavel && `Responsável: ${document.getElementById("filtroResponsavel").value}`,
      filtroEmpresa && `Empresa: ${document.getElementById("filtroEmpresa").value}`,
      filtroPeriodo && `Período: ${document.getElementById("filtroPeriodo").selectedOptions[0].textContent}`,
      filtroBusca && `Busca: ${document.getElementById("filtroBusca").value}`
    ].filter(Boolean);

    const resumo = document.getElementById("resumoFiltrosDashboard");
    if (resumo) {
      resumo.textContent = ativos.length ? `Filtros ativos: ${ativos.join(" | ")}` : "Sem filtros aplicados";
    }

    atualizarDashboard(empresas, usados);
  }

  function aplicarFiltrosFinanceiros() {
    const competencia = document.getElementById("filtroCompetenciaFinanceiroDashboard")?.value || "";
    const status = normalizarTexto(document.getElementById("filtroStatusFinanceiroDashboard")?.value);
    const busca = normalizarTexto(document.getElementById("filtroBuscaFinanceiroDashboard")?.value);

    const lista = financeiroCache.filter((item) => {
      if (competencia && item.competencia !== competencia) return false;
      if (status && normalizarTexto(item.status) !== status) return false;
      if (!busca) return true;
      return [item.cliente, item.empresa, item.numero, item.operadora, item.observacao]
        .some((campo) => normalizarTexto(campo).includes(busca));
    });

    const ativos = [
      competencia && `Competencia: ${competencia}`,
      status && `Status: ${document.getElementById("filtroStatusFinanceiroDashboard").value}`,
      busca && `Busca: ${document.getElementById("filtroBuscaFinanceiroDashboard").value}`
    ].filter(Boolean);

    const resumo = document.getElementById("resumoFiltrosFinanceiroDashboard");
    if (resumo) {
      resumo.textContent = ativos.length ? `Filtros financeiros: ${ativos.join(" | ")}` : "Sem filtros financeiros aplicados";
    }

    atualizarDashboardFinanceiro(lista);
  }

  function exportarRelatorio() {
    const filtros = document.getElementById("resumoFiltrosDashboard")?.textContent || "Sem filtros aplicados";
    const totalCidades = new Set([...ultimoDashboard.empresas, ...ultimoDashboard.usados].map((item) => item.cidade).filter(Boolean)).size;
    const totalOperadoras = new Set([...ultimoDashboard.empresas, ...ultimoDashboard.usados].map((item) => item.operadora).filter(Boolean)).size;
    const totalResponsaveis = new Set(ultimoDashboard.usados.map((item) => item.responsavel).filter(Boolean)).size;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatorio do Dashboard</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 0; padding: 32px; color: #1f2937; background: #ffffff; }
    h1 { margin: 0 0 8px; color: #2563eb; }
    .meta { color: #4b5563; margin-bottom: 20px; }
    .cards { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 16px; margin: 24px 0; }
    .card { border: 1px solid #dbe4f0; border-radius: 18px; padding: 18px; }
    .valor { font-size: 32px; font-weight: 700; color: #1d4ed8; margin-bottom: 6px; }
    .label { font-size: 15px; color: #374151; }
    .bloco { margin-top: 18px; padding: 16px; border-radius: 14px; background: #f8fafc; border: 1px solid #e5e7eb; }
    ul { margin: 8px 0 0; padding-left: 18px; }
  </style>
</head>
<body>
  <h1>Relatorio do Dashboard</h1>
  <div class="meta">Gerado em ${new Date().toLocaleString("pt-BR")}</div>
  <div class="cards">
    <div class="card"><div class="valor">${document.getElementById("countLivre")?.textContent || "0"}</div><div class="label">Números Livres</div></div>
    <div class="card"><div class="valor">${document.getElementById("countReservado")?.textContent || "0"}</div><div class="label">Números Reservados</div></div>
    <div class="card"><div class="valor">${document.getElementById("countOcupado")?.textContent || "0"}</div><div class="label">Números Ocupados</div></div>
    <div class="card"><div class="valor">${document.getElementById("countTotal")?.textContent || "0"}</div><div class="label">Total de Números</div></div>
  </div>
  <div class="bloco"><strong>Filtros aplicados:</strong><br>${filtros}</div>
  <div class="bloco">
    <strong>Resumo da visão atual</strong>
    <ul>
      <li>${ultimoDashboard.empresas.length} registros em disponíveis considerados na análise</li>
      <li>${ultimoDashboard.usados.length} registros em usados considerados na análise</li>
      <li>${totalCidades} cidade(s) no recorte atual</li>
      <li>${totalOperadoras} operadora(s) no recorte atual</li>
      <li>${totalResponsaveis} responsável(is) no recorte atual</li>
    </ul>
  </div>
</body>
</html>`;

    const janela = window.open("", "_blank", "width=960,height=720");
    if (!janela) return;
    janela.document.open();
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    setTimeout(() => {
      janela.print();
    }, 300);
  }

  async function exportarRelatorioApresentacao() {
    const pdf = window.ReportPdf;
    if (!pdf) {
      window.alert("Nao foi possivel carregar a biblioteca de PDF.");
      return;
    }

    const filtros = document.getElementById("resumoFiltrosDashboard")?.textContent || "Sem filtros aplicados";
    const totalCidades = new Set([...ultimoDashboard.empresas, ...ultimoDashboard.usados].map((item) => item.cidade).filter(Boolean)).size;
    const totalOperadoras = new Set([...ultimoDashboard.empresas, ...ultimoDashboard.usados].map((item) => item.operadora).filter(Boolean)).size;
    const totalResponsaveis = new Set(ultimoDashboard.usados.map((item) => item.responsavel).filter(Boolean)).size;
    const generatedAt = new Date().toLocaleString("pt-BR");
    const doc = pdf.createDoc();
    const config = {
      title: "Relatorio do Dashboard",
      subtitle: "Resumo operacional para apresentacao",
      generatedAt,
      logoDataUrl: await pdf.loadLogo()
    };

    let y = pdf.getContentStartY();
    y = pdf.infoStrip(doc, [filtros], y);

    [
      ["Numeros Livres", document.getElementById("countLivre")?.textContent || "0"],
      ["Numeros Reservados", document.getElementById("countReservado")?.textContent || "0"],
      ["Numeros Ocupados", document.getElementById("countOcupado")?.textContent || "0"],
      ["Total de Numeros", document.getElementById("countTotal")?.textContent || "0"]
    ].forEach(([titulo, valor], index) => {
      pdf.summaryCard(doc, {
        title: titulo,
        value: valor,
        x: 14 + ((index % 3) * 63),
        y: y + (Math.floor(index / 3) * 28),
        width: 56
      });
    });

    y += 64;
    y = pdf.sectionTitle(doc, "Graficos principais", y);
    y = pdf.chartPanel(doc, { title: "Status dos numeros", chart: chartStatus, y, width: 88, height: 58 });
    pdf.chartPanel(doc, { title: "Distribuicao por operadora", chart: chartOperadora, x: 108, y: y - 64, width: 88, height: 58 });
    y += 2;
    y = pdf.chartPanel(doc, { title: "Numeros usados", chart: chartUsados, y, width: 88, height: 58 });
    pdf.chartPanel(doc, { title: "Por responsavel", chart: chartResponsavel, x: 108, y: y - 64, width: 88, height: 58 });

    let y2 = pdf.addPage(doc, config);
    y2 = pdf.sectionTitle(doc, "Cobertura operacional", y2);
    y2 = pdf.chartPanel(doc, { title: "Top cidades", chart: chartCidade, y: y2, height: 70 });
    y2 = pdf.chartPanel(doc, { title: "Status por operadora", chart: chartStatusOperadora, y: y2, height: 70 });

    let y3 = pdf.addPage(doc, config);
    y3 = pdf.sectionTitle(doc, "Resumo da visao atual", y3);
    [
      `${ultimoDashboard.empresas.length} registro(s) em disponiveis considerados na analise.`,
      `${ultimoDashboard.usados.length} registro(s) em usados considerados na analise.`,
      `${totalCidades} cidade(s) no recorte atual.`,
      `${totalOperadoras} operadora(s) no recorte atual.`,
      `${totalResponsaveis} responsavel(is) no recorte atual.`
    ].forEach((texto) => {
      y3 = pdf.noteCard(doc, { title: "Destaque", text: texto, y: y3 });
    });

    pdf.finalizeDoc(doc, config);
    doc.save(`dashboard-operacional-${normalizarArquivo(generatedAt)}.pdf`);
  }

  const aplicarFiltrosOriginal = aplicarFiltros;
  aplicarFiltros = function aplicarFiltrosComChips() {
    aplicarFiltrosOriginal();
    const chips = [
      { id: "filtroOperadora", label: document.getElementById("filtroOperadora")?.value, prefixo: "Operadora" },
      { id: "filtroCidade", label: document.getElementById("filtroCidade")?.value, prefixo: "Cidade" },
      { id: "filtroResponsavel", label: document.getElementById("filtroResponsavel")?.value, prefixo: "Responsavel" },
      { id: "filtroEmpresa", label: document.getElementById("filtroEmpresa")?.value, prefixo: "Empresa" },
      { id: "filtroPeriodo", label: document.getElementById("filtroPeriodo")?.selectedOptions?.[0]?.textContent, prefixo: "Periodo", vazio: "" },
      { id: "filtroBusca", label: document.getElementById("filtroBusca")?.value, prefixo: "Busca" }
    ].filter((item) => item.label && item.label !== item.vazio);
    ultimoDashboardFiltros = chips;
    renderChipsFiltrosDashboard(chips.map((item) => ({ id: item.id, label: `${item.prefixo}: ${item.label}` })));
  };

  async function carregarDados() {
    empresasCache = (await window.appDb.list("empresas", { order: "id.asc" })).map(mapEmpresa);
    usadosCache = (await window.appDb.list("usados", { order: "id.asc" })).map(mapUsado);
    try {
      financeiroCache = (await window.appDb.list("financeiro", { order: "competencia.desc" })).map(mapFinanceiro);
    } catch (error) {
      try {
        financeiroCache = JSON.parse(localStorage.getItem(FINANCEIRO_LOCAL_KEY) || "[]").map(mapFinanceiro);
      } catch (localError) {
        financeiroCache = [];
      }
    }
    atualizarOpcoesFiltros();
    preencherSelectCompetenciaFinanceiro();
    aplicarFiltros();
    aplicarFiltrosFinanceiros();
  }

  const menuToggleDashboard = document.getElementById("menuToggleDashboard");
  const sidePanelDashboard = document.getElementById("sidePanelDashboard");
  const docUserDashboard = document.getElementById("docUserDashboard");
  const btnAplicarFiltrosDashboard = document.getElementById("btnAplicarFiltrosDashboard");
  const btnLimparFiltrosDashboard = document.getElementById("btnLimparFiltrosDashboard");
  const btnRelatorioDashboard = document.getElementById("btnRelatorioDashboard");
  const btnCsvDashboard = document.getElementById("btnCsvDashboard");
  const btnLimparFinanceiroDashboard = document.getElementById("btnLimparFinanceiroDashboard");
  const podeExportarDashboardOperacional = window.AppAuth?.can?.("dashboard_operacional_export") ?? ["admin", "operador_numeros"].includes(window.AppAuth?.getRole?.());

  if (docUserDashboard) {
    const tipoUsuario = window.AppAuth?.getRole?.() || "operador_numeros";
    const usuarioAtual = (window.AppAuth?.getUser?.() || "usuario").toLowerCase();
    const nomeExibicao = window.AppAuth?.getName?.() || (usuarioAtual.charAt(0).toUpperCase() + usuarioAtual.slice(1));
    docUserDashboard.innerHTML = `<strong>${nomeExibicao}</strong><br>${tipoUsuario}`;
  }

  if (menuToggleDashboard && sidePanelDashboard) {
    menuToggleDashboard.addEventListener("click", (event) => {
      event.stopPropagation();
      sidePanelDashboard.classList.toggle("hidden");
    });
  }

  document.addEventListener("click", (event) => {
    if (sidePanelDashboard && menuToggleDashboard && !sidePanelDashboard.contains(event.target) && event.target !== menuToggleDashboard && !menuToggleDashboard.contains(event.target)) {
      sidePanelDashboard.classList.add("hidden");
    }
  });

  if (btnAplicarFiltrosDashboard) {
    btnAplicarFiltrosDashboard.addEventListener("click", aplicarFiltros);
  }

  if (btnLimparFiltrosDashboard) {
    btnLimparFiltrosDashboard.addEventListener("click", () => {
      ["filtroOperadora", "filtroCidade", "filtroResponsavel", "filtroEmpresa", "filtroPeriodo", "filtroBusca"].forEach((id) => {
        const campo = document.getElementById(id);
        if (campo) campo.value = "";
      });
      aplicarFiltros();
    });
  }

  if (btnRelatorioDashboard) {
    btnRelatorioDashboard.addEventListener("click", () => {
      if (!podeExportarDashboardOperacional) {
        AppUtils.toast("Seu perfil nao pode exportar este dashboard.", "warning");
        return;
      }
      exportarRelatorioApresentacao().catch((error) => {
        console.error(error);
        window.alert("Nao foi possivel gerar o PDF.");
      });
    });
  }

  if (btnCsvDashboard) {
    btnCsvDashboard.addEventListener("click", () => {
      if (!podeExportarDashboardOperacional) {
        AppUtils.toast("Seu perfil nao pode exportar este dashboard.", "warning");
        return;
      }
      exportarCsvDashboard();
    });
  }

  ["filtroCompetenciaFinanceiroDashboard", "filtroStatusFinanceiroDashboard", "filtroBuscaFinanceiroDashboard"].forEach((id) => {
    const campo = document.getElementById(id);
    if (!campo) return;
    campo.addEventListener("input", aplicarFiltrosFinanceiros);
    campo.addEventListener("change", aplicarFiltrosFinanceiros);
  });

  if (btnLimparFinanceiroDashboard) {
    btnLimparFinanceiroDashboard.addEventListener("click", () => {
      ["filtroCompetenciaFinanceiroDashboard", "filtroStatusFinanceiroDashboard", "filtroBuscaFinanceiroDashboard"].forEach((id) => {
        const campo = document.getElementById(id);
        if (campo) campo.value = "";
      });
      aplicarFiltrosFinanceiros();
    });
  }

  setLoadingDashboard(true);
  carregarDados().catch((error) => {
    console.error(error);
    AppUtils.toast("Nao foi possivel carregar o dashboard.", "error");
  }).finally(() => {
    setLoadingDashboard(false);
  });
  if (btnCsvDashboard) {
    btnCsvDashboard.disabled = !podeExportarDashboardOperacional;
  }

  if (btnRelatorioDashboard) {
    btnRelatorioDashboard.disabled = !podeExportarDashboardOperacional;
  }
});
