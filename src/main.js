import { BrainsScreens } from "./BrainsScreens/BrainsScreens.js";
import { BrainsController } from "./BrainsController/BrainsController.js";
import { LearnerProfile } from "./LearnerWorkspace/LearnerProfile.js";
import { LocalStorageGateway } from "./LocalStorageGateway/LocalStorageGateway.js";
import "./BrainsScreens/styles.css";

const workspace = new LearnerProfile(new LocalStorageGateway());
const screens = new BrainsScreens(document.querySelector("#app"));
const controller = new BrainsController(workspace, screens);
controller.start();

if (import.meta.hot) import.meta.hot.dispose(() => controller.destroy());
