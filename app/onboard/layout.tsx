export default function OnboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        // `svh` descuenta las barras del navegador en móvil. Sin esto, en
        // Safari iOS y Chrome Android `100vh` mide más que el viewport
        // visible y obliga a hacer scroll para alcanzar el footer.
        minHeight: "100svh",
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
