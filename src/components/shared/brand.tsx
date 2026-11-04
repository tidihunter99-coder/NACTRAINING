import Image from "next/image";

import { siteConfig } from "@/config/site";

interface BrandProps {
  compact?: boolean;
  priority?: boolean;
}

/** Official NAC Academy logo, displayed at its native aspect ratio. */
export function Brand({ compact = false, priority = false }: BrandProps) {
  return (
    <div className="flex items-center gap-3" aria-label={`${siteConfig.academyName} ${siteConfig.name}`}>
      <Image alt="NAC Academia" className="h-9 w-auto shrink-0 object-contain sm:h-10" height={54} priority={priority} src="/logos/nac-logo-original.png" width={219} />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-nac-muted">App oficial</span>
          <span className="block text-base font-extrabold tracking-[0.08em] text-white sm:text-lg">{siteConfig.name}</span>
        </span>
      )}
    </div>
  );
}
