import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Code, Save, Eye, EyeOff } from "lucide-react";
import Header from "@/components/layout/header";

interface FooterSettingsProps {
  onMenuClick?: () => void;
}

function FooterSettings({ onMenuClick }: FooterSettingsProps) {
  const { toast } = useToast();
  const [customCode, setCustomCode] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch current footer settings
  const { data: footerSettings, isLoading } = useQuery({
    queryKey: ['/api/footer-settings'],
  });

  // Update footer settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { customCode: string; isEnabled: boolean }) => {
      return apiRequest('POST', '/api/footer-settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/footer-settings'] });
      toast({
        title: "Footer Settings Updated",
        description: "Your footer settings have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      customCode: customCode,
      isEnabled: isEnabled
    });
  };

  // Initialize form with fetched data using useEffect
  useEffect(() => {
    if (footerSettings && !isLoading) {
      setCustomCode((footerSettings as any).customCode || '');
      setIsEnabled((footerSettings as any).isEnabled !== false);
    }
  }, [footerSettings, isLoading]);

  return (
    <div className="flex flex-col h-screen">
      <Header 
        title="Footer Settings" 
        onMenuClick={onMenuClick || (() => {})} 
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <Code className="h-8 w-8 text-primary" />
            <div>
              <p className="text-muted-foreground">Manage your website footer and add custom code like Google Analytics, Yandex, or other tracking scripts</p>
            </div>
          </div>

        <div className="grid gap-6">
          {/* Footer Code Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Custom Footer Code
              </CardTitle>
              <CardDescription>
                Add custom HTML, CSS, or JavaScript code that will be inserted in the footer of all pages. 
                This is perfect for Google Analytics, Yandex Metrica, or other tracking scripts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="footer-enabled"
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                />
                <Label htmlFor="footer-enabled">Enable custom footer code</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-code">Custom Code</Label>
                <Textarea
                  id="custom-code"
                  placeholder={`<!-- Example Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>

<!-- Example Yandex Metrica -->
<script type="text/javascript">
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
   ym(YANDEX_COUNTER_ID, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true
   });
</script>`}
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                  disabled={!isEnabled}
                />
                <p className="text-sm text-muted-foreground">
                  Enter your custom code here. This code will be inserted before the closing &lt;/body&gt; tag on all pages.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleSave} 
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2"
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showPreview ? 'Hide Preview' : 'Preview Code'}
                </Button>
              </div>

              {showPreview && customCode && (
                <div className="mt-4">
                  <Label>Code Preview</Label>
                  <div className="bg-muted p-4 rounded-md">
                    <pre className="text-sm overflow-auto">
                      <code>{customCode}</code>
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Default Footer */}
          <Card>
            <CardHeader>
              <CardTitle>Default Footer</CardTitle>
              <CardDescription>
                The default footer that appears on all pages of your website.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-md text-center">
                <p className="text-sm text-muted-foreground">
                  Designed & Managed by{" "}
                  <a 
                    href="http://palixsolutions.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    Pali X Solutions
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Usage Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Common Use Cases</CardTitle>
              <CardDescription>
                Examples of what you can add to your footer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">Analytics & Tracking</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Google Analytics (GA4)</li>
                    <li>• Yandex Metrica</li>
                    <li>• Facebook Pixel</li>
                    <li>• Hotjar tracking</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Other Scripts</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Live chat widgets</li>
                    <li>• Cookie consent banners</li>
                    <li>• Custom CSS styles</li>
                    <li>• Third-party integrations</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </main>
    </div>
  );
}

export default FooterSettings;