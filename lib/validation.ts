import { z } from 'zod';

/**
 * Schema for the vault input form.
 * Enforces strict types and length limits.
 */
export const VaultInputSchema = z.object({
    content: z.string()
        .min(1, 'Content is required')
        .max(10000, 'Content must be under 10,000 characters'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be under 128 characters'),
});

/**
 * Schema for decryption input.
 */
export const DecryptSchema = z.object({
    ciphertext: z.string().min(1, 'Ciphertext is required'),
    password: z.string().min(1, 'Password is required'),
});

export type VaultInput = z.infer<typeof VaultInputSchema>;
export type DecryptInput = z.infer<typeof DecryptSchema>;
