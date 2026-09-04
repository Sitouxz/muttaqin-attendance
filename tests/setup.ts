import "@testing-library/jest-dom";

// Deterministic stand-ins so modules that read secrets at import/runtime don't
// throw in unit tests (never real values).
process.env.SUPABASE_JWT_SECRET ||= "test-jwt-secret";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";
process.env.RESEND_API_KEY ||= "re_test";
