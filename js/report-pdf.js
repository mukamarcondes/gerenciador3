(function () {
  const HEADER_HEIGHT = 30;
  const FOOTER_HEIGHT = 12;
  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const MARGIN_X = 14;
  const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN_X * 2);
  const COLORS = {
    ink: [15, 23, 42],
    text: [30, 41, 59],
    muted: [100, 116, 139],
    accent: [37, 99, 235],
    accentSoft: [219, 234, 254],
    panel: [248, 250, 252],
    line: [226, 232, 240],
    warm: [255, 247, 237],
    warmText: [154, 52, 18]
  };
  let logoPromise = null;

  function withOpacityChannel(color) {
    return Array.isArray(color) ? color : COLORS.text;
  }

  function loadLogo() {
    if (logoPromise) return logoPromise;
    logoPromise = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (error) {
          console.warn("Nao foi possivel converter o logo para o PDF.", error);
          resolve(null);
        }
      };
      image.onerror = () => resolve(null);
      image.src = "./img/1.png";
    });
    return logoPromise;
  }

  function createDoc() {
    const jspdf = window.jspdf;
    if (!jspdf?.jsPDF) {
      throw new Error("Nao foi possivel carregar a biblioteca de PDF.");
    }
    return new jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  }

  function getPageHeight(doc) {
    return doc.internal.pageSize.getHeight();
  }

  function getPageWidth(doc) {
    return doc.internal.pageSize.getWidth();
  }

  function drawPageChrome(doc, config) {
    const pageWidth = getPageWidth(doc);
    const pageHeight = getPageHeight(doc);
    const title = config?.title || "Relatorio";
    const subtitle = config?.subtitle || "";
    const generatedAt = config?.generatedAt || new Date().toLocaleString("pt-BR");
    const logo = config?.logoDataUrl || null;

    doc.setFillColor(...COLORS.ink);
    doc.rect(0, 0, pageWidth, HEADER_HEIGHT, "F");
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, HEADER_HEIGHT - 3, pageWidth, 3, "F");

    if (logo) {
      try {
        doc.addImage(logo, "PNG", MARGIN_X, 6, 28, 12, undefined, "FAST");
      } catch (error) {
        console.warn("Nao foi possivel desenhar o logo no PDF.", error);
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(title, MARGIN_X, 20);

    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(subtitle, MARGIN_X, 25);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Emitido em ${generatedAt}`, pageWidth - MARGIN_X, 14, { align: "right" });

    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, pageHeight - FOOTER_HEIGHT, pageWidth - MARGIN_X, pageHeight - FOOTER_HEIGHT);
  }

  function finalizeDoc(doc, config) {
    const total = doc.getNumberOfPages();
    const generatedAt = config?.generatedAt || new Date().toLocaleString("pt-BR");
    for (let page = 1; page <= total; page += 1) {
      doc.setPage(page);
      drawPageChrome(doc, config);
      doc.setTextColor(...COLORS.muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("Conectel | Relatorio gerencial", MARGIN_X, getPageHeight(doc) - 5);
      doc.text(`Pagina ${page} de ${total}`, getPageWidth(doc) - MARGIN_X, getPageHeight(doc) - 5, { align: "right" });
      doc.text(generatedAt, getPageWidth(doc) / 2, getPageHeight(doc) - 5, { align: "center" });
    }
  }

  function addPage(doc, config) {
    doc.addPage();
    drawPageChrome(doc, config);
    return HEADER_HEIGHT + 12;
  }

  function getContentStartY() {
    return HEADER_HEIGHT + 12;
  }

  function getContentBottom(doc) {
    return getPageHeight(doc) - FOOTER_HEIGHT - 4;
  }

  function sectionTitle(doc, title, y, options = {}) {
    const x = options.x || MARGIN_X;
    const color = withOpacityChannel(options.color || COLORS.text);
    doc.setTextColor(...color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(options.size || 12);
    doc.text(title, x, y);
    return y + (options.gap || 7);
  }

  function paragraph(doc, text, x, y, width, options = {}) {
    const lines = doc.splitTextToSize(text || "", width);
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(options.size || 9.5);
    doc.setTextColor(...withOpacityChannel(options.color || COLORS.muted));
    doc.text(lines, x, y);
    return y + (lines.length * (options.lineHeight || 4.5));
  }

  function infoStrip(doc, items, y) {
    doc.setFillColor(...COLORS.panel);
    doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, 16, 4, 4, "F");
    doc.setDrawColor(...COLORS.line);
    doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, 16, 4, 4, "S");
    const validItems = (items || []).filter(Boolean);
    const text = validItems.length ? validItems.join("   |   ") : "Sem filtros aplicados";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    doc.text("Filtros aplicados", MARGIN_X + 4, y + 6);
    paragraph(doc, text, MARGIN_X + 4, y + 11, CONTENT_WIDTH - 8, { size: 8.5, lineHeight: 3.8 });
    return y + 22;
  }

  function summaryCard(doc, config) {
    const x = config.x;
    const y = config.y;
    const width = config.width;
    const height = config.height || 24;
    doc.setFillColor(...(config.fillColor || COLORS.panel));
    doc.roundedRect(x, y, width, height, 4, 4, "F");
    doc.setDrawColor(...COLORS.line);
    doc.roundedRect(x, y, width, height, 4, 4, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...(config.titleColor || COLORS.accent));
    doc.text(config.title || "", x + 4, y + 7);
    doc.setFontSize(config.valueSize || 17);
    doc.setTextColor(...COLORS.ink);
    const valueLines = doc.splitTextToSize(config.value || "-", width - 8);
    doc.text(valueLines, x + 4, y + 14);
    if (config.subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...COLORS.muted);
      const subtitleLines = doc.splitTextToSize(config.subtitle, width - 8);
      doc.text(subtitleLines, x + 4, y + height - 4);
    }
  }

  function chartPanel(doc, config) {
    const x = config.x || MARGIN_X;
    const y = config.y;
    const width = config.width || CONTENT_WIDTH;
    const height = config.height || 62;
    doc.setFillColor(...COLORS.panel);
    doc.roundedRect(x, y, width, height, 5, 5, "F");
    doc.setDrawColor(...COLORS.line);
    doc.roundedRect(x, y, width, height, 5, 5, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.text);
    doc.text(config.title || "", x + 4, y + 7);
    if (config.chart?.canvas) {
      try {
        doc.addImage(config.chart.canvas.toDataURL("image/png", 1), "PNG", x + 3, y + 10, width - 6, height - 13, undefined, "FAST");
      } catch (error) {
        console.warn("Nao foi possivel adicionar o grafico ao PDF.", error);
        paragraph(doc, "Nao foi possivel capturar este grafico.", x + 4, y + 18, width - 8, { size: 9 });
      }
    } else {
      paragraph(doc, "Sem dados para exibir neste grafico.", x + 4, y + 18, width - 8, { size: 9 });
    }
    return y + height + 6;
  }

  function noteCard(doc, config) {
    const x = config.x || MARGIN_X;
    const y = config.y;
    const width = config.width || CONTENT_WIDTH;
    const fill = config.variant === "warm" ? COLORS.warm : COLORS.panel;
    const titleColor = config.variant === "warm" ? COLORS.warmText : COLORS.text;
    doc.setFillColor(...fill);
    doc.roundedRect(x, y, width, config.height || 18, 4, 4, "F");
    doc.setDrawColor(...COLORS.line);
    doc.roundedRect(x, y, width, config.height || 18, 4, 4, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...titleColor);
    doc.text(config.title || "", x + 4, y + 6.5);
    return paragraph(doc, config.text || "", x + 4, y + 11.5, width - 8, { size: 8.8, color: config.variant === "warm" ? COLORS.warmText : COLORS.muted, lineHeight: 4.2 }) + 4;
  }

  window.ReportPdf = {
    COLORS,
    MARGIN_X,
    CONTENT_WIDTH,
    createDoc,
    loadLogo,
    addPage,
    finalizeDoc,
    getContentStartY,
    getContentBottom,
    sectionTitle,
    paragraph,
    infoStrip,
    summaryCard,
    chartPanel,
    noteCard
  };
}());
