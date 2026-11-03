/* * cceak — página pública de estudos * * Lê só estudos ativos (RLS). Todo texto vem do banco e é gravado com textContent. * Sem Supabase configurado, a página informa que não há estudos para mostrar. */
(function () {
  "use strict";
  var ENV = window.CCEAK_ENV || {};
  var base = (ENV.supabaseUrl || "").replace(/\/$/, "");
  var SELECT =
    "id,livro,total_paginas,pagina_atual,progresso_pct,capitulo,subcapitulo,item,numero,referencia,data_estudo,hora_inicio,hora_fim";
  var $ = function (id) {
    return document.getElementById(id);
  };
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }
  function fmtHora(t) {
    return t ? String(t).slice(0, 5) : "";
  }
  /** Data AAAA-MM-DD escrita por partes, para não sofrer deslocamento de fuso. */ function fmtData(
    iso
  ) {
    var p = String(iso).split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return d.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }
  function fmtPct(v) {
    return Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  }
  function progressBar(livro, pct) {
    var bar = el("div", "study-progress");
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-label", "Progresso do estudo " + livro);
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    bar.setAttribute("aria-valuenow", String(Math.round(pct)));
    bar.setAttribute("aria-valuetext", fmtPct(pct) + "% concluído");
    var fill = el("div", "study-progress-fill");
    fill.style.width = Math.max(0, Math.min(100, pct)) + "%";
    bar.appendChild(fill);
    return bar;
  }
  function card(e) {
    var li = el("li", "study");
    li.appendChild(el("h2", "study-title", e.livro));
    var horario = fmtHora(e.hora_inicio) + (e.hora_fim ? " às " + fmtHora(e.hora_fim) : "");
    li.appendChild(el("p", "study-meta", fmtData(e.data_estudo) + ", " + horario));
    if (e.pagina_atual != null && e.total_paginas) {
      var pct = Number(e.progresso_pct) || 0;
      li.appendChild(progressBar(e.livro, pct));
      li.appendChild(
        el(
          "p",
          "study-progress-text",
          fmtPct(pct) + "% · página " + e.pagina_atual + " de " + e.total_paginas
        )
      );
    } else {
      li.appendChild(
        el(
          "p",
          "study-progress-text",
          "Progresso ainda não informado · " + e.total_paginas + " páginas"
        )
      );
    }
    var campos = [
      ["Capítulo", e.capitulo],
      ["Subcapítulo", e.subcapitulo],
      ["Item", e.item],
      ["Número", e.numero],
      ["Referência", e.referencia]
    ].filter(function (c) {
      return c[1];
    });
    if (campos.length) {
      var dl = el("dl", "study-dl");
      campos.forEach(function (c) {
        dl.appendChild(el("dt", null, c[0]));
        dl.appendChild(el("dd", null, c[1]));
      });
      li.appendChild(dl);
    }
    return li;
  }
  function render(rows) {
    var list = $("estudos-list");
    list.textContent = "";
    (rows || []).forEach(function (e) {
      if (e && e.livro) list.appendChild(card(e));
    });
    list.hidden = list.childElementCount === 0;
    $("estudos-empty").hidden = list.childElementCount !== 0;
    $("estudos-status").hidden = true;
  }
  function fail(message) {
    var status = $("estudos-status");
    status.hidden = false;
    status.textContent = message;
    $("estudos-list").hidden = true;
    $("estudos-empty").hidden = true;
  }
  function load() {
    if (!base || !ENV.supabaseAnonKey || !window.fetch) {
      fail("Os estudos ainda não estão disponíveis neste endereço.");
      return;
    }
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller
      ? setTimeout(function () {
          controller.abort();
        }, 8000)
      : null;
    fetch(
      base +
        "/rest/v1/estudos?select=" +
        SELECT +
        "&ativo=eq.true&order=data_estudo.asc,hora_inicio.asc",
      {
        headers: { apikey: ENV.supabaseAnonKey, Authorization: "Bearer " + ENV.supabaseAnonKey },
        signal: controller ? controller.signal : undefined,
        cache: "no-store"
      }
    )
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(render)
      .catch(function () {
        fail("Não foi possível carregar os estudos agora. Tente novamente em instantes.");
      })
      .then(function () {
        if (timer) clearTimeout(timer);
      });
  }
  load();
})();
