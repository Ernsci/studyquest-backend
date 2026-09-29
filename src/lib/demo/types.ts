import type { CodeExample, DiagramBlock, Difficulty, RelatedLink } from "../types";



export type RawCodeExample = CodeExample;
export type RawDiagram = DiagramBlock;
export type RawRelated = RelatedLink;

export type RawLesson = {
  slug: string;
  title: string;
  description: string;
  moduleSlug: string;
  objectives: string[];
  body: string;
  codeExamples?: RawCodeExample[];
  diagram?: RawDiagram | null;
  related?: RawRelated[];
  estimatedMinutes: number;
  difficulty: Difficulty;
  order: number;
};

export type RawModule = {
  slug: string;
  title: string;
  description: string;
  order: number;
};

export type RawQuestion = {
  kind: "single" | "multiple" | "true_false" | "short_answer" | "code";
  prompt: string;
  options?: string[];

  answer: number | number[] | boolean | string;
  explanation: string;
  hint?: string;
  points?: number;
  difficulty?: Difficulty;
  lessonSlug?: string | null;
  starterCode?: string;
  expectedOutput?: string;
};

export type RawSubject = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  colorHex: string;
  level: Difficulty;
  order: number;
  modules: RawModule[];
  lessons: RawLesson[];
  questions: RawQuestion[];
};


export function body(...lines: string[]): string {
  return lines.join("\n");
}


export function src(...lines: string[]): string {
  return lines.join("\n");
}

