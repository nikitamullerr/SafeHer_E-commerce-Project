import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { computed } from "vue";
import { parse } from "@vue/compiler-sfc";
import { baseParse } from "@vue/compiler-dom";
import messages from "../src/translations/interface.js";
import { language, supportedLanguages, t, locale, formatDate } from "../src/languageConfig.js";

test("every interface phrase has all three translations and matching placeholders", () => {
  const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  for (const [english, translations] of Object.entries(messages)) {
    for (const name of supportedLanguages.filter(name => name !== "English")) {
      assert.ok(translations[name]?.trim(), `${name}: ${english}`);
      assert.deepEqual(placeholders(translations[name]), placeholders(english), `${name}: ${english}`);
    }
  }
});
test("mounted computed labels react to language changes and preserve original unknown content", () => {
  const label = computed(() => t("Email address"));
  for (const name of supportedLanguages) {
    language.value = name;
    assert.equal(label.value, name === "English" ? "Email address" : messages["Email address"][name]);
    assert.equal(t("  Customer-written text  "), "  Customer-written text  ");
    assert.equal(t(3), 3);
    assert.ok(t("Order #{id}", { id: 123 }).endsWith("#123"));
    assert.ok(formatDate("2026-09-10T12:00:00Z"));
    assert.ok(locale.value.endsWith("-ZA"));
    assert.notEqual(t("nearby"), "nearby");
  }
  language.value = "unsupported";
  assert.equal(language.value, "English");
});
test("all page templates compile and literal translation calls have dictionary coverage", () => {
  const files = ["src/App.vue", ...["src/pages", "src/components"].flatMap(dir => fs.readdirSync(dir).filter(name => name.endsWith(".vue")).map(name => `${dir}/${name}`))];
  const brands = new Set(["SafeHer", "SAFEHER", "SAFEHER /", "SOS", "CVV", "PayFast", "Safe_Her AI", "English", "isiZulu", "isiXhosa", "Afrikaans", "Premium"]);
  language.value = "isiZulu";
  for (const file of files) {
    const { descriptor, errors } = parse(fs.readFileSync(file, "utf8"));
    assert.deepEqual(errors, [], file);
    const ast = baseParse(descriptor.template?.content || "");
    function visit(node) {
      if (node.type === 2 && /[A-Za-z]{2}/.test(node.content)) assert.ok(brands.has(node.content.trim()), `${file}: untranslated ${node.content.trim()}`);
      if (node.type === 5) {
        for (const match of node.content.content.matchAll(/t\("((?:[^"\\]|\\.)*)"\)/g)) {
          const key = JSON.parse(`"${match[1]}"`);
          assert.ok(key in messages || t(key) !== key || brands.has(key), `${file}: missing ${key}`);
        }
      }
      for (const child of node.children || []) visit(child);
    }
    visit(ast);
  }
  language.value = "English";
});
