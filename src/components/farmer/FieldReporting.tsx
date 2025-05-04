import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FarmerService } from '@/services/FarmerService';
import { FieldReport } from '@/types/farmer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Image as ImageIcon, MoreVertical, Trash } from 'lucide-react';
import ReportComments from './ReportComments';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function FieldReporting() {
  const { user } = useAuth();
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<FieldReport | null>(null);
  const [crops, setCrops] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [newReport, setNewReport] = useState<Omit<FieldReport, 'id' | 'farmer_id' | 'created_at' | 'updated_at'>>({
    crop_id: '',
    report_type: 'issue',
    title: '',
    description: '',
    severity: 'medium',
    status: 'pending',
    images: [],
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cropsData, reportsData] = await Promise.all([
        FarmerService.getCrops(user!.id),
        FarmerService.getReports(user!.id),
      ]);
      
      setCrops(cropsData.map(crop => ({ id: crop.id, name: crop.name })));
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const validateReport = () => {
    if (!newReport.title.trim()) {
      toast.error('Please enter a title');
      return false;
    }
    if (!newReport.description.trim()) {
      toast.error('Please enter a description');
      return false;
    }
    return true;
  };

  const handleAddReport = async () => {
    if (!validateReport()) return;

    try {
      setSubmitting(true);

      // Upload images if any
      let imageUrls: string[] = [];
      if (selectedFiles.length > 0) {
        imageUrls = await FarmerService.uploadReportImages(selectedFiles);
      }

      const report = await FarmerService.createReport({
        ...newReport,
        farmer_id: user!.id,
        images: imageUrls,
      });
      
      setReports([report, ...reports]);
      setShowAddDialog(false);
      resetForm();
      toast.success('Report submitted successfully');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewReport({
      crop_id: '',
      report_type: 'issue',
      title: '',
      description: '',
      severity: 'medium',
      status: 'pending',
      images: [],
    });
    setSelectedFiles([]);
  };

  const handleStatusUpdate = async (reportId: string, newStatus: FieldReport['status']) => {
    try {
      setStatusUpdating(true);
      const updatedReport = await FarmerService.updateReport(reportId, { status: newStatus });
      setReports(prev => prev.map(r => r.id === reportId ? updatedReport : r));
      toast.success('Report status updated successfully');
    } catch (error) {
      console.error('Error updating report status:', error);
      toast.error('Failed to update report status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      setIsDeleting(true);
      await FarmerService.deleteReport(reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      setShowDetailsDialog(false);
      toast.success('Report deleted successfully');
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    try {
      const validFiles = Array.from(files).filter(file => {
        if (!ALLOWED_TYPES.includes(file.type)) {
          toast.error(`${file.name} is not a valid image file`);
          return false;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} is too large (max 5MB)`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) {
        toast.error('No valid images selected');
        return;
      }

      if (validFiles.length + (selectedFiles.length || 0) > 5) {
        toast.error('Maximum 5 images allowed');
        return;
      }

      setSelectedFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} image(s) selected`);
    } catch (error) {
      console.error('Error handling image upload:', error);
      toast.error('Failed to process images');
    }
  };

  const handleViewDetails = async (report: FieldReport) => {
    setSelectedReport(report);
    setShowDetailsDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Field Reports</h2>
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>Submit New Report</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Field Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="report_type">Report Type</Label>
                <Select
                  value={newReport.report_type}
                  onValueChange={(value: FieldReport['report_type']) => 
                    setNewReport({ ...newReport, report_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="issue">Issue Report</SelectItem>
                    <SelectItem value="status_update">Status Update</SelectItem>
                    <SelectItem value="assistance_request">Request Assistance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="crop">Related Crop (Optional)</Label>
                <Select
                  value={newReport.crop_id}
                  onValueChange={(value) => setNewReport({ ...newReport, crop_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a crop" />
                  </SelectTrigger>
                  <SelectContent>
                    {crops.map((crop) => (
                      <SelectItem key={crop.id} value={crop.id}>
                        {crop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newReport.title}
                  onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                  placeholder="Brief description of the issue/update"
                />
              </div>

              <div>
                <Label htmlFor="description">Detailed Description</Label>
                <Textarea
                  id="description"
                  value={newReport.description}
                  onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                  placeholder="Provide detailed information about the situation..."
                  rows={4}
                />
              </div>

              {newReport.report_type === 'issue' && (
                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <Select
                    value={newReport.severity}
                    onValueChange={(value: FieldReport['severity']) => 
                      setNewReport({ ...newReport, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="images">Attach Images</Label>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="mt-1"
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {selectedFiles.length} image(s) selected
                  </div>
                )}
              </div>

              <Button 
                onClick={handleAddReport} 
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reports submitted yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{new Date(report.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className="capitalize">{report.report_type.replace('_', ' ')}</span>
                      </TableCell>
                      <TableCell>{report.title}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          report.status === 'in_review' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {report.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          report.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          report.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          report.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {report.severity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(report)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Report Details</DialogTitle>
            {selectedReport && selectedReport.farmer_id === user?.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      if (selectedReport) {
                        handleDeleteReport(selectedReport.id);
                      }
                    }}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash className="mr-2 h-4 w-4" />
                        Delete Report
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Report Type</Label>
                  <div className="mt-1 font-medium capitalize">
                    {selectedReport.report_type.replace('_', ' ')}
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedReport.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      selectedReport.status === 'in_review' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedReport.status}
                    </span>
                  </div>
                </div>
                <div>
                  <Label>Submitted On</Label>
                  <div className="mt-1 font-medium">
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </div>
                </div>
                {selectedReport.report_type === 'issue' && (
                  <div>
                    <Label>Severity</Label>
                    <div className="mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        selectedReport.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        selectedReport.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        selectedReport.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {selectedReport.severity}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label>Title</Label>
                <div className="mt-1 text-lg font-medium">{selectedReport.title}</div>
              </div>

              <div>
                <Label>Description</Label>
                <div className="mt-1 whitespace-pre-wrap">{selectedReport.description}</div>
              </div>

              {selectedReport.images && selectedReport.images.length > 0 && (
                <div>
                  <Label>Attached Images</Label>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    {selectedReport.images.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-video relative rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={url}
                          alt={`Report image ${index + 1}`}
                          className="object-cover w-full h-full"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">Comments</h3>
                <ReportComments reportId={selectedReport.id} />
              </div>

              <div className="flex items-center gap-4">
                <Label>Status</Label>
                <Select
                  value={selectedReport.status}
                  onValueChange={(value: FieldReport['status']) => 
                    handleStatusUpdate(selectedReport.id, value)
                  }
                  disabled={statusUpdating || selectedReport.farmer_id !== user?.id}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                {statusUpdating && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 