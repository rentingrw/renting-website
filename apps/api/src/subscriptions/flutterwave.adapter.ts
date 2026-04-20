import { BadRequestException } from '@nestjs/common';
import Flutterwave from 'flutterwave-node-v3';

export interface FlutterwaveChargeParams {
  phoneNumber: string;
  amount: number;
  currency: string;
  email: string;
  txRef: string;
  fullName?: string;
}

export interface FlutterwaveChargeResult {
  status: string;
  message: string;
  meta?: { authorization?: { redirect?: string; mode?: string } };
}

function normalizeRwandaPhone(mobileNumber: string): string {
  const digits = mobileNumber.replace(/\D/g, '');
  if (digits.startsWith('250')) return digits;
  if (digits.startsWith('0')) return '250' + digits.slice(1);
  return '250' + digits;
}

export async function initiateFlutterwaveCharge(
  params: FlutterwaveChargeParams,
): Promise<FlutterwaveChargeResult> {
  const publicKey = process.env.FLW_PUBLIC_KEY;
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!publicKey || !secretKey) {
    throw new BadRequestException('Flutterwave configuration is incomplete.');
  }

  const flw = new Flutterwave(publicKey, secretKey);
  const phone = normalizeRwandaPhone(params.phoneNumber);

  const payload = {
    phone_number: phone,
    amount: params.amount,
    currency: params.currency,
    email: params.email,
    tx_ref: params.txRef,
    order_id: params.txRef, // Required by Flutterwave for RWF
    ...(params.fullName && { fullname: params.fullName }),
  };

  const response = await flw.MobileMoney.rwanda(payload);

  if (!response.status || response.status === 'error') {
    throw new BadRequestException(
      response.message || 'Flutterwave charge initiation failed.',
    );
  }

  return {
    status: response.status,
    message: response.message ?? 'Charge initiated',
    meta: response.meta,
  };
}
