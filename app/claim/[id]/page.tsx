import { redirect } from "next/navigation";

/**
 * /claim/[id] - canonical deep-link from Brevo email
 * Immediately redirects to the receive page with the intent ID as a query param.
 * This gives the email CTA a clean, professional URL: /claim/INTENT_ID
 */
export default async function ClaimRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/receive?id=${id}`);
}
