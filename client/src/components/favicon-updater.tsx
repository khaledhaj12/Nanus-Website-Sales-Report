import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export default function FaviconUpdater() {
  const { data: logoSettings } = useQuery({
    queryKey: ["/api/logo-settings"],
    retry: false,
  });

  useEffect(() => {
    if (logoSettings?.faviconPath) {
      const timestamp = Date.now();
      const faviconUrl = `${logoSettings.faviconPath}?v=${timestamp}`;
      
      // Update existing favicon
      const existingFavicon = document.getElementById('favicon') as HTMLLinkElement;
      if (existingFavicon) {
        existingFavicon.href = faviconUrl;
        existingFavicon.type = logoSettings.faviconMimeType || 'image/x-icon';
      }

      // Update existing apple touch icon
      const existingAppleIcon = document.getElementById('apple-touch-icon') as HTMLLinkElement;
      if (existingAppleIcon) {
        existingAppleIcon.href = faviconUrl;
      }

      // Remove any existing dynamic favicon elements
      const existingDynamic = document.querySelectorAll('[data-dynamic-favicon]');
      existingDynamic.forEach(el => el.remove());

      // Add additional favicon formats
      const faviconFormats = [
        { rel: 'shortcut icon', type: logoSettings.faviconMimeType || 'image/x-icon' },
        { rel: 'apple-touch-icon', sizes: '180x180' },
        { rel: 'icon', type: 'image/png', sizes: '32x32' },
        { rel: 'icon', type: 'image/png', sizes: '16x16' }
      ];

      faviconFormats.forEach(format => {
        const link = document.createElement('link');
        link.rel = format.rel;
        if (format.type) link.type = format.type;
        if (format.sizes) link.setAttribute('sizes', format.sizes);
        link.href = faviconUrl;
        link.setAttribute('data-dynamic-favicon', 'true');
        document.head.appendChild(link);
      });

      // Add meta tags for mobile and social
      const metaTags = [
        { name: 'msapplication-TileImage', content: faviconUrl },
        { name: 'theme-color', content: '#ffffff' },
        { property: 'og:image', content: faviconUrl },
        { property: 'og:image:type', content: logoSettings.faviconMimeType || 'image/png' },
        { property: 'og:title', content: document.title || "Nanu's Hot Chicken" },
        { property: 'og:site_name', content: "Nanu's Hot Chicken" },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:image', content: faviconUrl }
      ];

      metaTags.forEach(tag => {
        const meta = document.createElement('meta');
        if (tag.name) meta.name = tag.name;
        if (tag.property) meta.setAttribute('property', tag.property);
        meta.content = tag.content;
        meta.setAttribute('data-dynamic-favicon', 'true');
        document.head.appendChild(meta);
      });
    }
  }, [logoSettings?.faviconPath, logoSettings?.faviconMimeType]);

  return null; // This component doesn't render anything
}