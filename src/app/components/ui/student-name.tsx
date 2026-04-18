import { cn } from "./utils";

type StudentStatus = "aktif" | "pindahan" | "keluar" | string | undefined;

interface StudentNameProps {
  name?: string;
  status?: StudentStatus;
  className?: string;
  transferClassName?: string;
}

export function StudentName({
  name,
  status,
  className,
  transferClassName,
}: StudentNameProps) {
  const isHighlighted = status === "pindahan" || status === "keluar";

  return (
    <span
      className={cn(
        className,
        isHighlighted ? transferClassName || "text-red-600" : ""
      )}
    >
      {name || "-"}
    </span>
  );
}
