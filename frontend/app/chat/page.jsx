"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Chat from "@/components/Chat/Chat";

export default function ChatPage() {
  const { user, loading, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, initialized, router]);

  if (!initialized || loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading DSync...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <Chat />;
}
