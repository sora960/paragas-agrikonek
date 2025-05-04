import { supabase } from '@/lib/supabase';
import { Crop, Plot, CropActivity, Resource, FieldReport, ReportComment } from '@/types/farmer';

export class FarmerService {
  // Crop Management
  static async getCrops(farmerId: string): Promise<Crop[]> {
    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .eq('farmer_id', farmerId);
    
    if (error) throw error;
    return data;
  }

  static async createCrop(crop: Omit<Crop, 'id'>): Promise<Crop> {
    const { data, error } = await supabase
      .from('crops')
      .insert(crop)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateCrop(id: string, crop: Partial<Crop>): Promise<Crop> {
    const { data, error } = await supabase
      .from('crops')
      .update(crop)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Plot Management
  static async getPlots(farmerId: string): Promise<Plot[]> {
    const { data, error } = await supabase
      .from('plots')
      .select('*')
      .eq('farmer_id', farmerId);
    
    if (error) throw error;
    return data;
  }

  static async createPlot(plot: Omit<Plot, 'id'>): Promise<Plot> {
    const { data, error } = await supabase
      .from('plots')
      .insert(plot)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Crop Activities
  static async getCropActivities(cropId: string): Promise<CropActivity[]> {
    const { data, error } = await supabase
      .from('crop_activities')
      .select('*')
      .eq('crop_id', cropId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async createCropActivity(activity: Omit<CropActivity, 'id'>): Promise<CropActivity> {
    const { data, error } = await supabase
      .from('crop_activities')
      .insert(activity)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Resource Management
  static async getResources(farmerId: string): Promise<Resource[]> {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('farmer_id', farmerId);
    
    if (error) throw error;
    return data;
  }

  static async updateResource(id: string, resource: Partial<Resource>): Promise<Resource> {
    const { data, error } = await supabase
      .from('resources')
      .update(resource)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async createResource(resource: Omit<Resource, 'id'>): Promise<Resource> {
    const { data, error } = await supabase
      .from('resources')
      .insert(resource)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Dashboard Data
  static async getDashboardSummary(farmerId: string) {
    const { data, error } = await supabase
      .rpc('get_farmer_dashboard_summary', { p_farmer_id: farmerId });
    
    if (error) throw error;
    return data;
  }

  // Field Reporting
  static async getReports(farmerId: string): Promise<FieldReport[]> {
    const { data, error } = await supabase
      .from('field_reports')
      .select(`
        *,
        crops (
          id,
          name
        )
      `)
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
    return data;
  }

  static async getReportById(reportId: string): Promise<FieldReport> {
    const { data, error } = await supabase
      .from('field_reports')
      .select(`
        *,
        crops (
          id,
          name
        )
      `)
      .eq('id', reportId)
      .single();
    
    if (error) {
      console.error('Error fetching report:', error);
      throw error;
    }
    return data;
  }

  static async createReport(report: Omit<FieldReport, 'id' | 'created_at' | 'updated_at'>): Promise<FieldReport> {
    const { data, error } = await supabase
      .from('field_reports')
      .insert({
        ...report,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating report:', error);
      throw error;
    }
    return data;
  }

  static async updateReport(id: string, report: Partial<FieldReport>): Promise<FieldReport> {
    const { data, error } = await supabase
      .from('field_reports')
      .update({
        ...report,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating report:', error);
      throw error;
    }
    return data;
  }

  static async uploadReportImages(files: File[]): Promise<string[]> {
    const uploadPromises = files.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `report-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('farmer-reports')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw uploadError;
      }

      const { data } = await supabase.storage
        .from('farmer-reports')
        .getPublicUrl(filePath);

      return data.publicUrl;
    });

    return Promise.all(uploadPromises);
  }

  static async deleteReport(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('field_reports')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw new Error('Failed to delete report');
    }
  }

  // Report Comments
  static async getReportComments(reportId: string): Promise<ReportComment[]> {
    try {
      const { data, error } = await supabase
        .from('report_comments')
        .select(`
          *,
          user:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching report comments:', error);
      throw new Error('Failed to fetch report comments');
    }
  }

  static async createComment(comment: Omit<ReportComment, 'id' | 'created_at' | 'updated_at' | 'user'>): Promise<ReportComment> {
    try {
      const { data, error } = await supabase
        .from('report_comments')
        .insert(comment)
        .select(`
          *,
          user:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw new Error('Failed to create comment');
    }
  }

  static async updateComment(id: string, content: string): Promise<ReportComment> {
    try {
      const { data, error } = await supabase
        .from('report_comments')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(`
          *,
          user:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw new Error('Failed to update comment');
    }
  }

  static async deleteComment(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('report_comments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw new Error('Failed to delete comment');
    }
  }

  static subscribeToComments(reportId: string, callback: (comment: ReportComment) => void): (() => void) {
    try {
      const subscription = supabase
        .channel(`report_comments:${reportId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'report_comments',
            filter: `report_id=eq.${reportId}`
          },
          async (payload) => {
            try {
              // Fetch the complete comment data including user info
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const comments = await this.getReportComments(reportId);
                const comment = comments.find(c => c.id === payload.new.id);
                if (comment) {
                  callback(comment);
                }
              }
            } catch (error) {
              console.error('Error processing comment update:', error);
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up comment subscription:', error);
      throw new Error('Failed to setup comment subscription');
    }
  }
} 