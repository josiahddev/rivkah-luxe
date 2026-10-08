import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { PasswordForm, ProfileForm } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  return (
    <div className="space-y-14">
      <section>
        <h2 className="mb-6 font-display text-3xl">Your details</h2>
        <ProfileForm name={user.name} phone={user.phone} email={user.email} />
      </section>
      <section>
        <h2 className="mb-6 font-display text-3xl">Password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
