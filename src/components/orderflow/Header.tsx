"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileJson, FileText, ShoppingCart } from "lucide-react";

interface HeaderProps {
  onExport: (format: 'csv' | 'json') => void;
}

export function Header({ onExport }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b">
      <div className="container mx-auto flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold font-headline text-foreground">
            OrderFlow
          </h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Download className="mr-2" />
              Export Data
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport('csv')}>
              <FileText className="mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('json')}>
              <FileJson className="mr-2" />
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
