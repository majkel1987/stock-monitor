export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      fx_rates: {
        Row: {
          as_of: string;
          effective_date: string;
          pair: string;
          provider: string;
          rate: number;
          received_at: string;
        };
        Insert: {
          as_of: string;
          effective_date: string;
          pair: string;
          provider: string;
          rate: number;
          received_at?: string;
        };
        Update: {
          as_of?: string;
          effective_date?: string;
          pair?: string;
          provider?: string;
          rate?: number;
          received_at?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          action: string;
          after: Json | null;
          before: Json | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          user_id: string;
        };
        Insert: {
          action: string;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          user_id: string;
        };
        Update: {
          action?: string;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      investment_theses: {
        Row: {
          base_case: string | null;
          bear_case: string | null;
          bull_case: string | null;
          catalysts: Json;
          created_at: string;
          eps_fcf_growth_drivers: Json;
          growth_drivers: Json;
          id: string;
          key_risks: Json;
          kill_criteria: Json;
          monitoring_result_id: string;
          pros: Json;
          stock_id: string;
          summary: string | null;
        };
        Insert: {
          base_case?: string | null;
          bear_case?: string | null;
          bull_case?: string | null;
          catalysts?: Json;
          created_at?: string;
          eps_fcf_growth_drivers?: Json;
          growth_drivers?: Json;
          id?: string;
          key_risks?: Json;
          kill_criteria?: Json;
          monitoring_result_id: string;
          pros?: Json;
          stock_id: string;
          summary?: string | null;
        };
        Update: {
          base_case?: string | null;
          bear_case?: string | null;
          bull_case?: string | null;
          catalysts?: Json;
          created_at?: string;
          eps_fcf_growth_drivers?: Json;
          growth_drivers?: Json;
          id?: string;
          key_risks?: Json;
          kill_criteria?: Json;
          monitoring_result_id?: string;
          pros?: Json;
          stock_id?: string;
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "investment_theses_monitoring_stock_fkey";
            columns: ["monitoring_result_id", "stock_id"];
            isOneToOne: false;
            referencedRelation: "monitoring_results";
            referencedColumns: ["id", "stock_id"];
          },
          {
            foreignKeyName: "investment_theses_stock_id_fkey";
            columns: ["stock_id"];
            isOneToOne: false;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
        ];
      };
      market_quotes: {
        Row: {
          as_of: string;
          currency: string;
          day_change_pct: number | null;
          fifty_two_week_high: number | null;
          fifty_two_week_low: number | null;
          market_cap: number | null;
          previous_close: number | null;
          price: number;
          provider: string;
          quality_status: string;
          raw_hash: string | null;
          received_at: string;
          stock_id: string;
          volume: number | null;
        };
        Insert: {
          as_of: string;
          currency: string;
          day_change_pct?: number | null;
          fifty_two_week_high?: number | null;
          fifty_two_week_low?: number | null;
          market_cap?: number | null;
          previous_close?: number | null;
          price: number;
          provider: string;
          quality_status: string;
          raw_hash?: string | null;
          received_at?: string;
          stock_id: string;
          volume?: number | null;
        };
        Update: {
          as_of?: string;
          currency?: string;
          day_change_pct?: number | null;
          fifty_two_week_high?: number | null;
          fifty_two_week_low?: number | null;
          market_cap?: number | null;
          previous_close?: number | null;
          price?: number;
          provider?: string;
          quality_status?: string;
          raw_hash?: string | null;
          received_at?: string;
          stock_id?: string;
          volume?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "market_quotes_stock_id_fkey";
            columns: ["stock_id"];
            isOneToOne: true;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
        ];
      };
      markets: {
        Row: {
          code: string;
          currency: string;
          id: string;
          mic_codes: string[];
          name: string;
          timezone: string;
        };
        Insert: {
          code: string;
          currency: string;
          id?: string;
          mic_codes?: string[];
          name: string;
          timezone: string;
        };
        Update: {
          code?: string;
          currency?: string;
          id?: string;
          mic_codes?: string[];
          name?: string;
          timezone?: string;
        };
        Relationships: [];
      };
      monitoring_import_batches: {
        Row: {
          analysis_date: string;
          created_at: string;
          export_type: string;
          external_id: string;
          file_name: string;
          generated_at: string;
          id: string;
          raw_payload: Json;
          raw_size_bytes: number;
          schema_version: string;
          state: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          analysis_date: string;
          created_at?: string;
          export_type: string;
          external_id: string;
          file_name: string;
          generated_at: string;
          id?: string;
          raw_payload: Json;
          raw_size_bytes: number;
          schema_version: string;
          state?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          analysis_date?: string;
          created_at?: string;
          export_type?: string;
          external_id?: string;
          file_name?: string;
          generated_at?: string;
          id?: string;
          raw_payload?: Json;
          raw_size_bytes?: number;
          schema_version?: string;
          state?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      monitoring_import_items: {
        Row: {
          batch_id: string;
          committed_at: string | null;
          committed_monitoring_result_id: string | null;
          company_name: string | null;
          confidence: string | null;
          created_at: string;
          current_price: number | null;
          decision_action: string | null;
          errors: Json;
          existing_status_slug: string | null;
          external_id: string;
          id: string;
          imported_status_slug: string | null;
          include_in_commit: boolean;
          normalized_payload: Json;
          ordinal: number;
          price_level_actions: Json;
          resolved_status_id: string | null;
          resolved_stock_id: string | null;
          state: string;
          ticker: string | null;
          user_id: string;
          warnings: Json;
          warnings_accepted: boolean;
        };
        Insert: {
          batch_id: string;
          committed_at?: string | null;
          committed_monitoring_result_id?: string | null;
          company_name?: string | null;
          confidence?: string | null;
          created_at?: string;
          current_price?: number | null;
          decision_action?: string | null;
          errors?: Json;
          existing_status_slug?: string | null;
          external_id: string;
          id?: string;
          imported_status_slug?: string | null;
          include_in_commit?: boolean;
          normalized_payload: Json;
          ordinal: number;
          price_level_actions?: Json;
          resolved_status_id?: string | null;
          resolved_stock_id?: string | null;
          state: string;
          ticker?: string | null;
          user_id: string;
          warnings?: Json;
          warnings_accepted?: boolean;
        };
        Update: {
          batch_id?: string;
          committed_at?: string | null;
          committed_monitoring_result_id?: string | null;
          company_name?: string | null;
          confidence?: string | null;
          created_at?: string;
          current_price?: number | null;
          decision_action?: string | null;
          errors?: Json;
          existing_status_slug?: string | null;
          external_id?: string;
          id?: string;
          imported_status_slug?: string | null;
          include_in_commit?: boolean;
          normalized_payload?: Json;
          ordinal?: number;
          price_level_actions?: Json;
          resolved_status_id?: string | null;
          resolved_stock_id?: string | null;
          state?: string;
          ticker?: string | null;
          user_id?: string;
          warnings?: Json;
          warnings_accepted?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "monitoring_import_items_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "monitoring_import_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monitoring_import_items_monitoring_id_fkey";
            columns: ["committed_monitoring_result_id"];
            isOneToOne: false;
            referencedRelation: "monitoring_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monitoring_import_items_status_owner_fkey";
            columns: ["resolved_status_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "status_definitions";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "monitoring_import_items_stock_id_fkey";
            columns: ["resolved_stock_id"];
            isOneToOne: false;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
        ];
      };
      monitoring_results: {
        Row: {
          analysis_date: string | null;
          analysis_details: Json;
          analyzed_at: string;
          asymmetry_ratio: number | null;
          base_annualized_return_pct: number | null;
          base_fair_value: number | null;
          base_total_return_pct: number | null;
          bear_downside_pct: number | null;
          created_at: string;
          currency: string;
          data_confidence: string | null;
          decision_action: string | null;
          decision_reason: string | null;
          deleted_at: string | null;
          entry_zone_currency: string | null;
          entry_zone_from: number | null;
          entry_zone_to: number | null;
          fx_usd_pln: number | null;
          id: string;
          investment_score: number | null;
          momentum_score: number | null;
          next_expected_report_date: string | null;
          next_review_date: string | null;
          opportunity_category: string | null;
          price: number | null;
          price_as_of: string | null;
          price_pln: number | null;
          pros: Json;
          quality_score: number | null;
          recommendation: string | null;
          risk_score: number | null;
          risks: Json;
          source_reference: string | null;
          source_type: string;
          status_definition_id: string;
          stock_id: string;
          summary: string | null;
          supersedes_id: string | null;
          user_id: string;
          valuation_score: number | null;
        };
        Insert: {
          analysis_date?: string | null;
          analysis_details?: Json;
          analyzed_at?: string;
          asymmetry_ratio?: number | null;
          base_annualized_return_pct?: number | null;
          base_fair_value?: number | null;
          base_total_return_pct?: number | null;
          bear_downside_pct?: number | null;
          created_at?: string;
          currency: string;
          data_confidence?: string | null;
          decision_action?: string | null;
          decision_reason?: string | null;
          deleted_at?: string | null;
          entry_zone_currency?: string | null;
          entry_zone_from?: number | null;
          entry_zone_to?: number | null;
          fx_usd_pln?: number | null;
          id?: string;
          investment_score?: number | null;
          momentum_score?: number | null;
          next_expected_report_date?: string | null;
          next_review_date?: string | null;
          opportunity_category?: string | null;
          price?: number | null;
          price_as_of?: string | null;
          price_pln?: number | null;
          pros?: Json;
          quality_score?: number | null;
          recommendation?: string | null;
          risk_score?: number | null;
          risks?: Json;
          source_reference?: string | null;
          source_type?: string;
          status_definition_id: string;
          stock_id: string;
          summary?: string | null;
          supersedes_id?: string | null;
          user_id: string;
          valuation_score?: number | null;
        };
        Update: {
          analysis_date?: string | null;
          analysis_details?: Json;
          analyzed_at?: string;
          asymmetry_ratio?: number | null;
          base_annualized_return_pct?: number | null;
          base_fair_value?: number | null;
          base_total_return_pct?: number | null;
          bear_downside_pct?: number | null;
          created_at?: string;
          currency?: string;
          data_confidence?: string | null;
          decision_action?: string | null;
          decision_reason?: string | null;
          deleted_at?: string | null;
          entry_zone_currency?: string | null;
          entry_zone_from?: number | null;
          entry_zone_to?: number | null;
          fx_usd_pln?: number | null;
          id?: string;
          investment_score?: number | null;
          momentum_score?: number | null;
          next_expected_report_date?: string | null;
          next_review_date?: string | null;
          opportunity_category?: string | null;
          price?: number | null;
          price_as_of?: string | null;
          price_pln?: number | null;
          pros?: Json;
          quality_score?: number | null;
          recommendation?: string | null;
          risk_score?: number | null;
          risks?: Json;
          source_reference?: string | null;
          source_type?: string;
          status_definition_id?: string;
          stock_id?: string;
          summary?: string | null;
          supersedes_id?: string | null;
          user_id?: string;
          valuation_score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "monitoring_results_status_owner_fkey";
            columns: ["status_definition_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "status_definitions";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "monitoring_results_stock_id_fkey";
            columns: ["stock_id"];
            isOneToOne: false;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monitoring_results_supersedes_fkey";
            columns: ["supersedes_id", "user_id", "stock_id"];
            isOneToOne: false;
            referencedRelation: "monitoring_results";
            referencedColumns: ["id", "user_id", "stock_id"];
          },
        ];
      };
      notes: {
        Row: {
          content: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          is_pinned: boolean;
          stock_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_pinned?: boolean;
          stock_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_pinned?: boolean;
          stock_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_stock_id_fkey";
            columns: ["stock_id"];
            isOneToOne: false;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_transactions: {
        Row: {
          created_at: string;
          currency: string;
          id: string;
          price_per_share: number;
          quantity: number;
          stock_id: string;
          transaction_date: string;
          transaction_type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          currency: string;
          id?: string;
          price_per_share: number;
          quantity: number;
          stock_id: string;
          transaction_date: string;
          transaction_type?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          id?: string;
          price_per_share?: number;
          quantity?: number;
          stock_id?: string;
          transaction_date?: string;
          transaction_type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_transactions_stock_id_fkey";
            columns: ["stock_id"];
            isOneToOne: false;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
        ];
      };
      price_levels: {
        Row: {
          created_at: string;
          currency: string;
          id: string;
          is_active: boolean;
          kind: string;
          label: string;
          note: string | null;
          priority: number | null;
          sort_order: number;
          stock_id: string;
          trigger_direction: string;
          updated_at: string;
          user_id: string;
          valid_from: string | null;
          valid_to: string | null;
          value: number;
        };
        Insert: {
          created_at?: string;
          currency: string;
          id?: string;
          is_active?: boolean;
          kind: string;
          label: string;
          note?: string | null;
          priority?: number | null;
          sort_order?: number;
          stock_id: string;
          trigger_direction: string;
          updated_at?: string;
          user_id: string;
          valid_from?: string | null;
          valid_to?: string | null;
          value: number;
        };
        Update: {
          created_at?: string;
          currency?: string;
          id?: string;
          is_active?: boolean;
          kind?: string;
          label?: string;
          note?: string | null;
          priority?: number | null;
          sort_order?: number;
          stock_id?: string;
          trigger_direction?: string;
          updated_at?: string;
          user_id?: string;
          valid_from?: string | null;
          valid_to?: string | null;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "price_levels_stock_id_fkey";
            columns: ["stock_id"];
            isOneToOne: false;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
        ];
      };
      status_definitions: {
        Row: {
          color_token: string;
          created_at: string;
          dashboard_group: string;
          description: string | null;
          id: string;
          is_active: boolean;
          label: string;
          slug: string;
          sort_order: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color_token: string;
          created_at?: string;
          dashboard_group: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          label: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color_token?: string;
          created_at?: string;
          dashboard_group?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          label?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      stock_prices: {
        Row: {
          adjusted_close: number | null;
          close: number;
          created_at: string;
          currency: string;
          high: number | null;
          id: string;
          low: number | null;
          open: number | null;
          provider: string;
          stock_id: string;
          trading_date: string;
          volume: number | null;
        };
        Insert: {
          adjusted_close?: number | null;
          close: number;
          created_at?: string;
          currency: string;
          high?: number | null;
          id?: string;
          low?: number | null;
          open?: number | null;
          provider: string;
          stock_id: string;
          trading_date: string;
          volume?: number | null;
        };
        Update: {
          adjusted_close?: number | null;
          close?: number;
          created_at?: string;
          currency?: string;
          high?: number | null;
          id?: string;
          low?: number | null;
          open?: number | null;
          provider?: string;
          stock_id?: string;
          trading_date?: string;
          volume?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "stock_prices_stock_id_fkey";
            columns: ["stock_id"];
            isOneToOne: false;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_provider_symbols: {
        Row: {
          created_at: string;
          id: string;
          is_primary: boolean;
          metadata: Json;
          provider: string;
          provider_symbol: string;
          stock_id: string;
          updated_at: string;
          verified_at: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          metadata?: Json;
          provider: string;
          provider_symbol: string;
          stock_id: string;
          updated_at?: string;
          verified_at?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          metadata?: Json;
          provider?: string;
          provider_symbol?: string;
          stock_id?: string;
          updated_at?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stock_provider_symbols_stock_id_fkey";
            columns: ["stock_id"];
            isOneToOne: false;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
        ];
      };
      stocks: {
        Row: {
          created_at: string;
          currency: string;
          data_mode: string;
          exchange: string;
          id: string;
          isin: string | null;
          market_id: string;
          metadata_updated_at: string | null;
          name: string;
          ticker: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency: string;
          data_mode?: string;
          exchange: string;
          id?: string;
          isin?: string | null;
          market_id: string;
          metadata_updated_at?: string | null;
          name: string;
          ticker: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          data_mode?: string;
          exchange?: string;
          id?: string;
          isin?: string | null;
          market_id?: string;
          metadata_updated_at?: string | null;
          name?: string;
          ticker?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stocks_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_runs: {
        Row: {
          error_summary: string | null;
          failure_count: number;
          finished_at: string | null;
          id: string;
          job_type: string;
          metadata: Json;
          provider: string;
          requested_count: number;
          started_at: string;
          status: string;
          success_count: number;
        };
        Insert: {
          error_summary?: string | null;
          failure_count?: number;
          finished_at?: string | null;
          id?: string;
          job_type: string;
          metadata?: Json;
          provider: string;
          requested_count?: number;
          started_at?: string;
          status?: string;
          success_count?: number;
        };
        Update: {
          error_summary?: string | null;
          failure_count?: number;
          finished_at?: string | null;
          id?: string;
          job_type?: string;
          metadata?: Json;
          provider?: string;
          requested_count?: number;
          started_at?: string;
          status?: string;
          success_count?: number;
        };
        Relationships: [];
      };
      watchlist_items: {
        Row: {
          added_at: string;
          archived_at: string | null;
          current_status_id: string;
          display_order: number | null;
          id: string;
          stock_id: string;
          target_review_at: string | null;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          archived_at?: string | null;
          current_status_id: string;
          display_order?: number | null;
          id?: string;
          stock_id: string;
          target_review_at?: string | null;
          user_id: string;
        };
        Update: {
          added_at?: string;
          archived_at?: string | null;
          current_status_id?: string;
          display_order?: number | null;
          id?: string;
          stock_id?: string;
          target_review_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "watchlist_items_status_owner_fkey";
            columns: ["current_status_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "status_definitions";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "watchlist_items_stock_id_fkey";
            columns: ["stock_id"];
            isOneToOne: false;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      dashboard_monitoring_summary: {
        Row: {
          analyzed_at: string | null;
          created_at: string | null;
          currency: string | null;
          id: string | null;
          investment_score: number | null;
          previous_investment_score: number | null;
          previous_status_color_token: string | null;
          previous_status_dashboard_group: string | null;
          previous_status_definition_id: string | null;
          previous_status_label: string | null;
          previous_status_slug: string | null;
          previous_status_sort_order: number | null;
          price: number | null;
          recent_rank: number | null;
          recommendation: string | null;
          status_color_token: string | null;
          status_dashboard_group: string | null;
          status_definition_id: string | null;
          status_label: string | null;
          status_slug: string | null;
          status_sort_order: number | null;
          stock_id: string | null;
          stock_rank: number | null;
          summary: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "monitoring_results_status_owner_fkey";
            columns: ["status_definition_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "status_definitions";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "monitoring_results_stock_id_fkey";
            columns: ["stock_id"];
            isOneToOne: false;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      import_stooq_csv_prices: {
        Args: {
          p_as_of: string;
          p_day_change_pct: string | null;
          p_previous_close: string | null;
          p_price: string;
          p_quality_status: string;
          p_received_at: string;
          p_rows: Json;
          p_stock_id: string;
          p_volume: string | null;
        };
        Returns: {
          history_inserted_count: number;
          quote_updated: boolean;
        }[];
      };
      add_provider_stock_to_watchlist: {
        Args: {
          p_currency: string;
          p_exchange: string;
          p_isin: string | null;
          p_market_code: string;
          p_metadata?: Json;
          p_name: string;
          p_provider: string;
          p_provider_symbol: string;
          p_status_id: string;
          p_ticker: string;
        };
        Returns: {
          outcome: string;
          stock_id: string;
          watchlist_item_id: string;
        }[];
      };
      add_manual_stock_to_watchlist: {
        Args: {
          p_market_code: string;
          p_name: string;
          p_status_id: string;
          p_ticker: string;
        };
        Returns: {
          outcome: string;
          stock_id: string;
          watchlist_item_id: string;
        }[];
      };
      claim_market_sync: {
        Args: {
          p_job_type: string;
          p_metadata?: Json;
          p_owner_email: string | null;
          p_stale_after_seconds: number;
          p_user_id: string | null;
        };
        Returns: {
          acquired: boolean;
          reason: string;
          run_id: string;
          user_id: string | null;
        }[];
      };
      configure_market_sync_cron: { Args: never; Returns: number };
      disable_market_sync_cron: { Args: never; Returns: boolean };
      enqueue_market_sync: { Args: never; Returns: number };
      commit_gpw_monitoring_import_item: {
        Args: { p_item_id: string; p_price_level_actions?: Json };
        Returns: {
          monitoring_result_id: string | null;
          outcome: string;
          stock_id: string | null;
        }[];
      };
      commit_usa_monitoring_import_item: {
        Args: { p_item_id: string; p_price_level_actions?: Json };
        Returns: {
          monitoring_result_id: string | null;
          outcome: string;
          stock_id: string | null;
        }[];
      };
      create_gpw_monitoring_import_draft: {
        Args: {
          p_analysis_date: string;
          p_external_id: string;
          p_file_name: string;
          p_generated_at: string;
          p_items: Json;
          p_raw_payload: Json;
          p_raw_size_bytes: number;
        };
        Returns: {
          batch_id: string;
          outcome: string;
        }[];
      };
      create_usa_monitoring_import_draft: {
        Args: {
          p_analysis_date: string;
          p_external_id: string;
          p_file_name: string;
          p_generated_at: string;
          p_items: Json;
          p_raw_payload: Json;
          p_raw_size_bytes: number;
        };
        Returns: {
          batch_id: string;
          outcome: string;
        }[];
      };
      create_monitoring_with_thesis: {
        Args: {
          p_analyzed_at: string;
          p_base_case: string | null;
          p_bear_case: string | null;
          p_bull_case: string | null;
          p_catalysts: Json;
          p_currency: string;
          p_fx_usd_pln: number | null;
          p_investment_score: number | null;
          p_key_risks: Json;
          p_kill_criteria: Json;
          p_momentum_score: number | null;
          p_price: number;
          p_price_as_of: string;
          p_pros: Json;
          p_quality_score: number | null;
          p_recommendation: string | null;
          p_risk_score: number | null;
          p_risks: Json;
          p_source_reference: string | null;
          p_status_definition_id: string;
          p_stock_id: string;
          p_summary: string | null;
          p_supersedes_id: string | null;
          p_thesis_summary: string | null;
          p_valuation_score: number | null;
        };
        Returns: {
          monitoring_result_id: string | null;
          outcome: string;
        }[];
      };
      initialize_default_statuses: {
        Args: { p_user_id: string };
        Returns: number;
      };
      submit_manual_market_quote: {
        Args: {
          p_as_of: string;
          p_currency: string;
          p_price: number;
          p_stock_id: string;
        };
        Returns: string;
      };
      upsert_fx_rate: {
        Args: {
          p_as_of: string;
          p_effective_date: string;
          p_pair: string;
          p_provider: string;
          p_rate: number;
          p_received_at: string;
        };
        Returns: boolean;
      };
      upsert_eod_market_quote: {
        Args: {
          p_as_of: string;
          p_currency: string;
          p_day_change_pct: number | null;
          p_fifty_two_week_high: number | null;
          p_fifty_two_week_low: number | null;
          p_high: number | null;
          p_low: number | null;
          p_market_cap: number | null;
          p_open: number | null;
          p_previous_close: number | null;
          p_price: number;
          p_provider: string;
          p_quality_status: string;
          p_raw_hash: string | null;
          p_received_at: string;
          p_stock_id: string;
          p_trading_date: string;
          p_volume: number | null;
        };
        Returns: boolean;
      };
      upsert_market_quote: {
        Args: {
          p_as_of: string;
          p_currency: string;
          p_day_change_pct: number | null;
          p_fifty_two_week_high: number | null;
          p_fifty_two_week_low: number | null;
          p_market_cap: number | null;
          p_previous_close: number | null;
          p_price: number;
          p_provider: string;
          p_quality_status: string;
          p_raw_hash: string | null;
          p_received_at: string;
          p_stock_id: string;
          p_volume: number | null;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
