import { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Database } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CrmTransaction } from '@/lib/crm-types';

interface ExcelImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (transactions: Partial<CrmTransaction>[]) => void;
}

// Map ALL known column names (camelCase from LaserBeam JSON, snake_case, Spanish, English)
const COLUMN_MAP: Record<string, string> = {
  // Direct field names from LaserBeam data.json (camelCase)
  'fecha': 'fecha',
  'tipo': 'tipo',
  'cuenta': 'cuenta',
  'imputable': 'imputable',
  'sku': 'sku',
  'total': 'total',
  'concepto': 'concepto',
  'estado': 'estado',
  'mediopago': 'medio_pago',
  'unidades': 'unidades',
  'cliente': 'cliente',
  'vendedor': 'vendedor',
  'detalle': 'detalle',
  'proveedor': 'proveedor',
  'numeroorden': 'numero_orden',
  'fechaentrega': 'fecha_entrega',
  'etapa': 'etapa',
  'notasproduccion': 'notas_produccion',
  'medioenvio': 'medio_envio',
  'trackingnumber': 'tracking_number',
  'fechadespacho': 'fecha_despacho',
  'prioridad': 'prioridad',
  'items': 'items',
  // snake_case variants
  'medio_pago': 'medio_pago',
  'numero_orden': 'numero_orden',
  'fecha_entrega': 'fecha_entrega',
  'notas_produccion': 'notas_produccion',
  'medio_envio': 'medio_envio',
  'tracking_number': 'tracking_number',
  'fecha_despacho': 'fecha_despacho',
  // English / alternative names
  'date': 'fecha',
  'type': 'tipo',
  'account': 'cuenta',
  'product': 'sku',
  'amount': 'total',
  'amountnet': 'total',
  'transactionnetamount': 'total',
  'price': 'total',
  'monto': 'total',
  'montonetotransaccion': 'total',
  'importe': 'total',
  'importetotal': 'total',
  'importeneto': 'total',
  'precio': 'total',
  'status': 'estado',
  'payment': 'medio_pago',
  'units': 'unidades',
  'cantidad': 'unidades',
  'client': 'cliente',
  'customer': 'cliente',
  'celular': 'cliente',
  'telefono': 'cliente',
  'tel': 'cliente',
  'clientecelular': 'cliente',
  'celularcliente': 'cliente',
  'clientetel': 'cliente',
  'clientetelefono': 'cliente',
  'telefonocliente': 'cliente',
  'nombrecliente': 'cliente',
  'clientenombre': 'cliente',
  'nrocelular': 'cliente',
  'numerocelular': 'cliente',
  'numerotelefono': 'cliente',
  'whatsapp': 'cliente',
  'celularwhatsapp': 'cliente',
  'seller': 'vendedor',
  'detail': 'detalle',
  'description': 'detalle',
  'descripcion': 'detalle',
  'supplier': 'proveedor',
  'order': 'numero_orden',
  'ot': 'numero_orden',
  'delivery': 'fecha_entrega',
  'stage': 'etapa',
  'notas': 'notas_produccion',
  'notes': 'notas_produccion',
  'nombre': 'sku', // fallback
  'producto': 'sku',
  'facturacion': '_facturacion', // ignored but recognized
  'id': '_id', // original id, not used
};

function normalizeColumn(col: string): string {
  // Remove BOM, accents and non alphanumeric symbols
  const cleaned = col
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');

  const direct = COLUMN_MAP[cleaned];
  if (direct) return direct;

  // Heuristic matching for non-standard headers
  if (/(cliente|customer|celular|telefono|whatsapp|phone|nrocel|numerocel)/.test(cleaned)) return 'cliente';
  if (/(monto|importe|amount|precio|total|neto)/.test(cleaned)) return 'total';
  if (/(vendedor|seller)/.test(cleaned)) return 'vendedor';
  if (/(detalle|descripcion|description)/.test(cleaned)) return 'detalle';
  if (/(proveedor|supplier)/.test(cleaned)) return 'proveedor';
  if (/(fecha|date)/.test(cleaned)) return 'fecha';

  return '';
}

