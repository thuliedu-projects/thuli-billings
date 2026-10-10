import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { loadAccess, paymentRequiredRoute } from './access';

/** Logged-in users without an active plan stay on the pay screen. */
export function SubscriptionGate() {
  const segments = useSegments();
  const router = useRouter();
  const group = segments[0];
  const screen = segments[1] as string | undefined;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const access = await loadAccess();
      if (cancelled) return;
      if (access.state === 'signed_out') return;

      if (access.state === 'paid') {
        if (group === '(auth)' && screen === 'payment-required') {
          router.replace('/(tabs)/dashboard');
        }
        return;
      }

      const openAuth =
        group === '(auth)' &&
        (screen == null || screen === 'verify-otp' || screen === 'payment-required');
      if (openAuth) return;
      router.replace(paymentRequiredRoute);
    })();

    return () => {
      cancelled = true;
    };
  }, [group, screen, router]);

  return null;
}
