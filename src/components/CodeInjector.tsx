"use client";

import { useEffect, useRef } from "react";

interface CodeInjectorProps {
  code?: string;
  location?: "header" | "footer";
}

export function CodeInjector({ code, location = "header" }: CodeInjectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!code || !code.trim() || !containerRef.current) return;

    // Check if contains script tags that need execution
    const container = containerRef.current;
    container.innerHTML = code;

    const scripts = container.getElementsByTagName("script");
    for (let i = 0; i < scripts.length; i++) {
      const oldScript = scripts[i];
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    }
  }, [code]);

  if (!code || !code.trim()) return null;

  return (
    <div
      ref={containerRef}
      style={{ display: "none" }}
      aria-hidden="true"
      data-code-location={location}
    />
  );
}
