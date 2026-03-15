import "./globals.css";

export const metadata = {
  title: "AI Rap YouTube Bot",
  description: "AI rap automation pipeline"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
