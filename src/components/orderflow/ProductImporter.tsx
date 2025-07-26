"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LoaderCircle } from "lucide-react";

interface ProductImporterProps {
  rawText: string;
  setRawText: (text: string) => void;
  onProcess: () => void;
  isLoading: boolean;
}

export function ProductImporter({ rawText, setRawText, onProcess, isLoading }: ProductImporterProps) {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Smart Product Import</CardTitle>
        <CardDescription>
          Paste your product list below. Each line should have a description and a price.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="e.g. 2x Organic Avocados - 4.99"
          className="min-h-[200px] text-base"
          aria-label="Product list input"
        />
      </CardContent>
      <CardFooter>
        <Button onClick={onProcess} disabled={isLoading || !rawText.trim()} className="w-full" size="lg">
          {isLoading ? (
            <>
              <LoaderCircle className="animate-spin mr-2" />
              Processing...
            </>
          ) : (
            "Categorize Products"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
