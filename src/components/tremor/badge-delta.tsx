import { RiArrowUpSFill, RiArrowDownSFill, RiSubtractFill } from "@remixicon/react";
import { tv, type VariantProps } from "tailwind-variants";

const badgeDeltaVariants = tv({
  base: "inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset",
  variants: {
    type: {
      increase: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-800",
      decrease: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-800",
      unchanged: "bg-gray-50 text-gray-600 ring-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-700",
    },
    size: {
      sm: "text-[10px] px-1.5 py-0",
      md: "text-xs px-2 py-0.5",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

interface BadgeDeltaProps extends VariantProps<typeof badgeDeltaVariants> {
  value: number;
  className?: string;
}

export function BadgeDelta({ value, size, className }: BadgeDeltaProps) {
  const type = value > 0 ? "increase" : value < 0 ? "decrease" : "unchanged";
  const Icon =
    type === "increase"
      ? RiArrowUpSFill
      : type === "decrease"
        ? RiArrowDownSFill
        : RiSubtractFill;

  return (
    <span className={badgeDeltaVariants({ type, size, className })}>
      <Icon className="size-3.5 shrink-0" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}
