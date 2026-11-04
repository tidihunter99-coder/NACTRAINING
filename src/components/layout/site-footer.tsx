import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 px-5 py-8 text-center text-sm text-nac-silver sm:px-8">
      <p>{siteConfig.academyName} © 2026</p>
      <p className="mt-1 text-white/55">Todos os direitos reservados.</p>
    </footer>
  );
}
