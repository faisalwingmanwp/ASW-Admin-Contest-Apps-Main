export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <main className=" mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
} 