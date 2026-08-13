"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Container } from "@/components/common/Container";
import { ProductCard } from "@/components/products/ProductCard";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string | number;
  name: string;
  slug: string;
  category: string | null;
  price: number;
  image_url: string | null;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadFeaturedProducts() {
      try {
        const supabase = createClient();

        const { data: featuredProducts, error: featuredError } =
          await supabase
            .from("products")
            .select("id, name, slug, category, price, image_url")
            .eq("active", true)
            .eq("featured", true)
            .order("name")
            .limit(4);

        if (featuredError) {
          throw featuredError;
        }

        let nextProducts = (featuredProducts ?? []) as Product[];

        // Enquanto ainda não houver itens marcados como destaque,
        // mostramos produtos reais do catálogo em vez de exemplos fictícios.
        if (nextProducts.length === 0) {
          const { data: catalogProducts, error: catalogError } =
            await supabase
              .from("products")
              .select("id, name, slug, category, price, image_url")
              .eq("active", true)
              .order("name")
              .limit(4);

          if (catalogError) {
            throw catalogError;
          }

          nextProducts = (catalogProducts ?? []) as Product[];
        }

        if (mounted) {
          setProducts(nextProducts);
        }
      } catch (error) {
        console.error("Erro ao carregar produtos em destaque:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadFeaturedProducts();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section
      className="border-t border-gray-100 bg-gray-50"
      style={{ paddingTop: "96px", paddingBottom: "112px" }}
    >
      <Container>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
              Mais procurados
            </span>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl lg:text-5xl">
              Produtos em destaque
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
              Itens reais do nosso acervo para deixar seu evento ainda mais especial.
            </p>
          </div>

          <Link
            href="/catalogo"
            className="inline-flex w-fit items-center justify-center rounded-xl border border-emerald-700 px-5 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
          >
            Ver catálogo completo
          </Link>
        </div>

        {loading && (
          <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-4" style={{ marginTop: "48px" }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-[430px] animate-pulse rounded-[24px] border border-gray-200 bg-white" />
            ))}
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-4" style={{ marginTop: "48px" }}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                name={product.name}
                slug={product.slug}
                category={product.category ?? "Outros"}
                price={`A partir de ${formatPrice(Number(product.price) || 0)}`}
                imageUrl={product.image_url}
              />
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="mt-12 rounded-[24px] border border-gray-200 bg-white px-6 py-12 text-center">
            <p className="font-semibold text-gray-600">
              Em breve, novos produtos estarão em destaque.
            </p>
          </div>
        )}
      </Container>
    </section>
  );
}
