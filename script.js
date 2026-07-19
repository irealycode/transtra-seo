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
