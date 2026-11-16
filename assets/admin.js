/* ============================================================
   پنل مدیریت — دریافت و مدیریت سفارش‌ها از گیت‌هاب
   ============================================================ */
"use strict";

var CFG = (typeof SITE_CONFIG !== "undefined") ? SITE_CONFIG : {};
var $ = function (s) { return document.querySelector(s); };
var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

var STATUSES = ["جدید", "در حال بررسی", "اعزام تکنسین", "انجام شد", "لغو شد"];
var ORDERS_DIR = "data/orders";
var orders = []; /* {data, path, sha, name} */
var activeFilter = "همه";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function toast(msg, ms) {
  var t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(function () { t.classList.remove("show"); }, ms || 3200);
}
function digitsFa(str) {
  return String(str).replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); });
}

/* ---------- ورود ---------- */
(function loginGate() {
  var ok = sessionStorage.getItem("tasisat_admin") === "ok";
  if (ok) showDash();

  function tryLogin() {
    var v = $("#passInput").value;
    if (v && v === String(CFG.adminPass || "")) {
      sessionStorage.setItem("tasisat_admin", "ok");
      showDash();
    } else {
      $("#loginError").style.display = "block";
    }
  }
  $("#loginBtn").addEventListener("click", tryLogin);
  $("#passInput").addEventListener("keydown", function (e) { if (e.key === "Enter") tryLogin(); });
})();

function showDash() {
  $("#loginWrap").style.display = "none";
  $("#dash").style.display = "";
  if (!CFG.ordersRepo || !CFG.githubToken) $("#setupWarn").style.display = "block";
  buildChips();
  loadOrders();
  $("#logoutBtn").addEventListener("click", function () {
    sessionStorage.removeItem("tasisat_admin");
    location.reload();
  });
  $("#refreshBtn").addEventListener("click", loadOrders);
  $("#searchInput").addEventListener("input", renderOrders);
  $("#csvBtn").addEventListener("click", exportCsv);
}

