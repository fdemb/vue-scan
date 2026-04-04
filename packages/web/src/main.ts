import { createApp } from "vue";
import { startTracking } from "@fdemb1/vue-scan";
import "@fontsource-variable/dm-sans/wght.css";
import "./style.css";
import App from "./App.vue";

startTracking();

createApp(App).mount("#app");
