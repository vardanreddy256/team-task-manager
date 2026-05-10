"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Team management lives inside each project (members section), so this
 * top-level /teams route just redirects to /projects.
 */
export default function TeamsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/projects");
  }, [router]);
  return null;
}
