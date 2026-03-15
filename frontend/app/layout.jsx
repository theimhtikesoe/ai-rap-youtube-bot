import "./globals.css";

export const metadata = {
  title: "AI Rap Video Generator",
  description: "Generate AI rap videos with custom lyrics"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
