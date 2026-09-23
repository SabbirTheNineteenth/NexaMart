import styles from "./Skeleton.module.css";

type SkeletonProps = {
  className?: string;
};

function Skeleton({ className = "" }: SkeletonProps) {
  return <span className={`${styles.skeleton} ${className}`.trim()} aria-hidden="true" />;
}

export function SkeletonText({ className = "" }: SkeletonProps) {
  return <Skeleton className={`${styles.text} ${className}`.trim()} />;
}

export function SkeletonCircle({ className = "" }: SkeletonProps) {
  return <Skeleton className={`${styles.circle} ${className}`.trim()} />;
}

export function SkeletonButton({ className = "" }: SkeletonProps) {
  return <Skeleton className={`${styles.button} ${className}`.trim()} />;
}

export function SkeletonImage({ className = "" }: SkeletonProps) {
  return <Skeleton className={`${styles.image} ${className}`.trim()} />;
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return <div className={`${styles.card} ${className}`.trim()} aria-hidden="true"><SkeletonImage /><div><SkeletonText /><SkeletonText className={styles.shortText} /></div></div>;
}

export function SkeletonTableRow({ className = "" }: SkeletonProps) {
  return <div className={`${styles.tableRow} ${className}`.trim()} aria-hidden="true"><SkeletonText /><SkeletonText /><SkeletonText className={styles.shortText} /></div>;
}
