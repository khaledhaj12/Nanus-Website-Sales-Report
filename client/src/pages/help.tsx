import { useState, useEffect } from "react";
import { Search, ChevronRight, FileText, Settings, BarChart3, Users, Download, Trash2, Eye, Edit, Plus, Shield, Globe, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";

interface HelpPageProps {
  onMenuClick?: () => void;
}

interface HelpSection {
  id: string;
  title: string;
  icon: any;
  description: string;
  content: HelpContent[];
}

interface HelpContent {
  id: string;
  title: string;
  description: string;
  steps: string[];
  tips?: string[];
  examples?: string[];
  screenshots?: string[];
}

const helpSections: HelpSection[] = [
  {
    id: "dashboard",
    title: "Dashboard Overview",
    icon: BarChart3,
    description: "Understanding your main dashboard and analytics",
    content: [
      {
        id: "dashboard-summary",
        title: "Dashboard Summary Cards",
        description: "View total sales, orders, refunds, and fees across all locations",
        steps: [
          "Navigate to Dashboard from the main menu",
          "View the summary cards at the top showing:",
          "• Total Sales: Sum of all completed orders",
          "• Total Orders: Count of all processed orders",
          "• Total Refunds: Amount refunded to customers",
          "• Platform Fees: 7% commission on sales",
          "• Stripe Fees: Payment processing fees",
          "• Net Deposit: Final amount after all deductions"
        ],
        tips: [
          "Summary updates automatically when you import new orders",
          "Use location filter to view specific store performance",
          "Month filter shows data for selected time period"
        ]
      },
      {
        id: "monthly-breakdown",
        title: "Monthly Breakdown Chart",
        description: "Analyze performance trends by month",
        steps: [
          "Scroll down to see the monthly breakdown chart",
          "Each bar represents total sales for that month",
          "Hover over bars to see detailed information",
          "Use location dropdown to filter by specific store"
        ],
        examples: [
          "April 2025: $45,234 in sales across all locations",
          "Main Store only: $32,100 for April",
          "Delaware Store: $8,900 for April"
        ]
      }
    ]
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    icon: FileText,
    description: "Generate detailed reports and manage order data",
    content: [
      {
        id: "viewing-reports",
        title: "Viewing Sales Reports",
        description: "Access comprehensive sales data and analytics",
        steps: [
          "Click 'Reports' in the main navigation",
          "Use the location filter to select specific stores",
          "Apply date range filters for custom periods",
          "View summary metrics at the top",
          "Scroll down to see the monthly breakdown chart"
        ],
        tips: [
          "Reports page shows actual imported order data",
          "Use 'All Locations' to see combined data",
          "Monthly breakdown helps identify trends"
        ]
      },
      {
        id: "deleting-orders",
        title: "Deleting Orders (Admin Only)",
        description: "Remove orders from the system permanently",
        steps: [
          "Navigate to Reports page",
          "Look for the delete functionality in the order management section",
          "Select orders you want to delete",
          "Confirm deletion in the popup dialog",
          "Orders are permanently removed from the database"
        ],
        tips: [
          "Only admin users can delete orders",
          "Deletion is permanent and cannot be undone",
          "Consider the impact on reports before deleting",
          "Platform fees are automatically recalculated"
        ]
      }
    ]
  },
  {
    id: "api-connections",
    title: "API Connections",
    icon: Globe,
    description: "Manage WooCommerce store connections and synchronization",
    content: [
      {
        id: "store-connections",
        title: "Managing Store Connections",
        description: "Connect and configure your WooCommerce stores",
        steps: [
          "Navigate to API Connections from the menu",
          "You'll see tabs for each connected store:",
          "• Main Store (nanushotchicken.co)",
          "• Delaware (delaware.nanushotchicken.co)",
          "• Drexel (drexel.nanushotchicken.co)",
          "Click on any tab to configure that store's settings"
        ],
        examples: [
          "Main Store: Consumer Key ck_0ad2e86... for nanushotchicken.co",
          "Delaware: Consumer Key ck_184384d... for delaware.nanushotchicken.co",
          "Drexel: Consumer Key ck_a6badcc... for drexel.nanushotchicken.co"
        ]
      },
      {
        id: "api-settings",
        title: "WooCommerce API Settings",
        description: "Configure consumer keys and store URLs",
        steps: [
          "Select a store tab in API Connections",
          "Scroll to WooCommerce API Settings section",
          "Verify the Store URL is correct",
          "Check that Consumer Key and Consumer Secret are populated",
          "Test the connection using the 'Test Connection' button",
          "Save any changes made to the settings"
        ],
        tips: [
          "Each store has unique API credentials",
          "Never share consumer secrets publicly",
          "Test connections after any changes",
          "Keep API credentials secure"
        ]
      },
      {
        id: "auto-sync",
        title: "Auto Sync Configuration",
        description: "Set up automatic order synchronization",
        steps: [
          "In the store's API Connections tab",
          "Find the Auto Sync Status section",
          "Toggle 'Enable Auto Sync' if available",
          "Set sync interval (5, 15, 30, or 60 minutes)",
          "Monitor 'Last Fetch' and 'Orders Fetched' status",
          "Check 'Next Scheduled' time for upcoming sync"
        ],
        tips: [
          "Auto sync pulls new orders automatically",
          "Shorter intervals mean more frequent updates",
          "Monitor sync status to ensure it's working",
          "Manual import is always available as backup"
        ]
      },
      {
        id: "manual-import",
        title: "Manual Order Import",
        description: "Import orders for specific date ranges",
        steps: [
          "Select a store tab in API Connections",
          "Scroll to Manual Import section",
          "Enter Start Date for the import range",
          "Enter End Date for the import range",
          "Click 'Import Orders' button",
          "Wait for the import to complete",
          "Check the success message for import results"
        ],
        examples: [
          "Import from 2025-04-01 to 2025-04-30 for April data",
          "Import today's orders: set both dates to today",
          "Bulk import: set wide date range (e.g., 3 months)"
        ],
        tips: [
          "Manual import is useful for historical data",
          "Avoid overlapping date ranges to prevent duplicates",
          "Large date ranges may take longer to process",
          "Always verify import results in Reports"
        ]
      }
    ]
  },
  {
    id: "users",
    title: "User Management",
    icon: Users,
    description: "Manage user accounts, roles, and permissions",
    content: [
      {
        id: "user-roles",
        title: "User Roles & Permissions",
        description: "Understanding different user access levels",
        steps: [
          "Navigate to Users page from the menu",
          "View the list of all system users",
          "Each user has one of three roles:",
          "• Admin: Full system access, can manage users",
          "• Manager: Can view reports and manage orders",
          "• Employee: Limited access to specific functions"
        ],
        tips: [
          "Only Admins can create and delete users",
          "Managers can access most reporting features",
          "Employees have restricted access",
          "Role determines which menu items are visible"
        ]
      },
      {
        id: "creating-users",
        title: "Creating New Users",
        description: "Add new users to the system",
        steps: [
          "Go to Users page (Admin only)",
          "Click 'Add User' button",
          "Enter username (must be unique)",
          "Set a temporary password",
          "Select appropriate role (Admin/Manager/Employee)",
          "Choose location access permissions",
          "Click 'Create User' to save",
          "User will be prompted to change password on first login"
        ],
        tips: [
          "Use descriptive usernames (e.g., john.manager)",
          "Set strong temporary passwords",
          "Assign minimal necessary permissions",
          "Document user access for security audits"
        ]
      },
      {
        id: "location-permissions",
        title: "Location-Based Permissions",
        description: "Control which locations users can access",
        steps: [
          "When creating or editing a user",
          "Find the Location Access section",
          "Select which store locations the user can view:",
          "• Main Store (nanushotchicken.co)",
          "• Delaware Store",
          "• Drexel Store",
          "• Or 'All Locations' for full access",
          "Save the user settings"
        ],
        examples: [
          "Delaware Manager: Only access to Delaware store data",
          "Regional Manager: Access to Main Store and Delaware",
          "Admin: Access to all locations by default"
        ]
      }
    ]
  },
  {
    id: "data-management",
    title: "Data Management",
    icon: Download,
    description: "Import, export, and manage your data",
    content: [
      {
        id: "csv-upload",
        title: "CSV File Upload",
        description: "Import order data from CSV files",
        steps: [
          "Navigate to the upload section",
          "Click 'Choose File' or drag and drop your CSV",
          "Ensure CSV has required columns:",
          "• Order ID, Customer Name, Total, Date, Status",
          "• Location information",
          "Click 'Upload' to process the file",
          "Review the import results"
        ],
        tips: [
          "CSV must have headers in the first row",
          "Date format should be YYYY-MM-DD",
          "Status should be: completed, processing, or refunded",
          "Duplicate order IDs will be skipped"
        ]
      },
      {
        id: "xlsx-upload",
        title: "Excel File Upload",
        description: "Import order data from Excel files",
        steps: [
          "Prepare your Excel file with order data",
          "Ensure the first sheet contains the data",
          "Include all required columns (same as CSV)",
          "Upload the .xlsx file through the interface",
          "Monitor the import progress",
          "Verify imported data in Reports"
        ],
        tips: [
          "Only .xlsx format is supported (not .xls)",
          "Remove any merged cells before upload",
          "Ensure numeric values don't have text formatting",
          "Keep file sizes reasonable (under 10MB)"
        ]
      }
    ]
  },
  {
    id: "security",
    title: "Security & Access",
    icon: Shield,
    description: "Security features and access control",
    content: [
      {
        id: "password-requirements",
        title: "Password Requirements",
        description: "Understanding password complexity rules",
        steps: [
          "All passwords must meet these requirements:",
          "• Minimum 8 characters long",
          "• At least one uppercase letter",
          "• At least one lowercase letter",
          "• At least one number",
          "• At least one special character",
          "New users must change password on first login"
        ],
        tips: [
          "Use unique passwords for each account",
          "Consider using a password manager",
          "Change passwords regularly",
          "Never share passwords with others"
        ]
      },
      {
        id: "session-management",
        title: "Session Management",
        description: "How user sessions work in the system",
        steps: [
          "Sessions automatically timeout after inactivity",
          "You'll be redirected to login when session expires",
          "Use 'Logout' button to end session manually",
          "Multiple browser sessions are supported"
        ],
        tips: [
          "Always logout on shared computers",
          "Close browser completely for extra security",
          "Sessions persist across browser restarts",
          "Clear browser cache if experiencing issues"
        ]
      }
    ]
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: Settings,
    description: "Common issues and solutions",
    content: [
      {
        id: "connection-issues",
        title: "API Connection Problems",
        description: "Fixing WooCommerce connection errors",
        steps: [
          "If WooCommerce connection fails:",
          "1. Verify store URL is correct and accessible",
          "2. Check consumer key and secret are accurate",
          "3. Ensure WooCommerce REST API is enabled",
          "4. Verify API permissions in WooCommerce settings",
          "5. Test connection using the 'Test Connection' button",
          "6. Check for any firewall blocking the connection"
        ],
        tips: [
          "Contact store administrator if API issues persist",
          "WooCommerce must have REST API enabled",
          "Consumer keys need read/write permissions",
          "Check WooCommerce logs for detailed errors"
        ]
      },
      {
        id: "import-errors",
        title: "Import Error Resolution",
        description: "Solving file upload and import problems",
        steps: [
          "Common import issues and solutions:",
          "• File too large: Split into smaller files",
          "• Invalid format: Check CSV/Excel structure",
          "• Missing columns: Add required headers",
          "• Date errors: Use YYYY-MM-DD format",
          "• Duplicate orders: Check for existing data",
          "• Network timeout: Try smaller batches"
        ],
        examples: [
          "Error: 'Invalid date format' → Change '04/15/2025' to '2025-04-15'",
          "Error: 'Missing Order ID' → Ensure 'order_id' column exists",
          "Error: 'File too large' → Split 5000 rows into 2500 each"
        ]
      },
      {
        id: "performance-tips",
        title: "Performance Optimization",
        description: "Keeping the system running smoothly",
        steps: [
          "To maintain good performance:",
          "• Import data in smaller batches (1000 orders max)",
          "• Clean up old/unnecessary orders periodically",
          "• Use specific date ranges instead of 'All Time'",
          "• Clear browser cache if pages load slowly",
          "• Close unused browser tabs",
          "• Use location filters to reduce data load"
        ],
        tips: [
          "Regular data cleanup improves speed",
          "Avoid importing overlapping date ranges",
          "Use Chrome or Firefox for best performance",
          "Restart browser if memory usage is high"
        ]
      }
    ]
  }
];

export default function Help({ onMenuClick }: HelpPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [filteredSections, setFilteredSections] = useState(helpSections);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredSections(helpSections);
      return;
    }

    const filtered = helpSections.map(section => ({
      ...section,
      content: section.content.filter(content =>
        content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        content.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        content.steps.some(step => step.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (content.tips && content.tips.some(tip => tip.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        (content.examples && content.examples.some(example => example.toLowerCase().includes(searchTerm.toLowerCase())))
      )
    })).filter(section => 
      section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.content.length > 0
    );

    setFilteredSections(filtered);
  }, [searchTerm]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setSelectedSection(sectionId);
    }
  };

  const scrollToContent = (contentId: string) => {
    const element = document.getElementById(contentId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <Header 
        title="Help & Documentation" 
        onMenuClick={onMenuClick || (() => {})} 
      />
      
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row">
          {/* Sidebar */}
          <div className="w-full lg:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documentation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="space-y-2">
                {filteredSections.map((section) => (
                  <div key={section.id} className="space-y-1">
                    <Button
                      variant={selectedSection === section.id ? "secondary" : "ghost"}
                      className="w-full justify-start h-auto p-3"
                      onClick={() => scrollToSection(section.id)}
                    >
                      <section.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                      <div className="text-left flex-1">
                        <div className="font-medium">{section.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {section.content.length} topics
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                    
                    {selectedSection === section.id && (
                      <div className="ml-6 space-y-1">
                        {section.content.map((content) => (
                          <Button
                            key={content.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => scrollToContent(content.id)}
                          >
                            {content.title}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6 space-y-8">
              {filteredSections.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Try searching with different keywords or browse the sections below.
                  </p>
                </div>
              ) : (
                filteredSections.map((section) => (
                  <div key={section.id} id={section.id} className="space-y-6">
                    <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <section.icon className="h-6 w-6 text-primary" />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {section.title}
                        </h2>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">
                        {section.description}
                      </p>
                    </div>

                    <div className="grid gap-6">
                      {section.content.map((content) => (
                        <Card key={content.id} id={content.id} className="shadow-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-primary" />
                              {content.title}
                            </CardTitle>
                            <CardDescription>
                              {content.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Steps */}
                            <div>
                              <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">
                                Steps:
                              </h4>
                              <ol className="space-y-2">
                                {content.steps.map((step, index) => (
                                  <li key={index} className="flex items-start gap-3">
                                    <Badge variant="secondary" className="flex-shrink-0 mt-0.5">
                                      {index + 1}
                                    </Badge>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                      {step}
                                    </span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {/* Tips */}
                            {content.tips && content.tips.length > 0 && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                  <Zap className="h-4 w-4" />
                                  Tips:
                                </h4>
                                <ul className="space-y-1">
                                  {content.tips.map((tip, index) => (
                                    <li key={index} className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                                      <span className="text-blue-500 mt-1">•</span>
                                      <span>{tip}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Examples */}
                            {content.examples && content.examples.length > 0 && (
                              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                                <h4 className="font-medium mb-2 text-green-900 dark:text-green-100 flex items-center gap-2">
                                  <Eye className="h-4 w-4" />
                                  Examples:
                                </h4>
                                <ul className="space-y-1">
                                  {content.examples.map((example, index) => (
                                    <li key={index} className="text-sm text-green-800 dark:text-green-200 flex items-start gap-2">
                                      <span className="text-green-500 mt-1">•</span>
                                      <code className="bg-green-100 dark:bg-green-800 px-1 rounded">
                                        {example}
                                      </code>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}