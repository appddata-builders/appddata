"use client";

import { useState } from "react";

import {
  IminWorkspace as WorkspaceCore,
  type IminWorkspaceProps,
} from "./imin-tutorial-workspace";

export type IminProjectOption = {
  slug: string;
  name: string;
  url: string;
};

/** Hostname legible sin reventar el render si la URL guardada viene mal formada. */
function hostnameOf(url: string, fallback: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return fallback;
  }
}

/**
 * Editor IMIN real y configurable.
 *
 * Esta es la entrada que deben usar el dashboard y futuras integraciones. La
 * demostracion publica conserva su propio wrapper para que pueda evolucionar
 * sin cambiar el editor contratado por los clientes.
 */
export default function IminWorkspace({ projects = [], ...props }: IminWorkspaceProps & { projects?: IminProjectOption[] }) {
  const initial = projects.find((item) => item.slug === props.projectSlug) ?? projects[0];
  const [selectedSlug, setSelectedSlug] = useState(initial?.slug ?? props.projectSlug ?? "");
  const selected = projects.find((item) => item.slug === selectedSlug) ?? initial;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceCore
        key={selected?.slug ?? props.projectSlug}
        {...props}
        projectSlug={selected?.slug ?? props.projectSlug}
        siteUrl={selected?.url ?? props.siteUrl}
        siteName={selected ? hostnameOf(selected.url, props.siteName ?? selected.name) : props.siteName}
        siteOptions={projects}
        onSiteChange={setSelectedSlug}
        variant="panel"
      />
    </div>
  );
}

export type { IminWorkspaceProps };
