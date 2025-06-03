import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export default function FaviconUpdater() {
  const { data: logoSettings } = useQuery({
    queryKey: ["/api/logo-settings"],
    retry: false,
  });

  useEffect(() => {
    if (logoSettings?.faviconPath) {
      // Remove existing favicon and related meta tags
      const existingFavicons = document.querySelectorAll('link[rel*="icon"], meta[name*="msapplication"], meta[name="theme-color"], meta[property*="og:"], meta[name="twitter:"]');
      existingFavicons.forEach(link => link.remove());

      // Standard favicon
      const favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.type = logoSettings.faviconMimeType || 'image/x-icon';
      favicon.href = logoSettings.faviconPath;
      document.head.appendChild(favicon);

      // Shortcut icon for older browsers
      const shortcutIcon = document.createElement('link');
      shortcutIcon.rel = 'shortcut icon';
      shortcutIcon.type = logoSettings.faviconMimeType || 'image/x-icon';
      shortcutIcon.href = logoSettings.faviconPath;
      document.head.appendChild(shortcutIcon);

      // Apple touch icon for iOS Safari and mobile
      const appleFavicon = document.createElement('link');
      appleFavicon.rel = 'apple-touch-icon';
      appleFavicon.href = logoSettings.faviconPath;
      document.head.appendChild(appleFavicon);

      // Apple touch icon with sizes for better iOS support
      const appleFaviconSizes = document.createElement('link');
      appleFaviconSizes.rel = 'apple-touch-icon';
      appleFaviconSizes.sizes = '180x180';
      appleFaviconSizes.href = logoSettings.faviconPath;
      document.head.appendChild(appleFaviconSizes);

      // Icon for Android Chrome
      const androidIcon = document.createElement('link');
      androidIcon.rel = 'icon';
      androidIcon.type = 'image/png';
      androidIcon.sizes = '192x192';
      androidIcon.href = logoSettings.faviconPath;
      document.head.appendChild(androidIcon);

      // Microsoft tile icon
      const msIcon = document.createElement('meta');
      msIcon.name = 'msapplication-TileImage';
      msIcon.content = logoSettings.faviconPath;
      document.head.appendChild(msIcon);

      // Theme color for mobile browsers
      const themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      themeColor.content = '#ffffff';
      document.head.appendChild(themeColor);

      // Open Graph meta tags for link previews
      const ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      ogImage.content = logoSettings.faviconPath;
      document.head.appendChild(ogImage);

      const ogImageType = document.createElement('meta');
      ogImageType.setAttribute('property', 'og:image:type');
      ogImageType.content = logoSettings.faviconMimeType || 'image/png';
      document.head.appendChild(ogImageType);

      const ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      ogTitle.content = document.title || 'Website Sales Dashboard';
      document.head.appendChild(ogTitle);

      const ogSiteName = document.createElement('meta');
      ogSiteName.setAttribute('property', 'og:site_name');
      ogSiteName.content = "Nanu's Hot Chicken";
      document.head.appendChild(ogSiteName);

      // Twitter Card meta tags
      const twitterCard = document.createElement('meta');
      twitterCard.name = 'twitter:card';
      twitterCard.content = 'summary';
      document.head.appendChild(twitterCard);

      const twitterImage = document.createElement('meta');
      twitterImage.name = 'twitter:image';
      twitterImage.content = logoSettings.faviconPath;
      document.head.appendChild(twitterImage);

      // Force browser cache refresh by adding timestamp
      const timestamp = Date.now();
      [favicon, shortcutIcon, appleFavicon, appleFaviconSizes, androidIcon].forEach(link => {
        if (link.href) {
          link.href += `?v=${timestamp}`;
        }
      });
      if (msIcon.content) {
        msIcon.content += `?v=${timestamp}`;
      }
      // Add timestamp to Open Graph and Twitter images
      ogImage.content += `?v=${timestamp}`;
      twitterImage.content += `?v=${timestamp}`;
    }
  }, [logoSettings?.faviconPath, logoSettings?.faviconMimeType]);

  return null; // This component doesn't render anything
}