import events from "enketo-core/src/js/event";

events.GeoDetectionStart = function () {
  return new CustomEvent("geo-detection-start", { bubbles: true });
};

events.GeoDetectionEnd = function () {
  return new CustomEvent("geo-detection-end", { bubbles: true });
};

events.GeoDetectionSuccess = function (detail) {
  return new CustomEvent("geo-detection-success", { detail, bubbles: true });
};

events.GeoDetectionError = function (detail) {
  return new CustomEvent("geo-detection-error", { detail, bubbles: true });
};

events.FormProgressUpdate = function (detail) {
  return new CustomEvent("form-progress-update", { detail, bubbles: true });
};

events.FormInit = function (detail) {
  return new CustomEvent("form-init", { detail, bubbles: true });
};

events.FormInValid = function () {
  return new CustomEvent("form-invalid", { bubbles: true });
};

events.FormSubmissionError = function (detail) {
  return new CustomEvent("form-submission-error", { detail, bubbles: true });
};

events.QueueSubmissionSuccess = function (detail) {
  return new CustomEvent("queuesubmissionsuccess", {
    detail: {
      ...detail,
    },
    bubbles: true,
  });
};

events.SubmissionSuccess = function (detail) {
  return new CustomEvent("submissionsuccess", { detail, bubbles: true });
};

export default events;
