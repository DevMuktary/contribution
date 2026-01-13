import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, name, email, phone } = body;

    if (!userId || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Check if user already has an account to prevent duplicates
    const existingAccount = await prisma.virtualAccount.findUnique({
      where: { userId: userId }
    });

    if (existingAccount) {
      return NextResponse.json({ 
        success: true, 
        message: 'User already has a virtual account',
        account: existingAccount 
      });
    }

    // 2. Prepare data for Payment Point API
    // We strictly follow the documentation you provided
    const paymentPointData = {
      name: name,
      email: email,
      phoneNumber: phone || "00000000000", // Fallback if phone is missing
      bankCode: ['20946'], // 20946 is Palmpay. Add '20897' for Opay if needed.
      businessId: process.env.PAYMENTPOINT_BUSINESS_ID
    };

    console.log('Requesting Virtual Account from Payment Point...');

    // 3. Call Payment Point API
    const response = await fetch('https://api.paymentpoint.co/api/v1/createVirtualAccount', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYMENTPOINT_SECRET_KEY}`,
        'api-key': process.env.PAYMENTPOINT_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentPointData)
    });

    const result = await response.json();

    // 4. Handle API Failure
    if (result.status !== 'success') {
      console.error('Payment Point Error:', result);
      return NextResponse.json({ 
        success: false, 
        error: result.message || 'Failed to generate account' 
      }, { status: 500 });
    }

    // 5. Save the new Account to Your Database
    // We grab the first account from the array (result.bankAccounts[0])
    const bankDetails = result.bankAccounts[0];

    const savedAccount = await prisma.virtualAccount.create({
      data: {
        userId: userId,
        bankCode: bankDetails.bankCode,
        accountNumber: bankDetails.accountNumber,
        accountName: bankDetails.accountName,
        bankName: bankDetails.bankName,
        // We use the account number as the reference since the API didn't return a specific 'reservationReference' in the sample
        reservationReference: bankDetails.accountNumber 
      }
    });

    return NextResponse.json({ success: true, account: savedAccount });

  } catch (error) {
    console.error('Create Account API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
