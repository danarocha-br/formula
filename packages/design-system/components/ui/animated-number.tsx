"use client";
import NumberFlow, { useCanAnimate } from "@number-flow/react";

export function AnimatedNumber({
  value,
  currency,
  className,
  locale = "en-US",
}: {
  value: number;
  currency: string;
  className?: string;
  locale?: string;
}) {
  const canAnimate = useCanAnimate();

  return (
    <>
      <NumberFlow
        className={className}
        value={value}
        aria-hidden
        animated
        willChange
        locales={locale}
        format={{ style: "currency", currency, localeMatcher: "best fit" }}
      />
    </>
  );
}
