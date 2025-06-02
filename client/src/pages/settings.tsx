import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { Copy, Settings as SettingsIcon, Webhook, Info, ExternalLink } from "lucide-react";

interface SettingsProps {
  onMenuClick: () => void;
}

export default function Settings({ onMenuClick }: SettingsProps) {
  const { toast } = useToast();
  
  // Get the current domain for webhook URL
  const webhookUrl = `${window.location.origin}/api/webhook/woocommerce`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    });
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
                      value="woo_webhook_secret_2025"
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard("woo_webhook_secret_2025", "Secret Key")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Use this secret key in WooCommerce webhook settings for security</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
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