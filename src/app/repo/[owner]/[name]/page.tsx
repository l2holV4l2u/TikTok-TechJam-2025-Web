import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import RepoClient from "./repoClient";
import { Header } from "./header";
import RepoAtomProvider from "./repoProvider";

export default async function RepoPage({
  params,
}: {
  params: Promise<{
    owner: string;
    name: string;
  }>;
}) {
  const session = await auth();
  const resolvedParams = await params;

  if (!session) {
    redirect("/");
  }

  return (
    <RepoAtomProvider owner={resolvedParams.owner} name={resolvedParams.name}>
      <Header />
      <RepoClient />
    </RepoAtomProvider>
  );
}
