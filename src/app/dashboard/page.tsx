import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardClient from "./dashboard-client"

export default async function Dashboard() {
  const session = await auth()

  if (!session) {
    redirect("/")
  }

  return <DashboardClient session={session} />
}
