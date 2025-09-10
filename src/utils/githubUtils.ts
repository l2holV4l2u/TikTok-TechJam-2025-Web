import { GitHubAPI } from "@/lib/github";

export async function fetchRepoFiles(
  owner: string,
  repo: string,
  accessToken: string
) {
  const gh = new GitHubAPI(accessToken);
  const info = await gh.getRepo(owner, repo);
  const branch = await gh.getBranch(owner, repo, info.default_branch);
  const commitSha = branch.commit.sha;

  const tree = await gh.getRepoTree(owner, repo, commitSha);
  const entries = tree.tree.filter(
    (e: any) => e.type === "blob" && e.path.endsWith(".kt")
  );

  const files: { path: string; code: string }[] = [];
  for (const f of entries) {
    const blob = await gh.getBlob(owner, repo, f.sha);
    if (blob.encoding === "base64") {
      const code = Buffer.from(blob.content, "base64").toString("utf-8");
      files.push({ path: f.path, code });
    }
  }

  return files;
}
