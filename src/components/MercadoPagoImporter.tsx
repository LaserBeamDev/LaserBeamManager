import { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Wifi, File } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CrmTransaction } from '@/lib/crm-types';
import { useMercadoPago } from '@/hooks/useMercadoPago';

interface MercadoPagoImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (transactions: Partial<CrmTransaction>[]) => void;
  paymentMethods: string[];
}

const MP_KEYWORDS = [
  'facebook', 'micorreo', 'zilver sa', 'mercado libre', 'mercadolibre',
  'tiendanube', 'creativefabrica', 'claro deb aut', 'movistar', 'openai', 'chatgpt',
  'arca', 'trello', 'andreani',
];

function classifyDescription(descLower: string) {
  let cuenta = 'Costos Operativos', imputable = 'Otros Egresos', proveedor = 'Varios';
  if (descLower.includes('facebook')) { cuenta = 'Costos Operativos'; imputable = 'Publicidad'; proveedor = 'Facebook'; }
  else if (descLower.includes('micorreo')) { cuenta = 'Costos Operativos'; imputable = 'Logística'; proveedor = 'Correo/Envios'; }
  else if (descLower.includes('zilver sa')) { cuenta = 'Servicios'; imputable = 'Servicios/Suscrip.'; proveedor = 'Canva'; }
  else if (descLower.includes('mercado libre') || descLower.includes('mercadolibre')) { cuenta = 'Impuestos'; imputable = 'Tienda Online'; proveedor = 'Mercado Libre'; }
  else if (descLower.includes('tiendanube')) { cuenta = 'Servicios'; imputable = 'Tienda Online'; proveedor = 'TiendaNube'; }
  else if (descLower.includes('creativefabrica')) { cuenta = 'Servicios'; imputable = 'Servicios/Suscrip.'; proveedor = 'Creative Fabrica'; }
  else if (descLower.includes('claro deb aut')) { cuenta = 'Servicios'; imputable = 'Servicios/Suscrip.'; proveedor = 'Claro Telefonia'; }
  else if (descLower.includes('movistar')) { cuenta = 'Servicios'; imputable = 'Servicios/Suscrip.'; proveedor = 'Movistar Telefonia'; }
  else if (descLower.includes('openai') || descLower.includes('chatgpt')) { cuenta = 'Servicios'; imputable = 'Servicios/Suscrip.'; proveedor = 'ChatGPT'; }
  else if (descLower.includes('arca')) { cuenta = 'Impuestos'; imputable = 'Monotributo Julian'; proveedor = 'ARCA'; }
  else if (descLower.includes('trello')) { cuenta = 'Servicios'; imputable = 'Servicios/Suscrip.'; proveedor = 'Trello'; }
  else if (descLower.includes('andreani')) { cuenta = 'Costos Operativos'; imputable = 'Logística'; proveedor = 'Andreani'; }
  return { cuenta, imputable, proveedor };
}

function parseAmount(rawAmount: string): number {
  const amountStr = String(rawAmount).trim();
  if (amountStr.includes(',') && amountStr.includes('.')) {
    return parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
  } else if (amountStr.includes(',')) {
    const parts = amountStr.split(',');
    return parts[parts.length - 1].length === 2
      ? parseFloat(amountStr.replace(',', '.'))
      : parseFloat(amountStr.replace(',', ''));
  }
  return parseFloat(amountStr);
}

