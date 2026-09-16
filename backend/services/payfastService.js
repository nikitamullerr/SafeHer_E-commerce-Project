import crypto from "node:crypto";

const encode = (value) => encodeURIComponent(String(value)).replace(/[!'()*~]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`).replace(/%20/g, "+");

const sortedParameters = (data) => Object.entries(data)
  .filter(([key, value]) => key !== "signature" && value !== undefined && value !== null && value !== "")
  .map(([key, value]) => `${key}=${encode(String(value).trim())}`)
  .join("&");

const host = () => process.env.PAYFAST_SANDBOX === "false" ? "https://www.payfast.co.za" : "https://sandbox.payfast.co.za";

export function buildPayfastParameterString(data) {
  return sortedParameters(data);
}

export function createPayfastSignature(data) {
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const content = `${sortedParameters(data)}${passphrase ? `&passphrase=${encode(passphrase)}` : ""}`;
  return crypto.createHash("md5").update(content).digest("hex");
}

export function createPayfastPaymentUrl(data) {
  const formInputs = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined && value !== null && value !== ""));
  formInputs.signature = createPayfastSignature(formInputs);
  return { url: `${host()}/eng/process`, formInputs };
}

export function isValidPayfastSignature(payload) {
  if (!/^[a-f0-9]{32}$/i.test(payload?.signature || "")) return false;
  const parameters = buildPayfastNotificationString(payload);
  if (parameters === null) return false;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const content = parameters + (passphrase ? `&passphrase=${encode(passphrase)}` : "");
  const expected = crypto.createHash("md5").update(content).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(payload.signature, "hex"));
}

// ITNs include blank fields and use the received order, unlike checkout forms.
export function buildPayfastNotificationString(payload) {
  const fields = [];
  for (const [key, value] of Object.entries(payload)) {
    if (key === "signature") break;
    if (typeof value !== "string") return null;
    fields.push(`${key}=${encode(value)}`);
  }
  return fields.join("&");
}

export async function verifyPayfastNotification(payload) {
  if (!isValidPayfastSignature(payload)) return false;
  const parameterString = buildPayfastNotificationString(payload);
  const response = await fetch(`${host()}/eng/query/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: parameterString,
    signal: AbortSignal.timeout(10000),
  });
  return response.ok && (await response.text()).trim() === "VALID";
}
