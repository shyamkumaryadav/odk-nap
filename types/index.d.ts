import { Form } from "enketo-core";
import { TransformedSurvey } from "enketo-transformer/web";

declare global {
  interface Window {
    xform?: TransformedSurvey<{ x_form: string }>;
    odk_form?: Form;
    loadData: () => void;
    dumpData: () => void;
  }
}
