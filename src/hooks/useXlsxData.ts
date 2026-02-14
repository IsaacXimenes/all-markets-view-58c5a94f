import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface UseXlsxDataOptions {
  url: string;
  headerMap?: Record<string, string>;
  dateColumns?: string[];
}

interface CacheEntry {
  rawData: Record<string, any>[];
  rawHeaders: string[];
}

const xlsxCache = new Map<string, CacheEntry>();

function formatDateValue(value: any): string {
  if (value instanceof Date && !isNaN(value.getTime())) {
    const d = value.getDate().toString().padStart(2, '0');
    const m = (value.getMonth() + 1).toString().padStart(2, '0');
    const y = value.getFullYear();
    return `${d}/${m}/${y}`;
  }
  if (typeof value === 'number' && value > 25000 && value < 60000) {
    const date = new Date((value - 25569) * 86400000);
    if (!isNaN(date.getTime())) {
      const d = date.getDate().toString().padStart(2, '0');
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    }
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1990) {
      const d = parsed.getDate().toString().padStart(2, '0');
      const m = (parsed.getMonth() + 1).toString().padStart(2, '0');
      const y = parsed.getFullYear();
      return `${d}/${m}/${y}`;
    }
  }
  return String(value ?? '');
}

export function useXlsxData<T = Record<string, string>>({ url, headerMap, dateColumns }: UseXlsxDataOptions) {
  const [data, setData] = useState<T[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndParse = async () => {
      try {
        setLoading(true);

        let rawData: Record<string, any>[];
        let rawHeaders: string[];

        if (xlsxCache.has(url)) {
          const cached = xlsxCache.get(url)!;
          rawData = cached.rawData;
          rawHeaders = cached.rawHeaders;
        } else {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

          rawData = jsonData;
          rawHeaders = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
          xlsxCache.set(url, { rawData, rawHeaders });
        }

        if (rawData.length > 0) {
          const mappedHeaders = headerMap
            ? rawHeaders.map(h => headerMap[h] || h)
            : rawHeaders;
          setHeaders(mappedHeaders);

          const dateSet = dateColumns ? new Set(dateColumns) : null;

          if (headerMap) {
            const mappedData = rawData.map(row => {
              const newRow: Record<string, any> = {};
              rawHeaders.forEach(key => {
                const newKey = headerMap[key] || key;
                const val = row[key] ?? '';
                newRow[newKey] = dateSet && dateSet.has(newKey) ? formatDateValue(val) : val;
              });
              return newRow as T;
            });
            setData(mappedData);
          } else {
            if (dateSet) {
              const mappedData = rawData.map(row => {
                const newRow: Record<string, any> = {};
                rawHeaders.forEach(key => {
                  newRow[key] = dateSet.has(key) ? formatDateValue(row[key]) : row[key];
                });
                return newRow as T;
              });
              setData(mappedData);
            } else {
              setData(rawData as T[]);
            }
          }
        }

        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados do arquivo.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndParse();
  }, [url]);

  return { data, headers, loading, error };
}
