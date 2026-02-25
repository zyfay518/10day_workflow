/**
 * 数据库类型定义
 *
 * 根据 DATABASE_DESIGN.md 中的表结构定义 TypeScript 类型
 * 用于 Supabase 客户端的类型安全
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // 1. 用户配置表
      user_profiles: {
        Row: {
          id: number;
          user_id: string;
          nickname: string;
          avatar_url: string | null;
          password: string | null;
          ai_api_key: string | null;
          ai_service_provider: string | null;
          ai_prompts: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          nickname?: string;
          avatar_url?: string | null;
          password?: string | null;
          ai_api_key?: string | null;
          ai_service_provider?: string | null;
          ai_prompts?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          nickname?: string;
          avatar_url?: string | null;
          password?: string | null;
          ai_api_key?: string | null;
          ai_service_provider?: string | null;
          ai_prompts?: Json | null;
          updated_at?: string;
        };
      };
      // 2. 维度配置表
      dimensions: {
        Row: {
          id: number;
          user_id: string;
          dimension_name: string;
          icon_name: string;
          color_code: string;
          display_order: number;
          is_active: boolean;
          ai_persona_prompt: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          dimension_name: string;
          icon_name: string;
          color_code: string;
          display_order: number;
          is_active?: boolean;
          ai_persona_prompt?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          dimension_name?: string;
          icon_name?: string;
          color_code?: string;
          display_order?: number;
          is_active?: boolean;
          ai_persona_prompt?: string | null;
          updated_at?: string;
        };
      };
      // 3. 周期表
      cycles: {
        Row: {
          id: number;
          user_id: string;
          cycle_number: number;
          start_date: string;
          end_date: string;
          total_days: number;
          completion_rate: number;
          status: 'pending' | 'not_started' | 'active' | 'completed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          cycle_number: number;
          start_date: string;
          end_date: string;
          total_days: number;
          completion_rate?: number;
          status?: 'pending' | 'not_started' | 'active' | 'completed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          completion_rate?: number;
          status?: 'pending' | 'not_started' | 'active' | 'completed';
          updated_at?: string;
        };
      };
      // 4. 记录表
      records: {
        Row: {
          id: number;
          user_id: string;
          cycle_id: number;
          dimension_id: number;
          record_date: string;
          content: string;
          word_count: number;
          ai_suggestions: string | null;
          ai_quote: string | null;
          status: 'draft' | 'published';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          cycle_id: number;
          dimension_id: number;
          record_date: string;
          content: string;
          word_count?: number;
          ai_suggestions?: string | null;
          ai_quote?: string | null;
          status?: 'draft' | 'published';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          word_count?: number;
          ai_suggestions?: string | null;
          ai_quote?: string | null;
          status?: 'draft' | 'published';
          updated_at?: string;
        };
      };
      // 5. 记录附件表
      record_attachments: {
        Row: {
          id: number;
          record_id: number;
          user_id: string;
          file_type: 'image' | 'audio';
          file_url: string;
          file_name: string;
          file_size: number;
          created_at: string;
        };
        Insert: {
          record_id: number;
          user_id: string;
          file_type: 'image' | 'audio';
          file_url: string;
          file_name: string;
          file_size: number;
          created_at?: string;
        };
        Update: {
          file_url?: string;
        };
      };
      // 6. 费用明细表
      expenses: {
        Row: {
          id: number;
          record_id: number;
          user_id: string;
          cycle_id: number;
          category: string;
          item_name: string;
          amount: number;
          expense_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          record_id: number;
          user_id: string;
          cycle_id: number;
          category: string;
          item_name: string;
          amount: number;
          expense_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          item_name?: string;
          amount?: number;
          updated_at?: string;
        };
      };
      // 7. 阅读书籍表
      reading_books: {
        Row: {
          id: number;
          user_id: string;
          cycle_id: number;
          book_title: string;
          author: string | null;
          reading_status: 'reading' | 'completed' | 'paused';
          progress_percent: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          cycle_id: number;
          book_title: string;
          author?: string | null;
          reading_status?: 'reading' | 'completed' | 'paused';
          progress_percent?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          reading_status?: 'reading' | 'completed' | 'paused';
          progress_percent?: number;
          notes?: string | null;
          updated_at?: string;
        };
      };
      // 8. 周期报告表
      cycle_reports: {
        Row: {
          id: number;
          user_id: string;
          cycle_id: number;
          work_summary: string | null;
          reading_books: string | null;
          investment_summary: string | null;
          expense_summary: string | null;
          other_summary: string | null;
          suggestions: string | null;
          ai_generated: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          cycle_id: number;
          work_summary?: string | null;
          reading_books?: string | null;
          investment_summary?: string | null;
          expense_summary?: string | null;
          other_summary?: string | null;
          suggestions?: string | null;
          ai_generated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          work_summary?: string | null;
          reading_books?: string | null;
          investment_summary?: string | null;
          expense_summary?: string | null;
          other_summary?: string | null;
          suggestions?: string | null;
          updated_at?: string;
        };
      };
      // 9. 里程碑事件表
      milestones: {
        Row: {
          id: number;
          user_id: string;
          event_date: string;
          event_title: string;
          event_description: string | null;
          event_type: 'achievement' | 'challenge' | 'decision' | 'other';
          related_dimension_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          event_date: string;
          event_title: string;
          event_description?: string | null;
          event_type: 'achievement' | 'challenge' | 'decision' | 'other';
          related_dimension_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          event_title?: string;
          event_description?: string | null;
          event_type?: 'achievement' | 'challenge' | 'decision' | 'other';
          related_dimension_id?: number | null;
          updated_at?: string;
        };
      };
      // 10. 周期目标表
      cycle_goals: {
        Row: {
          id: number;
          user_id: string;
          cycle_id: number;
          dimension_id: number;
          content: string;
          evaluation_criteria: string;
          target_type: 'quantitative' | 'qualitative';
          target_value: number | null;
          target_unit: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          cycle_id: number;
          dimension_id: number;
          content: string;
          evaluation_criteria: string;
          target_type: 'quantitative' | 'qualitative';
          target_value?: number | null;
          target_unit?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          evaluation_criteria?: string;
          target_type?: 'quantitative' | 'qualitative';
          target_value?: number | null;
          target_unit?: string | null;
          updated_at?: string;
        };
      };
      // 11. 每日目标表
      daily_goals: {
        Row: {
          id: number;
          user_id: string;
          cycle_id: number;
          goal_date: string;
          dimension_id: number;
          content: string;
          evaluation_criteria: string;
          target_type: 'quantitative' | 'qualitative';
          target_value: number | null;
          target_unit: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          cycle_id: number;
          goal_date: string;
          dimension_id: number;
          content: string;
          evaluation_criteria: string;
          target_type: 'quantitative' | 'qualitative';
          target_value?: number | null;
          target_unit?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          evaluation_criteria?: string;
          target_type?: 'quantitative' | 'qualitative';
          target_value?: number | null;
          target_unit?: string | null;
          updated_at?: string;
        };
      };
      // 12. 目标评价表
      goal_evaluations: {
        Row: {
          id: number;
          user_id: string;
          cycle_id: number;
          goal_id: number;
          goal_type: 'cycle' | 'daily';
          dimension_id: number;
          ai_score: number;
          ai_analysis: string;
          user_score: number | null;
          user_comment: string | null;
          final_score: number | null;
          evaluated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          cycle_id: number;
          goal_id: number;
          goal_type: 'cycle' | 'daily';
          dimension_id: number;
          ai_score: number;
          ai_analysis: string;
          user_score?: number | null;
          user_comment?: string | null;
          final_score?: number | null;
          evaluated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          ai_score?: number;
          ai_analysis?: string;
          user_score?: number | null;
          user_comment?: string | null;
          final_score?: number | null;
          updated_at?: string;
        };
      };
      // 13. 成长标签表
      growth_tags: {
        Row: {
          id: number;
          user_id: string;
          tag_name: string;
          frequency: number;
          dimension_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          tag_name: string;
          frequency?: number;
          dimension_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tag_name?: string;
          frequency?: number;
          dimension_id?: number | null;
          updated_at?: string;
        };
      };
      // 14. 体重记录表
      weight_records: {
        Row: {
          id: number;
          user_id: string;
          weight_kg: number;
          record_date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          weight_kg: number;
          record_date: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          weight_kg?: number;
          notes?: string | null;
          updated_at?: string;
        };
      };
      // 15. 知识库表 (Knowledge Base)
      knowledge_base: {
        Row: {
          id: number;
          user_id: string;
          dimension_id: number;
          cycle_id: number;
          record_date: string;
          content: string;
          media_urls: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          dimension_id: number;
          cycle_id: number;
          record_date: string;
          content: string;
          media_urls?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          dimension_id?: number;
          cycle_id?: number;
          record_date?: string;
          content?: string;
          media_urls?: string[] | null;
          updated_at?: string;
        };
      };
      // 16. 认知报告表 (Reports)
      reports: {
        Row: {
          id: number;
          user_id: string;
          cycle_id: number;
          dimension_id: number | null; // null means overall report
          report_type: 'cycle' | 'monthly' | 'dimension_overall';
          content: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          cycle_id: number;
          dimension_id?: number | null;
          report_type: 'cycle' | 'monthly' | 'dimension_overall';
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
    };
    Views: {
      // 用户周期统计视图
      v_user_cycle_stats: {
        Row: {
          user_id: string;
          cycle_id: number;
          cycle_number: number;
          total_records: number;
          total_expense: number;
          completion_rate: number;
        };
      };
      // 用户全局统计视图
      v_user_global_stats: {
        Row: {
          user_id: string;
          total_cycles_completed: number;
          total_records: number;
          total_expense: number;
          avg_completion_rate: number;
          work_records: number;
          reading_records: number;
          investment_records: number;
          expense_records: number;
          other_records: number;
        };
      };
    };
    Functions: {
      // 自定义函数(如有需要)
    };
  };
}
