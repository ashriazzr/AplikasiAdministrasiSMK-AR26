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
  const isTransfer = status === "pindahan";

  return (
    <span
      className={cn(
        className,
        isTransfer ? transferClassName || "text-red-600" : ""
      )}
    >
      {name || "-"}
    </span>
  );
}
