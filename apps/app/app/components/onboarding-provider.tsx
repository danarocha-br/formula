"use client";

import { useUser } from "@clerk/nextjs";
import type React from "react";
import { useEffect, useState } from "react";

import { useToast } from "@repo/design-system/hooks/use-toast";
import { initializeUserBillableCosts } from "../actions/initialize-user-data";

interface OnboardingProviderProps {
  children: React.ReactNode;
}

/**
 * OnboardingProvider ensures user data is initialized when they first access the app
 * This replaces the webhook approach with a more predictable client-side initialization
 */
export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const t = useTranslations();
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
            // Optionally show a welcome toast
            toast({
              title: t("onboarding.welcome"),
              description: t("onboarding.setupSuccess"),
            });
          } else {
            console.log("✅ User data already exists");
          }
          setInitializationComplete(true);
        } else {
          console.error("❌ Failed to initialize user data:", result.error);
          toast({
            title: t("onboarding.setupError"),
            description: t("onboarding.setupErrorMessage", { errorMessage: result.error || t("onboarding.unknownError") }),
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("❌ Error during user initialization:", error);
        toast({
          title: t("onboarding.setupError"),
          description: t("onboarding.setupErrorMessage", { errorMessage: t("onboarding.unknownError") }),
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
          <p className="text-muted-foreground">{t("onboarding.settingUp")}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
