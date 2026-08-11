import { Container } from "@/components/common/Container";
import { ProductCard } from "@/components/products/ProductCard";

const products = [
  {
    id: "painel-redondo",
    slug: "painel-redondo",
    name: "Painel Redondo",
    category: "Decoração",
    price: "A partir de R$ 90",
  },
  {
    id: "mesa-provencal",
    slug: "mesa-provencal",
    name: "Mesa Provençal",
    category: "Móveis",
    price: "A partir de R$ 120",
  },
  {
    id: "kit-pegue-e-monte",
    slug: "kit-pegue-e-monte",
    name: "Kit Pegue e Monte",
    category: "Kits",
    price: "A partir de R$ 180",
  },
  {
    id: "arco-de-baloes",
    slug: "arco-de-baloes",
    name: "Arco de Balões",
    category: "Balões",
    price: "A partir de R$ 150",
  },
];

export function FeaturedProducts() {
  return (
    <section
      className="border-t border-gray-100 bg-gray-50"
      style={{
        paddingTop: "96px",
        paddingBottom: "112px",
      }}
    >
      <Container>
        {/* Cabeçalho */}
        <div>
          <span className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            Mais procurados
          </span>

          <h2
            className="text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl lg:text-5xl"
            style={{
              marginTop: "14px",
            }}
          >
            Produtos em destaque
          </h2>

          <p
            className="max-w-2xl text-base leading-7 text-gray-600 sm:text-lg"
            style={{
              marginTop: "18px",
            }}
          >
            Os itens mais procurados pelos nossos clientes.
          </p>
        </div>

        {/* Produtos */}
        <div
          className="grid md:grid-cols-2 xl:grid-cols-4"
          style={{
            marginTop: "48px",
            gap: "28px",
          }}
        >
          {products.map((product) => (
            <ProductCard
              key={product.name}
              {...product}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
