import "./globals.css";
import AppProviders from "@/components/contexts/AppProvider";
import { Toaster } from "sonner";

// This is an auth-gated, fully client-driven dashboard — there is no SSG/ISR benefit,
// and several pages use useSearchParams(), which fails static prerendering during
// `next build`. Forcing dynamic rendering app-wide makes the production build pass
// and matches how the app actually runs (data is fetched per-request from the API).
export const dynamic = "force-dynamic";

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