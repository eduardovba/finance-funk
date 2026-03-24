import DemoAppShell from "@/components/DemoAppShell";

export const metadata = {
    title: "Finance Funk | Demo",
    description: "Explore Finance Funk with demo data — no account required.",
};

export default function DemoLayout({ children }) {
    return <DemoAppShell>{children}</DemoAppShell>;
}
