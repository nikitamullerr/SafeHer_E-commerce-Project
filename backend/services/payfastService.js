import crypto from "crypto";

const encode = (value) => encodeURIComponent(String(value).trim()).replace(/%20/g, "+");

function createPayfastSignature(data, passphrase = process.env.PAYFAST_PASSPHRASE) {
  const parameterString = Object.entries(data)
    .filter(([key, value]) => key !== "signature" && value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}=${encode(value)}`)
    .join("&");
  const stringToHash = passphrase ? `${parameterString}&passphrase=${encode(passphrase)}` : parameterString;
  return crypto.createHash("md5").update(stringToHash).digest("hex");
}

export function createPayfastPaymentUrl(data) {
  const signature = createPayfastSignature(data);
  const parameters = new URLSearchParams({ ...data, signature });
  const host = process.env.PAYFAST_SANDBOX === "false"
    ? "https://www.payfast.co.za/eng/process"
    : "https://sandbox.payfast.co.za/eng/process";
  return `${host}?${parameters.toString()}`;
}

export function isValidPayfastSignature(payload) {
  if (!payload?.signature) return false;
  const expected = createPayfastSignature(payload);
  return expected === payload.signature;
}