/* Minispiel "Schraub mit Adrian"
   Tippe alle Schrauben in die Gipskartonplatte, bevor die Zeit ablaeuft.
   Speichert nichts, setzt keine Cookies. */
(function () {
  "use strict";

  var DAUER = 30;          // Sekunden
  var STRAFE = 1;          // Sekunden Abzug bei Fehlklick
  var SPALTEN = [18, 50, 82];          // Lage der Staender in Prozent (Plattenbreite)
  var ZEILEN = [12, 37, 63, 88];       // Hoehe der Schraubreihen in Prozent

  var ADRIAN = '' +
    '<svg class="spiel__adrian" viewBox="0 0 120 170" role="img" aria-label="Adrian mit Akkuschrauber">' +
    '<ellipse cx="60" cy="165" rx="38" ry="5" fill="#0b1b3d" opacity=".15"/>' +
    // Beine
    '<rect x="40" y="112" width="16" height="48" rx="4" fill="#123d8f"/><rect x="64" y="112" width="16" height="48" rx="4" fill="#123d8f"/>' +
    '<rect x="36" y="154" width="24" height="9" rx="4" fill="#2b2b2b"/><rect x="62" y="154" width="24" height="9" rx="4" fill="#2b2b2b"/>' +
    // Jacke
    '<path d="M30 62c0-9 7-16 16-16h28c9 0 16 7 16 16v54H30z" fill="#1747a6"/>' +
    '<path d="M30 62c0-9 7-16 16-16h6v70H30z" fill="#5b6472" opacity=".55"/>' +
    '<path d="M60 47v69" stroke="#0b1b3d" stroke-width="2"/>' +
    '<rect x="66" y="70" width="14" height="3" rx="1.5" fill="#dfe5f1"/>' +
    // Hals und Kopf
    '<rect x="53" y="38" width="14" height="12" fill="#e9b894"/>' +
    '<ellipse cx="60" cy="26" rx="17" ry="19" fill="#f2c6a3"/>' +
    '<path d="M43 22c0-12 8-18 17-18s17 6 17 18c-4-6-10-8-17-8s-13 2-17 8z" fill="#2a1f1a"/>' +
    // Brille
    '<rect x="46" y="23" width="12" height="8" rx="2" fill="none" stroke="#1d1d1d" stroke-width="2"/>' +
    '<rect x="62" y="23" width="12" height="8" rx="2" fill="none" stroke="#1d1d1d" stroke-width="2"/>' +
    '<path d="M58 26h4" stroke="#1d1d1d" stroke-width="2"/>' +
    '<path d="M54 37c4 3 8 3 12 0" stroke="#8a4b33" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    // Arm mit Akkuschrauber (bewegt sich)
    '<g class="spiel__arm">' +
    '<path d="M84 58l20 14" stroke="#1747a6" stroke-width="13" stroke-linecap="round"/>' +
    '<circle cx="106" cy="74" r="6" fill="#f2c6a3"/>' +
    '<rect x="98" y="60" width="20" height="11" rx="3" fill="#f2b705"/>' +
    '<rect x="104" y="70" width="8" height="14" rx="2" fill="#2b2b2b"/>' +
    '<rect x="117" y="63" width="9" height="4" rx="1" fill="#9aa3b2"/>' +
    '</g>' +
    '</svg>';

  var dialog, buehne, platteEl, anzeigeZeit, anzeigePlatten, anzeigeSchrauben, meldung;
  var zeit = 0, platten = 0, schrauben = 0, offen = 0, laeuft = false, takt = null, letzterFokus = null, bestwert = 0;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (html) { e.innerHTML = html; }
    return e;
  }

  function baueDialog() {
    dialog = el("div", "spiel");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "spiel-titel");
    dialog.hidden = true;
    dialog.innerHTML =
      '<div class="spiel__fenster">' +
        '<div class="spiel__kopf">' +
          '<h2 id="spiel-titel">Schraub mit Adrian</h2>' +
          '<button type="button" class="spiel__zu" aria-label="Spiel schließen">&times;</button>' +
        '</div>' +
        '<div class="spiel__hud" aria-live="off">' +
          '<span>Zeit <strong data-wert="zeit">30</strong></span>' +
          '<span>Platten <strong data-wert="platten">0</strong></span>' +
          '<span>Schrauben <strong data-wert="schrauben">0</strong></span>' +
        '</div>' +
        '<div class="spiel__buehne">' +
          '<div class="spiel__platte"></div>' +
          ADRIAN +
          '<div class="spiel__meldung" aria-hidden="true"></div>' +
          '<div class="spiel__start"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dialog);

    buehne = dialog.querySelector(".spiel__buehne");
    platteEl = dialog.querySelector(".spiel__platte");
    anzeigeZeit = dialog.querySelector('[data-wert="zeit"]');
    anzeigePlatten = dialog.querySelector('[data-wert="platten"]');
    anzeigeSchrauben = dialog.querySelector('[data-wert="schrauben"]');
    meldung = dialog.querySelector(".spiel__meldung");

    dialog.querySelector(".spiel__zu").addEventListener("click", schliessen);
    dialog.addEventListener("click", function (e) { if (e.target === dialog) { schliessen(); } });
    document.addEventListener("keydown", function (e) {
      if (!dialog.hidden && e.key === "Escape") { schliessen(); }
    });
    platteEl.addEventListener("pointerdown", function (e) {
      if (!laeuft || e.target.closest(".spiel__schraube")) { return; }
      zeit = Math.max(0, zeit - STRAFE);
      zeigeMeldung("Daneben! −1 s", e);
      zeigeHud();
    });
  }

  function zeigeStart(titel, text, knopf) {
    var s = dialog.querySelector(".spiel__start");
    s.innerHTML = '<div class="spiel__karte"><h3>' + titel + '</h3>' + text +
      '<button type="button" class="knopf spiel__los">' + knopf + '</button></div>';
    s.hidden = false;
    var los = s.querySelector(".spiel__los");
    los.addEventListener("click", starten);
    los.focus();
  }

  function oeffnen() {
    if (!dialog) { baueDialog(); }
    letzterFokus = document.activeElement;
    dialog.hidden = false;
    document.documentElement.classList.add("spiel-offen");
    neuePlatte(true);
    zeigeStart("Hilf Adrian!",
      '<p>Die Gipskartonplatten müssen an die Ständerwand. Tippe so schnell du kannst auf jede Schraube. Du hast ' + DAUER + ' Sekunden.</p>' +
      '<p class="spiel__klein">Daneben tippen kostet eine Sekunde.</p>',
      "Los geht's");
  }

  function schliessen() {
    stoppen();
    dialog.hidden = true;
    document.documentElement.classList.remove("spiel-offen");
    if (letzterFokus && letzterFokus.focus) { letzterFokus.focus(); }
  }

  function starten() {
    dialog.querySelector(".spiel__start").hidden = true;
    zeit = DAUER; platten = 0; schrauben = 0;
    laeuft = true;
    neuePlatte(false);
    zeigeHud();
    var vorher = Date.now();
    takt = window.setInterval(function () {
      var jetzt = Date.now();
      zeit -= (jetzt - vorher) / 1000;
      vorher = jetzt;
      if (zeit <= 0) { zeit = 0; ende(); }
      zeigeHud();
    }, 100);
  }

  function stoppen() {
    laeuft = false;
    if (takt) { window.clearInterval(takt); takt = null; }
  }

  function ende() {
    stoppen();
    var neu = schrauben > bestwert;
    if (neu) { bestwert = schrauben; }
    var satz = platten === 0 ? "Fast! Die erste Platte war schon halb dran." :
      platten < 3 ? "Solide Arbeit für den ersten Tag." :
      platten < 6 ? "Stark! Adrian würde dich sofort einstellen." :
      "Unglaublich. Bist du Trockenbauer?";
    zeigeStart("Feierabend!",
      '<p class="spiel__ergebnis"><strong>' + platten + '</strong> ' + (platten === 1 ? "Platte" : "Platten") +
      ' · <strong>' + schrauben + '</strong> Schrauben</p>' +
      '<p>' + satz + (neu && schrauben > 0 ? " Neuer Bestwert!" : "") + '</p>' +
      '<p class="spiel__klein">Echte Wände bauen wir auch: <a href="' + (location.protocol === "file:" ? "kontakt.html" : "kontakt") + '">Projekt anfragen</a></p>',
      "Nochmal");
  }

  function neuePlatte(nurAnzeigen) {
    platteEl.classList.remove("fertig");
    platteEl.innerHTML = "";
    var punkte = [];
    SPALTEN.forEach(function (x) { ZEILEN.forEach(function (y) { punkte.push([x, y]); }); });
    // Je mehr Platten, desto mehr Schrauben (8 bis 12)
    var anzahl = Math.min(12, 8 + platten);
    punkte.sort(function () { return Math.random() - 0.5; });
    punkte = punkte.slice(0, anzahl);
    offen = punkte.length;
    punkte.forEach(function (p) {
      var b = el("button", "spiel__schraube");
      b.type = "button";
      b.setAttribute("aria-label", "Schraube eindrehen");
      b.style.left = (p[0] + (Math.random() * 4 - 2)) + "%";
      b.style.top = (p[1] + (Math.random() * 4 - 2)) + "%";
      if (nurAnzeigen) { b.tabIndex = -1; }
      b.addEventListener("pointerdown", schrauben_rein);
      b.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); schrauben_rein.call(b, e); } });
      platteEl.appendChild(b);
    });
  }

  function schrauben_rein(e) {
    if (!laeuft || this.classList.contains("drin")) { return; }
    e.preventDefault();
    this.classList.add("drin");
    this.disabled = true;
    schrauben++; offen--;
    var arm = buehne.querySelector(".spiel__adrian");
    arm.classList.remove("bohrt"); void arm.offsetWidth; arm.classList.add("bohrt");
    if (offen === 0) {
      platten++;
      zeit = Math.min(DAUER, zeit + 2);
      platteEl.classList.add("fertig");
      zeigeMeldung("Platte fertig! +2 s");
      window.setTimeout(function () { if (laeuft) { neuePlatte(false); } }, 380);
    }
    zeigeHud();
  }

  function zeigeMeldung(text, e) {
    meldung.textContent = text;
    var r = buehne.getBoundingClientRect();
    var x = e ? e.clientX - r.left : r.width / 2;
    var y = e ? e.clientY - r.top : r.height * 0.4;
    meldung.style.left = x + "px";
    meldung.style.top = y + "px";
    meldung.classList.remove("zeigen"); void meldung.offsetWidth; meldung.classList.add("zeigen");
  }

  function zeigeHud() {
    anzeigeZeit.textContent = Math.ceil(zeit);
    anzeigeZeit.parentNode.classList.toggle("knapp", laeuft && zeit < 6);
    anzeigePlatten.textContent = platten;
    anzeigeSchrauben.textContent = schrauben;
  }

  /* Schwebender Knopf unten rechts, nicht auf Seiten mit Formular (Kontakt, Jobs), damit er keine Felder verdeckt */
  if (document.getElementById("anfrage-formular")) { return; }
  var knopf = el("button", "spiel-knopf",
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M7 8h10a4 4 0 0 1 4 4v1.5a3.5 3.5 0 0 1-6.3 2.1L14 14.5h-4l-.7 1.1A3.5 3.5 0 0 1 3 13.5V12a4 4 0 0 1 4-4z"/>' +
    '<path d="M7.5 10.5v3M6 12h3"/><circle cx="15.5" cy="11" r=".9" fill="currentColor"/><circle cx="17.5" cy="13" r=".9" fill="currentColor"/></svg>');
  knopf.type = "button";
  knopf.setAttribute("aria-label", "Minispiel öffnen: Schraub mit Adrian");
  knopf.title = "Minispiel: Schraub mit Adrian";
  knopf.addEventListener("click", oeffnen);
  document.body.appendChild(knopf);
})();
