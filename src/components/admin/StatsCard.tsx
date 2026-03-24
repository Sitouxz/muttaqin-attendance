import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StatsCardProps {
  title: { my: string; en: string };
  value: number | string;
  icon: LucideIcon;
  colour?: string;
  className?: string;
}

export function StatsCard({ title, value, icon: Icon, colour = "#173d35", className }: StatsCardProps) {
  return (
    <div className={cn("bg-white rounded-[1.5rem] shadow-ambient p-6 flex items-start gap-4", className)}>
      <div
        className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
        style={{ backgroundColor: `${colour}1a` }}
      >
        <Icon className="size-6" style={{ color: colour }} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-col gap-0.5 mb-2">
          <span className="text-sm font-bold text-[#173d35] leading-tight">{title.my}</span>
          <span className="text-xs text-[#173d35]/60 leading-tight">{title.en}</span>
        </div>
        <p className="text-3xl font-bold text-[#173d35]">{value}</p>
      </div>
    </div>
  );
}
