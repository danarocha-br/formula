'use client';

import { Button } from '@repo/design-system/components/ui/button';
import { captureException } from '@sentry/nextjs';
import { useTranslations } from '@/hooks/use-translation';
import type NextError from 'next/error';
import { useEffect } from 'react';

type GlobalErrorProperties = {
  readonly error: NextError & { digest?: string };
  readonly reset: () => void;
};

const GlobalError = ({ error, reset }: GlobalErrorProperties) => {
  const { t } = useTranslations();

  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <h1>{t('errors.globalError')}</h1>
        <Button onClick={() => reset()}>{t('errors.tryAgain')}</Button>
      </body>
    </html>
  );
};

export default GlobalError;
