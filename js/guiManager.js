import Globals from "./globals.js";
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import { zIndexPanelUnselected, zIndexPanelSelected } from './utils.js';

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

        Globals.eventBus.subscribe("DidSelectPanel", this);

    }

    receiveEvent({ type, data }) {

        if ('DidSelectPanel' === type) {

            const $selected = data;
            const $unselected = this.$widgetPanels.not($selected);

            $selected.css('zIndex', zIndexPanelSelected);
            $unselected.css('zIndex', zIndexPanelUnselected);
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
        $found.attr('checked', true);
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
