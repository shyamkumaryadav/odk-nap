import { Form } from "enketo-core";
import { TransformedSurvey } from "enketo-transformer/web";

declare global {
  interface Window {
    xform?: TransformedSurvey<{ x_form: string }>;
    odk_form?: Form;
    getScore: (form: Form) => {
      result: TOC_ITEM[];
      score: number;
      score_total: number;
    };
  }
}

export interface TOC_ITEM {
  tocParentId: number | null;
  parent: HTMLElement | null;
  tocId: number;
  level: number;
  element: Element;
  label: string;
  name: string;
  score: number;
  score_total: number;
  children?: TOC_ITEM[];
}

export type TOC_ITEMS = TOC_ITEM[];
