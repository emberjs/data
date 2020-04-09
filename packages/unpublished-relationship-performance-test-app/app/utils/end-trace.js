export function endTrace() {
  if (document.location.href.indexOf('?tracing') !== -1 || document.location.href.indexOf('?tracerbench=true') !== -1) {
    // just before paint
    requestAnimationFrame(() => {
      // after paint
      requestAnimationFrame(() => {
        document.location.href = 'about:blank';
      });
    });
  }
}
