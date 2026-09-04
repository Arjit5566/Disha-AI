import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import React, { Suspense } from "react";

// Lazy load the client‑only dashboard component.
const Dashboard = React.lazy(() => import("./dashboard.client"));

import { z } from "zod";

const DashboardSearchSchema = z.object({
  id: z.string().uuid().optional(),
});

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search) => DashboardSearchSchema.parse(search),
  component: () => (
    <ClientOnly fallback={null}>
      <Suspense fallback={<div className="loading">Loading…</div>}>
        <Dashboard />
      </Suspense>
    </ClientOnly>
  ),
});
