// Re-render MathJax after MkDocs Material instant navigation
document$.subscribe(function () {
  if (typeof MathJax !== "undefined") {
    MathJax.typesetPromise();
  }
});
