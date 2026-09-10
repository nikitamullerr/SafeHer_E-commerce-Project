import crypto from "node:crypto";

const encode = (value) => encodeURIComponent(String(value).trim())
  .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
  .replace(/%20/g, "+");
const parameters = (data) => Object.entries(data)
  .filter(([key, value]) => key !== "signature" && value !== undefined && value !== null && value !== "")
  .map(([key, value]) => `${key}=${encode(value)}`).join("&");
const host = () => process.env.PAYFAST_SANDBOX === "false" ? "https://www.payfast.co.za" : "https://sandbox.payfast.co.za";

export function createPayfastSignature(data) {
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const content = parameters(data) + (passphrase ? `&passphrase=${encode(passphrase)}` : "");
  return crypto.createHash("md5").update(content).digest("hex");
}

export function createPayfastPaymentUrl(data) {
  const formInputs = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined && value !== null && value !== ""));
  formInputs.signature = createPayfastSignature(formInputs);
  return { url: `${host()}/eng/process`, formInputs };
}

export function isValidPayfastSignature(payload) {
  if (!/^[a-f0-9]{32}$/i.test(payload?.signature || "")) return false;
  return crypto.timingSafeEqual(Buffer.from(createPayfastSignature(payload), "hex"), Buffer.from(payload.signature, "hex"));
}

export async function verifyPayfastNotification(payload) {
  if (!isValidPayfastSignature(payload)) return false;
  const response = await fetch(`${host()}/eng/query/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: parameters(payload),
    signal: AbortSignal.timeout(10000),
  });
  return response.ok && (await response.text()).trim() === "VALID";
}