/* ---------- گیت‌هاب ---------- */
function gh(path, method, body) {
  return fetch("https://api.github.com" + path, {
    method: method || "GET",
    headers: {
      "Authorization": "Bearer " + CFG.githubToken,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: body ? JSON.stringify(body) : undefined
  }).then(function (res) {
    return res.json().catch(function () { return {}; }).then(function (j) {
      return { ok: res.ok, status: res.status, json: j };
    });
  });
}

function loadOrders() {
  $("#orderList").innerHTML = '<div class="empty"><span class="spinner"></span><br>در حال دریافت سفارش‌ها از گیت‌هاب...</div>';
  if (!CFG.ordersRepo || !CFG.githubToken) {
    $("#orderList").innerHTML = '<div class="empty">سفارش‌ها در چت بات شما در بله ثبت می‌شوند؛ مشتری فرم سایت را پر می‌کند و متن سفارش را در چت بات می‌فرستد و پاسخ‌گوی خودکار هر ۲ دقیقه آن را به چت شما فوروارد می‌کند.<br><a class="btn btn-primary" style="display:inline-flex;margin-top:14px" href="https://ble.ir/' + esc(CFG.baleUsername || "tasisatrozbot") + '" target="_blank" rel="noopener">مشاهده سفارش‌ها در بله</a></div>';
    renderStats();
    return;
  }
  gh("/repos/" + CFG.ordersRepo + "/contents/" + ORDERS_DIR).then(function (r) {
    if (!r.ok) {
      var msg = "خطا در دریافت لیست سفارش‌ها (کد " + r.status + ").";
      if (r.status === 401 || r.status === 403) msg = "توکن نامعتبر است یا دسترسی لازم را ندارد.";
      if (r.status === 404) msg = "پوشه data/orders هنوز در مخزن ساخته نشده؛ با ثبت اولین سفارش ساخته می‌شود.";
      $("#orderList").innerHTML = '<div class="empty">' + esc(msg) + "</div>";
      renderStats();
      return;
    }
    var files = r.json.filter(function (x) { return x.type === "file" && /\.json$/i.test(x.name); })
      .sort(function (a, b) { return b.name.localeCompare(a.name); });
    if (!files.length) {
      $("#orderList").innerHTML = '<div class="empty">هنوز سفارشی ثبت نشده است.<br>از صفحه اصلی یک سفارش آزمایشی ثبت کنید.</div>';
      renderStats();
      return;
    }
    /* دریافت محتوای هر فایل */
    var results = [], pending = files.length;
    files.forEach(function (f) {
      gh("/repos/" + CFG.ordersRepo + "/contents/" + f.path).then(function (fr) {
        if (fr.ok && fr.json.content) {
          try {
            var txt = decodeURIComponent(escape(atob(fr.json.content.replace(/\n/g, ""))));
            results.push({ data: JSON.parse(txt), path: f.path, sha: fr.json.sha, name: f.name });
          } catch (e) { /* فایل خراب: نادیده گرفته می‌شود */ }
        }
      }).catch(function () {}).then(function () {
        pending--;
        if (pending === 0) {
          results.sort(function (a, b) { return String(b.data.createdAt || "").localeCompare(String(a.data.createdAt || "")); });
          orders = results;
          renderStats();
          renderOrders();
          toast("سفارش‌ها به‌روز شدند");
        }
      });
    });
  });
}

/* ---------- نمایش ---------- */
function renderStats() {
  $("#stTotal").textContent = orders.length;
  $("#stNew").textContent = orders.filter(function (o) { return o.data.status === "جدید"; }).length;
  var today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  $("#stToday").textContent = orders.filter(function (o) {
    var d = o.data.trackingCode || "";
    return d.indexOf("PK-" + today) === 0;
  }).length;
}

function buildChips() {
  var opts = ["همه"].concat(STATUSES);
  $("#statusChips").innerHTML = opts.map(function (s) {
    return '<button class="chip' + (s === activeFilter ? " active" : "") + '" data-st="' + esc(s) + '">' + esc(s) + "</button>";
  }).join("");
  $("#statusChips").addEventListener("click", function (e) {
    var b = e.target.closest(".chip");
    if (!b) return;
    activeFilter = b.getAttribute("data-st");
    buildChips();
    renderOrders();
  });
}

function statusClass(s) {
  return "st-" + String(s).replace(/\s+/g, "-");
}

function renderOrders() {
  var q = digitsFa($("#searchInput").value.trim().toLowerCase());
  var list = orders.filter(function (o) {
    if (activeFilter !== "همه" && (o.data.status || "جدید") !== activeFilter) return false;
    if (!q) return true;
    return [o.data.name, o.data.phone, o.data.trackingCode, o.data.city, o.data.service]
      .join(" ").toLowerCase().indexOf(q) !== -1;
  });
  if (!list.length) {
    $("#orderList").innerHTML = '<div class="empty">سفارشی با این فیلترها پیدا نشد.</div>';
    return;
  }
  $("#orderList").innerHTML = list.map(function (o, idx) {
    var d = o.data;
    var st = d.status || "جدید";
    return '<div class="order-card" data-idx="' + idx + '">' +
      '<div class="order-head">' +
      '<span class="o-name">' + esc(d.name) + '</span>' +
      '<span class="o-meta">' + esc(d.phone) + '</span>' +
      '<span class="o-meta">' + esc(d.service || "") + '</span>' +
      '<span class="o-meta">' + esc(d.createdAt || "") + '</span>' +
      '<span class="o-status ' + statusClass(st) + '" style="margin-inline-start:auto">' + esc(st) + '</span>' +
      "</div>" +
      '<div class="order-body">' +
      '<div class="kv"><b>کد پیگیری: </b><span style="direction:ltr;display:inline-block">' + esc(d.trackingCode || "") + "</span></div>" +
      '<div class="kv"><b>شهر/منطقه: </b>' + esc(d.city || "—") + "</div>" +
      '<div class="kv"><b>آدرس: </b>' + esc(d.address || "—") + "</div>" +
      '<div class="kv"><b>برند/مدل: </b>' + esc(d.brand || "—") + " / " + esc(d.model || "—") + "</div>" +
      '<div class="kv"><b>کد خطا: </b>' + esc(d.errorCode || "—") + "</div>" +
      '<div class="kv"><b>زمان مراجعه: </b>' + esc(d.when || "—") + "</div>" +
      '<div class="kv"><b>شرح مشکل: </b>' + esc(d.description || "—") + "</div>" +
      '<div class="order-actions">' +
      '<select data-act="status" data-i="' + idx + '">' +
      STATUSES.map(function (s) { return '<option' + (s === st ? " selected" : "") + ">" + s + "</option>"; }).join("") +
      "</select>" +
      '<button class="small-btn primary" data-act="save" data-i="' + idx + '">ثبت وضعیت</button>' +
      '<a class="tel-link" href="tel:' + esc(d.phone) + '">تماس با مشتری</a>' +
      '<button class="small-btn" data-act="del" data-i="' + idx + '" style="background:#FDECEC;color:#8A1C1C;margin-inline-start:auto">حذف سفارش</button>' +
      "</div></div></div>";
  }).join("");

  /* باز و بسته کردن کارت‌ها */
  $$("#orderList .order-head").forEach(function (h) {
    h.addEventListener("click", function () { h.parentElement.classList.toggle("open"); });
  });
  /* تغییر وضعیت */
  $$('#orderList [data-act="status"]').forEach(function (sel) {
    sel.addEventListener("click", function (e) { e.stopPropagation(); });
  });
  $$('#orderList [data-act="save"]').forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var i = Number(btn.getAttribute("data-i"));
      var sel = btn.closest(".order-body").querySelector('[data-act="status"]');
      updateStatus(i, sel.value);
    });
  });
  $$('#orderList [data-act="del"]').forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var i = Number(btn.getAttribute("data-i"));
      if (confirm("این سفارش برای همیشه حذف شود؟")) removeOrder(i);
    });
  });
}

