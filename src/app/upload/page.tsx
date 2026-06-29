'use client';

import { useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { UploadWindow } from '@/features/upload-window/upload-window';

export default function UploadPage() {
  const searchParams = useSearchParams();
  const { setTheme, theme } = useTheme();

  useLayoutEffect(() => {
    const t = searchParams.get('theme');
    if ((t === 'light' || t === 'dark') && t !== theme) {
      setTheme(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <UploadWindow standalone />;
}
