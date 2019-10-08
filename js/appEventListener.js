import * as THREE from "../node_modules/three/build/three.module.js";
import EnsembleManager from "./ensembleManager.js";
import PointCloud from './pointCloud.js';
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import { contactFrequencyMapPanel, distanceMapPanel } from './gui.js';
import { pointCloud, noodle, ballAndStick, ensembleManager, sceneManager, guiManager } from "./app.js";

export const appEventListener =
    {
        receiveEvent: ({ type, data }) => {

            if ('RenderStyleDidChange' === type) {

                if (data === Noodle.getRenderStyle()) {
                    sceneManager.renderStyle = Noodle.getRenderStyle();
                    ballAndStick.hide();
                    noodle.show();
                } else {
                    sceneManager.renderStyle = BallAndStick.getRenderStyle();
                    noodle.hide();
                    ballAndStick.show();
                }

            }  else if ('DidLoadEnsembleFile' === type) {
                sceneManager.cameraLightingRig.doUpdateCameraPose = true;
                setupEnsemble({ trace: ensembleManager.currentTrace });
            } else if ('DidSelectTrace' === type) {
                setupEnsemble({ trace: ensembleManager.currentTrace });
            }

        }
    };

let setupEnsemble = ({trace}) => {

    sceneManager.dispose();
    let scene = new THREE.Scene();

    const { isPointCloud } = ensembleManager;

    if (isPointCloud) {

        sceneManager.renderStyle = PointCloud.getRenderStyle();

        pointCloud.configure(trace);
        pointCloud.addToScene(scene);

        const {min, max, center, radius} = EnsembleManager.getBoundsWithTrace(trace);
        const {position, fov} = EnsembleManager.getCameraPoseAlongAxis({ center, radius, axis: '+z', scaleFactor: 1e1 });
        sceneManager.configure({ scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov });

    } else {

        sceneManager.renderStyle = guiManager.getRenderStyle();

        const { min, max, center, radius } = EnsembleManager.getBoundsWithTrace(trace);
        const { position, fov } = EnsembleManager.getCameraPoseAlongAxis({ center, radius, axis: '+z', scaleFactor: 1e1 });

        noodle.configure(trace);
        noodle.addToScene(scene);

        ballAndStick.configure(trace);
        ballAndStick.addToScene(scene);

        sceneManager.configure({scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov});

        contactFrequencyMapPanel.updateTraceContactFrequencyCanvas(trace);
        distanceMapPanel.updateTraceDistanceCanvas(trace);
    }


};
