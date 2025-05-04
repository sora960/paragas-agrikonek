import { FarmerService } from '@/services/FarmerService';
import { FieldReport, ReportComment } from '@/types/farmer';

export async function testFieldReporting(userId: string) {
  console.log('Starting Field Reporting Tests...\n');
  let testReport: FieldReport | null = null;
  let testComment: ReportComment | null = null;

  try {
    // Test 1: Create Report
    console.log('Testing Report Creation...');
    testReport = await FarmerService.createReport({
      farmer_id: userId,
      crop_id: null,
      report_type: 'issue',
      title: 'Test Report',
      description: 'Test Description',
      severity: 'medium',
      status: 'pending',
      images: []
    });
    console.log('✅ Report Creation: PASSED\n');

    // Test 2: Get Reports
    console.log('Testing Report Retrieval...');
    const reports = await FarmerService.getReports(userId);
    console.log('✅ Report Retrieval: PASSED\n');

    // Test 3: Update Report
    console.log('Testing Report Update...');
    const updatedReport = await FarmerService.updateReport(testReport.id, {
      status: 'in_review'
    });
    console.log('✅ Report Update: PASSED\n');

    // Test 4: Create Comment
    console.log('Testing Comment Creation...');
    testComment = await FarmerService.createComment({
      report_id: testReport.id,
      user_id: userId,
      content: 'Test Comment',
      is_internal: false,
      parent_comment_id: null
    });
    console.log('✅ Comment Creation: PASSED\n');

    // Test 5: Get Comments
    console.log('Testing Comment Retrieval...');
    const comments = await FarmerService.getReportComments(testReport.id);
    console.log('✅ Comment Retrieval: PASSED\n');

    // Test 6: Image Upload
    console.log('Testing Image Upload...');
    const testImageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const imageUrls = await FarmerService.uploadReportImages([testImageFile]);
    console.log('✅ Image Upload: PASSED\n');

    // Test 7: Subscription
    console.log('Testing Real-time Subscription...');
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = FarmerService.subscribeToComments(testReport.id, (comment) => {
        console.log('Received comment:', comment);
      });
      console.log('✅ Subscription Setup: PASSED\n');
    } finally {
      if (unsubscribe) {
        unsubscribe();
      }
    }

    // Cleanup
    console.log('Cleaning up test data...');
    if (testReport) {
      await FarmerService.deleteReport(testReport.id);
    }
    console.log('✅ Cleanup: PASSED\n');

    console.log('🎉 All tests passed successfully!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
} 