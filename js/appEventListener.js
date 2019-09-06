import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import PointCloud from './pointCloud.js';
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import { contactFrequencyMapPanel, distanceMapPanel, guiManager } from './gui.js';
import { getTraceDistanceCanvas } from "./distanceMapPanel.js";

export const appEventListener =
    {
        receiveEvent: ({ type, data }) => {

            if ('RenderStyleDidChange' === type) {

                if (data === Noodle.getRenderStyle()) {
                    Globals.sceneManager.renderStyle = Noodle.getRenderStyle();
                    Globals.ballAndStick.hide();
                    Globals.noodle.show();
                } else {
                    Globals.sceneManager.renderStyle = BallAndStick.getRenderStyle();
                    Globals.noodle.hide();
                    Globals.ballAndStick.show();
                }

            }  else if ('DidLoadPointCloudFile' === type) {

                setupPointCloud(Globals.pointCloudManager.list);

            }  else if ('DidLoadEnsembleFile' === type) {

                const { initialKey } = data;
                let trace = Globals.ensembleManager.getTraceWithName(initialKey);

                Globals.ensembleManager.currentTrace = trace;
                Globals.sceneManager.cameraLightingRig.doUpdateCameraPose = true;

                setupEnsemble({trace});

            } else if ('DidSelectStructure' === type) {

                let trace = Globals.ensembleManager.getTraceWithName(data);
                Globals.ensembleManager.currentTrace = trace;
                setupEnsemble({trace});
            }

        }
    };

let setupPointCloud = points => {

    Globals.sceneManager.dispose();

    Globals.sceneManager.renderStyle = PointCloud.getRenderStyle();

    Globals.pointCloud.configure(points);

    let scene = new THREE.Scene();
    Globals.pointCloud.addToScene(scene);

    const {min, max, center, radius} = Globals.pointCloud.getBounds();
    const {position, fov} = Globals.pointCloud.getCameraPoseAlongAxis({axis: '+z', scaleFactor: 3});
    Globals.sceneManager.configure({ scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov });

};

let setupEnsemble = ({trace}) => {

    Globals.sceneManager.dispose();

    Globals.sceneManager.renderStyle = guiManager.getRenderingStyle();

    Globals.noodle.configure(trace);

    Globals.ballAndStick.configure(trace);

    let scene = new THREE.Scene();
    Globals.noodle.addToScene(scene);
    Globals.ballAndStick.addToScene(scene);

    const { min, max, center, radius } = Globals.ballAndStick.getBounds();
    const { position, fov } = Globals.ballAndStick.getCameraPoseAlongAxis({ axis: '+z', scaleFactor: 3 });
    Globals.sceneManager.configure({scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov});

    getTraceDistanceCanvas(trace, distanceMapPanel.mapCanvas);
    distanceMapPanel.drawTraceDistanceCanvas(distanceMapPanel.mapCanvas);

    contactFrequencyMapPanel.getTraceContactFrequencyCanvas(trace);
    contactFrequencyMapPanel.drawTraceContactFrequency(contactFrequencyMapPanel.mapCanvas);

};
