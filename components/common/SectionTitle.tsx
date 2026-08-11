import { cn } from "@/lib/utils";

type SectionTitleProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

export function SectionTitle({
  title,
  subtitle,
  className,
}: SectionTitleProps) {
  return (
    <div className={cn("mb-14", className)}>
      <h2 className="text-4xl font-extrabold tracking-tight text-[var(--primary)] lg:text-5xl">
        {title}
      </h2>

      {subtitle && (
        <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-600">
          {subtitle}
        </p>
      )}
    </div>
  );
}