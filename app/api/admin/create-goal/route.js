import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  
  // Security: Check if user is Admin
  const user = await prisma.user.findUnique({ where: { email: session?.user?.email } });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, date } = body;

  try {
    // 1. Deactivate any existing goals (we only want one active at a time)
    await prisma.savingsGoal.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // 2. Create the new Goal
    const newGoal = await prisma.savingsGoal.create({
      data: {
        title: title,
        cashOutDate: new Date(date),
        isActive: true
      }
    });

    return NextResponse.json({ success: true, goal: newGoal });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}
