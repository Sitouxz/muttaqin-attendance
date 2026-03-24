export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashOtp(otp: string): Promise<string> {
  const secret = process.env.SUPABASE_JWT_SECRET ?? "fallback-secret";
  const data = new TextEncoder().encode(otp + secret);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(hash).toString("hex");
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  const computed = await hashOtp(otp);
  return computed === hash;
}
