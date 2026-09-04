import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import {
  Outlet, Link, createRootRouteWithContext, useRouter,
  HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full gradient-aurora-bg px-5 py-2 text-sm font-medium text-white">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded-full gradient-aurora-bg px-5 py-2 text-sm font-medium text-white">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Disha AI — Guiding Careers Through Intelligence" },
      { name: "description", content: "AI-powered platform that analyzes your resume, finds skill gaps for your target role, and builds your personalized learning roadmap." },
      { property: "og:title", content: "Disha AI — Guiding Careers Through Intelligence" },
      { name: "twitter:title", content: "Disha AI — Guiding Careers Through Intelligence" },
      { property: "og:description", content: "AI-powered platform that analyzes your resume, finds skill gaps for your target role, and builds your personalized learning roadmap." },
      { name: "twitter:description", content: "AI-powered platform that analyzes your resume, finds skill gaps for your target role, and builds your personalized learning roadmap." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/01347a2f-a5a3-4645-aee1-47b400981237/id-preview-90660e82--04c0364f-08f3-456c-af3e-b4fb9c1e4f1a.lovable.app-1780681070604.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/01347a2f-a5a3-4645-aee1-47b400981237/id-preview-90660e82--04c0364f-08f3-456c-af3e-b4fb9c1e4f1a.lovable.app-1780681070604.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: () => (
    <ClientOnly fallback={null}>
      <RootComponent />
    </ClientOnly>
  ),
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Remove injected elements from browser extensions that break hydration
  useEffect(() => {
    const clean = () => {
      const el = document.getElementById('pt-ext-selection');
      if (el && el.parentNode) el.parentNode.removeChild(el);
    };
    // Initial cleanup
    clean();
    // Observe DOM for future injections
    const observer = new MutationObserver(() => {
      clean();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Outlet />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
