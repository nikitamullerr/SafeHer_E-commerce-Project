import Swal from "sweetalert2";
import { t } from "../languageConfig.js";

function translateHtml(html) {
  if (typeof html !== "string" || typeof document === "undefined") return html;
  const template = document.createElement("template");
  template.innerHTML = html;
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest("script, style")) continue;
    if (node.textContent.trim()) node.textContent = node.textContent.replace(/\S[\s\S]*\S|\S/, (text) => t(text));
  }
  for (const node of template.content.querySelectorAll("[placeholder], [aria-label], [title]")) {
    for (const attr of ["placeholder", "aria-label", "title"]) if (node.hasAttribute(attr)) node.setAttribute(attr, t(node.getAttribute(attr)));
  }
  return template.innerHTML;
}
function localize(options) {
  const result = { confirmButtonText: t("OK"), cancelButtonText: t("Cancel"), ...options };
  for (const key of ["title", "titleText", "text", "footer", "confirmButtonText", "cancelButtonText", "denyButtonText", "inputLabel", "inputPlaceholder"]) {
    if (typeof result[key] === "string") result[key] = t(result[key]);
  }
  if (result.html) result.html = translateHtml(result.html);
  if (result.inputValidator) { const validator = result.inputValidator; result.inputValidator = async (...args) => t(await validator(...args)); }
  return result;
}
export default new Proxy(Swal, {
  get(target, property) {
    if (property === "fire") return (options, text, icon) => target.fire(localize(typeof options === "string" ? { title: options, text, icon } : options));
    if (property === "showValidationMessage") return (message) => target.showValidationMessage(t(message));
    const value = target[property];
    return typeof value === "function" ? value.bind(target) : value;
  },
});
