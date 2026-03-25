export default function SettingsLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="mb-6">
        <div className="h-7 w-36 bg-[#173d35]/10 rounded mb-2" />
        <div className="h-4 w-24 bg-[#173d35]/6 rounded" />
      </div>
      <div className="flex gap-2 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-9 w-28 bg-[#173d35]/8 rounded-lg" />
        ))}
      </div>
      <div className="bg-white rounded-[1.5rem] shadow-ambient p-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-[#f0f4f3] last:border-0">
            <div className="h-4 w-36 bg-[#173d35]/10 rounded" />
            <div className="h-4 w-24 bg-[#173d35]/6 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
