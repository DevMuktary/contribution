import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({ where: { email: session?.user?.email } });
  
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { month, year, amount, goalId } = body;

  try {
    // Upsert: Update if it exists, Create if it doesn't
    const target = await prisma.monthlyTarget.upsert({
      where: {
        month_year_goalId: {
          month: parseInt(month),
          year: parseInt(year),
          goalId: goalId
        }
      },
      update: {
        targetAmount: parseFloat(amount)
      },
      create: {
        month: parseInt(month),
        year: parseInt(year),
        targetAmount: parseFloat(amount),
        goalId: goalId
      }
    });

    return NextResponse.json({ success: true, target });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to set target' }, { status: 500 });
  }
}
