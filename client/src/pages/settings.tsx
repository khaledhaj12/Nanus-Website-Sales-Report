import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Header from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Copy, Settings as SettingsIcon, Webhook, Info, ExternalLink, Save, ChevronDown, ChevronRight, CheckCircle, XCircle, AlertCircle, Clock, Link, Database } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SettingsProps {
  onMenuClick: () => void;
}

export default function Settings({ onMenuClick }: SettingsProps) {
  const { toast } = useToast();
  
  // Webhook settings state
  const [secretKey, setSecretKey] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  // REST API settings state
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [apiIsActive, setApiIsActive] = useState(true);
  
  // Get the current domain for webhook URL
  const webhookUrl = `${window.location.origin}/api/webhook/woocommerce`;

  // Load current webhook settings
  const { data: webhookSettings, isLoading } = useQuery({
    queryKey: ["/api/webhook-settings/woocommerce"],
  });

  // Load current REST API settings
  const { data: restApiSettings, isLoading: apiLoading } = useQuery({
    queryKey: ["/api/rest-api-settings/woocommerce"],
  });

  // Load recent webhook logs
  const { data: webhookLogs = [] } = useQuery({
    queryKey: ["/api/webhook-logs/woocommerce"],
  });

  // Update local state when settings load
  useEffect(() => {
    if (webhookSettings) {
      setSecretKey(webhookSettings.secretKey || "");
      setIsActive(webhookSettings.isActive !== false);
    }
  }, [webhookSettings]);

  useEffect(() => {
    if (restApiSettings) {
      setConsumerKey(restApiSettings.consumerKey || "");
      setConsumerSecret(restApiSettings.consumerSecret || "");
      setStoreUrl(restApiSettings.storeUrl || "");
      setApiIsActive(restApiSettings.isActive !== false);
    }
  }, [restApiSettings]);

  // Save webhook settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/webhook-settings", {
        platform: "woocommerce",
        secretKey,
        isActive
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhook-settings/woocommerce"] });
      toast({
        title: "Settings Saved",
        description: "WooCommerce webhook settings have been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save webhook settings",
        variant: "destructive",
      });
    },
  });

  // Save REST API settings mutation
  const saveApiSettingsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/rest-api-settings", {
        platform: "woocommerce",
        consumerKey,
        consumerSecret,
        storeUrl,
        isActive: apiIsActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rest-api-settings/woocommerce"] });
      toast({
        title: "Settings Saved",
        description: "WooCommerce REST API settings have been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save REST API settings",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    });
  };

  const handleSave = () => {
    if (!secretKey.trim()) {
      toast({
        title: "Error",
        description: "Secret key is required",
        variant: "destructive",
      });
      return;
    }
    saveSettingsMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Settings" 
        onMenuClick={onMenuClick}
        showFilters={false}
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Webhook Request Monitor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Webhook Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {webhookLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No webhook requests received yet</p>
              ) : (
                <div className="space-y-2">
                  {webhookLogs.slice(0, 5).map((log: any) => (
                    <Collapsible key={log.id}>
                      <CollapsibleTrigger className="w-full p-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {log.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                          {log.status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                          {log.status === 'unauthorized' && <AlertCircle className="h-5 w-5 text-orange-500" />}
                          
                          <div className="text-left">
                            <div className="font-medium">
                              {new Date(log.receivedAt).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              {log.orderId ? `Order: ${log.orderId}` : 'No Order ID'} • 
                              {log.orderTotal ? ` Total: $${log.orderTotal}` : ' No Total'} • 
                              {log.location || 'No Location'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                            {log.status}
                          </Badge>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="px-3 pb-3">
                        <div className="border-t pt-3 space-y-3">
                          {log.errorMessage && (
                            <div>
                              <label className="text-sm font-medium text-red-600">Error Message</label>
                              <p className="text-sm text-red-700 bg-red-50 p-2 rounded">{log.errorMessage}</p>
                            </div>
                          )}
                          
                          <div>
                            <label className="text-sm font-medium text-gray-700">Request Headers</label>
                            <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-32">
                              {JSON.stringify(log.headers, null, 2)}
                            </pre>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-700">Payload</label>
                            <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-48">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* WooCommerce Webhook Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-blue-600" />
                <CardTitle>WooCommerce Webhook Configuration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">Setup Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Copy the webhook URL below</li>
                      <li>Go to your WooCommerce store admin</li>
                      <li>Navigate to WooCommerce → Settings → Advanced → Webhooks</li>
                      <li>Click "Add webhook"</li>
                      <li>Configure the webhook with the details provided below</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Webhook URL</label>
                  <div className="flex gap-2">
                    <Input 
                      value={webhookUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Secret Key</label>
                  <div className="flex gap-2">
                    <Input 
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder="Enter WooCommerce webhook secret key"
                      className="font-mono text-sm"
                    />
                    {secretKey && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(secretKey, "Secret Key")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Enter the secret key generated by WooCommerce</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="webhook-active" className="text-sm font-medium text-gray-700">
                      Webhook Active
                    </Label>
                    <Switch
                      id="webhook-active"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Toggle to enable or disable webhook processing
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Events to Subscribe</label>
                  <div className="space-y-1">
                    <Badge variant="secondary">order.created</Badge>
                    <Badge variant="secondary">order.updated</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">HTTP Method</label>
                  <div>
                    <Badge variant="outline">POST</Badge>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={saveSettingsMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {saveSettingsMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">WooCommerce Webhook Settings</h4>
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery URL:</span>
                    <code className="text-xs bg-white px-2 py-1 rounded border">{webhookUrl}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Secret:</span>
                    <code className="text-xs bg-white px-2 py-1 rounded border">woo_webhook_secret_2025</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Topic:</span>
                    <span>Order created, Order updated</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span>Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">API Version:</span>
                    <span>WC/v3</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Processing Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-green-600" />
                <CardTitle>Data Processing</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Automatic Processing</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Orders are automatically imported when webhooks are received</li>
                  <li>• Locations are created automatically based on order metadata</li>
                  <li>• Duplicate orders are handled as updates</li>
                  <li>• Refunds are tracked when order status changes</li>
                </ul>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-white border rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">Order Mapping</h5>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>WooCommerce ID → Order ID</div>
                    <div>Order Number → Reference</div>
                    <div>Total → Amount</div>
                    <div>Date Created → Order Date</div>
                    <div>Customer Info → Customer Details</div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">Status Sync</h5>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Processing → Processing</div>
                    <div>Completed → Completed</div>
                    <div>Refunded → Refunded</div>
                    <div>Cancelled → Cancelled</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Testing Webhook */}
          <Card>
            <CardHeader>
              <CardTitle>Test Webhook Connection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Testing Your Webhook</p>
                    <p>After configuring the webhook in WooCommerce, create a test order in your store. You should see it appear in the WooCommerce orders page within a few seconds.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support Information */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  If you're having trouble setting up the webhook or seeing orders, check:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• WooCommerce webhook is set to "Active" status</li>
                  <li>• The webhook URL is correct and accessible</li>
                  <li>• Your store has the WooCommerce REST API enabled</li>
                  <li>• Test orders are being created with valid customer information</li>
                </ul>
                
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://woocommerce.com/document/webhooks/" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      WooCommerce Webhooks Docs
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}