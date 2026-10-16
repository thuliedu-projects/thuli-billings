import { useEffect, useState } from 'react';

import { fetchPlatformAccess, type PlatformAccess } from '../lib/admin';

export function usePlatformAdmin(userId: string | undefined): PlatformAccess {
  const [access, setAccess] = useState<PlatformAccess>(userId ? 'loading' : 'no');

  useEffect(() => {
    if (!userId) {
      setAccess('no');
      return;
    }
    let active = true;
    setAccess('loading');
    void fetchPlatformAccess().then((next) => {
      if (active) setAccess(next);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  return access;
}
