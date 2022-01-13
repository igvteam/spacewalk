import SpacewalkEventBus from './spacewalkEventBus.js'
import { StringUtils } from 'igv-utils'
import Ribbon from "./ribbon.js";
import BallAndStick from "./ballAndStick.js";
import { rgb255String, threeJSColorToRGB255, rgb255ToThreeJSColor } from "./color.js";
import { ballAndStick, sceneManager, juiceboxPanel, ensembleManager } from "./app.js";
import {exp} from "three/examples/jsm/renderers/nodes/ShaderNode"

const zIndexPanelSelected = 1124;
const zIndexPanelUnselected = 1024;

class GUIManager {

    constructor ({ $button, $panel }) {

        $button.on('click.gui_manager', (e) => {
            e.preventDefault();
            e.stopPropagation()
            $panel.toggle();
        });

        let $widgetPanels = undefined;
        $panel.find('input[data-target]').each(function(){
            const selectionString = `#${ $(this).attr('data-target') }`;
            $widgetPanels = undefined === $widgetPanels ? $(selectionString) : $widgetPanels.add($(selectionString));
        });

        // Add scene container
        // $widgetPanels = $widgetPanels.add( $(sceneManager.container) );

        this.$widgetPanels = $widgetPanels;

        const input_id_list =
            [
                'spacewalk_ui_manager_groundplane',
                'spacewalk_ui_manager_gnomon',

                'spacewalk_ui_manager_ui_controls_trace_select',
                'spacewalk_ui_manager_ui_controls_juicebox',
                'spacewalk_ui_manager_ui_controls_igv',
                'spacewalk_ui_manager_ui_controls_distance_map',
                'spacewalk_ui_manager_ui_controls_contact_frequency_map'
            ];

        configureVisibilityControl(input_id_list, $panel);

        configureRenderStyleControl($panel.find('#spacewalk-render-style-ball-stick'), BallAndStick.getRenderStyle());

        configureRenderStyleControl($panel.find('#spacewalk-render-style-ribbon'), Ribbon.getRenderStyle());

        // ball radius
        const $ball_radius_control = $('#spacewalk-ball-radius-control');

        $ball_radius_control.find('i.fa-minus-circle').on('click.spacewalk-ball-radius-minus', () => {
            ballAndStick.updateBallRadius(-1);
        });

        $ball_radius_control.find('i.fa-plus-circle').on('click.spacewalk-ball-radius-plus', () => {
            ballAndStick.updateBallRadius(1);
        });

        // stick radius
        const $stick_radius_control = $('#spacewalk-stick-radius-control');

        $stick_radius_control.find('i.fa-minus-circle').on('click.spacewalk-stick-radius-minus', () => {
            ballAndStick.updateStickRadius(-1);
        });

        $stick_radius_control.find('i.fa-plus-circle').on('click.spacewalk-stick-radius-plus', () => {
            ballAndStick.updateStickRadius(1);
        });

        SpacewalkEventBus.globalBus.subscribe("DidSelectPanel", this);
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    receiveEvent({ type, data }) {

        if ('DidSelectPanel' === type) {

            const $selected = data;
            const $unselected = this.$widgetPanels.not($selected);
            $selected.css('zIndex', zIndexPanelSelected);
            $unselected.css('zIndex', zIndexPanelUnselected);

        } else if ('DidLoadEnsembleFile' === type) {

            let str;

            const { sample, genomeAssembly, chr, genomicStart, genomicEnd } = data;

            $('#spacewalk_info_panel_genome').text( genomeAssembly );

            str = `${ chr } : ${StringUtils.numberFormatter(genomicStart) } - ${ StringUtils.numberFormatter(genomicEnd) }`;
            $('#spacewalk_info_panel_locus').text( str );

            str = `Sample ${ sample }`;
            $('#spacewalk_info_panel_ensemble').text( str );

            $('#spacewalk_info_panel_juicebox').text(juiceboxPanel.blurb());

            $('#spacewalk_info_panel').show();

            if (true === ensembleManager.isPointCloud) {
                $('#spacewalk_ui_manager_render_styles').hide();
            } else {
                $('#spacewalk_ui_manager_render_styles').show();
            }


        }
    }

}

export function renderSettingsPanelTemplate () {
    const html = `<div id="spacewalk-render-settings-panel-template" class="popover" role="tooltip">
    <div class="arrow"></div>
    <h3 class="popover-header"></h3>
    <div class="popover-body"></div>
</div>`

    return html
}
export function GUIPanelMarkup () {

    const _html =
        `<ul class="list-group list-group-flush">
    <li class="list-group-item">An item</li>
    <li class="list-group-item">A second item</li>
    <li class="list-group-item">A third item</li>
  </ul>`

    const html =

        `<ul class="list-group list-group-flush">

          <!-- render style -->
          <li id="spacewalk_ui_manager_render_styles" class="list-group-item">
            <div>

              <div class="form-check">
                <input name="spacewalk-render-style" id="spacewalk-render-style-ball-stick" class="form-check-input" type="radio" checked>
                <label class="form-check-label" for="spacewalk-render-style-ball-stick">Ball & Stick</label>
              </div>

              <div id="spacewalk-ball-radius-control" class="spacewalk-ball-stick-control">
                <div>
                  Ball Radius
                </div>
                <div>
                  <i class="fas fa-minus-circle"></i>
                  <i class="fas fa-plus-circle"></i>
                </div>
              </div>

              <div id="spacewalk-stick-radius-control" class="spacewalk-ball-stick-control">
                <div>
                  Stick Radius
                </div>
                <div>
                  <i class="fas fa-minus-circle"></i>
                  <i class="fas fa-plus-circle"></i>
                </div>
              </div>

              <div class="form-check">
                <input name="spacewalk-render-style" id="spacewalk-render-style-ribbon" class="form-check-input" type="radio">
                <label class="form-check-label" for="spacewalk-render-style-ribbon">Ribbon</label>
              </div>

            </div>
          </li>

          <!-- background color -->
          <li class="list-group-item spacewalk-colorpicker-li" style="display: none;">

            <div class="input-group">

              <div class="input-group-prepend">
                            <span class="input-group-text spacewalk-colorpicker-input-group-text">
                                Background Color
                            </span>
              </div>

              <input type="text" class="spacewalk-colorpicker-input form-control">

              <div class="input-group-append">
                <div class="input-group-text spacewalk-colorpicker-input-group-text">
                  <input id="spacewalk_background_colorpicker" type="text" class="form-control" data-colorpicker="background">
                </div>
              </div>

            </div>

          </li>

          <!-- groundplane -->
          <li class="list-group-item spacewalk-colorpicker-li">

            <div class="input-group">

              <div class="input-group-prepend">

                <div class="input-group-text spacewalk-colorpicker-input-group-text">
                  <input id="spacewalk_ui_manager_groundplane" type="checkbox">
                </div>

                <span class="input-group-text spacewalk-colorpicker-input-group-text">
                                Ground Plane
                            </span>

              </div>

              <input type="text" class="spacewalk-colorpicker-input form-control">

              <div class="input-group-append">

                <div class="input-group-text spacewalk-colorpicker-input-group-text">
                  <input id="spacewalk_ui_manager_groundplane_colorpicker" type="text" class="form-control" data-colorpicker="groundplane">
                </div>

              </div>

            </div>

          </li>

          <!-- axes (gnomon) -->
          <li class="list-group-item spacewalk-colorpicker-li">

            <div class="input-group">

              <div class="input-group-prepend">

                <div class="input-group-text spacewalk-colorpicker-input-group-text">
                  <input id="spacewalk_ui_manager_gnomon" type="checkbox">
                </div>

                <span class="input-group-text spacewalk-colorpicker-input-group-text">
                                Axes
                            </span>

              </div>

              <input type="text" class="spacewalk-colorpicker-input form-control">

              <div class="input-group-append">

                <div class="input-group-text spacewalk-colorpicker-input-group-text">
                  <input id="spacewalk_ui_manager_gnomon_colorpicker" type="text" class="form-control" data-colorpicker="gnomon">
                </div>

              </div>

            </div>

          </li>

        </ul>`

    return html
}

const configureVisibilityControl = (input_id_list, $panel) => {

    for (let input_id of input_id_list) {

        const selector = '#' + input_id;
        const $input = $panel.find(selector);
        const change = 'change.' + input_id;

        $input.on(change, (e) => {

            e.preventDefault();

            if ('spacewalk_ui_manager_groundplane' === input_id) {
                sceneManager.groundPlane.toggle();
            } else if ('spacewalk_ui_manager_gnomon' === input_id) {
                sceneManager.gnomon.toggle();
            } else {
                const payload = $input.data('target');
                SpacewalkEventBus.globalBus.post({ type: 'ToggleUIControl', data: { payload } });
            }
        });

    }

};

const configureRenderStyleControl = ($input, renderStyle) => {

    $input.val( renderStyle );

    $input.on('change.gui_manager.render_style_ball_stick', (e) => {
        e.preventDefault();
        SpacewalkEventBus.globalBus.post({ type: "RenderStyleDidChange", data: $(e.target).val() });
    });

};

export const configureColorPicker = ($element, initialColor, callback) => {

    const config =
        {
            color: rgb255String(threeJSColorToRGB255(initialColor)),
            type: 'color',
            showAlpha: false,
            showButtons: false,
            allowEmpty: false,
            move: color => {
                const { r, g, b } = color.toRgb();
                callback(rgb255ToThreeJSColor(r, g, b))
            }
        };

    $element.spectrum(config);

};

export const getGUIRenderStyle = () => {
    const id = $('#spacewalk_ui_manager_panel').find("input:radio[name='spacewalk-render-style']:checked").attr('id');
    return 'spacewalk-render-style-ball-stick' === id ? BallAndStick.getRenderStyle() : Ribbon.getRenderStyle();
};

export const setGUIRenderStyle = renderStyle => {

    const $ui_manager_panel = $('#spacewalk_ui_manager_panel');

    if (renderStyle === Ribbon.getRenderStyle()) {
        $ui_manager_panel.find('#spacewalk-render-style-ribbon').prop('checked', true);
        SpacewalkEventBus.globalBus.post({ type: "RenderStyleDidChange", data: renderStyle });
    } else if (renderStyle === BallAndStick.getRenderStyle()) {
        $ui_manager_panel.find('#spacewalk-render-style-ball-stick').prop('checked', true);
        SpacewalkEventBus.globalBus.post({ type: "RenderStyleDidChange", data: renderStyle });
    }

};

export const doConfigureGroundplaneHidden = () => {
    const $input = $('#spacewalk_ui_manager_panel').find('#spacewalk_ui_manager_groundplane');
    return !($input.prop('checked'));
};

export const setGUIGroundplaneVisibility = status => {
    const $input = $('#spacewalk_ui_manager_panel').find('#spacewalk_ui_manager_groundplane');
    $input.prop('checked', status);
};

export const doConfigureGnomonHidden = () => {
    const $input = $('#spacewalk_ui_manager_panel').find('#spacewalk_ui_manager_gnomon');
    return !($input.prop('checked'));
};

export const setGUIGnomonVisibility = status => {
    const $input = $('#spacewalk_ui_manager_panel').find('#spacewalk_ui_manager_gnomon');
    $input.prop('checked', status);
};

export const doConfigurePanelHidden = panelID => {
    return !($('#spacewalk_ui_manager_panel').find(`[data-target='${ panelID }']`).prop('checked'));
};

export const setPanelVisibility = (panelID, status) => {
    $('#spacewalk_ui_manager_panel').find(`[data-target='${ panelID }']`).prop('checked', status);
};

export default GUIManager;
