import { supabase } from '@/lib/supabase';

export interface BatchDisbursement {
  id: string;
  batch_number: string;
  total_amount: number;
  organization_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

export interface DisbursementItem {
  organization_id: string;
  amount: number;
  purpose: string;
  reference_number: string;
}

export const batchProcessingService = {
  async createBatchDisbursement(
    items: DisbursementItem[],
    metadata: Record<string, any> = {}
  ) {
    const { data: batch, error } = await supabase
      .rpc('create_batch_disbursement', {
        p_items: items,
        p_metadata: metadata
      });

    if (error) throw error;
    return batch;
  },

  async processBatch(batchId: string) {
    const { data: result, error } = await supabase
      .rpc('process_disbursement_batch', {
        p_batch_id: batchId
      });

    if (error) throw error;
    return result;
  },

  async getBatchStatus(batchId: string) {
    const { data: status, error } = await supabase
      .rpc('get_batch_status', {
        p_batch_id: batchId
      });

    if (error) throw error;
    return status;
  },

  async retryFailedItems(batchId: string) {
    const { data: result, error } = await supabase
      .rpc('retry_failed_disbursements', {
        p_batch_id: batchId
      });

    if (error) throw error;
    return result;
  },

  async validateBatch(items: DisbursementItem[]) {
    const { data: validation, error } = await supabase
      .rpc('validate_disbursement_batch', {
        p_items: items
      });

    if (error) throw error;
    return validation;
  },

  async getBatchSummary(startDate: string, endDate: string) {
    const { data: summary, error } = await supabase
      .rpc('get_batch_processing_summary', {
        p_start_date: startDate,
        p_end_date: endDate
      });

    if (error) throw error;
    return summary;
  }
}; 