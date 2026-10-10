import { useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { motion, useReducedMotion } from '@/lib/motion';

type AnimatedNumberProps = {
  value: number;
  format?: (n: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
};

/** Animates a number from its previous value to the next (dashboard counts). */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  style,
  duration = motion.reveal,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    if (reduced) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }

    const from = displayRef.current;
    const to = value;
    if (from === to) return;

    const start = Date.now();
    let frame = 0;

    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = from + (to - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, reduced, value]);

  return <Text style={style}>{format(display)}</Text>;
}
