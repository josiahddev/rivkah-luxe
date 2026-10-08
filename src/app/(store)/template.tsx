// Re-mounts on every navigation so each page fades in gently.
export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
