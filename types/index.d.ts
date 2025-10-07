import { Form } from "enketo-core";
import { TransformedSurvey } from "enketo-transformer/web";

declare global {
  interface Window {
    xform?: TransformedSurvey<{ x_form: string }>;
    odk_form?: Form;
    loadData: () => void;
    dumpData: () => void;
  }
  interface Document {
    //adds definition to Document, but you can do the same with HTMLElement
    addEventListener<K extends keyof ECustomEventMap>(
      type: K,
      listener: (this: Document, ev: ECustomEventMap[K]) => void
    ): void;
    dispatchEvent<K extends keyof ECustomEventMap>(
      ev: ECustomEventMap[K]
    ): void;
    removeEventListener<K extends keyof ECustomEventMap>(
      type: K,
      listener: (this: Document, ev: ECustomEventMap[K]) => void
    ): void;
  }
}
