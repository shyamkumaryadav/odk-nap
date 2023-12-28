import { getCurrentPosition } from "enketo-core/src/js/geolocation";
import Widget from "enketo-core/src/js/widget";

import events from "../../utils/event";

const options: PositionOptions = {
  enableHighAccuracy: true, // true means use GPS, false means use other location services when available
  maximumAge: 0, // 0 means no cache
  timeout: 10000, // max 10 seconds
};

const error_message = {
  not_supported: "Geolocation is not supported by this device.",
};

const GeoLocationPath = `<path d="M12.0009 14.1694C9.87086 14.1694 8.13086 12.4394 8.13086 10.2994C8.13086 8.15945 9.87086 6.43945 12.0009 6.43945C14.1309 6.43945 15.8709 8.16945 15.8709 10.3094C15.8709 12.4494 14.1309 14.1694 12.0009 14.1694ZM12.0009 7.93945C10.7009 7.93945 9.63086 8.99945 9.63086 10.3094C9.63086 11.6194 10.6909 12.6794 12.0009 12.6794C13.3109 12.6794 14.3709 11.6194 14.3709 10.3094C14.3709 8.99945 13.3009 7.93945 12.0009 7.93945Z"/>
<path d="M11.9997 22.76C10.5197 22.76 9.02969 22.2 7.86969 21.09C4.91969 18.25 1.65969 13.72 2.88969 8.33C3.99969 3.44 8.26969 1.25 11.9997 1.25C11.9997 1.25 11.9997 1.25 12.0097 1.25C15.7397 1.25 20.0097 3.44 21.1197 8.34C22.3397 13.73 19.0797 18.25 16.1297 21.09C14.9697 22.2 13.4797 22.76 11.9997 22.76ZM11.9997 2.75C9.08969 2.75 5.34969 4.3 4.35969 8.66C3.27969 13.37 6.23969 17.43 8.91969 20C10.6497 21.67 13.3597 21.67 15.0897 20C17.7597 17.43 20.7197 13.37 19.6597 8.66C18.6597 4.3 14.9097 2.75 11.9997 2.75Z"/>`;

const OkGeoLocationPath = `<path d="M11.9997 22.76C10.5197 22.76 9.02969 22.2 7.86969 21.09C4.91969 18.25 1.65969 13.72 2.88969 8.33C3.99969 3.44 8.26969 1.25 11.9997 1.25C11.9997 1.25 11.9997 1.25 12.0097 1.25C15.7397 1.25 20.0097 3.44 21.1197 8.34C22.3397 13.73 19.0797 18.25 16.1297 21.09C14.9697 22.2 13.4797 22.76 11.9997 22.76ZM11.9997 2.75C9.08969 2.75 5.34969 4.3 4.35969 8.66C3.27969 13.37 6.23969 17.43 8.91969 20C10.6497 21.67 13.3597 21.67 15.0897 20C17.7597 17.43 20.7197 13.37 19.6597 8.66C18.6597 4.3 14.9097 2.75 11.9997 2.75Z"/>
<path d="M10.7495 13.7494C10.5595 13.7494 10.3695 13.6794 10.2195 13.5294L8.71945 12.0294C8.42945 11.7394 8.42945 11.2594 8.71945 10.9694C9.00945 10.6794 9.48945 10.6794 9.77945 10.9694L10.7495 11.9394L14.2195 8.46945C14.5095 8.17945 14.9895 8.17945 15.2795 8.46945C15.5695 8.75945 15.5695 9.23945 15.2795 9.52945L11.2795 13.5294C11.1295 13.6794 10.9395 13.7494 10.7495 13.7494Z"/>`;

/**
 * The GeopickerExtended class is a TypeScript class that extends the Widget class and provides
 * functionality for detecting and selecting geopoints.
 * @extends Widget
 *
 * @example
 *  - geodetectionstart: emit when geodetection starts
 *  - geodetectionend: emit when geodetection ends
 *  - geodetectionsuccess: emit when geodetection succeeds
 *  - geodetectionerror: emit when geodetection fails
 */
