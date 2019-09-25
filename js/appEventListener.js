import * as THREE from "../node_modules/three/build/three.module.js";
import EnsembleManager from "./ensembleManager.js";
import PointCloud from './pointCloud.js';
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import { contactFrequencyMapPanel, distanceMapPanel, guiManager } from './gui.js';
import { globals } from "./app.js";

export const appEventListener =
    {
        receiveEvent: ({ type, data }) => {

            if ('RenderStyleDidChange' === type) {

                if (data === Noodle.getRenderStyle()) {
                    globals.sceneManager.renderStyle = Noodle.getRenderStyle();
                    globals.ballAndStick.hide();
                    globals.noodle.show();
                } else {
                    globals.sceneManager.renderStyle = BallAndStick.getRenderStyle();
                    globals.noodle.hide();
                    globals.ballAndStick.show();
                }

            }  else if ('DidLoadEnsembleFile' === type) {
                globals.sceneManager.cameraLightingRig.doUpdateCameraPose = true;
                setupEnsemble({ trace: globals.ensembleManager.currentTrace });
            } else if ('DidSelectTrace' === type) {
                setupEnsemble({ trace: globals.ensembleManager.currentTrace });
            }

        }
    };

let setupEnsemble = ({trace}) => {

    globals.sceneManager.dispose();
    let scene = new THREE.Scene();

    const { isPointCloud } = globals.ensembleManager;

    if (isPointCloud) {

        globals.sceneManager.renderStyle = PointCloud.getRenderStyle();

        globals.pointCloud.configure(trace);
        globals.pointCloud.addToScene(scene);

        const {min, max, center, radius} = EnsembleManager.getBoundsWithTrace(trace);
        const {position, fov} = EnsembleManager.getCameraPoseAlongAxis({ trace, axis: '+z', scaleFactor: 3 });
        globals.sceneManager.configure({ scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov });

    } else {

        globals.sceneManager.renderStyle = guiManager.getRenderStyle();

        const { min, max, center, radius } = EnsembleManager.getBoundsWithTrace(trace);
        const { position, fov } = EnsembleManager.getCameraPoseAlongAxis({ trace, axis: '+z', scaleFactor: 3 });

        globals.noodle.configure(trace);
        globals.noodle.addToScene(scene);

        globals.ballAndStick.configure(trace);
        globals.ballAndStick.addToScene(scene);

        globals.sceneManager.configure({scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov});

        contactFrequencyMapPanel.updateTraceContactFrequencyCanvas(trace);
        distanceMapPanel.updateTraceDistanceCanvas(trace);
    }


};
