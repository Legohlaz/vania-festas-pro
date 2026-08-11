import {
  Baby,
  Balloon,
  CakeSlice,
  GraduationCap,
  Heart,
  PartyPopper,
  Sparkles,
} from "lucide-react";

import { Container } from "@/components/common/Container";
import { CategoryCard } from "@/components/categories/CategoryCard";

const categories = [
  {
    title: "Casamentos",
    description:
      "Ambientes elegantes para cerimônias, recepções e celebrações especiais.",
    href: "/catalogo?categoria=casamentos",
    icon: Heart,
    featured: true,
  },
  {
    title: "15 Anos",
    description:
      "Cenários marcantes para celebrar uma das datas mais especiais.",
    href: "/catalogo?categoria=15-anos",
    icon: Sparkles,
  },
  {
    title: "Festa Infantil",
    description:
      "Temas e composições para festas infantis de diferentes estilos.",
    href: "/catalogo?categoria=infantil",
    icon: Balloon,
  },
  {
    title: "Aniversários Adultos",
    description:
      "Do rústico ao sofisticado para comemorações cheias de personalidade.",
    href: "/catalogo?categoria=adultos",
    icon: CakeSlice,
  },
  {
    title: "Formaturas",
    description:
      "Decoração para celebrar conquistas e transformar a formatura em memória.",
    href: "/catalogo?categoria=formaturas",
    icon: GraduationCap,
  },
  {
    title: "Chá de Fraldas",
    description:
      "Decorações delicadas para celebrar a chegada de um novo integrante.",
    href: "/catalogo?categoria=cha-de-fraldas",
    icon: Baby,
  },
  {
    title: "Chá Revelação",
    description:
      "Cenários especiais para transformar a grande descoberta em celebração.",
    href: "/catalogo?categoria=cha-revelacao",
    icon: PartyPopper,
  },
];

export function Categories() {
  return (
    <section
      style={{
        paddingTop: "88px",
        paddingBottom: "104px",
      }}
    >
      <Container>
        {/* Cabeçalho */}
        <div
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between"
          style={{ gap: "32px" }}
        >
          <div>
            <span className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
              Encontre sua inspiração
            </span>

            <h2
              className="max-w-2xl text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl lg:text-5xl"
              style={{ marginTop: "14px" }}
            >
              Qual momento você vai celebrar?
            </h2>

            <p
              className="max-w-2xl text-base leading-7 text-gray-600 sm:text-lg"
              style={{ marginTop: "18px" }}
            >
              Explore nossos trabalhos por tipo de evento e encontre ideias
              para criar uma celebração com a sua personalidade.
            </p>
          </div>

          <p className="max-w-sm text-sm leading-6 text-gray-500 lg:text-right">
            Depois você poderá filtrar por tema, estilo, cores e outros
            detalhes diretamente no catálogo.
          </p>
        </div>

        {/* Categorias */}
        <div
          className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          style={{
            marginTop: "48px",
            gap: "24px",
          }}
        >
          {categories.map((category) => (
            <CategoryCard
              key={category.title}
              {...category}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}