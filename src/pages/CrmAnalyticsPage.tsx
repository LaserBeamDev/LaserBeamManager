import { useState, useRef, useCallback, useEffect } from 'react';
import { useCrm } from '@/hooks/useCrm';
import { Bot, Send, Loader2, TrendingUp, BarChart3, AlertTriangle, Sparkles, Download } from 'lucide-react';
import { downloadAnalyticsReport } from '@/lib/pdf-report';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  { icon: <TrendingUp className="h-4 w-4" />, label: 'Proyección de ventas', prompt: 'Hacé una proyección de ventas para los próximos 30 días basándote en los datos históricos.' },
  { icon: <BarChart3 className="h-4 w-4" />, label: 'Resumen del mes', prompt: 'Dame un resumen completo del mes actual: ingresos, egresos, utilidad, productos más vendidos y clientes principales.' },
  { icon: <AlertTriangle className="h-4 w-4" />, label: 'Alertas y anomalías', prompt: 'Analizá los datos y decime si hay alguna anomalía, tendencia preocupante o indicador que necesite atención.' },
  { icon: <Sparkles className="h-4 w-4" />, label: 'Análisis de rentabilidad', prompt: 'Analizá la rentabilidad por producto/SKU y decime cuáles son los más y menos rentables.' },
];

export default function CrmAnalyticsPage() {
  const { transactions } = useCrm();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Prepare transaction summary (last 500 to avoid token limits)
    const txSummary = transactions.slice(0, 500).map(t => ({
      fecha: t.fecha, tipo: t.tipo, total: t.total, cliente: t.cliente,
      imputable: t.imputable, medio_pago: t.medio_pago, sku: t.sku,
      unidades: t.unidades, estado: t.estado, etapa: t.etapa,
      concepto: t.concepto, detalle: t.detalle, total_orden: t.total_orden,
    }));

    let assistantSoFar = '';
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-analytics`;

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ transactions: txSummary, question: text.trim() }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Error de conexión' }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error('Sin respuesta');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [transactions, isLoading]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Asistente de Análisis</h1>
          <p className="text-xs text-muted-foreground">Proyecciones, alertas y análisis de datos en tiempo real</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground mb-1">¿Qué querés analizar?</h2>
              <p className="text-sm text-muted-foreground">Preguntame sobre ventas, proyecciones, alertas o cualquier métrica.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {SUGGESTIONS.map(s => (
                <button
                  key={s.label}
                  onClick={() => sendMessage(s.prompt)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">{s.icon}</div>
                  <span className="text-sm font-medium text-foreground">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          // Find the user question that preceded this assistant message
          const precedingQuestion = m.role === 'assistant'
            ? messages.slice(0, i).reverse().find(msg => msg.role === 'user')?.content || ''
            : '';

          return (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${m.role === 'user' ? '' : 'space-y-2'}`}>
                <div className={`rounded-2xl px-4 py-3 ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 border border-border text-foreground'
                }`}>
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatMarkdown(m.content) }} />
                  ) : (
                    <p className="text-sm">{m.content}</p>
                  )}
                </div>
                {m.role === 'assistant' && !isLoading && m.content.length > 50 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
                    onClick={() => downloadAnalyticsReport(precedingQuestion, m.content)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar PDF
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-muted/50 border border-border rounded-2xl px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Preguntá sobre tus datos..."
            className="min-h-[44px] max-h-[120px] resize-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
            }}
          />
          <Button size="icon" onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()} className="shrink-0 h-11 w-11">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatMarkdown(text: string): string {
  return text
    .replace(/### (.+)/g, '<h3 class="text-base font-bold mt-3 mb-1">$1</h3>')
    .replace(/## (.+)/g, '<h2 class="text-lg font-bold mt-4 mb-2">$1</h2>')
    .replace(/# (.+)/g, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, '<br/>');
}
