(function () {
  const OPERADORAS = ["TIP", "Algar", "Conectel"];
  let auditDisabled = false;

  function ensureToastStyles() {
    if (document.getElementById("app-toast-styles")) return;

    const style = document.createElement("style");
    style.id = "app-toast-styles";
    style.textContent = `
      .app-toast-container {
        position: fixed;
        top: 16px;
        right: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 9999;
      }
      .app-toast {
        min-width: 260px;
        max-width: 360px;
        padding: 12px 14px;
        border-radius: 14px;
        color: #fff;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
        font-size: 14px;
        line-height: 1.4;
        animation: app-toast-in 0.18s ease-out;
      }
      .app-toast.info { background: #4b2a88; }
      .app-toast.success { background: #16754f; }
      .app-toast.warning { background: #9b5a00; }
      .app-toast.error { background: #a12622; }
      @keyframes app-toast-in {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureDialogStyles() {
    if (document.getElementById("app-dialog-styles")) return;

    const style = document.createElement("style");
    style.id = "app-dialog-styles";
    style.textContent = `
      .app-dialog-overlay {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(15, 20, 35, 0.42);
        backdrop-filter: blur(4px);
        z-index: 9998;
      }
      .app-dialog {
        width: min(100%, 760px);
        max-height: min(88vh, 860px);
        overflow: auto;
        padding: 24px;
        border-radius: 22px;
        background: linear-gradient(180deg, #fbfcff 0%, #eef3ff 100%);
        border: 1px solid rgba(113, 1, 206, 0.14);
        box-shadow: 0 28px 60px rgba(44, 61, 102, 0.2);
        color: #18233a;
      }
      .app-dialog h3 {
        margin: 0 0 12px;
        font-size: 28px;
        text-align: center;
      }
      .app-dialog p {
        margin: 0 0 12px;
        line-height: 1.5;
      }
      .app-dialog-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 10px;
        margin: 16px 0;
      }
      .app-dialog-summary-item {
        padding: 12px 14px;
        border-radius: 14px;
        background: #edf4ff;
        border: 1px solid rgba(87, 137, 233, 0.2);
        font-size: 14px;
      }
      .app-dialog-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 14px;
        overflow: hidden;
        border-radius: 16px;
      }
      .app-dialog-table th,
      .app-dialog-table td {
        padding: 10px 12px;
        border-bottom: 1px solid rgba(87, 137, 233, 0.15);
        text-align: left;
        font-size: 14px;
      }
      .app-dialog-table th {
        background: #e8f0ff;
      }
      .app-dialog-empty {
        padding: 16px;
        text-align: center;
        border-radius: 14px;
        background: #edf4ff;
      }
      .app-dialog-actions {
        display: flex;
        justify-content: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 18px;
      }
      .app-dialog-btn {
        min-width: 160px;
        border: none;
        border-radius: 999px;
        padding: 14px 18px;
        font-weight: 700;
        cursor: pointer;
        background: linear-gradient(90deg, #64c8ff 0%, #8d67ff 100%);
        color: #0c1320;
      }
      .app-dialog-btn.secondary {
        background: #dde7fb;
        color: #22314d;
      }
      .app-dialog-btn.danger {
        background: linear-gradient(90deg, #ff7b7b 0%, #ff4d88 100%);
        color: #1d0912;
      }
      body.dark-mode .app-dialog-overlay {
        background: rgba(5, 8, 16, 0.82);
      }
      body.dark-mode .app-dialog {
        background: linear-gradient(180deg, #182132 0%, #111827 100%);
        color: #e8f0ff;
        border: 1px solid rgba(100, 200, 255, 0.22);
        box-shadow: 0 28px 60px rgba(0, 0, 0, 0.58);
      }
      body.dark-mode .app-dialog-summary-item,
      body.dark-mode .app-dialog-empty {
        background: rgba(34, 49, 77, 0.92);
        color: #edf4ff;
        border: 1px solid rgba(100, 200, 255, 0.18);
      }
      body.dark-mode .app-dialog-table th {
        background: rgba(34, 49, 77, 0.92);
      }
      body.dark-mode .app-dialog-table th,
      body.dark-mode .app-dialog-table td {
        border-bottom: 1px solid rgba(100, 200, 255, 0.15);
        color: #edf4ff;
      }
      body.dark-mode .app-dialog-btn.secondary {
        background: rgba(34, 49, 77, 0.96);
        color: #edf4ff;
      }
    `;

    document.head.appendChild(style);
  }

  function getToastContainer() {
    ensureToastStyles();
    let container = document.getElementById("app-toast-container");

    if (!container) {
      container = document.createElement("div");
      container.id = "app-toast-container";
      container.className = "app-toast-container";
      document.body.appendChild(container);
    }

    return container;
  }

  function toast(message, type = "info", timeout = 2600) {
    const container = getToastContainer();
    const toastElement = document.createElement("div");
    toastElement.className = `app-toast ${type}`;
    toastElement.textContent = message;
    container.appendChild(toastElement);

    window.setTimeout(() => {
      toastElement.remove();
      if (container.childElementCount === 0) {
        container.remove();
      }
    }, timeout);
  }

  function escapeHtml(value) {
    return (value ?? "")
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function createDialogShell(title) {
    ensureDialogStyles();

    const overlay = document.createElement("div");
    overlay.className = "app-dialog-overlay";

    const dialog = document.createElement("div");
    dialog.className = "app-dialog";

    const heading = document.createElement("h3");
    heading.textContent = title;

    dialog.appendChild(heading);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    return { overlay, dialog };
  }

  function closeDialog(overlay) {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  function confirmDialog({
    title = "Confirmar acao",
    message = "Tem certeza que deseja continuar?",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    danger = false
  } = {}) {
    return new Promise((resolve) => {
      const { overlay, dialog } = createDialogShell(title);
      const body = document.createElement("p");
      body.textContent = message;

      const actions = document.createElement("div");
      actions.className = "app-dialog-actions";

      const cancel = document.createElement("button");
      cancel.className = "app-dialog-btn secondary";
      cancel.type = "button";
      cancel.textContent = cancelText;

      const confirm = document.createElement("button");
      confirm.className = `app-dialog-btn${danger ? " danger" : ""}`;
      confirm.type = "button";
      confirm.textContent = confirmText;

      function finish(result) {
        closeDialog(overlay);
        resolve(result);
      }

      cancel.addEventListener("click", () => finish(false));
      confirm.addEventListener("click", () => finish(true));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) finish(false);
      });

      actions.append(cancel, confirm);
      dialog.append(body, actions);
    });
  }

  function previewDialog({
    title = "Pre-visualizacao",
    summary = [],
    columns = [],
    rows = [],
    confirmText = "Importar",
    cancelText = "Cancelar"
  } = {}) {
    return new Promise((resolve) => {
      const { overlay, dialog } = createDialogShell(title);

      if (summary.length) {
        const summaryGrid = document.createElement("div");
        summaryGrid.className = "app-dialog-summary";
        summary.forEach((item) => {
          const card = document.createElement("div");
          card.className = "app-dialog-summary-item";
          card.innerHTML = `<strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}`;
          summaryGrid.appendChild(card);
        });
        dialog.appendChild(summaryGrid);
      }

      if (rows.length && columns.length) {
        const table = document.createElement("table");
        table.className = "app-dialog-table";
        table.innerHTML = `
          <thead>
            <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column.key] ?? "")}</td>`).join("")}</tr>`).join("")}
          </tbody>
        `;
        dialog.appendChild(table);
      } else {
        const empty = document.createElement("div");
        empty.className = "app-dialog-empty";
        empty.textContent = "Nenhum item para exibir.";
        dialog.appendChild(empty);
      }

      const actions = document.createElement("div");
      actions.className = "app-dialog-actions";

      const cancel = document.createElement("button");
      cancel.className = "app-dialog-btn secondary";
      cancel.type = "button";
      cancel.textContent = cancelText;

      const confirm = document.createElement("button");
      confirm.className = "app-dialog-btn";
      confirm.type = "button";
      confirm.textContent = confirmText;

      function finish(result) {
        closeDialog(overlay);
        resolve(result);
      }

      cancel.addEventListener("click", () => finish(false));
      confirm.addEventListener("click", () => finish(true));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) finish(false);
      });

      actions.append(cancel, confirm);
      dialog.appendChild(actions);
    });
  }

  function parseAuditDetails(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      return [];
    }
  }

  function applyFabricioBadge() {
    return;
    const usuario = (window.AppAuth?.getUser?.() || localStorage.getItem("usuarioEmail") || "").trim().toLowerCase();
    if (usuario !== "fabricio") return;

    ensureUserBadgeStyles();
    if (document.getElementById("app-user-badge")) return;

    const target = document.querySelector(".versao") || document.querySelector(".twelve") || document.querySelector("header");
    if (!target) return;

    const badge = document.createElement("div");
    badge.id = "app-user-badge";
    badge.className = "app-user-badge";
    badge.textContent = "🖕🖕🖕 Fabricio 🖕🖕🖕";
    target.appendChild(badge);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyFabricioBadge);
  } else {
    applyFabricioBadge();
  }

  function cleanNumber(value) {
    return (value || "").toString().replace(/\D/g, "");
  }

  function formatPhone(value) {
    const digits = cleanNumber(value);

    if (digits.length === 11) {
      return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }

    if (digits.length === 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }

    return value || "";
  }

  function normalizeCity(value) {
    return (value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function normalizeOperator(value) {
    const raw = (value || "").trim().toLowerCase();
    if (!raw) return "";
    if (raw === "tip") return "TIP";
    if (raw === "algar") return "Algar";
    if (raw === "conectel") return "Conectel";
    return value.trim();
  }

  function isValidOperator(value) {
    return OPERADORAS.includes(normalizeOperator(value));
  }

  function validateLivrePayload(payload) {
    if (!payload.ddd || cleanNumber(payload.ddd).length !== 2) {
      return "Informe um DDD valido com 2 digitos.";
    }

    if (!payload.cidade || normalizeCity(payload.cidade).length < 2) {
      return "Informe uma cidade valida.";
    }

    if (!isValidOperator(payload.operadora)) {
      return "Selecione uma operadora valida.";
    }

    const numero = cleanNumber(payload.number);
    if (numero.length < 10 || numero.length > 11) {
      return "Informe um numero valido com 10 ou 11 digitos.";
    }

    if (numero.substring(0, 2) !== cleanNumber(payload.ddd)) {
      return "O DDD precisa ser igual aos dois primeiros digitos do telefone.";
    }

    if (!["livre", "reservado", "ocupado"].includes(payload.status)) {
      return "Status invalido.";
    }

    return "";
  }

  function validateUsadoPayload(payload) {
    if (!payload.ddd || cleanNumber(payload.ddd).length !== 2) {
      return "DDD invalido.";
    }

    if (!payload.cidade || normalizeCity(payload.cidade).length < 2) {
      return "Cidade invalida.";
    }

    if (payload.operadora && !isValidOperator(payload.operadora)) {
      return "Operadora invalida.";
    }

    const numero = cleanNumber(payload.number);
    if (numero.length < 10 || numero.length > 11) {
      return "Numero invalido.";
    }

    if (!["ativado", "desativado"].includes(payload.ativo)) {
      return "Status invalido.";
    }

    return "";
  }

  function getCurrentActor() {
    return {
      actor: window.AppAuth?.getUser?.() || localStorage.getItem("usuarioEmail") || "local",
      actor_role: window.AppAuth?.getRole?.() || localStorage.getItem("tipoUsuario") || "user"
    };
  }

  function diffObjects(before, after, fields) {
    return fields
      .filter((field) => (before?.[field] || "") !== (after?.[field] || ""))
      .map((field) => ({
        field,
        before: before?.[field] || "",
        after: after?.[field] || ""
      }));
  }

  function downloadCsv(filename, headers, rows) {
    const escape = (value) => `"${(value ?? "").toString().replace(/"/g, "\"\"")}"`;
    const csv = [
      headers.map(escape).join(";"),
      ...rows.map((row) => row.map(escape).join(";"))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function logAudit(entry) {
    if (auditDisabled || !window.appDb) return;

    try {
      const actorInfo = getCurrentActor();
      await window.appDb.insert("audit_logs", {
        entity_type: entry.entity_type,
        entity_id: String(entry.entity_id || ""),
        action: entry.action,
        actor: actorInfo.actor,
        actor_role: actorInfo.actor_role,
        details: JSON.stringify(entry.details || []),
        created_at: new Date().toISOString()
      });
    } catch (error) {
      auditDisabled = true;
      console.warn("Audit log indisponivel.", error);
    }
  }

  window.AppUtils = {
    OPERADORAS,
    toast,
    cleanNumber,
    formatPhone,
    normalizeCity,
    normalizeOperator,
    isValidOperator,
    validateLivrePayload,
    validateUsadoPayload,
    diffObjects,
    downloadCsv,
    logAudit,
    escapeHtml,
    confirmDialog,
    previewDialog,
    parseAuditDetails,
    applyFabricioBadge
  };
})();


