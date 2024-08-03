import { Form } from "enketo-core";
import { TransformedSurvey } from "enketo-transformer/web";

interface SCORE_FIELD {
  score: number;
  /**
   * name typo just for log use so that this come after score field
   */
  score_total: number;
}

export interface FORM_SCORE {
  result: TOC_ITEM[];
}

export interface SUBMIT_SCORE {
  name: string;
  label: string;
  score: number;
  total_score: number;
  children?: SUBMIT_SCORE[];
}

declare global {
  interface Window {
    xform?: TransformedSurvey<{ x_form: string }>;
    odk_form?: Form;
  }
}

export interface TOC_ITEM extends SCORE_FIELD {
  tocParentId: number | null;
  parent: HTMLElement | null;
  tocId: number;
  level: number;
  element: Element;
  label: string;
  name: string;
  /**
   * index of the element in the repeat group 0 if not in repeat group
   */
  ind: number;
  children?: TOC_ITEM[];
}

export type TOC_ITEMS = TOC_ITEM[];
