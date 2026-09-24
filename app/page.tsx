import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/home/Hero";
import { SearchSection } from "@/components/home/SearchSection";
import { Categories } from "@/components/home/Categories";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    telephone: "+55 71 98609-3473",
    priceRange: "R$",
    image: `${SITE_URL}/images/home/casamento.jpg`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }}
      />
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
