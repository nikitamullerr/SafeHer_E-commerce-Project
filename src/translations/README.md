# Interface translations

SafeHer supports English, Afrikaans, isiZulu and isiXhosa. `languageConfig.js` owns the reactive selection, `safeher-language` browser preference, HTML language, interpolation and date/currency formatting. Invalid preferences fall back to English; blocked browser storage does not prevent switching languages.

Add new interface phrases to `interface.js` with all three translations, and call `t("English phrase")` where the text renders. For dynamic content use named placeholders, for example `t("Order #{id}", { id })`. Keep stored form values, API status codes and identifiers unchanged. Translate array labels in the template rather than evaluating translations once when the array is created.

`localizedSwal.js` localizes application dialogs and validation messages. Leaflet labels update when the selection changes. Login and registration have their own selector. Authored product descriptions and lesson metadata use the dictionary; product names, customer names, addresses and customer-written reviews stay in their original form. Third-party video audio is not translated. New backend or external-service text without a dictionary entry retains its original text.

Run `npm test` and `npm run build`. The optional `tests/languages.browser.mjs` checks four languages across auth, every view, cart, checkout, Premium dialogs, persistence, form values and mobile navigation with mocked API requests. Start the development server first and run it with Playwright available (or set `PLAYWRIGHT_MODULE` to its module URL). The browser checks do not create orders or send email.
