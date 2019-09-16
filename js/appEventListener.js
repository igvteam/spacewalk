import * as THREE from "../node_modules/three/build/three.module.js";
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

            }  else if ('DidLoadPointCloudFile' === type) {

                setupPointCloud(globals.pointCloudManager.list);

            }  else if ('DidLoadEnsembleFile' === type) {

                const { initialKey } = data;
                let trace = globals.ensembleManager.getTraceWithName(initialKey);

                globals.ensembleManager.currentTrace = trace;
                globals.sceneManager.cameraLightingRig.doUpdateCameraPose = true;

                setupEnsemble({trace});

            } else if ('DidSelectTrace' === type) {

                let trace = globals.ensembleManager.getTraceWithName(data);
                globals.ensembleManager.currentTrace = trace;
                setupEnsemble({trace});
            }

        }
    };

let setupPointCloud = points => {

    globals.sceneManager.dispose();

    globals.sceneManager.renderStyle = PointCloud.getRenderStyle();

    globals.pointCloud.configure(points);

    let scene = new THREE.Scene();
    globals.pointCloud.addToScene(scene);

    const {min, max, center, radius} = globals.pointCloud.getBounds();
    const {position, fov} = globals.pointCloud.getCameraPoseAlongAxis({axis: '+z', scaleFactor: 3});
    globals.sceneManager.configure({ scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov });

};

let setupEnsemble = ({trace}) => {

    globals.sceneManager.dispose();

    globals.sceneManager.renderStyle = guiManager.getRenderStyle();

    globals.noodle.configure(trace);

    globals.ballAndStick.configure(trace);

    let scene = new THREE.Scene();
    globals.noodle.addToScene(scene);
    globals.ballAndStick.addToScene(scene);

    const { min, max, center, radius } = globals.ballAndStick.getBounds();
    const { position, fov } = globals.ballAndStick.getCameraPoseAlongAxis({ axis: '+z', scaleFactor: 3 });
    globals.sceneManager.configure({scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov});

    contactFrequencyMapPanel.updateTraceContactFrequencyCanvas(trace);

    distanceMapPanel.updateTraceDistanceCanvas(trace);

};
