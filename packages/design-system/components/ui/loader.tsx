import { cn } from '@repo/design-system/lib/utils';

export const Loader = ({ className }: { className?: string }) => {
  const animationDuration = 1;

  return (
    <>
      <style>
        {`
          @keyframes three-dot-loader-growing {
            0% {
              transform: scale(1) ;
            }
            20% {
              transform: scale(1.3);
            }
            90% {
              transform: scale(1);
            }
          }
        `}
      </style>
      <div className={cn("flex gap-2", className)}>
        {[...new Array(3)].map((_, index) => (
          <div
            className="size-5 origin-center rounded-xl bg-background"
            key={index.toString()}
            style={{
              animationName: "three-dot-loader-growing",
              animationDuration: `${animationDuration}s`,
              animationIterationCount: "infinite",
              animationDirection: "normal",
              animationTimingFunction: "ease-in-out",
              animationDelay: `${(animationDuration / 3) * index}s`,
            }}
          />
        ))}
      </div>
    </>
  );
};
