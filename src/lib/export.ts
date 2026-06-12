import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Descarga en web o guarda+comparte en el APK (Capacitor)
const guardar = async (nombre: string, base64: string, mime: string) => {
  if (Capacitor.isNativePlatform()) {
    const res = await Filesystem.writeFile({
      path: nombre,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({ title: nombre, url: res.uri });
  } else {
    const a = document.createElement('a');
    a.href = `data:${mime};base64,${base64}`;
    a.download = nombre;
    a.click();
  }
};

export type Columna = { header: string; key: string; align?: 'left' | 'right' };

export async function exportarPDF(opts: {
  nombre: string;
  titulo: string;
  subtitulo?: string;
  columnas: Columna[];
  filas: Record<string, any>[];
  pie?: string[];
}) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(opts.titulo, 14, 18);
  if (opts.subtitulo) { doc.setFontSize(10); doc.setTextColor(120); doc.text(opts.subtitulo, 14, 25); }

  autoTable(doc, {
    startY: opts.subtitulo ? 30 : 24,
    head: [opts.columnas.map((c) => c.header)],
    body: opts.filas.map((f) => opts.columnas.map((c) => String(f[c.key] ?? ''))),
    foot: opts.pie ? [opts.pie] : undefined,
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [44, 62, 80], textColor: 255 },
    footStyles: { fillColor: [236, 240, 241], textColor: 30, fontStyle: 'bold' },
    columnStyles: Object.fromEntries(
      opts.columnas.map((c, i) => [i, { halign: c.align ?? 'left' }])
    ),
  });

  const base64 = doc.output('datauristring').split(',')[1];
  if (Capacitor.isNativePlatform()) {
    await guardar(`${opts.nombre}.pdf`, base64, 'application/pdf');
  } else {
    doc.save(`${opts.nombre}.pdf`);
  }
}

export async function exportarExcel(opts: {
  nombre: string;
  columnas: Columna[];
  filas: Record<string, any>[];
}) {
  const data = opts.filas.map((f) => {
    const o: Record<string, any> = {};
    opts.columnas.forEach((c) => { o[c.header] = f[c.key]; });
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

  if (Capacitor.isNativePlatform()) {
    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    await guardar(`${opts.nombre}.xlsx`, base64,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } else {
    XLSX.writeFile(wb, `${opts.nombre}.xlsx`);
  }
}
