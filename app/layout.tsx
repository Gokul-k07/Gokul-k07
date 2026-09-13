import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { InteractiveCursor } from "@/components/InteractiveCursor";
import { NavBar } from "@/components/NavBar";
import { PageTransition } from "@/components/PageTransition";
import { PortfolioPreloader } from "@/components/PortfolioPreloader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  preload: true,
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

// Client component to handle HTML element with hydration suppression
function Html({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {children}
    </html>
  );
}

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Gokul K — Full Stack Developer & AI Engineer | Tamil Nadu, India",
    template: "%s | Gokul K",
  },
  description:
    "Gokul K is a Full Stack Web Developer and AI Engineer based in Tamil Nadu, India. Portfolio of Gokul K: NEXTSTOP BusTracker, AI Resume Analyzer, SecurePower Android security app. React, Next.js, TypeScript, Kotlin, Supabase, Firebase.",
  keywords: [
    "Gokul",
    "Gokulk",
    "Gokul K",
    "Gokul portfolio",
    "Gokul K web developer",
    "Gokul K full stack developer",
    "Gokul K AI engineer",
    "Gokul Tamil Nadu developer",
    "gokulk.vercel.app",
    "Full Stack Developer Tamil Nadu",
    "React developer India",
    "Next.js developer portfolio",
    "AI engineer portfolio India",
  ],
  authors: [{ name: "Gokul K", url: siteUrl }],
  creator: "Gokul K",
  publisher: "Gokul K",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "Gokul K — Portfolio",
    title: "Gokul K — Full Stack Developer & AI Engineer",
    description:
      "Gokul K builds production-ready web apps, AI-powered experiences, and Android security projects. Based in Tamil Nadu, India.",
    images: [
      {
        url: "/gokul-portrait.png",
        width: 1200,
        height: 630,
        alt: "Gokul K — Full Stack Developer and AI Engineer, Tamil Nadu India",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gokul K — Full Stack Developer & AI Engineer",
    description:
      "Portfolio of Gokul K: NEXTSTOP BusTracker, AI Resume Maker, SecurePower. React, TypeScript, Kotlin, Firebase. Tamil Nadu, India.",
    images: ["/gokul-portrait.png"],
  },
  icons: {
    icon: "/logo/logo_only_circle.png",
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#050508",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Html>
      <head>
        {/* Theme initialization script to prevent hydration mismatch */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('gokul-theme');
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {
                  // Silently fail if localStorage is not available
                }
              })();
            `,
          }}
        />
      </head>
      <ThemeProvider>
        <body className="flex min-h-full flex-col bg-background font-sans text-foreground" suppressHydrationWarning>
          <PortfolioPreloader />
          <NavBar />
          <InteractiveCursor />
          <PageTransition>
            {children}
          </PageTransition>
          <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: "Gokul K",
              alternateName: ["Gokul", "Gokulk"],
              url: "https://gokulk.vercel.app",
              image: "https://gokulk.vercel.app/gokul-portrait.png",
              jobTitle: "Full Stack Developer",
              description:
                "Gokul K is a Full Stack Web Developer and AI Engineer based in Tamil Nadu, India, specializing in React, Next.js, Supabase, Firebase, Kotlin, and AI-powered web applications.",
              address: {
                "@type": "PostalAddress",
                addressRegion: "Tamil Nadu",
                addressCountry: "IN",
              },
              email: "gokulk24cb@psnacet.edu.in",
              knowsAbout: [
                "React",
                "Next.js",
                "Full Stack Development",
                "Artificial Intelligence",
                "Supabase",
                "Firebase",
                "Kotlin",
                "Android Development",
                "TypeScript",
                "Web Development",
              ],
              sameAs: [
                "https://github.com/Gokul-k07",
                "https://www.linkedin.com/in/gokul-k-23334b329/",
              ],
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Smooth inertia scroll
                let targetScroll = 0;
                let currentScroll = 0;
                let velocity = 0;
                let lastScroll = 0;
                let scrollTimeout;
                let isUserScrolling = false;
                
                const handleScroll = () => {
                  targetScroll = window.scrollY;
                  isUserScrolling = true;
                  clearTimeout(scrollTimeout);
                  
                  const delta = window.scrollY - lastScroll;
                  velocity = delta * 0.8;
                  lastScroll = window.scrollY;
                  
                  scrollTimeout = setTimeout(() => {
                    isUserScrolling = false;
                  }, 150);
                };
                
                const applyInertia = () => {
                  if (Math.abs(velocity) > 0.2 && !isUserScrolling) {
                    velocity *= 0.92;
                    targetScroll += velocity;
                    
                    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                    targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));
                    
                    window.scrollTo(0, targetScroll);
                  }
                  
                  if (Math.abs(velocity) > 0.2) {
                    requestAnimationFrame(applyInertia);
                  }
                };
                
                window.addEventListener('scroll', handleScroll, { passive: true });
                window.addEventListener('scroll', () => {
                  if (!isUserScrolling && Math.abs(velocity) > 0.2) {
                    requestAnimationFrame(applyInertia);
                  }
                }, { passive: true });
                
                // Page load animations - trigger after paint
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', () => {
                    requestAnimationFrame(() => {
                      const elements = document.querySelectorAll('.animate-load');
                      elements.forEach((el) => {
                        el.classList.add('visible');
                      });
                    });
                  });
                } else {
                  requestAnimationFrame(() => {
                    const elements = document.querySelectorAll('.animate-load');
                    elements.forEach((el) => {
                      el.classList.add('visible');
                    });
                  });
                }
              })();
            `,
          }}
        />
      </body>
      </ThemeProvider>
    </Html>
  );
}
