import { createApp } from "vue";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./accessibility.css";
import App from "./App.vue";

const app = createApp(App);
function punctuateHeading(element) {
  // Separate span avoids changing Vue-owned text nodes or translation keys.
  let suffix = element.querySelector(':scope > [data-heading-stop]');
  if (suffix) suffix.remove();
  const text = element.textContent.trim();
  if (text && !/[.?]$/.test(text)) {
    suffix = document.createElement('span');
    suffix.dataset.headingStop = '';
    suffix.textContent = '.';
    element.appendChild(suffix);
  }
}
app.directive('full-stop', { mounted: punctuateHeading, updated: punctuateHeading });
app.mount("#app");
