"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SafeImage from "@/components/site-settings/SafeImage";

type HeroProps = {
  title?: string;
  description?: string;
  commanderName?: string;
  commanderRank?: string;
  commanderImageUrl?: string | null;
};

const Hero = ({
  title = "MCEME",
  description = "Training Excellence for Officer Cadets (OCs) at the Military College of Electronics & Mechanical Engineering",
  commanderName = "Commander",
  commanderRank = "Commander, Cadets Training Wing",
  commanderImageUrl = null,
}: HeroProps) => {
  return (
    <section className="relative bg-[var(--primary)] text-primary-foreground h-screen w-full overflow-hidden flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0 opacity-20">
        <Image
          src="/images/hero-training.jpg"
          alt="MCEME Training Ground"
          fill
          priority
          className="object-cover"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {title}
              <span className="block text-accent"></span>
            </h1>
            <p className="text-xl mb-8 text-primary-foreground/90 max-w-2xl">
              {description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button asChild variant="link" size="lg" className="bg-warning">
                <Link href="/login?role=staff">Commander / Staff Login</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="bg-white/10 text-primary-foreground border-white/30 hover:bg-white hover:text-primary"
              >
                <Link href="/login?role=oc">OC Corner</Link>
              </Button>
            </div>
          </div>

          {/* Commander Card */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-sm bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <SafeImage
                    src={commanderImageUrl}
                    fallbackSrc="/images/brigadier_logo.jpeg"
                    alt={commanderName}
                    width={96}
                    height={96}
                    className="w-26 h-26 rounded-full mx-auto object-fill border-4 border-accent"
                  />
                </div>
                <h3 className="text-xl font-semibold mb-1">{commanderName}</h3>
                <p className="text-accent font-medium mb-2">
                  {commanderRank}
                </p>
                {/* <p className="text-sm text-primary-foreground/80">
                  Leading with dedication and excellence in Officer Cadet training
                </p> */}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
