export default function ProgrammesLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-7 w-36 bg-[#173d35]/10 rounded mb-2" />
          <div className="h-4 w-24 bg-[#173d35]/6 rounded" />
        </div>
        <div className="h-10 w-28 bg-[#173d35]/10 rounded-lg" />
      </div>
      <div className="bg-white rounded-[1.5rem] shadow-ambient overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[#f0f4f3]">
            <div className="h-4 w-4 rounded-full bg-[#173d35]/20" />
            <div className="h-4 w-28 bg-[#173d35]/10 rounded" />
            <div className="h-4 w-40 bg-[#173d35]/6 rounded" />
            <div className="h-5 w-9 bg-[#173d35]/10 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
