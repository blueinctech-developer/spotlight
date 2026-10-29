import { IconFacebook, IconFlickr, IconInstagram, IconLinkedin, IconX, IconYoutube } from "./icons";

const ICONS = {
  facebook: { Icon: IconFacebook, label: "Facebook" },
  twitter: { Icon: IconX, label: "X (Twitter)" },
  linkedin: { Icon: IconLinkedin, label: "LinkedIn" },
  instagram: { Icon: IconInstagram, label: "Instagram" },
  youtube: { Icon: IconYoutube, label: "YouTube" },
  flickr: { Icon: IconFlickr, label: "Flickr" },
} as const;

export function SocialLinks({ social, only }: { social: Record<string, string>; only?: (keyof typeof ICONS)[] }) {
  const keys = (only ?? (Object.keys(ICONS) as (keyof typeof ICONS)[])).filter((k) => social[k]);
  return (
    <ul className="flex gap-3">
      {keys.map((k) => {
        const { Icon, label } = ICONS[k];
        return (
          <li key={k}>
            <a
              href={social[k]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="flex size-[45px] items-center justify-center rounded-full border border-brand text-brand transition-all duration-500 [transition-timing-function:var(--ease-spring)] hover:-translate-y-1 hover:rotate-[8deg] hover:bg-brand hover:text-white hover:shadow-[0_12px_24px_-10px_rgba(33,179,84,0.7)]"
            >
              <Icon />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
