export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      budget_capacidades: {
        Row: {
          created_at: string
          id: string
          minutos_disponibles_dia: number
          recurso: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          minutos_disponibles_dia?: number
          recurso: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          minutos_disponibles_dia?: number
          recurso?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_materiales: {
        Row: {
          activo: boolean
          alto: number | null
          area: number | null
          cantidad_produccion: number
          codigo: string
          composicion: Json | null
          costo_base: number
          created_at: string
          descripcion: string | null
          es_plantilla: boolean
          id: string
          largo: number | null
          nombre: string
          proveedor: string | null
          tipo: string
          unidad: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activo?: boolean
          alto?: number | null
          area?: number | null
          cantidad_produccion?: number
          codigo?: string
          composicion?: Json | null
          costo_base?: number
          created_at?: string
          descripcion?: string | null
          es_plantilla?: boolean
          id?: string
          largo?: number | null
          nombre?: string
          proveedor?: string | null
          tipo?: string
          unidad?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activo?: boolean
          alto?: number | null
          area?: number | null
          cantidad_produccion?: number
          codigo?: string
          composicion?: Json | null
          costo_base?: number
          created_at?: string
          descripcion?: string | null
          es_plantilla?: boolean
          id?: string
          largo?: number | null
          nombre?: string
          proveedor?: string | null
          tipo?: string
          unidad?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_parametros: {
        Row: {
          co2: Json
          created_at: string
          fecha_vigencia: string
          fibra: Json
          generales: Json
          id: string
          user_id: string
        }
        Insert: {
          co2?: Json
          created_at?: string
          fecha_vigencia?: string
          fibra?: Json
          generales?: Json
          id?: string
          user_id: string
        }
        Update: {
          co2?: Json
          created_at?: string
          fecha_vigencia?: string
          fibra?: Json
          generales?: Json
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_presupuestos: {
        Row: {
          cliente_contacto: string | null
          cliente_nombre: string | null
          created_at: string
          estado: string
          fecha_creacion: string
          id: string
          impuesto_pct: number
          items: Json | null
          numero: number
          observaciones: string | null
          parametros_snapshot_id: string | null
          total_con_impuesto: number
          total_neto: number
          user_id: string
          validez_dias: number
        }
        Insert: {
          cliente_contacto?: string | null
          cliente_nombre?: string | null
          created_at?: string
          estado?: string
          fecha_creacion?: string
          id?: string
          impuesto_pct?: number
          items?: Json | null
          numero?: number
          observaciones?: string | null
          parametros_snapshot_id?: string | null
          total_con_impuesto?: number
          total_neto?: number
          user_id: string
          validez_dias?: number
        }
        Update: {
          cliente_contacto?: string | null
          cliente_nombre?: string | null
          created_at?: string
          estado?: string
          fecha_creacion?: string
          id?: string
          impuesto_pct?: number
          items?: Json | null
          numero?: number
          observaciones?: string | null
          parametros_snapshot_id?: string | null
          total_con_impuesto?: number
          total_neto?: number
          user_id?: string
          validez_dias?: number
        }
        Relationships: []
      }
      budget_procesos: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          recurso: string
          user_id: string
        }
        Insert: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          recurso?: string
          user_id: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          recurso?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_productos: {
        Row: {
          activo: boolean
          cantidad_produccion: number
          categoria: string | null
          codigo: string
          created_at: string
          descripcion: string | null
          es_plantilla: boolean
          id: string
          margen_defecto: number
          materiales: Json | null
          nombre: string
          observaciones: string | null
          procesos: Json | null
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activo?: boolean
          cantidad_produccion?: number
          categoria?: string | null
          codigo?: string
          created_at?: string
          descripcion?: string | null
          es_plantilla?: boolean
          id?: string
          margen_defecto?: number
          materiales?: Json | null
          nombre?: string
          observaciones?: string | null
          procesos?: Json | null
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activo?: boolean
          cantidad_produccion?: number
          categoria?: string | null
          codigo?: string
          created_at?: string
          descripcion?: string | null
          es_plantilla?: boolean
          id?: string
          margen_defecto?: number
          materiales?: Json | null
          nombre?: string
          observaciones?: string | null
          procesos?: Json | null
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_clients: {
        Row: {
          condicion_fiscal: string | null
          created_at: string
          cuit_dni: string | null
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          notas: string | null
          razon_social: string | null
          rubro: string | null
          telefono: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          condicion_fiscal?: string | null
          created_at?: string
          cuit_dni?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          razon_social?: string | null
          rubro?: string | null
          telefono?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          condicion_fiscal?: string | null
          created_at?: string
          cuit_dni?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          razon_social?: string | null
          rubro?: string | null
          telefono?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_config: {
        Row: {
          accounts_egresos: string[] | null
          accounts_ingresos: string[] | null
          created_at: string
          id: string
          imputables_egresos: string[] | null
          imputables_ingresos: string[] | null
          payment_methods: string[] | null
          suppliers: string[] | null
          updated_at: string
          user_id: string
          vendors: string[] | null
        }
        Insert: {
          accounts_egresos?: string[] | null
          accounts_ingresos?: string[] | null
          created_at?: string
          id?: string
          imputables_egresos?: string[] | null
          imputables_ingresos?: string[] | null
          payment_methods?: string[] | null
          suppliers?: string[] | null
          updated_at?: string
          user_id: string
          vendors?: string[] | null
        }
        Update: {
          accounts_egresos?: string[] | null
          accounts_ingresos?: string[] | null
          created_at?: string
          id?: string
          imputables_egresos?: string[] | null
          imputables_ingresos?: string[] | null
          payment_methods?: string[] | null
          suppliers?: string[] | null
          updated_at?: string
          user_id?: string
          vendors?: string[] | null
        }
        Relationships: []
      }
      crm_mp_accounts: {
        Row: {
          access_token: string
          activa: boolean
          ambiente: string
          created_at: string
          id: string
          last_sync_at: string | null
          nombre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string
          activa?: boolean
          ambiente?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          nombre?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          activa?: boolean
          ambiente?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          nombre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_product_stocks: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          min_stock: number
          sku: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          id?: string
          min_stock?: number
          sku: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          min_stock?: number
          sku?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_products: {
        Row: {
          controla_stock: boolean
          created_at: string
          id: string
          nombre: string
          sku: string
          user_id: string
        }
        Insert: {
          controla_stock?: boolean
          created_at?: string
          id?: string
          nombre: string
          sku: string
          user_id: string
        }
        Update: {
          controla_stock?: boolean
          created_at?: string
          id?: string
          nombre?: string
          sku?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_suppliers: {
        Row: {
          contacto: string | null
          created_at: string
          direccion: string | null
          id: string
          nombre: string
          producto_servicio: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contacto?: string | null
          created_at?: string
          direccion?: string | null
          id?: string
          nombre?: string
          producto_servicio?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contacto?: string | null
          created_at?: string
          direccion?: string | null
          id?: string
          nombre?: string
          producto_servicio?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_transactions: {
        Row: {
          cliente: string
          color_producto: string | null
          concepto: Database["public"]["Enums"]["concepto_type"]
          created_at: string
          cuenta: string
          detalle: string | null
          estado: Database["public"]["Enums"]["estado_type"]
          etapa: Database["public"]["Enums"]["etapa_produccion"] | null
          fecha: string
          fecha_despacho: string | null
          fecha_entrega: string | null
          id: string
          imputable: string
          items: Json | null
          medio_envio: string | null
          medio_pago: string
          notas_produccion: string | null
          numero_orden: string
          prioridad: number | null
          proveedor: string | null
          sku: string
          telefono_cliente: string | null
          tipo: Database["public"]["Enums"]["transaction_type"]
          total: number
          total_orden: number
          tracking_number: string | null
          unidades: number
          updated_at: string
          user_id: string
          vendedor: string
        }
        Insert: {
          cliente?: string
          color_producto?: string | null
          concepto?: Database["public"]["Enums"]["concepto_type"]
          created_at?: string
          cuenta?: string
          detalle?: string | null
          estado?: Database["public"]["Enums"]["estado_type"]
          etapa?: Database["public"]["Enums"]["etapa_produccion"] | null
          fecha?: string
          fecha_despacho?: string | null
          fecha_entrega?: string | null
          id?: string
          imputable?: string
          items?: Json | null
          medio_envio?: string | null
          medio_pago?: string
          notas_produccion?: string | null
          numero_orden?: string
          prioridad?: number | null
          proveedor?: string | null
          sku?: string
          telefono_cliente?: string | null
          tipo: Database["public"]["Enums"]["transaction_type"]
          total?: number
          total_orden?: number
          tracking_number?: string | null
          unidades?: number
          updated_at?: string
          user_id: string
          vendedor?: string
        }
        Update: {
          cliente?: string
          color_producto?: string | null
          concepto?: Database["public"]["Enums"]["concepto_type"]
          created_at?: string
          cuenta?: string
          detalle?: string | null
          estado?: Database["public"]["Enums"]["estado_type"]
          etapa?: Database["public"]["Enums"]["etapa_produccion"] | null
          fecha?: string
          fecha_despacho?: string | null
          fecha_entrega?: string | null
          id?: string
          imputable?: string
          items?: Json | null
          medio_envio?: string | null
          medio_pago?: string
          notas_produccion?: string | null
          numero_orden?: string
          prioridad?: number | null
          proveedor?: string | null
          sku?: string
          telefono_cliente?: string | null
          tipo?: Database["public"]["Enums"]["transaction_type"]
          total?: number
          total_orden?: number
          tracking_number?: string | null
          unidades?: number
          updated_at?: string
          user_id?: string
          vendedor?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operador" | "usuario"
      concepto_type: "Seña" | "Saldo" | "Total"
      estado_type: "Pendiente" | "Completado" | "Cancelado"
      etapa_produccion:
        | "Diseño Solicitado"
        | "Pedido Potencial"
        | "Pedido Confirmado"
        | "Máquina/Producción"
        | "Logística"
        | "Completado"
      transaction_type: "Ingreso" | "Egreso"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operador", "usuario"],
      concepto_type: ["Seña", "Saldo", "Total"],
      estado_type: ["Pendiente", "Completado", "Cancelado"],
      etapa_produccion: [
        "Diseño Solicitado",
        "Pedido Potencial",
        "Pedido Confirmado",
        "Máquina/Producción",
        "Logística",
        "Completado",
      ],
      transaction_type: ["Ingreso", "Egreso"],
    },
  },
} as const
