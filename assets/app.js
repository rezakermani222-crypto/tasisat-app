/* ============================================================
   اپلیکیشن مشتری — تاسیسات
   ============================================================ */
"use strict";

var CFG = (typeof SITE_CONFIG !== "undefined") ? SITE_CONFIG : {};
var $ = function (s) { return document.querySelector(s); };
var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

/* ---------- ابزارها ---------- */
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
  t._h = setTimeout(function () { t.classList.remove("show"); }, ms || 3500);
}
function digitsFa(str) {
  return String(str).replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); });
}
function trackingCode() {
  var d = new Date();
  var p = function (n) { return (n < 10 ? "0" : "") + n; };
  var ymd = "" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  var rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return "PK-" + ymd + "-" + rnd;
}
function nowString() {
  try { return new Date().toLocaleString("fa-IR"); } catch (e) { return new Date().toISOString(); }
}
function utf8b64(str) {
  var bytes = new TextEncoder().encode(str), bin = "";
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/* ---------- پیکربندی صفحه ---------- */
(function applyConfig() {
  var name = CFG.businessName || "خدمات تاسیسات ساختمان";
  var phone = CFG.phone || "";
  document.title = name + " | نصب، سرویس و تعمیر پکیج دیواری";
  $("#brandName").textContent = name;
  $("#brandTag").textContent = CFG.tagline || "";
  $("#heroTitle").textContent = CFG.tagline || name;
  $("#footName").textContent = name;
  $("#footAddr").textContent = CFG.address ? ("آدرس: " + CFG.address) : "";
  $("#footHours").textContent = CFG.workingHours ? ("ساعت کاری: " + CFG.workingHours) : "";
  if (phone) {
    ["#callTop", "#callHero", "#footPhone", "#callAfter"].forEach(function (sel) {
      var el = $(sel); if (el) { el.href = "tel:" + phone; }
    });
    $("#footPhone").textContent = phone;
  }
  var baleUrl = "https://ble.ir/" + (CFG.baleUsername || "tasisatrozbot");
  ["#baleHero", "#footBale"].forEach(function (sel) {
    var el = $(sel); if (el) { el.href = baleUrl; }
  });
  var footBale = $("#footBale");
  if (footBale) footBale.textContent = "ble.ir/" + (CFG.baleUsername || "tasisatrozbot");
})();

/* ---------- ناوبری ---------- */
var TABS = [
  { id: "home", label: "خانه", icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>' },
  { id: "packages", label: "پکیج‌ها", icon: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>' },
  { id: "errors", label: "بانک خطا", icon: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/>' },
  { id: "guides", label: "راهنما", icon: '<path d="M4 4h9a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3z"/><path d="M4 4v19"/><path d="M20 6h-4v14h4z"/>' },
  { id: "order", label: "ثبت سفارش", icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>' }
];
function svgIcon(path) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
}
(function buildNav() {
  $("#navbar").innerHTML = TABS.map(function (t) {
    return '<button data-goto="' + t.id + '" role="link">' + svgIcon(t.icon) + esc(t.label) + '</button>';
  }).join("");
  $("#tabbar").innerHTML = TABS.map(function (t) {
    return '<button data-goto="' + t.id + '">' + svgIcon(t.icon) + '<span>' + esc(t.label) + '</span></button>';
  }).join("");
})();

function goto(tab) {
  if (!TABS.some(function (t) { return t.id === tab; })) tab = "home";
  $$(".page").forEach(function (p) { p.classList.remove("active"); });
  var pg = $("#page-" + tab);
  if (pg) pg.classList.add("active");
  $$("[data-goto]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-goto") === tab); });
  window.scrollTo({ top: 0 });
  if (location.hash !== "#/" + tab) location.hash = "#/" + tab;
}
document.addEventListener("click", function (e) {
  var b = e.target.closest("[data-goto]");
  if (b) goto(b.getAttribute("data-goto"));
});
(function initHash() {
  var h = (location.hash || "").replace("#/", "");
  goto(h || "home");
})();
window.addEventListener("hashchange", function () {
  var h = (location.hash || "").replace("#/", "");
  goto(h || "home");
});

/* ---------- خانه: خدمات و چرا ما ---------- */
var SERVICES = [
  { t: "نصب پکیج دیواری", d: "نصب استاندارد با تست نشتی گاز و آب، تنظیم اولیه و راه‌اندازی کامل در محل شما." },
  { t: "سرویس سالانه", d: "تمیزکاری مشعل و مبدل، چک فشار و هواگیری، بازدید ایمنی و تنظیم بازده دستگاه." },
  { t: "تعمیر و رفع خطا", d: "عیب‌یابی همه برندها با مراجعه حضوری و همراه داشتن قطعات احتمالی بر اساس کد خطا." },
  { t: "هواگیری و تنظیم فشار", d: "خارج کردن هوای مدار، تنظیم فشار روی حد استاندارد و رفع صداهای غیرعادی." }
];
var WHY = [
  { t: "تکنسین مجرب", d: "با سال‌ها تجربه کار روی انواع پکیج‌های ایرانی و خارجی." },
  { t: "قیمت شفاف", d: "قبل از شروع کار، هزینه را اعلام می‌کنیم؛ بدون هزینه پنهان." },
  { t: "سرویس سریع", d: "سفارش‌های ثبت‌شده در اولین فرصت و به‌ترتیب فوریت پاسخ داده می‌شوند." },
  { t: "ضمانت خدمات", d: "کار انجام‌شده تا زمان توافق‌شده ضمانت دارد؛ قطعات از بازار معتبر." }
];
$("#svcGrid").innerHTML = SERVICES.map(function (s) {
  return '<div class="svc"><div class="ic">' + svgIcon('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>') + '</div><div><h3>' + esc(s.t) + '</h3><p>' + esc(s.d) + '</p></div></div>';
}).join("");
$("#whyGrid").innerHTML = WHY.map(function (s) {
  return '<div class="svc"><div class="ic">' + svgIcon('<polyline points="20 6 9 17 4 12"/>') + '</div><div><h3>' + esc(s.t) + '</h3><p>' + esc(s.d) + '</p></div></div>';
}).join("");

/* ---------- کاتالوگ پکیج‌ها ---------- */
$("#typeList").innerHTML = BOILER_TYPES.map(function (t) {
  return '<div class="card type-card">' +
    '<img src="' + esc(t.img) + '" alt="' + esc(t.title) + '" loading="lazy">' +
    '<div class="tc-body"><h3>' + esc(t.title) + '</h3><p>' + esc(t.desc) + '</p>' +
    '<ul>' + t.features.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join("") + '</ul>' +
    '<div class="suit">مناسب برای: ' + esc(t.suitable) + '</div></div></div>';
}).join("");
$("#capTable tbody").innerHTML = CAPACITY_TABLE.rows.map(function (r) {
  return '<tr><td>' + esc(r.area) + '</td><td>' + esc(r.radiators) + '</td><td>' + esc(r.capacity) + '</td></tr>';
}).join("");
$("#capNote").textContent = CAPACITY_TABLE.note;
$("#brandGrid").innerHTML = BRANDS.map(function (b) {
  return '<div class="brand-chip"><div class="b-name">' + esc(b.name) + (b.err ? '<span class="err-dot">بانک خطا دارد</span>' : "") + '</div><p>' + esc(b.desc) + '</p></div>';
}).join("");

/* ---------- بانک خطا ---------- */
(function buildErrorBank() {
  var sel = $("#errBrand");
  sel.innerHTML = '<option value="">همه برندها</option>' + ERROR_BANK.map(function (b) {
    return '<option value="' + esc(b.brand) + '">' + esc(b.brand) + '</option>';
  }).join("");

  var WHO_TXT = { user: "خودتان می‌توانید انجام دهید", mix: "اول خودتان؛ تکرار شد تکنسین", tech: "نیاز به تکنسین" };
  var SEV_TXT = { low: "خطای ساده", med: "مهم", high: "حساس و فوری" };
  var currentBrand = "";
  var currentQ = "";

  function normalizeCode(s) {
    return digitsFa(String(s || "")).toUpperCase().replace(/\s+/g, "").replace(/[()\-\/]/g, "");
  }
  function render() {
    var list = [];
    ERROR_BANK.forEach(function (b) {
      if (currentBrand && b.brand !== currentBrand) return;
      var note = b.note ? '<p class="notice notice-blue" style="margin-bottom:10px">' + esc(b.note) + '</p>' : "";
      var cards = b.codes.filter(function (c) {
        if (!currentQ) return true;
        var q = currentQ.toLowerCase();
        return (c.c + " " + c.t + " " + c.cause + " " + (c.m || "")).toLowerCase().indexOf(q) !== -1 ||
               normalizeCode(c.c).indexOf(normalizeCode(currentQ)) !== -1;
      });
      if (currentQ && !cards.length) return;
      list.push('<h3 class="section-title" style="margin-top:18px">' + esc(b.brand) + '</h3>' + note);
      if (!cards.length) {
        list.push('<p style="color:var(--muted);font-size:.85rem">موردی یافت نشد.</p>');
      }
      cards.forEach(function (c) {
        list.push('<div class="err-card">' +
          '<button class="err-head" type="button" aria-expanded="false">' +
          '<span class="err-code">' + esc(c.c) + '</span>' +
          '<span class="err-title">' + esc(c.t) + '</span>' +
          '<span class="sev sev-' + c.sev + '">' + SEV_TXT[c.sev] + '</span>' +
          '<svg class="err-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
          '</button>' +
          '<div class="err-body">' +
          '<div class="row"><b>علت: </b>' + esc(c.cause) + '</div>' +
          '<div class="row"><b>اقدام: </b>' + esc(c.act) + '</div>' +
          '<div class="row" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
          '<span class="who">' + WHO_TXT[c.who] + '</span>' +
          (c.m ? '<span class="model-tag">مدل‌ها: ' + esc(c.m) + '</span>' : "") +
          '</div></div></div>');
      });
    });
    $("#errList").innerHTML = list.join("");
  }
  render();

  $("#errList").addEventListener("click", function (e) {
    var head = e.target.closest(".err-head");
    if (!head) return;
    var card = head.parentElement;
    card.classList.toggle("open");
    head.setAttribute("aria-expanded", card.classList.contains("open") ? "true" : "false");
  });
  sel.addEventListener("change", function () { currentBrand = sel.value; render(); });
  $("#errSearch").addEventListener("input", function () {
    currentQ = this.value.trim(); render();
  });
})();

/* ---------- راهنماها ---------- */
$("#guideList").innerHTML = GUIDES.map(function (g, i) {
  var body = g.body.map(function (blk) {
    if (blk.h) return "<h4>" + esc(blk.h) + "</h4>";
    if (blk.p) return "<p>" + esc(blk.p) + "</p>";
    if (blk.ul) return "<ul>" + blk.ul.map(function (li) { return "<li>" + esc(li) + "</li>"; }).join("") + "</ul>";
    if (blk.warn) return '<div class="warn">' + esc(blk.warn) + "</div>";
    return "";
  }).join("");
  return '<div class="guide-card" id="guide-' + g.id + '">' +
    '<button class="guide-head" type="button" aria-expanded="false">' + esc((i + 1) + ". " + g.title) +
    '<svg class="err-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
    '</button><div class="guide-body">' + body + "</div></div>";
}).join("");
$("#guideList").addEventListener("click", function (e) {
  var head = e.target.closest(".guide-head");
  if (!head) return;
  var card = head.parentElement;
  card.classList.toggle("open");
  head.setAttribute("aria-expanded", card.classList.contains("open") ? "true" : "false");
});

/* ---------- فرم سفارش ---------- */
(function orderForm() {
  var brandSel = $("#fBrand");
  brandSel.innerHTML = '<option value="">ندارم / نمی‌دانم</option>' +
    '<option value="بوتان">بوتان</option><option value="ایران رادیاتور">ایران رادیاتور</option>' +
    '<option value="گلریا (گلدیران)">گلریا (گلدیران)</option><option value="لورچ">لورچ</option>' +
    '<option value="بوش">بوش</option><option value="پکیج 2000">پکیج 2000</option>' +
    '<option value="ایویلر">ایویلر</option><option value="البرز">البرز</option>' +
    '<option value="تانکی">تانکی</option><option value="سایر">سایر</option>';

  /* امتیاز: نمایش سریع معنی کد خطا هنگام تایپ */
  function findError(brand, code) {
    var nc = digitsFa(code).toUpperCase().replace(/\s+/g, "");
    if (!nc) return null;
    var pools = ERROR_BANK.filter(function (b) { return !brand || b.brand === brand; });
    if (brand) pools = pools.concat(ERROR_BANK.filter(function (b) { return b.brand !== brand; }));
    for (var i = 0; i < pools.length; i++) {
      for (var j = 0; j < pools[i].codes.length; j++) {
        var c = pools[i].codes[j];
        var variants = normalizeAll(c.c);
        for (var k = 0; k < variants.length; k++) {
          if (variants[k] === nc) return { brand: pools[i].brand, code: c };
        }
      }
    }
    return null;
  }
  function normalizeAll(c) {
    return digitsFa(String(c)).toUpperCase().split(/[\/\-]/).map(function (x) { return x.replace(/\s+/g, ""); }).filter(Boolean)
      .concat([digitsFa(String(c)).toUpperCase().replace(/\s+/g, "").replace(/[()\-\/]/g, "")]);
  }
  function hint() {
    var code = $("#fCode").value.trim();
    var brand = $("#fBrand").value;
    var box = $("#codeHint");
    if (!code) { box.textContent = ""; return; }
    var hit = findError(brand, code);
    box.textContent = hit ? ("احتمالاً: " + hit.code.t + " — در بانک خطا بخش «" + hit.brand + "» بیشتر بخوانید.") : "";
    box.style.color = hit ? "var(--teal-dark)" : "";
  }
  $("#fCode").addEventListener("input", hint);
  $("#fBrand").addEventListener("change", hint);

  /* اعتبارسنجی */
  function validate(data) {
    var errs = [];
    if (!data.name || data.name.trim().length < 3) errs.push("نام و نام خانوادگی را کامل بنویسید.");
    var ph = digitsFa(data.phone || "").replace(/\D/g, "");
    if (!/^09\d{9}$/.test(ph)) errs.push("شماره تماس باید ۱۱ رقم و با ۰۹ شروع شود.");
    if (!data.city || data.city.trim().length < 2) errs.push("شهر یا منطقه را بنویسید.");
    if (!data.service) errs.push("نوع خدمت را انتخاب کنید.");
    return errs;
  }

  /* ارسال به گیت‌هاب */
  function ghRequest(path, method, body) {
    return fetch("https://api.github.com" + path, {
      method: method,
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

  /* اعلان فوری سفارش در پیام‌رسان بله (بدون نیاز به سرور)
     سرور بله هدر CORS ندارد؛ پس پیام با mode:no-cors ارسال می‌شود و پاسخ قابل خواندن نیست،
     ولی خود پیام به‌درستی تحویل داده می‌شود. تا baleChatId در config.js خالی است، این تابع کاری نمی‌کند. */
  function baleNotify(data, track) {
    var token = CFG.baleBotToken, chat = CFG.baleChatId;
    if (!token || !chat) return;
    var lines = [
      "سفارش جدید از اپلیکیشن",
      "کد پیگیری: " + track,
      "",
      "نام: " + data.name,
      "تلفن: " + data.phone,
      "شهر/منطقه: " + data.city,
      "آدرس: " + (data.address || "-"),
      "خدمت: " + data.service,
      "برند: " + (data.brand || "-") + (data.model ? " | مدل: " + data.model : ""),
      "کد خطا: " + (data.errorCode || "-"),
      "زمان مراجعه: " + (data.when || "-"),
      "شرح: " + (data.description || "-"),
      "زمان ثبت: " + (data.createdAt || nowString())
    ];
    try {
      fetch("https://tapi.bale.ai/bot" + token + "/sendMessage", {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ chat_id: chat, text: lines.join("\n") })
      });
    } catch (e) { /* بله اختیاری است؛ خطا نباید ثبت سفارش را متوقف کند */ }
  }

  function mailtoFallback(data, track) {
    var email = CFG.adminEmail || "";
    var body = "سفارش جدید (" + track + ")\n\n" +
      "نام: " + data.name + "\n" +
      "تلفن: " + data.phone + "\n" +
      "شهر/منطقه: " + data.city + "\n" +
      "آدرس: " + (data.address || "-") + "\n" +
      "خدمت: " + data.service + "\n" +
      "برند: " + (data.brand || "-") + " | مدل: " + (data.model || "-") + "\n" +
      "کد خطا: " + (data.errorCode || "-") + "\n" +
      "زمان مراجعه: " + (data.when || "-") + "\n" +
      "شرح: " + (data.description || "-") + "\n" +
      "زمان ثبت: " + (data.createdAt || nowString());
    var url = "mailto:" + email + "?subject=" + encodeURIComponent("سفارش جدید " + track) + "&body=" + encodeURIComponent(body);
    window.location.href = url;
  }

  function showStatus(kind, msg) {
    var st = $("#formStatus");
    st.className = "form-status " + kind;
    st.innerHTML = msg;
    st.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  $("#orderForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    var data = {
      name: f.name.value.trim(),
      phone: digitsFa(f.phone.value).replace(/\D/g, ""),
      city: f.city.value.trim(),
      address: f.address.value.trim(),
      service: f.service.value,
      brand: f.brand.value,
      model: f.model.value.trim(),
      errorCode: digitsFa(f.errorCode.value).toUpperCase().trim(),
      when: f.when.value,
      description: f.description.value.trim()
    };
    var errs = validate(data);
    if (errs.length) { showStatus("err", errs.map(esc).join("<br>")); return; }

    var track = trackingCode();
    var btn = $("#submitBtn");
    btn.disabled = true;
    var oldHtml = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> در حال ارسال...';

    var ghReady = CFG.ordersRepo && CFG.githubToken;

    function finishOk() {
      baleNotify(data, track);
      btn.disabled = false;
      btn.innerHTML = oldHtml;
      f.style.display = "none";
      $("#formStatus").className = "form-status";
      $("#trackCode").textContent = track;
      $("#successBox").classList.add("show");
      toast("سفارش با موفقیت ثبت شد");
    }

    if (ghReady) {
      var order = Object.assign({}, data, {
        id: track,
        trackingCode: track,
        createdAt: nowString(),
        status: "جدید",
        history: [{ status: "جدید", at: nowString() }]
      });
      var fname = "order-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + track.split("-")[2] + ".json";
      var path = "/repos/" + CFG.ordersRepo + "/contents/data/orders/" + fname;
      ghRequest(path, "PUT", {
        message: "سفارش جدید " + track,
        content: utf8b64(JSON.stringify(order, null, 2))
      }).then(function (r) {
        if (r.ok) { finishOk(); return; }
        if (r.status === 409 || r.status === 422) { /* تلاش مجدد با نام جدید */
          fname = "order-" + Date.now() + "-" + track.split("-")[2] + ".json";
          return ghRequest("/repos/" + CFG.ordersRepo + "/contents/data/orders/" + fname, "PUT", {
            message: "سفارش جدید " + track,
            content: utf8b64(JSON.stringify(order, null, 2))
          }).then(function (r2) {
            if (r2.ok) finishOk();
            else fail(r2);
          });
        }
        fail(r);
      }).catch(function () { fail(null); });

      function fail(r) {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
        var why = "ارتباط با گیت‌هاب برقرار نشد.";
        if (r && (r.status === 401 || r.status === 403)) why = "توکن گیت‌هاب نامعتبر است یا دسترسی ندارد (کد " + r.status + ").";
        else if (r && r.status === 404) why = "مخزن سفارش‌ها پیدا نشد؛ ordersRepo را در config.js چک کنید.";
        showStatus("err", esc(why) + '<br>مقدار تنظیم‌شده در config.js را طبق راهنما بررسی کنید یا سفارش را با ایمیل بفرستید:<br><a href="#" id="mailNow">ارسال سفارش با ایمیل</a>');
        var m = $("#mailNow");
        if (m) m.addEventListener("click", function (ev) { ev.preventDefault(); mailtoFallback(data, track); });
      }
    } else {
      /* حالت ایمیل: توکن تنظیم نشده */
      baleNotify(data, track);
      mailtoFallback(data, track);
      btn.disabled = false;
      btn.innerHTML = oldHtml;
      showStatus("ok", "اپ ایمیل با متن کامل سفارش باز شد؛ فقط ایمیل را ارسال کنید.<br>اگر اپ ایمیل باز نشد، برای اطمینان با شماره " +
        esc(CFG.phone || "") + " تماس بگیرید. (برای ذخیره خودکار سفارش‌ها در گیت‌هاب، توکن را طبق راهنمای PDF در config.js تنظیم کنید.)");
    }
  });

  $("#againBtn").addEventListener("click", function () {
    $("#successBox").classList.remove("show");
    var f = $("#orderForm");
    f.reset();
    $("#codeHint").textContent = "";
    f.style.display = "";
  });
})();
