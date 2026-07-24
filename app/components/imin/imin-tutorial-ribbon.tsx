"use client";

import { LuCircleCheckBig, LuImage, LuLayoutGrid, LuPalette, LuSparkles, LuType } from "react-icons/lu";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

import {
  palettePresets,
  tutorialTabs,
  type PalettePreset,
  type TutorialTab,
  type TutorialTool,
} from "./imin-tutorial-model";

function getToolIcon(tool: TutorialTool) {
  if (tool === "texto") {
    return LuType;
  }

  if (tool === "imagenes" || tool === "multimedia") {
    return LuImage;
  }

  if (tool === "iconos" || tool === "animacion") {
    return LuSparkles;
  }

  if (tool === "agregar-bloque") {
    return LuLayoutGrid;
  }

  if (
    tool === "neutral" ||
    tool === "grafito" ||
    tool === "oceano" ||
    tool === "bosque" ||
    tool === "terracota"
  ) {
    return LuPalette;
  }

  return LuCircleCheckBig;
}

type IminTutorialRibbonProps = {
  activeTab: TutorialTab;
  activeTool: TutorialTool;
  onTabChange: (tab: TutorialTab) => void;
  onToolChange: (tool: TutorialTool) => void;
};

export default function IminTutorialRibbon({
  activeTab,
  activeTool,
  onTabChange,
  onToolChange,
}: IminTutorialRibbonProps) {
  const currentTab = tutorialTabs.find((tab) => tab.id === activeTab) ?? tutorialTabs[0];
  const paletteTab = activeTab === "paleta";

  return (
    <header className="border-b border-slate-200 bg-white/94 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <p className="text-[0.62rem] uppercase tracking-[0.38em] text-[#0C6CC6] font-bold">
            IMIN Demo
          </p>
          <h2 className="mt-2 text-2xl font-light tracking-[0.08em] text-[#111827] sm:text-3xl">
            IMIN - Edita tus contenidos
          </h2>
        </div>

        <Badge variant="outline" className="border-slate-200 text-slate-600">
          Opciones
        </Badge>
      </div>

      <div className="border-t border-slate-200 px-4 py-3 sm:px-6">
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-2 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-1">
            {tutorialTabs.map((tab) => (
              <Button
                key={tab.id}
                variant={tab.id === activeTab ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-10 rounded-[0.95rem] px-4 text-[0.62rem]",
                  tab.id !== activeTab && "text-slate-600 hover:bg-slate-100",
                )}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-3 sm:px-6">
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-stretch gap-3">
            {currentTab.tools.map((tool) => {
              const Icon = getToolIcon(tool.id);

              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onToolChange(tool.id)}
                  className={cn(
                    "min-w-60 rounded-[1.15rem] border px-4 py-3 text-left transition",
                    activeTool === tool.id
                      ? "border-[#589bf9]/8 bg-[#589bf9]/8"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[#0C6CC6] font-bold">
                        {currentTab.label}
                      </p>
                      <p className="mt-2 text-sm tracking-[0.04em] text-[#111827]">{tool.label}</p>
                    </div>
                  </div>
                  {paletteTab ? (
                    <div className="mt-4 flex items-center gap-2">
                      {palettePresets[tool.id as PalettePreset].swatches.map((swatch: string) => (
                        <span
                          key={swatch}
                          className="h-6 w-6 rounded-full border border-slate-200"
                          style={{ backgroundColor: swatch }}
                        />
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-3 text-xs leading-5 text-slate-600">{tool.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
