export default function SessionDetailLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="h-4 w-28 bg-[#173d35]/10 rounded mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-[1.5rem] shadow-ambient p-6 h-48" />
        <div className="bg-white rounded-[1.5rem] shadow-ambient p-6 h-48" />
      </div>
      <div className="bg-white rounded-[1.5rem] shadow-ambient p-6 h-64" />
    </div>
  );
}
