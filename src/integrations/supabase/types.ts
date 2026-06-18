export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      badges: {
        Row: {
          description: string | null;
          icon: string | null;
          id: string;
          name: string | null;
          rule: Json | null;
        };
        Insert: {
          description?: string | null;
          icon?: string | null;
          id?: string;
          name?: string | null;
          rule?: Json | null;
        };
        Update: {
          description?: string | null;
          icon?: string | null;
          id?: string;
          name?: string | null;
          rule?: Json | null;
        };
        Relationships: [];
      };
      comment_agreements: {
        Row: {
          comment_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          comment_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          comment_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comment_agreements_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "sighting_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comment_agreements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      handle_changes: {
        Row: {
          changed_at: string;
          handle: string | null;
          id: string;
          user_id: string;
        };
        Insert: {
          changed_at?: string;
          handle?: string | null;
          id?: string;
          user_id: string;
        };
        Update: {
          changed_at?: string;
          handle?: string | null;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "handle_changes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      hunt_targets: {
        Row: {
          hunt_id: string;
          taxon_id: string;
        };
        Insert: {
          hunt_id: string;
          taxon_id: string;
        };
        Update: {
          hunt_id?: string;
          taxon_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hunt_targets_hunt_id_fkey";
            columns: ["hunt_id"];
            isOneToOne: false;
            referencedRelation: "hunts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hunt_targets_taxon_id_fkey";
            columns: ["taxon_id"];
            isOneToOne: false;
            referencedRelation: "taxa";
            referencedColumns: ["id"];
          },
        ];
      };
      hunts: {
        Row: {
          blurb: string | null;
          ends_at: string | null;
          id: string;
          region: string | null;
          reward_badge_id: string | null;
          starts_at: string | null;
          title: string;
        };
        Insert: {
          blurb?: string | null;
          ends_at?: string | null;
          id?: string;
          region?: string | null;
          reward_badge_id?: string | null;
          starts_at?: string | null;
          title: string;
        };
        Update: {
          blurb?: string | null;
          ends_at?: string | null;
          id?: string;
          region?: string | null;
          reward_badge_id?: string | null;
          starts_at?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          handle: string | null;
          id: string;
          points: number;
          region: string | null;
          role: Database["public"]["Enums"]["member_role"];
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          handle?: string | null;
          id: string;
          points?: number;
          region?: string | null;
          role?: Database["public"]["Enums"]["member_role"];
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          handle?: string | null;
          id?: string;
          points?: number;
          region?: string | null;
          role?: Database["public"]["Enums"]["member_role"];
        };
        Relationships: [];
      };
      reserved_handles: {
        Row: {
          handle: string;
        };
        Insert: {
          handle: string;
        };
        Update: {
          handle?: string;
        };
        Relationships: [];
      };
      sighting_comments: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          sighting_id: string;
          suggested_taxon_id: string | null;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          sighting_id: string;
          suggested_taxon_id?: string | null;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          sighting_id?: string;
          suggested_taxon_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sighting_comments_sighting_id_fkey";
            columns: ["sighting_id"];
            isOneToOne: false;
            referencedRelation: "sightings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sighting_comments_sighting_id_fkey";
            columns: ["sighting_id"];
            isOneToOne: false;
            referencedRelation: "sightings_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sighting_comments_suggested_taxon_id_fkey";
            columns: ["suggested_taxon_id"];
            isOneToOne: false;
            referencedRelation: "taxa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sighting_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      sighting_likes: {
        Row: {
          created_at: string;
          sighting_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          sighting_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          sighting_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sighting_likes_sighting_id_fkey";
            columns: ["sighting_id"];
            isOneToOne: false;
            referencedRelation: "sightings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sighting_likes_sighting_id_fkey";
            columns: ["sighting_id"];
            isOneToOne: false;
            referencedRelation: "sightings_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sighting_likes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      sighting_photos: {
        Row: {
          created_at: string;
          id: string;
          photo_url: string;
          position: number;
          sighting_id: string;
          storage_path: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          photo_url: string;
          position?: number;
          sighting_id: string;
          storage_path?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          photo_url?: string;
          position?: number;
          sighting_id?: string;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sighting_photos_sighting_id_fkey";
            columns: ["sighting_id"];
            isOneToOne: false;
            referencedRelation: "sightings";
            referencedColumns: ["id"];
          },
        ];
      };
      sightings: {
        Row: {
          altitude_accuracy_m: number | null;
          altitude_m: number | null;
          created_at: string;
          geom: unknown;
          habitat_description: string | null;
          habitat_type: string | null;
          id: string;
          lat: number | null;
          lng: number | null;
          location_label: string | null;
          location_precision: Database["public"]["Enums"]["location_precision"];
          notes: string | null;
          observed_at: string | null;
          origin: Database["public"]["Enums"]["sighting_origin"];
          photo_url: string | null;
          public_radius_km: number;
          status: Database["public"]["Enums"]["sighting_status"];
          taxon_id: string | null;
          user_id: string;
          variety: string | null;
        };
        Insert: {
          altitude_accuracy_m?: number | null;
          altitude_m?: number | null;
          created_at?: string;
          geom?: unknown;
          habitat_description?: string | null;
          habitat_type?: string | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          location_label?: string | null;
          location_precision?: Database["public"]["Enums"]["location_precision"];
          notes?: string | null;
          observed_at?: string | null;
          origin?: Database["public"]["Enums"]["sighting_origin"];
          photo_url?: string | null;
          public_radius_km?: number;
          status?: Database["public"]["Enums"]["sighting_status"];
          taxon_id?: string | null;
          user_id: string;
          variety?: string | null;
        };
        Update: {
          altitude_accuracy_m?: number | null;
          altitude_m?: number | null;
          created_at?: string;
          geom?: unknown;
          habitat_description?: string | null;
          habitat_type?: string | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          location_label?: string | null;
          location_precision?: Database["public"]["Enums"]["location_precision"];
          notes?: string | null;
          observed_at?: string | null;
          origin?: Database["public"]["Enums"]["sighting_origin"];
          photo_url?: string | null;
          public_radius_km?: number;
          status?: Database["public"]["Enums"]["sighting_status"];
          taxon_id?: string | null;
          user_id?: string;
          variety?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sightings_taxon_id_fkey";
            columns: ["taxon_id"];
            isOneToOne: false;
            referencedRelation: "taxa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sightings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      societies: {
        Row: {
          color: string | null;
          facebook_url: string | null;
          full_name: string | null;
          id: string;
          is_official: boolean;
          name: string;
        };
        Insert: {
          color?: string | null;
          facebook_url?: string | null;
          full_name?: string | null;
          id: string;
          is_official?: boolean;
          name: string;
        };
        Update: {
          color?: string | null;
          facebook_url?: string | null;
          full_name?: string | null;
          id?: string;
          is_official?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      society_members: {
        Row: {
          joined_at: string;
          society_id: string;
          user_id: string;
        };
        Insert: {
          joined_at?: string;
          society_id: string;
          user_id: string;
        };
        Update: {
          joined_at?: string;
          society_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "society_members_society_id_fkey";
            columns: ["society_id"];
            isOneToOne: false;
            referencedRelation: "societies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "society_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      society_messages: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          society_id: string | null;
          user_id: string | null;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          society_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          society_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "society_messages_society_id_fkey";
            columns: ["society_id"];
            isOneToOne: false;
            referencedRelation: "societies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "society_messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      spatial_ref_sys: {
        Row: {
          auth_name: string | null;
          auth_srid: number | null;
          proj4text: string | null;
          srid: number;
          srtext: string | null;
        };
        Insert: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid: number;
          srtext?: string | null;
        };
        Update: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid?: number;
          srtext?: string | null;
        };
        Relationships: [];
      };
      taxa: {
        Row: {
          common_name: string | null;
          conservation_status: string | null;
          created_at: string;
          culture: Json | null;
          description: string | null;
          family: string | null;
          genus: string | null;
          herbarium_ref: string | null;
          id: string;
          is_native: boolean;
          is_sensitive: boolean;
          ref_image_url: string | null;
          region: string | null;
          sci_name: string;
          synonyms: string[] | null;
          tribe: string | null;
        };
        Insert: {
          common_name?: string | null;
          conservation_status?: string | null;
          created_at?: string;
          culture?: Json | null;
          description?: string | null;
          family?: string | null;
          genus?: string | null;
          herbarium_ref?: string | null;
          id?: string;
          is_native?: boolean;
          is_sensitive?: boolean;
          ref_image_url?: string | null;
          region?: string | null;
          sci_name: string;
          synonyms?: string[] | null;
          tribe?: string | null;
        };
        Update: {
          common_name?: string | null;
          conservation_status?: string | null;
          created_at?: string;
          culture?: Json | null;
          description?: string | null;
          family?: string | null;
          genus?: string | null;
          herbarium_ref?: string | null;
          id?: string;
          is_native?: boolean;
          is_sensitive?: boolean;
          ref_image_url?: string | null;
          region?: string | null;
          sci_name?: string;
          synonyms?: string[] | null;
          tribe?: string | null;
        };
        Relationships: [];
      };
      trade_reports: {
        Row: {
          anonymous: boolean;
          created_at: string;
          details: string | null;
          id: string;
          kind: Database["public"]["Enums"]["report_kind"] | null;
          location_text: string | null;
          reporter_id: string | null;
          resolved_at: string | null;
          reviewer_id: string | null;
          reviewer_notes: string | null;
          status: Database["public"]["Enums"]["report_status"];
          taxon_id: string | null;
        };
        Insert: {
          anonymous?: boolean;
          created_at?: string;
          details?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["report_kind"] | null;
          location_text?: string | null;
          reporter_id?: string | null;
          resolved_at?: string | null;
          reviewer_id?: string | null;
          reviewer_notes?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          taxon_id?: string | null;
        };
        Update: {
          anonymous?: boolean;
          created_at?: string;
          details?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["report_kind"] | null;
          location_text?: string | null;
          reporter_id?: string | null;
          resolved_at?: string | null;
          reviewer_id?: string | null;
          reviewer_notes?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          taxon_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "trade_reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trade_reports_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trade_reports_taxon_id_fkey";
            columns: ["taxon_id"];
            isOneToOne: false;
            referencedRelation: "taxa";
            referencedColumns: ["id"];
          },
        ];
      };
      user_badges: {
        Row: {
          badge_id: string;
          earned_at: string;
          user_id: string;
        };
        Insert: {
          badge_id: string;
          earned_at?: string;
          user_id: string;
        };
        Update: {
          badge_id?: string;
          earned_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_badges_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      verifications: {
        Row: {
          created_at: string;
          decision: string | null;
          id: string;
          sighting_id: string;
          suggested_taxon_id: string | null;
          verifier_id: string;
        };
        Insert: {
          created_at?: string;
          decision?: string | null;
          id?: string;
          sighting_id: string;
          suggested_taxon_id?: string | null;
          verifier_id: string;
        };
        Update: {
          created_at?: string;
          decision?: string | null;
          id?: string;
          sighting_id?: string;
          suggested_taxon_id?: string | null;
          verifier_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verifications_sighting_id_fkey";
            columns: ["sighting_id"];
            isOneToOne: false;
            referencedRelation: "sightings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verifications_sighting_id_fkey";
            columns: ["sighting_id"];
            isOneToOne: false;
            referencedRelation: "sightings_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verifications_suggested_taxon_id_fkey";
            columns: ["suggested_taxon_id"];
            isOneToOne: false;
            referencedRelation: "taxa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verifications_verifier_id_fkey";
            columns: ["verifier_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null;
          f_geography_column: unknown;
          f_table_catalog: unknown;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Relationships: [];
      };
      geometry_columns: {
        Row: {
          coord_dimension: number | null;
          f_geometry_column: unknown;
          f_table_catalog: string | null;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Insert: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Update: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Relationships: [];
      };
      sightings_public: {
        Row: {
          common_name: string | null;
          created_at: string | null;
          geom_public: unknown;
          id: string | null;
          is_masked: boolean | null;
          is_sensitive: boolean | null;
          lat: number | null;
          lng: number | null;
          location_label: string | null;
          location_precision: Database["public"]["Enums"]["location_precision"] | null;
          notes: string | null;
          observed_at: string | null;
          origin: Database["public"]["Enums"]["sighting_origin"] | null;
          photo_url: string | null;
          public_radius_km: number | null;
          sci_name: string | null;
          status: Database["public"]["Enums"]["sighting_status"] | null;
          taxon_id: string | null;
          user_id: string | null;
          variety: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sightings_taxon_id_fkey";
            columns: ["taxon_id"];
            isOneToOne: false;
            referencedRelation: "taxa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sightings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string };
        Returns: undefined;
      };
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown };
        Returns: unknown;
      };
      _postgis_pgsql_version: { Args: never; Returns: string };
      _postgis_scripts_pgsql_version: { Args: never; Returns: string };
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown };
        Returns: number;
      };
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown };
        Returns: string;
      };
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_sortablehash: { Args: { geom: unknown }; Returns: number };
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_voronoi: {
        Args: {
          clip?: unknown;
          g1: unknown;
          return_polygons?: boolean;
          tolerance?: number;
        };
        Returns: unknown;
      };
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      addauth: { Args: { "": string }; Returns: boolean };
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              new_dim: number;
              new_srid_in: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          };
      claim_handle: {
        Args: { p_handle: string };
        Returns: {
          created_at: string;
          display_name: string | null;
          handle: string | null;
          id: string;
          points: number;
          region: string | null;
          role: Database["public"]["Enums"]["member_role"];
        };
        SetofOptions: {
          from: "*";
          to: "profiles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      disablelongtransactions: { Args: never; Returns: string };
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | { Args: { column_name: string; table_name: string }; Returns: string };
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string };
      enablelongtransactions: { Args: never; Returns: string };
      enforce_rate_limit: {
        Args: {
          p_max: number;
          p_table: unknown;
          p_uid: string;
          p_window: string;
        };
        Returns: undefined;
      };
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      fuzz_point: { Args: { g: unknown; grid_deg?: number }; Returns: unknown };
      geometry: { Args: { "": string }; Returns: unknown };
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geomfromewkt: { Args: { "": string }; Returns: unknown };
      gettransactionid: { Args: never; Returns: unknown };
      is_admin: { Args: never; Returns: boolean };
      is_verifier_or_admin: { Args: never; Returns: boolean };
      leaderboard: {
        Args: { p_limit?: number; p_region?: string; p_since?: string };
        Returns: {
          display_name: string;
          handle: string;
          position: number;
          species: number;
          user_id: string;
          verified: number;
        }[];
      };
      longtransactionsenabled: { Args: never; Returns: boolean };
      peer_promote_sighting: {
        Args: { p_sighting_id: string };
        Returns: undefined;
      };
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string };
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: string;
      };
      postgis_extensions_upgrade: { Args: never; Returns: string };
      postgis_full_version: { Args: never; Returns: string };
      postgis_geos_version: { Args: never; Returns: string };
      postgis_lib_build_date: { Args: never; Returns: string };
      postgis_lib_revision: { Args: never; Returns: string };
      postgis_lib_version: { Args: never; Returns: string };
      postgis_libjson_version: { Args: never; Returns: string };
      postgis_liblwgeom_version: { Args: never; Returns: string };
      postgis_libprotobuf_version: { Args: never; Returns: string };
      postgis_libxml_version: { Args: never; Returns: string };
      postgis_proj_version: { Args: never; Returns: string };
      postgis_scripts_build_date: { Args: never; Returns: string };
      postgis_scripts_installed: { Args: never; Returns: string };
      postgis_scripts_released: { Args: never; Returns: string };
      postgis_svn_version: { Args: never; Returns: string };
      postgis_type_name: {
        Args: {
          coord_dimension: number;
          geomname: string;
          use_new_name?: boolean;
        };
        Returns: string;
      };
      postgis_version: { Args: never; Returns: string };
      postgis_wagyu_version: { Args: never; Returns: string };
      recompute_points: { Args: { uid: string }; Returns: number };
      sighting_public_one: {
        Args: { p_id: string };
        Returns: {
          common_name: string;
          created_at: string;
          id: string;
          is_masked: boolean;
          is_sensitive: boolean;
          lat: number;
          lng: number;
          location_label: string;
          location_precision: Database["public"]["Enums"]["location_precision"];
          notes: string;
          observed_at: string;
          photo_url: string;
          public_radius_km: number;
          sci_name: string;
          status: Database["public"]["Enums"]["sighting_status"];
          taxon_id: string;
          user_id: string;
        }[];
      };
      species_observations: {
        Args: { p_taxon_id: string };
        Returns: {
          id: string;
          user_id: string;
          taxon_id: string;
          sci_name: string;
          common_name: string;
          is_masked: boolean;
          status: Database["public"]["Enums"]["sighting_status"];
          location_label: string;
          observed_at: string;
          created_at: string;
          photo_url: string;
          variety: string;
          origin: Database["public"]["Enums"]["sighting_origin"];
          like_count: number;
        }[];
      };
      species_top_photos: {
        Args: never;
        Returns: {
          taxon_id: string;
          photo_url: string;
          like_count: number;
        }[];
      };
      sightings_in_bbox: {
        Args: {
          max_lat: number;
          max_lng: number;
          min_lat: number;
          min_lng: number;
        };
        Returns: {
          common_name: string;
          id: string;
          is_masked: boolean;
          is_sensitive: boolean;
          lat: number;
          lng: number;
          location_label: string;
          location_precision: Database["public"]["Enums"]["location_precision"];
          public_radius_km: number;
          sci_name: string;
          status: Database["public"]["Enums"]["sighting_status"];
        }[];
      };
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown };
            Returns: number;
          };
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number };
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number };
        Returns: string;
      };
      st_asewkt: { Args: { "": string }; Returns: string };
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | {
            Args: {
              geom_column?: string;
              maxdecimaldigits?: number;
              pretty_bool?: boolean;
              r: Record<string, unknown>;
            };
            Returns: string;
          }
        | { Args: { "": string }; Returns: string };
      st_asgml:
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
            };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          };
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          }
        | { Args: { "": string }; Returns: string };
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string };
        Returns: string;
      };
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string };
      st_asmvtgeom: {
        Args: {
          bounds: unknown;
          buffer?: number;
          clip_geom?: boolean;
          extent?: number;
          geom: unknown;
        };
        Returns: unknown;
      };
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | { Args: { "": string }; Returns: string };
      st_astext: { Args: { "": string }; Returns: string };
      st_astwkb:
        | {
            Args: {
              geom: unknown;
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown[];
              ids: number[];
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          };
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
        Returns: string;
      };
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number };
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown };
        Returns: unknown;
      };
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number };
            Returns: unknown;
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number };
            Returns: unknown;
          };
      st_centroid: { Args: { "": string }; Returns: unknown };
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown };
        Returns: unknown;
      };
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean;
          param_geom: unknown;
          param_pctconvex: number;
        };
        Returns: unknown;
      };
      st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_coorddim: { Args: { geometry: unknown }; Returns: number };
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number };
        Returns: unknown;
      };
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean };
            Returns: number;
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number };
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number };
            Returns: number;
          };
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number };
            Returns: unknown;
          }
        | {
            Args: {
              dm?: number;
              dx: number;
              dy: number;
              dz?: number;
              geom: unknown;
            };
            Returns: unknown;
          };
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown };
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number };
        Returns: unknown;
      };
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number };
        Returns: unknown;
      };
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number };
        Returns: unknown;
      };
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number };
            Returns: unknown;
          };
      st_geogfromtext: { Args: { "": string }; Returns: unknown };
      st_geographyfromtext: { Args: { "": string }; Returns: unknown };
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string };
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown };
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean;
          g: unknown;
          max_iter?: number;
          tolerance?: number;
        };
        Returns: unknown;
      };
      st_geometryfromtext: { Args: { "": string }; Returns: unknown };
      st_geomfromewkt: { Args: { "": string }; Returns: unknown };
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown };
      st_geomfromgml: { Args: { "": string }; Returns: unknown };
      st_geomfromkml: { Args: { "": string }; Returns: unknown };
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown };
      st_geomfromtext: { Args: { "": string }; Returns: unknown };
      st_gmltosql: { Args: { "": string }; Returns: unknown };
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean };
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_hexagongrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown };
        Returns: number;
      };
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown };
        Returns: Database["public"]["CompositeTypes"]["valid_detail"];
        SetofOptions: {
          from: "*";
          to: "valid_detail";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number };
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown };
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string };
        Returns: unknown;
      };
      st_linefromtext: { Args: { "": string }; Returns: unknown };
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown };
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number };
        Returns: unknown;
      };
      st_locatebetween: {
        Args: {
          frommeasure: number;
          geometry: unknown;
          leftrightoffset?: number;
          tomeasure: number;
        };
        Returns: unknown;
      };
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number };
        Returns: unknown;
      };
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makevalid: {
        Args: { geom: unknown; params: string };
        Returns: unknown;
      };
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number };
        Returns: unknown;
      };
      st_mlinefromtext: { Args: { "": string }; Returns: unknown };
      st_mpointfromtext: { Args: { "": string }; Returns: unknown };
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown };
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown };
      st_multipointfromtext: { Args: { "": string }; Returns: unknown };
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown };
      st_node: { Args: { g: unknown }; Returns: unknown };
      st_normalize: { Args: { geom: unknown }; Returns: unknown };
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string };
        Returns: unknown;
      };
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean };
        Returns: number;
      };
      st_pointfromtext: { Args: { "": string }; Returns: unknown };
      st_pointm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
        };
        Returns: unknown;
      };
      st_pointz: {
        Args: {
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_pointzm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_polyfromtext: { Args: { "": string }; Returns: unknown };
      st_polygonfromtext: { Args: { "": string }; Returns: unknown };
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown };
        Returns: unknown;
      };
      st_quantizecoordinates: {
        Args: {
          g: unknown;
          prec_m?: number;
          prec_x: number;
          prec_y?: number;
          prec_z?: number;
        };
        Returns: unknown;
      };
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number };
        Returns: unknown;
      };
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string };
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number };
        Returns: unknown;
      };
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown };
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number };
        Returns: unknown;
      };
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_squaregrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number };
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number };
        Returns: unknown[];
      };
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown };
        Returns: unknown;
      };
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_tileenvelope: {
        Args: {
          bounds?: unknown;
          margin?: number;
          x: number;
          y: number;
          zoom: number;
        };
        Returns: unknown;
      };
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string };
            Returns: unknown;
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number };
            Returns: unknown;
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown };
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown };
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number };
            Returns: unknown;
          };
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown };
      st_wkttosql: { Args: { "": string }; Returns: unknown };
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number };
        Returns: unknown;
      };
      top_suggested_id: {
        Args: { p_sighting_id: string };
        Returns: {
          common_name: string;
          sci_name: string;
          score: number;
          taxon_id: string;
        }[];
      };
      unlockrows: { Args: { "": string }; Returns: number };
      updategeometrysrid: {
        Args: {
          catalogn_name: string;
          column_name: string;
          new_srid_in: number;
          schema_name: string;
          table_name: string;
        };
        Returns: string;
      };
      verify_sighting: {
        Args: { p_decision: string; p_sighting_id: string; p_taxon_id?: string };
        Returns: {
          created_at: string;
          geom: unknown;
          id: string;
          lat: number | null;
          lng: number | null;
          location_label: string | null;
          location_precision: Database["public"]["Enums"]["location_precision"];
          notes: string | null;
          observed_at: string | null;
          origin: Database["public"]["Enums"]["sighting_origin"];
          photo_url: string | null;
          status: Database["public"]["Enums"]["sighting_status"];
          taxon_id: string | null;
          user_id: string;
          variety: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "sightings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      location_precision: "exact" | "fuzzed" | "hidden";
      member_role: "spotter" | "verifier" | "admin";
      report_kind: "online_sale" | "market_sale" | "field_extraction" | "other";
      report_status: "new" | "triaged" | "escalated" | "closed";
      sighting_origin: "wild" | "collection";
      sighting_status: "needs_id" | "pending" | "verified" | "rejected";
    };
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null;
        geom: unknown;
      };
      valid_detail: {
        valid: boolean | null;
        reason: string | null;
        location: unknown;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      location_precision: ["exact", "fuzzed", "hidden"],
      member_role: ["spotter", "verifier", "admin"],
      report_kind: ["online_sale", "market_sale", "field_extraction", "other"],
      report_status: ["new", "triaged", "escalated", "closed"],
      sighting_origin: ["wild", "collection"],
      sighting_status: ["needs_id", "pending", "verified", "rejected"],
    },
  },
} as const;
