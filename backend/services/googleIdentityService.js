import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client();
export async function verifyGoogleIdentity(credential) {
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) throw Object.assign(new Error("Google sign-in is unavailable. Please try again later."), { status: 503 });
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience });
    const identity = ticket.getPayload();
    if (!identity?.sub || !identity.email || identity.email_verified !== true) throw new Error("Unverified identity");
    return identity;
  } catch {
    throw Object.assign(new Error("Google could not verify your sign-in. Please try again."), { status: 401 });
  }
}
