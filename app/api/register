import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, phone } = body;

    // 1. Basic Validation
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // 3. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create the User in Database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // ---------------------------------------------------------
    // 5. AUTO-GENERATE VIRTUAL ACCOUNT (Integration Logic)
    // ---------------------------------------------------------
    
    // We try to generate the account immediately. 
    // If this fails (e.g. network error), the user is still created, 
    // and they can try generating it again from the dashboard later.
    try {
      const paymentPointData = {
        name: name,
        email: email,
        phoneNumber: phone || "08000000000", // Default if missing
        bankCode: ['20946'], // Palmpay
        businessId: process.env.PAYMENTPOINT_BUSINESS_ID
      };

      const ppResponse = await fetch('https://api.paymentpoint.co/api/v1/createVirtualAccount', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYMENTPOINT_SECRET_KEY}`,
          'api-key': process.env.PAYMENTPOINT_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentPointData)
      });

      const ppResult = await ppResponse.json();

      if (ppResult.status === 'success' && ppResult.bankAccounts?.[0]) {
        const bankDetails = ppResult.bankAccounts[0];
        
        // Save the bank account to the DB
        await prisma.virtualAccount.create({
          data: {
            userId: user.id,
            bankCode: bankDetails.bankCode,
            accountNumber: bankDetails.accountNumber,
            accountName: bankDetails.accountName,
            bankName: bankDetails.bankName,
            reservationReference: bankDetails.accountNumber
          }
        });
        console.log(`Virtual account created for user ${user.email}`);
      } else {
        console.error('Payment Point failed to return account:', ppResult);
      }

    } catch (ppError) {
      // We don't stop the registration if this fails, just log it.
      console.error('Failed to connect to Payment Point during register:', ppError);
    }

    return NextResponse.json({ message: 'User created successfully', user });

  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
