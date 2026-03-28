import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MyPortal HR",
    short_name: "MyPortal",
    description: "Employee HR portal for documents, leaves, and payslips.",
    start_url: "/login",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#163b73",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512-2.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}