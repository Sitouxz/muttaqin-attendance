export default function MonitoringLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="h-7 w-56 bg-[#173d35]/10 rounded mb-2" />
          <div className="h-4 w-72 bg-[#173d35]/6 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-64 bg-[#173d35]/8 rounded-full" />
          <div className="h-10 w-24 bg-[#173d35]/8 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-[1.5rem] shadow-ambient p-6">
            <div className="h-4 w-28 bg-[#173d35]/8 rounded mb-3" />
            <div className="h-8 w-16 bg-[#173d35]/10 rounded" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2 bg-white rounded-[1.5rem] shadow-ambient p-6">
          <div className="h-5 w-40 bg-[#173d35]/10 rounded mb-4" />
          <div className="h-[260px] bg-[#173d35]/5 rounded-xl" />
        </div>
        <div className="bg-white rounded-[1.5rem] shadow-ambient p-6">
          <div className="h-5 w-36 bg-[#173d35]/10 rounded mb-4" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="h-4 w-32 bg-[#173d35]/8 rounded mb-2" />
                <div className="h-2 w-full bg-[#173d35]/6 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[1.5rem] shadow-ambient p-6">
        <div className="h-5 w-32 bg-[#173d35]/10 rounded mb-4" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-[#f0f4f3] last:border-0">
            <div className="size-8 rounded-full bg-[#173d35]/8 shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-40 bg-[#173d35]/10 rounded mb-2" />
              <div className="h-3 w-56 bg-[#173d35]/6 rounded" />
            </div>
            <div className="h-3 w-28 bg-[#173d35]/6 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
