export default function DashboardLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="h-7 w-48 bg-[#173d35]/10 rounded mb-2" />
      <div className="h-4 w-24 bg-[#173d35]/6 rounded mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-[1.5rem] shadow-ambient p-6 h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-[1.5rem] shadow-ambient p-6 h-80" />
        <div className="bg-white rounded-[1.5rem] shadow-ambient p-6 h-80" />
      </div>
    </div>
  );
}
