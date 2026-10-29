/** Re-mounts on every navigation, giving each page a soft fade-in. */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
