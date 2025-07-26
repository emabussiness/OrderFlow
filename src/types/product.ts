export type Product = {
  id: string;
  description: string;
  price: number;
  aiCategory?: string;
  aiConfidence?: number;
  category: string;
  status: 'processed' | 'error' | 'processing';
};
