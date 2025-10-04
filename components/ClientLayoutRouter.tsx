"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Settings } from "@/types";

interface ClientLayoutRouterProps {
  children: React.ReactNode;
}

export default function ClientLayoutRouter({
  children,
}: ClientLayoutRouterProps) {
  const pathname = usePathname();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    // Fetch settings for company name and brand logo
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };

    fetchSettings();
  }, []);

  // Pages that don't use the main layout
  const noLayoutPages = ["/login", "/subscribe", "/subscribe/success"];

  if (noLayoutPages.includes(pathname) || pathname.startsWith("/public/")) {
    return <>{children}</>;
  }

  const companyName = settings?.metadata.company_name || "Email Marketing";
  const brandLogoUrl = settings?.metadata.brand_logo?.imgix_url;

  return (
    <Layout companyName={companyName} brandLogoUrl={brandLogoUrl}>
      {children}
    </Layout>
  );
}