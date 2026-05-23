import { TopNav } from "@/components/nav/top-nav";
import { MobileNav } from "@/components/nav/mobile-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -right-28 -top-28 h-[400px] w-[400px] rounded-full bg-sage-light/30 blur-[60px]" />
        <div className="absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-terracotta-light/30 blur-[60px]" />
        <div className="absolute left-[60%] top-[40%] h-[250px] w-[250px] rounded-full bg-lavender/25 blur-[60px]" />
        <div className="absolute -left-16 top-[20%] h-[200px] w-[200px] rounded-full bg-sage-pale/80 blur-[60px]" />
        <svg
          className="absolute -right-24 -top-24 h-[600px] w-[600px] opacity-[0.06]"
          viewBox="0 0 500 600"
          fill="none"
        >
          <path
            fill="var(--sage)"
            d="M440,320C440,440,360,520,240,520C120,520,40,440,40,320C40,200,120,80,240,80C360,80,440,200,440,320Z"
          />
        </svg>
      </div>
      <TopNav />
      <main className="relative z-[1] mx-auto max-w-[1200px] px-4 pb-[120px] pt-[100px] md:px-8">
        {children}
      </main>
      <MobileNav />
    </>
  );
}
