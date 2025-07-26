'use server';

/**
 * @fileOverview A product category suggestion AI agent.
 *
 * - suggestProductCategory - A function that suggests a product category.
 * - SuggestProductCategoryInput - The input type for the suggestProductCategory function.
 * - SuggestProductCategoryOutput - The return type for the suggestProductCategory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestProductCategoryInputSchema = z.object({
  productDescription: z
    .string()
    .describe('The description of the product to categorize.'),
});
export type SuggestProductCategoryInput = z.infer<typeof SuggestProductCategoryInputSchema>;

const SuggestProductCategoryOutputSchema = z.object({
  category: z.string().describe('The suggested category for the product.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('The confidence level of the category suggestion (0 to 1).'),
});
export type SuggestProductCategoryOutput = z.infer<typeof SuggestProductCategoryOutputSchema>;

export async function suggestProductCategory(
  input: SuggestProductCategoryInput
): Promise<SuggestProductCategoryOutput> {
  return suggestProductCategoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestProductCategoryPrompt',
  input: {schema: SuggestProductCategoryInputSchema},
  output: {schema: SuggestProductCategoryOutputSchema},
  prompt: `You are a product categorization expert. Given the following product description, suggest a category and a confidence level (0 to 1) for the suggestion.\n\nProduct Description: {{{productDescription}}}`,
});

const suggestProductCategoryFlow = ai.defineFlow(
  {
    name: 'suggestProductCategoryFlow',
    inputSchema: SuggestProductCategoryInputSchema,
    outputSchema: SuggestProductCategoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
