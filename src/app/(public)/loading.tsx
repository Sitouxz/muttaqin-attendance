export default function PublicLoading() {
  return (
    <div className="min-h-screen bg-[#f0f4f3] flex items-center justify-center p-6 animate-pulse">
      <div className="w-full max-w-md">
        <div className="h-8 w-48 bg-[#173d35]/10 rounded mx-auto mb-3" />
        <div className="h-5 w-64 bg-[#173d35]/6 rounded mx-auto mb-8" />
        <div className="h-14 w-full bg-[#173d35]/15 rounded-xl mb-3" />
        <div className="h-14 w-full bg-[#735b29]/10 rounded-xl" />
      </div>
    </div>
  );
}
