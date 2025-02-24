import type { Metadata } from "next";
import {
  Montserrat,
  Ubuntu_Mono,
  Anonymous_Pro,
  Courier_Prime,
  DM_Mono,
  Noto_Sans_Display,
} from "next/font/google";
import "./globals.css";
import Nav from "@/components/nav";
import { ViewTransitions } from "next-view-transitions";
import { ThemeProvider } from "@/components/theme-provider";

// const purr_font = Montserrat({ subsets: ["latin"] });
const purr_font = Noto_Sans_Display({ subsets: ["latin"] });
// const purr_font = Ubuntu_Mono({ weight: "400" });
// const purr_font = Anonymous_Pro({ weight: "400" });
//const purr_font = Courier_Prime({ weight: "400" });
//const purr_font = DM_Mono({ weight: "400" });

export const metadata: Metadata = {
  title: "John Doe",
};

// supressHydrationWarnings is recommended here:
// https://github.com/pacocoursey/next-themes

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ViewTransitions>
      <html lang="en" suppressHydrationWarning>
        <body className={purr_font.className}>
          <ThemeProvider attribute="class" disableTransitionOnChange>
            <Nav />
            {/* <div className="text-text dark:text-darkText mx-auto w-[1400px] max-w-full px-5 pb-10 pt-28"> */}
            <div className="text-text dark:text-darkText mx-auto w-[80%] max-w-full px-5 pb-10 pt-28">
              {children}
            </div>
          </ThemeProvider>
        </body>
      </html>
    </ViewTransitions>
  );
}
