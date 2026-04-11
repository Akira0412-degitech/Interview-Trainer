import Link from "next/link";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block">
          <span className="text-orange-500 font-bold text-2xl tracking-tight">CodePrep</span>
        </Link>
        <h1 className="text-xl font-semibold text-white mt-4">{title}</h1>
        <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl border border-zinc-800 p-8">
        {children}
      </div>
    </div>
  );
}
