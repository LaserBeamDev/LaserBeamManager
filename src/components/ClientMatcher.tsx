import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Phone, User, Search, Building2 } from 'lucide-react';

interface CrmClient {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  razon_social: string;
}

/** Normalize phone: strip all non-digits */
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Format phone for display: standardize to local format */
export function formatPhoneStandard(raw: string): string {
  const digits = normalizePhone(raw);
  if (digits.length === 10) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 13 && digits.startsWith('549')) {
    const local = digits.slice(3);
    return `${local.slice(0, 2)} ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return raw;
}

interface ClientMatcherProps {
  phone: string;
  clientName: string;
  onPhoneChange: (phone: string) => void;
  onClientSelect: (client: { nombre: string; telefono: string; clientId?: string }) => void;
  onClientNameChange?: (name: string) => void;
  showNameField?: boolean;
  showPhoneField?: boolean;
  className?: string;
}

export default function ClientMatcher({
  phone,
  clientName,
  onPhoneChange,
  onClientSelect,
  onClientNameChange,
  showNameField = true,
  showPhoneField = true,
  className = '',
}: ClientMatcherProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load clients once
  useEffect(() => {
    if (!user || loaded) return;
    supabase
      .from('crm_clients')
      .select('id, nombre, telefono, email, direccion, razon_social')
      .order('nombre')
      .then(({ data }) => {
        if (data) setClients(data as CrmClient[]);
        setLoaded(true);
      });
  }, [user, loaded]);

  // Match clients by last 4 digits of phone
  const phoneMatches = useMemo(() => {
    const digits = normalizePhone(phone);
    if (digits.length < 4) return [];
    const last4 = digits.slice(-4);
    return clients.filter(c => {
      const cDigits = normalizePhone(c.telefono || '');
      return cDigits.length >= 4 && cDigits.slice(-4) === last4;
    });
  }, [phone, clients]);

  // Match clients by name or razon_social
  const [nameSearch, setNameSearch] = useState('');
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const nameMatches = useMemo(() => {
    if (nameSearch.length < 2) return [];
    const lower = nameSearch.toLowerCase();
    return clients.filter(c =>
      c.nombre.toLowerCase().includes(lower) ||
      (c.razon_social && c.razon_social.toLowerCase().includes(lower))
    );
  }, [nameSearch, clients]);

  const matches = phoneMatches;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowNameDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePhoneInput = (value: string) => {
    onPhoneChange(value);
    const digits = normalizePhone(value);
    setShowDropdown(digits.length >= 4);
  };

  const handlePhoneBlur = () => {
    if (phone) {
      onPhoneChange(formatPhoneStandard(phone));
    }
  };

  const selectClient = (client: CrmClient) => {
    onClientSelect({
      nombre: client.nombre,
      telefono: formatPhoneStandard(client.telefono || ''),
      clientId: client.id,
    });
    setShowDropdown(false);
    setShowNameDropdown(false);
    setNameSearch('');
  };

  const renderClientRow = (client: CrmClient) => (
    <button
      key={client.id}
      type="button"
      onMouseDown={(e) => { e.preventDefault(); selectClient(client); }}
      className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
        <User className="h-4 w-4 text-indigo-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-800 truncate">{client.nombre}</p>
        {client.razon_social && (
          <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
            <Building2 className="h-3 w-3 flex-shrink-0" /> {client.razon_social}
          </p>
        )}
        <p className="text-[10px] text-slate-400">
          {client.telefono ? formatPhoneStandard(client.telefono) : 'Sin teléfono'}
        </p>
      </div>
    </button>
  );

  return (
    <div ref={containerRef} className={`space-y-3 ${className}`}>
      {/* Phone field with matching */}
      {showPhoneField && (
        <div className="relative">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Phone className="h-3 w-3" /> Teléfono
          </label>
          <div className="relative">
            <input
              type="tel"
              value={phone}
              onChange={e => handlePhoneInput(e.target.value)}
              onFocus={() => normalizePhone(phone).length >= 4 && setShowDropdown(true)}
              onBlur={handlePhoneBlur}
              className="crm-input mt-1"
              placeholder="Ej: 11 2345-6789"
            />
            {matches.length > 0 && normalizePhone(phone).length >= 4 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 mt-0.5">
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  {matches.length} coincidencia{matches.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {showDropdown && matches.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Search className="h-3 w-3" /> Clientes que coinciden (últimos 4 dígitos)
                </p>
              </div>
              {matches.map(renderClientRow)}
            </div>
          )}
        </div>
      )}

      {/* Client name field with search by name + razon_social */}
      {showNameField && (
        <div className="relative">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <User className="h-3 w-3" /> Cliente
          </label>
          <input
            value={clientName}
            onChange={e => {
              onClientNameChange?.(e.target.value);
              setNameSearch(e.target.value);
              setShowNameDropdown(e.target.value.length >= 2);
            }}
            onFocus={() => clientName.length >= 2 && setShowNameDropdown(true)}
            className="crm-input mt-1"
            placeholder="Buscar por nombre o razón social..."
            required
          />
          {showNameDropdown && nameMatches.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Search className="h-3 w-3" /> Clientes registrados
                </p>
              </div>
              {nameMatches.map(renderClientRow)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
