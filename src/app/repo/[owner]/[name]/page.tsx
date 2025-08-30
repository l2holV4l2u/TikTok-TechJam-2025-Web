import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import RepoClient from "./repo-client";

interface RepoPageProps {
  params: Promise<{
    owner: string;
    name: string;
  }>;
}

export default async function RepoPage({ params }: RepoPageProps) {
  const session = await auth();
  const resolvedParams = await params;

  if (!session) {
    redirect("/");
  }

  return <RepoClient owner={resolvedParams.owner} name={resolvedParams.name} />;
}