function parseDateStr(raw: string): string {
  const dateStr = raw.split(' ')[0].trim();
  const parts = dateStr.split(/[-/]/);
  if (parts.length !== 3) return dateStr;
  if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
  return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

export default function MercadoPagoImporter({ open, onOpenChange, onImport, paymentMethods }: MercadoPagoImporterProps) {
  const { accounts, getMovements } = useMercadoPago();
  const [mode, setMode] = useState<'csv' | 'api'>('api');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState(
    paymentMethods.find(m => m.includes('Mercado Pago')) || paymentMethods[0] || ''
  );
  const [selectedMpAccount, setSelectedMpAccount] = useState(accounts[0]?.id || '');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Update selectedMpAccount when accounts load
  if (!selectedMpAccount && accounts.length > 0) {
    setSelectedMpAccount(accounts[0].id);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) { setFile(e.target.files[0]); setError(null); }
  };

  const processApiImport = async () => {
    if (!selectedMpAccount) return;
    setIsProcessing(true);
    setError(null);
    try {
      const data = await getMovements(selectedMpAccount, dateFrom, dateTo);
      const results = data.results || data || [];
      
      const accountName = accounts.find(a => a.id === selectedMpAccount)?.nombre || selectedAccount;

      const mapped: Partial<CrmTransaction>[] = results
        .filter((mov: any) => {
          const desc = (mov.description || mov.detail || '').toLowerCase();
          return MP_KEYWORDS.some(k => desc.includes(k));
        })
        .map((mov: any) => {
          const amount = mov.net_amount || mov.amount || 0;
          const isIncome = amount > 0;
          const description = mov.description || mov.detail || '';
          const { cuenta, imputable, proveedor } = classifyDescription(description.toLowerCase());
          const rawDate = mov.date_created || mov.release_date || '';
          const formattedDate = rawDate ? rawDate.split('T')[0] : new Date().toISOString().split('T')[0];

          return {
            fecha: formattedDate,
            tipo: isIncome ? 'Ingreso' : 'Egreso',
            cuenta,
            imputable,
            total: Math.abs(amount),
            concepto: 'Total' as const,
            estado: 'Completado' as const,
            medio_pago: accountName,
            cliente: '',
            proveedor,
            vendedor: 'Julian',
            detalle: description,
            unidades: 1,
            sku: 'VARIOS',
            numero_orden: '',
            etapa: isIncome ? 'Completado' as const : null,
          } as Partial<CrmTransaction>;
        });

      if (mapped.length === 0) {
        setError('No se encontraron movimientos que coincidan con las categorías configuradas en el rango seleccionado.');
        setIsProcessing(false);
        return;
      }

      onImport(mapped);
      setIsProcessing(false);
    } catch (err: any) {
      setError(err.message || 'Error al consultar la API de MercadoPago');
      setIsProcessing(false);
    }
  };

  const processCsv = () => {
    if (!file) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headerIndex = lines.findIndex(line =>
        (line.includes('RELEASE_DATE') || line.includes('fecha_liberacion')) &&
        (line.includes('TRANSACTION_NET_AMOUNT') || line.includes('monto_neto_transaccion'))
      );
      if (headerIndex === -1) {
        setError('No se encontró la cabecera de transacciones. Verifique que el reporte sea el correcto.');
        setIsProcessing(false);
        return;
      }

      Papa.parse(lines.slice(headerIndex).join('\n'), {
        header: true, skipEmptyLines: true, dynamicTyping: false,
        complete: (results) => {
          try {
            const mapped: Partial<CrmTransaction>[] = (results.data as any[])
              .filter(row => {
                const desc = (row.TRANSACTION_TYPE || row.tipo_transaccion || row.DESCRIPTION || row.descripcion || '').toLowerCase();
                return (row.RELEASE_DATE || row.fecha_liberacion) &&
                  (row.TRANSACTION_NET_AMOUNT || row.monto_neto_transaccion) &&
                  MP_KEYWORDS.some(k => desc.includes(k));
              })
              .map(row => {
                const amount = parseAmount(row.TRANSACTION_NET_AMOUNT || row.monto_neto_transaccion || '0');
                const isIncome = amount > 0;
                const description = row.TRANSACTION_TYPE || row.tipo_transaccion || row.DESCRIPTION || row.descripcion || '';
                const { cuenta, imputable, proveedor } = classifyDescription(description.toLowerCase());
                const formattedDate = parseDateStr(row.RELEASE_DATE || row.fecha_liberacion || '');

                return {
                  fecha: formattedDate,
                  tipo: isIncome ? 'Ingreso' : 'Egreso',
                  cuenta, imputable,
                  total: Math.abs(amount),
                  concepto: 'Total' as const,
                  estado: 'Completado' as const,
                  medio_pago: selectedAccount,
                  cliente: '', proveedor,
                  vendedor: 'Julian',
                  detalle: description,
                  unidades: 1, sku: 'VARIOS',
                  numero_orden: '',
                  etapa: isIncome ? 'Completado' as const : null,
                } as Partial<CrmTransaction>;
              });

            onImport(mapped);
            setFile(null);
            setIsProcessing(false);
          } catch {
            setError('Error al procesar el archivo.');
            setIsProcessing(false);
          }
        },
        error: (err: any) => { setError(`Error: ${err.message}`); setIsProcessing(false); },
      });
    };
    reader.readAsText(file);
  };

  const hasApiAccounts = accounts.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground font-black">Importar MercadoPago</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">Importá movimientos desde la API o un archivo CSV</p>

        <div className="space-y-4">
          {/* Mode selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('api')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'api' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <Wifi className="h-4 w-4" /> API en Vivo
            </button>
            <button
              onClick={() => setMode('csv')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'csv' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <File className="h-4 w-4" /> Archivo CSV
            </button>
          </div>

          {mode === 'api' ? (
            <>
              {!hasApiAccounts ? (
                <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center">
                  <Wifi className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm font-bold text-muted-foreground">No hay cuentas conectadas</p>
                  <p className="text-xs text-muted-foreground mt-1">Configurá tus cuentas en Configuración → MercadoPago</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cuenta MercadoPago</label>
                    <select
                      value={selectedMpAccount}
                      onChange={e => setSelectedMpAccount(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-input bg-background text-foreground rounded-xl text-sm"
                    >
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Desde</label>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-input bg-background text-foreground rounded-xl text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hasta</label>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-input bg-background text-foreground rounded-xl text-sm" />
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cuenta de Destino</label>
                <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-input bg-background text-foreground rounded-xl text-sm">
                  {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div
                onClick={() => document.getElementById('mp-file-input')?.click()}
                className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                <input id="mp-file-input" type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm font-bold text-muted-foreground">Seleccionar reporte CSV</p>
                    <p className="text-xs text-muted-foreground mt-1">Arrastra el archivo o haz clic para buscar</p>
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl text-sm font-bold hover:bg-secondary/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={mode === 'api' ? processApiImport : processCsv}
              disabled={mode === 'api' ? (!hasApiAccounts || isProcessing) : (!file || isProcessing)}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {mode === 'api' ? 'Importar desde API' : 'Procesar CSV'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
