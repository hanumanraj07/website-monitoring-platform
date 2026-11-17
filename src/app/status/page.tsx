import { redirect } from "next/navigation";

export default function StatusIndexPage() {
  // Redirect /status to default status page
  redirect("/status/default");
}
