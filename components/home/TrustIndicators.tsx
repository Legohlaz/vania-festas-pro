import {
  CalendarCheck,
  Clock3,
  ShieldCheck,
  Truck,
} from "lucide-react";

const indicators = [
  {
    icon: CalendarCheck,
    title: "+2.000 eventos",
    description: "Experiência em festas de todos os portes",
  },
  {
    icon: Clock3,
    title: "Resposta rápida",
    description: "Atendimento ágil pelo WhatsApp",
  },
  {
    icon: Truck,
    title: "Entrega e montagem",
    description: "Levamos tudo até o seu evento",
  },
  {
    icon: ShieldCheck,
    title: "Qualidade garantida",
    description: "Materiais revisados e higienizados",
  },
];

export function TrustIndicators() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {indicators.map(({ icon: Icon, title, description }) => (
        <div
          key={title}
          className="
            flex
            items-start
            gap-4
            rounded-2xl
            border
            border-emerald-100
            bg-white
            p-5
            shadow-sm
            transition-all
            hover:-translate-y-1
            hover:shadow-lg
          "
        >
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-xl
              bg-emerald-100
            "
          >
            <Icon
              size={24}
              className="text-emerald-700"
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">
              {title}
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-600">
              {description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
