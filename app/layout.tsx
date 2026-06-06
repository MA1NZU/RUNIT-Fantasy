export const metadata = {
  title: "Fantasy Game",
  description: "Valorant & Marvel Rivals Fantasy",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
