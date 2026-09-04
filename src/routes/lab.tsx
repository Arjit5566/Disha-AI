import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import React, { Suspense } from "react";
import { AuthGate } from "@/components/AuthGate";
import { Loader2 } from "lucide-react";

const Lab = React.lazy(() => import("./lab.client.tsx"));

export const Route = createFileRoute("/lab")({
  head: () => ({ meta: [{ title: "Lab Evaluator — Disha AI" }] }),
  component: () => (
    <AuthGate>
      <ClientOnly fallback={<div className="grid h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
        <Suspense fallback={<div className="grid h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
          <Lab />
        </Suspense>
      </ClientOnly>
    </AuthGate>
  ),
});