function parseDate(val: string): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  const s = String(val).split(' ')[0].trim();
  const parts = s.split(/[-/]/);
  if (parts.length === 3) {
    const v0 = parseInt(parts[0]);
    const v1 = parseInt(parts[1]);
    const v2 = parseInt(parts[2]);

    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }

    // Source compatibility: MM/DD/YYYY and DD/MM/YYYY
    const year = v2 < 100 ? 2000 + v2 : v2;
    let d: number;
    let m: number;

    if (v0 > 12) {
      d = v0;
      m = v1;
    } else if (v1 > 12) {
      m = v0;
      d = v1;
    } else {
      // Ambiguous: data source stores as month/day/year
      m = v0;
      d = v1;
    }

    return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return s;
}

function parseAmount(val: string | number): number {
  if (val === null || val === undefined) return 0;

  const raw = String(val).trim().replace(/[$\s]/g, '');
  if (!raw) return 0;

  const isNegative = raw.startsWith('-') || (raw.startsWith('(') && raw.endsWith(')'));
  const unsigned = raw.replace(/[()\-+]/g, '');

  const lastComma = unsigned.lastIndexOf(',');
  const lastDot = unsigned.lastIndexOf('.');
  let normalized = unsigned;

  // Both separators present -> last one is decimal separator
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // 1.234,56
      normalized = unsigned.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56
      normalized = unsigned.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const decimalDigits = unsigned.length - lastComma - 1;
    if (decimalDigits > 0 && decimalDigits <= 2) {
      // 1234,56
      normalized = unsigned.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234
      normalized = unsigned.replace(/,/g, '');
    }
  } else if (lastDot !== -1) {
    const decimalDigits = unsigned.length - lastDot - 1;
    if (decimalDigits > 0 && decimalDigits <= 2) {
      // 1234.56
      normalized = unsigned.replace(/,/g, '');
    } else {
      // 40.425 (miles)
      normalized = unsigned.replace(/\./g, '');
    }
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return isNegative ? -parsed : parsed;
}

function parseItems(val: string): any[] | null {
  if (!val) return null;
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Not JSON
  }
  return null;
}

const CLIENT_HEADER_HINTS = /(cliente|customer|buyer|comprador|celular|telefono|whatsapp|phone|movil|negocio|empresa|razonsocial|contacto)/;
const CLIENT_STOPWORDS = /(almuerzo|nafta|pintura|traspaso|sueldo|gasto|impuesto|factura|servicio|envio|viaticos)/i;

