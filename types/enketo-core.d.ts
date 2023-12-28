declare type EGeolocationPosition = {
  geopoint: string;
  lat: number;
  lng: number;
  position: GeolocationPosition;
};

declare type BeforeInstallPromptEvent = Event & {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
};

declare type EValidateInputResult = {
  requiredValid: boolean;
  constraintValid: boolean;
};

declare interface ECustomEventMap {
  "geo-detection-start": CustomEvent<null>;
  "geo-detection-end": CustomEvent<null>;
  "geo-detection-success": CustomEvent<EGeolocationPosition>;
  "geo-detection-error": CustomEvent<GeolocationPositionError>;
  "form-progress-update": CustomEvent<EProgressUpdate>;
  "form-init": CustomEvent<string[]>;
  "form-invalid": CustomEvent<null>;
  "form-submission-error": CustomEvent<{ message: string }>;
  queuesubmissionsuccess: CustomEvent<string>;
  submissionsuccess: CustomEvent<string>;
  // enketo-core/src/js/event.js
  dataupdate: CustomEvent<any>;
  fakefocus: CustomEvent<null>;
  applyfocus: CustomEvent<null>;
  pageflip: CustomEvent<null>;
  removed: CustomEvent<any>;
  "odk-instance-first-load": CustomEvent<null>;
  "odk-new-repeat": CustomEvent<{
    repeatPath: string;
    repeatIndex: number;
    trigger: string;
  }>;
  addrepeat: CustomEvent<any>;
  removerepeat: CustomEvent<any>;
  changelanguage: CustomEvent<null>;
  "xforms-value-changed": CustomEvent<{ repeatIndex: number }>;
  inputupdate: CustomEvent<null>;
  edited: CustomEvent<null>;
  "before-save": CustomEvent<null>;
  validationcomplete: CustomEvent<null>;
  invalidated: CustomEvent<null>;
  "progress-update": CustomEvent<any>;
  "goto-rrelevant": CustomEvent<null>;
  "goto-irrelevant": CustomEvent<null>;
  "goto-invisible": CustomEvent<null>;
  govisible: CustomEvent<null>;
  "change-option": CustomEvent<null>;
  printify: CustomEvent<null>;
  deprintify: CustomEvent<null>;
  "update-max-size": CustomEvent<null>;
}

declare type EProgressUpdate = number;

declare module "enketo-core/src/*";

declare module "enketo-core/src/js/event" {
  const events: {
    GeoDetectionStart: <T = null>() => CustomEvent<T>;
    GeoDetectionEnd: <T = null>() => CustomEvent<T>;
    GeoDetectionSuccess: <T = EGeolocationPosition>(
      detail: T
    ) => CustomEvent<T>;
    GeoDetectionError: <T = GeolocationPositionError>(
      detail: T
    ) => CustomEvent<T>;
    FormProgressUpdate: <T = EProgressUpdate>(detail: T) => CustomEvent<T>;
    FormInit: <T = string[]>(detail: T) => CustomEvent<T>;
    QueueSubmissionSuccess: <T = string>(detail: T) => CustomEvent<T>;
    SubmissionSuccess: <T = string>(detail: T) => CustomEvent<T>;
    FormInValid: <T = null>() => CustomEvent<T>;
    FormSubmissionError: <T = { message: string }>(detail: T) => CustomEvent<T>;
    DataUpdate: <T = any>(detail: T) => CustomEvent<T>;
    FakeFocus: <T = null>() => CustomEvent<T>;
    ApplyFocus: <T = null>() => CustomEvent<T>;
    PageFlip: <T = null>() => CustomEvent<T>;
    Removed: <T = any>(detail: T) => CustomEvent<T>;
    InstanceFirstLoad: <T = null>() => CustomEvent<T>;
    NewRepeat: <
      T = { repeatPath: string; repeatIndex: number; trigger: string }
    >(
      detail: T
    ) => CustomEvent<T>;
    AddRepeat: <T = any>(detail: T) => CustomEvent<T>;
    RemoveRepeat: <T = any>(detail: T) => CustomEvent<T>;
    XFormsValueChanged: <T = { repeatIndex: number }>(
      detail: T
    ) => CustomEvent<T>;
    ChangeLanguage: <T = null>() => CustomEvent<T>;
    InputUpdate: <T = null>() => CustomEvent<T>;
    Edited: <T = null>() => CustomEvent<T>;
    BeforeSave: <T = null>() => CustomEvent<T>;
    ValidationComplete: <T = null>() => CustomEvent<T>;
    Invalidated: <T = null>() => CustomEvent<T>;
    ProgressUpdate: <T = any>(detail: T) => CustomEvent<T>;
    GoToIrrelevant: <T = null>() => CustomEvent<T>;
    GoToInvisible: <T = null>() => CustomEvent<T>;
    ChangeOption: <T = null>() => CustomEvent<T>;
    Printify: <T = null>() => CustomEvent<T>;
    DePrintify: <T = null>() => CustomEvent<T>;
    UpdateMaxSize: <T = null>() => CustomEvent<T>;
  };

  export default events;
}
