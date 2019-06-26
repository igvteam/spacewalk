import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import PointCloud from './pointCloud.js';
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import { contactFrequencyMapPanel, distanceMapPanel, guiManager, thumbnailPanel, traceSelectPanel } from './gui.js';
import { getTraceDistanceMapCanvas, getTraceContactFrequenceCanvas } from "./ensembleManager.js";

export const appEventListener =
    {
        receiveEvent: async ({ type, data }) => {

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

                // if (false === thumbnailPanel.isHidden) {
                //     const model = Globals.sceneManager.renderStyle === Noodle.getRenderStyle() ? Globals.noodle : Globals.ballAndStick;
                //     thumbnailPanel.configure(model);
                //     thumbnailPanel.render();
                // }

            }  else if ('DidLoadPointCloudFile' === type) {

                setupPointCloud(Globals.pointCloudManager.list.map(o => o.geometry));

            } else if ('DidLoadFile' === type) {

                // const str = 'STRUCTURE: CHR ' + chr + ' ' + Math.floor(genomicStart/1e6) + 'MB to ' + Math.floor(genomicEnd/1e6) + 'MB';
                // $('.navbar').find('#spacewalk-file-name').text(str);

                const { initialKey } = data;
                let trace = Globals.ensembleManager.getTraceWithName(initialKey);
                Globals.ensembleManager.currentTrace = trace;
                setup({ trace });

            } else if ('DidSelectStructure' === type) {

                let trace = Globals.ensembleManager.getTraceWithName(data);
                Globals.ensembleManager.currentTrace = trace;
                setup({ trace });

            } else if ('ToggleAllUIControls' === type) {
                // $('.navbar').toggle();
            }

        }
    };

let setupPointCloud = (geometryList) => {

    Globals.sceneManager.dispose();

    Globals.sceneManager.renderStyle = PointCloud.getRenderStyle();

    Globals.pointCloud.configure(geometryList);

    let scene = new THREE.Scene();
    Globals.pointCloud.addToScene(scene);

    const { min, max, center, radius } = Globals.pointCloud.getBounds();
    const { position, fov } = Globals.pointCloud.getCameraPoseAlongAxis({ axis: '+z', scaleFactor: 3 });
    Globals.sceneManager.configure({scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov});

};

let setup = ({ trace }) => {

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

    // if (false === thumbnailPanel.isHidden) {
    //     const model = Globals.sceneManager.renderStyle === Noodle.getRenderStyle() ? Globals.noodle : Globals.ballAndStick;
    //     thumbnailPanel.configure(model);
    //     thumbnailPanel.render();
    // }

    distanceMapPanel.drawTraceDistanceCanvas(getTraceDistanceMapCanvas(trace));
    contactFrequencyMapPanel.drawTraceContactFrequency(getTraceContactFrequenceCanvas(trace, contactFrequencyMapPanel.distanceThreshold));
};
