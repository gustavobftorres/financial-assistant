"use client";

import { usePathname } from "next/navigation";
import { PhantomConnectButton } from "@/components/phantom-connect-button";

export function InvestmentsHeaderActions() {
  const pathname = usePathname();
  if (pathname !== "/investments") return null;
  return (
    <div className="ml-auto">
      <PhantomConnectButton />
    </div>
  );
}
