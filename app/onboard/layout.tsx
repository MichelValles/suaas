export default function OnboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ink-900)",
        color: "rgba(255,255,255,0.92)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}
