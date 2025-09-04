"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { initializeUserBillableCosts } from "../actions/initialize-user-data";
import { useToast } from "@repo/design-system/hooks/use-toast";

interface OnboardingProviderProps {
  children: React.ReactNode;
}

/**
 * OnboardingProvider ensures user data is initialized when they first access the app
 * This replaces the webhook approach with a more predictable client-side initialization
 */
export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);

  useEffect(() => {
    async function initializeUser() {
      if (!isLoaded || !user || isInitializing || initializationComplete) {
        return;
      }

      setIsInitializing(true);

      try {
        const result = await initializeUserBillableCosts();
        
        if (result.success) {
          if (result.created) {
            console.log("✅ User data initialized successfully");
            // Optionally show a welcome toast
            toast({
              title: "Welcome to Formula!",
              description: "Your workspace has been set up with default values.",
            });
          } else {
            console.log("✅ User data already exists");
          }
          setInitializationComplete(true);
        } else {
          console.error("❌ Failed to initialize user data:", result.error);
          toast({
            title: "Setup Error",
            description: "There was an issue setting up your workspace. Please refresh the page.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("❌ Error during user initialization:", error);
        toast({
          title: "Setup Error", 
          description: "Please refresh the page to try again.",
          variant: "destructive",
        });
      } finally {
        setIsInitializing(false);
      }
    }

    initializeUser();
  }, [isLoaded, user, isInitializing, initializationComplete, toast]);

  // Show loading state while initializing
  if (isLoaded && user && !initializationComplete && isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
