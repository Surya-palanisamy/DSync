"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Login from "@/components/Auth/Login";

export default function LoginPage() {
  const { user, loading, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !loading && user) {
      router.replace("/chat");
    }
  }, [user, loading, initialized, router]);

  if (!initialized || loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return <Login />;
}
