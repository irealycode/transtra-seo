/* ===========================================================================
   Transco — comportements du site vitrine.

   Le mouvement repose sur un vrai ressort intégré image par image, et non sur
   des durées fixes : c'est ce qui rend chaque animation interruptible et
   sensible à la vitesse du geste. Trois principes guident tout le fichier :

   1. La réponse est immédiate — le retour visuel arrive au *contact*
      (pointerdown), jamais au relâchement.
   2. Le contenu suit le doigt au pixel près pendant toute la durée du geste.
   3. Une animation en cours peut être rattrapée et inversée à tout instant ;
      elle repart alors de sa position réelle à l'écran, jamais de sa cible.
   ======================================================================== */
(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------------
     Ressort — paramétré à la façon d'Apple : amortissement + réponse.
       · amortissement 1.0  = critique, se dépose sans dépasser
       · amortissement < 1  = dépasse puis oscille (réservé à l'élan)
       · réponse            = temps d'approche en secondes (pas une durée :
                              un ressort n'en a pas, elle émerge des paramètres)
     Intégration semi-implicite à pas fixe : stable même après une frame longue,
     et `setTarget` peut être rappelé en plein vol sans discontinuité.
     --------------------------------------------------------------------- */
  function Spring(opts) {
    this.damping = opts.damping != null ? opts.damping : 1;
    this.response = opts.response != null ? opts.response : 0.4;
    this.value = opts.value || 0;
    this.target = this.value;
    this.velocity = 0;
    this.onUpdate = opts.onUpdate || function () {};
    this.onRest = opts.onRest || null;
    this._raf = 0;
    this._last = 0;
    this._tick = this._tick.bind(this);
  }

  // Rejoint une nouvelle cible. `velocity` (px/s) permet de passer le relais
  // depuis un geste : l'animation démarre exactement à la vitesse du doigt,
  // sans couture visible entre le glissé et le mouvement libre.
  Spring.prototype.setTarget = function (target, velocity) {
    this.target = target;
    if (typeof velocity === "number") this.velocity = velocity;
    this._start();
  };

  // Pose la valeur sans animer (suivi 1:1 pendant un geste, ou redimensionnement).
  Spring.prototype.set = function (value) {
    this.stop();
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.onUpdate(this.value);
  };

  Spring.prototype.stop = function () {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  };

  Spring.prototype._start = function () {
    if (this._raf) return;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._tick);
  };

  Spring.prototype._tick = function (now) {
    // Une frame perdue ne doit pas catapulter le ressort : on plafonne le pas.
    var frame = Math.min((now - this._last) / 1000, 1 / 30);
    this._last = now;

    var omega = (2 * Math.PI) / this.response;
    var k = omega * omega;
    var c = 2 * this.damping * omega;

    // sous-pas fixes : l'intégration reste stable quelle que soit la cadence
    var steps = Math.max(1, Math.ceil(frame * 240));
    var h = frame / steps;
    for (var i = 0; i < steps; i++) {
      var accel = -k * (this.value - this.target) - c * this.velocity;
      this.velocity += accel * h;
      this.value += this.velocity * h;
    }

    this.onUpdate(this.value);

    if (Math.abs(this.value - this.target) < 0.05 && Math.abs(this.velocity) < 0.05) {
      this.value = this.target;
      this.velocity = 0;
      this.onUpdate(this.value);
      this._raf = 0;
      if (this.onRest) this.onRest();
      return;
    }
    this._raf = requestAnimationFrame(this._tick);
  };

  /* Projection d'élan : où le doigt « lance » l'objet. C'est la décélération
     exponentielle du défilement, pas la formule v²/2a des manuels. */
  function project(velocity, decelerationRate) {
    var rate = decelerationRate || 0.998;
    return ((velocity / 1000) * rate) / (1 - rate);
  }

  /* Élastique de bord : plus on tire au-delà de la limite, moins ça suit.
     Un arrêt net se lit comme « bloqué » ; une résistance continue se lit
     comme « ça répond, mais il n'y a rien de plus ». */
  function rubberband(overshoot, dimension, constant) {
    var k = constant || 0.55;
    return (overshoot * dimension * k) / (dimension + k * Math.abs(overshoot));
  }

  var clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };

  /* =====================================================================
     Retour au contact — la pression se voit sur pointerdown.
     Attendre le clic donne une interface morte.
     ===================================================================== */
  (function pressFeedback() {
    var SEL = ".btn, .df-chip, .phone-tab, .nav a";
    var pressed = null;
    var release = function () {
      if (pressed) { pressed.classList.remove("is-pressed"); pressed = null; }
    };
    document.addEventListener("pointerdown", function (e) {
      var el = e.target.closest && e.target.closest(SEL);
      if (!el) return;
      release();
      pressed = el;
      el.classList.add("is-pressed");
    }, { passive: true });
    ["pointerup", "pointercancel", "pointerleave", "blur"].forEach(function (ev) {
      document.addEventListener(ev, release, true);
    });
  })();

  /* =====================================================================
     Chrome : état au défilement + pastille de position dans la nav.
     ===================================================================== */
  (function chrome() {
    var header = document.querySelector(".chrome");
    var nav = document.getElementById("nav");
    if (!header) return;

    var pill = nav && nav.querySelector(".nav-pill");
    var links = nav ? Array.prototype.slice.call(nav.querySelectorAll("a")) : [];
    var sections = links
      .map(function (a) { return document.querySelector(a.getAttribute("href")); })
      .filter(Boolean);
    var activeIndex = -1;
    var queued = false;
    // Zones sombres : le matériau de la chrome doit s'y inverser. Le panneau
    // CTA en fait partie — c'est une surface teal foncée, et c'est la dernière
    // que l'on traverse avant la seule action de la page.
    // `.hero-film` n'existe que dans la variante portée par les visages ; le
    // sélecteur reste sans effet sur la page produit, ce qui évite de
    // dupliquer ce script.
    var darkZones = Array.prototype.slice.call(
      document.querySelectorAll(".sec-ink, .film, .cta-panel, .hero-film")
    );

    function movePill(link) {
      if (!pill) return;
      if (!link) { pill.classList.remove("is-on"); return; }
      pill.style.width = link.offsetWidth + "px";
      pill.style.setProperty("--pill-x", link.offsetLeft + "px");
      pill.classList.add("is-on");
    }

    function measure() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);

      // On sonde ce qui passe derrière la barre, pas la section « courante » :
      // c'est bien la matière située sous le voile qui décide de sa teinte.
      var probeY = header.offsetHeight * 0.6;
      header.classList.toggle("on-ink", darkZones.some(function (zone) {
        var r = zone.getBoundingClientRect();
        return r.top <= probeY && r.bottom >= probeY;
      }));

      // Section courante : la dernière dont le haut est passé sous la chrome.
      var probe = window.scrollY + window.innerHeight * 0.32;
      var next = -1;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop <= probe) next = i;
      }
      // Tout en bas de page, la dernière section est forcément celle qu'on lit.
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
        next = sections.length - 1;
      }
      if (next !== activeIndex) {
        activeIndex = next;
        links.forEach(function (a, i) { a.classList.toggle("is-active", i === next); });
        movePill(next >= 0 ? links[next] : null);
      }
      queued = false;
    }

    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(measure);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () {
      // la pastille doit resuivre son onglet après un reflow
      if (activeIndex >= 0) movePill(links[activeIndex]);
      onScroll();
    });
    measure();
  })();

  /* =====================================================================
     Révélation au défilement. Le contenu est visible par défaut ; on n'arme
     le masquage qu'ici, une fois certain de pouvoir le révéler — sinon la
     page resterait vide sans JS ou dans un rendu sans IntersectionObserver.
     ===================================================================== */
  (function reveals() {
    if (REDUCED || !("IntersectionObserver" in window)) return;
    var targets = document.querySelectorAll(".reveal");
    if (!targets.length) return;
    document.documentElement.classList.add("js-anim");
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    targets.forEach(function (el) { io.observe(el); });
  })();

  /* =====================================================================
     Vidéos de décor : figées sous mouvement réduit, en pause hors écran.

     Deux façons de déclarer la source, pour deux besoins :
       · `<source src>` dans le HTML — la bande de bas de page, dont le
         cadrage est le même partout ;
       · `data-src` + `data-src-portrait` — le héros, qui reçoit sur
         téléphone un fichier déjà recadré, deux fois plus léger et à pleine
         résolution sur la seule zone visible.
     ===================================================================== */
  (function film() {
    var videos = Array.prototype.slice.call(
      document.querySelectorAll(".film-video, .hero-film-video")
    );
    if (!videos.length) return;

    // Le recadrage vertical ne vaut que pour les fenêtres franchement hautes :
    // une tablette en portrait reste mieux servie par le cadrage large.
    var portrait = window.matchMedia("(max-aspect-ratio: 5/8)").matches;

    videos.forEach(function (video) {
      var src = video.getAttribute("data-src");
      if (portrait) src = video.getAttribute("data-src-portrait") || src;

      // Sous mouvement réduit, la boucle n'est jamais chargée : aucune source
      // n'est posée et celle du HTML est retirée, pour qu'aucune requête ne
      // parte. L'affiche porte la section.
      if (REDUCED) {
        var declared = video.querySelector("source");
        if (declared) declared.remove();
        return;
      }
      if (src) video.src = src;

      function start() {
        video.preload = "auto";
        video.play().catch(function () {});
      }
      // Sans IntersectionObserver, on charge simplement : mieux vaut une
      // vidéo qui tourne qu'une affiche figée sans explication.
      if (!("IntersectionObserver" in window)) { start(); return; }

      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) start();
            else video.pause();
          });
        },
        { threshold: 0.05 }
      ).observe(video);
    });
  })();

  /* =====================================================================
     Intro : retirée du DOM une fois le voile parti. Garde-fou à 3 s.
     ===================================================================== */
  (function intro() {
    var el = document.querySelector(".intro");
    if (!el) return;
    if (!document.documentElement.classList.contains("intro-on")) {
      el.remove();
      return;
    }
    var gone = false;
    var remove = function () { if (!gone) { gone = true; el.remove(); } };
    el.addEventListener("animationend", function (e) {
      if (e.target === el) remove();
    });
    setTimeout(remove, 3000);
  })();

  /* =====================================================================
     Carrousel gestuel de l'application parents.

     Sans JS, `.pcar` défile nativement avec accrochage : les trois écrans
     restent accessibles. Dès que le script prend la main (`is-enhanced`), on
     passe au transform piloté par ressort, ce qui apporte :
       · suivi 1:1 avec respect du point de saisie,
       · relais de vitesse au relâchement (aucune couture glissé → animation),
       · projection de l'élan pour choisir l'écran d'arrivée,
       · résistance élastique aux deux bouts,
       · interruption : on rattrape la piste en plein vol, elle repart de sa
         position réelle et non de sa cible.
     ===================================================================== */
  (function carousel() {
    var root = document.getElementById("pcar");
    var track = document.getElementById("pcar-track");
    var tabbar = document.getElementById("phone-tabbar");
    var hint = document.getElementById("pcar-hint");
    if (!root || !track) return;

    var screens = Array.prototype.slice.call(track.querySelectorAll(".pcar-screen"));
    var tabs = tabbar ? Array.prototype.slice.call(tabbar.querySelectorAll(".phone-tab")) : [];
    if (screens.length < 2) return;

    root.classList.add("is-enhanced");
    if (hint) hint.hidden = false;

    var index = 0;
    var width = root.clientWidth;
    var minX, maxX;

    function bounds() {
      width = root.clientWidth || 1;
      maxX = 0;
      minX = -(screens.length - 1) * width;
    }
    bounds();

    var spring = new Spring({
      damping: 1,
      response: 0.4,
      value: 0,
      onUpdate: function (x) {
        track.style.setProperty("--pcar-x", x + "px");
        // Le retour suit le doigt en continu : les pastilles et la barre
        // d'onglets basculent au franchissement, pas seulement à l'arrivée.
        setIndex(clamp(Math.round(-x / width), 0, screens.length - 1));
      }
    });

    // Les écrans hors champ sont retirés du parcours clavier / lecteur d'écran.
    function applyInert() {
      screens.forEach(function (s, n) {
        if (n === index) s.removeAttribute("inert");
        else s.setAttribute("inert", "");
      });
    }

    // Point unique de vérité : pastilles, onglets et inertie changent ensemble,
    // sinon le parcours clavier reste en retard d'un écran après un geste.
    function setIndex(i) {
      if (i === index) return;
      index = i;
      tabs.forEach(function (t, n) {
        t.classList.toggle("active", n === i);
        t.setAttribute("aria-selected", n === i ? "true" : "false");
        // tabindex glissant : un `tablist` n'occupe qu'un seul arrêt de
        // tabulation, les flèches font le reste.
        t.tabIndex = n === i ? 0 : -1;
      });
      applyInert();
    }

    // `velocity` en px/s : le ressort démarre exactement à la vitesse du doigt.
    function goTo(i, velocity) {
      // On passe par setIndex (qui ignore les appels sans changement) plutôt
      // que d'écrire `index` ici : la cible se calcule dans tous les cas, y
      // compris au retour élastique vers l'écran qu'on n'a jamais quitté.
      var next = clamp(i, 0, screens.length - 1);
      setIndex(next);
      var target = -next * width;
      if (REDUCED) {
        spring.set(target);
        applyInert();
        return;
      }
      // Le dépassement n'est justifié que si un élan l'a précédé : un simple
      // clic sur une pastille se dépose sans rebond.
      var flicked = Math.abs(velocity || 0) > 60;
      spring.damping = flicked ? 0.8 : 1;
      spring.response = flicked ? 0.4 : 0.35;
      spring.setTarget(target, velocity);
    }

    /* ---- geste ---- */
    var dragging = false;
    var decided = false;
    var pointerId = null;
    var startX = 0;
    var startY = 0;
    var startIndex = 0;
    var grabValue = 0;
    var history = [];
    var THRESHOLD = 10; // hystérésis avant de s'approprier le geste

    function pushSample(x) {
      history.push({ x: x, t: performance.now() });
      if (history.length > 12) history.shift();
    }

    // Vitesse de relâchement, en px/s. On remonte l'historique jusqu'à trouver
    // un échantillon d'au moins une image d'écart : c'est ce qui rend la mesure
    // stable. La fenêtre s'arrête à 80 ms pour qu'un arrêt net juste avant le
    // relâchement donne bien zéro, et non la vitesse d'il y a une seconde.
    function velocityFromHistory() {
      if (history.length < 2) return 0;
      var last = history[history.length - 1];
      var first = null;
      for (var i = history.length - 2; i >= 0; i--) {
        var age = last.t - history[i].t;
        if (age > 80) break;
        first = history[i];
        if (age >= 16) break;
      }
      if (!first) first = history[0];
      // Plancher sur dt : les navigateurs arrondissent performance.now() pour
      // des raisons de sécurité, et plusieurs événements peuvent porter le même
      // horodatage. Sans ce plancher, une division par ~0 renvoie soit zéro
      // (geste vif ignoré), soit l'infini.
      var dt = Math.max((last.t - first.t) / 1000, 0.004);
      return (last.x - first.x) / dt;
    }

    root.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointerId = e.pointerId;
      dragging = true;
      decided = false;
      startX = e.clientX;
      startY = e.clientY;
      startIndex = index;
      // On saisit la piste où elle est *réellement* à l'écran. Repartir de la
      // cible ferait sauter l'image au moment de la prise.
      spring.stop();
      grabValue = spring.value;
      history.length = 0;
      pushSample(e.clientX);
    });

    root.addEventListener("pointermove", function (e) {
      if (!dragging || e.pointerId !== pointerId) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;

      // On échantillonne dès le premier mouvement, y compris pendant
      // l'hystérésis : sans cela, un geste vif et court n'a plus assez de
      // points pour donner une vitesse.
      pushSample(e.clientX);

      if (!decided) {
        if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
        // Geste vertical : on rend la main au défilement de la page.
        if (Math.abs(dy) > Math.abs(dx)) { dragging = false; return; }
        decided = true;
        root.classList.add("is-dragging");
        root.setPointerCapture(pointerId);
      }

      // Suivi 1:1, en conservant l'écart au point de saisie.
      var raw = grabValue + dx;
      if (raw > maxX) raw = maxX + rubberband(raw - maxX, width);
      else if (raw < minX) raw = minX - rubberband(minX - raw, width);
      spring.set(raw);
      e.preventDefault();
    });

    function endDrag(e) {
      if (!dragging || (e && e.pointerId !== pointerId)) return;
      var wasDecided = decided;
      dragging = false;
      decided = false;
      root.classList.remove("is-dragging");
      if (pointerId !== null && root.hasPointerCapture && root.hasPointerCapture(pointerId)) {
        root.releasePointerCapture(pointerId);
      }
      pointerId = null;
      if (!wasDecided) return;

      var velocity = velocityFromHistory();
      // On vise l'écran le plus proche du point d'arrêt *projeté*, pas du
      // point de relâchement : c'est ce qui donne à un lancer l'impression
      // de vraiment lancer. Décélération 0.99 (et non 0.998, la valeur du
      // défilement libre) : sur des pages étroites, la course longue enverrait
      // le moindre geste vif jusqu'au bout du carrousel.
      var projected = spring.value + project(velocity, 0.99);
      // L'élan ne peut ajouter qu'une page au trajet réellement parcouru par
      // le doigt. C'est le comportement d'une vue paginée : un geste franc
      // avance toujours d'un écran, jamais de trois.
      var dragged = Math.abs(spring.value - grabValue) / width;
      var maxStep = Math.max(1, Math.round(dragged));
      var target = clamp(
        Math.round(-projected / width),
        startIndex - maxStep,
        startIndex + maxStep
      );
      // Sur une page étroite, la seule projection laisse un geste vif mais
      // court juste sous la barre des 50 % : il retomberait sur place, alors
      // que l'intention de tourner la page est évidente. Comme toute vue
      // paginée, on tranche donc aussi sur la vitesse, pas que sur la distance.
      if (target === startIndex && Math.abs(velocity) > 300) {
        target = startIndex + (velocity < 0 ? 1 : -1);
      }
      goTo(clamp(target, 0, screens.length - 1), velocity);
    }

    root.addEventListener("pointerup", endDrag);
    root.addEventListener("pointercancel", endDrag);

    /* ---- clavier et pastilles ---- */
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1, 0); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1, 0); }
      else if (e.key === "Home") { e.preventDefault(); goTo(0, 0); }
      else if (e.key === "End") { e.preventDefault(); goTo(screens.length - 1, 0); }
    });

    // La barre d'onglets suit le motif clavier attendu d'un `tablist` :
    // les flèches déplacent la sélection et le focus la suit.
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { goTo(i, 0); });
      tab.addEventListener("keydown", function (e) {
        var to = null;
        if (e.key === "ArrowRight") to = clamp(index + 1, 0, tabs.length - 1);
        else if (e.key === "ArrowLeft") to = clamp(index - 1, 0, tabs.length - 1);
        else if (e.key === "Home") to = 0;
        else if (e.key === "End") to = tabs.length - 1;
        if (to === null) return;
        e.preventDefault();
        goTo(to, 0);
        tabs[to].focus();
      });
    });

    // Un lien profond ou une tabulation vers un écran caché doit l'amener à vue.
    screens.forEach(function (s, i) {
      s.addEventListener("focusin", function () { if (i !== index) goTo(i, 0); });
    });

    window.addEventListener("resize", function () {
      bounds();
      spring.set(-index * width);
      applyInert();
    });

    tabs.forEach(function (t, n) { t.tabIndex = n === 0 ? 0 : -1; });
    applyInert();
    spring.set(0);
  })();

  /* =====================================================================
     Formulaire de démo en étapes : réponses prêtes à cliquer, le bus avance
     d'un arrêt par étape, la saisie n'arrive qu'à la fin.
     ===================================================================== */
  (function demoForm() {
    var FORMSPREE_ENDPOINT = "https://formspree.io/f/xjgnrbov";
    var CONTACT_EMAIL = "contact@transtra.app";

    var form = document.getElementById("demo-form");
    if (!form) return;
    // Signale que le parcours par étapes est disponible. Sans cette classe, la
    // feuille de style empile les quatre questions et laisse le bouton d'envoi
    // poster nativement : la démo reste demandable sans JavaScript.
    document.documentElement.classList.add("js-form");

    var steps = Array.prototype.slice.call(form.querySelectorAll(".df-step"));
    var stops = form.querySelectorAll(".df-stop");
    var route = form.querySelector(".df-route");
    var countCur = document.getElementById("df-count-cur");
    var countLine = form.querySelector(".df-count");
    var backBtn = document.getElementById("df-back");
    var nextBtn = document.getElementById("df-next");
    var sendBtn = document.getElementById("df-send");
    var errorBox = form.querySelector(".df-error");
    var multiHint = document.getElementById("df-multi-hint");
    var state = { role: "", flotte: "", priorites: [] };
    var current = 0;

    var stepsWrap = document.getElementById("df-steps");

    // Le bus glisse en translate3d : la largeur de piste alimente le calcul.
    // La carte, elle, se règle sur la hauteur de l'étape affichée.
    function measureRoute() {
      if (route) form.style.setProperty("--df-w", route.clientWidth + "px");
      syncHeight();
    }
    function syncHeight() {
      if (stepsWrap && steps[current]) {
        stepsWrap.style.setProperty("--df-h", steps[current].offsetHeight + "px");
      }
    }
    measureRoute();
    window.addEventListener("resize", measureRoute);
    // Les polices arrivent après le premier calcul et changent les hauteurs.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncHeight);

    function setError(html) {
      if (!html) {
        errorBox.hidden = true;
        errorBox.textContent = "";
      } else {
        errorBox.hidden = false;
        errorBox.innerHTML = html;
      }
    }

    function go(n) {
      var prev = current;
      current = n;
      setError("");
      var entering = steps[n];
      steps.forEach(function (step) {
        step.classList.remove("is-exit-fwd", "is-exit-back");
        if (step !== entering) step.classList.remove("is-enter-back");
      });
      if (n < prev) {
        // en retour arrière, l'étape entrante arrive depuis la gauche :
        // position de départ posée avant la transition (reflow forcé)
        entering.classList.add("is-enter-back");
        void entering.offsetWidth;
      }
      steps.forEach(function (step, i) {
        var active = i === n;
        step.classList.toggle("is-current", active);
        if (!active && i === prev) {
          step.classList.add(n > prev ? "is-exit-fwd" : "is-exit-back");
        }
        if (active) step.removeAttribute("inert");
        else step.setAttribute("inert", "");
      });

      var p = Math.min(n, 3) / 3;
      form.style.setProperty("--df-p", p);
      stops.forEach(function (stop, i) {
        stop.classList.toggle("done", i <= Math.min(n, 3));
      });
      syncHeight();
      if (n < 4) countCur.textContent = n + 1;
      countLine.hidden = n === 4;
      backBtn.hidden = n === 0 || n === 4;
      nextBtn.hidden = n !== 2;
      sendBtn.hidden = n !== 3;

      // le clavier suit : focus sur le premier contrôle de l'étape
      var first = steps[n].querySelector("button, input");
      if (first && prev !== n) {
        setTimeout(function () { first.focus({ preventScroll: true }); }, REDUCED ? 0 : 340);
      }
    }

    form.addEventListener("click", function (e) {
      var chip = e.target.closest(".df-chip");
      if (!chip) return;
      var field = chip.dataset.field;
      if (chip.classList.contains("df-multi")) {
        var on = chip.getAttribute("aria-pressed") === "true";
        chip.setAttribute("aria-pressed", on ? "false" : "true");
        state.priorites = Array.prototype.map.call(
          form.querySelectorAll('.df-multi[aria-pressed="true"]'),
          function (el) { return el.dataset.value; }
        );
        // C'est la seule étape qui n'avance pas toute seule : elle doit dire
        // où elle en est, sinon le clic semble n'avoir rien produit.
        if (multiHint) {
          var n = state.priorites.length;
          multiHint.textContent = n === 0
            ? "Plusieurs choix possibles"
            : n + (n > 1 ? " choix sélectionnés" : " choix sélectionné");
        }
        return;
      }
      var stepEl = chip.closest(".df-step");
      stepEl.querySelectorAll(".df-chip").forEach(function (el) {
        el.classList.toggle("selected", el === chip);
      });
      state[field] = chip.dataset.value;
      // un souffle pour voir la sélection s'allumer avant que l'étape glisse
      var from = current;
      setTimeout(function () {
        if (current === from) go(from + 1);
      }, 220);
    });

    backBtn.addEventListener("click", function () { go(current - 1); });
    nextBtn.addEventListener("click", function () { go(current + 1); });

    // Pose l'état de départ du parcours par étapes. Le bouton d'envoi est
    // visible dans le HTML (c'est le repli sans JS) : c'est ici qu'il se range
    // jusqu'à la dernière étape.
    go(0);

    function payloadLines() {
      return [
        "Rôle : " + (state.role || "—"),
        "Flotte : " + (state.flotte || "—"),
        "Priorités : " + (state.priorites.join(", ") || "—"),
        "École : " + form.elements.ecole.value.trim(),
        "Contact : " + form.elements.contact.value.trim()
      ];
    }

    function isEmail(v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    function mailtoHref() {
      return "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent("Démo Transco") +
        "&body=" + encodeURIComponent(payloadLines().join("\n"));
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var invalid = ["ecole", "contact"].filter(function (name) {
        var input = form.elements[name];
        var bad = input.value.trim() === "";
        input.setAttribute("aria-invalid", bad ? "true" : "false");
        return bad;
      });
      if (invalid.length) {
        setError("Il ne manque que " + (invalid.length === 2
          ? "votre école et un moyen de vous joindre."
          : invalid[0] === "ecole" ? "le nom de votre école." : "un moyen de vous joindre."));
        form.elements[invalid[0]].focus();
        return;
      }
      if (form.elements.botcheck.checked) { go(4); return; } // pot de miel

      var contact = form.elements.contact.value.trim();
      var ecole = form.elements.ecole.value.trim();
      var payload = {
        _subject: "Démo Transco — " + ecole,
        ecole: ecole,
        contact: contact,
        role: state.role || "—",
        flotte: state.flotte || "—",
        priorites: state.priorites.join(", ") || "—",
        message: payloadLines().join("\n")
      };
      // le champ contact accepte un email ou un téléphone : on ne renseigne
      // « email » (le reply-to de Formspree) que si c'en est bien un
      if (isEmail(contact)) payload.email = contact;

      sendBtn.disabled = true;
      sendBtn.textContent = "Envoi…";
      fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("relais");
          go(4);
        })
        .catch(function () {
          setError(
            'L’envoi a échoué — réessayez, ou ' +
            '<a href="' + mailtoHref() + '">passez par email</a>, ' +
            "votre demande est déjà prête."
          );
        })
        .then(function () {
          sendBtn.disabled = false;
          sendBtn.innerHTML = 'Envoyer la demande<svg class="icon"><use href="#i-arrow-right"/></svg>';
        });
    });
  })();
})();
