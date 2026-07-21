"use client";

import {
  IminWorkspace as WorkspaceCore,
  type IminWorkspaceProps,
} from "./imin-tutorial-workspace";

/**
 * Editor IMIN real y configurable.
 *
 * Esta es la entrada que deben usar el dashboard y futuras integraciones. La
 * demostracion publica conserva su propio wrapper para que pueda evolucionar
 * sin cambiar el editor contratado por los clientes.
 */
export default function IminWorkspace(props: IminWorkspaceProps) {
  return <WorkspaceCore {...props} variant="panel" />;
}

export type { IminWorkspaceProps };
