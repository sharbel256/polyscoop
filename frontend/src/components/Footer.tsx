import { Telescope } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-surface-dark-3 bg-surface-dark-0">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Telescope className="h-4 w-4" />
          <span>polyscoop</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span>powered by polymarket</span>
          <a
            href="https://github.com/Polymarket"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-400"
          >
            github
          </a>
        </div>
      </div>
    </footer>
  );
}
