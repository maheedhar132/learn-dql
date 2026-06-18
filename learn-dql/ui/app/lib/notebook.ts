// Utilities for building Dynatrace Notebook JSON (v7) and interacting with the documents API.
// Notebook format reverse-engineered from real notebook exports.

export interface NotebookMarkdownSection {
  id: string;
  type: "markdown";
  markdown: string;
}

export interface NotebookDqlSection {
  id: string;
  type: "dql";
  filterSegments: unknown[];
  drilldownPath: unknown[];
  previousFilterSegments: unknown[];
  state: {
    input: {
      timeframe: { from: string; to: string };
      value: string;
    };
    visualizationSettings: {
      autoSelectVisualization: boolean;
      chartSettings: Record<string, unknown>;
    };
    querySettings: {
      maxResultRecords: number;
      defaultScanLimitGbytes: number;
      maxResultMegaBytes: number;
      defaultSamplingRatio: number;
      enableSampling: boolean;
    };
    davis: {
      includeLogs: boolean;
      davisVisualization: { isAvailable: boolean };
    };
  };
}

export type NotebookSection = NotebookMarkdownSection | NotebookDqlSection;

export interface NotebookContent {
  version: "7";
  defaultTimeframe: { from: string; to: string };
  defaultSegments: unknown[];
  sections: NotebookSection[];
}

function newId(): string {
  return crypto.randomUUID();
}

export function buildMarkdownSection(
  title: string,
  description: string,
  explanation: string,
): NotebookMarkdownSection {
  return {
    id: newId(),
    type: "markdown",
    markdown: `## ${title}\n\n${description}\n\n${explanation}`,
  };
}

export function buildDqlSection(query: string): NotebookDqlSection {
  return {
    id: newId(),
    type: "dql",
    filterSegments: [],
    drilldownPath: [],
    previousFilterSegments: [],
    state: {
      input: {
        timeframe: { from: "now()-2h", to: "now()" },
        value: query,
      },
      visualizationSettings: {
        autoSelectVisualization: true,
        chartSettings: {},
      },
      querySettings: {
        maxResultRecords: 1000,
        defaultScanLimitGbytes: 500,
        maxResultMegaBytes: 1,
        defaultSamplingRatio: 10,
        enableSampling: false,
      },
      davis: {
        includeLogs: true,
        davisVisualization: { isAvailable: true },
      },
    },
  };
}

export function buildNewNotebook(sections: NotebookSection[]): NotebookContent {
  return {
    version: "7",
    defaultTimeframe: { from: "now()-2h", to: "now()" },
    defaultSegments: [],
    sections,
  };
}

export function notebookToBlob(notebook: NotebookContent): Blob {
  return new Blob([JSON.stringify(notebook)], { type: "application/json" });
}
