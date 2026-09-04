import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import React, { Suspense } from "react";
import { AuthGate } from "@/components/AuthGate";
import { Loader2 } from "lucide-react";

const Quiz = React.lazy(() => import("./quiz.client"));

export const Route = createFileRoute("/quiz")({
  head: () => ({ meta: [{ title: "Quiz AI — Disha AI" }] }),
  component: () => (
    <AuthGate>
      <ClientOnly fallback={<div className="grid h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
        <Suspense fallback={<div className="grid h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
          <Quiz />
        </Suspense>
      </ClientOnly>
    </AuthGate>
  ),
});
