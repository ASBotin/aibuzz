import "../globals.css";
import Sidebar from "@/components/layout/Sidebar";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ru">
            <body className="bg-main text-content-primary min-h-screen antialiased">
                <div className="flex min-h-screen">
                    <Sidebar />
                    <main className="app-shell-content min-w-0 flex-1">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
