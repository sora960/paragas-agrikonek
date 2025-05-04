import { supabase } from '@/lib/supabase';

export interface AuditLog {
  id: string;
  action_type: 'allocation' | 'disbursement' | 'approval' | 'modification' | 'request';
  entity_type: 'budget' | 'organization' | 'request' | 'user';
  entity_id: string;
  user_id: string;
  changes: Record<string, any>;
  ip_address: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export const auditService = {
  async logAction(
    actionType: AuditLog['action_type'],
    entityType: AuditLog['entity_type'],
    entityId: string,
    changes: Record<string, any>,
    metadata: Record<string, any> = {}
  ) {
    const { data: log, error } = await supabase
      .rpc('create_audit_log', {
        p_action_type: actionType,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_changes: changes,
        p_metadata: metadata
      });

    if (error) throw error;
    return log;
  },

  async getAuditTrail(
    entityType?: AuditLog['entity_type'],
    entityId?: string,
    startDate?: string,
    endDate?: string
  ) {
    const query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (entityType) query.eq('entity_type', entityType);
    if (entityId) query.eq('entity_id', entityId);
    if (startDate) query.gte('timestamp', startDate);
    if (endDate) query.lte('timestamp', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getEntityHistory(entityType: AuditLog['entity_type'], entityId: string) {
    const { data, error } = await supabase
      .rpc('get_entity_audit_history', {
        p_entity_type: entityType,
        p_entity_id: entityId
      });

    if (error) throw error;
    return data;
  },

  async getActionSummary(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .rpc('get_audit_action_summary', {
        p_start_date: startDate,
        p_end_date: endDate
      });

    if (error) throw error;
    return data;
  }
}; 