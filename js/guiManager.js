import SpacewalkEventBus from './spacewalkEventBus.js'
import { StringUtils } from 'igv-utils'
import Ribbon from "./ribbon.js";
import BallAndStick from "./ballAndStick.js";
import { scaleBarService, ballAndStick, sceneManager, ensembleManager, pointCloud } from "./app.js";

class GUIManager {

    constructor ({ settingsButton, panel }) {

        settingsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';
        });

        document.querySelector('#spacewalk-threejs-container').addEventListener('click', (e) => {
            e.stopPropagation();
            panel.style.display = 'none';
        });

        panel.addEventListener('click', (e) => e.stopPropagation());
        panel.addEventListener('mousemove', (e) => e.stopPropagation());

        // Configure Ground Plane Toggle
        document.querySelector(`#spacewalk_ui_manager_groundplane`).addEventListener('change', e => {
            e.stopPropagation()
            sceneManager.getGroundPlane().toggle()
        })

        // Configure Gnomon Toggle
        document.querySelector(`#spacewalk_ui_manager_gnomon`).addEventListener('change', e => {
            e.stopPropagation()
            sceneManager.getGnomon().toggle()
        })

        // Configure Ruler Toggle
        scaleBarService.configureGUI(document.querySelector(`#spacewalk_ui_manager_scale_bars`))

        const checkboxDropdown = document.querySelector('#spacewalk-viewers-dropdown-menu')
        const inputIDList = checkboxDropdown.querySelectorAll('input')

        for (let i = 0; i < inputIDList.length; i++) {

            const input = inputIDList[ i ]
            input.addEventListener('change', event => {

                event.preventDefault()
                event.stopPropagation()

                const dropdown = input.closest('.dropdown');
                const toggleButton = dropdown ? dropdown.querySelector('.dropdown-toggle') : null;
                if (toggleButton && typeof bootstrap !== 'undefined' && bootstrap.Dropdown) {
                    const dropdownInstance = bootstrap.Dropdown.getOrCreateInstance(toggleButton);
                    dropdownInstance.toggle();
                }


                const payload = inputIDList[ i ].dataset.target
                SpacewalkEventBus.globalBus.post({ type: 'ToggleUIControl', data: { payload } })
            })

        }

        configureRenderStyleControl(document.getElementById('spacewalk-render-style-ball-stick'), BallAndStick.renderStyle);

        configureRenderStyleControl(document.getElementById('spacewalk-render-style-ribbon'), Ribbon.renderStyle);

        // Ball radius
        const ballRadiusControl = document.getElementById('spacewalk-ball-radius-control');
        ballRadiusControl.querySelector('i.fa-minus-circle').addEventListener('click', () => ballAndStick.updateBallRadius(-1));
        ballRadiusControl.querySelector('i.fa-plus-circle').addEventListener('click', () => ballAndStick.updateBallRadius(1));

        // Stick radius
        const stickRadiusControl = document.getElementById('spacewalk-stick-radius-control');
        stickRadiusControl.querySelector('i.fa-minus-circle').addEventListener('click', () => {
            ballAndStick.updateStickRadius(-1);
        });
        stickRadiusControl.querySelector('i.fa-plus-circle').addEventListener('click', () => {
            ballAndStick.updateStickRadius(1);
        });

        // PointCloud Point Size
        const pointSizeControl = document.getElementById('spacewalk_ui_manager_pointcloud_point_size');
        pointSizeControl.querySelector('i.fa-minus-circle').addEventListener('click', () => pointCloud.updatePointSize(-1));
        pointSizeControl.querySelector('i.fa-plus-circle').addEventListener('click', () => pointCloud.updatePointSize(1));

        // PointCloud Point Transparency
        const pointTransparencyControl = document.getElementById('spacewalk_ui_manager_pointcloud_point_transparency');
        pointTransparencyControl.querySelector('i.fa-minus-circle').addEventListener('click', () => pointCloud.updatePointTransparency(-1));
        pointTransparencyControl.querySelector('i.fa-plus-circle').addEventListener('click', () => pointCloud.updatePointTransparency(1));

        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);
        SpacewalkEventBus.globalBus.subscribe('DidSelectEnsembleGroup', this);

    }

    receiveEvent({ type, data }) {

        if ('DidLoadEnsembleFile' === type) {

            let str;

            const { sample, genomeAssembly, chr, genomicStart, genomicEnd } = data;

            document.getElementById('spacewalk_info_panel_genome').textContent = genomeAssembly;

            str = `${chr} : ${StringUtils.numberFormatter(genomicStart)} - ${StringUtils.numberFormatter(genomicEnd)}`;
            document.getElementById('spacewalk_info_panel_locus').textContent = str;

            document.getElementById('spacewalk_info_panel').style.display = 'flex';

            if (ensembleManager.isPointCloud === true) {
                document.getElementById('spacewalk_ui_manager_render_styles').style.display = 'none';
                document.getElementById('spacewalk_ui_manager_pointcloud_render_style').style.display = 'block';
            } else {
                document.getElementById('spacewalk_ui_manager_pointcloud_render_style').style.display = 'none';
                document.getElementById('spacewalk_ui_manager_render_styles').style.display = 'block';
            }

        } else if ('DidSelectEnsembleGroup' === type) {
            const el = document.getElementById('spacewalk_info_panel_ensemble_group');
            el.innerText = data;
            el.style.display = 'block';
        }
    }
}

function configureRenderStyleControl(input, renderStyle) {

    input.value = renderStyle;

    input.addEventListener('change', (e) => {
        e.preventDefault();
        SpacewalkEventBus.globalBus.post({ type: "RenderStyleDidChange", data: e.target.value })
    });

}

function setRenderStyle(renderStyle) {
    const uiManagerPanel = document.getElementById('spacewalk_ui_manager_panel');
    if (renderStyle === Ribbon.renderStyle) {
        const ribbonRadio = uiManagerPanel.querySelector('#spacewalk-render-style-ribbon');
        if (ribbonRadio) {
            ribbonRadio.checked = true;
        }
    } else if (renderStyle === BallAndStick.renderStyle) {
        const ballStickRadio = uiManagerPanel.querySelector('#spacewalk-render-style-ball-stick');
        if (ballStickRadio) {
            ballStickRadio.checked = true;
        }
    }
}

function getRenderStyle() {
    const uiManagerPanel = document.getElementById('spacewalk_ui_manager_panel');
    const checkedInput = uiManagerPanel.querySelector("input[name='spacewalk-render-style']:checked");
    const id = checkedInput ? checkedInput.id : null;
    return id === 'spacewalk-render-style-ball-stick' ? BallAndStick.renderStyle : Ribbon.renderStyle;
}

export { setRenderStyle, getRenderStyle }

export default GUIManager;
