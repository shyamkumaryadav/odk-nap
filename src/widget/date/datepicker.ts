import Widget from "enketo-core/src/js/widget";
import Datepicker, { DatepickerOptions } from "vanillajs-datepicker/Datepicker";

const DateCalenderIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentcolor">
<path d="M8 5.75C7.59 5.75 7.25 5.41 7.25 5V2C7.25 1.59 7.59 1.25 8 1.25C8.41 1.25 8.75 1.59 8.75 2V5C8.75 5.41 8.41 5.75 8 5.75Z"/>
<path d="M16 5.75C15.59 5.75 15.25 5.41 15.25 5V2C15.25 1.59 15.59 1.25 16 1.25C16.41 1.25 16.75 1.59 16.75 2V5C16.75 5.41 16.41 5.75 16 5.75Z"/>
<path d="M8.5 14.5003C8.37 14.5003 8.24 14.4703 8.12 14.4203C7.99 14.3703 7.89 14.3003 7.79 14.2103C7.61 14.0203 7.5 13.7703 7.5 13.5003C7.5 13.3703 7.53 13.2403 7.58 13.1203C7.63 13.0003 7.7 12.8903 7.79 12.7903C7.89 12.7003 7.99 12.6303 8.12 12.5803C8.48 12.4303 8.93 12.5103 9.21 12.7903C9.39 12.9803 9.5 13.2403 9.5 13.5003C9.5 13.5603 9.49 13.6303 9.48 13.7003C9.47 13.7603 9.45 13.8203 9.42 13.8803C9.4 13.9403 9.37 14.0003 9.33 14.0603C9.3 14.1103 9.25 14.1603 9.21 14.2103C9.02 14.3903 8.76 14.5003 8.5 14.5003Z"/>
<path d="M12 14.4999C11.87 14.4999 11.74 14.4699 11.62 14.4199C11.49 14.3699 11.39 14.2999 11.29 14.2099C11.11 14.0199 11 13.7699 11 13.4999C11 13.3699 11.03 13.2399 11.08 13.1199C11.13 12.9999 11.2 12.8899 11.29 12.7899C11.39 12.6999 11.49 12.6299 11.62 12.5799C11.98 12.4199 12.43 12.5099 12.71 12.7899C12.89 12.9799 13 13.2399 13 13.4999C13 13.5599 12.99 13.6299 12.98 13.6999C12.97 13.7599 12.95 13.8199 12.92 13.8799C12.9 13.9399 12.87 13.9999 12.83 14.0599C12.8 14.1099 12.75 14.1599 12.71 14.2099C12.52 14.3899 12.26 14.4999 12 14.4999Z"/>
<path d="M15.5 14.4999C15.37 14.4999 15.24 14.4699 15.12 14.4199C14.99 14.3699 14.89 14.2999 14.79 14.2099C14.75 14.1599 14.71 14.1099 14.67 14.0599C14.63 13.9999 14.6 13.9399 14.58 13.8799C14.55 13.8199 14.53 13.7599 14.52 13.6999C14.51 13.6299 14.5 13.5599 14.5 13.4999C14.5 13.2399 14.61 12.9799 14.79 12.7899C14.89 12.6999 14.99 12.6299 15.12 12.5799C15.49 12.4199 15.93 12.5099 16.21 12.7899C16.39 12.9799 16.5 13.2399 16.5 13.4999C16.5 13.5599 16.49 13.6299 16.48 13.6999C16.47 13.7599 16.45 13.8199 16.42 13.8799C16.4 13.9399 16.37 13.9999 16.33 14.0599C16.3 14.1099 16.25 14.1599 16.21 14.2099C16.02 14.3899 15.76 14.4999 15.5 14.4999Z"/>
<path d="M8.5 18.0001C8.37 18.0001 8.24 17.9702 8.12 17.9202C8 17.8702 7.89 17.8001 7.79 17.7101C7.61 17.5201 7.5 17.2601 7.5 17.0001C7.5 16.8701 7.53 16.7401 7.58 16.6201C7.63 16.4901 7.7 16.3802 7.79 16.2902C8.16 15.9202 8.84 15.9202 9.21 16.2902C9.39 16.4802 9.5 16.7401 9.5 17.0001C9.5 17.2601 9.39 17.5201 9.21 17.7101C9.02 17.8901 8.76 18.0001 8.5 18.0001Z"/>
<path d="M12 18.0001C11.74 18.0001 11.48 17.8901 11.29 17.7101C11.11 17.5201 11 17.2601 11 17.0001C11 16.8701 11.03 16.7401 11.08 16.6201C11.13 16.4901 11.2 16.3802 11.29 16.2902C11.66 15.9202 12.34 15.9202 12.71 16.2902C12.8 16.3802 12.87 16.4901 12.92 16.6201C12.97 16.7401 13 16.8701 13 17.0001C13 17.2601 12.89 17.5201 12.71 17.7101C12.52 17.8901 12.26 18.0001 12 18.0001Z"/>
<path d="M15.5 17.9999C15.24 17.9999 14.98 17.8899 14.79 17.7099C14.7 17.6199 14.63 17.5099 14.58 17.3799C14.53 17.2599 14.5 17.1299 14.5 16.9999C14.5 16.8699 14.53 16.7399 14.58 16.6199C14.63 16.4899 14.7 16.3799 14.79 16.2899C15.02 16.0599 15.37 15.9499 15.69 16.0199C15.76 16.0299 15.82 16.0499 15.88 16.0799C15.94 16.0999 16 16.1299 16.06 16.1699C16.11 16.1999 16.16 16.2499 16.21 16.2899C16.39 16.4799 16.5 16.7399 16.5 16.9999C16.5 17.2599 16.39 17.5199 16.21 17.7099C16.02 17.8899 15.76 17.9999 15.5 17.9999Z"/>
<path d="M20.5 9.83984H3.5C3.09 9.83984 2.75 9.49984 2.75 9.08984C2.75 8.67984 3.09 8.33984 3.5 8.33984H20.5C20.91 8.33984 21.25 8.67984 21.25 9.08984C21.25 9.49984 20.91 9.83984 20.5 9.83984Z"/>
<path d="M16 22.75H8C4.35 22.75 2.25 20.65 2.25 17V8.5C2.25 4.85 4.35 2.75 8 2.75H16C19.65 2.75 21.75 4.85 21.75 8.5V17C21.75 20.65 19.65 22.75 16 22.75ZM8 4.25C5.14 4.25 3.75 5.64 3.75 8.5V17C3.75 19.86 5.14 21.25 8 21.25H16C18.86 21.25 20.25 19.86 20.25 17V8.5C20.25 5.64 18.86 4.25 16 4.25H8Z"/>
</svg>`;

/* The `DatepickerExtended` class is a TypeScript class that extends the `Widget` class and provides
 * additional functionality for a datepicker widget.
 */
class DatepickerExtended extends Widget {
  settings: DatepickerOptions;

  constructor(element: Element, options: {}) {
    super(element, options);
    this.settings = {};
  }

  static get selector() {
    return '.question input[type="date"]';
  }

  _init() {
    const [settings, placeholder]: [DatepickerOptions, string] =
      this.props.appearances.includes("year")
        ? [
            {
              format: "yyyy",
              pickLevel: 2,
            },
            "YYYY",
          ]
        : this.props.appearances.includes("month-year")
        ? [
            {
              format: "M yyyy",
              pickLevel: 1,
            },
            "MMM YYYY",
          ]
        : [
            {
              format: "M dd yyyy",
            },
            "MMM DD YYYY",
          ];
    if (this.props.appearances.includes("max_today"))
      settings.maxDate = new Date();

    this.settings = settings;
    const fragment = document.createRange().createContextualFragment(
      `<div class="widget datepicker-widget">
          <span tabindex="-1" class="datepicker-widget-toggle-button" title="Datepicker">
            ${DateCalenderIcon}
          </span>
          <input class="datepicker-widget-input" type="text" readonly placeholder="${placeholder}" />
        </div>`
    );

    this.element.classList.add("hidden");
    this.element.after(fragment);

    this.widget = this.question.querySelector(".widget");
    this.$widgetB = this.widget.querySelector(
      ".datepicker-widget-toggle-button"
    );
    this.$widgetI = this.widget.querySelector(".datepicker-widget-input");

    this.$datepicker = new Datepicker(this.$widgetI, {
      clearButton: true,
      todayButton: true,
      todayButtonMode: 1,
      todayHighlight: true,
      autohide: true,
      // showOnClick: false,
      showOnFocus: false,
      // defaultViewDate
      ...this.settings,
    });

    this.$widgetB.addEventListener("click", () => {
      this.$datepicker.show();
      return false;
    });

    // Set the current loaded value into the widget
    this.update();

    // add change listener to widget and update original input value
    this.$widgetI.addEventListener("changeDate", () => {
      this.originalInputValue = this.$datepicker.getDate("yyyy-mm-dd") || "";
      return false;
    });

    this._setFocusHandler(this.$widgetI);

    this.$widgetB.classList.remove("hidden");
    this.$widgetI.removeAttribute("disabled");
    // It is much easier to first enable and disable, and not as bad it seems, since readonly will become dynamic eventually.
    if (this.props.readonly) {
      this.$widgetB.classList.add("hidden");
      this.$widgetI.setAttribute("disabled", "disabled");
    }
  }

  update() {
    this.$datepicker.setDate(new Date(this.originalInputValue));
  }

  /**
   * Handler for focus events.
   * These events on the original input are used to check whether to display the 'required' message
   *
   * @param {HTMLElement} $fakeDateI - Fake date input element
   */
  _setFocusHandler($fakeDateI: HTMLElement) {
    // Handle focus on original input (goTo functionality)
    this.element.addEventListener("applyfocus", () => {
      $fakeDateI.focus();
    });
  }

  get value() {
    return this.$widgetI.textContent;
  }

  set value(value) {
    this.$widgetI.value = value;
  }
}

export default DatepickerExtended;
