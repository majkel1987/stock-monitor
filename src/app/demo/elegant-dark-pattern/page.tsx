import { DarkGradientBg } from "@/components/ui/elegant-dark-pattern";

export default function Home() {
  return (
    <DarkGradientBg>
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-6 p-8 text-center">
          <h1 className="text-4xl font-bold text-white">
            Dark Gradient Background
          </h1>
          <p className="mx-auto max-w-md text-lg text-gray-300">
            A clean, dark gradient background with subtle patterns and textures.
          </p>
        </div>
      </div>
    </DarkGradientBg>
  );
}
