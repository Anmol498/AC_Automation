export const Skeleton = ({ className }: { className?: string }) => {
  return (
    <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-700/50 ${className || ''}`} />
  );
};
