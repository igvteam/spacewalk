import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import PointCloud from './pointCloud.js';
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import { hideSpinner, showSpinner, contactFrequencyMapPanel, distanceMapPanel, guiManager, juiceboxPanel } from './gui.js';
import { getTraceDistanceCanvas } from "./distanceMapPanel.js";
import { getTraceContactFrequencyCanvas } from "./contactFrequencyMapPanel.js";

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

                // if (false === thumbnailPanel.isHidden) {
                //     const model = Globals.sceneManager.renderStyle === Noodle.getRenderStyle() ? Globals.noodle : Globals.ballAndStick;
                //     thumbnailPanel.configure(model);
                //     thumbnailPanel.render();
                // }

            }  else if ('DidLoadPointCloudFile' === type || 'DidLoadFile' === type) {

                const { genomeID, chr, genomicStart, genomicEnd, initialKey } = data;

                $('#spacewalk_info_panel_genome').text( genomeID );
                $('#spacewalk_info_panel_locus').text( Globals.parser.locusBlurb() );
                $('#spacewalk_info_panel_juicebox').text( juiceboxPanel.blurb() );

                if ('DidLoadPointCloudFile' === type) {

                    $('#spacewalk_info_panel_ensemble').text( '-' );

                    setupPointCloud(Globals.pointCloudManager.list.map(o => o.geometry));
                } else {

                    $('#spacewalk_info_panel_ensemble').text( Globals.parser.sampleBlurb() );

                    let trace = Globals.ensembleManager.getTraceWithName(initialKey);
                    Globals.ensembleManager.currentTrace = trace;
                    Globals.sceneManager.cameraLightingRig.doUpdateCameraPose = true;
                    setup({ trace });
                }

            } else if ('DidSelectStructure' === type) {

                let trace = Globals.ensembleManager.getTraceWithName(data);
                Globals.ensembleManager.currentTrace = trace;
                setup({ trace });
            }

        }
    };

let setupPointCloud = (geometryList) => {

    showSpinner();
    window.setTimeout(() => {

        Globals.sceneManager.dispose();

        Globals.sceneManager.renderStyle = PointCloud.getRenderStyle();

        Globals.pointCloud.configure(geometryList);

        hideSpinner();
    }, 0);


    showSpinner();
    window.setTimeout(() => {

        let scene = new THREE.Scene();

        Globals.pointCloud.addToScene(scene);

        const {min, max, center, radius} = Globals.pointCloud.getBounds();
        const {position, fov} = Globals.pointCloud.getCameraPoseAlongAxis({axis: '+z', scaleFactor: 3});
        Globals.sceneManager.configure({ scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov });

        hideSpinner();
    }, 0);
};

let setup = ({ trace }) => {

    showSpinner();
    window.setTimeout(() => {

        Globals.sceneManager.dispose();

        Globals.sceneManager.renderStyle = guiManager.getRenderingStyle();

        Globals.noodle.configure(trace);

        Globals.ballAndStick.configure(trace);

        hideSpinner();
    }, 0);

    showSpinner();
    window.setTimeout(() => {

        let scene = new THREE.Scene();

        Globals.noodle.addToScene(scene);
        Globals.ballAndStick.addToScene(scene);

        const { min, max, center, radius } = Globals.ballAndStick.getBounds();
        const { position, fov } = Globals.ballAndStick.getCameraPoseAlongAxis({ axis: '+z', scaleFactor: 3 });
        Globals.sceneManager.configure({scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov});

        hideSpinner();
    }, 0);

    showSpinner();
    window.setTimeout(() => {

        getTraceDistanceCanvas(trace, distanceMapPanel.mapCanvas);
        distanceMapPanel.drawTraceDistanceCanvas(distanceMapPanel.mapCanvas);

        let canvas = getTraceContactFrequencyCanvas(trace, contactFrequencyMapPanel.distanceThreshold);
        contactFrequencyMapPanel.drawTraceContactFrequency(canvas);

        hideSpinner();
    }, 0);

};
