import { ExternalLink } from "lucide-react";

const Link = ({ href, children }: { href: string; children: string }) => (
  <a href={href} target="_blank" rel="noreferrer">
    {children}
    <ExternalLink size={13} />
  </a>
);

export const About = () => (
  <section className="about">
    <h1>Figma to ArkUI</h1>
    <p>
      An ArkUI-only modified version of FigmaToCode by Bernardo Ferrari.
      Modified by Lunriv in 2026.
    </p>
    <p>
      Licensed under GNU GPL v3. This program comes with no warranty. You may
      redistribute and modify it under the license terms.
    </p>
    <div className="about-links">
      <Link href="https://github.com/bernaferrari/FigmaToCode">
        Original project
      </Link>
      <Link href="https://github.com/Lunriv/FigmaToArkUI">
        FigmaToArkUI source
      </Link>
    </div>
  </section>
);
