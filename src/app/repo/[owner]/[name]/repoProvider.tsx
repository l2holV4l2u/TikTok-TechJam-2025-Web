"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { ownerAtom, repoNameAtom } from "@/lib/atom/repoAtom";
import { LoadingSpinner } from "@/components/loading";

interface RepoAtomProviderProps {
  owner: string;
  name: string;
  children: React.ReactNode;
}

export default function RepoAtomProvider({
  owner,
  name,
  children,
}: RepoAtomProviderProps) {
  const [ownerAtomVal, setOwner] = useAtom(ownerAtom);
  const [repoNameAtomVal, setRepoName] = useAtom(repoNameAtom);

  useEffect(() => {
    setOwner(owner);
    setRepoName(name);
  }, [owner, name, setOwner, setRepoName]);

  if (!ownerAtomVal || !repoNameAtomVal) return <LoadingSpinner />;

  return <div className="h-screen bg-gray-50 flex flex-col">{children}</div>;
}
