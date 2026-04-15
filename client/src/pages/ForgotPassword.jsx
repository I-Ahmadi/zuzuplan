export default function ForgotPassword() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Password recovery is not connected yet. Once the backend endpoint is ready,
          this screen can submit reset requests.
        </p>
      </div>
    </div>
  );
}
