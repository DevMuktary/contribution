import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma'; // Importing the helper we just made

export async function POST(request) {
  try {
    // 1. Get the raw body text for signature verification
    // We cannot use .json() first because we need the exact raw string for the hash
    const rawBody = await request.text();
    
    // 2. Get the signature from headers
    const signature = request.headers.get('paymentpoint-signature');
    const secret = process.env.PAYMENTPOINT_SECRET_KEY; // We will add this to Railway variables later

    if (!signature || !secret) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    // 3. Verify the Signature (Security Check)
    // Hash the raw body with your secret key
    const calculatedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (calculatedSignature !== signature) {
      console.error('Invalid Signature. Calculated:', calculatedSignature, 'Received:', signature);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 4. Parse the data
    const data = JSON.parse(rawBody);

    // 5. Check if payment was successful
    if (data.notification_status === 'payment_successful' || data.transaction_status === 'success') {
      
      const { amount_paid, transaction_id, customer } = data;

      console.log(`Processing payment of ${amount_paid} for ${customer.email}`);

      // 6. Find the User based on the email attached to the virtual account
      // Note: We search by email because Payment Point sends the customer email in the webhook
      const user = await prisma.user.findUnique({
        where: { email: customer.email },
      });

      if (!user) {
        console.error('User not found for email:', customer.email);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 7. Save the Contribution to the Database o
      // We use 'upsert' or 'create' to avoid duplicates if the webhook fires twice
      const contribution = await prisma.contribution.create({
        data: {
          amount: parseFloat(amount_paid),
          transactionReference: String(transaction_id),
          status: 'SUCCESS',
          userId: user.id,
        },
      });

      console.log('Contribution saved:', contribution.id);
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
