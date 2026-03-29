export function resetIOSZoom() {
  window.scrollTo(0, 0);
  const vp = document.querySelector('meta[name="viewport"]');
  if (!vp) return;
  vp.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1");
  setTimeout(() => {
    vp.setAttribute("content", "width=device-width, initial-scale=1");
  }, 300);
}
