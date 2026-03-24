import { cn } from "@/lib/utils/cn";

interface BilingualLabelProps {
  my: string;
  en: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: { my: "text-sm font-bold", en: "text-xs" },
  md: { my: "text-base font-bold", en: "text-sm" },
  lg: { my: "text-lg font-bold", en: "text-base" },
};

export function BilingualLabel({ my, en, size = "md", className }: BilingualLabelProps) {
  const classes = sizeClasses[size];
  return (
    <span className={cn("flex flex-col gap-0.5", className)}>
      <span className={cn("text-[#173d35]", classes.my)}>{my}</span>
      <span className={cn("text-[#173d35]/70 font-normal", classes.en)}>{en}</span>
    </span>
  );
}
