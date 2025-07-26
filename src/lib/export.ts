"use client";

import type { Product } from "@/types/product";

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCsv(products: Product[]) {
  if (products.length === 0) return;

  const headers = ["Description", "Price", "Category"];
  const rows = products.map(p => [
    `"${p.description.replace(/"/g, '""')}"`,
    p.price,
    `"${p.category.replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadFile(blob, "products.csv");
}

export function exportToJson(products: Product[]) {
  if (products.length === 0) return;

  const dataToExport = products.map(({ id, aiCategory, aiConfidence, status, ...rest }) => rest);
  const jsonContent = JSON.stringify(dataToExport, null, 2);

  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  downloadFile(blob, "products.json");
}