class GeopickerExtended extends Widget {
  static get selector() {
    return '.question input[data-type-xml="geopoint"]:not([data-setvalue]):not([data-setgeopoint]), .question input[data-type-xml="geotrace"]:not([data-setvalue]):not([data-setgeopoint]), .question input[data-type-xml="geoshape"]:not([data-setvalue]):not([data-setgeopoint])';
  }

  _init() {
    this._startDetection = false;
    this.valid_geopoint = false;
    const fragment = document.createRange().createContextualFragment(
      `<div class="widget geopicker-widget">
          <span tabindex="-1" class="geopicker-widget-toggle-button" title="detect current location">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentcolor">
            </svg>
          </span>
          <input class="geopicker-widget-input" placeholder="Click to start location capture." type="text" readonly/>
        </div>`
    );

    this.element.classList.add("hidden");
    this.element.after(fragment);

    this.widget = this.question.querySelector(".widget");
    this.$widgetB = this.widget.querySelector(
      ".geopicker-widget-toggle-button"
    )!;
    this.$widgetB.children[0].innerHTML = GeoLocationPath;
    this.$widgetI = this.widget.querySelector(".geopicker-widget-input")!;

    this.$widgetB.addEventListener("click", () => {
      if (this.valid_geopoint) this.reset();
      else this.startDetection();
      return false;
    });

    this.$widgetI.addEventListener("click", () => {
      this.startDetection();
      return false;
    });

    this.element.addEventListener("change", (event: Event) => {
      if (event.target) {
        if (this.originalInputValue) {
          this.valid_geopoint = true;
          this.$widgetB.setAttribute("title", "reset location");
        } else {
          this.valid_geopoint = false;
          this.$widgetB.setAttribute("title", "detect current location");
        }

        this.$widgetB.children[0].innerHTML = this.valid_geopoint
          ? OkGeoLocationPath
          : GeoLocationPath;
      }
      return false;
    });

    // Set the current loaded value into the widget
    this.update();

    this.element.addEventListener("change", this.update.bind(this));

    // add event listeners for loading geopoints
    this.question.addEventListener(events.GeoDetectionStart().type, () => {
      this._startDetection = true;
    });
    this.question.addEventListener(events.GeoDetectionEnd().type, () => {
      this._startDetection = false;
    });

    this.enable();
    // It is much easier to first enable and disable, and not as bad it seems, since readonly will become dynamic eventually.
    if (this.props.readonly) {
      this.disable();
    }
  }

  /**
   * Start geo detection using the built-in browser geoLocation functionality
   * @return {Promise}
   */
  startDetection() {
    if (navigator.geolocation) {
      this.question.dispatchEvent(events.GeoDetectionStart());
      return getCurrentPosition(options)
        .then((result: EGeolocationPosition) => {
          this.question.dispatchEvent(events.GeoDetectionSuccess(result));
          this.originalInputValue = result.geopoint;
          return result;
        })
        .catch((error: GeolocationPositionError) => {
          this.question.dispatchEvent(events.GeoDetectionError(error));
          console.error(error.message);
          return error;
        })
        .finally(() => {
          this.question.dispatchEvent(events.GeoDetectionEnd());
        });
    } else {
      console.error(error_message.not_supported);
      this.question.dispatchEvent(
        events.GeoDetectionError(new Error(error_message.not_supported))
      );
      return Promise.reject();
    }
  }

  update() {
    this.value = this.originalInputValue;
  }

  reset() {
    this.originalInputValue = "";
  }

  disable() {
    this.$widgetB.classList.add("hidden");
    this.$widgetI.setAttribute("disabled", "disabled");
  }

  enabled() {
    this.$widgetB.classList.remove("hidden");
    this.$widgetI.removeAttribute("disabled");
  }

  get value() {
    return this.question.querySelector(".geopicker-widget-input")!.value;
  }

  set value(_value) {
    let value = "";
    if (_value) {
      const [lat, long] = _value.split(" ");
      value = `Latitude:${lat} Longitude:${long}`;
    }
    this.question.querySelector(".geopicker-widget-input")!.value = value;
  }
}

export default GeopickerExtended;
