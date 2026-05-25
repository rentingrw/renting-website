import { BadRequestException } from '@nestjs/common';

const IPAY_BASE_URL = 'https://api.mopay.ipay.rw';

export interface IPayChargeParams {
  phoneNumber: string;
  amount: number;
  txRef: string;
  message: string;
  callbackUrl: string;
}

export interface IPayChargeResult {
  transactionId: string;
}

function normalizeRwandaPhone(phone: string): number {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('250')) return Number(digits);
  if (digits.startsWith('0')) return Number('250' + digits.slice(1));
  return Number('250' + digits);
}

export async function initiateIPayCharge(params: IPayChargeParams): Promise<IPayChargeResult> {
  const apiKey = process.env.IPAY_API_KEY;
  if (!apiKey) {
    throw new BadRequestException('iPay API key is not configured.');
  }

  const body = {
    transaction_id: params.txRef,
    amount: params.amount,
    currency: 'RWF',
    phone: normalizeRwandaPhone(params.phoneNumber),
    payment_mode: 'MOBILE',
    message: params.message,
    callback_url: params.callbackUrl,
  };

  const response = await fetch(`${IPAY_BASE_URL}/initiate-payment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new BadRequestException(`iPay payment initiation failed: ${text}`);
  }

  const data = (await response.json()) as { status: number; transactionId: string };

  return { transactionId: data.transactionId ?? params.txRef };
}
