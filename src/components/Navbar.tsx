"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { navItems } from "@/config/app.config";
import Image from "next/image";
import SafeImage from "@/components/site-settings/SafeImage";

type NavbarProps = {
  logoUrl?: string | null;
  siteTitle?: string;
  siteSubtitle?: string;
};

const Navbar = ({
  logoUrl = null,
  siteTitle = "MCEME",
  siteSubtitle = "CTW Portal",
}: NavbarProps) => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isActive = (path: string) => {
    return pathname === path || (pathname === "/" && path.startsWith("/#"));
  };

  return (
    <header className="bg-card border-b border-border shadow-elegant sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <SafeImage
              src={logoUrl}
              fallbackSrc="/images/army_logo.jpeg"
              alt="Site Logo"
              width={50}
              height={50}
              className="h-10 w-10 object-contain"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-primary">{siteTitle}</h1>
              <p className="text-xs text-muted-foreground">{siteSubtitle}</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            {navItems.map(({name, path}) => {
              return(
              <a
                key={name}
                href={path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(path)
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {name}
              </a>
            )
            })}

            <Button asChild variant="default" size="sm">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="default" size="sm">
              <Link href="/signup">Sign Up</Link>
            </Button>

            <Image
              src="/images/eme_logo.jpeg"
              alt="MCEME Logo"
              width={50}
              height={10}
              className="object-contain"
            />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-md hover:bg-accent"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden mt-4 py-4 border-t border-border">
            <div className="flex flex-col space-y-3">
              {navItems.map(({name, path}) => {
                return(
                <a
                  key={name}
                  href={path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActive(path)
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {name}
                </a>
              )
              })}
              <Button asChild variant="default" size="sm" className="w-fit">
                <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                  Login
                </Link>
              </Button>
              <Button asChild variant="default" size="sm" className="w-fit">
                <Link href="/signup" onClick={() => setIsMenuOpen(false)}>
                  Sign Up
                </Link>
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
