import { Form } from "enketo-core";
import { TransformedSurvey } from "enketo-transformer/web";

declare global {
  interface Window {
    xform?: TransformedSurvey<{ x_form: string }>;
    odk_form?: Form;
  }
}

export interface TOC_ITEM {
  tocParentId: string;
  tocId: string;
  level: number;
  element: HTMLElement;
  label: string;
  name: string;
  score: number;
  score_total: number;
  children?: TOC_ITEM[];
}

export type TOC_ITEMS = TOC_ITEM[];
