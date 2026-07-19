// Comportements discrets : état de l'en-tête au défilement + révélation des
// sections. Aucun mouvement si l'utilisateur préfère les animations réduites.
(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var onScroll = function () {
    header.classList.toggle("scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Vidéo d'ambiance : figée sous mouvement réduit, en pause hors écran.
  var film = document.querySelector(".film-video");
  if (film) {
    if (reduced) {
      film.removeAttribute("autoplay");
      film.pause();
    } else if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) film.play().catch(function () {});
            else film.pause();
          });
        },
        { threshold: 0.05 }
      ).observe(film);
    }
  }

  var targets = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) return;
  // Le contenu est visible par défaut ; on n'arme le masquage qu'ici, une fois
  // sûr de pouvoir le révéler (sinon la page resterait vide sans JS).
  document.documentElement.classList.add("js-anim");
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  targets.forEach(function (el) { io.observe(el); });
})();

// Splash d'intro : retiré du DOM une fois le rideau levé (classe posée par le
// script inline du <head>). Garde-fou : suppression forcée après 3 s.
(function () {
  "use strict";
  var splash = document.querySelector(".splash");
  if (!splash) return;
  if (!document.documentElement.classList.contains("splash-on")) {
    splash.remove();
    return;
  }
  var gone = false;
  var remove = function () {
    if (!gone) { gone = true; splash.remove(); }
  };
  splash.addEventListener("animationend", function (e) {
    if (e.target === splash) remove();
  });
  setTimeout(remove, 3000);
})();

// Formulaire de démo en étapes : réponses prêtes à cliquer, le bus avance
// d'un arrêt par étape, la saisie n'arrive qu'à la fin.
(function () {
  "use strict";

  // Relais de formulaire (Formspree). Si l'envoi échoue, le formulaire
  // bascule sur l'email prérempli.
  var FORMSPREE_ENDPOINT = "https://formspree.io/f/xjgnrbov";
  var CONTACT_EMAIL = "contact@transtra.app";

  var form = document.getElementById("demo-form");
  if (!form) return;

  var steps = Array.prototype.slice.call(form.querySelectorAll(".df-step"));
  var stops = form.querySelectorAll(".df-stop");
  var countCur = document.getElementById("df-count-cur");
  var countLine = form.querySelector(".df-count");
  var backBtn = document.getElementById("df-back");
  var nextBtn = document.getElementById("df-next");
  var sendBtn = document.getElementById("df-send");
  var errorBox = form.querySelector(".df-error");
  var state = { role: "", flotte: "", priorites: [] };
  var current = 0;

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
      // sens de sortie : l'étape quittée glisse à l'opposé de l'entrante
      if (!active && i === prev) {
        step.classList.add(n > prev ? "is-exit-fwd" : "is-exit-back");
      }
      if (active) step.removeAttribute("inert");
      else step.setAttribute("inert", "");
    });
    // trajet : le bus avance d'un arrêt par étape (l'état final reste à quai)
    var p = Math.min(n, 3) / 3;
    form.style.setProperty("--df-p", p);
    stops.forEach(function (stop, i) {
      stop.classList.toggle("done", i <= Math.min(n, 3));
    });
    if (n < 4) countCur.textContent = n + 1;
    countLine.hidden = n === 4;
    backBtn.hidden = n === 0 || n === 4;
    nextBtn.hidden = n !== 2;
    sendBtn.hidden = n !== 3;
    // le clavier suit : focus sur le premier contrôle de l'étape
    var first = steps[n].querySelector("button, input");
    if (first && prev !== n) {
      setTimeout(function () { first.focus({ preventScroll: true }); }, 340);
    }
  }

  // choix simples : sélection puis avancée automatique (un souffle pour voir
  // la sélection s'allumer avant que l'étape glisse)
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
      return;
    }
    var stepEl = chip.closest(".df-step");
    stepEl.querySelectorAll(".df-chip").forEach(function (el) {
      el.classList.toggle("selected", el === chip);
    });
    state[field] = chip.dataset.value;
    var from = current;
    setTimeout(function () {
      if (current === from) go(from + 1);
    }, 220);
  });

  backBtn.addEventListener("click", function () { go(current - 1); });
  nextBtn.addEventListener("click", function () { go(current + 1); });

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
    // validation douce : les deux champs de la dernière étape
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
