/* Preloads the official Keetown logo artwork for canvas drawing. */
window.KBrand = (function () {
  const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  const B = { ready: null };
  B.ready = Promise.all([['logo', '../assets/brand/logo.svg'], ['logoWhite', '../assets/brand/logo-white.svg'], ['mark', '../assets/brand/mark.svg'], ['markWhite', '../assets/brand/mark-white.svg']]
    .map(([k, s]) => load(s).then(i => { B[k] = i; }))).then(() => B);
  return B;
})();
