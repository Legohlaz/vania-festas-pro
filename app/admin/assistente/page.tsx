import type { Metadata } from "next";
import { AssistantConsole } from "@/components/admin/assistant/AssistantConsole";

export const metadata: Metadata = {
  title: "Jarvis · Assistente administrativo",
  robots: { index: false, follow: false },
};

export default function AssistantPage() {
  return <AssistantConsole />;
}
