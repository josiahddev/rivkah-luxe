import { requireUser } from "@/lib/auth/session";
import { AccountNav } from "@/components/store/account-nav";

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await requireUser("/account");
  return (
    <div className="container-luxe py-12 sm:py-16">
      <div className="mb-10">
        <p className="eyebrow text-gold-deep">My account</p>
        <h1 className="mt-2 font-display text-5xl">Hello, {user.name.split(" ")[0]}</h1>
      </div>
      <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
