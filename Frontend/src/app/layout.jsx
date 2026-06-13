import "./globals.css";
import AppProviders from "@/components/contexts/AppProvider";
import { Toaster } from "sonner";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          {children}
        </AppProviders>

        <Toaster
          position="bottom-center"
          toastOptions={{
            className: "!bg-black !text-white !border-[#333333] dark:!bg-white dark:!text-black dark:!border-[#e5e5e5] font-sfpro",
          }}
        />
      </body>
    </html>
  );
}