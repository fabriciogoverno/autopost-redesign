'use client';

import { useEffect } from 'react';
import { ensureSeedTemplate } from '@/lib/seedTemplate';

export function SeedTemplateLoader() {
  useEffect(() => {
    ensureSeedTemplate();
  }, []);
  return null;
}
