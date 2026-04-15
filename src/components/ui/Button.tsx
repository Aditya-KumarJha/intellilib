"use client";

import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import Link from "next/link";

type ButtonBaseProps = {
  text: string;
  icon?: ReactNode;
  textColor?: string;
  bgColor?: string;
};

type ButtonAsButtonProps = ButtonBaseProps
  & React.ButtonHTMLAttributes<HTMLButtonElement>
  & { href?: undefined };

type ButtonAsLinkProps = ButtonBaseProps
  & Omit<React.ComponentProps<typeof Link>, "href">
  & { href: string };

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

export default function Button({
  text,
  icon,
  textColor = "text-white",
  bgColor = "bg-gradient-to-b from-zinc-300 to-zinc-400",
  href,
  ...props
}: ButtonProps) {
  const handleMouseMove: MouseEventHandler<HTMLElement> = (e) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const offsetX = (x - centerX) / 6;
    const offsetY = (y - centerY) / 4;

    target.style.boxShadow = `
      inset ${-offsetX}px ${-offsetY}px 6px rgba(255,255,255,0.6),
      inset ${offsetX}px ${offsetY}px 6px rgba(0,0,0,0.25),
      ${offsetX * 2}px ${offsetY * 2}px 20px rgba(255,255,255,0.15),
      ${offsetX * 3}px ${offsetY * 3}px 40px rgba(0,0,0,0.6)
    `;
  };

  const resetShadow: MouseEventHandler<HTMLElement> = (e) => {
    e.currentTarget.style.boxShadow = `
      inset 0 -2px 4px rgba(0,0,0,0.3),
      inset 0 2px 4px rgba(255,255,255,0.5),
      0 15px 20px -10px rgba(255,255,255,0.2),
      0 30px 40px rgba(0,0,0,0.6)
    `;
  };

  const sharedClassName = `
    ${bgColor} ${textColor}
    px-5 py-2 rounded-full font-medium
    flex items-center gap-2
    transition-all duration-200
  `;

  const sharedStyle: CSSProperties = {
    boxShadow: `
      inset 0 -2px 4px rgba(0,0,0,0.3),
      inset 0 2px 4px rgba(255,255,255,0.5),
      0 15px 20px -10px rgba(255,255,255,0.2),
      0 30px 40px rgba(0,0,0,0.6)
    `,
  };

  const sharedProps = {
    onMouseMove: handleMouseMove,
    onMouseLeave: resetShadow,
    className: sharedClassName,
    style: sharedStyle,
  };

  if (href) {
    const linkProps = props as Omit<React.ComponentProps<typeof Link>, "href">;
    return (
      <Link href={href} {...sharedProps} {...linkProps}>
        {icon}
        <span>{text}</span>
      </Link>
    );
  }

  const buttonProps = props as React.ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button type="button" {...sharedProps} {...buttonProps}>
      {icon}
      <span>{text}</span>
    </button>
  );
}
