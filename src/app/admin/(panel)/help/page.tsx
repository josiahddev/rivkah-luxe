import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/ui";
import { PlusIcon } from "@/components/ui/icons";

export const metadata = { title: "Help & guides" };

const GUIDES: { q: string; steps: (string | React.ReactNode)[] }[] = [
  { q: "How do I add a product?", steps: ["Click “+ Add product” at the top of any page.", "Type the name, a short description and the full description.", "Drag your photos into the Photos box.", "Enter the price and how many you have in stock.", "Choose a category, keep “Live in shop” selected and press “Add product”."] },
  { q: "How do I upload photos?", steps: ["Open the product (Products → click it).", "Drag photos from your computer or phone into the Photos box — or tap it to choose.", "The first photo is the main one. Use ← → to reorder.", "Press “Save product”. Big photos are shrunk automatically."] },
  { q: "How do I change a price?", steps: ["Products → click the product.", "Under “Price & stock”, type the new price.", "To run a sale, type a lower number in “Sale price”. Clear it to end the sale.", "Press “Save product”."] },
  { q: "How do I update stock?", steps: [<>Go to <Link href="/admin/inventory" className="underline">Stock</Link>.</>, "Choose “Set to” and type the new number — or “Add (restock)” and type how many arrived.", "Press “Update”. Stock also goes down by itself when an order is paid."] },
  { q: "How do I create a discount code?", steps: [<>Go to <Link href="/admin/discounts" className="underline">Discount codes</Link> → “+ Create code”.</>, "Type the code (e.g. GLOW15) and choose % off, amount off or free shipping.", "Optionally set dates, a minimum spend or a usage limit.", "Press “Create code” and share it with customers."] },
  { q: "How do I process an order?", steps: [<>Go to <Link href="/admin/orders?status=open" className="underline">Orders → To pack</Link>.</>, "Open the order to see what to pack and where to send it.", "Pack it, then choose “Processing” or “Ready for Delivery” and press Update.", "The customer gets an email each time (keep the box ticked)."] },
  { q: "How do I mark an order as shipped?", steps: ["Open the order.", "Choose “Shipped”.", "Paste the tracking number or link into the message box.", "Press “Update to Shipped”. The customer is emailed the tracking info."] },
  { q: "How do I refund or cancel an order?", steps: ["Refund the money first in your Stripe (or Paystack) dashboard.", "Open the order and choose “Refunded” (or “Cancelled”).", "Confirm. The items go back into your stock automatically."] },
  { q: "How do I add a new category?", steps: [<>Go to <Link href="/admin/categories" className="underline">Categories</Link>.</>, "Fill in the “Add a category” form on the right and add a photo.", "Press “Add category”. Then assign products to it from each product's page."] },
  { q: "How do I change the homepage banner?", steps: [<>Go to <Link href="/admin/content/homepage" className="underline">Website content → Homepage</Link>.</>, "Find the section (e.g. “1. Hero” or “5. Promotional banner”).", "Change the photo or words and press “Save section”. It's live immediately."] },
  { q: "How do I change my contact information?", steps: [<>Go to <Link href="/admin/settings" className="underline">Settings → Store &amp; contact</Link>.</>, "Update email, phone, WhatsApp, address or hours.", "Press Save. Your footer, contact page and emails update everywhere."] },
  { q: "How do I read the sales reports?", steps: [<>Go to <Link href="/admin/analytics" className="underline">Sales reports</Link> and pick a date range.</>, "Revenue = money from paid orders. Average order = revenue ÷ orders.", "Best sellers and Sales by category show what's working. “Show as table” lists exact numbers.", "Abandoned bags shows people who didn't finish checking out."] },
  { q: "How do I approve reviews?", steps: [<>Go to <Link href="/admin/reviews" className="underline">Reviews</Link>.</>, "New reviews are under “Waiting for approval”.", "Press “Approve” to publish, “Hide” to keep it private, or “★ Feature” to show it on the homepage."] },
  { q: "How do I change shipping fees?", steps: [<>Go to <Link href="/admin/shipping" className="underline">Shipping</Link>.</>, "Click Edit on a zone, change the fee or the “free over” amount, and save.", "Add a new zone for a specific province or country if you need a different price."] },
];

export default async function HelpPage() {
  await requireAdmin("dashboard");
  return (
    <>
      <PageHeader title="Help & guides" description="Step-by-step answers for everyday tasks. The full Store Owner Guide is in the project files (OWNER_GUIDE.md)." />
      <div className="space-y-3">
        {GUIDES.map((g) => (
          <details key={g.q} className="accordion rounded-lg border border-line bg-white">
            <summary className="flex items-center justify-between gap-4 px-5 py-4 font-medium">
              {g.q}
              <PlusIcon size={18} className="accordion-icon shrink-0 text-stone" />
            </summary>
            <div className="accordion-body">
              <div>
                <ol className="list-decimal space-y-2 px-5 pb-5 pl-10 text-sm text-charcoal">
                  {g.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
