import { cn } from "@/lib/utils";

type ContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function Container({
  children,
  className,
}: ContainerProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[1440px] px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16",
        className
      )}
      style={{
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      {children}
    </div>
  );
}