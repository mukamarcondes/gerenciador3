document.addEventListener("DOMContentLoaded", async () => {
  if (window.AppAuth?.ready) {
    await window.AppAuth.ready;
  }
  const FINANCEIRO_LOCAL_KEY = "financeiroLancamentos";
  const FECHAMENTOS_KEY = "financeiroCompetenciasFechadas";
  const REMOTE_COMPETENCIA_TABLE = "financeiro_competencias";
  let graficoMensal = null;
  let graficoClientes = null;
  let graficoStatus = null;
  let financeiroCache = [];
  let ultimoRecorte = [];
  let competenciasFechadas = [];

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
      observacao: row.observacao || ""
    };
  }

  function normalizarTexto(valor) {
    return (valor || "").toString().trim().toLowerCase();
  }

  function moeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  }

  function percentualDelta(atual, anterior) {
    if (!anterior) return null;
    return ((atual - anterior) / anterior) * 100;
  }

  function textoDelta(delta) {
    if (delta === null || Number.isNaN(delta)) return "Sem comparativo";
    return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
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
      console.warn("Nao foi possivel carregar fechamento de competencias na diretoria.", error);
      return obterFechamentosLocal();
    }
  }

  function atualizarMetaFechamento(competencia) {
    const el = document.getElementById("gestaoFechamentoMeta");
    if (!el) return;
    const referencia = competencia
      || [...new Set(financeiroCache.map((item) => item.competencia).filter(Boolean))].sort().reverse()[0]
      || "";
    if (!referencia) {
      el.textContent = "Sem competencia em foco para fechamento.";
      return;
    }
    const fechamento = competenciasFechadas.find((item) => item.competencia === referencia && item.status === "fechado");
    if (!fechamento) {
      el.innerHTML = `<span class="financeiro-status-chip aberto">Competencia aberta</span> ${referencia} segue aberta.`;
      return;
    }
    el.innerHTML = `<span class="financeiro-status-chip fechado">Competencia fechada</span> ${referencia}${fechamento.fechadoEm ? ` em ${fechamento.fechadoEm}` : ""}${fechamento.fechadoPor ? ` por ${fechamento.fechadoPor}` : ""}.`;
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
    const competencia = document.getElementById("filtroCompetenciaDiretoria")?.value || "Todas";
    const status = document.getElementById("filtroStatusDiretoria")?.value || "Todos";
    const busca = document.getElementById("filtroBuscaDiretoria")?.value || "Sem busca";
    const receita = document.getElementById("gestaoReceita")?.textContent || "R$ 0";
    const margem = document.getElementById("gestaoMargem")?.textContent || "R$ 0";
    const inadimplencia = document.getElementById("gestaoInadimplencia")?.textContent || "0%";
    const ticketMedio = document.getElementById("gestaoTicketMedio")?.textContent || "R$ 0";
    const clienteLider = document.getElementById("gestaoClienteLider")?.textContent || "-";
    const margemNegativa = document.getElementById("gestaoMargemNegativa")?.textContent || "0";
    const resumoItens = Array.from(document.querySelectorAll("#gestaoResumoExecutivo .gestao-item"));
    const alertasItens = Array.from(document.querySelectorAll("#gestaoAlertas .gestao-alerta"));
    const comparativoItens = Array.from(document.querySelectorAll("#gestaoComparativo .gestao-comparativo-card"));

    const config = {
      title: "Relatorio Executivo",
      subtitle: "Painel consolidado para apresentacao gerencial",
      generatedAt: new Date().toLocaleString("pt-BR"),
      logoDataUrl: await pdf.loadLogo()
    };

    let y = pdf.getContentStartY();
    y = pdf.infoStrip(doc, [`Competencia: ${competencia}`, `Status: ${status}`, `Busca: ${busca}`], y);

    [
      ["Receita Total", receita, document.getElementById("gestaoReceitaDelta")?.textContent || ""],
      ["Margem Total", margem, document.getElementById("gestaoMargemPercentual")?.textContent || ""],
      ["Inadimplencia", inadimplencia, document.getElementById("gestaoPendentesTexto")?.textContent || ""],
      ["Ticket Medio", ticketMedio, document.getElementById("gestaoClientesAtivos")?.textContent || ""],
      ["Cliente Lider", clienteLider, document.getElementById("gestaoClienteLiderShare")?.textContent || ""],
      ["Margem Negativa", margemNegativa, document.getElementById("gestaoMargemNegativaTexto")?.textContent || ""]
    ].forEach(([titulo, valor, subtitulo], index) => {
      pdf.summaryCard(doc, {
        title: titulo,
        value: valor,
        subtitle: subtitulo,
        x: 14 + ((index % 3) * 63),
        y: y + (Math.floor(index / 3) * 28),
        width: 56
      });
    });

    y += 60;
    y = pdf.sectionTitle(doc, "Panorama visual", y);
    y = pdf.chartPanel(doc, { title: "Evolucao mensal", chart: graficoMensal, y, height: 58 });

    let y2 = pdf.addPage(doc, config);
    y2 = pdf.sectionTitle(doc, "Analise grafica complementar", y2);
    y2 = pdf.chartPanel(doc, { title: "Top clientes por margem", chart: graficoClientes, y: y2, height: 74 });
    y2 = pdf.chartPanel(doc, { title: "Status financeiro", chart: graficoStatus, y: y2, height: 74 });

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

    if (y3 > pdf.getContentBottom(doc) - 40) {
      y3 = pdf.addPage(doc, config);
    }

    y3 = pdf.sectionTitle(doc, "Resumo executivo", y3 + 4);

    if (resumoItens.length) {
      resumoItens.forEach((item) => {
        if (y3 > pdf.getContentBottom(doc) - 22) {
          y3 = pdf.addPage(doc, config);
          y3 = pdf.sectionTitle(doc, "Resumo executivo", y3);
        }
        const titulo = item.querySelector("strong")?.textContent || "";
        const textos = Array.from(item.querySelectorAll("span")).map((el) => el.textContent.trim());
        const descricao = textos[0] || "";
        const valor = textos[1] || "";
        const descricaoLinhas = doc.splitTextToSize(descricao, 118);
        const altura = Math.max(18, 12 + (descricaoLinhas.length * 4.2));
        doc.setFillColor(...pdf.COLORS.panel);
        doc.roundedRect(14, y3, 182, altura, 4, 4, "F");
        doc.setDrawColor(...pdf.COLORS.line);
        doc.roundedRect(14, y3, 182, altura, 4, 4, "S");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(...pdf.COLORS.text);
        doc.text(titulo, 18, y3 + 6.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.8);
        doc.setTextColor(...pdf.COLORS.muted);
        doc.text(descricaoLinhas, 18, y3 + 11.5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(...pdf.COLORS.ink);
        doc.text(valor, 190, y3 + (altura / 2) + 1.5, { align: "right" });
        y3 += altura + 5;
      });
    } else {
      y3 = pdf.paragraph(doc, "Sem resumo executivo disponivel.", 14, y3, 182, { size: 9.5, color: pdf.COLORS.muted }) + 4;
    }

    if (y3 > pdf.getContentBottom(doc) - 30) {
      y3 = pdf.addPage(doc, config);
    }

    y3 += 4;
    y3 = pdf.sectionTitle(doc, "Alertas", y3);

    if (alertasItens.length) {
      alertasItens.forEach((item) => {
        if (y3 > pdf.getContentBottom(doc) - 24) {
          y3 = pdf.addPage(doc, config);
          y3 = pdf.sectionTitle(doc, "Alertas", y3);
        }
        const titulo = item.querySelector("strong")?.textContent || "";
        const texto = item.querySelector("span")?.textContent || item.textContent || "";
        y3 = pdf.noteCard(doc, { title: titulo, text: texto, y: y3, variant: "warm" });
      });
    } else {
      y3 = pdf.paragraph(doc, "Sem alertas executivos no recorte atual.", 14, y3, 182, { size: 9.5, color: pdf.COLORS.muted }) + 4;
    }

    pdf.finalizeDoc(doc, config);
    const nomeArquivo = `relatorio-diretoria-${normalizarArquivo(competencia)}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(nomeArquivo);
  }

  function preencherCompetencias() {
    const select = document.getElementById("filtroCompetenciaDiretoria");
    if (!select) return;
    const atual = select.value;
    select.innerHTML = `<option value="">Todas as competencias</option>`;
    [...new Set(financeiroCache.map((item) => item.competencia).filter(Boolean))].sort().reverse().forEach((competencia) => {
      const option = document.createElement("option");
      option.value = competencia;
      option.textContent = competencia;
      select.appendChild(option);
    });
    select.value = atual;
  }

  function montarSerieMensal(lista) {
    const mapa = {};
    lista.forEach((item) => {
      const chave = item.competencia || "Sem competencia";
      if (!mapa[chave]) mapa[chave] = { receita: 0, custo: 0, margem: 0, pendentes: 0 };
      mapa[chave].receita += Number(item.valor || 0);
      mapa[chave].custo += Number(item.custo || 0);
      mapa[chave].margem += Number(item.valor || 0) - Number(item.custo || 0);
      if (item.status !== "pago") mapa[chave].pendentes += 1;
    });
    return mapa;
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
    const totalizar = (base) => {
      const receita = base.reduce((acc, item) => acc + Number(item.valor || 0), 0);
      const custo = base.reduce((acc, item) => acc + Number(item.custo || 0), 0);
      return {
        receita,
        custo,
        margem: receita - custo,
        pendentes: base.filter((item) => item.status !== "pago").length
      };
    };
    const atualTotais = totalizar(atual);
    const anteriorTotais = totalizar(anterior);
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

  function renderComparativoExecutivo(comparativo) {
    const container = document.getElementById("gestaoComparativo");
    if (!container) return;
    if (!comparativo.competenciaAtual || !comparativo.competenciaAnterior) {
      container.innerHTML = `
        <div class="gestao-comparativo-card">
          <strong>Comparativo entre competencias</strong>
          <span>Assim que houver uma competencia anterior disponivel, o painel mostra a variacao de receita, margem e pendencias para leitura executiva.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="gestao-comparativo-card">
        <strong>Receita comparada</strong>
        <span>${comparativo.competenciaAtual}: ${moeda(comparativo.atual.receita)}. ${comparativo.competenciaAnterior}: ${moeda(comparativo.anterior.receita)}. Variacao ${textoDelta(comparativo.deltaReceita)}.</span>
      </div>
      <div class="gestao-comparativo-card">
        <strong>Margem comparada</strong>
        <span>${comparativo.competenciaAtual}: ${moeda(comparativo.atual.margem)}. ${comparativo.competenciaAnterior}: ${moeda(comparativo.anterior.margem)}. Variacao ${textoDelta(comparativo.deltaMargem)}.</span>
      </div>
      <div class="gestao-comparativo-card">
        <strong>Pendencias do periodo</strong>
        <span>${comparativo.atual.pendentes} pendencia(s) agora contra ${comparativo.anterior.pendentes} antes. Variacao ${textoDelta(comparativo.deltaPendentes)}.</span>
      </div>
      <div class="gestao-comparativo-card">
        <strong>Cliente em maior crescimento</strong>
        <span>${comparativo.clienteMaiorAlta ? `${comparativo.clienteMaiorAlta.cliente} variou ${moeda(comparativo.clienteMaiorAlta.delta)} frente ao periodo anterior.` : "Sem comparativo suficiente."}</span>
      </div>
      <div class="gestao-comparativo-card">
        <strong>Cliente em maior queda</strong>
        <span>${comparativo.clienteMaiorQueda ? `${comparativo.clienteMaiorQueda.cliente} variou ${moeda(comparativo.clienteMaiorQueda.delta)} frente ao periodo anterior.` : "Sem comparativo suficiente."}</span>
      </div>
    `;
  }

  function renderGraficoMensal(lista) {
    const ctx = document.getElementById("graficoGestaoMensal")?.getContext("2d");
    if (!ctx) return;
    if (graficoMensal) graficoMensal.destroy();
    const serie = montarSerieMensal(lista);
    const labels = Object.keys(serie).sort();
    graficoMensal = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels.length ? labels : ["Sem dados"],
        datasets: [
          { label: "Receita", data: labels.length ? labels.map((l) => serie[l].receita) : [0], borderColor: "#1E3A8A", tension: 0.28 },
          { label: "Margem", data: labels.length ? labels.map((l) => serie[l].margem) : [0], borderColor: "#60A5FA", tension: 0.28 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
    });
  }

  function renderGraficoClientes(lista) {
    const ctx = document.getElementById("graficoGestaoClientes")?.getContext("2d");
    if (!ctx) return;
    if (graficoClientes) graficoClientes.destroy();
    const clientes = {};
    lista.forEach((item) => {
      const chave = item.cliente || "Nao informado";
      clientes[chave] = (clientes[chave] || 0) + (Number(item.valor || 0) - Number(item.custo || 0));
    });
    const top = Object.entries(clientes).sort((a, b) => b[1] - a[1]).slice(0, 8);
    graficoClientes = new Chart(ctx, {
      type: "bar",
      data: {
        labels: top.length ? top.map((item) => item[0]) : ["Sem dados"],
        datasets: [{ label: "Margem", data: top.length ? top.map((item) => item[1]) : [0], backgroundColor: "#3B82F6" }]
      },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  function renderGraficoStatus(lista) {
    const ctx = document.getElementById("graficoGestaoStatus")?.getContext("2d");
    if (!ctx) return;
    if (graficoStatus) graficoStatus.destroy();
    const status = { pago: 0, pendente: 0, atrasado: 0 };
    lista.forEach((item) => { if (status[item.status] !== undefined) status[item.status] += 1; });
    graficoStatus = new Chart(ctx, {
      type: "doughnut",
      data: { labels: ["Pago", "Pendente", "Atrasado"], datasets: [{ data: [status.pago, status.pendente, status.atrasado], backgroundColor: ["#1D4ED8", "#60A5FA", "#1E3A8A"] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
    });
  }

  function atualizarPainelExecutivo(lista, comparativo) {
    const receita = lista.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const custo = lista.reduce((acc, item) => acc + Number(item.custo || 0), 0);
    const margem = receita - custo;
    const clientes = [...new Set(lista.map((item) => item.cliente).filter(Boolean))];
    const ticketMedio = clientes.length ? receita / clientes.length : 0;
    const pendentes = lista.filter((item) => item.status !== "pago");
    const inadimplencia = receita ? (pendentes.reduce((acc, item) => acc + Number(item.valor || 0), 0) / receita) * 100 : 0;
    const margemPercentual = receita ? (margem / receita) * 100 : 0;
    const margensNegativas = lista.filter((item) => Number(item.valor || 0) - Number(item.custo || 0) < 0);
    const clienteTop = Object.entries(lista.reduce((acc, item) => {
      const chave = item.cliente || "Nao informado";
      acc[chave] = (acc[chave] || 0) + Number(item.valor || 0);
      return acc;
    }, {})).sort((a, b) => b[1] - a[1])[0];
    const serie = montarSerieMensal(lista);
    const competencias = Object.keys(serie).sort();
    const competenciaAtual = competencias[competencias.length - 1];
    const competenciaAnterior = competencias[competencias.length - 2];
    const receitaAtual = competenciaAtual ? serie[competenciaAtual].receita : 0;
    const receitaAnterior = competenciaAnterior ? serie[competenciaAnterior].receita : 0;
    const deltaReceita = receitaAnterior ? ((receitaAtual - receitaAnterior) / receitaAnterior) * 100 : 0;

    setText("gestaoReceita", moeda(receita));
    setText("gestaoMargem", moeda(margem));
    setText("gestaoInadimplencia", `${inadimplencia.toFixed(1)}%`);
    setText("gestaoTicketMedio", moeda(ticketMedio));
    setText("gestaoClienteLider", clienteTop ? clienteTop[0] : "-");
    setText("gestaoMargemNegativa", margensNegativas.length);
    setText("gestaoReceitaDelta", competenciaAnterior ? `Comparado a ${competenciaAnterior}: ${deltaReceita >= 0 ? "+" : ""}${deltaReceita.toFixed(1)}%` : "Sem comparativo");
    setText("gestaoMargemPercentual", `Margem ${margemPercentual.toFixed(1)}%`);
    setText("gestaoPendentesTexto", `${pendentes.length} pendencia(s) no recorte`);
    setText("gestaoClientesAtivos", `${clientes.length} cliente(s) no recorte`);
    setText("gestaoClienteLiderShare", clienteTop && receita ? `Participacao ${Math.round((clienteTop[1] / receita) * 100)}%` : "Participacao 0%");
    setText("gestaoMargemNegativaTexto", margensNegativas.length ? `${margensNegativas.length} caso(s) exigem revisao` : "Sem ocorrencias");

    const destaque = document.getElementById("gestaoCompetenciaDestaque");
    if (destaque) {
      destaque.innerHTML = `
        <div class="gestao-item"><div><strong>${competenciaAtual || "Sem competencia"}</strong><span>Receita em foco</span></div><span>${moeda(receitaAtual)}</span></div>
        <div class="gestao-item"><div><strong>Pendencias</strong><span>Status abertos na competencia</span></div><span>${competenciaAtual ? serie[competenciaAtual].pendentes : 0}</span></div>
      `;
    }

    const resumo = document.getElementById("gestaoResumoExecutivo");
    if (resumo) {
      resumo.innerHTML = `
        <div class="gestao-item"><div><strong>Receita total</strong><span>Somatorio do recorte atual</span></div><span>${moeda(receita)}</span></div>
        <div class="gestao-item"><div><strong>Custo total</strong><span>Base de custo consolidada</span></div><span>${moeda(custo)}</span></div>
        <div class="gestao-item"><div><strong>Margem consolidada</strong><span>Resultado liquido antes de outras despesas</span></div><span>${moeda(margem)}</span></div>
        <div class="gestao-item"><div><strong>Cliente lider</strong><span>Maior gerador de receita</span></div><span>${clienteTop ? clienteTop[0] : "-"}</span></div>
      `;
    }

    const alertas = [];
    if (inadimplencia >= 25) alertas.push({ titulo: "Inadimplencia acima do ideal", texto: `O recorte atual tem ${inadimplencia.toFixed(1)}% da receita em aberto.` });
    if (clienteTop && receita && (clienteTop[1] / receita) >= 0.45) alertas.push({ titulo: "Receita concentrada", texto: `${clienteTop[0]} representa parcela relevante da receita total.` });
    if (margensNegativas.length) alertas.push({ titulo: "Margens negativas", texto: `${margensNegativas.length} lancamento(s) precisam de revisao imediata.` });
    if (competenciaAnterior && deltaReceita < -10) alertas.push({ titulo: "Queda de receita", texto: `A receita caiu ${Math.abs(deltaReceita).toFixed(1)}% frente a ${competenciaAnterior}.` });

    const container = document.getElementById("gestaoAlertas");
    if (container) {
      container.innerHTML = alertas.length
        ? alertas.map((alerta) => `<div class="gestao-alerta"><strong>${alerta.titulo}</strong><span>${alerta.texto}</span></div>`).join("")
        : `<div class="gestao-alerta"><strong>Sem alertas executivos</strong><span>O recorte atual nao apresentou sinais criticos para a diretoria.</span></div>`;
    }

    renderComparativoExecutivo(comparativo);
  }

  function aplicarFiltros() {
    const competencia = document.getElementById("filtroCompetenciaDiretoria")?.value || "";
    const status = normalizarTexto(document.getElementById("filtroStatusDiretoria")?.value);
    const busca = normalizarTexto(document.getElementById("filtroBuscaDiretoria")?.value);
    const lista = financeiroCache.filter((item) => {
      if (competencia && item.competencia !== competencia) return false;
      if (status && normalizarTexto(item.status) !== status) return false;
      if (!busca) return true;
      return [item.cliente, item.empresa, item.numero, item.operadora, item.observacao].some((campo) => normalizarTexto(campo).includes(busca));
    });
    const filtros = [
      competencia && `Competencia: ${competencia}`,
      status && `Status: ${document.getElementById("filtroStatusDiretoria").value}`,
      busca && `Busca: ${document.getElementById("filtroBuscaDiretoria").value}`
    ].filter(Boolean);
    const comparativo = montarComparativoCompetencias(lista, competencia);
    ultimoRecorte = lista;
    setText("gestaoResumoFiltros", filtros.length ? `Filtros executivos: ${filtros.join(" | ")}` : "Sem filtros executivos aplicados");
    atualizarMetaFechamento(competencia);
    atualizarPainelExecutivo(lista, comparativo);
    renderGraficoMensal(lista);
    renderGraficoClientes(lista);
    renderGraficoStatus(lista);
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
    preencherCompetencias();
    aplicarFiltros();
  }

  const menuToggle = document.getElementById("menuToggleDiretoria");
  const sidePanel = document.getElementById("sidePanelDiretoria");
  const btnSair = document.getElementById("btnSairDiretoria");
  const docUser = document.getElementById("docUserDiretoria");
  const btnLimpar = document.getElementById("btnLimparDiretoria");
  const btnExportarPdf = document.getElementById("btnExportarPdfDiretoria");
  if (docUser) {
    const tipoUsuario = window.AppAuth?.getRole?.() || localStorage.getItem("tipoUsuario") || "user";
    const usuarioAtual = window.AppAuth?.getUser?.() || localStorage.getItem("usuarioEmail") || "usuario";
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

  ["filtroCompetenciaDiretoria", "filtroStatusDiretoria", "filtroBuscaDiretoria"].forEach((id) => {
    const campo = document.getElementById(id);
    if (!campo) return;
    campo.addEventListener("input", aplicarFiltros);
    campo.addEventListener("change", aplicarFiltros);
  });

  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      ["filtroCompetenciaDiretoria", "filtroStatusDiretoria", "filtroBuscaDiretoria"].forEach((id) => {
        const campo = document.getElementById(id);
        if (campo) campo.value = "";
      });
      aplicarFiltros();
    });
  }

  if (btnExportarPdf) {
    btnExportarPdf.addEventListener("click", () => {
      exportarPdf().catch((error) => {
        console.error(error);
        window.alert("Nao foi possivel gerar o PDF.");
      });
    });
  }

  carregarDados().catch((error) => {
    console.error(error);
  });
});


