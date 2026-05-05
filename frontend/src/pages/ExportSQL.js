import { useState } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Download, Copy, FileCode, Check, Loader2, Database } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function ExportSQL() {
  const [sql, setSql] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchSQL = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/export/oracle-sql`);
      setSql(response.data.sql);
      toast.success('Script Oracle SQL generado correctamente');
    } catch (error) {
      toast.error('Error al generar script SQL');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      toast.success('Script copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Error al copiar');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'panaderia_holandesa_oracle.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Archivo descargado');
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="export-sql-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Exportar Oracle SQL
        </h1>
        <p className="text-muted-foreground mt-1">
          Genera scripts DDL compatibles con Oracle Database
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <Database className="w-5 h-5 text-accent" />
            Acerca de los Scripts Oracle
          </CardTitle>
          <CardDescription>
            Los scripts generados incluyen:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <span>Tablas con sintaxis Oracle SQL (VARCHAR2, NUMBER, GENERATED AS IDENTITY)</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <span>Constraints de integridad referencial (Foreign Keys)</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <span>Índices para búsqueda optimizada</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <span>Vistas de reportes (hoja de ruta, tiendas por vendedor)</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <span>Procedimiento almacenado para consulta de rutas</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <span>Datos iniciales (vendedores Michel, Angie, Julian)</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Generate Button */}
      {!sql && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileCode className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">Generar Script Oracle SQL</h3>
            <p className="text-muted-foreground mb-6">
              Haz clic en el botón para generar el script DDL completo
            </p>
            <Button 
              onClick={fetchSQL} 
              disabled={loading}
              className="gap-2"
              data-testid="generate-sql-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileCode className="w-4 h-4" />
                  Generar Script
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* SQL Output */}
      {sql && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
                Script Oracle SQL
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCopy}
                  className="gap-2"
                  data-testid="copy-sql-btn"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDownload}
                  className="gap-2"
                  data-testid="download-sql-btn"
                >
                  <Download className="w-4 h-4" />
                  Descargar .sql
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={sql}
              readOnly
              className="font-mono text-xs h-[500px] bg-muted/50"
              data-testid="sql-output"
            />
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
            Instrucciones de Uso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">1. Descargar el Script</h4>
            <p className="text-muted-foreground">
              Genera y descarga el archivo .sql con el botón correspondiente.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">2. Conectar a Oracle Database</h4>
            <p className="text-muted-foreground">
              Usa SQL*Plus, SQL Developer o tu cliente Oracle preferido para conectarte al servidor.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">3. Ejecutar el Script</h4>
            <p className="text-muted-foreground">
              Ejecuta el script completo. Las tablas existentes serán eliminadas y recreadas.
            </p>
            <pre className="mt-2 p-3 bg-muted rounded-lg font-mono text-xs">
              @panaderia_holandesa_oracle.sql
            </pre>
          </div>
          <div>
            <h4 className="font-medium mb-2">4. Verificar la Instalación</h4>
            <p className="text-muted-foreground">
              Consulta las tablas creadas:
            </p>
            <pre className="mt-2 p-3 bg-muted rounded-lg font-mono text-xs">
              SELECT table_name FROM user_tables;
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
