import { z } from 'zod';

export const updatePricingSchema = z
  .object({
    cityFlatFare: z
      .number({
        message: 'cityFlatFare must be a number',
      })
      .int('cityFlatFare must be a whole integer without decimals')
      .positive('cityFlatFare must be a positive integer greater than zero')
      .optional(),
    outsideRatePerKm: z
      .number({
        message: 'outsideRatePerKm must be a number',
      })
      .int('outsideRatePerKm must be a whole integer without decimals')
      .positive('outsideRatePerKm must be a positive integer greater than zero')
      .optional(),
  })
  .refine(
    (data) => data.cityFlatFare !== undefined || data.outsideRatePerKm !== undefined,
    {
      message: 'At least one of cityFlatFare or outsideRatePerKm must be provided',
    }
  );

export type UpdatePricingInput = z.infer<typeof updatePricingSchema>;
