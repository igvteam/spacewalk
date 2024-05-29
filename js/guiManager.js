import Picker from 'vanilla-picker'
import SpacewalkEventBus from './spacewalkEventBus.js'
import { StringUtils } from 'igv-utils'
import Ribbon from "./ribbon.js";
import BallAndStick from "./ballAndStick.js";
import {rgb255String, threeJSColorToRGB255, rgb255ToThreeJSColor, rgba255String} from "./color.js"
import {ballAndStick, sceneManager, juiceboxPanel, ensembleManager, pointCloud} from "./app.js";

class GUIManager {

    constructor ({ settingsButton, $panel }) {

        settingsButton.addEventListener('click', e => {
            e.stopPropagation()
            $panel.toggle()
        })

        document.querySelector('#spacewalk-threejs-container').addEventListener('click', e => {
            e.stopPropagation()
            $panel.hide()
        })

        $panel.get(0).addEventListener(    'click', e => e.stopPropagation())
        $panel.get(0).addEventListener('mousemove', e => e.stopPropagation())

        // Configure Ground Plane Toggle
        document.querySelector(`#spacewalk_ui_manager_groundplane`).addEventListener('change', e => {
            e.stopPropagation()
            sceneManager.groundPlane.toggle()
        })

        // Configure Gnomon Toggle
        document.querySelector(`#spacewalk_ui_manager_gnomon`).addEventListener('change', e => {
            e.stopPropagation()
            sceneManager.gnomon.toggle()
        })

        const checkboxDropdown = document.querySelector('#spacewalk-viewers-dropdown-menu')
        const inputIDList = checkboxDropdown.querySelectorAll('input')

        for (let i = 0; i < inputIDList.length; i++) {

            const input = inputIDList[ i ]
            input.addEventListener('change', event => {

                event.preventDefault()
                event.stopPropagation()

                $(input).parents('.dropdown').find('.dropdown-toggle').dropdown('toggle')

                const payload = inputIDList[ i ].dataset.target
                SpacewalkEventBus.globalBus.post({ type: 'ToggleUIControl', data: { payload } })
            })

        }

        configureRenderStyleControl($('#spacewalk-render-style-ball-stick'), BallAndStick.getRenderStyle());

        configureRenderStyleControl($('#spacewalk-render-style-ribbon'), Ribbon.getRenderStyle());

        // Ball radius
        const $ball_radius_control = $('#spacewalk-ball-radius-control');
        $ball_radius_control.find('i.fa-minus-circle').on('click.spacewalk-ball-radius-minus', () => ballAndStick.updateBallRadius(-1))
        $ball_radius_control.find('i.fa-plus-circle').on('click.spacewalk-ball-radius-plus',   () => ballAndStick.updateBallRadius(1))

        // Stick radius
        const $stick_radius_control = $('#spacewalk-stick-radius-control');
        $stick_radius_control.find('i.fa-minus-circle').on('click.spacewalk-stick-radius-minus', () => {
            ballAndStick.updateStickRadius(-1);
        });
        $stick_radius_control.find('i.fa-plus-circle').on('click.spacewalk-stick-radius-plus', () => {
            ballAndStick.updateStickRadius(1);
        });

        // PointCloud Point Size
        const $point_size_control = $('#spacewalk_ui_manager_pointcloud_point_size');
        $point_size_control.find('i.fa-minus-circle').on('click.spacewalk-point-size-minus', () => {
            pointCloud.updatePointSize(-1)
        })
        $point_size_control.find('i.fa-plus-circle').on('click.spacewalk-point-size-plus', () => {
            pointCloud.updatePointSize(1)
        })

        // PointCloud Point Transparency
        const $point_transparency_control = $('#spacewalk_ui_manager_pointcloud_point_transparency');
        $point_transparency_control.find('i.fa-minus-circle').on('click.spacewalk-point-transparency-minus', () => {
            pointCloud.updatePointTransparency(-1)
        })
        $point_size_control.find('i.fa-plus-circle').on('click.spacewalk-point-transparency-plus', () => {
            pointCloud.updatePointTransparency(1)
        })

        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    receiveEvent({ type, data }) {

        if ('DidLoadEnsembleFile' === type) {

            let str;

            const { sample, genomeAssembly, chr, genomicStart, genomicEnd } = data;

            $('#spacewalk_info_panel_genome').text( genomeAssembly );

            str = `${ chr } : ${StringUtils.numberFormatter(genomicStart) } - ${ StringUtils.numberFormatter(genomicEnd) }`;
            $('#spacewalk_info_panel_locus').text( str );

            str = `Sample ${ sample }`;
            $('#spacewalk_info_panel_ensemble').text( str );

            $('#spacewalk_info_panel').show();

            if (true === ensembleManager.isPointCloud) {
                $('#spacewalk_ui_manager_render_styles').hide();
                $('#spacewalk_ui_manager_pointcloud_render_style').show();
            } else {
                $('#spacewalk_ui_manager_pointcloud_render_style').hide();
                $('#spacewalk_ui_manager_render_styles').show();
            }


        }
    }

    setRenderStyle(renderStyle) {
        const $ui_manager_panel = $('#spacewalk_ui_manager_panel');
        if (renderStyle === Ribbon.getRenderStyle()) {
            $ui_manager_panel.find('#spacewalk-render-style-ribbon').prop('checked', true);
        } else if (renderStyle === BallAndStick.getRenderStyle()) {
            $ui_manager_panel.find('#spacewalk-render-style-ball-stick').prop('checked', true);
        }
    }

    getRenderStyle() {
        const id = $('#spacewalk_ui_manager_panel').find("input:radio[name='spacewalk-render-style']:checked").attr('id');
        return 'spacewalk-render-style-ball-stick' === id ? BallAndStick.getRenderStyle() : Ribbon.getRenderStyle();
    }
}

function configureRenderStyleControl($input, renderStyle) {

    $input.val( renderStyle );

    $input.on('change.gui_manager.render_style_ball_stick', (e) => {
        e.preventDefault();
        SpacewalkEventBus.globalBus.post({ type: "RenderStyleDidChange", data: $(e.target).val() });
    });

}

// Ground Plane
export function doConfigureGroundplaneHidden() {
    const $input = $('#spacewalk_ui_manager_groundplane')
    return !($input.prop('checked'))
}

export function setGroundplaneVisibilityCheckboxStatus(status) {
    const $input = $('#spacewalk_ui_manager_groundplane')
    $input.prop('checked', status)
}

// Gnomon
export function doConfigureGnomonHidden() {
    const $input = $('#spacewalk_ui_manager_gnomon')
    return !($input.prop('checked'))
}

export function setGnomonVisibilityCheckboxStatus(status) {
    const $input = $('#spacewalk_ui_manager_gnomon')
    $input.prop('checked', status)
}

// Colorpicker
export function configureColorPicker(element, initialColor, callback) {

    const config =
        {
            parent: element,
            popup: 'right',
            editor: false,
            editorFormat: 'rgb',
            alpha: false,
            color: rgb255String(threeJSColorToRGB255(initialColor)),
            onChange: ({rgbString}) => {

                element.style.backgroundColor = rgbString

                const [ head, g, tail ] = rgbString.split(',')
                const [ unused, r ] = head.split('(')
                const [ b, dev_null ] = tail.split(')')

                callback(rgb255ToThreeJSColor(parseInt(r), parseInt(g), parseInt(b)))
            }
        }

        return new Picker(config)

}

export function updateColorPicker(picker, element, rgb) {
    const rgb255 = threeJSColorToRGB255(rgb)

    element.style.backgroundColor = rgb255String(rgb255)

    const { r, g, b } = rgb255
    picker.setColor([ r, g, b, 1 ], true)

}

export default GUIManager;
