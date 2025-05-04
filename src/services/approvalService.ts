import { supabase } from '@/lib/supabase';

export interface ApprovalStep {
  id: string;
  role: 'regional_admin' | 'finance_officer' | 'super_admin';
  required_approvers: number;
  order: number;
  is_final: boolean;
}

export interface ApprovalWorkflow {
  id: string;
  request_type: 'budget_increase' | 'large_disbursement' | 'special_allocation';
  min_amount: number;
  max_amount: number;
  steps: ApprovalStep[];
  current_step: number;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
}

export const approvalService = {
  async createApprovalWorkflow(
    requestType: ApprovalWorkflow['request_type'],
    amount: number,
    organizationId: string
  ) {
    const { data: workflow, error } = await supabase
      .rpc('create_approval_workflow', {
        p_request_type: requestType,
        p_amount: amount,
        p_organization_id: organizationId
      });

    if (error) throw error;
    return workflow;
  },

  async processApprovalStep(
    workflowId: string,
    stepId: string,
    decision: 'approve' | 'reject',
    notes: string
  ) {
    const { data: result, error } = await supabase
      .rpc('process_approval_step', {
        p_workflow_id: workflowId,
        p_step_id: stepId,
        p_decision: decision,
        p_notes: notes
      });

    if (error) throw error;
    return result;
  },

  async getWorkflowStatus(workflowId: string) {
    const { data: status, error } = await supabase
      .rpc('get_workflow_status', {
        p_workflow_id: workflowId
      });

    if (error) throw error;
    return status;
  },

  async getPendingApprovals(userId: string) {
    const { data: approvals, error } = await supabase
      .rpc('get_pending_approvals', {
        p_user_id: userId
      });

    if (error) throw error;
    return approvals;
  },

  async escalateWorkflow(workflowId: string, reason: string) {
    const { data: result, error } = await supabase
      .rpc('escalate_workflow', {
        p_workflow_id: workflowId,
        p_reason: reason
      });

    if (error) throw error;
    return result;
  }
}; 