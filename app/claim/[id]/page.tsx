import { redirect } from "next/navigation";

/**
 * /claim/[id] - canonical deep-link from Brevo email
 * Immediately redirects to the receive page with the intent ID as a query param.
 * This gives the email CTA a clean, professional URL: /claim/INTENT_ID
 */
export default function ClaimRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/receive?id=${params.id}`);
}
