"use client";

import { useState } from "react";
import { Header } from "@/components/orderflow/Header";
import { ProductImporter } from "@/components/orderflow/ProductImporter";
import { ProductTable } from "@/components/orderflow/ProductTable";
import { CategorySummary } from "@/components/orderflow/CategorySummary";
import type { Product } from "@/types/product";
import { suggestProductCategory } from "@/ai/flows/suggest-product-category";
import { useToast } from "@/hooks/use-toast";
import { exportToCsv, exportToJson } from "@/lib/export";

export default function Home() {
  const [rawText, setRawText] = useState(
    "1x Organic Avocados - 4.99\n2x Sourdough Bread Loaf - 5.50\n1x 5W-30 Full Synthetic Motor Oil, 5 Quart - 28.99\n1x Almond Milk, Unsweetened, 64 fl oz - 3.29\n1x Wild-caught Salmon Fillet (1lb) - 15.99\n1x Premium All-Purpose Flour (5 lb bag) - 4.50"
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleProcessText = async () => {
    setIsLoading(true);
    setProducts([]);

    const lines = rawText.trim().split("\n").filter(line => line.trim() !== "");
    
    // Create initial product objects
    const initialProducts: Product[] = lines.map((line, index) => {
      const id = `product-${Date.now()}-${index}`;
      const match = line.match(/(.+?)[\s-]*([\d.,]+)$/);
      let description = line;
      let price = 0;

      if (match) {
        description = match[1].trim();
        price = parseFloat(match[2].replace(',', '.'));
      }

      return {
        id,
        description,
        price: isNaN(price) ? 0 : price,
        aiCategory: undefined,
        aiConfidence: undefined,
        category: "Uncategorized",
        status: 'processing',
      };
    });
    setProducts(initialProducts);

    try {
      const processedProducts = await Promise.all(
        initialProducts.map(async (product) => {
          if (product.price === 0) {
            return { ...product, status: 'error' as const };
          }
          try {
            const result = await suggestProductCategory({ productDescription: product.description });
            return {
              ...product,
              aiCategory: result.category,
              aiConfidence: result.confidence,
              category: result.category,
              status: 'processed' as const,
            };
          } catch (error) {
            console.error("AI suggestion failed for:", product.description, error);
            return { ...product, status: 'error' as const };
          }
        })
      );
      setProducts(processedProducts);
    } catch (error) {
      console.error("Error processing products:", error);
      toast({
        variant: "destructive",
        title: "Processing Error",
        description: "An unexpected error occurred while processing the product list.",
      });
      setProducts(initialProducts.map(p => ({ ...p, status: 'error' })));
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductUpdate = (updatedProduct: Product) => {
    setProducts(products.map(p => (p.id === updatedProduct.id ? updatedProduct : p)));
  };

  const handleProductDelete = (productId: string) => {
    setProducts(products.filter(p => p.id !== productId));
  };
  
  const handleExport = (format: 'csv' | 'json') => {
    if (products.length === 0) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "There are no products to export.",
      });
      return;
    }
    if (format === 'csv') {
      exportToCsv(products.filter(p => p.status === 'processed'));
    } else {
      exportToJson(products.filter(p => p.status === 'processed'));
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header onExport={handleExport} />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <ProductImporter
              rawText={rawText}
              setRawText={setRawText}
              onProcess={handleProcessText}
              isLoading={isLoading}
            />
          </div>
          <div className="lg:col-span-3 space-y-8">
            <ProductTable
              products={products}
              onProductUpdate={handleProductUpdate}
              onProductDelete={handleProductDelete}
            />
            {products.length > 0 && <CategorySummary products={products} />}
          </div>
        </div>
      </main>
    </div>
  );
}
