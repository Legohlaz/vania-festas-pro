import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { AssistantReminders } from "@/components/admin/assistant/AssistantReminders";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminNavigation />
      {children}
      <AssistantReminders />
    </>
  );
}
