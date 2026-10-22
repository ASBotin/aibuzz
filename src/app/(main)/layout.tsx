import "../globals.css";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ru">
            <body className="bg-main text-content-primary min-h-screen antialiased">
                {children}
            </body>
        </html>
    );
}
