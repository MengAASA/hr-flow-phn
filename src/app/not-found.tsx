export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 font-poppins">
      <div className="text-center p-8 max-w-md">
        <h1 className="text-8xl font-bold text-indigo-800 dark:text-indigo-400 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
          Page Not Found
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
    </div>
  );
}
