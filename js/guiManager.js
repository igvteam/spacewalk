import Globals from "./globals.js";
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import { zIndexPanelUnselected, zIndexPanelSelected } from './utils.js';
import { rgb255ToThreeJSColor } from "./color.js";

class GUIManager {
    constructor ({ $button, $panel }) {

        this.$panel = $panel;

        $button.on('click.gui_manager', (e) => {
            e.preventDefault();
            $panel.toggle();
        });

        let $widgetPanels = undefined;
        $panel.find('input').each(function(unused) {

            const id = $(this).attr('data-target');

            if (undefined !== id) {

                const selectionString = `#${id}`;

                if (undefined === $widgetPanels) {
                    $widgetPanels = $(selectionString)
                } else {
                    $widgetPanels = $widgetPanels.add($(selectionString));
                }

            }
        });

        this.$widgetPanels = $widgetPanels;

        const input_id_list =
            [
                'spacewalk_ui_manager_groundplane',
                'spacewalk_ui_manager_gnomon',
                'spacewalk_ui_manager_ui_controls_color_ramp',
                'spacewalk_ui_manager_ui_controls_trace_select',
                'spacewalk_ui_manager_ui_controls_juicebox',
                'spacewalk_ui_manager_ui_controls_igv',
                'spacewalk_ui_manager_ui_controls_thumbnail',
                'spacewalk_ui_manager_ui_controls_distance_map',
                'spacewalk_ui_manager_ui_controls_contact_frequency_map'
            ];

        configureWidgetVisibility(input_id_list, $panel);

        configureRenderStyleRadioButton($panel.find('#spacewalk-render-style-ball-stick'), BallAndStick.getRenderStyle());
        configureRenderStyleRadioButton($panel.find('#spacewalk-render-style-noodle'), Noodle.getRenderStyle());

        const $ball_radius_control = $('#spacewalk-ball-radius-control');

        $ball_radius_control.find('i.fa-minus-circle').on('click.spacewalk-ball-radius-minus', () => {
            Globals.sceneManager.updateBallRadius(-1);
        });

        $ball_radius_control.find('i.fa-plus-circle').on('click.spacewalk-ball-radius-plus', () => {
            Globals.sceneManager.updateBallRadius(1);
        });

        const $stick_radius_control = $('#spacewalk-stick-radius-control');

        $stick_radius_control.find('i.fa-minus-circle').on('click.spacewalk-stick-radius-minus', () => {
            console.log('reduce stick radius');
        });

        $stick_radius_control.find('i.fa-plus-circle').on('click.spacewalk-stick-radius-plus', () => {
            console.log('increase stick radius');
        });

        const backgroundColorPickerConfig =
            {
                color: "#f00",
                move: color => {
                    const { r, g, b } = color.toRgb();
                    Globals.sceneManager.renderer.setClearColor (rgb255ToThreeJSColor(r, g, b));
                }

            };

        $('#spacewalk_background_colorpicker').spectrum(backgroundColorPickerConfig);

        const groundplaneColorPickerConfig =
            {
                color: "#f00",
                move: color => {
                    const { r, g, b } = color.toRgb();
                    Globals.sceneManager.groundPlane.setColor (rgb255ToThreeJSColor(r, g, b));
                }

            };

        $('#spacewalk_ui_manager_groundplane_colorpicker').spectrum(groundplaneColorPickerConfig);

        const gnomonColorPickerConfig =
            {
                color: "#f00",
                move: color => {
                    const { r, g, b } = color.toRgb();
                    Globals.sceneManager.gnomon.setColor (rgb255ToThreeJSColor(r, g, b));
                }

            };

        $('#spacewalk_ui_manager_gnomon_colorpicker').spectrum(gnomonColorPickerConfig);


        Globals.eventBus.subscribe("DidSelectPanel", this);
        Globals.eventBus.subscribe('DidLoadFile', this);
        Globals.eventBus.subscribe('DidLoadPointCloudFile', this);

    }

    receiveEvent({ type, data }) {

        if ('DidSelectPanel' === type) {

            const $selected = data;
            const $unselected = this.$widgetPanels.not($selected);
            $selected.css('zIndex', zIndexPanelSelected);
            $unselected.css('zIndex', zIndexPanelUnselected);

        } else if ('DidLoadFile' === type) {

            $('#spacewalk_info_panel').show();
            $('#spacewalk_ui_manager_render_styles').show();
            $('#spacewalk_ui_manager_trace_select').show();

        } else if ('DidLoadPointCloudFile' === type) {

            $('#spacewalk_info_panel').show();
            $('#spacewalk_ui_manager_render_styles').hide();
            $('#spacewalk_ui_manager_trace_select').hide();

        }
    }

    getRenderingStyle () {
        const id = this.$panel.find("input:radio[name='spacewalk-render-style']:checked").attr('id');
        return 'spacewalk-render-style-ball-stick' === id ? BallAndStick.getRenderStyle() : Noodle.getRenderStyle();
    }

    isGroundplaneHidden () {
        const $input = this.$panel.find('#spacewalk_ui_manager_groundplane');
        return $input.prop('checked');
    }

    isGnomonHidden () {
        const $input = this.$panel.find('#spacewalk_ui_manager_gnomon');
        return $input.prop('checked');
    }

    isPanelHidden (panelID) {
        return !(this.$panel.find(`[data-target='${panelID}']`).prop('checked'));
    }

    panelIsVisible(panelID) {
        const $found = this.$panel.find(`[data-target='${ panelID }']`);
        $found.prop('checked', true);
    }

    panelIsHidden(panelID) {
        const $found = this.$panel.find(`[data-target='${ panelID }']`);
        $found.prop('checked', false);
    }
}

const configureWidgetVisibility = (input_id_list, $panel) => {

    for (let input_id of input_id_list) {

        const selector = '#' + input_id;
        const $input = $panel.find(selector);
        const change = 'change.' + input_id;

        $input.on(change, (e) => {

            e.preventDefault();

            if ('spacewalk_ui_manager_groundplane' === input_id) {
                Globals.eventBus .post({ type: "ToggleGroundPlane", data: $input.prop('checked') });
            } else if ('spacewalk_ui_manager_gnomon' === input_id) {
                Globals.eventBus .post({ type: "ToggleGnomon", data: $input.prop('checked') });
            } else {
                const payload = $input.data('target');
                Globals.eventBus .post({ type: "ToggleUIControl", data: { $input, payload } });
            }
        });

    }

};

const configureRenderStyleRadioButton = ($input, renderStyle) => {

    $input.val( renderStyle );

    $input.on('change.gui_manager.render_style_ball_stick', (e) => {
        e.preventDefault();
        Globals.eventBus .post({ type: "RenderStyleDidChange", data: $(e.target).val() });
    });

};

export default GUIManager;
