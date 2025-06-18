// src/ai/flows/suggest-ansible-task.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting Ansible tasks based on a description.
 *
 * - suggestAnsibleTask - A function that suggests relevant Ansible tasks.
 * - SuggestAnsibleTaskInput - The input type for the suggestAnsibleTask function.
 * - SuggestAnsibleTaskOutput - The return type for the suggestAnsibleTask function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAnsibleTaskInputSchema = z.object({
  description: z
    .string()
    .describe('A description of the desired Ansible task, e.g., install a package or configure a service.'),
});
export type SuggestAnsibleTaskInput = z.infer<typeof SuggestAnsibleTaskInputSchema>;

const SuggestAnsibleTaskOutputSchema = z.object({
  suggestedTask: z
    .string()
    .describe('An Ansible task in YAML format that fulfills the provided description.'),
});
export type SuggestAnsibleTaskOutput = z.infer<typeof SuggestAnsibleTaskOutputSchema>;

export async function suggestAnsibleTask(input: SuggestAnsibleTaskInput): Promise<SuggestAnsibleTaskOutput> {
  return suggestAnsibleTaskFlow(input);
}

const suggestAnsibleTaskPrompt = ai.definePrompt({
  name: 'suggestAnsibleTaskPrompt',
  input: {schema: SuggestAnsibleTaskInputSchema},
  output: {schema: SuggestAnsibleTaskOutputSchema},
  prompt: `You are an AI expert in Ansible.

You will suggest an Ansible task in YAML format based on the user's description.

Description: {{{description}}}

Return a valid and complete Ansible task in YAML format that satisfies the description.  Include all necessary fields, such as the module name, and any parameters.
`,
});

const suggestAnsibleTaskFlow = ai.defineFlow(
  {
    name: 'suggestAnsibleTaskFlow',
    inputSchema: SuggestAnsibleTaskInputSchema,
    outputSchema: SuggestAnsibleTaskOutputSchema,
  },
  async input => {
    const {output} = await suggestAnsibleTaskPrompt(input);
    return output!;
  }
);
