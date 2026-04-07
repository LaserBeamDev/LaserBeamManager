import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MpAccount {
  id: string;
  user_id: string;
  nombre: string;
  access_token: string;
  ambiente: string;
  activa: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
  // Populated after verify
  mp_user?: { id: number; nickname: string; email: string } | null;
}

export interface MpBalance {
  available_balance: number;
  unavailable_balance: number;
  total_amount: number;
}

export function useMercadoPago() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<MpAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('crm_mp_accounts')
      .select('*')
      .order('created_at', { ascending: true });
    setAccounts((data || []) as unknown as MpAccount[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const addAccount = useCallback(async (nombre: string, accessToken: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('crm_mp_accounts')
      .insert({ user_id: user.id, nombre, access_token: accessToken } as any)
      .select()
      .single();
    if (error) throw error;
    await fetchAccounts();
    return data as unknown as MpAccount;
  }, [user, fetchAccounts]);

  const updateAccount = useCallback(async (id: string, updates: Partial<MpAccount>) => {
    const { error } = await supabase
      .from('crm_mp_accounts')
      .update(updates as any)
      .eq('id', id);
    if (error) throw error;
    await fetchAccounts();
  }, [fetchAccounts]);

  const deleteAccount = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('crm_mp_accounts')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await fetchAccounts();
  }, [fetchAccounts]);

  const callMpApi = useCallback(async (accountId: string, action: string, params?: any) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('No autenticado');

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/mercadopago`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, account_id: accountId, params }),
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error en la API');
    return data;
  }, []);

  const verifyAccount = useCallback(async (accountId: string) => {
    return callMpApi(accountId, 'verify');
  }, [callMpApi]);

  const getBalance = useCallback(async (accountId: string) => {
    return callMpApi(accountId, 'balance');
  }, [callMpApi]);

  const getTransactions = useCallback(async (accountId: string, dateFrom?: string, dateTo?: string) => {
    return callMpApi(accountId, 'transactions', { date_from: dateFrom, date_to: dateTo });
  }, [callMpApi]);

  const getMovements = useCallback(async (accountId: string, dateFrom?: string, dateTo?: string) => {
    return callMpApi(accountId, 'movements', { date_from: dateFrom, date_to: dateTo });
  }, [callMpApi]);

  const createPaymentLink = useCallback(async (
    accountId: string,
    title: string,
    unitPrice: number,
    quantity = 1,
    description = '',
    externalReference = ''
  ) => {
    return callMpApi(accountId, 'create_preference', {
      title, unit_price: unitPrice, quantity, description, external_reference: externalReference,
    });
  }, [callMpApi]);

  return {
    accounts,
    loading,
    fetchAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    verifyAccount,
    getBalance,
    getTransactions,
    getMovements,
    createPaymentLink,
    callMpApi,
  };
}
