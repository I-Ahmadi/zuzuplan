import { Suspense } from "react";
import { BoardLayout } from "@/features/workspace";
import Providers from "@/config/providers";
import AppRoutes from "@/config/routes";
import { FullScreenMessage } from "@/config/route-guards";

export default function App() {
  return (
    <Providers>
      <BoardLayout>
        <Suspense fallback={<FullScreenMessage message="Loading..." />}>
          <AppRoutes />
        </Suspense>
      </BoardLayout>
    </Providers>
  );
}
