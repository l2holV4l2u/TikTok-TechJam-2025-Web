"use client";

import { useState, useEffect } from "react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GitHubRepo } from "@/lib/github";
import { formatDistanceToNow } from "date-fns";
import {
  Github,
  Search,
  Calendar,
  Star,
  GitFork,
  Lock,
  Globe,
  LogOut,
  ExternalLink,
  ChevronRight,
  Filter,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

interface DashboardClientProps {
  session: Session;
}

interface ReposResponse {
  repos: GitHubRepo[];
  pagination: {
    page: number;
    hasNextPage: boolean;
  };
}

export default function DashboardClient({ session }: DashboardClientProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [allrepos, setAllrepos] = useState<GitHubRepo[]>([]);
  const [loadingAllrepos, setLoadingAllrepos] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [filterLanguage, setFilterLanguage] = useState<string | null>(null);
  const fetchAllRepos = async () => {
    try {
      setLoadingAllrepos(true);
      const response = await fetch(`/api/github/repos?per_page=100`);
      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.statusText}`);
      }
      const data: ReposResponse = await response.json();
      setAllrepos(data.repos);
      while (data.pagination.hasNextPage) {
        const nextPage = data.pagination.page + 1;
        const nextResponse = await fetch(
          `/api/github/repos?page=${nextPage}&per_page=100`
        );
        if (!nextResponse.ok) {
          throw new Error(
            `Failed to fetch repositories: ${nextResponse.statusText}`
          );
        }
        const nextData: ReposResponse = await nextResponse.json();
        setAllrepos((prev) => [...prev, ...nextData.repos]);
        data.pagination.page = nextData.pagination.page;
        data.pagination.hasNextPage = nextData.pagination.hasNextPage;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch repositories"
      );
    } finally {
      setLoadingAllrepos(false);
    }
  };
  const fetchRepos = async (page = 1, search = "") => {
    try {
      setLoading(page === 1);
      setSearching(page === 1 && !!search);

      const params = new URLSearchParams({
        page: page.toString(),
        ...(search && { search }),
      });

      const response = await fetch(`/api/github/repos?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.statusText}`);
      }

      const data: ReposResponse = await response.json();

      if (page === 1) {
        setRepos(data.repos);
      } else {
        setRepos((prev) => [...prev, ...data.repos]);
      }

      setCurrentPage(data.pagination.page);
      setHasNextPage(data.pagination.hasNextPage);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch repositories"
      );
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  useEffect(() => {
    fetchRepos();
    fetchAllRepos();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRepos(1, searchTerm);
  };

  const loadMore = () => {
    if (!loading && hasNextPage) {
      fetchRepos(currentPage + 1, searchTerm);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  // Filter repositories based on selected language
  const filteredRepos = repos.filter((repo) => {
    if (filterLanguage && repo.language !== filterLanguage) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Github size={32} className="text-gray-800" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  GitHub Repository Explorer
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {session.user?.name || session.user?.email}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => signOut()}
              className="gap-2"
            >
              <LogOut size={18} />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Search */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Repositories
            </CardTitle>
            <CardDescription>
              Find repositories by name, description, or filter by programming
              language
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={searching}>
                  {searching ? "Searching..." : "Search"}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">
                  Filter by language:
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-48 justify-between">
                      {filterLanguage || "All languages"}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48">
                    <DropdownMenuItem
                      onSelect={() => setFilterLanguage(null)}
                      className={filterLanguage === null ? "bg-accent" : ""}
                    >
                      All languages
                    </DropdownMenuItem>
                    {Array.from(
                      new Set(
                        repos
                          .map((repo) => repo.language)
                          .filter((lang): lang is string => Boolean(lang))
                      )
                    )
                      .sort()
                      .map((language) => (
                        <DropdownMenuItem
                          key={language}
                          onSelect={() => setFilterLanguage(language)}
                          className={
                            filterLanguage === language ? "bg-accent" : ""
                          }
                        >
                          {language}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {filterLanguage && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFilterLanguage(null)}
                    className="text-xs px-2 py-1 h-7"
                  >
                    Clear filter
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error}</p>
              <Button
                variant="outline"
                onClick={() => fetchRepos(1, searchTerm)}
                className="mt-2"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Repository List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loading && loadingAllrepos && repos.length === 0 ? (
            // Loading skeletons
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredRepos.length === 0 ? (
            <Card className="lg:col-span-2">
              <CardContent className="pt-6 text-center py-12">
                <Github className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || filterLanguage
                    ? "No repositories found"
                    : "No repositories"}
                </h3>
                <p className="text-gray-600">
                  {searchTerm && filterLanguage
                    ? `No repositories match "${searchTerm}" in ${filterLanguage}`
                    : searchTerm
                    ? `No repositories match "${searchTerm}"`
                    : filterLanguage
                    ? `No repositories found for ${filterLanguage}`
                    : "You don't have any repositories yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRepos.map((repo) => (
              <Link
                href={`/repo/${repo.owner.login}/${repo.name}`}
                className="h-full"
                key={repo.id}
              >
                <Card className="h-full flex flex-col hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="flex-1 flex flex-col">
                    <CardTitle>
                      <div className="flex items-center gap-2">
                        {repo.full_name}
                        {repo.private ? (
                          <Lock className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Globe className="w-4 h-4 text-gray-500" />
                        )}
                        <a
                          href={`https://github.com/${repo.full_name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </CardTitle>
                    <CardDescription className="pt-1 flex-1 flex flex-col justify-between">
                      <div className="flex-1">
                        {repo.description && (
                          <p className="text-gray-700 mb-3 line-clamp-2">
                            {repo.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {repo.language && (
                            <span className="flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              {repo.language}
                            </span>
                          )}

                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            {repo.stargazers_count}
                          </span>

                          <span className="flex items-center gap-1">
                            <GitFork className="w-4 h-4" />
                            {repo.forks_count}
                          </span>

                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Updated {formatDate(repo.updated_at)}
                          </span>
                        </div>
                      </div>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))
          )}
        </div>

        {/* Load More */}
        {hasNextPage && repos.length > 0 && (
          <div className="mt-8 text-center">
            <Button
              onClick={loadMore}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              {loading ? (
                "Loading..."
              ) : (
                <>
                  Load More
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>
            Showing {filteredRepos.length} of {allrepos.length} repositories •
            Powered by GitHub API • Built with Next.js
          </p>
        </div>
      </div>
    </div>
  );
}
