"use client";

import type { Product } from "@/types/product";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FlaskConical, AlertTriangle, Trash2, LoaderCircle } from "lucide-react";

interface ProductTableProps {
  products: Product[];
  onProductUpdate: (product: Product) => void;
  onProductDelete: (productId: string) => void;
}

export function ProductTable({ products, onProductUpdate, onProductDelete }: ProductTableProps) {
  const totalItems = products.length;
  const totalPrice = products.reduce((sum, p) => sum + p.price, 0);

  const handleCategoryChange = (productId: string, newCategory: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      onProductUpdate({ ...product, category: newCategory });
    }
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return "bg-green-500";
    if (confidence > 0.5) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Dynamic Preview</CardTitle>
        <CardDescription>
          Review your items below. AI suggestions can be overridden.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-2/5">Product Description</TableHead>
                <TableHead>AI Suggestion</TableHead>
                <TableHead>Final Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length > 0 ? (
                products.map((product) => (
                  <TableRow
                    key={product.id}
                    className={cn(product.status === 'error' && 'bg-destructive/10')}
                  >
                    <TableCell className="font-medium">{product.description}</TableCell>
                    <TableCell>
                      {product.status === 'processing' && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <LoaderCircle className="h-4 w-4 animate-spin"/> <span>Processing...</span>
                        </div>
                      )}
                      {product.status === 'error' && (
                         <div className="flex items-center gap-2 text-destructive">
                          <AlertTriangle className="h-4 w-4" /> <span>Error</span>
                        </div>
                      )}
                      {product.status === 'processed' && product.aiCategory && (
                        <div className="flex items-center gap-2">
                          <FlaskConical className="h-4 w-4 text-primary shrink-0" />
                          <div className="flex-grow">
                            <span>{product.aiCategory}</span>
                            <Progress value={(product.aiConfidence || 0) * 100} indicatorClassName={getConfidenceColor(product.aiConfidence || 0)} className="h-1.5 mt-1" />
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={product.category}
                        onChange={(e) => handleCategoryChange(product.id, e.target.value)}
                        className="h-8"
                        aria-label={`Category for ${product.description}`}
                        disabled={product.status !== 'processed'}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono">${product.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onProductDelete(product.id)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No products imported yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end items-center gap-4 text-right bg-muted/50 p-4 rounded-b-lg">
          <Badge variant="secondary">Total Items: {totalItems}</Badge>
          <div className="text-lg font-bold font-headline">
              Total: <span className="font-mono">${totalPrice.toFixed(2)}</span>
          </div>
      </CardFooter>
    </Card>
  );
}
