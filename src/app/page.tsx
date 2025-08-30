"use client";

import {
  ArrowRightIcon,
  FireIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { Github, Package, Search, Zap } from "lucide-react";
import { signIn } from "next-auth/react";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-100/50 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-100/50 to-transparent"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center p-6 lg:p-8">
        <div className="flex items-center space-x-2 animate-fade-in-left">
          <FireIcon className="w-8 h-8 text-purple-600" />
          <span className="text-gray-900 text-xl font-bold">Tokbokki</span>
        </div>

        <button
          onClick={handleGetStarted}
          className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm border border-gray-200 text-gray-900 px-6 py-2 rounded-full hover:bg-white/90 hover:scale-[1.02] transition-all duration-200 shadow-sm animate-fade-in-right"
        >
          <span>Login</span>
        </button>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="max-w-4xl mx-auto animate-fade-in-up">
          <h1 className="text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight animate-fade-in-up animation-delay-200">
            Visualize Your
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {" "}
              Kotlin{" "}
            </span>
            Dependencies
          </h1>

          <p className="text-xl lg:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-400">
            Detect, analyze, and optimize your Kotlin project dependencies with
            beautiful visualizations and intelligent suggestions.
          </p>

          <button
            onClick={handleGetStarted}
            className="hover:cursor-pointer group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-full text-lg font-semibold hover:scale-[1.02] transition-all duration-200 shadow-xl hover:shadow-purple-500/25 animate-fade-in-up animation-delay-600"
          >
            <span className="flex items-center space-x-2">
              <Github className="w-5 h-5" />
              <span>Get Started with GitHub</span>
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-100" />
            </span>
          </button>
        </div>

        {/* Floating Elements - Pure CSS */}
        <div className="absolute top-20 left-20 w-16 h-16 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full opacity-30 blur-xl animate-float pointer-events-none"></div>
        <div className="absolute bottom-40 right-20 w-24 h-24 bg-gradient-to-r from-blue-300 to-purple-300 rounded-full opacity-25 blur-2xl animate-float-slow pointer-events-none"></div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Everything you need to understand and optimize your Kotlin project
              dependencies
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 hover:bg-white/90 hover:-translate-y-1 transition-all duration-200 shadow-sm hover:shadow-md animate-fade-in-up"
                style={{ animationDelay: `${index * 100 + 800}ms` }}
              >
                <div className="text-purple-600 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

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
    </div>
  );
}
