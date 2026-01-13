import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions = {
  // We use JWT strategy for simplicity with Credentials
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET, // Make sure this is in your Railway variables
  providers: [
    CredentialsProvider({
      name: "Sign In",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "hello@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 1. Check if user exists
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          return null; // or throw new Error("User not found");
        }

        // 2. Check Password
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // 3. Return user object if successful
        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      }
    })
  ],
  callbacks: {
    // Add user ID to the token so we can use it in the app
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
      }
      return session;
    }
  },
  // We will create this custom login page next so it looks good
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
