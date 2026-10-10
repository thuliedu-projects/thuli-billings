import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { theme } from '@/lib/theme';
import type { SalesPoint } from '@/features/demo';

type Props = {
  points: SalesPoint[];
};

const CHART_HEIGHT = 132;
const DOT_R = 5;

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function SalesOverviewChart({ points }: Props) {
  const [width, setWidth] = useState(0);

  const coords = useMemo(() => {
    if (width <= 0 || points.length === 0) return [];
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, 1);
    const innerW = Math.max(width - DOT_R * 2, 1);
    const innerH = CHART_HEIGHT - 16;

    return points.map((point, index) => {
      const x =
        points.length === 1
          ? width / 2
          : DOT_R + (index / (points.length - 1)) * innerW;
      const y = 8 + (1 - (point.value - min) / span) * innerH;
      return { x, y, label: point.label };
    });
  }, [points, width]);

  const line = useMemo(() => smoothPath(coords), [coords]);
  const area = useMemo(() => {
    if (coords.length === 0 || !line) return '';
    const first = coords[0];
    const last = coords[coords.length - 1];
    return `${line} L ${last.x} ${CHART_HEIGHT} L ${first.x} ${CHART_HEIGHT} Z`;
  }, [coords, line]);

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.purple} stopOpacity="0.28" />
              <Stop offset="1" stopColor={theme.purple} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>
          {area ? <Path d={area} fill="url(#salesFill)" /> : null}
          {line ? (
            <Path d={line} fill="none" stroke={theme.purple} strokeWidth={2.5} />
          ) : null}
          {coords.map((point) => (
            <Circle
              key={point.label}
              cx={point.x}
              cy={point.y}
              r={DOT_R}
              fill={theme.white}
              stroke={theme.purple}
              strokeWidth={2.5}
            />
          ))}
        </Svg>
      ) : (
        <View style={{ height: CHART_HEIGHT }} />
      )}
      <View style={styles.labels}>
        {points.map((point) => (
          <Text key={point.label} style={styles.label} numberOfLines={1}>
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  labels: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    flex: 1,
    textAlign: 'center',
    color: theme.textSecondary,
    fontSize: 10,
  },
});
