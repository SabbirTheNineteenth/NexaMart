import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  monogram?: boolean;
  priority?: boolean;
};

export function BrandLogo({ className = "", monogram = false, priority = false }: BrandLogoProps) {
  if (monogram) {
    return <span className={`nexamart-monogram ${className}`.trim()} aria-hidden="true"><Image className="nexamart-monogram-image" src="/brand/nexamart-monogram-v1.png" alt="" width={975} height={866} priority={priority} /></span>;
  }
  return <Image className={`nexamart-logo ${className}`.trim()} src="/brand/nexamart-monogram-v1.png" alt="NexaMart" width={975} height={866} priority={priority} />;
}
