import type { Metadata } from "next";
import { DownloadPageContent } from "./DownloadPageContent";

export const metadata: Metadata = {
  title: "Download | Umbraa",
  description:
    "Download Umbraa for macOS, Windows, Linux, iOS, and Android. AI-powered penetration testing at your fingertips.",
  openGraph: {
    title: "Download Umbraa",
    description:
      "Download Umbraa for macOS, Windows, Linux, iOS, and Android. AI-powered penetration testing at your fingertips.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Download Umbraa",
    description:
      "Download Umbraa for macOS, Windows, Linux, iOS, and Android. AI-powered penetration testing at your fingertips.",
  },
};

export default function DownloadPage() {
  return <DownloadPageContent />;
}
