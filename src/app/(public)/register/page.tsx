import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RegistrationForm } from "@/components/public/RegistrationForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#f0f4f3] text-[#173d35] hover:bg-[#e6eeec] transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#173d35]">Pendaftaran</h1>
            <p className="text-sm text-[#173d35]/60">Registration</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-[1.5rem] shadow-[0_20px_40px_rgba(11,28,48,0.06)] bg-white p-6">
          <RegistrationForm />
        </div>
      </div>
    </div>
  );
}
