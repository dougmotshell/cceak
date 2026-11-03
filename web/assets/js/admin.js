/* * cceak — tela de administração da configuração do site * * Login por e-mail e senha (Supabase Auth). A sessão fica em sessionStorage (some ao fechar a aba), * nunca em localStorage. A autorização real é do banco (RLS): * - administradores (tabela admins) gerenciam a configuração do site e a programação; * - diretores e colaboradores (tabela equipe) gerenciam só a programação. * Esta tela apenas espelha isso para a experiência. * Todo conteúdo exibido é gravado com textContent; nada vindo do banco vira HTML. */
(function () {
  "use strict";
  var CONFIG = window.CCEAK_CONFIG;
  var ENV = window.CCEAK_ENV || {};
  var SESSION_KEY = "cceak-admin-session";
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var HEX = /^#[0-9a-fA-F]{6}$/;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var state = {
    session: null,
    values: null,
    dirty: {},
    isAdmin: false,
    programacao: [],
    editId: null
  };
  var PROG_COLUMNS = "id,dia_label,hora_inicio,hora_fim,atividade,quem_pode,ordem,ativo";
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var base = (ENV.supabaseUrl || "").replace(/\/$/, "");
  /* ---------- utilidades ---------- */ function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }
  function status(msg, isError) {
    var box = $("admin-status");
    box.textContent = msg;
    box.className = isError ? "notice notice--error" : "notice";
    box.hidden = !msg;
  }
  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch (e) {
      return null;
    }
  }
  function setSession(s) {
    state.session = s;
    try {
      if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {
      /* armazenamento bloqueado: a sessão dura só nesta página */
    }
  }
  function contrastWithWhite(hex) {
    var n = parseInt(hex.slice(1), 16);
    var lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (c) {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 1.05 / (0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2] + 0.05);
  }
  /* ---------- chamadas ao Supabase ---------- */ function headers(extra) {
    var h = { apikey: ENV.supabaseAnonKey, "Content-Type": "application/json" };
    h.Authorization =
      "Bearer " + (state.session ? state.session.access_token : ENV.supabaseAnonKey);
    return Object.assign(h, extra || {});
  }
  function refreshSession() {
    if (!state.session || !state.session.refresh_token)
      return Promise.reject(new Error("sem sessão"));
    return fetch(base + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { apikey: ENV.supabaseAnonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: state.session.refresh_token })
    })
      .then(function (res) {
        if (!res.ok) throw new Error("refresh");
        return res.json();
      })
      .then(function (data) {
        setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          email: state.session.email
        });
      });
  }
  /** Chama a API; em 401 tenta renovar a sessão uma vez. */ function api(path, options, retried) {
    var opts = options || {};
    return fetch(base + path, {
      method: opts.method || "GET",
      headers: headers(opts.headers),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store"
    }).then(function (res) {
      if (res.status === 401 && !retried) {
        return refreshSession().then(function () {
          return api(path, opts, true);
        });
      }
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error("HTTP " + res.status + (t ? ": " + t.slice(0, 160) : ""));
        });
      }
      /* 204 e 201 com return=minimal chegam sem corpo: não é erro. */ return res
        .text()
        .then(function (t) {
          return t ? JSON.parse(t) : null;
        });
    });
  }
  function signIn(email, password) {
    return fetch(base + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: ENV.supabaseAnonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    })
      .then(function (res) {
        if (!res.ok) throw new Error("credenciais");
        return res.json();
      })
      .then(function (data) {
        setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          email: email
        });
      });
  }
  /** Revoga o refresh token no servidor (best effort). Sem isso, a cópia da sessão continua válida. */ function revokeRemote(
    token
  ) {
    if (!token || !base) return;
    fetch(base + "/auth/v1/logout", {
      method: "POST",
      headers: { apikey: ENV.supabaseAnonKey, Authorization: "Bearer " + token }
    }).catch(function () {
      /* sem rede: a sessão local é descartada de qualquer forma */
    });
  }
  function signOut() {
    revokeRemote(state.session && state.session.access_token);
    setSession(null);
    state.values = null;
    state.dirty = {};
    state.isAdmin = false;
    state.programacao = [];
    resetProgForm();
    showLogin();
    status("Sessão encerrada.", false);
  }
  /* ---------- validação ---------- */ function validateValue(field, value, label) {
    var errs = [];
    var v = value == null ? "" : String(value).trim();
    if (field.required && v === "") errs.push(label + ": campo obrigatório.");
    if (field.max && v.length > field.max)
      errs.push(label + ": máximo de " + field.max + " caracteres.");
    if (field.type === "email" && v && !EMAIL.test(v)) errs.push(label + ": e-mail inválido.");
    if (field.type === "url" && v && v.indexOf("https://") !== 0)
      errs.push(label + ": use um endereço que comece com https://.");
    if (field.type === "select" && v && field.options.indexOf(v) === -1)
      errs.push(label + ": opção inválida.");
    if (field.type === "color") {
      if (v && !HEX.test(v)) errs.push(label + ": use o formato #RRGGBB.");
      else if (v && contrastWithWhite(v) < 4.5)
        errs.push(label + ": contraste insuficiente com o texto branco (mínimo 4,5:1).");
    }
    return errs;
  }
  /** Retorna só os campos do esquema (descarta chaves desconhecidas) e a lista de erros. */ function sanitizeSection(
    section,
    raw
  ) {
    var errors = [];
    if (section.list) {
      var items = Array.isArray(raw) ? raw : [];
      var clean = items.map(function (item, i) {
        var out = {};
        section.itemFields.forEach(function (f) {
          var value = item[f.name];
          if (f.type === "bool") out[f.name] = value !== false;
          else out[f.name] = value == null ? "" : String(value).trim();
          errors = errors.concat(
            validateValue(f, out[f.name], section.title + " #" + (i + 1) + " · " + f.label)
          );
        });
        return out;
      });
      return { value: clean, errors: errors };
    }
    var obj = {};
    section.fields.forEach(function (f) {
      if (f.type === "bool") obj[f.name] = raw[f.name] !== false;
      else {
        obj[f.name] = raw[f.name] == null ? "" : String(raw[f.name]).trim();
        errors = errors.concat(validateValue(f, obj[f.name], f.label));
      }
    });
    return { value: obj, errors: errors };
  }
  /* ---------- formulário ---------- */ function fieldControl(f, id, value, onChange) {
    var input;
    if (f.type === "bool") {
      var wrap = el("label", "check");
      input = el("input");
      input.type = "checkbox";
      input.checked = value !== false;
      input.addEventListener("change", function () {
        onChange(input.checked);
      });
      input.id = id;
      wrap.appendChild(input);
      wrap.appendChild(document.createTextNode(" " + f.label));
      return wrap;
    }
    if (f.type === "textarea") {
      input = el("textarea");
      input.rows = 3;
    } else if (f.type === "select") {
      input = el("select");
      f.options.forEach(function (opt) {
        var o = el("option", null, opt);
        o.value = opt;
        if (opt === value) o.selected = true;
        input.appendChild(o);
      });
    } else {
      input = el("input");
      input.type =
        f.type === "color"
          ? "color"
          : f.type === "email"
            ? "email"
            : f.type === "url"
              ? "url"
              : "text";
    }
    input.id = id;
    if (f.max) input.maxLength = f.max * 4;
    /* limite de digitação; a validação conta caracteres */ if (
      f.type !== "select" &&
      f.type !== "color"
    )
      input.value = value == null ? "" : value;
    if (f.type === "color") input.value = HEX.test(value || "") ? value : "#1d4ed8";
    input.addEventListener("input", function () {
      onChange(input.value);
    });
    input.addEventListener("change", function () {
      onChange(input.value);
    });
    var label = el("label", "field");
    label.appendChild(el("span", "field-label", f.label + (f.required ? " *" : "")));
    label.appendChild(input);
    return label;
  }
  function markDirty(key) {
    state.dirty[key] = true;
    var btn = document.querySelector('[data-save="' + key + '"]');
    if (btn) btn.textContent = "Salvar alterações";
  }
  function renderSection(section) {
    var fs = el("fieldset", "admin-section");
    fs.id = "sec-" + section.key;
    var legend = el("legend", null, section.title);
    fs.appendChild(legend);
    fs.appendChild(el("p", "help", section.help));
    if (section.list) {
      var items = state.values[section.key];
      var listEl = el("div", "admin-list");
      items.forEach(function (item, i) {
        var card = el("div", "admin-item");
        card.appendChild(el("h3", null, section.title + " · item " + (i + 1)));
        section.itemFields.forEach(function (f) {
          var id = "f-" + section.key + "-" + i + "-" + f.name;
          card.appendChild(
            fieldControl(f, id, item[f.name], function (v) {
              item[f.name] = v;
              markDirty(section.key);
            })
          );
        });
        var actions = el("div", "admin-actions");
        actions.appendChild(
          actionButton("Subir", i === 0, function () {
            move(section, i, -1);
          })
        );
        actions.appendChild(
          actionButton("Descer", i === items.length - 1, function () {
            move(section, i, 1);
          })
        );
        actions.appendChild(
          actionButton("Remover", false, function () {
            removeItem(section, i);
          })
        );
        card.appendChild(actions);
        listEl.appendChild(card);
      });
      fs.appendChild(listEl);
      var add = el("button", "btn btn--ghost", "Adicionar item");
      add.type = "button";
      add.addEventListener("click", function () {
        items.push(newItem(section));
        markDirty(section.key);
        rerender();
      });
      fs.appendChild(add);
    } else {
      section.fields.forEach(function (f) {
        var id = "f-" + section.key + "-" + f.name;
        fs.appendChild(
          fieldControl(f, id, state.values[section.key][f.name], function (v) {
            state.values[section.key][f.name] = v;
            markDirty(section.key);
          })
        );
      });
    }
    var save = el("button", "btn btn--primary", "Salvar seção");
    save.type = "button";
    save.setAttribute("data-save", section.key);
    save.addEventListener("click", function () {
      saveSection(section);
    });
    fs.appendChild(save);
    return fs;
  }
  function actionButton(text, disabled, handler) {
    var b = el("button", "btn btn--ghost btn--small", text);
    b.type = "button";
    b.disabled = disabled;
    b.addEventListener("click", handler);
    return b;
  }
  function newItem(section) {
    var item = {};
    section.itemFields.forEach(function (f) {
      item[f.name] = f.type === "bool" ? true : f.type === "select" ? f.options[0] : "";
    });
    return item;
  }
  function move(section, index, delta) {
    var items = state.values[section.key];
    var target = index + delta;
    if (target < 0 || target >= items.length) return;
    var tmp = items[index];
    items[index] = items[target];
    items[target] = tmp;
    markDirty(section.key);
    rerender();
  }
  function removeItem(section, index) {
    state.values[section.key].splice(index, 1);
    markDirty(section.key);
    rerender();
  }
  function rerender() {
    var host = $("admin-sections");
    var focused = document.activeElement && document.activeElement.id;
    host.textContent = "";
    CONFIG.SECTIONS.forEach(function (s) {
      host.appendChild(renderSection(s));
    });
    if (focused) {
      var again = $(focused);
      if (again) again.focus();
    }
  }
  function saveSection(section) {
    var result = sanitizeSection(section, state.values[section.key]);
    if (result.errors.length) {
      status("Corrija antes de salvar: " + result.errors.join(" "), true);
      return;
    }
    status("Salvando " + section.title + "…", false);
    api("/rest/v1/site_settings?on_conflict=key", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: { key: section.key, value: result.value }
    })
      .then(function () {
        state.values[section.key] = result.value;
        delete state.dirty[section.key];
        var btn = document.querySelector('[data-save="' + section.key + '"]');
        if (btn) btn.textContent = "Salvar seção";
        status(
          "Seção salva: " + section.title + ". A alteração aparece no site em instantes.",
          false
        );
      })
      .catch(function (err) {
        status(
          "Não foi possível salvar. Sua sessão pode ter expirado. Detalhe: " + err.message,
          true
        );
      });
  }
  /* ---------- programação da Casa ---------- */ function fmtHora(t) {
    return t ? String(t).slice(0, 5) : "";
  }
  function progForm() {
    return {
      dia: $("prog-dia"),
      inicio: $("prog-inicio"),
      fim: $("prog-fim"),
      atividade: $("prog-atividade"),
      publico: $("prog-publico"),
      ordem: $("prog-ordem"),
      ativo: $("prog-ativo")
    };
  }
  /** Valida o formulário e devolve o corpo da linha, ou null com a mensagem de erro. */ function readProgForm() {
    var f = progForm();
    var dia = f.dia.value.trim();
    var inicio = f.inicio.value;
    var fim = f.fim.value;
    var atividade = f.atividade.value.trim();
    var publico = f.publico.value.trim() || "Aberto ao público";
    var ordem = parseInt(f.ordem.value, 10);
    var errors = [];
    if (!dia || dia.length > 80) errors.push("Dia ou periodicidade: informe até 80 caracteres.");
    if (!inicio) errors.push("Início: informe o horário.");
    if (fim && inicio && fim <= inicio) errors.push("Término deve ser depois do início.");
    if (!atividade || atividade.length > 400) errors.push("Atividade: informe até 400 caracteres.");
    if (publico.length > 120) errors.push("Quem pode participar: máximo de 120 caracteres.");
    if (isNaN(ordem) || ordem < 0 || ordem > 999) errors.push("Ordem: use um número de 0 a 999.");
    if (errors.length) return { errors: errors };
    return {
      errors: [],
      body: {
        dia_label: dia,
        hora_inicio: inicio,
        hora_fim: fim || null,
        atividade: atividade,
        quem_pode: publico,
        ordem: ordem,
        ativo: f.ativo.checked
      }
    };
  }
  function resetProgForm() {
    var f = progForm();
    $("prog-form").reset();
    f.publico.value = "Aberto ao público";
    f.ordem.value = "0";
    f.ativo.checked = true;
    state.editId = null;
    $("prog-id").value = "";
    $("prog-form-titulo").textContent = "Nova atividade";
    $("prog-submit").textContent = "Adicionar atividade";
    $("prog-cancel").hidden = true;
  }
  function startEdit(item) {
    var f = progForm();
    state.editId = item.id;
    $("prog-id").value = item.id;
    f.dia.value = item.dia_label || "";
    f.inicio.value = fmtHora(item.hora_inicio);
    f.fim.value = fmtHora(item.hora_fim);
    f.atividade.value = item.atividade || "";
    f.publico.value = item.quem_pode || "Aberto ao público";
    f.ordem.value = String(item.ordem == null ? 0 : item.ordem);
    f.ativo.checked = item.ativo !== false;
    $("prog-form-titulo").textContent = "Editar atividade";
    $("prog-submit").textContent = "Salvar alterações";
    $("prog-cancel").hidden = false;
    f.dia.focus();
  }
  function saveProg(event) {
    event.preventDefault();
    var result = readProgForm();
    if (result.errors.length) {
      status("Corrija antes de salvar: " + result.errors.join(" "), true);
      return;
    }
    var editing = state.editId;
    var req =
      editing && UUID.test(editing)
        ? api("/rest/v1/programacao?id=eq." + encodeURIComponent(editing), {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: result.body
          })
        : api("/rest/v1/programacao", {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: result.body
          });
    $("prog-submit").disabled = true;
    status("Salvando atividade…", false);
    req
      .then(function () {
        resetProgForm();
        status("Atividade salva. A alteração aparece no site em instantes.", false);
        return loadProgramacao();
      })
      .catch(function (err) {
        status(
          "Não foi possível salvar a atividade. Sua sessão pode ter expirado. Detalhe: " +
            err.message,
          true
        );
      })
      .then(function () {
        $("prog-submit").disabled = false;
      });
  }
  function deleteProg(item) {
    status("Removendo atividade…", false);
    api("/rest/v1/programacao?id=eq." + encodeURIComponent(item.id), {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    })
      .then(function () {
        if (state.editId === item.id) resetProgForm();
        status("Atividade removida.", false);
        return loadProgramacao();
      })
      .catch(function (err) {
        status("Não foi possível remover a atividade. Detalhe: " + err.message, true);
      });
  }
  /** Botões de uma atividade. Remover pede confirmação na própria linha (sem diálogo do navegador). */ function progActions(
    item
  ) {
    var wrap = el("div", "admin-actions");
    wrap.appendChild(
      actionButton("Editar", false, function () {
        startEdit(item);
      })
    );
    wrap.appendChild(
      actionButton("Remover", false, function () {
        wrap.textContent = "";
        wrap.appendChild(
          el("p", "help", "Remover esta atividade? Esta ação não pode ser desfeita.")
        );
        wrap.appendChild(
          actionButton("Confirmar remoção", false, function () {
            deleteProg(item);
          })
        );
        wrap.appendChild(
          actionButton("Cancelar", false, function () {
            wrap.parentNode.replaceChild(progActions(item), wrap);
          })
        );
        wrap.querySelector("button").focus();
      })
    );
    return wrap;
  }
  function renderProgramacao() {
    var list = $("prog-list");
    list.textContent = "";
    $("prog-empty").hidden = state.programacao.length > 0;
    state.programacao.forEach(function (item) {
      var li = el("li", "admin-item");
      var horario =
        fmtHora(item.hora_inicio) + (item.hora_fim ? " às " + fmtHora(item.hora_fim) : "");
      li.appendChild(
        el(
          "h3",
          null,
          item.dia_label + " · " + horario + (item.ativo === false ? " · oculta no site" : "")
        )
      );
      li.appendChild(el("p", null, item.atividade));
      li.appendChild(el("p", "help", item.quem_pode || ""));
      li.appendChild(progActions(item));
      list.appendChild(li);
    });
  }
  function loadProgramacao() {
    return api(
      "/rest/v1/programacao?select=" + PROG_COLUMNS + "&order=ordem.asc,hora_inicio.asc"
    ).then(function (rows) {
      state.programacao = rows || [];
      renderProgramacao();
    });
  }
  /* ---------- painel do sistema (leitura; a RLS limita o que cada conta vê) ---------- */ function pad2(
    n
  ) {
    return n < 10 ? "0" + n : String(n);
  }
  function todayIso() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  function brDate(iso) {
    return String(iso).split("-").reverse().join("/");
  }
  function brDateTime(iso) {
    var d = new Date(iso);
    return isNaN(d)
      ? ""
      : d.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        });
  }
  function dashText(id, text) {
    $(id).textContent = text;
  }
  function dashBar(pct) {
    var bar = $("dash-avg-bar");
    var v = Math.max(0, Math.min(100, Math.round(pct)));
    bar.setAttribute("aria-valuenow", String(v));
    bar.setAttribute("aria-valuetext", v + "% concluído");
    $("dash-avg-fill").style.width = v + "%";
  }
  function dashItem(text, meta) {
    var li = el("li", "dash-item");
    li.appendChild(el("span", "dash-item-title", text));
    if (meta) li.appendChild(el("span", "help", meta));
    return li;
  }
  function renderDashboard(prog, est) {
    var hoje = todayIso();
    var ativas = prog.filter(function (p) {
      return p.ativo !== false;
    }).length;
    dashText("dash-prog-value", String(prog.length));
    dashText("dash-prog-help", ativas + " exibida(s) · " + (prog.length - ativas) + " oculta(s)");
    dashText("dash-est-value", String(est.length));
    var concluidos = est.filter(function (e) {
      return Number(e.progresso_pct) >= 100;
    }).length;
    dashText("dash-est-help", concluidos + " concluído(s)");
    var comProgresso = est.filter(function (e) {
      return e.progresso_pct != null;
    });
    if (comProgresso.length) {
      var media =
        comProgresso.reduce(function (s, e) {
          return s + Number(e.progresso_pct);
        }, 0) / comProgresso.length;
      dashText("dash-avg-value", Math.round(media) + "%");
      dashBar(media);
    } else {
      dashText("dash-avg-value", "–");
      dashBar(0);
    }
    var proximos = est
      .filter(function (e) {
        return e.ativo !== false && e.data_estudo >= hoje;
      })
      .sort(function (a, b) {
        return a.data_estudo === b.data_estudo
          ? String(a.hora_inicio).localeCompare(String(b.hora_inicio))
          : a.data_estudo.localeCompare(b.data_estudo);
      });
    dashText("dash-next-value", String(proximos.length));
    var nextList = $("dash-next");
    nextList.textContent = "";
    proximos.slice(0, 5).forEach(function (e) {
      var pct =
        e.progresso_pct == null
          ? "progresso não informado"
          : Math.round(Number(e.progresso_pct)) + "%";
      nextList.appendChild(
        dashItem(e.livro, brDate(e.data_estudo) + " · " + fmtHora(e.hora_inicio) + " · " + pct)
      );
    });
    $("dash-next-empty").hidden = proximos.length > 0;
    var recentList = $("dash-recent");
    recentList.textContent = "";
    est
      .slice()
      .sort(function (a, b) {
        return String(b.updated_at).localeCompare(String(a.updated_at));
      })
      .slice(0, 5)
      .forEach(function (e) {
        recentList.appendChild(dashItem(e.livro, brDateTime(e.updated_at)));
      });
    $("dash-recent-empty").hidden = est.length > 0;
    dashText(
      "dash-updated",
      "Atualizado às " +
        new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    );
  }
  function loadDashboard() {
    /* Cada consulta é independente: se uma falhar, o painel mostra o que chegou e não derruba o login. */ return Promise.all(
      [
        api("/rest/v1/programacao?select=id,ativo&order=ordem.asc").catch(function () {
          return null;
        }),
        api(
          "/rest/v1/estudos?select=id,livro,data_estudo,hora_inicio,progresso_pct,ativo,updated_at"
        ).catch(function () {
          return null;
        })
      ]
    ).then(function (res) {
      renderDashboard(res[0] || [], res[1] || []);
    });
  }
  /* ---------- telas ---------- */ function showLogin() {
    $("admin-login").hidden = false;
    $("admin-panel").hidden = true;
    $("logout").hidden = true;
    $("admin-session-info").textContent = "";
    $("login-email").focus();
  }
  function showPanel() {
    $("admin-login").hidden = true;
    $("admin-panel").hidden = false;
    $("logout").hidden = false;
    var papel = state.isAdmin ? "administrador" : "equipe";
    $("admin-session-info").textContent =
      "Conectado como " + (state.session.email || papel) + " (" + papel + ")";
  }
  /** Quem entra: administradores (admins) ou equipe (equipe). A RLS limita o que cada um grava. */ function loadAll() {
    status("Carregando…", false);
    var isAdmin = false;
    return api("/rest/v1/admins?select=user_id")
      .then(function (rows) {
        isAdmin = !!(rows && rows.length);
        return api("/rest/v1/equipe?select=papel");
      })
      .then(function (rows) {
        if (!isAdmin && !(rows && rows.length)) throw new Error("NOT_ADMIN");
        state.isAdmin = isAdmin;
        $("config-panel").hidden = !isAdmin;
        $("dash-panel").hidden = false;
        $("prog-panel").hidden = false;
        showPanel();
        if (!isAdmin) return null;
        /* Configuração do site: só administradores leem o rascunho completo. */ return api(
          "/rest/v1/site_settings?select=key,value"
        ).then(function (settings) {
          var published = {};
          (settings || []).forEach(function (r) {
            published[r.key] = r.value;
          });
          state.values = CONFIG.merge(published);
          rerender();
        });
      })
      .then(function () {
        return loadProgramacao();
      })
      .then(function () {
        return loadDashboard();
      })
      .then(function () {
        status(
          isAdmin
            ? "Carregado. Altere a programação ou a configuração e salve."
            : "Carregado. Você pode cadastrar, editar e remover atividades da programação.",
          false
        );
      });
  }
  function handleLogin(event) {
    event.preventDefault();
    var email = $("login-email").value.trim();
    var password = $("login-password").value;
    if (!EMAIL.test(email) || !password) {
      status("Informe e-mail e senha.", true);
      return;
    }
    var btn = $("login-submit");
    btn.disabled = true;
    signIn(email, password)
      .then(loadAll)
      .catch(function (err) {
        revokeRemote(state.session && state.session.access_token);
        setSession(null);
        status(
          err.message === "NOT_ADMIN"
            ? "Esta conta não tem permissão de acesso à administração."
            : "E-mail ou senha inválidos.",
          true
        );
        showLogin();
      })
      .then(function () {
        btn.disabled = false;
        $("login-password").value = "";
      });
  }
  function init() {
    document.documentElement.classList.add("js");
    if (!base || !ENV.supabaseAnonKey || !CONFIG) {
      status(
        "Supabase não configurado. Preencha web/assets/js/env.js para usar a administração.",
        true
      );
      $("admin-login").hidden = true;
      return;
    }
    $("login-form").addEventListener("submit", handleLogin);
    $("logout").addEventListener("click", signOut);
    $("prog-form").addEventListener("submit", saveProg);
    $("prog-cancel").addEventListener("click", function () {
      resetProgForm();
      status("Edição cancelada.", false);
    });
    var saved = getSession();
    if (saved && saved.access_token) {
      setSession(saved);
      loadAll().catch(function () {
        setSession(null);
        showLogin();
        status("Faça login novamente.", true);
      });
    } else {
      showLogin();
    }
  }
  init();
})();
