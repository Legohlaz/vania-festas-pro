import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

type CategoryCardProps = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  image: string;
  featured?: boolean;
};

export function CategoryCard({ title, description, href, icon: Icon, image, featured = false }: CategoryCardProps) {
  return (
    <Link href={href} className={`group relative flex min-h-[360px] flex-col overflow-hidden rounded-[24px] border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${featured ? "border-emerald-200" : "border-gray-200"}`} style={{ padding: "28px" }}>
      <Image src={image} alt={`Inspiração para ${title}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/70 to-emerald-950/10" />
      <div className="relative flex h-full flex-1 flex-col">
        <div className="flex items-start justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 text-emerald-800 transition-transform duration-300 group-hover:scale-105"><Icon size={27} strokeWidth={1.8} /></div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-emerald-800 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"><ArrowUpRight size={19} /></div>
        </div>
        <h3 className="mt-auto text-xl font-black tracking-tight text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-emerald-50/85">{description}</p>
        <div className="pt-5 text-sm font-bold text-yellow-300">Explorar categoria</div>
      </div>
    </Link>
  );
}
