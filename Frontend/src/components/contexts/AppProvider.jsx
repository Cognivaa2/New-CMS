"use client";

import { ThemeProvider } from "@/components/contexts/ThemeProvider";
import { NotificationProvider } from "@/components/contexts/NotificationContext";
import { SidebarProvider } from "@/components/contexts/SidebarContext";
import { AuthProvider } from "@/components/contexts/AuthContext";

export default function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <SidebarProvider>
            {children}
          </SidebarProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}