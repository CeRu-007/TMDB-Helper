'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/button';
import Link from 'next/link';

export default function NotFound() {
  const { t } = useTranslation('errors');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <h2 className="text-2xl font-semibold text-muted-foreground">{t('pageNotFound')}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">{t('pageNotFoundDescription')}</p>
        <Link href="/">
          <Button size="lg">{t('backToHome')}</Button>
        </Link>
      </div>
    </div>
  );
}
