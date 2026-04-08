document.addEventListener("DOMContentLoaded", async () => {
  if (window.AppAuth?.ready) {
    await window.AppAuth.ready;
  }
  const FINANCEIRO_LOCAL_KEY = "financeiroLancamentos";
  const FECHAMENTOS_KEY = "financeiroCompetenciasFechadas";
  const REMOTE_COMPETENCIA_TABLE = "financeiro_competencias";
  let chartFinanceiroCompetencia = null;
  let chartFinanceiroClientes = null;
  let chartFinanceiroOperadora = null;
  let chartFinanceiroStatus = null;
  let financeiroCache = [];
  let competenciasFechadas = [];
  let ultimoRecorte = [];
  let ultimosChipsFinanceiros = [];

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

  function moedaCurta(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  }

  function percentualDelta(atual, anterior) {
    if (!anterior) return null;
    return ((atual - anterior) / anterior) * 100;
  }

  function montarComparativoCompetencias(lista, competenciaSelecionada) {
    const competencias = [...new Set(financeiroCache.map((item) => item.competencia).filter(Boolean))].sort().reverse();
    const competenciaAtual = competenciaSelecionada || competencias[0] || "";
    const indiceAtual = competencias.indexOf(competenciaAtual);
    const competenciaAnterior = indiceAtual >= 0 ? (competencias[indiceAtual + 1] || "") : (competencias[1] || "");
    const atual = lista.filter((item) => !competenciaAtual || item.competencia === competenciaAtual);
    const anterior = competenciaAnterior
      ? financeiroCache.filter((item) => item.competencia === competenciaAnterior)
      : [];
    const totais = (base) => ({
      receita: base.reduce((acc, item) => acc + Number(item.valor || 0), 0),
      custo: base.reduce((acc, item) => acc + Number(item.custo || 0), 0),
      pendentes: base.filter((item) => item.status === "pendente" || item.status === "atrasado").length
    });
    const atualTotais = totais(atual);
    atualTotais.margem = atualTotais.receita - atualTotais.custo;
    const anteriorTotais = totais(anterior);
    anteriorTotais.margem = anteriorTotais.receita - anteriorTotais.custo;
    const clientesAtual = atual.reduce((acc, item) => {
      const chave = item.cliente || "Nao informado";
      acc[chave] = (acc[chave] || 0) + Number(item.valor || 0);
      return acc;
    }, {});
    const clientesAnterior = anterior.reduce((acc, item) => {
      const chave = item.cliente || "Nao informado";
      acc[chave] = (acc[chave] || 0) + Number(item.valor || 0);
      return acc;
    }, {});
    const variacoesClientes = [...new Set([...Object.keys(clientesAtual), ...Object.keys(clientesAnterior)])]
      .map((cliente) => ({
        cliente,
        atual: clientesAtual[cliente] || 0,
        anterior: clientesAnterior[cliente] || 0,
        delta: (clientesAtual[cliente] || 0) - (clientesAnterior[cliente] || 0)
      }));
    return {
      competenciaAtual,
      competenciaAnterior,
      atual: atualTotais,
      anterior: anteriorTotais,
      deltaReceita: percentualDelta(atualTotais.receita, anteriorTotais.receita),
      deltaMargem: percentualDelta(atualTotais.margem, anteriorTotais.margem),
      deltaPendentes: percentualDelta(atualTotais.pendentes, anteriorTotais.pendentes),
      clienteMaiorAlta: [...variacoesClientes].sort((a, b) => b.delta - a.delta)[0] || null,
      clienteMaiorQueda: [...variacoesClientes].sort((a, b) => a.delta - b.delta)[0] || null
    };
  }

  function textoDelta(delta, sufixo = "") {
    if (delta === null || Number.isNaN(delta)) return "Sem comparativo";
    return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%${sufixo}`;
  }

  function setLoadingFinanceiroDashboard(ativo, texto = "Carregando indicadores financeiros...") {
    const el = document.getElementById("loadingFinanceiroDashboard");
    if (!el) return;
    el.textContent = texto;
    el.classList.toggle("show", ativo);
  }

  function renderChipsFinanceiro(chips) {
    const container = document.getElementById("chipsFiltrosFinanceiroDashboard");
    if (!container) return;
    container.innerHTML = (chips || []).map((item) => `
      <div class="financeiro-chip">
        <span>${item.label}</span>
        <button type="button" data-remove-financeiro-filter="${item.id}" aria-label="Remover filtro">x</button>
      </div>
    `).join("");
    container.querySelectorAll("[data-remove-financeiro-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        const campo = document.getElementById(button.dataset.removeFinanceiroFilter);
        if (campo) campo.value = "";
        aplicarFiltrosFinanceiros();
      });
    });
  }

  function exportarCsvFinanceiroDashboard() {
    if (!ultimoRecorte.length) {
      AppUtils.toast("Nao ha lancamentos filtrados para exportar.", "warning");
      return;
    }
    AppUtils.downloadCsv(
      `dashboard-financeiro-${new Date().toISOString().slice(0, 10)}.csv`,
      ["competencia", "cliente", "empresa", "numero", "operadora", "valor", "custo", "margem", "vencimento", "status", "observacao"],
      ultimoRecorte.map((item) => [
        item.competencia || "",
        item.cliente || "",
        item.empresa || "",
        item.numero || "",
        item.operadora || "",
        Number(item.valor || 0),
        Number(item.custo || 0),
        Number(item.valor || 0) - Number(item.custo || 0),
        item.vencimento || "",
        item.status || "",
        item.observacao || ""
      ])
    );
    AppUtils.toast("CSV financeiro exportado.", "success");
  }

  function renderComparativoFinanceiro(comparativo) {
    const container = document.getElementById("financeiroComparativoDashboard");
    if (!container) return;
    if (!comparativo.competenciaAtual || !comparativo.competenciaAnterior) {
      container.innerHTML = `
        <div class="financeiro-comparativo-card">
          <strong>Comparativo entre competencias</strong>
          <span>Selecione uma competencia com historico anterior para visualizar variacoes de receita, margem e pendencias.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="financeiro-comparativo-card">
        <strong>Receita: ${comparativo.competenciaAtual} x ${comparativo.competenciaAnterior}</strong>
        <span>${moedaCurta(comparativo.atual.receita)} agora, contra ${moedaCurta(comparativo.anterior.receita)} antes. Variacao ${textoDelta(comparativo.deltaReceita)}.</span>
      </div>
      <div class="financeiro-comparativo-card">
        <strong>Margem comparada</strong>
        <span>${moedaCurta(comparativo.atual.margem)} no periodo atual, frente a ${moedaCurta(comparativo.anterior.margem)} na competencia anterior. Variacao ${textoDelta(comparativo.deltaMargem)}.</span>
      </div>
      <div class="financeiro-comparativo-card">
        <strong>Pendencias em aberto</strong>
        <span>${comparativo.atual.pendentes} caso(s) agora versus ${comparativo.anterior.pendentes} antes. Variacao ${textoDelta(comparativo.deltaPendentes)}.</span>
      </div>
      <div class="financeiro-comparativo-card">
        <strong>Cliente com maior alta</strong>
        <span>${comparativo.clienteMaiorAlta ? `${comparativo.clienteMaiorAlta.cliente}: ${moedaCurta(comparativo.clienteMaiorAlta.atual)} agora, variacao de ${moedaCurta(comparativo.clienteMaiorAlta.delta)}.` : "Sem comparativo suficiente."}</span>
      </div>
      <div class="financeiro-comparativo-card">
        <strong>Cliente com maior queda</strong>
        <span>${comparativo.clienteMaiorQueda ? `${comparativo.clienteMaiorQueda.cliente}: ${moedaCurta(comparativo.clienteMaiorQueda.atual)} agora, variacao de ${moedaCurta(comparativo.clienteMaiorQueda.delta)}.` : "Sem comparativo suficiente."}</span>
      </div>
    `;
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

  async function exportarPdf() {
    const pdf = window.ReportPdf;
    if (!pdf) {
      window.alert("Nao foi possivel carregar a biblioteca de PDF.");
      return;
    }

    const doc = pdf.createDoc();
    const competencia = document.getElementById("filtroCompetenciaFinanceiroDashboard")?.value || "Todas";
    const status = document.getElementById("filtroStatusFinanceiroDashboard")?.value || "Todos";
    const busca = document.getElementById("filtroBuscaFinanceiroDashboard")?.value || "Sem busca";
    const alertasItens = Array.from(document.querySelectorAll("#financeiroAlertasDashboard .financeiro-alerta-item"));
    const comparativoItens = Array.from(document.querySelectorAll("#financeiroComparativoDashboard .financeiro-comparativo-card"));

    const config = {
      title: "Dashboard Financeiro",
      subtitle: "Relatorio preparado para apresentacao de desempenho",
      generatedAt: new Date().toLocaleString("pt-BR"),
      logoDataUrl: await pdf.loadLogo()
    };

    let y = pdf.getContentStartY();
    y = pdf.infoStrip(doc, [`Competencia: ${competencia}`, `Status: ${status}`, `Busca: ${busca}`], y);

    [
      ["Receita", document.getElementById("financeiroReceitaDashboard")?.textContent || "R$ 0"],
      ["Custo", document.getElementById("financeiroCustoDashboard")?.textContent || "R$ 0"],
      ["Margem", document.getElementById("financeiroMargemDashboard")?.textContent || "R$ 0"],
      ["Pendentes", document.getElementById("financeiroPendentesDashboard")?.textContent || "0"]
    ].forEach(([titulo, valor], index) => {
      pdf.summaryCard(doc, {
        title: titulo,
        value: valor,
        x: 14 + ((index % 3) * 63),
        y: y + (Math.floor(index / 3) * 28),
        width: 56
      });
    });

    y += 42;
    y = pdf.sectionTitle(doc, "Panorama financeiro", y);
    y = pdf.chartPanel(doc, { title: "Receita x custo por competencia", chart: chartFinanceiroCompetencia, y, height: 64 });

    let y2 = pdf.addPage(doc, config);
    y2 = pdf.sectionTitle(doc, "Analises complementares", y2);
    y2 = pdf.chartPanel(doc, { title: "Top clientes por receita", chart: chartFinanceiroClientes, y: y2, height: 70 });
    y2 = pdf.chartPanel(doc, { title: "Custo por operadora", chart: chartFinanceiroOperadora, y: y2, width: 88, height: 58 });
    pdf.chartPanel(doc, { title: "Status financeiro", chart: chartFinanceiroStatus, x: 108, y: y2 - 64, width: 88, height: 58 });

    let y3 = pdf.addPage(doc, config);
    y3 = pdf.sectionTitle(doc, "Comparativo entre competencias", y3);

    if (comparativoItens.length) {
      comparativoItens.forEach((item) => {
        const titulo = item.querySelector("strong")?.textContent || "";
        const texto = item.querySelector("span")?.textContent || "";
        y3 = pdf.noteCard(doc, { title: titulo, text: texto, y: y3 });
      });
    } else {
      y3 = pdf.paragraph(doc, "Sem comparativo disponivel para o recorte atual.", 14, y3, 182, { size: 9.5, color: pdf.COLORS.muted }) + 4;
    }

    if (y3 > pdf.getContentBottom(doc) - 34) {
      y3 = pdf.addPage(doc, config);
    }

    y3 = pdf.sectionTitle(doc, "Alertas financeiros", y3 + 4);

    if (alertasItens.length) {
      alertasItens.forEach((item) => {
        if (y3 > pdf.getContentBottom(doc) - 24) {
          y3 = pdf.addPage(doc, config);
          y3 = pdf.sectionTitle(doc, "Alertas financeiros", y3);
        }
        const titulo = item.querySelector("strong")?.textContent || "";
        const texto = item.querySelector("span")?.textContent || "";
        y3 = pdf.noteCard(doc, { title: titulo, text: texto, y: y3 });
      });
    } else {
      y3 = pdf.paragraph(doc, "Sem alertas no recorte atual.", 14, y3, 182, { size: 9.5, color: pdf.COLORS.muted }) + 4;
    }

    pdf.finalizeDoc(doc, config);
    doc.save(`dashboard-financeiro-${normalizarArquivo(competencia)}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function normalizarCompetencia(item) {
    return {
      competencia: item?.competencia || "",
      status: item?.status === "fechado" ? "fechado" : "aberto",
      fechadoEm: item?.fechadoEm || item?.fechado_em || "",
      fechadoPor: item?.fechadoPor || item?.fechado_por || ""
    };
  }

  function obterFechamentosLocal() {
    try {
      return JSON.parse(localStorage.getItem(FECHAMENTOS_KEY) || "[]").map(normalizarCompetencia);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async function carregarFechamentos() {
    if (!window.appDb) return obterFechamentosLocal();
    try {
      return (await window.appDb.list(REMOTE_COMPETENCIA_TABLE, { order: "competencia.desc" })).map(normalizarCompetencia);
    } catch (error) {
      console.warn("Nao foi possivel carregar fechamento de competencias no dashboard financeiro.", error);
      return obterFechamentosLocal();
    }
  }

  function atualizarMetaCompetencia(competencia) {
    const el = document.getElementById("financeiroCompetenciaMetaDashboard");
    if (!el) return;
    const referencia = competencia
      || [...new Set(financeiroCache.map((item) => item.competencia).filter(Boolean))].sort().reverse()[0]
      || "";
    if (!referencia) {
      el.textContent = "Sem competencia em foco.";
      return;
    }
    const fechamento = competenciasFechadas.find((item) => item.competencia === referencia && item.status === "fechado");
    if (!fechamento) {
      el.innerHTML = `<span class="financeiro-status-chip aberto">Competencia aberta</span> ${referencia} segue disponivel para acompanhamento financeiro.`;
      return;
    }
    el.innerHTML = `<span class="financeiro-status-chip fechado">Competencia fechada</span> ${referencia}${fechamento.fechadoEm ? ` em ${fechamento.fechadoEm}` : ""}${fechamento.fechadoPor ? ` por ${fechamento.fechadoPor}` : ""}.`;
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

  function renderAlertasFinanceiros(lista, comparativo) {
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

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const atrasosLongos = lista.filter((item) => {
      if (!item.vencimento || item.status === "pago") return false;
      const data = new Date(`${item.vencimento}T00:00:00`);
      return ((hoje - data) / 86400000) > 15;
    });
    if (atrasosLongos.length) {
      alertas.push({
        titulo: "Pagamentos com atraso longo",
        texto: `${atrasosLongos.length} lancamento(s) seguem sem pagamento ha mais de 15 dias.`
      });
    }

    const margensBaixas = lista.filter((item) => {
      const valor = Number(item.valor || 0);
      if (!valor) return false;
      return ((Number(item.valor || 0) - Number(item.custo || 0)) / valor) < 0.1;
    });
    if (margensBaixas.length) {
      alertas.push({
        titulo: "Margem abaixo do limite",
        texto: `${margensBaixas.length} lancamento(s) operam com margem inferior a 10%.`
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

    if (comparativo?.competenciaAnterior && comparativo.deltaReceita !== null && comparativo.deltaReceita <= -15) {
      alertas.push({
        titulo: "Queda relevante de receita",
        texto: `${comparativo.competenciaAtual} recuou ${Math.abs(comparativo.deltaReceita).toFixed(1)}% frente a ${comparativo.competenciaAnterior}.`
      });
    }

    if (comparativo?.competenciaAnterior && comparativo.deltaMargem !== null && comparativo.deltaMargem <= -15) {
      alertas.push({
        titulo: "Margem pressionada",
        texto: `A margem caiu ${Math.abs(comparativo.deltaMargem).toFixed(1)}% em comparacao com ${comparativo.competenciaAnterior}.`
      });
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

  function atualizarDashboardFinanceiro(lista, comparativo) {
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
    renderComparativoFinanceiro(comparativo);
    renderAlertasFinanceiros(lista, comparativo);
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
      competencia && { id: "filtroCompetenciaFinanceiroDashboard", label: `Competencia: ${competencia}` },
      status && { id: "filtroStatusFinanceiroDashboard", label: `Status: ${document.getElementById("filtroStatusFinanceiroDashboard").value}` },
      busca && { id: "filtroBuscaFinanceiroDashboard", label: `Busca: ${document.getElementById("filtroBuscaFinanceiroDashboard").value}` }
    ].filter(Boolean);
    ultimosChipsFinanceiros = ativos;

    const resumo = document.getElementById("resumoFiltrosFinanceiroDashboard");
    if (resumo) {
      resumo.textContent = ativos.length ? `Filtros financeiros: ${ativos.map((item) => item.label).join(" | ")}` : "Sem filtros financeiros aplicados";
    }
    renderChipsFinanceiro(ativos);

    const comparativo = montarComparativoCompetencias(lista, competencia);
    ultimoRecorte = lista;
    atualizarMetaCompetencia(competencia);
    atualizarDashboardFinanceiro(lista, comparativo);
  }

  async function carregarDados() {
    competenciasFechadas = await carregarFechamentos();
    try {
      financeiroCache = (await window.appDb.list("financeiro", { order: "competencia.desc" })).map(mapFinanceiro);
    } catch (error) {
      try {
        financeiroCache = JSON.parse(localStorage.getItem(FINANCEIRO_LOCAL_KEY) || "[]").map(mapFinanceiro);
      } catch (localError) {
        financeiroCache = [];
      }
    }
    preencherSelectCompetenciaFinanceiro();
    aplicarFiltrosFinanceiros();
  }

  const menuToggle = document.getElementById("menuToggleFinanceiroDashboard");
  const sidePanel = document.getElementById("sidePanelFinanceiroDashboard");
  const docUser = document.getElementById("docUserFinanceiroDashboard");
  const btnLimpar = document.getElementById("btnLimparFinanceiroDashboard");
  const btnExportarCsv = document.getElementById("btnCsvFinanceiroDashboard");
  const btnExportarPdf = document.getElementById("btnExportarPdfFinanceiroDashboard");
  const podeExportarDashboardFinanceiro = window.AppAuth?.can?.("financeiro_dashboard_export") ?? ["admin", "financeiro", "diretoria"].includes(window.AppAuth?.getRole?.());

  if (docUser) {
    const tipoUsuario = window.AppAuth?.getRole?.() || "diretoria";
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

  ["filtroCompetenciaFinanceiroDashboard", "filtroStatusFinanceiroDashboard", "filtroBuscaFinanceiroDashboard"].forEach((id) => {
    const campo = document.getElementById(id);
    if (!campo) return;
    campo.addEventListener("input", aplicarFiltrosFinanceiros);
    campo.addEventListener("change", aplicarFiltrosFinanceiros);
  });

  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      ["filtroCompetenciaFinanceiroDashboard", "filtroStatusFinanceiroDashboard", "filtroBuscaFinanceiroDashboard"].forEach((id) => {
        const campo = document.getElementById(id);
        if (campo) campo.value = "";
      });
      aplicarFiltrosFinanceiros();
    });
  }

  if (btnExportarPdf) {
    btnExportarPdf.addEventListener("click", () => {
      if (!podeExportarDashboardFinanceiro) {
        AppUtils.toast("Seu perfil nao pode exportar este dashboard.", "warning");
        return;
      }
      exportarPdf().catch((error) => {
        console.error(error);
        window.alert("Nao foi possivel gerar o PDF.");
      });
    });
  }

  if (btnExportarCsv) {
    btnExportarCsv.addEventListener("click", () => {
      if (!podeExportarDashboardFinanceiro) {
        AppUtils.toast("Seu perfil nao pode exportar este dashboard.", "warning");
        return;
      }
      exportarCsvFinanceiroDashboard();
    });
  }

  if (btnExportarCsv) btnExportarCsv.disabled = !podeExportarDashboardFinanceiro;
  if (btnExportarPdf) btnExportarPdf.disabled = !podeExportarDashboardFinanceiro;
  setLoadingFinanceiroDashboard(true);
  carregarDados().catch((error) => {
    console.error(error);
    AppUtils.toast("Nao foi possivel carregar o dashboard financeiro.", "error");
  }).finally(() => {
    setLoadingFinanceiroDashboard(false);
  });
});


