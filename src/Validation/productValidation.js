import { z } from "zod";

const productFields = {
  name: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(100, "Product name cannot exceed 100 characters"),

  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional()
    .default(""),

  price: z
    .coerce
    .number({ error: "Price must be a number" })
    .finite("Price must be a valid number")
    .nonnegative("Price cannot be negative"),

  category: z
    .string()
    .trim()
    .min(2, "Category is required")
    .max(50, "Category cannot exceed 50 characters"),

  brand: z
    .string()
    .trim()
    .min(2, "Brand is required")
    .max(50, "Brand cannot exceed 50 characters"),
};

export const createProductSchema = z
  .object(productFields)
  .strict();

export const updateProductSchema = z
  .object(productFields)
  .partial()
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required for update"
  );

export const productIdSchema = z.object({
  id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID"),
});

export const productQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10),

  category: z
    .string()
    .trim()
    .optional(),

  search: z
    .string()
    .trim()
    .optional(),
});