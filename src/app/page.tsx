"use client";

import {
  ArrowRightIcon,
  FireIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { Github, Package, Search, Zap, Sparkles } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function Home() {
  const features = [
    {
      icon: <Search className="w-6 h-6" />,
      title: "Smart Detection",
      description:
        "Automatically scan and detect all dependencies in your Kotlin projects with intelligent parsing.",
    },
    {
      icon: <ChartBarIcon className="w-6 h-6" />,
      title: "Visual Analysis",
      description:
        "Beautiful interactive graphs and charts to understand your dependency relationships.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Smart Suggestions",
      description:
        "Get AI-powered recommendations for optimizing and updating your dependencies.",
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: "Version Management",
      description:
        "Track versions, identify conflicts, and manage updates across your entire project.",
    },
  ];

  const handleGetStarted = async () => {
    try {
      await signIn("github", {
        callbackUrl: "/dashboard",
        redirect: true,
      });
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleSeeFeatures = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const featuresSection = document.getElementById("features");
    if (featuresSection) {
      featuresSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 overflow-hidden relative">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-100/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-100/60 to-transparent"></div>
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-300/30 to-pink-300/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-300/30 to-purple-300/30 rounded-full blur-3xl animate-pulse animation-delay-1000"></div>
      </div>
      {/* Enhanced Navigation */}
      <nav className="relative z-10 flex justify-between items-center p-6 lg:p-8 backdrop-blur-sm bg-white/10 border-b border-white/20">
        <div className="flex items-center space-x-2 animate-fade-in-left">
          <div className="relative">
            <FireIcon className="w-8 h-8 text-purple-600" />
            <Sparkles className="w-4 h-4 text-pink-500 absolute -top-1 -right-1 animate-ping" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Tokbokki
          </span>
        </div>

        <Link
          href="/docs"
          className="group relative flex items-center space-x-2 bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-sm border border-white/40 text-gray-900 px-6 py-3 rounded-full hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl animate-fade-in-right overflow-hidden"
        >
          <DocumentTextIcon className="w-5 h-5 text-purple-600 relative z-10" />
          <span className="font-medium relative z-10">Documentation</span>
          <ArrowRightIcon className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition-transform duration-200 relative z-10" />
        </Link>
      </nav>
      {/* Enhanced Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="max-w-5xl mx-auto animate-fade-in-up">
          {/* Hero Badge */}
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-8 animate-fade-in-up animation-delay-100">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Dependency Analysis</span>
          </div>

          <h1 className="text-6xl lg:text-8xl font-bold text-gray-900 mb-8 leading-tight animate-fade-in-up animation-delay-200">
            Visualize Your
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-800 bg-clip-text text-transparent block lg:inline">
              {" "}
              Knit{" "}
            </span>
            Dependencies
          </h1>

          <p className="text-xl lg:text-2xl text-gray-700 mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in-up animation-delay-400">
            Detect, analyze, and optimize your Kotlin project dependencies with
            beautiful visualizations, intelligent suggestions, and powerful
            insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center ">
            <button
              onClick={handleGetStarted}
              className="group flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white backdrop-blur-sm border border-gray-200 text-gray-900 px-8 py-4 font-semibold rounded-full hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl hover:cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300"></div>
              <span className="flex items-center space-x-2 relative z-10">
                <Github className="w-5 h-5" />
                <span>Get Started with GitHub</span>
                <ArrowRightIcon className="w-5 h-5 transition-transform duration-300" />
              </span>
            </button>

            <Link
              href="#features"
              onClick={handleSeeFeatures}
              className="group flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-900 px-8 py-4 rounded-full hover:bg-white/90 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="font-medium">See Features</span>
              <ArrowRightIcon className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>
        </div>

        {/* Enhanced Floating Elements */}
        <div className="absolute top-20 left-20 w-20 h-20 bg-gradient-to-r from-purple-400/40 to-pink-400/40 rounded-full blur-xl animate-float pointer-events-none"></div>
        <div className="absolute bottom-40 right-20 w-32 h-32 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full blur-2xl animate-float-slow pointer-events-none"></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-gradient-to-r from-pink-400/30 to-purple-400/30 rounded-full blur-lg animate-pulse pointer-events-none"></div>
      </div>
      {/* Features Section */}
      {/* Enhanced Features Section */}
      <div id="features" className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Powerful Features for
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {" "}
                Modern Development
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to understand, optimize, and maintain your
              Kotlin project dependencies
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Github className="w-8 h-8 text-purple-600" />,
                title: "GitHub Integration",
                description:
                  "Connect your GitHub repositories seamlessly and analyze dependencies in real-time",
                gradient: "from-purple-500 to-purple-600",
              },
              {
                icon: <ArrowRightIcon className="w-8 h-8 text-pink-600" />,
                title: "Interactive Visualizations",
                description:
                  "Beautiful, interactive dependency graphs with zoom, pan, and filtering capabilities",
                gradient: "from-pink-500 to-pink-600",
              },
              {
                icon: <Sparkles className="w-8 h-8 text-indigo-600" />,
                title: "AI-Powered Insights",
                description:
                  "Get intelligent suggestions for optimizing dependencies and resolving conflicts",
                gradient: "from-indigo-500 to-indigo-600",
              },
              {
                icon: <DocumentTextIcon className="w-8 h-8 text-emerald-600" />,
                title: "Detailed Analysis",
                description:
                  "Comprehensive dependency reports and update recommendations",
                gradient: "from-emerald-500 to-emerald-600",
              },
              {
                icon: <Package className="w-8 h-8 text-blue-600" />,
                title: "Multi-Project Support",
                description:
                  "Analyze multiple Kotlin projects and compare dependency patterns across repositories",
                gradient: "from-blue-500 to-blue-600",
              },
              {
                icon: <ChartBarIcon className="w-8 h-8 text-violet-600" />,
                title: "Graph Comparison",
                description:
                  "Compare original dependency graphs with AI-improved versions for better analysis",
                gradient: "from-violet-500 to-violet-600",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white/80 backdrop-blur-sm border border-gray-200 p-8 rounded-2xl hover:bg-white/90 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                ></div>
                <div className="relative z-10">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="relative p-3 rounded-full overflow-hidden">
                      <div
                        className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-10`}
                      ></div>
                      <div className="relative z-10">{feature.icon}</div>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>{" "}
      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-gray-600">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <FireIcon className="w-6 h-6 text-purple-600" />
            <span className="text-gray-900 font-semibold">Tokbokki</span>
          </div>

          <div className="text-sm text-center md:text-right">
            <p>&copy; 2025 Tokbokki. All rights reserved.</p>
          </div>
        </div>
      </footer>
      {/* Enhanced Animations and Styles */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-10px) rotate(2deg);
          }
          66% {
            transform: translateY(5px) rotate(-1deg);
          }
        }

        @keyframes float-slow {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          50% {
            transform: translateY(-15px) rotate(3deg) scale(1.05);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-glow {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.6;
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }

        .animate-pulse-glow {
          animation: pulse-glow 4s ease-in-out infinite;
        }

        .animation-delay-100 {
          animation-delay: 0.1s;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
        }

        .animation-delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}
