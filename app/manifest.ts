import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vânia Festas Pro",
    short_name: "Vânia Festas",
    description: "Gestão de reservas e locações da Vânia Festas.",
    start_url: "/admin/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f8f9fa",
    theme_color: "#006b4f",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
