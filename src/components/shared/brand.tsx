import Image from "next/image";

import { siteConfig } from "@/config/site";

interface BrandProps {
  compact?: boolean;
  priority?: boolean;
}

/** Official NAC mark, cropped from the supplied source without altering the artwork. */
export function Brand({ compact = false, priority = false }: BrandProps) {
  return (
    <div className="flex items-center gap-3" aria-label={`${siteConfig.academyName} ${siteConfig.name}`}>
      <Image alt="NAC — New Athletic Center" className="h-12 w-auto shrink-0 object-contain sm:h-14" height={305} priority={priority} src="/logos/nac-header.webp" width={710} />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[0.6rem] font-bold uppercase tracking-[0.18em] text-nac-muted">Plataforma oficial</span>
          <span className="block text-sm font-black tracking-[0.06em] text-white sm:text-base">{siteConfig.name}</span>
        </span>
      )}
    </div>
  );
}
