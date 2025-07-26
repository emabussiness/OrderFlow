"use client";

import type { Product } from "@/types/product";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tag } from "lucide-react";

interface CategorySummaryProps {
  products: Product[];
}

export function CategorySummary({ products }: CategorySummaryProps) {
  const categoryTotals = products.reduce((acc, product) => {
    if (product.status !== 'processed') return acc;
    const category = product.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += product.price;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);
  
  if (sortedCategories.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Category Summary</CardTitle>
        <CardDescription>Total cost per product category.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {sortedCategories.map(([category, total]) => (
            <li key={category} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{category}</span>
              </div>
              <span className="font-mono text-base font-semibold">
                ${total.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
