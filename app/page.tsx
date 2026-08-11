import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/home/Hero";
import { SearchSection } from "@/components/home/SearchSection";
import { Categories } from "@/components/home/Categories";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";

export default function HomePage() {
  return (
    <>
      <Header />

      <main>
        <Hero />
        <SearchSection />
        <Categories />
        <FeaturedProducts />
      </main>
    </>
  );
}