"use client";

import { useActionState, useState, useTransition } from "react";
import { changePassword, deleteAddress, saveAddress, setNewsletterPreference, updateProfile } from "@/server/account";
import { Button } from "@/components/ui/button";
import { Checkbox, FormError, FormSuccess, Input, Select } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { countryName, postalLabel, regionLabel, regionOptions } from "@/lib/regions";

export function NewsletterToggle({ subscribed }: { subscribed: boolean }) {
  const [on, setOn] = useState(subscribed);
  const [pending, start] = useTransition();
  const { toast } = useToast();
  return (
    <Checkbox
      label="Send me Rivkah Luxe news and offers"
      checked={on}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.checked;
        setOn(v);
        start(async () => {
          await setNewsletterPreference(v);
          toast(v ? "You're subscribed." : "You've been unsubscribed.");
        });
      }}
    />
  );
}

export function ProfileForm({ name, phone, email }: { name: string; phone: string | null; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="max-w-lg space-y-5">
      <Input label="Email" value={email} disabled hint="Contact us if you need to change your email." />
      <Input name="name" label="Full name" defaultValue={name} required error={fe.name} />
      <Input name="phone" type="tel" label="Phone" defaultValue={phone ?? ""} />
      {state?.ok ? <FormSuccess message={state.message} /> : <FormError message={state && !state.ok ? state.error : null} />}
      <Button type="submit" loading={pending} loadingText="Saving…">Save details</Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="max-w-lg space-y-5">
      <Input name="current" type="password" label="Current password" required autoComplete="current-password" error={fe.current} />
      <Input name="password" type="password" label="New password" required autoComplete="new-password" hint="At least 8 characters, with a letter and a number." error={fe.password} />
      {state?.ok ? <FormSuccess message={state.message} /> : <FormError message={state && !state.ok ? state.error : null} />}
      <Button type="submit" variant="outline" loading={pending} loadingText="Updating…">Change password</Button>
    </form>
  );
}

type Addr = { id: string; label: string | null; fullName: string; phone: string; line1: string; line2: string | null; city: string; state: string; postalCode: string | null; country: string; isDefault: boolean };

export function AddressBook({ addresses, countries }: { addresses: Addr[]; countries: { value: string; label: string }[] }) {
  const [editing, setEditing] = useState<Addr | "new" | null>(addresses.length ? null : "new");
  const [deleting, setDeleting] = useState<Addr | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-8">
      {editing ? (
        <AddressForm address={editing === "new" ? null : editing} countries={countries} onDone={() => setEditing(null)} />
      ) : (
        <Button onClick={() => setEditing("new")}>Add an address</Button>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="border border-line bg-white p-5 text-sm leading-relaxed">
            <p className="font-medium">{a.label || a.fullName} {a.isDefault && <span className="ml-2 text-xs text-gold-deep">Default</span>}</p>
            <p className="mt-1 text-stone">
              {a.fullName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.postalCode}<br />{countryName(a.country)} · {a.phone}
            </p>
            <div className="mt-4 flex gap-4">
              <button onClick={() => setEditing(a)} className="text-xs underline underline-offset-4">Edit</button>
              <button onClick={() => setDeleting(a)} className="text-xs text-danger underline underline-offset-4">Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!deleting}
        title="Delete this address?"
        message="You can always add it again later."
        confirmLabel="Delete address"
        loading={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          setBusy(true);
          await deleteAddress(deleting.id);
          setBusy(false);
          setDeleting(null);
        }}
      />
    </div>
  );
}

function AddressForm({ address, countries, onDone }: { address: Addr | null; countries: { value: string; label: string }[]; onDone: () => void }) {
  const [state, action, pending] = useActionState(async (prev: unknown, fd: FormData) => {
    const r = await saveAddress(prev, fd);
    if (r.ok) onDone();
    return r;
  }, null);
  const [country, setCountry] = useState(address?.country ?? "CA");
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const regions = regionOptions(country);
  return (
    <form action={action} className="grid gap-5 border border-line bg-white p-6 sm:grid-cols-2">
      <h2 className="font-display text-2xl sm:col-span-2">{address ? "Edit address" : "New address"}</h2>
      {address && <input type="hidden" name="id" value={address.id} />}
      <Input name="label" label="Label (optional)" placeholder="Home, Work…" defaultValue={address?.label ?? ""} />
      <Input name="fullName" label="Full name" required defaultValue={address?.fullName} error={fe.fullName} />
      <Input name="phone" type="tel" label="Phone" required defaultValue={address?.phone} error={fe.phone} />
      <Select name="country" label="Country" value={country} onChange={(e) => setCountry(e.target.value)} options={countries} />
      <Input name="line1" label="Street address" required defaultValue={address?.line1} error={fe.line1} className="sm:col-span-2" />
      <Input name="line2" label="Apartment, suite (optional)" defaultValue={address?.line2 ?? ""} className="sm:col-span-2" />
      <Input name="city" label="City" required defaultValue={address?.city} error={fe.city} />
      {regions ? (
        <Select name="state" label={regionLabel(country)} required defaultValue={address?.state} error={fe.state}>
          <option value="">Choose…</option>
          {regions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </Select>
      ) : (
        <Input name="state" label={regionLabel(country)} required defaultValue={address?.state} error={fe.state} />
      )}
      <Input name="postalCode" label={postalLabel(country)} defaultValue={address?.postalCode ?? ""} inputClassName="uppercase" />
      <Checkbox name="isDefault" label="Make this my default address" defaultChecked={address?.isDefault} className="sm:col-span-2" />
      <div className="sm:col-span-2"><FormError message={state && !state.ok ? state.error : null} /></div>
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" loading={pending} loadingText="Saving…">Save address</Button>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
