import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string | ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, className }: PageHeaderProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="rounded-lg p-6 shadow-lg btn-hero animate-gradient-pan">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-white/80 mt-2">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}