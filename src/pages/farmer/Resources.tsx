import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Video, Book, Link as LinkIcon, Download, ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

// Static resources data
const resources = [
  {
    id: "1",
    title: "Crop Management Guide",
    description: "Complete guide to managing various crop types",
    type: "pdf",
    icon: <FileText className="h-8 w-8 text-primary" />,
    contentText: "Learn about optimal crop management techniques for different seasons",
    fileSize: "2.4 MB",
    action: "Download",
    actionIcon: <Download className="h-4 w-4" />,
    url: "/resources/crop-management-guide.pdf",
    externalUrl: "https://www.philrice.gov.ph/wp-content/uploads/2019/08/Rice-Production-Manual-2.pdf",
    badge: "PDF",
    badgeColor: ""
  },
  {
    id: "2",
    title: "Rice Farming Video Series",
    description: "Step-by-step video tutorials for rice farmers",
    type: "video",
    icon: <Video className="h-8 w-8 text-primary" />,
    contentText: "Comprehensive tutorial series covering planting, maintenance, and harvesting",
    fileSize: "12 videos",
    action: "View Series",
    actionIcon: <ExternalLink className="h-4 w-4" />,
    url: "",
    externalUrl: "https://www.youtube.com/watch?v=J_mMS3EkHok",
    badge: "Video",
    badgeColor: "bg-red-500"
  },
  {
    id: "3",
    title: "Sustainable Farming Handbook",
    description: "Guide to environmentally sustainable farming practices",
    type: "ebook",
    icon: <Book className="h-8 w-8 text-primary" />,
    contentText: "Learn how to implement sustainable practices that benefit both your farm and the environment",
    fileSize: "4.7 MB",
    action: "Download",
    actionIcon: <Download className="h-4 w-4" />,
    url: "/resources/sustainable-farming-handbook.pdf",
    externalUrl: "https://pcaarrd.dost.gov.ph/home/portal/index.php/quick-information-dispatch/3088-organic-agriculture-in-the-philippines-philippine-organic-agriculture-information-network",
    badge: "E-Book",
    badgeColor: "bg-green-500"
  },
  {
    id: "4",
    title: "Agricultural Market Trends",
    description: "Latest market data and price projections",
    type: "report",
    icon: <FileText className="h-8 w-8 text-primary" />,
    contentText: "Stay informed on current market prices and projected trends for agricultural products",
    fileSize: "Updated monthly",
    action: "View Report",
    actionIcon: <ExternalLink className="h-4 w-4" />,
    url: "",
    externalUrl: "https://psa.gov.ph/agriculture-forestry/agriculture",
    badge: "Report",
    badgeColor: "bg-blue-500"
  },
  {
    id: "5",
    title: "Pest Control Guide",
    description: "Identify and manage common agricultural pests",
    type: "pdf",
    icon: <FileText className="h-8 w-8 text-primary" />,
    contentText: "Comprehensive guide to identifying and controlling common pests affecting various crops",
    fileSize: "3.1 MB",
    action: "Download",
    actionIcon: <Download className="h-4 w-4" />,
    url: "/resources/pest-control-guide.pdf",
    externalUrl: "https://www.philrice.gov.ph/wp-content/uploads/2018/07/Pest-Management-in-Stored-Rice.pdf",
    badge: "PDF",
    badgeColor: ""
  },
  {
    id: "6",
    title: "Government Support Programs",
    description: "Information on available government assistance for farmers",
    type: "link",
    icon: <LinkIcon className="h-8 w-8 text-primary" />,
    contentText: "Access information about subsidies, grants, and other government support available to farmers",
    fileSize: "Updated quarterly",
    action: "View Resources",
    actionIcon: <ExternalLink className="h-4 w-4" />,
    url: "",
    externalUrl: "https://assistance.ph/agriculture-assistance-programs/",
    badge: "Links",
    badgeColor: "bg-purple-500"
  }
];

export default function Resources() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});

  // Filter resources based on search query
  const filteredResources = resources.filter(
    resource => 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate mock PDF content for downloads
  const generateMockPDF = (title: string, type: string) => {
    const content = `
# ${title}

## Mock ${type.toUpperCase()} Content for Agricultural Resource

This is a sample document representing the "${title}" that would normally be available for download.

### Content Overview

1. Introduction to ${title.toLowerCase()}
2. Best practices for implementation
3. Case studies and examples
4. References and additional resources

For actual content, please visit our online resources or contact your local agricultural extension office.

© ${new Date().getFullYear()} AgriConnect - All rights reserved.
    `;
    
    return content;
  };

  // Function to trigger file download
  const downloadFile = (filename: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleResourceAction = (resource: typeof resources[0]) => {
    // Set loading state for this resource
    setIsLoading(prev => ({ ...prev, [resource.id]: true }));

    // Track access (in a real app, this would send data to a backend)
    console.log(`Resource accessed: ${resource.title}, Type: ${resource.type}`);

    // Simulate a small delay for loading feedback
    setTimeout(() => {
      // Handle based on resource type and action
      if ((resource.type === 'pdf' || resource.type === 'ebook') && resource.action === 'Download') {
        // Generate mock content and trigger download
        const content = generateMockPDF(resource.title, resource.type);
        const filename = resource.title.replace(/\s+/g, '-').toLowerCase() + (resource.type === 'pdf' ? '.pdf' : '.txt');
        downloadFile(filename, content);
        
        toast({
          title: "Resource downloaded",
          description: `${resource.title} has been downloaded successfully.`,
          duration: 3000,
        });
      } else {
        // For non-downloadable resources, open the external URL
        window.open(resource.externalUrl, "_blank");
        
        toast({
          title: "Resource opened",
          description: `${resource.title} has been opened in a new tab.`,
          duration: 3000,
        });
      }

      // Clear loading state
      setIsLoading(prev => ({ ...prev, [resource.id]: false }));
    }, 500);
  };

  return (
    <DashboardLayout userRole="farmer">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Farming Resources</h1>
            <p className="text-muted-foreground">
              Access educational materials and farming guides
            </p>
          </div>
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search resources..." 
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredResources.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No resources found matching your search.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map(resource => (
              <Card key={resource.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{resource.title}</CardTitle>
                    <Badge className={resource.badgeColor}>{resource.badge}</Badge>
                  </div>
                  <CardDescription>
                    {resource.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {resource.icon}
                    <p className="text-sm text-muted-foreground">
                      {resource.contentText}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2"
                    onClick={() => handleResourceAction(resource)}
                    disabled={isLoading[resource.id]}
                  >
                    {isLoading[resource.id] ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      resource.actionIcon
                    )}
                    {resource.action}
                  </Button>
                  <p className="text-xs text-muted-foreground">{resource.fileSize}</p>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 