declare module 'flutterwave-node-v3' {
  interface MobileMoneyRwandaPayload {
    phone_number: string;
    amount: number;
    currency: string;
    email: string;
    tx_ref: string;
    order_id: string;
    fullname?: string;
  }

  interface MobileMoneyRwandaResponse {
    status?: string;
    message?: string;
    meta?: { authorization?: { redirect?: string; mode?: string } };
  }

  interface FlutterwaveInstance {
    MobileMoney: {
      rwanda: (payload: MobileMoneyRwandaPayload) => Promise<MobileMoneyRwandaResponse>;
    };
  }

  interface FlutterwaveConstructor {
    new (publicKey: string, secretKey: string): FlutterwaveInstance;
  }

  const Flutterwave: FlutterwaveConstructor;
  export default Flutterwave;
}
