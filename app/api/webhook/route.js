import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('paymentpoint-signature');
    const secret = process.env.PAYMENTPOINT_SECRET_KEY;

    if (!signature || !secret) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify Signature
    const calculatedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (calculatedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(rawBody);

    if (data.notification_status === 'payment_successful' || data.transaction_status === 'success') {
      const { amount_paid, transaction_id, customer } = data;
      const txRef = String(transaction_id);

      console.log(`Processing payment ${txRef} for ${customer.email}`);

      // --- THE FIX STARTS HERE ---
      
      // 1. Check if we already processed this specific transaction
      const existingTransaction = await prisma.contribution.findUnique({
        where: { transactionReference: txRef }
      });

      if (existingTransaction) {
        console.log(`Duplicate transaction ${txRef} detected. Skipping.`);
        // Return 200 OK so Payment Point stops sending it
        return NextResponse.json({ status: 'success', message: 'Already processed' }, { status: 200 });
      }

      // 2. Find User
      const user = await prisma.user.findUnique({
        where: { email: customer.email },
      });

      if (!user) {
        console.error('User not found:', customer.email);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 3. Save new Contribution
      await prisma.contribution.create({
        data: {
          amount: parseFloat(amount_paid),
          transactionReference: txRef,
          status: 'SUCCESS',
          userId: user.id,
        },
      });

      console.log('Contribution saved successfully');
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
