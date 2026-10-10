type Props = {
  className?: string;
  /** Decorative when paired with visible text; otherwise leave unset. */
  decorative?: boolean;
};

/** Full THULI wordmark — always scaled to fit, never cropped. */
export function BrandLogo({ className, decorative = false }: Props) {
  return (
    <img
      src="/thuli-logo.jpg"
      alt={decorative ? '' : "THULI — That's How U Learn It"}
      className={className}
      decoding="async"
    />
  );
}