function parseClienteValue(val: unknown): string {
  const raw = String(val ?? '').trim();
  if (!raw) return '';

  // Handles Excel/Sheets exports like ="'5491136801718" and quoted values
  const withoutFormula = raw.replace(/^=\s*(.+)$/i, '$1').trim();
  const withoutOuterQuotes = withoutFormula.replace(/^["'](.*)["']$/, '$1').trim();
  const normalized = withoutOuterQuotes.replace(/^'+/, '').trim();

  if (!normalized || /^[-–—]+$/.test(normalized) || /^n\/?a$/i.test(normalized)) return '';
  return normalized;
}

function isLikelyPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function isLikelyClientLabel(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (isLikelyPhone(v)) return true;
  if (v.length < 3 || v.length > 40) return false;
  if (!/[a-záéíóúñ]/i.test(v)) return false;
  if (CLIENT_STOPWORDS.test(v)) return false;

  const words = v.split(/\s+/).filter(Boolean);
  return words.length <= 4;
}

export default function ExcelImporter({ open, onOpenChange, onImport }: ExcelImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultInfo, setResultInfo] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResultInfo(null);
    }
  };

  const processCsv = () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setResultInfo(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          try {
            const rawData = results.data as any[];
            if (rawData.length === 0) {
              setError('El archivo está vacío o no se pudo parsear.');
              setIsProcessing(false);
              return;
            }

            const headers = Object.keys(rawData[0]);
            const columnMapping: Record<string, string> = {};
            const mappedFields: string[] = [];
            const unmappedHeaders: string[] = [];

            headers.forEach(h => {
              const normalized = normalizeColumn(h);
              if (normalized && !normalized.startsWith('_')) {
                columnMapping[h] = normalized;
                mappedFields.push(`${h} → ${normalized}`);
              } else if (normalized && normalized.startsWith('_')) {
                // Recognized but ignored
              } else {
                unmappedHeaders.push(h);
              }
            });

            const normalizeHeaderRaw = (header: string): string =>
              String(header)
                .replace(/^\uFEFF/, '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, '');

            const clienteDirectHeaders = headers.filter(h => columnMapping[h] === 'cliente');
            const clienteFallbackHeaders = headers.filter(h => {
              const rawNormalized = normalizeHeaderRaw(h);
              return CLIENT_HEADER_HINTS.test(rawNormalized);
            });

            const clienteDataCandidateHeaders = headers.filter(h => {
              // Skip known non-client mapped fields
              if (columnMapping[h] && columnMapping[h] !== 'cliente') return false;

              const sampleValues = rawData
                .slice(0, 250)
                .map(row => parseClienteValue(row[h]))
                .filter(Boolean);

              if (sampleValues.length === 0) return false;

              const score = sampleValues.reduce((acc, value) => {
                if (isLikelyPhone(value)) return acc + 3;
                if (isLikelyClientLabel(value)) return acc + 2;
                return acc - 1;
              }, 0);

              return score > 0;
            });

            const clienteHeaderCandidates = Array.from(new Set([
              ...clienteDirectHeaders,
              ...clienteFallbackHeaders,
              ...clienteDataCandidateHeaders,
            ]));

            console.log('Column mapping:', columnMapping);
            console.log('Unmapped headers:', unmappedHeaders);
            console.log('Cliente header candidates:', clienteHeaderCandidates);

            if (!Object.values(columnMapping).includes('tipo') && !Object.values(columnMapping).includes('total')) {
              setError(`No se reconocieron columnas clave. Headers encontrados: ${headers.slice(0, 10).join(', ')}. Se necesita al menos "tipo" o "total".`);
              setIsProcessing(false);
              return;
            }

            const mapped: Partial<CrmTransaction>[] = rawData
              .filter(row => {
                // Skip completely empty rows
                const vals = Object.values(row).filter(v => v && String(v).trim());
                return vals.length > 0;
              })
              .map((row) => {
                const get = (field: string): string => {
                  const cols = headers.filter(h => columnMapping[h] === field);
                  if (cols.length === 0) return '';

                  for (const col of cols) {
                    const value = String(row[col] ?? '').trim();
                    if (value) return value;
                  }

                  return String(row[cols[0]] ?? '').trim();
                };

                const getCliente = (): string => {
                  // 1) Direct mapping by canonical field
                  const directCliente = parseClienteValue(get('cliente'));
                  if (directCliente) return directCliente;

                  // 2) Header-hint + data-profile candidates
                  for (const col of clienteHeaderCandidates) {
                    const fallbackValue = parseClienteValue(row[col]);
                    if (!fallbackValue) continue;
                    if (isLikelyClientLabel(fallbackValue) || isLikelyPhone(fallbackValue)) return fallbackValue;
                  }

                  // 3) Last resort: any phone-like value in row
                  for (const col of headers) {
                    const anyValue = parseClienteValue(row[col]);
                    if (anyValue && isLikelyPhone(anyValue)) return anyValue;
                  }

                  return '';
                };

                const tipoRaw = get('tipo');
                const totalRaw = get('total');
                const totalNum = parseAmount(totalRaw);

                // Determine tipo
                let tipo: 'Ingreso' | 'Egreso' = 'Ingreso';
                if (tipoRaw === 'Ingreso' || tipoRaw === 'Egreso') {
                  tipo = tipoRaw;
                } else if (totalNum < 0) {
                  tipo = 'Egreso';
                }

                // Parse concepto - validate against allowed values
                const conceptoRaw = get('concepto');
                const concepto = (['Seña', 'Saldo', 'Total'].includes(conceptoRaw) ? conceptoRaw : 'Total') as 'Seña' | 'Saldo' | 'Total';

                // Parse estado
                const estadoRaw = get('estado');
                let estado: 'Pendiente' | 'Completado' | 'Cancelado' = 'Completado';
                if (estadoRaw === 'Pendiente' || estadoRaw === 'Completado' || estadoRaw === 'Cancelado') {
                  estado = estadoRaw;
                } else if (estadoRaw?.toLowerCase().includes('pagado') || estadoRaw?.toLowerCase().includes('completo')) {
                  estado = 'Completado';
                }

                // Parse etapa - smart assignment based on concepto
                const etapaRaw = get('etapa');
                const validEtapas = ['Diseño Solicitado', 'Pedido Potencial', 'Pedido Confirmado', 'Máquina/Producción', 'Logística', 'Completado'];
                let etapa: string | null = null;
                if (validEtapas.includes(etapaRaw)) {
                  etapa = etapaRaw;
                } else if (tipo === 'Ingreso') {
                  // Total → Completado, Seña → Pedido Confirmado (will be resolved later)
                  etapa = concepto === 'Total' ? 'Completado' : 'Pedido Confirmado';
                }

                // Parse items
                const itemsCol = headers.find(h => columnMapping[h] === 'items');
                const itemsVal = itemsCol ? String(row[itemsCol] || '') : '';
                const items = parseItems(itemsVal);

                return {
                  fecha: parseDate(get('fecha')),
                  tipo,
                  cuenta: get('cuenta') || '',
                  imputable: get('imputable') || '',
                  sku: get('sku') || 'VARIOS',
                  total: Math.abs(totalNum),
                  concepto,
                  estado,
                  medio_pago: get('medio_pago') || '',
                  unidades: parseInt(get('unidades')) || 1,
                  cliente: getCliente(),
                  vendedor: get('vendedor') || '',
                  detalle: get('detalle') || '',
                  proveedor: get('proveedor') || '',
                  numero_orden: get('numero_orden') || '',
                  fecha_entrega: get('fecha_entrega') || null,
                  etapa: etapa as any,
                  notas_produccion: get('notas_produccion') || '',
                  medio_envio: get('medio_envio') || '',
                  tracking_number: get('tracking_number') || '',
                  fecha_despacho: get('fecha_despacho') || null,
                  items: items || [],
                } as Partial<CrmTransaction>;
              });

            if (mapped.length === 0) {
              setError('No se encontraron filas válidas en el archivo.');
              setIsProcessing(false);
              return;
            }

            // Resolve Seña etapas: if same client has a Total → mark Seña as Completado
            const clientsWithTotal = new Set(
              mapped.filter(t => t.tipo === 'Ingreso' && t.concepto === 'Total').map(t => t.cliente)
            );
            mapped.forEach(t => {
              if (t.tipo === 'Ingreso' && t.concepto === 'Seña' && t.etapa === 'Pedido Confirmado' && clientsWithTotal.has(t.cliente)) {
                t.etapa = 'Completado' as any;
              }
            });

            setResultInfo(`${mapped.length} movimientos encontrados. Importando...`);
            onImport(mapped);
            setFile(null);
            setIsProcessing(false);
          } catch (err) {
            console.error('Import error:', err);
            setError('Error al procesar el archivo. Verifique el formato.');
            setIsProcessing(false);
          }
        },
        error: (err: any) => {
          setError(`Error de parseo: ${err.message}`);
          setIsProcessing(false);
        }
      });
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-800 font-black flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" /> Importar Base de Datos
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-400 -mt-2">
          Importá tu base de transacciones desde el Excel de LaserBeam exportado como CSV
        </p>

        <div className="space-y-4">
          {/* Expected columns */}
          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Columnas reconocidas automáticamente</p>
            <p className="text-[10px] text-indigo-500 leading-relaxed">
              fecha, tipo, cuenta, imputable, sku, total, concepto, estado, medioPago, unidades, cliente, vendedor, detalle, proveedor, numeroOrden, fechaEntrega, etapa, notasProduccion, items, medioEnvio, trackingNumber
            </p>
          </div>

          {/* File input */}
          <div
            onClick={() => document.getElementById('excel-file-input')?.click()}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
          >
            <input
              id="excel-file-input"
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-indigo-500" />
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-700">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-500">Seleccionar archivo CSV</p>
                <p className="text-xs text-slate-400 mt-1">Exportá la hoja "Datos" de tu Excel como CSV</p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resultInfo && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {resultInfo}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={processCsv}
              disabled={!file || isProcessing}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Importar Datos
            </button>
          </div>

          <p className="text-[10px] text-slate-400 text-center">
            Compatible con el Excel "Administracion LaserBeam" exportado como CSV desde Google Sheets
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
