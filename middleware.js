export { default } from "next-auth/middleware";

// This protects these specific routes
export const config = {
  matcher: ["/", "/admin/:path*"]
};
