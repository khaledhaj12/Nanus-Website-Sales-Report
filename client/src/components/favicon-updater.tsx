import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export default function FaviconUpdater() {
  const { data: logoSettings } = useQuery({
    queryKey: ["/api/logo-settings"],
    retry: false,
  });

  useEffect(() => {
    if (logoSettings?.faviconPath) {
      // Remove existing favicon links
      const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
      existingFavicons.forEach(link => link.remove());

      // Add new favicon
      const favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.type = logoSettings.faviconMimeType || 'image/x-icon';
      favicon.href = logoSettings.faviconPath;
      document.head.appendChild(favicon);

      // Also add apple-touch-icon for mobile
      const appleFavicon = document.createElement('link');
      appleFavicon.rel = 'apple-touch-icon';
      appleFavicon.href = logoSettings.faviconPath;
      document.head.appendChild(appleFavicon);
    }
  }, [logoSettings?.faviconPath, logoSettings?.faviconMimeType]);

  return null; // This component doesn't render anything
}