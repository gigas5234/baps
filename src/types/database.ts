export type Gender = "male" | "female";

export interface Profile {
  id: string;
  user_name: string;
  height: number | null;
  weight: number | null;
  /** 목표 몸무게 kg (선택, DB 마이그레이션 후) */
  target_weight?: number | null;
  age: number | null;
  gender: Gender | null;
  bmr: number;
  target_cal: number;
  /** 물 기록 1잔당 ml (기본 250, 마이그레이션 전에는 없을 수 있음) */
  water_cup_ml?: number | null;
  is_onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  image_url: string | null;
  food_name: string;
  cal: number;
  carbs: number;
  protein: number;
  fat: number;
  created_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  cups: number;
  date: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  total_cal: number;
  is_success: boolean;
  ai_fact_summary: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  is_ai: boolean;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "id" | "created_at" | "updated_at" | "is_onboarded">;
        Update: Partial<Omit<Profile, "id">>;
        Relationships: [];
      };
      meals: {
        Row: Meal;
        Insert: Omit<Meal, "id" | "created_at">;
        Update: Partial<Omit<Meal, "id">>;
        Relationships: [];
      };
      water_logs: {
        Row: WaterLog;
        Insert: Omit<WaterLog, "id">;
        Update: Partial<Omit<WaterLog, "id">>;
        Relationships: [];
      };
      daily_logs: {
        Row: DailyLog;
        Insert: Omit<DailyLog, "id" | "created_at">;
        Update: Partial<Omit<DailyLog, "id">>;
        Relationships: [];
      };
      chats: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, "id" | "created_at">;
        Update: Partial<Omit<ChatMessage, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
