import L from "leaflet";

const india_bounds = new L.LatLngBounds(
  new L.LatLng(8, 68.1097),
  new L.LatLng(37.32, 97.395358)
);
const zoom = india_bounds.getNorthWest().lat < 10 ? 4 : 5;
export default /** @type {const} */ {
  experimentalOptimizations: {
    /**
     * When set to `true`, recomputations of the evaluation cascade will be performed
     * asynchronously to reduce time spent blocking UI updates. This may be improve
     * perceived performance on large forms with complex chained computations. These
     * computations are technically delayed and will perform more slowly, but their
     * corresponding UI updates will render more quickly as each step in the chain of
     * computations completes.
     */
    computeAsync: window.location.search.includes("&computeAsync"),
  },

  /**
   * When set to `true`, non-relevant values will be treated as blank. This behavior
   * is largely consistent with JavaRosa.
   */
  excludeNonRelevant: window.location.search.includes("&excludeNonRelevant"),

  maps: [
    {
      tiles: [
        "https://www.google.co.in/maps/vt?lyrs=r&gl=in&x={x}&y={y}&z={z}",
      ],
      attributionControl: false,
      name: "streets",
      center: india_bounds.getCenter(),
      maxBounds: india_bounds,
      zoom,
    },
  ],
  googleApiKey: "",
  repeatOrdinals: false,
  validateContinuously: false,
  validatePage: false,
  swipePage: true,
  textMaxChars: 2000,
};
