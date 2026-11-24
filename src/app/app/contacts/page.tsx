import type { Metadata } from "next";
import { getContacts, getContactCounts } from "@/lib/actions/contact";
import { ContactsView } from "@/components/contacts/contacts-view";

export const metadata: Metadata = {
  title: "Buku Kontak — Payslip Mailer",
};

export default async function ContactsPage() {
  const [contactsList, counts] = await Promise.all([
    getContacts({ includeArchived: true }),
    getContactCounts(),
  ]);

  return <ContactsView contacts={contactsList} counts={counts} />;
}
