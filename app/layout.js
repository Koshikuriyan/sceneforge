export const metadata = {
  title: "SceneForge — AI Script to Stock Footage",
  description: "Paste your faceless YouTube script and find matching stock footage instantly.",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0d0d0d" }}>
        {children}
      </body>
    </html>
  );
}
