export default function AttendanceLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="mb-6">
        <div className="h-7 w-36 bg-[#173d35]/10 rounded mb-2" />
        <div className="h-4 w-24 bg-[#173d35]/6 rounded" />
      </div>
      <div className="bg-white rounded-[1.5rem] shadow-ambient p-4 mb-4 flex gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 flex-1 bg-[#173d35]/8 rounded-lg" />
        ))}
      </div>
      <div className="bg-white rounded-[1.5rem] shadow-ambient overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-2.5 border-b border-[#f0f4f3]">
            <div className="h-4 w-36 bg-[#173d35]/10 rounded" />
            <div className="h-4 w-24 bg-[#173d35]/8 rounded" />
            <div className="h-4 w-28 bg-[#173d35]/6 rounded" />
            <div className="h-5 w-16 bg-[#173d35]/10 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
