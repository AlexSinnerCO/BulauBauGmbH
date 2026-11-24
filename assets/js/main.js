(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");

  /* Lokal per Doppelklick geoeffnet (ohne Server): interne Links auf .html-Dateien zeigen lassen */
  if (window.location.protocol === "file:") {
    document.querySelectorAll("a[href]").forEach(function (a) {
      var h = a.getAttribute("href");
      if (/^(https?:|mailto:|tel:|#|assets\/)/.test(h)) { return; }
      var teile = h.split("#");
      var ziel = (teile[0] === "./" || teile[0] === "/" || teile[0] === "") ? "index" : teile[0].replace(/^\//, "");
      a.setAttribute("href", ziel + ".html" + (teile[1] ? "#" + teile[1] : ""));
    });
  }

  /* Handy-Menue */
  var schalter = document.querySelector(".nav__schalter");
  var nav = document.getElementById("hauptnav");
  if (schalter && nav) {
    var setze = function (offen) {
      nav.classList.toggle("offen", offen);
      schalter.setAttribute("aria-expanded", offen ? "true" : "false");
    };
    schalter.addEventListener("click", function () {
      setze(schalter.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { setze(false); }
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { setze(false); }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 820) { setze(false); }
    });
  }

  /* Sanftes Einblenden beim Scrollen */
  var teile = document.querySelectorAll(".einblenden");
  if ("IntersectionObserver" in window) {
    var beobachter = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("sichtbar");
          beobachter.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    teile.forEach(function (el) { beobachter.observe(el); });
  } else {
    teile.forEach(function (el) { el.classList.add("sichtbar"); });
  }

  /* Google-Karte erst nach Klick laden (Datenschutz) */
  var maps = document.getElementById("maps");
  var mapsKnopf = document.getElementById("maps-laden");
  if (maps && mapsKnopf) {
    mapsKnopf.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = maps.getAttribute("data-src");
      f.title = "Karte von Google Maps: Bulau Bau GmbH, Am Bahnhof 9, 49593 Bersenbrück";
      f.loading = "lazy";
      f.referrerPolicy = "no-referrer-when-downgrade";
      f.setAttribute("allowfullscreen", "");
      maps.innerHTML = "";
      maps.appendChild(f);
    });
  }

  /* Kontaktformular */
  var form = document.getElementById("anfrage-formular");
  if (!form) { return; }
  var ausgabe = document.getElementById("formular-meldung");
  /* Zusatzfeld nur zeigen, wenn "Etwas anderes" gewaehlt ist */
  var auswahl = document.getElementById("f-vorhaben");
  var feldAnders = document.getElementById("feld-anders");
  var eingabeAnders = document.getElementById("f-anders");
  if (auswahl && feldAnders && eingabeAnders) {
    var pruefeAnders = function () {
      var anders = auswahl.value === "Etwas anderes";
      feldAnders.hidden = !anders;
      eingabeAnders.required = anders;
      if (!anders) { eingabeAnders.value = ""; }
    };
    auswahl.addEventListener("change", function () {
      pruefeAnders();
      if (!feldAnders.hidden) { eingabeAnders.focus(); }
    });
    auswahl.addEventListener("input", pruefeAnders);
    form.addEventListener("reset", function () { window.setTimeout(pruefeAnders, 0); });
    /* Chrome stellt Eingaben nach Zurueck oder Neuladen wieder her, danach erneut pruefen */
    window.addEventListener("pageshow", pruefeAnders);
    window.setTimeout(pruefeAnders, 0);
    pruefeAnders();
  }

  /* "Jetzt bewerben" bei einer Stelle waehlt diese Stelle im Formular vor */
  document.querySelectorAll("[data-stelle]").forEach(function (a) {
    a.addEventListener("click", function () {
      var wahl = document.getElementById("f-vorhaben");
      if (wahl) { wahl.value = a.getAttribute("data-stelle"); }
    });
  });

  var zeit = form.querySelector("input[name=t]");
  if (zeit) { zeit.value = String(Math.floor(Date.now() / 1000)); }

  var zeige = function (text, ok) {
    ausgabe.hidden = false;
    ausgabe.className = "meldung " + (ok ? "meldung--ok" : "meldung--fehler");
    ausgabe.textContent = text;
    ausgabe.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  var okText = form.getAttribute("data-ok") || "Danke! Ihre Anfrage ist bei uns angekommen. Wir melden uns innerhalb von zwei Werktagen.";
  var ersatz = "Das hat leider nicht geklappt. Rufen Sie uns gern an (05439 18767) oder schreiben Sie an info@bulau-bau.de.";

  /* Rueckmeldung, falls das Formular ohne JavaScript abgeschickt wurde */
  var status = new URLSearchParams(window.location.search).get("status");
  if (status === "ok") { zeige(okText, true); }
  else if (status === "zu-schnell") { zeige("Sie haben gerade schon eine Anfrage geschickt. Bitte warten Sie ein paar Minuten.", false); }
  else if (status === "fehler") { zeige(ersatz, false); }
  else if (status === "anders") { zeige("Bitte schreiben Sie kurz dazu, worum es bei Ihrem Vorhaben geht.", false); }
  else if (status === "eingabe") { zeige("Bitte füllen Sie Name, E-Mail und Nachricht aus und bestätigen Sie den Datenschutzhinweis.", false); }

  form.addEventListener("submit", function (e) {
    if (!window.fetch || !window.FormData) { return; }
    e.preventDefault();
    if (typeof pruefeAnders === "function") { pruefeAnders(); }
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (window.location.protocol === "file:") {
      zeige("Hinweis: Sie sehen die Website gerade als Datei auf Ihrem Computer. Das Formular verschickt erst Nachrichten, wenn die Website online bei einem Webhoster liegt. Ihre Eingaben sind in Ordnung.", false);
      return;
    }
    var knopf = form.querySelector("button[type=submit]");
    knopf.disabled = true;
    var alterText = knopf.firstChild.nodeValue;
    knopf.firstChild.nodeValue = "Wird gesendet … ";
    fetch(form.getAttribute("action"), {
      method: "POST",
      body: new FormData(form),
      headers: { "Accept": "application/json" }
    })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (d) {
        if (d && d.ok) {
          form.reset();
          if (zeit) { zeit.value = String(Math.floor(Date.now() / 1000)); }
          zeige(okText, true);
        } else {
          zeige((d && d.meldung) ? d.meldung : ersatz, false);
        }
      })
      .catch(function () { zeige(ersatz, false); })
      .then(function () { knopf.disabled = false; knopf.firstChild.nodeValue = alterText; });
  });
})();
