export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<
  Row extends Record<string, unknown>,
  Insert = Partial<Row> & Record<string, unknown>,
  Update = Partial<Row>,
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  plan: string;
  status: string;
  theme: Json;
  stripe_account_id: string | null;
  auth_org_id: string | null;
  logo_path: string | null;
  wordmark: string | null;
  wordmark_sub: string | null;
  tagline: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyRow = {
  id: string;
  company_id: string;
  slug: string;
  name: string;
  status: string;
  headline: string | null;
  summary: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sleeps: number | null;
  sqft: number | null;
  amenities: string[];
  house_rules: string | null;
  airbnb_url: string | null;
  hospitable_property_id: string | null;
  pricelabs_listing_id: string | null;
  pricelabs_pms: string;
  airdna_listing_id: string | null;
  airdna_market_id: string | null;
  cleaning_fee_cents: number;
  currency: string;
  accent: Json;
  created_at: string;
  updated_at: string;
};

export type PageRow = {
  id: string;
  company_id: string;
  property_id: string | null;
  slug: string;
  title: string;
  status: string;
  template: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type BlockRow = {
  id: string;
  company_id: string;
  page_id: string;
  type: string;
  position: number;
  data: Json;
  created_at: string;
  updated_at: string;
};

export type GuestRow = {
  id: string;
  company_id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  trust_status: string;
  opted_in: boolean;
  source: string;
  hospitable_guest_id: string | null;
  incident_flag: boolean;
  created_at: string;
  updated_at: string;
};

export type BookingRow = {
  id: string;
  company_id: string;
  property_id: string;
  guest_id: string;
  status: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  currency: string;
  accommodation_cents: number;
  cleaning_fee_cents: number;
  total_cents: number;
  quoted_nights: Json;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  hospitable_reservation_id: string | null;
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      companies: Table<CompanyRow>;
      properties: Table<PropertyRow>;
      pages: Table<PageRow>;
      blocks: Table<BlockRow>;
      media_assets: Table<{
        id: string;
        company_id: string;
        property_id: string | null;
        storage_path: string;
        alt_text: string;
        caption: string | null;
        mime_type: string | null;
        width: number | null;
        height: number | null;
        file_size: number | null;
        created_at: string;
        updated_at: string;
      }>;
      integration_accounts: Table<{
        id: string;
        company_id: string;
        provider: string;
        status: string;
        credentials: Json;
        metadata: Json;
        created_at: string;
        updated_at: string;
      }>;
      guests: Table<GuestRow>;
      guest_registrations: Table<{
        id: string;
        company_id: string;
        property_id: string;
        guest_id: string;
        created_at: string;
      }>;
      guest_magic_links: Table<{
        id: string;
        company_id: string;
        guest_id: string;
        token_hash: string;
        expires_at: string;
        consumed_at: string | null;
        created_at: string;
      }>;
      guest_sessions: Table<{
        id: string;
        company_id: string;
        guest_id: string;
        token_hash: string;
        expires_at: string;
        created_at: string;
      }>;
      bookings: Table<BookingRow>;
      nightly_rates: Table<{
        property_id: string;
        company_id: string;
        stay_date: string;
        amount_cents: number;
        currency: string;
        min_stay: number | null;
        available: boolean | null;
        source: string;
        fetched_at: string;
      }>;
      airdna_snapshots: Table<{
        id: string;
        company_id: string;
        property_id: string;
        period: string;
        metrics: Json;
        fetched_at: string;
      }>;
      hospitable_reservations: Table<{
        id: string;
        company_id: string;
        property_id: string | null;
        guest_id: string | null;
        hospitable_id: string;
        platform: string | null;
        status: string | null;
        check_in: string | null;
        check_out: string | null;
        payload: Json;
        created_at: string;
        updated_at: string;
      }>;
      guest_messages: Table<{
        id: string;
        company_id: string;
        property_id: string | null;
        guest_id: string | null;
        hospitable_reservation_id: string | null;
        hospitable_message_id: string;
        direction: string;
        body: string;
        source: string | null;
        sent_at: string | null;
        guide_checked_at: string | null;
        payload: Json;
        created_at: string;
      }>;
      house_guide_drafts: Table<{
        id: string;
        company_id: string;
        property_id: string;
        status: string;
        title: string;
        body: string;
        reason: string | null;
        source_message_ids: string[];
        created_at: string;
        updated_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      is_member: {
        Args: { _company_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
