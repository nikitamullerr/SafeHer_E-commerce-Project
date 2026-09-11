let pending;
export function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    const created = !script;
    if (!script) { script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true; }
    const cleanup = () => { clearTimeout(timer); script.removeEventListener("load", loaded); script.removeEventListener("error", failed); };
    const failed = () => { cleanup(); script.remove(); pending = null; reject(new Error("Google sign-in could not be loaded. Please try again.")); };
    const loaded = () => { if (!window.google?.accounts?.id) return failed(); cleanup(); resolve(window.google.accounts.id); };
    const timer = setTimeout(failed, 15000);
    script.addEventListener("load", loaded, { once: true }); script.addEventListener("error", failed, { once: true });
    if (created) document.head.appendChild(script);
  });
  return pending;
}
