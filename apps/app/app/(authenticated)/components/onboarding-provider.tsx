'use client';

import { initializeUserBillableCosts } from '@/app/actions/initialize-user-data';
import { useTranslations } from '@/hooks/use-translation';
import { useAuth } from '@clerk/nextjs';
import { ToastAction } from '@repo/design-system/components/ui/toast';
import { useToast } from '@repo/design-system/hooks/use-toast';
import { useEffect, useState } from 'react';

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { userId, isLoaded } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslations();

  useEffect(() => {
    if (isLoaded && userId && !isInitialized && !isLoading && !hasError) {
      initializeUser();
    }
  }, [isLoaded, userId, isInitialized, isLoading, hasError]);

  const initializeUser = async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      const result = await initializeUserBillableCosts();
      if (result.success) {
        setIsInitialized(true);
        if (result.created) {
          toast({
            title: t('onboarding.welcome'),
            description: t('onboarding.setupSuccess'),
            variant: 'default',
          });
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to initialize user data:', error);
      // Log more details for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      setHasError(true);
      const errorMessage = error instanceof Error ? error.message : t('onboarding.unknownError');
      toast({
        title: t('onboarding.setupError'),
        description: t('onboarding.setupErrorMessage').replace('{errorMessage}', errorMessage),
        variant: 'destructive',
        action: (
          <ToastAction
            altText={t('onboarding.retrySetup')}
            onClick={() => {
              setHasError(false);
              setIsInitialized(false);
            }}
          >
            {t('onboarding.retrySetup')}
          </ToastAction>
        ),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while initializing (only for first-time setup)
  if (!isLoaded || (userId && !isInitialized && isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4 max-w-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t('onboarding.settingUp')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('onboarding.setupSuccess')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If there's an error but user can still use the app, show children with error state
  if (hasError && !isLoading) {
    // Let the component tree render, but the error toast will show
    return <>{children}</>;
  }

  return <>{children}</>;
}
