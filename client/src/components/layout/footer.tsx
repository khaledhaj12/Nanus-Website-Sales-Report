import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export default function Footer() {
  // Fetch footer settings
  const { data: footerSettings } = useQuery({
    queryKey: ['/api/footer-settings'],
    retry: false,
  });

  // Inject custom footer code when settings change
  useEffect(() => {
    if (footerSettings && (footerSettings as any).isEnabled && (footerSettings as any).customCode) {
      const customCode = (footerSettings as any).customCode;
      
      // Remove any existing custom footer scripts
      const existingScripts = document.querySelectorAll('[data-footer-custom]');
      existingScripts.forEach(script => script.remove());
      
      // Create a container for the custom code
      const container = document.createElement('div');
      container.setAttribute('data-footer-custom', 'true');
      container.innerHTML = customCode;
      
      // Append to body (before closing tag)
      document.body.appendChild(container);
      
      // Execute any scripts in the custom code
      const scripts = container.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
          newScript.async = script.async;
        } else {
          newScript.textContent = script.textContent;
        }
        document.head.appendChild(newScript);
      });
    }
    
    // Cleanup function
    return () => {
      const existingScripts = document.querySelectorAll('[data-footer-custom]');
      existingScripts.forEach(script => script.remove());
    };
  }, [footerSettings]);

  return (
    <footer className="bg-white border-t border-gray-200 py-4 px-6 mt-auto">
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Designed & Managed by{" "}
          <a 
            href="http://palixsolutions.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            Pali X Solutions
          </a>
        </p>
      </div>
    </footer>
  );
}