/* ---------- عملیات ---------- */
function utf8b64(str) {
  var bytes = new TextEncoder().encode(str), bin = "";
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function updateStatus(i, newStatus) {
  var o = orders[i];
  if (!o) return;
  var d = o.data;
  d.status = newStatus;
  d.history = d.history || [];
  var now;
  try { now = new Date().toLocaleString("fa-IR"); } catch (e) { now = new Date().toISOString(); }
  d.history.push({ status: newStatus, at: now });
  toast("در حال ذخیره وضعیت...");
  gh("/repos/" + CFG.ordersRepo + "/contents/" + o.path, "PUT", {
    message: "تغییر وضعیت سفارش " + (d.trackingCode || "") + " به " + newStatus,
    content: utf8b64(JSON.stringify(d, null, 2)),
    sha: o.sha
  }).then(function (r) {
    if (r.ok) {
      o.sha = r.json.content ? r.json.content.sha : o.sha;
      o.data = d;
      renderOrders();
      renderStats();
      toast("وضعیت به «" + newStatus + "» تغییر کرد");
    } else {
      toast("ذخیره ناموفق بود (کد " + r.status + ")؛ دوباره تلاش کنید", 5000);
    }
  });
}

function removeOrder(i) {
  var o = orders[i];
  if (!o) return;
  toast("در حال حذف...");
  gh("/repos/" + CFG.ordersRepo + "/contents/" + o.path, "DELETE", {
    message: "حذف سفارش " + (o.data.trackingCode || o.name),
    sha: o.sha
  }).then(function (r) {
    if (r.ok) {
      orders.splice(i, 1);
      renderOrders();
      renderStats();
      toast("سفارش حذف شد");
    } else {
      toast("حذف ناموفق بود (کد " + r.status + ")", 5000);
    }
  });
}

/* ---------- خروجی CSV ---------- */
function exportCsv() {
  if (!orders.length) { toast("سفارشی برای خروجی وجود ندارد"); return; }
  var cols = ["trackingCode", "createdAt", "name", "phone", "city", "address", "service", "brand", "model", "errorCode", "when", "description", "status"];
  var head = ["کد پیگیری", "زمان ثبت", "نام", "تلفن", "شهر", "آدرس", "خدمت", "برند", "مدل", "کد خطا", "زمان مراجعه", "شرح", "وضعیت"];
  var rows = [head];
  orders.forEach(function (o) {
    rows.push(cols.map(function (c) { return String(o.data[c] == null ? "" : o.data[c]); }));
  });
  var csv = "\uFEFF" + rows.map(function (r) {
    return r.map(function (c) { return '"' + c.replace(/"/g, '""') + '"'; }).join(",");
  }).join("\r\n");
  var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "orders.csv";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("فایل CSV دانلود شد");
}
