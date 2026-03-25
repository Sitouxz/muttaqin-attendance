export default function SessionsLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-7 w-32 bg-[#173d35]/10 rounded mb-2" />
          <div className="h-4 w-20 bg-[#173d35]/6 rounded" />
        </div>
        <div className="h-10 w-28 bg-[#173d35]/10 rounded-lg" />
      </div>
      <div className="bg-white rounded-[1.5rem] shadow-ambient overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[#f0f4f3]">
            <div className="h-4 w-24 bg-[#173d35]/10 rounded" />
            <div className="h-4 w-40 bg-[#173d35]/8 rounded" />
            <div className="h-5 w-16 bg-[#173d35]/10 rounded-full" />
            <div className="h-4 w-12 bg-[#173d35]/6 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
