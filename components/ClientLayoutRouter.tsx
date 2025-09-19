"use client";

import { usePathname } from "next/navigation";
import Layout from "@/components/Layout";

interface ClientLayoutRouterProps {
  children: React.ReactNode;
  companyName: string;
}

export default function ClientLayoutRouter({ children, companyName }: ClientLayoutRouterProps) {
  const pathname = usePathname();
  
  // Don't apply the Layout component to public campaign pages
  if (pathname.startsWith('/public/campaigns/')) {
    return <>{children}</>;
  }
  
  return (
    <Layout companyName={companyName}>
      {children}
    </Layout>
  );
}