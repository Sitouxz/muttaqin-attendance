export default function ParticipantDetailLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="h-4 w-28 bg-[#173d35]/10 rounded mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-[1.5rem] shadow-ambient p-6 h-56" />
        <div className="bg-white rounded-[1.5rem] shadow-ambient p-6 h-56 flex flex-col items-center gap-4">
          <div className="h-5 w-20 bg-[#173d35]/10 rounded" />
          <div className="w-48 h-48 bg-[#173d35]/8 rounded-lg" />
          <div className="h-9 w-full bg-[#173d35]/10 rounded-lg" />
        </div>
      </div>
      <div className="bg-white rounded-[1.5rem] shadow-ambient p-6 h-64" />
    </div>
  );
}
