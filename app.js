// AltFinder — vanilla JS, no libraries. Data comes from data.js (const APPS).
(function () {
  "use strict";

  var PLATFORMS = ["All", "Android", "iPhone", "Windows", "Mac", "Linux", "Web"];
  var PRICES = ["All", "Free", "Freemium", "Open Source", "Paid"];

  function slug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  APPS.forEach(function (a) { a.slug = slug(a.name); });
  var bySlug = {};
  APPS.forEach(function (a) { bySlug[a.slug] = a; });

  // Likes persist on the device only.
  var likes = {};
  try { likes = JSON.parse(localStorage.getItem("altfinder_likes") || "{}"); } catch (e) { likes = {}; }
  function saveLikes() {
    try { localStorage.setItem("altfinder_likes", JSON.stringify(likes)); } catch (e) {}
  }
  function altKey(app, alt) { return app.slug + "::" + alt[0]; }
  function altLikes(app, alt) { return alt[4] + (likes[altKey(app, alt)] ? 1 : 0); }
  function appLikes(app) {
    return app.alts.reduce(function (sum, alt) { return sum + altLikes(app, alt); }, 0);
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function fmt(n) { return n.toLocaleString("en-US"); }
  function badge(price) {
    var cls = price.toLowerCase().replace(/\s+/g, "");
    return '<span class="badge badge-' + cls + '">' + esc(price) + "</span>";
  }

  // UI state
  var currentCat = "All";
  var searchText = "";
  var filterPlat = "All";
  var filterPrice = "All";

  var appEl = document.getElementById("app");
  var chipsEl = document.getElementById("chips");
  var searchEl = document.getElementById("search");

  function categories() {
    var seen = [], map = {};
    APPS.forEach(function (a) {
      if (!map[a.cat]) { map[a.cat] = true; seen.push(a.cat); }
    });
    return ["All"].concat(seen);
  }

  function renderChips() {
    chipsEl.innerHTML = categories().map(function (c) {
      return '<button class="chip' + (c === currentCat ? " active" : "") +
        '" data-cat="' + esc(c) + '">' + esc(c) + "</button>";
    }).join("");
    Array.prototype.forEach.call(chipsEl.querySelectorAll(".chip"), function (btn) {
      btn.addEventListener("click", function () {
        currentCat = btn.getAttribute("data-cat");
        if (location.hash && location.hash !== "#/") { location.hash = "#/"; }
        renderChips();
        renderHome();
      });
    });
  }

  function visibleApps() {
    var q = searchText.trim().toLowerCase();
    return APPS.filter(function (a) {
      if (currentCat !== "All" && a.cat !== currentCat) return false;
      if (q && a.name.toLowerCase().indexOf(q) === -1 &&
          a.cat.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function renderHome() {
    var list = visibleApps();
    var html = '<div class="section-title">' +
      (currentCat === "All" ? "Popular apps" : esc(currentCat)) +
      ' <span class="muted">(' + list.length + ' apps, ' +
      APPS.reduce(function (s, a) { return s + a.alts.length; }, 0) +
      ' alternatives)</span></div>';
    if (!list.length) {
      html += '<div class="empty">No apps match your search yet. Try another name.</div>';
    } else {
      html += '<div class="grid">' + list.map(function (a) {
        return '<a class="card" href="#/app/' + a.slug + '">' +
          "<h3>" + esc(a.name) + "</h3>" +
          '<div class="cat">' + esc(a.cat) + "</div>" +
          badge(a.price) +
          '<div class="plats">' + esc(a.plat.join(" · ")) + "</div>" +
          '<div class="meta"><span>' + a.alts.length + ' alternatives</span>' +
          '<span><span class="heart">♥</span> ' + fmt(appLikes(a)) + "</span></div>" +
          "</a>";
      }).join("") + "</div>";
    }
    appEl.innerHTML = html;
  }

  function renderDetail(app) {
    var alts = app.alts.slice().sort(function (x, y) {
      return altLikes(app, y) - altLikes(app, x);
    });
    var filtered = alts.filter(function (alt) {
      if (filterPlat !== "All") {
        var plats = alt[2].split(" · ");
        if (plats.indexOf(filterPlat) === -1) return false;
      }
      if (filterPrice !== "All" && alt[1] !== filterPrice) return false;
      return true;
    });

    var html = '<a class="back-link" href="#/">← All apps</a>' +
      '<div class="detail-head"><h2>' + esc(app.name) + "</h2>" +
      badge(app.price) +
      '<div class="plats">' + esc(app.plat.join(" · ")) + " · " + esc(app.cat) + "</div>" +
      '<p class="desc">' + esc(app.desc) + "</p></div>" +
      '<div class="section-title">Alternatives to ' + esc(app.name) +
      ' <span class="muted">(' + filtered.length + " shown)</span></div>" +
      '<div class="filters">' +
      '<select id="f-plat">' + PLATFORMS.map(function (p) {
        return '<option value="' + p + '"' + (p === filterPlat ? " selected" : "") +
          ">Platform: " + p + "</option>";
      }).join("") + "</select>" +
      '<select id="f-price">' + PRICES.map(function (p) {
        return '<option value="' + p + '"' + (p === filterPrice ? " selected" : "") +
          ">Price: " + p + "</option>";
      }).join("") + "</select></div>";

    if (!filtered.length) {
      html += '<div class="empty">No alternatives match those filters.</div>';
    } else {
      html += filtered.map(function (alt) {
        var key = altKey(app, alt);
        var liked = !!likes[key];
        return '<div class="alt-card"><div class="alt-main">' +
          "<h4>" + esc(alt[0]) + "</h4>" + badge(alt[1]) +
          '<p class="adesc">' + esc(alt[3]) + "</p>" +
          '<div class="plats">' + esc(alt[2]) + "</div></div>" +
          '<button class="like-btn' + (liked ? " liked" : "") + '" data-key="' +
          esc(key) + '"><span class="heart">♥</span> ' + fmt(altLikes(app, alt)) +
          "</button></div>";
      }).join("");
    }
    appEl.innerHTML = html;

    document.getElementById("f-plat").addEventListener("change", function () {
      filterPlat = this.value; renderDetail(app);
    });
    document.getElementById("f-price").addEventListener("change", function () {
      filterPrice = this.value; renderDetail(app);
    });
    Array.prototype.forEach.call(appEl.querySelectorAll(".like-btn"), function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-key");
        if (likes[key]) { delete likes[key]; } else { likes[key] = 1; }
        saveLikes();
        renderDetail(app);
      });
    });
    window.scrollTo(0, 0);
  }

  function route() {
    var hash = location.hash || "#/";
    var m = hash.match(/^#\/app\/(.+)$/);
    if (m && bySlug[m[1]]) {
      renderDetail(bySlug[m[1]]);
    } else {
      filterPlat = "All"; filterPrice = "All";
      renderHome();
    }
  }

  searchEl.addEventListener("input", function () {
    searchText = searchEl.value;
    if (location.hash && location.hash !== "#/") {
      location.hash = "#/"; // route() renders home
    } else {
      renderHome();
    }
  });

  window.addEventListener("hashchange", route);
  renderChips();
  route();
})();
