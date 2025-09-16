"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mail,
  Users,
  FileText,
  Send,
  Settings,
  Menu,
  X,
  BarChart3,
  Image as ImageIcon,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/check");
      setIsAuthenticated(response.ok);
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't show navigation for certain pages
  if (
    pathname === "/login" ||
    pathname === "/subscribe" ||
    pathname === "/subscribe/success"
  ) {
    return children;
  }

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Campaigns", href: "/campaigns", icon: Send },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Templates", href: "/templates", icon: FileText },
    { name: "Media Library", href: "/media", icon: ImageIcon },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">
                EmailHub
              </span>
            </div>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6 text-gray-400" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                    ${
                      isActive
                        ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive ? "text-blue-500" : "text-gray-400"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200">
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-600"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center">
            <Mail className="h-6 w-6 text-blue-600" />
            <span className="ml-2 font-semibold text-gray-900">EmailHub</span>
          </div>
          <div className="w-6" /> {/* Spacer */}
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
