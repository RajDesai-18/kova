export default function MainPage() {
  return (
    <div className="flex h-[calc(100vh-57px)] items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground">Welcome to Kova</h2>
        <p className="mt-2 text-muted-foreground">Select a document or create a new one to get started.</p>
      </div>
    </div>
  );
}
