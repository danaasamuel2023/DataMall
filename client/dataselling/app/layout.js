import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/nav";
import Footer from "./components/footer";
import WhatsAppLink from "./components/whatsaapWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Bignash Data Hub",
  description: "Resell Data and make money",
  openGraph: {
    images: [
      {
        url: '/opengraph-image.jpg', 
        width: 1200,
        height: 630,
        alt: 'Bignash Data Hub',
      },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        <WhatsAppLink />
        <Footer />
      </body>
    </html>
  );
}